export const dynamic = "force-dynamic";

import { MatchStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAppSettings, JOB_FIXTURE_SYNC, JOB_LIVE_SCORE_POLL } from "@/lib/adminOps";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function GET() {
  try {
    await requireAdmin();
    const today = startOfUtcDay();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextMatchday = new Date(Date.now() + 36 * 60 * 60 * 1000);

    const [settings, announcements, jobStatuses, latestSyncedMatch, totalUsers, dailyActiveUsers, predictionCount, totalPredictions, leagues, recentFinishedMatches, tournaments, settlements] = await Promise.all([
      getAppSettings(),
      prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, title: true, description: true, imageUrl: true, linkUrl: true, isActive: true, createdAt: true, updatedAt: true } }),
      prisma.adminJobStatus.findMany({ where: { key: { in: [JOB_FIXTURE_SYNC, JOB_LIVE_SCORE_POLL] } } }),
      prisma.match.findFirst({ where: { lastSyncedAt: { not: null } }, orderBy: { lastSyncedAt: "desc" }, select: { id: true, homeTeam: true, awayTeam: true, lastSyncedAt: true } }),
      prisma.user.count(),
      prisma.userSession.groupBy({ by: ["userId"], where: { createdAt: { gte: today } } }).then((rows) => rows.length),
      prisma.prediction.count({ where: { match: { kickoffTime: { gte: new Date(), lte: nextMatchday }, status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE, MatchStatus.PAUSED] } } } }),
      prisma.prediction.count(),
      prisma.league.findMany({
        where: { type: "PRIVATE" },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id: true, name: true, joinCode: true, createdAt: true, _count: { select: { memberships: true } } }
      }),
      prisma.match.findMany({
        where: { status: MatchStatus.FINISHED },
        orderBy: { kickoffTime: "desc" },
        take: 8,
        select: { id: true, homeTeam: true, awayTeam: true, homeScore90: true, awayScore90: true, homeScore: true, awayScore: true, kickoffTime: true, lastSyncedAt: true }
      }),
      prisma.tournament.findMany({
        orderBy: [{ isActive: "desc" }, { startsAt: "desc" }],
        take: 20,
        select: { id: true, name: true, slug: true, startsAt: true, endsAt: true, isActive: true }
      }),
      prisma.outrightSettlement.findMany({
        orderBy: { settledAt: "desc" },
        take: 20,
        select: {
          id: true,
          tournamentId: true,
          settledAt: true,
          goldenBallPlayer: { select: { id: true, name: true } },
          goldenGlovePlayer: { select: { id: true, name: true } }
        }
      })
    ]);

    const statusByKey = new Map(jobStatuses.map((status) => [status.key, status]));
    return NextResponse.json({
      settings,
      announcements,
      syncStatus: {
        fixtureIngestion: statusByKey.get(JOB_FIXTURE_SYNC) ?? null,
        liveScorePoll: statusByKey.get(JOB_LIVE_SCORE_POLL) ?? null,
        latestSyncedMatch
      },
      analytics: {
        totalUsers,
        dailyActiveUsers,
        upcomingMatchdayPredictions: predictionCount,
        totalPredictions,
        utcWindowStart: today,
        utcWindowEnd: tomorrow
      },
      leagues: leagues.map((league) => ({ ...league, memberCount: league._count.memberships })),
      recentFinishedMatches,
      tournaments,
      settlements
    });
  } catch (error) {
    return jsonError(error);
  }
}
