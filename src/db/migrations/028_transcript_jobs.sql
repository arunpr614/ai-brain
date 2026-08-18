-- 028_transcript_jobs.sql — Multi-tier YouTube transcript worker queue & worker presence enhancements

ALTER TABLE transcript_jobs
  ADD COLUMN preferred_model TEXT NOT NULL DEFAULT 'whisper-large-v3-turbo';

ALTER TABLE transcript_jobs
  ADD COLUMN worker_metadata TEXT;

ALTER TABLE transcript_jobs
  ADD COLUMN worker_name TEXT;

CREATE TABLE IF NOT EXISTS worker_presence (
  id                 TEXT PRIMARY KEY,
  hostname           TEXT,
  system_info        TEXT,
  last_heartbeat_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_at         INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_worker_presence_heartbeat
  ON worker_presence (last_heartbeat_at DESC);
