/**
 * enrichment-batch-cron.ts — v0.6.0 Phase C-4 unit coverage.
 *
 * Tests the registration contract (idempotency, HMR survival via
 * globalThis guard, schedule format). The actual tick behavior is
 * exercised by enrichment-batch.test.ts (submitDailyBatch /
 * pollAllInFlightBatches in isolation) plus the S-11 spike for cron
 * lifecycle in Next.js.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import cron from "node-cron";
import {
  POLL_CRON,
  SUBMIT_CRON,
  startEnrichmentBatchCron,
  stopEnrichmentBatchCron,
} from "./enrichment-batch-cron";

test.beforeEach(() => {
  // Each test starts from a clean slate — global guard cleared, all cron
  // tasks (registered by other modules in earlier tests) torn down.
  stopEnrichmentBatchCron();
  for (const task of cron.getTasks().values()) {
    task.destroy();
  }
});

test.after(() => {
  stopEnrichmentBatchCron();
  for (const task of cron.getTasks().values()) {
    task.destroy();
  }
});

test("schedule expressions match v0.6.0 design contract", () => {
  // 01:00 IST == 19:30 UTC (IST = UTC+5:30). Hetzner runs UTC.
  assert.equal(SUBMIT_CRON, "30 19 * * *");
  // Every 5 minutes.
  assert.equal(POLL_CRON, "*/5 * * * *");
  assert.equal(cron.validate(SUBMIT_CRON), true);
  assert.equal(cron.validate(POLL_CRON), true);
});

test("startEnrichmentBatchCron registers exactly two tasks on first call", () => {
  const before = cron.getTasks().size;
  startEnrichmentBatchCron();
  const after = cron.getTasks().size;
  assert.equal(after - before, 2, "expected exactly 2 new tasks (submit + poll)");
});

test("startEnrichmentBatchCron is idempotent — second call is a no-op", () => {
  startEnrichmentBatchCron();
  const taskCountAfterFirst = cron.getTasks().size;
  startEnrichmentBatchCron();
  startEnrichmentBatchCron();
  startEnrichmentBatchCron();
  const taskCountAfterRepeats = cron.getTasks().size;
  assert.equal(
    taskCountAfterRepeats,
    taskCountAfterFirst,
    "registering N times should still produce 1× submit + 1× poll task",
  );
});

test("stopEnrichmentBatchCron + start fresh works (test reset path)", () => {
  startEnrichmentBatchCron();
  const after1 = cron.getTasks().size;
  stopEnrichmentBatchCron();
  startEnrichmentBatchCron();
  const after2 = cron.getTasks().size;
  // Same number of tasks (2 submit + poll) after a stop-restart cycle.
  assert.equal(after2, after1);
});

test("globalThis guard survives module re-evaluation", () => {
  // Simulate an HMR-style re-import: the guard lives on globalThis, so a
  // separate require() of the module sees the existing registered=true
  // and doesn't queue more tasks.
  startEnrichmentBatchCron();
  const beforeRequire = cron.getTasks().size;

  // Bust the require cache + re-import. In Next.js dev this is what HMR
  // does for changed files; here we force it explicitly to prove the
  // globalThis flag survives.
  const path = require.resolve("./enrichment-batch-cron");
  delete require.cache[path];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const reloaded = require("./enrichment-batch-cron") as typeof import("./enrichment-batch-cron");
  reloaded.startEnrichmentBatchCron();

  const afterRequire = cron.getTasks().size;
  assert.equal(
    afterRequire,
    beforeRequire,
    "re-importing the module must not add new tasks",
  );
});
