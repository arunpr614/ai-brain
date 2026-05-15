/**
 * Enrichment batch loop — v0.6.0 Phase C-3.
 *
 * Two exported functions that together replace per-item realtime LLM calls
 * with a once-daily Anthropic Message Batch (50% cheaper than the realtime
 * `/v1/messages` endpoint).
 *
 *   submitDailyBatch()         claims up to BATCH_SIZE_CAP pending items,
 *                              submits one Anthropic batch, transitions
 *                              items + jobs to 'batched' with batch_id.
 *
 *   pollAllInFlightBatches()   polls every distinct in-flight batch_id;
 *                              writes succeeded results, rolls failed/
 *                              expired entries back to 'pending' (or to
 *                              'error' after MAX_ATTEMPTS).
 *
 * Provider gate: both functions early-return when the configured enrich
 * provider lacks `submitBatch` (Ollama, OpenRouter). The realtime path in
 * src/lib/queue/enrichment-worker.ts continues to handle those providers.
 *
 * Idempotency: every state transition uses a `WHERE id=? AND
 * enrichment_state=?` predicate so a second cron tick mid-flight is a
 * no-op rather than a corruption. Single-process Next.js means there's no
 * cross-process race in the v0.6.0 deployment.
 *
 * Cost: claude-haiku-4-5 batch pricing varies by model and isn't worth a
 * full pricing table at this checkpoint — recordLlmUsage rows write
 * cost_usd=0 for now. Cost calc lands in Phase D-1 alongside hard caps.
 */

import { getDb, type ItemRow } from "@/db/client";
import { attachTagToItem, clearAutoTagsForItem, upsertTag } from "@/db/tags";
import {
  ENRICHMENT_SYSTEM,
  enrichmentUserPrompt,
  validateEnrichment,
} from "@/lib/enrich/prompts";
import { getEnrichProvider } from "@/lib/llm/factory";
import type {
  AnthropicBatchPoll,
  AnthropicBatchRequest,
  AnthropicBatchResultEntry,
} from "@/lib/llm/anthropic";
import { composeEnrichmentTitle } from "@/lib/enrich/pipeline";
import type { LLMProvider } from "@/lib/llm/types";

/** Maximum items per submitted batch. Defensive cap; daily volume is single-digit. */
export const BATCH_SIZE_CAP = 100;

/** Mirrors enrichment-worker.ts MAX_ATTEMPTS. */
export const MAX_BATCH_ATTEMPTS = 3;

/** Items whose body is shorter than this fall through to realtime fast-path. */
const MIN_BODY_CHARS_FOR_BATCH = 200;

/** Submit-side return shape. null when nothing to submit OR provider lacks batch. */
export type SubmitOutcome =
  | { batch_id: string; count: number }
  | null;

interface PendingItemRow {
  id: string;
  source_type: ItemRow["source_type"];
  title: string;
  author: string | null;
  body: string;
  duration_seconds: number | null;
}

interface BatchedItemRow {
  id: string;
  body: string;
}

/**
 * Provider type-guard: narrows LLMProvider to the subset that implements
 * the Anthropic-style batch ops. Returning false short-circuits the whole
 * batch path so Ollama / OpenRouter deployments work unchanged.
 */
function supportsBatch(p: LLMProvider): p is LLMProvider & {
  submitBatch: (reqs: AnthropicBatchRequest[]) => Promise<{ batch_id: string }>;
  pollBatch: (id: string) => Promise<AnthropicBatchPoll>;
} {
  return typeof p.submitBatch === "function" && typeof p.pollBatch === "function";
}

