import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { ingestFixtures } from "@/services/fixtures";

export async function POST() {
  try {
    await requireAdmin();
    const result = await ingestFixtures();
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
