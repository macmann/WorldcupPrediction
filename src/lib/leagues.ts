import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RankedLeagueMember = {
  joinedAt: Date;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    globalPoints: number;
    exactScoresCount: number;
    correctOutcomesCount: number;
    registrationTimestamp: Date;
  };
};

export type LeagueCard = {
  id: string;
  name: string;
  joinCode: string;
  type: "GLOBAL" | "PRIVATE";
  createdAt: string;
  joinedAt: string;
  members: number;
  rank: number;
  points: number;
  exactScoresCount: number;
  correctOutcomesCount: number;
  leader: {
    displayName: string;
    points: number;
  } | null;
  isOwner: boolean;
};

export type LeagueLeaderboardRow = {
  rank: number;
  joinedAt: string;
  user: Omit<RankedLeagueMember["user"], "registrationTimestamp"> & { registrationTimestamp: string };
};

export type LeagueDetail = {
  id: string;
  name: string;
  joinCode: string;
  type: "GLOBAL" | "PRIVATE";
  createdAt: string;
  memberCount: number;
  userRank: number;
  userPoints: number;
  isOwner: boolean;
  leaderboard: LeagueLeaderboardRow[];
};

function compareLeagueMembers(a: RankedLeagueMember, b: RankedLeagueMember) {
  return (
    b.user.globalPoints - a.user.globalPoints ||
    b.user.exactScoresCount - a.user.exactScoresCount ||
    a.user.registrationTimestamp.getTime() - b.user.registrationTimestamp.getTime()
  );
}

function rankMembers(members: RankedLeagueMember[]) {
  return [...members].sort(compareLeagueMembers).map((member, index) => ({ ...member, rank: index + 1 }));
}

export async function getUserLeagues(): Promise<LeagueCard[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const memberships = await prisma.leagueMember.findMany({
    where: { userId: user.id },
    select: {
      joinedAt: true,
      league: {
        select: {
          id: true,
          name: true,
          joinCode: true,
          type: true,
          ownerUserId: true,
          createdAt: true,
          memberships: {
            select: {
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  displayName: true,
                  avatarUrl: true,
                  globalPoints: true,
                  exactScoresCount: true,
                  correctOutcomesCount: true,
                  registrationTimestamp: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: [{ league: { type: "asc" } }, { joinedAt: "asc" }]
  });

  return memberships.map((membership) => {
    const rankedMembers = rankMembers(membership.league.memberships);
    const currentUserRow = rankedMembers.find((member) => member.user.id === user.id);
    const leader = rankedMembers[0]?.user;

    return {
      id: membership.league.id,
      name: membership.league.name,
      joinCode: membership.league.joinCode,
      type: membership.league.type,
      createdAt: membership.league.createdAt.toISOString(),
      joinedAt: membership.joinedAt.toISOString(),
      members: rankedMembers.length,
      rank: currentUserRow?.rank ?? rankedMembers.length,
      points: currentUserRow?.user.globalPoints ?? user.globalPoints,
      exactScoresCount: currentUserRow?.user.exactScoresCount ?? user.exactScoresCount,
      correctOutcomesCount: currentUserRow?.user.correctOutcomesCount ?? user.correctOutcomesCount,
      leader: leader ? { displayName: leader.displayName, points: leader.globalPoints } : null,
      isOwner: membership.league.ownerUserId === user.id
    };
  });
}

export async function getLeagueDetail(id: string): Promise<LeagueDetail | null | "UNAUTHENTICATED"> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const user = await getCurrentUser();
  if (!user) return "UNAUTHENTICATED";

  const league = await prisma.league.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      joinCode: true,
      type: true,
      ownerUserId: true,
      createdAt: true,
      memberships: {
        select: {
          joinedAt: true,
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              globalPoints: true,
              exactScoresCount: true,
              correctOutcomesCount: true,
              registrationTimestamp: true
            }
          }
        }
      }
    }
  });

  if (!league || !league.memberships.some((member) => member.user.id === user.id)) return null;

  const rankedMembers = rankMembers(league.memberships);
  const currentUserRow = rankedMembers.find((member) => member.user.id === user.id);

  return {
    id: league.id,
    name: league.name,
    joinCode: league.joinCode,
    type: league.type,
    createdAt: league.createdAt.toISOString(),
    memberCount: rankedMembers.length,
    userRank: currentUserRow?.rank ?? rankedMembers.length,
    userPoints: currentUserRow?.user.globalPoints ?? user.globalPoints,
    isOwner: league.ownerUserId === user.id,
    leaderboard: rankedMembers.map((member) => ({
      rank: member.rank,
      joinedAt: member.joinedAt.toISOString(),
      user: {
        ...member.user,
        registrationTimestamp: member.user.registrationTimestamp.toISOString()
      }
    }))
  };
}
