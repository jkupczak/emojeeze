/**
 * @template T
 * @param {T[]} items
 */
export function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * @param {string[]} pool
 * @param {number} pairCount
 */
export function pickEmojiPairs(pool, pairCount) {
  const unique = [...new Set(pool)].filter(Boolean);
  if (unique.length < pairCount) {
    throw new Error("Not enough emoji in catalog for this difficulty.");
  }
  return shuffle(unique).slice(0, pairCount);
}

/**
 * @param {string[]} pairs
 */
export function buildDeckFromPairs(pairs) {
  return shuffle(
    pairs.flatMap((emoji, index) => [
      { id: index * 2, emoji, matched: false },
      { id: index * 2 + 1, emoji, matched: false },
    ]),
  );
}

/**
 * @param {string} a
 * @param {string} b
 */
export function emojisMatch(a, b) {
  return a === b;
}

/**
 * @param {Record<string, number>} bestByDifficulty
 * @param {string} difficultyId
 * @param {number} turns
 */
export function recordBestTurns(bestByDifficulty, difficultyId, turns) {
  const prev = bestByDifficulty[difficultyId];
  if (prev === undefined || turns < prev) {
    bestByDifficulty[difficultyId] = turns;
    return true;
  }
  return false;
}
