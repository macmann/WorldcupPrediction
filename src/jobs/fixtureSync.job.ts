import type { Job } from "bullmq";
import { getFixtureQueue } from "./queues";
import { ingestFixtures } from "../services/fixtures";
import { JOB_FIXTURE_SYNC, recordAdminJobStatus } from "../lib/adminOps";

export const fixtureSyncJobName = "daily-fixture-ingestion";

export async function scheduleFixtureSyncJob() {
  return getFixtureQueue().upsertJobScheduler(
    fixtureSyncJobName,
    { pattern: "0 */4 * * *" },
    { name: fixtureSyncJobName }
  );
}

export async function processFixtureSyncJob(_job?: Job) {
  try {
    const result = await ingestFixtures();
    await recordAdminJobStatus(JOB_FIXTURE_SYNC, "Fixture ingestion", { success: true, payload: result });
    return result;
  } catch (error) {
    await recordAdminJobStatus(JOB_FIXTURE_SYNC, "Fixture ingestion", { success: false, error });
    throw error;
  }
}
