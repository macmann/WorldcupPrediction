import { MatchStatus, StageType, type Tournament } from "@prisma/client";
import { ensureTournamentSyncColumn, prisma } from "../lib/prisma";
import { config } from "../lib/config";
import { fetchFootballDataCompetitionFixtures, fetchWorldCupFixtures, type ExternalFixture } from "./footballApi";
import { enqueueScoringJob } from "../jobs/scoringEngine.job";

function mapStage(stage?: string | null): StageType {
  const normalized = stage?.toUpperCase().replaceAll("-", "_");
  if (normalized === "LAST_32" || normalized === "ROUND_OF_32") return StageType.ROUND_OF_32;
  if (normalized === "LAST_16" || normalized === "ROUND_OF_16") return StageType.ROUND_OF_16;
  if (normalized === "QUARTER_FINALS" || normalized === "QUARTER_FINAL") return StageType.QUARTER_FINAL;
  if (normalized === "SEMI_FINALS" || normalized === "SEMI_FINAL") return StageType.SEMI_FINAL;
  if (normalized === "THIRD_PLACE") return StageType.THIRD_PLACE;
  if (normalized === "FINAL") return StageType.FINAL;
  return StageType.GROUP;
}

function footballDataCode(externalId?: string | null) {
  return externalId?.startsWith("football-data:") ? externalId.slice("football-data:".length) : null;
}

async function upsertTeam(tournamentId: string | null | undefined, name: string, externalId?: string | null) {
  if (!tournamentId || !name || /\bTBD\b/i.test(name)) return null;

  const existing = externalId
    ? await prisma.team.findUnique({ where: { tournamentId_externalId: { tournamentId, externalId } }, select: { id: true } })
    : await prisma.team.findUnique({ where: { tournamentId_name: { tournamentId, name } }, select: { id: true } });
  if (existing) return existing.id;

  const team = await prisma.team.upsert({
    where: { tournamentId_name: { tournamentId, name } },
    create: { tournamentId, externalId: externalId ?? null, name },
    update: { externalId: externalId ?? undefined }
  });
  return team.id;
}

async function upsertFixture(fixture: ExternalFixture, tournamentId?: string | null) {
  const homeTeamId = await upsertTeam(tournamentId, fixture.homeTeam, fixture.homeTeamExternalId);
  const awayTeamId = await upsertTeam(tournamentId, fixture.awayTeam, fixture.awayTeamExternalId);
  const data = {
    externalId: fixture.externalId,
    tournamentId: tournamentId ?? null,
    matchday: fixture.matchday,
    stage: mapStage(fixture.stage),
    groupName: fixture.groupName,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    homeTeamId,
    awayTeamId,
    venue: fixture.venue,
    kickoffTime: new Date(fixture.kickoffTime),
    status: fixture.status,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    homeScore90: fixture.homeScore90,
    awayScore90: fixture.awayScore90,
    actualPenaltyShootout: fixture.actualPenaltyShootout ?? undefined,
    lastSyncedAt: new Date()
  };

  if (fixture.externalId) {
    return prisma.match.upsert({
      where: { externalId: fixture.externalId },
      create: { id: fixture.id, ...data },
      update: data
    });
  }

  return prisma.match.upsert({
    where: { id: fixture.id },
    create: { id: fixture.id, ...data },
    update: data
  });
}

async function ingestFixtureBatch(fixtures: ExternalFixture[], tournamentId?: string | null) {
  let upserted = 0;
  let queuedForScoring = 0;
  for (const fixture of fixtures) {
    await upsertFixture(fixture, tournamentId);
    upserted += 1;
    const standardTimeHome = fixture.homeScore90 ?? fixture.homeScore;
    const standardTimeAway = fixture.awayScore90 ?? fixture.awayScore;
    if (fixture.status === MatchStatus.FINISHED && standardTimeHome !== null && standardTimeAway !== null) {
      const scoringJob = await enqueueScoringJob(fixture.id);
      if (scoringJob) queuedForScoring += 1;
    }
  }
  return { upserted, queuedForScoring };
}

export async function ingestTournamentFixtures(tournament: Pick<Tournament, "id" | "externalId" | "syncFromAt">) {
  const code = footballDataCode(tournament.externalId);
  if (!code) return { upserted: 0, queuedForScoring: 0, skipped: true, reason: "Tournament is not linked to a football-data competition" };
  const fixtures = await fetchFootballDataCompetitionFixtures(code);
  const filteredFixtures = tournament.syncFromAt
    ? fixtures.filter((fixture) => new Date(fixture.kickoffTime).getTime() >= tournament.syncFromAt!.getTime())
    : fixtures;
  return ingestFixtureBatch(filteredFixtures, tournament.id);
}

export async function ingestFixtures() {
  await ensureTournamentSyncColumn();
  const externalTournaments = await prisma.tournament.findMany({
    where: { isActive: true, externalId: { startsWith: "football-data:" } },
    select: { id: true, externalId: true, name: true, syncFromAt: true }
  });

  const results = [];
  for (const tournament of externalTournaments) {
    try {
      const result = await ingestTournamentFixtures(tournament);
      results.push({ tournament: tournament.name, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown fixture ingestion error";
      console.warn(`Fixture ingestion failed for ${tournament.name}: ${message}`);
      results.push({ tournament: tournament.name, upserted: 0, queuedForScoring: 0, skipped: true, error: message });
    }
  }

  const hasExternalWorldCup = externalTournaments.some((tournament) => footballDataCode(tournament.externalId) === config.worldCupCompetitionCode);
  if (!hasExternalWorldCup) {
    const fixtures = await fetchWorldCupFixtures();
    if (fixtures.length > 0 || externalTournaments.length === 0) {
      const result = await ingestFixtureBatch(fixtures);
      results.push({ tournament: "World Cup fallback", ...result });
    }
  }

  return {
    upserted: results.reduce((total, result) => total + result.upserted, 0),
    queuedForScoring: results.reduce((total, result) => total + result.queuedForScoring, 0),
    tournaments: results
  };
}

export async function syncLiveMatches() {
  const liveMatches = await prisma.match.count({ where: { status: MatchStatus.LIVE } });
  if (liveMatches === 0) return { skipped: true, reason: "No active live matches" };
  return ingestFixtures();
}
