import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { countryNameToFlagEmoji } from "@/lib/countryFlags";
import { jsonError } from "@/lib/http";
import { isGoalkeeperPosition, PLAYER_CATALOG_SOURCES, PLAYER_POSITIONS } from "@/lib/playerMaster";
import { ensurePlayerCatalogColumns, prisma } from "@/lib/prisma";
import { getOrCreateCurrentTournament } from "@/services/outrightCatalog";

const playerSchema = z.object({
  sequenceNumber: z.number().int().positive(),
  name: z.string().trim().min(1).max(160),
  nationalTeam: z.string().trim().min(1).max(120),
  position: z.enum(PLAYER_POSITIONS),
  groupName: z.string().trim().min(1).max(12)
}).strict();

const uploadSchema = z.object({ players: z.array(playerSchema).min(1).max(5000) }).strict();
const sourceSchema = z.object({ playerCatalogSource: z.enum(PLAYER_CATALOG_SOURCES) }).strict();

export async function GET() {
  try {
    await requireAdmin();
    await ensurePlayerCatalogColumns();
    const tournament = await getOrCreateCurrentTournament();
    const [settings, counts, players] = await Promise.all([
      prisma.appSetting.upsert({ where: { id: 1 }, create: { id: 1, playerCatalogSource: "API", maintenanceMode: false }, update: {} }),
      prisma.player.groupBy({ by: ["source"], where: { tournamentId: tournament.id }, _count: { _all: true } }),
      prisma.player.findMany({
        where: { tournamentId: tournament.id, source: "MANUAL" },
        include: { team: true },
        orderBy: [{ sequenceNumber: "asc" }, { team: { name: "asc" } }, { name: "asc" }]
      })
    ]);
    return NextResponse.json({
      tournament: { id: tournament.id, name: tournament.name },
      playerCatalogSource: settings.playerCatalogSource,
      counts: Object.fromEntries(counts.map((count) => [count.source, count._count._all])),
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
    await ensurePlayerCatalogColumns();
    const tournament = await getOrCreateCurrentTournament();

    let imported = 0;
    for (const row of input.players) {
      const team = await prisma.team.upsert({
        where: { tournamentId_name: { tournamentId: tournament.id, name: row.nationalTeam } },
        create: { tournamentId: tournament.id, name: row.nationalTeam, flagEmoji: countryNameToFlagEmoji(row.nationalTeam), groupName: row.groupName },
        update: { flagEmoji: countryNameToFlagEmoji(row.nationalTeam) ?? undefined, groupName: row.groupName }
      });
      const existing = await prisma.player.findFirst({ where: { tournamentId: tournament.id, teamId: team.id, name: row.name, source: "MANUAL" }, select: { id: true } });
      const data = { sequenceNumber: row.sequenceNumber, name: row.name, teamId: team.id, position: row.position, isGoalkeeper: isGoalkeeperPosition(row.position), source: "MANUAL" };
      if (existing) await prisma.player.update({ where: { id: existing.id }, data });
      else await prisma.player.create({ data: { tournamentId: tournament.id, ...data } });
      imported += 1;
    }

    return NextResponse.json({ imported });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    await ensurePlayerCatalogColumns();
    const input = sourceSchema.parse(await request.json());
    const settings = await prisma.appSetting.upsert({
      where: { id: 1 },
      create: { id: 1, playerCatalogSource: input.playerCatalogSource, maintenanceMode: false },
      update: { playerCatalogSource: input.playerCatalogSource }
    });
    return NextResponse.json({ playerCatalogSource: settings.playerCatalogSource });
  } catch (error) {
    return jsonError(error);
  }
}
