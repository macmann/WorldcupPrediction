import { MatchStatus, StageType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { teamFlagEmoji, teamFlagImageUrl } from "@/lib/countryFlags";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ingestFixtures } from "@/services/fixtures";

const querySchema = z.object({
  matchday: z.coerce.number().int().positive().optional(),
  stage: z.nativeEnum(StageType).optional(),
  group: z.string().trim().min(1).max(8).optional()
});

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      matchday: searchParams.get("matchday") ?? undefined,
      stage: searchParams.get("stage") ?? undefined,
      group: searchParams.get("group") ?? undefined
    });

    const fixtureCount = await prisma.match.count();
    const hasFixtureProvider = Boolean(config.wc2026ApiKey || config.footballApiKey);
    const hasSyncedFixtures = fixtureCount > 0 && Boolean(await prisma.match.findFirst({ where: { lastSyncedAt: { not: null } }, select: { id: true } }));
    if (hasFixtureProvider && (fixtureCount === 0 || !hasSyncedFixtures)) {
      await ingestFixtures();
    }

    const matches = await prisma.match.findMany({
      where: {
        ...(query.matchday ? { matchday: query.matchday } : {}),
        ...(query.stage ? { stage: query.stage } : {}),
        ...(query.group ? { groupName: query.group.toUpperCase() } : {})
      },
      orderBy: { kickoffTime: "asc" },
      include: {
        homeTeamRef: { select: { flagEmoji: true } },
        awayTeamRef: { select: { flagEmoji: true } },
        predictions: { where: { userId: user.id }, take: 1 }
      }
    });

    const now = new Date();
    return NextResponse.json({
      matches: matches.map(({ predictions, homeTeamRef, awayTeamRef, ...match }) => ({
        ...match,
        homeFlagEmoji: teamFlagEmoji(match.homeTeam, homeTeamRef?.flagEmoji),
        awayFlagEmoji: teamFlagEmoji(match.awayTeam, awayTeamRef?.flagEmoji),
        homeFlagImageUrl: teamFlagImageUrl(match.homeTeam),
        awayFlagImageUrl: teamFlagImageUrl(match.awayTeam),
        isLocked: now >= match.kickoffTime || match.status !== MatchStatus.SCHEDULED,
        prediction: predictions[0] ?? null
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}
