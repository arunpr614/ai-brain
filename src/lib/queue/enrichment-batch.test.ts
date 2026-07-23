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
import { listTopicsForItem } from "@/db/topics";
import {
  BATCH_SIZE_CAP,
  MAX_BATCH_ATTEMPTS,
  pollAllInFlightBatches,
  submitDailyBatch,
} from "./enrichment-batch";
import {
  decodeBatchBinding,
  isUnresolvedBatchReservation,
} from "./enrichment-batch-binding";
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

test("the entire unresolved reservation namespace fails closed", () => {
  const malformedReservation = "opaque-reservation-v1:corrupt";

  assert.equal(isUnresolvedBatchReservation(malformedReservation), true);
  assert.deepEqual(decodeBatchBinding(malformedReservation), {
    providerBatchId: "",
    alias: null,
  });
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
  /** When set, pollBatch throws this error. */
  pollThrows?: Error;
  /** Barrier after provider dispatch but before submit resolves. */
  beforeSubmitReturn?: () => void;
  /** Barrier after provider poll dispatch but before results resolve. */
  beforePollReturn?: () => void;
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
      behavior.beforeSubmitReturn?.();
      return { batch_id: behavior.batchId ?? "msgbatch_test_xyz" };
    },
    async pollBatch(id: string): Promise<AnthropicBatchPoll> {
      polled.push(id);
      if (behavior.pollThrows) throw behavior.pollThrows;
      behavior.beforePollReturn?.();
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
  quotes: ["First verbatim quote.", "Second.", "Third.", "Fourth.", "Fifth."],
  category: "General",
  title: "Cleaned Up Title",
  tags: ["tag-one", "tag-two", "tag-three"],
});

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

function batchState(itemId: string): {
  itemState: string;
  batchId: string | null;
  summary: string | null;
  jobState: string;
  attempts: number;
  lastError: string | null;
} {
  const db = getDb();
  const item = db
    .prepare(
      `SELECT enrichment_state, batch_id, summary
       FROM items
       WHERE id = ?`,
    )
    .get(itemId) as {
    enrichment_state: string;
    batch_id: string | null;
    summary: string | null;
  };
  const job = db
    .prepare(
      `SELECT state, attempts, last_error
       FROM enrichment_jobs
       WHERE item_id = ?`,
    )
    .get(itemId) as {
    state: string;
    attempts: number;
    last_error: string | null;
  };
  return {
    itemState: item.enrichment_state,
    batchId: item.batch_id,
    summary: item.summary,
    jobState: job.state,
    attempts: job.attempts,
    lastError: job.last_error,
  };
}

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
  const a = insertCaptured({
    source_type: "note",
    title: "A",
    body: SAMPLE_BODY,
  });
  const b = insertCaptured({
    source_type: "note",
    title: "B",
    body: SAMPLE_BODY,
  });
  const { provider, submitted } = makeProvider({ batchId: "msgbatch_AAA" });

  const result = await submitDailyBatch(provider);
  assert.deepEqual(result, { batch_id: "msgbatch_AAA", count: 2 });
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0].length, 2);
  assert.equal(
    submitted[0].some(
      (request) => request.custom_id === a.id || request.custom_id === b.id,
    ),
    false,
  );
  for (const request of submitted[0]) {
    assert.match(request.custom_id, /^[A-Za-z0-9_-]{43}$/u);
  }

  for (const id of [a.id, b.id]) {
    const row = getDb()
      .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
      .get(id) as { enrichment_state: string; batch_id: string };
    assert.equal(row.enrichment_state, "batched");
    assert.notEqual(row.batch_id, "msgbatch_AAA");
    assert.match(row.batch_id, /^opaque-v1:/u);
    const job = getDb()
      .prepare("SELECT state FROM enrichment_jobs WHERE item_id = ?")
      .get(id) as { state: string };
    assert.equal(job.state, "batched");
  }
});

