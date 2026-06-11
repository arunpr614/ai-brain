import { getItem } from "@/db/items";
import { upgradeItemCaptureContent } from "@/db/item-upgrades";
import {
  backfillTranscriptJobsForExistingYoutubeItems,
  claimNextTranscriptJob,
  markTranscriptJobDone,
  markTranscriptJobManualNeeded,
  markTranscriptJobRetryable,
  recordTranscriptAttempt,
  sweepStaleTranscriptClaims,
  type TranscriptJobRow,
} from "@/db/transcript-jobs";
import { recoverYoutubeTranscriptForItem } from "@/lib/capture/youtube-transcript/recovery";

const POLL_INTERVAL_MS = 2_000;
const IDLE_INTERVAL_MS = 15_000;
const STALE_CLAIM_MS = 10 * 60_000;
const BASE_RETRY_BACKOFF_MS = 30 * 60_000;

declare global {
  var __brainTranscriptRecoveryWorker:
    | { running: boolean; stopRequested: boolean }
    | undefined;
}

function workerState() {
  if (!globalThis.__brainTranscriptRecoveryWorker) {
    globalThis.__brainTranscriptRecoveryWorker = {
      running: false,
      stopRequested: false,
    };
  }
  return globalThis.__brainTranscriptRecoveryWorker;
}

export function startTranscriptRecoveryWorker(): void {
  if (!transcriptRecoveryEnabled()) {
    console.log("[transcript] recovery worker disabled");
    return;
  }

  const state = workerState();
  if (state.running) return;
  const backfilled = backfillTranscriptJobsForExistingYoutubeItems();
  state.running = true;
  state.stopRequested = false;
  console.log(`[transcript] worker starting; checked ${backfilled} weak YouTube capture(s)`);
  startLoop();
}

export function stopTranscriptRecoveryWorker(): void {
  workerState().stopRequested = true;
}

export function transcriptRecoveryEnabled(): boolean {
  const recovery = process.env.YOUTUBE_TRANSCRIPT_RECOVERY_ENABLED;
  const worker = process.env.YOUTUBE_TRANSCRIPT_WORKER_ENABLED;
  return recovery !== "0" && recovery !== "false" && worker !== "0" && worker !== "false";
}

export function nextTranscriptRetryAt(attempt: number, now = Date.now()): number {
  const multiplier = Math.max(1, Math.min(8, 2 ** Math.max(0, attempt - 1)));
  return now + BASE_RETRY_BACKOFF_MS * multiplier;
}

function startLoop(): void {
  void loop().catch((err) => {
    console.error(`[transcript] worker crashed: ${safeErrorMessage(err)}`);
  });
}

async function loop(): Promise<void> {
  const state = workerState();
  let lastSweepAt = 0;

  try {
    while (!state.stopRequested) {
      const now = Date.now();
      if (now - lastSweepAt >= STALE_CLAIM_MS) {
        const swept = sweepStaleTranscriptClaims(now - STALE_CLAIM_MS);
        if (swept > 0) {
          console.log(`[transcript] resurrected ${swept} stale claim(s)`);
        }
        lastSweepAt = now;
      }

      const job = claimNextTranscriptJob(now);
      if (!job) {
        await sleep(IDLE_INTERVAL_MS);
        continue;
      }

      await runOneSafely(job);
      await sleep(POLL_INTERVAL_MS);
    }
  } finally {
    state.running = false;
    console.log("[transcript] worker stopped");
  }
}

