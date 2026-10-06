import { Prisma, type Season, type Competition } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { config } from "../../lib/config";
import { deadline, fail } from "../../lib/platformRules";
import { fetchFootballDataCompetitionFixtures, fetchSeasonCatalog, type ExternalFixture } from "../footballApi";
import { seasonTransaction, databaseNow, type Tx } from "./transactions";
import { enqueueSeasonScoringJob } from "../../jobs/scoringEngine.job";

export async function upsertSeasonFixture(tx: Tx, season: Season & { competition: Competition }, fixture: ExternalFixture, now: Date) {
  if (!Number.isInteger(fixture.id) || !Number.isFinite(new Date(fixture.kickoffTime).getTime())) fail("Provider returned an invalid fixture");
  const identity = `${season.competition.provider}:${fixture.id}`;
  const existing = await tx.match.findFirst({ where: { OR: [{ externalId: identity }, ...(season.competition.provider === "football-data" ? [{ externalId: String(fixture.id), seasonId: season.id }] : [])] }, include: { bankers: true } });
  if (existing && existing.seasonId !== season.id) fail("Provider fixture already belongs to another season");
  const gameweek = (season.usesGameweeks || season.competition.type === "LEAGUE") && fixture.matchday
    ? await tx.gameweek.upsert({ where: { seasonId_number: { seasonId: season.id, number: fixture.matchday } }, create: { seasonId: season.id, number: fixture.matchday }, update: {} }) : null;
  const locked = existing && now >= deadline(existing);
  const scoringGameweekId = locked ? existing.scoringGameweekId : gameweek?.id ?? null;
  async function team(name: string, externalId: string | null | undefined, badge: string | null | undefined) {
    if (!externalId || /\bTBD\b/i.test(name)) return null;
    return tx.team.upsert({ where: { seasonId_externalId: { seasonId: season.id, externalId } }, create: { seasonId: season.id, externalId, name, badgeUrl: badge }, update: { name, badgeUrl: badge ?? undefined } });
  }
  const home = await team(fixture.homeTeam, fixture.homeTeamExternalId, fixture.homeBadgeUrl), away = await team(fixture.awayTeam, fixture.awayTeamExternalId, fixture.awayBadgeUrl);
  const data = { externalId: identity, competitionId: season.competitionId, seasonId: season.id, gameweekId: gameweek?.id ?? null, scoringGameweekId, matchday: fixture.matchday,
    stage: mapProviderStage(fixture.stage), groupName: fixture.groupName, homeTeam: fixture.homeTeam, awayTeam: fixture.awayTeam, homeTeamId: home?.id, awayTeamId: away?.id, venue: fixture.venue,
    kickoffTime: new Date(fixture.kickoffTime), predictionLockAt: locked ? deadline(existing) : null, lastSyncedAt: now,
    ...(!existing?.isResultOverride ? { status: fixture.status, homeScore: fixture.homeScore, awayScore: fixture.awayScore, homeScore90: fixture.homeScore90, awayScore90: fixture.awayScore90, actualPenaltyShootout: fixture.actualPenaltyShootout } : {}) };
  // Unstarted moved fixtures carry the selection to the new gameweek unless that
  // slot is already occupied. Locked fixtures retain their original scoring slot.
  if (existing && !locked && existing.scoringGameweekId !== scoringGameweekId) {
    for (const banker of existing.bankers) {
      await tx.gameweekBanker.delete({ where: { userId_gameweekId: { userId: banker.userId, gameweekId: banker.gameweekId } } });
    }
  }
  const match = existing ? await tx.match.update({ where: { id: existing.id }, data }) : await tx.match.create({ data });
  if (existing && !locked && existing.scoringGameweekId !== scoringGameweekId && scoringGameweekId) {
    for (const banker of existing.bankers) {
      if (!await tx.gameweekBanker.findUnique({ where: { userId_gameweekId: { userId: banker.userId, gameweekId: scoringGameweekId } } })) {
        await tx.gameweekBanker.create({ data: { userId: banker.userId, gameweekId: scoringGameweekId, matchId: match.id, chosenAt: banker.chosenAt } });
      }
    }
  }
  return match;
}
export function mapProviderStage(stage?: string | null): Prisma.MatchCreateInput["stage"] {
  const s = stage?.toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
  if (["LAST_32", "ROUND_OF_32"].includes(s ?? "")) return "ROUND_OF_32";
  if (["LAST_16", "ROUND_OF_16"].includes(s ?? "")) return "ROUND_OF_16";
  if (["QUARTER_FINALS", "QUARTER_FINAL"].includes(s ?? "")) return "QUARTER_FINAL";
  if (["SEMI_FINALS", "SEMI_FINAL"].includes(s ?? "")) return "SEMI_FINAL";
  if (s === "FINAL") return "FINAL";
  if (s === "THIRD_PLACE") return "THIRD_PLACE";
  return "GROUP";
}
export async function ingestSeasonFixtures(seasonId: string) {
  const season = await prisma.season.findUniqueOrThrow({ where: { id: seasonId }, include: { competition: true } });
  if (season.legacyTournamentId) fail("Use legacy tournament sync for this historical season");
  if (season.competition.provider !== "football-data" || !season.competition.providerCode || !season.providerSeason) fail("Configure the provider competition code and season year");
  if (!config.footballApiKey) fail("Configure FOOTBALL_API_KEY securely to sync football-data.org fixtures", 503);
  const fixtures = await fetchFootballDataCompetitionFixtures(season.competition.providerCode, season.providerSeason);
  const result = await seasonTransaction(season.id, async tx => {
    const now = await databaseNow(tx);
    let upserted = 0;
    for (const fixture of fixtures) { await upsertSeasonFixture(tx, season, fixture, now); upserted++; }
    const gws = await tx.gameweek.findMany({ where: { seasonId }, include: { scoringMatches: { select: { kickoffTime: true } } } });
    for (const gw of gws) if (gw.scoringMatches.length) {
      await tx.gameweek.update({ where: { id: gw.id }, data: { startsAt: new Date(Math.min(...gw.scoringMatches.map(m => m.kickoffTime.getTime()))), endsAt: new Date(Math.max(...gw.scoringMatches.map(m => m.kickoffTime.getTime())) + 3 * 60 * 60 * 1000) } });
    }
    return { seasonId, upserted };
  });
  await enqueueSeasonScoringJob(season.id);
  return result;
}
export async function syncSeasonCatalog(seasonId: string) {
  const season = await prisma.season.findUniqueOrThrow({ where: { id: seasonId }, include: { competition: true } });
  if (!season.competition.providerCode || !season.providerSeason || season.competition.provider !== "football-data") fail("Configure season provider before catalog sync");
  const catalog = await fetchSeasonCatalog(season.competition.providerCode, season.providerSeason);
  return seasonTransaction(seasonId, async tx => {
    for (const team of catalog.teams) if (team.externalId) await tx.team.upsert({ where: { seasonId_externalId: { seasonId, externalId: team.externalId } }, create: { seasonId, ...team }, update: { name: team.name, shortName: team.shortName } });
    for (const p of catalog.players) if (p.externalId) {
      const team = p.teamExternalId ? await tx.team.findUnique({ where: { seasonId_externalId: { seasonId, externalId: p.teamExternalId } } }) : null;
      const data = { name: p.name, position: p.position, isGoalkeeper: p.isGoalkeeper, teamId: team?.id, source: "API" };
      await tx.player.upsert({ where: { seasonId_externalId: { seasonId, externalId: p.externalId } }, create: { seasonId, externalId: p.externalId, ...data }, update: data });
    }
    return { teams: catalog.teams.length, players: catalog.players.length };
  });
}
