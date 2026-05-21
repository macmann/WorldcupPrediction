import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  filter: z.enum(["all", "awarded", "notAwarded"]).optional(),
  userId: z.string().uuid().optional()
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const parsed = querySchema.parse({
      filter: request.nextUrl.searchParams.get("filter") ?? undefined,
      userId: request.nextUrl.searchParams.get("userId") ?? undefined
    });

    const predictions = await prisma.prediction.findMany({
      where: {
        userId: parsed.userId,
        ...(parsed.filter === "awarded" ? { pointsAwarded: { not: null } } : {}),
        ...(parsed.filter === "notAwarded" ? { pointsAwarded: null } : {})
      },
      orderBy: { submittedAt: "desc" },
      take: 500,
      select: {
        id: true,
        userId: true,
        predictedHomeScore: true,
        predictedAwayScore: true,
        pointsAwarded: true,
        submittedAt: true,
        scoredAt: true,
        matchId: true,
        match: { select: { homeTeam: true, awayTeam: true } },
        user: { select: { displayName: true, email: true } }
      }
    });

    return NextResponse.json({
      predictions: predictions.map((prediction) => ({
        id: prediction.id,
        userId: prediction.userId,
        userName: prediction.user.displayName,
        userEmail: prediction.user.email,
        matchId: prediction.matchId,
        homeTeam: prediction.match.homeTeam,
        awayTeam: prediction.match.awayTeam,
        predictedHomeScore: prediction.predictedHomeScore,
        predictedAwayScore: prediction.predictedAwayScore,
        pointsAwarded: prediction.pointsAwarded,
        submittedAt: prediction.submittedAt,
        scoredAt: prediction.scoredAt
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}
