import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { cookies } from "next/headers";
import { resolveSeason, leagueSeasonView } from "@/services/platform/views";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = paramsSchema.parse(params);
    const user = await requireUser();
    const membership = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId: id, userId: user.id } } });
    if (!membership) throw Object.assign(new Error("League not found"), { status: 404 });

    const url = new URL(_request.url);
    const season = await resolveSeason(url.searchParams.get("seasonId") ?? cookies().get("football_season")?.value);
    if (season) return NextResponse.json(await leagueSeasonView(user.id, id, season.id, url.searchParams.get("gameweekId") ?? undefined));

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
            matchesPlayedCount: true,
            registrationTimestamp: true
          }
        }
      },
      orderBy: [
        { user: { globalPoints: "desc" } },
        { user: { matchesPlayedCount: "asc" } },
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
