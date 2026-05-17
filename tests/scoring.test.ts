import test from "node:test";
import assert from "node:assert/strict";
import { calculateMatchPoints, calculateOutrightPoints } from "../src/lib/scoring";

test("awards two points for an exact score", () => {
  assert.deepEqual(calculateMatchPoints({ home: 2, away: 1 }, { home: 2, away: 1 }), { points: 2, exact: true, correctOutcome: true });
});

test("awards one point for the correct non-exact outcome", () => {
  assert.equal(calculateMatchPoints({ home: 3, away: 1 }, { home: 1, away: 0 }).points, 1);
  assert.equal(calculateMatchPoints({ home: 0, away: 2 }, { home: 1, away: 4 }).points, 1);
  assert.equal(calculateMatchPoints({ home: 1, away: 1 }, { home: 2, away: 2 }).points, 1);
});

test("awards zero points for an incorrect outcome", () => {
  assert.equal(calculateMatchPoints({ home: 1, away: 0 }, { home: 0, away: 2 }).points, 0);
});

test("awards tournament outright points independently", () => {
  assert.equal(calculateOutrightPoints(
    { championTeamId: "ARG", bestPlayerId: "10", bestGkId: "1" },
    { championTeamId: "ARG", bestPlayerId: "7", bestGkId: "1" }
  ), 13);
});
