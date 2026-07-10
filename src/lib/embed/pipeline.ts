/**
 * Embedding pipeline — v0.4.0 F-013.
 *
 * Orchestrates: chunkBody → embed (batched) → chunks + chunks_rowid +
 * chunks_vec write, all inside a single transaction per item so a crash
 * mid-embed leaves the item un-chunked (re-queueable) rather than half-done.
 *
 * Retry: 3 attempts with exponential backoff (200ms, 800ms, 3200ms).
 * Non-retriable failures (model-missing, invalid response) fail fast.
 *
 * On retry-exhaust:
 *   - marks embedding_jobs row state='error', last_error set
 *   - appends to errors.jsonl via shared sink
 *   - sweepStaleClaims() re-queues after 10 min (mirrors F-045 for enrich)
 */
import { getDb } from "@/db/client";
import { insertChunkWithRowid } from "@/db/chunks";
import { chunkBody } from "@/lib/chunk";
import { EmbedError, EMBED_DIM } from "./client";
import { getEmbedProvider } from "./factory";
import { logError } from "@/lib/errors/sink";

const BATCH_SIZE = 16;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [200, 800, 3200];

export type EmbedResult =
  | { ok: true; item_id: string; chunk_count: number; duration_ms: number }
  | { ok: false; item_id: string; code: string; message: string; attempts: number };

/** Structural alias so tests can inject a fake without importing the
 * provider type. Matches EmbedProvider.embed's call shape. */
type EmbedFn = (inputs: string[]) => Promise<Float32Array[]>;

interface EmbedItemOptions {
  /** Inject embed fn for tests. Defaults to factory-resolved provider. */
  embedFn?: EmbedFn;
  /** Override chunker opts (for tests). */
  chunkOpts?: Parameters<typeof chunkBody>[1];
  /** Attempt number for retry accounting (default 1). */
  attempt?: number;
}

/**
 * Embed a single item end-to-end. Returns a discriminated result; never
 * throws for expected failure modes.
 *
 * Idempotent: if the item already has chunks, returns ok with the existing
 * count and does not re-embed.
 */
