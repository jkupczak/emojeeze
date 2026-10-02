import {
  buildSearchRecord,
  evaluateCatalog,
  getTopMatches,
  normalizeText,
  parseSearchQuery,
  scoreDisplayEmoji,
  scoreRecord,
} from "./search.js";
import { applySkinTone, SKIN_TONE_MODIFIERS, stripSkinTone } from "./skin-tone.js";
import { VirtualEmojiGrid } from "./virtual-grid.js";

const GROUPS_URL = "./data-by-group.json";

const STORAGE_SKIN_TONE = "emojeeze-skin-tone";
const STORAGE_RECENT = "emojeeze-recent";
const STORAGE_FAVORITES = "emojeeze-favorites";
const STORAGE_HAPTIC = "emojeeze-haptic";

const LEGACY_STORAGE = {
  [STORAGE_SKIN_TONE]: "emoji-copy-skin-tone",
  [STORAGE_RECENT]: "emoji-copy-recent",
  [STORAGE_FAVORITES]: "emoji-copy-favorites",
  [STORAGE_HAPTIC]: "emoji-copy-haptic",
};

function readStoredItem(key) {
  const value = localStorage.getItem(key);
  if (value !== null) return value;
  const legacyKey = LEGACY_STORAGE[key];
  if (!legacyKey) return null;
  const legacyValue = localStorage.getItem(legacyKey);
  if (legacyValue !== null) localStorage.setItem(key, legacyValue);
  return legacyValue;
}
const MAX_RECENT = 32;
const PREVIEW_LIMIT = 5;

const SKIN_TONE_OPTIONS = [
  { tone: 0, label: "Default skin tone", preview: "🖐️" },
  { tone: 1, label: "Light skin tone", preview: "🖐🏻" },
  { tone: 2, label: "Medium-light skin tone", preview: "🖐🏼" },
  { tone: 3, label: "Medium skin tone", preview: "🖐🏽" },
  { tone: 4, label: "Medium-dark skin tone", preview: "🖐🏾" },
  { tone: 5, label: "Dark skin tone", preview: "🖐🏿" },
];

const searchEl = document.getElementById("search");
const searchPreviewEl = document.getElementById("search-preview");
const catalogEl = document.getElementById("catalog");
const searchResultsSectionEl = document.getElementById("search-results-section");
const searchResultsHostEl = document.getElementById("search-results-host");
const yourListsSectionEl = document.getElementById("your-lists-section");
const yourListsGridEl = document.getElementById("your-lists-grid");
const favoritesSectionEl = document.getElementById("favorites-section");
const favoritesGridEl = document.getElementById("favorites-grid");
const recentSectionEl = document.getElementById("recent-section");
const recentGridEl = document.getElementById("recent-grid");
const clearRecentBtn = document.getElementById("clear-recent");
const skinTonePickerEl = document.getElementById("skin-tone-picker");
const statusEl = document.getElementById("status");
const resultsAnnouncerEl = document.getElementById("results-announcer");
const toastEl = document.getElementById("toast");

/** @type {ReturnType<typeof buildSearchRecord>[]} */
let catalog = [];
/** @type {Map<string, ReturnType<typeof buildSearchRecord>>} */
const catalogById = new Map();
/** @type {{ slug: string, name: string, ids: string[] }[]} */
let groupMetas = [];
/** @type {Map<string, VirtualEmojiGrid>} */
const browseGrids = new Map();
/** @type {VirtualEmojiGrid | null} */
let searchGrid = null;

/** @type {{ emoji: string, count: number, lastCopiedAt: number, pinned: boolean }[]} */
let recentEntries = [];
/** @type {{ id: string, toneIndex: number }[]} */
let favorites = [];

let skinToneIndex = 0;
let toastTimer = null;
let urlSyncTimer = null;
let highlightTimer = null;
/** @type {HTMLElement | null} */
let focusedEmojiBtn = null;
/** @type {ReturnType<typeof evaluateCatalog> | null} */
let lastEvaluation = null;

