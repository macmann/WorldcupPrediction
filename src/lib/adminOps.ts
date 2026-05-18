import { prisma } from "./prisma";

export const JOB_FIXTURE_SYNC = "fixture-sync";
export const JOB_LIVE_SCORE_POLL = "live-score-poll";

export async function recordAdminJobStatus(key: string, label: string, outcome: { success: boolean; payload?: unknown; error?: unknown }) {
  const now = new Date();
  const lastError = outcome.success ? null : outcome.error instanceof Error ? outcome.error.message : String(outcome.error ?? "Unknown error");
  return prisma.adminJobStatus.upsert({
    where: { key },
    create: {
      key,
      label,
      lastRunAt: now,
      lastSuccessAt: outcome.success ? now : null,
      lastError,
      lastPayload: outcome.payload === undefined ? undefined : (outcome.payload as object)
    },
    update: {
      label,
      lastRunAt: now,
      ...(outcome.success ? { lastSuccessAt: now } : {}),
      lastError,
      lastPayload: outcome.payload === undefined ? undefined : (outcome.payload as object)
    }
  });
}

export async function getAppSettings() {
  return prisma.appSetting.upsert({
    where: { id: 1 },
    create: { id: 1, announcementText: null, maintenanceMode: false },
    update: {}
  });
}
