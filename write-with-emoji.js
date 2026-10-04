import {
  readStoredItem,
  STORAGE_WRITE_DRAFT,
  STORAGE_WRITE_FONT_SIZE,
} from "./app-storage.js";

export const WRITE_DEFAULT_FONT_SIZE_REM = 2.0625;
const WRITE_MIN_FONT_SIZE_REM = 1.125;
const WRITE_FONT_SIZE_STEP_REM = 0.125;

/**
 * @param {number} rem
 */
export function clampWriteFontSize(rem) {
  return Math.max(WRITE_MIN_FONT_SIZE_REM, rem);
}

/**
 * @param {string} value
 * @param {string} emoji
 * @param {{ start: number; end: number }} selection
 */
export function insertTextAtSelection(value, emoji, selection) {
  const { start, end } = selection;
  const nextValue = value.slice(0, start) + emoji + value.slice(end);
  const caret = start + emoji.length;
  return { value: nextValue, selection: { start: caret, end: caret } };
}

/**
 * @param {HTMLTextAreaElement} textarea
 * @param {{ shell: HTMLElement }} options
 */
export function initWriteWithEmoji(textarea, options) {
  const { shell } = options;

  /** @type {{ start: number; end: number }} */
  let lastSelection = { start: 0, end: 0 };
  let saveTimer = null;

  let fontSizeRem = WRITE_DEFAULT_FONT_SIZE_REM;
  const storedSize = readStoredItem(STORAGE_WRITE_FONT_SIZE);
  if (storedSize !== null) {
    const parsed = Number.parseFloat(storedSize);
    if (Number.isFinite(parsed)) fontSizeRem = clampWriteFontSize(parsed);
  }

  const storedDraft = readStoredItem(STORAGE_WRITE_DRAFT);
  if (storedDraft !== null) textarea.value = storedDraft;

  const fontDecreaseBtn = shell.querySelector("#write-font-decrease");
  const fontIncreaseBtn = shell.querySelector("#write-font-increase");
  const fontResetBtn = shell.querySelector("#write-font-reset");
  const clearBtn = shell.querySelector("#write-clear");

  function syncSelection() {
    lastSelection = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_WRITE_DRAFT, textarea.value);
    }, 250);
  }

  function applyFontSize() {
    shell.style.setProperty("--write-font-size", `${fontSizeRem}rem`);
    localStorage.setItem(STORAGE_WRITE_FONT_SIZE, String(fontSizeRem));
  }

  function changeFontSize(delta) {
    fontSizeRem = clampWriteFontSize(Math.round((fontSizeRem + delta) * 1000) / 1000);
    applyFontSize();
    textarea.focus();
  }

  for (const eventName of ["select", "keyup", "mouseup", "focus", "blur"]) {
    textarea.addEventListener(eventName, syncSelection);
  }

  textarea.addEventListener("input", scheduleSave);

  fontDecreaseBtn?.addEventListener("click", () => changeFontSize(-WRITE_FONT_SIZE_STEP_REM));
  fontIncreaseBtn?.addEventListener("click", () => changeFontSize(WRITE_FONT_SIZE_STEP_REM));
  fontResetBtn?.addEventListener("click", () => {
    fontSizeRem = WRITE_DEFAULT_FONT_SIZE_REM;
    applyFontSize();
    textarea.focus();
  });

  clearBtn?.addEventListener("click", () => {
    if (!textarea.value) return;
    textarea.value = "";
    lastSelection = { start: 0, end: 0 };
    scheduleSave();
    textarea.focus();
  });

  applyFontSize();

  /**
   * @param {string} emoji
   */
  function insert(emoji) {
    const result = insertTextAtSelection(textarea.value, emoji, lastSelection);
    textarea.value = result.value;
    lastSelection = result.selection;
    textarea.focus();
    textarea.setSelectionRange(result.selection.start, result.selection.end);
    scheduleSave();
  }

  return { insert, focusEditor: () => textarea.focus() };
}
