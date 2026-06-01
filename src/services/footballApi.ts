import { MatchStatus } from "@prisma/client";
import { config } from "../lib/config";
import { formatErrorWithCause } from "../lib/errorFormatting";
import { canonicalCountryName, countryNameToFlagEmoji } from "../lib/countryFlags";
import { normalizeMatchGroupName } from "../lib/matchIdentity";

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
  tournamentExternalId?: string | null;
  homeTeamExternalId?: string | null;
  awayTeamExternalId?: string | null;
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

export type ExternalCompetition = {
  code: string;
  name: string;
  externalId: string;
  areaName?: string | null;
  emblem?: string | null;
  startsAt: string;
  endsAt?: string | null;
};

type Provider<T> = {
  name: string;
  load: () => Promise<T>;
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
  return normalizeMatchGroupName(groupName);
}

function unwrapArray(payload: any, keys: string[]) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value;
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.response)) return payload.response;
  return [];
}

function compactCatalog(catalog: ExternalCatalog): ExternalCatalog {
  const teamsByName = new Map<string, ExternalTeam>();
  for (const team of catalog.teams) {
    const key = team.name.trim().toLowerCase();
    const current = teamsByName.get(key);
    teamsByName.set(key, {
      externalId: current?.externalId ?? team.externalId,
      name: canonicalCountryName(current?.name ?? team.name) ?? (current?.name ?? team.name),
      shortName: current?.shortName ?? team.shortName,
      flagEmoji: current?.flagEmoji ?? team.flagEmoji,
      groupName: current?.groupName ?? team.groupName
    });
  }

  const playersByNameAndTeam = new Map<string, ExternalPlayer>();
  for (const player of catalog.players) {
    const teamKey = (player.teamExternalId ?? player.teamName ?? "").trim().toLowerCase();
    const key = `${player.name.trim().toLowerCase()}::${teamKey}`;
    const current = playersByNameAndTeam.get(key);
    playersByNameAndTeam.set(key, {
      externalId: current?.externalId ?? player.externalId,
      name: current?.name ?? player.name,
      position: current?.position ?? player.position,
      isGoalkeeper: Boolean(current?.isGoalkeeper || player.isGoalkeeper),
      teamExternalId: current?.teamExternalId ?? player.teamExternalId,
      teamName: canonicalCountryName(current?.teamName ?? player.teamName)
    });
  }

  return { teams: [...teamsByName.values()], players: [...playersByNameAndTeam.values()] };
}

