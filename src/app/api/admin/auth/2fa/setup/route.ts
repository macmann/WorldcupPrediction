import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccount } from "@/lib/adminAuth";
import { config } from "@/lib/config";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, otpauthUri, verifyTotpCode } from "@/lib/totp";

const verifySchema = z.object({ code: z.string().trim().min(6).max(12) }).strict();
const issuer = "WorldcupPrediction Admin";

export async function GET() {
  try {
    const sessionAdmin = await requireAdminAccount();
    const admin = await prisma.adminAccount.findUnique({ where: { id: sessionAdmin.id } });
    if (!admin) throw Object.assign(new Error("Administrator authentication required"), { status: 401 });
    if (admin.twoFactorEnabledAt) {
      return NextResponse.json({ enabled: true, enabledAt: admin.twoFactorEnabledAt });
    }

    const secret = admin.twoFactorSecret ?? generateTotpSecret();
    if (!admin.twoFactorSecret) {
      await prisma.adminAccount.update({ where: { id: admin.id }, data: { twoFactorSecret: secret } });
    }

    return NextResponse.json({
      enabled: false,
      secret,
      otpauthUri: otpauthUri({ issuer, accountName: `${admin.username}@${config.appBaseUrl.replace(/^https?:\/\//, "")}`, secret })
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const sessionAdmin = await requireAdminAccount();
    const input = verifySchema.parse(await request.json());
    const admin = await prisma.adminAccount.findUnique({ where: { id: sessionAdmin.id } });
    if (!admin) throw Object.assign(new Error("Administrator authentication required"), { status: 401 });
    if (admin.twoFactorEnabledAt) return NextResponse.json({ admin: { ...sessionAdmin, twoFactorEnabled: true } });

    const secret = admin.twoFactorSecret ?? generateTotpSecret();
    if (!verifyTotpCode({ code: input.code, secret })) throw Object.assign(new Error("Invalid authenticator code"), { status: 400 });

    const updatedAdmin = await prisma.adminAccount.update({
      where: { id: admin.id },
      data: { twoFactorSecret: secret, twoFactorEnabledAt: new Date() },
      select: { id: true, username: true, displayName: true, isSuperAdmin: true, twoFactorEnabledAt: true }
    });

    return NextResponse.json({
      admin: {
        id: updatedAdmin.id,
        username: updatedAdmin.username,
        displayName: updatedAdmin.displayName,
        isSuperAdmin: updatedAdmin.isSuperAdmin,
        twoFactorEnabled: Boolean(updatedAdmin.twoFactorEnabledAt)
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
