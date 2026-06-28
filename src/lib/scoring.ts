export type ScoreLine = {
  home: number;
  away: number;
};

export type MatchOutcome = "HOME" | "DRAW" | "AWAY";

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
    points: exactScore ? 3 : correctOutcome ? 2 : 0,
    exact: exactScore,
    correctOutcome
  };
}

export function calculateOutrightPoints(
  picks: { championTeamId: string; bestPlayerId: string; bestGkId: string },
  winners: { championTeamId: string; bestPlayerId: string; bestGkId: string }
) {
  return (
    (picks.championTeamId === winners.championTeamId ? 10 : 0) +
    (picks.bestPlayerId === winners.bestPlayerId ? 5 : 0) +
    (picks.bestGkId === winners.bestGkId ? 3 : 0)
  );
}
