import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { recalculateMatch } from "@/services/scoring";

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(params);
    const result = await recalculateMatch(id);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
