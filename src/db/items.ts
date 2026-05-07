/**
 * Item repository — v0.1.0 scope: create manual notes, list, read.
 * URL + PDF ingestion arrive in v0.2.0.
 */
import { getDb, newId, type ItemRow } from "./client";

export interface CreateNoteInput {
  title: string;
  body: string;
}

export function createNote({ title, body }: CreateNoteInput): ItemRow {
  const db = getDb();
  const id = newId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO items (id, source_type, title, body, captured_at, total_chars)
     VALUES (?, 'note', ?, ?, ?, ?)`,
  ).run(id, title, body, now, body.length);
  return getItem(id)!;
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
