export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

function hoursToMilliseconds(hours: number) {
  return hours * 60 * 60 * 1000;
}

export async function GET() {
  try {
    const user = await requireUser();
    const now = new Date();
    const recentView = await prisma.announcementView.findFirst({
      where: { userId: user.id },
      orderBy: { seenAt: "desc" },
      select: {
        seenAt: true,
        announcement: { select: { displayFrequencyHours: true } }
      }
    });

    if (recentView) {
      const nextEligibleAt = new Date(recentView.seenAt.getTime() + hoursToMilliseconds(recentView.announcement.displayFrequencyHours));
      if (nextEligibleAt > now) return NextResponse.json({ announcement: null, userId: user.id, nextEligibleAt: nextEligibleAt.toISOString() });
    }

    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      select: { id: true, title: true, description: true, imageUrl: true, linkUrl: true, displayFrequencyHours: true },
      take: 50
    });
    if (announcements.length === 0) return NextResponse.json({ announcement: null, userId: user.id, nextEligibleAt: null });
    const announcement = announcements[Math.floor(Math.random() * announcements.length)];
    return NextResponse.json({ announcement, userId: user.id, nextEligibleAt: now.toISOString() });
  } catch (error) {
    return jsonError(error);
  }
}
