import { createHash } from "node:crypto";
import { getDb, type ItemRow } from "./client";
import { getItem } from "./items";
import { extractVideoId } from "@/lib/capture/youtube-url";
import {
  insertCapturePolicyDecision,
  insertTranscriptSource,
  supersedeTranscriptSourcesForItem,
  insertTranscriptSegments,
  type InsertTranscriptSegmentInput,
} from "./transcripts";

export type TranscriptJobState =
  | "pending"
  | "running"
  | "retryable_error"
  | "manual_needed"
  | "ignored"
  | "done";

export type TranscriptAttemptState =
  | "success"
  | "retryable_error"
  | "terminal_error"
  | "skipped";

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
  preferred_model?: string;
  worker_metadata?: string | null;
  worker_name?: string | null;
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

export interface WorkerPollJobResult {
  id: number;
  item_id: string;
  video_id: string | null;
  source_url: string | null;
  title: string;
  priority: number;
  preferred_model: string;
  created_at: number;
}

export interface WorkerCompleteInput {
  jobId: number;
  itemId: string;
  fullText: string;
  language?: string | null;
  languageProbability?: number | null;
  segments: Array<{
    start?: number | null;
    end?: number | null;
    duration?: number | null;
    text: string;
    confidence?: number | null;
  }>;
  workerMetadata?: Record<string, unknown>;
  workerName?: string;
}

export interface WorkerFailInput {
  jobId: number;
  itemId: string;
  errorCode: string;
  errorMessage: string;
  retryable?: boolean;
  workerName?: string;
}

export interface WorkerPresenceRow {
  id: string;
  hostname: string | null;
  system_info: string | null;
  last_heartbeat_at: number;
  created_at: number;
}

export interface WorkerPresenceStatus {
  worker_id: string;
  is_online: boolean;
  last_heartbeat_at: number | null;
  hostname: string | null;
  system_info: string | null;
  pending_jobs_count: number;
  running_jobs_count: number;
}

const RECOVERABLE_YOUTUBE_WARNINGS = new Set<string>([
  "no_transcript",
  "youtube_transcript_fetch_metadata_only",
  "youtube_antibot_metadata_only",
  "recall_api_chunks_unverified",
  "recall_chunks_unverified",
  "recall_unverified",
  "timedtext_unavailable",
  "transcript_unavailable",
  "degraded",
]);

