import { hostname } from "node:os";
import type Database from "better-sqlite3";
import { getDb } from "@/db/client";
import { deleteChunksAndVectors, insertChunkWithRowid } from "@/db/chunks";
import { getYouTubeBrowserSchemaCapability } from "@/db/schema-capabilities";
import { chunkBody } from "@/lib/chunk";
import { EMBED_DIM } from "@/lib/embed/client";
import { getEmbedProvider } from "@/lib/embed/factory";
import { manualNotesSemanticProcessingEnabled } from "@/lib/notes/flags";
import { noteAiProviderPolicy } from "@/lib/notes/provider-policy";
import { itemSemanticsChanged } from "@/lib/notes/semantic-events";
import { classifyDeployment } from "@/lib/runtime/deployment";
import { resolveContentWorkerPlan } from "@/lib/startup/content-workers";

const POLL_MS = 2_000;
const IDLE_MS = 10_000;
const QUIET_MS = 5_000;
const LEASE_MS = 60_000;
const MAX_ATTEMPTS = 5;
const WORKER_ID = `${hostname()}:${process.pid}:manual-notes-v1`;

interface NoteIndexJob {
  item_id: string;
  target_epoch: number;
  target_generation: number;
  desired_action: "index" | "purge";
  state: "pending" | "running" | "done" | "error";
  attempts: number;
  claimed_by: string | null;
  lease_expires_at: number | null;
}

interface CurrentNote {
  item_id: string;
  title: string;
  epoch: number;
  generation: number;
  is_deleted: 0 | 1;
  content_text: string | null;
  include_in_ai: 0 | 1 | null;
}

interface NoteIndexWorkerDeps {
  embedFn?: (inputs: string[]) => Promise<Float32Array[]>;
}

declare global {
  var __brainNoteIndexWorker:
    | { running: boolean; stopRequested: boolean }
    | undefined;
}

function state() {
  if (!globalThis.__brainNoteIndexWorker) {
    globalThis.__brainNoteIndexWorker = { running: false, stopRequested: false };
  }
  return globalThis.__brainNoteIndexWorker;
}

function noteIndexPlanAllows(
  db: Database.Database = getDb(),
): boolean {
  return resolveContentWorkerPlan({
    deployment: classifyDeployment(),
    schemaCapability: getYouTubeBrowserSchemaCapability(db),
  }).starts.noteIndex;
}

export function startNoteIndexWorker(): void {
  if (!noteIndexPlanAllows()) {
    console.log("[note-index] worker stopped by content plan");
    return;
  }
  if (!manualNotesSemanticProcessingEnabled()) {
    console.log("[note-index] worker disabled");
    return;
  }
  const current = state();
  if (current.running) return;
  current.running = true;
  current.stopRequested = false;
  console.log("[note-index] worker starting");
  void workerLoop();
}

export function stopNoteIndexWorker(): void {
  state().stopRequested = true;
}

async function workerLoop(): Promise<void> {
  const current = state();
  while (!current.stopRequested) {
    if (
      !noteIndexPlanAllows() ||
      !manualNotesSemanticProcessingEnabled()
    ) {
      await sleep(IDLE_MS);
      continue;
    }
    const job = claimNextNoteIndexJob();
    if (!job) {
      await sleep(IDLE_MS);
      continue;
    }
    await runClaimedNoteIndexJob(job);
    await sleep(POLL_MS);
  }
  current.running = false;
  console.log("[note-index] worker stopped");
}

export function claimNextNoteIndexJob(now = Date.now()): NoteIndexJob | null {
  const db = getDb();
  if (
    !noteIndexPlanAllows(db) ||
    !manualNotesSemanticProcessingEnabled()
  ) {
    return null;
  }
  return db.transaction(() => {
    if (
      !noteIndexPlanAllows(db) ||
      !manualNotesSemanticProcessingEnabled()
    ) {
      return null;
    }
    const job = db
      .prepare(
        `SELECT item_id, target_epoch, target_generation, desired_action, state,
                attempts, claimed_by, lease_expires_at
         FROM note_index_jobs
         WHERE state IN ('pending', 'error')
           AND attempts < ?
           AND updated_at <= ?
           AND (lease_expires_at IS NULL OR lease_expires_at < ?)
         ORDER BY updated_at ASC
         LIMIT 1`,
      )
      .get(MAX_ATTEMPTS, now - QUIET_MS, now) as NoteIndexJob | undefined;
    if (!job) return null;
    const claimed = db
      .prepare(
        `UPDATE note_index_jobs
         SET state = 'running', attempts = attempts + 1,
             claimed_by = ?, lease_expires_at = ?, updated_at = ?
         WHERE item_id = ?
           AND target_epoch = ? AND target_generation = ?
           AND state IN ('pending', 'error')
           AND (lease_expires_at IS NULL OR lease_expires_at < ?)`,
      )
      .run(
        WORKER_ID,
        now + LEASE_MS,
        now,
        job.item_id,
        job.target_epoch,
        job.target_generation,
        now,
      );
    return claimed.changes === 1
      ? {
          ...job,
          state: "running" as const,
          attempts: job.attempts + 1,
          claimed_by: WORKER_ID,
          lease_expires_at: now + LEASE_MS,
        }
      : null;
  }).immediate();
}

