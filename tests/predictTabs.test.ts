import assert from "node:assert/strict";
import test from "node:test";
import { dateTabs, defaultDateTab, selectedDateTab } from "../src/lib/predictTabs";

test("predict page defaults to today's app date even when the first fixture is another day", () => {
  const now = new Date("2026-06-16T06:00:00.000Z");
  const matches = [{ kickoffTime: "2026-06-13T19:00:00.000Z" }];

  assert.equal(defaultDateTab(now), "2026-06-16");
  assert.deepEqual(dateTabs(matches, now), ["2026-06-14", "2026-06-16"]);
});

test("predict date selection keeps today selected even when today has no fixtures", () => {
  const now = new Date("2026-06-16T06:00:00.000Z");
  const dates = ["2026-06-14", "2026-06-18"];

  assert.equal(selectedDateTab(dates, undefined, undefined, now), "2026-06-16");
  assert.equal(selectedDateTab(dates, "2026-06-18", undefined, now), "2026-06-18");
  assert.equal(selectedDateTab(dates, undefined, "A", now), undefined);
});
