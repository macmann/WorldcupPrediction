export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { id } = paramsSchema.parse(params);
    const receipt = await prisma.adminMessageReceipt.findFirst({
      where: { messageId: id, userId: user.id },
      select: { id: true }
    });
    if (!receipt) throw Object.assign(new Error("Message not found"), { status: 404 });

    await prisma.adminMessageReceipt.delete({ where: { id: receipt.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
