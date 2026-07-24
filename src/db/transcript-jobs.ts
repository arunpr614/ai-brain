import type Database from "better-sqlite3";
import { getDb, type ItemRow } from "./client";
import { getItem } from "./items";
import { getYouTubeBrowserSchemaCapability } from "./schema-capabilities";
import { extractVideoId } from "@/lib/capture/youtube-url";
import {
  assertItemBodyProcessingAllowed,
  ItemBodyProcessingBlockedError,
  resolveItemBodyProcessingGate,
  type BodyProcessingBlockedGate,
} from "@/lib/processing/hold-gate";

export type TranscriptJobState =
  | "pending"
  | "running"
  | "retryable_error"
  | "manual_needed"
  | "ignored"
  | "done";

export type TranscriptAttemptState =
  "success" | "retryable_error" | "terminal_error" | "skipped";

export interface TranscriptJobRow {
  id: number;
  item_id: string;
  source_platform: string;
  video_id: string | null;
  state: TranscriptJobState;
  priority: number;
  attempts: number;
  max_attempts: number;
  next_run_at: number | null;
  claimed_at: number | null;
  completed_at: number | null;
  last_attempt_id: number | null;
  last_provider: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: number;
  updated_at: number;
}

export interface TranscriptAttemptRow {
  id: number;
  job_id: number;
  item_id: string;
  attempt_number: number;
  provider: string;
  state: TranscriptAttemptState;
  retryable: number;
  error_code: string | null;
  error_message: string | null;
  status_code: number | null;
  started_at: number;
  finished_at: number | null;
  duration_ms: number | null;
  transcript_language: string | null;
  transcript_is_generated: number | null;
  transcript_is_translated: number | null;
  transcript_chars: number | null;
  artifact_ids_json: string | null;
  created_at: number;
}

export type TranscriptJobReviewRow = TranscriptJobRow & {
  item_title: string;
  item_source_url: string | null;
  item_capture_quality: string | null;
  item_extraction_warning: string | null;
  item_captured_at: number;
};

export type TranscriptJobUnchangedReason =
  | "not_recovery_candidate"
  | "item_not_found"
  | "job_not_found"
  | "no_eligible_job"
  | "active_transcript_source"
  | "already_terminal"
  | "no_rows_changed";

/**
 * Typed internal outcome for callers that must distinguish an ordinary empty
 * result from a hold/schema no-effect. Compatibility wrappers below retain the
 * existing schema-026 null/zero return shapes.
 */
export type TranscriptJobOperationResult<T> =
  | {
      readonly kind: "applied";
      readonly value: T;
    }
  | {
      readonly kind: "unchanged";
      readonly reason: TranscriptJobUnchangedReason;
      readonly value: T | null;
    }
  | {
      readonly kind: "blocked";
      readonly basis: BodyProcessingBlockedGate["basis"];
      readonly code: BodyProcessingBlockedGate["code"];
      readonly value: null;
    };

function blockedResult<T>(
  decision: BodyProcessingBlockedGate,
): TranscriptJobOperationResult<T> {
  return {
    kind: "blocked",
    basis: decision.basis,
    code: decision.code,
    value: null,
  };
}

function blockedErrorResult<T>(
  error: ItemBodyProcessingBlockedError,
): TranscriptJobOperationResult<T> {
  return {
    kind: "blocked",
    basis: error.basis,
    code: error.code,
    value: null,
  };
}

function blockedForItem(
  itemId: string,
  db: Database.Database,
): BodyProcessingBlockedGate | null {
  const decision = resolveItemBodyProcessingGate(itemId, db);
  return decision.allowed ? null : decision;
}

function hasActiveTranscriptSource(
  db: Database.Database,
  itemId: string,
): boolean {
  return Boolean(
    db
      .prepare(
        `SELECT 1
           FROM transcript_sources
          WHERE item_id = ? AND status = 'active'
          LIMIT 1`,
      )
      .get(itemId),
  );
}

function readySchemaHasActiveTranscriptSource(
  db: Database.Database,
  itemId: string,
): boolean {
  return (
    getYouTubeBrowserSchemaCapability(db).kind === "ready" &&
    hasActiveTranscriptSource(db, itemId)
  );
}

export class TranscriptRecoverySourceConflictError extends Error {
  constructor() {
    super("active_transcript_source");
    this.name = "TranscriptRecoverySourceConflictError";
  }
}

/**
 * Opt-in apply-time exclusion for automatic recovery. Manual/user-authored
 * replacement paths must not call this helper. Schema 026 remains a no-op.
 */
export function assertNoActiveTranscriptSourceForAutomaticRecovery(
  itemId: string,
  db: Database.Database,
): void {
  if (readySchemaHasActiveTranscriptSource(db, itemId)) {
    throw new TranscriptRecoverySourceConflictError();
  }
}

class TranscriptJobExecutionConflictError extends Error {
  constructor() {
    super("transcript_job_execution_conflict");
    this.name = "TranscriptJobExecutionConflictError";
  }
}

export interface ClaimedTranscriptJobIdentity {
  readonly id: number;
  readonly item_id: string;
  readonly attempts: number;
}

/**
 * Re-attest a claimed job before provider-result handling or apply. The
 * migration-028 source exclusion is deliberately conditional on the fixed
 * capability attestor so pre-feature schemas never prepare a query for a
 * future table.
 */
export function isClaimedTranscriptJobStillAuthoritative(
  claimed: ClaimedTranscriptJobIdentity,
): boolean {
  const db = getDb();
  const gate = resolveItemBodyProcessingGate(claimed.item_id, db);
  if (!gate.allowed) return false;
  const current = getTranscriptJobByIdFromDb(db, claimed.id);
  if (
    !current ||
    current.item_id !== claimed.item_id ||
    current.state !== "running" ||
    current.attempts !== claimed.attempts
  ) {
    return false;
  }
  return !readySchemaHasActiveTranscriptSource(db, claimed.item_id);
}

