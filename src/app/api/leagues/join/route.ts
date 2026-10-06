import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { cookies } from "next/headers";
import { resolveSeason } from "@/services/platform/views";
import { linkLeagueSeason } from "@/services/platform/gameplay";
import { seasonTransaction } from "@/services/platform/transactions";
import { prisma } from "@/lib/prisma";

const schema = z.object({ joinCode: z.string().trim().regex(/^[A-Za-z0-9]{8}$/) }).strict();

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { joinCode } = schema.parse(await request.json());
    const league = await prisma.league.findUnique({ where: { joinCode: joinCode.toUpperCase() } });
    if (!league) throw Object.assign(new Error("League not found"), { status: 404 });

    await prisma.leagueMember.upsert({
      where: { leagueId_userId: { leagueId: league.id, userId: user.id } },
      create: { leagueId: league.id, userId: user.id },
      update: {}
    });

    const season = await resolveSeason(cookies().get("football_season")?.value);
    if (league && season) await seasonTransaction(season.id, tx => linkLeagueSeason(tx, league!.id, season.id));
    for (const link of await prisma.leagueSeason.findMany({ where: { leagueId: league.id } })) {
      if (link.seasonId !== season?.id) await seasonTransaction(link.seasonId, tx => linkLeagueSeason(tx, league.id, link.seasonId));
    }
    return NextResponse.json({ league });
  } catch (error) {
    return jsonError(error);
  }
}
