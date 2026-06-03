import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { ensureUserPreferredLocaleColumn, prisma } from "./prisma";
import { config } from "./config";
import { requireAdminAccount } from "./adminAuth";

const secret = new TextEncoder().encode(config.jwtSecret);

export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function getCurrentUser() {
  const token = cookies().get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    await ensureUserPreferredLocaleColumn();
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user?.isBanned) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw Object.assign(new Error("Authentication required"), { status: 401 });
  return user;
}

export async function requireAdmin() {
  return requireAdminAccount();
}
