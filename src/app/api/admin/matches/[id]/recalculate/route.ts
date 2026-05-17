import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { recalculateMatch } from "@/services/scoring";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const result = await recalculateMatch(Number(params.id));
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
