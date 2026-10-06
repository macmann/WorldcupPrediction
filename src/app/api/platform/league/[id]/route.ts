import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { leagueSeasonView, resolveSeason } from "@/services/platform/views";
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try { const user = await requireUser(); const leagueId = z.string().uuid().parse(params.id); const q = new URL(request.url).searchParams; const seasonId = z.string().uuid().optional().parse(q.get("seasonId") ?? cookies().get("football_season")?.value); const gw = z.string().uuid().optional().parse(q.get("gameweekId") ?? undefined); const season = await resolveSeason(seasonId); if (!season) return NextResponse.json({ view: null }); return NextResponse.json({ view: await leagueSeasonView(user.id, leagueId, season.id, gw) }); } catch (error) { return jsonError(error); }
}
