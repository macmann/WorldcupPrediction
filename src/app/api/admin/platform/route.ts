import { NextResponse } from "next/server";
import { z } from "zod";
import { CompetitionType, GameweekStatus, MatchStatus, SeasonPickTarget, SeasonStatus, StageType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { deadline, fail, scoringRulesSchema } from "@/lib/platformRules";
import { seedPickRules, backfillLegacyTournament, bootstrapPremierLeague } from "@/services/platform/setup";
import { ingestSeasonFixtures, syncSeasonCatalog } from "@/services/platform/fixtures";
import { recalculateSeason, rebuildSeasonInTransaction } from "@/services/platform/recalculation";
import { settleSeasonPick, settleBonus, linkLeagueSeason } from "@/services/platform/gameplay";
import { aiConfigSchema, runAIPundit, resetAIPrediction } from "@/services/platform/ai";
import { databaseNow, seasonTransaction } from "@/services/platform/transactions";
const uuid = z.string().uuid(), time = z.string().datetime(), points = z.number().int().min(0).max(1000);
const option = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), label: z.string().trim().min(1).max(120), labelMy: z.string().max(160).optional() }).strict();
const actions = z.discriminatedUnion("action", [
  z.object({ action: z.literal("bootstrap") }).strict(),
  z.object({ action: z.literal("backfill"), tournamentId: uuid }).strict(),
  z.object({ action: z.literal("competition"), id: uuid.optional(), name: z.string().min(2).max(120), shortName: z.string().min(1).max(40), slug: z.string().regex(/^[a-z0-9-]{2,80}$/), type: z.nativeEnum(CompetitionType), region: z.string().max(80).nullable(), logoUrl: z.string().url().nullable(), provider: z.enum(["football-data", "legacy"]), providerCode: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/).nullable(), isActive: z.boolean(), displayPriority: z.number().int().min(0).max(1000) }).strict(),
  z.object({ action: z.literal("season"), id: uuid.optional(), competitionId: uuid, displayName: z.string().min(1).max(60), startsAt: time, endsAt: time.nullable(), providerSeason: z.number().int().min(1900).max(2200).nullable(), usesGameweeks: z.boolean(), isCurrent: z.boolean(), status: z.nativeEnum(SeasonStatus), timezone: z.string().min(1).max(60), scoringRules: scoringRulesSchema, picksLockAt: time.nullable(), picksLockGameweek: z.number().int().min(1).max(500).nullable(), underdogEnabled: z.boolean(), underdogThreshold: z.number().min(0).max(100), underdogPoints: points, underdogMinSample: z.number().int().min(1).max(100000), aiConfig: aiConfigSchema }).strict(),
  z.object({ action: z.literal("gameweek"), id: uuid.optional(), seasonId: uuid, number: z.number().int().min(1).max(500), name: z.string().max(80).nullable(), startsAt: time.nullable(), endsAt: time.nullable() }).strict(),
  z.object({ action: z.literal("team"), id: uuid.optional(), seasonId: uuid, name: z.string().min(1).max(120), shortName: z.string().max(40).nullable(), badgeUrl: z.string().url().nullable() }).strict(),
  z.object({ action: z.literal("player"), id: uuid.optional(), seasonId: uuid, teamId: uuid.nullable(), name: z.string().min(1).max(120), position: z.string().max(80).nullable(), isGoalkeeper: z.boolean() }).strict(),
  z.object({ action: z.literal("match"), id: z.number().int().positive().optional(), seasonId: uuid, gameweekId: uuid.nullable(), homeTeamId: uuid, awayTeamId: uuid, kickoffTime: time, status: z.nativeEnum(MatchStatus), stage: z.nativeEnum(StageType), homeScore: z.number().int().min(0).max(100).nullable(), awayScore: z.number().int().min(0).max(100).nullable(), isEnabled: z.boolean(), clearOverride: z.boolean().optional() }).strict(),
  z.object({ action: z.literal("pickRule"), seasonId: uuid, key: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/), target: z.nativeEnum(SeasonPickTarget), selectionCount: z.number().int().min(1).max(16), points, enabled: z.boolean(), lockAt: time.nullable() }).strict(),
  z.object({ action: z.literal("settlePick"), ruleId: uuid, selections: z.array(uuid).min(1).max(16) }).strict(),
  z.object({ action: z.literal("bonus"), id: uuid.optional(), gameweekId: uuid, text: z.string().min(1).max(500), textMy: z.string().max(600).nullable(), type: z.enum(["SINGLE_CHOICE", "BOOLEAN", "RANGE"]), options: z.array(option).min(2).max(20), points, lockAt: time, isActive: z.boolean() }).strict(),
  z.object({ action: z.literal("settleBonus"), questionId: uuid, answer: z.string().min(1).max(80) }).strict(),
  z.object({ action: z.literal("sync"), seasonId: uuid }).strict(),
  z.object({ action: z.literal("syncCatalog"), seasonId: uuid }).strict(),
  z.object({ action: z.literal("recalculate"), seasonId: uuid }).strict(),
  z.object({ action: z.literal("runAI"), seasonId: uuid }).strict(),
  z.object({ action: z.literal("resetAI"), seasonId: uuid, matchId: z.number().int().positive() }).strict(),
  z.object({ action: z.literal("linkLeague"), seasonId: uuid, leagueId: uuid }).strict(),
  z.object({ action: z.literal("achievement"), id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/), enabled: z.boolean(), criteria: z.object({ scope: z.enum(["season", "gameweek", "h2h", "privateLeague"]), metric: z.enum(["exactScores", "bestCorrect", "winner", "champion", "movement", "beatLeader", "last"]), threshold: z.number().int().min(1).max(100000) }).strict() }).strict()
]);
export async function GET(request: Request) {
  try {
    await requireAdmin(); const seasonId = uuid.optional().parse(new URL(request.url).searchParams.get("seasonId") ?? undefined);
    const [competitions, seasons, gameweeks, teams, players, matches, pickRules, bonusQuestions, achievements, ai, unmappedMatches, legacyTournaments, leagues] = await Promise.all([
      prisma.competition.findMany({ orderBy: { displayPriority: "asc" } }), prisma.season.findMany({ include: { competition: true }, orderBy: { startsAt: "desc" } }),
      prisma.gameweek.findMany({ where: seasonId ? { seasonId } : {}, orderBy: { number: "asc" } }), prisma.team.findMany({ where: seasonId ? { seasonId } : {}, orderBy: { name: "asc" } }), prisma.player.findMany({ where: seasonId ? { seasonId } : {}, orderBy: { name: "asc" } }),
      prisma.match.findMany({ where: seasonId ? { seasonId } : {}, orderBy: { kickoffTime: "asc" }, take: 600 }), prisma.seasonPickRule.findMany({ where: seasonId ? { seasonId } : {} }), prisma.bonusQuestion.findMany({ where: seasonId ? { gameweek: { seasonId } } : {} }), prisma.achievementDefinition.findMany(), prisma.aIGeneration.findMany({ where: seasonId ? { seasonId } : {}, orderBy: { generatedAt: "desc" }, take: 100 }), prisma.match.count({ where: { seasonId: null } }), prisma.tournament.findMany({ select: { id: true, name: true } }), prisma.league.findMany({ select: { id: true, name: true } })
    ]);
    return NextResponse.json({ competitions, seasons, gameweeks, teams, players, matches, pickRules, bonusQuestions, achievements, ai, unmappedMatches, legacyTournaments, leagues, credentials: { football: Boolean(process.env.FOOTBALL_API_KEY), ai: Boolean(process.env.AI_PUNDIT_API_KEY) } });
  } catch (error) { return jsonError(error); }
}
export async function POST(request: Request) {
  try {
    await requireAdmin(); const input = actions.parse(await request.json()); let result: unknown;
    switch (input.action) {
      case "bootstrap": result = await bootstrapPremierLeague(); break;
      case "backfill": result = await backfillLegacyTournament(input.tournamentId); break;
      case "competition": { const { action: _a, id, ...data } = input; result = id ? await prisma.competition.update({ where: { id }, data }) : await prisma.competition.create({ data }); break; }
      case "season": {
        if (input.endsAt && new Date(input.endsAt) < new Date(input.startsAt)) fail("Season end must follow start", 400);
        try { new Intl.DateTimeFormat("en", { timeZone: input.timezone }).format(); } catch { fail("Unknown season timezone", 400); }
        const { action: _a, id, startsAt, endsAt, picksLockAt, ...rest } = input;
        if (id && (await prisma.season.findUniqueOrThrow({ where: { id } })).competitionId !== input.competitionId) fail("Existing seasons cannot move between competitions", 400);
        result = await seasonTransaction(id ?? input.competitionId, async tx => {
          if (input.isCurrent) await tx.season.updateMany({ where: { competitionId: input.competitionId, isCurrent: true }, data: { isCurrent: false } });
          const data = { ...rest, startsAt: new Date(startsAt), endsAt: endsAt ? new Date(endsAt) : null, picksLockAt: picksLockAt ? new Date(picksLockAt) : null };
          const season = id ? await tx.season.update({ where: { id }, data }) : await tx.season.create({ data });
          if (season.usesGameweeks && !season.legacyTournamentId) await seedPickRules(season.id, tx);
          await rebuildSeasonInTransaction(tx, season.id); return season;
        }); break;
      }
      case "gameweek": {
        const { action: _a, id, startsAt, endsAt, ...rest } = input;
        if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) fail("Gameweek end must follow start", 400);
        const data = { ...rest, startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null };
        if (id && (await prisma.gameweek.findUniqueOrThrow({ where: { id } })).seasonId !== rest.seasonId) fail("Gameweeks cannot move between seasons", 400);
        result = id ? await prisma.gameweek.update({ where: { id }, data }) : await prisma.gameweek.create({ data }); break;
      }
      case "team": { const { action: _a, id, ...data } = input; if (id && (await prisma.team.findUniqueOrThrow({ where: { id } })).seasonId !== input.seasonId) fail("Teams cannot move between seasons", 400); result = id ? await prisma.team.update({ where: { id }, data }) : await prisma.team.create({ data }); break; }
      case "player": { const { action: _a, id, ...data } = input; if (data.teamId && (await prisma.team.findUniqueOrThrow({ where: { id: data.teamId } })).seasonId !== data.seasonId) fail("Team belongs to another season", 400); if (id && (await prisma.player.findUniqueOrThrow({ where: { id } })).seasonId !== data.seasonId) fail("Players cannot move between seasons", 400); result = id ? await prisma.player.update({ where: { id }, data: { ...data, source: "MANUAL" } }) : await prisma.player.create({ data: { ...data, source: "MANUAL" } }); break; }
      case "match": {
        result = await seasonTransaction(input.seasonId, async tx => {
          const season = await tx.season.findUniqueOrThrow({ where: { id: input.seasonId } });
          const home = await tx.team.findFirst({ where: { id: input.homeTeamId, seasonId: season.id } }), away = await tx.team.findFirst({ where: { id: input.awayTeamId, seasonId: season.id } });
          if (!home || !away || home.id === away.id) fail("Choose two distinct teams in the season", 400);
          if (input.gameweekId && (await tx.gameweek.findUniqueOrThrow({ where: { id: input.gameweekId } })).seasonId !== season.id) fail("Gameweek belongs to another season", 400);
          if (input.status === "FINISHED" && (input.homeScore === null || input.awayScore === null)) fail("Finished matches require both scores", 400);
          const previous = input.id ? await tx.match.findUniqueOrThrow({ where: { id: input.id }, include: { bankers: true } }) : null;
          if (previous?.seasonId && previous.seasonId !== season.id) fail("Mapped matches cannot move between seasons", 400);
          const now = await databaseNow(tx), locked = previous && now >= deadline(previous);
          if (previous?.bankers.length && !locked && input.gameweekId !== previous.scoringGameweekId) fail("Use fixture sync to safely relocate a selected Banker", 409);
          const data = { seasonId: season.id, competitionId: season.competitionId, gameweekId: input.gameweekId, scoringGameweekId: locked ? previous.scoringGameweekId : input.gameweekId, predictionLockAt: locked ? deadline(previous) : null, homeTeamId: home.id, awayTeamId: away.id, homeTeam: home.name, awayTeam: away.name, kickoffTime: new Date(input.kickoffTime), status: input.status, stage: input.stage, homeScore: input.homeScore, awayScore: input.awayScore, homeScore90: input.homeScore, awayScore90: input.awayScore, isEnabled: input.isEnabled, isResultOverride: !input.clearOverride };
          const match = input.id ? await tx.match.update({ where: { id: input.id }, data }) : await tx.match.create({ data });
          await rebuildSeasonInTransaction(tx, season.id); return match;
        }); break;
      }
      case "pickRule": { const { action: _a, lockAt, ...rest } = input; const data = { ...rest, lockAt: lockAt ? new Date(lockAt) : null }; result = await seasonTransaction(input.seasonId, async tx => { const r = await tx.seasonPickRule.upsert({ where: { seasonId_key: { seasonId: input.seasonId, key: input.key } }, create: data, update: data }); await rebuildSeasonInTransaction(tx, input.seasonId); return r; }); break; }
      case "settlePick": result = await settleSeasonPick(input.ruleId, input.selections); break;
      case "bonus": {
        if (new Set(input.options.map(o => o.id)).size !== input.options.length) fail("Bonus options need distinct IDs", 400);
        const { action: _a, id, lockAt, ...rest } = input; const gw = await prisma.gameweek.findUniqueOrThrow({ where: { id: input.gameweekId } });
        result = await seasonTransaction(gw.seasonId, async tx => {
          if (id) { const existing = await tx.bonusQuestion.findUniqueOrThrow({ where: { id }, include: { answers: true } }); if (existing.gameweekId !== rest.gameweekId) fail("Bonus questions cannot move between gameweeks", 400); if (existing.answers.length && existing.lockAt <= await databaseNow(tx) && (new Date(lockAt).getTime() !== existing.lockAt.getTime() || JSON.stringify(existing.options) !== JSON.stringify(rest.options))) fail("Locked question options/deadline cannot change after submissions", 403); }
          const data = { ...rest, lockAt: new Date(lockAt) }; const q = id ? await tx.bonusQuestion.update({ where: { id }, data }) : await tx.bonusQuestion.create({ data }); await rebuildSeasonInTransaction(tx, gw.seasonId); return q;
        }); break;
      }
      case "settleBonus": result = await settleBonus(input.questionId, input.answer); break;
      case "sync": result = await ingestSeasonFixtures(input.seasonId); break;
      case "syncCatalog": result = await syncSeasonCatalog(input.seasonId); break;
      case "recalculate": result = await recalculateSeason(input.seasonId); break;
      case "runAI": result = await runAIPundit(input.seasonId); break;
      case "resetAI": await resetAIPrediction(input.seasonId, input.matchId); result = { reset: true }; break;
      case "linkLeague": result = await seasonTransaction(input.seasonId, tx => linkLeagueSeason(tx, input.leagueId, input.seasonId)); await recalculateSeason(input.seasonId); break;
      case "achievement": { const { action: _a, ...data } = input; result = await prisma.achievementDefinition.upsert({ where: { id: input.id }, create: data, update: data }); for (const s of await prisma.season.findMany({ select: { id: true } })) await recalculateSeason(s.id); break; }
    }
    return NextResponse.json({ result });
  } catch (error) { return jsonError(error); }
}
