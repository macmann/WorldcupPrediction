import type { Job } from "bullmq";
import { getScoringQueue } from "./queues";
import { recalculateMatch } from "../services/scoring";
import { formatErrorWithCause } from "../lib/errorFormatting";

export const scoringEngineJobName = "score-match";

type ScoreMatchPayload = {
  matchId: number;
};

const scoringEnqueueTimeoutMs = Number(process.env.SCORING_ENQUEUE_TIMEOUT_MS ?? 2500);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

export async function enqueueScoringJob(matchId: number) {
  try {
    return await withTimeout(
      getScoringQueue().add(scoringEngineJobName, { matchId }, { jobId: `score-${matchId}` }),
      scoringEnqueueTimeoutMs,
      `Queueing scoring job for match ${matchId}`
    );
  } catch (error) {
    console.warn(`Could not queue scoring job for match ${matchId}: ${formatErrorWithCause(error)}`);
    return null;
  }
}

export async function processScoringEngineJob(job: Job<ScoreMatchPayload>) {
  return recalculateMatch(Number(job.data.matchId));
}
