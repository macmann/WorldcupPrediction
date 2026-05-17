import { MatchStatus } from "@prisma/client";
import { config } from "../lib/config";

export type ExternalFixture = {
  id: number;
  externalId?: string;
  matchday?: number | null;
  stage?: string | null;
  groupName?: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeScore90: number | null;
  awayScore90: number | null;
  venue?: string | null;
};

function mapStatus(status: string): MatchStatus {
  if (["FINISHED", "AWARDED"].includes(status)) return MatchStatus.FINISHED;
  if (["IN_PLAY", "LIVE"].includes(status)) return MatchStatus.LIVE;
  if (["PAUSED"].includes(status)) return MatchStatus.PAUSED;
  if (["POSTPONED"].includes(status)) return MatchStatus.POSTPONED;
  if (["CANCELLED", "SUSPENDED"].includes(status)) return MatchStatus.CANCELLED;
  return MatchStatus.SCHEDULED;
}

export async function fetchWorldCupFixtures(): Promise<ExternalFixture[]> {
  if (!config.footballApiKey) return [];
  const response = await fetch(`${config.footballApiBaseUrl}/competitions/${config.worldCupCompetitionCode}/matches`, {
    headers: { "X-Auth-Token": config.footballApiKey },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Football API failed: ${response.status}`);
  const payload = await response.json();
  return (payload.matches ?? []).map((match: any) => {
    const duration = match.score?.duration;
    const canUseFullTimeAsStandardTime = !duration || duration === "REGULAR";

    return {
      id: match.id,
      externalId: String(match.id),
      matchday: match.matchday ?? null,
      stage: match.stage ?? null,
      groupName: match.group ?? null,
      homeTeam: match.homeTeam?.name ?? "TBD",
      awayTeam: match.awayTeam?.name ?? "TBD",
      kickoffTime: match.utcDate,
      status: mapStatus(match.status),
      homeScore: match.score?.fullTime?.home ?? null,
      awayScore: match.score?.fullTime?.away ?? null,
      homeScore90: match.score?.regularTime?.home ?? (canUseFullTimeAsStandardTime ? match.score?.fullTime?.home : null) ?? null,
      awayScore90: match.score?.regularTime?.away ?? (canUseFullTimeAsStandardTime ? match.score?.fullTime?.away : null) ?? null,
      venue: match.venue ?? null
    };
  });
}
