import { submitPrediction } from "@/services/platform/gameplay";
import { MatchOutcome } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

const schema = z.object({
  matchId: z.number().int().positive().optional(),
  match_id: z.number().int().positive().optional(),
  predictedOutcome: z.nativeEnum(MatchOutcome).optional(),
  predicted_outcome: z.nativeEnum(MatchOutcome).optional(),
  predictedHomeScore: z.number().int().min(0).max(30).optional(),
  predicted_home_score: z.number().int().min(0).max(30).optional(),
  predictedAwayScore: z.number().int().min(0).max(30).optional(),
  predicted_away_score: z.number().int().min(0).max(30).optional(),
  predictedPenaltyShootout: z.boolean().nullable().optional(),
  predicted_penalty_shootout: z.boolean().nullable().optional()
}).strict().transform((input, ctx) => {
  const matchId = input.matchId ?? input.match_id;
  const predictedOutcome = input.predictedOutcome ?? input.predicted_outcome;
  const hasHomeScore = input.predictedHomeScore !== undefined || input.predicted_home_score !== undefined;
  const hasAwayScore = input.predictedAwayScore !== undefined || input.predicted_away_score !== undefined;
  const predictedHomeScore = input.predictedHomeScore ?? input.predicted_home_score;
  const predictedAwayScore = input.predictedAwayScore ?? input.predicted_away_score;
  const predictedPenaltyShootout = input.predictedPenaltyShootout ?? input.predicted_penalty_shootout ?? null;

  if (!matchId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["match_id"], message: "match_id is required" });
  if (!predictedOutcome) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["predicted_outcome"], message: "Choose a match winner" });
  if (hasHomeScore !== hasAwayScore || !hasHomeScore) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["predicted_home_score"], message: "Both predicted score values are required" });

  return { matchId: matchId!, predictedOutcome, predictedHomeScore, predictedAwayScore, predictedPenaltyShootout, hasScore: hasHomeScore && hasAwayScore };
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const prediction = await submitPrediction(user.id, { matchId: input.matchId, predictedOutcome: input.predictedOutcome!, predictedHomeScore: input.predictedHomeScore!, predictedAwayScore: input.predictedAwayScore!, predictedPenaltyShootout: input.predictedPenaltyShootout });

    return NextResponse.json({ prediction });
  } catch (error) {
    return jsonError(error);
  }
}
