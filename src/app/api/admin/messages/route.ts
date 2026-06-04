export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminMessageAudienceType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const messageSchema = z.discriminatedUnion("audienceType", [
  z.object({ audienceType: z.literal("ALL"), title: z.string().trim().min(1).max(140), body: z.string().trim().min(1).max(3000) }).strict(),
  z.object({ audienceType: z.literal("USER"), title: z.string().trim().min(1).max(140), body: z.string().trim().min(1).max(3000), userIds: z.array(z.string().uuid()).min(1).max(500) }).strict(),
  z.object({ audienceType: z.literal("LEAGUE"), title: z.string().trim().min(1).max(140), body: z.string().trim().min(1).max(3000), leagueIds: z.array(z.string().uuid()).min(1).max(100) }).strict()
]);

export async function GET() {
  try {
    await requireAdmin();
    const messages = await prisma.adminMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        body: true,
        audienceType: true,
        sentByAdminUsername: true,
        createdAt: true,
        _count: { select: { receipts: true } },
        leagueTargets: { select: { league: { select: { id: true, name: true, joinCode: true } } } }
      }
    });
    return NextResponse.json({
      messages: messages.map((message) => ({
        id: message.id,
        title: message.title,
        body: message.body,
        audienceType: message.audienceType,
        sentByAdminUsername: message.sentByAdminUsername,
        createdAt: message.createdAt,
        recipientCount: message._count.receipts,
        leagues: message.leagueTargets.map((target) => target.league)
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const input = messageSchema.parse(await request.json());

    let userIds: string[] = [];
    if (input.audienceType === "ALL") {
      const users = await prisma.user.findMany({ where: { isBanned: false }, select: { id: true } });
      userIds = users.map((user) => user.id);
    } else if (input.audienceType === "USER") {
      const users = await prisma.user.findMany({ where: { id: { in: input.userIds }, isBanned: false }, select: { id: true } });
      userIds = users.map((user) => user.id);
    } else {
      const members = await prisma.leagueMember.findMany({ where: { leagueId: { in: input.leagueIds }, user: { isBanned: false } }, distinct: ["userId"], select: { userId: true } });
      userIds = members.map((member) => member.userId);
    }

    if (userIds.length === 0) throw Object.assign(new Error("No active recipients matched this audience"), { status: 400 });

    const message = await prisma.adminMessage.create({
      data: {
        title: input.title,
        body: input.body,
        audienceType: input.audienceType as AdminMessageAudienceType,
        sentByAdminId: admin.id,
        sentByAdminUsername: admin.username,
        receipts: { createMany: { data: userIds.map((userId) => ({ userId })), skipDuplicates: true } },
        leagueTargets: input.audienceType === "LEAGUE" ? { createMany: { data: input.leagueIds.map((leagueId) => ({ leagueId })), skipDuplicates: true } } : undefined
      },
      select: { id: true, title: true, body: true, audienceType: true, sentByAdminUsername: true, createdAt: true, _count: { select: { receipts: true } } }
    });

    return NextResponse.json({ message: { ...message, recipientCount: message._count.receipts, leagues: [] } }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
