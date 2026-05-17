import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ championTeamId: z.string().min(1), bestPlayerId: z.string().min(1), bestGkId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (new Date() > config.tournamentStartTime) throw Object.assign(new Error("Tournament outright picks are locked"), { status: 409 });
    const input = schema.parse(await request.json());
    const outright = await prisma.outright.upsert({ where: { userId: user.id }, create: { userId: user.id, ...input }, update: input });
    return NextResponse.json({ outright });
  } catch (error) {
    return jsonError(error);
  }
}
