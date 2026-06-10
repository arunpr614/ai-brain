-- 009_telegram_source_type.sql — v0.6.5 forward schema repair
--
-- Telegram capture stores bot-originated items as source_type='telegram'.
-- Some deployed databases may already have migrations 001..008 applied from
-- before Telegram was added to the source_type CHECK constraint. Editing old
-- migrations only helps fresh databases, so this forward migration rebuilds
-- `items` with the current enum. Historical migrations may also list
-- `telegram` for fresh installs, but this file is the deployed-DB repair.
--
-- SQLite cannot ALTER a CHECK constraint in place, so this follows the same
-- table-rebuild pattern used by 008_batch_id.sql. Migration 008 has already
-- added quotes, duration_seconds, batch_id, the batch index, and the relevant
-- FTS/enrichment/embedding triggers; all are preserved here.

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
  batch_id           TEXT
);

INSERT INTO items_new (
  id, source_type, source_url, title, author, body, summary, category,
  captured_at, enriched_at, enrichment_state, extraction_warning,
  total_pages, total_chars, quotes, duration_seconds, batch_id
)
SELECT
  id, source_type, source_url, title, author, body, summary, category,
  captured_at, enriched_at, enrichment_state, extraction_warning,
  total_pages, total_chars, quotes, duration_seconds, batch_id
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

DROP TABLE items;
ALTER TABLE items_new RENAME TO items;

CREATE INDEX IF NOT EXISTS idx_items_captured_at      ON items(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_category         ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_enrichment_state ON items(enrichment_state);
CREATE INDEX IF NOT EXISTS idx_items_batch_id
  ON items(batch_id) WHERE batch_id IS NOT NULL;

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

PRAGMA foreign_keys = ON;
PRAGMA legacy_alter_table = OFF;
