/**
 * Enrichment queue worker — F-202.
 *
 * Design notes:
 * - Single worker in the Next.js server process. Personal tool = no need
 *   for worker pool or cross-process coordination.
 * - Pull-based: polls every POLL_INTERVAL_MS for pending jobs, claims one
 *   atomically, runs enrichment, transitions state. Sleeps longer when idle.
 * - Crash-safe: if process dies mid-job, the stale-claim sweep on next boot
 *   re-opens jobs claimed more than STALE_CLAIM_MS ago.
 * - Retry policy: on error, increment attempts. After MAX_ATTEMPTS, mark
 *   state='error' so human can inspect. The Ollama client already retries
 *   once internally for JSON parse failures (per R-LLM-b), so this retry
 *   layer handles the distinct class of model-unavailable / timeout errors.
 */

import { getDb } from "@/db/client";
import { getYouTubeBrowserSchemaCapability } from "@/db/schema-capabilities";
import { enrichItem } from "@/lib/enrich/pipeline";
import { embedItemWithRetry } from "@/lib/embed/pipeline";
import { logContainmentDiagnostic } from "@/lib/errors/sink";
import { getEnrichProvider } from "@/lib/llm/factory";
import {
  isUnresolvedBatchReservation,
  UnresolvedBatchReservationError,
} from "@/lib/queue/enrichment-batch-binding";
import {
  assertItemBodyProcessingAllowed,
  ItemBodyProcessingBlockedError,
  resolveItemBodyProcessingGate,
} from "@/lib/processing/hold-gate";
import { classifyDeployment } from "@/lib/runtime/deployment";
import { createContainmentDiagnostic } from "@/lib/runtime/containment-diagnostics";
import { resolveContentWorkerPlan } from "@/lib/startup/content-workers";

const POLL_INTERVAL_MS = 2_000;
const IDLE_INTERVAL_MS = 10_000; // when no work, back off
// 90s covers a normal enrichment run (measured 26.7s avg in R-LLM-b;
// worst case <1 min). A crashed worker's claim gets resurrected after
// this window. Single-worker personal tool — no need for longer bounds.
const STALE_CLAIM_MS = 90_000;
const MAX_ATTEMPTS = 3;
const LLM_PROVIDER_DOWN_BACKOFF_MS = 30_000;

// F-050 (self-critique A-10): lightweight append-only JSONL sink for
// enrichment failures so the user has a retrospective trail beyond the
// console log. Rotates at 5 MB by renaming the current file to .1 and
// dropping the previous .1 on the next rotation (two-file policy).
// F-044 (self-critique A-2): module-level flags do not survive Next's HMR
// re-evaluation — every fast-refresh would boot a second worker. A
// globalThis attribute persists across module reloads within the same
// Node process, which is the correct scope for "exactly one worker per
// process."
declare global {
  var __brainEnrichmentWorker:
    { running: boolean; stopRequested: boolean } | undefined;
}

function workerState() {
  if (!globalThis.__brainEnrichmentWorker) {
    globalThis.__brainEnrichmentWorker = {
      running: false,
      stopRequested: false,
    };
  }
  return globalThis.__brainEnrichmentWorker;
}

export function startEnrichmentWorker(): void {
  if (!isScheduledEnrichmentStandardMode()) return;
  const state = workerState();
  if (state.running) return;
  state.running = true;
  state.stopRequested = false;
  console.log("[enrich] worker starting");
  void loop();
}

export function stopEnrichmentWorker(): void {
  workerState().stopRequested = true;
}

async function loop(): Promise<void> {
  const state = workerState();
  let lastSweepAt = 0;

  while (!state.stopRequested) {
    // F-045 (self-critique A-3): sweep stale claims on a rolling cadence,
    // not just at boot. A wedged fetch to Ollama can leave a claim in the
    // `running` state forever — without a periodic sweep the only rescue
    // path is a full server restart.
    if (shouldSweep(Date.now(), lastSweepAt)) {
      sweepStaleClaims();
      lastSweepAt = Date.now();
    }

    const outcome = await runEnrichmentWorkerIteration();
    if (outcome === "provider_down") {
      console.warn("[enrich] provider unavailable; backoff active");
      await sleep(LLM_PROVIDER_DOWN_BACKOFF_MS);
    } else if (outcome === "processed") {
      await sleep(POLL_INTERVAL_MS);
    } else {
      await sleep(IDLE_INTERVAL_MS);
    }
  }

  state.running = false;
  console.log("[enrich] worker stopped");
}

