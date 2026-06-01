import assert from "node:assert/strict";
import test from "node:test";
import { isEligibleForAward, isGoalkeeperPosition } from "../src/lib/playerMaster";

test("recognizes goalkeeper position variants used by upstream catalogs", () => {
  assert.equal(isGoalkeeperPosition("Goalkeeper"), true);
  assert.equal(isGoalkeeperPosition("GK"), true);
  assert.equal(isGoalkeeperPosition("Forward"), false);
});

test("Golden Glove accepts only goalkeepers", () => {
  assert.equal(isEligibleForAward("goldenGlove", { position: "Goalkeeper" }), true);
  assert.equal(isEligibleForAward("goldenGlove", { position: "Defender" }), false);
});

test("Golden Boot rejects goalkeepers while other player awards allow them", () => {
  assert.equal(isEligibleForAward("goldenBoot", { position: "Goalkeeper" }), false);
  assert.equal(isEligibleForAward("goldenBoot", { position: "Forward" }), true);
  assert.equal(isEligibleForAward("goldenBall", { position: "Goalkeeper" }), true);
  assert.equal(isEligibleForAward("youngPlayer", { position: "Goalkeeper" }), true);
});
