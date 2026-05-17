import test from "node:test";
import assert from "node:assert/strict";
import { calculateMatchPoints, calculateOutrightPoints } from "../src/lib/scoring";

test("awards three points for an exact score prediction", () => {
  assert.deepEqual(calculateMatchPoints({ score: { home: 2, away: 1 } }, { home: 2, away: 1 }), { points: 3, exact: true, correctOutcome: false });
});

test("awards one point for the correct win/draw/win outcome prediction", () => {
  assert.deepEqual(calculateMatchPoints({ outcome: "HOME" }, { home: 1, away: 0 }), { points: 1, exact: false, correctOutcome: true });
  assert.deepEqual(calculateMatchPoints({ outcome: "AWAY" }, { home: 1, away: 4 }), { points: 1, exact: false, correctOutcome: true });
  assert.deepEqual(calculateMatchPoints({ outcome: "DRAW" }, { home: 2, away: 2 }), { points: 1, exact: false, correctOutcome: true });
});

test("awards outcome and exact score points independently", () => {
  assert.deepEqual(calculateMatchPoints({ outcome: "HOME", score: { home: 2, away: 1 } }, { home: 2, away: 1 }), { points: 4, exact: true, correctOutcome: true });
  assert.deepEqual(calculateMatchPoints({ outcome: "AWAY", score: { home: 2, away: 1 } }, { home: 2, away: 1 }), { points: 3, exact: true, correctOutcome: false });
});

test("awards zero points for incorrect or missing match predictions", () => {
  assert.equal(calculateMatchPoints({ outcome: "HOME", score: { home: 1, away: 0 } }, { home: 0, away: 2 }).points, 0);
  assert.equal(calculateMatchPoints({}, { home: 0, away: 2 }).points, 0);
});

test("awards tournament outright points independently", () => {
  assert.equal(calculateOutrightPoints(
    { championTeamId: "ARG", bestPlayerId: "10", bestGkId: "1" },
    { championTeamId: "ARG", bestPlayerId: "7", bestGkId: "1" }
  ), 13);
});
