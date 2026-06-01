import { config } from "@/lib/config";
import { canonicalCountryName, countryNameToFlagEmoji } from "@/lib/countryFlags";
import { isGoalkeeperPosition, normalizePlayerCatalogSource } from "@/lib/playerMaster";
import { ensurePlayerCatalogColumns, ensurePlayerSequenceNumberColumn, prisma } from "@/lib/prisma";
import { fetchWorldCupCatalog, type ExternalCatalog } from "@/services/footballApi";

export const WORLD_CUP_2026_SLUG = "world-cup-2026";

export async function getOrCreateCurrentTournament() {
  await ensurePlayerSequenceNumberColumn();
  return prisma.tournament.upsert({
    where: { slug: WORLD_CUP_2026_SLUG },
    create: {
      name: "FIFA World Cup 2026",
      slug: WORLD_CUP_2026_SLUG,
      externalId: config.worldCupCompetitionCode,
      startsAt: config.tournamentStartTime,
      hostCountries: ["Canada", "Mexico", "United States"]
    },
    update: {
      startsAt: config.tournamentStartTime,
      externalId: config.worldCupCompetitionCode
    }
  });
}

async function upsertCatalog(catalog: ExternalCatalog) {
  const tournament = await getOrCreateCurrentTournament();
  const teamIdByExternalId = new Map<string, string>();
  const teamIdByName = new Map<string, string>();

  for (const team of catalog.teams) {
    const teamName = canonicalCountryName(team.name) ?? team.name;
    const existingTeam = await prisma.team.findFirst({
      where: {
        tournamentId: tournament.id,
        OR: [
          ...(team.externalId ? [{ externalId: team.externalId }] : []),
          { name: teamName }
        ]
      }
    });
    const teamData = {
      externalId: existingTeam?.externalId ?? team.externalId,
      name: teamName,
      shortName: team.shortName,
      flagEmoji: team.flagEmoji ?? countryNameToFlagEmoji(teamName),
      groupName: team.groupName
    };
    const savedTeam = existingTeam
      ? await prisma.team.update({ where: { id: existingTeam.id }, data: teamData })
      : await prisma.team.create({ data: { tournamentId: tournament.id, ...teamData } });

    if (team.externalId) teamIdByExternalId.set(team.externalId, savedTeam.id);
    if (savedTeam.externalId) teamIdByExternalId.set(savedTeam.externalId, savedTeam.id);
    teamIdByName.set(teamName.toLowerCase(), savedTeam.id);
    teamIdByName.set(team.name.toLowerCase(), savedTeam.id);
  }

  for (const player of catalog.players) {
    const playerTeamName = canonicalCountryName(player.teamName) ?? player.teamName;
    const teamId = player.teamExternalId
      ? teamIdByExternalId.get(player.teamExternalId)
      : playerTeamName
        ? teamIdByName.get(playerTeamName.toLowerCase()) ?? teamIdByName.get(player.teamName!.toLowerCase())
        : undefined;
    const data = {
      teamId,
      name: player.name,
      position: player.position,
      isGoalkeeper: player.isGoalkeeper || isGoalkeeperPosition(player.position),
      source: "API"
    };

    if (player.externalId) {
      await prisma.player.upsert({
        where: { tournamentId_externalId: { tournamentId: tournament.id, externalId: player.externalId } },
        create: { tournamentId: tournament.id, externalId: player.externalId, ...data },
        update: data
      });
      continue;
    }

    const existingPlayer = await prisma.player.findFirst({
      where: { tournamentId: tournament.id, name: player.name, teamId },
      select: { id: true }
    });
    if (existingPlayer) {
      await prisma.player.update({ where: { id: existingPlayer.id }, data });
    } else {
      await prisma.player.create({ data: { tournamentId: tournament.id, ...data } });
    }
  }

  return { tournamentId: tournament.id, teams: catalog.teams.length, players: catalog.players.length };
}

async function upsertTeamsFromFixtures() {
  const tournament = await getOrCreateCurrentTournament();
  const fixtures = await prisma.match.findMany({
    select: { id: true, homeTeam: true, awayTeam: true, groupName: true, homeTeamId: true, awayTeamId: true }
  });

  let upserted = 0;
  for (const fixture of fixtures) {
    const [homeTeam, awayTeam] = await Promise.all([
      prisma.team.upsert({
        where: { tournamentId_name: { tournamentId: tournament.id, name: canonicalCountryName(fixture.homeTeam) ?? fixture.homeTeam } },
        create: { tournamentId: tournament.id, name: canonicalCountryName(fixture.homeTeam) ?? fixture.homeTeam, flagEmoji: countryNameToFlagEmoji(fixture.homeTeam), groupName: fixture.groupName },
        update: { flagEmoji: countryNameToFlagEmoji(fixture.homeTeam) ?? undefined, groupName: fixture.groupName ?? undefined }
      }),
      prisma.team.upsert({
        where: { tournamentId_name: { tournamentId: tournament.id, name: canonicalCountryName(fixture.awayTeam) ?? fixture.awayTeam } },
        create: { tournamentId: tournament.id, name: canonicalCountryName(fixture.awayTeam) ?? fixture.awayTeam, flagEmoji: countryNameToFlagEmoji(fixture.awayTeam), groupName: fixture.groupName },
        update: { flagEmoji: countryNameToFlagEmoji(fixture.awayTeam) ?? undefined, groupName: fixture.groupName ?? undefined }
      })
    ]);
    upserted += 2;
    if (!fixture.homeTeamId || !fixture.awayTeamId) {
      await prisma.match.update({
        where: { id: fixture.id },
        data: { tournamentId: tournament.id, homeTeamId: homeTeam.id, awayTeamId: awayTeam.id }
      });
    }
  }
  return { tournamentId: tournament.id, teams: upserted, players: 0 };
}

export async function syncOutrightCatalog() {
  const catalog = await fetchWorldCupCatalog();
  if (catalog.teams.length > 0 || catalog.players.length > 0) return upsertCatalog(catalog);
  return upsertTeamsFromFixtures();
}

export async function getOutrightOptions() {
  await ensurePlayerCatalogColumns();
  const tournament = await getOrCreateCurrentTournament();
  const settings = await prisma.appSetting.findUnique({ where: { id: 1 }, select: { playerCatalogSource: true } }).catch(() => null);
  const playerSource = normalizePlayerCatalogSource(settings?.playerCatalogSource);
  const playerWhere = { tournamentId: tournament.id, source: playerSource };
  const [teams, players, goalkeepers, goldenBootPlayers] = await Promise.all([
    prisma.team.findMany({ where: { tournamentId: tournament.id }, orderBy: [{ groupName: "asc" }, { name: "asc" }] }),
    prisma.player.findMany({ where: playerWhere, include: { team: true }, orderBy: [{ sequenceNumber: "asc" }, { name: "asc" }] }),
    prisma.player.findMany({ where: { ...playerWhere, isGoalkeeper: true }, include: { team: true }, orderBy: [{ team: { name: "asc" } }, { sequenceNumber: "asc" }, { name: "asc" }] }),
    prisma.player.findMany({ where: { ...playerWhere, isGoalkeeper: false }, include: { team: true }, orderBy: [{ team: { name: "asc" } }, { sequenceNumber: "asc" }, { name: "asc" }] })
  ]);

  return { tournament, teams, players, goalkeepers, goldenBootPlayers, playerSource };
}
