import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { settleTournamentOutrights } from "@/services/outrightSettlement";

const schema = z.object({
  tournamentId: z.string().uuid(),
  goldenBallPlayerId: z.string().uuid(),
  goldenGlovePlayerId: z.string().uuid()
}).strict();

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = schema.parse(await request.json());
    const result = await settleTournamentOutrights(input.tournamentId, input.goldenBallPlayerId, input.goldenGlovePlayerId);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
