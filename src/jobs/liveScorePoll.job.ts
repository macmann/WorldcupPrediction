import type { Job } from "bullmq";
import { MatchStatus } from "@prisma/client";
import { getLiveScoreQueue } from "./queues";
import { prisma } from "../lib/prisma";
import { syncLiveMatches } from "../services/fixtures";

export const liveScorePollJobName = "live-score-poll";

export async function scheduleLiveScorePollJob() {
  return getLiveScoreQueue().upsertJobScheduler(
    liveScorePollJobName,
    { every: 3 * 60 * 1000 },
    { name: liveScorePollJobName }
  );
}

export async function processLiveScorePollJob(_job?: Job) {
  const liveMatchCount = await prisma.match.count({ where: { status: MatchStatus.LIVE } });
  if (liveMatchCount === 0) return { skipped: true, reason: "No active live matches" };
  return syncLiveMatches();
}
