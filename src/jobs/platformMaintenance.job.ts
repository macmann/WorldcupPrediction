import { prisma } from "../lib/prisma";
import { getFixtureQueue } from "./queues";
import { deadline } from "../lib/platformRules";
import { databaseNow, seasonTransaction } from "../services/platform/transactions";
import { freezeConsensus, notify } from "../services/platform/recalculation";
import { runAIPundit } from "../services/platform/ai";
import { recordAdminJobStatus } from "../lib/adminOps";
export const platformMaintenanceJobName = "platform-maintenance";
export async function schedulePlatformMaintenance() {
  return getFixtureQueue().upsertJobScheduler(platformMaintenanceJobName, { every: 5 * 60 * 1000 }, { name: platformMaintenanceJobName });
}
export async function processPlatformMaintenance() {
  const seasons = await prisma.season.findMany({ where: { status: { in: ["UPCOMING", "ACTIVE"] }, competition: { isActive: true } } });
  for (const season of seasons) {
    await seasonTransaction(season.id, async tx => {
      const now = await databaseNow(tx);
      const matches = await tx.match.findMany({ where: { seasonId: season.id, isEnabled: true, kickoffTime: { lte: new Date(now.getTime() + 60 * 60 * 1000) } }, include: { predictions: { select: { userId: true } } } });
      const participants = await tx.seasonStanding.findMany({ where: { seasonId: season.id }, include: { user: true } });
      for (const match of matches) {
        if (now >= deadline(match)) {
          await tx.match.update({ where: { id: match.id }, data: { predictionLockAt: deadline(match) } });
          await tx.prediction.updateMany({ where: { matchId: match.id }, data: { isLocked: true } });
          await tx.gameweekBanker.updateMany({ where: { matchId: match.id, lockedAt: null }, data: { lockedAt: deadline(match) } });
          await freezeConsensus(tx, match, now);
        } else if (match.status === "SCHEDULED") {
          for (const { user } of participants) if (!user.isBanned && !match.predictions.some(p => p.userId === user.id)) await notify(tx, user, season.id, `kickoff:${match.id}`, "reminders", { home: match.homeTeam, away: match.awayTeam, kickoff: match.kickoffTime.toISOString() });
        }
      }
      const gws = await tx.gameweek.findMany({ where: { seasonId: season.id, finalized: false }, include: { scoringMatches: { where: { isEnabled: true }, include: { predictions: { select: { userId: true } } } } } });
      const next = gws.find(g => g.scoringMatches.some(m => deadline(m) > now));
      if (next) for (const { user } of participants) {
        const missing = next.scoringMatches.filter(m => m.status === "SCHEDULED" && deadline(m) > now && !m.predictions.some(p => p.userId === user.id));
        if (missing.length && missing.some(m => deadline(m).getTime() - now.getTime() <= 24 * 60 * 60 * 1000)) await notify(tx, user, season.id, `incomplete:${next.id}`, "reminders", { number: next.number, missing: missing.length });
      }
    });
    if ((season.aiConfig as Record<string, unknown>).enabled) await runAIPundit(season.id);
  }
  await recordAdminJobStatus("platform-maintenance", "Season reminders, locks and AI", { success: true, payload: { seasons: seasons.length } });
  return { seasons: seasons.length };
}
