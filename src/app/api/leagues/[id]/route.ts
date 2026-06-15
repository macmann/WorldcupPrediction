import { LeagueType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().uuid() });
const actionSchema = z.object({ action: z.literal("leave") }).strict();

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = paramsSchema.parse(params);
    actionSchema.parse(await request.json());
    const user = await requireUser();
    const league = await prisma.league.findUnique({ where: { id }, select: { id: true, type: true, ownerUserId: true } });
    if (!league) throw Object.assign(new Error("League not found"), { status: 404 });
    if (league.type === LeagueType.GLOBAL) throw Object.assign(new Error("The global leaderboard cannot be left"), { status: 400 });
    if (league.ownerUserId === user.id) throw Object.assign(new Error("League owners cannot leave their own mini league. Delete it instead."), { status: 400 });

    const deleted = await prisma.leagueMember.deleteMany({ where: { leagueId: id, userId: user.id } });
    if (deleted.count === 0) throw Object.assign(new Error("League not found"), { status: 404 });
    await prisma.leagueRankSnapshot.deleteMany({ where: { leagueId: id, userId: user.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = paramsSchema.parse(params);
    const user = await requireUser();
    const league = await prisma.league.findUnique({ where: { id }, select: { type: true, ownerUserId: true } });
    if (!league) throw Object.assign(new Error("League not found"), { status: 404 });
    if (league.type === LeagueType.GLOBAL) throw Object.assign(new Error("The global leaderboard cannot be deleted"), { status: 400 });
    if (league.ownerUserId !== user.id) throw Object.assign(new Error("Only the league owner can delete this mini league"), { status: 403 });

    await prisma.league.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
