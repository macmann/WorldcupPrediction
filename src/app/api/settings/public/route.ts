export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/adminOps";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const settings = await getAppSettings();
    return NextResponse.json({ announcementText: settings.announcementText, bannerImageUrl: settings.bannerImageUrl, loginBackgroundImageUrl: settings.loginBackgroundImageUrl, maintenanceMode: settings.maintenanceMode, gameRulesHtml: settings.gameRulesHtml, termsConditionsHtml: settings.termsConditionsHtml });
  } catch (error) {
    return jsonError(error);
  }
}
