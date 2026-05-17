import { MatchStatus } from "@prisma/client";
import { config } from "../lib/config";

export type ExternalFixture = {
  id: number;
  matchday?: number;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
};

function mapStatus(status: string): MatchStatus {
  if (["FINISHED", "AWARDED"].includes(status)) return MatchStatus.FINISHED;
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(status)) return MatchStatus.LIVE;
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
  return (payload.matches ?? []).map((match: any) => ({
    id: match.id,
    matchday: match.matchday ?? null,
    homeTeam: match.homeTeam?.name ?? "TBD",
    awayTeam: match.awayTeam?.name ?? "TBD",
    kickoffTime: match.utcDate,
    status: mapStatus(match.status),
    homeScore: match.score?.fullTime?.home ?? null,
    awayScore: match.score?.fullTime?.away ?? null
  }));
}
