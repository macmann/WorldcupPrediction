import { MatchStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { extractGoogleDriveFileId } from "@/lib/googleDrive";

const updateSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  highlightUrl: z.string().trim().max(500).optional().nullable()
});

export async function GET() {
  try {
    await requireAdmin();
    const matches = await prisma.match.findMany({
      where: { status: MatchStatus.FINISHED },
      orderBy: { kickoffTime: "desc" },
      take: 250,
      select: { id: true, kickoffTime: true, homeTeam: true, awayTeam: true, homeScore90: true, awayScore90: true, homeScore: true, awayScore: true, highlightUrl: true }
    });
    return NextResponse.json({ matches });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const payload = updateSchema.parse(await request.json());
    const highlightUrl = payload.highlightUrl?.trim() || null;
    if (highlightUrl && !extractGoogleDriveFileId(highlightUrl)) throw new Error("Enter a valid Google Drive file link, such as https://drive.google.com/file/d/.../view.");

    const match = await prisma.match.update({
      where: { id: payload.matchId },
      data: { highlightUrl },
      select: { id: true, kickoffTime: true, homeTeam: true, awayTeam: true, homeScore90: true, awayScore90: true, homeScore: true, awayScore: true, highlightUrl: true }
    });
    return NextResponse.json({ match });
  } catch (error) {
    return jsonError(error);
  }
}
