export type MatchOutcome = "HOME" | "DRAW" | "AWAY";

export type MatchPrediction = {
  predictedOutcome?: MatchOutcome | null;
  predictedHomeScore?: number | null;
  predictedAwayScore?: number | null;
  pointsAwarded?: number | null;
  isExactScore?: boolean;
  isCorrectOutcome?: boolean;
};

export type Match = {
  id: number;
  matchday?: string | number | null;
  stage?: string | null;
  groupName?: string | null;
  homeTeam: string;
  awayTeam: string;
  homeFlagEmoji?: string | null;
  awayFlagEmoji?: string | null;
  homeFlagImageUrl?: string | null;
  awayFlagImageUrl?: string | null;
  kickoffTime: string;
  status: string;
  isEnabled?: boolean;
  tournament?: { id: string; name: string; slug: string } | null;
  homeScore?: number | null;
  awayScore?: number | null;
  isLocked?: boolean;
  prediction?: MatchPrediction | null;
};

export type MatchFilters = {
  group?: string;
  stage?: string;
  matchday?: string | number;
  tournamentId?: string;
};

export type Stream = {
  id: string;
  name: string;
  slug: string;
  startsAt: string;
  endsAt?: string | null;
  isActive: boolean;
};

export type OutrightOption = {
  id: string;
  name: string;
  groupName?: string | null;
  teamName?: string | null;
  teamId?: string | null;
  position?: string | null;
  isGoalkeeper?: boolean;
};

export type OutrightOptionsPayload = {
  tournament: { id: string; name: string; startsAt: string; outrightLockAt: string };
  canEdit: boolean;
  options: {
    teams: OutrightOption[];
    players: OutrightOption[];
    goalkeepers: OutrightOption[];
    goldenBootPlayers: OutrightOption[];
  };
  outright: {
    championTeamId: string;
    secondRunnerUpTeamId: string;
    fairPlayTeamId: string;
    bestPlayerId: string;
    bestGkId: string;
    goldenBootPlayerId: string;
    youngPlayerId: string;
    champion: string;
    secondRunnerUp: string;
    fairPlay: string;
    bestPlayer: string;
    bestGk: string;
    goldenBoot: string;
    youngPlayer: string;
  } | null;
  source: "live-provider" | "database";
  message: string | null;
};

export const defaultOutrights = {
  champion: "—",
  bestPlayer: "—",
  bestGk: "—",
  tournamentStartsAt: "2026-06-11T00:00:00.000Z"
};

export function matchLabel(match: Pick<Match, "matchday" | "stage" | "groupName">) {
  if (match.stage === "GROUP" && match.groupName) return `Group ${match.groupName}`;
  if (match.stage && match.stage !== "GROUP") return match.stage.replaceAll("_", " ");
  return match.matchday ? `Matchday ${match.matchday}` : "Fixture";
}
