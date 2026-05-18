import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
const schema = z.object({ isEnabled: z.boolean() }).strict();

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(params);
    const input = schema.parse(await request.json());
    const match = await prisma.match.update({ where: { id }, data: { isEnabled: input.isEnabled } });
    return NextResponse.json({ match });
  } catch (error) {
    return jsonError(error);
  }
}
