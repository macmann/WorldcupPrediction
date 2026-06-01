import { NextResponse } from "next/server";
import { z } from "zod";
import { GLOBAL_LEAGUE_CODE } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(params);

    const globalLeague = await prisma.league.findFirst({
      where: { OR: [{ type: "GLOBAL" }, { joinCode: GLOBAL_LEAGUE_CODE }] },
      select: { id: true }
    });
    if (!globalLeague) throw Object.assign(new Error("Global league not found"), { status: 404 });

    await prisma.$transaction([
      prisma.leagueRankSnapshot.deleteMany({ where: { leagueId: globalLeague.id, userId: id } }),
      prisma.leagueMember.deleteMany({ where: { leagueId: globalLeague.id, userId: id } })
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
