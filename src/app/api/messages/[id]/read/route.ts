export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { id } = paramsSchema.parse(params);
    const receipt = await prisma.adminMessageReceipt.findFirst({ where: { messageId: id, userId: user.id }, select: { id: true, readAt: true } });
    if (!receipt) throw Object.assign(new Error("Message not found"), { status: 404 });
    const updated = receipt.readAt
      ? receipt
      : await prisma.adminMessageReceipt.update({ where: { id: receipt.id }, data: { readAt: new Date() }, select: { id: true, readAt: true } });
    return NextResponse.json({ receipt: updated });
  } catch (error) {
    return jsonError(error);
  }
}