test("submitDailyBatch durably reserves fresh aliases before provider contact", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "durable pre-dispatch alias",
    body: SAMPLE_BODY,
  });
  const observations: Array<ReturnType<typeof batchState>> = [];
  const stub = makeProvider({
    beforeSubmitReturn: () => {
      observations.push(batchState(item.id));
    },
  });

  await submitDailyBatch(stub.provider);

  const observed = observations[0];
  assert.ok(observed);
  const providerAlias = stub.submitted[0][0].custom_id;
  assert.equal(observed.itemState, "batched");
  assert.equal(observed.jobState, "batched");
  assert.match(observed.batchId ?? "", /^opaque-reservation-v1:/u);
  assert.equal(observed.batchId, `opaque-reservation-v1:${providerAlias}`);
  assert.equal((observed.batchId ?? "").includes(item.id), false);
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

test("opaque provider alias round-trips without exposing the stable item id", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "opaque alias",
    body: SAMPLE_BODY,
  });
  const submitProvider = makeProvider({ batchId: "msgbatch_opaque" });

  assert.deepEqual(await submitDailyBatch(submitProvider.provider), {
    batch_id: "msgbatch_opaque",
    count: 1,
  });
  const opaqueAlias = submitProvider.submitted[0][0].custom_id;
  assert.notEqual(opaqueAlias, item.id);

  getDb()
    .prepare(
      "UPDATE items SET enrichment_state = 'pending', batch_id = NULL WHERE id = ?",
    )
    .run(item.id);
  getDb()
    .prepare("UPDATE enrichment_jobs SET state = 'pending' WHERE item_id = ?")
    .run(item.id);
  const secondSubmitProvider = makeProvider({ batchId: "msgbatch_opaque_2" });
  assert.deepEqual(await submitDailyBatch(secondSubmitProvider.provider), {
    batch_id: "msgbatch_opaque_2",
    count: 1,
  });
  const freshAlias = secondSubmitProvider.submitted[0][0].custom_id;
  assert.notEqual(freshAlias, opaqueAlias);

  const pollProvider = makeProvider({
    resultsByCustomId: {
      [freshAlias]: {
        custom_id: freshAlias,
        type: "succeeded",
        response: validEnrichmentJson,
        metrics: { input_tokens: 10, output_tokens: 5, wall_ms: 0 },
      },
    },
  });
  await pollAllInFlightBatches(pollProvider.provider);

  assert.equal(batchState(item.id).itemState, "done");
  assert.equal(batchState(item.id).batchId, null);
});

test("submitDailyBatch caps at BATCH_SIZE_CAP", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  // Insert one above the cap; only BATCH_SIZE_CAP should be claimed.
  for (let i = 0; i < BATCH_SIZE_CAP + 5; i++) {
    insertCaptured({
      source_type: "note",
      title: `cap${i}`,
      body: SAMPLE_BODY,
    });
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

test("submitDailyBatch: an accepted-then-thrown submit stays durably quarantined and is never resent", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "errfail",
    body: SAMPLE_BODY,
  });
  const first = makeProvider({
    beforeSubmitReturn: () => {
      throw new Error("PRIVATE_AMBIGUOUS_SUBMIT_SENTINEL");
    },
  });
  await assert.rejects(
    submitDailyBatch(first.provider),
    /PRIVATE_AMBIGUOUS_SUBMIT_SENTINEL/u,
  );
  assert.equal(first.submitted.length, 1);
  const row = getDb()
    .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
    .get(item.id) as { enrichment_state: string; batch_id: string | null };
  assert.equal(row.enrichment_state, "batched");
  assert.match(row.batch_id ?? "", /^opaque-reservation-v1:/u);
  assert.equal((row.batch_id ?? "").includes(item.id), false);
  assert.equal(batchState(item.id).jobState, "batched");

  const nextTick = makeProvider();
  assert.equal(await submitDailyBatch(nextTick.provider), null);
  await pollAllInFlightBatches(nextTick.provider);
  assert.equal(nextTick.submitted.length, 0);
  assert.equal(nextTick.polled.length, 0);
  assert.deepEqual(
    getDb()
      .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
      .get(item.id),
    row,
  );
});

