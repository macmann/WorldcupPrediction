import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export type Tx = Prisma.TransactionClient;
export async function seasonTransaction<T>(seasonId: string, work: (tx: Tx) => Promise<T>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${seasonId}, 0))::text`;
        return work(tx);
      }, { timeout: 120_000, maxWait: 15_000 });
    } catch (error) {
      if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue;
      throw error;
    }
  }
}
export async function databaseNow(tx: Tx) {
  const [row] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return row.now;
}
