import { MatchStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enqueueScoringJob } from "@/jobs/scoringEngine.job";

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
const schema = z.object({ homeScore: z.number().int().min(0), awayScore: z.number().int().min(0) }).strict();

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(params);
    const input = schema.parse(await request.json());
    const match = await prisma.match.update({
      where: { id },
      data: {
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        homeScore90: input.homeScore,
        awayScore90: input.awayScore,
        status: MatchStatus.FINISHED
      }
    });
    await enqueueScoringJob(match.id);
    return NextResponse.json({ match });
  } catch (error) {
    return jsonError(error);
  }
}
