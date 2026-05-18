export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getAppSettings } from "@/lib/adminOps";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  announcementText: z.string().trim().max(240).nullable().optional(),
  maintenanceMode: z.boolean().optional()
}).strict();

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ settings: await getAppSettings() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const input = schema.parse(await request.json());
    const settings = await prisma.appSetting.upsert({
      where: { id: 1 },
      create: { id: 1, announcementText: input.announcementText ?? null, maintenanceMode: input.maintenanceMode ?? false },
      update: {
        ...(input.announcementText !== undefined ? { announcementText: input.announcementText || null } : {}),
        ...(input.maintenanceMode !== undefined ? { maintenanceMode: input.maintenanceMode } : {})
      }
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
