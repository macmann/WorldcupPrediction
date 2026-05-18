export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const linkSchema = z.string().trim().min(1).max(2048).refine((value) => value.startsWith("/") || value.startsWith("https://") || value.startsWith("http://"), "Link must be a relative path or an http(s) URL");
const imageUrlSchema = z.string().trim().min(1).max(10_000_000).refine((value) => value.startsWith("data:image/") || value.startsWith("https://") || value.startsWith("http://"), "Image must be an uploaded image or an http(s) URL");

const announcementSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1200),
  imageUrl: imageUrlSchema,
  linkUrl: linkSchema,
  isActive: z.boolean().optional()
}).strict();

export async function GET() {
  try {
    await requireAdmin();
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, title: true, description: true, imageUrl: true, linkUrl: true, isActive: true, createdAt: true, updatedAt: true }
    });
    return NextResponse.json({ announcements });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = announcementSchema.parse(await request.json());
    const announcement = await prisma.announcement.create({
      data: { ...input, isActive: input.isActive ?? true },
      select: { id: true, title: true, description: true, imageUrl: true, linkUrl: true, isActive: true, createdAt: true, updatedAt: true }
    });
    return NextResponse.json({ announcement });
  } catch (error) {
    return jsonError(error);
  }
}
