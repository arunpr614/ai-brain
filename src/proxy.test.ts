/**
 * Unit tests for src/proxy.ts (v0.5.0 T-4).
 *
 * Verifies the layered auth check:
 *   - Public paths pass.
 *   - Signed session cookie passes (cookie-path).
 *   - Bearer-route + valid bearer + within rate limit passes.
 *   - Bearer-route + invalid bearer returns 401 JSON with structured log.
 *   - Bearer-route + valid bearer + exhausted rate limit returns 429.
 *   - Non-bearer API path without cookie returns 401 JSON.
 *   - HTML path without cookie redirects to /unlock.
 *
 * NextRequest is constructed with real URLs; cookies + headers are stamped
 * via the request-init headers object. logError writes to errors.jsonl but
 * tolerates test environment (mkdir + append under cwd/data/); acceptable
 * noise, not verified here.
 */
import "./proxy.test.setup";

import { describe, it, before, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { __resetRateLimiterForTests, DEFAULT_RATE_LIMIT } from "@/lib/auth/bearer";
import { issueSessionToken, setPin } from "@/lib/auth";
import { cleanupProxyTestDb } from "./proxy.test.setup";
import { proxy } from "./proxy";

const GOOD_TOKEN = "a".repeat(64);
const ORIGINAL_TOKEN = process.env.BRAIN_API_TOKEN;

function signedSessionCookie(): string {
  return issueSessionToken();
}

after(() => {
  cleanupProxyTestDb();
});

function mkReq(
  pathname: string,
  opts: { cookie?: string; bearer?: string; method?: string } = {},
): NextRequest {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", `brain-session=${opts.cookie}`);
  if (opts.bearer) headers.set("authorization", `Bearer ${opts.bearer}`);
  return new NextRequest(`http://localhost${pathname}`, {
    method: opts.method ?? "GET",
    headers,
  });
}

describe("proxy — public paths", () => {
  it("/unlock passes without auth", () => {
    const res = proxy(mkReq("/unlock"));
    // NextResponse.next() has a rewrite destination; we just confirm it's not 401/redirect.
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 302);
    assert.notEqual(res.status, 307);
  });

  it("/setup passes without auth", () => {
    const res = proxy(mkReq("/setup"));
    assert.notEqual(res.status, 401);
  });

  it("/setup-apk passes without auth", () => {
    const res = proxy(mkReq("/setup-apk"));
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 302);
    assert.notEqual(res.status, 307);
  });

  it("/capture/share-result passes without auth for unpaired Android result states", () => {
    const res = proxy(mkReq("/capture/share-result"));
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 302);
    assert.notEqual(res.status, 307);
  });

  it("/api/auth/* passes without auth", () => {
    const res = proxy(mkReq("/api/auth/pin"));
    assert.notEqual(res.status, 401);
  });

  it("device-pairing exchange API passes without auth", () => {
    const res = proxy(mkReq("/api/settings/device-pairing/exchange", { method: "POST" }));
    assert.notEqual(res.status, 401);
  });

  it("/offline.html passes without auth (T-14 / F-020)", () => {
    const res = proxy(mkReq("/offline.html"));
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 302);
    assert.notEqual(res.status, 307);
  });

  it("web app manifest and icon assets pass without auth", () => {
    for (const path of [
      "/manifest.webmanifest",
      "/favicon-16x16.png",
      "/favicon-32x32.png",
      "/favicon-48x48.png",
      "/apple-touch-icon.png",
      "/web-app-icon-192.png",
      "/web-app-icon-512.png",
      "/ai-memory-logo.png",
    ]) {
      const res = proxy(mkReq(path));
      assert.notEqual(res.status, 401, path);
      assert.notEqual(res.status, 302, path);
      assert.notEqual(res.status, 307, path);
    }
  });
});

describe("proxy — session cookie path", () => {
  before(() => {
    setPin("1234");
  });

  it("any path passes when brain-session cookie has a valid signature", () => {
    const res = proxy(mkReq("/items/abc", { cookie: signedSessionCookie() }));
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 302);
  });

  it("/api/ask passes with a signed cookie", () => {
    const res = proxy(mkReq("/api/ask", { cookie: signedSessionCookie(), method: "POST" }));
    assert.notEqual(res.status, 401);
  });

  it("forged session cookie redirects on HTML paths", () => {
    const res = proxy(mkReq("/items/abc", { cookie: "stub" }));
    assert.equal(res.status, 307);
    const loc = res.headers.get("location") ?? "";
    assert.match(loc, /\/unlock/);
    assert.match(loc, /next=%2Fitems%2Fabc/);
  });
});

