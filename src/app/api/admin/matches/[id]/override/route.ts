import { MatchStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { isKnockoutStage } from "@/lib/matchPrediction";
import { enqueueScoringJob } from "@/jobs/scoringEngine.job";

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
const schema = z.object({ homeScore: z.number().int().min(0), awayScore: z.number().int().min(0), actualPenaltyShootout: z.boolean().nullable().optional(), actual_penalty_shootout: z.boolean().nullable().optional() }).strict().transform((input) => ({ ...input, actualPenaltyShootout: input.actualPenaltyShootout ?? input.actual_penalty_shootout ?? null }));

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(params);
    const input = schema.parse(await request.json());
    const existingMatch = await prisma.match.findUnique({ where: { id }, select: { stage: true } });
    if (!existingMatch) throw Object.assign(new Error("Match not found"), { status: 404 });
    const knockout = isKnockoutStage(existingMatch.stage);
    if (!knockout && input.actualPenaltyShootout !== null) throw Object.assign(new Error("Penalty shoot-out results are only available for knockout-stage matches"), { status: 400 });

    const match = await prisma.match.update({
      where: { id },
      data: {
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        homeScore90: input.homeScore,
        awayScore90: input.awayScore,
        actualPenaltyShootout: knockout ? input.actualPenaltyShootout : null,
        status: MatchStatus.FINISHED
      }
    });
    await enqueueScoringJob(match.id);
    return NextResponse.json({ match });
  } catch (error) {
    return jsonError(error);
  }
}
