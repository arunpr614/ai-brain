-- 012_capture_source.sql — track ingestion channel separately from content type.

ALTER TABLE items
  ADD COLUMN capture_source TEXT NOT NULL DEFAULT 'web'
  CHECK (capture_source IN ('web', 'android', 'extension', 'telegram', 'system', 'unknown'));

CREATE INDEX IF NOT EXISTS idx_items_capture_source
  ON items(capture_source);
