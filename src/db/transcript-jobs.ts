import { getDb, type ItemRow } from "./client";
import { getItem } from "./items";
import { extractVideoId } from "@/lib/capture/youtube-url";

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

const RECOVERABLE_YOUTUBE_WARNINGS = new Set<string>([
  "no_transcript",
  "youtube_transcript_fetch_metadata_only",
  "youtube_antibot_metadata_only",
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
  } = {},
): TranscriptJobRow | null {
  if (!isYoutubeTranscriptRecoveryCandidate(item)) return null;

  const now = Date.now();
  const priority = options.priority ?? 10;
  const nextRunAt = options.nextRunAt ?? now;
  const videoId = youtubeVideoIdFromItem(item);
  const platform = item.source_platform ?? item.source_type;
  const db = getDb();

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
    const job = getTranscriptJobForItem(item.id);
    if (job) normalizeTranscriptJobRetryWindow(job);
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

  return getTranscriptJobForItem(item.id);
}

export function enqueueTranscriptJobForExistingYoutubeItem(
  itemId: string,
  _reason: string,
): TranscriptJobRow | null {
  void _reason;
  const item = getItem(itemId);
  if (!item) return null;
  return enqueueTranscriptJobForItem(item, { reset: true, priority: 20 });
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

export function sweepStaleTranscriptClaims(
  staleBefore: number,
): number {
  const now = Date.now();
  const info = getDb()
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
  return info.changes;
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
      Math.max(0, finishedAt - input.startedAt),
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
