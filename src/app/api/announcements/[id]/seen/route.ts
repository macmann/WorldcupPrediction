export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await prisma.announcementView.upsert({
      where: { announcementId_userId: { announcementId: params.id, userId: user.id } },
      create: { announcementId: params.id, userId: user.id },
      update: { seenAt: new Date() }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
