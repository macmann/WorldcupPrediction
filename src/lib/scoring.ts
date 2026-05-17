export type ScoreLine = {
  home: number;
  away: number;
};

export type MatchOutcome = "HOME" | "DRAW" | "AWAY";

function outcome(score: ScoreLine): MatchOutcome {
  if (score.home > score.away) return "HOME";
  if (score.away > score.home) return "AWAY";
  return "DRAW";
}

export function calculateMatchPoints(predicted: { outcome?: MatchOutcome | null; score?: ScoreLine | null }, actual: ScoreLine) {
  const actualOutcome = outcome(actual);
  const correctOutcome = predicted.outcome === actualOutcome;
  const exactScore = predicted.score ? predicted.score.home === actual.home && predicted.score.away === actual.away : false;

  return {
    points: (correctOutcome ? 1 : 0) + (exactScore ? 3 : 0),
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
