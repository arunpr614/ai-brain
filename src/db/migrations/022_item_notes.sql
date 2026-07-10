-- 022_item_notes.sql — F08 private per-item manual notes
--
-- Canonical Markdown is stored separately from captured source and AI output.
-- The content-free state row survives note deletion so delayed offline writes
-- cannot recreate a deleted note without an explicit new epoch.

CREATE TABLE IF NOT EXISTS item_note_state (
  item_id      TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  epoch        INTEGER NOT NULL CHECK (epoch >= 1),
  generation   INTEGER NOT NULL CHECK (generation >= 0),
  is_deleted   INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS item_notes (
  item_id            TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  epoch              INTEGER NOT NULL,
  generation         INTEGER NOT NULL,
  content_md         TEXT NOT NULL DEFAULT '',
  content_text       TEXT NOT NULL DEFAULT '',
  content_hash       TEXT NOT NULL,
  include_in_ai      INTEGER NOT NULL DEFAULT 0 CHECK (include_in_ai IN (0, 1)),
  indexed_generation INTEGER NOT NULL DEFAULT 0,
  last_saved_kind    TEXT NOT NULL
                       CHECK (last_saved_kind IN ('auto', 'manual', 'restore', 'recreate')),
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  FOREIGN KEY (item_id) REFERENCES item_note_state(item_id) ON DELETE CASCADE,
  UNIQUE (item_id, epoch, generation)
);

CREATE INDEX IF NOT EXISTS idx_item_notes_updated_at
  ON item_notes(updated_at DESC);

CREATE TABLE IF NOT EXISTS item_note_revisions (
  id                TEXT PRIMARY KEY,
  item_id           TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  epoch             INTEGER NOT NULL,
  source_generation INTEGER NOT NULL,
  content_md        TEXT NOT NULL,
  content_text      TEXT NOT NULL,
  content_hash      TEXT NOT NULL,
  include_in_ai     INTEGER NOT NULL DEFAULT 0 CHECK (include_in_ai IN (0, 1)),
  save_kind         TEXT NOT NULL
                      CHECK (save_kind IN ('manual', 'timed', 'pre_clear', 'conflict', 'restore')),
  created_at        INTEGER NOT NULL,
  UNIQUE (item_id, epoch, source_generation, save_kind)
);

CREATE INDEX IF NOT EXISTS idx_item_note_revisions_item_created
  ON item_note_revisions(item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS item_note_mutations (
  mutation_id        TEXT PRIMARY KEY,
  item_id            TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  editor_instance_id TEXT NOT NULL,
  epoch              INTEGER NOT NULL,
  operation          TEXT NOT NULL
                       CHECK (operation IN ('save', 'clear', 'delete', 'recreate', 'restore', 'ai_policy')),
  request_hash       TEXT NOT NULL,
  accepted_generation INTEGER NOT NULL,
  created_at         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_item_note_mutations_item_created
  ON item_note_mutations(item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS note_index_jobs (
  item_id            TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  target_epoch       INTEGER NOT NULL,
  target_generation  INTEGER NOT NULL,
  desired_action     TEXT NOT NULL CHECK (desired_action IN ('index', 'purge')),
  state              TEXT NOT NULL CHECK (state IN ('pending', 'running', 'done', 'error')),
  attempts           INTEGER NOT NULL DEFAULT 0,
  claimed_by         TEXT,
  lease_expires_at   INTEGER,
  last_error_code    TEXT,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  completed_at       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_note_index_jobs_state_updated
  ON note_index_jobs(state, updated_at);

CREATE TABLE IF NOT EXISTS note_ai_provider_consents (
  provider_fingerprint TEXT PRIMARY KEY,
  provider_label       TEXT NOT NULL,
  provider_scope       TEXT NOT NULL,
  approved_at          INTEGER,
  revoked_at           INTEGER
);

CREATE VIRTUAL TABLE IF NOT EXISTS item_notes_fts USING fts5(
  item_id UNINDEXED,
  body,
  tokenize = "porter unicode61 remove_diacritics 2"
);

CREATE TRIGGER IF NOT EXISTS item_notes_fts_ai
AFTER INSERT ON item_notes
WHEN length(trim(new.content_text)) > 0
BEGIN
  INSERT INTO item_notes_fts(item_id, body)
  VALUES (new.item_id, new.content_text);
END;

CREATE TRIGGER IF NOT EXISTS item_notes_fts_au
AFTER UPDATE OF content_text ON item_notes
BEGIN
  DELETE FROM item_notes_fts WHERE item_id = old.item_id;
  INSERT INTO item_notes_fts(item_id, body)
  SELECT new.item_id, new.content_text
  WHERE length(trim(new.content_text)) > 0;
END;

CREATE TRIGGER IF NOT EXISTS item_notes_fts_ad
AFTER DELETE ON item_notes
BEGIN
  DELETE FROM item_notes_fts WHERE item_id = old.item_id;
END;

