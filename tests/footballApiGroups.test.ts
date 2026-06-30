import assert from "node:assert/strict";
import test from "node:test";

test("parseGroupPayload parses common nested standings statistics", async () => {
  const { parseGroupPayload } = await import("../src/services/footballApi");
  const group = parseGroupPayload({
    group: "A",
    standings: [
      {
        rank: "1",
        team: { id: 1, name: "Mexico", code: "MEX" },
        all: { played: 3, win: 2, draw: 1, lose: 0, goals: { for: 5, against: 2 } },
        goalsDiff: 3,
        points: 7,
        form: "W,D,W"
      },
      {
        rank: 2,
        team: { id: 2, name: "South Africa" },
        stats: { matchesPlayed: "3", wins: "1", draws: "1", losses: "1", goalsScored: "4", goalsConceded: "4", pts: "4" }
      },
      { pos: 3, country: "Czechia", p: 2, w: 1, d: 0, l: 1, gf: 2, ga: 2, gd: 0, pts: 3 }
    ]
  });

  assert.equal(group?.name, "Group A");
  assert.deepEqual(group?.teams[0], {
    id: "1",
    rank: 1,
    name: "Mexico",
    flagEmoji: "🇲🇽",
    flagImageUrl: null,
    played: 3,
    won: 2,
    drawn: 1,
    lost: 0,
    goalsFor: 5,
    goalsAgainst: 2,
    goalDifference: 3,
    points: 7,
    form: ["W", "D", "W"]
  });
  assert.equal(group?.teams[1].played, 3);
  assert.equal(group?.teams[1].points, 4);
  assert.equal(group?.teams[2].played, 2);
  assert.equal(group?.teams[2].points, 3);
});

test("footballDataPenaltyShootout derives shoot-out results from football-data scores", async () => {
  const { footballDataPenaltyShootout } = await import("../src/services/footballApi");

  assert.equal(footballDataPenaltyShootout({ score: { duration: "PENALTY_SHOOTOUT" } }), true);
  assert.equal(footballDataPenaltyShootout({ score: { duration: "REGULAR" } }), false);
  assert.equal(footballDataPenaltyShootout({ score: { penalties: { home: 4, away: 3 } } }), true);
  assert.equal(footballDataPenaltyShootout({ score: {} }), null);
});

test("genericPenaltyShootout parses common provider penalty fields", async () => {
  const { genericPenaltyShootout } = await import("../src/services/footballApi");

  assert.equal(genericPenaltyShootout({ actual_penalty_shootout: true }), true);
  assert.equal(genericPenaltyShootout({ penaltyShootout: "no" }), false);
  assert.equal(genericPenaltyShootout({ decidedBy: "PSO" }), true);
  assert.equal(genericPenaltyShootout({ home_penalties: 5, away_penalties: 4 }), true);
  assert.equal(genericPenaltyShootout({}), null);
});