function isMobileCoarsePointer() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function migrateRecent(parsed) {
  if (!Array.isArray(parsed)) return [];
  if (parsed.length === 0) return [];
  if (typeof parsed[0] === "string") {
    const now = Date.now();
    return parsed.map((emoji, index) => ({
      emoji,
      count: 1,
      lastCopiedAt: now - index,
      pinned: false,
    }));
  }
  return parsed.filter(
    (entry) => entry && typeof entry.emoji === "string" && typeof entry.count === "number",
  );
}

function migrateFavorites(parsed) {
  if (!Array.isArray(parsed)) return [];
  if (parsed.length === 0) return [];
  if (typeof parsed[0] === "string") {
    return parsed.map((id) => ({ id, toneIndex: skinToneIndex }));
  }
  return parsed
    .filter((entry) => entry && typeof entry.id === "string")
    .map((entry) => ({
      id: entry.id,
      toneIndex: Number.isInteger(entry.toneIndex) ? entry.toneIndex : skinToneIndex,
    }));
}

function loadPreferences() {
  const storedTone = readStoredItem(STORAGE_SKIN_TONE);
  const parsedTone = storedTone === null ? 0 : Number.parseInt(storedTone, 10);
  skinToneIndex =
    Number.isInteger(parsedTone) && parsedTone >= 0 && parsedTone < SKIN_TONE_MODIFIERS.length
      ? parsedTone
      : 0;

  try {
    const storedRecent = readStoredItem(STORAGE_RECENT);
    recentEntries = migrateRecent(storedRecent ? JSON.parse(storedRecent) : []);
  } catch {
    recentEntries = [];
  }

  try {
    const storedFavorites = readStoredItem(STORAGE_FAVORITES);
    favorites = migrateFavorites(storedFavorites ? JSON.parse(storedFavorites) : []);
  } catch {
    favorites = [];
  }
}

function saveSkinTone() {
  localStorage.setItem(STORAGE_SKIN_TONE, String(skinToneIndex));
}

function saveRecent() {
  localStorage.setItem(STORAGE_RECENT, JSON.stringify(recentEntries));
}

function saveFavorites() {
  localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(favorites));
}

function sortRecentEntries() {
  recentEntries.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const scoreA = a.count * 1_000_000 + a.lastCopiedAt;
    const scoreB = b.count * 1_000_000 + b.lastCopiedAt;
    return scoreB - scoreA;
  });
}

function hapticEnabled() {
  const stored = readStoredItem(STORAGE_HAPTIC);
  if (stored !== null) return stored === "true";
  return isMobileCoarsePointer();
}

function triggerCopyHaptic() {
  if (!hapticEnabled() || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(12);
}

function displayForRecord(record, toneIndex = skinToneIndex) {
  return applySkinTone(record.emoji, toneIndex, record.skinToneSupport);
}

function displayForFavorite(favorite) {
  const record = catalogById.get(favorite.id);
  if (!record) return favorite.id;
  return displayForRecord(record, favorite.toneIndex);
}

function isFavorite(id) {
  return favorites.some((entry) => entry.id === id);
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  toastEl.classList.add("is-visible");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("is-visible");
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 200);
  }, 1600);
}

function announceResults(message) {
  statusEl.textContent = message;
  resultsAnnouncerEl.textContent = message;
}

function recordRecent(emoji) {
  const now = Date.now();
  const existing = recentEntries.find((entry) => entry.emoji === emoji);
  if (existing) {
    existing.count += 1;
    existing.lastCopiedAt = now;
  } else {
    recentEntries.push({ emoji, count: 1, lastCopiedAt: now, pinned: false });
  }
  sortRecentEntries();
  recentEntries = recentEntries.slice(0, MAX_RECENT);
  saveRecent();
  renderRecentBrowse();
  renderYourListsIfSearching();
}

async function copyEmoji(emoji) {
  const ok = await copyToClipboard(emoji);
  if (!ok) {
    showToast("Copy failed — try again");
    return;
  }
  triggerCopyHaptic();
  recordRecent(emoji);
  showToast(`Copied ${emoji}`);
}

function copyTopSearchMatch() {
  const top = getTopMatches(catalog, searchEl.value, 1)[0];
  if (!top) return;
  copyEmoji(displayForRecord(top));
}