async function fetchFootballDataFixtures(competitionCode = config.worldCupCompetitionCode): Promise<ExternalFixture[]> {
  const response = await fetch(`${config.footballApiBaseUrl}/competitions/${competitionCode}/matches`, {
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
      externalId: competitionCode === config.worldCupCompetitionCode ? String(match.id) : `football-data:${match.id}`,
      tournamentExternalId: `football-data:${competitionCode}`,
      homeTeamExternalId: match.homeTeam?.id !== undefined && match.homeTeam?.id !== null ? String(match.homeTeam.id) : null,
      awayTeamExternalId: match.awayTeam?.id !== undefined && match.awayTeam?.id !== null ? String(match.awayTeam.id) : null,
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
  const matches = unwrapArray(payload, ["matches", "fixtures"]);

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

async function firstWorkingProvider<T>(providers: Array<Provider<T>>): Promise<T | null> {
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      return await provider.load();
    } catch (error) {
      errors.push(`${provider.name}: ${formatErrorWithCause(error)}`);
      console.warn(errors[errors.length - 1]);
    }
  }

  if (providers.length > 0 && errors.length === providers.length) {
    throw new Error(`All configured fixture providers failed: ${errors.join(" | ")}`);
  }

  return null;
}

export async function fetchFootballDataCompetitionFixtures(competitionCode: string): Promise<ExternalFixture[]> {
  if (!config.footballApiKey) return [];
  return fetchFootballDataFixtures(competitionCode);
}

export async function fetchWorldCupFixtures(): Promise<ExternalFixture[]> {
  const providers: Array<Provider<ExternalFixture[]>> = [];
  if (config.wc2026ApiKey) providers.push({ name: "wc2026", load: fetchWc2026ApiFixtures });
  if (config.footballApiKey) providers.push({ name: "football-data", load: fetchFootballDataFixtures });
  return (await firstWorkingProvider(providers)) ?? [];
}

export async function fetchFootballDataCompetitions(): Promise<ExternalCompetition[]> {
  if (!config.footballApiKey) return [];
  const response = await fetch(`${config.footballApiBaseUrl}/competitions`, {
    headers: { "X-Auth-Token": config.footballApiKey },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Football API competitions failed: ${response.status}`);
  const payload = await response.json();
  return unwrapArray(payload, ["competitions"]).map((competition: any) => {
    const season = competition.currentSeason ?? {};
    const code = competition.code ?? competition.id;
    if (!code || !competition.name) return null;
    return {
      code: String(code),
      name: String(competition.name),
      externalId: `football-data:${code}`,
      areaName: competition.area?.name ?? null,
      emblem: competition.emblem ?? null,
      startsAt: season.startDate ? `${season.startDate}T00:00:00.000Z` : new Date().toISOString(),
      endsAt: season.endDate ? `${season.endDate}T23:59:59.000Z` : null
    };
  }).filter(Boolean) as ExternalCompetition[];
}

function parseTeam(raw: any): ExternalTeam | null {
  const name = raw?.name ?? raw?.team_name ?? raw?.teamName ?? raw?.country ?? raw?.country_name ?? raw?.team?.name;
  if (!name || /\bTBD\b/i.test(String(name))) return null;
  const externalId = raw?.id ?? raw?._id ?? raw?.team_id ?? raw?.teamId ?? raw?.external_id ?? raw?.code ?? raw?.fifa_code ?? raw?.team?.id;
  return {
    externalId: externalId !== undefined && externalId !== null ? String(externalId) : undefined,
    name: canonicalCountryName(String(name)) ?? String(name),
    shortName: raw?.shortName ?? raw?.short_name ?? raw?.tla ?? raw?.code ?? raw?.fifa_code ?? null,
    flagEmoji: raw?.flagEmoji ?? raw?.flag_emoji ?? raw?.flag ?? countryNameToFlagEmoji(String(name)),
    groupName: normalizeGroupName(raw?.groupName ?? raw?.group_name ?? raw?.group ?? null)
  };
}

function parsePlayer(raw: any, team?: ExternalTeam | null): ExternalPlayer | null {
  const firstName = raw?.firstName ?? raw?.first_name;
  const lastName = raw?.lastName ?? raw?.last_name;
  const name = raw?.name ?? raw?.player_name ?? raw?.playerName ?? raw?.full_name ?? (firstName || lastName ? [firstName, lastName].filter(Boolean).join(" ") : null);
  if (!name) return null;
  const position = raw?.position ?? raw?.role ?? raw?.type ?? null;
  const countryName = typeof raw?.country === "string" ? raw.country : null;
  const teamFromPlayer = parseTeam(raw?.team ?? raw?.nationalTeam ?? raw?.country);
  const teamExternalId = team?.externalId ?? teamFromPlayer?.externalId ?? raw?.team_id ?? raw?.teamId ?? raw?.team_external_id ?? raw?.teamExternalId ?? null;
  const teamName = team?.name ?? teamFromPlayer?.name ?? raw?.team_name ?? raw?.teamName ?? countryName ?? raw?.country_name ?? null;
  const externalId = raw?.id ?? raw?._id ?? raw?.player_id ?? raw?.playerId ?? raw?.external_id;
  const normalizedPosition = String(position ?? "").toUpperCase();

  return {
    externalId: externalId !== undefined && externalId !== null ? String(externalId) : undefined,
    name: String(name),
    position,
    isGoalkeeper: Boolean(raw?.isGoalkeeper ?? raw?.is_goalkeeper) || normalizedPosition.includes("KEEPER") || normalizedPosition === "GK" || normalizedPosition === "G",
    teamExternalId: teamExternalId !== undefined && teamExternalId !== null ? String(teamExternalId) : null,
    teamName: canonicalCountryName(teamName ? String(teamName) : null)
  };
}

function playersFromTeamPayload(rawTeam: any, team: ExternalTeam | null) {
  return unwrapArray(rawTeam, ["squad", "players", "roster"]).map((player: any) => parsePlayer(player, team)).filter(Boolean) as ExternalPlayer[];
}

async function fetchFootballDataTeamDetail(teamId: string): Promise<{ players: ExternalPlayer[] }> {
  const response = await fetch(`${config.footballApiBaseUrl}/teams/${teamId}`, {
    headers: { "X-Auth-Token": config.footballApiKey },
    cache: "no-store"
  });
  if (!response.ok) return { players: [] };
  const payload = await response.json();
  const team = parseTeam(payload);
  return { players: playersFromTeamPayload(payload, team) };
}

async function fetchFootballDataCatalog(): Promise<ExternalCatalog> {
  const response = await fetch(`${config.footballApiBaseUrl}/competitions/${config.worldCupCompetitionCode}/teams`, {
    headers: { "X-Auth-Token": config.footballApiKey },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Football API teams failed: ${response.status}`);
  const payload = await response.json();
  const rawTeams = unwrapArray(payload, ["teams"]);
  const teams = rawTeams.map(parseTeam).filter(Boolean) as ExternalTeam[];
  const embeddedPlayers = rawTeams.flatMap((rawTeam: any) => playersFromTeamPayload(rawTeam, parseTeam(rawTeam)));

  const detailPlayers = embeddedPlayers.length > 0
    ? []
    : (await Promise.all(teams.filter((team) => team.externalId).map((team) => fetchFootballDataTeamDetail(team.externalId!)))).flatMap((detail) => detail.players);

  return compactCatalog({ teams, players: [...embeddedPlayers, ...detailPlayers] });
}

async function fetchWc2026Endpoint(path: string) {
  const response = await fetch(`${config.wc2026ApiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${config.wc2026ApiKey}` },
    cache: "no-store"
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchWc2026ApiCatalog(): Promise<ExternalCatalog> {
  const [teamsPayload, playersPayload, squadsPayload] = await Promise.all([
    fetchWc2026Endpoint("/teams"),
    fetchWc2026Endpoint("/players"),
    fetchWc2026Endpoint("/squads")
  ]);

  const rawTeams = unwrapArray(teamsPayload, ["teams"]);
  const teams = rawTeams.map(parseTeam).filter(Boolean) as ExternalTeam[];
  const embeddedPlayers = rawTeams.flatMap((rawTeam: any) => playersFromTeamPayload(rawTeam, parseTeam(rawTeam)));
  const rawPlayers = unwrapArray(playersPayload, ["players"]).map((player: any) => parsePlayer(player)).filter(Boolean) as ExternalPlayer[];
  const squadPlayers = unwrapArray(squadsPayload, ["squads", "teams"]).flatMap((squad: any) => playersFromTeamPayload(squad, parseTeam(squad)));
  const needsTeamDetails = embeddedPlayers.length === 0 && rawPlayers.length === 0 && squadPlayers.length === 0;
  const detailPlayers = needsTeamDetails
    ? (await Promise.all(teams.filter((team) => team.externalId).map(async (team) => {
      const payload = await fetchWc2026Endpoint(`/teams/${team.externalId}`);
      return payload ? playersFromTeamPayload(payload, team) : [];
    }))).flat()
    : [];

  return compactCatalog({ teams, players: [...embeddedPlayers, ...rawPlayers, ...squadPlayers, ...detailPlayers] });
}

export async function fetchWorldCupCatalog(): Promise<ExternalCatalog> {
  const catalogs: ExternalCatalog[] = [];
  if (config.wc2026ApiKey) {
    try {
      catalogs.push(await fetchWc2026ApiCatalog());
    } catch (error) {
      console.warn(error instanceof Error ? error.message : error);
    }
  }
  if (config.footballApiKey) {
    try {
      const wcCatalogHasSquads = catalogs.some((catalog) => catalog.players.length > 0 && catalog.players.some((player) => player.isGoalkeeper));
      if (!wcCatalogHasSquads) catalogs.push(await fetchFootballDataCatalog());
    } catch (error) {
      console.warn(error instanceof Error ? error.message : error);
    }
  }
  return compactCatalog({ teams: catalogs.flatMap((catalog) => catalog.teams), players: catalogs.flatMap((catalog) => catalog.players) });
}
