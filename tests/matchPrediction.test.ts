import test from "node:test";
import assert from "node:assert/strict";
import { outcomeFromScore, scoreMatchesOutcome } from "../src/lib/matchPrediction";

test("derives the win/draw/win outcome from a correct score", () => {
  assert.equal(outcomeFromScore(2, 0), "HOME");
  assert.equal(outcomeFromScore(1, 1), "DRAW");
  assert.equal(outcomeFromScore(0, 1), "AWAY");
});

test("rejects a correct score that contradicts the selected win/draw/win outcome", () => {
  assert.equal(scoreMatchesOutcome("HOME", 0, 1), false);
  assert.equal(scoreMatchesOutcome("HOME", 0, 0), false);
  assert.equal(scoreMatchesOutcome("DRAW", 0, 0), true);
  assert.equal(scoreMatchesOutcome("AWAY", 0, 1), true);
});
