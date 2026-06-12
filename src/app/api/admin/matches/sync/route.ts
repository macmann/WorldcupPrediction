import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { JOB_FIXTURE_SYNC, recordAdminJobStatus } from "@/lib/adminOps";
import { jsonError } from "@/lib/http";
import { fixtureSyncJobName } from "@/jobs/fixtureSync.job";
import { getFixtureQueue } from "@/jobs/queues";

const fixtureSyncEnqueueTimeoutMs = Number(process.env.FIXTURE_SYNC_ENQUEUE_TIMEOUT_MS ?? 2500);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

export async function POST() {
  try {
    await requireAdmin();
  } catch (error) {
    return jsonError(error);
  }

  try {
    const requestedAt = new Date();
    const job = await withTimeout(
      getFixtureQueue().add(fixtureSyncJobName, { requestedBy: "admin", requestedAt: requestedAt.toISOString() }, { jobId: `admin-fixture-sync-${requestedAt.getTime()}` }),
      fixtureSyncEnqueueTimeoutMs,
      "Queueing fixture sync"
    );
    const payload = { queued: true, jobId: job.id ?? null, requestedAt: requestedAt.toISOString() };
    await recordAdminJobStatus(JOB_FIXTURE_SYNC, "Fixture ingestion", { success: true, payload });
    return NextResponse.json(payload, { status: 202 });
  } catch (error) {
    await recordAdminJobStatus(JOB_FIXTURE_SYNC, "Fixture ingestion", { success: false, error });
    return jsonError(error);
  }
}
