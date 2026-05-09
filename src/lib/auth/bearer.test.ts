/**
 * Unit tests for src/lib/auth/bearer.ts (v0.5.0 T-3).
 *
 * Covers SC-7 (bearer rejects: empty, short, mismatch, missing header) +
 * SC-8 (rate limiter: 30/min default, token-fingerprint keyed,
 * BRAIN_LAN_RATE_LIMIT override). Purely env + in-process state; no DB
 * needed, so no side-effect setup file.
 */
import assert from "node:assert/strict";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import {
  BEARER_ROUTES,
  DEFAULT_RATE_LIMIT,
  MIN_TOKEN_LENGTH,
  RATE_WINDOW_MS,
  __resetRateLimiterForTests,
  checkBearerRateLimit,
  generateLanToken,
  isBearerRoute,
  loadLanToken,
  tokenFingerprint,
  verifyBearerToken,
} from "./bearer";

const ORIGINAL_TOKEN = process.env.BRAIN_LAN_TOKEN;
const ORIGINAL_LIMIT = process.env.BRAIN_LAN_RATE_LIMIT;

function setToken(v: string | undefined): void {
  if (v === undefined) delete process.env.BRAIN_LAN_TOKEN;
  else process.env.BRAIN_LAN_TOKEN = v;
}

function setLimit(v: string | undefined): void {
  if (v === undefined) delete process.env.BRAIN_LAN_RATE_LIMIT;
  else process.env.BRAIN_LAN_RATE_LIMIT = v;
}

describe("auth/bearer — constants + helpers", () => {
  after(() => {
    setToken(ORIGINAL_TOKEN);
    setLimit(ORIGINAL_LIMIT);
  });

  it("MIN_TOKEN_LENGTH is 32 (hex = 128 bits)", () => {
    assert.equal(MIN_TOKEN_LENGTH, 32);
  });

  it("DEFAULT_RATE_LIMIT is 30 per REVIEW P2-1", () => {
    assert.equal(DEFAULT_RATE_LIMIT, 30);
  });

  it("RATE_WINDOW_MS is 60_000", () => {
    assert.equal(RATE_WINDOW_MS, 60_000);
  });

  it("generateLanToken returns 64 hex chars (32 bytes = 256 bits)", () => {
    const t = generateLanToken();
    assert.match(t, /^[0-9a-f]{64}$/);
  });

  it("tokenFingerprint is deterministic and 16 hex chars", () => {
    const fp = tokenFingerprint("x".repeat(64));
    assert.match(fp, /^[0-9a-f]{16}$/);
    assert.equal(tokenFingerprint("x".repeat(64)), fp);
  });

  it("tokenFingerprint differs for different tokens", () => {
    assert.notEqual(tokenFingerprint("a".repeat(64)), tokenFingerprint("b".repeat(64)));
  });

  it("BEARER_ROUTES contains capture + health + errors endpoints", () => {
    assert.ok(BEARER_ROUTES.includes("/api/capture/url"));
    assert.ok(BEARER_ROUTES.includes("/api/capture/pdf"));
    assert.ok(BEARER_ROUTES.includes("/api/health"));
    assert.ok(BEARER_ROUTES.includes("/api/errors/client"));
  });

  it("isBearerRoute matches exact + prefix paths", () => {
    assert.equal(isBearerRoute("/api/capture/url"), true);
    assert.equal(isBearerRoute("/api/capture/url/"), true);
    assert.equal(isBearerRoute("/api/capture/pdf"), true);
    assert.equal(isBearerRoute("/api/items"), true);
    assert.equal(isBearerRoute("/api/items/abc-123"), true);
    assert.equal(isBearerRoute("/api/ask"), false);
    assert.equal(isBearerRoute("/api/threads"), false);
    assert.equal(isBearerRoute("/"), false);
  });
});

describe("auth/bearer — loadLanToken", () => {
  afterEach(() => setToken(ORIGINAL_TOKEN));

  it("returns null when BRAIN_LAN_TOKEN is unset", () => {
    setToken(undefined);
    assert.equal(loadLanToken(), null);
  });

  it("returns null when BRAIN_LAN_TOKEN is empty", () => {
    setToken("");
    assert.equal(loadLanToken(), null);
  });

  it("returns null when BRAIN_LAN_TOKEN is shorter than MIN_TOKEN_LENGTH", () => {
    setToken("short");
    assert.equal(loadLanToken(), null);
  });

  it("returns the token when >= MIN_TOKEN_LENGTH", () => {
    const t = "a".repeat(MIN_TOKEN_LENGTH);
    setToken(t);
    assert.equal(loadLanToken(), t);
  });
});

