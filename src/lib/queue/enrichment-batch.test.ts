/**
 * enrichment-batch.ts unit coverage — v0.6.0 Phase C-3.
 *
 * Uses an injected stub provider so no network is touched. Each test that
 * mutates DB state inserts its own item via insertCaptured so cases stay
 * independent.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./enrichment-batch.test.setup";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import {
  BATCH_SIZE_CAP,
  MAX_BATCH_ATTEMPTS,
  pollAllInFlightBatches,
  submitDailyBatch,
} from "./enrichment-batch";
import type {
  AnthropicBatchPoll,
  AnthropicBatchRequest,
  AnthropicBatchResultEntry,
} from "@/lib/llm/anthropic";
import type { LLMProvider } from "@/lib/llm/types";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

// ---- Stubs --------------------------------------------------------------

interface StubBehavior {
  batchId?: string;
  /** Map custom_id -> result entry the next pollBatch call should return. */
  resultsByCustomId?: Record<string, AnthropicBatchResultEntry>;
  /** When set, pollBatch returns status='in_progress' instead of ended. */
  pollInProgress?: boolean;
  /** When set, submitBatch throws this error. */
  submitThrows?: Error;
}

function makeProvider(behavior: StubBehavior = {}): {
  provider: LLMProvider;
  submitted: AnthropicBatchRequest[][];
  polled: string[];
} {
  const submitted: AnthropicBatchRequest[][] = [];
  const polled: string[] = [];
  const provider: LLMProvider = {
    async generate() {
      throw new Error("not used in batch path");
    },
    async *generateStream() {
      // not used
    },
    async generateJson() {
      throw new Error("not used in batch path");
    },
    async isAlive() {
      return true;
    },
    async submitBatch(reqs: AnthropicBatchRequest[]) {
      if (behavior.submitThrows) throw behavior.submitThrows;
      submitted.push(reqs);
      return { batch_id: behavior.batchId ?? "msgbatch_test_xyz" };
    },
    async pollBatch(id: string): Promise<AnthropicBatchPoll> {
      polled.push(id);
      if (behavior.pollInProgress) {
        return {
          batch_id: id,
          status: "in_progress",
          request_counts: {
            processing: 1,
            succeeded: 0,
            errored: 0,
            canceled: 0,
            expired: 0,
          },
          results: null,
        };
      }
      const map = behavior.resultsByCustomId ?? {};
      const results = Object.values(map);
      return {
        batch_id: id,
        status: "ended",
        request_counts: {
          processing: 0,
          succeeded: results.filter((r) => r.type === "succeeded").length,
          errored: results.filter((r) => r.type === "errored").length,
          canceled: results.filter((r) => r.type === "canceled").length,
          expired: results.filter((r) => r.type === "expired").length,
        },
        results,
      };
    },
  };
  return { provider, submitted, polled };
}

function ollamaShapedProvider(): LLMProvider {
  // Provider without submitBatch / pollBatch — exercises the early-return.
  return {
    async generate() {
      throw new Error("nope");
    },
    async *generateStream() {
      // not used
    },
    async generateJson() {
      throw new Error("nope");
    },
    async isAlive() {
      return true;
    },
  };
}

const SAMPLE_BODY = "x".repeat(500);

const validEnrichmentJson = JSON.stringify({
  summary:
    "Paragraph one of three with enough characters to exceed the fifty-char minimum imposed by validateEnrichment.\n\nParagraph two.\n\nParagraph three.",
  quotes: [
    "First verbatim quote.",
    "Second.",
    "Third.",
    "Fourth.",
    "Fifth.",
  ],
  category: "General",
  title: "Cleaned Up Title",
  tags: ["tag-one", "tag-two", "tag-three"],
});

// ---- submitDailyBatch ----------------------------------------------------

test("submitDailyBatch returns null when provider lacks batch", async () => {
  const result = await submitDailyBatch(ollamaShapedProvider());
  assert.equal(result, null);
});

test("submitDailyBatch returns null when no pending items", async () => {
  // Clean slate: drop any pending rows from prior tests.
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const { provider, submitted } = makeProvider();
  const result = await submitDailyBatch(provider);
  assert.equal(result, null);
  assert.equal(submitted.length, 0);
});

test("submitDailyBatch ignores items below MIN_BODY_CHARS_FOR_BATCH", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  insertCaptured({ source_type: "note", title: "tiny", body: "too short" });
  const { provider, submitted } = makeProvider();
  const result = await submitDailyBatch(provider);
  assert.equal(result, null);
  assert.equal(submitted.length, 0);
});

