import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireUser();
    const tournaments = await prisma.tournament.findMany({
      where: { isActive: true },
      orderBy: [{ startsAt: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, startsAt: true, endsAt: true, isActive: true }
    });
    return NextResponse.json({ tournaments });
  } catch (error) {
    return jsonError(error);
  }
}
