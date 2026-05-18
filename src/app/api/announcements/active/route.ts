export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const user = await requireUser();
    const todayStart = startOfUtcDay();
    const seenToday = await prisma.announcementView.findFirst({
      where: { userId: user.id, seenAt: { gte: todayStart } },
      select: { id: true }
    });
    if (seenToday) return NextResponse.json({ announcement: null, showDate: utcDateKey(todayStart) });

    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      select: { id: true, title: true, description: true, imageUrl: true, linkUrl: true },
      take: 50
    });
    if (announcements.length === 0) return NextResponse.json({ announcement: null, showDate: utcDateKey(todayStart) });
    const announcement = announcements[Math.floor(Math.random() * announcements.length)];
    return NextResponse.json({ announcement, showDate: utcDateKey(todayStart) });
  } catch (error) {
    return jsonError(error);
  }
}
