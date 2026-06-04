export const dynamic = "force-dynamic";

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
    const leagues = await prisma.league.findMany({
      where: query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { joinCode: { contains: query.q.toUpperCase(), mode: "insensitive" } }
            ]
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        joinCode: true,
        type: true,
        createdAt: true,
        _count: { select: { memberships: true } }
      }
    });
    return NextResponse.json({ leagues: leagues.map((league) => ({ ...league, memberCount: league._count.memberships })) });
  } catch (error) {
    return jsonError(error);
  }
}
