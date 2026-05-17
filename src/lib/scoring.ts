export type ScoreLine = {
  home: number;
  away: number;
};

function outcome(score: ScoreLine) {
  if (score.home > score.away) return "HOME";
  if (score.away > score.home) return "AWAY";
  return "DRAW";
}

export function calculateMatchPoints(predicted: ScoreLine, actual: ScoreLine) {
  const exactScore = predicted.home === actual.home && predicted.away === actual.away;
  if (exactScore) return { points: 2, exact: true, correctOutcome: true };

  const correctOutcome = outcome(predicted) === outcome(actual);
  if (correctOutcome) return { points: 1, exact: false, correctOutcome: true };

  return { points: 0, exact: false, correctOutcome: false };
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
