export type ScoreLine = {
  home: number;
  away: number;
};

export function calculateMatchPoints(predicted: ScoreLine, actual: ScoreLine) {
  const exactScore = predicted.home === actual.home && predicted.away === actual.away;
  if (exactScore) return { points: 2, exact: true };

  const predictedHomeWin = predicted.home > predicted.away;
  const predictedAwayWin = predicted.away > predicted.home;
  const predictedDraw = predicted.home === predicted.away;
  const actualHomeWin = actual.home > actual.away;
  const actualAwayWin = actual.away > actual.home;
  const actualDraw = actual.home === actual.away;

  if (
    (predictedHomeWin && actualHomeWin) ||
    (predictedAwayWin && actualAwayWin) ||
    (predictedDraw && actualDraw)
  ) {
    return { points: 1, exact: false };
  }

  return { points: 0, exact: false };
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
