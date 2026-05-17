import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ matchId: z.number().int().positive(), predictedHomeScore: z.number().int().min(0).max(30), predictedAwayScore: z.number().int().min(0).max(30) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const match = await prisma.match.findUniqueOrThrow({ where: { id: input.matchId } });
    if (new Date() >= match.kickoffTime) throw Object.assign(new Error("Predictions lock at kickoff"), { status: 409 });
    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId: { userId: user.id, matchId: input.matchId } },
      create: { userId: user.id, matchId: input.matchId, predictedHomeScore: input.predictedHomeScore, predictedAwayScore: input.predictedAwayScore },
      update: { predictedHomeScore: input.predictedHomeScore, predictedAwayScore: input.predictedAwayScore }
    });
    return NextResponse.json({ prediction });
  } catch (error) {
    return jsonError(error);
  }
}
