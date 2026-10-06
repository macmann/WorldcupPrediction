import { z } from "zod";
import { calculateMatchPoints, type MatchOutcome } from "./scoring";

export const scoringRulesSchema = z.object({
  outcome: z.number().int().min(0).max(100).default(1),
  exact: z.number().int().min(0).max(100).default(3),
  penalty: z.number().int().min(0).max(100).default(0),
  legacyKnockout: z.boolean().default(false)
}).strict();
export type ScoringRules = z.infer<typeof scoringRulesSchema>;
export const predictionInputSchema = z.object({
  matchId: z.number().int().positive(),
  predictedOutcome: z.enum(["HOME", "DRAW", "AWAY"]),
  predictedHomeScore: z.number().int().min(0).max(30),
  predictedAwayScore: z.number().int().min(0).max(30),
  predictedPenaltyShootout: z.boolean().nullable().optional()
}).strict();
export type PredictionInput = z.infer<typeof predictionInputSchema>;

export function fail(message: string, status = 422): never {
  throw Object.assign(new Error(message), { status });
}
export function scoreOutcome(home: number, away: number): MatchOutcome {
  return home > away ? "HOME" : home < away ? "AWAY" : "DRAW";
}
export function validateSeasonPrediction(input: PredictionInput, stage: string, rules: ScoringRules) {
  predictionInputSchema.parse(input);
  const legacy = rules.legacyKnockout && stage !== "GROUP";
  const outcome = scoreOutcome(input.predictedHomeScore, input.predictedAwayScore);
  if (legacy) {
    if (input.predictedOutcome === "DRAW" || (outcome !== "DRAW" && outcome !== input.predictedOutcome)) fail("Scoreline must agree with the advancing team", 400);
    if (input.predictedPenaltyShootout == null) fail("Choose a penalty shoot-out prediction", 400);
  } else {
    if (outcome !== input.predictedOutcome) fail("Scoreline must agree with the selected outcome", 400);
    if (input.predictedPenaltyShootout != null) fail("Penalty picks are disabled for this season", 400);
  }
}
export type LockableMatch = { kickoffTime: Date; predictionLockAt?: Date | null; status: string; isEnabled: boolean };
export function deadline(match: Pick<LockableMatch, "kickoffTime" | "predictionLockAt">) {
  return match.predictionLockAt ?? match.kickoffTime;
}
export function canEditPrediction(match: LockableMatch, serverNow: Date) {
  return match.isEnabled && match.status === "SCHEDULED" && serverNow < deadline(match);
}
export function canRevealPrediction(match: Pick<LockableMatch, "kickoffTime" | "predictionLockAt">, serverNow: Date) {
  return serverNow >= deadline(match);
}
export function assertBankerMove(existing: { lockedAt: Date | null; match: LockableMatch } | null, serverNow: Date) {
  if (existing && (existing.lockedAt || serverNow >= deadline(existing.match) || ["LIVE", "PAUSED", "FINISHED"].includes(existing.match.status))) fail("Banker is locked at its selected match kickoff", 403);
}

export function awardPrediction(
  prediction: { predictedOutcome: MatchOutcome | null; predictedHomeScore: number | null; predictedAwayScore: number | null; predictedPenaltyShootout?: boolean | null },
  match: { homeScore: number | null; awayScore: number | null; homeScore90: number | null; awayScore90: number | null; stage: string; actualPenaltyShootout?: boolean | null },
  rules: ScoringRules, banker = false, upset = 0
) {
  const home = match.homeScore90 ?? match.homeScore;
  const away = match.awayScore90 ?? match.awayScore;
  if (home === null || away === null) fail("Final standard-time scores are required");
  const advancing = rules.legacyKnockout && match.stage !== "GROUP" && match.homeScore !== null && match.awayScore !== null
    ? scoreOutcome(match.homeScore, match.awayScore) : null;
  const result = calculateMatchPoints({
    outcome: prediction.predictedOutcome,
    score: prediction.predictedHomeScore !== null && prediction.predictedAwayScore !== null ? { home: prediction.predictedHomeScore, away: prediction.predictedAwayScore } : null,
    penaltyShootout: prediction.predictedPenaltyShootout
  }, { home, away }, advancing, match.actualPenaltyShootout);
  const basePoints = (result.correctOutcome ? rules.outcome : 0) + (result.exact ? rules.exact : 0) + (result.correctPenaltyShootout ? rules.penalty : 0);
  const pointsMultiplier = banker ? 2 : 1;
  const upsetPoints = result.correctOutcome ? upset : 0;
  return { basePoints, pointsMultiplier, upsetPoints, pointsAwarded: basePoints * pointsMultiplier + upsetPoints, isExactScore: result.exact, isCorrectOutcome: result.correctOutcome };
}

export type RankedScore = { userId: string; points: number; exact: number; correct: number; wins?: number; registeredAt: Date; lastSubmittedAt?: Date | null };
export function compareSeasonRank(a: RankedScore, b: RankedScore) {
  return b.points - a.points || b.exact - a.exact || b.correct - a.correct || (b.wins ?? 0) - (a.wins ?? 0) || a.registeredAt.getTime() - b.registeredAt.getTime() || a.userId.localeCompare(b.userId);
}
export function compareGameweekRank(a: RankedScore, b: RankedScore) {
  return b.points - a.points || b.exact - a.exact || b.correct - a.correct || (a.lastSubmittedAt?.getTime() ?? Infinity) - (b.lastSubmittedAt?.getTime() ?? Infinity) || a.registeredAt.getTime() - b.registeredAt.getTime() || a.userId.localeCompare(b.userId);
}

