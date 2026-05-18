import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) throw Object.assign(new Error("Administrator authentication required"), { status: 401 });
    return NextResponse.json({ admin });
  } catch (error) {
    return jsonError(error);
  }
}