function currentNote(
  itemId: string,
  db: Database.Database = getDb(),
): CurrentNote | null {
  return (
    (db
      .prepare(
        `SELECT s.item_id, i.title, s.epoch, s.generation, s.is_deleted,
                n.content_text, n.include_in_ai
         FROM item_note_state s
         JOIN items i ON i.id = s.item_id
         LEFT JOIN item_notes n ON n.item_id = s.item_id
         WHERE s.item_id = ?`,
      )
      .get(itemId) as CurrentNote | undefined) ?? null
  );
}

function isCurrent(job: NoteIndexJob, note: CurrentNote | null): boolean {
  return Boolean(
    note && note.epoch === job.target_epoch && note.generation === job.target_generation,
  );
}

function sameIndexInput(
  job: NoteIndexJob,
  before: CurrentNote,
  latest: CurrentNote | null,
): boolean {
  return Boolean(
    isCurrent(job, latest) &&
      latest?.is_deleted === 0 &&
      latest.include_in_ai === 1 &&
      latest.title === before.title &&
      latest.content_text === before.content_text &&
      latest.content_text?.trim(),
  );
}

function completeJob(
  job: NoteIndexJob,
  now: number,
  db: Database.Database = getDb(),
): boolean {
  return (
    db
      .prepare(
        `UPDATE note_index_jobs
         SET state = 'done', claimed_by = NULL, lease_expires_at = NULL,
             last_error_code = NULL, completed_at = ?, updated_at = ?
         WHERE item_id = ? AND target_epoch = ? AND target_generation = ?
           AND state = 'running' AND claimed_by = ?`,
      )
      .run(
        now,
        now,
        job.item_id,
        job.target_epoch,
        job.target_generation,
        WORKER_ID,
      ).changes === 1
  );
}

function failJob(
  job: NoteIndexJob,
  code: string,
  db: Database.Database = getDb(),
): void {
  const terminal = job.attempts >= MAX_ATTEMPTS;
  db
    .prepare(
      `UPDATE note_index_jobs
       SET state = 'error', claimed_by = NULL, lease_expires_at = NULL,
           last_error_code = ?, updated_at = ?,
           completed_at = CASE WHEN ? THEN ? ELSE NULL END
       WHERE item_id = ? AND target_epoch = ? AND target_generation = ?
         AND claimed_by = ?`,
    )
    .run(
      code.slice(0, 80),
      Date.now(),
      terminal ? 1 : 0,
      Date.now(),
      job.item_id,
      job.target_epoch,
      job.target_generation,
      WORKER_ID,
    );
}

