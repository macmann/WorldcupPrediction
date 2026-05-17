import type { Job } from "bullmq";
import { getScoringQueue } from "./queues";
import { recalculateMatch } from "../services/scoring";

export const scoringEngineJobName = "score-match";

type ScoreMatchPayload = {
  matchId: number;
};

export async function enqueueScoringJob(matchId: number) {
  return getScoringQueue().add(scoringEngineJobName, { matchId }, { jobId: `score-${matchId}` });
}

export async function processScoringEngineJob(job: Job<ScoreMatchPayload>) {
  return recalculateMatch(Number(job.data.matchId));
}
