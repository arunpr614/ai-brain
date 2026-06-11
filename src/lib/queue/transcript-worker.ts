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
import {
  recoverYoutubeTranscriptForItem,
  type TranscriptRecoveryResult,
} from "@/lib/capture/youtube-transcript/recovery";
import {
  getYoutubeTimedTextCooldown,
  isYoutubeTimedTextProviderThrottled,
  logTranscriptProviderEvent,
  recordYoutubeTimedTextProviderOutcome,
  YOUTUBE_TIMEDTEXT_COOLDOWN_MIN_MS,
  YOUTUBE_TIMEDTEXT_PROVIDER_KEY,
  YOUTUBE_TIMEDTEXT_PROVIDER_NAME,
} from "@/lib/capture/youtube-transcript/provider-health";

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

export function nextTranscriptRetryAtForResult(
  result: Pick<TranscriptRecoveryResult, "errorCode" | "statusCode">,
  attempt: number,
  now = Date.now(),
  cooldownUntil?: number | null,
): number {
  const genericRetryAt = nextTranscriptRetryAt(attempt, now);
  if (!isYoutubeTimedTextProviderThrottled(result)) return genericRetryAt;
  return Math.max(
    genericRetryAt,
    cooldownUntil ?? now + YOUTUBE_TIMEDTEXT_COOLDOWN_MIN_MS,
  );
}

function startLoop(): void {
  void loop().catch((err) => {
    console.error(`[transcript] worker crashed: ${safeErrorMessage(err)}`);
  });
}

