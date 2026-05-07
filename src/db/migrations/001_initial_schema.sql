-- 001_initial_schema.sql — v0.1.0 Foundation
-- Creates the core AI Brain tables. Edits forbidden once committed.
-- Add new migrations as 002_, 003_, etc.

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Single-user settings (key-value). Seeded lazily on first read.
CREATE TABLE IF NOT EXISTS settings (
  key          TEXT PRIMARY KEY,
  value        TEXT NOT NULL,
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Items = anything captured: URL, PDF, manual note (v0.1.0 only manual).
CREATE TABLE IF NOT EXISTS items (
  id               TEXT PRIMARY KEY,
  source_type      TEXT NOT NULL CHECK (source_type IN ('url', 'pdf', 'note', 'youtube', 'podcast', 'epub', 'docx')),
  source_url       TEXT,
  title            TEXT NOT NULL,
  author           TEXT,
  body             TEXT NOT NULL,
  summary          TEXT,
  category         TEXT,
  captured_at      INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  enriched_at      INTEGER,
  enrichment_state TEXT NOT NULL DEFAULT 'pending' CHECK (enrichment_state IN ('pending', 'running', 'done', 'error')),
  extraction_warning TEXT,
  total_pages      INTEGER,
  total_chars      INTEGER
);

CREATE INDEX IF NOT EXISTS idx_items_captured_at ON items(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_enrichment_state ON items(enrichment_state);

-- Chunks = text segments for RAG retrieval (v0.4.0 populates via embedding pipeline).
-- Pre-creating the schema lets v0.1.0's backup runner produce a stable DB shape.
CREATE TABLE IF NOT EXISTS chunks (
  id         TEXT PRIMARY KEY,
  item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  idx        INTEGER NOT NULL,
  body       TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  UNIQUE(item_id, idx)
);

CREATE INDEX IF NOT EXISTS idx_chunks_item_id ON chunks(item_id);

-- Collections — manual or auto (v0.6.0 topic-clusters).
CREATE TABLE IF NOT EXISTS collections (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'manual' CHECK (kind IN ('manual', 'auto')),
  description TEXT,
  pinned      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS item_collections (
  item_id       TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  added_at      INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (item_id, collection_id)
);

-- Tags — hierarchical via `/` separator in name (DESIGN_SYSTEM.md §8.2).
CREATE TABLE IF NOT EXISTS tags (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  kind       TEXT NOT NULL DEFAULT 'manual' CHECK (kind IN ('manual', 'auto')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id     TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

-- SRS review cards (v0.8.0 populates).
CREATE TABLE IF NOT EXISTS cards (
  id         TEXT PRIMARY KEY,
  item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  state      TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'review', 'relearning')),
  due_at     INTEGER,
  interval_days REAL NOT NULL DEFAULT 0,
  ease       REAL NOT NULL DEFAULT 2.5,
  reps       INTEGER NOT NULL DEFAULT 0,
  lapses     INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_cards_due_at ON cards(due_at);
CREATE INDEX IF NOT EXISTS idx_cards_item_id ON cards(item_id);

-- Chat history (v0.4.0 populates via RAG).
CREATE TABLE IF NOT EXISTS chat_threads (
  id         TEXT PRIMARY KEY,
  title      TEXT,
  scope      TEXT NOT NULL DEFAULT 'library' CHECK (scope IN ('library', 'item')),
  item_id    TEXT REFERENCES items(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id         TEXT PRIMARY KEY,
  thread_id  TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content    TEXT NOT NULL,
  citations  TEXT, -- JSON array of {item_id, chunk_id}
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at);

-- LLM usage tracking (for the $10/month API cost cap — BUILD_PLAN §15.1).
CREATE TABLE IF NOT EXISTS llm_usage (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  provider        TEXT NOT NULL CHECK (provider IN ('ollama', 'anthropic', 'openai')),
  model           TEXT NOT NULL,
  purpose         TEXT NOT NULL,
  input_tokens    INTEGER NOT NULL,
  output_tokens   INTEGER NOT NULL,
  cost_usd        REAL NOT NULL DEFAULT 0,
  billing_month   TEXT NOT NULL, -- "YYYY-MM"
  created_at      INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_billing_month ON llm_usage(billing_month);
