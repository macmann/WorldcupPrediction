import { MatchStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { fetchWorldCupFixtures } from "./footballApi";
import { getScoringQueue } from "../jobs/queues";

export async function ingestFixtures() {
  const fixtures = await fetchWorldCupFixtures();
  for (const fixture of fixtures) {
    await prisma.match.upsert({
      where: { id: fixture.id },
      create: {
        id: fixture.id,
        matchday: fixture.matchday,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        kickoffTime: new Date(fixture.kickoffTime),
        status: fixture.status,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore
      },
      update: {
        matchday: fixture.matchday,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        kickoffTime: new Date(fixture.kickoffTime),
        status: fixture.status,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore
      }
    });
    if (fixture.status === MatchStatus.FINISHED && fixture.homeScore !== null && fixture.awayScore !== null) {
      await getScoringQueue().add("score-match", { matchId: fixture.id }, { jobId: `score-${fixture.id}` });
    }
  }
  return { upserted: fixtures.length };
}

export async function syncLiveMatches() {
  return ingestFixtures();
}
