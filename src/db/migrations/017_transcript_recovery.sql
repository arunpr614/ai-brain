-- 017_transcript_recovery.sql — v0.8.3 YouTube transcript recovery
--
-- Durable queue + attempt history for YouTube captures that saved metadata
-- but did not get a transcript. The queue is intentionally separate from
-- enrichment_jobs: enrichment summarizes content Brain already has, while
-- transcript recovery tries to improve weak source capture.

CREATE TABLE IF NOT EXISTS transcript_jobs (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id            TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  source_platform    TEXT NOT NULL,
  video_id           TEXT,
  state              TEXT NOT NULL DEFAULT 'pending'
                       CHECK (state IN (
                         'pending',
                         'running',
                         'retryable_error',
                         'manual_needed',
                         'ignored',
                         'done'
                       )),
  priority           INTEGER NOT NULL DEFAULT 0,
  attempts           INTEGER NOT NULL DEFAULT 0,
  max_attempts       INTEGER NOT NULL DEFAULT 5,
  next_run_at        INTEGER,
  claimed_at         INTEGER,
  completed_at       INTEGER,
  last_attempt_id    INTEGER,
  last_provider      TEXT,
  last_error_code    TEXT,
  last_error_message TEXT,
  created_at         INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE (item_id)
);

CREATE INDEX IF NOT EXISTS idx_transcript_jobs_state_next_run
  ON transcript_jobs(state, next_run_at, priority, created_at);

CREATE INDEX IF NOT EXISTS idx_transcript_jobs_item
  ON transcript_jobs(item_id);

CREATE TABLE IF NOT EXISTS transcript_attempts (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id                   INTEGER NOT NULL REFERENCES transcript_jobs(id) ON DELETE CASCADE,
  item_id                  TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  attempt_number           INTEGER NOT NULL,
  provider                 TEXT NOT NULL,
  state                    TEXT NOT NULL
                             CHECK (state IN ('success', 'retryable_error', 'terminal_error', 'skipped')),
  retryable                INTEGER NOT NULL DEFAULT 0,
  error_code               TEXT,
  error_message            TEXT,
  status_code              INTEGER,
  started_at               INTEGER NOT NULL,
  finished_at              INTEGER,
  duration_ms              INTEGER,
  transcript_language      TEXT,
  transcript_is_generated  INTEGER,
  transcript_is_translated INTEGER,
  transcript_chars         INTEGER,
  artifact_ids_json        TEXT,
  created_at               INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE (job_id, attempt_number, provider)
);

CREATE INDEX IF NOT EXISTS idx_transcript_attempts_job_created
  ON transcript_attempts(job_id, created_at);

CREATE INDEX IF NOT EXISTS idx_transcript_attempts_item_created
  ON transcript_attempts(item_id, created_at);

CREATE TRIGGER IF NOT EXISTS items_enqueue_youtube_transcript_recovery
AFTER INSERT ON items
WHEN
  (
    new.source_platform IN ('youtube', 'youtube_short')
    OR new.source_type = 'youtube'
  )
  AND (
    new.capture_quality = 'metadata_only'
    OR new.extraction_warning IN (
      'no_transcript',
      'youtube_transcript_fetch_metadata_only',
      'youtube_antibot_metadata_only'
    )
  )
BEGIN
  INSERT OR IGNORE INTO transcript_jobs (
    item_id,
    source_platform,
    video_id,
    state,
    priority,
    next_run_at
  )
  VALUES (
    new.id,
    COALESCE(new.source_platform, new.source_type),
    NULL,
    'pending',
    10,
    unixepoch() * 1000
  );
END;

-- Backfill existing weak YouTube captures, including items saved before this
-- queue existed. Video IDs are filled by application code because SQLite
-- migrations should not carry YouTube URL parsing rules.
INSERT OR IGNORE INTO transcript_jobs (
  item_id,
  source_platform,
  video_id,
  state,
  priority,
  next_run_at
)
SELECT
  id,
  COALESCE(source_platform, source_type),
  NULL,
  'pending',
  10,
  unixepoch() * 1000
FROM items
WHERE
  (
    source_platform IN ('youtube', 'youtube_short')
    OR source_type = 'youtube'
  )
  AND (
    capture_quality = 'metadata_only'
    OR extraction_warning IN (
      'no_transcript',
      'youtube_transcript_fetch_metadata_only',
      'youtube_antibot_metadata_only'
    )
  );
