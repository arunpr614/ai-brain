-- 020_recall_sync.sql - Recall daily snapshot import foundation
--
-- Adds first-class Recall ingestion provenance and durable sync bookkeeping.
-- SQLite cannot ALTER a CHECK constraint in place, so `items` is rebuilt to
-- extend capture_source with 'recall' while preserving the post-019 schema.

PRAGMA foreign_keys = OFF;
PRAGMA legacy_alter_table = ON;

DROP TABLE IF EXISTS items_new;

CREATE TABLE items_new (
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
                       CHECK (capture_source IN ('web', 'android', 'extension', 'telegram', 'system', 'unknown', 'recall')),
  source_platform    TEXT,
  capture_quality    TEXT,
  extraction_method  TEXT,
  extraction_version TEXT,
  published_at       INTEGER,
  thumbnail_url      TEXT,
  description        TEXT
);

INSERT INTO items_new (
  id, source_type, source_url, title, author, body, summary, category,
  captured_at, enriched_at, enrichment_state, extraction_warning,
  total_pages, total_chars, quotes, duration_seconds, batch_id,
  capture_source, source_platform, capture_quality, extraction_method,
  extraction_version, published_at, thumbnail_url, description
)
SELECT
  id, source_type, source_url, title, author, body, summary, category,
  captured_at, enriched_at, enrichment_state, extraction_warning,
  total_pages, total_chars, quotes, duration_seconds, batch_id,
  capture_source, source_platform, capture_quality, extraction_method,
  extraction_version, published_at, thumbnail_url, description
FROM items;

DROP TRIGGER IF EXISTS items_fts_ai;
DROP TRIGGER IF EXISTS items_fts_ad;
DROP TRIGGER IF EXISTS items_fts_au;
DROP TRIGGER IF EXISTS items_enqueue_enrichment;
DROP TRIGGER IF EXISTS items_enqueue_embedding;
DROP INDEX IF EXISTS idx_items_captured_at;
DROP INDEX IF EXISTS idx_items_category;
DROP INDEX IF EXISTS idx_items_enrichment_state;
DROP INDEX IF EXISTS idx_items_batch_id;
DROP INDEX IF EXISTS idx_items_capture_source;
DROP INDEX IF EXISTS idx_items_source_platform;
DROP INDEX IF EXISTS idx_items_capture_quality;
DROP INDEX IF EXISTS idx_items_published_at;

DROP TABLE items;
ALTER TABLE items_new RENAME TO items;

CREATE INDEX IF NOT EXISTS idx_items_captured_at      ON items(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_category         ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_enrichment_state ON items(enrichment_state);
CREATE INDEX IF NOT EXISTS idx_items_batch_id
  ON items(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_capture_source
  ON items(capture_source);
CREATE INDEX IF NOT EXISTS idx_items_source_platform
  ON items(source_platform);
CREATE INDEX IF NOT EXISTS idx_items_capture_quality
  ON items(capture_quality);
CREATE INDEX IF NOT EXISTS idx_items_published_at
  ON items(published_at DESC);

CREATE TRIGGER IF NOT EXISTS items_fts_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts (id, title, body) VALUES (new.id, new.title, new.body);
END;
CREATE TRIGGER IF NOT EXISTS items_fts_ad AFTER DELETE ON items BEGIN
  DELETE FROM items_fts WHERE id = old.id;
END;
CREATE TRIGGER IF NOT EXISTS items_fts_au AFTER UPDATE OF title, body ON items BEGIN
  DELETE FROM items_fts WHERE id = old.id;
  INSERT INTO items_fts (id, title, body) VALUES (new.id, new.title, new.body);
END;

CREATE TRIGGER IF NOT EXISTS items_enqueue_enrichment AFTER INSERT ON items BEGIN
  INSERT OR IGNORE INTO enrichment_jobs (item_id) VALUES (new.id);
END;

CREATE TRIGGER IF NOT EXISTS items_enqueue_embedding AFTER UPDATE OF enrichment_state ON items
WHEN new.enrichment_state = 'done' AND old.enrichment_state != 'done'
BEGIN
  INSERT OR IGNORE INTO embedding_jobs (item_id) VALUES (new.id);
END;

CREATE TABLE IF NOT EXISTS recall_sync_items (
  recall_card_id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
  recall_created_at TEXT,
  recall_source_url TEXT,
  recall_title TEXT,
  recall_image_url TEXT,
  content_hash TEXT,
  content_fidelity TEXT NOT NULL DEFAULT 'blocked_unknown'
    CHECK (content_fidelity IN (
      'complete_enough_for_daily_import',
      'api_chunks_unverified',
      'possibly_truncated',
      'metadata_only',
      'blocked_unknown'
    )),
  chunk_count INTEGER NOT NULL DEFAULT 0,
  imported_at INTEGER,
  last_seen_at INTEGER NOT NULL,
  last_synced_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'seen'
    CHECK (sync_status IN ('seen', 'imported', 'skipped', 'blocked', 'changed_remote', 'error')),
  last_error TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_recall_sync_items_item
  ON recall_sync_items(item_id);
CREATE INDEX IF NOT EXISTS idx_recall_sync_items_status
  ON recall_sync_items(sync_status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_recall_sync_items_source_url
  ON recall_sync_items(recall_source_url);

CREATE TABLE IF NOT EXISTS recall_sync_runs (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('dry_run', 'apply')),
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  state TEXT NOT NULL CHECK (state IN ('running', 'done', 'error', 'blocked')),
  date_from TEXT,
  date_to TEXT,
  cards_seen INTEGER NOT NULL DEFAULT 0,
  cards_imported INTEGER NOT NULL DEFAULT 0,
  cards_upgraded INTEGER NOT NULL DEFAULT 0,
  cards_skipped INTEGER NOT NULL DEFAULT 0,
  cards_changed_remote INTEGER NOT NULL DEFAULT 0,
  cards_blocked INTEGER NOT NULL DEFAULT 0,
  total_chars_planned INTEGER NOT NULL DEFAULT 0,
  total_chunks_fetched INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  report_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_recall_sync_runs_state_started
  ON recall_sync_runs(state, started_at DESC);

CREATE TABLE IF NOT EXISTS recall_sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

PRAGMA foreign_keys = ON;
PRAGMA legacy_alter_table = OFF;
