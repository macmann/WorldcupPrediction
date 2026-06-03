import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSessionToken } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { ensureUserPhoneColumn, ensureUserPreferredLocaleColumn, prisma } from "@/lib/prisma";
import { hashPasswordResetToken } from "@/lib/passwordReset";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(200)
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    await ensureUserPhoneColumn();
    await ensureUserPreferredLocaleColumn();
    const tokenHash = hashPasswordResetToken(input.token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw Object.assign(new Error("Password reset link is invalid or expired"), { status: 400 });
    }
    if (resetToken.user.isBanned) {
      throw Object.assign(new Error(resetToken.user.banReason ? `Account restricted: ${resetToken.user.banReason}` : "Account restricted"), { status: 403 });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      });
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      });
      await tx.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
          usedAt: null,
          id: { not: resetToken.id }
        }
      });
      return updated;
    });

    const sessionToken = await createSessionToken(user.id);
    cookies().set("session", sessionToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    return NextResponse.json({ user: { id: user.id, email: user.email, phone: user.phone, displayName: user.displayName, onboardingCompleted: Boolean((user as { onboardingCompletedAt?: Date | null }).onboardingCompletedAt), preferredLocale: (user as { preferredLocale?: string | null }).preferredLocale ?? "en" } });
  } catch (error) {
    return jsonError(error);
  }
}