/**
 * Exported for the T-A-7 `node:test` harness (F-051). Pure function so it
 * can be unit-tested without touching the DB or the timing loop.
 */
export function shouldSweep(now: number, lastSweepAt: number): boolean {
  return now - lastSweepAt >= STALE_CLAIM_MS;
}

interface JobRow {
  id: number;
  item_id: string;
  state: "pending" | "running" | "batched" | "done" | "error";
  attempts: number;
}

export type EnrichmentWorkerIterationOutcome =
  "idle" | "provider_down" | "processed" | "blocked";

export interface EnrichmentWorkerIterationDependencies {
  readonly isProviderAlive: () => Promise<boolean>;
  readonly enrich: typeof enrichItem;
  readonly embed: typeof embedItemWithRetry;
  /** Deterministic race barrier after the atomic claim, before dispatch. */
  readonly afterClaim?: (itemId: string) => void;
}

const DEFAULT_ITERATION_DEPENDENCIES: EnrichmentWorkerIterationDependencies = {
  isProviderAlive: () => getEnrichProvider().isAlive(),
  enrich: enrichItem,
  embed: embedItemWithRetry,
};

/**
 * Direct-entry guard for callers outside the startup loader and a runtime
 * recheck for workers that were already running when authority changed.
 * Schema-026's compatibility bridge remains ordinary standard operation.
 */
export function isScheduledEnrichmentStandardMode(
  db: ReturnType<typeof getDb> = getDb(),
): boolean {
  const plan = resolveContentWorkerPlan({
    deployment: classifyDeployment(),
    schemaCapability: getYouTubeBrowserSchemaCapability(db),
  });
  return (
    plan.starts.scheduledEnrichment &&
    (plan.effectiveMode === "standard" ||
      plan.effectiveMode === "legacy_default_standard")
  );
}

/**
 * One loop iteration, exported so containment races can be exercised without
 * starting timers. The candidate probe is read-only and occurs before the
 * provider liveness call.
 */
export async function runEnrichmentWorkerIteration(
  dependencies: EnrichmentWorkerIterationDependencies = DEFAULT_ITERATION_DEPENDENCIES,
): Promise<EnrichmentWorkerIterationOutcome> {
  const candidate = findEligiblePendingCandidate();
  if (!candidate) return "idle";

  if (!(await dependencies.isProviderAlive())) return "provider_down";

  const job = claimNext(candidate.id);
  if (!job) return "blocked";
  dependencies.afterClaim?.(job.item_id);
  return runOne(job, dependencies);
}

export function sweepStaleClaims(): void {
  const now = Date.now();
  const threshold = now - STALE_CLAIM_MS;
  const db = getDb();
  if (!isScheduledEnrichmentStandardMode(db)) return;

  const stale = db
    .prepare(
      `SELECT id, item_id, state, attempts
       FROM enrichment_jobs
       WHERE state = 'running' AND claimed_at < ?
       ORDER BY created_at ASC`,
    )
    .all(threshold) as JobRow[];

  let resurrected = 0;
  for (const row of stale) {
    try {
      const changed = db
        .transaction(() => {
          if (!isScheduledEnrichmentStandardMode(db)) return 0;
          if (itemHasUnresolvedBatchReservation(row.item_id, db)) return 0;
          assertItemBodyProcessingAllowed(row.item_id, db);
          return db
            .prepare(
              `UPDATE enrichment_jobs
               SET state = 'pending', claimed_at = NULL
               WHERE id = ? AND state = 'running' AND claimed_at < ?`,
            )
            .run(row.id, threshold).changes;
        })
        .immediate();
      resurrected += changed;
    } catch (error) {
      if (error instanceof ItemBodyProcessingBlockedError) continue;
      throw error;
    }
  }
  if (resurrected > 0) {
    console.log(`[enrich] resurrected ${resurrected} stale claim(s)`);
  }
}

