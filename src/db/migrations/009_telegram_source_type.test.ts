import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

function createLegacyPost008Db(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE items (
      id                 TEXT PRIMARY KEY,
      source_type        TEXT NOT NULL CHECK (source_type IN ('url', 'pdf', 'note', 'youtube', 'podcast', 'epub', 'docx')),
      source_url         TEXT,
      title              TEXT NOT NULL,
      author             TEXT,
      body               TEXT NOT NULL,
      summary            TEXT,
      category           TEXT,
      captured_at        INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      enriched_at        INTEGER,
      enrichment_state   TEXT NOT NULL DEFAULT 'pending'
                           CHECK (enrichment_state IN ('pending', 'running', 'batched', 'done', 'error')),
      extraction_warning TEXT,
      total_pages        INTEGER,
      total_chars        INTEGER,
      quotes             TEXT,
      duration_seconds   INTEGER,
      batch_id           TEXT
    );

    CREATE VIRTUAL TABLE items_fts USING fts5(
      id UNINDEXED,
      title,
      body
    );

    CREATE TABLE enrichment_jobs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id      TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      state        TEXT NOT NULL DEFAULT 'pending'
                     CHECK (state IN ('pending', 'running', 'batched', 'done', 'error')),
      attempts     INTEGER NOT NULL DEFAULT 0,
      last_error   TEXT,
      created_at   INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      claimed_at   INTEGER,
      completed_at INTEGER,
      UNIQUE (item_id)
    );

    CREATE TABLE embedding_jobs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id      TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      state        TEXT NOT NULL DEFAULT 'pending'
                     CHECK (state IN ('pending', 'running', 'done', 'error')),
      attempts     INTEGER NOT NULL DEFAULT 0,
      last_error   TEXT,
      created_at   INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      claimed_at   INTEGER,
      completed_at INTEGER,
      UNIQUE (item_id)
    );

    INSERT INTO items (
      id, source_type, source_url, title, author, body, summary, category,
      captured_at, enriched_at, enrichment_state, extraction_warning,
      total_pages, total_chars, quotes, duration_seconds, batch_id
    )
    VALUES (
      'legacy-1', 'note', NULL, 'legacy note', NULL, 'body', NULL, NULL,
      1, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL
    );
  `);
  return db;
}

test("migration 009: legacy deployed DB accepts telegram source_type after forward migration", () => {
  const db = createLegacyPost008Db();
  try {
    const migration = readFileSync(
      resolve(process.cwd(), "src/db/migrations/009_telegram_source_type.sql"),
      "utf8",
    );

    assert.throws(
      () =>
        db
          .prepare("INSERT INTO items (id, source_type, title, body) VALUES (?, ?, ?, ?)")
          .run("before", "telegram", "before", "before"),
      /CHECK constraint failed/,
      "legacy schema should reject telegram before migration 009",
    );

    const tx = db.transaction(() => {
      db.exec(migration);
    });
    tx();

    db.prepare("INSERT INTO items (id, source_type, title, body) VALUES (?, ?, ?, ?)").run(
      "telegram-1",
      "telegram",
      "Telegram capture",
      "captured from bot",
    );

    const existing = db.prepare("SELECT source_type, title FROM items WHERE id = ?").get(
      "legacy-1",
    ) as { source_type: string; title: string };
    assert.deepEqual(existing, { source_type: "note", title: "legacy note" });

    const inserted = db.prepare("SELECT source_type, title FROM items WHERE id = ?").get(
      "telegram-1",
    ) as { source_type: string; title: string };
    assert.deepEqual(inserted, { source_type: "telegram", title: "Telegram capture" });

    assert.throws(
      () =>
        db
          .prepare("INSERT INTO items (id, source_type, title, body) VALUES (?, ?, ?, ?)")
          .run("bad", "email", "bad", "bad"),
      /CHECK constraint failed/,
      "new schema should still reject unknown source_type values",
    );

    const fts = db.prepare("SELECT id FROM items_fts WHERE id = ?").get("telegram-1") as
      | { id: string }
      | undefined;
    assert.equal(fts?.id, "telegram-1");

    const job = db.prepare("SELECT state FROM enrichment_jobs WHERE item_id = ?").get(
      "telegram-1",
    ) as { state: string } | undefined;
    assert.equal(job?.state, "pending");

    const foreignKeyIssues = db.prepare("PRAGMA foreign_key_check").all();
    assert.deepEqual(foreignKeyIssues, []);
  } finally {
    db.close();
  }
});
