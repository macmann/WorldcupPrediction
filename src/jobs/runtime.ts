import { Worker } from "bullmq";
import { closeQueues, getConnection } from "./queues";
import { fixtureSyncJobName, processFixtureSyncJob, scheduleFixtureSyncJob } from "./fixtureSync.job";
import { liveScorePollJobName, processLiveScorePollJob, scheduleLiveScorePollJob } from "./liveScorePoll.job";
import { processScoringEngineJob, scoringEngineJobName } from "./scoringEngine.job";

let started = false;
let workers: Worker[] = [];

export async function scheduleRecurringJobs() {
  await Promise.all([
    scheduleFixtureSyncJob(),
    scheduleLiveScorePollJob()
  ]);
}

export async function startBackgroundJobs() {
  if (started) return workers;
  started = true;

  workers = [
    new Worker(
      "fixtures",
      async (job) => {
        if (job.name === fixtureSyncJobName) return processFixtureSyncJob(job);
        throw new Error(`Unknown fixtures job: ${job.name}`);
      },
      { connection: getConnection(), concurrency: 2 }
    ),
    new Worker(
      "live-scores",
      async (job) => {
        if (job.name === liveScorePollJobName) return processLiveScorePollJob(job);
        throw new Error(`Unknown live score job: ${job.name}`);
      },
      { connection: getConnection(), concurrency: 1 }
    ),
    new Worker(
      "scoring",
      async (job) => {
        if (job.name === scoringEngineJobName) return processScoringEngineJob(job);
        throw new Error(`Unknown scoring job: ${job.name}`);
      },
      { connection: getConnection(), concurrency: 8 }
    )
  ];

  await scheduleRecurringJobs();
  console.log("Background jobs started in the web process.");
  return workers;
}

export async function stopBackgroundJobs() {
  await Promise.all(workers.map((worker) => worker.close()));
  await closeQueues();
  workers = [];
  started = false;
}
