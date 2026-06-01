import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminAccount } from "@/lib/adminAuth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ confirmation: z.literal("HARD RESET") }).strict();

const tablesToReset = [
  "announcement_views",
  "announcements",
  "admin_job_statuses",
  "app_settings",
  "league_rank_snapshots",
  "league_members",
  "leagues",
  "notification_deliveries",
  "notification_preferences",
  "oauth_accounts",
  "password_reset_tokens",
  "predictions",
  "share_card_items",
  "share_cards",
  "user_sessions",
  "outright_settlements",
  "outrights",
  "matches",
  "players",
  "teams",
  "tournaments",
  "users"
];

export async function POST(request: Request) {
  try {
    await requireSuperAdminAccount();
    schema.parse(await request.json());

    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tablesToReset.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`);

    return NextResponse.json({ ok: true, resetAt: new Date().toISOString() });
  } catch (error) {
    return jsonError(error);
  }
}
