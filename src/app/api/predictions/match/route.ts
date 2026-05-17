import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  matchId: z.number().int().positive().optional(),
  match_id: z.number().int().positive().optional(),
  predictedHomeScore: z.number().int().min(0).max(30).optional(),
  predicted_home_score: z.number().int().min(0).max(30).optional(),
  predictedAwayScore: z.number().int().min(0).max(30).optional(),
  predicted_away_score: z.number().int().min(0).max(30).optional()
}).strict().transform((input, ctx) => {
  const matchId = input.matchId ?? input.match_id;
  const predictedHomeScore = input.predictedHomeScore ?? input.predicted_home_score;
  const predictedAwayScore = input.predictedAwayScore ?? input.predicted_away_score;

  if (!matchId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["match_id"], message: "match_id is required" });
  if (predictedHomeScore === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["predicted_home_score"], message: "predicted_home_score is required" });
  if (predictedAwayScore === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["predicted_away_score"], message: "predicted_away_score is required" });

  return { matchId: matchId!, predictedHomeScore: predictedHomeScore!, predictedAwayScore: predictedAwayScore! };
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const match = await prisma.match.findUnique({ where: { id: input.matchId }, select: { kickoffTime: true } });
    if (!match) throw Object.assign(new Error("Match not found"), { status: 404 });
    if (new Date() >= match.kickoffTime) throw Object.assign(new Error("Predictions lock at kickoff"), { status: 403 });

    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId: { userId: user.id, matchId: input.matchId } },
      create: {
        userId: user.id,
        matchId: input.matchId,
        predictedHomeScore: input.predictedHomeScore,
        predictedAwayScore: input.predictedAwayScore
      },
      update: {
        predictedHomeScore: input.predictedHomeScore,
        predictedAwayScore: input.predictedAwayScore,
        pointsAwarded: null,
        isExactScore: false,
        isCorrectOutcome: false,
        isLocked: false,
        scoredAt: null
      }
    });

    return NextResponse.json({ prediction });
  } catch (error) {
    return jsonError(error);
  }
}
