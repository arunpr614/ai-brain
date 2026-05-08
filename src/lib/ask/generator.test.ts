import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./generator.test.setup";
import { getDb } from "@/db/client";
import {
  ollamaGenerator,
  splitAtPossibleCitation,
  filterCitations,
} from "./generator";
import type { RetrievedChunk } from "@/lib/retrieve";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

function stubChunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    chunk_id: "c1",
    item_id: "i1",
    item_title: "Stub",
    body: "body",
    similarity: 0.9,
    ...overrides,
  };
}

/**
 * Fake ollama stream: yields the given string in small slices so the
 * incremental [CITE:...] parser sees multi-chunk deliveries.
 */
function slicedStream(reply: string) {
  return async function* (opts: {
    onDone?: (m: { input_tokens: number; output_tokens: number; wall_ms: number }) => void;
  }): AsyncGenerator<string, void, void> {
    const step = 3;
    for (let i = 0; i < reply.length; i += step) {
      yield reply.slice(i, i + step);
    }
    opts.onDone?.({ input_tokens: 100, output_tokens: 50, wall_ms: 123 });
  };
}

test("splitAtPossibleCitation withholds partial [CITE: prefix", () => {
  assert.deepEqual(splitAtPossibleCitation("Growth loops compound ["), [
    "Growth loops compound ",
    "[",
  ]);
  assert.deepEqual(splitAtPossibleCitation("Growth [CITE:"), [
    "Growth ",
    "[CITE:",
  ]);
  assert.deepEqual(splitAtPossibleCitation("Growth [CITE:abc"), [
    "Growth ",
    "[CITE:abc",
  ]);
  // Complete marker => whole buffer is safe.
  assert.deepEqual(splitAtPossibleCitation("Growth [CITE:abc]"), [
    "Growth [CITE:abc]",
    "",
  ]);
  // `[` followed by non-CITE content is NOT a partial marker.
  assert.deepEqual(splitAtPossibleCitation("Growth [see this"), [
    "Growth [see this",
    "",
  ]);
});

test("filterCitations keeps valid IDs, drops orphans", () => {
  const valid = new Set(["c1", "c2"]);
  const out: string[] = [];
  for (const piece of filterCitations(
    "growth loops [CITE:c1] compound and content [CITE:bogus] too",
    valid,
    "t-1",
  )) {
    out.push(piece);
  }
  const joined = out.join("");
  assert.match(joined, /\[CITE:c1\]/);
  assert.doesNotMatch(joined, /bogus/);
  assert.doesNotMatch(joined, /\[CITE:bogus\]/);
});

test("ollamaGenerator strips orphan [CITE:bogus] across chunk boundaries", async () => {
  const reply =
    "Growth loops compound [CITE:c1] and content loops [CITE:bogus] as well.";
  const gen = ollamaGenerator({
    streamFn: slicedStream(reply) as never,
    skipUsageRecord: true,
  });
  const out: string[] = [];
  for await (const t of gen({
    question: "q",
    chunks: [stubChunk({ chunk_id: "c1" })],
  })) {
    out.push(t);
  }
  const joined = out.join("");
  assert.match(joined, /\[CITE:c1\]/, "valid citation survives");
  assert.doesNotMatch(joined, /bogus/, "orphan citation stripped");
  assert.match(joined, /compound \[CITE:c1\] and content loops {2}as well\./);
});

test("ollamaGenerator records llm_usage with purpose='ask'", async () => {
  // Ensure DB is initialised + clean slate for llm_usage.
  const db = getDb();
  db.prepare("DELETE FROM llm_usage").run();

  const gen = ollamaGenerator({
    streamFn: slicedStream("Simple reply.") as never,
    model: "test-model",
  });
  for await (const _ of gen({ question: "q", chunks: [] })) {
    void _;
  }
  const row = db
    .prepare(
      "SELECT provider, model, purpose, input_tokens, output_tokens FROM llm_usage WHERE purpose = 'ask' ORDER BY id DESC LIMIT 1",
    )
    .get() as
    | { provider: string; model: string; purpose: string; input_tokens: number; output_tokens: number }
    | undefined;
  assert.ok(row, "llm_usage row should exist");
  assert.equal(row!.provider, "ollama");
  assert.equal(row!.model, "test-model");
  assert.equal(row!.input_tokens, 100);
  assert.equal(row!.output_tokens, 50);
});

test("AbortSignal halts ollamaGenerator mid-stream", async () => {
  const controller = new AbortController();
  let emitted = 0;
  async function* slow(): AsyncGenerator<string> {
    for (let i = 0; i < 20; i++) {
      emitted++;
      if (i === 3) controller.abort();
      yield `word${i} `;
    }
  }
  const gen = ollamaGenerator({
    streamFn: (() => slow()) as never,
    skipUsageRecord: true,
  });
  const out: string[] = [];
  for await (const t of gen({
    question: "q",
    chunks: [],
    signal: controller.signal,
  })) {
    out.push(t);
  }
  assert.ok(emitted <= 6, `generator should stop fast after abort, got ${emitted}`);
  assert.ok(out.join("").length < 100, "small amount of text emitted");
});
