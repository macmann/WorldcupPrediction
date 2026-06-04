export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const receipts = await prisma.adminMessageReceipt.findMany({
      where: { userId: user.id },
      orderBy: { deliveredAt: "desc" },
      take: 100,
      select: {
        id: true,
        deliveredAt: true,
        readAt: true,
        message: {
          select: {
            id: true,
            title: true,
            body: true,
            audienceType: true,
            sentByAdminUsername: true,
            createdAt: true
          }
        }
      }
    });

    return NextResponse.json({
      unreadCount: receipts.filter((receipt) => !receipt.readAt).length,
      messages: receipts.map((receipt) => ({
        receiptId: receipt.id,
        id: receipt.message.id,
        title: receipt.message.title,
        body: receipt.message.body,
        audienceType: receipt.message.audienceType,
        sentByAdminUsername: receipt.message.sentByAdminUsername,
        createdAt: receipt.message.createdAt,
        deliveredAt: receipt.deliveredAt,
        readAt: receipt.readAt
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}