function getTranscriptJobForItemFromDb(
  db: Database.Database,
  itemId: string,
): TranscriptJobRow | null {
  const row = db
    .prepare("SELECT * FROM transcript_jobs WHERE item_id = ?")
    .get(itemId) as TranscriptJobRow | undefined;
  return row ?? null;
}

function getTranscriptJobByIdFromDb(
  db: Database.Database,
  jobId: number,
): TranscriptJobRow | null {
  const row = db
    .prepare("SELECT * FROM transcript_jobs WHERE id = ?")
    .get(jobId) as TranscriptJobRow | undefined;
  return row ?? null;
}

const RECOVERABLE_YOUTUBE_WARNINGS = new Set<string>([
  "no_transcript",
  "youtube_transcript_fetch_metadata_only",
  "youtube_antibot_metadata_only",
]);

export function isYoutubeTranscriptRecoveryCandidate(
  item: Pick<
    ItemRow,
    "source_type" | "source_platform" | "capture_quality" | "extraction_warning"
  >,
): boolean {
  const isYoutube =
    item.source_platform === "youtube" ||
    item.source_platform === "youtube_short" ||
    item.source_type === "youtube";
  if (!isYoutube) return false;
  return (
    item.capture_quality === "metadata_only" ||
    (item.extraction_warning !== null &&
      RECOVERABLE_YOUTUBE_WARNINGS.has(item.extraction_warning))
  );
}

export function youtubeVideoIdFromItem(
  item: Pick<ItemRow, "source_url">,
): string | null {
  if (!item.source_url) return null;
  return extractVideoId(item.source_url);
}

export interface TranscriptJobEnqueueOptions {
  priority?: number;
  reset?: boolean;
  nextRunAt?: number;
}

export function enqueueTranscriptJobForItemWithOutcome(
  item: ItemRow,
  options: TranscriptJobEnqueueOptions = {},
): TranscriptJobOperationResult<TranscriptJobRow> {
  const db = getDb();
  const initialBlock = blockedForItem(item.id, db);
  if (initialBlock) return blockedResult(initialBlock);

  if (!isYoutubeTranscriptRecoveryCandidate(item)) {
    return {
      kind: "unchanged",
      reason: "not_recovery_candidate",
      value: null,
    };
  }
  if (readySchemaHasActiveTranscriptSource(db, item.id)) {
    return {
      kind: "unchanged",
      reason: "active_transcript_source",
      value: null,
    };
  }

  const now = Date.now();
  const priority = options.priority ?? 10;
  const nextRunAt = options.nextRunAt ?? now;
  const videoId = youtubeVideoIdFromItem(item);
  const platform = item.source_platform ?? item.source_type;

  const tx = db.transaction((): TranscriptJobRow => {
    assertItemBodyProcessingAllowed(item.id, db);
    if (readySchemaHasActiveTranscriptSource(db, item.id)) {
      throw new TranscriptRecoverySourceConflictError();
    }
    if (options.reset) {
      db.prepare(
        `INSERT INTO transcript_jobs (
           item_id, source_platform, video_id, state, priority, attempts,
           next_run_at, claimed_at, completed_at, last_attempt_id,
           last_provider, last_error_code, last_error_message, updated_at
         )
         VALUES (?, ?, ?, 'pending', ?, 0, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?)
         ON CONFLICT(item_id) DO UPDATE SET
           source_platform = excluded.source_platform,
           video_id = COALESCE(excluded.video_id, transcript_jobs.video_id),
           state = 'pending',
           priority = MAX(transcript_jobs.priority, excluded.priority),
           next_run_at = excluded.next_run_at,
           claimed_at = NULL,
           completed_at = NULL,
           last_error_code = NULL,
           last_error_message = NULL,
           updated_at = excluded.updated_at`,
      ).run(item.id, platform, videoId, priority, nextRunAt, now);
      const job = getTranscriptJobForItemFromDb(db, item.id);
      if (job) normalizeTranscriptJobRetryWindow(db, job);
    } else {
      db.prepare(
        `INSERT INTO transcript_jobs (
           item_id, source_platform, video_id, state, priority, next_run_at, updated_at
         )
         VALUES (?, ?, ?, 'pending', ?, ?, ?)
         ON CONFLICT(item_id) DO UPDATE SET
           source_platform = excluded.source_platform,
           video_id = COALESCE(transcript_jobs.video_id, excluded.video_id),
           priority = MAX(transcript_jobs.priority, excluded.priority),
           next_run_at = CASE
             WHEN transcript_jobs.state IN ('pending', 'retryable_error') THEN
               COALESCE(transcript_jobs.next_run_at, excluded.next_run_at)
             ELSE transcript_jobs.next_run_at
           END,
           updated_at = excluded.updated_at`,
      ).run(item.id, platform, videoId, priority, nextRunAt, now);
    }

    assertItemBodyProcessingAllowed(item.id, db);
    const job = getTranscriptJobForItemFromDb(db, item.id);
    if (!job) throw new Error("transcript_job_enqueue_missing");
    return job;
  });

  try {
    return { kind: "applied", value: tx() };
  } catch (error) {
    if (error instanceof ItemBodyProcessingBlockedError) {
      return blockedErrorResult(error);
    }
    if (error instanceof TranscriptRecoverySourceConflictError) {
      return {
        kind: "unchanged",
        reason: "active_transcript_source",
        value: null,
      };
    }
    throw error;
  }
}

export function enqueueTranscriptJobForItem(
  item: ItemRow,
  options: TranscriptJobEnqueueOptions = {},
): TranscriptJobRow | null {
  const result = enqueueTranscriptJobForItemWithOutcome(item, options);
  return result.kind === "blocked" ? null : result.value;
}

export function enqueueTranscriptJobForExistingYoutubeItemWithOutcome(
  itemId: string,
  _reason: string,
): TranscriptJobOperationResult<TranscriptJobRow> {
  void _reason;
  const initialBlock = blockedForItem(itemId, getDb());
  if (initialBlock) return blockedResult(initialBlock);
  const item = getItem(itemId);
  if (!item) {
    return { kind: "unchanged", reason: "item_not_found", value: null };
  }
  return enqueueTranscriptJobForItemWithOutcome(item, {
    reset: true,
    priority: 20,
  });
}

