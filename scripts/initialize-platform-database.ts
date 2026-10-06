import { PrismaClient } from "@prisma/client";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const db = new PrismaClient();
function prisma(args: string[]) {
  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", ...args], { stdio: "inherit", env: process.env });
  if (result.status !== 0) throw new Error(`Database initialization command failed: ${args[0]}`);
}
async function main() {
  const tables = await db.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'`;
  if (Number(tables[0].count) !== 0) throw new Error("Initialization requires an EMPTY database. Use staged migrations for existing databases.");
  await db.$disconnect();
  prisma(["db", "execute", "--file", "prisma/baselines/pre-platform.sql", "--schema", "prisma/schema.prisma"]);
  prisma(["db", "execute", "--file", "prisma/migrations/20261005160000_persistent_competitions/migration.sql", "--schema", "prisma/schema.prisma"]);
  for (const migration of readdirSync("prisma/migrations", { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()) {
    prisma(["migrate", "resolve", "--applied", migration]);
  }
  console.log("Empty database initialized and migration baseline recorded. Run npm run platform:bootstrap next.");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
