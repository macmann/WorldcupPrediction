import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const matchday = searchParams.get("matchday");
    const matches = await prisma.match.findMany({
      where: matchday ? { matchday: Number(matchday) } : undefined,
      orderBy: { kickoffTime: "asc" },
      include: { predictions: { where: { userId: user.id }, take: 1 } }
    });
    return NextResponse.json({ matches: matches.map(({ predictions, ...match }) => ({ ...match, prediction: predictions[0] ?? null })) });
  } catch (error) {
    return jsonError(error);
  }
}
