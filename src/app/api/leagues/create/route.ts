import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ name: z.string().trim().min(3).max(80) }).strict();
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function joinCode() {
  return Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002";
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    let league;

    for (let attempts = 0; attempts < 10; attempts++) {
      try {
        league = await prisma.league.create({
          data: {
            name: input.name,
            joinCode: joinCode(),
            ownerUserId: user.id,
            memberships: { create: { userId: user.id } }
          }
        });
        break;
      } catch (error) {
        if (!isUniqueConstraintError(error) || attempts === 9) throw error;
      }
    }

    return NextResponse.json({ league }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
