import assert from "node:assert/strict";
import test from "node:test";
import { dedupeMatchesByFixture, matchDeduplicationKey, matchGroupNameCandidates, normalizeMatchGroupName } from "../src/lib/matchIdentity";

test("normalizes provider group labels to a single group code", () => {
  assert.equal(normalizeMatchGroupName("GROUP_A"), "A");
  assert.equal(normalizeMatchGroupName("Group A"), "A");
  assert.equal(normalizeMatchGroupName("group-a"), "A");
  assert.equal(normalizeMatchGroupName("A"), "A");
  assert.equal(normalizeMatchGroupName(null), null);
});

test("builds group filter candidates for normalized and provider-prefixed labels", () => {
  assert.deepEqual(matchGroupNameCandidates("A"), ["A", "GROUP_A", "GROUP A"]);
});

test("builds the same duplicate key for the same fixture", () => {
  assert.equal(
    matchDeduplicationKey({ homeTeam: " Mexico ", awayTeam: "South   Africa", kickoffTime: "2026-06-11T19:00:00.000Z" }),
    matchDeduplicationKey({ homeTeam: "mexico", awayTeam: "south africa", kickoffTime: new Date("2026-06-11T19:00:00.000Z") })
  );
});

test("builds the same duplicate key for provider country-name aliases", () => {
  assert.equal(
    matchDeduplicationKey({ homeTeam: "Korea Republic", awayTeam: "Czechia", kickoffTime: "2026-06-12T02:00:00.000Z" }),
    matchDeduplicationKey({ homeTeam: "South Korea", awayTeam: "Czech Republic", kickoffTime: new Date("2026-06-12T02:00:00.000Z") })
  );
});

test("builds the same duplicate key for requested national-team aliases", () => {
  assert.equal(
    matchDeduplicationKey({ homeTeam: "Germany", awayTeam: "Côte d'Ivoire", kickoffTime: "2026-06-20T13:00:00.000Z" }),
    matchDeduplicationKey({ homeTeam: "Germany", awayTeam: "Ivory Coast", kickoffTime: new Date("2026-06-20T13:00:00.000Z") })
  );
  assert.equal(
    matchDeduplicationKey({ homeTeam: "Cape Verde Islands", awayTeam: "IR Iran", kickoffTime: "2026-06-20T16:00:00.000Z" }),
    matchDeduplicationKey({ homeTeam: "Cabo Verde", awayTeam: "Iran", kickoffTime: new Date("2026-06-20T16:00:00.000Z") })
  );
});

test("dedupes duplicate fixtures while preferring the user's predicted copy", () => {
  const matches = [
    {
      id: 10,
      tournamentId: "11111111-1111-1111-1111-111111111111",
      externalId: "football-data:1",
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      kickoffTime: "2026-06-11T19:00:00.000Z",
      groupName: "GROUP_A",
      predictions: []
    },
    {
      id: 2,
      tournamentId: null,
      externalId: "1",
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      kickoffTime: "2026-06-11T19:00:00.000Z",
      groupName: "A",
      predictions: [{ id: "prediction-1" }]
    },
    {
      id: 3,
      tournamentId: null,
      externalId: "2",
      homeTeam: "Canada",
      awayTeam: "USA",
      kickoffTime: "2026-06-12T19:00:00.000Z",
      groupName: "B",
      predictions: []
    }
  ];

  const dedupedMatches = dedupeMatchesByFixture(matches);

  assert.deepEqual(dedupedMatches.map((match) => match.id), [2, 3]);
});
