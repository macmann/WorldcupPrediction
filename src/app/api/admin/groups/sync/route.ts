import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { JOB_GROUP_STANDINGS_SYNC, recordAdminJobStatus } from "@/lib/adminOps";
import { jsonError } from "@/lib/http";
import { fetchWorldCupGroups } from "@/services/footballApi";

export async function POST() {
  try {
    await requireAdmin();
  } catch (error) {
    return jsonError(error);
  }

  try {
    const groups = await fetchWorldCupGroups();
    const standingsCount = groups.reduce((total, group) => total + group.teams.length, 0);
    const payload = {
      refreshed: true,
      groups: groups.length,
      standings: standingsCount,
      refreshedAt: new Date().toISOString()
    };
    await recordAdminJobStatus(JOB_GROUP_STANDINGS_SYNC, "Group standings refresh", { success: true, payload });
    return NextResponse.json(payload);
  } catch (error) {
    await recordAdminJobStatus(JOB_GROUP_STANDINGS_SYNC, "Group standings refresh", { success: false, error });
    return jsonError(error);
  }
}
