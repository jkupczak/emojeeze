/** @typedef {"copy" | "activities" | "memory-match" | "write"} AppView */

/**
 * @param {{
 *   overflowMenuBtn: HTMLButtonElement;
 *   overflowMenuPanel: HTMLElement;
 *   activitiesHubEl: HTMLElement;
 *   memoryMatchRoot: HTMLElement;
 *   writeViewEl: HTMLElement;
 *   onViewChange?: (view: AppView, previous: AppView) => void;
 * }} options
 */
export function initAppNavigation(options) {
  const {
    overflowMenuBtn,
    overflowMenuPanel,
    activitiesHubEl,
    memoryMatchRoot,
    writeViewEl,
    onViewChange,
  } = options;

  /** @type {AppView} */
  let currentView = "copy";

  const menuItems = overflowMenuPanel.querySelectorAll("[data-app-view]");

  function closeOverflowMenu() {
    overflowMenuPanel.hidden = true;
    overflowMenuBtn.setAttribute("aria-expanded", "false");
  }

  function openOverflowMenu() {
    overflowMenuPanel.hidden = false;
    overflowMenuBtn.setAttribute("aria-expanded", "true");
    const firstItem = overflowMenuPanel.querySelector(".overflow-menu__item");
    if (firstItem instanceof HTMLElement) queueMicrotask(() => firstItem.focus());
  }

  function toggleOverflowMenu() {
    if (overflowMenuPanel.hidden) openOverflowMenu();
    else closeOverflowMenu();
  }

  /**
   * @param {AppView} view
   * @param {{ force?: boolean } | undefined} options
   */
  function setView(view, options = {}) {
    if (view === currentView && !options.force) {
      closeOverflowMenu();
      return;
    }

    const previous = currentView;
    currentView = view;
    closeOverflowMenu();

    document.body.dataset.view = view;

    activitiesHubEl.hidden = view !== "activities";
    memoryMatchRoot.hidden = view !== "memory-match";
    writeViewEl.hidden = view !== "write";

    onViewChange?.(view, previous);
  }

  overflowMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleOverflowMenu();
  });

  for (const item of menuItems) {
    item.addEventListener("click", () => {
      const view = item.getAttribute("data-app-view");
      if (view === "copy" || view === "activities" || view === "memory-match" || view === "write") {
        setView(view);
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (overflowMenuPanel.hidden) return;
    const target = event.target;
    if (target instanceof Node && overflowMenuPanel.contains(target)) return;
    if (target === overflowMenuBtn) return;
    closeOverflowMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overflowMenuPanel.hidden) {
      event.stopPropagation();
      closeOverflowMenu();
      overflowMenuBtn.focus();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const modeTile = target.closest("[data-app-view]");
    if (modeTile instanceof HTMLElement && !overflowMenuPanel.contains(modeTile)) {
      const view = modeTile.dataset.appView;
      if (view === "copy" || view === "activities" || view === "memory-match" || view === "write") {
        setView(view);
        return;
      }
    }

    const tile = target.closest("[data-activity]");
    if (!tile || !(tile instanceof HTMLElement)) return;
    if (tile.dataset.activity === "memory-match") setView("memory-match");
  });

  document.body.dataset.view = "copy";
  activitiesHubEl.hidden = true;
  memoryMatchRoot.hidden = true;
  writeViewEl.hidden = true;

  return { setView, getView: () => currentView, closeOverflowMenu };
}
