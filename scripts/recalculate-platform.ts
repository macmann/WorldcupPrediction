import { prisma } from "../src/lib/prisma";
import { recalculateSeason } from "../src/services/platform/recalculation";
async function main() {
  const seasonId = process.argv[2];
  const seasons = await prisma.season.findMany({ where: seasonId ? { id: seasonId } : {}, select: { id: true } });
  for (const season of seasons) console.log(await recalculateSeason(season.id));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