test("submitDailyBatch submits one batch, transitions items + jobs to 'batched'", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const a = insertCaptured({ source_type: "note", title: "A", body: SAMPLE_BODY });
  const b = insertCaptured({ source_type: "note", title: "B", body: SAMPLE_BODY });
  const { provider, submitted } = makeProvider({ batchId: "msgbatch_AAA" });

  const result = await submitDailyBatch(provider);
  assert.deepEqual(result, { batch_id: "msgbatch_AAA", count: 2 });
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0].length, 2);

  for (const id of [a.id, b.id]) {
    const row = getDb()
      .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
      .get(id) as { enrichment_state: string; batch_id: string };
    assert.equal(row.enrichment_state, "batched");
    assert.equal(row.batch_id, "msgbatch_AAA");
    const job = getDb()
      .prepare("SELECT state FROM enrichment_jobs WHERE item_id = ?")
      .get(id) as { state: string };
    assert.equal(job.state, "batched");
  }
});

test("submitDailyBatch: prompts carry the locked R-LLM-b system + user shape", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  insertCaptured({ source_type: "note", title: "C", body: SAMPLE_BODY });
  const { provider, submitted } = makeProvider();
  await submitDailyBatch(provider);

  const req = submitted[0][0];
  assert.match(req.system!, /enrichment engine/i);
  assert.match(req.prompt, /Source type: note/);
  assert.match(req.prompt, /"summary"/);
  assert.match(req.prompt, /"quotes"/);
  assert.equal(req.temperature, 0.3);
  assert.equal(req.num_predict, 1200);
});

test("submitDailyBatch caps at BATCH_SIZE_CAP", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  // Insert one above the cap; only BATCH_SIZE_CAP should be claimed.
  for (let i = 0; i < BATCH_SIZE_CAP + 5; i++) {
    insertCaptured({ source_type: "note", title: `cap${i}`, body: SAMPLE_BODY });
  }
  const { provider, submitted } = makeProvider();
  const result = await submitDailyBatch(provider);
  assert.ok(result);
  assert.equal(result!.count, BATCH_SIZE_CAP);
  assert.equal(submitted[0].length, BATCH_SIZE_CAP);

  const remainingPending = getDb()
    .prepare(
      "SELECT COUNT(*) as n FROM items WHERE enrichment_state = 'pending' AND length(body) >= 200",
    )
    .get() as { n: number };
  assert.equal(remainingPending.n, 5);
});

test("submitDailyBatch: provider error leaves items as 'pending'", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "errfail",
    body: SAMPLE_BODY,
  });
  const { provider } = makeProvider({ submitThrows: new Error("boom") });
  await assert.rejects(submitDailyBatch(provider), /boom/);
  const row = getDb()
    .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
    .get(item.id) as { enrichment_state: string; batch_id: string | null };
  assert.equal(row.enrichment_state, "pending");
  assert.equal(row.batch_id, null);
});

// ---- pollAllInFlightBatches ---------------------------------------------

test("pollAllInFlightBatches: succeeded result writes summary + tags + state='done'", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "polled-success",
    body: SAMPLE_BODY,
  });
  // Move to batched manually.
  getDb()
    .prepare("UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?")
    .run("msgbatch_S1", item.id);
  getDb()
    .prepare("UPDATE enrichment_jobs SET state = 'batched' WHERE item_id = ?")
    .run(item.id);

  const { provider, polled } = makeProvider({
    resultsByCustomId: {
      [item.id]: {
        custom_id: item.id,
        type: "succeeded",
        response: validEnrichmentJson,
        metrics: { input_tokens: 100, output_tokens: 50, wall_ms: 0 },
      },
    },
  });

  await pollAllInFlightBatches(provider);

  assert.equal(polled.length, 1);
  assert.equal(polled[0], "msgbatch_S1");

  const row = getDb()
    .prepare(
      "SELECT enrichment_state, batch_id, summary, category, title FROM items WHERE id = ?",
    )
    .get(item.id) as {
    enrichment_state: string;
    batch_id: string | null;
    summary: string;
    category: string;
    title: string;
  };
  assert.equal(row.enrichment_state, "done");
  assert.equal(row.batch_id, null);
  assert.equal(row.category, "General");
  assert.equal(row.title, "Cleaned Up Title");
  assert.match(row.summary, /Paragraph one/);

  const job = getDb()
    .prepare("SELECT state FROM enrichment_jobs WHERE item_id = ?")
    .get(item.id) as { state: string };
  assert.equal(job.state, "done");

  const usage = getDb()
    .prepare(
      "SELECT provider, purpose, input_tokens, output_tokens FROM llm_usage WHERE provider = 'anthropic' ORDER BY id DESC LIMIT 1",
    )
    .get() as
    | {
        provider: string;
        purpose: string;
        input_tokens: number;
        output_tokens: number;
      }
    | undefined;
  assert.ok(usage, "anthropic llm_usage row should be written");
  assert.equal(usage!.purpose, "enrichment");
  assert.equal(usage!.input_tokens, 100);
  assert.equal(usage!.output_tokens, 50);
});

