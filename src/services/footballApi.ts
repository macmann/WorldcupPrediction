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
  const normalized = status.toUpperCase();
  if (["FINISHED", "AWARDED", "COMPLETED"].includes(normalized)) return MatchStatus.FINISHED;
  if (["IN_PLAY", "LIVE"].includes(normalized)) return MatchStatus.LIVE;
  if (["PAUSED", "HALFTIME", "HALF_TIME"].includes(normalized)) return MatchStatus.PAUSED;
  if (["POSTPONED"].includes(normalized)) return MatchStatus.POSTPONED;
  if (["CANCELLED", "SUSPENDED"].includes(normalized)) return MatchStatus.CANCELLED;
  return MatchStatus.SCHEDULED;
}

function normalizeStage(stage?: string | null) {
  if (!stage) return null;
  const normalized = stage.toUpperCase().replaceAll(" ", "_").replaceAll("-", "_");
  if (normalized === "GROUP") return "GROUP_STAGE";
  return normalized;
}

function parseScore(value: unknown) {
  return typeof value === "number" ? value : null;
}

function normalizeGroupName(groupName?: string | null) {
  if (!groupName) return null;
  return groupName.replace(/^GROUP\s+/i, "").trim().toUpperCase();
}

async function fetchFootballDataFixtures(): Promise<ExternalFixture[]> {
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
      groupName: normalizeGroupName(match.group ?? null),
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

async function fetchWc2026ApiFixtures(): Promise<ExternalFixture[]> {
  const response = await fetch(`${config.wc2026ApiBaseUrl}/matches`, {
    headers: { Authorization: `Bearer ${config.wc2026ApiKey}` },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`WC2026 API failed: ${response.status}`);
  const payload = await response.json();
  const matches = Array.isArray(payload) ? payload : payload.matches ?? [];

  return matches.map((match: any) => {
    const homeScore = parseScore(match.home_score ?? match.homeScore ?? match.score?.home ?? match.score?.fullTime?.home);
    const awayScore = parseScore(match.away_score ?? match.awayScore ?? match.score?.away ?? match.score?.fullTime?.away);

    return {
      id: Number(match.id ?? match.match_number ?? match.matchNumber),
      externalId: String(match.id ?? match.match_number ?? match.matchNumber),
      matchday: match.matchday ?? match.match_day ?? null,
      stage: normalizeStage(match.round ?? match.stage),
      groupName: normalizeGroupName(match.group_name ?? match.group ?? null),
      homeTeam: match.home_team ?? match.homeTeam?.name ?? match.homeTeam ?? "TBD",
      awayTeam: match.away_team ?? match.awayTeam?.name ?? match.awayTeam ?? "TBD",
      kickoffTime: match.kickoff_utc ?? match.kickoffTime ?? match.utcDate,
      status: mapStatus(match.status ?? "scheduled"),
      homeScore,
      awayScore,
      homeScore90: parseScore(match.home_score_90 ?? match.homeScore90) ?? homeScore,
      awayScore90: parseScore(match.away_score_90 ?? match.awayScore90) ?? awayScore,
      venue: match.stadium ?? match.venue ?? null
    };
  }).filter((match: ExternalFixture) => Number.isInteger(match.id) && Boolean(match.kickoffTime));
}

export async function fetchWorldCupFixtures(): Promise<ExternalFixture[]> {
  if (config.wc2026ApiKey) return fetchWc2026ApiFixtures();
  if (config.footballApiKey) return fetchFootballDataFixtures();
  return [];
}
