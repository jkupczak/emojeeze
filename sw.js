const CACHE_VERSION = "emojeeze-v10";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./app-storage.js",
  "./app-url.js",
  "./app-navigation.js",
  "./activities-tiles.js",
  "./memory-match.js",
  "./memory-match-logic.js",
  "./write-with-emoji.js",
  "./overflow-menu-a11y.js",
  "./search.js",
  "./aliases.js",
  "./flag-aliases.js",
  "./skin-tone.js",
  "./virtual-grid.js",
  "./site-config.js",
  "./ads-config.js",
  "./ads.js",
  "./data-by-group.json",
  "./data-by-emoji.json",
  "./manifest.webmanifest",
  "./favicon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./robots.txt",
  "./sitemap.xml",
];

/**
 * @param {Cache} cache
 * @param {string[]} urls
 */
async function addAllSafe(cache, urls) {
  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) await cache.put(url, response);
      } catch {
        /* skip missing assets */
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => addAllSafe(cache, ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    }),
  );
});
