/**
 * Unit tests for src/proxy.ts (v0.5.0 T-4).
 *
 * Verifies the layered auth check:
 *   - Public paths pass.
 *   - Session cookie presence passes (cookie-path).
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
import { describe, it, before, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { __resetRateLimiterForTests, DEFAULT_RATE_LIMIT } from "@/lib/auth/bearer";
import { proxy } from "./proxy";

const GOOD_TOKEN = "a".repeat(64);
const ORIGINAL_TOKEN = process.env.BRAIN_LAN_TOKEN;

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

  it("/api/auth/* passes without auth", () => {
    const res = proxy(mkReq("/api/auth/pin"));
    assert.notEqual(res.status, 401);
  });
});

describe("proxy — session cookie path", () => {
  it("any path passes when brain-session cookie is present (presence-only check)", () => {
    const res = proxy(mkReq("/items/abc", { cookie: "stub" }));
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 302);
  });

  it("/api/ask passes with cookie", () => {
    const res = proxy(mkReq("/api/ask", { cookie: "stub", method: "POST" }));
    assert.notEqual(res.status, 401);
  });
});

describe("proxy — bearer path (BEARER_ROUTES)", () => {
  before(() => {
    process.env.BRAIN_LAN_TOKEN = GOOD_TOKEN;
  });
  after(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.BRAIN_LAN_TOKEN;
    else process.env.BRAIN_LAN_TOKEN = ORIGINAL_TOKEN;
  });
  beforeEach(() => __resetRateLimiterForTests());
  afterEach(() => __resetRateLimiterForTests());

  it("valid bearer on /api/capture/url passes", () => {
    const res = proxy(mkReq("/api/capture/url", { bearer: GOOD_TOKEN, method: "POST" }));
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 429);
  });

  it("valid bearer on /api/health passes", () => {
    const res = proxy(mkReq("/api/health", { bearer: GOOD_TOKEN }));
    assert.notEqual(res.status, 401);
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

  it("empty BRAIN_LAN_TOKEN rejects a bearer-like request (REVIEW B-1/H-1)", () => {
    delete process.env.BRAIN_LAN_TOKEN;
    const res = proxy(mkReq("/api/capture/url", { bearer: GOOD_TOKEN, method: "POST" }));
    assert.equal(res.status, 401);
    process.env.BRAIN_LAN_TOKEN = GOOD_TOKEN;
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
    process.env.BRAIN_LAN_TOKEN = GOOD_TOKEN;
    const res = proxy(mkReq("/api/ask", { bearer: GOOD_TOKEN, method: "POST" }));
    assert.equal(res.status, 401);
    if (ORIGINAL_TOKEN === undefined) delete process.env.BRAIN_LAN_TOKEN;
    else process.env.BRAIN_LAN_TOKEN = ORIGINAL_TOKEN;
  });

  it("HTML path without cookie redirects to /unlock with next=", () => {
    const res = proxy(mkReq("/items/abc"));
    assert.equal(res.status, 307);
    const loc = res.headers.get("location") ?? "";
    assert.match(loc, /\/unlock/);
    assert.match(loc, /next=%2Fitems%2Fabc/);
  });
});
