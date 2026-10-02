import { QUERY_TO_SLUGS, SLUG_ALIASES } from "./aliases.js";
import { FLAG_QUERY_TO_SLUGS, FLAG_SLUG_ALIASES } from "./flag-aliases.js";

const FLAG_PREFIX = "flag_";
const MERGED_QUERY_TO_SLUGS = { ...FLAG_QUERY_TO_SLUGS, ...QUERY_TO_SLUGS };

export function normalizeText(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * @returns {{ normalized: string, shortcodeSlug: string | null }}
 */
export function parseSearchQuery(raw) {
  const trimmed = raw.trim();
  const fullShortcode = trimmed.match(/^:([a-z0-9_+-]+):$/i);
  if (fullShortcode) {
    const slug = fullShortcode[1].toLowerCase().replace(/-/g, "_");
    return { normalized: slug.replace(/_/g, " "), shortcodeSlug: slug };
  }

  const looseShortcode = trimmed.match(/^:([a-z0-9_+-]+)$/i);
  if (looseShortcode) {
    const slug = looseShortcode[1].toLowerCase().replace(/-/g, "_");
    return { normalized: slug.replace(/_/g, " "), shortcodeSlug: slug };
  }

  return { normalized: normalizeText(trimmed), shortcodeSlug: null };
}

function addTerms(set, value) {
  const normalized = normalizeText(value);
  if (!normalized) return;
  set.add(normalized);
  for (const word of normalized.split(/[\s_\-]+/)) {
    if (word.length > 1) set.add(word);
  }
  const shortcode = `:${normalized.replace(/\s+/g, "_")}:`;
  set.add(shortcode);
}

function flagTermsFromSlug(slug) {
  if (!slug.startsWith(FLAG_PREFIX)) return [];
  const body = slug.slice(FLAG_PREFIX.length);
  return body.split("_").filter((part) => part.length > 1);
}

function levenshtein(a, b, maxDistance) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > maxDistance) return maxDistance + 1;
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

function isSubsequence(needle, haystack) {
  if (needle.length === 0) return true;
  let i = 0;
  for (const char of haystack) {
    if (char === needle[i]) i += 1;
    if (i === needle.length) return true;
  }
  return false;
}

function tokenScore(token, record) {
  if (token.length === 0) return 0;

  if (record.searchBlob.includes(token)) return 100;

  for (const word of record.searchWords) {
    if (word === token) return 95;
    if (word.startsWith(token)) return 90;
    if (word.includes(token)) return 85;
  }

  if (token.length <= 2) return 0;

  let best = 0;
  for (const word of record.searchWords) {
    if (word.length < 2) continue;
    if (isSubsequence(token, word)) best = Math.max(best, 55);

    const maxDist = token.length <= 4 ? 1 : 2;
    const distance = levenshtein(token, word, maxDist);
    if (distance <= maxDist) {
      best = Math.max(best, 70 - distance * 20);
    }
  }
  return best;
}

/**
 * @param {{ emoji: string, name: string, slug: string, group: string, skinToneSupport: boolean }} item
 */
export function buildSearchRecord(item) {
  const terms = new Set();
  addTerms(terms, item.name);
  addTerms(terms, item.slug);
  addTerms(terms, item.group);
  addTerms(terms, item.emoji);
  addTerms(terms, `:${item.slug}:`);

  for (const alias of SLUG_ALIASES[item.slug] ?? []) {
    addTerms(terms, alias);
  }
  for (const alias of FLAG_SLUG_ALIASES[item.slug] ?? []) {
    addTerms(terms, alias);
  }
  for (const flagTerm of flagTermsFromSlug(item.slug)) {
    addTerms(terms, flagTerm);
  }

  const searchWords = [...terms];
  return {
    ...item,
    id: item.emoji,
    searchWords,
    searchBlob: searchWords.join(" "),
    shortcode: `:${item.slug}:`,
  };
}

export function scoreRecord(record, rawQuery, parsed = parseSearchQuery(rawQuery)) {
  const { normalized, shortcodeSlug } = parsed;
  if (!normalized) return 1;

  if (shortcodeSlug) {
    if (record.slug === shortcodeSlug) return 5000;
    if (record.slug.startsWith(shortcodeSlug) || shortcodeSlug.startsWith(record.slug)) {
      return 2500;
    }
  }

  const slugBoosts = MERGED_QUERY_TO_SLUGS[normalized];
  if (slugBoosts?.includes(record.slug)) return 1000;

  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length === 0) return 0;

  let total = 0;
  for (const token of tokens) {
    const score = tokenScore(token, record);
    if (score === 0) return 0;
    total += score;
  }
  return total;
}

/**
 * @param {ReturnType<typeof buildSearchRecord>[]} catalog
 */
export function evaluateCatalog(catalog, rawQuery) {
  const parsed = parseSearchQuery(rawQuery);
  if (!parsed.normalized) {
    return { mode: "browse", parsed };
  }

  const scored = [];
  for (const record of catalog) {
    const score = scoreRecord(record, rawQuery, parsed);
    if (score > 0) scored.push({ id: record.id, score, record });
  }

  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  return {
    mode: "search",
    parsed,
    visibleIds: new Set(scored.map((entry) => entry.id)),
    orderedIds: scored.map((entry) => entry.id),
    scored,
  };
}

export function getTopMatches(catalog, rawQuery, limit = 5) {
  const evaluation = evaluateCatalog(catalog, rawQuery);
  if (evaluation.mode === "browse") return [];
  return evaluation.scored.slice(0, limit).map((entry) => entry.record);
}

export function scoreDisplayEmoji(displayEmoji, rawQuery, catalogById) {
  const base = displayEmoji.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "");
  const record = catalogById.get(base);
  if (!record) {
    const parsed = parseSearchQuery(rawQuery);
    return parsed.normalized && displayEmoji.includes(parsed.normalized) ? 50 : 0;
  }
  return scoreRecord(record, rawQuery);
}
