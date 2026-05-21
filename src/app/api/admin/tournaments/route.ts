import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { ensureTournamentSyncColumn, prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
  hostCountries: z.array(z.string().trim().min(1).max(80)).max(16).optional(),
  isActive: z.boolean().default(true),
  syncFromAt: z.string().datetime().optional().nullable()
}).strict();

export async function GET() {
  try {
    await requireAdmin();
    await ensureTournamentSyncColumn();
    const tournaments = await prisma.tournament.findMany({
      orderBy: [{ startsAt: "desc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, startsAt: true, endsAt: true, hostCountries: true, isActive: true, externalId: true }
    });
    return NextResponse.json({ tournaments: tournaments.map((tournament) => ({ ...tournament, syncFromAt: null })) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    await ensureTournamentSyncColumn();
    const input = schema.parse(await request.json());
    const tournament = await prisma.tournament.create({
      data: {
        name: input.name,
        slug: input.slug ? slugify(input.slug) : slugify(input.name),
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        hostCountries: input.hostCountries ?? [],
        isActive: input.isActive
      }
    });
    return NextResponse.json({ tournament }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
