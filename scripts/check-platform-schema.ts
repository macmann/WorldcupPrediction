import { requirePlatformSchema } from "../src/services/platform/schemaReadiness";
import { prisma } from "../src/lib/prisma";
requirePlatformSchema().then(() => console.log("Platform database schema is ready.")).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