export function isYoutubeTranscriptRecoveryCandidate(
  item: Pick<ItemRow, "source_type" | "source_platform" | "capture_quality" | "extraction_warning">,
): boolean {
  const isYoutube =
    item.source_platform === "youtube" ||
    item.source_platform === "youtube_short" ||
    item.source_type === "youtube";
  if (!isYoutube) return false;
  return (
    item.capture_quality === "metadata_only" ||
    item.capture_quality === "paywall_preview" ||
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

export function enqueueTranscriptJobForItem(
  item: ItemRow,
  options: {
    priority?: number;
    reset?: boolean;
    nextRunAt?: number;
    preferredModel?: string;
    force?: boolean;
  } = {},
): TranscriptJobRow | null {
  const isYoutube =
    item.source_platform === "youtube" ||
    item.source_platform === "youtube_short" ||
    item.source_type === "youtube" ||
    Boolean(item.source_url && extractVideoId(item.source_url));

  if (!isYoutube) return null;

  if (!options.force && !isYoutubeTranscriptRecoveryCandidate(item)) return null;

  const now = Date.now();
  const priority = options.priority ?? 10;
  const nextRunAt = options.nextRunAt ?? now;
  const videoId = youtubeVideoIdFromItem(item);
  const platform = item.source_platform ?? item.source_type;
  const preferredModel = options.preferredModel ?? "whisper-large-v3-turbo";
  const db = getDb();

  if (options.reset) {
    db.prepare(
      `INSERT INTO transcript_jobs (
         item_id, source_platform, video_id, state, priority, attempts,
         preferred_model, next_run_at, claimed_at, completed_at, last_attempt_id,
         last_provider, last_error_code, last_error_message, updated_at
       )
       VALUES (?, ?, ?, 'pending', ?, 0, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?)
       ON CONFLICT(item_id) DO UPDATE SET
         source_platform = excluded.source_platform,
         video_id = COALESCE(excluded.video_id, transcript_jobs.video_id),
         state = 'pending',
         priority = MAX(transcript_jobs.priority, excluded.priority),
         preferred_model = excluded.preferred_model,
         next_run_at = excluded.next_run_at,
         claimed_at = NULL,
         completed_at = NULL,
         last_error_code = NULL,
         last_error_message = NULL,
         updated_at = excluded.updated_at`,
    ).run(item.id, platform, videoId, priority, preferredModel, nextRunAt, now);
    const job = getTranscriptJobForItem(item.id);
    if (job) normalizeTranscriptJobRetryWindow(job);
  } else {
    db.prepare(
      `INSERT INTO transcript_jobs (
         item_id, source_platform, video_id, state, priority, preferred_model, next_run_at, updated_at
       )
       VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET
         source_platform = excluded.source_platform,
         video_id = COALESCE(transcript_jobs.video_id, excluded.video_id),
         priority = MAX(transcript_jobs.priority, excluded.priority),
         preferred_model = COALESCE(excluded.preferred_model, transcript_jobs.preferred_model),
         next_run_at = CASE
           WHEN transcript_jobs.state IN ('pending', 'retryable_error') THEN
             COALESCE(transcript_jobs.next_run_at, excluded.next_run_at)
           ELSE transcript_jobs.next_run_at
         END,
         updated_at = excluded.updated_at`,
    ).run(item.id, platform, videoId, priority, preferredModel, nextRunAt, now);
  }

  return getTranscriptJobForItem(item.id);
}

export function enqueueTranscriptJobForExistingYoutubeItem(
  itemId: string,
  _reason: string,
  options: { priority?: number; preferredModel?: string; force?: boolean } = {},
): TranscriptJobRow | null {
  void _reason;
  const item = getItem(itemId);
  if (!item) return null;
  return enqueueTranscriptJobForItem(item, {
    reset: true,
    force: options.force ?? true,
    priority: options.priority ?? 20,
    preferredModel: options.preferredModel,
  });
}

export function backfillTranscriptJobsForExistingYoutubeItems(): number {
  const rows = getDb()
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
  for (const item of rows) {
    if (enqueueTranscriptJobForItem(item)) count += 1;
  }
  return count;
}

export function getTranscriptJobForItem(itemId: string): TranscriptJobRow | null {
  const row = getDb()
    .prepare("SELECT * FROM transcript_jobs WHERE item_id = ?")
    .get(itemId) as TranscriptJobRow | undefined;
  return row ?? null;
}

export function listTranscriptAttemptsForItem(itemId: string): TranscriptAttemptRow[] {
  return getDb()
    .prepare(
      `SELECT *
         FROM transcript_attempts
        WHERE item_id = ?
        ORDER BY created_at DESC, id DESC`,
    )
    .all(itemId) as TranscriptAttemptRow[];
}

function getMaxRecordedAttemptNumber(jobId: number): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(MAX(attempt_number), 0) AS max_attempt_number
         FROM transcript_attempts
        WHERE job_id = ?`,
    )
    .get(jobId) as { max_attempt_number: number } | undefined;
  return row?.max_attempt_number ?? 0;
}

function transcriptJobRetryWindow(job: Pick<TranscriptJobRow, "id" | "attempts" | "max_attempts">): {
  attempts: number;
  maxAttempts: number;
} {
  const attempts = Math.max(job.attempts, getMaxRecordedAttemptNumber(job.id));
  return {
    attempts,
    maxAttempts: attempts >= job.max_attempts ? attempts + 1 : job.max_attempts,
  };
}

function normalizeTranscriptJobRetryWindow(job: Pick<TranscriptJobRow, "id" | "attempts" | "max_attempts">): void {
  const now = Date.now();
  const retryWindow = transcriptJobRetryWindow(job);
  getDb()
    .prepare(
      `UPDATE transcript_jobs
          SET attempts = ?,
              max_attempts = ?,
              updated_at = ?
        WHERE id = ?`,
    )
    .run(retryWindow.attempts, retryWindow.maxAttempts, now, job.id);
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

export function claimNextTranscriptJob(now = Date.now()): TranscriptJobRow | null {
  const db = getDb();
  const tx = db.transaction((): TranscriptJobRow | null => {
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
    if (!row) return null;

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
    if (info.changes === 0) return null;
    return { ...row, state: "running", attempts: row.attempts + 1, claimed_at: updatedAt, updated_at: updatedAt };
  });
  return tx();
}

/**
 * 20-minute lease recovery: Stalled running claims get released back to pending/retryable.
 */
export function sweepStaleTranscriptClaims(
  staleBefore: number,
): number {
  const now = Date.now();
  const info = getDb()
    .prepare(
      `UPDATE transcript_jobs
          SET state = 'pending',
              claimed_at = NULL,
              worker_name = NULL,
              next_run_at = ?,
              last_error_code = 'stale_claim_recovery',
              last_error_message = 'Worker claim lease expired (20m timeout); returned to pending queue.',
              updated_at = ?
        WHERE state = 'running'
          AND claimed_at < ?`,
    )
    .run(now, now, staleBefore);
  return info.changes;
}

/**
 * Atomically polls and claims the next transcript job for an external worker (Mac M5 Pro).
 * Sweeps stale claims (>20 mins old) before claiming.
 */
export function pollNextTranscriptJobForWorker(
  workerName: string,
  now = Date.now(),
): WorkerPollJobResult | null {
  const db = getDb();
  // 20-minute lease recovery
  const staleThreshold = now - 20 * 60 * 1000;
  sweepStaleTranscriptClaims(staleThreshold);

  const tx = db.transaction((): WorkerPollJobResult | null => {
    const row = db
      .prepare(
        `SELECT tj.*,
                i.title AS item_title,
                i.source_url AS item_source_url
           FROM transcript_jobs tj
           JOIN items i ON i.id = tj.item_id
          WHERE tj.state IN ('pending', 'retryable_error')
            AND tj.attempts < tj.max_attempts
            AND (tj.next_run_at IS NULL OR tj.next_run_at <= ?)
          ORDER BY tj.priority DESC, COALESCE(tj.next_run_at, tj.created_at) ASC, tj.created_at ASC
          LIMIT 1`,
      )
      .get(now) as (TranscriptJobRow & { item_title: string; item_source_url: string | null }) | undefined;

    if (!row) return null;

    const claimedAt = Date.now();
    const info = db
      .prepare(
        `UPDATE transcript_jobs
            SET state = 'running',
                worker_name = ?,
                attempts = attempts + 1,
                claimed_at = ?,
                updated_at = ?
          WHERE id = ?
            AND state IN ('pending', 'retryable_error')`,
      )
      .run(workerName, claimedAt, claimedAt, row.id);

    if (info.changes === 0) return null;

    return {
      id: row.id,
      item_id: row.item_id,
      video_id: row.video_id,
      source_url: row.item_source_url,
      title: row.item_title,
      priority: row.priority,
      preferred_model: row.preferred_model ?? "whisper-large-v3-turbo",
      created_at: row.created_at,
    };
  });

  return tx();
}

/**
 * Ingests a completed transcript payload from the Mac worker.
 * Performs dual-representation storage:
 *   - Continuous plain text into items.body
 *   - Normalized millisecond segments into transcript_segments
 *   - Updates items capture_quality to 'high' and enrichment_state to 'done'
 */
export function completeTranscriptJobWithWorker(
  input: WorkerCompleteInput,
): { ok: boolean; transcriptSourceId: string } {
  const db = getDb();
  const now = Date.now();
  const item = getItem(input.itemId);
  if (!item) {
    throw new Error(`Item ${input.itemId} not found for transcript completion`);
  }

  const tx = db.transaction(() => {
    const job = getTranscriptJobForItem(input.itemId);
    const attemptNumber = job ? Math.max(job.attempts, getMaxRecordedAttemptNumber(job.id)) + 1 : 1;

    // 1. Record capture policy decision
    const policy = insertCapturePolicyDecision({
      item_id: input.itemId,
      source_url: item.source_url ?? `https://youtube.com/watch?v=${job?.video_id ?? ""}`,
      platform: "youtube",
      environment: "production",
      rights_basis: "authorized_youtube_video",
      method: "owned_media_stt",
      retention_class: "full_text_allowed",
      production_allowed: true,
      created_at: now,
    });

    // 2. Supersede old sources & insert active transcript source
    supersedeTranscriptSourcesForItem(input.itemId);
    const textHash = createHash("sha256").update(input.fullText).digest("hex");
    const source = insertTranscriptSource({
      item_id: input.itemId,
      policy_decision_id: policy.id,
      source_kind: "owned_media_stt",
      language_code: input.language ?? "en",
      caption_source_class: "asr",
      timestamp_mode: "timestamped",
      provenance_json: JSON.stringify(input.workerMetadata ?? {}),
      retention_class: "full_text_allowed",
      text_sha256: textHash,
      segment_count: input.segments.length,
      status: "active",
      created_at: now,
    });

    // 3. Insert segments into normalized transcript_segments
    if (input.segments.length > 0) {
      const segmentInputs: InsertTranscriptSegmentInput[] = input.segments.map((seg, idx) => {
        const startMs = seg.start != null ? Math.round(seg.start * 1000) : null;
        const endMs = seg.end != null ? Math.round(seg.end * 1000) : null;
        const durationMs =
          seg.duration != null
            ? Math.round(seg.duration * 1000)
            : startMs != null && endMs != null
            ? Math.max(0, endMs - startMs)
            : null;
        return {
          transcript_source_id: source.id,
          item_id: input.itemId,
          idx,
          start_ms: startMs,
          duration_ms: durationMs,
          end_ms: endMs,
          text: seg.text,
          text_sha256: createHash("sha256").update(seg.text).digest("hex"),
          confidence: seg.confidence ?? null,
          created_at: now,
        };
      });
      insertTranscriptSegments(segmentInputs);
    }

    // 4. Record successful attempt
    if (job) {
      const durationSeconds = (input.workerMetadata?.inference_latency_seconds as number) ?? 0;
      const durationMs = Math.round(durationSeconds * 1000);
      recordTranscriptAttempt({
        jobId: job.id,
        itemId: input.itemId,
        attemptNumber,
        provider: "mac_worker_mlx",
        state: "success",
        retryable: false,
        startedAt: job.claimed_at ?? now,
        finishedAt: now,
        durationMs,
        transcriptLanguage: input.language ?? "en",
        transcriptIsGenerated: true,
        transcriptChars: input.fullText.length,
      });

      // 5. Mark job done
      db.prepare(
        `UPDATE transcript_jobs
            SET state = 'done',
                completed_at = ?,
                last_provider = 'mac_worker_mlx',
                worker_name = COALESCE(?, worker_name),
                worker_metadata = ?,
                last_error_code = NULL,
                last_error_message = NULL,
                updated_at = ?
          WHERE id = ?`,
      ).run(
        now,
        input.workerName ?? null,
        JSON.stringify(input.workerMetadata ?? {}),
        now,
        job.id,
      );
    }

    // 6. Dual-representation: Update item body & high quality flag
    db.prepare(
      `UPDATE items
          SET body = ?,
              capture_quality = 'high',
              extraction_warning = NULL,
              enriched_at = ?,
              enrichment_state = 'done'
        WHERE id = ?`,
    ).run(input.fullText, now, input.itemId);

    return { ok: true, transcriptSourceId: source.id };
  });

  return tx();
}

