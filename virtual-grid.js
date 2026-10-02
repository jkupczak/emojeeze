const DEFAULT_MIN_CELL = 52;
const ROW_GAP = 4;
const BUFFER_ROWS = 2;

/**
 * Virtualized emoji grid — mounts only visible rows (+ buffer).
 */
export class VirtualEmojiGrid {
  /**
   * @param {HTMLElement} container
   * @param {{
   *   getMinCellWidth?: () => number,
   *   createCell: (id: string) => HTMLElement,
   *   onPoolCell?: (cell: HTMLElement, id: string) => void,
   * }} options
   */
  constructor(container, options) {
    this.container = container;
    this.createCell = options.createCell;
    this.onPoolCell = options.onPoolCell ?? (() => {});
    this.getMinCellWidth = options.getMinCellWidth ?? (() => DEFAULT_MIN_CELL);

    this.items = [];
    this.columns = 1;
    this.rowHeight = DEFAULT_MIN_CELL;
    this.activeRows = new Map();

    this.viewport = document.createElement("div");
    this.viewport.className = "virtual-grid__viewport";

    this.spacer = document.createElement("div");
    this.spacer.className = "virtual-grid__spacer";

    this.windowEl = document.createElement("div");
    this.windowEl.className = "virtual-grid__window";

    this.viewport.append(this.spacer, this.windowEl);
    this.container.append(this.viewport);

    this.onScroll = this.onScroll.bind(this);
    this.onResize = this.onResize.bind(this);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onResize, { passive: true });

    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(this.container);

    this.cellPool = [];
  }

  setItems(ids) {
    this.items = ids;
    this.clearRows();
    this.onResize();
  }

  scrollToId(id) {
    const index = this.items.indexOf(id);
    if (index < 0) return;
    const row = Math.floor(index / this.columns);
    const top = this.container.offsetTop + row * (this.rowHeight + ROW_GAP);
    window.scrollTo({ top: top - 80, behavior: "smooth" });
  }

  refreshVisible() {
    for (const cells of this.activeRows.values()) {
      for (const cell of cells) {
        const id = cell.dataset.emojiId;
        if (id) this.onPoolCell(cell, id);
      }
    }
  }

  destroy() {
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onResize);
    this.resizeObserver.disconnect();
  }

  clearRows() {
    for (const cells of this.activeRows.values()) {
      for (const cell of cells) {
        cell.remove();
        this.cellPool.push(cell);
      }
    }
    this.activeRows.clear();
    this.windowEl.replaceChildren();
  }

  onResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const minCell = this.getMinCellWidth();
    this.columns = Math.max(1, Math.floor(width / minCell));
    this.rowHeight = minCell;
    const rows = Math.ceil(this.items.length / this.columns) || 0;
    this.spacer.style.height = `${rows * (this.rowHeight + ROW_GAP)}px`;
    this.onScroll();
  }

  onScroll() {
    if (this.items.length === 0) {
      this.clearRows();
      return;
    }

    const rect = this.container.getBoundingClientRect();
    const viewportTop = window.scrollY;
    const containerTop = viewportTop + rect.top;
    const scrollBottom = viewportTop + window.innerHeight;
    const containerBottom = containerTop + parseFloat(this.spacer.style.height || "0");

    if (scrollBottom < containerTop || viewportTop > containerBottom) {
      this.clearRows();
      return;
    }

    const relativeTop = Math.max(0, viewportTop - containerTop);
    const relativeBottom = Math.min(
      parseFloat(this.spacer.style.height || "0"),
      scrollBottom - containerTop,
    );

    const rowHeight = this.rowHeight + ROW_GAP;
    const startRow = Math.max(0, Math.floor(relativeTop / rowHeight) - BUFFER_ROWS);
    const endRow = Math.ceil(relativeBottom / rowHeight) + BUFFER_ROWS;

    const neededRows = new Set();
    for (let row = startRow; row <= endRow; row += 1) {
      neededRows.add(row);
    }

    for (const row of [...this.activeRows.keys()]) {
      if (!neededRows.has(row)) {
        const cells = this.activeRows.get(row) ?? [];
        for (const cell of cells) {
          cell.remove();
          this.cellPool.push(cell);
        }
        this.activeRows.delete(row);
      }
    }

    for (const row of neededRows) {
      if (this.activeRows.has(row)) continue;
      const cells = [];
      for (let col = 0; col < this.columns; col += 1) {
        const index = row * this.columns + col;
        if (index >= this.items.length) break;
        const id = this.items[index];
        const cell = this.cellPool.pop() ?? this.createCell(id);
        cell.dataset.emojiId = id;
        cell.style.position = "absolute";
        cell.style.left = `${(col * 100) / this.columns}%`;
        cell.style.width = `${100 / this.columns}%`;
        cell.style.top = `${row * rowHeight}px`;
        cell.style.height = `${this.rowHeight}px`;
        this.onPoolCell(cell, id);
        this.windowEl.appendChild(cell);
        cells.push(cell);
      }
      this.activeRows.set(row, cells);
    }

    this.windowEl.style.height = `${this.spacer.style.height}`;
  }
}
