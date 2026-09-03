/* Transit PWA service worker — hand-rolled (no build step, Turbopack-friendly).
 *
 * Responsibilities:
 *  1. Precache the app shell so the UI opens with no network.
 *  2. Runtime caching: cache-first for static assets + map tiles,
 *     network-first for page navigations with an /offline fallback.
 *  3. Background Sync: replay the IndexedDB "outbox" (writes made offline).
 *  4. Web Push: show notifications + focus/open the right screen on click.
 *
 * Bump CACHE_VERSION whenever this file or the shell list changes — the old
 * caches are dropped on activate.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `transit-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `transit-static-${CACHE_VERSION}`;
const TILE_CACHE = `transit-tiles-${CACHE_VERSION}`;
const OWNED = new Set([SHELL_CACHE, STATIC_CACHE, TILE_CACHE]);

/* Small, stable set — the routed screens are network-first and self-heal. */
const SHELL_ASSETS = ["/", "/offline", "/manifest.webmanifest", "/icon.svg"];

const TILE_HOSTS = new Set([
  "api.maptiler.com",
  "a.tile.openstreetmap.org",
  "b.tile.openstreetmap.org",
  "c.tile.openstreetmap.org",
  "tile.openstreetmap.org",
]);
const TILE_CACHE_LIMIT = 400;

// ---------------------------------------------------------------------------
// install / activate
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !OWNED.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// ---------------------------------------------------------------------------
// fetch strategies
// ---------------------------------------------------------------------------

const trimCache = async (name, limit) => {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  for (const key of keys.slice(0, keys.length - limit)) await cache.delete(key);
};

const cacheFirst = async (request, cacheName, limit) => {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) {
    cache.put(request, res.clone());
    if (limit) trimCache(cacheName, limit);
  }
  return res;
};

const staleWhileRevalidate = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || (await network) || fetch(request);
};

const networkFirstPage = async (request) => {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (
      (await cache.match(request)) ||
      (await cache.match("/offline")) ||
      Response.error()
    );
  }
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Map tiles (cross-origin) — cache-first, capped.
  if (TILE_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirst(request, TILE_CACHE, TILE_CACHE_LIMIT));
    return;
  }

  // Anything else cross-origin (the API on :5000, uploads, analytics) — leave it.
  if (url.origin !== self.location.origin) return;

  // Page navigations — network-first so content stays fresh, /offline as backstop.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // Build output — immutable, safe to serve from cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Other same-origin assets (icons, fonts, svg) — stale-while-revalidate.
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style" ||
    request.destination === "script"
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});

// ---------------------------------------------------------------------------
// Background Sync — replay the offline write queue
// ---------------------------------------------------------------------------

const OUTBOX_DB = "transit-offline";
const OUTBOX_STORE = "outbox";

const idb = {
  open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(OUTBOX_DB);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  all(dbc) {
    return new Promise((resolve, reject) => {
      const tx = dbc.transaction(OUTBOX_STORE, "readonly");
      const req = tx.objectStore(OUTBOX_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },
  delete(dbc, id) {
    return new Promise((resolve, reject) => {
      const tx = dbc.transaction(OUTBOX_STORE, "readwrite");
      tx.objectStore(OUTBOX_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};

async function replayOutbox() {
  // Prefer an open tab: it has a live (refreshable) access token.
  const wins = await self.clients.matchAll({ includeUncontrolled: true });
  if (wins.length) {
    wins.forEach((w) => w.postMessage({ type: "flush-outbox" }));
    return;
  }

  // No tab — replay directly with the token seeded when each entry was queued.
  let dbc;
  try {
    dbc = await idb.open();
  } catch {
    return;
  }
  const entries = (await idb.all(dbc)).sort((a, b) => a.createdAt - b.createdAt);
  for (const entry of entries) {
    try {
      const res = await fetch(entry.url, {
        method: entry.method,
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(entry.headers || {}) },
        body: entry.body || undefined,
      });
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        await idb.delete(dbc, entry.id);
      }
    } catch {
      /* still offline — keep it for the next sync */
    }
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "transit-outbox") event.waitUntil(replayOutbox());
});

// ---------------------------------------------------------------------------
// Web Push  (unchanged contract — server sends { title, body, tag, data.url })
// ---------------------------------------------------------------------------

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Transit", body: event.data && event.data.text() };
  }
  const title = payload.title || "Transit";
  const options = {
    body: payload.body || "",
    tag: payload.tag || payload.type || "transit",
    data: payload.data || {},
    icon: "/icon.svg",
    badge: "/icon.svg",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        const hit = wins.find((w) => w.url.includes(url));
        if (hit) return hit.focus();
        return self.clients.openWindow(url);
      })
  );
});
