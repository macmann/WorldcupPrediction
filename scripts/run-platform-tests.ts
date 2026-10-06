import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
const base = process.env.DATABASE_URL;
if (!base) throw new Error("DATABASE_URL is required for integration tests");
const url = new URL(base);
if (!["127.0.0.1", "localhost"].includes(url.hostname)) throw new Error("Integration test provisioning is restricted to an isolated local PostgreSQL instance");
const database = `football_test_${randomUUID().replaceAll("-", "")}`;
const admin = new PrismaClient({ datasources: { db: { url: base } } });
async function main() {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  url.pathname = `/${database}`; url.searchParams.delete("schema");
  const env = { ...process.env, DATABASE_URL: url.toString(), PLATFORM_INTEGRATION: "1" };
  try {
    for (const file of ["prisma/baselines/pre-platform.sql", "tests/fixtures/legacy-data.sql", "prisma/migrations/20261005160000_persistent_competitions/migration.sql"]) {
      const result = spawnSync("npx", ["prisma", "db", "execute", "--file", file, "--schema", "prisma/schema.prisma"], { env, stdio: "inherit" });
      if (result.status !== 0) { process.exitCode = result.status ?? 1; return; }
    }
    const result = spawnSync(process.execPath, ["--import", "tsx", "--test", "tests/platform.integration.test.ts"], { env, stdio: "inherit" });
    process.exitCode = result.status ?? 1;
  } finally { await admin.$executeRawUnsafe(`DROP DATABASE "${database}" WITH (FORCE)`); await admin.$disconnect(); }
}
main().catch(async error => { console.error(error); process.exitCode = 1; await admin.$disconnect(); });