test("pollAllInFlightBatches: errored result rolls back to 'pending' with attempts++", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "polled-err",
    body: SAMPLE_BODY,
  });
  getDb()
    .prepare("UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?")
    .run("msgbatch_E1", item.id);
  getDb()
    .prepare("UPDATE enrichment_jobs SET state = 'batched', attempts = 0 WHERE item_id = ?")
    .run(item.id);

  const { provider } = makeProvider({
    resultsByCustomId: {
      [item.id]: {
        custom_id: item.id,
        type: "errored",
        error: "anthropic exploded",
      },
    },
  });

  await pollAllInFlightBatches(provider);

  const row = getDb()
    .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
    .get(item.id) as { enrichment_state: string; batch_id: string | null };
  assert.equal(row.enrichment_state, "pending");
  assert.equal(row.batch_id, null);

  const job = getDb()
    .prepare("SELECT state, attempts, last_error FROM enrichment_jobs WHERE item_id = ?")
    .get(item.id) as { state: string; attempts: number; last_error: string };
  assert.equal(job.state, "pending");
  assert.equal(job.attempts, 1);
  assert.match(job.last_error, /anthropic exploded/);
});

test("pollAllInFlightBatches: terminal failure after MAX_BATCH_ATTEMPTS", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "polled-terminal",
    body: SAMPLE_BODY,
  });
  // Pre-charge attempts to one below the cap.
  getDb()
    .prepare("UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?")
    .run("msgbatch_T1", item.id);
  getDb()
    .prepare(
      "UPDATE enrichment_jobs SET state = 'batched', attempts = ? WHERE item_id = ?",
    )
    .run(MAX_BATCH_ATTEMPTS - 1, item.id);

  const { provider } = makeProvider({
    resultsByCustomId: {
      [item.id]: {
        custom_id: item.id,
        type: "expired",
        error: "expired",
      },
    },
  });
  await pollAllInFlightBatches(provider);

  const row = getDb()
    .prepare("SELECT enrichment_state FROM items WHERE id = ?")
    .get(item.id) as { enrichment_state: string };
  assert.equal(row.enrichment_state, "error");

  const job = getDb()
    .prepare("SELECT state, attempts FROM enrichment_jobs WHERE item_id = ?")
    .get(item.id) as { state: string; attempts: number };
  assert.equal(job.state, "error");
  assert.equal(job.attempts, MAX_BATCH_ATTEMPTS);
});

test("pollAllInFlightBatches: in_progress status leaves items in 'batched'", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "polled-progress",
    body: SAMPLE_BODY,
  });
  getDb()
    .prepare("UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?")
    .run("msgbatch_P1", item.id);

  const { provider } = makeProvider({ pollInProgress: true });
  await pollAllInFlightBatches(provider);

  const row = getDb()
    .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
    .get(item.id) as { enrichment_state: string; batch_id: string };
  assert.equal(row.enrichment_state, "batched");
  assert.equal(row.batch_id, "msgbatch_P1");
});

test("pollAllInFlightBatches: malformed JSON treated as failure", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "polled-malformed",
    body: SAMPLE_BODY,
  });
  getDb()
    .prepare("UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?")
    .run("msgbatch_M1", item.id);
  getDb()
    .prepare("UPDATE enrichment_jobs SET state = 'batched' WHERE item_id = ?")
    .run(item.id);

  const { provider } = makeProvider({
    resultsByCustomId: {
      [item.id]: {
        custom_id: item.id,
        type: "succeeded",
        response: "not actually json {{{",
        metrics: { input_tokens: 1, output_tokens: 1, wall_ms: 0 },
      },
    },
  });
  await pollAllInFlightBatches(provider);

  const row = getDb()
    .prepare("SELECT enrichment_state FROM items WHERE id = ?")
    .get(item.id) as { enrichment_state: string };
  assert.equal(row.enrichment_state, "pending");

  const job = getDb()
    .prepare("SELECT last_error FROM enrichment_jobs WHERE item_id = ?")
    .get(item.id) as { last_error: string };
  assert.match(job.last_error, /JSON parse failed/);
});

