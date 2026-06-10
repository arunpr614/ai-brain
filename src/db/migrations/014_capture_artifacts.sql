-- 014_capture_artifacts.sql — v0.7.5 Raw capture artifacts
--
-- Stores pointers to capped/sanitized raw extraction artifacts. Large content
-- lives on disk; SQLite stores provenance and integrity metadata only.

CREATE TABLE IF NOT EXISTS capture_artifacts (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  path TEXT,
  content_type TEXT,
  sha256 TEXT,
  size_bytes INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_capture_artifacts_item ON capture_artifacts(item_id);
CREATE INDEX IF NOT EXISTS idx_capture_artifacts_kind ON capture_artifacts(kind);
