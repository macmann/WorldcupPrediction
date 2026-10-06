import { prisma } from "../src/lib/prisma";
import { bootstrapPremierLeague, backfillLegacyTournament } from "../src/services/platform/setup";
async function main() {
  for (const tournament of await prisma.tournament.findMany({ select: { id: true } })) await backfillLegacyTournament(tournament.id);
  const { competition, season } = await bootstrapPremierLeague();
  console.log(`Configured ${competition.name} ${season.displayName}. No fixtures or results were fabricated. Configure FOOTBALL_API_KEY and run season sync.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
