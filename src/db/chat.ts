/**
 * Chat threads + messages repository — v0.4.0 T-13.
 *
 * Tables were created in migration 001 (chat_threads, chat_messages). This
 * module provides typed CRUD for them plus helpers the /api/ask route
 * needs for persisting turns as they stream.
 */
import { getDb, newId } from "./client";

export type ChatScope = "library" | "item";

export interface ChatThreadRow {
  id: string;
  title: string | null;
  scope: ChatScope;
  item_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface ChatMessageRow {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  /** JSON-encoded array of retrieved chunk descriptors. */
  citations: string | null;
  created_at: number;
}

export interface Citation {
  chunk_id: string;
  item_id: string;
  item_title: string;
  similarity: number;
}

export interface CreateThreadInput {
  title?: string | null;
  scope?: ChatScope;
  item_id?: string | null;
}

export function createThread(input: CreateThreadInput = {}): ChatThreadRow {
  const db = getDb();
  const id = newId();
  const scope: ChatScope = input.scope ?? "library";
  db.prepare(
    `INSERT INTO chat_threads (id, title, scope, item_id) VALUES (?, ?, ?, ?)`,
  ).run(id, input.title ?? null, scope, input.item_id ?? null);
  return getThread(id)!;
}

export function getThread(id: string): ChatThreadRow | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM chat_threads WHERE id = ?`)
    .get(id) as ChatThreadRow | undefined;
  return row ?? null;
}

export function listThreads(opts: { scope?: ChatScope; item_id?: string } = {}): ChatThreadRow[] {
  const db = getDb();
  if (opts.item_id) {
    return db
      .prepare(
        `SELECT * FROM chat_threads WHERE scope = 'item' AND item_id = ? ORDER BY updated_at DESC`,
      )
      .all(opts.item_id) as ChatThreadRow[];
  }
  if (opts.scope) {
    return db
      .prepare(`SELECT * FROM chat_threads WHERE scope = ? ORDER BY updated_at DESC`)
      .all(opts.scope) as ChatThreadRow[];
  }
  return db
    .prepare(`SELECT * FROM chat_threads ORDER BY updated_at DESC`)
    .all() as ChatThreadRow[];
}

export function renameThread(id: string, title: string): void {
  getDb()
    .prepare(`UPDATE chat_threads SET title = ?, updated_at = ? WHERE id = ?`)
    .run(title, Date.now(), id);
}

export function deleteThread(id: string): void {
  getDb().prepare(`DELETE FROM chat_threads WHERE id = ?`).run(id);
}

export interface AppendMessageInput {
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
}

export function appendMessage(input: AppendMessageInput): ChatMessageRow {
  const db = getDb();
  const id = newId();
  const cit = input.citations?.length ? JSON.stringify(input.citations) : null;
  const now = Date.now();
  // chat_messages.created_at in the schema defaults to unixepoch()*1000 which
  // is second-resolution; override with Date.now() so multi-message-per-second
  // inserts get distinct timestamps and listMessages ordering is stable without
  // relying on rowid as the tiebreak (rowid ordering still kicks in if two
  // calls resolve on the same JS millisecond).
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO chat_messages (id, thread_id, role, content, citations, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, input.thread_id, input.role, input.content, cit, now);
    db.prepare(`UPDATE chat_threads SET updated_at = ? WHERE id = ?`).run(
      now,
      input.thread_id,
    );
  });
  tx();
  return db
    .prepare(`SELECT * FROM chat_messages WHERE id = ?`)
    .get(id) as ChatMessageRow;
}

export function listMessages(thread_id: string): ChatMessageRow[] {
  // rowid breaks ties when two messages land in the same unixepoch() second
  // (chat_messages.created_at is second-resolution per migration 001).
  return getDb()
    .prepare(
      `SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC, rowid ASC`,
    )
    .all(thread_id) as ChatMessageRow[];
}
