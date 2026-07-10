-- 017_topics.sql — UX v2 Included Topics
-- AI-detected concepts are separate from user-managed tags.

CREATE TABLE IF NOT EXISTS topics (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  source      TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'system')),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS item_topics (
  item_id     TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  topic_id    TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  confidence  REAL,
  evidence    TEXT,
  detected_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (item_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_item_topics_topic ON item_topics(topic_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_topics_item ON item_topics(item_id, detected_at DESC);
