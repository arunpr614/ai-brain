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
 *   - shell URLs (/, /inbox, /share-target, /capture, /offline.html, /favicon.ico)
 *     → precached at install via shell-v1 cache, served stale-while-revalidate
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

const SHELL_URLS = [
  "/",
  "/inbox",
  "/share-target",
  "/capture",
  "/offline.html",
  "/favicon.ico",
];

const NETWORK_ONLY_PATHS = [
  "/api/",
  "/_next/image",
  "/unlock",
  "/setup-apk",
  "/auth/",
];

const PAGES_PATTERN = /^\/items\/[^/]+(?:\/|$)/;

function isShellUrl(pathname) {
  return SHELL_URLS.includes(pathname);
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
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
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

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
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
  const cached = await cache.match(request);
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
