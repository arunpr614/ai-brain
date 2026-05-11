/**
 * Item repository. v0.2.0 adds URL + PDF capture; v0.1.0's note creation
 * remains unchanged. All inserts go through `insertCaptured` so every new
 * source_type lands on the same pipeline (capture → store → search).
 */
import { getDb, newId, type ItemRow } from "./client";

export type SourceType = ItemRow["source_type"];

export interface CreateNoteInput {
  title: string;
  body: string;
}

export interface InsertCapturedInput {
  source_type: SourceType;
  title: string;
  body: string;
  source_url?: string | null;
  author?: string | null;
  total_pages?: number | null;
  total_chars?: number | null;
  extraction_warning?: string | null;
  captured_at?: number;
  /** Duration in seconds for video items (youtube). v0.5.1. */
  duration_seconds?: number | null;
}

export function insertCaptured(input: InsertCapturedInput): ItemRow {
  const db = getDb();
  const id = newId();
  const now = input.captured_at ?? Date.now();
  const totalChars = input.total_chars ?? input.body.length;
  db.prepare(
    `INSERT INTO items (
        id, source_type, source_url, title, author, body,
        captured_at, total_pages, total_chars, extraction_warning,
        duration_seconds
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.source_type,
    input.source_url ?? null,
    input.title,
    input.author ?? null,
    input.body,
    now,
    input.total_pages ?? null,
    totalChars,
    input.extraction_warning ?? null,
    input.duration_seconds ?? null,
  );
  return getItem(id)!;
}

export function createNote({ title, body }: CreateNoteInput): ItemRow {
  return insertCaptured({ source_type: "note", title, body });
}

export function getItem(id: string): ItemRow | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM items WHERE id = ?")
    .get(id) as ItemRow | undefined;
  return row ?? null;
}

export function listItems(options: { limit?: number; offset?: number } = {}): ItemRow[] {
  const { limit = 100, offset = 0 } = options;
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM items ORDER BY captured_at DESC LIMIT ? OFFSET ?",
    )
    .all(limit, offset) as ItemRow[];
}

export function countItems(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as n FROM items").get() as {
    n: number;
  };
  return row.n;
}

export function deleteItem(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM items WHERE id = ?").run(id);
}

/**
 * Warn-if-duplicate-URL guard. v0.2.0 decision: warn, do not block.
 * Returns the existing item id if a live duplicate is found.
 */
export function findItemByUrl(url: string): ItemRow | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM items WHERE source_url = ? ORDER BY captured_at DESC LIMIT 1")
    .get(url) as ItemRow | undefined;
  return row ?? null;
}

/**
 * FTS5-backed full-text search (v0.2.0 F-104). Ranks by bm25.
 *
 * Special-character safety: we wrap the user query in double quotes for
 * FTS5 phrase-match, which neutralises operators (`AND`, `OR`, `-`, `:`,
 * parens, etc.). Embedded double quotes are escaped by doubling.
 *
 * v0.4.0 T-6 (critique A-8): the old LIKE fallback is removed. It was
 * written defensively in v0.2.0 but phrase quoting covers every real
 * failure mode, and the fallback silently returned non-ranked rows when
 * it did fire — worse than propagating the error.
 */
export function searchItems(query: string, limit = 50): ItemRow[] {
  const q = query.trim();
  if (!q) return [];
  const db = getDb();
  const safe = q.replace(/"/g, '""');
  return db
    .prepare(
      `SELECT items.* FROM items_fts
       JOIN items ON items.id = items_fts.id
       WHERE items_fts MATCH ?
       ORDER BY bm25(items_fts) ASC
       LIMIT ?`,
    )
    .all(`"${safe}"`, limit) as ItemRow[];
}
