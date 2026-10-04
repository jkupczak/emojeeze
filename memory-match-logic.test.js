import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDeckFromPairs,
  emojisMatch,
  pickEmojiPairs,
  recordBestTurns,
  shuffle,
} from "./memory-match-logic.js";

test("shuffle keeps length and elements", () => {
  const input = [1, 2, 3, 4];
  const out = shuffle(input);
  assert.equal(out.length, 4);
  assert.deepEqual([...out].sort(), input);
});

test("pickEmojiPairs returns requested count", () => {
  const pool = ["😀", "😁", "😂", "🤣", "😊"];
  const pairs = pickEmojiPairs(pool, 3);
  assert.equal(pairs.length, 3);
  assert.equal(new Set(pairs).size, 3);
});

test("buildDeckFromPairs creates paired deck", () => {
  const deck = buildDeckFromPairs(["😀", "🔥"]);
  assert.equal(deck.length, 4);
  const counts = deck.reduce((acc, card) => {
    acc[card.emoji] = (acc[card.emoji] ?? 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));
  assert.equal(counts["😀"], 2);
  assert.equal(counts["🔥"], 2);
});

test("emojisMatch compares emoji strings", () => {
  assert.equal(emojisMatch("😀", "😀"), true);
  assert.equal(emojisMatch("😀", "🔥"), false);
});

test("recordBestTurns keeps lowest turns", () => {
  const best = { easy: 10 };
  assert.equal(recordBestTurns(best, "easy", 12), false);
  assert.equal(best.easy, 10);
  assert.equal(recordBestTurns(best, "easy", 8), true);
  assert.equal(best.easy, 8);
});
