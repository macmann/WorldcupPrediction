import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  tournamentId: z.string().uuid().optional(),
  championTeamId: z.string().uuid(),
  bestPlayerId: z.string().uuid(),
  bestGkId: z.string().uuid()
}).strict();

async function resolveTournamentStartTime(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { startsAt: true } });
  if (!tournament) throw Object.assign(new Error("Tournament not found"), { status: 404 });
  return tournament.startsAt;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());

    const [championTeam, bestPlayer, bestGoalkeeper] = await Promise.all([
      prisma.team.findUnique({ where: { id: input.championTeamId }, select: { tournamentId: true } }),
      prisma.player.findUnique({ where: { id: input.bestPlayerId }, select: { tournamentId: true } }),
      prisma.player.findUnique({ where: { id: input.bestGkId }, select: { tournamentId: true, isGoalkeeper: true } })
    ]);

    if (!championTeam || !bestPlayer || !bestGoalkeeper) {
      throw Object.assign(new Error("One or more outright selections were not found"), { status: 400 });
    }
    if (!bestGoalkeeper.isGoalkeeper) {
      throw Object.assign(new Error("Best goalkeeper pick must reference a goalkeeper"), { status: 400 });
    }

    const tournamentId = input.tournamentId ?? championTeam.tournamentId;
    if (
      championTeam.tournamentId !== tournamentId ||
      bestPlayer.tournamentId !== tournamentId ||
      bestGoalkeeper.tournamentId !== tournamentId
    ) {
      throw Object.assign(new Error("All outright selections must belong to the same tournament"), { status: 400 });
    }

    const tournamentStartTime = await resolveTournamentStartTime(tournamentId);
    if (new Date() >= tournamentStartTime) {
      throw Object.assign(new Error("Tournament outright picks are locked"), { status: 403 });
    }

    const outright = await prisma.$transaction(async (tx) => {
      const saved = await tx.outright.upsert({
        where: { userId: user.id },
        create: { userId: user.id, tournamentId, championTeamId: input.championTeamId, bestPlayerId: input.bestPlayerId, bestGkId: input.bestGkId },
        update: { tournamentId, championTeamId: input.championTeamId, bestPlayerId: input.bestPlayerId, bestGkId: input.bestGkId }
      });
      await tx.user.update({ where: { id: user.id }, data: { onboardingCompletedAt: new Date() } });
      return saved;
    });

    return NextResponse.json({ outright });
  } catch (error) {
    return jsonError(error);
  }
}