/**
 * Handles a worker failure report and schedules retry or manual escalation.
 */
export function failTranscriptJobWithWorker(
  input: WorkerFailInput,
): { ok: boolean } {
  const db = getDb();
  const now = Date.now();
  const job = getTranscriptJobForItem(input.itemId);

  const tx = db.transaction(() => {
    if (job) {
      const attemptNumber = Math.max(job.attempts, getMaxRecordedAttemptNumber(job.id)) + 1;
      const isRetryable = input.retryable ?? true;
      const willRetry = isRetryable && job.attempts < job.max_attempts;

      recordTranscriptAttempt({
        jobId: job.id,
        itemId: input.itemId,
        attemptNumber,
        provider: "mac_worker_mlx",
        state: isRetryable ? "retryable_error" : "terminal_error",
        retryable: isRetryable,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
        startedAt: job.claimed_at ?? now,
        finishedAt: now,
      });

      const nextRunAt = willRetry ? now + 60 * 1000 : null;
      const newState: TranscriptJobState = willRetry ? "retryable_error" : "manual_needed";

      db.prepare(
        `UPDATE transcript_jobs
            SET state = ?,
                claimed_at = NULL,
                worker_name = COALESCE(?, worker_name),
                next_run_at = ?,
                completed_at = CASE WHEN ? THEN NULL ELSE ? END,
                last_provider = 'mac_worker_mlx',
                last_error_code = ?,
                last_error_message = ?,
                updated_at = ?
          WHERE id = ?`,
      ).run(
        newState,
        input.workerName ?? null,
        nextRunAt,
        willRetry ? 1 : 0,
        now,
        input.errorCode,
        input.errorMessage,
        now,
        job.id,
      );
    }
    return { ok: true };
  });

  return tx();
}

