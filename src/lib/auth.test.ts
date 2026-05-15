/**
 * F-043 / F-051 tests for src/lib/auth.ts.
 *
 * Side-effect setup: `./auth.test.setup` is imported FIRST so that
 * BRAIN_DB_PATH is assigned before any module that transitively reaches
 * @/db/client loads. The DB singleton keys off BRAIN_DB_PATH at import
 * time — if we set it after importing auth, the real data/brain.sqlite
 * would be opened.
 */
import "./auth.test.setup";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  isPinConfigured,
  setPin,
  verifyPin,
  issueSessionToken,
  verifySessionToken,
} from "./auth";
import { cleanupTmpDb } from "./auth.test.setup";

describe("auth module", () => {
  after(() => {
    cleanupTmpDb();
  });

  describe("SESSION_COOKIE_OPTIONS", () => {
    it("sets HttpOnly + SameSite=Lax + Path=/", () => {
      assert.equal(SESSION_COOKIE_OPTIONS.httpOnly, true);
      assert.equal(SESSION_COOKIE_OPTIONS.sameSite, "lax");
      assert.equal(SESSION_COOKIE_OPTIONS.path, "/");
    });

    it("maxAge is 30 days in seconds", () => {
      assert.equal(SESSION_COOKIE_OPTIONS.maxAge, 30 * 24 * 60 * 60);
    });
  });

  describe("cookie name", () => {
    it("is stable at 'brain-session'", () => {
      assert.equal(SESSION_COOKIE, "brain-session");
    });
  });

  describe("PIN lifecycle", () => {
    before(() => {
      assert.equal(isPinConfigured(), false);
    });

    it("rejects short PINs", () => {
      assert.throws(() => setPin("12"), /at least 4 characters/);
    });

    it("setPin + verifyPin round-trips and isPinConfigured becomes true", () => {
      setPin("1234");
      assert.equal(isPinConfigured(), true);
      assert.equal(verifyPin("1234"), true);
      assert.equal(verifyPin("0000"), false);
    });
  });

  describe("session tokens", () => {
    it("issueSessionToken returns a dot-separated token", () => {
      const tok = issueSessionToken();
      assert.match(tok, /^\d+\.[0-9a-f]+$/);
    });

    it("verifySessionToken accepts a just-issued token", () => {
      assert.equal(verifySessionToken(issueSessionToken()), true);
    });

    it("verifySessionToken rejects null / empty / garbage", () => {
      assert.equal(verifySessionToken(null), false);
      assert.equal(verifySessionToken(undefined), false);
      assert.equal(verifySessionToken(""), false);
      assert.equal(verifySessionToken("not-a-token"), false);
      assert.equal(verifySessionToken("1234.badhmac"), false);
    });

    it("verifySessionToken rejects a tampered payload (extended expiry, old HMAC)", () => {
      const tok = issueSessionToken();
      const [, mac] = tok.split(".");
      const tampered = `${Date.now() + 3_600_000}.${mac}`;
      assert.equal(verifySessionToken(tampered), false);
    });
  });
});
