import { StageType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { teamFlagEmoji } from "@/lib/countryFlags";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getOutrightOptions, syncOutrightCatalog } from "@/services/outrightCatalog";

const schema = z.object({
  tournamentId: z.string().uuid().optional(),
  championTeamId: z.string().uuid(),
  bestPlayerId: z.string().uuid(),
  bestGkId: z.string().uuid()
}).strict();

async function resolveOutrightLockDeadline(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { startsAt: true } });
  if (!tournament) throw Object.assign(new Error("Tournament not found"), { status: 404 });

  const firstRoundOf16Match = await prisma.match.findFirst({
    where: {
      stage: StageType.ROUND_OF_16,
      OR: [{ tournamentId }, { tournamentId: null }]
    },
    orderBy: { kickoffTime: "asc" },
    select: { kickoffTime: true }
  });

  return firstRoundOf16Match?.kickoffTime ?? config.outrightLockTime ?? tournament.startsAt;
}

function optionName(option: { flagEmoji?: string | null; name: string; team?: { flagEmoji?: string | null; shortName?: string | null; name: string } | null }) {
  const flag = teamFlagEmoji(option.team?.name ?? option.name, option.flagEmoji ?? option.team?.flagEmoji);
  const teamSuffix = option.team ? ` (${option.team.shortName ?? option.team.name})` : "";
  return `${flag ? `${flag} ` : ""}${option.name}${teamSuffix}`;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    let options = await getOutrightOptions();
    const shouldRefresh = searchParams.get("refresh") === "1";
    const hasProvider = Boolean(config.wc2026ApiKey || config.footballApiKey);

    if (shouldRefresh || options.teams.length === 0 || (hasProvider && (options.players.length === 0 || options.goalkeepers.length === 0))) {
      await syncOutrightCatalog();
      options = await getOutrightOptions();
    }

    const outright = await prisma.outright.findUnique({
      where: { userId: user.id },
      include: {
        championTeam: true,
        bestPlayer: { include: { team: true } },
        bestGoalkeeper: { include: { team: true } }
      }
    });

    const outrightLockDeadline = await resolveOutrightLockDeadline(options.tournament.id);

    return NextResponse.json({
      tournament: {
        id: options.tournament.id,
        name: options.tournament.name,
        startsAt: options.tournament.startsAt,
        outrightLockAt: outrightLockDeadline
      },
      canEdit: new Date() < outrightLockDeadline,
      options: {
        teams: options.teams.map((team) => ({ id: team.id, name: optionName(team), groupName: team.groupName })),
        players: options.players.map((player) => ({ id: player.id, name: optionName(player), teamName: player.team?.name ?? null })),
        goalkeepers: options.goalkeepers.map((player) => ({ id: player.id, name: optionName(player), teamName: player.team?.name ?? null }))
      },
      outright: outright ? {
        championTeamId: outright.championTeamId,
        bestPlayerId: outright.bestPlayerId,
        bestGkId: outright.bestGkId,
        champion: optionName(outright.championTeam),
        bestPlayer: optionName(outright.bestPlayer),
        bestGk: optionName(outright.bestGoalkeeper)
      } : null,
      source: hasProvider ? "live-provider" : "database",
      message: options.players.length === 0 || options.goalkeepers.length === 0
        ? hasProvider
          ? "Your football provider keys are configured, but the connected provider response did not include squad/player and goalkeeper data yet."
          : "Connect WC2026_API_KEY or FOOTBALL_API_KEY with squad/player support to populate live player and goalkeeper options."
        : null
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());

    const [championTeam, bestPlayer, bestGoalkeeper] = await Promise.all([
      prisma.team.findUnique({ where: { id: input.championTeamId }, select: { tournamentId: true } }),
      prisma.player.findUnique({ where: { id: input.bestPlayerId }, select: { tournamentId: true } }),
      prisma.player.findUnique({ where: { id: input.bestGkId }, select: { tournamentId: true, isGoalkeeper: true } })
    ]);

    if (!championTeam || !bestPlayer || !bestGoalkeeper) {
      throw Object.assign(new Error("One or more outright selections were not found"), { status: 400 });
    }
    if (!bestGoalkeeper.isGoalkeeper) {
      throw Object.assign(new Error("Best goalkeeper pick must reference a goalkeeper"), { status: 400 });
    }

    const tournamentId = input.tournamentId ?? championTeam.tournamentId;
    if (
      championTeam.tournamentId !== tournamentId ||
      bestPlayer.tournamentId !== tournamentId ||
      bestGoalkeeper.tournamentId !== tournamentId
    ) {
      throw Object.assign(new Error("All outright selections must belong to the same tournament"), { status: 400 });
    }

    const outrightLockDeadline = await resolveOutrightLockDeadline(tournamentId);
    if (new Date() >= outrightLockDeadline) {
      throw Object.assign(new Error("Tournament winner, Golden Ball, and Golden Glove picks are locked"), { status: 403 });
    }

    const outright = await prisma.$transaction(async (tx) => {
      const saved = await tx.outright.upsert({
        where: { userId: user.id },
        create: { userId: user.id, tournamentId, championTeamId: input.championTeamId, bestPlayerId: input.bestPlayerId, bestGkId: input.bestGkId },
        update: { tournamentId, championTeamId: input.championTeamId, bestPlayerId: input.bestPlayerId, bestGkId: input.bestGkId }
      });
      await tx.user.update({ where: { id: user.id }, data: { onboardingCompletedAt: new Date() } });
      return saved;
    });

    return NextResponse.json({ outright });
  } catch (error) {
    return jsonError(error);
  }
}
