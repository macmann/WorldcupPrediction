import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { countryNameToFlagEmoji } from "@/lib/countryFlags";
import { jsonError } from "@/lib/http";
import { isGoalkeeperPosition, PLAYER_POSITIONS } from "@/lib/playerMaster";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  sequenceNumber: z.number().int().positive(),
  name: z.string().trim().min(1).max(160),
  nationalTeam: z.string().trim().min(1).max(120),
  position: z.enum(PLAYER_POSITIONS),
  groupName: z.string().trim().min(1).max(12)
}).strict();

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = schema.parse(await request.json());
    const player = await prisma.player.findUnique({ where: { id: params.id }, select: { id: true, tournamentId: true } });
    if (!player) throw Object.assign(new Error("Player not found"), { status: 404 });
    const team = await prisma.team.upsert({
      where: { tournamentId_name: { tournamentId: player.tournamentId, name: input.nationalTeam } },
      create: { tournamentId: player.tournamentId, name: input.nationalTeam, flagEmoji: countryNameToFlagEmoji(input.nationalTeam), groupName: input.groupName },
      update: { flagEmoji: countryNameToFlagEmoji(input.nationalTeam) ?? undefined, groupName: input.groupName }
    });
    const updated = await prisma.player.update({
      where: { id: player.id },
      data: { sequenceNumber: input.sequenceNumber, name: input.name, teamId: team.id, position: input.position, isGoalkeeper: isGoalkeeperPosition(input.position) }
    });
    return NextResponse.json({ player: updated });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await prisma.player.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
