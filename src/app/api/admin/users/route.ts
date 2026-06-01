import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({ q: z.string().trim().max(120).optional() });

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({ q: searchParams.get("q") ?? undefined });
    const users = await prisma.user.findMany({
      where: query.q
        ? {
            OR: [
              { email: { contains: query.q, mode: "insensitive" } },
              { displayName: { contains: query.q, mode: "insensitive" } }
            ]
          }
        : undefined,
      orderBy: [{ isBanned: "desc" }, { globalPoints: "desc" }, { registrationTimestamp: "desc" }],
      take: 50,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        globalPoints: true,
        exactScoresCount: true,
        correctOutcomesCount: true,
        isAdmin: true,
        isBanned: true,
        banReason: true,
        bannedAt: true,
        registrationTimestamp: true,
        leagueMemberships: {
          where: { league: { type: "GLOBAL" } },
          select: { leagueId: true },
          take: 1
        }
      }
    });
    return NextResponse.json({ users: users.map((user) => {
      const { leagueMemberships, ...rest } = user;
      return { ...rest, isGlobalLeagueMember: leagueMemberships.length > 0 };
    }) });
  } catch (error) {
    return jsonError(error);
  }
}