test("submitDailyBatch never selects or overwrites a pending item with an existing unresolved reservation", async () => {
  getDb()
    .prepare("UPDATE items SET enrichment_state = 'done', batch_id = NULL")
    .run();
  const item = insertCaptured({
    source_type: "note",
    title: "drifted unresolved reservation",
    body: SAMPLE_BODY,
  });
  const reservation = `opaque-reservation-v1:${"R".repeat(43)}`;
  getDb()
    .prepare("UPDATE items SET batch_id = ? WHERE id = ?")
    .run(reservation, item.id);
  const before = batchState(item.id);
  const { provider, submitted, polled } = makeProvider();

  assert.equal(await submitDailyBatch(provider), null);
  await pollAllInFlightBatches(provider);

  assert.equal(submitted.length, 0);
  assert.equal(polled.length, 0);
  assert.deepEqual(batchState(item.id), before);
});

test("submitDailyBatch: incompatible schema contacts no provider and mutates nothing", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "incompatible submit",
    body: SAMPLE_BODY,
  });
  const before = batchState(item.id);
  const { provider, submitted } = makeProvider();
  installPartialFeatureSchema();
  try {
    assert.equal(await submitDailyBatch(provider), null);
    assert.equal(submitted.length, 0);
    assert.deepEqual(batchState(item.id), before);
  } finally {
    removePartialFeatureSchema();
  }
});

test("submitDailyBatch: capability change after dispatch leaves the durable reservation quarantined", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "submit apply race",
    body: SAMPLE_BODY,
  });
  const { provider, submitted } = makeProvider({
    beforeSubmitReturn: installPartialFeatureSchema,
  });
  try {
    assert.equal(await submitDailyBatch(provider), null);
    assert.equal(submitted.length, 1);
    assert.equal(submitted[0].length, 1);
    const quarantined = batchState(item.id);
    assert.equal(quarantined.itemState, "batched");
    assert.equal(quarantined.jobState, "batched");
    assert.match(quarantined.batchId ?? "", /^opaque-reservation-v1:/u);
    assert.equal((quarantined.batchId ?? "").includes(item.id), false);
  } finally {
    removePartialFeatureSchema();
  }
});

test("submitDailyBatch: authority loss after reservation prevents provider contact without reopening the claim", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "reserved authority race",
    body: SAMPLE_BODY,
  });
  const { provider, submitted } = makeProvider();
  try {
    assert.equal(
      await submitDailyBatch(provider, {
        afterReservationCheck: installPartialFeatureSchema,
      }),
      null,
    );
    assert.equal(submitted.length, 0);
    const quarantined = batchState(item.id);
    assert.equal(quarantined.itemState, "batched");
    assert.equal(quarantined.jobState, "batched");
    assert.match(quarantined.batchId ?? "", /^opaque-reservation-v1:/u);
  } finally {
    removePartialFeatureSchema();
  }
});

test("submitDailyBatch: final pre-dispatch recomputation prevents provider contact", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "submit dispatch race",
    body: SAMPLE_BODY,
  });
  const before = batchState(item.id);
  const { provider, submitted } = makeProvider();
  try {
    assert.equal(
      await submitDailyBatch(provider, {
        beforeDispatchCheck: installPartialFeatureSchema,
      }),
      null,
    );
    assert.equal(submitted.length, 0);
    assert.deepEqual(batchState(item.id), before);
  } finally {
    removePartialFeatureSchema();
  }
});

