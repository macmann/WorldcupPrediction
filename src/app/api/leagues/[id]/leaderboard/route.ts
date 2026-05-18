import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = paramsSchema.parse(params);
    const user = await requireUser();
    const membership = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId: id, userId: user.id } } });
    if (!membership) throw Object.assign(new Error("League not found"), { status: 404 });

    const members = await prisma.leagueMember.findMany({
      where: { leagueId: id, user: { isBanned: false } },
      select: {
        joinedAt: true,
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            globalPoints: true,
            exactScoresCount: true,
            registrationTimestamp: true
          }
        }
      },
      orderBy: [
        { user: { globalPoints: "desc" } },
        { user: { exactScoresCount: "desc" } },
        { user: { registrationTimestamp: "asc" } }
      ]
    });

    return NextResponse.json({
      leaderboard: members.map((member, index) => ({
        rank: index + 1,
        joinedAt: member.joinedAt,
        user: member.user
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}
