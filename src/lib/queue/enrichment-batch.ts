/**
 * Enrichment batch loop — v0.6.0 Phase C-3.
 *
 * Two exported functions that together replace per-item realtime LLM calls
 * with a once-daily Anthropic Message Batch (50% cheaper than the realtime
 * `/v1/messages` endpoint).
 *
 *   submitDailyBatch()         claims up to BATCH_SIZE_CAP pending items,
 *                              submits one Anthropic batch, transitions
 *                              items + jobs to 'batched' with a local opaque
 *                              provider-batch/alias binding.
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

import { randomBytes } from "node:crypto";
import { getDb, type ItemRow } from "@/db/client";
import { getYouTubeBrowserSchemaCapability } from "@/db/schema-capabilities";
import { attachTagToItem, clearAutoTagsForItem, upsertTag } from "@/db/tags";
import { replaceTopicsForItem } from "@/db/topics";
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
import {
  assertItemBodyProcessingAllowed,
  ItemBodyProcessingBlockedError,
  resolveItemBodyProcessingGate,
} from "@/lib/processing/hold-gate";
import { classifyDeployment } from "@/lib/runtime/deployment";
import { resolveContentWorkerPlan } from "@/lib/startup/content-workers";
import {
  decodeBatchBinding,
  encodeBatchBinding,
  encodeBatchReservation,
  isValidProviderBatchId,
} from "./enrichment-batch-binding";

/** Maximum items per submitted batch. Defensive cap; daily volume is single-digit. */
export const BATCH_SIZE_CAP = 100;

/** Mirrors enrichment-worker.ts MAX_ATTEMPTS. */
export const MAX_BATCH_ATTEMPTS = 3;

/** Items whose body is shorter than this fall through to realtime fast-path. */
const MIN_BODY_CHARS_FOR_BATCH = 200;

/** Submit-side return shape. null when nothing to submit OR provider lacks batch. */
export type SubmitOutcome = { batch_id: string; count: number } | null;

export interface BatchSubmitDependencies {
  /** Deterministic race barrier used by containment tests. */
  readonly beforeDispatchCheck?: () => void;
  /** Test barrier after durable reservation but before provider contact. */
  readonly afterReservationCheck?: () => void;
}

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
  batch_id: string;
}

interface ReservedBatchItem {
  readonly itemId: string;
  readonly alias: string;
  readonly reservation: string;
}

interface DispatchableBatchItem extends ReservedBatchItem {
  readonly request: AnthropicBatchRequest;
}

class BatchReservationConflictError extends Error {
  constructor() {
    super("batch_reservation_conflict");
    this.name = "BatchReservationConflictError";
  }
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
  return (
    typeof p.submitBatch === "function" && typeof p.pollBatch === "function"
  );
}

/**
 * Batch submit/poll are ordinary background-worker operations only. This
 * consumes the same deployment/schema/mode plan used at startup and retains
 * the narrow pre-feature-schema legacy-standard compatibility bridge.
 */
export function isEnrichmentBatchStandardMode(
  db: ReturnType<typeof getDb> = getDb(),
): boolean {
  const plan = resolveContentWorkerPlan({
    deployment: classifyDeployment(),
    schemaCapability: getYouTubeBrowserSchemaCapability(db),
  });
  return (
    plan.starts.batchSubmit &&
    plan.starts.batchPoll &&
    (plan.effectiveMode === "standard" ||
      plan.effectiveMode === "legacy_default_standard")
  );
}

/**
 * Claim + submit one batch worth of pending items.
 *
 * Flow:
 *   1. SELECT up to BATCH_SIZE_CAP rows where enrichment_state='pending'
 *      AND body length ≥ MIN_BODY_CHARS_FOR_BATCH (atomic read inside a
 *      transaction).
 *   2. In one immediate transaction, move every still-authorized item/job to
 *      'batched' and persist a fresh random alias as an unresolved local
 *      dispatch reservation. The stable item id is never provider-visible.
 *   3. Re-read each exact reservation and build the locked R-LLM-b request.
 *   4. await provider.submitBatch(...)  — only network call.
 *   5. On success, reconcile the returned provider batch id into each exact
 *      reservation. A crash, timeout, invalid response, or post-dispatch
 *      authority change leaves the unresolved reservation quarantined: it is
 *      not pollable and, critically, is no longer eligible for resubmission.
 *
 * @param provider injectable for tests; defaults to getEnrichProvider()
 */