/**
 * Upserts worker heartbeat and system metadata.
 */
export function recordWorkerHeartbeat(input: {
  workerId: string;
  hostname?: string;
  systemInfo?: string;
  now?: number;
}): void {
  const now = input.now ?? Date.now();
  getDb()
    .prepare(
      `INSERT INTO worker_presence (id, hostname, system_info, last_heartbeat_at, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         hostname = COALESCE(excluded.hostname, worker_presence.hostname),
         system_info = COALESCE(excluded.system_info, worker_presence.system_info),
         last_heartbeat_at = excluded.last_heartbeat_at`,
    )
    .run(input.workerId, input.hostname ?? null, input.systemInfo ?? null, now, now);
}

/**
 * Retrieves the liveness presence and queue status of workers.
 */
export function getWorkerPresenceStatus(
  workerId = "mac-m5-pro",
  now = Date.now(),
): WorkerPresenceStatus {
  const db = getDb();
  const presence = db
    .prepare("SELECT * FROM worker_presence WHERE id = ?")
    .get(workerId) as WorkerPresenceRow | undefined;

  const pendingCount = (
    db.prepare("SELECT COUNT(*) AS count FROM transcript_jobs WHERE state IN ('pending', 'retryable_error')").get() as {
      count: number;
    }
  ).count;

  const runningCount = (
    db.prepare("SELECT COUNT(*) AS count FROM transcript_jobs WHERE state = 'running'").get() as {
      count: number;
    }
  ).count;

  const lastHeartbeat = presence?.last_heartbeat_at ?? null;
  const isOnline = lastHeartbeat !== null && now - lastHeartbeat < 120_000; // 2 minutes

  return {
    worker_id: workerId,
    is_online: isOnline,
    last_heartbeat_at: lastHeartbeat,
    hostname: presence?.hostname ?? null,
    system_info: presence?.system_info ?? null,
    pending_jobs_count: pendingCount,
    running_jobs_count: runningCount,
  };
}