export function enqueueTranscriptJobForExistingYoutubeItem(
  itemId: string,
  _reason: string,
): TranscriptJobRow | null {
  const result = enqueueTranscriptJobForExistingYoutubeItemWithOutcome(
    itemId,
    _reason,
  );
  return result.kind === "blocked" ? null : result.value;
}

export function backfillTranscriptJobsForExistingYoutubeItemsWithOutcome(): TranscriptJobOperationResult<number> {
  const db = getDb();
  const capability = getYouTubeBrowserSchemaCapability(db);
  if (capability.kind === "incompatible") {
    const block = blockedForItem("", db);
    if (block) return blockedResult(block);
    return {
      kind: "blocked",
      basis: "schema_incompatible",
      code: "processing_schema_incompatible",
      value: null,
    };
  }

  const rows = db
    .prepare(
      `SELECT *
         FROM items
        WHERE (
          source_platform IN ('youtube', 'youtube_short')
          OR source_type = 'youtube'
        )
        AND (
          capture_quality = 'metadata_only'
          OR extraction_warning IN (
            'no_transcript',
            'youtube_transcript_fetch_metadata_only',
            'youtube_antibot_metadata_only'
          )
        )`,
    )
    .all() as ItemRow[];

  let count = 0;
  let firstBlock: BodyProcessingBlockedGate | null = null;
  for (const item of rows) {
    const result = enqueueTranscriptJobForItemWithOutcome(item);
    if (result.kind === "applied") count += 1;
    else if (result.kind === "blocked" && !firstBlock) {
      firstBlock = {
        allowed: false,
        basis: result.basis,
        code: result.code,
      };
    }
  }
  if (count === 0 && firstBlock) return blockedResult(firstBlock);
  return { kind: "applied", value: count };
}

export function backfillTranscriptJobsForExistingYoutubeItems(): number {
  const result = backfillTranscriptJobsForExistingYoutubeItemsWithOutcome();
  return result.kind === "applied" ? result.value : 0;
}

export function getTranscriptJobForItem(
  itemId: string,
): TranscriptJobRow | null {
  return getTranscriptJobForItemFromDb(getDb(), itemId);
}

export function listTranscriptAttemptsForItem(
  itemId: string,
): TranscriptAttemptRow[] {
  return getDb()
    .prepare(
      `SELECT *
         FROM transcript_attempts
        WHERE item_id = ?
        ORDER BY created_at DESC, id DESC`,
    )
    .all(itemId) as TranscriptAttemptRow[];
}

function getMaxRecordedAttemptNumber(
  db: Database.Database,
  jobId: number,
): number {
  const row = db
    .prepare(
      `SELECT COALESCE(MAX(attempt_number), 0) AS max_attempt_number
         FROM transcript_attempts
        WHERE job_id = ?`,
    )
    .get(jobId) as { max_attempt_number: number } | undefined;
  return row?.max_attempt_number ?? 0;
}

function transcriptJobRetryWindow(
  db: Database.Database,
  job: Pick<TranscriptJobRow, "id" | "attempts" | "max_attempts">,
): {
  attempts: number;
  maxAttempts: number;
} {
  const attempts = Math.max(
    job.attempts,
    getMaxRecordedAttemptNumber(db, job.id),
  );
  return {
    attempts,
    maxAttempts: attempts >= job.max_attempts ? attempts + 1 : job.max_attempts,
  };
}

function normalizeTranscriptJobRetryWindow(
  db: Database.Database,
  job: Pick<TranscriptJobRow, "id" | "attempts" | "max_attempts">,
): void {
  const now = Date.now();
  const retryWindow = transcriptJobRetryWindow(db, job);
  db.prepare(
    `UPDATE transcript_jobs
          SET attempts = ?,
              max_attempts = ?,
              updated_at = ?
        WHERE id = ?`,
  ).run(retryWindow.attempts, retryWindow.maxAttempts, now, job.id);
}

export function listTranscriptJobsForReview(
  options: { limit?: number } = {},
): TranscriptJobReviewRow[] {
  const limit = options.limit ?? 200;
  return getDb()
    .prepare(
      `SELECT tj.*,
              i.title AS item_title,
              i.source_url AS item_source_url,
              i.capture_quality AS item_capture_quality,
              i.extraction_warning AS item_extraction_warning,
              i.captured_at AS item_captured_at
         FROM transcript_jobs tj
         JOIN items i ON i.id = tj.item_id
        WHERE tj.state IN ('pending', 'running', 'retryable_error', 'manual_needed')
        ORDER BY tj.priority DESC, COALESCE(tj.next_run_at, tj.created_at) ASC, tj.created_at ASC
        LIMIT ?`,
    )
    .all(limit) as TranscriptJobReviewRow[];
}

function claimNextTranscriptJobLegacy(
  db: Database.Database,
  now: number,
): TranscriptJobRow | null {
  const tx = db.transaction((): TranscriptJobRow | null => {
    assertItemBodyProcessingAllowed("", db);
    const row = db
      .prepare(
        `SELECT *
           FROM transcript_jobs
          WHERE state IN ('pending', 'retryable_error')
            AND attempts < max_attempts
            AND (next_run_at IS NULL OR next_run_at <= ?)
          ORDER BY priority DESC, COALESCE(next_run_at, created_at) ASC, created_at ASC
          LIMIT 1`,
      )
      .get(now) as TranscriptJobRow | undefined;
    if (!row) {
      assertItemBodyProcessingAllowed("", db);
      return null;
    }

    const updatedAt = Date.now();
    const info = db
      .prepare(
        `UPDATE transcript_jobs
            SET state = 'running',
                attempts = attempts + 1,
                claimed_at = ?,
                updated_at = ?
          WHERE id = ?
            AND state IN ('pending', 'retryable_error')`,
      )
      .run(updatedAt, updatedAt, row.id);
    if (info.changes === 0) {
      assertItemBodyProcessingAllowed("", db);
      return null;
    }
    assertItemBodyProcessingAllowed("", db);
    return {
      ...row,
      state: "running",
      attempts: row.attempts + 1,
      claimed_at: updatedAt,
      updated_at: updatedAt,
    };
  });
  return tx();
}

