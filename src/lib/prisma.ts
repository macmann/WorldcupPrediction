import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

let tournamentSyncColumnEnsured: Promise<void> | null = null;

export async function ensureTournamentSyncColumn() {
  if (!tournamentSyncColumnEnsured) {
    tournamentSyncColumnEnsured = prisma.$executeRawUnsafe(
      'ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "sync_from_at" TIMESTAMPTZ(6);'
    ).then(() => undefined);
  }
  await tournamentSyncColumnEnsured;
}
