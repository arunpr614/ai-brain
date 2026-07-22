/**
 * Item repository. v0.2.0 adds URL + PDF capture; v0.1.0's note creation
 * remains unchanged. All inserts go through `insertCaptured` so every new
 * source_type lands on the same pipeline (capture → store → search).
 */
import { getDb, newId, type ItemRow } from "./client";
import type { CapturePlatform, CaptureQuality } from "@/lib/capture/types";
import { deleteArtifactsForItem } from "@/lib/capture/artifacts";
import { deleteChunksAndVectors } from "./chunks";
import { deleteMessagesCitingManualNote } from "./chat";
import { fingerprint, newUuid, scopeHash } from "@/lib/processing/crypto";
import {
  finalizeNotebookLmSensitivePurge,
  terminalizeNotebookLmExportsForDeletedItem,
} from "./notebooklm-export";

export type SourceType = ItemRow["source_type"];
export type CaptureSource = ItemRow["capture_source"];
export type LibrarySourceFilter =
  | "all"
  | "article"
  | "youtube"
  | "pdf"
  | "note"
  | "telegram";
export type LibraryQualityFilter =
  | "all"
  | "full_text"
  | "transcript"
  | "needs_upgrade";

export interface CreateNoteInput {
  title: string;
  body: string;
}

export interface InsertCapturedInput {
  source_type: SourceType;
  capture_source?: CaptureSource;
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
  source_platform?: CapturePlatform | null;
  capture_quality?: CaptureQuality | null;
  extraction_method?: string | null;
  extraction_version?: string | null;
  published_at?: number | null;
  thumbnail_url?: string | null;
  description?: string | null;
}

export function insertCaptured(input: InsertCapturedInput): ItemRow {
  const db = getDb();
  const id = newId();
  const now = input.captured_at ?? Date.now();
  const workflowNow = Date.now();
  const eventUuid = newUuid();
  const mutationId = newUuid();
  const episodeId = newUuid();
  const totalChars = input.total_chars ?? input.body.length;
  const captureSource = input.capture_source ?? "web";
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO items (
        id, source_type, capture_source, source_url, title, author, body,
        captured_at, total_pages, total_chars, extraction_warning,
        duration_seconds, source_platform, capture_quality, extraction_method,
        extraction_version, published_at, thumbnail_url, description,
        workflow_status, workflow_version, workflow_legacy_baseline,
        workflow_enrolled_at, workflow_initialized_at, workflow_inbox_entered_at,
        workflow_inbox_episode_id, workflow_status_changed_at, workflow_last_event_uuid
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             'inbox', 1, 0, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.source_type,
      captureSource,
      input.source_url ?? null,
      input.title,
      input.author ?? null,
      input.body,
      now,
      input.total_pages ?? null,
      totalChars,
      input.extraction_warning ?? null,
      input.duration_seconds ?? null,
      input.source_platform ?? null,
      input.capture_quality ?? null,
      input.extraction_method ?? null,
      input.extraction_version ?? null,
      input.published_at ?? null,
      input.thumbnail_url ?? null,
      input.description ?? null,
      workflowNow,
      workflowNow,
      workflowNow,
      episodeId,
      workflowNow,
      eventUuid,
    );

    db.prepare(
      `INSERT INTO processing_mutation_receipts(
        mutation_id,scope_type,item_id,scope_key_hash,action_type,request_fingerprint,
        outcome_class,result_code,accepted_event_uuid,accepted_item_version,
        observed_item_version,confirmed_at,created_at)
       VALUES(?,?,?,?,? ,?,'accepted_effective','initialized',?,1,0,?,?)`,
    ).run(
      mutationId,
      "initialization",
      id,
      scopeHash(`item:${id}`),
      "initialize",
      fingerprint({ id, captureSource, sourceType: input.source_type }),
      eventUuid,
      workflowNow,
      workflowNow,
    );

    const surface = captureSource === "telegram" ? "telegram"
      : captureSource === "recall" ? "recall"
        : captureSource === "web" ? "web_capture" : "api_capture";
    const actorChannel = captureSource === "unknown" ? "unknown_raw" : captureSource;
    db.prepare(
      `INSERT INTO item_workflow_events(
        event_uuid,item_id,item_version,mutation_id,event_type,from_status,to_status,
        to_inbox_entered_at,to_inbox_episode_id,to_status_changed_at,
        origin,surface,actor_channel,occurred_at)
       VALUES(?,?,?,?, 'initialized',NULL,'inbox',?,?,?,'capture',?,?,?)`,
    ).run(
      eventUuid,
      id,
      1,
      mutationId,
      workflowNow,
      episodeId,
      workflowNow,
      surface,
      actorChannel,
      workflowNow,
    );
  });
  tx();
  return getItem(id)!;
}

