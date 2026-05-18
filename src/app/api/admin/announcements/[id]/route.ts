export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const linkSchema = z.string().trim().min(1).max(2048).refine((value) => value.startsWith("/") || value.startsWith("https://") || value.startsWith("http://"), "Link must be a relative path or an http(s) URL");
const imageUrlSchema = z.string().trim().min(1).max(10_000_000).refine((value) => value.startsWith("data:image/") || value.startsWith("https://") || value.startsWith("http://"), "Image must be an uploaded image or an http(s) URL");

const announcementPatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(1200).optional(),
  imageUrl: imageUrlSchema.optional(),
  linkUrl: linkSchema.optional(),
  isActive: z.boolean().optional()
}).strict();

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = announcementPatchSchema.parse(await request.json());
    const announcement = await prisma.announcement.update({
      where: { id: params.id },
      data: input,
      select: { id: true, title: true, description: true, imageUrl: true, linkUrl: true, isActive: true, createdAt: true, updatedAt: true }
    });
    return NextResponse.json({ announcement });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await prisma.announcement.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
