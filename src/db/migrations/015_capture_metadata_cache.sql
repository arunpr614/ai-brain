-- 015_capture_metadata_cache.sql — v0.7.6 bounded metadata enrichment cache
--
-- Caches optional third-party metadata responses so capture enrichment does
-- not repeatedly spend quota for the same resource. Payloads are JSON strings
-- controlled by the capture adapter.

CREATE TABLE IF NOT EXISTS capture_metadata_cache (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok',
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE(platform, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_capture_metadata_cache_lookup
  ON capture_metadata_cache(platform, cache_key, expires_at);