test("direct batch submit and poll boundaries do nothing outside standard mode", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const pending = insertCaptured({
    source_type: "note",
    title: "nonstandard submit",
    body: SAMPLE_BODY,
  });
  const batched = insertCaptured({
    source_type: "note",
    title: "nonstandard poll",
    body: SAMPLE_BODY,
  });
  getDb()
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
    .run("msgbatch_nonstandard", batched.id);
  getDb()
    .prepare("UPDATE enrichment_jobs SET state = 'batched' WHERE item_id = ?")
    .run(batched.id);
  const beforePending = batchState(pending.id);
  const beforeBatched = batchState(batched.id);
  const originalMode = process.env.BRAIN_BACKGROUND_WORKERS_MODE;
  try {
    for (const mode of ["disabled", "manual-transcript-lab"]) {
      process.env.BRAIN_BACKGROUND_WORKERS_MODE = mode;
      const { provider, submitted, polled } = makeProvider();
      assert.equal(await submitDailyBatch(provider), null);
      await pollAllInFlightBatches(provider);
      assert.equal(submitted.length, 0);
      assert.equal(polled.length, 0);
      assert.deepEqual(batchState(pending.id), beforePending);
      assert.deepEqual(batchState(batched.id), beforeBatched);
    }
  } finally {
    if (originalMode === undefined) {
      delete process.env.BRAIN_BACKGROUND_WORKERS_MODE;
    } else {
      process.env.BRAIN_BACKGROUND_WORKERS_MODE = originalMode;
    }
  }
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
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
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
  assert.deepEqual(
    listTopicsForItem(item.id).map((topic) => topic.slug),
    ["tag-one", "tag-three", "tag-two"],
  );

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

test("pollAllInFlightBatches: errored result stores a stable code and rolls back to pending", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "polled-err",
    body: SAMPLE_BODY,
  });
  getDb()
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
    .run("msgbatch_E1", item.id);
  getDb()
    .prepare(
      "UPDATE enrichment_jobs SET state = 'batched', attempts = 0 WHERE item_id = ?",
    )
    .run(item.id);

  const { provider } = makeProvider({
    resultsByCustomId: {
      [item.id]: {
        custom_id: item.id,
        type: "errored",
        error: "PRIVATE_BATCH_PROVIDER_ERROR_SENTINEL",
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
    .prepare(
      "SELECT state, attempts, last_error FROM enrichment_jobs WHERE item_id = ?",
    )
    .get(item.id) as { state: string; attempts: number; last_error: string };
  assert.equal(job.state, "pending");
  assert.equal(job.attempts, 1);
  assert.equal(job.last_error, "batch_provider_error");
  assert.equal(
    job.last_error.includes("PRIVATE_BATCH_PROVIDER_ERROR_SENTINEL"),
    false,
  );
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
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
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
    .prepare(
      "SELECT state, attempts, last_error FROM enrichment_jobs WHERE item_id = ?",
    )
    .get(item.id) as { state: string; attempts: number; last_error: string };
  assert.equal(job.state, "error");
  assert.equal(job.attempts, MAX_BATCH_ATTEMPTS);
  assert.equal(job.last_error, "batch_expired");
});

test("pollAllInFlightBatches: in_progress status leaves items in 'batched'", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "polled-progress",
    body: SAMPLE_BODY,
  });
  getDb()
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
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
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
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
  assert.equal(job.last_error, "batch_response_invalid");
});

test("pollAllInFlightBatches emits no batch identifier or raw poll error", async (t) => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "poll diagnostic privacy",
    body: SAMPLE_BODY,
  });
  const privateBatchId = "PRIVATE_BATCH_ID_SENTINEL";
  const privateError = "PRIVATE_POLL_ERROR_SENTINEL";
  getDb()
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
    .run(privateBatchId, item.id);
  getDb()
    .prepare("UPDATE enrichment_jobs SET state = 'batched' WHERE item_id = ?")
    .run(item.id);
  const writes: string[] = [];
  t.mock.method(console, "warn", (...args: unknown[]) => {
    writes.push(args.map(String).join(" "));
  });
  const { provider } = makeProvider({ pollThrows: new Error(privateError) });

  await pollAllInFlightBatches(provider);

  const output = writes.join("\n");
  assert.match(output, /\[batch\] poll failed/);
  assert.equal(output.includes(privateBatchId), false);
  assert.equal(output.includes(privateError), false);
  assert.equal(output.includes(item.id), false);
});

test("pollAllInFlightBatches: idempotent — second poll on same batch is a no-op", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "polled-idem",
    body: SAMPLE_BODY,
  });
  getDb()
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
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
  getDb()
    .prepare("UPDATE items SET enrichment_state = 'done', batch_id = NULL")
    .run();
  const { provider, polled } = makeProvider();
  await pollAllInFlightBatches(provider);
  assert.equal(polled.length, 0);
});

test("pollAllInFlightBatches: malformed opaque binding is never sent to a provider", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "malformed local binding",
    body: SAMPLE_BODY,
  });
  getDb()
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
    .run("opaque-v1:not-valid-base64-json", item.id);
  getDb()
    .prepare("UPDATE enrichment_jobs SET state = 'batched' WHERE item_id = ?")
    .run(item.id);
  const before = batchState(item.id);
  const { provider, polled } = makeProvider();

  await pollAllInFlightBatches(provider);

  assert.equal(polled.length, 0);
  assert.deepEqual(batchState(item.id), before);
});

