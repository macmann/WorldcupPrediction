import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ joinCode: z.string().min(6).max(8) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { joinCode } = schema.parse(await request.json());
    const league = await prisma.league.findUniqueOrThrow({ where: { joinCode: joinCode.toUpperCase() } });
    await prisma.leagueMember.upsert({ where: { leagueId_userId: { leagueId: league.id, userId: user.id } }, create: { leagueId: league.id, userId: user.id }, update: {} });
    return NextResponse.json({ league });
  } catch (error) {
    return jsonError(error);
  }
}