export function createNote({ title, body }: CreateNoteInput): ItemRow {
  return insertCaptured({
    source_type: "note",
    title,
    body,
    source_platform: "note",
    capture_quality: "user_provided_full_text",
    extraction_method: "manual_note",
    extraction_version: "capture-v0.7.5",
  });
}

export function getItem(id: string): ItemRow | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM items WHERE id = ?")
    .get(id) as ItemRow | undefined;
  return row ?? null;
}

export function getItemsByIds(ids: string[]): ItemRow[] {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];
  const db = getDb();
  const placeholders = uniqueIds.map(() => "?").join(", ");
  const rows = db
    .prepare(`SELECT * FROM items WHERE id IN (${placeholders})`)
    .all(...uniqueIds) as ItemRow[];
  const byId = new Map(rows.map((item) => [item.id, item]));
  return uniqueIds
    .map((id) => byId.get(id))
    .filter((item): item is ItemRow => Boolean(item));
}

export interface ListItemsOptions {
  limit?: number;
  offset?: number;
  source?: LibrarySourceFilter;
  quality?: LibraryQualityFilter;
  tag?: string;
}

function needsUpgradeClause(): string {
  return `(capture_quality IN ('metadata_only', 'paywall_preview', 'failed')
          OR extraction_warning IN (
            'youtube_antibot_metadata_only',
            'youtube_transcript_fetch_metadata_only',
            'no_transcript'
          ))`;
}

function normalizeTagFilter(tag: string | undefined): string | null {
  const normalized = tag?.trim().toLowerCase().replace(/\s+/g, "-") ?? "";
  return normalized.length > 0 ? normalized : null;
}

