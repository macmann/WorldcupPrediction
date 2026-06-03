import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserPhoneColumn, prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { buildPasswordResetUrl, createPasswordResetToken, getPasswordResetExpiry, hashPasswordResetToken, sendPasswordResetEmail } from "@/lib/passwordReset";

const schema = z.object({
  email: z.string().email()
});

const successBody = {
  message: "If an account exists for that email, a password reset link will be sent shortly."
};

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const email = input.email.toLowerCase();
    await ensureUserPhoneColumn();
    const user = await prisma.user.findUnique({ where: { email } });

    await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          ...(user ? [{ userId: user.id, usedAt: null }] : [])
        ]
      }
    });

    if (user?.passwordHash && !user.isBanned) {
      const token = createPasswordResetToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashPasswordResetToken(token),
          expiresAt: getPasswordResetExpiry()
        }
      });
      await sendPasswordResetEmail(user.email, buildPasswordResetUrl(token));
    }

    return NextResponse.json(successBody);
  } catch (error) {
    return jsonError(error);
  }
}
