-- 016_capture_artifacts_hardening.sql — v0.7.6 artifact safety metadata
--
-- Keeps the original `path` column for compatibility with existing rows while
-- adding relative-path, truncation, and write-result metadata for new rows.

ALTER TABLE capture_artifacts ADD COLUMN relative_path TEXT;
ALTER TABLE capture_artifacts ADD COLUMN truncated INTEGER NOT NULL DEFAULT 0;
ALTER TABLE capture_artifacts ADD COLUMN write_status TEXT NOT NULL DEFAULT 'ok'
  CHECK (write_status IN ('ok', 'failed', 'skipped'));
ALTER TABLE capture_artifacts ADD COLUMN error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_capture_artifacts_relative_path
  ON capture_artifacts(relative_path);

CREATE INDEX IF NOT EXISTS idx_capture_artifacts_write_status
  ON capture_artifacts(write_status);

