import test from "node:test";
import assert from "node:assert/strict";
import { applySkinTone, stripSkinTone } from "./skin-tone.js";

test("stripSkinTone removes Fitzpatrick modifiers", () => {
  assert.equal(stripSkinTone("👋🏽"), "👋");
});

test("applySkinTone adds modifier to simple hand", () => {
  assert.equal(applySkinTone("👋", 3, true), "👋🏽");
});

test("applySkinTone replaces existing tone", () => {
  assert.equal(applySkinTone("👋🏻", 5, true), "👋🏿");
});

test("applySkinTone leaves unsupported emoji unchanged", () => {
  assert.equal(applySkinTone("🔥", 3, false), "🔥");
});

test("applySkinTone handles ZWJ profession sequence", () => {
  const toned = applySkinTone("👨‍💻", 4, true);
  assert.match(toned, /👨🏾/);
  assert.match(toned, /💻/);
});

test("applySkinTone default tone strips modifiers", () => {
  assert.equal(applySkinTone("👍🏿", 0, true), "👍");
});
