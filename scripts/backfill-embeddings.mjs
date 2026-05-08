#!/usr/bin/env node
/**
 * Backfill embeddings for already-enriched items — v0.4.0 F-012 / T-16.
 *
 * What it does:
 *   - Finds every items.enrichment_state='done' row that has zero rows in chunks.
 *   - Runs embedItemWithRetry() per item (chunk → embed → write chunks_vec).
 *   - Idempotent + resumable: the "no chunks" predicate means a second run
 *     skips items already processed. Kill + restart anytime.
 *   - Logs per-item pass/fail to stdout + writes a summary to stderr.
 *
 * Preflight:
 *   - Checks isOllamaAlive(); bails with exit 2 + `ollama serve` hint if down.
 *   - Checks the embed model is available via a one-string probe; bails with
 *     exit 3 + the exact `ollama pull nomic-embed-text` command if missing.
 *
 * Flags:
 *   --limit N    only process first N items (default: all)
 *   --dry-run    list targets + counts, don't embed
 *
 * Run:
 *   node --import tsx scripts/backfill-embeddings.mjs
 *   node --import tsx scripts/backfill-embeddings.mjs --limit 10 --dry-run
 *
 * Notes:
 *   - Processes items serially. Ollama embed() is single-GPU-queue; parallel
 *     dispatch produces no real speedup and complicates error accounting.
 *   - For a typical ~1k-item library on M1 Pro, budget ~5 minutes.
 */

// Dynamic imports at call sites — matches scripts/smoke-v0.3.1.mjs pattern
// because tsx's top-level ESM import resolution on .ts files can drop
// class/type exports (observed on EmbedError).

const args = parseArgs(process.argv.slice(2));

async function preflight() {
  const { isOllamaAlive } = await import("../src/lib/llm/ollama.ts");
  const { embed, EmbedError } = await import("../src/lib/embed/client.ts");
  if (!(await isOllamaAlive())) {
    console.error(
      "[backfill] Ollama not reachable at http://localhost:11434. Start it with: ollama serve",
    );
    process.exit(2);
  }
  try {
    // A minimal-cost probe that surfaces EMBED_MODEL_NOT_INSTALLED cleanly.
    await embed(["probe"]);
  } catch (err) {
    if (err instanceof EmbedError && err.code === "EMBED_MODEL_NOT_INSTALLED") {
      console.error(
        `[backfill] Embedding model missing. Run: ${err.pullCommand ?? "ollama pull nomic-embed-text"}`,
      );
      process.exit(3);
    }
    console.error("[backfill] Preflight embed probe failed:", err instanceof Error ? err.message : String(err));
    process.exit(4);
  }
}

async function findTargets(limit) {
  const { getDb } = await import("../src/db/client.ts");
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT i.id, i.title
         FROM items i
         LEFT JOIN chunks c ON c.item_id = i.id
        WHERE i.enrichment_state = 'done'
          AND c.id IS NULL
        GROUP BY i.id
        ORDER BY i.captured_at ASC
        ${limit ? `LIMIT ${Number(limit)}` : ""}`,
    )
    .all();
  return rows;
}

function parseArgs(argv) {
  const out = { limit: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--limit") {
      const n = Number(argv[++i]);
      if (!Number.isFinite(n) || n <= 0) {
        console.error(`[backfill] --limit requires a positive number, got: ${argv[i]}`);
        process.exit(1);
      }
      out.limit = n;
    } else if (a === "--help" || a === "-h") {
      console.log("Usage: backfill-embeddings.mjs [--limit N] [--dry-run]");
      process.exit(0);
    }
  }
  return out;
}

async function main() {
  const t0 = Date.now();
  await preflight();

  const targets = await findTargets(args.limit);
  if (targets.length === 0) {
    console.log("[backfill] Nothing to do — every enriched item already has chunks.");
    return;
  }
  console.log(`[backfill] ${targets.length} item(s) to process${args.dryRun ? " (dry run)" : ""}`);

  if (args.dryRun) {
    for (const t of targets.slice(0, 20)) console.log(`  - ${t.id}  ${t.title}`);
    if (targets.length > 20) console.log(`  ... +${targets.length - 20} more`);
    return;
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
