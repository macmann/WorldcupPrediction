import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { assertBankerMove, canEditPrediction, deadline, fail, predictionInputSchema, roundRobin, scoringRulesSchema, validateSeasonPrediction, type PredictionInput } from "../../lib/platformRules";
import { seasonTransaction, databaseNow, type Tx } from "./transactions";
import { rebuildSeasonInTransaction } from "./recalculation";

export async function enroll(tx: Tx, seasonId: string, userId: string) {
  return tx.seasonStanding.upsert({ where: { seasonId_userId: { seasonId, userId } }, create: { seasonId, userId }, update: {} });
}
export async function submitPrediction(userId: string, raw: PredictionInput) {
  const input = predictionInputSchema.parse(raw);
  const context = await prisma.match.findUnique({ where: { id: input.matchId }, select: { seasonId: true } });
  if (!context) fail("Match not found", 404);
  return seasonTransaction(context.seasonId ?? `legacy-match:${input.matchId}`, async tx => {
    await tx.$queryRaw`SELECT id FROM matches WHERE id = ${input.matchId} FOR UPDATE`;
    const match = await tx.match.findUniqueOrThrow({ where: { id: input.matchId }, include: { season: { include: { competition: true } }, tournament: true } });
    const now = await databaseNow(tx);
    const rules = scoringRulesSchema.parse(match.season?.scoringRules ?? { outcome: 2, exact: 3, penalty: 1, legacyKnockout: true });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.isBanned || !canEditPrediction(match, now) || match.tournament?.isActive === false || match.season?.competition.isActive === false || match.season?.status === "COMPLETED") fail("Predictions are unavailable or locked", 403);
    validateSeasonPrediction(input, match.stage, rules);
    const existing = await tx.prediction.findUnique({ where: { userId_matchId: { userId, matchId: input.matchId } } });
    if (existing?.isLocked) fail("Prediction is permanently locked", 403);
    const data = { predictedOutcome: input.predictedOutcome, predictedHomeScore: input.predictedHomeScore, predictedAwayScore: input.predictedAwayScore, predictedPenaltyShootout: input.predictedPenaltyShootout ?? null, submittedAt: now };
    const prediction = await tx.prediction.upsert({ where: { userId_matchId: { userId, matchId: input.matchId } },
      create: { userId, matchId: input.matchId, ...data }, update: { ...data, pointsAwarded: null, basePoints: null, pointsMultiplier: 1, upsetPoints: 0, isExactScore: false, isCorrectOutcome: false, scoredAt: null } });
    if (!canEditPrediction(match, await databaseNow(tx))) fail("Predictions lock at kickoff", 403);
    if (match.seasonId) await enroll(tx, match.seasonId, userId);
    return prediction;
  });
}
export async function chooseBanker(userId: string, gameweekId: string, matchId: number | null) {
  const gw = await prisma.gameweek.findUniqueOrThrow({ where: { id: gameweekId } });
  return seasonTransaction(gw.seasonId, async tx => {
    const now = await databaseNow(tx);
    const existing = await tx.gameweekBanker.findUnique({ where: { userId_gameweekId: { userId, gameweekId } }, include: { match: true } });
    if (existing?.matchId === matchId) return existing;
    assertBankerMove(existing, now);
    if (matchId === null) { await tx.gameweekBanker.deleteMany({ where: { userId, gameweekId } }); return null; }
    const match = await tx.match.findUniqueOrThrow({ where: { id: matchId }, include: { season: { include: { competition: true } }, predictions: { where: { userId } } } });
    if (match.scoringGameweekId !== gameweekId || match.seasonId !== gw.seasonId) fail("Banker must belong to this gameweek", 400);
    if (match.season?.status === "COMPLETED" || !match.season?.competition.isActive || !canEditPrediction(match, now)) fail("Banker match is locked or inactive", 403);
    if (!match.predictions[0]) fail("Save a prediction before selecting a Banker", 400);
    const saved = await tx.gameweekBanker.upsert({ where: { userId_gameweekId: { userId, gameweekId } }, create: { userId, gameweekId, matchId, chosenAt: now }, update: { matchId, chosenAt: now, lockedAt: null } });
    if (!canEditPrediction(match, await databaseNow(tx))) fail("Banker locks at kickoff", 403);
    return saved;
  });
}
export async function seasonPickDeadline(tx: Tx, rule: { lockAt: Date | null }, season: { id: string; picksLockAt: Date | null; picksLockGameweek: number | null; startsAt: Date }) {
  if (rule.lockAt) return rule.lockAt;
  if (season.picksLockAt) return season.picksLockAt;
  if (season.picksLockGameweek) {
    const gw = await tx.gameweek.findUnique({ where: { seasonId_number: { seasonId: season.id, number: season.picksLockGameweek } }, include: { scoringMatches: { select: { kickoffTime: true } } } });
    if (gw?.endsAt) return gw.endsAt;
    if (gw?.scoringMatches.length) return new Date(Math.max(...gw.scoringMatches.map(m => m.kickoffTime.getTime())) + 3 * 60 * 60 * 1000);
    // An absent GW3 fixture schedule must not leave picks editable indefinitely.
    return season.startsAt;
  }
  return season.startsAt;
}
export async function validatePickSelections(tx: Tx, rule: { seasonId: string; selectionCount: number; target: string; key: string }, selections: string[]) {
  if (new Set(selections).size !== selections.length || selections.length !== rule.selectionCount) fail("Choose the required number of distinct selections", 400);
  const season = await tx.season.findUniqueOrThrow({ where: { id: rule.seasonId } });
  const scope = { OR: [{ seasonId: season.id }, ...(season.legacyTournamentId ? [{ tournamentId: season.legacyTournamentId }] : [])] };
  if (rule.target === "TEAM") {
    const count = await tx.team.count({ where: { id: { in: selections }, ...scope } });
    if (count !== selections.length) fail("All teams must belong to this season", 400);
  } else {
    const players = await tx.player.findMany({ where: { id: { in: selections }, ...scope } });
    if (players.length !== selections.length) fail("All players must belong to this season", 400);
    if (rule.key === "goldenGlove" && players.some(p => !p.isGoalkeeper)) fail("Golden Glove selections must be goalkeepers", 400);
    if (rule.key === "goldenBoot" && players.some(p => p.isGoalkeeper)) fail("Golden Boot selections cannot be goalkeepers", 400);
  }
}
export async function saveSeasonPick(userId: string, ruleId: string, selections: string[]) {
  const rule = await prisma.seasonPickRule.findUniqueOrThrow({ where: { id: ruleId } });
  return seasonTransaction(rule.seasonId, async tx => {
    const current = await tx.seasonPickRule.findUniqueOrThrow({ where: { id: ruleId }, include: { season: { include: { competition: true } } } });
    const lock = await seasonPickDeadline(tx, current, current.season);
    if (!current.enabled || current.settled || !current.season.competition.isActive || current.season.status === "COMPLETED" || await databaseNow(tx) >= lock) fail("Season picks are locked", 403);
    await validatePickSelections(tx, current, selections);
    const now = await databaseNow(tx);
    const pick = await tx.seasonPick.upsert({ where: { ruleId_userId: { ruleId, userId } }, create: { ruleId, userId, selections, submittedAt: now }, update: { selections, submittedAt: now, pointsAwarded: null } });
    if (await databaseNow(tx) >= lock) fail("Season picks are locked", 403);
    await enroll(tx, rule.seasonId, userId); return pick;
  });
}
export async function settleSeasonPick(ruleId: string, selections: string[]) {
  const rule = await prisma.seasonPickRule.findUniqueOrThrow({ where: { id: ruleId } });
  return seasonTransaction(rule.seasonId, async tx => {
    await validatePickSelections(tx, rule, selections);
    await tx.seasonPickRule.update({ where: { id: ruleId }, data: { settled: true, settledSelections: selections } });
    return rebuildSeasonInTransaction(tx, rule.seasonId);
  });
}
export function bonusOptions(options: Prisma.JsonValue) { return options as { id: string; label: string; labelMy?: string }[]; }
export async function saveBonusAnswer(userId: string, questionId: string, answer: string) {
  const q = await prisma.bonusQuestion.findUniqueOrThrow({ where: { id: questionId }, include: { gameweek: true } });
  return seasonTransaction(q.gameweek.seasonId, async tx => {
    const question = await tx.bonusQuestion.findUniqueOrThrow({ where: { id: questionId }, include: { gameweek: { include: { season: { include: { competition: true } } } } } });
    if (!question.isActive || question.settledAnswer !== null || question.gameweek.season.status === "COMPLETED" || !question.gameweek.season.competition.isActive || await databaseNow(tx) >= question.lockAt) fail("Bonus answers are locked", 403);
    if (!bonusOptions(question.options).some(o => o.id === answer)) fail("Unknown bonus option", 400);
    const saved = await tx.bonusAnswer.upsert({ where: { questionId_userId: { questionId, userId } }, create: { questionId, userId, answer, submittedAt: await databaseNow(tx) }, update: { answer, submittedAt: await databaseNow(tx), pointsAwarded: null } });
    if (await databaseNow(tx) >= question.lockAt) fail("Bonus answers are locked", 403);
    await enroll(tx, q.gameweek.seasonId, userId); return saved;
  });
}
export async function settleBonus(questionId: string, answer: string) {
  const question = await prisma.bonusQuestion.findUniqueOrThrow({ where: { id: questionId }, include: { gameweek: true } });
  if (!bonusOptions(question.options).some(o => o.id === answer)) fail("Unknown settlement option", 400);
  return seasonTransaction(question.gameweek.seasonId, async tx => {
    if (await databaseNow(tx) < question.lockAt) fail("Bonus questions can only settle after locking", 403);
    await tx.bonusQuestion.update({ where: { id: questionId }, data: { settledAnswer: answer } });
    return rebuildSeasonInTransaction(tx, question.gameweek.seasonId);
  });
}
export async function sharedPrivateLeague(tx: Tx, userId: string, rivalId: string, seasonId: string) {
  return tx.league.findFirst({ where: { type: "PRIVATE", memberships: { some: { userId } }, AND: { memberships: { some: { userId: rivalId } } }, seasons: { some: { seasonId } } }, select: { id: true } });
}
export async function chooseRival(userId: string, seasonId: string, rivalId: string | null) {
  return seasonTransaction(seasonId, async tx => {
    if (rivalId === null) { await tx.seasonRival.deleteMany({ where: { userId, seasonId } }); return null; }
    if (userId === rivalId) fail("Choose another player", 400);
    const rival = await tx.user.findFirst({ where: { id: rivalId, isBanned: false, isSystem: false } });
    if (!rival || !await sharedPrivateLeague(tx, userId, rivalId, seasonId)) fail("Rival must be in a shared private league for this season", 403);
    await enroll(tx, seasonId, userId); await enroll(tx, seasonId, rivalId);
    return tx.seasonRival.upsert({ where: { seasonId_userId: { seasonId, userId } }, create: { seasonId, userId, rivalId }, update: { rivalId } });
  });
}
export async function linkLeagueSeason(tx: Tx, leagueId: string, seasonId: string) {
  const link = await tx.leagueSeason.upsert({ where: { leagueId_seasonId: { leagueId, seasonId } }, create: { leagueId, seasonId }, update: {} });
  const members = await tx.leagueMember.findMany({ where: { leagueId } });
  for (const member of members) {
    await tx.leagueSeasonParticipant.upsert({ where: { leagueSeasonId_userId: { leagueSeasonId: link.id, userId: member.userId } }, create: { leagueSeasonId: link.id, userId: member.userId, joinedAt: member.joinedAt }, update: {} });
    await enroll(tx, seasonId, member.userId);
  }
  return link;
}
export async function generateH2H(userId: string, leagueId: string, seasonId: string) {
  return seasonTransaction(seasonId, async tx => {
    const league = await tx.league.findUniqueOrThrow({ where: { id: leagueId } });
    if (league.ownerUserId !== userId) fail("Only the league owner may lock H2H participants", 403);
    const link = await linkLeagueSeason(tx, leagueId, seasonId);
    if (link.participantsLockedAt) fail("H2H participants and fixtures are already locked", 409);
    const now = await databaseNow(tx);
    const gws = await tx.gameweek.findMany({ where: { seasonId }, orderBy: { number: "asc" }, include: { scoringMatches: { select: { kickoffTime: true, predictionLockAt: true } } } });
    const future = gws.filter(g => g.scoringMatches.length > 0 && g.scoringMatches.every(m => deadline(m) > now));
    if (!future.length) fail("Synced upcoming gameweeks are required before generating H2H fixtures");
    const participants = await tx.leagueMember.findMany({ where: { leagueId, user: { isBanned: false } }, select: { userId: true } });
    const schedule = roundRobin(participants.map(p => p.userId), future.map(g => g.id));
    await tx.h2HFixture.createMany({ data: schedule.map(row => ({ ...row, leagueSeasonId: link.id })) });
    await tx.leagueSeasonParticipant.updateMany({ where: { leagueSeasonId: link.id, userId: { in: participants.map(p => p.userId) } }, data: { h2hEligible: true } });
    await tx.leagueSeason.update({ where: { id: link.id }, data: { mode: "HEAD_TO_HEAD", participantsLockedAt: now } });
    return { generatedFixtures: schedule.length, participants: participants.length };
  });
}