export async function runClaimedNoteIndexJob(
  job: NoteIndexJob,
  deps: NoteIndexWorkerDeps = {},
): Promise<void> {
  const db = getDb();
  if (!noteIndexPlanAllows(db)) return;
  if (!manualNotesSemanticProcessingEnabled()) {
    failJob(job, "WORKER_DISABLED", db);
    return;
  }
  const before = currentNote(job.item_id, db);

  if (job.desired_action === "purge") {
    const purged = db.transaction(() => {
      const now = Date.now();
      if (
        !noteIndexPlanAllows(db) ||
        !manualNotesSemanticProcessingEnabled()
      ) {
        return false;
      }
      const owned = db
        .prepare(
          `SELECT 1 AS ok FROM note_index_jobs
           WHERE item_id = ? AND target_epoch = ? AND target_generation = ?
             AND desired_action = 'purge' AND state = 'running'
             AND claimed_by = ? AND lease_expires_at >= ?`,
        )
        .get(
          job.item_id,
          job.target_epoch,
          job.target_generation,
          WORKER_ID,
          now,
        );
      if (!owned) return false;
      deleteChunksAndVectors(job.item_id, "manual_note");
      return completeJob(job, now, db);
    }).immediate();
    if (purged) {
      itemSemanticsChanged({
        itemId: job.item_id,
        sourceKind: "manual_note",
        sourceEpoch: job.target_epoch,
        sourceVersion: job.target_generation,
        action: "purged",
      });
    }
    return;
  }

  if (
    !isCurrent(job, before) ||
    before?.is_deleted !== 0 ||
    before.include_in_ai !== 1 ||
    !before.content_text?.trim()
  ) {
    failJob(job, "NOTE_NO_LONGER_ELIGIBLE", db);
    return;
  }
  if (!noteAiProviderPolicy().eligible) {
    failJob(job, "NOTE_AI_CONSENT_REQUIRED", db);
    return;
  }

  const chunks = chunkBody(`${before.title}\n\n${before.content_text}`);
  if (chunks.length === 0) {
    db.transaction(() => {
      if (
        !noteIndexPlanAllows(db) ||
        !manualNotesSemanticProcessingEnabled() ||
        !noteAiProviderPolicy().eligible ||
        !sameIndexInput(job, before, currentNote(job.item_id, db))
      ) {
        return false;
      }
      deleteChunksAndVectors(job.item_id, "manual_note");
      return completeJob(job, Date.now(), db);
    }).immediate();
    return;
  }

  const heartbeat = setInterval(() => {
    if (
      !noteIndexPlanAllows(db) ||
      !sameIndexInput(job, before, currentNote(job.item_id, db))
    ) {
      return;
    }
    db
      .prepare(
        `UPDATE note_index_jobs SET lease_expires_at = ?, updated_at = ?
         WHERE item_id = ? AND claimed_by = ? AND state = 'running'`,
      )
      .run(Date.now() + LEASE_MS, Date.now(), job.item_id, WORKER_ID);
  }, Math.floor(LEASE_MS / 3));

  try {
    if (!noteIndexPlanAllows(db)) return;
    if (
      !manualNotesSemanticProcessingEnabled() ||
      !noteAiProviderPolicy().eligible
    ) {
      failJob(job, "NOTE_INDEX_POLICY_CHANGED", db);
      return;
    }
    if (!sameIndexInput(job, before, currentNote(job.item_id, db))) {
      return;
    }
    const vectors = await (deps.embedFn ?? ((inputs) => getEmbedProvider().embed(inputs)))(
      chunks.map((chunk) => chunk.body),
    );
    if (
      !noteIndexPlanAllows(db) ||
      !sameIndexInput(job, before, currentNote(job.item_id, db))
    ) {
      return;
    }
    if (
      !manualNotesSemanticProcessingEnabled() ||
      !noteAiProviderPolicy().eligible
    ) {
      failJob(job, "NOTE_INDEX_POLICY_CHANGED", db);
      return;
    }
    if (vectors.length !== chunks.length || vectors.some((vector) => vector.length !== EMBED_DIM)) {
      failJob(job, "NOTE_EMBED_INVALID_RESPONSE", db);
      return;
    }
    const committed = db.transaction(() => {
      if (
        !noteIndexPlanAllows(db) ||
        !manualNotesSemanticProcessingEnabled() ||
        !noteAiProviderPolicy().eligible
      ) {
        return false;
      }
      const latest = currentNote(job.item_id, db);
      if (
        !sameIndexInput(job, before, latest)
      ) {
        return false;
      }
      const owned = db
        .prepare(
          `SELECT 1 AS ok FROM note_index_jobs
           WHERE item_id = ? AND target_epoch = ? AND target_generation = ?
             AND state = 'running' AND claimed_by = ? AND lease_expires_at >= ?`,
        )
        .get(
          job.item_id,
          job.target_epoch,
          job.target_generation,
          WORKER_ID,
          Date.now(),
        );
      if (!owned) return false;

      deleteChunksAndVectors(job.item_id, "manual_note");
      const insertVector = db.prepare(
        "INSERT INTO chunks_vec(rowid, embedding) VALUES (?, ?)",
      );
      for (let index = 0; index < chunks.length; index += 1) {
        const { rowid } = insertChunkWithRowid({
          item_id: job.item_id,
          source_kind: "manual_note",
          source_epoch: job.target_epoch,
          source_version: job.target_generation,
          idx: chunks[index].idx,
          body: chunks[index].body,
          token_count: chunks[index].token_count,
        });
        insertVector.run(rowid, Buffer.from(vectors[index].buffer));
      }
      db.prepare(
        `UPDATE item_notes SET indexed_generation = ?
         WHERE item_id = ? AND epoch = ? AND generation = ? AND include_in_ai = 1`,
      ).run(job.target_generation, job.item_id, job.target_epoch, job.target_generation);
      return completeJob(job, Date.now(), db);
    }).immediate();

    if (committed) {
      itemSemanticsChanged({
        itemId: job.item_id,
        sourceKind: "manual_note",
        sourceEpoch: job.target_epoch,
        sourceVersion: job.target_generation,
        action: "indexed",
      });
    }
  } catch (error) {
    if (
      !noteIndexPlanAllows(db) ||
      !sameIndexInput(job, before, currentNote(job.item_id, db))
    ) {
      return;
    }
    const code = error instanceof Error ? error.name || "NOTE_INDEX_FAILED" : "NOTE_INDEX_FAILED";
    failJob(job, code, db);
  } finally {
    clearInterval(heartbeat);
  }
}

/** Test/operator hook: claim and run at most one eligible job. */
export async function runOneNoteIndexJob(
  now = Date.now(),
  deps: NoteIndexWorkerDeps = {},
): Promise<boolean> {
  if (!noteIndexPlanAllows()) return false;
  const job = claimNextNoteIndexJob(now);
  if (!job) return false;
  await runClaimedNoteIndexJob(job, deps);
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