function findEligiblePendingCandidate(): JobRow | null {
  const db = getDb();
  if (!isScheduledEnrichmentStandardMode(db)) return null;
  const rows = db
    .prepare(
      `SELECT id, item_id, state, attempts
       FROM enrichment_jobs
       WHERE state = 'pending'
       ORDER BY created_at ASC`,
    )
    .all() as JobRow[];
  for (const row of rows) {
    if (workerItemAllowed(row.item_id, db)) return row;
  }
  return null;
}

function claimNext(jobId: number): JobRow | null {
  const db = getDb();
  if (!isScheduledEnrichmentStandardMode(db)) return null;
  const tx = db.transaction((): JobRow | null => {
    if (!isScheduledEnrichmentStandardMode(db)) return null;
    const row = db
      .prepare(
        `SELECT id, item_id, state, attempts
         FROM enrichment_jobs
         WHERE id = ? AND state = 'pending'`,
      )
      .get(jobId) as JobRow | undefined;
    if (!row) return null;
    if (itemHasUnresolvedBatchReservation(row.item_id, db)) return null;
    assertItemBodyProcessingAllowed(row.item_id, db);
    const claimed = db
      .prepare(
        `UPDATE enrichment_jobs
         SET state = 'running', claimed_at = unixepoch() * 1000, attempts = attempts + 1
         WHERE id = ? AND state = 'pending'`,
      )
      .run(row.id);
    if (claimed.changes === 0) return null;
    if (itemHasUnresolvedBatchReservation(row.item_id, db)) {
      throw new UnresolvedBatchReservationError();
    }
    db.prepare(
      `UPDATE items SET enrichment_state = 'running' WHERE id = ?`,
    ).run(row.item_id);
    if (itemHasUnresolvedBatchReservation(row.item_id, db)) {
      throw new UnresolvedBatchReservationError();
    }
    return { ...row, state: "running", attempts: row.attempts + 1 };
  });
  try {
    return tx.immediate();
  } catch (error) {
    if (
      error instanceof ItemBodyProcessingBlockedError ||
      error instanceof UnresolvedBatchReservationError
    ) {
      return null;
    }
    throw error;
  }
}

async function runOne(
  job: JobRow,
  dependencies: EnrichmentWorkerIterationDependencies,
): Promise<EnrichmentWorkerIterationOutcome> {
  if (!workerItemAllowed(job.item_id)) return "blocked";
  console.log("[enrich] claimant dispatch started");
  try {
    const result = await dependencies.enrich(job.item_id, {
      revalidateAuthority: () => workerItemAllowed(job.item_id),
    });
    if (!result.ok && result.blocked === true) return "blocked";
    if (result.ok) {
      if (!completeJob(job)) return "blocked";
      if (!workerItemAllowed(job.item_id)) return "blocked";
      console.log("[enrich] claimant completed");
      // v0.4.0 SC-1: embedding follows enrichment in the same worker pass.
      // The enrichment-state trigger (migration 006) inserts the
      // embedding_jobs row when enrichment flips to 'done'; we drain it
      // inline so search/Ask see the new item without waiting for a
      // separate worker. Failure here is non-fatal for the user-visible
      // capture flow — embedItemWithRetry marks the job state='error' on
      // retry-exhaust and the next sweep can re-queue.
      if (!workerItemAllowed(job.item_id)) return "blocked";
      const embedResult = await dependencies.embed(job.item_id, {
        revalidateAuthority: () => workerItemAllowed(job.item_id),
      });
      if (!embedResult.ok && embedResult.blocked === true) return "blocked";
      if (!workerItemAllowed(job.item_id)) return "blocked";
      if (embedResult.ok) {
        console.log("[embed] claimant completed");
      } else {
        console.warn("[embed] claimant failed");
      }
      return "processed";
    }
    return handleFailure(job, result.error) ? "processed" : "blocked";
  } catch (err) {
    if (err instanceof ItemBodyProcessingBlockedError) return "blocked";
    return handleFailure(job, "enrichment_worker_exception")
      ? "processed"
      : "blocked";
  }
}

