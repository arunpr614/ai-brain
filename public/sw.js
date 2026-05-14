/*
 * Brain app-shell service worker (v0.5.6).
 *
 * Why this exists: Capacitor's APK is a thin WebView pointed at
 * server.url=https://brain.arunp.in. With no SW, cold-start offline =
 * net::ERR_INTERNET_DISCONNECTED — the share-handler / outbox code never
 * loads, so the entire v0.6.x offline-mode feature is unreachable on the
 * device. This SW caches the app shell + visited pages + Next static
 * chunks so the WebView can hydrate offline and the outbox path runs.
 *
 * Plan: docs/plans/v0.5.6-app-shell-sw.md (SHELL-1).
 *
 * Strategy by route family:
 *   - precache URLs (/offline.html, /favicon.ico) → installed at SW
 *     activation; auth-public so cache.add never rejects on a redirect
 *   - shell runtime URLs (/, /inbox, /share-target, /capture) → not
 *     precached (middleware redirects unauthenticated SW fetches);
 *     populated lazily into shell-v1 on first authenticated visit
 *     via stale-while-revalidate
 *   - other HTML pages (/items/:id) → stale-while-revalidate into pages-v1 (fills lazily)
 *   - /_next/static/** → cache-first into static-v1 (Next hashes filenames)
 *   - /api/** → network-only (outbox handles transient errors; SW must NOT proxy)
 *   - everything else → network-first → fall through to /offline.html on HTML accept
 *
 * Bump SHELL_CACHE / STATIC_CACHE / PAGES_CACHE version when entries
 * change shape; activate event purges any cache whose name doesn't match.
 */

const SHELL_CACHE = "brain-shell-v1";
const STATIC_CACHE = "brain-static-v1";
const PAGES_CACHE = "brain-pages-v1";
const KNOWN_CACHES = [SHELL_CACHE, STATIC_CACHE, PAGES_CACHE];

// Precache only auth-public, static URLs. Protected routes (/, /inbox,
// /share-target, /capture) are middleware-gated — they redirect to
// /unlock when the SW fetches them without the user's session cookie,
// which makes cache.add reject. Those routes are populated lazily into
// PAGES_CACHE on first authenticated visit (stale-while-revalidate).
//
// Empirical evidence (2026-05-14): cache.addAll on the original 6-URL
// list rejected with "Failed to execute 'addAll' on 'Cache': Request
// failed", which prevented SW activation. See
// docs/research/inspect-webview-output-2026-05-14.md.
const PRECACHE_URLS = ["/offline.html", "/favicon.ico"];

const NETWORK_ONLY_PATHS = [
  "/api/",
  "/_next/image",
  "/unlock",
  "/setup-apk",
  "/auth/",
];

const PAGES_PATTERN = /^\/items\/[^/]+(?:\/|$)/;

// Routes whose HTML we still serve stale-while-revalidate from
// SHELL_CACHE (populated lazily on first visit). cache hits here let
// offline cold-launch render the library / share-target / inbox
// chrome even though we don't precache them at install time.
const SHELL_RUNTIME_PATHS = ["/", "/inbox", "/share-target", "/capture"];

function isShellUrl(pathname) {
  if (PRECACHE_URLS.includes(pathname)) return true;
  if (SHELL_RUNTIME_PATHS.includes(pathname)) return true;
  return false;
}

function isStaticAsset(pathname) {
  return pathname.startsWith("/_next/static/");
}

function isNetworkOnly(pathname) {
  return NETWORK_ONLY_PATHS.some((p) => pathname.startsWith(p));
}

function isCacheablePage(pathname) {
  if (isShellUrl(pathname)) return true;
  if (PAGES_PATTERN.test(pathname)) return true;
  return false;
}

function acceptsHtml(request) {
  return (request.headers.get("Accept") || "").includes("text/html");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Per-URL try/catch so one failure doesn't abort the whole install.
      // addAll() is all-or-nothing; cache.add() per URL with catch lets
      // partial precaches succeed.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (err) {
            // Non-fatal — install continues with whatever cached.
            // Self-log via console for chrome://inspect debugging.
            // eslint-disable-next-line no-console
            console.warn("[brain-sw] precache failed:", url, err?.message);
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("brain-") && !KNOWN_CACHES.includes(n))
          .map((n) => caches.delete(n)),
      );
      // claim() makes this SW the controller for ALL existing clients,
      // including the page that just registered it. Without this the
      // registering page stays uncontrolled until a navigation, which
      // means the first offline cold-start has no SW interception.
      await self.clients.claim();
    })(),
  );
});

// ignoreVary because Next.js sends Vary: rsc, next-router-state-tree,
// next-router-prefetch, next-router-segment-prefetch — header values
// always differ between SW-stored response and fresh navigation, so
// strict Vary matching causes 100% cache miss on /, /inbox, etc.
// ignoreSearch because RSC payloads are stored under the same path with
// ?_rsc=<hash>; we want a navigation to / to match the bare / cache key.
const MATCH_OPTS = { ignoreVary: true, ignoreSearch: true };

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, MATCH_OPTS);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type !== "opaque") {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);
  if (cached) return cached;
  const network = await networkPromise;
  if (network) return network;
  return offlineFallback(request);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, MATCH_OPTS);
  if (cached) return cached;
  try {
    const network = await fetch(request);
    if (network && network.ok) {
      cache.put(request, network.clone()).catch(() => {});
    }
    return network;
  } catch {
    return offlineFallback(request);
  }
}

async function networkOnly(request) {
  return fetch(request);
}

async function offlineFallback(request) {
  if (acceptsHtml(request)) {
    const cache = await caches.open(SHELL_CACHE);
    const fallback = await cache.match("/offline.html");
    if (fallback) return fallback;
  }
  return new Response("", { status: 504, statusText: "offline" });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;

  if (isNetworkOnly(path)) {
    event.respondWith(networkOnly(request));
    return;
  }
  if (isStaticAsset(path)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (isShellUrl(path)) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }
  if (isCacheablePage(path)) {
    event.respondWith(staleWhileRevalidate(request, PAGES_CACHE));
    return;
  }
  if (acceptsHtml(request)) {
    event.respondWith(
      fetch(request).catch(() => offlineFallback(request)),
    );
    return;
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});
