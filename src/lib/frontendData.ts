import { leaderboard, leagues } from "@/lib/demoData";

export type MatchPrediction = {
  predictedHomeScore: number;
  predictedAwayScore: number;
  pointsAwarded?: number | null;
};

export type Match = {
  id: number;
  matchday?: string | number | null;
  stage?: string | null;
  groupName?: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  status: string;
  homeScore?: number | null;
  awayScore?: number | null;
  isLocked?: boolean;
  prediction?: MatchPrediction | null;
};

export type MatchFilters = {
  group?: string;
  stage?: string;
  matchday?: string | number;
};

export const demoOutrightOptions = {
  teams: [
    { id: "11111111-1111-4111-8111-111111111111", name: "Argentina" },
    { id: "22222222-2222-4222-8222-222222222222", name: "France" },
    { id: "33333333-3333-4333-8333-333333333333", name: "Brazil" },
    { id: "44444444-4444-4444-8444-444444444444", name: "Spain" }
  ],
  players: [
    { id: "55555555-5555-4555-8555-555555555555", name: "Kylian Mbappé" },
    { id: "66666666-6666-4666-8666-666666666666", name: "Lionel Messi" },
    { id: "77777777-7777-4777-8777-777777777777", name: "Jude Bellingham" },
    { id: "88888888-8888-4888-8888-888888888888", name: "Vinícius Jr." }
  ],
  goalkeepers: [
    { id: "99999999-9999-4999-8999-999999999999", name: "Alisson" },
    { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Emiliano Martínez" },
    { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Thibaut Courtois" },
    { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Mike Maignan" }
  ]
};

export const defaultOutrights = {
  champion: "Argentina",
  bestPlayer: "Kylian Mbappé",
  bestGk: "Alisson",
  tournamentStartsAt: "2026-06-11T00:00:00.000Z"
};

export function getDemoLeagues() {
  return leagues;
}

export function getDemoLeaderboard() {
  return leaderboard.map((user) => ({ rank: user.rank, user, joinedAt: user.registrationTimestamp }));
}

export function matchLabel(match: Pick<Match, "matchday" | "stage" | "groupName">) {
  if (match.stage === "GROUP" && match.groupName) return `Group ${match.groupName}`;
  if (match.stage && match.stage !== "GROUP") return match.stage.replaceAll("_", " ");
  return match.matchday ? `Matchday ${match.matchday}` : "Fixture";
}
