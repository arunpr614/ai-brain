-- 011_telegram_updates.sql — durable Telegram webhook replay tracking.

CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id      INTEGER PRIMARY KEY,
  message_id     INTEGER,
  chat_id        INTEGER,
  from_id        INTEGER,
  file_unique_id TEXT,
  item_id        TEXT REFERENCES items(id) ON DELETE SET NULL,
  status         TEXT NOT NULL CHECK (status IN ('received', 'ignored', 'captured', 'failed')),
  error          TEXT,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  handled_at     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_telegram_updates_status
  ON telegram_updates(status);

CREATE INDEX IF NOT EXISTS idx_telegram_updates_file_unique_id
  ON telegram_updates(file_unique_id)
  WHERE file_unique_id IS NOT NULL;
