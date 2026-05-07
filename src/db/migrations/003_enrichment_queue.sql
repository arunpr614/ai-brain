-- 003_enrichment_queue.sql — v0.3.0 F-202
-- SQLite-backed job queue for async enrichment.
--
-- State machine:
--   pending  — newly queued, waiting for a worker
--   running  — a worker has claimed it (claimed_at set)
--   done     — enrichment completed successfully
--   error    — failed beyond retry (last_error set)
--
-- Workers claim jobs with an atomic UPDATE that bumps state + claimed_at.
-- If a worker crashes while running, the job is resurrected by a stale-claim
-- sweep (claimed_at > 5 min ago while still running).

CREATE TABLE IF NOT EXISTS enrichment_jobs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id     TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  state       TEXT NOT NULL DEFAULT 'pending'
                CHECK (state IN ('pending', 'running', 'done', 'error')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  claimed_at  INTEGER,
  completed_at INTEGER,
  UNIQUE (item_id)
);

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_state_created
  ON enrichment_jobs(state, created_at);

-- Auto-enqueue every new item for enrichment. Notes, URLs, PDFs — they all
-- pass through the same pipeline per BUILD_PLAN.md §2.3.
CREATE TRIGGER IF NOT EXISTS items_enqueue_enrichment AFTER INSERT ON items BEGIN
  INSERT OR IGNORE INTO enrichment_jobs (item_id) VALUES (new.id);
END;

-- Backfill: enqueue any existing items that haven't been enriched yet.
-- (Runs once per migration application.)
INSERT OR IGNORE INTO enrichment_jobs (item_id)
SELECT id FROM items WHERE enrichment_state IN ('pending', 'running');
