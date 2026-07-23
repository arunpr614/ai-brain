import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import {
  assertStandaloneContentProcessingAllowed,
  evaluateOrdinaryContentRuntime,
  inspectFrozenSchema026,
  resolveStandaloneContentProcessingAuthority,
  SCHEMA_026_LAST_MIGRATION,
  StandaloneContentProcessingBlockedError,
} from "./content-processing-containment.mjs";

describe("standalone content-processing runtime authority", () => {
  it("preserves explicit standard and the narrow missing-mode compatibility bridge", () => {
    assert.deepEqual(evaluateOrdinaryContentRuntime({}), {
      allowed: true,
      code: "legacy_default_standard",
    });
    assert.deepEqual(
      evaluateOrdinaryContentRuntime({
        BRAIN_DEPLOYMENT_ENV: "production",
        BRAIN_PRODUCTION_RUNTIME: "1",
        BRAIN_BACKGROUND_WORKERS_MODE: "standard",
      }),
      { allowed: true, code: "standard" },
    );
  });

  it("fails closed for disabled/manual/invalid modes and requested restricted capability", () => {
    const cases = [
      [{ BRAIN_BACKGROUND_WORKERS_MODE: "disabled" }, "content_workers_disabled"],
      [
        { BRAIN_BACKGROUND_WORKERS_MODE: "manual-transcript-lab" },
        "content_worker_mode_denied",
      ],
      [{ BRAIN_BACKGROUND_WORKERS_MODE: "STANDARD" }, "content_worker_mode_invalid"],
      [
        { BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE: "lab" },
        "content_worker_mode_required",
      ],
      [
        { BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_EXECUTION_ENABLED: "TRUE" },
        "content_worker_mode_required",
      ],
    ];
    for (const [environment, code] of cases) {
      assert.deepEqual(evaluateOrdinaryContentRuntime(environment), {
        allowed: false,
        code,
      });
    }
  });

  it("fails closed for malformed or conflicting deployment markers", () => {
    assert.deepEqual(
      evaluateOrdinaryContentRuntime({
        BRAIN_DEPLOYMENT_ENV: "prod",
        BRAIN_PRODUCTION_RUNTIME: "1",
        BRAIN_BACKGROUND_WORKERS_MODE: "standard",
      }),
      { allowed: false, code: "deployment_invalid" },
    );
    assert.deepEqual(
      evaluateOrdinaryContentRuntime({
        BRAIN_DEPLOYMENT_ENV: "lab",
        BRAIN_PRODUCTION_RUNTIME: "1",
        BRAIN_BACKGROUND_WORKERS_MODE: "standard",
      }),
      { allowed: false, code: "deployment_conflict" },
    );
  });
});

describe("standalone schema-026 authority", () => {
  it("accepts only the exact frozen 026 ledger baseline", () => {
    const db = schema026();
    try {
      assert.deepEqual(inspectFrozenSchema026(db), {
        allowed: true,
        code: "schema_026",
      });
      assert.deepEqual(resolveStandaloneContentProcessingAuthority(db, {}), {
        allowed: true,
        code: "legacy_default_standard",
      });
    } finally {
      db.close();
    }
  });

  it("rejects a later ledger row before treating the schema as ordinary", () => {
    const db = schema026();
    try {
      db.prepare("INSERT INTO _migrations(name, sha256) VALUES (?, ?)").run(
        "027_youtube_browser_transcript.sql",
        "a".repeat(64),
      );
      assert.deepEqual(inspectFrozenSchema026(db), {
        allowed: false,
        code: "processing_schema_incompatible",
      });
    } finally {
      db.close();
    }
  });

  it("rejects missing/wrong baseline hashes and known unledgered partial markers", () => {
    const wrongHash = schema026("b".repeat(64));
    const partial = schema026();
    try {
      assert.equal(inspectFrozenSchema026(wrongHash).allowed, false);

      partial.exec("ALTER TABLE items ADD COLUMN content_revision INTEGER NOT NULL DEFAULT 1");
      assert.deepEqual(inspectFrozenSchema026(partial), {
        allowed: false,
        code: "processing_schema_incompatible",
      });
    } finally {
      wrongHash.close();
      partial.close();
    }
  });

  it("throws one content-free typed denial", () => {
    const db = schema026();
    try {
      db.exec("ALTER TABLE items ADD COLUMN claim_token TEXT");
      assert.throws(
        () => assertStandaloneContentProcessingAllowed(db, {}),
        (error) => {
          assert.ok(error instanceof StandaloneContentProcessingBlockedError);
          assert.equal(error.code, "processing_schema_incompatible");
          assert.equal(error.message, "processing_schema_incompatible");
          return true;
        },
      );
    } finally {
      db.close();
    }
  });
});

function schema026(sha256 = SCHEMA_026_LAST_MIGRATION.sha256) {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sha256 TEXT
    );
    CREATE TABLE items (id TEXT PRIMARY KEY, body TEXT NOT NULL);
  `);
  db.prepare("INSERT INTO _migrations(name, sha256) VALUES (?, ?)").run(
    SCHEMA_026_LAST_MIGRATION.name,
    sha256,
  );
  return db;
}
