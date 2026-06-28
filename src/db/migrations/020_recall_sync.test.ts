import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

function createPost019Db(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE items (
      id                 TEXT PRIMARY KEY,
      source_type        TEXT NOT NULL CHECK (source_type IN ('url', 'pdf', 'note', 'youtube', 'podcast', 'epub', 'docx', 'telegram')),
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
      batch_id           TEXT,
      capture_source     TEXT NOT NULL DEFAULT 'web'
                           CHECK (capture_source IN ('web', 'android', 'extension', 'telegram', 'system', 'unknown')),
      source_platform    TEXT,
      capture_quality    TEXT,
      extraction_method  TEXT,
      extraction_version TEXT,
      published_at       INTEGER,
      thumbnail_url      TEXT,
      description        TEXT
    );

    CREATE INDEX idx_items_captured_at      ON items(captured_at DESC);
    CREATE INDEX idx_items_category         ON items(category);
    CREATE INDEX idx_items_enrichment_state ON items(enrichment_state);
    CREATE INDEX idx_items_batch_id ON items(batch_id) WHERE batch_id IS NOT NULL;
    CREATE INDEX idx_items_capture_source ON items(capture_source);
    CREATE INDEX idx_items_source_platform ON items(source_platform);
    CREATE INDEX idx_items_capture_quality ON items(capture_quality);
    CREATE INDEX idx_items_published_at ON items(published_at DESC);

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

    CREATE TRIGGER items_fts_ai AFTER INSERT ON items BEGIN
      INSERT INTO items_fts (id, title, body) VALUES (new.id, new.title, new.body);
    END;
    CREATE TRIGGER items_fts_ad AFTER DELETE ON items BEGIN
      DELETE FROM items_fts WHERE id = old.id;
    END;
    CREATE TRIGGER items_fts_au AFTER UPDATE OF title, body ON items BEGIN
      DELETE FROM items_fts WHERE id = old.id;
      INSERT INTO items_fts (id, title, body) VALUES (new.id, new.title, new.body);
    END;
    CREATE TRIGGER items_enqueue_enrichment AFTER INSERT ON items BEGIN
      INSERT OR IGNORE INTO enrichment_jobs (item_id) VALUES (new.id);
    END;
    CREATE TRIGGER items_enqueue_embedding AFTER UPDATE OF enrichment_state ON items
    WHEN new.enrichment_state = 'done' AND old.enrichment_state != 'done'
    BEGIN
      INSERT OR IGNORE INTO embedding_jobs (item_id) VALUES (new.id);
    END;

    INSERT INTO items (
      id, source_type, source_url, title, author, body, summary, category,
      captured_at, enriched_at, enrichment_state, extraction_warning,
      total_pages, total_chars, quotes, duration_seconds, batch_id,
      capture_source, source_platform, capture_quality, extraction_method,
      extraction_version, published_at, thumbnail_url, description
    )
    VALUES (
      'existing-1', 'url', 'https://example.com/a', 'Existing article', 'Author',
      'Existing body', 'Summary', 'research', 1, NULL, 'pending', NULL,
      NULL, 13, NULL, NULL, NULL, 'web', 'generic_article', 'full_text',
      'legacy', 'legacy', NULL, NULL, 'Existing description'
    );
  `);
  return db;
}

test("migration 020: enables Recall capture source and sync tables", () => {
  const db = createPost019Db();
  try {
    assert.throws(
      () =>
        db
          .prepare("INSERT INTO items (id, source_type, capture_source, title, body) VALUES (?, ?, ?, ?, ?)")
          .run("before", "url", "recall", "Before Recall", "body"),
      /CHECK constraint failed/,
      "post-019 schema should reject recall before migration 020",
    );

    const migration = readFileSync(
      resolve(process.cwd(), "src/db/migrations/020_recall_sync.sql"),
      "utf8",
    );
    db.exec(migration);

    const existing = db
      .prepare("SELECT title, capture_source, source_platform, capture_quality FROM items WHERE id = ?")
      .get("existing-1") as {
      title: string;
      capture_source: string;
      source_platform: string;
      capture_quality: string;
    };
    assert.deepEqual(existing, {
      title: "Existing article",
      capture_source: "web",
      source_platform: "generic_article",
      capture_quality: "full_text",
    });

    db.prepare(
      "INSERT INTO items (id, source_type, capture_source, title, body, source_platform, capture_quality) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      "recall-1",
      "url",
      "recall",
      "Synthetic Recall",
      "Imported from Recall\n\nSynthetic body",
      "generic_article",
      "metadata_only",
    );

    const inserted = db
      .prepare("SELECT capture_source, source_platform, capture_quality FROM items WHERE id = ?")
      .get("recall-1") as {
      capture_source: string;
      source_platform: string;
      capture_quality: string;
    };
    assert.deepEqual(inserted, {
      capture_source: "recall",
      source_platform: "generic_article",
      capture_quality: "metadata_only",
    });

    const fts = db.prepare("SELECT id FROM items_fts WHERE id = ?").get("recall-1") as
      | { id: string }
      | undefined;
    assert.equal(fts?.id, "recall-1");

    const enrichmentJob = db
      .prepare("SELECT state FROM enrichment_jobs WHERE item_id = ?")
      .get("recall-1") as { state: string } | undefined;
    assert.equal(enrichmentJob?.state, "pending");

    db.prepare("UPDATE items SET enrichment_state = 'done' WHERE id = ?").run("recall-1");
    const embeddingJob = db
      .prepare("SELECT state FROM embedding_jobs WHERE item_id = ?")
      .get("recall-1") as { state: string } | undefined;
    assert.equal(embeddingJob?.state, "pending");

    db.prepare(
      `
        INSERT INTO recall_sync_items (
          recall_card_id, item_id, recall_created_at, recall_source_url,
          recall_title, content_hash, content_fidelity, chunk_count,
          imported_at, last_seen_at, last_synced_at, sync_status, metadata_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      "card-1",
      "recall-1",
      "2026-06-24T00:00:00Z",
      "https://example.com/a",
      "Synthetic Recall",
      "hash-1",
      "api_chunks_unverified",
      3,
      10,
      10,
      10,
      "imported",
      JSON.stringify({ source: "synthetic" }),
    );

    const syncItem = db
      .prepare("SELECT item_id, content_fidelity, sync_status FROM recall_sync_items WHERE recall_card_id = ?")
      .get("card-1") as {
      item_id: string;
      content_fidelity: string;
      sync_status: string;
    };
    assert.deepEqual(syncItem, {
      item_id: "recall-1",
      content_fidelity: "api_chunks_unverified",
      sync_status: "imported",
    });

    assert.throws(
      () =>
        db
          .prepare("INSERT INTO recall_sync_items (recall_card_id, last_seen_at, content_fidelity) VALUES (?, ?, ?)")
          .run("bad-fidelity", 10, "full_text"),
      /CHECK constraint failed/,
    );

    db.prepare(
      `
        INSERT INTO recall_sync_runs (
          id, mode, started_at, completed_at, state, date_from, date_to,
          cards_seen, cards_imported, cards_upgraded, cards_skipped,
          cards_changed_remote, cards_blocked, total_chars_planned,
          total_chunks_fetched, last_error, report_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      "run-blocked-1",
      "dry_run",
      20,
      30,
      "blocked",
      "2026-06-24T00:00:00.000Z",
      "2026-06-24T01:00:00.000Z",
      4,
      0,
      1,
      2,
      1,
      4,
      1000,
      12,
      "cap exceeded",
      JSON.stringify({ state: "blocked", cardsBlocked: 4 }),
    );

    const run = db
      .prepare(
        `SELECT state, cards_upgraded, cards_changed_remote, cards_blocked
         FROM recall_sync_runs WHERE id = ?`,
      )
      .get("run-blocked-1") as {
      state: string;
      cards_upgraded: number;
      cards_changed_remote: number;
      cards_blocked: number;
    };
    assert.deepEqual(run, {
      state: "blocked",
      cards_upgraded: 1,
      cards_changed_remote: 1,
      cards_blocked: 4,
    });

    const foreignKeyIssues = db.prepare("PRAGMA foreign_key_check").all();
    assert.deepEqual(foreignKeyIssues, []);
  } finally {
    db.close();
  }
});
