import { MatchStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getScoringQueue } from "@/jobs/queues";

const schema = z.object({ homeScore: z.number().int().min(0), awayScore: z.number().int().min(0) });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = schema.parse(await request.json());
    const match = await prisma.match.update({ where: { id: Number(params.id) }, data: { homeScore: input.homeScore, awayScore: input.awayScore, status: MatchStatus.FINISHED } });
    await getScoringQueue().add("score-match", { matchId: match.id }, { jobId: `admin-score-${match.id}-${Date.now()}` });
    return NextResponse.json({ match });
  } catch (error) {
    return jsonError(error);
  }
}