export async function submitDailyBatch(
  provider?: LLMProvider,
  dependencies: BatchSubmitDependencies = {},
): Promise<SubmitOutcome> {
  const db = getDb();
  if (!isEnrichmentBatchStandardMode(db)) return null;

  const p = provider ?? getEnrichProvider();
  if (!supportsBatch(p)) return null;

  const pending = db
    .prepare(
      `SELECT id, source_type, title, author, body, duration_seconds
       FROM items
       WHERE enrichment_state = 'pending'
         AND batch_id IS NULL
         AND length(body) >= ?
       ORDER BY captured_at ASC`,
    )
    .all(MIN_BODY_CHARS_FOR_BATCH) as PendingItemRow[];

  const candidates: PendingItemRow[] = [];
  for (const row of pending) {
    if (candidates.length >= BATCH_SIZE_CAP) break;
    if (!resolveItemBodyProcessingGate(row.id, db).allowed) continue;
    candidates.push(row);
  }

  if (candidates.length === 0) return null;

  dependencies.beforeDispatchCheck?.();
  if (!isEnrichmentBatchStandardMode(db)) return null;

  let reserved: ReservedBatchItem[];
  try {
    const reserve = db.transaction(() => {
      if (!isEnrichmentBatchStandardMode(db)) return [];
      const claimed: ReservedBatchItem[] = [];
      for (const candidate of candidates) {
        const row = db
          .prepare(
            `SELECT id
             FROM items
             WHERE id = ?
               AND enrichment_state = 'pending'
               AND batch_id IS NULL
               AND length(body) >= ?`,
          )
          .get(candidate.id, MIN_BODY_CHARS_FOR_BATCH) as
          { id: string } | undefined;
        if (!row || !resolveItemBodyProcessingGate(row.id, db).allowed) {
          continue;
        }
        assertItemBodyProcessingAllowed(row.id, db);
        const alias = newBatchItemAlias();
        const reservation = encodeBatchReservation(alias);
        const itemUpdate = db
          .prepare(
            `UPDATE items
             SET enrichment_state = 'batched', batch_id = ?
             WHERE id = ?
               AND enrichment_state = 'pending'
               AND batch_id IS NULL`,
          )
          .run(reservation, row.id);
        if (itemUpdate.changes === 0) continue;
        const jobUpdate = db
          .prepare(
            `UPDATE enrichment_jobs
             SET state = 'batched'
             WHERE item_id = ? AND state = 'pending'`,
          )
          .run(row.id);
        if (jobUpdate.changes !== 1) {
          throw new BatchReservationConflictError();
        }
        assertItemBodyProcessingAllowed(row.id, db);
        claimed.push({ itemId: row.id, alias, reservation });
      }
      if (!isEnrichmentBatchStandardMode(db)) {
        throw new BatchReservationConflictError();
      }
      return claimed;
    });
    reserved = reserve.immediate();
  } catch (error) {
    if (
      error instanceof ItemBodyProcessingBlockedError ||
      error instanceof BatchReservationConflictError
    ) {
      return null;
    }
    throw error;
  }
  if (reserved.length === 0) return null;

  dependencies.afterReservationCheck?.();
  if (!isEnrichmentBatchStandardMode(db)) return null;

  // The durable alias reservation precedes provider contact. Re-read the
  // exact reserved row and rebuild its prompt immediately before dispatch so
  // a superseding local transition cannot send a stale body.
  const dispatchable: DispatchableBatchItem[] = [];
  for (const reservation of reserved) {
    const row = db
      .prepare(
        `SELECT id, source_type, title, author, body, duration_seconds
         FROM items
         WHERE id = ?
           AND enrichment_state = 'batched'
           AND batch_id = ?
           AND length(body) >= ?`,
      )
      .get(
        reservation.itemId,
        reservation.reservation,
        MIN_BODY_CHARS_FOR_BATCH,
      ) as PendingItemRow | undefined;
    if (!row || !resolveItemBodyProcessingGate(row.id, db).allowed) continue;
    dispatchable.push({
      ...reservation,
      request: {
        custom_id: reservation.alias,
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
      },
    });
  }
  if (!isEnrichmentBatchStandardMode(db) || dispatchable.length === 0) {
    return null;
  }

  const submitted = await p.submitBatch(
    dispatchable.map(({ request }) => request),
  );
  const batch_id = submitted?.batch_id;
  if (!isValidProviderBatchId(batch_id)) {
    throw new Error("batch_submit_response_invalid");
  }

  let marked = 0;
  for (const reservation of dispatchable) {
    try {
      const changed = db
        .transaction(() => {
          if (!isEnrichmentBatchStandardMode(db)) return false;
          assertItemBodyProcessingAllowed(reservation.itemId, db);
          const itemUpdate = db
            .prepare(
              `UPDATE items
             SET batch_id = ?
             WHERE id = ?
               AND enrichment_state = 'batched'
               AND batch_id = ?`,
            )
            .run(
              encodeBatchBinding(batch_id, reservation.alias),
              reservation.itemId,
              reservation.reservation,
            );
          if (itemUpdate.changes === 0) return false;
          assertItemBodyProcessingAllowed(reservation.itemId, db);
          return true;
        })
        .immediate();
      if (changed) marked += 1;
    } catch (error) {
      if (error instanceof ItemBodyProcessingBlockedError) continue;
      throw error;
    }
  }

  return marked === 0 ? null : { batch_id, count: marked };
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
export async function pollAllInFlightBatches(
  provider?: LLMProvider,
): Promise<void> {
  const db = getDb();
  if (!isEnrichmentBatchStandardMode(db)) return;

  const p = provider ?? getEnrichProvider();
  if (!supportsBatch(p)) return;

  const batchedRows = db
    .prepare(
      `SELECT id, batch_id
       FROM items
       WHERE enrichment_state = 'batched' AND batch_id IS NOT NULL`,
    )
    .all() as Array<{ id: string; batch_id: string }>;
  const inFlight = [
    ...new Set(
      batchedRows
        .filter((row) => resolveItemBodyProcessingGate(row.id, db).allowed)
        .map((row) => decodeBatchBinding(row.batch_id).providerBatchId)
        .filter((batchId) => batchId.length > 0),
    ),
  ];

  for (const batch_id of inFlight) {
    if (!isEnrichmentBatchStandardMode(db)) return;
    if (!batchHasAllowedMember(batch_id, db)) continue;
    let poll: AnthropicBatchPoll;
    try {
      poll = (await p.pollBatch(batch_id)) as AnthropicBatchPoll;
    } catch {
      if (
        !isEnrichmentBatchStandardMode(db) ||
        !batchHasAllowedMember(batch_id, db)
      ) {
        continue;
      }
      console.warn("[batch] poll failed");
      continue;
    }
    if (poll.status !== "ended" || poll.results === null) {
      // Still processing or canceling — leave items as 'batched'.
      continue;
    }
    for (const entry of poll.results) {
      writeBatchResult(batch_id, entry);
    }
  }
}

/**
 * Apply one batch result entry. Pulled out of pollAllInFlightBatches
 * mainly for readability; not exported because callers should always go
 * through the poll loop (which provides the batch_id context).
 */
function writeBatchResult(
  batchId: string,
  entry: AnthropicBatchResultEntry,
): void {
  const db = getDb();
  if (!isEnrichmentBatchStandardMode(db)) return;
  const members = db
    .prepare(
      `SELECT id, batch_id FROM items
       WHERE batch_id IS NOT NULL AND enrichment_state = 'batched'`,
    )
    .all() as BatchedItemRow[];
  const item = members.find((member) => {
    const binding = decodeBatchBinding(member.batch_id);
    if (binding.providerBatchId !== batchId) return false;
    if (binding.alias !== null) return binding.alias === entry.custom_id;
    // Read-only compatibility for batches submitted before opaque aliases
    // shipped. New submissions never send this stable identifier.
    return member.id === entry.custom_id;
  });
  if (!item) {
    // Item already transitioned (e.g. user manually re-enriched, or a
    // previous poll handled it). Idempotent no-op.
    return;
  }
  if (!resolveItemBodyProcessingGate(item.id, db).allowed) return;

  if (entry.type === "succeeded") {
    applySucceeded(item, entry);
    return;
  }
  applyFailure(item, batchFailureCode(entry.type));
}

function applySucceeded(
  item: BatchedItemRow,
  entry: Extract<AnthropicBatchResultEntry, { type: "succeeded" }>,
): void {
  const parsed = parseJsonResponse(entry.response);
  if (parsed === null) {
    applyFailure(item, "batch_response_invalid");
    return;
  }
  const validated = validateEnrichment(parsed);
  if (!validated.ok) {
    applyFailure(item, "batch_response_invalid");
    return;
  }
  const output = validated.value;

  const db = getDb();
  const tx = db.transaction(() => {
    if (!isEnrichmentBatchStandardMode(db)) return false;
    assertItemBodyProcessingAllowed(item.id, db);
    const itemUpdate = db
      .prepare(
        `UPDATE items
         SET summary = ?, quotes = ?, category = ?, title = ?,
             enrichment_state = 'done', enriched_at = unixepoch() * 1000,
             batch_id = NULL
         WHERE id = ? AND enrichment_state = 'batched' AND batch_id = ?`,
      )
      .run(
        output.summary,
        JSON.stringify(output.quotes),
        output.category,
        output.title,
        item.id,
        item.batch_id,
      );
    if (itemUpdate.changes === 0) return false;
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
    replaceTopicsForItem(item.id, output.tags, {
      evidence: `Detected during enrichment for ${output.category}.`,
    });

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
    return true;
  });
  try {
    tx();
  } catch (error) {
    if (error instanceof ItemBodyProcessingBlockedError) return;
    throw error;
  }
}

type BatchFailureCode =
  | "batch_provider_error"
  | "batch_canceled"
  | "batch_expired"
  | "batch_response_invalid";

function batchFailureCode(type: string): BatchFailureCode {
  if (type === "canceled") return "batch_canceled";
  if (type === "expired") return "batch_expired";
  return "batch_provider_error";
}

function applyFailure(item: BatchedItemRow, reason: BatchFailureCode): void {
  const db = getDb();
  const tx = db.transaction(() => {
    if (!isEnrichmentBatchStandardMode(db)) return;
    assertItemBodyProcessingAllowed(item.id, db);
    const job = db
      .prepare(
        `SELECT attempts FROM enrichment_jobs WHERE item_id = ? AND state = 'batched'`,
      )
      .get(item.id) as { attempts: number } | undefined;
    const attempts = (job?.attempts ?? 0) + 1;
    const terminal = attempts >= MAX_BATCH_ATTEMPTS;

    if (terminal) {
      const itemUpdate = db
        .prepare(
          `UPDATE items
         SET enrichment_state = 'error', batch_id = NULL
         WHERE id = ? AND enrichment_state = 'batched' AND batch_id = ?`,
        )
        .run(item.id, item.batch_id);
      if (itemUpdate.changes === 0) return;
      db.prepare(
        `UPDATE enrichment_jobs
         SET state = 'error', last_error = ?, attempts = ?,
             completed_at = unixepoch() * 1000
         WHERE item_id = ? AND state = 'batched'`,
      ).run(reason, attempts, item.id);
    } else {
      const itemUpdate = db
        .prepare(
          `UPDATE items
         SET enrichment_state = 'pending', batch_id = NULL
         WHERE id = ? AND enrichment_state = 'batched' AND batch_id = ?`,
        )
        .run(item.id, item.batch_id);
      if (itemUpdate.changes === 0) return;
      db.prepare(
        `UPDATE enrichment_jobs
         SET state = 'pending', last_error = ?, attempts = ?
         WHERE item_id = ? AND state = 'batched'`,
      ).run(reason, attempts, item.id);
    }
  });
  try {
    tx();
  } catch (error) {
    if (error instanceof ItemBodyProcessingBlockedError) return;
    throw error;
  }
}

function batchHasAllowedMember(
  batchId: string,
  db: ReturnType<typeof getDb>,
): boolean {
  const members = db
    .prepare(
      `SELECT id, batch_id
       FROM items
       WHERE enrichment_state = 'batched' AND batch_id IS NOT NULL`,
    )
    .all() as BatchedItemRow[];
  return members.some(
    (member) =>
      decodeBatchBinding(member.batch_id).providerBatchId === batchId &&
      resolveItemBodyProcessingGate(member.id, db).allowed,
  );
}

/**
 * Provider-visible correlation token. It is fresh for every submitted item
 * and batch, so the provider cannot correlate repeated processing by a stable
 * Brain identifier.
 */
function newBatchItemAlias(): string {
  return randomBytes(32).toString("base64url");
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
