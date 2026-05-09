import { NextResponse, type NextRequest } from "next/server";
import {
  checkBearerRateLimit,
  isBearerRoute,
  loadLanToken,
  verifyBearerToken,
} from "@/lib/auth/bearer";
import { logError } from "@/lib/errors/sink";

/**
 * Next.js 16 proxy (formerly middleware) — v0.5.0 T-4.
 *
 * Layered auth check, first-match-wins:
 *   1. Public path (/unlock, /setup, /api/auth/*)  → next()
 *   2. brain-session cookie PRESENT                → next()
 *      (HMAC fully verified downstream in server components / actions /
 *      route handlers; the proxy is a fast presence-check).
 *   3. Path is in BEARER_ROUTES allow-list         → bearer verification:
 *      a. Authorization: Bearer <token> header present
 *      b. Token matches BRAIN_LAN_TOKEN via timingSafeEqual
 *      c. Rate-limit budget available (30 req/min default per token)
 *      → on pass: next()
 *      → on fail: 401 or 429, with structured `lan.bearer.*` log entry
 *   4. API path (anything else under /api/)        → 401 JSON
 *   5. HTML path                                   → redirect to /unlock
 *
 * Next.js 16 runs proxy files in the Node.js runtime by default (stable
 * since v15.5). `node:crypto` is therefore available — prior versions of
 * this file routed HMAC verification to route handlers because the Edge
 * runtime could not use `node:crypto`. That constraint no longer applies;
 * bearer verification runs in-proxy.
 */
const SESSION_COOKIE = "brain-session";
// /offline.html (v0.5.0 T-14 / F-020) is served from /public as a static
// fallback and must render BEFORE auth — the whole point is that the
// server might be up but the device isn't paired, or the server might be
// down and this HTML is cached in the WebView. A redirect to /unlock
// would trap the user in a loop.
const PUBLIC_PATHS = new Set(["/unlock", "/setup", "/offline.html"]);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Public paths.
  if (pathname.startsWith("/api/auth")) return NextResponse.next();
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  // 2. Session cookie presence → web UI flow (browser, APK WebView nav).
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    return NextResponse.next();
  }

  // 3. Bearer-authenticated programmatic access (APK share-handler,
  //    Chrome extension) on allow-listed routes only.
  if (isBearerRoute(pathname)) {
    const verdict = verifyBearerToken(req.headers.get("authorization"));
    if (!verdict.ok) {
      logError({
        type: `lan.bearer.reject-${verdict.reason}`,
        path: pathname,
        method: req.method,
        ts: Date.now(),
      });
      return unauth(req, pathname);
    }
    const token = loadLanToken();
    // loadLanToken cannot be null here because verifyBearerToken returned ok.
    // Narrow explicitly for the rate-limit call.
    if (token === null) {
      logError({
        type: "lan.bearer.reject-server-token-unconfigured",
        path: pathname,
        method: req.method,
        ts: Date.now(),
      });
      return unauth(req, pathname);
    }
    if (!checkBearerRateLimit(token)) {
      logError({
        type: "lan.ratelimit.triggered",
        path: pathname,
        method: req.method,
        ts: Date.now(),
      });
      return NextResponse.json(
        { error: "rate_limited" },
        {
          status: 429,
          headers: { "cache-control": "no-store", "retry-after": "60" },
        },
      );
    }
    return NextResponse.next();
  }

  // 4 / 5. No valid credential — 401 for API, redirect for HTML.
  return unauth(req, pathname);
}

function unauth(req: NextRequest, pathname: string) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Skip static asset paths and the app manifest.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
