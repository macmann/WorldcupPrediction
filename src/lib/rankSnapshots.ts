import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

type SnapshotMember = {
  joinedAt: Date;
  user: {
    id: string;
    globalPoints: number;
    matchesPlayedCount: number;
    registrationTimestamp: Date;
    isBanned: boolean;
  };
};

function compareSnapshotMembers(a: SnapshotMember, b: SnapshotMember) {
  return (
    b.user.globalPoints - a.user.globalPoints ||
    a.user.matchesPlayedCount - b.user.matchesPlayedCount ||
    a.user.registrationTimestamp.getTime() - b.user.registrationTimestamp.getTime()
  );
}

export async function captureLeagueRankSnapshots(tx: Tx, capturedAt = new Date()) {
  const leagues = await tx.league.findMany({
    select: {
      id: true,
      memberships: {
        select: {
          joinedAt: true,
          user: {
            select: {
              id: true,
              globalPoints: true,
              matchesPlayedCount: true,
              registrationTimestamp: true,
              isBanned: true
            }
          }
        }
      }
    }
  });

  const snapshots = leagues.flatMap((league) =>
    league.memberships
      .filter((member) => !member.user.isBanned)
      .sort(compareSnapshotMembers)
      .map((member, index) => ({
        leagueId: league.id,
        userId: member.user.id,
        rank: index + 1,
        totalPoints: member.user.globalPoints,
        capturedAt
      }))
  );

  if (!snapshots.length) return 0;
  await tx.leagueRankSnapshot.createMany({ data: snapshots, skipDuplicates: true });
  return snapshots.length;
}
