import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createAdminSessionToken, ensureDefaultAdminAccount, setAdminSessionCookie } from "@/lib/adminAuth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    await ensureDefaultAdminAccount();
    const input = schema.parse(await request.json());
    const admin = await prisma.adminAccount.findUnique({ where: { username: input.username.toLowerCase() } });
    if (!admin) throw Object.assign(new Error("Invalid admin username or password"), { status: 401 });

    const validPassword = await bcrypt.compare(input.password, admin.passwordHash);
    if (!validPassword) throw Object.assign(new Error("Invalid admin username or password"), { status: 401 });

    const token = await createAdminSessionToken(admin.id);
    setAdminSessionCookie(token);
    return NextResponse.json({ admin: { id: admin.id, username: admin.username, displayName: admin.displayName, isSuperAdmin: admin.isSuperAdmin } });
  } catch (error) {
    return jsonError(error);
  }
}
