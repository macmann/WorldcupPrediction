import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { platformView, resolveSeason } from "@/services/platform/views";
import { chooseBanker, chooseRival, enroll, generateH2H, linkLeagueSeason, saveBonusAnswer, saveSeasonPick } from "@/services/platform/gameplay";
import { seasonTransaction } from "@/services/platform/transactions";
import { recalculateSeason } from "@/services/platform/recalculation";
import { fail } from "@/lib/platformRules";
const uuid = z.string().uuid();
const actions = z.discriminatedUnion("action", [
  z.object({ action: z.literal("context"), seasonId: uuid }).strict(),
  z.object({ action: z.literal("enroll"), seasonId: uuid }).strict(),
  z.object({ action: z.literal("banker"), gameweekId: uuid, matchId: z.number().int().positive().nullable() }).strict(),
  z.object({ action: z.literal("pick"), ruleId: uuid, selections: z.array(uuid).min(1).max(16) }).strict(),
  z.object({ action: z.literal("bonus"), questionId: uuid, answer: z.string().min(1).max(80) }).strict(),
  z.object({ action: z.literal("rival"), seasonId: uuid, rivalId: uuid.nullable() }).strict(),
  z.object({ action: z.literal("h2h"), seasonId: uuid, leagueId: uuid }).strict(),
  z.object({ action: z.literal("linkLeague"), seasonId: uuid, leagueId: uuid }).strict(),
  z.object({ action: z.literal("readNotification"), id: uuid }).strict(),
  z.object({ action: z.literal("notificationPreferences"), all: z.boolean(), reminders: z.boolean(), gameweek: z.boolean(), rival: z.boolean(), achievement: z.boolean() }).strict()
]);
export async function GET(request: Request) {
  try {
    const user = await requireUser(); const params = new URL(request.url).searchParams;
    const seasonId = uuid.optional().parse(params.get("seasonId") ?? cookies().get("football_season")?.value);
    const gameweekId = uuid.optional().parse(params.get("gameweekId") ?? undefined);
    return NextResponse.json({ view: await platformView(user.id, seasonId, gameweekId) });
  } catch (error) { return jsonError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(); const input = actions.parse(await request.json()); let result: unknown;
    switch (input.action) {
      case "context": await resolveSeason(input.seasonId); cookies().set("football_season", input.seasonId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31536000 }); result = { selected: input.seasonId }; break;
      case "enroll": await resolveSeason(input.seasonId); await seasonTransaction(input.seasonId, tx => enroll(tx, input.seasonId, user.id)); result = await recalculateSeason(input.seasonId); break;
      case "banker": result = await chooseBanker(user.id, input.gameweekId, input.matchId); break;
      case "pick": result = await saveSeasonPick(user.id, input.ruleId, input.selections); break;
      case "bonus": result = await saveBonusAnswer(user.id, input.questionId, input.answer); break;
      case "rival": result = await chooseRival(user.id, input.seasonId, input.rivalId); break;
      case "h2h": result = await generateH2H(user.id, input.leagueId, input.seasonId); break;
      case "linkLeague": {
        const league = await prisma.league.findUniqueOrThrow({ where: { id: input.leagueId } });
        if (league.ownerUserId !== user.id) fail("Only the league owner may select seasons", 403);
        result = await seasonTransaction(input.seasonId, tx => linkLeagueSeason(tx, input.leagueId, input.seasonId)); await recalculateSeason(input.seasonId); break;
      }
      case "readNotification": result = await prisma.platformNotification.updateMany({ where: { id: input.id, userId: user.id }, data: { readAt: new Date() } }); break;
      case "notificationPreferences": { const { action: _action, ...settings } = input; result = await prisma.user.update({ where: { id: user.id }, data: { notificationSettings: settings }, select: { notificationSettings: true } }); break; }
    }
    return NextResponse.json({ result });
  } catch (error) { return jsonError(error); }
}