describe("auth/bearer — verifyBearerToken (SC-7)", () => {
  const GOOD = "a".repeat(64);

  beforeEach(() => setToken(GOOD));
  afterEach(() => setToken(ORIGINAL_TOKEN));

  it("rejects with missing-header when header is null/undefined/empty", () => {
    assert.deepEqual(verifyBearerToken(null), { ok: false, reason: "missing-header" });
    assert.deepEqual(verifyBearerToken(undefined), { ok: false, reason: "missing-header" });
    assert.deepEqual(verifyBearerToken(""), { ok: false, reason: "missing-header" });
  });

  it("rejects with malformed-header when prefix is wrong", () => {
    assert.deepEqual(verifyBearerToken("Basic abc"), { ok: false, reason: "malformed-header" });
    assert.deepEqual(verifyBearerToken("Token abc"), { ok: false, reason: "malformed-header" });
    assert.deepEqual(verifyBearerToken("bearer abc"), { ok: false, reason: "malformed-header" });
    assert.deepEqual(verifyBearerToken("Bearer"), { ok: false, reason: "malformed-header" });
  });

  it("rejects with malformed-header when bearer value is empty", () => {
    assert.deepEqual(verifyBearerToken("Bearer "), { ok: false, reason: "malformed-header" });
  });

  it("rejects with server-token-unconfigured when BRAIN_LAN_TOKEN is unset", () => {
    setToken(undefined);
    assert.deepEqual(verifyBearerToken(`Bearer ${GOOD}`), {
      ok: false,
      reason: "server-token-unconfigured",
    });
  });

  it("rejects with server-token-too-short when BRAIN_LAN_TOKEN is < 32 chars (REVIEW B-1/H-1)", () => {
    setToken("short");
    assert.deepEqual(verifyBearerToken(`Bearer ${GOOD}`), {
      ok: false,
      reason: "server-token-too-short",
    });
  });

  it("rejects with server-token-unconfigured when an empty bearer tries to match empty env", () => {
    // The empty-token attack scenario from REVIEW: attacker sends `Bearer `
    // (trailing space only). Our parser rejects this as malformed-header
    // before ever comparing; belt-and-braces check.
    setToken("");
    assert.deepEqual(verifyBearerToken("Bearer "), { ok: false, reason: "malformed-header" });
  });

  it("rejects with length-mismatch on a wrong-length value", () => {
    assert.deepEqual(verifyBearerToken("Bearer " + "a".repeat(63)), {
      ok: false,
      reason: "length-mismatch",
    });
  });

  it("rejects with token-mismatch on same-length wrong value", () => {
    assert.deepEqual(verifyBearerToken("Bearer " + "b".repeat(64)), {
      ok: false,
      reason: "token-mismatch",
    });
  });

  it("accepts a correct token", () => {
    assert.deepEqual(verifyBearerToken(`Bearer ${GOOD}`), { ok: true });
  });
});

describe("auth/bearer — checkBearerRateLimit (SC-8)", () => {
  const TOKEN = "a".repeat(64);

  beforeEach(() => {
    setToken(TOKEN);
    __resetRateLimiterForTests();
  });
  afterEach(() => {
    setToken(ORIGINAL_TOKEN);
    setLimit(ORIGINAL_LIMIT);
    __resetRateLimiterForTests();
  });

  it("accepts the first DEFAULT_RATE_LIMIT requests in a window", () => {
    const t = Date.now();
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      assert.equal(checkBearerRateLimit(TOKEN, t + i), true, `req ${i + 1}/${DEFAULT_RATE_LIMIT}`);
    }
  });

  it("rejects the (DEFAULT_RATE_LIMIT + 1)th request in the same window", () => {
    const t = Date.now();
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      checkBearerRateLimit(TOKEN, t + i);
    }
    assert.equal(checkBearerRateLimit(TOKEN, t + DEFAULT_RATE_LIMIT), false);
  });

  it("releases the bucket after RATE_WINDOW_MS", () => {
    const t = Date.now();
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      checkBearerRateLimit(TOKEN, t + i);
    }
    assert.equal(checkBearerRateLimit(TOKEN, t + DEFAULT_RATE_LIMIT), false);
    // Jump forward past the window.
    assert.equal(checkBearerRateLimit(TOKEN, t + RATE_WINDOW_MS + 1), true);
  });

  it("keys on token fingerprint — different tokens do NOT share a bucket", () => {
    const T2 = "b".repeat(64);
    const t = Date.now();
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      checkBearerRateLimit(TOKEN, t + i);
    }
    assert.equal(checkBearerRateLimit(TOKEN, t + DEFAULT_RATE_LIMIT), false);
    // Different token gets its own bucket even when the first is exhausted.
    assert.equal(checkBearerRateLimit(T2, t + DEFAULT_RATE_LIMIT), true);
  });

  it("respects BRAIN_LAN_RATE_LIMIT env override", () => {
    setLimit("5");
    const t = Date.now();
    for (let i = 0; i < 5; i++) {
      assert.equal(checkBearerRateLimit(TOKEN, t + i), true);
    }
    assert.equal(checkBearerRateLimit(TOKEN, t + 5), false);
  });

  it("falls back to DEFAULT_RATE_LIMIT when env override is non-numeric", () => {
    setLimit("garbage");
    const t = Date.now();
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      assert.equal(checkBearerRateLimit(TOKEN, t + i), true);
    }
    assert.equal(checkBearerRateLimit(TOKEN, t + DEFAULT_RATE_LIMIT), false);
  });

  it("falls back to DEFAULT_RATE_LIMIT when env override is 0 or negative", () => {
    setLimit("0");
    const t = Date.now();
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      assert.equal(checkBearerRateLimit(TOKEN, t + i), true);
    }
    assert.equal(checkBearerRateLimit(TOKEN, t + DEFAULT_RATE_LIMIT), false);
  });
});
