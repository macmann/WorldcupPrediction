import assert from "node:assert/strict";
import test from "node:test";
import { appDateKey, appDayRange, formatAppDateTime } from "../src/lib/dateTime";

test("formats fixture times in Myanmar Time", () => {
  assert.equal(formatAppDateTime("2026-06-20T19:00:00.000Z"), "Jun 21, 2026, 1:30 AM MMT");
});

test("builds app date keys and UTC ranges from MMT calendar days", () => {
  assert.equal(appDateKey("2026-06-19T18:00:00.000Z"), "2026-06-20");
  const range = appDayRange("2026-06-20");
  assert.equal(range.start.toISOString(), "2026-06-19T17:30:00.000Z");
  assert.equal(range.end.toISOString(), "2026-06-20T17:30:00.000Z");
});
