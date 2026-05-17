import { MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateMatchPoints } from "@/lib/scoring";

export async function recalculateMatch(matchId: number) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== MatchStatus.FINISHED || match.homeScore === null || match.awayScore === null) {
    throw Object.assign(new Error("Match must be finished with a final score before scoring"), { status: 422 });
  }

  const predictions = await prisma.prediction.findMany({ where: { matchId } });

  await prisma.$transaction(async (tx) => {
    await tx.prediction.updateMany({ where: { matchId }, data: { pointsAwarded: null, isLocked: true } });

    for (const prediction of predictions) {
      const result = calculateMatchPoints(
        { home: prediction.predictedHomeScore, away: prediction.predictedAwayScore },
        { home: match.homeScore!, away: match.awayScore! }
      );
      await tx.prediction.update({
        where: { id: prediction.id },
        data: { pointsAwarded: result.points, isLocked: true }
      });
    }

    const aggregates = await tx.prediction.groupBy({
      by: ["userId"],
      _sum: { pointsAwarded: true },
      where: { pointsAwarded: { not: null } }
    });
    const exactAggregates = await tx.prediction.findMany({
      where: { pointsAwarded: 2 },
      select: { userId: true }
    });
    const exactCounts = new Map<string, number>();
    exactAggregates.forEach((prediction) => exactCounts.set(prediction.userId, (exactCounts.get(prediction.userId) ?? 0) + 1));

    await tx.user.updateMany({ data: { globalPoints: 0, exactScoresCount: 0 } });
    for (const aggregate of aggregates) {
      await tx.user.update({
        where: { id: aggregate.userId },
        data: {
          globalPoints: aggregate._sum.pointsAwarded ?? 0,
          exactScoresCount: exactCounts.get(aggregate.userId) ?? 0
        }
      });
    }
  });

  return { scoredPredictions: predictions.length };
}
