import assert from "node:assert/strict";
import test from "node:test";
import { rankMembers, rankMovement } from "../src/lib/leagues";

function member(id: string, points: number, matchesPlayed: number, registeredAt: string) {
  return {
    joinedAt: new Date(registeredAt),
    user: {
      id,
      displayName: id,
      avatarUrl: null,
      globalPoints: points,
      exactScoresCount: 0,
      correctOutcomesCount: 0,
      matchesPlayedCount: matchesPlayed,
      registrationTimestamp: new Date(registeredAt),
      isBanned: false
    }
  };
}

test("league ranking breaks point ties by fewer matches played", () => {
  const ranked = rankMembers([
    member("player-a", 100, 10, "2026-01-01T00:00:00.000Z"),
    member("player-b", 100, 8, "2026-01-02T00:00:00.000Z"),
    member("player-c", 101, 12, "2026-01-03T00:00:00.000Z")
  ]);

  assert.deepEqual(ranked.map((row) => [row.user.id, row.rank]), [
    ["player-c", 1],
    ["player-b", 2],
    ["player-a", 3]
  ]);
});

test("rank movement compares previous and current ranks", () => {
  assert.deepEqual(rankMovement(3, 1), { direction: "up", places: 2, previousRank: 3 });
  assert.deepEqual(rankMovement(1, 3), { direction: "down", places: 2, previousRank: 1 });
  assert.deepEqual(rankMovement(2, 2), { direction: "same", places: 0, previousRank: 2 });
  assert.deepEqual(rankMovement(undefined, 4), { direction: "new", places: 0, previousRank: null });
});
