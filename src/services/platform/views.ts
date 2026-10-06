import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { awardPrediction, canEditPrediction, canRevealPrediction, consensus, deadline, fail, scoringRulesSchema, compareSeasonRank, compareGameweekRank } from "../../lib/platformRules";
import { sharedPrivateLeague, seasonPickDeadline, bonusOptions } from "./gameplay";

const publicUser = { id: true, displayName: true, avatarUrl: true, isSystem: true, registrationTimestamp: true } satisfies Prisma.UserSelect;
export async function competitionCatalog() {
  return prisma.competition.findMany({ orderBy: [{ displayPriority: "asc" }, { name: "asc" }], select: { id: true, name: true, shortName: true, slug: true, logoUrl: true, type: true, isActive: true, seasons: { orderBy: { startsAt: "desc" }, select: { id: true, displayName: true, status: true, isCurrent: true } } } });
}
export async function resolveSeason(requested?: string | null) {
  if (requested) {
    const season = await prisma.season.findUnique({ where: { id: requested }, include: { competition: true } });
    if (!season) fail("Season not found", 404); return season;
  }
  return prisma.season.findFirst({ where: { competition: { isActive: true } }, orderBy: [{ isCurrent: "desc" }, { competition: { displayPriority: "asc" } }, { startsAt: "desc" }], include: { competition: true } });
}
export async function revealMatch(userId: string, matchId: number, leagueId?: string) {
  const match = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
  const own = await prisma.prediction.findUnique({ where: { userId_matchId: { userId, matchId } } });
  let members: string[] | undefined;
  if (leagueId) {
    const membership = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId, userId } } });
    if (!membership) fail("League not found", 404);
    if (match.seasonId && !await prisma.leagueSeason.findUnique({ where: { leagueId_seasonId: { leagueId, seasonId: match.seasonId } } })) fail("This league is not linked to the match season", 404);
    members = (await prisma.leagueMember.findMany({ where: { leagueId }, select: { userId: true } })).map(m => m.userId);
  }
  const now = new Date();
  const hidden = !canRevealPrediction(match, now);
  const all = own || !hidden ? await prisma.prediction.findMany({ where: { matchId, user: { isBanned: false }, predictedOutcome: { not: null }, predictedHomeScore: { not: null }, predictedAwayScore: { not: null } }, select: { userId: true, predictedOutcome: true, predictedHomeScore: true, predictedAwayScore: true } }) : [];
  const crowd = own ? consensus(all.map(p => ({ predictedOutcome: p.predictedOutcome!, predictedHomeScore: p.predictedHomeScore!, predictedAwayScore: p.predictedAwayScore! }))) : null;
  const predictions = hidden ? [] : await prisma.prediction.findMany({ where: { matchId, ...(members ? { userId: { in: members } } : { userId }), user: { isBanned: false } }, select: { user: { select: publicUser }, predictedOutcome: true, predictedHomeScore: true, predictedAwayScore: true, pointsAwarded: true } });
  return { hidden, community: crowd, predictions };
}
export async function leagueSeasonView(userId: string, leagueId: string, seasonId: string, gameweekId?: string) {
  const membership = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId, userId } } });
  if (!membership) fail("League not found", 404);
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId }, select: { id: true, name: true, ownerUserId: true, joinCode: true } });
  const link = await prisma.leagueSeason.findUnique({ where: { leagueId_seasonId: { leagueId, seasonId } }, include: { participants: { include: { user: { select: publicUser } } }, fixtures: { include: { homeUser: { select: publicUser }, awayUser: { select: publicUser }, gameweek: true }, orderBy: [{ gameweek: { number: "asc" } }, { slot: "asc" }] } } });
  if (!link) return { league, link: null, leaderboard: [], h2h: [], fixtures: [] };
  const gws = await prisma.gameweek.findMany({ where: { seasonId }, orderBy: { number: "asc" } });
  const gw = gameweekId ? gws.find(g => g.id === gameweekId) : [...gws].reverse().find(g => g.finalized);
  if (gameweekId && !gw) fail("Gameweek belongs to another season", 400);
  const historic = Boolean(gameweekId && gw?.finalized);
  const standings = await prisma.seasonStanding.findMany({ where: { seasonId, userId: { in: link.participants.map(p => p.userId) }, user: { isBanned: false } }, include: { user: { select: publicUser } } });
  const weeks = gw ? await prisma.gameweekStanding.findMany({ where: { gameweekId: gw.id } }) : [];
  const previous = gw ? [...gws].reverse().find(g => g.number < gw.number && g.finalized) : undefined;
  const priorRows = previous ? await prisma.gameweekStanding.findMany({ where: { gameweekId: previous.id, userId: { in: link.participants.filter(p => !previous.endsAt || p.joinedAt <= previous.endsAt).map(p => p.userId) } } }) : [];
  const priorRanking = priorRows.map(r => ({ userId: r.userId, points: r.cumulativePoints, exact: r.cumulativeExact, correct: r.cumulativeCorrect, wins: r.cumulativeWins, registeredAt: link.participants.find(p => p.userId === r.userId)!.user.registrationTimestamp })).sort(compareSeasonRank);
  const rows = standings.filter(s => !historic || !gw?.endsAt || link.participants.find(p => p.userId === s.userId)!.joinedAt <= gw.endsAt).map(s => {
    const week = weeks.find(w => w.userId === s.userId);
    return { userId: s.userId, user: s.user, points: historic ? week?.cumulativePoints ?? 0 : s.totalPoints, exact: historic ? week?.cumulativeExact ?? 0 : s.exactScores, correct: historic ? week?.cumulativeCorrect ?? 0 : s.correctOutcomes, wins: historic ? week?.cumulativeWins ?? 0 : s.gameweekWins, registeredAt: s.user.registrationTimestamp, gameweekPoints: week?.points ?? 0, gameweekExact: week?.exactScores ?? 0, gameweekCorrect: week?.correctOutcomes ?? 0, lastSubmittedAt: week?.lastSubmittedAt ?? null };
  }).sort(compareSeasonRank).map((row, index) => ({ ...row, rank: index + 1, movement: priorRanking.findIndex(p => p.userId === row.userId) >= 0 ? priorRanking.findIndex(p => p.userId === row.userId) + 1 - (index + 1) : 0 }));
  const table = link.participants.filter(p => p.h2hEligible).map(p => {
    const played = link.fixtures.filter(f => f.settled && f.awayUserId !== null && (f.homeUserId === p.userId || f.awayUserId === p.userId) && (!gameweekId || f.gameweek.number <= (gw?.number ?? 0)));
    const score = (f: typeof played[number]) => f.homeUserId === p.userId ? f.homeTablePoints! : f.awayTablePoints!;
    return { user: p.user, played: played.length, wins: played.filter(f => score(f) === 3).length, draws: played.filter(f => score(f) === 1).length, losses: played.filter(f => score(f) === 0).length,
      points: played.reduce((s, f) => s + score(f), 0), for: played.reduce((s, f) => s + (f.homeUserId === p.userId ? f.homePoints! : f.awayPoints!), 0), against: played.reduce((s, f) => s + (f.homeUserId === p.userId ? f.awayPoints! : f.homePoints!), 0) };
  }).sort((a, b) => b.points - a.points || (b.for - b.against) - (a.for - a.against) || b.for - a.for || a.user.registrationTimestamp.getTime() - b.user.registrationTimestamp.getTime() || a.user.id.localeCompare(b.user.id));
  return { league, link: { id: link.id, mode: link.mode, lockedAt: link.participantsLockedAt }, leaderboard: rows, gameweekLeaderboard: [...rows].sort((a, b) => compareGameweekRank({ ...a, points: a.gameweekPoints, exact: a.gameweekExact, correct: a.gameweekCorrect }, { ...b, points: b.gameweekPoints, exact: b.gameweekExact, correct: b.gameweekCorrect })).map((r, i) => ({ ...r, rank: i + 1 })), h2h: table, fixtures: link.fixtures.filter(f => !gameweekId || f.gameweekId === gameweekId) };
}
export async function platformView(userId: string, requestedSeason?: string | null, requestedGw?: string | null) {
  const season = await resolveSeason(requestedSeason);
  if (!season) return null;
  const [gws, allMatches, standings, own, rules, achievements, history, leagues, notifications, user] = await Promise.all([
    prisma.gameweek.findMany({ where: { seasonId: season.id }, orderBy: { number: "asc" } }),
    prisma.match.findMany({ where: { seasonId: season.id, isEnabled: true }, orderBy: [{ kickoffTime: "asc" }, { id: "asc" }], include: { homeTeamRef: { select: { badgeUrl: true, flagEmoji: true } }, awayTeamRef: { select: { badgeUrl: true, flagEmoji: true } }, predictions: { where: { userId } }, bankers: { where: { userId } } } }),
    prisma.seasonStanding.findMany({ where: { seasonId: season.id, user: { isBanned: false } }, orderBy: { rank: "asc" }, include: { user: { select: publicUser } } }),
    prisma.seasonStanding.findUnique({ where: { seasonId_userId: { seasonId: season.id, userId } } }),
    prisma.seasonPickRule.findMany({ where: { seasonId: season.id }, include: { picks: { where: { userId } } }, orderBy: { key: "asc" } }),
    prisma.userAchievement.findMany({ where: { userId, seasonId: season.id, revokedAt: null }, orderBy: { earnedAt: "desc" } }),
    prisma.seasonStanding.findMany({ where: { userId }, include: { season: { select: { id: true, displayName: true, status: true, competition: { select: { name: true } } } } } }),
    prisma.league.findMany({ where: { memberships: { some: { userId } } }, select: { id: true, name: true, type: true, ownerUserId: true, seasons: { where: { seasonId: season.id }, select: { id: true, mode: true } } } }),
    prisma.platformNotification.findMany({ where: { userId, seasonId: season.id, revokedAt: null }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, displayName: true, avatarUrl: true, notificationSettings: true } })
  ]);
  const now = new Date();
  const current = requestedGw ? gws.find(g => g.id === requestedGw) : gws.find(g => !g.finalized && allMatches.some(m => m.scoringGameweekId === g.id && m.status !== "CANCELLED")) ?? gws.find(g => !g.finalized) ?? gws.at(-1);
  if (requestedGw && !current) fail("Gameweek belongs to another season", 400);
  const selectedMatches = current ? allMatches.filter(m => m.scoringGameweekId === current.id) : allMatches;
  const scoring = scoringRulesSchema.parse(season.scoringRules);
  const matches = selectedMatches.map(({ predictions, bankers, homeTeamRef, awayTeamRef, ...m }) => {
    const prediction = predictions[0] ?? null;
    const isBanker = bankers.length > 0;
    const live = ["LIVE", "PAUSED"].includes(m.status) && canRevealPrediction(m, now) && prediction && (m.homeScore90 ?? m.homeScore) !== null && (m.awayScore90 ?? m.awayScore) !== null ? awardPrediction(prediction, m, scoring, isBanker).pointsAwarded : null;
    return { ...m, homeFlagImageUrl: homeTeamRef?.badgeUrl ?? null, awayFlagImageUrl: awayTeamRef?.badgeUrl ?? null, homeFlagEmoji: homeTeamRef?.flagEmoji ?? null, awayFlagEmoji: awayTeamRef?.flagEmoji ?? null, prediction, isBanker, isLocked: !canEditPrediction(m, now) || prediction?.isLocked === true, legacyKnockout: scoring.legacyKnockout, outcomePoints: scoring.outcome, provisionalPoints: live };
  });
  const [gameweekStandings, hallOfFame, teams, players, questions, rivals, generation] = await Promise.all([
    current ? prisma.gameweekStanding.findMany({ where: { gameweekId: current.id, user: { isBanned: false } }, include: { user: { select: publicUser } }, orderBy: { rank: "asc" } }) : [],
    prisma.gameweekStanding.findMany({ where: { gameweek: { seasonId: season.id, finalized: true }, rank: 1, OR: [{ predictionCount: { gt: 0 } }, { points: { gt: 0 } }] }, include: { gameweek: true, user: { select: publicUser } }, orderBy: { gameweek: { number: "asc" } } }),
    prisma.team.findMany({ where: { OR: [{ seasonId: season.id }, ...(season.legacyTournamentId ? [{ tournamentId: season.legacyTournamentId }] : [])] }, orderBy: { name: "asc" }, select: { id: true, name: true, badgeUrl: true } }),
    prisma.player.findMany({ where: { OR: [{ seasonId: season.id }, ...(season.legacyTournamentId ? [{ tournamentId: season.legacyTournamentId }] : [])] }, orderBy: { name: "asc" }, select: { id: true, name: true, isGoalkeeper: true } }),
    current ? prisma.bonusQuestion.findMany({ where: { gameweekId: current.id, isActive: true }, include: { answers: { where: { userId } } } }) : [],
    prisma.seasonRival.findUnique({ where: { seasonId_userId: { seasonId: season.id, userId } } }),
    prisma.aIGeneration.groupBy({ by: ["status"], where: { seasonId: season.id }, _count: { _all: true } })
  ]);
  let rival: { user: { id: string; displayName: string }; standing: typeof own; gameweekPoints: number } | null = null;
  if (rivals && await sharedPrivateLeague(prisma, userId, rivals.rivalId, season.id)) {
    const person = await prisma.user.findFirst({ where: { id: rivals.rivalId, isBanned: false }, select: { id: true, displayName: true } });
    if (person) rival = { user: person, standing: standings.find(s => s.userId === person.id) ?? null, gameweekPoints: gameweekStandings.find(s => s.userId === person.id)?.points ?? 0 };
  }
  const eligibleRivals = await prisma.user.findMany({ where: { id: { not: userId }, isBanned: false, isSystem: false, leagueMemberships: { some: { league: { type: "PRIVATE", memberships: { some: { userId } }, seasons: { some: { seasonId: season.id } } } } } }, select: { id: true, displayName: true } });
  const pickRules = await Promise.all(rules.map(async r => ({ ...r, lockAt: await seasonPickDeadline(prisma, r, season), own: r.picks[0] ?? null, picks: undefined })));
  const next = matches.find(m => !m.isLocked);
  const ownWeek = gameweekStandings.find(s => s.userId === userId) ?? null;
  const liveLeaderboard = gameweekStandings.map(s => ({ user: s.user, finalPoints: s.points, provisionalPoints: 0 }));
  const liveMatches = selectedMatches.filter(m => ["LIVE", "PAUSED"].includes(m.status) && canRevealPrediction(m, now));
  for (const match of liveMatches) {
    if ((match.homeScore90 ?? match.homeScore) === null || (match.awayScore90 ?? match.awayScore) === null) continue;
    const predictions = await prisma.prediction.findMany({ where: { matchId: match.id }, include: { user: { select: publicUser } } });
    const bankers = await prisma.gameweekBanker.findMany({ where: { matchId: match.id } });
    for (const p of predictions) {
      const row = liveLeaderboard.find(r => r.user.id === p.userId);
      if (row) row.provisionalPoints += awardPrediction(p, match, scoring, bankers.some(b => b.userId === p.userId)).pointsAwarded;
    }
  }
  const { aiConfig, ...safeSeason } = season;
  return { user, season: safeSeason, gameweeks: gws, currentGameweek: current ?? null, matches, serverNow: now.toISOString(), standings, ownStanding: own, ownGameweek: ownWeek, progress: { complete: matches.filter(m => m.prediction).length, total: matches.length }, nextDeadline: next ? deadline(next) : null,
    gameweekStandings, liveLeaderboard: liveLeaderboard.sort((a, b) => b.finalPoints + b.provisionalPoints - a.finalPoints - a.provisionalPoints), hallOfFame, achievements, history, leagues,
    pickRules, teams, players, bonusQuestions: questions.map(q => ({ ...q, options: bonusOptions(q.options), answers: undefined, own: q.answers[0] ?? null, locked: now >= q.lockAt })), rival, eligibleRivals, notifications,
    ai: { enabled: (aiConfig as Record<string, unknown>).enabled === true, status: generation, rank: standings.find(s => s.user.isSystem)?.rank ?? null, humanGameweekWins: hallOfFame.filter(g => !g.user.isSystem).length, aiGameweekWins: hallOfFame.filter(g => g.user.isSystem).length } };
}
export type PlatformView = Awaited<ReturnType<typeof platformView>>;
