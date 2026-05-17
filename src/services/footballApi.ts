import { MatchStatus } from "@prisma/client";
import { config } from "../lib/config";

export type ExternalTeam = {
  externalId?: string;
  name: string;
  shortName?: string | null;
  flagEmoji?: string | null;
  groupName?: string | null;
};

export type ExternalPlayer = {
  externalId?: string;
  name: string;
  position?: string | null;
  isGoalkeeper: boolean;
  teamExternalId?: string | null;
  teamName?: string | null;
};

export type ExternalCatalog = {
  teams: ExternalTeam[];
  players: ExternalPlayer[];
};

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


function parseTeam(raw: any): ExternalTeam | null {
  const name = raw?.name ?? raw?.team_name ?? raw?.teamName ?? raw?.country;
  if (!name || /\bTBD\b/i.test(String(name))) return null;
  return {
    externalId: raw?.id !== undefined ? String(raw.id) : raw?.external_id !== undefined ? String(raw.external_id) : undefined,
    name: String(name),
    shortName: raw?.shortName ?? raw?.short_name ?? raw?.tla ?? null,
    flagEmoji: raw?.flagEmoji ?? raw?.flag_emoji ?? null,
    groupName: normalizeGroupName(raw?.groupName ?? raw?.group_name ?? raw?.group ?? null)
  };
}

function parsePlayer(raw: any, team?: ExternalTeam | null): ExternalPlayer | null {
  const name = raw?.name ?? raw?.player_name ?? raw?.playerName;
  if (!name) return null;
  const position = raw?.position ?? raw?.role ?? null;
  return {
    externalId: raw?.id !== undefined ? String(raw.id) : raw?.external_id !== undefined ? String(raw.external_id) : undefined,
    name: String(name),
    position,
    isGoalkeeper: Boolean(raw?.isGoalkeeper ?? raw?.is_goalkeeper) || String(position ?? "").toUpperCase().includes("KEEPER") || String(position ?? "").toUpperCase() === "GK",
    teamExternalId: team?.externalId ?? (raw?.team_id !== undefined ? String(raw.team_id) : raw?.teamId !== undefined ? String(raw.teamId) : null),
    teamName: team?.name ?? raw?.team_name ?? raw?.teamName ?? null
  };
}

async function fetchFootballDataTeamDetail(teamId: string): Promise<{ players: ExternalPlayer[] }> {
  const response = await fetch(`${config.footballApiBaseUrl}/teams/${teamId}`, {
    headers: { "X-Auth-Token": config.footballApiKey },
    cache: "no-store"
  });
  if (!response.ok) return { players: [] };
  const payload = await response.json();
  const team = parseTeam(payload);
  return { players: (payload.squad ?? []).map((player: any) => parsePlayer(player, team)).filter(Boolean) as ExternalPlayer[] };
}

async function fetchFootballDataCatalog(): Promise<ExternalCatalog> {
  const response = await fetch(`${config.footballApiBaseUrl}/competitions/${config.worldCupCompetitionCode}/teams`, {
    headers: { "X-Auth-Token": config.footballApiKey },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Football API teams failed: ${response.status}`);
  const payload = await response.json();
  const rawTeams = payload.teams ?? [];
  const teams = rawTeams.map(parseTeam).filter(Boolean) as ExternalTeam[];
  const embeddedPlayers = rawTeams.flatMap((rawTeam: any) => {
    const team = parseTeam(rawTeam);
    return (rawTeam.squad ?? rawTeam.players ?? []).map((player: any) => parsePlayer(player, team)).filter(Boolean) as ExternalPlayer[];
  });

  const detailPlayers = embeddedPlayers.length > 0
    ? []
    : (await Promise.all(teams.filter((team) => team.externalId).map((team) => fetchFootballDataTeamDetail(team.externalId!)))).flatMap((detail) => detail.players);

  return { teams, players: [...embeddedPlayers, ...detailPlayers] };
}

async function fetchWc2026ApiCatalog(): Promise<ExternalCatalog> {
  const [teamsResponse, playersResponse] = await Promise.all([
    fetch(`${config.wc2026ApiBaseUrl}/teams`, { headers: { Authorization: `Bearer ${config.wc2026ApiKey}` }, cache: "no-store" }),
    fetch(`${config.wc2026ApiBaseUrl}/players`, { headers: { Authorization: `Bearer ${config.wc2026ApiKey}` }, cache: "no-store" })
  ]);

  const teamsPayload = teamsResponse.ok ? await teamsResponse.json() : [];
  const playersPayload = playersResponse.ok ? await playersResponse.json() : [];
  const teams = (Array.isArray(teamsPayload) ? teamsPayload : teamsPayload.teams ?? []).map(parseTeam).filter(Boolean) as ExternalTeam[];
  const players = (Array.isArray(playersPayload) ? playersPayload : playersPayload.players ?? []).map((player: any) => parsePlayer(player)).filter(Boolean) as ExternalPlayer[];

  return { teams, players };
}

export async function fetchWorldCupCatalog(): Promise<ExternalCatalog> {
  if (config.wc2026ApiKey) return fetchWc2026ApiCatalog();
  if (config.footballApiKey) return fetchFootballDataCatalog();
  return { teams: [], players: [] };
}
