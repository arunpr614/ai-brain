-- 019_transcript_segments.sql - Transcript segment storage
--
-- Phase 1B stores parsed user-provided transcript file segments. Full text
-- remains in items.body for existing search/enrichment compatibility.

CREATE TABLE IF NOT EXISTS transcript_segments (
  id                   TEXT PRIMARY KEY,
  transcript_source_id TEXT NOT NULL REFERENCES transcript_sources(id) ON DELETE CASCADE,
  item_id              TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  idx                  INTEGER NOT NULL CHECK (idx >= 0),
  start_ms             INTEGER CHECK (start_ms IS NULL OR start_ms >= 0),
  duration_ms          INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  end_ms               INTEGER CHECK (end_ms IS NULL OR end_ms >= 0),
  text                 TEXT NOT NULL,
  text_sha256          TEXT NOT NULL,
  token_count          INTEGER,
  confidence           REAL,
  created_at           INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE(transcript_source_id, idx),
  CHECK (start_ms IS NULL OR end_ms IS NULL OR end_ms >= start_ms)
);

CREATE INDEX IF NOT EXISTS idx_transcript_segments_item_id
  ON transcript_segments(item_id, idx);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_source_start
  ON transcript_segments(transcript_source_id, start_ms, idx);
