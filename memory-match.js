import { readStoredItem, STORAGE_MEMORY_BEST } from "./app-storage.js";
import {
  buildDeckFromPairs,
  emojisMatch,
  pickEmojiPairs,
  recordBestTurns,
} from "./memory-match-logic.js";

const CARD_BACK = "❓";

/** @type {{ id: string; label: string; pairCount: number; cols: number }[]} */
export const MEMORY_DIFFICULTIES = [
  { id: "easy", label: "Easy", pairCount: 4, cols: 4 },
  { id: "medium", label: "Medium", pairCount: 6, cols: 4 },
  { id: "hard", label: "Hard", pairCount: 8, cols: 4 },
  { id: "expert", label: "Expert", pairCount: 10, cols: 5 },
];

/**
 * @param {HTMLElement} root
 * @param {{
 *   getEmojiPool: () => string[];
 *   onBack?: () => void;
 * }} options
 */
export function initMemoryMatch(root, options) {
  /** @type {string | null} */
  let difficultyId = "easy";
  /** @type {{ id: number; emoji: string; matched: boolean }[]} */
  let deck = [];
  /** @type {number[]} */
  let flippedIndices = [];
  let turns = 0;
  let lockBoard = false;
  let won = false;

  /** @type {Record<string, number>} */
  let bestByDifficulty = {};
  try {
    bestByDifficulty = JSON.parse(readStoredItem(STORAGE_MEMORY_BEST) ?? "{}");
  } catch {
    bestByDifficulty = {};
  }

  const shell = document.createElement("div");
  shell.className = "memory-match__shell";
  shell.innerHTML = `
    <header class="memory-match__header">
      <div class="memory-match__header-row">
        <button type="button" class="memory-match__back text-btn">← Activities</button>
        <h1 class="memory-match__title">Emoji Memory Match</h1>
      </div>
      <p class="memory-match__stats" aria-live="polite">
        <span class="memory-match__turns-label">Turns: <strong class="memory-match__turns">0</strong></span>
        <span class="memory-match__best-label"> · Best: <strong class="memory-match__best">—</strong></span>
      </p>
    </header>
    <div class="memory-match__setup">
      <p class="memory-match__setup-label">Difficulty</p>
      <div class="memory-match__difficulty" role="radiogroup" aria-label="Difficulty"></div>
      <button type="button" class="memory-match__new-game settings-btn settings-btn--primary">New game</button>
    </div>
    <div class="memory-match__board-wrap">
      <div class="memory-match__board" role="grid" aria-label="Memory match board"></div>
    </div>
    <div class="memory-match__win" hidden>
      <p class="memory-match__win-text"></p>
      <button type="button" class="memory-match__play-again settings-btn settings-btn--primary">Play again</button>
    </div>
  `;

  root.replaceChildren(shell);

  const backBtn = shell.querySelector(".memory-match__back");
  const difficultyHost = shell.querySelector(".memory-match__difficulty");
  const boardEl = shell.querySelector(".memory-match__board");
  const boardWrapEl = shell.querySelector(".memory-match__board-wrap");
  const turnsEl = shell.querySelector(".memory-match__turns");
  const bestEl = shell.querySelector(".memory-match__best");
  const newGameBtn = shell.querySelector(".memory-match__new-game");
  const winEl = shell.querySelector(".memory-match__win");
  const winTextEl = shell.querySelector(".memory-match__win-text");
  const playAgainBtn = shell.querySelector(".memory-match__play-again");

  if (
    !(backBtn instanceof HTMLButtonElement) ||
    !(difficultyHost instanceof HTMLElement) ||
    !(boardEl instanceof HTMLElement) ||
    !(boardWrapEl instanceof HTMLElement) ||
    !(turnsEl instanceof HTMLElement) ||
    !(bestEl instanceof HTMLElement) ||
    !(newGameBtn instanceof HTMLButtonElement) ||
    !(winEl instanceof HTMLElement) ||
    !(winTextEl instanceof HTMLElement) ||
    !(playAgainBtn instanceof HTMLButtonElement)
  ) {
    return;
  }

  backBtn.addEventListener("click", () => options.onBack?.());

  for (const level of MEMORY_DIFFICULTIES) {
    const id = `memory-difficulty-${level.id}`;
    const label = document.createElement("label");
    label.className = "memory-match__difficulty-option";
    label.innerHTML = `
      <input type="radio" name="memory-difficulty" id="${id}" value="${level.id}" />
      <span>${level.label}</span>
    `;
    const input = label.querySelector("input");
    if (input instanceof HTMLInputElement) {
      input.checked = level.id === difficultyId;
      input.addEventListener("change", () => {
        if (input.checked) {
          difficultyId = level.id;
          startGame();
        }
      });
    }
    difficultyHost.appendChild(label);
  }

  function getDifficulty() {
    return MEMORY_DIFFICULTIES.find((d) => d.id === difficultyId) ?? MEMORY_DIFFICULTIES[0];
  }

  function saveBestScores() {
    localStorage.setItem(STORAGE_MEMORY_BEST, JSON.stringify(bestByDifficulty));
  }

  function updateTurnsDisplay() {
    turnsEl.textContent = String(turns);
    const best = bestByDifficulty[difficultyId];
    bestEl.textContent = best === undefined ? "—" : String(best);
  }

  function startGame() {
    const level = getDifficulty();
    const pool = options.getEmojiPool();
    if (pool.length < level.pairCount) {
      boardEl.replaceChildren();
      const waiting = document.createElement("p");
      waiting.className = "memory-match__loading";
      waiting.textContent = "Loading emoji for the game…";
      boardWrapEl.hidden = false;
      winEl.hidden = true;
      return;
    }

    const pairs = pickEmojiPairs(pool, level.pairCount);
    deck = buildDeckFromPairs(pairs);
    flippedIndices = [];
    turns = 0;
    lockBoard = false;
    won = false;
    winEl.hidden = true;
    boardWrapEl.hidden = false;
    updateTurnsDisplay();
    renderBoard(level);
  }

  /**
   * @param {HTMLButtonElement} btn
   * @param {{ emoji: string; matched: boolean }} card
   * @param {{ flipped: boolean }} state
   */
  function syncCardA11y(btn, card, { flipped }) {
    const faceUp = flipped || card.matched;
    btn.setAttribute("aria-pressed", String(faceUp));
    if (card.matched) btn.setAttribute("aria-label", `Matched ${card.emoji}`);
    else if (flipped) btn.setAttribute("aria-label", `Revealed ${card.emoji}`);
    else btn.setAttribute("aria-label", "Face-down card");
  }

  /**
   * @param {{ cols: number; pairCount: number }} level
   */
  function renderBoard(level) {
    const rows = Math.ceil(deck.length / level.cols);
    boardEl.style.setProperty("--memory-cols", String(level.cols));
    boardEl.style.setProperty("--memory-rows", String(rows));
    boardEl.replaceChildren();

    deck.forEach((card, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "memory-card";
      btn.dataset.index = String(index);
      btn.setAttribute("role", "gridcell");
      btn.disabled = card.matched;

      const back = document.createElement("span");
      back.className = "memory-card__face memory-card__face--back";
      back.textContent = CARD_BACK;
      back.setAttribute("aria-hidden", "true");

      const front = document.createElement("span");
      front.className = "memory-card__face memory-card__face--front";
      front.textContent = card.emoji;
      front.setAttribute("aria-hidden", "true");

      btn.append(back, front);

      if (card.matched) btn.classList.add("is-matched", "is-flipped");
      syncCardA11y(btn, card, { flipped: card.matched });

      btn.addEventListener("click", () => onCardClick(index, btn));
      boardEl.append(btn);
    });
  }

  /**
   * @param {number} index
   * @param {HTMLButtonElement} btn
   */
  function onCardClick(index, btn) {
    if (lockBoard || won) return;
    const card = deck[index];
    if (!card || card.matched) return;
    if (flippedIndices.includes(index)) return;
    if (flippedIndices.length >= 2) return;

    btn.classList.add("is-flipped");
    syncCardA11y(btn, card, { flipped: true });
    flippedIndices.push(index);

    if (flippedIndices.length < 2) return;

    turns += 1;
    updateTurnsDisplay();
    lockBoard = true;

    const [firstIndex, secondIndex] = flippedIndices;
    const first = deck[firstIndex];
    const second = deck[secondIndex];
    const firstBtn = boardEl.querySelector(`[data-index="${firstIndex}"]`);
    const secondBtn = boardEl.querySelector(`[data-index="${secondIndex}"]`);

    if (emojisMatch(first.emoji, second.emoji)) {
      first.matched = true;
      second.matched = true;
      firstBtn?.classList.add("is-matched");
      secondBtn?.classList.add("is-matched");
      if (firstBtn instanceof HTMLButtonElement) syncCardA11y(firstBtn, first, { flipped: true });
      if (secondBtn instanceof HTMLButtonElement) syncCardA11y(secondBtn, second, { flipped: true });
      flippedIndices = [];
      lockBoard = false;

      if (deck.every((c) => c.matched)) {
        won = true;
        const improved = recordBestTurns(bestByDifficulty, difficultyId, turns);
        if (improved) saveBestScores();
        updateTurnsDisplay();
        const best = bestByDifficulty[difficultyId];
        winTextEl.textContent = `You win in ${turns} turn${turns === 1 ? "" : "s"}! Best for ${getDifficulty().label}: ${best}.`;
        winEl.hidden = false;
        boardWrapEl.hidden = true;
      }
      return;
    }

    window.setTimeout(() => {
      firstBtn?.classList.remove("is-flipped");
      secondBtn?.classList.remove("is-flipped");
      if (firstBtn instanceof HTMLButtonElement) syncCardA11y(firstBtn, first, { flipped: false });
      if (secondBtn instanceof HTMLButtonElement) syncCardA11y(secondBtn, second, { flipped: false });
      flippedIndices = [];
      lockBoard = false;
    }, 750);
  }

  newGameBtn.addEventListener("click", startGame);
  playAgainBtn.addEventListener("click", startGame);

  startGame();

  return { restart: startGame };
}
