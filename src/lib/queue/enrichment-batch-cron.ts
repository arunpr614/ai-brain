/**
 * Enrichment-batch cron schedule — v0.6.0 Phase C-4.
 *
 * Two `node-cron` schedules registered once per Node process:
 *
 *   01:00 IST  (19:30 UTC)        submitDailyBatch — claim pending items,
 *                                 submit one Anthropic Message Batch.
 *   every 5 minutes               pollAllInFlightBatches — drain results
 *                                 of any submitted-but-not-yet-completed
 *                                 batches.
 *
 * Why two schedules instead of one:
 * Anthropic batches finish "within 24h, usually under 1h" (S-10 finding).
 * Polling once per 5 min while in-flight gives a sub-5-min latency on
 * results without burning poll calls when nothing is in flight (the
 * poll function itself short-circuits to a no-op when no rows have
 * batch_id IS NOT NULL).
 *
 * HMR safety: the registration pattern is the F-044 / S-11 contract —
 * a globalThis guard makes the registration idempotent across module
 * re-evaluations. Without this, every fast-refresh would queue another
 * cron task → multiple submits per night.
 *
 * Provider gate: when LLM_ENRICH_PROVIDER lacks batch (Ollama,
 * OpenRouter), the inner functions return null/void on first invocation.
 * The cron still registers — that way flipping the env at runtime via a
 * server restart picks up the new provider without code changes.
 *
 * Failure isolation: a tick that throws gets caught + logged, never
 * crashes the cron. Personal tool with single user — verbose console is
 * the operator's monitoring channel.
 */

import cron from "node-cron";
import { pollAllInFlightBatches, submitDailyBatch } from "./enrichment-batch";

/**
 * 01:00 IST daily. IST is UTC+5:30, so 01:00 IST = 19:30 UTC of the prior
 * UTC day. node-cron evaluates expressions against the host system clock;
 * Hetzner servers run UTC by default so this expression matches IST timing
 * regardless of where the host is.
 */
export const SUBMIT_CRON = "30 19 * * *";

/** Every 5 minutes. */
export const POLL_CRON = "*/5 * * * *";

declare global {
  // eslint-disable-next-line no-var
  var __brainBatchCron:
    | {
        registered: boolean;
        submitTask: ReturnType<typeof cron.schedule> | null;
        pollTask: ReturnType<typeof cron.schedule> | null;
      }
    | undefined;
}

function cronState() {
  if (!globalThis.__brainBatchCron) {
    globalThis.__brainBatchCron = {
      registered: false,
      submitTask: null,
      pollTask: null,
    };
  }
  return globalThis.__brainBatchCron;
}

/**
 * Idempotent: first call registers the two schedules, subsequent calls
 * are no-ops. Safe to call from instrumentation.ts on every Next.js
 * server boot AND across HMR re-evaluations in dev.
 */
export function startEnrichmentBatchCron(): void {
  const state = cronState();
  if (state.registered) {
    return;
  }
  state.registered = true;

  state.submitTask = cron.schedule(SUBMIT_CRON, runSubmitTick);
  state.pollTask = cron.schedule(POLL_CRON, runPollTick);

  console.log(
    `[batch-cron] scheduled submit='${SUBMIT_CRON}' (01:00 IST) poll='${POLL_CRON}' (every 5m)`,
  );
}

/**
 * Test-only: tear down the schedules so a subsequent start() call
 * registers fresh. Production code never calls this.
 */
export function stopEnrichmentBatchCron(): void {
  const state = cronState();
  if (state.submitTask) {
    // .destroy() removes the task from cron's internal registry; .stop()
    // alone leaves a dead task in cron.getTasks(). Tests rely on the
    // registry being clean post-teardown.
    state.submitTask.destroy();
    state.submitTask = null;
  }
  if (state.pollTask) {
    state.pollTask.destroy();
    state.pollTask = null;
  }
  state.registered = false;
}

async function runSubmitTick(): Promise<void> {
  try {
    const result = await submitDailyBatch();
    if (result === null) {
      console.log("[batch-cron] submit tick: nothing to submit");
      return;
    }
    console.log(
      `[batch-cron] submit tick: batch_id=${result.batch_id} count=${result.count}`,
    );
  } catch (err) {
    console.error(
      `[batch-cron] submit tick FAILED: ${(err as Error).message}`,
    );
  }
}

async function runPollTick(): Promise<void> {
  try {
    await pollAllInFlightBatches();
  } catch (err) {
    console.error(
      `[batch-cron] poll tick FAILED: ${(err as Error).message}`,
    );
  }
}