export function recordTranscriptAttempt(input: {
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
  durationMs?: number | null;
  transcriptLanguage?: string | null;
  transcriptIsGenerated?: boolean | null;
  transcriptIsTranslated?: boolean | null;
  transcriptChars?: number | null;
  artifactIdsJson?: string | null;
}): number {
  const finishedAt = input.finishedAt ?? Date.now();
  const info = getDb()
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
      input.durationMs ?? Math.max(0, finishedAt - input.startedAt),
      input.transcriptLanguage ?? null,
      input.transcriptIsGenerated === null || input.transcriptIsGenerated === undefined
        ? null
        : input.transcriptIsGenerated ? 1 : 0,
      input.transcriptIsTranslated === null || input.transcriptIsTranslated === undefined
        ? null
        : input.transcriptIsTranslated ? 1 : 0,
      input.transcriptChars ?? null,
      input.artifactIdsJson ?? null,
    );
  return Number(info.lastInsertRowid);
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
  getDb()
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
              last_attempt_id = COALESCE(?, last_attempt_id),
              last_provider = ?,
              last_error_code = ?,
              last_error_message = ?,
              updated_at = ?
        WHERE id = ?`,
    )
    .run(
      preserveRetryWindow,
      preserveRetryWindow,
      preserveRetryWindow,
      nextRunAt,
      preserveRetryWindow,
      now,
      attemptId,
      error.provider ?? null,
      error.code,
      error.message,
      now,
      jobId,
    );
}

export function markTranscriptJobManualNeeded(
  jobId: number,
  attemptId: number | null,
  error: { code: string; message: string; provider?: string | null },
): void {
  const now = Date.now();
  getDb()
    .prepare(
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
        WHERE id = ?`,
    )
    .run(now, attemptId, error.provider ?? null, error.code, error.message, now, jobId);
}

