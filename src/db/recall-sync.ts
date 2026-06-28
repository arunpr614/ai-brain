import { getDb, newId, type ItemRow } from "./client";
import type { RecallContentFidelity } from "@/lib/recall/types";

export type RecallSyncStatus =
  | "seen"
  | "imported"
  | "skipped"
  | "blocked"
  | "changed_remote"
  | "error";

export interface RecallSyncItemRow {
  recall_card_id: string;
  item_id: string | null;
  recall_created_at: string | null;
  recall_source_url: string | null;
  recall_title: string | null;
  recall_image_url: string | null;
  content_hash: string | null;
  content_fidelity: RecallContentFidelity;
  chunk_count: number;
  imported_at: number | null;
  last_seen_at: number;
  last_synced_at: number | null;
  sync_status: RecallSyncStatus;
  last_error: string | null;
  metadata_json: string | null;
}

export interface RecallSyncStateRow {
  key: string;
  value: string;
  updated_at: number;
}

export type RecallSyncRunState = "running" | "done" | "error" | "blocked";

export interface RecallSyncRunRow {
  id: string;
  mode: "dry_run" | "apply";
  started_at: number;
  completed_at: number | null;
  state: RecallSyncRunState;
  date_from: string | null;
  date_to: string | null;
  cards_seen: number;
  cards_imported: number;
  cards_upgraded: number;
  cards_skipped: number;
  cards_changed_remote: number;
  cards_blocked: number;
  total_chars_planned: number;
  total_chunks_fetched: number;
  last_error: string | null;
  report_json: string | null;
}

export interface InsertRecallSyncRunInput {
  id?: string;
  mode: "dry_run" | "apply";
  started_at: number;
  completed_at: number | null;
  state: RecallSyncRunState;
  date_from: string | null;
  date_to: string | null;
  cards_seen: number;
  cards_imported: number;
  cards_upgraded: number;
  cards_skipped: number;
  cards_changed_remote: number;
  cards_blocked: number;
  total_chars_planned: number;
  total_chunks_fetched: number;
  last_error: string | null;
  report_json: string;
}

export interface RecallSyncLockResult {
  acquired: boolean;
  recoveredStale: boolean;
  existingOwner: string | null;
  existingAcquiredAt: number | null;
}

export interface InsertRecallSyncItemInput {
  recall_card_id: string;
  item_id: ItemRow["id"] | null;
  recall_created_at: string | null;
  recall_source_url: string | null;
  recall_title: string;
  recall_image_url: string | null;
  content_hash: string;
  content_fidelity: RecallContentFidelity;
  chunk_count: number;
  imported_at: number | null;
  last_seen_at: number;
  last_synced_at: number;
  sync_status?: RecallSyncStatus;
  last_error?: string | null;
  metadata_json: string;
}

export function getRecallSyncItem(recallCardId: string): RecallSyncItemRow | null {
  const row = getDb()
    .prepare("SELECT * FROM recall_sync_items WHERE recall_card_id = ?")
    .get(recallCardId) as RecallSyncItemRow | undefined;
  return row ?? null;
}

