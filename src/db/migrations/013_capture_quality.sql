-- 013_capture_quality.sql — v0.7.5 Capture quality foundation
--
-- Adds platform and quality metadata while keeping the existing source_type
-- contract intact. All columns are nullable so older captures and tests keep
-- working while new capture paths progressively populate richer metadata.

ALTER TABLE items ADD COLUMN source_platform TEXT;
ALTER TABLE items ADD COLUMN capture_quality TEXT;
ALTER TABLE items ADD COLUMN extraction_method TEXT;
ALTER TABLE items ADD COLUMN extraction_version TEXT;
ALTER TABLE items ADD COLUMN published_at INTEGER;
ALTER TABLE items ADD COLUMN thumbnail_url TEXT;
ALTER TABLE items ADD COLUMN description TEXT;

UPDATE items
SET source_platform = CASE
  WHEN source_type = 'youtube' THEN 'youtube'
  WHEN source_type = 'pdf' THEN 'pdf'
  WHEN source_type = 'note' THEN 'note'
  WHEN source_url LIKE '%linkedin.com/%' THEN 'linkedin'
  WHEN source_url LIKE '%substack.com/%' THEN 'substack'
  WHEN source_type = 'url' THEN 'generic_article'
  ELSE source_type
END
WHERE source_platform IS NULL;

UPDATE items
SET capture_quality = CASE
  WHEN extraction_warning = 'youtube_antibot_metadata_only' THEN 'metadata_only'
  WHEN extraction_warning = 'no_transcript' THEN 'metadata_only'
  WHEN source_type = 'youtube' THEN 'transcript'
  WHEN source_type = 'note' THEN 'user_provided_full_text'
  WHEN source_type IN ('url', 'pdf') THEN 'full_text'
  ELSE NULL
END
WHERE capture_quality IS NULL;

UPDATE items
SET extraction_method = CASE
  WHEN extraction_warning = 'youtube_antibot_metadata_only' THEN 'youtube_oembed_metadata'
  WHEN source_type = 'youtube' THEN 'youtube_innertube_timedtext'
  WHEN source_type = 'note' THEN 'manual_note'
  WHEN source_type = 'pdf' THEN 'pdf'
  WHEN source_type = 'url' THEN 'legacy'
  ELSE NULL
END
WHERE extraction_method IS NULL;

UPDATE items
SET extraction_version = 'legacy'
WHERE extraction_version IS NULL
  AND (source_platform IS NOT NULL OR capture_quality IS NOT NULL OR extraction_method IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_items_source_platform ON items(source_platform);
CREATE INDEX IF NOT EXISTS idx_items_capture_quality ON items(capture_quality);
CREATE INDEX IF NOT EXISTS idx_items_published_at ON items(published_at DESC);
