import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ name: z.string().min(3).max(80) });
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function joinCode() {
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    let league;
    for (let attempts = 0; attempts < 5; attempts++) {
      try {
        league = await prisma.league.create({ data: { name: input.name, joinCode: joinCode(), memberships: { create: { userId: user.id } } } });
        break;
      } catch (error) {
        if (attempts === 4) throw error;
      }
    }
    return NextResponse.json({ league }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
