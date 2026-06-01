import { isEligibleForAward } from "../lib/playerMaster";
import { prisma } from "../lib/prisma";

const GOLDEN_BALL_POINTS = 5;
const GOLDEN_GLOVE_POINTS = 3;

export async function settleTournamentOutrights(tournamentId: string, goldenBallPlayerId: string, goldenGlovePlayerId: string) {
  const settledAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const [goldenBallPlayer, goldenGlovePlayer] = await Promise.all([
      tx.player.findFirst({ where: { id: goldenBallPlayerId, tournamentId } }),
      tx.player.findFirst({ where: { id: goldenGlovePlayerId, tournamentId } })
    ]);
    if (!goldenBallPlayer) throw Object.assign(new Error("Golden Ball winner must be a player in the selected tournament"), { status: 422 });
    if (!goldenGlovePlayer || !isEligibleForAward("goldenGlove", goldenGlovePlayer)) throw Object.assign(new Error("Golden Glove winner must be a goalkeeper in the selected tournament"), { status: 422 });

    const settlement = await tx.outrightSettlement.upsert({
      where: { tournamentId },
      create: { tournamentId, goldenBallPlayerId, goldenGlovePlayerId, settledAt },
      update: { goldenBallPlayerId, goldenGlovePlayerId, settledAt }
    });

    const outrights = await tx.outright.findMany({ where: { tournamentId } });
    let awardedUsers = 0;

    for (const outright of outrights) {
      const points = (outright.bestPlayerId === goldenBallPlayerId ? GOLDEN_BALL_POINTS : 0) +
        (outright.bestGkId === goldenGlovePlayerId ? GOLDEN_GLOVE_POINTS : 0);
      if (points > 0) awardedUsers += 1;
      await tx.outright.update({ where: { userId: outright.userId }, data: { pointsAwarded: points } });
    }

    const predictionAggregates = await tx.prediction.groupBy({
      by: ["userId"],
      _sum: { pointsAwarded: true },
      where: { pointsAwarded: { not: null } }
    });
    const outrightAggregates = await tx.outright.groupBy({
      by: ["userId"],
      _sum: { pointsAwarded: true },
      where: { pointsAwarded: { not: null } }
    });
    const exactAggregates = await tx.prediction.groupBy({ by: ["userId"], _count: { _all: true }, where: { isExactScore: true } });
    const outcomeAggregates = await tx.prediction.groupBy({ by: ["userId"], _count: { _all: true }, where: { isCorrectOutcome: true } });

    const pointsByUser = new Map<string, number>();
    for (const aggregate of predictionAggregates) pointsByUser.set(aggregate.userId, aggregate._sum.pointsAwarded ?? 0);
    for (const aggregate of outrightAggregates) pointsByUser.set(aggregate.userId, (pointsByUser.get(aggregate.userId) ?? 0) + (aggregate._sum.pointsAwarded ?? 0));
    const exactByUser = new Map(exactAggregates.map((aggregate) => [aggregate.userId, aggregate._count._all]));
    const outcomeByUser = new Map(outcomeAggregates.map((aggregate) => [aggregate.userId, aggregate._count._all]));
    const userIds = new Set([...pointsByUser.keys(), ...exactByUser.keys(), ...outcomeByUser.keys()]);

    await tx.user.updateMany({ data: { globalPoints: 0, exactScoresCount: 0, correctOutcomesCount: 0 } });
    for (const userId of userIds) {
      await tx.user.update({
        where: { id: userId },
        data: {
          globalPoints: pointsByUser.get(userId) ?? 0,
          exactScoresCount: exactByUser.get(userId) ?? 0,
          correctOutcomesCount: outcomeByUser.get(userId) ?? 0
        }
      });
    }

    return { settlement, scoredOutrights: outrights.length, awardedUsers };
  });

  return result;
}