export function claimNextTranscriptJobWithOutcome(
  now = Date.now(),
): TranscriptJobOperationResult<TranscriptJobRow> {
  const db = getDb();
  const capability = getYouTubeBrowserSchemaCapability(db);
  if (capability.kind === "incompatible") {
    return {
      kind: "blocked",
      basis: "schema_incompatible",
      code: "processing_schema_incompatible",
      value: null,
    };
  }
  if (capability.kind === "absent") {
    try {
      const job = claimNextTranscriptJobLegacy(db, now);
      return job
        ? { kind: "applied", value: job }
        : {
            kind: "unchanged",
            reason: "no_eligible_job",
            value: null,
          };
    } catch (error) {
      if (error instanceof ItemBodyProcessingBlockedError) {
        return blockedErrorResult(error);
      }
      throw error;
    }
  }

  const tx = db.transaction(
    (): TranscriptJobOperationResult<TranscriptJobRow> => {
      if (getYouTubeBrowserSchemaCapability(db).kind === "incompatible") {
        return {
          kind: "blocked",
          basis: "schema_incompatible",
          code: "processing_schema_incompatible",
          value: null,
        };
      }

      const rows = db
        .prepare(
          `SELECT *
           FROM transcript_jobs
          WHERE state IN ('pending', 'retryable_error')
            AND attempts < max_attempts
            AND (next_run_at IS NULL OR next_run_at <= ?)
          ORDER BY priority DESC, COALESCE(next_run_at, created_at) ASC, created_at ASC`,
        )
        .all(now) as TranscriptJobRow[];
      let firstBlock: BodyProcessingBlockedGate | null = null;

      for (const row of rows) {
        const block = blockedForItem(row.item_id, db);
        if (block) {
          firstBlock ??= block;
          continue;
        }
        if (hasActiveTranscriptSource(db, row.item_id)) continue;

        assertItemBodyProcessingAllowed(row.item_id, db);
        const updatedAt = Date.now();
        const info = db
          .prepare(
            `UPDATE transcript_jobs
              SET state = 'running',
                  attempts = attempts + 1,
                  claimed_at = ?,
                  updated_at = ?
            WHERE id = ?
              AND state IN ('pending', 'retryable_error')`,
          )
          .run(updatedAt, updatedAt, row.id);
        if (info.changes === 0) continue;
        assertItemBodyProcessingAllowed(row.item_id, db);
        return {
          kind: "applied",
          value: {
            ...row,
            state: "running",
            attempts: row.attempts + 1,
            claimed_at: updatedAt,
            updated_at: updatedAt,
          },
        };
      }

      if (firstBlock) return blockedResult(firstBlock);
      return { kind: "unchanged", reason: "no_eligible_job", value: null };
    },
  );

  try {
    return tx();
  } catch (error) {
    if (error instanceof ItemBodyProcessingBlockedError) {
      return blockedErrorResult(error);
    }
    throw error;
  }
}

export function claimNextTranscriptJob(
  now = Date.now(),
): TranscriptJobRow | null {
  const result = claimNextTranscriptJobWithOutcome(now);
  return result.kind === "applied" ? result.value : null;
}

export function sweepStaleTranscriptClaimsWithOutcome(
  staleBefore: number,
): TranscriptJobOperationResult<number> {
  const now = Date.now();
  const db = getDb();
  const capability = getYouTubeBrowserSchemaCapability(db);
  if (capability.kind === "incompatible") {
    return {
      kind: "blocked",
      basis: "schema_incompatible",
      code: "processing_schema_incompatible",
      value: null,
    };
  }
  if (capability.kind === "absent") {
    const tx = db.transaction((): number => {
      assertItemBodyProcessingAllowed("", db);
      const info = db
        .prepare(
          `UPDATE transcript_jobs
              SET state = 'retryable_error',
                  claimed_at = NULL,
                  next_run_at = ?,
                  last_error_code = 'stale_claim',
                  last_error_message = 'Transcript worker claim expired before completion.',
                  updated_at = ?
            WHERE state = 'running'
              AND claimed_at < ?`,
        )
        .run(now, now, staleBefore);
      assertItemBodyProcessingAllowed("", db);
      return info.changes;
    });
    try {
      return { kind: "applied", value: tx() };
    } catch (error) {
      if (error instanceof ItemBodyProcessingBlockedError) {
        return blockedErrorResult(error);
      }
      throw error;
    }
  }

  const tx = db.transaction((): TranscriptJobOperationResult<number> => {
    const rows = db
      .prepare(
        `SELECT *
           FROM transcript_jobs
          WHERE state = 'running'
            AND claimed_at < ?
          ORDER BY id`,
      )
      .all(staleBefore) as TranscriptJobRow[];
    let changes = 0;
    let firstBlock: BodyProcessingBlockedGate | null = null;

    for (const row of rows) {
      const block = blockedForItem(row.item_id, db);
      if (block) {
        firstBlock ??= block;
        continue;
      }
      if (hasActiveTranscriptSource(db, row.item_id)) continue;
      assertItemBodyProcessingAllowed(row.item_id, db);
      changes += db
        .prepare(
          `UPDATE transcript_jobs
              SET state = 'retryable_error',
                  claimed_at = NULL,
                  next_run_at = ?,
                  last_error_code = 'stale_claim',
                  last_error_message = 'Transcript worker claim expired before completion.',
                  updated_at = ?
            WHERE id = ?
              AND state = 'running'
              AND claimed_at < ?`,
        )
        .run(now, now, row.id, staleBefore).changes;
      assertItemBodyProcessingAllowed(row.item_id, db);
    }

    if (getYouTubeBrowserSchemaCapability(db).kind === "incompatible") {
      assertItemBodyProcessingAllowed("", db);
    }
    if (changes === 0 && firstBlock) return blockedResult(firstBlock);
    return { kind: "applied", value: changes };
  });

  try {
    return tx();
  } catch (error) {
    if (error instanceof ItemBodyProcessingBlockedError) {
      return blockedErrorResult(error);
    }
    throw error;
  }
}

