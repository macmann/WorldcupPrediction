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
    const rows = groups.flatMap((group) => group.teams);
    const payload = {
      refreshed: true,
      groups: groups.length,
      standings: standingsCount,
      rowsWithPlayedMatches: rows.filter((row) => row.played > 0).length,
      rowsWithPoints: rows.filter((row) => row.points > 0).length,
      totalPoints: rows.reduce((total, row) => total + row.points, 0),
      totalPlayed: rows.reduce((total, row) => total + row.played, 0),
      sample: rows.slice(0, 4).map((row) => ({
        rank: row.rank,
        name: row.name,
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        lost: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
        points: row.points
      })),
      refreshedAt: new Date().toISOString()
    };
    await recordAdminJobStatus(JOB_GROUP_STANDINGS_SYNC, "Group standings refresh", { success: true, payload });
    return NextResponse.json(payload);
  } catch (error) {
    await recordAdminJobStatus(JOB_GROUP_STANDINGS_SYNC, "Group standings refresh", { success: false, error });
    return jsonError(error);
  }
}
