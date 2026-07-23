/**
 * T-5 tests — embedding pipeline.
 *
 * Tests run against an in-memory-ish tmp SQLite DB and a mocked embed fn;
 * no Ollama dependency. Ollama-integration smoke is a later task (T-17).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { TEST_DB_DIR } from "./pipeline.test.setup";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { countChunks } from "@/db/chunks";
import { embedItem, embedItemWithRetry } from "./pipeline";
import { EmbedError, EMBED_DIM } from "./client";
import { ERRORS_LOG_PATH } from "@/lib/errors/sink";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

function fakeEmbedOk(inputs: string[]): Promise<Float32Array[]> {
  return Promise.resolve(
    inputs.map((s) => {
      const v = new Float32Array(EMBED_DIM);
      let seed = 0;
      for (let i = 0; i < s.length; i++)
        seed = (seed * 31 + s.charCodeAt(i)) >>> 0;
      for (let i = 0; i < EMBED_DIM; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        v[i] = (seed / 2 ** 32) * 2 - 1;
      }
      return v;
    }),
  );
}

function installPartialFeatureSchema(): void {
  getDb().exec(`
    CREATE TABLE content_processing_holds (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      state TEXT NOT NULL
    )
  `);
}

function removePartialFeatureSchema(): void {
  getDb().exec("DROP TABLE content_processing_holds");
}

test("embedItem creates chunks + vectors in one transaction", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Embed OK",
    body: "Body paragraph one about growth loops.\n\nBody paragraph two about activation metrics.",
  });
  const result = await embedItem(item.id, { embedFn: fakeEmbedOk });
  assert.ok(result.ok);
  assert.equal(result.item_id, item.id);
  assert.ok(result.chunk_count >= 1);
  assert.equal(countChunks(item.id), result.chunk_count);

  const db = getDb();
  const vecCount = (
    db.prepare("SELECT COUNT(*) AS n FROM chunks_vec").get() as { n: number }
  ).n;
  assert.equal(vecCount, result.chunk_count);
});

test("embedItem is idempotent — second call returns existing chunk count without re-embedding", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Idempotent",
    body: "Paragraph content that will be chunked and embedded.",
  });
  let embedCalls = 0;
  const counting = (inputs: string[]) => {
    embedCalls++;
    return fakeEmbedOk(inputs);
  };
  const first = await embedItem(item.id, { embedFn: counting });
  assert.ok(first.ok);
  assert.equal(embedCalls, 1);

  const second = await embedItem(item.id, { embedFn: counting });
  assert.ok(second.ok);
  assert.equal(embedCalls, 1, "second call must not invoke embed()");
  assert.equal(second.chunk_count, first.chunk_count);
});

test("embedItem propagates EMBED_MODEL_NOT_INSTALLED as non-retriable failure", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Model missing",
    body: "Some body content.",
  });
  const failing = () =>
    Promise.reject(
      new EmbedError(
        "EMBED_MODEL_NOT_INSTALLED",
        'Embedding model "nomic-embed-text" is not installed. Run: ollama pull nomic-embed-text',
        { pullCommand: "ollama pull nomic-embed-text" },
      ),
    );
  const result = await embedItem(item.id, { embedFn: failing });
  assert.equal(result.ok, false);
  if (!result.ok && !result.blocked) {
    assert.equal(result.code, "EMBED_MODEL_NOT_INSTALLED");
    assert.equal(
      JSON.stringify(result).includes("ollama pull nomic-embed-text"),
      false,
    );
  }
  // No chunks written on failure.
  assert.equal(countChunks(item.id), 0);
});

test("embedItemWithRetry retries on connection errors then succeeds", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Retry then win",
    body: "Just a short body for the retry test.",
  });
  let calls = 0;
  const flaky = (inputs: string[]) => {
    calls++;
    if (calls < 2) {
      return Promise.reject(
        new EmbedError("EMBED_CONNECTION", "simulated connection failure"),
      );
    }
    return fakeEmbedOk(inputs);
  };
  const result = await embedItemWithRetry(item.id, { embedFn: flaky });
  assert.ok(result.ok, "retry should eventually succeed");
  if (result.ok) {
    assert.ok(result.chunk_count >= 1);
  }
});

test("embedItemWithRetry fails fast on EMBED_MODEL_NOT_INSTALLED — no retries", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Fail fast",
    body: "body",
  });
  let calls = 0;
  const missing = () => {
    calls++;
    return Promise.reject(
      new EmbedError("EMBED_MODEL_NOT_INSTALLED", "nope", {
        pullCommand: "ollama pull nomic-embed-text",
      }),
    );
  };
  const result = await embedItemWithRetry(item.id, { embedFn: missing });
  assert.equal(result.ok, false);
  assert.equal(calls, 1, "must not retry on non-retriable code");
});

test("retry-exhaust stores only a stable code and writes a content-free diagnostic", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Retry exhaust",
    body: "body for exhaust test",
  });
  // Flip enrichment_state to 'done' so the trigger enqueues a job.
  const db = getDb();
  db.prepare("UPDATE items SET enrichment_state = 'done' WHERE id = ?").run(
    item.id,
  );
  const pre = db
    .prepare("SELECT state FROM embedding_jobs WHERE item_id = ?")
    .get(item.id) as { state: string } | undefined;
  assert.equal(pre?.state, "pending");

  rmSync(ERRORS_LOG_PATH, { force: true });
  const privateSentinel = "PRIVATE_EMBED_FAILURE_SENTINEL";
  const alwaysDown = () =>
    Promise.reject(new EmbedError("EMBED_CONNECTION", privateSentinel));
  const result = await embedItemWithRetry(item.id, { embedFn: alwaysDown });
  assert.equal(result.ok, false);

  const post = db
    .prepare("SELECT state, last_error FROM embedding_jobs WHERE item_id = ?")
    .get(item.id) as { state: string; last_error: string };
  assert.equal(post.state, "error");
  assert.equal(post.last_error, "EMBED_CONNECTION");
  const diagnostic = readFileSync(ERRORS_LOG_PATH, "utf8");
  assert.equal(diagnostic.includes(privateSentinel), false);
  assert.equal(diagnostic.includes(item.id), false);
  assert.match(diagnostic, /"claimant":"generic_embedding"/);
  assert.match(diagnostic, /"outcome":"failed_closed"/);
});

test("incompatible schema is a content-free no-effect before embedding dispatch or writes", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Embedding incompatible",
    body: "Synthetic body that must not be embedded.",
  });
  const db = getDb();
  const vectorCountBefore = (
    db.prepare("SELECT COUNT(*) AS n FROM chunks_vec").get() as {
      n: number;
    }
  ).n;
  let providerCalls = 0;
  installPartialFeatureSchema();
  try {
    const result = await embedItem(item.id, {
      embedFn: async (inputs) => {
        providerCalls += 1;
        return fakeEmbedOk(inputs);
      },
    });
    assert.deepEqual(result, {
      ok: false,
      blocked: true,
      code: "processing_schema_incompatible",
    });
    assert.equal(providerCalls, 0);
    assert.equal(countChunks(item.id), 0);
    const vectorCountAfter = (
      db.prepare("SELECT COUNT(*) AS n FROM chunks_vec").get() as {
        n: number;
      }
    ).n;
    assert.equal(vectorCountAfter, vectorCountBefore);
  } finally {
    removePartialFeatureSchema();
  }
});

test("capability change after embedding dispatch prevents chunk and vector apply", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Embedding capability race",
    body: "Synthetic body that reaches the provider before containment changes.",
  });
  const db = getDb();
  const vectorCountBefore = (
    db.prepare("SELECT COUNT(*) AS n FROM chunks_vec").get() as {
      n: number;
    }
  ).n;
  let providerCalls = 0;
  try {
    const result = await embedItem(item.id, {
      embedFn: async (inputs) => {
        providerCalls += 1;
        installPartialFeatureSchema();
        return fakeEmbedOk(inputs);
      },
    });
    assert.deepEqual(result, {
      ok: false,
      blocked: true,
      code: "processing_schema_incompatible",
    });
    assert.equal(providerCalls, 1);
    assert.equal(countChunks(item.id), 0);
    const vectorCountAfter = (
      db.prepare("SELECT COUNT(*) AS n FROM chunks_vec").get() as {
        n: number;
      }
    ).n;
    assert.equal(vectorCountAfter, vectorCountBefore);
  } finally {
    removePartialFeatureSchema();
  }
});

test("authoritative deployment drift after embedding dispatch prevents apply", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Embedding deployment drift",
    body: "Synthetic body that reaches the provider before deployment authority changes.",
  });
  const db = getDb();
  const vectorCountBefore = (
    db.prepare("SELECT COUNT(*) AS n FROM chunks_vec").get() as { n: number }
  ).n;
  const originalMode = process.env.BRAIN_BACKGROUND_WORKERS_MODE;
  const originalDeployment = process.env.BRAIN_DEPLOYMENT_ENV;
  const originalProduction = process.env.BRAIN_PRODUCTION_RUNTIME;
  process.env.BRAIN_BACKGROUND_WORKERS_MODE = "standard";
  process.env.BRAIN_DEPLOYMENT_ENV = "test";
  process.env.BRAIN_PRODUCTION_RUNTIME = "0";
  const { isScheduledEnrichmentStandardMode } =
    await import("@/lib/queue/enrichment-worker");
  let providerCalls = 0;
  try {
    const result = await embedItem(item.id, {
      revalidateAuthority: () => isScheduledEnrichmentStandardMode(),
      embedFn: async (inputs) => {
        providerCalls += 1;
        process.env.BRAIN_DEPLOYMENT_ENV = "production";
        process.env.BRAIN_PRODUCTION_RUNTIME = "0";
        return fakeEmbedOk(inputs);
      },
    });
    assert.deepEqual(result, {
      ok: false,
      blocked: true,
      code: "processing_authority_changed",
    });
    assert.equal(providerCalls, 1);
    assert.equal(countChunks(item.id), 0);
    const vectorCountAfter = (
      db.prepare("SELECT COUNT(*) AS n FROM chunks_vec").get() as { n: number }
    ).n;
    assert.equal(vectorCountAfter, vectorCountBefore);
  } finally {
    restoreEnvironment("BRAIN_BACKGROUND_WORKERS_MODE", originalMode);
    restoreEnvironment("BRAIN_DEPLOYMENT_ENV", originalDeployment);
    restoreEnvironment("BRAIN_PRODUCTION_RUNTIME", originalProduction);
  }
});

test("retry wrapper treats a capability change during provider failure as no-effect without retry or job mutation", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Embedding retry containment",
    body: "Synthetic body for a provider failure race.",
  });
  const db = getDb();
  db.prepare("UPDATE items SET enrichment_state = 'done' WHERE id = ?").run(
    item.id,
  );
  const before = db
    .prepare(
      `SELECT state,attempts,last_error,completed_at
     FROM embedding_jobs
     WHERE item_id = ?`,
    )
    .get(item.id);
  const privateSentinel = "PRIVATE_EMBED_PROVIDER_ERROR_SENTINEL";
  let providerCalls = 0;
  try {
    const result = await embedItemWithRetry(item.id, {
      embedFn: async () => {
        providerCalls += 1;
        installPartialFeatureSchema();
        throw new EmbedError("EMBED_CONNECTION", privateSentinel);
      },
    });
    assert.deepEqual(result, {
      ok: false,
      blocked: true,
      code: "processing_schema_incompatible",
    });
    assert.equal(providerCalls, 1);
    assert.equal(JSON.stringify(result).includes(privateSentinel), false);
    assert.deepEqual(
      db
        .prepare(
          `SELECT state,attempts,last_error,completed_at
         FROM embedding_jobs
         WHERE item_id = ?`,
        )
        .get(item.id),
      before,
    );
    assert.equal(countChunks(item.id), 0);
  } finally {
    removePartialFeatureSchema();
  }
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
