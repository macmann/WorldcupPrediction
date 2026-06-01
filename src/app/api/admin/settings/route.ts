export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getAppSettings } from "@/lib/adminOps";
import { jsonError } from "@/lib/http";
import { PLAYER_CATALOG_SOURCES } from "@/lib/playerMaster";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  announcementText: z.string().trim().max(240).nullable().optional(),
  bannerImageUrl: z.string().trim().min(1).max(10_000_000).refine((value) => value.startsWith("data:image/") || value.startsWith("https://") || value.startsWith("http://"), "Banner must be an uploaded image or an http(s) URL").nullable().optional(),
  loginBackgroundImageUrl: z.string().trim().min(1).max(10_000_000).refine((value) => value.startsWith("data:image/") || value.startsWith("https://") || value.startsWith("http://"), "Login background must be an uploaded image or an http(s) URL").nullable().optional(),
  maintenanceMode: z.boolean().optional(),
  playerCatalogSource: z.enum(PLAYER_CATALOG_SOURCES).optional()
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
      create: { id: 1, announcementText: input.announcementText ?? null, bannerImageUrl: input.bannerImageUrl ?? null, loginBackgroundImageUrl: input.loginBackgroundImageUrl ?? null, maintenanceMode: input.maintenanceMode ?? false, playerCatalogSource: input.playerCatalogSource ?? "API" },
      update: {
        ...(input.announcementText !== undefined ? { announcementText: input.announcementText || null } : {}),
        ...(input.bannerImageUrl !== undefined ? { bannerImageUrl: input.bannerImageUrl || null } : {}),
        ...(input.loginBackgroundImageUrl !== undefined ? { loginBackgroundImageUrl: input.loginBackgroundImageUrl || null } : {}),
        ...(input.maintenanceMode !== undefined ? { maintenanceMode: input.maintenanceMode } : {}),
        ...(input.playerCatalogSource !== undefined ? { playerCatalogSource: input.playerCatalogSource } : {})
      }
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
