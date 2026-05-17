import { Worker } from "bullmq";
import { closeQueues, getConnection, getFixtureQueue, getScoringQueue } from "./queues";
import { ingestFixtures, syncLiveMatches } from "../services/fixtures";
import { recalculateMatch } from "../services/scoring";

let started = false;
let workers: Worker[] = [];

export async function scheduleRecurringJobs() {
  const fixtureQueue = getFixtureQueue();
  await fixtureQueue.upsertJobScheduler("daily-fixture-ingestion", { pattern: "0 2 * * *" }, { name: "daily-fixture-ingestion" });
  await fixtureQueue.upsertJobScheduler("live-match-sync", { every: 3 * 60 * 1000 }, { name: "live-match-sync" });
}

export async function startBackgroundJobs() {
  if (started) return workers;
  started = true;

  workers = [
    new Worker(
      "fixtures",
      async (job) => {
        if (job.name === "daily-fixture-ingestion") return ingestFixtures();
        if (job.name === "live-match-sync") return syncLiveMatches();
      },
      { connection: getConnection(), concurrency: 2 }
    ),
    new Worker(
      "scoring",
      async (job) => {
        if (job.name === "score-match") return recalculateMatch(Number(job.data.matchId));
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
