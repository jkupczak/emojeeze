import test from "node:test";
import assert from "node:assert/strict";
import { insertTextAtSelection } from "./write-with-emoji.js";

test("insertTextAtSelection inserts at caret", () => {
  const result = insertTextAtSelection("hello world", "🔥", { start: 5, end: 5 });
  assert.equal(result.value, "hello🔥 world");
  assert.equal(result.selection.start, 5 + "🔥".length);
  assert.equal(result.selection.end, 5 + "🔥".length);
});

test("insertTextAtSelection replaces selection", () => {
  const result = insertTextAtSelection("hello world", "😀", { start: 0, end: 5 });
  assert.equal(result.value, "😀 world");
  assert.equal(result.selection.start, 2);
});
