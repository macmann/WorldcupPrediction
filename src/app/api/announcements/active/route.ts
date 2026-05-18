export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true, views: { none: { userId: user.id } } },
      select: { id: true, title: true, description: true, imageUrl: true, linkUrl: true },
      take: 50
    });
    if (announcements.length === 0) return NextResponse.json({ announcement: null });
    const announcement = announcements[Math.floor(Math.random() * announcements.length)];
    return NextResponse.json({ announcement });
  } catch (error) {
    return jsonError(error);
  }
}
