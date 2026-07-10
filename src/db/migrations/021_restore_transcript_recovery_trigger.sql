-- 021_restore_transcript_recovery_trigger.sql
--
-- The consolidated production history applies 017_transcript_recovery before
-- 020_recall_sync. Migration 020 rebuilds the items table, which drops the
-- 017 AFTER INSERT trigger. Restore it and backfill any weak YouTube captures
-- created after the rebuild so main-line transcript recovery remains intact.

DROP TRIGGER IF EXISTS items_enqueue_youtube_transcript_recovery;

CREATE TRIGGER items_enqueue_youtube_transcript_recovery
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
