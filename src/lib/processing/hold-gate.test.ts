import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { runMigrations } from "@/db/client";
import {
  createYouTubeBrowserSchemaFixture,
  YOUTUBE_BROWSER_FIXTURE_CONTRACT,
} from "@/db/test-fixtures/youtube-browser-schema";
import { withYouTubeBrowserSchemaContractForTests } from "@/db/schema-capabilities";
import {
  assertItemBodyProcessingAllowed,
  ItemBodyProcessingBlockedError,
  resolveItemBodyProcessingGate,
} from "./hold-gate";

function setNodeEnv(value: string | undefined): void {
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  if (value === undefined) delete mutableEnvironment.NODE_ENV;
  else mutableEnvironment.NODE_ENV = value;
}

test("current schema 027 preserves ordinary item-body processing", () => {
  const db = new Database(":memory:");
  sqliteVec.load(db);
  db.pragma("foreign_keys = ON");
  try {
    runMigrations(db);
    const decision = resolveItemBodyProcessingGate("ordinary-item", db);
    assert.deepEqual(decision, {
      allowed: true,
      basis: "legacy_schema_absent",
    });
    assert.equal(Object.isFrozen(decision), true);
  } finally {
    db.close();
  }
});

test("exact future schema resolves clear and held state through the real gate", () => {
  const db = createYouTubeBrowserSchemaFixture();
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    db.prepare("INSERT INTO items(id,body) VALUES(?,?)").run("clear-item", "");
    db.prepare("INSERT INTO items(id,body) VALUES(?,?)").run("held-item", "");
    db.prepare(
      `INSERT INTO content_processing_holds(
        id,item_id,expected_content_revision,state
      ) VALUES(?,?,?,'held')`,
    ).run("hold", "held-item", 1);

    setNodeEnv("test");
    withYouTubeBrowserSchemaContractForTests(
      YOUTUBE_BROWSER_FIXTURE_CONTRACT,
      () => {
        assert.deepEqual(resolveItemBodyProcessingGate("clear-item", db), {
          allowed: true,
          basis: "clear",
        });
        assert.deepEqual(resolveItemBodyProcessingGate("held-item", db), {
          allowed: false,
          basis: "held",
          code: "processing_hold_active",
        });

        db.prepare(
          `UPDATE content_processing_holds
           SET state='released'
           WHERE item_id=?`,
        ).run("held-item");
        assert.deepEqual(resolveItemBodyProcessingGate("held-item", db), {
          allowed: true,
          basis: "clear",
        });
      },
    );
  } finally {
    setNodeEnv(previousNodeEnv);
    db.close();
  }
});

test("a partial future schema fails closed before a hold query can be prepared", () => {
  const db = new Database(":memory:");
  try {
    db.exec(`
      CREATE TABLE _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sha256 TEXT
      );
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        content_revision INTEGER NOT NULL DEFAULT 1
      );
    `);
    assert.deepEqual(resolveItemBodyProcessingGate("item", db), {
      allowed: false,
      basis: "schema_incompatible",
      code: "processing_schema_incompatible",
    });
  } finally {
    db.close();
  }
});

test("same-version migration-ledger changes are re-attested on every hold decision", () => {
  const db = new Database(":memory:");
  try {
    db.exec(`
      CREATE TABLE _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sha256 TEXT
      );
      CREATE TABLE items (id TEXT PRIMARY KEY, body TEXT NOT NULL);
    `);
    assert.equal(resolveItemBodyProcessingGate("item", db).allowed, true);

    db.prepare("INSERT INTO _migrations(name,sha256) VALUES(?,?)").run(
      "028_youtube_browser_transcript.sql",
      "a".repeat(64),
    );
    assert.deepEqual(resolveItemBodyProcessingGate("item", db), {
      allowed: false,
      basis: "schema_incompatible",
      code: "processing_schema_incompatible",
    });

    db.prepare("DELETE FROM _migrations").run();
    assert.deepEqual(resolveItemBodyProcessingGate("item", db), {
      allowed: true,
      basis: "legacy_schema_absent",
    });
  } finally {
    db.close();
  }
});

test("schema discovery failure is a stable no-effect decision", () => {
  const db = new Database(":memory:");
  db.close();
  assert.deepEqual(resolveItemBodyProcessingGate("item", db), {
    allowed: false,
    basis: "schema_incompatible",
    code: "processing_schema_incompatible",
  });
});

test("the assertion helper preserves legacy success and throws a content-free typed block", () => {
  const legacyDb = new Database(":memory:");
  const incompatibleDb = new Database(":memory:");
  try {
    legacyDb.exec("CREATE TABLE items (id TEXT PRIMARY KEY)");
    assert.deepEqual(assertItemBodyProcessingAllowed("item", legacyDb), {
      allowed: true,
      basis: "legacy_schema_absent",
    });

    incompatibleDb.exec(`
      CREATE TABLE _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sha256 TEXT
      );
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        content_revision INTEGER NOT NULL DEFAULT 1
      );
    `);

    assert.throws(
      () =>
        assertItemBodyProcessingAllowed(
          "private-item-sentinel",
          incompatibleDb,
        ),
      (error: unknown) => {
        assert.ok(error instanceof ItemBodyProcessingBlockedError);
        assert.equal(error.name, "ItemBodyProcessingBlockedError");
        assert.equal(error.code, "processing_schema_incompatible");
        assert.equal(error.basis, "schema_incompatible");
        assert.equal(error.message.includes("private-item-sentinel"), false);
        return true;
      },
    );
  } finally {
    legacyDb.close();
    incompatibleDb.close();
  }
});
