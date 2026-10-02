export const SKIN_TONE_MODIFIERS = ["", "🏻", "🏼", "🏽", "🏾", "🏿"];

const FITZPATRICK_RE = /[\u{1F3FB}-\u{1F3FF}]/gu;
const EMOJI_MODIFIER_BASE = /\p{Emoji_Modifier_Base}/u;

export function stripSkinTone(emoji) {
  return emoji.replace(FITZPATRICK_RE, "");
}

/**
 * Apply Fitzpatrick tone to RGI emoji sequences (ZWJ parts handled separately).
 * @param {string} emoji
 * @param {number} toneIndex 0 = default
 * @param {boolean} skinToneSupport
 */
export function applySkinTone(emoji, toneIndex, skinToneSupport) {
  if (!skinToneSupport) return emoji;

  const modifier = SKIN_TONE_MODIFIERS[toneIndex] ?? "";
  const cleaned = stripSkinTone(emoji);
  if (!modifier) return cleaned;

  return cleaned
    .split("\u200D")
    .map((part) => applyToneToPart(part, modifier))
    .join("\u200D");
}

function applyToneToPart(part, modifier) {
  if (!part || !EMOJI_MODIFIER_BASE.test(part)) return part;
  return part.replace(
    /(\p{Emoji_Modifier_Base})(?:\p{Emoji_Modifier})?/gu,
    (_, base) => base + modifier,
  );
}
