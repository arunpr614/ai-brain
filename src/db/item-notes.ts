import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import { getDb, newId } from "./client";
import { getItem } from "./items";
import { deleteMessagesCitingManualNote } from "./chat";
import { getEffectiveNoteAiDefault } from "@/lib/notes/default-ai-policy";
import { normalizeMarkdown, type NormalizedNoteMarkdown } from "@/lib/notes/markdown";

export type NoteSaveKind = "auto" | "manual" | "restore" | "recreate";
export type NoteOperation = "save" | "clear" | "delete" | "recreate" | "restore" | "ai_policy";

export interface ItemNoteStateRow {
  item_id: string;
  epoch: number;
  generation: number;
  is_deleted: 0 | 1;
  updated_at: number;
}

export interface ItemNoteRow {
  item_id: string;
  epoch: number;
  generation: number;
  content_md: string;
  content_text: string;
  content_hash: string;
  include_in_ai: 0 | 1;
  indexed_generation: number;
  last_saved_kind: NoteSaveKind;
  created_at: number;
  updated_at: number;
}

export interface ItemNoteRevisionRow {
  id: string;
  item_id: string;
  epoch: number;
  source_generation: number;
  content_md: string;
  content_text: string;
  content_hash: string;
  include_in_ai: 0 | 1;
  save_kind: "manual" | "timed" | "pre_clear" | "conflict" | "restore";
  created_at: number;
}

export interface NoteSnapshot {
  state: ItemNoteStateRow | null;
  note: ItemNoteRow | null;
}

export interface NoteMutationResult extends NoteSnapshot {
  replayed: boolean;
}

export class ItemNoteError extends Error {
  constructor(
    readonly code:
      | "ITEM_NOT_FOUND"
      | "NOTE_CONFLICT"
      | "NOTE_MUTATION_MISMATCH"
      | "NOTE_NOT_FOUND"
      | "NOTE_DELETED",
    message: string,
    readonly snapshot?: NoteSnapshot,
  ) {
    super(message);
    this.name = "ItemNoteError";
  }
}

interface MutationIdentity {
  itemId: string;
  editorInstanceId: string;
  epoch: number;
  operation: NoteOperation;
  mutationId: string;
  requestHash: string;
}

interface MutationRow {
  mutation_id: string;
  item_id: string;
  editor_instance_id: string;
  epoch: number;
  operation: NoteOperation;
  request_hash: string;
  accepted_generation: number;
  created_at: number;
}

const REVISION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MUTATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const TIMED_REVISION_MS = 5 * 60 * 1000;

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function stateFor(db: Database.Database, itemId: string): ItemNoteStateRow | null {
  return (
    (db.prepare("SELECT * FROM item_note_state WHERE item_id = ?").get(itemId) as
      | ItemNoteStateRow
      | undefined) ?? null
  );
}

function noteFor(db: Database.Database, itemId: string): ItemNoteRow | null {
  return (
    (db.prepare("SELECT * FROM item_notes WHERE item_id = ?").get(itemId) as
      | ItemNoteRow
      | undefined) ?? null
  );
}

function snapshotFor(db: Database.Database, itemId: string): NoteSnapshot {
  return { state: stateFor(db, itemId), note: noteFor(db, itemId) };
}

export function getItemNote(itemId: string): NoteSnapshot {
  if (!getItem(itemId)) {
    throw new ItemNoteError("ITEM_NOT_FOUND", "The saved item no longer exists.");
  }
  return snapshotFor(getDb(), itemId);
}

function assertItem(db: Database.Database, itemId: string): void {
  const row = db.prepare("SELECT 1 AS ok FROM items WHERE id = ?").get(itemId);
  if (!row) throw new ItemNoteError("ITEM_NOT_FOUND", "The saved item no longer exists.");
}

