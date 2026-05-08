-- 006_embedding_jobs.sql — v0.4.0 Ask (RAG)
-- Sibling queue to enrichment_jobs for the embed-after-enrich stage.
--
-- Schema mirrors enrichment_jobs (F-045, F-050 precedent) per v0.4.0 plan
-- review patch P-3: attempts + claimed_at + last_error so retry-exhaust
-- can be marked failed and sweepStaleClaims() can re-queue after 10 min.

CREATE TABLE IF NOT EXISTS embedding_jobs (
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

CREATE INDEX IF NOT EXISTS idx_embedding_jobs_state_created
  ON embedding_jobs(state, created_at);

-- Enqueue an item for embedding when its enrichment flips to 'done'.
-- Embedding depends on cleaned body + summary from enrichment, so we chain
-- rather than run in parallel.
CREATE TRIGGER IF NOT EXISTS items_enqueue_embedding
  AFTER UPDATE OF enrichment_state ON items
  WHEN new.enrichment_state = 'done' AND old.enrichment_state != 'done'
BEGIN
  INSERT OR IGNORE INTO embedding_jobs (item_id) VALUES (new.id);
END;

-- Backfill: enqueue any already-enriched items that don't have chunks yet.
-- One-shot per migration application.
INSERT OR IGNORE INTO embedding_jobs (item_id)
SELECT i.id FROM items i
WHERE i.enrichment_state = 'done'
  AND NOT EXISTS (SELECT 1 FROM chunks c WHERE c.item_id = i.id);
