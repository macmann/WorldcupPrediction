import { getCurrentUser } from "@/lib/auth";
import { appDateKey, appDayRange } from "@/lib/dateTime";
import { teamFlagEmoji, teamFlagImageUrl } from "@/lib/countryFlags";
import { prisma } from "@/lib/prisma";

export type DailyMatchScore = {
  id: number;
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
  prediction: {
    predictedOutcome: "HOME" | "DRAW" | "AWAY" | null;
    predictedHomeScore: number | null;
    predictedAwayScore: number | null;
    pointsAwarded: number | null;
    isExactScore: boolean;
    isCorrectOutcome: boolean;
  } | null;
};

export type DailyLeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  exactScores: number;
  correctOutcomes: number;
  scoredPredictions: number;
  accuracy: number;
  isCurrentUser: boolean;
};

export type DailyWinnerSummary = {
  selectedDate: string;
  availableDates: string[];
  matchCount: number;
  finishedMatchCount: number;
  userRank: number | null;
  userPoints: number;
  userAccuracy: number;
  userScoredPredictions: number;
  winner: DailyLeaderboardRow | null;
  matches: DailyMatchScore[];
  leaderboard: DailyLeaderboardRow[];
  shareText: string;
};

function dateKey(date: Date) {
  return appDateKey(date);
}

function parseDateKey(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : value;
}

function dayRange(key: string) {
  return appDayRange(key);
}

function percentage(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

export async function getDailyWinnerSummary(requestedDate?: string): Promise<DailyWinnerSummary | null | "UNAUTHENTICATED"> {
  const user = await getCurrentUser();
  if (!user) return "UNAUTHENTICATED";

  const allMatchDates = await prisma.match.findMany({
    select: { kickoffTime: true, status: true },
    orderBy: { kickoffTime: "asc" }
  });

  if (!allMatchDates.length) return null;

  const availableDates = Array.from(new Set(allMatchDates.map((match) => dateKey(match.kickoffTime))));
  const latestFinishedDate = [...allMatchDates].reverse().find((match) => match.status === "FINISHED")?.kickoffTime;
  const todayKey = dateKey(new Date());
  const fallbackDate = availableDates.includes(todayKey) ? todayKey : dateKey(latestFinishedDate ?? allMatchDates[0].kickoffTime);
  const parsedDate = parseDateKey(requestedDate);
  const selectedDate = parsedDate && availableDates.includes(parsedDate) ? parsedDate : fallbackDate;
  const { start, end } = dayRange(selectedDate);

  const matches = await prisma.match.findMany({
    where: { kickoffTime: { gte: start, lt: end } },
    select: {
      id: true,
      homeTeam: true,
      awayTeam: true,
      homeTeamRef: { select: { flagEmoji: true } },
      awayTeamRef: { select: { flagEmoji: true } },
      kickoffTime: true,
      status: true,
      homeScore: true,
      awayScore: true,
      predictions: {
        where: { userId: user.id },
        select: {
          predictedOutcome: true,
          predictedHomeScore: true,
          predictedAwayScore: true,
          pointsAwarded: true,
          isExactScore: true,
          isCorrectOutcome: true
        },
        take: 1
      }
    },
    orderBy: { kickoffTime: "asc" }
  });

  const matchIds = matches.map((match) => match.id);
  const predictions = matchIds.length
    ? await prisma.prediction.findMany({
        where: { matchId: { in: matchIds }, pointsAwarded: { not: null } },
        select: {
          userId: true,
          pointsAwarded: true,
          isExactScore: true,
          isCorrectOutcome: true,
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              registrationTimestamp: true
            }
          }
        }
      })
    : [];

  const finishedMatchCount = matches.filter((match) => match.status === "FINISHED" || match.homeScore !== null).length;
  const rowsByUser = new Map<string, Omit<DailyLeaderboardRow, "rank" | "accuracy" | "isCurrentUser"> & { registrationTimestamp: Date }>();

  for (const prediction of predictions) {
    const existing = rowsByUser.get(prediction.userId) ?? {
      userId: prediction.user.id,
      displayName: prediction.user.displayName,
      avatarUrl: prediction.user.avatarUrl,
      points: 0,
      exactScores: 0,
      correctOutcomes: 0,
      scoredPredictions: 0,
      registrationTimestamp: prediction.user.registrationTimestamp
    };

    existing.points += prediction.pointsAwarded ?? 0;
    existing.exactScores += prediction.isExactScore ? 1 : 0;
    existing.correctOutcomes += prediction.isCorrectOutcome ? 1 : 0;
    existing.scoredPredictions += 1;
    rowsByUser.set(prediction.userId, existing);
  }

  const leaderboard = Array.from(rowsByUser.values())
    .sort((a, b) => b.points - a.points || b.exactScores - a.exactScores || b.correctOutcomes - a.correctOutcomes || a.registrationTimestamp.getTime() - b.registrationTimestamp.getTime())
    .map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      points: row.points,
      exactScores: row.exactScores,
      correctOutcomes: row.correctOutcomes,
      scoredPredictions: row.scoredPredictions,
      accuracy: percentage(row.correctOutcomes, finishedMatchCount),
      isCurrentUser: row.userId === user.id
    }));

  const currentUserRow = leaderboard.find((row) => row.isCurrentUser);
  const userPoints = currentUserRow?.points ?? 0;
  const userAccuracy = currentUserRow?.accuracy ?? 0;
  const userScoredPredictions = currentUserRow?.scoredPredictions ?? 0;
  const winner = leaderboard[0] ?? null;
  const shareText = currentUserRow
    ? `I ranked #${currentUserRow.rank} for ${selectedDate} with ${currentUserRow.points} pts and ${currentUserRow.accuracy}% accuracy on FFM WC2026.`
    : `Daily Winner is live for ${selectedDate} on FFM WC2026. Make your World Cup predictions and chase the daily crown!`;

  return {
    selectedDate,
    availableDates,
    matchCount: matches.length,
    finishedMatchCount,
    userRank: currentUserRow?.rank ?? null,
    userPoints,
    userAccuracy,
    userScoredPredictions,
    winner,
    leaderboard,
    shareText,
    matches: matches.map((match) => ({
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeFlagEmoji: teamFlagEmoji(match.homeTeam, match.homeTeamRef?.flagEmoji),
      awayFlagEmoji: teamFlagEmoji(match.awayTeam, match.awayTeamRef?.flagEmoji),
      homeFlagImageUrl: teamFlagImageUrl(match.homeTeam),
      awayFlagImageUrl: teamFlagImageUrl(match.awayTeam),
      kickoffTime: match.kickoffTime.toISOString(),
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      prediction: match.predictions[0] ?? null
    }))
  };
}
