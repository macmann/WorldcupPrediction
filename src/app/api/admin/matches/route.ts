import { MatchStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({ date: searchParams.get("date") ?? undefined });

    const date = query.date ? new Date(`${query.date}T00:00:00.000Z`) : null;
    const nextDate = date ? new Date(date.getTime() + 24 * 60 * 60 * 1000) : null;

    const matches = await prisma.match.findMany({
      where: {
        status: MatchStatus.FINISHED,
        ...(date && nextDate ? { kickoffTime: { gte: date, lt: nextDate } } : {})
      },
      orderBy: { kickoffTime: "desc" },
      take: 250,
      select: {
        id: true,
        kickoffTime: true,
        homeTeam: true,
        awayTeam: true,
        homeScore90: true,
        awayScore90: true,
        homeScore: true,
        awayScore: true
      }
    });

    return NextResponse.json({ matches });
  } catch (error) {
    return jsonError(error);
  }
}
