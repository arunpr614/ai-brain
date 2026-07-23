import { getDb } from "@/db/client";
import { getItem } from "@/db/items";
import { upgradeItemCaptureContent } from "@/db/item-upgrades";
import { getYouTubeBrowserSchemaCapability } from "@/db/schema-capabilities";
import {
  backfillTranscriptJobsForExistingYoutubeItemsWithOutcome,
  claimNextTranscriptJobWithOutcome,
  finalizeTranscriptJobAttempt,
  isClaimedTranscriptJobStillAuthoritative,
  sweepStaleTranscriptClaimsWithOutcome,
  TranscriptRecoverySourceConflictError,
  type TranscriptJobRow,
} from "@/db/transcript-jobs";
import {
  recoverYoutubeTranscriptForItem,
  type TranscriptRecoveryResult,
} from "@/lib/capture/youtube-transcript/recovery";
import {
  getYoutubeTimedTextCooldown,
  isYoutubeTimedTextProviderThrottled,
  logTranscriptContainmentDiagnostic,
  recordYoutubeTimedTextProviderOutcome,
  transcriptElapsedBucket,
  transcriptPayloadSizeBucket,
  YOUTUBE_TIMEDTEXT_COOLDOWN_MIN_MS,
  YOUTUBE_TIMEDTEXT_PROVIDER_NAME,
} from "@/lib/capture/youtube-transcript/provider-health";
import {
  ItemBodyProcessingBlockedError,
  resolveItemBodyProcessingGate,
} from "@/lib/processing/hold-gate";
import { classifyDeployment } from "@/lib/runtime/deployment";
import {
  createContainmentDiagnostic,
  type ContainmentDiagnostic,
} from "@/lib/runtime/containment-diagnostics";
import {
  resolveContentWorkerPlan,
  type ContentWorkerPlanCode,
} from "@/lib/startup/content-workers";

const POLL_INTERVAL_MS = 2_000;
const IDLE_INTERVAL_MS = 15_000;
const STALE_CLAIM_MS = 10 * 60_000;
const BASE_RETRY_BACKOFF_MS = 30 * 60_000;

