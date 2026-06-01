import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { countryNameToFlagEmoji } from "@/lib/countryFlags";
import { jsonError } from "@/lib/http";
import { isGoalkeeperPosition, PLAYER_POSITIONS } from "@/lib/playerMaster";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentTournament } from "@/services/outrightCatalog";

const playerSchema = z.object({
  sequenceNumber: z.number().int().positive(),
  name: z.string().trim().min(1).max(160),
  nationalTeam: z.string().trim().min(1).max(120),
  position: z.enum(PLAYER_POSITIONS),
  groupName: z.string().trim().min(1).max(12)
}).strict();

const uploadSchema = z.object({ players: z.array(playerSchema).min(1).max(5000) }).strict();

export async function GET() {
  try {
    await requireAdmin();
    const tournament = await getOrCreateCurrentTournament();
    const players = await prisma.player.findMany({
      where: { tournamentId: tournament.id },
      include: { team: true },
      orderBy: [{ sequenceNumber: "asc" }, { team: { name: "asc" } }, { name: "asc" }]
    });
    return NextResponse.json({
      tournament: { id: tournament.id, name: tournament.name },
      players: players.map((player) => ({
        id: player.id,
        sequenceNumber: player.sequenceNumber,
        name: player.name,
        nationalTeam: player.team?.name ?? "",
        position: player.position ?? "",
        groupName: player.team?.groupName ?? ""
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = uploadSchema.parse(await request.json());
    const tournament = await getOrCreateCurrentTournament();

    const imported = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const row of input.players) {
        const team = await tx.team.upsert({
          where: { tournamentId_name: { tournamentId: tournament.id, name: row.nationalTeam } },
          create: { tournamentId: tournament.id, name: row.nationalTeam, flagEmoji: countryNameToFlagEmoji(row.nationalTeam), groupName: row.groupName },
          update: { flagEmoji: countryNameToFlagEmoji(row.nationalTeam) ?? undefined, groupName: row.groupName }
        });
        const existing = await tx.player.findFirst({ where: { tournamentId: tournament.id, teamId: team.id, name: row.name }, select: { id: true } });
        const data = { sequenceNumber: row.sequenceNumber, name: row.name, teamId: team.id, position: row.position, isGoalkeeper: isGoalkeeperPosition(row.position) };
        if (existing) await tx.player.update({ where: { id: existing.id }, data });
        else await tx.player.create({ data: { tournamentId: tournament.id, ...data } });
        count += 1;
      }
      return count;
    });

    return NextResponse.json({ imported });
  } catch (error) {
    return jsonError(error);
  }
}
