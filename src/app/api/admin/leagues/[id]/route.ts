import { NextResponse } from "next/server";
import { z } from "zod";
import { LeagueType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(params);
    const league = await prisma.league.findUnique({ where: { id }, select: { type: true } });
    if (!league) throw Object.assign(new Error("League not found"), { status: 404 });
    if (league.type === LeagueType.GLOBAL) throw Object.assign(new Error("The global leaderboard cannot be deleted"), { status: 400 });
    await prisma.league.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
