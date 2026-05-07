-- 002_fts5.sql — v0.2.0 F-104
-- Full-text search over items (title + body) via SQLite FTS5.
-- Uses the `porter` tokenizer for English stemming; `unicode61` for diacritic folding.
-- Contentless external-content pattern: items_fts mirrors selected columns from `items`
-- and triggers keep them in sync. Saves ~30-40% storage vs. a content-owned FTS table.

CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  id UNINDEXED,
  title,
  body,
  tokenize = "porter unicode61 remove_diacritics 2"
);

-- Backfill any items already captured before this migration ran.
INSERT INTO items_fts (id, title, body)
SELECT id, title, body FROM items
WHERE id NOT IN (SELECT id FROM items_fts);

-- Keep FTS in sync with the items table.
CREATE TRIGGER IF NOT EXISTS items_fts_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts (id, title, body) VALUES (new.id, new.title, new.body);
END;

CREATE TRIGGER IF NOT EXISTS items_fts_ad AFTER DELETE ON items BEGIN
  DELETE FROM items_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS items_fts_au AFTER UPDATE OF title, body ON items BEGIN
  DELETE FROM items_fts WHERE id = old.id;
  INSERT INTO items_fts (id, title, body) VALUES (new.id, new.title, new.body);
END;