describe("proxy — bearer path (BEARER_ROUTES)", () => {
  before(() => {
    process.env.BRAIN_API_TOKEN = GOOD_TOKEN;
  });
  after(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.BRAIN_API_TOKEN;
    else process.env.BRAIN_API_TOKEN = ORIGINAL_TOKEN;
  });
  beforeEach(() => __resetRateLimiterForTests());
  afterEach(() => __resetRateLimiterForTests());

  it("valid bearer on /api/capture/url passes", () => {
    const res = proxy(mkReq("/api/capture/url", { bearer: GOOD_TOKEN, method: "POST" }));
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 429);
  });

  it("valid bearer on /api/capture/transcript passes", () => {
    const res = proxy(
      mkReq("/api/capture/transcript", { bearer: GOOD_TOKEN, method: "POST" }),
    );
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 429);
  });

  it("valid bearer on /api/health passes", () => {
    const res = proxy(mkReq("/api/health", { bearer: GOOD_TOKEN }));
    assert.notEqual(res.status, 401);
  });

  it("forged session cookie does not bypass bearer verification", async () => {
    const res = proxy(
      mkReq("/api/capture/url", {
        cookie: "stub",
        bearer: "b".repeat(64),
        method: "POST",
      }),
    );
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "unauthenticated");
  });

  it("valid bearer still passes when an invalid cookie is also present", () => {
    const res = proxy(
      mkReq("/api/capture/url", {
        cookie: "stub",
        bearer: GOOD_TOKEN,
        method: "POST",
      }),
    );
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 429);
  });

  it("invalid bearer returns 401 JSON", async () => {
    const res = proxy(mkReq("/api/capture/url", { bearer: "b".repeat(64), method: "POST" }));
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "unauthenticated");
  });

  it("missing bearer header returns 401 on bearer route", () => {
    const res = proxy(mkReq("/api/capture/url", { method: "POST" }));
    assert.equal(res.status, 401);
  });

  it("empty BRAIN_API_TOKEN rejects a bearer-like request (REVIEW B-1/H-1)", () => {
    delete process.env.BRAIN_API_TOKEN;
    const res = proxy(mkReq("/api/capture/url", { bearer: GOOD_TOKEN, method: "POST" }));
    assert.equal(res.status, 401);
    process.env.BRAIN_API_TOKEN = GOOD_TOKEN;
  });

  it("exhausted rate limit returns 429 + Retry-After", () => {
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      proxy(mkReq("/api/capture/url", { bearer: GOOD_TOKEN, method: "POST" }));
    }
    const res = proxy(mkReq("/api/capture/url", { bearer: GOOD_TOKEN, method: "POST" }));
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("retry-after"), "60");
  });
});

describe("proxy — unauthenticated fallthrough", () => {
  it("API path without cookie or bearer returns 401 JSON", async () => {
    const res = proxy(mkReq("/api/ask", { method: "POST" }));
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "unauthenticated");
  });

  it("non-bearer API path ignores Authorization header", () => {
    // /api/ask is not in BEARER_ROUTES; even a valid-looking bearer must not pass.
    process.env.BRAIN_API_TOKEN = GOOD_TOKEN;
    const res = proxy(mkReq("/api/ask", { bearer: GOOD_TOKEN, method: "POST" }));
    assert.equal(res.status, 401);
    if (ORIGINAL_TOKEN === undefined) delete process.env.BRAIN_API_TOKEN;
    else process.env.BRAIN_API_TOKEN = ORIGINAL_TOKEN;
  });

  it("HTML path without cookie redirects to /unlock with next=", () => {
    const res = proxy(mkReq("/items/abc"));
    assert.equal(res.status, 307);
    const loc = res.headers.get("location") ?? "";
    assert.match(loc, /\/unlock/);
    assert.match(loc, /next=%2Fitems%2Fabc/);
    assert.match(loc, /reason=session-expired/);
  });

  it("keeps the complete path and query inside next without leaking duplicate unlock params", () => {
    const res = proxy(mkReq("/items/abc?tab=notes&note_mode=focus"));
    assert.equal(res.status, 307);
    const loc = new URL(res.headers.get("location") ?? "http://localhost");
    assert.equal(loc.pathname, "/unlock");
    assert.equal(loc.searchParams.get("next"), "/items/abc?tab=notes&note_mode=focus");
    assert.equal(loc.searchParams.get("reason"), "session-expired");
    assert.equal(loc.searchParams.has("tab"), false);
    assert.equal(loc.searchParams.has("note_mode"), false);
  });
});
