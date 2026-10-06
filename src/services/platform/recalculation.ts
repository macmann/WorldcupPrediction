import { Prisma, type User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { awardPrediction, compareGameweekRank, compareSeasonRank, consensus, deadline, h2hResult, scoringRulesSchema, selectionPoints, streaks, underdogBonus, type RankedScore } from "../../lib/platformRules";
import { seasonTransaction, databaseNow, type Tx } from "./transactions";
import { seedAchievements } from "./setup";

function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
function completeScore(match: { homeScore: number | null; awayScore: number | null; homeScore90: number | null; awayScore90: number | null }) {
  return (match.homeScore90 ?? match.homeScore) !== null && (match.awayScore90 ?? match.awayScore) !== null;
}
export async function notify(tx: Tx, user: Pick<User, "id" | "notificationSettings" | "isSystem">, seasonId: string, eventKey: string, type: string, params: unknown) {
  const preferences = user.notificationSettings as Record<string, boolean>;
  if (user.isSystem || preferences[type] === false || preferences.all === false) return;
  await tx.platformNotification.upsert({ where: { userId_eventKey: { userId: user.id, eventKey } }, create: { userId: user.id, seasonId, eventKey, type, params: json(params) }, update: { params: json(params), revokedAt: null } });
}

export async function freezeConsensus(tx: Tx, match: { id: number; kickoffTime: Date; predictionLockAt: Date | null }, now: Date) {
  const lock = deadline(match);
  if (now < lock) return null;
  const existing = await tx.consensusSnapshot.findUnique({ where: { matchId: match.id } });
  if (existing) return existing;
  const rows = await tx.prediction.findMany({ where: { matchId: match.id, submittedAt: { lte: lock }, predictedOutcome: { not: null }, predictedHomeScore: { not: null }, predictedAwayScore: { not: null } } });
  const counts = consensus(rows.map(p => ({ predictedOutcome: p.predictedOutcome!, predictedHomeScore: p.predictedHomeScore!, predictedAwayScore: p.predictedAwayScore! })));
  const { homePercent: _h, drawPercent: _d, awayPercent: _a, ...data } = counts;
  return tx.consensusSnapshot.create({ data: { matchId: match.id, frozenAt: lock, ...data } });
}

type Score = RankedScore & { predictions: number; wins: number };
export async function rebuildSeasonInTransaction(tx: Tx, seasonId: string) {
  const season = await tx.season.findUniqueOrThrow({ where: { id: seasonId }, include: { gameweeks: { orderBy: { number: "asc" }, include: { bonusQuestions: { include: { answers: true } } } }, pickRules: { include: { picks: true } } } });
  const now = await databaseNow(tx);
  const rules = scoringRulesSchema.parse(season.scoringRules);
  const matches = await tx.match.findMany({ where: { seasonId }, orderBy: [{ kickoffTime: "asc" }, { id: "asc" }], include: { predictions: true, bankers: true } });
  const existingEntries = await tx.seasonStanding.findMany({ where: { seasonId }, select: { userId: true } });
  const ids = new Set(existingEntries.map(e => e.userId));
  for (const match of matches) for (const prediction of match.predictions) ids.add(prediction.userId);
  for (const rule of season.pickRules) for (const pick of rule.picks) ids.add(pick.userId);
  for (const gw of season.gameweeks) for (const q of gw.bonusQuestions) for (const answer of q.answers) ids.add(answer.userId);
  const legacyPicks = season.legacyTournamentId ? await tx.outright.findMany({ where: { tournamentId: season.legacyTournamentId } }) : [];
  for (const pick of legacyPicks) ids.add(pick.userId);
  const users = await tx.user.findMany({ where: { id: { in: [...ids] }, isBanned: false }, orderBy: { id: "asc" } });
  const userMap = new Map(users.map(u => [u.id, u]));
  const scores = new Map<string, Score>(users.map(u => [u.id, { userId: u.id, points: 0, exact: 0, correct: 0, wins: 0, predictions: 0, registeredAt: u.registrationTimestamp }]));
  const gwScores = new Map<string, Map<string, Score>>();
  for (const gw of season.gameweeks) gwScores.set(gw.id, new Map(users.map(u => [u.id, { ...scores.get(u.id)! }])));
  const finalPredictions: { userId: string; matchId: number; homeTeam: string; awayTeam: string; kickoff: Date; isExactScore: boolean; isCorrectOutcome: boolean; basePoints: number; multiplier: number; awarded: number; outcome: string | null }[] = [];
  for (const match of matches) {
    const locked = now >= deadline(match);
    if (locked) {
      await tx.match.update({ where: { id: match.id }, data: { predictionLockAt: deadline(match) } });
      await tx.gameweekBanker.updateMany({ where: { matchId: match.id, lockedAt: null }, data: { lockedAt: deadline(match) } });
      await tx.prediction.updateMany({ where: { matchId: match.id }, data: { isLocked: true } });
    }
    const snapshot = await freezeConsensus(tx, match, now);
    const final = match.status === "FINISHED" && completeScore(match);
    for (const prediction of match.predictions) {
      if (!final) {
        await tx.prediction.update({ where: { id: prediction.id }, data: { pointsAwarded: null, basePoints: null, upsetPoints: 0, pointsMultiplier: 1, isExactScore: false, isCorrectOutcome: false, scoredAt: null } });
        continue;
      }
      const banker = match.bankers.some(b => b.userId === prediction.userId);
      const upset = underdogBonus(snapshot, prediction.predictedOutcome, { enabled: season.underdogEnabled, threshold: season.underdogThreshold, points: season.underdogPoints, minSample: season.underdogMinSample });
      const result = awardPrediction(prediction, match, rules, banker, upset);
      await tx.prediction.update({ where: { id: prediction.id }, data: { ...result, isLocked: true, scoredAt: now } });
      const userScore = scores.get(prediction.userId);
      if (!userScore || !match.isEnabled) continue;
      const gwScore = match.scoringGameweekId ? gwScores.get(match.scoringGameweekId)?.get(prediction.userId) : undefined;
      for (const row of [userScore, gwScore]) {
        if (!row) continue;
        row.points += result.pointsAwarded; row.exact += Number(result.isExactScore); row.correct += Number(result.isCorrectOutcome); row.predictions++;
        row.lastSubmittedAt = row.lastSubmittedAt && row.lastSubmittedAt > prediction.submittedAt ? row.lastSubmittedAt : prediction.submittedAt;
      }
      finalPredictions.push({ userId: prediction.userId, matchId: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, kickoff: match.kickoffTime, isExactScore: result.isExactScore, isCorrectOutcome: result.isCorrectOutcome, basePoints: result.basePoints, multiplier: result.pointsMultiplier, awarded: result.pointsAwarded, outcome: prediction.predictedOutcome });
    }
  }
  for (const rule of season.pickRules) for (const pick of rule.picks) {
    const points = rule.enabled && rule.settled ? selectionPoints(pick.selections, rule.settledSelections, rule.points) : null;
    await tx.seasonPick.update({ where: { id: pick.id }, data: { pointsAwarded: points } });
    const user = scores.get(pick.userId); if (user) user.points += points ?? 0;
  }
  for (const pick of legacyPicks) { const user = scores.get(pick.userId); if (user) user.points += pick.pointsAwarded ?? 0; }
  const finalized = new Set<string>();
  for (const gw of season.gameweeks) {
    for (const q of gw.bonusQuestions) for (const answer of q.answers) {
      const awarded = q.isActive && q.settledAnswer !== null ? (answer.answer === q.settledAnswer ? q.points : 0) : null;
      await tx.bonusAnswer.update({ where: { questionId_userId: { questionId: q.id, userId: answer.userId } }, data: { pointsAwarded: awarded } });
      const user = scores.get(answer.userId), row = gwScores.get(gw.id)?.get(answer.userId);
      if (user) user.points += awarded ?? 0; if (row) row.points += awarded ?? 0;
    }
    const fixtures = matches.filter(m => m.scoringGameweekId === gw.id && m.isEnabled);
    const completed = fixtures.length > 0 && fixtures.every(m => m.status === "CANCELLED" || m.status === "FINISHED" && completeScore(m)) && gw.bonusQuestions.filter(q => q.isActive).every(q => q.settledAnswer !== null);
    const started = fixtures.some(m => now >= deadline(m));
    if (completed) finalized.add(gw.id);
    await tx.gameweek.update({ where: { id: gw.id }, data: { status: completed ? "COMPLETED" : started ? "ACTIVE" : "UPCOMING", finalized: completed, finalizedAt: completed ? gw.finalizedAt ?? now : null } });
    const ranked = [...gwScores.get(gw.id)!.values()].sort(compareGameweekRank);
    if (completed && ranked[0] && (ranked[0].predictions > 0 || ranked[0].points > 0)) scores.get(ranked[0].userId)!.wins++;
  }
  const finalRanking = [...scores.values()].sort(compareSeasonRank);
  const totals = new Map<string, Score>(users.map(u => [u.id, { ...scores.get(u.id)!, points: 0, exact: 0, correct: 0, wins: 0, predictions: 0 }]));
  const histories = new Map<string, { number: number; gameweekId: string; rank: number; points: number; movement: number; finalized: boolean }[]>(users.map(u => [u.id, []]));
  const desiredAwards: { definitionId: string; userId: string; gameweekId: string | null; contextKey: string; metadata: unknown }[] = [];
  await seedAchievements(tx);
  const definitions = await tx.achievementDefinition.findMany({ where: { enabled: true } });
  function collectAwards(scope: string, userId: string, gameweekId: string | null, contextKey: string, metrics: Record<string, number>, metadata: unknown = {}) {
    for (const d of definitions) {
      const criteria = d.criteria as { scope?: string; metric?: string; threshold?: number };
      if (criteria.scope === scope && criteria.metric && typeof criteria.threshold === "number" && (metrics[criteria.metric] ?? 0) >= criteria.threshold) desiredAwards.push({ definitionId: d.id, userId, gameweekId, contextKey, metadata });
    }
  }
  for (const gw of season.gameweeks) {
    const rows = [...gwScores.get(gw.id)!.values()].sort(compareGameweekRank);
    const champion = finalized.has(gw.id) && rows[0] && (rows[0].predictions > 0 || rows[0].points > 0) ? rows[0].userId : null;
    for (const row of rows) {
      const total = totals.get(row.userId)!;
      total.points += row.points; total.exact += row.exact; total.correct += row.correct; total.predictions += row.predictions;
      if (champion === row.userId) total.wins++;
    }
    const cumulative = [...totals.values()].sort(compareSeasonRank);
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]; const total = totals.get(row.userId)!;
      const cumulativeRank = cumulative.findIndex(s => s.userId === row.userId) + 1;
      const history = histories.get(row.userId)!;
      const previousRank = history.at(-1)?.rank ?? cumulativeRank;
      const fixtures = matches.filter(m => m.scoringGameweekId === gw.id && m.isEnabled);
      const active = fixtures.some(m => now >= deadline(m));
      if (active || finalized.has(gw.id)) history.push({ number: gw.number, gameweekId: gw.id, rank: cumulativeRank, points: total.points, movement: previousRank - cumulativeRank, finalized: finalized.has(gw.id) });
      await tx.gameweekStanding.upsert({ where: { gameweekId_userId: { gameweekId: gw.id, userId: row.userId } },
        create: { gameweekId: gw.id, userId: row.userId, points: row.points, exactScores: row.exact, correctOutcomes: row.correct, predictionCount: row.predictions, rank: index + 1, cumulativePoints: total.points, cumulativeRank, cumulativeExact: total.exact, cumulativeCorrect: total.correct, cumulativeWins: total.wins, lastSubmittedAt: row.lastSubmittedAt },
        update: { points: row.points, exactScores: row.exact, correctOutcomes: row.correct, predictionCount: row.predictions, rank: index + 1, cumulativePoints: total.points, cumulativeRank, cumulativeExact: total.exact, cumulativeCorrect: total.correct, cumulativeWins: total.wins, lastSubmittedAt: row.lastSubmittedAt } });
      if (finalized.has(gw.id)) {
        collectAwards("gameweek", row.userId, gw.id, gw.id, { exactScores: row.exact, winner: Number(champion === row.userId), movement: previousRank - cumulativeRank }, { points: row.points, number: gw.number });
        await notify(tx, userMap.get(row.userId)!, seasonId, `gameweek:${gw.id}`, "gameweek", { number: gw.number, rank: index + 1, points: row.points });
      } else await tx.platformNotification.updateMany({ where: { userId: row.userId, eventKey: `gameweek:${gw.id}` }, data: { revokedAt: now } });
    }
  }
  for (let index = 0; index < finalRanking.length; index++) {
    const row = finalRanking[index];
    const predictions = finalPredictions.filter(p => p.userId === row.userId);
    const submitted = matches.flatMap(m => m.predictions.filter(p => p.userId === row.userId));
    const streak = streaks(predictions);
    const gwRows = season.gameweeks.map(g => gwScores.get(g.id)!.get(row.userId)!);
    const completedGw = season.gameweeks.filter(g => finalized.has(g.id));
    const bankerRows = predictions.filter(p => p.multiplier === 2);
    const teams = new Map<string, { total: number; correct: number }>();
    for (const p of predictions) for (const team of [p.homeTeam, p.awayTeam]) { const t = teams.get(team) ?? { total: 0, correct: 0 }; t.total++; t.correct += Number(p.isCorrectOutcome); teams.set(team, t); }
    const accuracy = [...teams].filter(([, r]) => r.total >= 5).map(([name, r]) => ({ name, samples: r.total, accuracy: Math.round(100 * r.correct / r.total) })).sort((a, b) => b.accuracy - a.accuracy || a.name.localeCompare(b.name));
    const stats = { ...streak, totalPredictions: submitted.length, scoredPredictions: predictions.length, correctPercent: predictions.length ? 100 * row.correct / predictions.length : 0, exactPercent: predictions.length ? 100 * row.exact / predictions.length : 0,
      bestGameweek: gwRows.length ? Math.max(...gwRows.map(g => g.points)) : 0, averageGameweek: completedGw.length ? completedGw.reduce((sum, g) => sum + gwScores.get(g.id)!.get(row.userId)!.points, 0) / completedGw.length : 0,
      bankerPoints: bankerRows.reduce((sum, p) => sum + p.awarded, 0), bankerBonus: bankerRows.reduce((sum, p) => sum + p.basePoints, 0), bankerSuccess: bankerRows.length ? bankerRows.filter(p => p.isCorrectOutcome).length * 100 / bankerRows.length : 0, bankerSamples: bankerRows.length,
      distribution: { HOME: submitted.filter(p => p.predictedOutcome === "HOME").length, DRAW: submitted.filter(p => p.predictedOutcome === "DRAW").length, AWAY: submitted.filter(p => p.predictedOutcome === "AWAY").length }, teamAccuracy: accuracy,
      rankHistory: histories.get(row.userId), bestRank: Math.min(index + 1, ...(histories.get(row.userId) ?? []).map(h => h.rank)), seasonPickPoints: season.pickRules.flatMap(r => r.picks.filter(p => p.userId === row.userId).map(p => r.enabled && r.settled ? selectionPoints(p.selections, r.settledSelections, r.points) : 0)).reduce((a, b) => a + b, 0) };
    await tx.seasonStanding.upsert({ where: { seasonId_userId: { seasonId, userId: row.userId } }, create: { seasonId, userId: row.userId, totalPoints: row.points, exactScores: row.exact, correctOutcomes: row.correct, gameweekWins: row.wins, predictionCount: row.predictions, rank: index + 1, stats: json(stats) }, update: { totalPoints: row.points, exactScores: row.exact, correctOutcomes: row.correct, gameweekWins: row.wins, predictionCount: row.predictions, rank: index + 1, stats: json(stats) } });
    collectAwards("season", row.userId, null, "season", { exactScores: row.exact, bestCorrect: streak.bestCorrect, champion: Number(season.status === "COMPLETED" && index === 0 && row.predictions > 0) });
  }
  await tx.seasonStanding.deleteMany({ where: { seasonId, userId: { notIn: users.map(u => u.id) } } });
  await tx.gameweekStanding.deleteMany({ where: { gameweek: { seasonId }, userId: { notIn: users.map(u => u.id) } } });
  const leagueSeasons = await tx.leagueSeason.findMany({ where: { seasonId }, include: { league: true, participants: { include: { user: true } }, fixtures: { include: { gameweek: true }, orderBy: [{ gameweek: { number: "asc" } }, { slot: "asc" }] } } });
  for (const league of leagueSeasons) {
    const table = new Map(league.participants.filter(p => p.h2hEligible).map(p => [p.userId, { userId: p.userId, tablePoints: 0, for: 0, against: 0, registered: p.user.registrationTimestamp }]));
    for (const gw of season.gameweeks) {
      const leader = [...table.values()].sort((a, b) => b.tablePoints - a.tablePoints || (b.for - b.against) - (a.for - a.against) || b.for - a.for || a.registered.getTime() - b.registered.getTime() || a.userId.localeCompare(b.userId))[0];
      const hasPriorResult = league.fixtures.some(f => f.gameweek.number < gw.number && finalized.has(f.gameweekId) && f.awayUserId !== null);
      for (const fixture of league.fixtures.filter(f => f.gameweekId === gw.id)) {
        const final = finalized.has(gw.id);
        const homePoints = gwScores.get(gw.id)?.get(fixture.homeUserId)?.points ?? 0;
        const awayPoints = fixture.awayUserId ? gwScores.get(gw.id)?.get(fixture.awayUserId)?.points ?? 0 : null;
        const result = h2hResult(homePoints, awayPoints);
        await tx.h2HFixture.update({ where: { id: fixture.id }, data: { settled: final, homePoints: final ? homePoints : null, awayPoints: final ? awayPoints : null, homeTablePoints: final ? result.homeTablePoints : null, awayTablePoints: final ? result.awayTablePoints : null, leaderBeforeId: hasPriorResult ? leader?.userId ?? null : null } });
        if (final && fixture.awayUserId) {
          const home = table.get(fixture.homeUserId)!, away = table.get(fixture.awayUserId)!;
          home.tablePoints += result.homeTablePoints; away.tablePoints += result.awayTablePoints!;
          home.for += homePoints; home.against += awayPoints!; away.for += awayPoints!; away.against += homePoints;
          const winner = homePoints > awayPoints! ? fixture.homeUserId : awayPoints! > homePoints ? fixture.awayUserId : null;
          const loser = winner === fixture.homeUserId ? fixture.awayUserId : fixture.homeUserId;
          if (winner && hasPriorResult && loser === leader?.userId) collectAwards("h2h", winner, gw.id, `h2h:${fixture.id}`, { beatLeader: 1 }, { leagueId: league.leagueId, opponentId: loser });
        }
      }
    }
    if (season.status === "COMPLETED") {
      const ranked = league.participants.map(p => scores.get(p.userId)).filter((p): p is Score => Boolean(p)).sort(compareSeasonRank);
      if (ranked.length > 1) collectAwards("privateLeague", ranked.at(-1)!.userId, null, `league:${league.id}`, { last: 1 });
    }
  }
  const validAwardIds: string[] = [];
  for (const award of desiredAwards) {
    const saved = await tx.userAchievement.upsert({ where: { userId_seasonId_definitionId_contextKey: { userId: award.userId, seasonId, definitionId: award.definitionId, contextKey: award.contextKey } }, create: { ...award, seasonId, metadata: json(award.metadata) }, update: { revokedAt: null, metadata: json(award.metadata) } });
    validAwardIds.push(saved.id);
    await notify(tx, userMap.get(award.userId)!, seasonId, `achievement:${saved.id}`, "achievement", { definitionId: award.definitionId, gameweekId: award.gameweekId });
  }
  const revoked = await tx.userAchievement.findMany({ where: { seasonId, id: { notIn: validAwardIds }, revokedAt: null }, select: { id: true } });
  await tx.userAchievement.updateMany({ where: { seasonId, id: { notIn: validAwardIds }, revokedAt: null }, data: { revokedAt: now } });
  for (const award of revoked) await tx.platformNotification.updateMany({ where: { seasonId, eventKey: `achievement:${award.id}` }, data: { revokedAt: now } });
  const latestGw = [...season.gameweeks].reverse().find(g => finalized.has(g.id));
  if (latestGw) for (const rival of await tx.seasonRival.findMany({ where: { seasonId } })) {
    const user = userMap.get(rival.userId), opponent = userMap.get(rival.rivalId);
    if (!user || !opponent) continue;
    const own = gwScores.get(latestGw.id)!.get(user.id)?.points ?? 0, other = gwScores.get(latestGw.id)!.get(opponent.id)?.points ?? 0;
    await notify(tx, user, seasonId, `rival:${latestGw.id}`, "rival", { name: opponent.displayName, difference: own - other, number: latestGw.number });
  }
  return { seasonId, scoredPredictions: finalPredictions.length, participants: users.length, completedGameweeks: finalized.size };
}
export async function recalculateSeason(seasonId: string) { return seasonTransaction(seasonId, tx => rebuildSeasonInTransaction(tx, seasonId)); }
