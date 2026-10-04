export const STORAGE_SKIN_TONE = "emojeeze-skin-tone";
export const STORAGE_RECENT = "emojeeze-recent";
export const STORAGE_FAVORITES = "emojeeze-favorites";
export const STORAGE_HAPTIC = "emojeeze-haptic";
export const STORAGE_HIDDEN_CATEGORIES = "emojeeze-hidden-categories";
export const STORAGE_HIDDEN_EMOJIS = "emojeeze-hidden-emojis";
export const STORAGE_WRITE_DRAFT = "emojeeze-write-draft";
export const STORAGE_MEMORY_BEST = "emojeeze-memory-best";

export const LEGACY_STORAGE = {
  [STORAGE_SKIN_TONE]: "emoji-copy-skin-tone",
  [STORAGE_RECENT]: "emoji-copy-recent",
  [STORAGE_FAVORITES]: "emoji-copy-favorites",
  [STORAGE_HAPTIC]: "emoji-copy-haptic",
};

export function readStoredItem(key) {
  const value = localStorage.getItem(key);
  if (value !== null) return value;
  const legacyKey = LEGACY_STORAGE[key];
  if (!legacyKey) return null;
  const legacyValue = localStorage.getItem(legacyKey);
  if (legacyValue !== null) localStorage.setItem(key, legacyValue);
  return legacyValue;
}
