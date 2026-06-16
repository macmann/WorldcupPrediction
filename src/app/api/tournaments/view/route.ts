import { MatchStatus, StageType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { teamFlagEmoji, teamFlagImageUrl } from "@/lib/countryFlags";
import { jsonError } from "@/lib/http";
import { dedupeMatchesByFixture, normalizeMatchGroupName } from "@/lib/matchIdentity";
import { prisma } from "@/lib/prisma";
import { ingestFixtures } from "@/services/fixtures";

type GroupRow = { id: string; name: string; flagEmoji: string | null; flagImageUrl: string | null; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number };

const stageOrder: Record<StageType, number> = { GROUP: 0, ROUND_OF_32: 1, ROUND_OF_16: 2, QUARTER_FINAL: 3, SEMI_FINAL: 4, THIRD_PLACE: 5, FINAL: 6 };
function getCurrentStage(matches: Array<{ stage: StageType; status: MatchStatus }>) {
  const unfinished = matches.filter((match) => match.status !== MatchStatus.FINISHED).sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage]);
  if (unfinished[0]) return unfinished[0].stage;
  return matches.sort((a, b) => stageOrder[b.stage] - stageOrder[a.stage])[0]?.stage ?? StageType.GROUP;
}
function groupSortValue(groupName: string) { return groupName.length === 1 ? groupName.charCodeAt(0) : Number.MAX_SAFE_INTEGER; }
function createRow(id: string, name: string, flagEmoji?: string | null): GroupRow { return { id, name, flagEmoji: teamFlagEmoji(name, flagEmoji), flagImageUrl: teamFlagImageUrl(name), played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }; }
function applyResult(row: GroupRow, goalsFor: number, goalsAgainst: number) { row.played += 1; row.goalsFor += goalsFor; row.goalsAgainst += goalsAgainst; row.goalDifference = row.goalsFor - row.goalsAgainst; if (goalsFor > goalsAgainst) { row.won += 1; row.points += 3; } else if (goalsFor === goalsAgainst) { row.drawn += 1; row.points += 1; } else { row.lost += 1; } }

export async function GET() {
  try {
    await requireUser();
    const fixtureCount = await prisma.match.count();
    const hasFixtureProvider = Boolean(config.wc2026ApiKey || config.footballApiKey);
    const hasSyncedFixtures = fixtureCount > 0 && Boolean(await prisma.match.findFirst({ where: { lastSyncedAt: { not: null } }, select: { id: true } }));
    if (hasFixtureProvider && (fixtureCount === 0 || !hasSyncedFixtures)) await ingestFixtures();

    const tournament = await prisma.tournament.findFirst({ where: { isActive: true }, orderBy: [{ startsAt: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true, startsAt: true, endsAt: true } });
    const [teams, matches] = await Promise.all([
      prisma.team.findMany({ where: tournament ? { tournamentId: tournament.id } : {}, orderBy: [{ groupName: "asc" }, { name: "asc" }], select: { id: true, name: true, flagEmoji: true, groupName: true } }),
      prisma.match.findMany({ where: { isEnabled: true, ...(tournament ? { OR: [{ tournamentId: tournament.id }, { tournamentId: null }] } : {}) }, orderBy: [{ stage: "asc" }, { kickoffTime: "asc" }], include: { homeTeamRef: { select: { id: true, flagEmoji: true } }, awayTeamRef: { select: { id: true, flagEmoji: true } }, tournament: { select: { id: true, name: true, slug: true } } } })
    ]);

    const groupRows = new Map<string, Map<string, GroupRow>>();
    for (const team of teams) { const groupName = normalizeMatchGroupName(team.groupName) ?? "TBD"; if (!groupRows.has(groupName)) groupRows.set(groupName, new Map()); groupRows.get(groupName)!.set(team.id, createRow(team.id, team.name, team.flagEmoji)); }

    const uniqueMatches = dedupeMatchesByFixture(matches);
    for (const match of uniqueMatches) {
      if (match.stage !== StageType.GROUP || match.status !== MatchStatus.FINISHED || match.homeScore90 === null || match.awayScore90 === null) continue;
      const rows = groupRows.get(normalizeMatchGroupName(match.groupName) ?? "TBD");
      const homeKey = match.homeTeamId ?? match.homeTeamRef?.id;
      const awayKey = match.awayTeamId ?? match.awayTeamRef?.id;
      const homeRow = homeKey ? rows?.get(homeKey) : undefined;
      const awayRow = awayKey ? rows?.get(awayKey) : undefined;
      if (!homeRow || !awayRow) continue;
      applyResult(homeRow, match.homeScore90, match.awayScore90);
      applyResult(awayRow, match.awayScore90, match.homeScore90);
    }

    const groups = Array.from(groupRows.entries()).sort(([a], [b]) => groupSortValue(a) - groupSortValue(b) || a.localeCompare(b)).map(([name, rows]) => ({ name: `Group ${name}`, teams: Array.from(rows.values()).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name)).map((team, index) => ({ ...team, rank: index + 1 })) }));
    const currentStage = getCurrentStage([...uniqueMatches]);
    const knockoutFixtures = uniqueMatches.filter((match) => match.stage !== StageType.GROUP && match.stage !== StageType.THIRD_PLACE).sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage] || a.kickoffTime.getTime() - b.kickoffTime.getTime()).map((match) => ({ id: match.id, stage: match.stage, groupName: normalizeMatchGroupName(match.groupName), kickoffTime: match.kickoffTime, venue: match.venue, status: match.status, homeTeam: match.homeTeam, awayTeam: match.awayTeam, homeScore: match.homeScore, awayScore: match.awayScore, homeFlagEmoji: teamFlagEmoji(match.homeTeam, match.homeTeamRef?.flagEmoji), awayFlagEmoji: teamFlagEmoji(match.awayTeam, match.awayTeamRef?.flagEmoji), homeFlagImageUrl: teamFlagImageUrl(match.homeTeam), awayFlagImageUrl: teamFlagImageUrl(match.awayTeam), tournament: match.tournament }));
    return NextResponse.json({ tournament, currentStage, groups, knockoutFixtures });
  } catch (error) { return jsonError(error); }
}