function updateCatalogCell(cell, id) {
  const record = catalogById.get(id);
  if (!record || !cell) return;

  const btn = cell.querySelector(".emoji-btn");
  const pinBtn = cell.querySelector(".pin-btn");
  if (btn) {
    const display = displayForRecord(record);
    btn.textContent = display;
    btn.title = `${record.name} ${record.shortcode}`;
    btn.setAttribute("aria-label", `Copy ${record.name}`);
    btn.onclick = () => copyEmoji(display);
  }
  if (pinBtn) {
    const pinned = isFavorite(id);
    pinBtn.textContent = pinned ? "★" : "☆";
    pinBtn.setAttribute("aria-pressed", String(pinned));
    pinBtn.setAttribute(
      "aria-label",
      pinned ? "Remove from favorites" : "Add to favorites",
    );
    pinBtn.onclick = (event) => {
      event.stopPropagation();
      toggleFavorite(id);
    };
  }
}

function createCatalogCell(id) {
  const record = catalogById.get(id);
  const cell = document.createElement("div");
  cell.className = "emoji-cell";
  cell.dataset.emojiId = id;

  const pinned = isFavorite(id);
  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "pin-btn";
  pinBtn.dataset.pinFor = id;
  pinBtn.setAttribute("aria-label", pinned ? "Remove from favorites" : "Add to favorites");
  pinBtn.setAttribute("aria-pressed", String(pinned));
  pinBtn.textContent = pinned ? "★" : "☆";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "emoji-btn";
  btn.setAttribute("role", "option");
  btn.dataset.emojiId = id;

  cell.append(pinBtn, btn);
  updateCatalogCell(cell, id);
  return cell;
}

function refreshAllVirtualCells() {
  for (const grid of browseGrids.values()) grid.refreshVisible();
  searchGrid?.refreshVisible();
}

function createListOption(displayValue, label, { pinControls = null } = {}) {
  const item = document.createElement("div");
  item.className = "emoji-list-item";
  item.setAttribute("role", "presentation");

  if (pinControls) {
    item.append(...pinControls);
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "emoji-btn";
  btn.setAttribute("role", "option");
  btn.textContent = displayValue;
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.addEventListener("click", () => copyEmoji(displayValue));
  item.appendChild(btn);
  return item;
}

function renderFavoritesBrowse() {
  favoritesGridEl.replaceChildren();
  favoritesSectionEl.hidden = favorites.length === 0 || Boolean(normalizeText(searchEl.value));

  for (const favorite of favorites) {
    const record = catalogById.get(favorite.id);
    if (!record) continue;

    const display = displayForFavorite(favorite);

    const pinBtn = document.createElement("button");
    pinBtn.type = "button";
    pinBtn.className = "pin-btn pin-btn--visible";
    pinBtn.textContent = "★";
    pinBtn.setAttribute("aria-label", "Remove from favorites");
    pinBtn.setAttribute("aria-pressed", "true");
    pinBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(favorite.id);
    });

    favoritesGridEl.appendChild(
      createListOption(display, `Copy ${record.name}`, { pinControls: [pinBtn] }),
    );
  }
}

function renderRecentBrowse() {
  recentGridEl.replaceChildren();
  sortRecentEntries();
  recentSectionEl.hidden = recentEntries.length === 0 || Boolean(normalizeText(searchEl.value));

  for (const entry of recentEntries) {
    const baseId = stripSkinTone(entry.emoji);
    const record = catalogById.get(baseId);
    const label = record ? `Copy ${record.name}` : `Copy ${entry.emoji}`;

    const pinRecentBtn = document.createElement("button");
    pinRecentBtn.type = "button";
    pinRecentBtn.className = "pin-btn pin-btn--visible";
    pinRecentBtn.textContent = entry.pinned ? "📌" : "📍";
    pinRecentBtn.setAttribute("aria-label", entry.pinned ? "Unpin from recent" : "Pin in recent");
    pinRecentBtn.setAttribute("aria-pressed", String(entry.pinned));
    pinRecentBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleRecentPin(entry.emoji);
    });

    recentGridEl.appendChild(
      createListOption(entry.emoji, label, { pinControls: [pinRecentBtn] }),
    );
  }
}

