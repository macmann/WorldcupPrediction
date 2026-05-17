import type { Job } from "bullmq";
import { getFixtureQueue } from "./queues";
import { ingestFixtures } from "../services/fixtures";

export const fixtureSyncJobName = "daily-fixture-ingestion";

export async function scheduleFixtureSyncJob() {
  return getFixtureQueue().upsertJobScheduler(
    fixtureSyncJobName,
    { pattern: "0 0 * * *" },
    { name: fixtureSyncJobName }
  );
}

export async function processFixtureSyncJob(_job?: Job) {
  return ingestFixtures();
}
