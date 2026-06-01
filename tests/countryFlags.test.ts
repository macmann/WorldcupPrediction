import test from "node:test";
import assert from "node:assert/strict";
import { countryCodeFromName, countryNameToFlagImageUrl } from "../src/lib/countryFlags";

test("maps country names to remote SVG flag URLs", () => {
  assert.equal(countryCodeFromName("United States"), "US");
  assert.equal(countryNameToFlagImageUrl("United States"), "https://flagcdn.io/flags/4x3/us.svg");
});

test("maps home nation teams to subdivision flag URLs", () => {
  assert.equal(countryCodeFromName("England"), "GB-ENG");
  assert.equal(countryNameToFlagImageUrl("England"), "https://flagcdn.io/flags/4x3/gb-eng.svg");
});

test("maps WC26 group names with aliases and diacritics to flag URLs", () => {
  assert.equal(countryCodeFromName("Ivory Coast"), "CI");
  assert.equal(countryCodeFromName("DR Congo"), "CD");
  assert.equal(countryCodeFromName("Türkiye"), "TR");
  assert.equal(countryNameToFlagImageUrl("Curaçao"), "https://flagcdn.io/flags/4x3/cw.svg");
});