export function insertRecallSyncItem(input: InsertRecallSyncItemInput): RecallSyncItemRow {
  getDb()
    .prepare(
      `INSERT INTO recall_sync_items (
         recall_card_id, item_id, recall_created_at, recall_source_url,
         recall_title, recall_image_url, content_hash, content_fidelity,
         chunk_count, imported_at, last_seen_at, last_synced_at, sync_status,
         last_error, metadata_json
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.recall_card_id,
      input.item_id,
      input.recall_created_at,
      input.recall_source_url,
      input.recall_title,
      input.recall_image_url,
      input.content_hash,
      input.content_fidelity,
      input.chunk_count,
      input.imported_at,
      input.last_seen_at,
      input.last_synced_at,
      input.sync_status ?? "imported",
      input.last_error ?? null,
      input.metadata_json,
    );
  return getRecallSyncItem(input.recall_card_id)!;
}

export function insertRecallSyncRun(input: InsertRecallSyncRunInput): RecallSyncRunRow {
  const id = input.id ?? newId();
  getDb()
    .prepare(
      `INSERT INTO recall_sync_runs (
         id, mode, started_at, completed_at, state, date_from, date_to,
         cards_seen, cards_imported, cards_upgraded, cards_skipped,
         cards_changed_remote, cards_blocked, total_chars_planned,
         total_chunks_fetched, last_error, report_json
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.mode,
      input.started_at,
      input.completed_at,
      input.state,
      input.date_from,
      input.date_to,
      input.cards_seen,
      input.cards_imported,
      input.cards_upgraded,
      input.cards_skipped,
      input.cards_changed_remote,
      input.cards_blocked,
      input.total_chars_planned,
      input.total_chunks_fetched,
      input.last_error,
      input.report_json,
    );
  return getRecallSyncRun(id)!;
}

export function getRecallSyncRun(id: string): RecallSyncRunRow | null {
  const row = getDb()
    .prepare("SELECT * FROM recall_sync_runs WHERE id = ?")
    .get(id) as RecallSyncRunRow | undefined;
  return row ?? null;
}

export function listRecallSyncRuns(limit = 20): RecallSyncRunRow[] {
  return getDb()
    .prepare("SELECT * FROM recall_sync_runs ORDER BY started_at DESC, id DESC LIMIT ?")
    .all(limit) as RecallSyncRunRow[];
}

export function getRecallSyncState(key: string): RecallSyncStateRow | null {
  const row = getDb()
    .prepare("SELECT key, value, updated_at FROM recall_sync_state WHERE key = ?")
    .get(key) as RecallSyncStateRow | undefined;
  return row ?? null;
}

export function setRecallSyncState(key: string, value: string, updatedAt: number): void {
  getDb()
    .prepare(
      `INSERT INTO recall_sync_state (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
    )
    .run(key, value, updatedAt);
}

export function getRecallCheckpoint(): string | null {
  return getRecallSyncState("checkpoint:last_successful_to")?.value ?? null;
}

export function advanceRecallCheckpoint(dateToIso: string, updatedAt: number): void {
  setRecallSyncState("checkpoint:last_successful_to", dateToIso, updatedAt);
}

export function tryAcquireRecallSyncLock(input: {
  owner: string;
  now: number;
  staleAfterMs: number;
  allowStaleRecovery?: boolean;
}): RecallSyncLockResult {
  const db = getDb();
  const tx = db.transaction(() => {
    const existing = getRecallSyncState("lock:recall_sync");
    const parsed = existing ? parseLock(existing.value) : null;
    const existingAcquiredAt = parsed?.acquired_at ?? existing?.updated_at ?? null;
    const isStale =
      existingAcquiredAt !== null && input.now - existingAcquiredAt > input.staleAfterMs;

    if (existing && (!isStale || !input.allowStaleRecovery)) {
      return {
        acquired: false,
        recoveredStale: false,
        existingOwner: parsed?.owner ?? null,
        existingAcquiredAt,
      };
    }

    setRecallSyncState(
      "lock:recall_sync",
      JSON.stringify({ owner: input.owner, acquired_at: input.now }),
      input.now,
    );
    return {
      acquired: true,
      recoveredStale: Boolean(existing && isStale),
      existingOwner: parsed?.owner ?? null,
      existingAcquiredAt,
    };
  });
  return tx();
}

export function releaseRecallSyncLock(owner: string): boolean {
  const row = getRecallSyncState("lock:recall_sync");
  const parsed = row ? parseLock(row.value) : null;
  if (!row || parsed?.owner !== owner) return false;
  const info = getDb()
    .prepare("DELETE FROM recall_sync_state WHERE key = ?")
    .run("lock:recall_sync");
  return info.changes > 0;
}

export function markRecallSyncItemSkipped(
  recallCardId: string,
  input: { seenAt: number; syncedAt: number },
): RecallSyncItemRow {
  getDb()
    .prepare(
      `UPDATE recall_sync_items
       SET last_seen_at = ?,
           last_synced_at = ?,
           sync_status = 'skipped',
           last_error = NULL
       WHERE recall_card_id = ?`,
    )
    .run(input.seenAt, input.syncedAt, recallCardId);
  return getRecallSyncItem(recallCardId)!;
}

export function markRecallSyncItemChangedRemote(
  recallCardId: string,
  input: {
    seenAt: number;
    syncedAt: number;
    seenContentHash: string;
    metadata_json: string;
  },
): RecallSyncItemRow {
  getDb()
    .prepare(
      `UPDATE recall_sync_items
       SET last_seen_at = ?,
           last_synced_at = ?,
           sync_status = 'changed_remote',
           last_error = ?,
           metadata_json = ?
       WHERE recall_card_id = ?`,
    )
    .run(
      input.seenAt,
      input.syncedAt,
      "remote Recall content hash changed; update policy is not implemented",
      JSON.stringify({
        event: "changed_remote",
        seen_content_hash: input.seenContentHash,
        imported_metadata: safeJson(input.metadata_json),
      }),
      recallCardId,
    );
  return getRecallSyncItem(recallCardId)!;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseLock(value: string): { owner?: string; acquired_at?: number } | null {
  try {
    const parsed = JSON.parse(value) as { owner?: unknown; acquired_at?: unknown };
    return {
      owner: typeof parsed.owner === "string" ? parsed.owner : undefined,
      acquired_at: typeof parsed.acquired_at === "number" ? parsed.acquired_at : undefined,
    };
  } catch {
    return null;
  }
}