function renderYourListsIfSearching() {
  const query = normalizeText(searchEl.value);
  const searching = Boolean(query);

  yourListsSectionEl.hidden = !searching;
  favoritesSectionEl.hidden = searching || favorites.length === 0;
  recentSectionEl.hidden = searching || recentEntries.length === 0;

  if (!searching) {
    yourListsGridEl.replaceChildren();
    renderFavoritesBrowse();
    renderRecentBrowse();
    return;
  }

  yourListsGridEl.replaceChildren();
  const parsed = parseSearchQuery(searchEl.value);
  /** @type {Map<string, { display: string, label: string, score: number }>} */
  const merged = new Map();

  for (const favorite of favorites) {
    const record = catalogById.get(favorite.id);
    if (!record) continue;
    const score = scoreRecord(record, searchEl.value, parsed);
    if (score <= 0) continue;
    const display = displayForFavorite(favorite);
    merged.set(`fav:${favorite.id}`, {
      display,
      label: `Copy ${record.name} from favorites`,
      score: score + 50,
    });
  }

  for (const entry of recentEntries) {
    const score = scoreDisplayEmoji(entry.emoji, searchEl.value, catalogById);
    if (score <= 0) continue;
    const baseId = stripSkinTone(entry.emoji);
    const record = catalogById.get(baseId);
    const label = record
      ? `Copy ${record.name} from recent`
      : `Copy ${entry.emoji} from recent`;
    const key = `recent:${entry.emoji}`;
    const boosted = score + (entry.pinned ? 40 : 0) + Math.min(entry.count, 10);
    const existing = merged.get(key);
    if (!existing || boosted > existing.score) {
      merged.set(key, { display: entry.emoji, label, score: boosted });
    }
  }

  const items = [...merged.values()].sort((a, b) => b.score - a.score);
  yourListsSectionEl.hidden = items.length === 0;

  for (const item of items) {
    yourListsGridEl.appendChild(createListOption(item.display, item.label));
  }
}

function toggleFavorite(id) {
  const index = favorites.findIndex((entry) => entry.id === id);
  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.push({ id, toneIndex: skinToneIndex });
  }
  saveFavorites();
  refreshAllVirtualCells();
  renderFavoritesBrowse();
  renderYourListsIfSearching();
}

function toggleRecentPin(emoji) {
  const entry = recentEntries.find((item) => item.emoji === emoji);
  if (!entry) return;
  entry.pinned = !entry.pinned;
  sortRecentEntries();
  saveRecent();
  renderRecentBrowse();
  renderYourListsIfSearching();
}

function clearRecent() {
  recentEntries = [];
  saveRecent();
  renderRecentBrowse();
  renderYourListsIfSearching();
}

function renderSearchPreview() {
  const query = normalizeText(searchEl.value);
  searchPreviewEl.replaceChildren();
  searchPreviewEl.hidden = !query;

  if (!query) return;

  const matches = getTopMatches(catalog, searchEl.value, PREVIEW_LIMIT);
  for (const [index, record] of matches.entries()) {
    const li = document.createElement("li");
    li.className = "search-preview__item";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "search-preview__btn";
    btn.setAttribute("role", "option");
    btn.id = `search-preview-${index}`;
    btn.dataset.index = String(index);

    const emojiSpan = document.createElement("span");
    emojiSpan.className = "search-preview__emoji";
    emojiSpan.textContent = displayForRecord(record);

    const meta = document.createElement("span");
    meta.className = "search-preview__meta";
    meta.textContent = `${record.name} · ${record.shortcode}`;

    btn.append(emojiSpan, meta);
    btn.addEventListener("click", () => copyEmoji(displayForRecord(record)));
    li.appendChild(btn);
    searchPreviewEl.appendChild(li);
  }

  searchEl.setAttribute("aria-expanded", matches.length > 0 ? "true" : "false");
}

