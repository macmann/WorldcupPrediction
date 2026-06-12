import { MatchStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { teamFlagEmoji, teamFlagImageUrl } from "@/lib/countryFlags";
import { normalizeMatchGroupName } from "@/lib/matchIdentity";
import { prisma } from "@/lib/prisma";

export type PublicProfilePrediction = {
  id: string;
  predictedOutcome: "HOME" | "DRAW" | "AWAY" | null;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  pointsAwarded: number | null;
  isExactScore: boolean;
  isCorrectOutcome: boolean;
  submittedAt: string;
  match: {
    id: number;
    matchday: number | null;
    stage: string;
    groupName: string | null;
    homeTeam: string;
    awayTeam: string;
    homeFlagEmoji: string | null;
    awayFlagEmoji: string | null;
    homeFlagImageUrl: string | null;
    awayFlagImageUrl: string | null;
    kickoffTime: string;
    status: string;
    homeScore: number | null;
    awayScore: number | null;
  };
};

export type PublicUserProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  registrationTimestamp: string;
  globalPoints: number;
  exactScoresCount: number;
  correctOutcomesCount: number;
  lockedPredictionCount: number;
  history: PublicProfilePrediction[];
};

export async function getPublicUserProfile(userId: string): Promise<PublicUserProfile | null | "UNAUTHENTICATED"> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;

  const viewer = await requireUser().catch(() => null);
  if (!viewer) return "UNAUTHENTICATED";

  const now = new Date();
  const lockedMatchWhere = {
    isEnabled: true,
    OR: [
      { kickoffTime: { lte: now } },
      { status: { not: MatchStatus.SCHEDULED } }
    ]
  };

  const [profile, lockedPredictionCount] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: userId,
        OR: [{ isBanned: false }, { id: viewer.id }]
      },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        registrationTimestamp: true,
        globalPoints: true,
        exactScoresCount: true,
        correctOutcomesCount: true,
        predictions: {
          where: { match: lockedMatchWhere },
          orderBy: { match: { kickoffTime: "desc" } },
          include: {
            match: {
              include: {
                homeTeamRef: { select: { flagEmoji: true } },
                awayTeamRef: { select: { flagEmoji: true } }
              }
            }
          }
        }
      }
    }),
    prisma.prediction.count({
      where: {
        userId,
        match: lockedMatchWhere
      }
    })
  ]);

  if (!profile) return null;

  return {
    id: profile.id,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    registrationTimestamp: profile.registrationTimestamp.toISOString(),
    globalPoints: profile.globalPoints,
    exactScoresCount: profile.exactScoresCount,
    correctOutcomesCount: profile.correctOutcomesCount,
    lockedPredictionCount,
    history: profile.predictions.map(({ match, ...prediction }) => ({
      id: prediction.id,
      predictedOutcome: prediction.predictedOutcome,
      predictedHomeScore: prediction.predictedHomeScore,
      predictedAwayScore: prediction.predictedAwayScore,
      pointsAwarded: prediction.pointsAwarded,
      isExactScore: prediction.isExactScore,
      isCorrectOutcome: prediction.isCorrectOutcome,
      submittedAt: prediction.submittedAt.toISOString(),
      match: {
        id: match.id,
        matchday: match.matchday,
        stage: match.stage,
        groupName: normalizeMatchGroupName(match.groupName),
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeFlagEmoji: teamFlagEmoji(match.homeTeam, match.homeTeamRef?.flagEmoji),
        awayFlagEmoji: teamFlagEmoji(match.awayTeam, match.awayTeamRef?.flagEmoji),
        homeFlagImageUrl: teamFlagImageUrl(match.homeTeam),
        awayFlagImageUrl: teamFlagImageUrl(match.awayTeam),
        kickoffTime: match.kickoffTime.toISOString(),
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore
      }
    }))
  };
}
