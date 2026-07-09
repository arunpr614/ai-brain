-- 018_transcript_policy_sources.sql - YouTube transcript policy and source provenance
--
-- Phase 1A stores machine-checkable transcript acquisition decisions and
-- source-level provenance. Segment storage is intentionally deferred to a
-- later migration so the first shippable path can stay paste-only.

CREATE TABLE IF NOT EXISTS capture_policy_decisions (
  id                 TEXT PRIMARY KEY,
  item_id            TEXT REFERENCES items(id) ON DELETE CASCADE,
  source_url         TEXT NOT NULL,
  platform           TEXT NOT NULL CHECK (platform IN ('youtube', 'uploaded_media', 'manual')),
  environment        TEXT NOT NULL CHECK (environment IN ('production', 'development', 'test', 'lab')),
  rights_basis       TEXT NOT NULL CHECK (rights_basis IN (
    'user_provided_transcript',
    'owned_youtube_channel',
    'authorized_youtube_video',
    'owned_uploaded_media',
    'public_lab_only',
    'blocked_unknown_rights'
  )),
  method             TEXT NOT NULL CHECK (method IN (
    'user_paste',
    'uploaded_file',
    'youtube_official_caption',
    'owned_media_stt',
    'lab_public_caption'
  )),
  retention_class    TEXT NOT NULL CHECK (retention_class IN (
    'full_text_allowed',
    'derived_metrics_only',
    'metadata_only'
  )),
  blocked_reason     TEXT,
  production_allowed INTEGER NOT NULL DEFAULT 0 CHECK (production_allowed IN (0, 1)),
  legal_approval_id  TEXT,
  created_at         INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_capture_policy_item_id
  ON capture_policy_decisions(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capture_policy_source_url
  ON capture_policy_decisions(source_url, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capture_policy_created_at
  ON capture_policy_decisions(created_at DESC);

CREATE TABLE IF NOT EXISTS transcript_sources (
  id                 TEXT PRIMARY KEY,
  item_id            TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  policy_decision_id TEXT NOT NULL REFERENCES capture_policy_decisions(id),
  source_kind        TEXT NOT NULL CHECK (source_kind IN (
    'user_paste',
    'uploaded_file',
    'youtube_official_caption',
    'owned_media_stt',
    'lab_public_caption'
  )),
  language_code      TEXT,
  caption_source_class TEXT NOT NULL CHECK (caption_source_class IN (
    'manual',
    'asr',
    'standard',
    'forced',
    'stt',
    'user_provided',
    'unknown'
  )),
  timestamp_mode     TEXT NOT NULL CHECK (timestamp_mode IN ('timestamped', 'paragraph_only', 'inferred')),
  provenance_json    TEXT NOT NULL,
  retention_class    TEXT NOT NULL CHECK (retention_class IN (
    'full_text_allowed',
    'derived_metrics_only',
    'metadata_only'
  )),
  text_sha256        TEXT NOT NULL,
  segment_count      INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL CHECK (status IN ('active', 'superseded', 'deleted', 'blocked')),
  created_at         INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_transcript_sources_item_id
  ON transcript_sources(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcript_sources_policy_decision_id
  ON transcript_sources(policy_decision_id);
CREATE INDEX IF NOT EXISTS idx_transcript_sources_source_kind
  ON transcript_sources(source_kind, created_at DESC);
