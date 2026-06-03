import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ensureUserPreferredLocaleColumn, prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { GLOBAL_LEAGUE_CODE, GLOBAL_LEAGUE_NAME } from "@/lib/config";
import { jsonError } from "@/lib/http";

const schema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(8),
  displayName: z.string().trim().min(2).max(60)
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    await ensureUserPreferredLocaleColumn();
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: input.email, passwordHash, displayName: input.displayName }
      });
      const globalLeague = await tx.league.upsert({
        where: { joinCode: GLOBAL_LEAGUE_CODE },
        create: { name: GLOBAL_LEAGUE_NAME, joinCode: GLOBAL_LEAGUE_CODE, type: "GLOBAL" },
        update: {}
      });
      await tx.leagueMember.create({ data: { leagueId: globalLeague.id, userId: created.id } });
      return created;
    });

    const token = await createSessionToken(user.id);
    cookies().set("session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    return NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.displayName, onboardingCompleted: Boolean((user as { onboardingCompletedAt?: Date | null }).onboardingCompletedAt), preferredLocale: (user as { preferredLocale?: string | null }).preferredLocale ?? "en" } }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