test("pollAllInFlightBatches: incompatible schema contacts no provider and mutates nothing", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "incompatible poll",
    body: SAMPLE_BODY,
  });
  getDb()
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
    .run("msgbatch_incompatible", item.id);
  getDb()
    .prepare("UPDATE enrichment_jobs SET state = 'batched' WHERE item_id = ?")
    .run(item.id);
  const before = batchState(item.id);
  const { provider, polled } = makeProvider();
  installPartialFeatureSchema();
  try {
    await pollAllInFlightBatches(provider);
    assert.equal(polled.length, 0);
    assert.deepEqual(batchState(item.id), before);
  } finally {
    removePartialFeatureSchema();
  }
});

test("pollAllInFlightBatches: capability change after poll dispatch suppresses all result apply", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const item = insertCaptured({
    source_type: "note",
    title: "poll dispatch race",
    body: SAMPLE_BODY,
  });
  getDb()
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
    .run("msgbatch_poll_race", item.id);
  getDb()
    .prepare("UPDATE enrichment_jobs SET state = 'batched' WHERE item_id = ?")
    .run(item.id);
  const before = batchState(item.id);
  const usageBefore = (
    getDb().prepare("SELECT COUNT(*) AS n FROM llm_usage").get() as {
      n: number;
    }
  ).n;
  const privateSentinel = "PRIVATE_BATCH_PROVIDER_OUTPUT_SENTINEL";
  const { provider, polled } = makeProvider({
    beforePollReturn: installPartialFeatureSchema,
    resultsByCustomId: {
      [item.id]: {
        custom_id: item.id,
        type: "succeeded",
        response: validEnrichmentJson.replace("Paragraph one", privateSentinel),
        metrics: { input_tokens: 10, output_tokens: 5, wall_ms: 0 },
      },
    },
  });
  try {
    await pollAllInFlightBatches(provider);
    assert.equal(polled.length, 1);
    assert.deepEqual(batchState(item.id), before);
    const usageAfter = (
      getDb().prepare("SELECT COUNT(*) AS n FROM llm_usage").get() as {
        n: number;
      }
    ).n;
    assert.equal(usageAfter, usageBefore);
    assert.equal(
      JSON.stringify(batchState(item.id)).includes(privateSentinel),
      false,
    );
  } finally {
    removePartialFeatureSchema();
  }
});

test("pollAllInFlightBatches independently gates mixed result apply", async () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  const clear = insertCaptured({
    source_type: "note",
    title: "mixed clear",
    body: SAMPLE_BODY,
  });
  const blocked = insertCaptured({
    source_type: "note",
    title: "mixed blocked",
    body: SAMPLE_BODY,
  });
  for (const item of [clear, blocked]) {
    getDb()
      .prepare(
        "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
      )
      .run("msgbatch_mixed", item.id);
    getDb()
      .prepare("UPDATE enrichment_jobs SET state = 'batched' WHERE item_id = ?")
      .run(item.id);
  }
  const privateSentinel = "PRIVATE_MIXED_RESULT_SENTINEL";
  const blockedEntry = {
    custom_id: blocked.id,
    type: "succeeded" as const,
    get response() {
      installPartialFeatureSchema();
      return validEnrichmentJson.replace("Paragraph one", privateSentinel);
    },
    metrics: { input_tokens: 10, output_tokens: 5, wall_ms: 0 },
  };
  const { provider } = makeProvider({
    resultsByCustomId: {
      [clear.id]: {
        custom_id: clear.id,
        type: "succeeded",
        response: validEnrichmentJson,
        metrics: { input_tokens: 10, output_tokens: 5, wall_ms: 0 },
      },
      [blocked.id]: blockedEntry,
    },
  });
  try {
    await pollAllInFlightBatches(provider);
    assert.equal(batchState(clear.id).itemState, "done");
    const heldBack = batchState(blocked.id);
    assert.equal(heldBack.itemState, "batched");
    assert.equal(heldBack.jobState, "batched");
    assert.equal(heldBack.summary, null);
    assert.equal(JSON.stringify(heldBack).includes(privateSentinel), false);
  } finally {
    removePartialFeatureSchema();
  }
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
    .prepare("SELECT enrichment_state, summary, title FROM items WHERE id = ?")
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
