export const matchdays = ["Group A", "Group B", "Group C", "Round of 16", "Quarterfinals"];
export const matches = [
  { id: 1, matchday: "Group A", homeTeam: "Mexico", awayTeam: "South Africa", kickoffTime: "2026-06-11T19:00:00Z", status: "SCHEDULED", homeScore: null, awayScore: null, prediction: { predictedHomeScore: 2, predictedAwayScore: 1 } },
  { id: 2, matchday: "Group A", homeTeam: "Canada", awayTeam: "Japan", kickoffTime: "2026-06-12T02:00:00Z", status: "SCHEDULED", homeScore: null, awayScore: null, prediction: null },
  { id: 3, matchday: "Group B", homeTeam: "Argentina", awayTeam: "Denmark", kickoffTime: "2026-06-13T20:00:00Z", status: "LIVE", homeScore: 1, awayScore: 0, prediction: { predictedHomeScore: 2, predictedAwayScore: 0 } },
  { id: 4, matchday: "Group C", homeTeam: "France", awayTeam: "Ghana", kickoffTime: "2025-06-14T17:00:00Z", status: "FINISHED", homeScore: 3, awayScore: 1, prediction: { predictedHomeScore: 2, predictedAwayScore: 1, pointsAwarded: 1 } }
];
export const leagues = [
  { id: "global", name: "Global World Cup Standings", rank: 128, members: 9124 },
  { id: "friends", name: "Friday Night Football", rank: 2, members: 18 }
];
export const leaderboard = [
  { rank: 1, displayName: "Marta", globalPoints: 18, exactScoresCount: 6, registrationTimestamp: "2026-01-01" },
  { rank: 2, displayName: "You", globalPoints: 17, exactScoresCount: 5, registrationTimestamp: "2026-01-03" },
  { rank: 3, displayName: "Sam", globalPoints: 17, exactScoresCount: 5, registrationTimestamp: "2026-01-08" }
];
