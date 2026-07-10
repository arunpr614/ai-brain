-- 023_source_aware_chunks.sql — F08 honest semantic provenance
--
-- Existing chunks may contain title + AI summary + captured body. They are
-- preserved exactly and labeled legacy_item_context. New writes identify
-- original, AI-summary, and manual-note semantics independently.

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS chunks_new;

CREATE TABLE chunks_new (
  id             TEXT PRIMARY KEY,
  item_id        TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  source_kind    TEXT NOT NULL DEFAULT 'legacy_item_context'
                   CHECK (source_kind IN (
                     'legacy_item_context',
                     'original_content',
                     'ai_summary',
                     'manual_note'
                   )),
  source_epoch   INTEGER NOT NULL DEFAULT 0 CHECK (source_epoch >= 0),
  source_version INTEGER NOT NULL DEFAULT 0 CHECK (source_version >= 0),
  idx            INTEGER NOT NULL,
  body           TEXT NOT NULL,
  token_count    INTEGER NOT NULL,
  UNIQUE (item_id, source_kind, idx)
);

INSERT INTO chunks_new (
  id, item_id, source_kind, source_epoch, source_version, idx, body, token_count
)
SELECT
  id, item_id, 'legacy_item_context', 0, 0, idx, body, token_count
FROM chunks;

DROP INDEX IF EXISTS idx_chunks_item_id;
DROP TABLE chunks;
ALTER TABLE chunks_new RENAME TO chunks;

CREATE INDEX idx_chunks_item_id ON chunks(item_id);
CREATE INDEX idx_chunks_item_source
  ON chunks(item_id, source_kind, source_epoch, source_version);

-- Never allocate from MAX(chunks_rowid) alone: production may contain vec0
-- rows whose bridge rows were lost. Seed beyond both high-water marks.
CREATE TABLE IF NOT EXISTS vector_rowid_sequence (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  next_rowid INTEGER NOT NULL CHECK (next_rowid > 0)
);

INSERT OR IGNORE INTO vector_rowid_sequence(singleton, next_rowid)
SELECT
  1,
  MAX(
    COALESCE((SELECT MAX(rowid) FROM chunks_rowid), 0),
    COALESCE((SELECT MAX(rowid) FROM chunks_vec), 0)
  ) + 1;

-- Content-free integration contract for future graph refresh consumers.
-- This does not claim that a persisted knowledge graph exists today.
CREATE TABLE IF NOT EXISTS item_semantic_events (
  id             TEXT PRIMARY KEY,
  item_id        TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  source_kind    TEXT NOT NULL
                   CHECK (source_kind IN (
                     'legacy_item_context', 'original_content', 'ai_summary', 'manual_note'
                   )),
  source_epoch   INTEGER NOT NULL DEFAULT 0,
  source_version INTEGER NOT NULL DEFAULT 0,
  action         TEXT NOT NULL CHECK (action IN ('indexed', 'purged')),
  created_at     INTEGER NOT NULL,
  UNIQUE (item_id, source_kind, source_epoch, source_version, action)
);

CREATE INDEX IF NOT EXISTS idx_item_semantic_events_created
  ON item_semantic_events(created_at DESC);

PRAGMA foreign_keys = ON;