declare global {
  var __brainTranscriptRecoveryWorker:
    { running: boolean; stopRequested: boolean } | undefined;
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

export type TranscriptWorkerStartOutcome =
  "started" | "already_running" | "blocked";

interface TranscriptWorkerLifecycleState {
  running: boolean;
  stopRequested: boolean;
}

interface TranscriptWorkerStartDependencies {
  readonly backfill: typeof backfillTranscriptJobsForExistingYoutubeItemsWithOutcome;
  readonly beginLoop: () => void;
}

const DEFAULT_START_DEPENDENCIES: TranscriptWorkerStartDependencies = {
  backfill: backfillTranscriptJobsForExistingYoutubeItemsWithOutcome,
  beginLoop: startLoop,
};

function startTranscriptRecoveryWorkerWithDependencies(
  state: TranscriptWorkerLifecycleState,
  dependencies: TranscriptWorkerStartDependencies,
): TranscriptWorkerStartOutcome {
  const authority = resolveTranscriptWorkerAuthority();
  if (!authority.allowed) {
    console.log("[transcript] worker not started");
    return "blocked";
  }

  if (state.running) return "already_running";
  const backfill = dependencies.backfill();
  if (backfill.kind === "blocked") {
    console.log("[transcript] worker not started");
    return "blocked";
  }
  if (!resolveTranscriptWorkerAuthority().allowed) {
    console.log("[transcript] worker not started");
    return "blocked";
  }

  state.running = true;
  state.stopRequested = false;
  console.log("[transcript] worker starting");
  dependencies.beginLoop();
  return "started";
}

export function startTranscriptRecoveryWorker(): void {
  startTranscriptRecoveryWorkerWithDependencies(
    workerState(),
    DEFAULT_START_DEPENDENCIES,
  );
}

export function startTranscriptRecoveryWorkerForTests(
  overrides: Partial<TranscriptWorkerStartDependencies> = {},
): TranscriptWorkerStartOutcome {
  return startTranscriptRecoveryWorkerWithDependencies(
    { running: false, stopRequested: false },
    { ...DEFAULT_START_DEPENDENCIES, ...overrides },
  );
}

export function stopTranscriptRecoveryWorker(): void {
  workerState().stopRequested = true;
}

export function transcriptRecoveryEnabled(): boolean {
  const recovery = process.env.YOUTUBE_TRANSCRIPT_RECOVERY_ENABLED;
  const worker = process.env.YOUTUBE_TRANSCRIPT_WORKER_ENABLED;
  return (
    recovery !== "0" &&
    recovery !== "false" &&
    worker !== "0" &&
    worker !== "false"
  );
}

export interface TranscriptWorkerAuthority {
  readonly allowed: boolean;
  readonly code: ContentWorkerPlanCode | "legacy_transcript_disabled";
  readonly mode:
    | "disabled"
    | "standard"
    | "manual-transcript-lab"
    | "legacy_default_standard"
    | "invalid";
}

export function resolveTranscriptWorkerAuthority(): TranscriptWorkerAuthority {
  const db = getDb();
  const plan = resolveContentWorkerPlan({
    deployment: classifyDeployment(),
    schemaCapability: getYouTubeBrowserSchemaCapability(db),
  });
  const standardMode =
    plan.starts.transcriptRecovery &&
    (plan.effectiveMode === "standard" ||
      plan.effectiveMode === "legacy_default_standard");
  if (!standardMode) {
    return {
      allowed: false,
      code: plan.code,
      mode: plan.effectiveMode,
    };
  }
  if (!transcriptRecoveryEnabled()) {
    return {
      allowed: false,
      code: "legacy_transcript_disabled",
      mode: plan.effectiveMode,
    };
  }
  return {
    allowed: true,
    code: plan.code,
    mode: plan.effectiveMode,
  };
}

function transcriptJobAllowed(job: TranscriptJobRow): boolean {
  if (!resolveTranscriptWorkerAuthority().allowed) return false;
  if (!resolveItemBodyProcessingGate(job.item_id, getDb()).allowed)
    return false;
  return isClaimedTranscriptJobStillAuthoritative(job);
}

export function nextTranscriptRetryAt(
  attempt: number,
  now = Date.now(),
): number {
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
  void loop().catch(() => {
    console.error("[transcript] worker crashed code=worker_exception");
  });
}

async function loop(): Promise<void> {
  const state = workerState();
  let lastSweepAt = 0;
  let lastCooldownLogAt = 0;

  try {
    while (!state.stopRequested) {
      if (!resolveTranscriptWorkerAuthority().allowed) {
        await sleep(IDLE_INTERVAL_MS);
        continue;
      }

      const now = Date.now();
      if (now - lastSweepAt >= STALE_CLAIM_MS) {
        const swept = sweepStaleTranscriptClaimsWithOutcome(
          now - STALE_CLAIM_MS,
        );
        if (swept.kind === "blocked") {
          lastSweepAt = now;
          await sleep(IDLE_INTERVAL_MS);
          continue;
        }
        if (swept.kind === "applied" && swept.value > 0) {
          console.log("[transcript] stale claims requeued");
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
      if (claim.status === "blocked") {
        await sleep(IDLE_INTERVAL_MS);
        continue;
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
  claimNextTranscriptJob: typeof claimNextTranscriptJobWithOutcome;
  getYoutubeTimedTextCooldown: typeof getYoutubeTimedTextCooldown;
  logContainmentDiagnostic: typeof logTranscriptContainmentDiagnostic;
  logCooldown?: boolean;
};

type TranscriptClaimResult = {
  status: "claimed" | "idle" | "cooldown" | "blocked";
  job: TranscriptJobRow | null;
  cooldownActive: boolean;
  cooldownUntil: number | null;
};

const defaultClaimDeps: TranscriptClaimDeps = {
  claimNextTranscriptJob: claimNextTranscriptJobWithOutcome,
  getYoutubeTimedTextCooldown,
  logContainmentDiagnostic: logTranscriptContainmentDiagnostic,
  logCooldown: true,
};

function claimNextTranscriptJobRespectingProviderCooldown(
  now = Date.now(),
  overrides: Partial<TranscriptClaimDeps> = {},
): TranscriptClaimResult {
  const deps = { ...defaultClaimDeps, ...overrides };
  if (!resolveTranscriptWorkerAuthority().allowed) {
    return {
      status: "blocked",
      job: null,
      cooldownActive: false,
      cooldownUntil: null,
    };
  }

  const cooldown = deps.getYoutubeTimedTextCooldown(now);
  if (cooldown.active) {
    if (!resolveTranscriptWorkerAuthority().allowed) {
      return {
        status: "blocked",
        job: null,
        cooldownActive: false,
        cooldownUntil: null,
      };
    }
    if (deps.logCooldown) {
      deps.logContainmentDiagnostic(
        createContainmentDiagnostic({
          event: "claimant_guarded",
          outcome: "skipped",
          claimant: "transcript_recovery",
          phase: "claim",
          aggregateCount: 0,
          guardrailTriggered: true,
          workStarted: false,
          providerContacted: false,
          elapsedBucket: "not_measured",
          payloadSizeBucket: "not_measured",
          timestamp: new Date(now).toISOString(),
        }),
      );
      console.log("[transcript] provider cooldown active");
    }
    return {
      status: "cooldown",
      job: null,
      cooldownActive: true,
      cooldownUntil: cooldown.cooldownUntil,
    };
  }

  const claim = deps.claimNextTranscriptJob(now);
  if (claim.kind === "blocked") {
    return {
      status: "blocked",
      job: null,
      cooldownActive: false,
      cooldownUntil: null,
    };
  }
  if (claim.kind === "unchanged") {
    return {
      status: "idle",
      job: null,
      cooldownActive: false,
      cooldownUntil: null,
    };
  }
  return {
    status: "claimed",
    job: claim.value,
    cooldownActive: false,
    cooldownUntil: null,
  };
}

export type TranscriptJobRunOutcome = "processed" | "blocked";

interface TranscriptJobExecutionDependencies {
  readonly getItem: typeof getItem;
  readonly recover: typeof recoverYoutubeTranscriptForItem;
  readonly upgrade: typeof upgradeItemCaptureContent;
  readonly recordProviderOutcome: typeof recordYoutubeTimedTextProviderOutcome;
  readonly finalizeAttempt: typeof finalizeTranscriptJobAttempt;
  readonly logContainmentDiagnostic: typeof logTranscriptContainmentDiagnostic;
  readonly now: () => number;
}

const DEFAULT_EXECUTION_DEPENDENCIES: TranscriptJobExecutionDependencies = {
  getItem,
  recover: recoverYoutubeTranscriptForItem,
  upgrade: upgradeItemCaptureContent,
  recordProviderOutcome: recordYoutubeTimedTextProviderOutcome,
  finalizeAttempt: finalizeTranscriptJobAttempt,
  logContainmentDiagnostic: logTranscriptContainmentDiagnostic,
  now: Date.now,
};

async function runOne(
  job: TranscriptJobRow,
  dependencies: TranscriptJobExecutionDependencies = DEFAULT_EXECUTION_DEPENDENCIES,
): Promise<TranscriptJobRunOutcome> {
  if (!transcriptJobAllowed(job)) return "blocked";
  const item = dependencies.getItem(job.item_id);
  if (!transcriptJobAllowed(job)) return "blocked";
  const startedAt = dependencies.now();

  if (!item) {
    const finishedAt = dependencies.now();
    if (!transcriptJobAllowed(job)) return "blocked";
    const attemptId = dependencies.finalizeAttempt(
      {
        jobId: job.id,
        itemId: job.item_id,
        attemptNumber: job.attempts,
        provider: YOUTUBE_TIMEDTEXT_PROVIDER_NAME,
        state: "terminal_error",
        retryable: false,
        errorCode: "item_missing",
        startedAt,
        finishedAt,
      },
      {
        kind: "manual_needed",
        error: {
          provider: YOUTUBE_TIMEDTEXT_PROVIDER_NAME,
          code: "item_missing",
        },
      },
    );
    if (attemptId === null || !transcriptJobAllowedAfterFinalization(job)) {
      return "blocked";
    }
    logTranscriptAttemptEvent(
      {
        state: "terminal_error",
        providerContacted: false,
        startedAt,
        finishedAt,
      },
      dependencies.logContainmentDiagnostic,
    );
    console.warn("[transcript] terminal outcome code=item_missing");
    return "processed";
  }

  // This is the last synchronous authority check before provider dispatch.
  if (!transcriptJobAllowed(job)) return "blocked";
  const result = await dependencies.recover({
    item,
    videoId: job.video_id,
  });
  // Provider results are inert until authority is re-established.
  if (!transcriptJobAllowed(job)) return "blocked";

  const providerRecordedAt = dependencies.now();
  const providerHealth = dependencies.recordProviderOutcome({
    state: result.state,
    retryable: result.retryable,
    errorCode: result.errorCode ?? null,
    statusCode: result.statusCode ?? null,
    now: providerRecordedAt,
  });

  if (result.state === "success" && result.content) {
    try {
      // The apply call follows this check synchronously. Its own transaction
      // must enforce the same source exclusion for a complete apply-time CAS.
      if (!transcriptJobAllowed(job)) return "blocked";
      // upgradeItemCaptureContent also enforces the gate inside its write.
      await dependencies.upgrade({
        itemId: job.item_id,
        content: result.content,
        platform: result.content.source_platform,
        requireNoActiveTranscriptSource: true,
      });
      if (!transcriptJobAllowed(job)) return "blocked";
      const finishedAt = dependencies.now();
      if (!transcriptJobAllowed(job)) return "blocked";
      const attemptId = dependencies.finalizeAttempt(
        {
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
        },
        { kind: "done" },
      );
      if (attemptId === null || !transcriptJobAllowedAfterFinalization(job)) {
        return "blocked";
      }
      logTranscriptAttemptEvent(
        {
          state: "success",
          providerContacted: true,
          startedAt,
          finishedAt,
          transcriptChars: result.transcriptChars ?? result.content.body.length,
        },
        dependencies.logContainmentDiagnostic,
      );
      console.log("[transcript] recovery completed");
      return "processed";
    } catch (error) {
      if (
        error instanceof ItemBodyProcessingBlockedError ||
        error instanceof TranscriptRecoverySourceConflictError ||
        !transcriptJobAllowed(job)
      ) {
        return "blocked";
      }
      return recordUpgradeFailure(job, result, startedAt, dependencies);
    }
  }

  const finishedAt = dependencies.now();
  const nextRetryAt = result.retryable
    ? nextTranscriptRetryAtForResult(
        result,
        job.attempts,
        finishedAt,
        providerHealth.cooldownUntil,
      )
    : null;
  const providerThrottled = isYoutubeTimedTextProviderThrottled(result);
  if (!transcriptJobAllowed(job)) return "blocked";
  const attemptId = dependencies.finalizeAttempt(
    {
      jobId: job.id,
      itemId: job.item_id,
      attemptNumber: job.attempts,
      provider: result.provider,
      state: result.retryable ? "retryable_error" : "terminal_error",
      retryable: result.retryable,
      errorCode: result.errorCode ?? "transcript_unavailable",
      statusCode: result.statusCode ?? null,
      startedAt,
      finishedAt,
    },
    result.retryable
      ? {
          kind: "retryable",
          nextRunAt: nextRetryAt ?? nextTranscriptRetryAt(job.attempts),
          error: {
            provider: result.provider,
            code: result.errorCode ?? "transcript_retryable_error",
          },
          preserveRetryWindow: providerThrottled,
        }
      : {
          kind: "manual_needed",
          error: {
            provider: result.provider,
            code: result.errorCode ?? "transcript_manual_needed",
          },
        },
  );
  if (attemptId === null || !transcriptJobAllowedAfterFinalization(job)) {
    return "blocked";
  }

  if (result.retryable) {
    logTranscriptAttemptEvent(
      {
        state: "retryable_error",
        providerContacted: true,
        startedAt,
        finishedAt,
      },
      dependencies.logContainmentDiagnostic,
    );
    console.warn("[transcript] retryable outcome");
    return "processed";
  }

  logTranscriptAttemptEvent(
    {
      state: "terminal_error",
      providerContacted: true,
      startedAt,
      finishedAt,
    },
    dependencies.logContainmentDiagnostic,
  );
  console.warn("[transcript] terminal outcome code=manual_needed");
  return "processed";
}

function recordUpgradeFailure(
  job: TranscriptJobRow,
  result: TranscriptRecoveryResult,
  startedAt: number,
  dependencies: TranscriptJobExecutionDependencies,
): TranscriptJobRunOutcome {
  if (!transcriptJobAllowed(job)) return "blocked";
  const finishedAt = dependencies.now();
  const nextRetryAt = nextTranscriptRetryAt(job.attempts, finishedAt);
  const attemptId = dependencies.finalizeAttempt(
    {
      jobId: job.id,
      itemId: job.item_id,
      attemptNumber: job.attempts,
      provider: result.provider,
      state: "retryable_error",
      retryable: true,
      errorCode: "item_upgrade_failed",
      startedAt,
      finishedAt,
    },
    {
      kind: "retryable",
      nextRunAt: nextRetryAt,
      error: {
        provider: result.provider,
        code: "item_upgrade_failed",
      },
    },
  );
  if (attemptId === null || !transcriptJobAllowedAfterFinalization(job)) {
    return "blocked";
  }
  logTranscriptAttemptEvent(
    {
      state: "retryable_error",
      providerContacted: true,
      startedAt,
      finishedAt,
    },
    dependencies.logContainmentDiagnostic,
  );
  console.warn("[transcript] retryable outcome");
  return "processed";
}

type TranscriptWorkerDeps = {
  runOne: (job: TranscriptJobRow) => Promise<TranscriptJobRunOutcome>;
  finalizeAttempt: typeof finalizeTranscriptJobAttempt;
  nextTranscriptRetryAt: typeof nextTranscriptRetryAt;
  now: () => number;
};

const defaultWorkerDeps: TranscriptWorkerDeps = {
  runOne,
  finalizeAttempt: finalizeTranscriptJobAttempt,
  nextTranscriptRetryAt,
  now: Date.now,
};

async function runOneSafely(
  job: TranscriptJobRow,
  overrides: Partial<TranscriptWorkerDeps> = {},
): Promise<TranscriptJobRunOutcome> {
  const deps = { ...defaultWorkerDeps, ...overrides };
  if (!transcriptJobAllowed(job)) return "blocked";
  const startedAt = deps.now();

  try {
    return await deps.runOne(job);
  } catch (err) {
    if (
      err instanceof ItemBodyProcessingBlockedError ||
      !transcriptJobAllowed(job)
    ) {
      return "blocked";
    }

    try {
      if (!transcriptJobAllowed(job)) return "blocked";
      const attemptId = deps.finalizeAttempt(
        {
          jobId: job.id,
          itemId: job.item_id,
          attemptNumber: job.attempts,
          provider: "transcript_worker",
          state: "retryable_error",
          retryable: true,
          errorCode: "worker_exception",
          startedAt,
        },
        {
          kind: "retryable",
          nextRunAt: deps.nextTranscriptRetryAt(job.attempts),
          error: {
            provider: "transcript_worker",
            code: "worker_exception",
          },
        },
      );
      if (attemptId === null) return "blocked";
    } catch (finalizeError) {
      if (
        finalizeError instanceof ItemBodyProcessingBlockedError ||
        !transcriptJobAllowed(job)
      ) {
        return "blocked";
      }
      console.error("[transcript] worker exception finalization failed");
    }

    console.warn("[transcript] worker exception code=worker_exception");
    return "processed";
  }
}

export async function runTranscriptJobSafelyForTests(
  job: TranscriptJobRow,
  overrides: Partial<TranscriptWorkerDeps>,
): Promise<TranscriptJobRunOutcome> {
  return runOneSafely(job, overrides);
}

export async function runClaimedTranscriptJobForTests(
  job: TranscriptJobRow,
  overrides: Partial<TranscriptJobExecutionDependencies> = {},
): Promise<TranscriptJobRunOutcome> {
  const executionDependencies = {
    ...DEFAULT_EXECUTION_DEPENDENCIES,
    ...overrides,
  };
  return runOneSafely(job, {
    runOne: (claimed) => runOne(claimed, executionDependencies),
    finalizeAttempt: executionDependencies.finalizeAttempt,
    now: executionDependencies.now,
  });
}

export function claimNextTranscriptJobForTests(
  now = Date.now(),
  overrides: Partial<TranscriptClaimDeps> = {},
): TranscriptClaimResult {
  return claimNextTranscriptJobRespectingProviderCooldown(now, overrides);
}

function logTranscriptAttemptEvent(
  input: {
    state: "success" | "retryable_error" | "terminal_error";
    providerContacted: boolean;
    startedAt: number;
    finishedAt: number;
    transcriptChars?: number | null;
  },
  logEvent: (entry: ContainmentDiagnostic) => void,
): void {
  logEvent(
    createContainmentDiagnostic({
      event: "claimant_guarded",
      outcome: input.state === "success" ? "allowed" : "failed_closed",
      claimant: "transcript_recovery",
      phase: input.state === "retryable_error" ? "retry" : "terminal",
      aggregateCount: 1,
      guardrailTriggered: input.state !== "success",
      workStarted: true,
      providerContacted: input.providerContacted,
      elapsedBucket: transcriptElapsedBucket(
        input.finishedAt - input.startedAt,
      ),
      payloadSizeBucket: transcriptPayloadSizeBucket(
        input.state === "success" ? input.transcriptChars : 0,
      ),
      timestamp: new Date(input.finishedAt).toISOString(),
    }),
  );
}

function transcriptJobAllowedAfterFinalization(job: TranscriptJobRow): boolean {
  if (!resolveTranscriptWorkerAuthority().allowed) return false;
  const current = getDb()
    .prepare("SELECT state FROM transcript_jobs WHERE id = ? AND item_id = ?")
    .get(job.id, job.item_id) as { state: string } | undefined;
  return Boolean(
    current &&
    (current.state === "done" ||
      current.state === "retryable_error" ||
      current.state === "manual_needed"),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