/**
 * Claim + submit one batch worth of pending items.
 *
 * Flow:
 *   1. SELECT up to BATCH_SIZE_CAP rows where enrichment_state='pending'
 *      AND body length ≥ MIN_BODY_CHARS_FOR_BATCH (atomic read inside a
 *      transaction).
 *   2. Build AnthropicBatchRequest[] using the locked R-LLM-b prompt. The
 *      custom_id is the item id verbatim — poll() routes results back by
 *      this same id.
 *   3. await provider.submitBatch(...)  — only network call.
 *   4. On success: transition each claimed item to 'batched' with the real
 *      batch_id, and the matching enrichment_jobs row to 'batched'.
 *   5. On submit failure: leave items as 'pending' (no state transition
 *      happened in step 1 — we read but didn't write). Caller logs and
 *      retries on next cron tick.
 *
 * @param provider injectable for tests; defaults to getEnrichProvider()
 */
export async function submitDailyBatch(
  provider?: LLMProvider,
): Promise<SubmitOutcome> {
  const p = provider ?? getEnrichProvider();
  if (!supportsBatch(p)) return null;

  const db = getDb();

  const candidates = db
    .prepare(
      `SELECT id, source_type, title, author, body, duration_seconds
       FROM items
       WHERE enrichment_state = 'pending'
         AND length(body) >= ?
       ORDER BY captured_at ASC
       LIMIT ?`,
    )
    .all(MIN_BODY_CHARS_FOR_BATCH, BATCH_SIZE_CAP) as PendingItemRow[];

  if (candidates.length === 0) return null;

  const requests: AnthropicBatchRequest[] = candidates.map((row) => ({
    custom_id: row.id,
    system: ENRICHMENT_SYSTEM,
    prompt: enrichmentUserPrompt({
      source_type: row.source_type,
      title: composeEnrichmentTitle({
        source_type: row.source_type,
        title: row.title,
        author: row.author,
        duration_seconds: row.duration_seconds,
      }),
      body: row.body,
    }),
    num_predict: 1200,
    temperature: 0.3,
  }));

  const { batch_id } = await p.submitBatch(requests);

  const tx = db.transaction(() => {
    const updItem = db.prepare(
      `UPDATE items
       SET enrichment_state = 'batched', batch_id = ?
       WHERE id = ? AND enrichment_state = 'pending'`,
    );
    const updJob = db.prepare(
      `UPDATE enrichment_jobs
       SET state = 'batched'
       WHERE item_id = ? AND state = 'pending'`,
    );
    for (const row of candidates) {
      updItem.run(batch_id, row.id);
      updJob.run(row.id);
    }
  });
  tx();

  return { batch_id, count: candidates.length };
}

/**
 * Poll every in-flight batch and write results back. Safe to call
 * repeatedly — when nothing is in flight or every batch is still
 * processing, this is a series of cheap GETs and a no-op.
 *
 * Per-result handling:
 *   succeeded → parse + validate JSON → write summary/quotes/category/
 *               title + auto-tags → state='done', batch_id=NULL,
 *               jobs.state='done'.
 *   errored / canceled / expired → attempts++; if < MAX_BATCH_ATTEMPTS
 *               state='pending' (re-queued for next batch); else
 *               state='error' (terminal, last_error populated).
 *
 * Records llm_usage rows with provider='anthropic' (cost_usd=0 for now;
 * see module docstring).
 */
export async function pollAllInFlightBatches(provider?: LLMProvider): Promise<void> {
  const p = provider ?? getEnrichProvider();
  if (!supportsBatch(p)) return;

  const db = getDb();
  const inFlight = db
    .prepare(
      `SELECT DISTINCT batch_id
       FROM items
       WHERE enrichment_state = 'batched' AND batch_id IS NOT NULL`,
    )
    .all() as Array<{ batch_id: string }>;

  for (const { batch_id } of inFlight) {
    let poll: AnthropicBatchPoll;
    try {
      poll = (await p.pollBatch(batch_id)) as AnthropicBatchPoll;
    } catch (err) {
      console.warn(
        `[batch] poll failed for ${batch_id}: ${(err as Error).message}`,
      );
      continue;
    }
    if (poll.status !== "ended" || poll.results === null) {
      // Still processing or canceling — leave items as 'batched'.
      continue;
    }
    for (const entry of poll.results) {
      writeBatchResult(entry);
    }
  }
}