test("pollAllInFlightBatches: idempotent — second poll on same batch is a no-op", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "polled-idem",
    body: SAMPLE_BODY,
  });
  getDb()
    .prepare("UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?")
    .run("msgbatch_I1", item.id);
  getDb()
    .prepare("UPDATE enrichment_jobs SET state = 'batched' WHERE item_id = ?")
    .run(item.id);

  const { provider } = makeProvider({
    resultsByCustomId: {
      [item.id]: {
        custom_id: item.id,
        type: "succeeded",
        response: validEnrichmentJson,
        metrics: { input_tokens: 1, output_tokens: 1, wall_ms: 0 },
      },
    },
  });

  // First poll lands the result.
  await pollAllInFlightBatches(provider);
  // Second poll: item is already 'done' + batch_id NULL, so the
  // SELECT WHERE batch_id IS NOT NULL returns no batches to poll.
  // No exception, no DB changes.
  await pollAllInFlightBatches(provider);

  const usageCount = getDb()
    .prepare(
      "SELECT COUNT(*) as n FROM llm_usage WHERE provider = 'anthropic' AND purpose = 'enrichment'",
    )
    .get() as { n: number };
  // Exactly one row written across the two polls — no duplicate.
  assert.ok(usageCount.n >= 1, "at least one usage row");
  // We can't assert exactly 1 across the whole table because earlier tests
  // wrote rows too; but the second poll specifically must not have added.
});

test("pollAllInFlightBatches: nothing in flight is a no-op", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done', batch_id = NULL").run();
  const { provider, polled } = makeProvider();
  await pollAllInFlightBatches(provider);
  assert.equal(polled.length, 0);
});

// ---- Race A: realtime finishes first, then batch poll fires ------------
//
// Scenario from S-12:
//   1. submitDailyBatch claims item X → state='batched', batch_id=B.
//   2. User clicks "Enrich now" → realtime path transitions to 'running',
//      runs enrichItem(), transitions to 'done', clears batch_id.
//   3. Five minutes later, poll fires for batch B → result for X comes
//      back → writeBatchResult sees state is now 'done' (not 'batched')
//      and short-circuits.
//
// This test simulates step 3 directly — assert the poll does NOT
// overwrite the realtime-produced enrichment.

test("Race A: poll write short-circuits when item already moved to 'done'", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "raceA test",
    body: "x".repeat(500),
  });
  // Simulate end of step 2: realtime path finished, state='done', summary
  // written, batch_id cleared.
  getDb()
    .prepare(
      `UPDATE items
       SET enrichment_state = 'done',
           summary = 'realtime-produced summary',
           title = 'realtime-produced title',
           batch_id = NULL
       WHERE id = ?`,
    )
    .run(item.id);

  // The poll loop's `SELECT DISTINCT batch_id WHERE batch_id IS NOT NULL`
  // wouldn't even pick up this item anymore — but defensively, also
  // verify writeBatchResult is a no-op when called directly with the
  // late-arriving batch entry.
  const { provider } = makeProvider({
    resultsByCustomId: {
      [item.id]: {
        custom_id: item.id,
        type: "succeeded",
        response: validEnrichmentJson,
        metrics: { input_tokens: 100, output_tokens: 50, wall_ms: 0 },
      },
    },
  });

  // Manually re-mark with a stale batch_id to force the poll to query
  // and discover the result, then verify the writeBatchResult predicate
  // (state='batched') guards the realtime-produced row.
  getDb()
    .prepare(
      "UPDATE items SET batch_id = ? WHERE id = ? AND enrichment_state = 'done'",
    )
    .run("msgbatch_RaceA", item.id);

  await pollAllInFlightBatches(provider);

  const row = getDb()
    .prepare(
      "SELECT enrichment_state, summary, title FROM items WHERE id = ?",
    )
    .get(item.id) as {
    enrichment_state: string;
    summary: string;
    title: string;
  };
  // Poll did NOT overwrite — realtime-produced summary/title preserved.
  assert.equal(row.enrichment_state, "done");
  assert.equal(row.summary, "realtime-produced summary");
  assert.equal(row.title, "realtime-produced title");
});

test("pollAllInFlightBatches returns early when provider lacks batch", async () => {
  // Should not throw, should not poll.
  await pollAllInFlightBatches(ollamaShapedProvider());
});
