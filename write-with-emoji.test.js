import test from "node:test";
import assert from "node:assert/strict";
import {
  clampWriteFontSize,
  insertTextAtSelection,
  WRITE_DEFAULT_FONT_SIZE_REM,
} from "./write-with-emoji.js";

test("clampWriteFontSize enforces minimum only", () => {
  assert.equal(clampWriteFontSize(0.5), 1.125);
  assert.equal(clampWriteFontSize(WRITE_DEFAULT_FONT_SIZE_REM), WRITE_DEFAULT_FONT_SIZE_REM);
  assert.equal(clampWriteFontSize(10), 10);
});

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
