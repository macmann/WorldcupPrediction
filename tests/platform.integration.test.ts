import type { Gameweek, Match } from "@prisma/client";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { seasonTransaction } from "../src/services/platform/transactions";
import { chooseBanker, chooseRival, enroll, generateH2H, linkLeagueSeason, saveBonusAnswer, saveSeasonPick, settleBonus, settleSeasonPick, submitPrediction } from "../src/services/platform/gameplay";
import { freezeConsensus, recalculateSeason } from "../src/services/platform/recalculation";
import { revealMatch, platformView, leagueSeasonView } from "../src/services/platform/views";
import { upsertSeasonFixture } from "../src/services/platform/fixtures";
import { generateAIPrediction, type AIProvider } from "../src/services/platform/ai";
import { seedPickRules } from "../src/services/platform/setup";
import type { ExternalFixture } from "../src/services/footballApi";

test("PostgreSQL domain integration (run npm run test:integration)", { skip: process.env.PLATFORM_INTEGRATION !== "1" }, async t => {
  const future = new Date(Date.now() + 86400000), past = new Date(Date.now() - 86400000);
  try {
    await t.test("additive migration preserves historical IDs, points, tournament and unmapped records", async () => {
      const match = await prisma.match.findUniqueOrThrow({ where: { id: 537000 } });
      assert.equal(match.seasonId, "22222222-2222-4222-8222-222222222222");
      assert.equal((await prisma.prediction.findUniqueOrThrow({ where: { id: "33333333-3333-4333-8333-333333333333" } })).pointsAwarded, 5);
      assert.equal((await prisma.match.findUniqueOrThrow({ where: { id: 537001 } })).seasonId, null);
      assert.equal(await prisma.tournament.count(), 1);
      const before = await recalculateSeason(match.seasonId!);
      assert.equal(before.scoredPredictions, 1);
      assert.equal((await prisma.seasonStanding.findFirstOrThrow({ where: { seasonId: match.seasonId! } })).totalPoints, 5);
    });
    const alice = await prisma.user.create({ data: { email: "alice@example.invalid", displayName: "Alice", registrationTimestamp: new Date("2020-01-01") } });
    const bob = await prisma.user.create({ data: { email: "bob@example.invalid", displayName: "Bob", registrationTimestamp: new Date("2020-01-02") } });
    const charlie = await prisma.user.create({ data: { email: "charlie@example.invalid", displayName: "Charlie", registrationTimestamp: new Date("2020-01-03") } });
    const outsider = await prisma.user.create({ data: { email: "outsider@example.invalid", displayName: "Outsider" } });
    const competition = await prisma.competition.create({ data: { name: "Test League", shortName: "TL", slug: "test-league", type: "LEAGUE", provider: "football-data", providerCode: "TEST" } });
    const season = await prisma.season.create({ data: { competitionId: competition.id, displayName: "Test season", startsAt: past, providerSeason: 2026, usesGameweeks: true, status: "ACTIVE", picksLockAt: future } });
    const gws: Gameweek[] = [];
    for (let number = 1; number <= 3; number++) gws.push(await prisma.gameweek.create({ data: { seasonId: season.id, number, startsAt: future, endsAt: new Date(future.getTime() + 100000) } }));
    const a = await prisma.team.create({ data: { seasonId: season.id, name: "Home Club", externalId: "a" } });
    const b = await prisma.team.create({ data: { seasonId: season.id, name: "Away Club", externalId: "b" } });
    const goalkeeper = await prisma.player.create({ data: { seasonId: season.id, teamId: a.id, name: "Keeper", isGoalkeeper: true } });
    const forward = await prisma.player.create({ data: { seasonId: season.id, teamId: b.id, name: "Forward" } });
    const matches: Match[] = [];
    for (let i = 0; i < 5; i++) matches.push(await prisma.match.create({ data: { seasonId: season.id, competitionId: competition.id, gameweekId: gws[i < 3 ? 0 : i - 2].id, scoringGameweekId: gws[i < 3 ? 0 : i - 2].id, homeTeamId: a.id, awayTeamId: b.id, homeTeam: a.name, awayTeam: b.name, kickoffTime: new Date(future.getTime() + i * 10000) } }));
    const prediction = (id: number, home = 2, away = 1) => ({ matchId: id, predictedOutcome: home > away ? "HOME" as const : home < away ? "AWAY" as const : "DRAW" as const, predictedHomeScore: home, predictedAwayScore: away });
    await t.test("competition/season/gameweek mapping is enforced by database triggers", async () => {
      assert.ok(matches[0].id > 537001);
      assert.equal(matches[0].seasonId, season.id);
      await assert.rejects(prisma.match.create({ data: { competitionId: competition.id, seasonId: "22222222-2222-4222-8222-222222222222", homeTeam: "A", awayTeam: "B", kickoffTime: future } }));
    });
    await t.test("prediction validation rejects mismatched result and accepts valid submissions", async () => {
      await assert.rejects(submitPrediction(alice.id, { ...prediction(matches[0].id), predictedOutcome: "DRAW" }));
      for (let i = 0; i < 3; i++) { const [home, away] = i === 0 ? [2, 1] : i === 1 ? [0, 0] : [1, 0]; await submitPrediction(alice.id, prediction(matches[i].id, home, away)); await submitPrediction(bob.id, prediction(matches[i].id, i === 0 ? 2 : home, i === 0 ? 2 : away)); }
      assert.equal(await prisma.prediction.count({ where: { userId: alice.id, match: { seasonId: season.id } } }), 3);
    });
    await t.test("Banker is unique per user/gameweek and requires a saved prediction", async () => {
      await assert.rejects(chooseBanker(outsider.id, gws[0].id, matches[0].id));
      await chooseBanker(alice.id, gws[0].id, matches[1].id); await chooseBanker(alice.id, gws[0].id, matches[0].id);
      assert.equal(await prisma.gameweekBanker.count({ where: { userId: alice.id, gameweekId: gws[0].id } }), 1);
    });
    const league = await prisma.league.create({ data: { name: "Friends", joinCode: "TEST0001", ownerUserId: alice.id, memberships: { create: [{ userId: alice.id }, { userId: bob.id }, { userId: charlie.id }] } } });
    await seasonTransaction(season.id, tx => linkLeagueSeason(tx, league.id, season.id));
    await t.test("rival requires shared private season league membership", async () => {
      await assert.rejects(chooseRival(alice.id, season.id, outsider.id)); await assert.rejects(chooseRival(alice.id, season.id, alice.id));
      await chooseRival(alice.id, season.id, bob.id);
      assert.equal((await prisma.seasonRival.findUniqueOrThrow({ where: { seasonId_userId: { seasonId: season.id, userId: alice.id } } })).rivalId, bob.id);
    });
    await t.test("community stays unavailable until submission; private predictions stay hidden pre-kickoff", async () => {
      const before = await revealMatch(outsider.id, matches[0].id); assert.equal(before.community, null); assert.deepEqual(before.predictions, []);
      const own = await revealMatch(alice.id, matches[0].id, league.id); assert.equal(own.hidden, true); assert.equal(own.community?.predictionCount, 2); assert.deepEqual(own.predictions, []);
      await assert.rejects(revealMatch(outsider.id, matches[0].id, league.id));
      await prisma.match.update({ where: { id: matches[0].id }, data: { status: "POSTPONED" } });
      assert.equal((await revealMatch(alice.id, matches[0].id, league.id)).hidden, true);
      await prisma.prediction.updateMany({ where: { matchId: { in: matches.slice(0, 3).map(m => m.id) } }, data: { submittedAt: new Date(Date.now() - 60000) } });
      await assert.rejects(submitPrediction(alice.id, prediction(matches[0].id)));
      await prisma.match.update({ where: { id: matches[0].id }, data: { status: "SCHEDULED" } });
    });
    await t.test("H2H locks participants and generates persisted deterministic fixtures and byes", async () => {
      await assert.rejects(generateH2H(bob.id, league.id, season.id));
      const generated = await generateH2H(alice.id, league.id, season.id); assert.equal(generated.participants, 3); assert.equal(generated.generatedFixtures, 6);
      await assert.rejects(generateH2H(alice.id, league.id, season.id));
      await prisma.leagueMember.create({ data: { leagueId: league.id, userId: outsider.id } }); await seasonTransaction(season.id, tx => linkLeagueSeason(tx, league.id, season.id));
      const link = await prisma.leagueSeason.findUniqueOrThrow({ where: { leagueId_seasonId: { leagueId: league.id, seasonId: season.id } } });
      assert.equal((await prisma.leagueSeasonParticipant.findUniqueOrThrow({ where: { leagueSeasonId_userId: { leagueSeasonId: link.id, userId: outsider.id } } })).h2hEligible, false);
    });
    await t.test("fixture upsert keeps stable IDs and relocates an unstarted Banker safely", async () => {
      const s = { ...season, competition }; const fixture: ExternalFixture = { id: 1000000, externalId: "football-data:1000000", matchday: 1, homeTeam: a.name, awayTeam: b.name, homeTeamExternalId: "a", awayTeamExternalId: "b", kickoffTime: future.toISOString(), status: "SCHEDULED", homeScore: null, awayScore: null, homeScore90: null, awayScore90: null };
      const alias = await prisma.match.create({ data: { externalId: String(fixture.id), seasonId: season.id, competitionId: competition.id, kickoffTime: future, homeTeam: a.name, awayTeam: b.name, status: "SCHEDULED" } });
      const one = await seasonTransaction(season.id, tx => upsertSeasonFixture(tx, s, fixture, new Date()));
      assert.equal(one.id, alias.id); assert.equal(one.externalId, fixture.externalId);
      await submitPrediction(charlie.id, prediction(one.id)); await chooseBanker(charlie.id, gws[0].id, one.id);
      const two = await seasonTransaction(season.id, tx => upsertSeasonFixture(tx, s, { ...fixture, matchday: 2, kickoffTime: new Date(future.getTime() + 100000).toISOString(), status: "POSTPONED" }, new Date()));
      assert.equal(one.id, two.id); assert.equal(two.gameweekId, gws[1].id);
      assert.equal(await prisma.gameweekBanker.count({ where: { userId: charlie.id, gameweekId: gws[0].id } }), 0);
      assert.equal((await prisma.gameweekBanker.findFirstOrThrow({ where: { userId: charlie.id } })).gameweekId, gws[1].id);
      const cutoff = new Date(Date.now() - 1000);
      await prisma.match.update({ where: { id: two.id }, data: { kickoffTime: cutoff } });
      const movedLocked = await seasonTransaction(season.id, tx => upsertSeasonFixture(tx, s, { ...fixture, matchday: 3, kickoffTime: future.toISOString() }, new Date()));
      assert.equal(movedLocked.gameweekId, gws[2].id); assert.equal(movedLocked.scoringGameweekId, gws[1].id); assert.equal(movedLocked.predictionLockAt?.getTime(), cutoff.getTime());
      await assert.rejects(submitPrediction(charlie.id, prediction(two.id)));
    });
    await t.test("server-time lock prevents prediction edits and Banker moves at kickoff", async () => {
      for (let i = 0; i < 3; i++) await prisma.match.update({ where: { id: matches[i].id }, data: { kickoffTime: new Date(Date.now() - 10000 + i * 1000), status: "LIVE", homeScore: i === 0 ? 2 : i === 1 ? 0 : 1, awayScore: i === 0 ? 1 : 0 } });
      await prisma.prediction.updateMany({ where: { matchId: { in: matches.slice(0, 3).map(m => m.id) } }, data: { submittedAt: new Date(Date.now() - 60000) } });
      await assert.rejects(submitPrediction(alice.id, prediction(matches[0].id))); await assert.rejects(chooseBanker(alice.id, gws[0].id, matches[1].id));
      const visible = await revealMatch(alice.id, matches[0].id, league.id); assert.equal(visible.hidden, false); assert.equal(visible.predictions.length, 2);
    });
    await t.test("live provisional points are returned without writing authoritative fields", async () => {
      const view = await platformView(alice.id, season.id, gws[0].id);
      assert.equal(view?.matches.find(m => m.id === matches[0].id)?.provisionalPoints, 8);
      assert.equal((await prisma.prediction.findUniqueOrThrow({ where: { userId_matchId: { userId: alice.id, matchId: matches[0].id } } })).pointsAwarded, null);
    });
    await t.test("final scoring rebuilds gameweek and season tables, champion, streaks, awards and H2H", async () => {
      for (let i = 0; i < 3; i++) await prisma.match.update({ where: { id: matches[i].id }, data: { status: "FINISHED" } });
      await recalculateSeason(season.id);
      const own = await prisma.seasonStanding.findUniqueOrThrow({ where: { seasonId_userId: { seasonId: season.id, userId: alice.id } } });
      assert.equal(own.totalPoints, 16); assert.equal(own.exactScores, 3); assert.equal(own.gameweekWins, 1);
      assert.equal((own.stats as { currentCorrect: number }).currentCorrect, 3);
      assert.equal(await prisma.userAchievement.count({ where: { userId: alice.id, seasonId: season.id, definitionId: "oracle", revokedAt: null } }), 1);
      assert.equal((await prisma.gameweekStanding.findUniqueOrThrow({ where: { gameweekId_userId: { gameweekId: gws[0].id, userId: alice.id } } })).rank, 1);
      assert.equal(await prisma.h2HFixture.count({ where: { gameweekId: gws[0].id, settled: true } }), 2);
    });
    await t.test("achievement and notification awarding is idempotent", async () => {
      const earned = await prisma.userAchievement.findFirstOrThrow({ where: { userId: alice.id, definitionId: "oracle", revokedAt: null } });
      const awards = await prisma.userAchievement.count({ where: { seasonId: season.id } }); const notifications = await prisma.platformNotification.count({ where: { seasonId: season.id } });
      await recalculateSeason(season.id); await recalculateSeason(season.id);
      assert.equal(await prisma.userAchievement.count({ where: { seasonId: season.id } }), awards); assert.equal(await prisma.platformNotification.count({ where: { seasonId: season.id } }), notifications);
      assert.equal((await prisma.userAchievement.findUniqueOrThrow({ where: { id: earned.id } })).earnedAt.getTime(), earned.earnedAt.getTime());
    });
    await t.test("official correction recalculates Banker, winner, streaks, rank history, awards and H2H results", async () => {
      await prisma.match.update({ where: { id: matches[0].id }, data: { homeScore: 2, awayScore: 2 } }); await recalculateSeason(season.id);
      const own = await prisma.seasonStanding.findUniqueOrThrow({ where: { seasonId_userId: { seasonId: season.id, userId: alice.id } } }); const other = await prisma.seasonStanding.findUniqueOrThrow({ where: { seasonId_userId: { seasonId: season.id, userId: bob.id } } });
      assert.equal(own.totalPoints, 8); assert.equal(other.totalPoints, 12); assert.equal(own.gameweekWins, 0); assert.equal(other.gameweekWins, 1);
      assert.equal((own.stats as { bestCorrect: number }).bestCorrect, 2);
      assert.equal(await prisma.userAchievement.count({ where: { userId: alice.id, definitionId: "oracle", revokedAt: null } }), 0);
      assert.equal(await prisma.userAchievement.count({ where: { userId: bob.id, definitionId: "oracle", revokedAt: null } }), 1);
      const leagueView = await leagueSeasonView(alice.id, league.id, season.id, gws[0].id); assert.equal(leagueView.leaderboard[0].userId, bob.id);
      const before = await prisma.h2HFixture.findMany({ where: { gameweekId: gws[0].id }, orderBy: { slot: "asc" } }); await recalculateSeason(season.id); assert.deepEqual(await prisma.h2HFixture.findMany({ where: { gameweekId: gws[0].id }, orderBy: { slot: "asc" } }), before);
    });
    await t.test("consensus snapshot remains frozen after later changes and optional upset scoring is auditable", async () => {
      const snapshot = await prisma.consensusSnapshot.findUniqueOrThrow({ where: { matchId: matches[0].id } }); assert.equal(snapshot.predictionCount, 2);
      const again = await seasonTransaction(season.id, tx => freezeConsensus(tx, matches[0], new Date(Date.now() + 86400000))); assert.equal(again?.predictionCount, 2);
      await prisma.season.update({ where: { id: season.id }, data: { underdogEnabled: true, underdogThreshold: 50, underdogMinSample: 2, underdogPoints: 1 } }); await recalculateSeason(season.id);
      const bobPrediction = await prisma.prediction.findUniqueOrThrow({ where: { userId_matchId: { userId: bob.id, matchId: matches[0].id } } }); assert.equal(bobPrediction.basePoints, 4); assert.equal(bobPrediction.upsetPoints, 1); assert.equal(bobPrediction.pointsAwarded, 5);
      await prisma.season.update({ where: { id: season.id }, data: { underdogEnabled: false } }); await recalculateSeason(season.id);
    });
    await t.test("season picks validate scope, selection counts, goalkeeper roles, locking and configurable settlement", async () => {
      await seedPickRules(season.id); const champion = await prisma.seasonPickRule.findUniqueOrThrow({ where: { seasonId_key: { seasonId: season.id, key: "champion" } } }); const glove = await prisma.seasonPickRule.findUniqueOrThrow({ where: { seasonId_key: { seasonId: season.id, key: "goldenGlove" } } });
      await assert.rejects(saveSeasonPick(alice.id, champion.id, [a.id, a.id])); await assert.rejects(saveSeasonPick(alice.id, champion.id, [randomUUID()])); await assert.rejects(saveSeasonPick(alice.id, glove.id, [forward.id]));
      await saveSeasonPick(alice.id, glove.id, [goalkeeper.id]); await saveSeasonPick(alice.id, champion.id, [a.id]); await settleSeasonPick(champion.id, [a.id]);
      assert.equal((await prisma.seasonPick.findUniqueOrThrow({ where: { ruleId_userId: { ruleId: champion.id, userId: alice.id } } })).pointsAwarded, 20);
      await assert.rejects(saveSeasonPick(alice.id, champion.id, [b.id]));
      await prisma.seasonPickRule.update({ where: { id: glove.id }, data: { lockAt: past } }); await assert.rejects(saveSeasonPick(alice.id, glove.id, [goalkeeper.id]));
      await settleSeasonPick(champion.id, [b.id]); assert.equal((await prisma.seasonPick.findUniqueOrThrow({ where: { ruleId_userId: { ruleId: champion.id, userId: alice.id } } })).pointsAwarded, 0);
    });
    await t.test("bonus answers lock and settlement/corrections remain separate from match points", async () => {
      const q = await prisma.bonusQuestion.create({ data: { gameweekId: gws[0].id, text: "Any clean sheet?", options: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }], points: 3, lockAt: future } });
      await assert.rejects(saveBonusAnswer(alice.id, q.id, "unknown")); await saveBonusAnswer(bob.id, q.id, "yes"); await assert.rejects(settleBonus(q.id, "yes"));
      await prisma.bonusQuestion.update({ where: { id: q.id }, data: { lockAt: past } }); await assert.rejects(saveBonusAnswer(bob.id, q.id, "no")); await settleBonus(q.id, "yes");
      assert.equal((await prisma.bonusAnswer.findUniqueOrThrow({ where: { questionId_userId: { questionId: q.id, userId: bob.id } } })).pointsAwarded, 3);
      assert.equal((await prisma.gameweekStanding.findUniqueOrThrow({ where: { gameweekId_userId: { gameweekId: gws[0].id, userId: bob.id } } })).points, 15);
      await settleBonus(q.id, "no"); assert.equal((await prisma.gameweekStanding.findUniqueOrThrow({ where: { gameweekId_userId: { gameweekId: gws[0].id, userId: bob.id } } })).points, 12);
    });
    await t.test("multi-competition scoring is isolated", async () => {
      const c = await prisma.competition.create({ data: { name: "Other Cup", shortName: "OC", slug: "other-cup", type: "KNOCKOUT", provider: "legacy" } }); const s = await prisma.season.create({ data: { competitionId: c.id, displayName: "Other", startsAt: past, status: "ACTIVE" } });
      const match = await prisma.match.create({ data: { seasonId: s.id, competitionId: c.id, homeTeam: "X", awayTeam: "Y", kickoffTime: future, stage: "FINAL" } });
      await submitPrediction(alice.id, prediction(match.id)); await prisma.match.update({ where: { id: match.id }, data: { kickoffTime: past, status: "FINISHED", homeScore: 2, awayScore: 1 } }); await recalculateSeason(s.id);
      assert.equal((await prisma.seasonStanding.findUniqueOrThrow({ where: { seasonId_userId: { seasonId: s.id, userId: alice.id } } })).totalPoints, 4);
      assert.equal((await prisma.seasonStanding.findUniqueOrThrow({ where: { seasonId_userId: { seasonId: season.id, userId: alice.id } } })).totalPoints, 8);
    });
    await t.test("AI uses human validators, persists generation metadata and skips locked/generated predictions", async () => {
      const original = process.env.AI_PUNDIT_API_KEY; process.env.AI_PUNDIT_API_KEY = "synthetic-test-key";
      try {
        await prisma.season.update({ where: { id: season.id }, data: { aiConfig: { enabled: true } } });
        const invalid: AIProvider = { predict: async ctx => ({ ...prediction(ctx.matchId), predictedOutcome: "DRAW" }) };
        assert.equal((await generateAIPrediction(season.id, matches[3].id, invalid)).generated, false);
        const valid: AIProvider = { predict: async ctx => prediction(ctx.matchId) };
        assert.equal((await generateAIPrediction(season.id, matches[3].id, valid)).generated, true);
        assert.equal((await generateAIPrediction(season.id, matches[3].id, valid)).skipped, true);
        assert.equal((await generateAIPrediction(season.id, matches[0].id, valid)).skipped, true);
        const record = await prisma.aIGeneration.findFirstOrThrow({ where: { matchId: matches[3].id, status: "SUCCEEDED" } }); assert.equal(record.model, "gpt-4o-mini"); assert.ok(record.generatedAt);
      } finally { if (original === undefined) delete process.env.AI_PUNDIT_API_KEY; else process.env.AI_PUNDIT_API_KEY = original; }
    });
    await t.test("notification preferences suppress new deliveries and leave historical seasons viewable", async () => {
      await prisma.user.update({ where: { id: alice.id }, data: { notificationSettings: { all: false } } }); const count = await prisma.platformNotification.count({ where: { userId: alice.id } });
      await recalculateSeason(season.id); assert.equal(await prisma.platformNotification.count({ where: { userId: alice.id } }), count);
      await prisma.season.update({ where: { id: season.id }, data: { status: "COMPLETED" } });
      const view = await platformView(alice.id, season.id, gws[0].id); assert.equal(view?.season.status, "COMPLETED"); assert.equal(view?.matches.length, 3);
      assert.ok(view?.history.length && view.history.length >= 2);
    });
  } finally { await prisma.$disconnect(); }
});
