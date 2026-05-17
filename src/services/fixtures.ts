import { MatchStatus, StageType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { fetchWorldCupFixtures, type ExternalFixture } from "./footballApi";
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

async function upsertFixture(fixture: ExternalFixture) {
  return prisma.match.upsert({
    where: { id: fixture.id },
    create: {
      id: fixture.id,
      externalId: fixture.externalId,
      matchday: fixture.matchday,
      stage: mapStage(fixture.stage),
      groupName: fixture.groupName,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      venue: fixture.venue,
      kickoffTime: new Date(fixture.kickoffTime),
      status: fixture.status,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      homeScore90: fixture.homeScore90,
      awayScore90: fixture.awayScore90,
      lastSyncedAt: new Date()
    },
    update: {
      externalId: fixture.externalId,
      matchday: fixture.matchday,
      stage: mapStage(fixture.stage),
      groupName: fixture.groupName,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      venue: fixture.venue,
      kickoffTime: new Date(fixture.kickoffTime),
      status: fixture.status,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      homeScore90: fixture.homeScore90,
      awayScore90: fixture.awayScore90,
      lastSyncedAt: new Date()
    }
  });
}

export async function ingestFixtures() {
  const fixtures = await fetchWorldCupFixtures();
  for (const fixture of fixtures) {
    await upsertFixture(fixture);
    if (fixture.status === MatchStatus.FINISHED && fixture.homeScore90 !== null && fixture.awayScore90 !== null) {
      await enqueueScoringJob(fixture.id);
    }
  }
  return { upserted: fixtures.length };
}

export async function syncLiveMatches() {
  const liveMatches = await prisma.match.count({ where: { status: MatchStatus.LIVE } });
  if (liveMatches === 0) return { skipped: true, reason: "No active live matches" };
  return ingestFixtures();
}
