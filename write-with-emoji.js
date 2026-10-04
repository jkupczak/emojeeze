import { STORAGE_WRITE_DRAFT, readStoredItem } from "./app-storage.js";

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
 */
export function initWriteWithEmoji(textarea) {
  /** @type {{ start: number; end: number }} */
  let lastSelection = { start: 0, end: 0 };
  let saveTimer = null;

  const storedDraft = readStoredItem(STORAGE_WRITE_DRAFT);
  if (storedDraft !== null) textarea.value = storedDraft;

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

  for (const eventName of ["select", "keyup", "mouseup", "focus", "blur"]) {
    textarea.addEventListener(eventName, syncSelection);
  }

  textarea.addEventListener("input", scheduleSave);

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
