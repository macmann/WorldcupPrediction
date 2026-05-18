import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { fetchFootballDataCompetitions } from "@/services/footballApi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const [competitions, existing] = await Promise.all([
      fetchFootballDataCompetitions(),
      prisma.tournament.findMany({ where: { externalId: { not: null } }, select: { externalId: true } })
    ]);
    const existingIds = new Set(existing.map((tournament) => tournament.externalId));
    return NextResponse.json({ competitions: competitions.map((competition) => ({ ...competition, isAdded: existingIds.has(competition.externalId) })) });
  } catch (error) {
    return jsonError(error);
  }
}
