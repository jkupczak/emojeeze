# Emojeeze

**[emojeeze.com](https://emojeeze.com)** — search and copy emoji, compose with **Write with Emoji**, and play **Activities** like Memory Match.

Emojeeze is a fast, keyboard-friendly emoji app built as a static site. It works offline after the first visit (PWA + service worker), keeps your favorites and recent copies in the browser, and supports skin-tone preferences.

## Features

- **Copy an Emoji** — instant search with fuzzy matching, aliases, and `:shortcode:` syntax (e.g. `:joy:`)
- Live top-match preview; **Enter** in the search box copies or inserts the best result
- Full-width emoji grid with category browse (virtualized for performance)
- **Write with Emoji** — split view: compose text and tap emoji to insert at the caret (draft saved locally)
- **Activities** — Emoji Memory Match with difficulty levels and best-turn tracking
- Overflow menu for modes, plus **Activities & tools** tiles at the bottom of the catalog
- Favorites (star) and usage-weighted **Recent**, with pin and clear
- Global skin-tone picker; settings for hidden categories and emoji
- Optional fixed vertical AdSense rail on desktop (see configuration)
- Deep links: `?q=heart`, `?emoji=🔥`, `?mode=write`, `?mode=activities`, `?mode=memory-match` (legacy `?mode=games` → Activities)

## Local development

Requires [Node.js](https://nodejs.org/) (for the static server only).

```bash
cd emojeeze
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) (or [http://localhost:5173](http://localhost:5173)). Clipboard APIs need `http://localhost` or HTTPS—not `file://`.

**Troubleshooting 404**

1. Run commands from the project root.
2. After `npm run dev`, you should see `Emojeeze dev server running` in the terminal.
3. Port **5173** is often taken by another tool. Free it or use `npm run dev:3000`, then open http://localhost:3000/

## Scripts

| Command        | Description                          |
|----------------|--------------------------------------|
| `npm run dev`  | Serve the site on port 5173          |
| `npm test`     | Run unit tests                       |

## Configuration

### Site URL

Canonical and Open Graph URLs use the apex domain **`https://emojeeze.com`** (no `www`):

- `site-config.js` — `SITE_ORIGIN`
- `index.html` — `canonical`, `og:*`, Twitter meta tags
- `CNAME` — `emojeeze.com`
- `sitemap.xml` and `robots.txt`

### Google AdSense

Edit `ads-config.js` with your publisher ID (`ca-pub-…`) and ad slot ID. Ads load only when both are valid; the right-side rail is hidden on viewports under 1024px.

## Deploy

Deploy the project root as static files (Netlify, Cloudflare Pages, GitHub Pages, S3, etc.). Ensure:

- HTTPS is enabled on your chosen host
- Apex domain `emojeeze.com` redirects from `www` if both exist
- `sw.js` is served from the site root (same path as in the repo)

### Service worker cache

When you ship changes—especially new JS modules or renamed assets—**bump `CACHE_VERSION` in `sw.js`**. The install step precaches listed assets individually so one missing file does not fail the entire install.

## Project structure

| Path | Purpose |
|------|---------|
| `app.js` | Main UI orchestration, catalog, copy/insert flow |
| `app-navigation.js` | Overflow menu and view modes |
| `app-storage.js` | `localStorage` keys and legacy migration |
| `app-url.js` | URL / deep-link helpers for search and `mode` |
| `activities-tiles.js` | Activity & mode tiles for hub and catalog footer |
| `write-with-emoji.js` | Write mode caret insert and draft persistence |
| `memory-match.js` / `memory-match-logic.js` | Memory Match game UI and pure logic |
| `overflow-menu-a11y.js` | Keyboard navigation for overflow menu |
| `search.js` / `aliases.js` | Search index, fuzzy match, aliases |
| `skin-tone.js` | Fitzpatrick / ZWJ-aware tone application |
| `virtual-grid.js` | Windowed emoji rendering |
| `data-by-group.json` | Bundled emoji catalog |
| `manifest.webmanifest` / `sw.js` | PWA install and offline cache |

## Privacy

Favorites, recent emoji, skin tone, write drafts, memory-match bests, and similar settings are stored in **`localStorage`** on the user’s device. No account or backend is required for core functionality.

## License

All rights reserved unless a `LICENSE` file is added to this repository.
