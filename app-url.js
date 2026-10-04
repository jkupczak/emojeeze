/** @typedef {"copy" | "activities" | "memory-match" | "write"} AppView */

const VALID_MODES = new Set(["copy", "activities", "memory-match", "write"]);

/**
 * @param {string | null | undefined} raw
 * @returns {AppView | null}
 */
export function parseModeParam(raw) {
  if (!raw) return null;
  if (raw === "games") return "activities";
  if (VALID_MODES.has(raw)) return /** @type {AppView} */ (raw);
  return null;
}

/**
 * @param {{ q?: string; view?: AppView }} state
 */
export function buildAppUrl(state) {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.view && state.view !== "copy") params.set("mode", state.view);
  const query = params.toString();
  return query ? `?${query}` : `${location.pathname}`;
}

/**
 * @param {{ searchValue: string; view: AppView }} state
 */
export function replaceAppUrl(state) {
  const next = buildAppUrl({ q: state.searchValue.trim() || undefined, view: state.view });
  history.replaceState(null, "", next);
}

/**
 * @param {URLSearchParams} params
 */
export function readDeepLinkState(params) {
  const q = params.get("q");
  const mode = parseModeParam(params.get("mode"));
  const emojiParam = params.get("emoji");
  return { q, mode, emojiParam };
}
