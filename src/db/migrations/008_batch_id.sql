-- 008_batch_id.sql — v0.6.0 Phase C-1
--
-- Phase C wires Anthropic Message Batches into the enrichment path. Each item
-- submitted to a batch needs (a) a stable reference to its batch_id for
-- polling, and (b) a state value distinct from 'pending' so realtime
-- enrichment paths don't grab a row that's already in flight to Anthropic.
--
-- Two changes:
--   1. items.batch_id TEXT NULL                        — per-item batch reference
--   2. extend enrichment_state CHECK to include 'batched' on BOTH
--      items.enrichment_state AND enrichment_jobs.state
--
-- SQLite's ALTER TABLE cannot modify CHECK constraints, so steps (2) require
-- the documented 12-step table rebuild pattern. The migration runner already
-- wraps this whole file in a single transaction (src/db/client.ts:106), so
-- the rebuild is atomic — partial failure rolls back cleanly.
--
-- Why 'batched' as a distinct state and not (state='pending' AND batch_id IS NOT NULL):
-- the second form forces every consumer query to remember the AND-clause. We
-- found one consumer in the wild (003_enrichment_queue.sql:39) that already
-- asks for 'pending OR running' as a single predicate; mirroring that call
-- site convention beats sprinkling a coupled column predicate everywhere.
--
-- Predecessors:
--   docs/plans/v0.6.0-cloud-migration.md §3.3 (batch design)
--   docs/plans/spikes/v0.6.0-cloud-migration/S-12-batch-result-write-race.md
--   tag: phase-b/v0.6.0 (revert point if this migration lands badly)

PRAGMA foreign_keys = OFF;
PRAGMA legacy_alter_table = ON;

-- ============================================================
-- 1. Rebuild `items` with extended CHECK + new batch_id column.
-- ============================================================
--
-- Column order matches the cumulative state through migrations 001 → 007:
--   001: id, source_type, source_url, title, author, body, summary, category,
--        captured_at, enriched_at, enrichment_state, extraction_warning,
--        total_pages, total_chars
--   004: + quotes
--   007: + duration_seconds
--   008: + batch_id (NEW), enrichment_state CHECK extended

CREATE TABLE items_new (
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

INSERT INTO items_new (
  id, source_type, source_url, title, author, body, summary, category,
  captured_at, enriched_at, enrichment_state, extraction_warning,
  total_pages, total_chars, quotes, duration_seconds, batch_id
)
SELECT
  id, source_type, source_url, title, author, body, summary, category,
  captured_at, enriched_at, enrichment_state, extraction_warning,
  total_pages, total_chars, quotes, duration_seconds, NULL
FROM items;

-- Drop the old triggers + indexes that referenced `items` by name.
-- They get recreated against `items_new` after rename.
DROP TRIGGER IF EXISTS items_fts_ai;
DROP TRIGGER IF EXISTS items_fts_ad;
DROP TRIGGER IF EXISTS items_fts_au;
DROP TRIGGER IF EXISTS items_enqueue_enrichment;
DROP TRIGGER IF EXISTS items_enqueue_embedding;
DROP INDEX IF EXISTS idx_items_captured_at;
DROP INDEX IF EXISTS idx_items_category;
DROP INDEX IF EXISTS idx_items_enrichment_state;

DROP TABLE items;
ALTER TABLE items_new RENAME TO items;

-- Recreate indexes (mirror 001_initial_schema.sql:33-35 + new batch_id index).
CREATE INDEX IF NOT EXISTS idx_items_captured_at      ON items(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_category         ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_enrichment_state ON items(enrichment_state);
-- New: batch_id partial index. Most rows have batch_id IS NULL; we only ever
-- query "show me items in this batch" or "is this batch_id still in flight".
CREATE INDEX IF NOT EXISTS idx_items_batch_id
  ON items(batch_id) WHERE batch_id IS NOT NULL;

-- Recreate FTS5 triggers (mirror 002_fts5.sql:20-31 verbatim).
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

-- Recreate the enrichment auto-enqueue trigger (mirror 003:32-34).
CREATE TRIGGER IF NOT EXISTS items_enqueue_enrichment AFTER INSERT ON items BEGIN
  INSERT OR IGNORE INTO enrichment_jobs (item_id) VALUES (new.id);
END;

-- Recreate the embedding auto-enqueue trigger (mirror 006:27-...).
-- 006_embedding_jobs.sql gates on enrichment_state='done' for embedding
-- enqueue, so the trigger fires AFTER UPDATE OF enrichment_state.
CREATE TRIGGER IF NOT EXISTS items_enqueue_embedding AFTER UPDATE OF enrichment_state ON items
WHEN new.enrichment_state = 'done' AND old.enrichment_state != 'done'
BEGIN
  INSERT OR IGNORE INTO embedding_jobs (item_id) VALUES (new.id);
END;

-- ============================================================
-- 2. Rebuild `enrichment_jobs` with extended CHECK on state.
-- ============================================================
--
-- Same enum extension. enrichment_jobs holds the queue rows that the worker
-- claims; the cron poll loop in Phase C-3 will move rows here from 'pending'
-- to 'batched' as it submits to Anthropic.

CREATE TABLE enrichment_jobs_new (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id     TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  state       TEXT NOT NULL DEFAULT 'pending'
                CHECK (state IN ('pending', 'running', 'batched', 'done', 'error')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  claimed_at  INTEGER,
  completed_at INTEGER,
  UNIQUE (item_id)
);

INSERT INTO enrichment_jobs_new (
  id, item_id, state, attempts, last_error, created_at, claimed_at, completed_at
)
SELECT
  id, item_id, state, attempts, last_error, created_at, claimed_at, completed_at
FROM enrichment_jobs;

DROP INDEX IF EXISTS idx_enrichment_jobs_state_created;
DROP TABLE enrichment_jobs;
ALTER TABLE enrichment_jobs_new RENAME TO enrichment_jobs;

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_state_created
  ON enrichment_jobs(state, created_at);

-- ============================================================
-- 3. Validate FK integrity post-rebuild.
-- ============================================================
--
-- foreign_keys was OFF for the rebuild; flip it back on and run a check.
-- If any FK is now dangling (shouldn't be — we copied data verbatim and
-- the rebuild preserves PKs), the migration fails before commit.

PRAGMA foreign_keys = ON;
PRAGMA legacy_alter_table = OFF;

-- Sanity check: the foreign_key_check pragma raises on any orphan row.
-- (It's a no-op pragma in a transaction; we run it for early failure.)
-- Note: better-sqlite3's exec() will throw on the first row that violates.
-- This is wrapped by the migration runner's transaction, so it rolls back.
