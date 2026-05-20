import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { fetchFootballDataCompetitions } from "@/services/footballApi";
import { ingestTournamentFixtures } from "@/services/fixtures";

const schema = z.object({ code: z.string().trim().min(1).max(32), startFrom: z.string().datetime().optional().nullable() }).strict();

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = schema.parse(await request.json());
    const competitions = await fetchFootballDataCompetitions();
    const competition = competitions.find((item) => item.code.toUpperCase() === input.code.toUpperCase());
    if (!competition) throw Object.assign(new Error("Competition was not found in the football API catalog"), { status: 404 });

    const tournament = await prisma.tournament.upsert({
      where: { externalId: competition.externalId },
      create: {
        name: competition.name,
        slug: slugify(competition.name),
        externalId: competition.externalId,
        startsAt: new Date(competition.startsAt),
        endsAt: competition.endsAt ? new Date(competition.endsAt) : null,
        syncFromAt: input.startFrom ? new Date(input.startFrom) : null,
        hostCountries: competition.areaName ? [competition.areaName] : [],
        isActive: true
      },
      update: {
        name: competition.name,
        startsAt: new Date(competition.startsAt),
        endsAt: competition.endsAt ? new Date(competition.endsAt) : null,
        syncFromAt: input.startFrom ? new Date(input.startFrom) : null,
        hostCountries: competition.areaName ? [competition.areaName] : [],
        isActive: true
      }
    });

    const sync = await ingestTournamentFixtures(tournament);
    return NextResponse.json({ tournament, sync }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
