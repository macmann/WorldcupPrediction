export type ScoreLine = {
  home: number;
  away: number;
};

export type MatchOutcome = "HOME" | "DRAW" | "AWAY";

export const OUTRIGHT_SCORING_RULES = [
  { key: "champion", points: 10 },
  { key: "secondRunnerUp", points: 5 },
  { key: "thirdPlace", points: 4 },
  { key: "goldenBall", points: 5 },
  { key: "goldenGlove", points: 3 },
  { key: "goldenBoot", points: 3 },
  { key: "youngPlayer", points: 3 },
  { key: "fairPlay", points: 2 }
] as const;

export const OUTRIGHT_POINTS = Object.fromEntries(OUTRIGHT_SCORING_RULES.map((rule) => [rule.key, rule.points])) as Record<(typeof OUTRIGHT_SCORING_RULES)[number]["key"], number>;

export type StageType = "GROUP" | "ROUND_OF_32" | "ROUND_OF_16" | "QUARTER_FINAL" | "SEMI_FINAL" | "THIRD_PLACE" | "FINAL";

function outcome(score: ScoreLine): MatchOutcome {
  if (score.home > score.away) return "HOME";
  if (score.away > score.home) return "AWAY";
  return "DRAW";
}

export function calculateMatchPoints(predicted: { outcome?: MatchOutcome | null; score?: ScoreLine | null }, actual: ScoreLine, actualWinner?: MatchOutcome | null) {
  const actualOutcome = actualWinner ?? outcome(actual);
  const correctOutcome = predicted.outcome === actualOutcome;
  const exactScore = predicted.score ? predicted.score.home === actual.home && predicted.score.away === actual.away : false;

  return {
    points: (exactScore ? 3 : 0) + (correctOutcome ? 2 : 0),
    exact: exactScore,
    correctOutcome
  };
}

export function calculateOutrightPoints(
  picks: { championTeamId: string; bestPlayerId: string; bestGkId: string },
  winners: { championTeamId: string; bestPlayerId: string; bestGkId: string }
) {
  return (
    (picks.championTeamId === winners.championTeamId ? OUTRIGHT_POINTS.champion : 0) +
    (picks.bestPlayerId === winners.bestPlayerId ? OUTRIGHT_POINTS.goldenBall : 0) +
    (picks.bestGkId === winners.bestGkId ? OUTRIGHT_POINTS.goldenGlove : 0)
  );
}