function mutationReplay(
  db: Database.Database,
  identity: MutationIdentity,
): NoteMutationResult | null {
  const row = db
    .prepare("SELECT * FROM item_note_mutations WHERE mutation_id = ?")
    .get(identity.mutationId) as MutationRow | undefined;
  if (!row) return null;
  const same =
    row.item_id === identity.itemId &&
    row.editor_instance_id === identity.editorInstanceId &&
    row.epoch === identity.epoch &&
    row.operation === identity.operation &&
    row.request_hash === identity.requestHash;
  if (!same) {
    throw new ItemNoteError(
      "NOTE_MUTATION_MISMATCH",
      "That mutation identifier was already used for a different note change.",
      snapshotFor(db, identity.itemId),
    );
  }
  const current = stateFor(db, identity.itemId);
  const acceptedEpoch = row.operation === "recreate" ? row.epoch + 1 : row.epoch;
  if (
    !current ||
    current.epoch !== acceptedEpoch ||
    current.generation !== row.accepted_generation
  ) {
    throw new ItemNoteError(
      "NOTE_CONFLICT",
      "That change was accepted earlier, but the note changed again afterward. Review the current saved version before continuing.",
      snapshotFor(db, identity.itemId),
    );
  }
  return { ...snapshotFor(db, identity.itemId), replayed: true };
}

