import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { JOB_FIXTURE_SYNC, recordAdminJobStatus } from "@/lib/adminOps";
import { jsonError } from "@/lib/http";
import { ingestFixtures } from "@/services/fixtures";

export async function POST() {
  try {
    await requireAdmin();
  } catch (error) {
    return jsonError(error);
  }

  try {
    const result = await ingestFixtures();
    await recordAdminJobStatus(JOB_FIXTURE_SYNC, "Fixture ingestion", { success: true, payload: result });
    return NextResponse.json(result);
  } catch (error) {
    await recordAdminJobStatus(JOB_FIXTURE_SYNC, "Fixture ingestion", { success: false, error });
    return jsonError(error);
  }
}
