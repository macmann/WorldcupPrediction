import type { Job } from "bullmq";
import { MatchStatus } from "@prisma/client";
import { getLiveScoreQueue } from "./queues";
import { prisma } from "../lib/prisma";
import { syncLiveMatches } from "../services/fixtures";
import { JOB_LIVE_SCORE_POLL, recordAdminJobStatus } from "../lib/adminOps";

export const liveScorePollJobName = "live-score-poll";

export async function scheduleLiveScorePollJob() {
  return getLiveScoreQueue().upsertJobScheduler(
    liveScorePollJobName,
    { every: 3 * 60 * 1000 },
    { name: liveScorePollJobName }
  );
}

export async function processLiveScorePollJob(_job?: Job) {
  try {
    const liveMatchCount = await prisma.match.count({ where: { status: MatchStatus.LIVE } });
    const result = liveMatchCount === 0 ? { skipped: true, reason: "No active live matches" } : await syncLiveMatches();
    await recordAdminJobStatus(JOB_LIVE_SCORE_POLL, "Live score poll", { success: true, payload: result });
    return result;
  } catch (error) {
    await recordAdminJobStatus(JOB_LIVE_SCORE_POLL, "Live score poll", { success: false, error });
    throw error;
  }
}
