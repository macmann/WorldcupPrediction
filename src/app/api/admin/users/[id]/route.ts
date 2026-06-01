import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().uuid() });
const schema = z.object({
  email: z.string().email().optional(),
  displayName: z.string().min(2).max(60).optional(),
  avatarUrl: z.string().url().nullable().optional().or(z.literal("")),
  globalPoints: z.number().int().min(-100000).max(100000).optional(),
  exactScoresCount: z.number().int().min(0).max(100000).optional(),
  correctOutcomesCount: z.number().int().min(0).max(100000).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().trim().max(300).nullable().optional(),
  password: z.string().min(8).max(200).optional()
}).strict();

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const { id } = paramsSchema.parse(params);
    const input = schema.parse(await request.json());
    if (admin.id === id && input.isBanned) throw Object.assign(new Error("Admins cannot ban their own account"), { status: 400 });

    const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;
    const banReason = input.banReason === "" ? null : input.banReason;
    const data = {
      ...(input.email ? { email: input.email.toLowerCase() } : {}),
      ...(input.displayName ? { displayName: input.displayName } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl || null } : {}),
      ...(input.globalPoints !== undefined ? { globalPoints: input.globalPoints } : {}),
      ...(input.exactScoresCount !== undefined ? { exactScoresCount: input.exactScoresCount } : {}),
      ...(input.correctOutcomesCount !== undefined ? { correctOutcomesCount: input.correctOutcomesCount } : {}),
      ...(input.isBanned !== undefined ? { isBanned: input.isBanned, bannedAt: input.isBanned ? new Date() : null } : {}),
      ...(input.banReason !== undefined ? { banReason } : {}),
      ...(passwordHash ? { passwordHash } : {})
    };

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          globalPoints: true,
          exactScoresCount: true,
          correctOutcomesCount: true,
          isAdmin: true,
          isBanned: true,
          banReason: true,
          bannedAt: true,
          registrationTimestamp: true
        }
      });
      if (input.isBanned || passwordHash) {
        await tx.userSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      return updated;
    });

    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(params);
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