function libraryWhere(options: Pick<ListItemsOptions, "source" | "quality" | "tag">): {
  clause: string;
  params: unknown[];
} {
  const clauses: string[] = [];
  const params: unknown[] = [];

  switch (options.source) {
    case "article":
      clauses.push("source_type = 'url'");
      break;
    case "youtube":
      clauses.push(
        "(source_type = 'youtube' OR source_platform IN ('youtube', 'youtube_short'))",
      );
      break;
    case "pdf":
      clauses.push("source_type = 'pdf'");
      break;
    case "note":
      clauses.push("source_type = 'note'");
      break;
    case "telegram":
      clauses.push("(source_type = 'telegram' OR capture_source = 'telegram')");
      break;
    case "all":
    case undefined:
      break;
  }

  switch (options.quality) {
    case "full_text":
      clauses.push(`(
        capture_quality IN ('full_text', 'user_provided_full_text', 'client_dom', 'email_body')
        OR (
          capture_quality IS NULL
          AND extraction_warning IS NULL
          AND source_type IN ('url', 'pdf', 'note', 'telegram')
        )
      )`);
      break;
    case "transcript":
      clauses.push(`(
        capture_quality IN ('transcript', 'metadata_plus_transcript')
        OR (
          capture_quality = 'user_provided_full_text'
          AND (source_type = 'youtube' OR source_platform IN ('youtube', 'youtube_short'))
        )
        OR (
          capture_quality IS NULL
          AND extraction_warning IS NULL
          AND source_type = 'youtube'
        )
      )`);
      break;
    case "needs_upgrade":
      clauses.push(needsUpgradeClause());
      break;
    case "all":
    case undefined:
      break;
  }

  const tag = normalizeTagFilter(options.tag);
  if (tag) {
    clauses.push(`EXISTS (
      SELECT 1
      FROM item_tags
      JOIN tags ON tags.id = item_tags.tag_id
      WHERE item_tags.item_id = items.id
        AND tags.name = ?
    )`);
    params.push(tag);
  }

  return {
    clause: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

export function listItems(options: ListItemsOptions = {}): ItemRow[] {
  const { limit = 100, offset = 0 } = options;
  const db = getDb();
  const where = libraryWhere(options);
  return db
    .prepare(
      `SELECT * FROM items
       ${where.clause}
       ORDER BY captured_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...where.params, limit, offset) as ItemRow[];
}

export function listNeedsUpgradeItems(
  options: { limit?: number; offset?: number } = {},
): ItemRow[] {
  const { limit = 100, offset = 0 } = options;
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM items
       WHERE ${needsUpgradeClause()}
       ORDER BY captured_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as ItemRow[];
}

export function countItems(
  options: Pick<ListItemsOptions, "source" | "quality" | "tag"> = {},
): number {
  const db = getDb();
  const where = libraryWhere(options);
  const row = db
    .prepare(`SELECT COUNT(*) as n FROM items ${where.clause}`)
    .get(...where.params) as {
      n: number;
    };
  return row.n;
}

export function countNeedsUpgradeItems(): number {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) as n FROM items WHERE ${needsUpgradeClause()}`,
    )
    .get() as { n: number };
  return row.n;
}

export function deleteItems(ids: readonly string[]): void {
  const db = getDb();
  let notebookLmSnapshotsPurged = 0;
  const now = Date.now();
  db.transaction(() => {
    for (const id of ids) {
      deleteArtifactsForItem(id);
      notebookLmSnapshotsPurged += terminalizeNotebookLmExportsForDeletedItem(
        id,
        now,
        db,
      );
      // vec0 is not a foreign-key child. Delete vector rows before cascades erase
      // the bridge that identifies them.
      deleteChunksAndVectors(id);
      deleteMessagesCitingManualNote(id);
      db.prepare("DELETE FROM items WHERE id = ?").run(id);
    }
  }).immediate();
  if (notebookLmSnapshotsPurged > 0) finalizeNotebookLmSensitivePurge(now);
}

export function deleteItem(id: string): void {
  deleteItems([id]);
}

export interface UpdateItemCaptureContentInput {
  title: string;
  body: string;
  author?: string | null;
  extraction_warning?: string | null;
  duration_seconds?: number | null;
  source_platform?: CapturePlatform | null;
  capture_quality?: CaptureQuality | null;
  extraction_method?: string | null;
  extraction_version?: string | null;
  published_at?: number | null;
  thumbnail_url?: string | null;
  description?: string | null;
}

export function updateItemCaptureContent(
  id: string,
  input: UpdateItemCaptureContentInput,
): ItemRow | null {
  const db = getDb();
  db.prepare(
    `UPDATE items
     SET title = ?,
         body = ?,
         author = ?,
         extraction_warning = ?,
         duration_seconds = ?,
         source_platform = ?,
         capture_quality = ?,
         extraction_method = ?,
         extraction_version = ?,
         published_at = ?,
         thumbnail_url = ?,
         description = ?,
         total_chars = ?
     WHERE id = ?`,
  ).run(
    input.title,
    input.body,
    input.author ?? null,
    input.extraction_warning ?? null,
    input.duration_seconds ?? null,
    input.source_platform ?? null,
    input.capture_quality ?? null,
    input.extraction_method ?? null,
    input.extraction_version ?? null,
    input.published_at ?? null,
    input.thumbnail_url ?? null,
    input.description ?? null,
    input.body.length,
    id,
  );
  return getItem(id);
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
