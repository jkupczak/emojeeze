import test from "node:test";
import assert from "node:assert/strict";
import { buildSearchRecord, normalizeText, parseSearchQuery, scoreRecord } from "./search.js";

test("parseSearchQuery parses shortcode", () => {
  const parsed = parseSearchQuery(":joy:");
  assert.equal(parsed.shortcodeSlug, "joy");
});

test("normalizeText collapses whitespace", () => {
  assert.equal(normalizeText("  Hello   World "), "hello world");
});

test("scoreRecord ranks exact slug match highly", () => {
  const record = buildSearchRecord({
    emoji: "😂",
    name: "face with tears of joy",
    slug: "face_with_tears_of_joy",
    group: "Smileys",
    skinToneSupport: false,
  });
  const score = scoreRecord(record, ":joy:");
  assert.ok(score > 0);
});
