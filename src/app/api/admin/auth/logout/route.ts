import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/adminAuth";

export async function POST() {
  clearAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
