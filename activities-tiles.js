/** @type {{ id: string; emoji: string; name: string; hint: string }[]} */
export const ACTIVITY_GAME_TILES = [
  {
    id: "memory-match",
    emoji: "🧩",
    name: "Emoji Memory Match",
    hint: "Match pairs of emoji",
  },
];

/** @type {{ view: string; emoji: string; name: string; hint: string }[]} */
export const ACTIVITY_MODE_TILES = [
  {
    view: "write",
    emoji: "✍️",
    name: "Write with Emoji",
    hint: "Compose text and insert emoji",
  },
];

/**
 * @param {HTMLElement} container
 * @param {{ includeAppModes?: boolean } | undefined} options
 */
export function mountActivityTiles(container, options = {}) {
  container.replaceChildren();

  if (options.includeAppModes) {
    for (const mode of ACTIVITY_MODE_TILES) {
      container.append(createModeTile(mode));
    }
  }

  for (const game of ACTIVITY_GAME_TILES) {
    container.append(createGameTile(game));
  }
}

/**
 * @param {{ view: string; emoji: string; name: string; hint: string }} mode
 */
function createModeTile(mode) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "activity-tile";
  btn.dataset.appView = mode.view;
  return appendTileContent(btn, mode);
}

/**
 * @param {{ id: string; emoji: string; name: string; hint: string }} game
 */
function createGameTile(game) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "activity-tile";
  btn.dataset.activity = game.id;
  return appendTileContent(btn, game);
}

/**
 * @param {HTMLButtonElement} btn
 * @param {{ emoji: string; name: string; hint: string }} tile
 */
function appendTileContent(btn, tile) {
  const emoji = document.createElement("span");
  emoji.className = "activity-tile__emoji";
  emoji.setAttribute("aria-hidden", "true");
  emoji.textContent = tile.emoji;

  const name = document.createElement("span");
  name.className = "activity-tile__name";
  name.textContent = tile.name;

  const hint = document.createElement("span");
  hint.className = "activity-tile__hint";
  hint.textContent = tile.hint;

  btn.append(emoji, name, hint);
  return btn;
}