function applyCatalogVisibility(evaluation) {
  lastEvaluation = evaluation;
  let visibleCount = 0;

  if (evaluation.mode === "browse") {
    searchResultsSectionEl.hidden = true;

    for (const meta of groupMetas) {
      const section = document.getElementById(`group-section-${meta.slug}`);
      section?.classList.remove("is-hidden");
      browseGrids.get(meta.slug)?.setItems(meta.ids);
      visibleCount += meta.ids.length;
    }
    searchGrid?.setItems([]);
  } else {
    searchResultsSectionEl.hidden = false;

    for (const meta of groupMetas) {
      const section = document.getElementById(`group-section-${meta.slug}`);
      section?.classList.add("is-hidden");
      browseGrids.get(meta.slug)?.setItems([]);
    }

    searchGrid?.setItems(evaluation.orderedIds);
    visibleCount = evaluation.orderedIds.length;
  }

  const message =
    evaluation.mode === "browse"
      ? `${visibleCount.toLocaleString()} emoji${visibleCount === 1 ? "" : "s"}`
      : visibleCount
        ? `${visibleCount.toLocaleString()} match${visibleCount === 1 ? "" : "es"}`
        : "No matches";

  announceResults(message);
  syncKeyboardFocusPool();
}

function filterEmojis() {
  const evaluation = evaluateCatalog(catalog, searchEl.value);
  applyCatalogVisibility(evaluation);
  renderSearchPreview();
  renderYourListsIfSearching();
  scheduleUrlSync();
}

function scheduleUrlSync() {
  if (urlSyncTimer) clearTimeout(urlSyncTimer);
  urlSyncTimer = setTimeout(syncUrlFromSearch, 120);
}

function syncUrlFromSearch() {
  const params = new URLSearchParams();
  const q = searchEl.value.trim();
  if (q) params.set("q", q);
  const next = params.toString() ? `?${params.toString()}` : `${location.pathname}`;
  history.replaceState(null, "", next);
}

function applyDeepLinks() {
  const params = new URLSearchParams(location.search);
  const q = params.get("q");
  const emojiParam = params.get("emoji");

  if (q) searchEl.value = q;

  if (emojiParam) {
    let decoded = emojiParam;
    try {
      decoded = decodeURIComponent(emojiParam);
    } catch {
      /* use raw */
    }
    if (decoded) {
      searchEl.value = decoded;
      queueMicrotask(() => highlightEmoji(decoded));
    }
  }
}

function highlightEmoji(displayValue) {
  const base = stripSkinTone(displayValue);
  if (lastEvaluation?.mode === "search") {
    searchGrid?.scrollToId(base);
  } else {
    const record = catalogById.get(base);
    if (record) {
      const meta = groupMetas.find((group) => group.ids.includes(base));
      if (meta) browseGrids.get(meta.slug)?.scrollToId(base);
    }
  }

  const cell = document.querySelector(`.emoji-cell[data-emoji-id="${CSS.escape(base)}"]`);
  if (!cell) return;
  cell.classList.add("is-highlighted");
  if (highlightTimer) clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => cell.classList.remove("is-highlighted"), 2200);
}

function getVisibleEmojiButtons() {
  const buttons = [
    ...document.querySelectorAll(
      "#search-preview .search-preview__btn, #your-lists-grid .emoji-btn, #favorites-grid .emoji-btn, #recent-grid .emoji-btn, #catalog .emoji-btn",
    ),
  ];
  return buttons.filter((btn) => btn.offsetParent !== null);
}

function syncKeyboardFocusPool() {
  const buttons = getVisibleEmojiButtons();
  if (focusedEmojiBtn && !buttons.includes(focusedEmojiBtn)) {
    focusedEmojiBtn.tabIndex = -1;
    focusedEmojiBtn = null;
  }
}

function focusEmojiButton(btn) {
  const buttons = getVisibleEmojiButtons();
  if (!buttons.length) return;
  if (focusedEmojiBtn) focusedEmojiBtn.tabIndex = -1;
  focusedEmojiBtn = btn ?? buttons[0];
  focusedEmojiBtn.tabIndex = 0;
  focusedEmojiBtn.focus();
}

function moveEmojiFocus(direction) {
  const buttons = getVisibleEmojiButtons();
  if (!buttons.length) return;
  const currentIndex = focusedEmojiBtn ? buttons.indexOf(focusedEmojiBtn) : -1;
  let nextIndex = currentIndex + direction;
  if (nextIndex < 0) nextIndex = buttons.length - 1;
  if (nextIndex >= buttons.length) nextIndex = 0;
  focusEmojiButton(buttons[nextIndex]);
}