export function consensus(predictions: Pick<PredictionInput, "predictedOutcome" | "predictedHomeScore" | "predictedAwayScore">[]) {
  const count = predictions.length;
  const homeCount = predictions.filter(p => p.predictedOutcome === "HOME").length;
  const drawCount = predictions.filter(p => p.predictedOutcome === "DRAW").length;
  const awayCount = count - homeCount - drawCount;
  return { homeCount, drawCount, awayCount, predictionCount: count,
    averageHome: count ? predictions.reduce((s, p) => s + p.predictedHomeScore, 0) / count : 0,
    averageAway: count ? predictions.reduce((s, p) => s + p.predictedAwayScore, 0) / count : 0,
    homePercent: count ? homeCount * 100 / count : 0, drawPercent: count ? drawCount * 100 / count : 0, awayPercent: count ? awayCount * 100 / count : 0 };
}
export function canSeeConsensus(hasSubmitted: boolean) { return hasSubmitted; }
export function underdogBonus(snapshot: { homeCount: number; drawCount: number; awayCount: number; predictionCount: number } | null, outcome: MatchOutcome | null, settings: { enabled: boolean; threshold: number; points: number; minSample: number }) {
  if (!settings.enabled || !snapshot || !outcome || snapshot.predictionCount < settings.minSample || snapshot.predictionCount === 0) return 0;
  const count = outcome === "HOME" ? snapshot.homeCount : outcome === "DRAW" ? snapshot.drawCount : snapshot.awayCount;
  return count * 100 / snapshot.predictionCount <= settings.threshold ? settings.points : 0;
}
export function streaks(rows: { isCorrectOutcome: boolean; isExactScore: boolean }[]) {
  let currentCorrect = 0, bestCorrect = 0, currentExact = 0, bestExact = 0;
  for (const row of rows) {
    currentCorrect = row.isCorrectOutcome ? currentCorrect + 1 : 0;
    currentExact = row.isExactScore ? currentExact + 1 : 0;
    bestCorrect = Math.max(bestCorrect, currentCorrect); bestExact = Math.max(bestExact, currentExact);
  }
  return { currentCorrect, bestCorrect, currentExact, bestExact };
}

export function roundRobin(userIds: string[], gameweekIds: string[]) {
  const participants: (string | null)[] = [...new Set(userIds)].sort();
  if (participants.length < 2) fail("At least two participants are required");
  if (participants.length % 2) participants.push(null);
  const cycle = participants.length - 1;
  const rows: { gameweekId: string; slot: number; homeUserId: string; awayUserId: string | null }[] = [];
  for (let round = 0; round < gameweekIds.length; round++) {
    for (let slot = 0; slot < participants.length / 2; slot++) {
      let home = participants[slot], away = participants[participants.length - 1 - slot];
      if (Math.floor(round / cycle) % 2) [home, away] = [away, home];
      if (home === null) [home, away] = [away, home];
      rows.push({ gameweekId: gameweekIds[round], slot, homeUserId: home!, awayUserId: away });
    }
    participants.splice(1, 0, participants.pop()!);
  }
  return rows;
}
export function h2hResult(home: number, away: number | null) {
  // A bye is a rest week: no played match or H2H table points.
  if (away === null) return { homeTablePoints: 0, awayTablePoints: null };
  return { homeTablePoints: home > away ? 3 : home === away ? 1 : 0, awayTablePoints: away > home ? 3 : home === away ? 1 : 0 };
}
export function selectionPoints(selected: string[], settled: string[], points: number) {
  return [...new Set(selected)].filter(id => settled.includes(id)).length * points;
}
export const defaultSeasonPickRules = [
  { key: "champion", target: "TEAM", selectionCount: 1, points: 20 },
  { key: "runnerUp", target: "TEAM", selectionCount: 1, points: 10 },
  { key: "topFour", target: "TEAM", selectionCount: 4, points: 5 },
  { key: "relegated", target: "TEAM", selectionCount: 3, points: 5 },
  { key: "goldenBoot", target: "PLAYER", selectionCount: 1, points: 10 },
  { key: "goldenGlove", target: "PLAYER", selectionCount: 1, points: 8 },
  { key: "playerOfSeason", target: "PLAYER", selectionCount: 1, points: 10 },
  { key: "surpriseTeam", target: "TEAM", selectionCount: 1, points: 5 }
] as const;
export const defaultAchievements = [
  { id: "sniper", criteria: { scope: "season", metric: "exactScores", threshold: 10 } },
  { id: "oracle", criteria: { scope: "gameweek", metric: "exactScores", threshold: 3 } },
  { id: "hotStreak", criteria: { scope: "season", metric: "bestCorrect", threshold: 5 } },
  { id: "kingOfWeek", criteria: { scope: "gameweek", metric: "winner", threshold: 1 } },
  { id: "seasonChampion", criteria: { scope: "season", metric: "champion", threshold: 1 } },
  { id: "comeback", criteria: { scope: "gameweek", metric: "movement", threshold: 5 } },
  { id: "giantKiller", criteria: { scope: "h2h", metric: "beatLeader", threshold: 1 } },
  { id: "woodenSpoon", criteria: { scope: "privateLeague", metric: "last", threshold: 1 }, enabled: false }
] as const;