export async function embedItem(
  item_id: string,
  opts: EmbedItemOptions = {},
): Promise<EmbedResult> {
  const started = Date.now();
  const db = getDb();
  const item = db
    .prepare("SELECT id, title, body, summary, enriched_at FROM items WHERE id = ?")
    .get(item_id) as {
      id: string;
      title: string;
      body: string;
      summary: string | null;
      enriched_at: number | null;
    } | undefined;

  if (!item) {
    return failed(item_id, "EMBED_ITEM_NOT_FOUND", `Item ${item_id} not found`, opts.attempt ?? 1);
  }

  const existing = db
    .prepare(
      `SELECT COUNT(*) AS n FROM chunks
       WHERE item_id = ? AND source_kind IN ('legacy_item_context', 'original_content')`,
    )
    .get(item_id) as { n: number };
  if (existing.n > 0) {
    return { ok: true, item_id, chunk_count: existing.n, duration_ms: 0 };
  }

  // New indexes keep captured source and AI summary separate so citations can
  // state where a claim came from. Existing mixed chunks remain explicitly
  // labeled legacy_item_context by migration 023.
  const sourceChunks = [
    ...chunkBody(`${item.title}\n\n${item.body}`, opts.chunkOpts).map((chunk) => ({
      ...chunk,
      source_kind: "original_content" as const,
      source_version: 0,
    })),
    ...(item.summary
      ? chunkBody(`${item.title}\n\n${item.summary}`, opts.chunkOpts).map((chunk) => ({
          ...chunk,
          source_kind: "ai_summary" as const,
          source_version: item.enriched_at ?? 1,
        }))
      : []),
  ];
  if (sourceChunks.length === 0) {
    return { ok: true, item_id, chunk_count: 0, duration_ms: Date.now() - started };
  }

  const embedFn: EmbedFn = opts.embedFn ?? ((inputs) => getEmbedProvider().embed(inputs));
  const vectors: Float32Array[] = [];
  for (let i = 0; i < sourceChunks.length; i += BATCH_SIZE) {
    const batch = sourceChunks.slice(i, i + BATCH_SIZE).map((c) => c.body);
    let got: Float32Array[];
    try {
      got = await embedFn(batch);
    } catch (err) {
      if (err instanceof EmbedError && err.code === "EMBED_MODEL_NOT_INSTALLED") {
        // Non-retriable. Fail fast with the exact pull command in the message.
        return failed(item_id, err.code, err.message, opts.attempt ?? 1);
      }
      if (err instanceof EmbedError && err.code === "EMBED_INVALID_RESPONSE") {
        return failed(item_id, err.code, err.message, opts.attempt ?? 1);
      }
      // Retriable: EMBED_CONNECTION, EMBED_HTTP
      const code = err instanceof EmbedError ? err.code : "EMBED_UNKNOWN";
      const message = err instanceof Error ? err.message : String(err);
      return failed(item_id, code, message, opts.attempt ?? 1);
    }
    if (got.some((v) => v.length !== EMBED_DIM)) {
      return failed(
        item_id,
        "EMBED_INVALID_RESPONSE",
        `Expected ${EMBED_DIM}-dim vectors`,
        opts.attempt ?? 1,
      );
    }
    vectors.push(...got);
  }

  // Single transaction: chunks + chunks_rowid + chunks_vec.
  const tx = db.transaction(() => {
    const insertVec = db.prepare(
      "INSERT INTO chunks_vec(rowid, embedding) VALUES (?, ?)",
    );
    for (let i = 0; i < sourceChunks.length; i++) {
      const { rowid } = insertChunkWithRowid({
        item_id,
        source_kind: sourceChunks[i].source_kind,
        source_version: sourceChunks[i].source_version,
        idx: sourceChunks[i].idx,
        body: sourceChunks[i].body,
        token_count: sourceChunks[i].token_count,
      });
      insertVec.run(rowid, Buffer.from(vectors[i].buffer));
    }
  });
  tx();

  return {
    ok: true,
    item_id,
    chunk_count: sourceChunks.length,
    duration_ms: Date.now() - started,
  };
}

/**
 * Public entry called by the embedding worker. Loops the retry budget,
 * logging each transient failure. On retry-exhaust, marks the job state
 * and logs to errors.jsonl (P-3 + P-4).
 */
export async function embedItemWithRetry(
  item_id: string,
  opts: Omit<EmbedItemOptions, "attempt"> = {},
): Promise<EmbedResult> {
  let last: EmbedResult | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await embedItem(item_id, { ...opts, attempt });
    if (result.ok) {
      getDb()
        .prepare(
          `UPDATE embedding_jobs
             SET state = 'done', completed_at = unixepoch() * 1000, last_error = NULL
             WHERE item_id = ? AND state != 'done'`,
        )
        .run(item_id);
      return result;
    }
    last = result;

    // Non-retriable fail-fast codes — no further attempts.
    if (
      result.code === "EMBED_MODEL_NOT_INSTALLED" ||
      result.code === "EMBED_INVALID_RESPONSE" ||
      result.code === "EMBED_ITEM_NOT_FOUND"
    ) {
      break;
    }

    if (attempt < MAX_ATTEMPTS) {
      const ms = BACKOFF_MS[attempt - 1] ?? 3200;
      await new Promise((r) => setTimeout(r, ms));
    }
  }

  // Reached only on failure.
  if (last && !last.ok) {
    logError({
      type: "embed_failed",
      ts: Date.now(),
      item_id,
      code: last.code,
      message: last.message,
      attempts: last.attempts,
      terminal: true,
    });
    const db = getDb();
    db.prepare(
      `UPDATE embedding_jobs
         SET state = 'error', last_error = ?, attempts = ?
         WHERE item_id = ? AND state != 'done'`,
    ).run(last.message, last.attempts, item_id);
  }
  return last ?? failed(item_id, "EMBED_UNKNOWN", "no attempts made", 0);
}

function failed(
  item_id: string,
  code: string,
  message: string,
  attempts: number,
): EmbedResult {
  return { ok: false, item_id, code, message, attempts };
}
