import { MatchStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { captureLeagueRankSnapshots } from "../lib/rankSnapshots";
import { calculateMatchPoints, type MatchOutcome } from "../lib/scoring";
import { isKnockoutStage } from "../lib/matchPrediction";

function standardTimeScore(match: { homeScore90: number | null; awayScore90: number | null; homeScore: number | null; awayScore: number | null }) {
  return {
    home: match.homeScore90 ?? match.homeScore,
    away: match.awayScore90 ?? match.awayScore
  };
}

export async function recalculateMatch(matchId: number) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  const actual = match ? standardTimeScore(match) : { home: null, away: null };
  const actualWinner: MatchOutcome | null = match && isKnockoutStage(match.stage)
    ? match.homeScore !== null && match.awayScore !== null
      ? match.homeScore > match.awayScore ? "HOME" : match.awayScore > match.homeScore ? "AWAY" : "DRAW"
      : null
    : null;

  if (!match || match.status !== MatchStatus.FINISHED || actual.home === null || actual.away === null) {
    throw Object.assign(new Error("Match must be finished with a standard-time score before scoring"), { status: 422 });
  }

  const predictions = await prisma.prediction.findMany({ where: { matchId } });
  const scoredAt = new Date();

  await prisma.$transaction(async (tx) => {
    for (const prediction of predictions) {
      const result = calculateMatchPoints(
        {
          outcome: prediction.predictedOutcome,
          score: prediction.predictedHomeScore !== null && prediction.predictedAwayScore !== null
            ? { home: prediction.predictedHomeScore, away: prediction.predictedAwayScore }
            : null
        },
        { home: actual.home!, away: actual.away! },
        actualWinner
      );
      await tx.prediction.update({
        where: { id: prediction.id },
        data: {
          pointsAwarded: result.points,
          isExactScore: result.exact,
          isCorrectOutcome: result.correctOutcome,
          isLocked: true,
          scoredAt
        }
      });
    }

    const pointAggregates = await tx.prediction.groupBy({
      by: ["userId"],
      _sum: { pointsAwarded: true },
      where: { pointsAwarded: { not: null } }
    });
    const exactAggregates = await tx.prediction.groupBy({
      by: ["userId"],
      _count: { _all: true },
      where: { isExactScore: true }
    });
    const outcomeAggregates = await tx.prediction.groupBy({
      by: ["userId"],
      _count: { _all: true },
      where: { isCorrectOutcome: true }
    });
    const matchesPlayedAggregates = await tx.prediction.groupBy({
      by: ["userId"],
      _count: { _all: true },
      where: { pointsAwarded: { not: null } }
    });

    const pointsByUser = new Map(pointAggregates.map((aggregate) => [aggregate.userId, aggregate._sum.pointsAwarded ?? 0]));
    const exactByUser = new Map(exactAggregates.map((aggregate) => [aggregate.userId, aggregate._count._all]));
    const outcomeByUser = new Map(outcomeAggregates.map((aggregate) => [aggregate.userId, aggregate._count._all]));
    const matchesPlayedByUser = new Map(matchesPlayedAggregates.map((aggregate) => [aggregate.userId, aggregate._count._all]));
    const userIds = new Set([...pointsByUser.keys(), ...exactByUser.keys(), ...outcomeByUser.keys(), ...matchesPlayedByUser.keys()]);

    await captureLeagueRankSnapshots(tx);

    await tx.user.updateMany({ data: { globalPoints: 0, exactScoresCount: 0, correctOutcomesCount: 0, matchesPlayedCount: 0 } });
    for (const userId of userIds) {
      await tx.user.update({
        where: { id: userId },
        data: {
          globalPoints: pointsByUser.get(userId) ?? 0,
          exactScoresCount: exactByUser.get(userId) ?? 0,
          correctOutcomesCount: outcomeByUser.get(userId) ?? 0,
          matchesPlayedCount: matchesPlayedByUser.get(userId) ?? 0
        }
      });
    }
  });

  return { scoredPredictions: predictions.length };
}