function completeJob(job: JobRow): boolean {
  const db = getDb();
  try {
    return db
      .transaction(() => {
        if (!isScheduledEnrichmentStandardMode(db)) return false;
        if (itemHasUnresolvedBatchReservation(job.item_id, db)) return false;
        assertItemBodyProcessingAllowed(job.item_id, db);
        return (
          db
            .prepare(
              `UPDATE enrichment_jobs
               SET state = 'done', completed_at = unixepoch() * 1000, last_error = NULL
               WHERE id = ? AND state = 'running'`,
            )
            .run(job.id).changes > 0
        );
      })
      .immediate();
  } catch (error) {
    if (error instanceof ItemBodyProcessingBlockedError) return false;
    throw error;
  }
}

function workerItemAllowed(
  itemId: string,
  db: ReturnType<typeof getDb> = getDb(),
): boolean {
  return (
    isScheduledEnrichmentStandardMode(db) &&
    resolveItemBodyProcessingGate(itemId, db).allowed &&
    !itemHasUnresolvedBatchReservation(itemId, db)
  );
}

function itemHasUnresolvedBatchReservation(
  itemId: string,
  db: ReturnType<typeof getDb>,
): boolean {
  const row = db
    .prepare("SELECT batch_id FROM items WHERE id = ?")
    .get(itemId) as { batch_id: string | null } | undefined;
  return isUnresolvedBatchReservation(row?.batch_id);
}

function handleFailure(job: JobRow, error: string): boolean {
  const db = getDb();
  const terminal = job.attempts >= MAX_ATTEMPTS;
  const failureCode = normalizeFailureCode(error);
  try {
    const changed = db
      .transaction(() => {
        if (!isScheduledEnrichmentStandardMode(db)) return false;
        if (itemHasUnresolvedBatchReservation(job.item_id, db)) return false;
        assertItemBodyProcessingAllowed(job.item_id, db);
        if (terminal) {
          db.prepare(
            `UPDATE enrichment_jobs
             SET state = 'error', last_error = ?, completed_at = unixepoch() * 1000
             WHERE id = ? AND state = 'running'`,
          ).run(failureCode, job.id);
          db.prepare(
            `UPDATE items SET enrichment_state = 'error'
             WHERE id = ? AND enrichment_state = 'running'`,
          ).run(job.item_id);
        } else {
          db.prepare(
            `UPDATE enrichment_jobs
             SET state = 'pending', claimed_at = NULL, last_error = ?
             WHERE id = ? AND state = 'running'`,
          ).run(failureCode, job.id);
          db.prepare(
            `UPDATE items SET enrichment_state = 'pending'
             WHERE id = ? AND enrichment_state = 'running'`,
          ).run(job.item_id);
        }
        return true;
      })
      .immediate();
    if (!changed) return false;
  } catch (blocked) {
    if (blocked instanceof ItemBodyProcessingBlockedError) return false;
    throw blocked;
  }

  if (!workerItemAllowed(job.item_id)) return true;
  logContainmentDiagnostic(
    createContainmentDiagnostic({
      event: "claimant_guarded",
      outcome: "failed_closed",
      claimant: "scheduled_enrichment",
      phase: terminal ? "terminal" : "retry",
      workStarted: true,
      providerContacted: true,
      stopDecision: terminal ? "stop" : "go",
      timestamp: new Date().toISOString(),
    }),
  );
  if (terminal) {
    console.error("[enrich] claimant failed terminally");
    return true;
  }
  console.warn("[enrich] claimant scheduled for retry");
  return true;
}

function normalizeFailureCode(error: string): string {
  switch (error) {
    case "item_not_found":
    case "enrichment_provider_failed":
    case "enrichment_validation_failed":
    case "enrichment_worker_exception":
      return error;
    default:
      return "enrichment_worker_exception";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
