import { MatchStatus, StageType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  matchday: z.coerce.number().int().positive().optional(),
  stage: z.nativeEnum(StageType).optional()
});

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      matchday: searchParams.get("matchday") ?? undefined,
      stage: searchParams.get("stage") ?? undefined
    });

    const matches = await prisma.match.findMany({
      where: {
        ...(query.matchday ? { matchday: query.matchday } : {}),
        ...(query.stage ? { stage: query.stage } : {})
      },
      orderBy: { kickoffTime: "asc" },
      include: { predictions: { where: { userId: user.id }, take: 1 } }
    });

    const now = new Date();
    return NextResponse.json({
      matches: matches.map(({ predictions, ...match }) => ({
        ...match,
        isLocked: now >= match.kickoffTime || match.status !== MatchStatus.SCHEDULED,
        prediction: predictions[0] ?? null
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}
