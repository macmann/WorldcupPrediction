export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/adminOps";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const settings = await getAppSettings();
    return NextResponse.json({ announcementText: settings.announcementText, bannerImageUrl: settings.bannerImageUrl, maintenanceMode: settings.maintenanceMode });
  } catch (error) {
    return jsonError(error);
  }
}
