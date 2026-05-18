import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config";
import { prisma } from "./prisma";

const ADMIN_SESSION_COOKIE = "admin_session";
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "ffmwc2026admin";
const secret = new TextEncoder().encode(config.jwtSecret);

export type AdminSessionUser = {
  id: string;
  username: string;
  displayName: string;
  isSuperAdmin: boolean;
};

export async function ensureDefaultAdminAccount() {
  const username = DEFAULT_ADMIN_USERNAME.toLowerCase();
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
  return prisma.adminAccount.upsert({
    where: { username },
    create: {
      username,
      passwordHash,
      displayName: "Super Admin",
      isSuperAdmin: true
    },
    update: { isSuperAdmin: true }
  });
}

export async function createAdminSessionToken(adminId: string) {
  return new SignJWT({ sub: adminId, scope: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export function setAdminSessionCookie(token: string) {
  cookies().set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export function clearAdminSessionCookie() {
  cookies().set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getCurrentAdmin(): Promise<AdminSessionUser | null> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || payload.scope !== "admin") return null;
    const admin = await prisma.adminAccount.findUnique({ where: { id: payload.sub } });
    if (!admin) return null;
    return {
      id: admin.id,
      username: admin.username,
      displayName: admin.displayName,
      isSuperAdmin: admin.isSuperAdmin
    };
  } catch {
    return null;
  }
}

export async function requireAdminAccount() {
  const admin = await getCurrentAdmin();
  if (!admin) throw Object.assign(new Error("Administrator authentication required"), { status: 401 });
  return admin;
}

export async function requireSuperAdminAccount() {
  const admin = await requireAdminAccount();
  if (!admin.isSuperAdmin) throw Object.assign(new Error("Super administrator access required"), { status: 403 });
  return admin;
}
