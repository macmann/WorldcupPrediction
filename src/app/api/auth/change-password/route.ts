import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200)
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const user = await requireUser();

    if (!user.passwordHash) {
      throw Object.assign(new Error("Password changes are not available for this account"), { status: 400 });
    }

    const validPassword = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!validPassword) {
      throw Object.assign(new Error("Current password is incorrect"), { status: 401 });
    }

    const samePassword = await bcrypt.compare(input.newPassword, user.passwordHash);
    if (samePassword) {
      throw Object.assign(new Error("New password must be different from your current password"), { status: 400 });
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash }
      });
      await tx.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null
        }
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
