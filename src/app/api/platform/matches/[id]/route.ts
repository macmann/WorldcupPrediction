import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { revealMatch } from "@/services/platform/views";
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try { const user = await requireUser(); const id = z.coerce.number().int().positive().parse(params.id); const leagueId = z.string().uuid().optional().parse(new URL(request.url).searchParams.get("leagueId") ?? undefined); return NextResponse.json(await revealMatch(user.id, id, leagueId)); } catch (error) { return jsonError(error); }
}
