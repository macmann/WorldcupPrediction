import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSessionToken } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user?.passwordHash) throw Object.assign(new Error("Invalid email or password"), { status: 401 });

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) throw Object.assign(new Error("Invalid email or password"), { status: 401 });

    const token = await createSessionToken(user.id);
    cookies().set("session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    return NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.displayName, onboardingCompleted: Boolean((user as { onboardingCompletedAt?: Date | null }).onboardingCompletedAt) } });
  } catch (error) {
    return jsonError(error);
  }
}