function renderSkinTonePicker() {
  skinTonePickerEl.replaceChildren();

  for (const option of SKIN_TONE_OPTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skin-tone-btn";
    btn.textContent = option.preview;
    btn.title = option.label;
    btn.setAttribute("aria-label", option.label);
    btn.setAttribute("aria-pressed", String(option.tone === skinToneIndex));
    if (option.tone === skinToneIndex) btn.classList.add("is-selected");
    btn.addEventListener("click", () => {
      skinToneIndex = option.tone;
      saveSkinTone();
      renderSkinTonePicker();
      refreshAllVirtualCells();
      renderFavoritesBrowse();
      renderSearchPreview();
      renderYourListsIfSearching();
    });
    skinTonePickerEl.appendChild(btn);
  }
}

function buildCatalogDom(groups) {
  catalogEl.replaceChildren();
  browseGrids.clear();
  groupMetas = [];

  for (const group of groups) {
    const ids = [];
    for (const emojiItem of group.emojis) {
      const record = buildSearchRecord({
        emoji: emojiItem.emoji,
        name: emojiItem.name,
        slug: emojiItem.slug,
        group: group.name,
        skinToneSupport: Boolean(emojiItem.skin_tone_support),
      });
      catalog.push(record);
      catalogById.set(record.id, record);
      ids.push(record.id);
    }

    groupMetas.push({ slug: group.slug, name: group.name, ids });

    const section = document.createElement("section");
    section.className = "emoji-section catalog-section";
    section.id = `group-section-${group.slug}`;

    const title = document.createElement("h2");
    title.className = "section-title";
    title.id = `group-${group.slug}`;
    title.textContent = group.name;

    const host = document.createElement("div");
    host.className = "catalog-grid-host";
    host.setAttribute("role", "listbox");
    host.setAttribute("aria-labelledby", title.id);

    const grid = new VirtualEmojiGrid(host, {
      createCell: (id) => createCatalogCell(id),
      onPoolCell: (cell, id) => updateCatalogCell(cell, id),
    });
    browseGrids.set(group.slug, grid);
    grid.setItems(ids);

    section.append(title, host);
    catalogEl.appendChild(section);
  }

  searchGrid = new VirtualEmojiGrid(searchResultsHostEl, {
    createCell: (id) => createCatalogCell(id),
    onPoolCell: (cell, id) => updateCatalogCell(cell, id),
  });
  searchResultsHostEl.setAttribute("role", "listbox");
  searchResultsHostEl.setAttribute(
    "aria-labelledby",
    "search-results-heading",
  );

}

async function loadCatalog() {
  announceResults("Loading emoji…");
  const response = await fetch(GROUPS_URL);
  if (!response.ok) throw new Error("Failed to load emoji data");
  const groups = await response.json();
  buildCatalogDom(groups);
  renderFavoritesBrowse();
  renderRecentBrowse();
  applyDeepLinks();
  filterEmojis();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {
    /* optional */
  });
}

searchEl.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    searchEl.value = "";
    filterEmojis();
    return;
  }
  if (event.key === "Enter" && document.activeElement === searchEl) {
    event.preventDefault();
    copyTopSearchMatch();
    return;
  }
  if (event.key === "ArrowDown" && document.activeElement === searchEl) {
    event.preventDefault();
    focusEmojiButton();
    return;
  }
  queueMicrotask(filterEmojis);
});

searchEl.addEventListener("input", filterEmojis);

clearRecentBtn.addEventListener("click", clearRecent);

document.addEventListener("keydown", (event) => {
  if (event.target === searchEl) return;

  const isEmojiFocused =
    event.target?.classList?.contains("emoji-btn") ||
    event.target?.classList?.contains("search-preview__btn");
  if (!isEmojiFocused && event.key !== "/") return;

  if (event.key === "/" && document.activeElement !== searchEl) {
    event.preventDefault();
    searchEl.focus();
    return;
  }

  if (!isEmojiFocused) return;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    moveEmojiFocus(1);
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    moveEmojiFocus(-1);
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    event.target.click();
  }
});

loadPreferences();
renderSkinTonePicker();
registerServiceWorker();

loadCatalog().catch(() => {
  announceResults("Could not load emoji data.");
});

searchEl.focus();
