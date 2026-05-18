import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(params);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, displayName: true, registrationTimestamp: true, bannedAt: true, banReason: true, isBanned: true }
    });
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
    const predictions = await prisma.prediction.findMany({
      where: { userId: id },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        matchId: true,
        predictedOutcome: true,
        predictedHomeScore: true,
        predictedAwayScore: true,
        pointsAwarded: true,
        isLocked: true,
        submittedAt: true,
        updatedAt: true,
        scoredAt: true,
        match: { select: { homeTeam: true, awayTeam: true, kickoffTime: true, status: true, homeScore90: true, awayScore90: true } }
      }
    });
    return NextResponse.json({ user, predictions });
  } catch (error) {
    return jsonError(error);
  }
}
