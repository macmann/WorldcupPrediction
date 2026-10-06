import { type Prisma, SeasonPickTarget } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { defaultAchievements, defaultSeasonPickRules } from "../../lib/platformRules";
import type { Tx } from "./transactions";

export async function seedAchievements(tx: Tx = prisma) {
  for (const definition of defaultAchievements) {
    await tx.achievementDefinition.upsert({ where: { id: definition.id }, create: { id: definition.id, criteria: definition.criteria, enabled: "enabled" in definition ? definition.enabled : true }, update: {} });
  }
}
export async function seedPickRules(seasonId: string, tx: Tx = prisma) {
  for (const rule of defaultSeasonPickRules) {
    await tx.seasonPickRule.upsert({ where: { seasonId_key: { seasonId, key: rule.key } }, create: { seasonId, ...rule, target: rule.target as SeasonPickTarget }, update: {} });
  }
}
export async function bootstrapPremierLeague() {
  await seedAchievements();
  return prisma.$transaction(async tx => {
    // A migrated EPL tournament already owns the provider identity, even when
    // its slug is legacy-prefixed. Reuse it instead of creating a duplicate PL.
    const providerCompetition = await tx.competition.findUnique({ where: { provider_providerCode: { provider: "football-data", providerCode: "PL" } } });
    const slugCompetition = await tx.competition.findUnique({ where: { slug: "premier-league" } });
    if (slugCompetition && (slugCompetition.provider !== "football-data" || slugCompetition.providerCode !== "PL")) {
      throw Object.assign(new Error("The premier-league slug belongs to another provider configuration. Review that competition before configuring EPL."), { status: 409 });
    }
    const existingCompetition = providerCompetition ?? slugCompetition;
    const competition = existingCompetition
      ? await tx.competition.update({ where: { id: existingCompetition.id }, data: { type: "LEAGUE", displayPriority: 0 } })
      : await tx.competition.create({ data: { name: "Premier League", shortName: "PL", slug: "premier-league", region: "England", type: "LEAGUE", provider: "football-data", providerCode: "PL", displayPriority: 0 } });
    const hasCurrentSeason = await tx.season.count({ where: { competitionId: competition.id, isCurrent: true } }) > 0;
    const season = await tx.season.upsert({
      where: { competitionId_displayName: { competitionId: competition.id, displayName: "2026/27" } },
      create: { competitionId: competition.id, displayName: "2026/27", startsAt: new Date("2026-07-01T00:00:00Z"), endsAt: new Date("2027-06-30T23:59:59Z"), providerSeason: 2026, usesGameweeks: true, isCurrent: !hasCurrentSeason, status: "ACTIVE", timezone: "Europe/London" }, update: {}
    });
    for (let number = 1; number <= 38; number++) {
      await tx.gameweek.upsert({ where: { seasonId_number: { seasonId: season.id, number } }, create: { seasonId: season.id, number }, update: {} });
    }
    await seedPickRules(season.id, tx);
    return { competition, season };
  });
}

// Idempotent repair for legacy records created after the additive migration.
export async function backfillLegacyTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUniqueOrThrow({ where: { id: tournamentId } });
  return prisma.$transaction(async tx => {
    const existing = await tx.season.findUnique({ where: { legacyTournamentId: tournamentId } });
    if (existing) return existing;
    const competition = await tx.competition.upsert({ where: { slug: `legacy-${tournament.slug}` },
      create: { id: tournament.id, name: tournament.name, shortName: tournament.name, slug: `legacy-${tournament.slug}`, region: tournament.hostCountries.join(", "), type: "HYBRID", provider: tournament.externalId?.startsWith("football-data:") ? "football-data" : "legacy", providerCode: tournament.externalId?.startsWith("football-data:") ? tournament.externalId.slice(14) : null, displayPriority: 100 }, update: {} });
    const season = await tx.season.create({ data: { id: tournament.id, competitionId: competition.id, legacyTournamentId: tournament.id, displayName: String(tournament.startsAt.getUTCFullYear()), startsAt: tournament.startsAt, endsAt: tournament.endsAt, providerSeason: tournament.startsAt.getUTCFullYear(), status: tournament.endsAt && tournament.endsAt < new Date() ? "COMPLETED" : "ACTIVE", picksLockGameweek: null, scoringRules: { outcome: 2, exact: 3, penalty: 1, legacyKnockout: true } as Prisma.InputJsonValue } });
    await tx.match.updateMany({ where: { tournamentId }, data: { seasonId: season.id, competitionId: competition.id } });
    await tx.team.updateMany({ where: { tournamentId }, data: { seasonId: season.id } });
    await tx.player.updateMany({ where: { tournamentId }, data: { seasonId: season.id } });
    return season;
  });
}