/**
 * Apply one batch result entry. Pulled out of pollAllInFlightBatches
 * mainly for readability; not exported because callers should always go
 * through the poll loop (which provides the batch_id context).
 */
function writeBatchResult(entry: AnthropicBatchResultEntry): void {
  const db = getDb();
  const item = db
    .prepare(
      `SELECT id, body FROM items
       WHERE id = ? AND enrichment_state = 'batched'`,
    )
    .get(entry.custom_id) as BatchedItemRow | undefined;
  if (!item) {
    // Item already transitioned (e.g. user manually re-enriched, or a
    // previous poll handled it). Idempotent no-op.
    return;
  }

  if (entry.type === "succeeded") {
    applySucceeded(item, entry);
    return;
  }
  applyFailure(entry.custom_id, entry.error ?? entry.type);
}

function applySucceeded(
  item: BatchedItemRow,
  entry: Extract<AnthropicBatchResultEntry, { type: "succeeded" }>,
): void {
  const parsed = parseJsonResponse(entry.response);
  if (parsed === null) {
    applyFailure(item.id, "succeeded but JSON parse failed");
    return;
  }
  const validated = validateEnrichment(parsed);
  if (!validated.ok) {
    applyFailure(item.id, `validation failed: ${validated.problems.join("; ")}`);
    return;
  }
  const output = validated.value;

  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE items
       SET summary = ?, quotes = ?, category = ?, title = ?,
           enrichment_state = 'done', enriched_at = unixepoch() * 1000,
           batch_id = NULL
       WHERE id = ? AND enrichment_state = 'batched'`,
    ).run(
      output.summary,
      JSON.stringify(output.quotes),
      output.category,
      output.title,
      item.id,
    );
    db.prepare(
      `UPDATE enrichment_jobs
       SET state = 'done', completed_at = unixepoch() * 1000, last_error = NULL
       WHERE item_id = ? AND state = 'batched'`,
    ).run(item.id);

    clearAutoTagsForItem(item.id);
    for (const name of output.tags) {
      const row = upsertTag(name, "auto");
      attachTagToItem(item.id, row.id);
    }

    db.prepare(
      `INSERT INTO llm_usage
        (provider, model, purpose, input_tokens, output_tokens, cost_usd, billing_month)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "anthropic",
      process.env.LLM_ENRICH_MODEL ?? "claude-haiku-4-5-20251001",
      "enrichment",
      entry.metrics.input_tokens,
      entry.metrics.output_tokens,
      0,
      billingMonth(),
    );
  });
  tx();
}

function applyFailure(itemId: string, reason: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    const job = db
      .prepare(
        `SELECT attempts FROM enrichment_jobs WHERE item_id = ? AND state = 'batched'`,
      )
      .get(itemId) as { attempts: number } | undefined;
    const attempts = (job?.attempts ?? 0) + 1;
    const terminal = attempts >= MAX_BATCH_ATTEMPTS;

    if (terminal) {
      db.prepare(
        `UPDATE items
         SET enrichment_state = 'error', batch_id = NULL
         WHERE id = ? AND enrichment_state = 'batched'`,
      ).run(itemId);
      db.prepare(
        `UPDATE enrichment_jobs
         SET state = 'error', last_error = ?, attempts = ?,
             completed_at = unixepoch() * 1000
         WHERE item_id = ? AND state = 'batched'`,
      ).run(reason, attempts, itemId);
    } else {
      db.prepare(
        `UPDATE items
         SET enrichment_state = 'pending', batch_id = NULL
         WHERE id = ? AND enrichment_state = 'batched'`,
      ).run(itemId);
      db.prepare(
        `UPDATE enrichment_jobs
         SET state = 'pending', last_error = ?, attempts = ?
         WHERE item_id = ? AND state = 'batched'`,
      ).run(reason, attempts, itemId);
    }
  });
  tx();
}

function parseJsonResponse(raw: string): unknown {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const body = fence ? fence[1] : trimmed;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function billingMonth(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
