#!/usr/bin/env node
/**
 * Backfill embeddings for already-enriched items.
 *
 * Originally v0.4.0 F-012 / T-16 (Ollama-only). Rewritten in v0.6.0 S-13 to
 * route through the embed factory (getEmbedProvider), so it works against
 * any provider the EMBED_PROVIDER env var selects (ollama, gemini).
 *
 * What it does:
 *   - Finds every items.enrichment_state='done' row that has zero rows in
 *     chunks (default), OR every enriched row regardless (--reset, used after
 *     a provider/dimension swap).
 *   - With --reset: also wipes existing chunks + chunks_vec for those items
 *     before re-embedding, so stale vectors from a prior provider go away.
 *   - Runs embedItemWithRetry() per item (chunk → embed → write chunks_vec).
 *   - Idempotent + resumable in default mode (re-runs skip items that already
 *     have chunks). --reset is destructive on the chunks side; use carefully.
 *
 * Preflight:
 *   - Constructs the configured EmbedProvider via the factory.
 *   - Sends a one-string probe through .embed() to surface auth/model errors
 *     before touching any item rows.
 *
 * Flags:
 *   --limit N    only process first N items (default: all)
 *   --dry-run    list targets + counts, don't embed
 *   --reset      wipe existing chunks/chunks_vec for enriched items, then
 *                re-embed. REQUIRED after switching embed providers (e.g.,
 *                v0.6.0 S-13 nomic-embed-text → gemini-embedding-001@768).
 *
 * Run:
 *   EMBED_PROVIDER=gemini GEMINI_API_KEY=... \
 *     node --import tsx scripts/backfill-embeddings.mjs --reset
 *
 *   # Mac local dev (Ollama, original behavior):
 *   node --import tsx scripts/backfill-embeddings.mjs
 *
 * Notes:
 *   - Processes items serially. Embed providers are typically single-queue
 *     (Ollama GPU, Gemini per-request); parallel dispatch produces no real
 *     speedup and complicates error accounting.
 */

// Dynamic imports at call sites — matches scripts/smoke-v0.3.1.mjs pattern
// because tsx's top-level ESM import resolution on .ts files can drop
// class/type exports (observed on EmbedError).

const args = parseArgs(process.argv.slice(2));

async function preflight() {
  const { getEmbedProvider } = await import("../src/lib/embed/factory.ts");
  const { EmbedError } = await import("../src/lib/embed/client.ts");
  let provider;
  try {
    provider = getEmbedProvider();
  } catch (err) {
    console.error(
      `[backfill] Could not construct embed provider for EMBED_PROVIDER=${process.env.EMBED_PROVIDER ?? "ollama"}:`,
      err instanceof Error ? err.message : String(err),
    );
    process.exit(2);
  }
  const info = provider.getInfo();
  console.log(`[backfill] embed provider=${info.provider} model=${info.model} dim=${info.dim}`);
  try {
    const probe = await provider.embed(["probe"]);
    if (probe.length !== 1 || probe[0].length !== info.dim) {
      console.error(
        `[backfill] Probe embed shape mismatch: got ${probe.length}×${probe[0]?.length ?? 0}, expected 1×${info.dim}`,
      );
      process.exit(4);
    }
  } catch (err) {
    if (err instanceof EmbedError && err.code === "EMBED_MODEL_NOT_INSTALLED") {
      console.error(
        `[backfill] Embedding model missing. Hint: ${err.pullCommand ?? "ollama pull nomic-embed-text"}`,
      );
      process.exit(3);
    }
    console.error("[backfill] Preflight embed probe failed:", err instanceof Error ? err.message : String(err));
    process.exit(4);
  }
}

async function findTargets(limit, reset) {
  const { getDb } = await import("../src/db/client.ts");
  const db = getDb();
  // Default: only enriched items with no chunks (resumable backfill).
  // --reset: every enriched item, regardless of existing chunks.
  const predicate = reset ? "" : "AND c.id IS NULL";
  const rows = db
    .prepare(
      `SELECT i.id, i.title
         FROM items i
         LEFT JOIN chunks c ON c.item_id = i.id
        WHERE i.enrichment_state = 'done'
          ${predicate}
        GROUP BY i.id
        ORDER BY i.captured_at ASC
        ${limit ? `LIMIT ${Number(limit)}` : ""}`,
    )
    .all();
  return rows;
}

async function wipeChunksFor(itemIds) {
  const { getDb } = await import("../src/db/client.ts");
  const db = getDb();
  const wipe = db.transaction((ids) => {
    const delVec = db.prepare(
      `DELETE FROM chunks_vec WHERE rowid IN (SELECT rowid FROM chunks WHERE item_id = ?)`,
    );
    const delChunks = db.prepare(`DELETE FROM chunks WHERE item_id = ?`);
    let v = 0;
    let c = 0;
    for (const id of ids) {
      v += delVec.run(id).changes;
      c += delChunks.run(id).changes;
    }
    return { vec: v, chunks: c };
  });
  return wipe(itemIds);
}

function parseArgs(argv) {
  const out = { limit: null, dryRun: false, reset: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--reset") out.reset = true;
    else if (a === "--limit") {
      const n = Number(argv[++i]);
      if (!Number.isFinite(n) || n <= 0) {
        console.error(`[backfill] --limit requires a positive number, got: ${argv[i]}`);
        process.exit(1);
      }
      out.limit = n;
    } else if (a === "--help" || a === "-h") {
      console.log("Usage: backfill-embeddings.mjs [--limit N] [--dry-run] [--reset]");
      process.exit(0);
    }
  }
  return out;
}

async function main() {
  const t0 = Date.now();
  await preflight();

  const targets = await findTargets(args.limit, args.reset);
  if (targets.length === 0) {
    console.log(
      args.reset
        ? "[backfill] Nothing to do — no enriched items found."
        : "[backfill] Nothing to do — every enriched item already has chunks.",
    );
    return;
  }
  console.log(
    `[backfill] ${targets.length} item(s) to process${args.dryRun ? " (dry run)" : ""}${args.reset ? " (RESET — will wipe existing chunks)" : ""}`,
  );

  if (args.dryRun) {
    for (const t of targets.slice(0, 20)) console.log(`  - ${t.id}  ${t.title}`);
    if (targets.length > 20) console.log(`  ... +${targets.length - 20} more`);
    return;
  }

  if (args.reset) {
    const wiped = await wipeChunksFor(targets.map((t) => t.id));
    console.log(`[backfill] reset wiped ${wiped.chunks} chunk row(s) and ${wiped.vec} vec row(s)`);
  }

  const { embedItemWithRetry } = await import("../src/lib/embed/pipeline.ts");

  let ok = 0;
  let fail = 0;
  let chunks = 0;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const started = Date.now();
    const result = await embedItemWithRetry(t.id);
    const ms = Date.now() - started;
    if (result.ok) {
      ok++;
      chunks += result.chunk_count;
      console.log(
        `[${i + 1}/${targets.length}] ok   ${t.id}  ${result.chunk_count} chunk(s) · ${ms} ms · ${truncate(t.title, 40)}`,
      );
    } else {
      fail++;
      console.log(
        `[${i + 1}/${targets.length}] FAIL ${t.id}  ${result.code}: ${truncate(result.message, 60)}`,
      );
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.error(
    `\n[backfill] done in ${elapsed}s — ${ok} ok · ${fail} fail · ${chunks} chunk(s) embedded`,
  );
  if (fail > 0) process.exit(5);
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

await main();