export function markTranscriptJobDone(jobId: number, attemptId?: number | null): void {
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE transcript_jobs
          SET state = 'done',
              claimed_at = NULL,
              completed_at = ?,
              next_run_at = NULL,
              last_attempt_id = COALESCE(?, last_attempt_id),
              last_error_code = NULL,
              last_error_message = NULL,
              updated_at = ?
        WHERE id = ?`,
    )
    .run(now, attemptId ?? null, now, jobId);
}

export function markTranscriptJobResolvedForItem(
  itemId: string,
  provider = "manual_text",
): void {
  const now = Date.now();
  getDb()
    .prepare(
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
    )
    .run(now, provider, now, itemId);
}

export function recordManualTranscriptResolutionForItem(input: {
  itemId: string;
  provider?: string;
  transcriptChars?: number | null;
}): TranscriptJobRow | null {
  const job = getTranscriptJobForItem(input.itemId);
  if (!job) return null;
  if (job.state === "done") return job;

  const provider = input.provider ?? "manual_user_text";
  const now = Date.now();
  const attemptNumber = Math.max(job.attempts, getMaxRecordedAttemptNumber(job.id)) + 1;
  const db = getDb();
  const tx = db.transaction(() => {
    const attemptId = recordTranscriptAttempt({
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
  });
  tx();
  return getTranscriptJobForItem(input.itemId);
}

export function retryTranscriptJobNow(itemId: string): TranscriptJobRow | null {
  const now = Date.now();
  const db = getDb();
  const existing = getTranscriptJobForItem(itemId);
  if (!existing) return null;
  const retryWindow = transcriptJobRetryWindow(existing);
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
  return getTranscriptJobForItem(itemId);
}

export function ignoreTranscriptJob(itemId: string): TranscriptJobRow | null {
  const now = Date.now();
  getDb()
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
  return getTranscriptJobForItem(itemId);
}

export function setTranscriptJobPriority(itemId: string, priority: number): TranscriptJobRow | null {
  const now = Date.now();
  getDb().prepare(`
    UPDATE transcript_jobs
       SET priority = ?,
           updated_at = ?
     WHERE item_id = ?
  `).run(priority, now, itemId);
  return getTranscriptJobForItem(itemId);
}

export interface AsrPipelineDashboardData {
  worker: WorkerPresenceStatus & {
    active_model: string;
    throughput_label: string;
  };
  in_progress: {
    job_id: number;
    item_id: string;
    title: string;
    source_url: string | null;
    video_id: string | null;
    priority: number;
    preferred_model: string;
    claimed_at: number;
    elapsed_seconds: number;
    attempts: number;
  } | null;
  backlog: Array<{
    job_id: number;
    item_id: string;
    title: string;
    source_url: string | null;
    video_id: string | null;
    priority: number;
    state: "pending" | "retryable_error" | "manual_needed";
    created_at: number;
    next_run_at: number | null;
    attempts: number;
    max_attempts: number;
    last_error_code: string | null;
    last_error_message: string | null;
  }>;
  completed_history: Array<{
    job_id: number;
    item_id: string;
    title: string;
    source_url: string | null;
    video_id: string | null;
    completed_at: number;
    last_provider: string | null;
    worker_name: string | null;
    preferred_model: string | null;
    segment_count: number;
    word_count: number;
    duration_seconds: number;
  }>;
  stats: {
    total_queued: number;
    total_completed_today: number;
    total_completed_all_time: number;
  };
}

export function getAsrPipelineDashboardData(
  workerId = "mac-m5-pro",
  now = Date.now(),
): AsrPipelineDashboardData {
  const db = getDb();
  const workerStatus = getWorkerPresenceStatus(workerId, now);

  // 1. In progress job
  const inProgressRow = db.prepare(`
    SELECT tj.id AS job_id,
           tj.item_id,
           i.title,
           i.source_url,
           tj.video_id,
           tj.priority,
           tj.preferred_model,
           tj.claimed_at,
           tj.attempts
      FROM transcript_jobs tj
      JOIN items i ON i.id = tj.item_id
     WHERE tj.state = 'running'
     ORDER BY tj.claimed_at DESC
     LIMIT 1
  `).get() as {
    job_id: number;
    item_id: string;
    title: string;
    source_url: string | null;
    video_id: string | null;
    priority: number;
    preferred_model: string;
    claimed_at: number | null;
    attempts: number;
  } | undefined;

  const in_progress = inProgressRow && inProgressRow.claimed_at ? {
    job_id: inProgressRow.job_id,
    item_id: inProgressRow.item_id,
    title: inProgressRow.title,
    source_url: inProgressRow.source_url,
    video_id: inProgressRow.video_id,
    priority: inProgressRow.priority,
    preferred_model: inProgressRow.preferred_model,
    claimed_at: inProgressRow.claimed_at,
    elapsed_seconds: Math.max(0, Math.floor((now - inProgressRow.claimed_at) / 1000)),
    attempts: inProgressRow.attempts,
  } : null;

  // 2. Backlog
  const backlog = db.prepare(`
    SELECT tj.id AS job_id,
           tj.item_id,
           i.title,
           i.source_url,
           tj.video_id,
           tj.priority,
           tj.state,
           tj.created_at,
           tj.next_run_at,
           tj.attempts,
           tj.max_attempts,
           tj.last_error_code,
           tj.last_error_message
      FROM transcript_jobs tj
      JOIN items i ON i.id = tj.item_id
     WHERE tj.state IN ('pending', 'retryable_error', 'manual_needed')
     ORDER BY tj.priority DESC, COALESCE(tj.next_run_at, tj.created_at) ASC, tj.created_at ASC
     LIMIT 100
  `).all() as AsrPipelineDashboardData["backlog"];

  // 3. Completed history
  const completedRows = db.prepare(`
    SELECT tj.id AS job_id,
           tj.item_id,
           i.title,
           i.source_url,
           tj.video_id,
           COALESCE(tj.completed_at, tj.updated_at) AS completed_at,
           tj.last_provider,
           tj.worker_name,
           tj.preferred_model,
           COALESCE(i.duration_seconds, 0) AS duration_seconds,
           (SELECT COUNT(*) FROM transcript_segments ts WHERE ts.item_id = tj.item_id) AS segment_count,
           COALESCE((SELECT SUM(LENGTH(ts.text) - LENGTH(REPLACE(ts.text, ' ', '')) + 1) FROM transcript_segments ts WHERE ts.item_id = tj.item_id), 0) AS word_count
      FROM transcript_jobs tj
      JOIN items i ON i.id = tj.item_id
     WHERE tj.state = 'done'
     ORDER BY COALESCE(tj.completed_at, tj.updated_at) DESC
     LIMIT 50
  `).all() as AsrPipelineDashboardData["completed_history"];

  // 4. Summary stats
  const statsRow = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM transcript_jobs WHERE state IN ('pending', 'retryable_error', 'manual_needed')) AS total_queued,
      (SELECT COUNT(*) FROM transcript_jobs WHERE state = 'done' AND completed_at >= unixepoch('start of day') * 1000) AS total_completed_today,
      (SELECT COUNT(*) FROM transcript_jobs WHERE state = 'done') AS total_completed_all_time
  `).get() as {
    total_queued: number;
    total_completed_today: number;
    total_completed_all_time: number;
  };

  return {
    worker: {
      ...workerStatus,
      active_model: "mlx-community/whisper-large-v3-turbo",
      throughput_label: "16.8x Real-Time (M5 Pro ANE)",
    },
    in_progress,
    backlog,
    completed_history: completedRows,
    stats: {
      total_queued: statsRow?.total_queued ?? 0,
      total_completed_today: statsRow?.total_completed_today ?? 0,
      total_completed_all_time: statsRow?.total_completed_all_time ?? 0,
    },
  };
}

