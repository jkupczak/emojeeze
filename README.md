# Emojeeze

**[emojeeze.com](https://emojeeze.com)** — search emoji and copy them to your clipboard in one click.

Emojeeze is a fast, keyboard-friendly emoji picker built as a static site. It works offline after the first visit (PWA + service worker), keeps your favorites and recent copies in the browser, and supports skin-tone preferences.

## Features

- Instant search with fuzzy matching, aliases, and `:shortcode:` syntax (e.g. `:joy:`)
- Live top-match preview; **Enter** in the search box copies the best result
- Full-width emoji grid with category browse
- One-click copy with clipboard fallback
- Favorites (star) and usage-weighted **Recent**, with pin and clear
- Per-favorite skin tone; global skin-tone picker
- Virtualized catalog for smooth scrolling on large lists
- Optional fixed vertical AdSense rail on desktop (see configuration)
- Deep links: `?q=heart`, `?emoji=🔥`

## Local development

Requires [Node.js](https://nodejs.org/) (for the static server only).

```bash
cd emojeeze
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) (or [http://localhost:5173](http://localhost:5173)). Clipboard APIs need `http://localhost` or HTTPS—not `file://`.

**Troubleshooting 404**

1. Run commands from **`~/Programming/emojeeze`** (not the old `emoji-copy` folder).
2. After `npm run dev`, you should see `Emojeeze dev server running` in the terminal. If you don’t, the server isn’t started.
3. Port **5173** is often taken by another tool (e.g. Vite). Free it or use another port:

   ```bash
   lsof -i :5173
   kill <PID>
   # or
   npm run dev:3000
   ```

   Then open http://localhost:3000/

## Scripts

| Command        | Description                          |
|----------------|--------------------------------------|
| `npm run dev`  | Serve the site on port 5173          |
| `npm test`     | Run skin-tone unit tests             |

## Configuration

### Site URL

Canonical and Open Graph URLs are set in:

- `site-config.js` — `SITE_ORIGIN`
- `index.html` — `canonical`, `og:*`, Twitter meta tags
- `sitemap.xml` and `robots.txt`

Update these if your production domain differs from `https://emojeeze.com`.

### Google AdSense

Edit `ads-config.js` with your publisher ID (`ca-pub-…`) and ad slot ID. Ads load only when both are valid; the right-side rail is hidden on viewports under 1024px. AdSense requires a live, approved domain.

## Deploy

Deploy the project root as static files (Netlify, Cloudflare Pages, GitHub Pages, S3, etc.). Ensure:

- HTTPS is enabled
- `sw.js` is served from the site root (same path as in the repo)
- SPA-style hosts serve `index.html` for unknown paths if you add routes later

After deploy, bump `CACHE_VERSION` in `sw.js` when you ship breaking cache updates.

## Project structure

| Path | Purpose |
|------|---------|
| `app.js` | UI, storage, virtual grids, copy flow |
| `search.js` / `aliases.js` | Search index, fuzzy match, aliases |
| `skin-tone.js` | Fitzpatrick / ZWJ-aware tone application |
| `virtual-grid.js` | Windowed emoji rendering |
| `data-by-group.json` | Bundled emoji catalog |
| `manifest.webmanifest` / `sw.js` | PWA install and offline cache |

## Privacy

Favorites, recent emoji, skin tone, and similar settings are stored in **`localStorage`** on the user’s device. No account or backend is required for core functionality.

## License

All rights reserved unless a `LICENSE` file is added to this repository.
