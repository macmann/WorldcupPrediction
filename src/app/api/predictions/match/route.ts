import { MatchOutcome } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  matchId: z.number().int().positive().optional(),
  match_id: z.number().int().positive().optional(),
  predictedOutcome: z.nativeEnum(MatchOutcome).optional(),
  predicted_outcome: z.nativeEnum(MatchOutcome).optional(),
  predictedHomeScore: z.number().int().min(0).max(30).optional(),
  predicted_home_score: z.number().int().min(0).max(30).optional(),
  predictedAwayScore: z.number().int().min(0).max(30).optional(),
  predicted_away_score: z.number().int().min(0).max(30).optional()
}).strict().transform((input, ctx) => {
  const matchId = input.matchId ?? input.match_id;
  const predictedOutcome = input.predictedOutcome ?? input.predicted_outcome;
  const hasHomeScore = input.predictedHomeScore !== undefined || input.predicted_home_score !== undefined;
  const hasAwayScore = input.predictedAwayScore !== undefined || input.predicted_away_score !== undefined;
  const predictedHomeScore = input.predictedHomeScore ?? input.predicted_home_score;
  const predictedAwayScore = input.predictedAwayScore ?? input.predicted_away_score;

  if (!matchId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["match_id"], message: "match_id is required" });
  if (hasHomeScore !== hasAwayScore) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["predicted_home_score"], message: "Both predicted score values are required" });
  if (!predictedOutcome && !hasHomeScore) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["prediction"], message: "Choose a win/draw/win result or enter a correct score" });

  return { matchId: matchId!, predictedOutcome, predictedHomeScore, predictedAwayScore, hasScore: hasHomeScore && hasAwayScore };
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const match = await prisma.match.findUnique({ where: { id: input.matchId }, select: { kickoffTime: true } });
    if (!match) throw Object.assign(new Error("Match not found"), { status: 404 });
    if (new Date() >= match.kickoffTime) throw Object.assign(new Error("Predictions lock at kickoff"), { status: 403 });

    const scoreData = input.hasScore
      ? { predictedHomeScore: input.predictedHomeScore, predictedAwayScore: input.predictedAwayScore }
      : {};
    const outcomeData = input.predictedOutcome ? { predictedOutcome: input.predictedOutcome } : {};

    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId: { userId: user.id, matchId: input.matchId } },
      create: {
        userId: user.id,
        matchId: input.matchId,
        predictedOutcome: input.predictedOutcome ?? null,
        predictedHomeScore: input.hasScore ? input.predictedHomeScore! : null,
        predictedAwayScore: input.hasScore ? input.predictedAwayScore! : null
      },
      update: {
        ...outcomeData,
        ...scoreData,
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
