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
import {
  assertStandaloneContentProcessingAllowed,
  StandaloneContentProcessingBlockedError,
} from "./lib/content-processing-containment.mjs";

const args = parseArgs(process.argv.slice(2));

async function preflight() {
  const { getEmbedProvider } = await import("../src/lib/embed/factory.ts");
  const { EmbedError } = await import("../src/lib/embed/client.ts");
  let provider;
  try {
    provider = getEmbedProvider();
  } catch {
    console.error("[backfill] provider_configuration_invalid");
    process.exit(2);
  }
  const expectedDimension = provider.getInfo().dim;
  try {
    const probe = await provider.embed(["probe"]);
    if (probe.length !== 1 || probe[0]?.length !== expectedDimension) {
      console.error("[backfill] provider_response_invalid");
      process.exit(4);
    }
  } catch (err) {
    if (err instanceof EmbedError && err.code === "EMBED_MODEL_NOT_INSTALLED") {
      console.error("[backfill] provider_model_unavailable");
      process.exit(3);
    }
    console.error("[backfill] provider_preflight_failed");
    process.exit(4);
  }
}

function findTargets(db, limit, reset) {
  // Default: only enriched items with no chunks (resumable backfill).
  // --reset: every enriched item, regardless of existing chunks.
  const predicate = reset ? "" : "AND c.id IS NULL";
  const rows = db
    .prepare(
      `SELECT i.id
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

function wipeChunksFor(db, itemIds) {
  const wipe = db.transaction((ids) => {
    assertStandaloneContentProcessingAllowed(db);
    const delVec = db.prepare(
      `DELETE FROM chunks_vec WHERE rowid IN (SELECT rowid FROM chunks WHERE item_id = ?)`,
    );
    const delChunks = db.prepare(`DELETE FROM chunks WHERE item_id = ?`);
    for (const id of ids) {
      assertStandaloneContentProcessingAllowed(db);
      delVec.run(id);
      delChunks.run(id);
    }
  });
  wipe(itemIds);
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
        console.error("[backfill] invalid_limit");
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
  const { getDb } = await import("../src/db/client.ts");
  const db = getDb();
  assertStandaloneContentProcessingAllowed(db);

  const targets = findTargets(db, args.limit, args.reset);
  if (args.dryRun) {
    console.log("[backfill] dry_run_no_provider=true");
    logSummary(targets.length, 0, 0);
    return;
  }
  if (targets.length === 0) {
    logSummary(0, 0, 0);
    return;
  }

  assertStandaloneContentProcessingAllowed(db);
  await preflight();

  if (args.reset) {
    wipeChunksFor(db, targets.map((target) => target.id));
    console.log("[backfill] reset_complete");
  }

  const { embedItemWithRetry } = await import("../src/lib/embed/pipeline.ts");

  let ok = 0;
  let fail = 0;
  for (const target of targets) {
    assertStandaloneContentProcessingAllowed(db);
    const result = await embedItemWithRetry(target.id);
    if (result.ok) {
      ok++;
    } else if (result.blocked === true) {
      throw new StandaloneContentProcessingBlockedError(result.code);
    } else {
      fail++;
    }
  }

  logSummary(targets.length, ok, fail);
  if (fail > 0) process.exit(5);
}

function logSummary(targets, ok, failed) {
  console.log(`[backfill] summary targets=${targets} ok=${ok} failed=${failed}`);
}

try {
  await main();
} catch (error) {
  if (error instanceof StandaloneContentProcessingBlockedError) {
    console.error(`[backfill] blocked code=${error.code}`);
    process.exitCode = 6;
  } else if (
    error &&
    typeof error === "object" &&
    error.code === "processing_schema_incompatible"
  ) {
    console.error("[backfill] blocked code=processing_schema_incompatible");
    process.exitCode = 6;
  } else {
    console.error("[backfill] failed code=backfill_failed");
    process.exitCode = 1;
  }
}
