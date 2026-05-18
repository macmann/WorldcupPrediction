import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireSuperAdminAccount } from "@/lib/adminAuth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/, "Use letters, numbers, dots, underscores, or hyphens only"),
  password: z.string().min(8).max(200),
  displayName: z.string().trim().min(2).max(60),
  isSuperAdmin: z.boolean().optional()
}).strict();

export async function GET() {
  try {
    await requireSuperAdminAccount();
    const admins = await prisma.adminAccount.findMany({
      orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "asc" }],
      select: { id: true, username: true, displayName: true, isSuperAdmin: true, createdAt: true }
    });
    return NextResponse.json({ admins });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperAdminAccount();
    const input = schema.parse(await request.json());
    const passwordHash = await bcrypt.hash(input.password, 12);
    const admin = await prisma.adminAccount.create({
      data: {
        username: input.username.toLowerCase(),
        passwordHash,
        displayName: input.displayName,
        isSuperAdmin: Boolean(input.isSuperAdmin)
      },
      select: { id: true, username: true, displayName: true, isSuperAdmin: true, createdAt: true }
    });
    return NextResponse.json({ admin }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
