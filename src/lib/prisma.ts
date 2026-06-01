import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

let tournamentSyncColumnEnsured: Promise<void> | null = null;
let playerSequenceNumberColumnEnsured: Promise<void> | null = null;

export async function ensureTournamentSyncColumn() {
  if (!tournamentSyncColumnEnsured) {
    tournamentSyncColumnEnsured = prisma.$executeRawUnsafe(
      'ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "sync_from_at" TIMESTAMPTZ(6);'
    ).then(() => undefined);
  }
  await tournamentSyncColumnEnsured;
}

export async function ensurePlayerSequenceNumberColumn() {
  if (!playerSequenceNumberColumnEnsured) {
    playerSequenceNumberColumnEnsured = (async () => {
      await prisma.$executeRawUnsafe('ALTER TABLE IF EXISTS "players" ADD COLUMN IF NOT EXISTS "sequence_number" INTEGER;');
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF to_regclass('public.players') IS NOT NULL THEN
            CREATE INDEX IF NOT EXISTS "players_tournament_id_sequence_number_idx"
              ON "players"("tournament_id", "sequence_number");
          END IF;
        END
        $$;
      `);
    })();
  }
  await playerSequenceNumberColumnEnsured;
}
