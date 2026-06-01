import { countryCodeFromName } from "./countryFlags";
import { appDateKey } from "./dateTime";

export type MatchIdentityInput = {
  id: number;
  tournamentId?: string | null;
  externalId?: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string | Date;
  groupName?: string | null;
  stage?: string | null;
  predictions?: unknown[];
};

function normalizeTeamName(teamName: string) {
  const countryCode = countryCodeFromName(teamName);
  if (countryCode) return `country:${countryCode}`;

  return teamName.trim().replace(/\s+/g, " ").toLowerCase();
}

function kickoffIdentity(kickoffTime: string | Date) {
  return new Date(kickoffTime).toISOString();
}

function normalizeStageName(stage?: string | null) {
  return stage?.trim().replace(/[\s-]+/g, "_").toUpperCase() || null;
}

function duplicatePriority(match: MatchIdentityInput) {
  const hasPrediction = Array.isArray(match.predictions) && match.predictions.length > 0;
  return [
    hasPrediction ? 1 : 0,
    match.tournamentId ? 1 : 0,
    match.externalId ? 1 : 0,
    match.id * -1
  ];
}

function isPreferredMatch(candidate: MatchIdentityInput, current: MatchIdentityInput) {
  const candidatePriority = duplicatePriority(candidate);
  const currentPriority = duplicatePriority(current);

  for (let index = 0; index < candidatePriority.length; index += 1) {
    if (candidatePriority[index] !== currentPriority[index]) {
      return candidatePriority[index] > currentPriority[index];
    }
  }

  return false;
}

export function normalizeMatchGroupName(groupName?: string | null) {
  if (!groupName) return null;

  const normalized = groupName.trim().replace(/[\s-]+/g, "_").toUpperCase();
  const groupPrefixMatch = normalized.match(/^GROUP_?(.+)$/);
  const withoutPrefix = groupPrefixMatch?.[1] ?? normalized;

  return withoutPrefix.trim() || null;
}

export function matchGroupNameCandidates(groupName: string) {
  const normalizedGroupName = normalizeMatchGroupName(groupName);
  if (!normalizedGroupName) return [groupName];

  return Array.from(new Set([normalizedGroupName, `GROUP_${normalizedGroupName}`, `GROUP ${normalizedGroupName}`, groupName.toUpperCase()]));
}

export function matchDeduplicationKey(match: Pick<MatchIdentityInput, "homeTeam" | "awayTeam" | "kickoffTime">) {
  return [kickoffIdentity(match.kickoffTime), normalizeTeamName(match.homeTeam), normalizeTeamName(match.awayTeam)].join("::");
}

function fuzzyMatchDeduplicationKey(match: Pick<MatchIdentityInput, "homeTeam" | "awayTeam" | "kickoffTime" | "groupName" | "stage">) {
  const normalizedGroupName = normalizeMatchGroupName(match.groupName);
  const normalizedStage = normalizeStageName(match.stage) ?? (normalizedGroupName ? "GROUP" : "UNKNOWN_STAGE");

  return [
    appDateKey(match.kickoffTime),
    normalizedStage,
    normalizedGroupName ?? "UNKNOWN_GROUP",
    normalizeTeamName(match.homeTeam),
    normalizeTeamName(match.awayTeam)
  ].join("::");
}

export function dedupeMatchesByFixture<T extends MatchIdentityInput>(matches: T[]) {
  const dedupedMatches = new Map<string, T>();

  for (const match of matches) {
    const key = fuzzyMatchDeduplicationKey(match);
    const currentMatch = dedupedMatches.get(key);

    if (!currentMatch || isPreferredMatch(match, currentMatch)) {
      dedupedMatches.set(key, match);
    }
  }

  return Array.from(dedupedMatches.values()).sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime() || a.id - b.id);
}
