/**
 * T-5 tests — embedding pipeline.
 *
 * Tests run against an in-memory-ish tmp SQLite DB and a mocked embed fn;
 * no Ollama dependency. Ollama-integration smoke is a later task (T-17).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./pipeline.test.setup";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { countChunks } from "@/db/chunks";
import { embedItem, embedItemWithRetry } from "./pipeline";
import { EmbedError, EMBED_DIM } from "./client";

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
      for (let i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) >>> 0;
      for (let i = 0; i < EMBED_DIM; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        v[i] = (seed / 2 ** 32) * 2 - 1;
      }
      return v;
    }),
  );
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
  if (!result.ok) {
    assert.equal(result.code, "EMBED_MODEL_NOT_INSTALLED");
    assert.match(result.message, /ollama pull nomic-embed-text/);
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

test("retry-exhaust marks embedding_jobs row state='error' and logs", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Retry exhaust",
    body: "body for exhaust test",
  });
  // Flip enrichment_state to 'done' so the trigger enqueues a job.
  const db = getDb();
  db.prepare("UPDATE items SET enrichment_state = 'done' WHERE id = ?").run(item.id);
  const pre = db
    .prepare("SELECT state FROM embedding_jobs WHERE item_id = ?")
    .get(item.id) as { state: string } | undefined;
  assert.equal(pre?.state, "pending");

  const alwaysDown = () =>
    Promise.reject(new EmbedError("EMBED_CONNECTION", "always down"));
  const result = await embedItemWithRetry(item.id, { embedFn: alwaysDown });
  assert.equal(result.ok, false);

  const post = db
    .prepare("SELECT state, last_error FROM embedding_jobs WHERE item_id = ?")
    .get(item.id) as { state: string; last_error: string };
  assert.equal(post.state, "error");
  assert.match(post.last_error, /always down/);
});