export function sweepStaleTranscriptClaims(staleBefore: number): number {
  const result = sweepStaleTranscriptClaimsWithOutcome(staleBefore);
  return result.kind === "applied" ? result.value : 0;
}

export interface RecordTranscriptAttemptInput {
  jobId: number;
  itemId: string;
  attemptNumber: number;
  provider: string;
  state: TranscriptAttemptState;
  retryable: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  statusCode?: number | null;
  startedAt: number;
  finishedAt?: number | null;
  transcriptLanguage?: string | null;
  transcriptIsGenerated?: boolean | null;
  transcriptIsTranslated?: boolean | null;
  transcriptChars?: number | null;
  artifactIdsJson?: string | null;
}

export type TranscriptPersistentErrorCode =
  | "captions_unavailable"
  | "innertube_fetch_failed"
  | "invalid_youtube_url"
  | "item_missing"
  | "item_upgrade_failed"
  | "live_stream_captions_pending"
  | "metadata_only"
  | "missing_video_id"
  | "provider_exception"
  | "stale_claim"
  | "timedtext_fetch_failed"
  | "timedtext_http_429"
  | "timedtext_http_5xx"
  | "timedtext_http_error"
  | "transcript_manual_needed"
  | "transcript_retryable_error"
  | "transcript_unavailable"
  | "worker_exception"
  | "youtube_antibot_metadata_only";

export interface TranscriptPersistentError {
  readonly code: TranscriptPersistentErrorCode;
  readonly message: string;
}

type TranscriptPersistentProvider =
  "transcript_provider" | "transcript_worker" | "youtube_innertube_timedtext";

function normalizeTranscriptPersistentProvider(
  provider: string | null | undefined,
): TranscriptPersistentProvider | null {
  if (provider === null || provider === undefined) return null;
  if (
    provider === "transcript_worker" ||
    provider === "youtube_innertube_timedtext"
  ) {
    return provider;
  }
  return "transcript_provider";
}

const TRANSCRIPT_ERROR_MESSAGES: Readonly<
  Record<TranscriptPersistentErrorCode, string>
> = Object.freeze({
  captions_unavailable: "No transcript captions were available.",
  innertube_fetch_failed: "The transcript provider could not be reached.",
  invalid_youtube_url: "The item does not have a valid YouTube URL.",
  item_missing: "The transcript item no longer exists.",
  item_upgrade_failed: "The recovered transcript could not be applied.",
  live_stream_captions_pending: "Live-stream captions are not ready yet.",
  metadata_only: "Transcript recovery returned metadata only.",
  missing_video_id: "The item does not have a valid YouTube video identifier.",
  provider_exception: "The transcript provider failed unexpectedly.",
  stale_claim: "The transcript worker claim expired before completion.",
  timedtext_fetch_failed: "The transcript provider request failed.",
  timedtext_http_429: "The transcript provider rate limited recovery.",
  timedtext_http_5xx: "The transcript provider is temporarily unavailable.",
  timedtext_http_error: "The transcript provider rejected the request.",
  transcript_manual_needed: "Transcript recovery needs manual help.",
  transcript_retryable_error: "Transcript recovery hit a retryable error.",
  transcript_unavailable: "Transcript recovery did not produce a transcript.",
  worker_exception: "The transcript worker failed unexpectedly.",
  youtube_antibot_metadata_only:
    "The transcript provider required an unsupported challenge.",
});

/**
 * Collapse provider-controlled codes and messages to a reviewed vocabulary
 * before any durable transcript error write.
 */
export function normalizeTranscriptPersistentError(
  code: string | null | undefined,
  fallback: "manual" | "retryable",
): TranscriptPersistentError {
  let normalized: TranscriptPersistentErrorCode;
  switch (code) {
    case "captions_unavailable":
    case "innertube_fetch_failed":
    case "invalid_youtube_url":
    case "item_missing":
    case "item_upgrade_failed":
    case "live_stream_captions_pending":
    case "metadata_only":
    case "missing_video_id":
    case "provider_exception":
    case "stale_claim":
    case "timedtext_fetch_failed":
    case "timedtext_http_429":
    case "transcript_manual_needed":
    case "transcript_retryable_error":
    case "transcript_unavailable":
    case "worker_exception":
    case "youtube_antibot_metadata_only":
      normalized = code;
      break;
    default:
      if (/^timedtext_http_5\d\d$/u.test(code ?? "")) {
        normalized = "timedtext_http_5xx";
      } else if (/^timedtext_http_\d{3}$/u.test(code ?? "")) {
        normalized = "timedtext_http_error";
      } else {
        normalized =
          fallback === "retryable"
            ? "transcript_retryable_error"
            : "transcript_manual_needed";
      }
  }
  return {
    code: normalized,
    message: TRANSCRIPT_ERROR_MESSAGES[normalized],
  };
}

function normalizedAttemptInput(
  input: RecordTranscriptAttemptInput,
): RecordTranscriptAttemptInput {
  if (input.state === "success" || input.state === "skipped") return input;
  const error = normalizeTranscriptPersistentError(
    input.errorCode,
    input.retryable ? "retryable" : "manual",
  );
  return {
    ...input,
    provider:
      normalizeTranscriptPersistentProvider(input.provider) ??
      "transcript_provider",
    errorCode: error.code,
    errorMessage: error.message,
  };
}

