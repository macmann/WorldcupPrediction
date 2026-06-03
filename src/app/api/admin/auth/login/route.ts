import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createAdminSessionToken, ensureDefaultAdminAccount, setAdminSessionCookie } from "@/lib/adminAuth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { verifyTotpCode } from "@/lib/totp";

const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  totpCode: z.string().trim().optional()
});

function adminPayload(admin: { id: string; username: string; displayName: string; isSuperAdmin: boolean; twoFactorEnabledAt?: Date | null }) {
  return { id: admin.id, username: admin.username, displayName: admin.displayName, isSuperAdmin: admin.isSuperAdmin, twoFactorEnabled: Boolean(admin.twoFactorEnabledAt) };
}

export async function POST(request: Request) {
  try {
    await ensureDefaultAdminAccount();
    const input = schema.parse(await request.json());
    const admin = await prisma.adminAccount.findUnique({ where: { username: input.username.toLowerCase() } });
    if (!admin) throw Object.assign(new Error("Invalid admin username or password"), { status: 401 });

    const validPassword = await bcrypt.compare(input.password, admin.passwordHash);
    if (!validPassword) throw Object.assign(new Error("Invalid admin username or password"), { status: 401 });

    if (admin.twoFactorEnabledAt) {
      if (!admin.twoFactorSecret) throw Object.assign(new Error("Authenticator setup is incomplete. Contact a super administrator."), { status: 500 });
      if (!input.totpCode) return NextResponse.json({ twoFactorRequired: true, username: admin.username });
      if (!verifyTotpCode({ code: input.totpCode, secret: admin.twoFactorSecret })) {
        throw Object.assign(new Error("Invalid authenticator code"), { status: 401 });
      }
    }

    const token = await createAdminSessionToken(admin.id);
    setAdminSessionCookie(token);
    return NextResponse.json({ admin: adminPayload(admin) });
  } catch (error) {
    return jsonError(error);
  }
}