function recordMutation(
  db: Database.Database,
  identity: MutationIdentity,
  acceptedGeneration: number,
  now: number,
): void {
  db.prepare(
    `INSERT INTO item_note_mutations (
       mutation_id, item_id, editor_instance_id, epoch, operation,
       request_hash, accepted_generation, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    identity.mutationId,
    identity.itemId,
    identity.editorInstanceId,
    identity.epoch,
    identity.operation,
    identity.requestHash,
    acceptedGeneration,
    now,
  );

  db.prepare(
    `DELETE FROM item_note_mutations
     WHERE item_id = ? AND (
       created_at < ? OR mutation_id NOT IN (
         SELECT mutation_id FROM item_note_mutations
         WHERE item_id = ? ORDER BY created_at DESC LIMIT 100
       )
     )`,
  ).run(identity.itemId, now - MUTATION_MAX_AGE_MS, identity.itemId);
}

function queueDerivedAction(
  db: Database.Database,
  note: Pick<ItemNoteRow, "item_id" | "epoch" | "generation" | "include_in_ai" | "content_text">,
  now: number,
): void {
  const action = note.include_in_ai === 1 && note.content_text.trim() ? "index" : "purge";
  db.prepare(
    `INSERT INTO note_index_jobs (
       item_id, target_epoch, target_generation, desired_action, state,
       attempts, claimed_by, lease_expires_at, last_error_code,
       created_at, updated_at, completed_at
     ) VALUES (?, ?, ?, ?, 'pending', 0, NULL, NULL, NULL, ?, ?, NULL)
     ON CONFLICT(item_id) DO UPDATE SET
       target_epoch = excluded.target_epoch,
       target_generation = excluded.target_generation,
       desired_action = excluded.desired_action,
       state = 'pending',
       attempts = 0,
       claimed_by = NULL,
       lease_expires_at = NULL,
       last_error_code = NULL,
       updated_at = excluded.updated_at,
       completed_at = NULL`,
  ).run(note.item_id, note.epoch, note.generation, action, now, now);
}

function preserveRevision(
  db: Database.Database,
  note: ItemNoteRow,
  saveKind: ItemNoteRevisionRow["save_kind"],
  now: number,
): void {
  db.prepare(
    `INSERT OR IGNORE INTO item_note_revisions (
       id, item_id, epoch, source_generation, content_md, content_text,
       content_hash, include_in_ai, save_kind, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    newId(),
    note.item_id,
    note.epoch,
    note.generation,
    note.content_md,
    note.content_text,
    note.content_hash,
    note.include_in_ai,
    saveKind,
    now,
  );
}

function maybePreserveBeforeSave(
  db: Database.Database,
  current: ItemNoteRow,
  operation: NoteOperation,
  saveKind: NoteSaveKind,
  now: number,
): void {
  if (operation === "clear") {
    preserveRevision(db, current, "pre_clear", now);
    return;
  }
  if (saveKind === "manual" || saveKind === "restore") {
    preserveRevision(db, current, saveKind === "restore" ? "restore" : "manual", now);
    return;
  }
  const latest = db
    .prepare(
      "SELECT created_at FROM item_note_revisions WHERE item_id = ? ORDER BY created_at DESC LIMIT 1",
    )
    .get(current.item_id) as { created_at: number } | undefined;
  if (!latest || now - latest.created_at >= TIMED_REVISION_MS) {
    preserveRevision(db, current, "timed", now);
  }
}

function pruneRevisions(db: Database.Database, itemId: string, now: number): void {
  db.prepare(
    `DELETE FROM item_note_revisions
     WHERE item_id = ? AND (
       created_at < ? OR id NOT IN (
         SELECT id FROM item_note_revisions
         WHERE item_id = ? ORDER BY created_at DESC LIMIT 25
       )
     )`,
  ).run(itemId, now - REVISION_MAX_AGE_MS, itemId);
}

export interface SaveItemNoteInput {
  itemId: string;
  editorInstanceId: string;
  mutationId: string;
  epoch: number | null;
  baseGeneration: number | null;
  contentMarkdown: string;
  contentHash?: string;
  saveKind: "auto" | "manual" | "restore";
  operation?: "save" | "clear" | "recreate" | "restore";
}

function conflict(db: Database.Database, itemId: string, message: string): never {
  throw new ItemNoteError("NOTE_CONFLICT", message, snapshotFor(db, itemId));
}

function insertCurrentNote(
  db: Database.Database,
  itemId: string,
  epoch: number,
  generation: number,
  normalized: NormalizedNoteMarkdown,
  saveKind: NoteSaveKind,
  includeInAi: 0 | 1,
  now: number,
): ItemNoteRow {
  db.prepare(
    `INSERT INTO item_notes (
       item_id, epoch, generation, content_md, content_text, content_hash,
       include_in_ai, indexed_generation, last_saved_kind, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
  ).run(
    itemId,
    epoch,
    generation,
    normalized.markdown,
    normalized.plainText,
    normalized.contentHash,
    includeInAi,
    saveKind,
    now,
    now,
  );
  return noteFor(db, itemId)!;
}

export function saveItemNote(input: SaveItemNoteInput): NoteMutationResult {
  const normalized = normalizeMarkdown(input.contentMarkdown);
  if (input.contentHash && input.contentHash !== normalized.contentHash) {
    throw new ItemNoteError(
      "NOTE_MUTATION_MISMATCH",
      "The note content hash does not match the normalized Markdown payload.",
    );
  }
  const operation = input.operation ?? "save";
  const requestHash = stableHash({
    operation,
    epoch: input.epoch,
    baseGeneration: input.baseGeneration,
    contentMarkdown: normalized.markdown,
    contentHash: normalized.contentHash,
    saveKind: input.saveKind,
  });
  const now = Date.now();
  const db = getDb();
  const tx = db.transaction((): NoteMutationResult => {
    assertItem(db, input.itemId);
    const state = stateFor(db, input.itemId);
    const receiptEpoch =
      operation === "recreate" ? (input.epoch ?? state?.epoch ?? 1) : (state?.epoch ?? 1);
    const identity: MutationIdentity = {
      itemId: input.itemId,
      editorInstanceId: input.editorInstanceId,
      mutationId: input.mutationId,
      epoch: receiptEpoch,
      operation,
      requestHash,
    };
    const replay = mutationReplay(db, identity);
    if (replay) return replay;

    if (!state) {
      if (
        operation === "recreate" ||
        operation === "restore" ||
        input.epoch !== null ||
        input.baseGeneration !== null
      ) {
        conflict(db, input.itemId, "This note has changed. Reload before saving.");
      }
      db.prepare(
        "INSERT INTO item_note_state (item_id, epoch, generation, is_deleted, updated_at) VALUES (?, 1, 1, 0, ?)",
      ).run(input.itemId, now);
      const note = insertCurrentNote(
        db,
        input.itemId,
        1,
        1,
        normalized,
        input.saveKind,
        getEffectiveNoteAiDefault() ? 1 : 0,
        now,
      );
      queueDerivedAction(db, note, now);
      recordMutation(db, identity, 1, now);
      return { state: stateFor(db, input.itemId), note, replayed: false };
    }

    if (state.is_deleted === 1) {
      if (
        operation !== "recreate" ||
        input.epoch !== state.epoch ||
        input.baseGeneration !== state.generation
      ) {
        conflict(db, input.itemId, "This note was deleted. Recreate it explicitly to save a new note.");
      }
      const nextEpoch = state.epoch + 1;
      db.prepare(
        "UPDATE item_note_state SET epoch = ?, generation = 1, is_deleted = 0, updated_at = ? WHERE item_id = ?",
      ).run(nextEpoch, now, input.itemId);
      const note = insertCurrentNote(
        db,
        input.itemId,
        nextEpoch,
        1,
        normalized,
        "recreate",
        getEffectiveNoteAiDefault() ? 1 : 0,
        now,
      );
      identity.epoch = state.epoch;
      queueDerivedAction(db, note, now);
      recordMutation(db, identity, 1, now);
      return { state: stateFor(db, input.itemId), note, replayed: false };
    }

    if (input.epoch !== state.epoch || input.baseGeneration !== state.generation) {
      conflict(db, input.itemId, "A newer saved version exists. Review both versions before continuing.");
    }
    const current = noteFor(db, input.itemId);
    if (!current) conflict(db, input.itemId, "The current note is unavailable. Reload before saving.");
    maybePreserveBeforeSave(db, current!, operation, input.saveKind, now);
    const nextGeneration = state.generation + 1;
    db.prepare(
      `UPDATE item_notes SET
         generation = ?, content_md = ?, content_text = ?, content_hash = ?,
         indexed_generation = 0, last_saved_kind = ?, updated_at = ?
       WHERE item_id = ?`,
    ).run(
      nextGeneration,
      normalized.markdown,
      normalized.plainText,
      normalized.contentHash,
      input.saveKind,
      now,
      input.itemId,
    );
    db.prepare(
      "UPDATE item_note_state SET generation = ?, updated_at = ? WHERE item_id = ?",
    ).run(nextGeneration, now, input.itemId);
    const note = noteFor(db, input.itemId)!;
    queueDerivedAction(db, note, now);
    pruneRevisions(db, input.itemId, now);
    recordMutation(db, identity, nextGeneration, now);
    return { state: stateFor(db, input.itemId), note, replayed: false };
  });
  return tx();
}

export interface DeleteItemNoteInput {
  itemId: string;
  editorInstanceId: string;
  mutationId: string;
  epoch: number;
  baseGeneration: number;
}

export function deleteItemNote(input: DeleteItemNoteInput): NoteMutationResult {
  const requestHash = stableHash({
    operation: "delete",
    epoch: input.epoch,
    baseGeneration: input.baseGeneration,
  });
  const now = Date.now();
  const db = getDb();
  return db.transaction((): NoteMutationResult => {
    assertItem(db, input.itemId);
    const identity: MutationIdentity = {
      itemId: input.itemId,
      editorInstanceId: input.editorInstanceId,
      mutationId: input.mutationId,
      epoch: input.epoch,
      operation: "delete",
      requestHash,
    };
    const replay = mutationReplay(db, identity);
    if (replay) return replay;
    const state = stateFor(db, input.itemId);
    if (!state) throw new ItemNoteError("NOTE_NOT_FOUND", "There is no saved note to delete.");
    if (state.epoch !== input.epoch || state.generation !== input.baseGeneration) {
      conflict(db, input.itemId, "A newer saved version exists. Reload before deleting.");
    }
    const nextGeneration = state.generation + 1;
    db.prepare("DELETE FROM item_notes WHERE item_id = ?").run(input.itemId);
    db.prepare("DELETE FROM item_note_revisions WHERE item_id = ?").run(input.itemId);
    // Assistant turns can paraphrase private note text. Purge any persisted
    // answer whose citation sidecar says it consumed this manual note.
    deleteMessagesCitingManualNote(input.itemId);
    db.prepare(
      "UPDATE item_note_state SET generation = ?, is_deleted = 1, updated_at = ? WHERE item_id = ?",
    ).run(nextGeneration, now, input.itemId);
    db.prepare(
      `INSERT INTO note_index_jobs (
         item_id, target_epoch, target_generation, desired_action, state,
         attempts, created_at, updated_at
       ) VALUES (?, ?, ?, 'purge', 'pending', 0, ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET
         target_epoch = excluded.target_epoch,
         target_generation = excluded.target_generation,
         desired_action = 'purge', state = 'pending', attempts = 0,
         claimed_by = NULL, lease_expires_at = NULL, last_error_code = NULL,
         updated_at = excluded.updated_at, completed_at = NULL`,
    ).run(input.itemId, state.epoch, nextGeneration, now, now);
    recordMutation(db, identity, nextGeneration, now);
    return { ...snapshotFor(db, input.itemId), replayed: false };
  })();
}

export interface SetItemNoteAiPolicyInput extends DeleteItemNoteInput {
  includeInAi: boolean;
}

export function setItemNoteAiPolicy(input: SetItemNoteAiPolicyInput): NoteMutationResult {
  const requestHash = stableHash({
    operation: "ai_policy",
    epoch: input.epoch,
    baseGeneration: input.baseGeneration,
    includeInAi: input.includeInAi,
  });
  const now = Date.now();
  const db = getDb();
  return db.transaction((): NoteMutationResult => {
    assertItem(db, input.itemId);
    const identity: MutationIdentity = {
      itemId: input.itemId,
      editorInstanceId: input.editorInstanceId,
      mutationId: input.mutationId,
      epoch: input.epoch,
      operation: "ai_policy",
      requestHash,
    };
    const replay = mutationReplay(db, identity);
    if (replay) return replay;
    const state = stateFor(db, input.itemId);
    const note = noteFor(db, input.itemId);
    if (!state || !note) throw new ItemNoteError("NOTE_NOT_FOUND", "Save this note before changing AI use.");
    if (state.is_deleted === 1) throw new ItemNoteError("NOTE_DELETED", "This note was deleted.");
    if (state.epoch !== input.epoch || state.generation !== input.baseGeneration) {
      conflict(db, input.itemId, "A newer saved version exists. Reload before changing AI use.");
    }
    const nextGeneration = state.generation + 1;
    db.prepare(
      `UPDATE item_notes SET generation = ?, include_in_ai = ?, indexed_generation = 0, updated_at = ?
       WHERE item_id = ?`,
    ).run(nextGeneration, input.includeInAi ? 1 : 0, now, input.itemId);
    db.prepare(
      "UPDATE item_note_state SET generation = ?, updated_at = ? WHERE item_id = ?",
    ).run(nextGeneration, now, input.itemId);
    const updated = noteFor(db, input.itemId)!;
    queueDerivedAction(db, updated, now);
    recordMutation(db, identity, nextGeneration, now);
    return { state: stateFor(db, input.itemId), note: updated, replayed: false };
  })();
}

export function listItemNoteRevisions(itemId: string): ItemNoteRevisionRow[] {
  if (!getItem(itemId)) throw new ItemNoteError("ITEM_NOT_FOUND", "The saved item no longer exists.");
  return getDb()
    .prepare(
      `SELECT * FROM item_note_revisions
       WHERE item_id = ? AND created_at >= ?
       ORDER BY created_at DESC LIMIT 25`,
    )
    .all(itemId, Date.now() - REVISION_MAX_AGE_MS) as ItemNoteRevisionRow[];
}

export interface RestoreItemNoteRevisionInput {
  itemId: string;
  revisionId: string;
  editorInstanceId: string;
  mutationId: string;
  epoch: number;
  baseGeneration: number;
}

export function restoreItemNoteRevision(
  input: RestoreItemNoteRevisionInput,
): NoteMutationResult {
  const revision = getDb()
    .prepare(
      `SELECT * FROM item_note_revisions WHERE id = ? AND item_id = ?`,
    )
    .get(input.revisionId, input.itemId) as ItemNoteRevisionRow | undefined;
  if (!revision) {
    throw new ItemNoteError("NOTE_NOT_FOUND", "That recent note version is no longer available.");
  }
  return saveItemNote({
    itemId: input.itemId,
    editorInstanceId: input.editorInstanceId,
    mutationId: input.mutationId,
    epoch: input.epoch,
    baseGeneration: input.baseGeneration,
    contentMarkdown: revision.content_md,
    saveKind: "restore",
    operation: "restore",
  });
}

export interface NoteSearchHit {
  item_id: string;
  snippet: string;
  rank: number;
}

export function searchItemNotes(query: string, limit = 50): NoteSearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const safe = q.replace(/"/g, '""');
  return getDb()
    .prepare(
      `SELECT item_id,
              snippet(item_notes_fts, 1, '', '', ' … ', 24) AS snippet,
              bm25(item_notes_fts) AS rank
       FROM item_notes_fts
       WHERE item_notes_fts MATCH ?
       ORDER BY rank ASC LIMIT ?`,
    )
    .all(`"${safe}"`, limit) as NoteSearchHit[];
}
