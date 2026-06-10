import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import {
  __resetPairingCodeRateLimitForTests,
  createPairingCode,
  exchangePairingCode,
  hashPairingCode,
  normalizePairingCode,
  PAIRING_CODE_MAX_ATTEMPTS,
  PAIRING_CODE_TTL_MS,
} from "./codes";

const ORIGINAL_TOKEN = process.env.BRAIN_API_TOKEN;

function createDb(): Database.Database {
  const db = new Database(":memory:");
  const migration = readFileSync(
    resolve(process.cwd(), "src/db/migrations/010_device_pairing_codes.sql"),
    "utf8",
  );
  db.exec(migration);
  return db;
}

describe("temporary device pairing codes", () => {
  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.BRAIN_API_TOKEN;
    else process.env.BRAIN_API_TOKEN = ORIGINAL_TOKEN;
    __resetPairingCodeRateLimitForTests();
  });

  it("normalizes human-entered codes", () => {
    assert.equal(normalizePairingCode(" abcd-efgh "), "ABCDEFGH");
  });

  it("creates a one-time code and stores only its hash", () => {
    process.env.BRAIN_API_TOKEN = "f".repeat(64);
    const db = createDb();
    try {
      const result = createPairingCode({ db, now: 1_000 });
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.match(result.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      assert.equal(result.expiresAt, 1_000 + PAIRING_CODE_TTL_MS);

      const row = db
        .prepare("SELECT code_hash FROM device_pairing_codes")
        .get() as { code_hash: string };
      assert.equal(row.code_hash, hashPairingCode(result.code, "f".repeat(64)));
      assert.notEqual(row.code_hash, normalizePairingCode(result.code));
    } finally {
      db.close();
    }
  });

  it("exchanges a valid code once", () => {
    process.env.BRAIN_API_TOKEN = "a".repeat(64);
    const db = createDb();
    try {
      const created = createPairingCode({ db, now: 1_000 });
      assert.equal(created.ok, true);
      if (!created.ok) return;

      const exchanged = exchangePairingCode(created.code, { db, now: 2_000 });
      assert.deepEqual(exchanged, { ok: true, token: "a".repeat(64) });

      const reused = exchangePairingCode(created.code, { db, now: 3_000 });
      assert.deepEqual(reused, { ok: false, reason: "used_code" });
    } finally {
      db.close();
    }
  });

  it("rejects expired codes", () => {
    process.env.BRAIN_API_TOKEN = "b".repeat(64);
    const db = createDb();
    try {
      const created = createPairingCode({ db, now: 1_000 });
      assert.equal(created.ok, true);
      if (!created.ok) return;

      const exchanged = exchangePairingCode(created.code, {
        db,
        now: 1_000 + PAIRING_CODE_TTL_MS + 1,
      });
      assert.deepEqual(exchanged, { ok: false, reason: "expired_code" });
    } finally {
      db.close();
    }
  });

  it("rate-limits repeated invalid attempts", () => {
    process.env.BRAIN_API_TOKEN = "c".repeat(64);
    const db = createDb();
    try {
      for (let i = 0; i < 10; i += 1) {
        assert.deepEqual(exchangePairingCode("BAD-CODE", { db, now: 10_000 + i }), {
          ok: false,
          reason: "invalid_code",
        });
      }
      assert.deepEqual(exchangePairingCode("BAD-CODE", { db, now: 10_020 }), {
        ok: false,
        reason: "rate_limited",
      });
    } finally {
      db.close();
    }
  });

  it("rate-limits many distinct invalid attempts", () => {
    process.env.BRAIN_API_TOKEN = "c".repeat(64);
    const db = createDb();
    try {
      for (let i = 0; i < 30; i += 1) {
        const code = `ABCD-EF${2 + Math.floor(i / 8)}${2 + (i % 8)}`;
        assert.deepEqual(
          exchangePairingCode(code, { db, now: 20_000 + i }),
          {
            ok: false,
            reason: "invalid_code",
          },
        );
      }
      assert.deepEqual(exchangePairingCode("ABCD-EF68", { db, now: 20_100 }), {
        ok: false,
        reason: "rate_limited",
      });
    } finally {
      db.close();
    }
  });

  it("rate-limits repeated attempts against a real code row", () => {
    process.env.BRAIN_API_TOKEN = "d".repeat(64);
    const db = createDb();
    try {
      const created = createPairingCode({ db, now: 1_000 });
      assert.equal(created.ok, true);
      if (!created.ok) return;

      for (let i = 0; i < PAIRING_CODE_MAX_ATTEMPTS; i += 1) {
        assert.deepEqual(exchangePairingCode(created.code, { db, now: 10_000 + i }), {
          ok: true,
          token: "d".repeat(64),
        });
        break;
      }
      for (let i = 0; i < PAIRING_CODE_MAX_ATTEMPTS; i += 1) {
        exchangePairingCode(created.code, { db, now: 11_000 + i });
      }
      assert.deepEqual(exchangePairingCode(created.code, { db, now: 12_000 }), {
        ok: false,
        reason: "rate_limited",
      });
    } finally {
      db.close();
    }
  });

  it("fails closed when BRAIN_API_TOKEN is missing", () => {
    delete process.env.BRAIN_API_TOKEN;
    const db = createDb();
    try {
      assert.deepEqual(createPairingCode({ db }), {
        ok: false,
        reason: "token_not_configured",
      });
      assert.deepEqual(exchangePairingCode("ABCD-EFGH", { db }), {
        ok: false,
        reason: "token_not_configured",
      });
    } finally {
      db.close();
    }
  });
});
