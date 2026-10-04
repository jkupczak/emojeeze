/**
 * @param {HTMLButtonElement} menuButton
 * @param {HTMLElement} menuPanel
 */
export function initOverflowMenuA11y(menuButton, menuPanel) {
  const items = () =>
    [...menuPanel.querySelectorAll(".overflow-menu__item")].filter(
      (el) => el instanceof HTMLButtonElement,
    );

  function focusItemAt(index) {
    const list = items();
    if (!list.length) return;
    const next = ((index % list.length) + list.length) % list.length;
    list[next].focus();
  }

  menuPanel.addEventListener("keydown", (event) => {
    if (menuPanel.hidden) return;
    const list = items();
    const currentIndex = list.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItemAt(currentIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItemAt(currentIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      list[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      list[list.length - 1]?.focus();
    }
  });

}
