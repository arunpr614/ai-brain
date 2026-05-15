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

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { getDb } from "@/db/client";
import { enrichItem } from "@/lib/enrich/pipeline";
import { embedItemWithRetry } from "@/lib/embed/pipeline";
import { getEnrichProvider } from "@/lib/llm/factory";

const POLL_INTERVAL_MS = 2_000;
const IDLE_INTERVAL_MS = 10_000; // when no work, back off
// 90s covers a normal enrichment run (measured 26.7s avg in R-LLM-b;
// worst case <1 min). A crashed worker's claim gets resurrected after
// this window. Single-worker personal tool — no need for longer bounds.
const STALE_CLAIM_MS = 90_000;
const MAX_ATTEMPTS = 3;
const OLLAMA_DOWN_BACKOFF_MS = 30_000;

// F-050 (self-critique A-10): lightweight append-only JSONL sink for
// enrichment failures so the user has a retrospective trail beyond the
// console log. Rotates at 5 MB by renaming the current file to .1 and
// dropping the previous .1 on the next rotation (two-file policy).
const ERRORS_LOG_PATH = resolve(process.cwd(), "data/errors.jsonl");
const ERRORS_LOG_MAX_BYTES = 5 * 1024 * 1024;

// F-044 (self-critique A-2): module-level flags do not survive Next's HMR
// re-evaluation — every fast-refresh would boot a second worker. A
// globalThis attribute persists across module reloads within the same
// Node process, which is the correct scope for "exactly one worker per
// process."
declare global {
  var __brainEnrichmentWorker:
    | { running: boolean; stopRequested: boolean }
    | undefined;
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

    const alive = await getEnrichProvider().isAlive();
    if (!alive) {
      console.warn(`[enrich] LLM provider unreachable; backing off ${OLLAMA_DOWN_BACKOFF_MS}ms`);
      await sleep(OLLAMA_DOWN_BACKOFF_MS);
      continue;
    }

    const job = claimNext();
    if (!job) {
      await sleep(IDLE_INTERVAL_MS);
      continue;
    }

    await runOne(job);
    await sleep(POLL_INTERVAL_MS);
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
  state: "pending" | "running" | "done" | "error";
  attempts: number;
}

function sweepStaleClaims(): void {
  const now = Date.now();
  const threshold = now - STALE_CLAIM_MS;
  const db = getDb();
  const info = db
    .prepare(
      `UPDATE enrichment_jobs
       SET state = 'pending', claimed_at = NULL
       WHERE state = 'running' AND claimed_at < ?`,
    )
    .run(threshold);
  if (info.changes > 0) {
    console.log(`[enrich] resurrected ${info.changes} stale claim(s)`);
  }
}

function claimNext(): JobRow | null {
  const db = getDb();
  const tx = db.transaction((): JobRow | null => {
    const row = db
      .prepare(
        `SELECT id, item_id, state, attempts
         FROM enrichment_jobs
         WHERE state = 'pending'
         ORDER BY created_at ASC
         LIMIT 1`,
      )
      .get() as JobRow | undefined;
    if (!row) return null;
    db.prepare(
      `UPDATE enrichment_jobs
       SET state = 'running', claimed_at = unixepoch() * 1000, attempts = attempts + 1
       WHERE id = ? AND state = 'pending'`,
    ).run(row.id);
    db.prepare(
      `UPDATE items SET enrichment_state = 'running' WHERE id = ?`,
    ).run(row.item_id);
    return { ...row, state: "running", attempts: row.attempts + 1 };
  });
  return tx();
}

async function runOne(job: JobRow): Promise<void> {
  console.log(`[enrich] job #${job.id} item=${job.item_id} attempt=${job.attempts}`);
  try {
    const result = await enrichItem(job.item_id);
    if (result.ok) {
      getDb()
        .prepare(
          `UPDATE enrichment_jobs
           SET state = 'done', completed_at = unixepoch() * 1000, last_error = NULL
           WHERE id = ?`,
        )
        .run(job.id);
      console.log(
        `[enrich] job #${job.id} DONE in ${result.wall_ms}ms (attempts: ${result.attempts})`,
      );
      // v0.4.0 SC-1: embedding follows enrichment in the same worker pass.
      // The enrichment-state trigger (migration 006) inserts the
      // embedding_jobs row when enrichment flips to 'done'; we drain it
      // inline so search/Ask see the new item without waiting for a
      // separate worker. Failure here is non-fatal for the user-visible
      // capture flow — embedItemWithRetry marks the job state='error' on
      // retry-exhaust and the next sweep can re-queue.
      const embedResult = await embedItemWithRetry(job.item_id);
      if (embedResult.ok) {
        console.log(
          `[embed] item=${job.item_id} chunks=${embedResult.chunk_count} duration=${embedResult.duration_ms}ms`,
        );
      } else {
        console.warn(
          `[embed] item=${job.item_id} FAILED ${embedResult.code}: ${embedResult.message}`,
        );
      }
      return;
    }
    handleFailure(job, result.error);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    handleFailure(job, message);
  }
}

function logFailureToJsonl(entry: {
  ts: number;
  item_id: string;
  attempt: number;
  error: string;
  terminal: boolean;
}): void {
  try {
    mkdirSync(dirname(ERRORS_LOG_PATH), { recursive: true });
    if (existsSync(ERRORS_LOG_PATH)) {
      const { size } = statSync(ERRORS_LOG_PATH);
      if (size >= ERRORS_LOG_MAX_BYTES) {
        renameSync(ERRORS_LOG_PATH, `${ERRORS_LOG_PATH}.1`);
      }
    }
    appendFileSync(ERRORS_LOG_PATH, `${JSON.stringify(entry)}\n`);
  } catch (err) {
    // Don't let a file-system problem cascade into worker failure.
    console.warn(`[enrich] errors.jsonl write failed: ${(err as Error).message}`);
  }
}

function handleFailure(job: JobRow, error: string): void {
  const db = getDb();
  const terminal = job.attempts >= MAX_ATTEMPTS;
  logFailureToJsonl({
    ts: Date.now(),
    item_id: job.item_id,
    attempt: job.attempts,
    error,
    terminal,
  });
  if (terminal) {
    db.prepare(
      `UPDATE enrichment_jobs
       SET state = 'error', last_error = ?, completed_at = unixepoch() * 1000
       WHERE id = ?`,
    ).run(error, job.id);
    db.prepare(
      `UPDATE items SET enrichment_state = 'error' WHERE id = ?`,
    ).run(job.item_id);
    console.error(
      `[enrich] job #${job.id} FAILED after ${job.attempts} attempts: ${error}`,
    );
    return;
  }
  db.prepare(
    `UPDATE enrichment_jobs
     SET state = 'pending', claimed_at = NULL, last_error = ?
     WHERE id = ?`,
  ).run(error, job.id);
  db.prepare(
    `UPDATE items SET enrichment_state = 'pending' WHERE id = ?`,
  ).run(job.item_id);
  console.warn(
    `[enrich] job #${job.id} retry ${job.attempts}/${MAX_ATTEMPTS}: ${error}`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