async function loop(): Promise<void> {
  const state = workerState();
  let lastSweepAt = 0;
  let lastCooldownLogAt = 0;

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

      const shouldLogCooldown = now - lastCooldownLogAt >= 5 * 60_000;
      const claim = claimNextTranscriptJobRespectingProviderCooldown(now, {
        logCooldown: shouldLogCooldown,
      });
      if (claim.cooldownActive && shouldLogCooldown) {
        lastCooldownLogAt = now;
      }
      const job = claim.job;
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

type TranscriptClaimDeps = {
  claimNextTranscriptJob: typeof claimNextTranscriptJob;
  getYoutubeTimedTextCooldown: typeof getYoutubeTimedTextCooldown;
  logTranscriptProviderEvent: typeof logTranscriptProviderEvent;
  logCooldown?: boolean;
};

type TranscriptClaimResult = {
  job: TranscriptJobRow | null;
  cooldownActive: boolean;
  cooldownUntil: number | null;
};

const defaultClaimDeps: TranscriptClaimDeps = {
  claimNextTranscriptJob,
  getYoutubeTimedTextCooldown,
  logTranscriptProviderEvent,
  logCooldown: true,
};

function claimNextTranscriptJobRespectingProviderCooldown(
  now = Date.now(),
  overrides: Partial<TranscriptClaimDeps> = {},
): TranscriptClaimResult {
  const deps = { ...defaultClaimDeps, ...overrides };
  const cooldown = deps.getYoutubeTimedTextCooldown(now);
  if (cooldown.active) {
    if (deps.logCooldown) {
      deps.logTranscriptProviderEvent({
        event: "transcript.provider.cooldown_active",
        provider_key: cooldown.providerKey,
        cooldown_until: cooldown.cooldownUntil,
        remaining_ms: cooldown.remainingMs,
        failure_count: cooldown.failureCount,
        last_error_code: cooldown.lastFailureCode,
        status_code: cooldown.lastStatusCode,
      });
      console.log(
        `[transcript] provider cooldown active for ${Math.ceil(cooldown.remainingMs / 60_000)}m`,
      );
    }
    return {
      job: null,
      cooldownActive: true,
      cooldownUntil: cooldown.cooldownUntil,
    };
  }

  return {
    job: deps.claimNextTranscriptJob(now),
    cooldownActive: false,
    cooldownUntil: null,
  };
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
      provider: YOUTUBE_TIMEDTEXT_PROVIDER_NAME,
      state: "terminal_error",
      retryable: false,
      errorCode: "item_missing",
      errorMessage: "The item for this transcript job no longer exists.",
      startedAt,
    });
    markTranscriptJobManualNeeded(job.id, attemptId, {
      provider: YOUTUBE_TIMEDTEXT_PROVIDER_NAME,
      code: "item_missing",
      message: "The item for this transcript job no longer exists.",
    });
    logTranscriptAttemptEvent({
      job,
      provider: YOUTUBE_TIMEDTEXT_PROVIDER_NAME,
      state: "terminal_error",
      retryable: false,
      errorCode: "item_missing",
      errorMessage: "The item for this transcript job no longer exists.",
      startedAt,
      finishedAt: Date.now(),
    });
    return;
  }

  const result = await recoverYoutubeTranscriptForItem({
    item,
    videoId: job.video_id,
  });
  const providerRecordedAt = Date.now();
  const providerHealth = recordYoutubeTimedTextProviderOutcome({
    state: result.state,
    retryable: result.retryable,
    errorCode: result.errorCode ?? null,
    statusCode: result.statusCode ?? null,
    now: providerRecordedAt,
  });

  if (result.state === "success" && result.content) {
    try {
      await upgradeItemCaptureContent({
        itemId: job.item_id,
        content: result.content,
        platform: result.content.source_platform,
      });
      const finishedAt = Date.now();
      const attemptId = recordTranscriptAttempt({
        jobId: job.id,
        itemId: job.item_id,
        attemptNumber: job.attempts,
        provider: result.provider,
        state: "success",
        retryable: false,
        startedAt,
        finishedAt,
        transcriptLanguage: result.transcriptLanguage,
        transcriptIsGenerated: result.transcriptIsGenerated,
        transcriptIsTranslated: result.transcriptIsTranslated,
        transcriptChars: result.transcriptChars ?? result.content.body.length,
      });
      markTranscriptJobDone(job.id, attemptId);
      logTranscriptAttemptEvent({
        job,
        provider: result.provider,
        state: "success",
        retryable: false,
        startedAt,
        finishedAt,
        transcriptLanguage: result.transcriptLanguage,
        transcriptIsGenerated: result.transcriptIsGenerated,
        transcriptIsTranslated: result.transcriptIsTranslated,
        transcriptChars: result.transcriptChars ?? result.content.body.length,
      });
      console.log(`[transcript] job #${job.id} DONE`);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const finishedAt = Date.now();
      const nextRetryAt = nextTranscriptRetryAt(job.attempts, finishedAt);
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
        finishedAt,
      });
      markTranscriptJobRetryable(job.id, attemptId, nextRetryAt, {
        provider: result.provider,
        code: "item_upgrade_failed",
        message,
      });
      logTranscriptAttemptEvent({
        job,
        provider: result.provider,
        state: "retryable_error",
        retryable: true,
        errorCode: "item_upgrade_failed",
        errorMessage: message,
        startedAt,
        finishedAt,
        nextRetryAt,
      });
      console.warn(`[transcript] job #${job.id} upgrade failed: ${message}`);
      return;
    }
  }

  const finishedAt = Date.now();
  const nextRetryAt = result.retryable
    ? nextTranscriptRetryAtForResult(
        result,
        job.attempts,
        finishedAt,
        providerHealth.cooldownUntil,
      )
    : null;
  const providerThrottled = isYoutubeTimedTextProviderThrottled(result);
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
    finishedAt,
  });

  if (result.retryable) {
    markTranscriptJobRetryable(
      job.id,
      attemptId,
      nextRetryAt ?? nextTranscriptRetryAt(job.attempts),
      {
        provider: result.provider,
        code: result.errorCode ?? "transcript_retryable_error",
        message: result.errorMessage ?? "Transcript recovery hit a retryable error.",
      },
      { preserveRetryWindow: providerThrottled },
    );
    logTranscriptAttemptEvent({
      job,
      provider: result.provider,
      state: "retryable_error",
      retryable: true,
      errorCode: result.errorCode ?? "transcript_retryable_error",
      errorMessage: result.errorMessage ?? "Transcript recovery hit a retryable error.",
      statusCode: result.statusCode ?? null,
      startedAt,
      finishedAt,
      nextRetryAt,
      cooldownUntil: providerHealth.cooldownUntil,
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
  logTranscriptAttemptEvent({
    job,
    provider: result.provider,
    state: "terminal_error",
    retryable: false,
    errorCode: result.errorCode ?? "transcript_manual_needed",
    errorMessage: result.errorMessage ?? "Transcript recovery needs manual help.",
    statusCode: result.statusCode ?? null,
    startedAt,
    finishedAt,
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

export function claimNextTranscriptJobForTests(
  now = Date.now(),
  overrides: Partial<TranscriptClaimDeps> = {},
): TranscriptClaimResult {
  return claimNextTranscriptJobRespectingProviderCooldown(now, overrides);
}

function logTranscriptAttemptEvent(input: {
  job: TranscriptJobRow;
  provider: string;
  state: "success" | "retryable_error" | "terminal_error";
  retryable: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  statusCode?: number | null;
  startedAt: number;
  finishedAt: number;
  transcriptLanguage?: string | null;
  transcriptIsGenerated?: boolean | null;
  transcriptIsTranslated?: boolean | null;
  transcriptChars?: number | null;
  nextRetryAt?: number | null;
  cooldownUntil?: number | null;
}): void {
  logTranscriptProviderEvent({
    event: "transcript.recovery.attempt",
    provider: input.provider,
    provider_key: YOUTUBE_TIMEDTEXT_PROVIDER_KEY,
    video_id: input.job.video_id,
    item_id: input.job.item_id,
    job_id: input.job.id,
    attempt_number: input.job.attempts,
    state: input.state,
    retryable: input.retryable,
    error_code: input.errorCode ?? null,
    error_message: input.errorMessage ?? null,
    status_code: input.statusCode ?? null,
    started_at: input.startedAt,
    finished_at: input.finishedAt,
    duration_ms: Math.max(0, input.finishedAt - input.startedAt),
    transcript_language: input.transcriptLanguage ?? null,
    transcript_is_generated: input.transcriptIsGenerated ?? null,
    transcript_is_translated: input.transcriptIsTranslated ?? null,
    transcript_chars: input.transcriptChars ?? null,
    next_retry_at: input.nextRetryAt ?? null,
    cooldown_until: input.cooldownUntil ?? null,
  });
}

function safeErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  return String(err);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
