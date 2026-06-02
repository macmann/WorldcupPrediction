import { StageType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { teamFlagEmoji } from "@/lib/countryFlags";
import { jsonError } from "@/lib/http";
import { isEligibleForAward, normalizePlayerCatalogSource } from "@/lib/playerMaster";
import { ensurePlayerCatalogColumns, prisma } from "@/lib/prisma";
import { getOutrightOptions, syncOutrightCatalog } from "@/services/outrightCatalog";

const schema = z.object({
  tournamentId: z.string().uuid().optional(),
  championTeamId: z.string().uuid(),
  secondRunnerUpTeamId: z.string().uuid(),
  fairPlayTeamId: z.string().uuid(),
  bestPlayerId: z.string().uuid(),
  bestGkId: z.string().uuid(),
  goldenBootPlayerId: z.string().uuid(),
  youngPlayerId: z.string().uuid()
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
  const teamSuffix = option.team ? ` — ${option.team.name}` : "";
  return `${flag ? `${flag} ` : ""}${option.name}${teamSuffix}`;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    let options = await getOutrightOptions();
    const shouldRefresh = searchParams.get("refresh") === "1";
    const hasProvider = Boolean(config.wc2026ApiKey || config.footballApiKey);

    if (shouldRefresh || options.teams.length === 0 || (options.playerSource === "API" && hasProvider && (options.players.length === 0 || options.goalkeepers.length === 0))) {
      await syncOutrightCatalog();
      options = await getOutrightOptions();
    }

    const outright = await prisma.outright.findUnique({
      where: { userId: user.id },
      include: {
        championTeam: true,
        secondRunnerUpTeam: true,
        fairPlayTeam: true,
        bestPlayer: { include: { team: true } },
        bestGoalkeeper: { include: { team: true } },
        goldenBoot: { include: { team: true } },
        youngPlayer: { include: { team: true } }
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
        players: options.players.map((player) => ({ id: player.id, name: player.name, teamName: player.team?.name ?? null, teamId: player.teamId ?? null, position: player.position, isGoalkeeper: player.isGoalkeeper, groupName: player.team?.groupName ?? null })),
        goalkeepers: options.goalkeepers.map((player) => ({ id: player.id, name: player.name, teamName: player.team?.name ?? null, teamId: player.teamId ?? null, position: player.position, isGoalkeeper: player.isGoalkeeper, groupName: player.team?.groupName ?? null })),
        goldenBootPlayers: options.goldenBootPlayers.map((player) => ({ id: player.id, name: player.name, teamName: player.team?.name ?? null, teamId: player.teamId ?? null, position: player.position, isGoalkeeper: player.isGoalkeeper, groupName: player.team?.groupName ?? null }))
      },
      outright: outright ? {
        championTeamId: outright.championTeamId,
        secondRunnerUpTeamId: outright.secondRunnerUpTeamId,
        fairPlayTeamId: outright.fairPlayTeamId,
        bestPlayerId: outright.bestPlayerId,
        bestGkId: outright.bestGkId,
        goldenBootPlayerId: outright.goldenBootPlayerId,
        youngPlayerId: outright.youngPlayerId,
        champion: optionName(outright.championTeam),
        secondRunnerUp: optionName(outright.secondRunnerUpTeam),
        fairPlay: optionName(outright.fairPlayTeam),
        bestPlayer: optionName(outright.bestPlayer),
        bestGk: optionName(outright.bestGoalkeeper),
        goldenBoot: optionName(outright.goldenBoot),
        youngPlayer: optionName(outright.youngPlayer)
      } : null,
      source: options.playerSource === "API" ? "live-provider" : "database",
      message: options.players.length === 0 || options.goalkeepers.length === 0
        ? options.playerSource === "MANUAL"
          ? "Manual player master is selected, but no manual player and goalkeeper rows are available yet."
          : hasProvider
            ? "Your football provider keys are configured, but the connected provider response did not include squad/player and goalkeeper data yet."
            : "Connect WC2026_API_KEY or FOOTBALL_API_KEY with squad/player support, or switch the admin player master to manual upload."
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
    await ensurePlayerCatalogColumns();
    const settings = await prisma.appSetting.findUnique({ where: { id: 1 }, select: { playerCatalogSource: true } });
    const playerCatalogSource = normalizePlayerCatalogSource(settings?.playerCatalogSource);

    const [championTeam, secondRunnerUpTeam, fairPlayTeam, bestPlayer, bestGoalkeeper, goldenBootPlayer, youngPlayer] = await Promise.all([
      prisma.team.findUnique({ where: { id: input.championTeamId }, select: { tournamentId: true } }),
      prisma.team.findUnique({ where: { id: input.secondRunnerUpTeamId }, select: { tournamentId: true } }),
      prisma.team.findUnique({ where: { id: input.fairPlayTeamId }, select: { tournamentId: true } }),
      prisma.player.findUnique({ where: { id: input.bestPlayerId }, select: { tournamentId: true, source: true } }),
      prisma.player.findUnique({ where: { id: input.bestGkId }, select: { tournamentId: true, position: true, isGoalkeeper: true, source: true } }),
      prisma.player.findUnique({ where: { id: input.goldenBootPlayerId }, select: { tournamentId: true, position: true, isGoalkeeper: true, source: true } }),
      prisma.player.findUnique({ where: { id: input.youngPlayerId }, select: { tournamentId: true, source: true } })
    ]);

    if (!championTeam || !secondRunnerUpTeam || !fairPlayTeam || !bestPlayer || !bestGoalkeeper || !goldenBootPlayer || !youngPlayer) {
      throw Object.assign(new Error("One or more outright selections were not found"), { status: 400 });
    }
    if ([bestPlayer, bestGoalkeeper, goldenBootPlayer, youngPlayer].some((player) => player.source !== playerCatalogSource)) {
      throw Object.assign(new Error(`Player award selections must use the active ${playerCatalogSource === "API" ? "API-synced" : "manual"} player list`), { status: 400 });
    }
    if (!isEligibleForAward("goldenGlove", bestGoalkeeper)) {
      throw Object.assign(new Error("Golden Glove pick must reference a goalkeeper"), { status: 400 });
    }
    if (!isEligibleForAward("goldenBoot", goldenBootPlayer)) {
      throw Object.assign(new Error("Golden Boot pick cannot reference a goalkeeper"), { status: 400 });
    }

    const tournamentId = input.tournamentId ?? championTeam.tournamentId;
    if (
      championTeam.tournamentId !== tournamentId ||
      secondRunnerUpTeam.tournamentId !== tournamentId ||
      fairPlayTeam.tournamentId !== tournamentId ||
      bestPlayer.tournamentId !== tournamentId ||
      bestGoalkeeper.tournamentId !== tournamentId ||
      goldenBootPlayer.tournamentId !== tournamentId ||
      youngPlayer.tournamentId !== tournamentId
    ) {
      throw Object.assign(new Error("All outright selections must belong to the same tournament"), { status: 400 });
    }

    const outrightLockDeadline = await resolveOutrightLockDeadline(tournamentId);
    if (new Date() >= outrightLockDeadline) {
      throw Object.assign(new Error("Outright picks are locked because the Round of 16 has started"), { status: 403 });
    }

    const outright = await prisma.$transaction(async (tx) => {
      const saved = await tx.outright.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id, tournamentId, championTeamId: input.championTeamId, secondRunnerUpTeamId: input.secondRunnerUpTeamId, fairPlayTeamId: input.fairPlayTeamId,
          bestPlayerId: input.bestPlayerId, bestGkId: input.bestGkId, goldenBootPlayerId: input.goldenBootPlayerId, youngPlayerId: input.youngPlayerId
        },
        update: {
          tournamentId, championTeamId: input.championTeamId, secondRunnerUpTeamId: input.secondRunnerUpTeamId, fairPlayTeamId: input.fairPlayTeamId,
          bestPlayerId: input.bestPlayerId, bestGkId: input.bestGkId, goldenBootPlayerId: input.goldenBootPlayerId, youngPlayerId: input.youngPlayerId
        }
      });
      await tx.user.update({ where: { id: user.id }, data: { onboardingCompletedAt: new Date() } });
      return saved;
    });

    return NextResponse.json({ outright });
  } catch (error) {
    return jsonError(error);
  }
}