function insertTranscriptAttempt(
  db: Database.Database,
  input: RecordTranscriptAttemptInput,
): number {
  const finishedAt = input.finishedAt ?? Date.now();
  const info = db
    .prepare(
      `INSERT INTO transcript_attempts (
         job_id, item_id, attempt_number, provider, state, retryable,
         error_code, error_message, status_code, started_at, finished_at,
         duration_ms, transcript_language, transcript_is_generated,
         transcript_is_translated, transcript_chars, artifact_ids_json
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.jobId,
      input.itemId,
      input.attemptNumber,
      input.provider,
      input.state,
      input.retryable ? 1 : 0,
      input.errorCode ?? null,
      input.errorMessage ?? null,
      input.statusCode ?? null,
      input.startedAt,
      finishedAt,
      Math.max(0, finishedAt - input.startedAt),
      input.transcriptLanguage ?? null,
      input.transcriptIsGenerated === null ||
        input.transcriptIsGenerated === undefined
        ? null
        : input.transcriptIsGenerated
          ? 1
          : 0,
      input.transcriptIsTranslated === null ||
        input.transcriptIsTranslated === undefined
        ? null
        : input.transcriptIsTranslated
          ? 1
          : 0,
      input.transcriptChars ?? null,
      input.artifactIdsJson ?? null,
    );
  return Number(info.lastInsertRowid);
}

export function recordTranscriptAttempt(
  input: RecordTranscriptAttemptInput,
): number | null {
  const db = getDb();
  const tx = db.transaction((): number | null => {
    assertItemBodyProcessingAllowed(input.itemId, db);
    const job = getTranscriptJobByIdFromDb(db, input.jobId);
    if (
      !job ||
      job.item_id !== input.itemId ||
      job.state !== "running" ||
      job.attempts !== input.attemptNumber
    ) {
      return null;
    }
    if (readySchemaHasActiveTranscriptSource(db, job.item_id)) return null;
    const attemptId = insertTranscriptAttempt(
      db,
      normalizedAttemptInput(input),
    );
    assertItemBodyProcessingAllowed(job.item_id, db);
    if (
      readySchemaHasActiveTranscriptSource(db, job.item_id) ||
      getTranscriptJobByIdFromDb(db, input.jobId)?.state !== "running"
    ) {
      throw new TranscriptJobExecutionConflictError();
    }
    return attemptId;
  });
  try {
    return tx.immediate();
  } catch (error) {
    if (error instanceof TranscriptJobExecutionConflictError) return null;
    throw error;
  }
}

export type TranscriptJobFinalTransition =
  | { readonly kind: "done" }
  | {
      readonly kind: "retryable";
      readonly nextRunAt: number;
      readonly error: {
        readonly code: string;
        readonly message?: string;
        readonly provider?: string | null;
      };
      readonly preserveRetryWindow?: boolean;
    }
  | {
      readonly kind: "manual_needed";
      readonly error: {
        readonly code: string;
        readonly message?: string;
        readonly provider?: string | null;
      };
    };

/**
 * Persist an attempt and its claimed-job transition as one unit. A hold,
 * active source, deletion, or stale claim causes a complete no-effect; no
 * orphan attempt can survive a failed CAS.
 */
export function finalizeTranscriptJobAttempt(
  input: RecordTranscriptAttemptInput,
  transition: TranscriptJobFinalTransition,
): number | null {
  const db = getDb();
  const tx = db.transaction((): number | null => {
    assertItemBodyProcessingAllowed(input.itemId, db);
    const job = getTranscriptJobByIdFromDb(db, input.jobId);
    if (
      !job ||
      job.item_id !== input.itemId ||
      job.state !== "running" ||
      job.attempts !== input.attemptNumber
    ) {
      return null;
    }
    if (readySchemaHasActiveTranscriptSource(db, job.item_id)) return null;

    const normalizedInput = normalizedAttemptInput(input);
    const attemptId = insertTranscriptAttempt(db, normalizedInput);
    assertItemBodyProcessingAllowed(job.item_id, db);
    if (readySchemaHasActiveTranscriptSource(db, job.item_id)) {
      throw new TranscriptJobExecutionConflictError();
    }

    const now = normalizedInput.finishedAt ?? Date.now();
    let changes = 0;
    if (transition.kind === "done") {
      changes = db
        .prepare(
          `UPDATE transcript_jobs
              SET state = 'done',
                  claimed_at = NULL,
                  completed_at = ?,
                  next_run_at = NULL,
                  last_attempt_id = ?,
                  last_error_code = NULL,
                  last_error_message = NULL,
                  updated_at = ?
            WHERE id = ?
              AND item_id = ?
              AND state = 'running'
              AND attempts = ?`,
        )
        .run(
          now,
          attemptId,
          now,
          job.id,
          job.item_id,
          input.attemptNumber,
        ).changes;
    } else {
      const stableError = normalizeTranscriptPersistentError(
        transition.error.code,
        transition.kind === "retryable" ? "retryable" : "manual",
      );
      if (transition.kind === "retryable") {
        const preserveRetryWindow = transition.preserveRetryWindow ? 1 : 0;
        changes = db
          .prepare(
            `UPDATE transcript_jobs
                SET state = CASE
                      WHEN ? = 1 OR attempts < max_attempts THEN 'retryable_error'
                      ELSE 'manual_needed'
                    END,
                    max_attempts = CASE
                      WHEN ? = 1 THEN MAX(max_attempts, attempts + 3)
                      ELSE max_attempts
                    END,
                    claimed_at = NULL,
                    next_run_at = CASE
                      WHEN ? = 1 OR attempts < max_attempts THEN ?
                      ELSE NULL
                    END,
                    completed_at = CASE
                      WHEN ? = 1 OR attempts < max_attempts THEN NULL
                      ELSE ?
                    END,
                    last_attempt_id = ?,
                    last_provider = ?,
                    last_error_code = ?,
                    last_error_message = ?,
                    updated_at = ?
              WHERE id = ?
                AND item_id = ?
                AND state = 'running'
                AND attempts = ?`,
          )
          .run(
            preserveRetryWindow,
            preserveRetryWindow,
            preserveRetryWindow,
            transition.nextRunAt,
            preserveRetryWindow,
            now,
            attemptId,
            normalizeTranscriptPersistentProvider(
              transition.error.provider ?? normalizedInput.provider,
            ),
            stableError.code,
            stableError.message,
            now,
            job.id,
            job.item_id,
            input.attemptNumber,
          ).changes;
      } else {
        changes = db
          .prepare(
            `UPDATE transcript_jobs
                SET state = 'manual_needed',
                    claimed_at = NULL,
                    next_run_at = NULL,
                    completed_at = ?,
                    last_attempt_id = ?,
                    last_provider = ?,
                    last_error_code = ?,
                    last_error_message = ?,
                    updated_at = ?
              WHERE id = ?
                AND item_id = ?
                AND state = 'running'
                AND attempts = ?`,
          )
          .run(
            now,
            attemptId,
            normalizeTranscriptPersistentProvider(
              transition.error.provider ?? normalizedInput.provider,
            ),
            stableError.code,
            stableError.message,
            now,
            job.id,
            job.item_id,
            input.attemptNumber,
          ).changes;
      }
    }

    if (changes !== 1) throw new TranscriptJobExecutionConflictError();
    assertItemBodyProcessingAllowed(job.item_id, db);
    if (readySchemaHasActiveTranscriptSource(db, job.item_id)) {
      throw new TranscriptJobExecutionConflictError();
    }
    return attemptId;
  });

  try {
    return tx.immediate();
  } catch (error) {
    if (error instanceof TranscriptJobExecutionConflictError) return null;
    throw error;
  }
}

export function markTranscriptJobDone(
  jobId: number,
  attemptId?: number | null,
): void {
  const now = Date.now();
  const db = getDb();
  const tx = db.transaction(() => {
    assertItemBodyProcessingAllowed("", db);
    const job = getTranscriptJobByIdFromDb(db, jobId);
    if (!job) return;
    assertItemBodyProcessingAllowed(job.item_id, db);
    if (readySchemaHasActiveTranscriptSource(db, job.item_id)) return;
    db.prepare(
      `UPDATE transcript_jobs
          SET state = 'done',
              claimed_at = NULL,
              completed_at = ?,
              next_run_at = NULL,
              last_attempt_id = COALESCE(?, last_attempt_id),
              last_error_code = NULL,
              last_error_message = NULL,
              updated_at = ?
        WHERE id = ?
          AND state = 'running'`,
    ).run(now, attemptId ?? null, now, jobId);
    assertItemBodyProcessingAllowed(job.item_id, db);
    if (readySchemaHasActiveTranscriptSource(db, job.item_id)) {
      throw new TranscriptJobExecutionConflictError();
    }
  });
  try {
    tx.immediate();
  } catch (error) {
    if (!(error instanceof TranscriptJobExecutionConflictError)) throw error;
  }
}

export function markTranscriptJobResolvedForItem(
  itemId: string,
  provider = "manual_text",
): void {
  const now = Date.now();
  const db = getDb();
  const tx = db.transaction(() => {
    assertItemBodyProcessingAllowed(itemId, db);
    db.prepare(
      `UPDATE transcript_jobs
          SET state = 'done',
              claimed_at = NULL,
              completed_at = ?,
              next_run_at = NULL,
              last_provider = ?,
              last_error_code = NULL,
              last_error_message = NULL,
              updated_at = ?
        WHERE item_id = ?
          AND state != 'done'`,
    ).run(now, provider, now, itemId);
    assertItemBodyProcessingAllowed(itemId, db);
  });
  tx();
}

export function recordManualTranscriptResolutionForItem(input: {
  itemId: string;
  provider?: string;
  transcriptChars?: number | null;
}): TranscriptJobRow | null {
  const provider = input.provider ?? "manual_user_text";
  const now = Date.now();
  const db = getDb();
  const tx = db.transaction((): TranscriptJobRow | null => {
    assertItemBodyProcessingAllowed(input.itemId, db);
    const job = getTranscriptJobForItemFromDb(db, input.itemId);
    if (!job) return null;
    if (job.state === "done") return job;

    const attemptNumber =
      Math.max(job.attempts, getMaxRecordedAttemptNumber(db, job.id)) + 1;
    const attemptId = insertTranscriptAttempt(db, {
      jobId: job.id,
      itemId: input.itemId,
      attemptNumber,
      provider,
      state: "success",
      retryable: false,
      startedAt: now,
      finishedAt: now,
      transcriptChars: input.transcriptChars ?? null,
    });

    db.prepare(
      `UPDATE transcript_jobs
          SET state = 'done',
              attempts = MAX(attempts, ?),
              claimed_at = NULL,
              completed_at = ?,
              next_run_at = NULL,
              last_attempt_id = ?,
              last_provider = ?,
              last_error_code = NULL,
              last_error_message = NULL,
              updated_at = ?
        WHERE id = ?`,
    ).run(attemptNumber, now, attemptId, provider, now, job.id);
    assertItemBodyProcessingAllowed(input.itemId, db);
    return getTranscriptJobForItemFromDb(db, input.itemId);
  });
  return tx();
}

export function markTranscriptJobRetryable(
  jobId: number,
  attemptId: number | null,
  nextRunAt: number,
  error: { code: string; message: string; provider?: string | null },
  options: { preserveRetryWindow?: boolean } = {},
): void {
  const now = Date.now();
  const preserveRetryWindow = options.preserveRetryWindow ? 1 : 0;
  const db = getDb();
  const tx = db.transaction(() => {
    assertItemBodyProcessingAllowed("", db);
    const job = getTranscriptJobByIdFromDb(db, jobId);
    if (!job) return;
    assertItemBodyProcessingAllowed(job.item_id, db);
    if (readySchemaHasActiveTranscriptSource(db, job.item_id)) return;
    const stableError = normalizeTranscriptPersistentError(
      error.code,
      "retryable",
    );
    db.prepare(
      `UPDATE transcript_jobs
          SET state = CASE
                WHEN ? = 1 OR attempts < max_attempts THEN 'retryable_error'
                ELSE 'manual_needed'
              END,
              max_attempts = CASE
                WHEN ? = 1 THEN MAX(max_attempts, attempts + 3)
                ELSE max_attempts
              END,
              claimed_at = NULL,
              next_run_at = CASE
                WHEN ? = 1 OR attempts < max_attempts THEN ?
                ELSE NULL
              END,
              completed_at = CASE
                WHEN ? = 1 OR attempts < max_attempts THEN NULL
                ELSE ?
              END,
              last_attempt_id = COALESCE(?, last_attempt_id),
              last_provider = ?,
              last_error_code = ?,
              last_error_message = ?,
              updated_at = ?
        WHERE id = ?
          AND state = 'running'`,
    ).run(
      preserveRetryWindow,
      preserveRetryWindow,
      preserveRetryWindow,
      nextRunAt,
      preserveRetryWindow,
      now,
      attemptId,
      normalizeTranscriptPersistentProvider(error.provider),
      stableError.code,
      stableError.message,
      now,
      jobId,
    );
    assertItemBodyProcessingAllowed(job.item_id, db);
    if (readySchemaHasActiveTranscriptSource(db, job.item_id)) {
      throw new TranscriptJobExecutionConflictError();
    }
  });
  try {
    tx.immediate();
  } catch (caught) {
    if (!(caught instanceof TranscriptJobExecutionConflictError)) throw caught;
  }
}

export function markTranscriptJobManualNeeded(
  jobId: number,
  attemptId: number | null,
  error: { code: string; message: string; provider?: string | null },
): void {
  const now = Date.now();
  const db = getDb();
  const tx = db.transaction(() => {
    assertItemBodyProcessingAllowed("", db);
    const job = getTranscriptJobByIdFromDb(db, jobId);
    if (!job) return;
    assertItemBodyProcessingAllowed(job.item_id, db);
    if (readySchemaHasActiveTranscriptSource(db, job.item_id)) return;
    const stableError = normalizeTranscriptPersistentError(
      error.code,
      "manual",
    );
    db.prepare(
      `UPDATE transcript_jobs
          SET state = 'manual_needed',
              claimed_at = NULL,
              next_run_at = NULL,
              completed_at = ?,
              last_attempt_id = COALESCE(?, last_attempt_id),
              last_provider = ?,
              last_error_code = ?,
              last_error_message = ?,
              updated_at = ?
        WHERE id = ?
          AND state = 'running'`,
    ).run(
      now,
      attemptId,
      normalizeTranscriptPersistentProvider(error.provider),
      stableError.code,
      stableError.message,
      now,
      jobId,
    );
    assertItemBodyProcessingAllowed(job.item_id, db);
    if (readySchemaHasActiveTranscriptSource(db, job.item_id)) {
      throw new TranscriptJobExecutionConflictError();
    }
  });
  try {
    tx.immediate();
  } catch (caught) {
    if (!(caught instanceof TranscriptJobExecutionConflictError)) throw caught;
  }
}

export function retryTranscriptJobNowWithOutcome(
  itemId: string,
): TranscriptJobOperationResult<TranscriptJobRow> {
  const now = Date.now();
  const db = getDb();
  const initialBlock = blockedForItem(itemId, db);
  if (initialBlock) return blockedResult(initialBlock);
  const tx = db.transaction(
    (): TranscriptJobOperationResult<TranscriptJobRow> => {
      assertItemBodyProcessingAllowed(itemId, db);
      if (readySchemaHasActiveTranscriptSource(db, itemId)) {
        return {
          kind: "unchanged",
          reason: "active_transcript_source",
          value: null,
        };
      }
      const existing = getTranscriptJobForItemFromDb(db, itemId);
      if (!existing) {
        return { kind: "unchanged", reason: "job_not_found", value: null };
      }
      const retryWindow = transcriptJobRetryWindow(db, existing);
      db.prepare(
        `UPDATE transcript_jobs
          SET state = 'pending',
              attempts = ?,
              max_attempts = ?,
              next_run_at = ?,
              claimed_at = NULL,
              completed_at = NULL,
              last_error_code = NULL,
              last_error_message = NULL,
              updated_at = ?
        WHERE item_id = ?`,
      ).run(retryWindow.attempts, retryWindow.maxAttempts, now, now, itemId);
      assertItemBodyProcessingAllowed(itemId, db);
      const updated = getTranscriptJobForItemFromDb(db, itemId);
      if (!updated) {
        return { kind: "unchanged", reason: "job_not_found", value: null };
      }
      return { kind: "applied", value: updated };
    },
  );

  try {
    return tx();
  } catch (error) {
    if (error instanceof ItemBodyProcessingBlockedError) {
      return blockedErrorResult(error);
    }
    throw error;
  }
}

export function retryTranscriptJobNow(itemId: string): TranscriptJobRow | null {
  const result = retryTranscriptJobNowWithOutcome(itemId);
  return result.kind === "blocked" ? null : result.value;
}

export function ignoreTranscriptJobWithOutcome(
  itemId: string,
): TranscriptJobOperationResult<TranscriptJobRow> {
  const now = Date.now();
  const db = getDb();
  const initialBlock = blockedForItem(itemId, db);
  if (initialBlock) return blockedResult(initialBlock);
  const tx = db.transaction(
    (): TranscriptJobOperationResult<TranscriptJobRow> => {
      assertItemBodyProcessingAllowed(itemId, db);
      const existing = getTranscriptJobForItemFromDb(db, itemId);
      if (!existing) {
        return { kind: "unchanged", reason: "job_not_found", value: null };
      }
      const info = db
        .prepare(
          `UPDATE transcript_jobs
            SET state = 'ignored',
                claimed_at = NULL,
                next_run_at = NULL,
                completed_at = ?,
                updated_at = ?
          WHERE item_id = ?`,
        )
        .run(now, now, itemId);
      assertItemBodyProcessingAllowed(itemId, db);
      const updated = getTranscriptJobForItemFromDb(db, itemId);
      if (info.changes === 0 || !updated) {
        return {
          kind: "unchanged",
          reason: "no_rows_changed",
          value: updated,
        };
      }
      return { kind: "applied", value: updated };
    },
  );

  try {
    return tx();
  } catch (error) {
    if (error instanceof ItemBodyProcessingBlockedError) {
      return blockedErrorResult(error);
    }
    throw error;
  }
}

export function ignoreTranscriptJob(itemId: string): TranscriptJobRow | null {
  const result = ignoreTranscriptJobWithOutcome(itemId);
  return result.kind === "blocked" ? null : result.value;
}
