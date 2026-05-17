import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const membership = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId: params.id, userId: user.id } } });
    if (!membership) throw Object.assign(new Error("League not found"), { status: 404 });
    const members = await prisma.leagueMember.findMany({
      where: { leagueId: params.id },
      include: { user: true },
      orderBy: [
        { user: { globalPoints: "desc" } },
        { user: { exactScoresCount: "desc" } },
        { user: { registrationTimestamp: "asc" } }
      ]
    });
    return NextResponse.json({ leaderboard: members.map((m, index) => ({ rank: index + 1, user: { id: m.user.id, displayName: m.user.displayName, globalPoints: m.user.globalPoints, exactScoresCount: m.user.exactScoresCount, registrationTimestamp: m.user.registrationTimestamp } })) });
  } catch (error) {
    return jsonError(error);
  }
}
