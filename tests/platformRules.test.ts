import test from "node:test";
import assert from "node:assert/strict";
import { awardPrediction, validateSeasonPrediction, canEditPrediction, canRevealPrediction, assertBankerMove, consensus, underdogBonus, streaks, roundRobin, h2hResult, compareGameweekRank, compareSeasonRank, selectionPoints, canSeeConsensus, scoringRulesSchema } from "../src/lib/platformRules";
import { parseFootballDataFixtures } from "../src/services/footballApi";
const rules = scoringRulesSchema.parse({});
const p = { matchId: 1, predictedOutcome: "HOME" as const, predictedHomeScore: 2, predictedAwayScore: 1 };
const actual = { homeScore: 2, awayScore: 1, homeScore90: null, awayScore90: null, stage: "GROUP" };
test("league exact scoring preserves separate 4 base, x2 modifier and 8 final points", () => {
  assert.deepEqual(awardPrediction(p, actual, rules, true), { basePoints: 4, pointsMultiplier: 2, upsetPoints: 0, pointsAwarded: 8, isExactScore: true, isCorrectOutcome: true });
});
test("base outcome is 1, Banker outcome is 2 and incorrect Banker is 0", () => {
  assert.equal(awardPrediction({ ...p, predictedHomeScore: 3 }, actual, rules).pointsAwarded, 1);
  assert.equal(awardPrediction({ ...p, predictedHomeScore: 3 }, actual, rules, true).pointsAwarded, 2);
  assert.equal(awardPrediction(p, { ...actual, homeScore: 0, awayScore: 1 }, rules, true).pointsAwarded, 0);
});
test("recalculation replaces values rather than doubling already awarded points", () => {
  const first = awardPrediction(p, actual, rules, true);
  const second = awardPrediction(p, actual, rules, true);
  assert.deepEqual(first, second);
  assert.equal(awardPrediction(p, { ...actual, homeScore: 2, awayScore: 2 }, rules, true).pointsAwarded, 0);
});
test("legacy World Cup scoring and knockout advancing-team semantics remain explicit", () => {
  const legacy = scoringRulesSchema.parse({ outcome: 2, exact: 3, penalty: 1, legacyKnockout: true });
  assert.equal(awardPrediction(p, actual, legacy).pointsAwarded, 5);
  assert.doesNotThrow(() => validateSeasonPrediction({ ...p, predictedHomeScore: 1, predictedAwayScore: 1, predictedPenaltyShootout: true }, "FINAL", legacy));
});
test("league and modern knockout outcome must agree with score and both scores are integers", () => {
  assert.throws(() => validateSeasonPrediction({ ...p, predictedAwayScore: 3 }, "GROUP", rules));
  assert.throws(() => validateSeasonPrediction({ ...p, predictedHomeScore: -1 }, "GROUP", rules));
  assert.throws(() => validateSeasonPrediction({ ...p, predictedHomeScore: 1.5 }, "GROUP", rules));
  assert.throws(() => validateSeasonPrediction({ ...p, predictedPenaltyShootout: true }, "FINAL", rules));
  assert.doesNotThrow(() => validateSeasonPrediction({ ...p, predictedOutcome: "DRAW", predictedHomeScore: 2, predictedAwayScore: 2 }, "FINAL", rules));
});
test("locks at exact server deadline and never reveals a postponed pre-kickoff prediction", () => {
  const kickoffTime = new Date("2026-10-05T12:00:00Z"), before = new Date(kickoffTime.getTime() - 1);
  const match = { kickoffTime, status: "SCHEDULED", isEnabled: true };
  assert.equal(canEditPrediction(match, before), true); assert.equal(canEditPrediction(match, kickoffTime), false);
  assert.equal(canRevealPrediction({ ...match }, before), false); assert.equal(canRevealPrediction(match, kickoffTime), true);
  assert.equal(canEditPrediction({ ...match, status: "POSTPONED" }, before), false);
});
test("rescheduling cannot unlock the preserved first passed cutoff", () => {
  const match = { kickoffTime: new Date("2026-10-10"), predictionLockAt: new Date("2026-10-01"), status: "SCHEDULED", isEnabled: true };
  assert.equal(canEditPrediction(match, new Date("2026-10-05")), false);
  assert.equal(canRevealPrediction(match, new Date("2026-10-05")), true);
});
test("Banker cannot move after its match deadline or persisted lock", () => {
  const match = { kickoffTime: new Date("2026-10-05"), status: "SCHEDULED", isEnabled: true };
  assert.throws(() => assertBankerMove({ lockedAt: null, match }, new Date("2026-10-05")));
  assert.throws(() => assertBankerMove({ lockedAt: new Date("2026-10-01"), match }, new Date("2026-09-01")));
  assert.doesNotThrow(() => assertBankerMove({ lockedAt: null, match }, new Date("2026-10-04")));
});
test("ranking uses points, exact scores, outcomes, wins and registration with deterministic ID fallback", () => {
  const a = { userId: "a", points: 10, exact: 2, correct: 3, wins: 1, registeredAt: new Date("2026-01-01") };
  assert.ok(compareSeasonRank(a, { ...a, userId: "b", exact: 1 }) < 0);
  assert.ok(compareSeasonRank(a, { ...a, userId: "b", correct: 2 }) < 0);
  assert.ok(compareSeasonRank(a, { ...a, userId: "b", wins: 0 }) < 0);
  assert.ok(compareSeasonRank(a, { ...a, userId: "b" }) < 0);
});
test("gameweek ties use earliest last submission, then registration and ID", () => {
  const a = { userId: "a", points: 10, exact: 2, correct: 3, registeredAt: new Date("2026-01-01"), lastSubmittedAt: new Date("2026-10-01") };
  assert.ok(compareGameweekRank(a, { ...a, userId: "b", lastSubmittedAt: new Date("2026-10-02") }) < 0);
});
test("community aggregation is consent-gated and uses only in-app selections", () => {
  assert.equal(canSeeConsensus(false), false); assert.equal(canSeeConsensus(true), true);
  const result = consensus([p, { ...p, predictedOutcome: "DRAW", predictedHomeScore: 1, predictedAwayScore: 1 }]);
  assert.equal(result.homePercent, 50); assert.equal(result.drawPercent, 50); assert.equal(result.averageHome, 1.5); assert.equal(result.predictionCount, 2);
});
test("optional upset bonus requires frozen sample threshold and is disabled by default", () => {
  const frozen = { homeCount: 91, drawCount: 6, awayCount: 3, predictionCount: 100 };
  assert.equal(underdogBonus(frozen, "AWAY", { enabled: false, threshold: 15, points: 1, minSample: 20 }), 0);
  assert.equal(underdogBonus(frozen, "AWAY", { enabled: true, threshold: 15, points: 1, minSample: 20 }), 1);
  assert.equal(underdogBonus(frozen, "HOME", { enabled: true, threshold: 15, points: 1, minSample: 20 }), 0);
  assert.equal(underdogBonus(frozen, "AWAY", { enabled: true, threshold: 15, points: 1, minSample: 101 }), 0);
});
test("upset is auditable separately and applied after the Banker multiplier", () => {
  assert.equal(awardPrediction(p, actual, rules, true, 1).pointsAwarded, 9);
  assert.equal(awardPrediction(p, { ...actual, homeScore: 0 }, rules, true, 1).upsetPoints, 0);
});
test("live calculation returns provisional data without mutating the prediction", () => {
  const copy = { ...p }; assert.equal(awardPrediction(p, actual, rules, true).pointsAwarded, 8);
  assert.deepEqual(p, copy); assert.equal(awardPrediction(p, { ...actual, awayScore: 2 }, rules, true).pointsAwarded, 0);
});
test("streaks replay correctly after a corrected first result", () => {
  const rows = [{ isCorrectOutcome: true, isExactScore: true }, { isCorrectOutcome: true, isExactScore: false }, { isCorrectOutcome: true, isExactScore: true }];
  assert.deepEqual(streaks(rows), { currentCorrect: 3, bestCorrect: 3, currentExact: 1, bestExact: 1 });
  assert.equal(streaks([{ ...rows[0], isCorrectOutcome: false }, ...rows.slice(1)]).bestCorrect, 2);
});
test("deterministic H2H schedule covers each pair and assigns odd-member byes", () => {
  const schedule = roundRobin(["c", "a", "b"], ["g1", "g2", "g3"]);
  assert.deepEqual(schedule, roundRobin(["b", "c", "a"], ["g1", "g2", "g3"]));
  const pairs = schedule.filter(f => f.awayUserId).map(f => [f.homeUserId, f.awayUserId].sort().join(":"));
  assert.equal(new Set(pairs).size, 3); assert.equal(schedule.filter(f => f.awayUserId === null).length, 3);
  for (const g of ["g1", "g2", "g3"]) assert.equal(new Set(schedule.filter(f => f.gameweekId === g).flatMap(f => [f.homeUserId, ...(f.awayUserId ? [f.awayUserId] : [])])).size, 3);
});
test("H2H results recalculate wins/draws and byes award no table points", () => {
  assert.deepEqual(h2hResult(24, 21), { homeTablePoints: 3, awayTablePoints: 0 });
  assert.deepEqual(h2hResult(21, 24), { homeTablePoints: 0, awayTablePoints: 3 });
  assert.deepEqual(h2hResult(24, 24), { homeTablePoints: 1, awayTablePoints: 1 });
  assert.deepEqual(h2hResult(24, null), { homeTablePoints: 0, awayTablePoints: null });
});
test("season picks score each distinct correct selection once", () => { assert.equal(selectionPoints(["a", "a", "b"], ["a", "b"], 5), 10); });
test("provider maps gameweek, status, badges, regular-time score and stable rescheduled identity", () => {
  const match = { id: 100, matchday: 12, utcDate: "2026-10-05T12:00:00Z", status: "POSTPONED", homeTeam: { id: 1, name: "A", crest: "https://example.org/a.svg" }, awayTeam: { id: 2, name: "B" }, score: { duration: "REGULAR", fullTime: { home: null, away: null } } };
  const before = parseFootballDataFixtures({ matches: [match] }, "PL")[0]; const after = parseFootballDataFixtures({ matches: [{ ...match, matchday: 13, utcDate: "2026-10-10T12:00:00Z", status: "TIMED" }] }, "PL")[0];
  assert.equal(before.externalId, after.externalId); assert.equal(before.status, "POSTPONED"); assert.equal(after.matchday, 13); assert.equal(after.status, "SCHEDULED"); assert.equal(before.homeBadgeUrl, "https://example.org/a.svg");
});