async function runOne(job: TranscriptJobRow): Promise<void> {
  console.log(`[transcript] job #${job.id} item=${job.item_id} attempt=${job.attempts}`);
  const item = getItem(job.item_id);
  const startedAt = Date.now();

  if (!item) {
    const attemptId = recordTranscriptAttempt({
      jobId: job.id,
      itemId: job.item_id,
      attemptNumber: job.attempts,
      provider: "youtube_innertube_timedtext",
      state: "terminal_error",
      retryable: false,
      errorCode: "item_missing",
      errorMessage: "The item for this transcript job no longer exists.",
      startedAt,
    });
    markTranscriptJobManualNeeded(job.id, attemptId, {
      provider: "youtube_innertube_timedtext",
      code: "item_missing",
      message: "The item for this transcript job no longer exists.",
    });
    return;
  }

  const result = await recoverYoutubeTranscriptForItem({
    item,
    videoId: job.video_id,
  });

  if (result.state === "success" && result.content) {
    try {
      await upgradeItemCaptureContent({
        itemId: job.item_id,
        content: result.content,
        platform: result.content.source_platform,
      });
      const attemptId = recordTranscriptAttempt({
        jobId: job.id,
        itemId: job.item_id,
        attemptNumber: job.attempts,
        provider: result.provider,
        state: "success",
        retryable: false,
        startedAt,
        transcriptLanguage: result.transcriptLanguage,
        transcriptIsGenerated: result.transcriptIsGenerated,
        transcriptIsTranslated: result.transcriptIsTranslated,
        transcriptChars: result.transcriptChars ?? result.content.body.length,
      });
      markTranscriptJobDone(job.id, attemptId);
      console.log(`[transcript] job #${job.id} DONE`);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const attemptId = recordTranscriptAttempt({
        jobId: job.id,
        itemId: job.item_id,
        attemptNumber: job.attempts,
        provider: result.provider,
        state: "retryable_error",
        retryable: true,
        errorCode: "item_upgrade_failed",
        errorMessage: message,
        startedAt,
      });
      markTranscriptJobRetryable(job.id, attemptId, nextTranscriptRetryAt(job.attempts), {
        provider: result.provider,
        code: "item_upgrade_failed",
        message,
      });
      console.warn(`[transcript] job #${job.id} upgrade failed: ${message}`);
      return;
    }
  }

  const attemptId = recordTranscriptAttempt({
    jobId: job.id,
    itemId: job.item_id,
    attemptNumber: job.attempts,
    provider: result.provider,
    state: result.retryable ? "retryable_error" : "terminal_error",
    retryable: result.retryable,
    errorCode: result.errorCode ?? "transcript_unavailable",
    errorMessage: result.errorMessage ?? "Transcript recovery did not produce a transcript.",
    statusCode: result.statusCode ?? null,
    startedAt,
  });

  if (result.retryable) {
    markTranscriptJobRetryable(job.id, attemptId, nextTranscriptRetryAt(job.attempts), {
      provider: result.provider,
      code: result.errorCode ?? "transcript_retryable_error",
      message: result.errorMessage ?? "Transcript recovery hit a retryable error.",
    });
    console.warn(
      `[transcript] job #${job.id} retryable: ${result.errorCode ?? "unknown"}`,
    );
    return;
  }

  markTranscriptJobManualNeeded(job.id, attemptId, {
    provider: result.provider,
    code: result.errorCode ?? "transcript_manual_needed",
    message: result.errorMessage ?? "Transcript recovery needs manual help.",
  });
  console.warn(`[transcript] job #${job.id} needs manual help`);
}

type TranscriptWorkerDeps = {
  runOne: (job: TranscriptJobRow) => Promise<void>;
  recordTranscriptAttempt: typeof recordTranscriptAttempt;
  markTranscriptJobRetryable: typeof markTranscriptJobRetryable;
  nextTranscriptRetryAt: typeof nextTranscriptRetryAt;
};

const defaultWorkerDeps: TranscriptWorkerDeps = {
  runOne,
  recordTranscriptAttempt,
  markTranscriptJobRetryable,
  nextTranscriptRetryAt,
};

async function runOneSafely(
  job: TranscriptJobRow,
  overrides: Partial<TranscriptWorkerDeps> = {},
): Promise<void> {
  const deps = { ...defaultWorkerDeps, ...overrides };
  const startedAt = Date.now();

  try {
    await deps.runOne(job);
  } catch (err) {
    const message = safeErrorMessage(err);
    let attemptId: number | null = null;

    try {
      attemptId = deps.recordTranscriptAttempt({
        jobId: job.id,
        itemId: job.item_id,
        attemptNumber: job.attempts,
        provider: "transcript_worker",
        state: "retryable_error",
        retryable: true,
        errorCode: "worker_exception",
        errorMessage: message,
        startedAt,
      });
    } catch (attemptErr) {
      console.warn(
        `[transcript] job #${job.id} failed to record worker exception attempt: ${safeErrorMessage(attemptErr)}`,
      );
    }

    try {
      deps.markTranscriptJobRetryable(
        job.id,
        attemptId,
        deps.nextTranscriptRetryAt(job.attempts),
        {
          provider: "transcript_worker",
          code: "worker_exception",
          message,
        },
      );
    } catch (retryErr) {
      console.error(
        `[transcript] job #${job.id} failed to leave running state after worker exception: ${safeErrorMessage(retryErr)}`,
      );
    }

    console.warn(`[transcript] job #${job.id} worker exception: ${message}`);
  }
}

export async function runTranscriptJobSafelyForTests(
  job: TranscriptJobRow,
  overrides: Partial<TranscriptWorkerDeps>,
): Promise<void> {
  await runOneSafely(job, overrides);
}

function safeErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  return String(err);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
