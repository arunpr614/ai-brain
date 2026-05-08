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
import { enrichItem } from "@/lib/enrich/pipeline";
import { isOllamaAlive } from "@/lib/llm/ollama";

const POLL_INTERVAL_MS = 2_000;
const IDLE_INTERVAL_MS = 10_000; // when no work, back off
// 90s covers a normal enrichment run (measured 26.7s avg in R-LLM-b;
// worst case <1 min). A crashed worker's claim gets resurrected after
// this window. Single-worker personal tool — no need for longer bounds.
const STALE_CLAIM_MS = 90_000;
const MAX_ATTEMPTS = 3;
const OLLAMA_DOWN_BACKOFF_MS = 30_000;

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
  sweepStaleClaims();
  const state = workerState();

  while (!state.stopRequested) {
    const alive = await isOllamaAlive();
    if (!alive) {
      console.warn(`[enrich] ollama unreachable; backing off ${OLLAMA_DOWN_BACKOFF_MS}ms`);
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
      return;
    }
    handleFailure(job, result.error);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    handleFailure(job, message);
  }
}

function handleFailure(job: JobRow, error: string): void {
  const db = getDb();
  if (job.attempts >= MAX_ATTEMPTS) {
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
