/**
 * enrichment-batch-cron.ts — v0.6.0 Phase C-4 unit coverage.
 *
 * Tests the registration contract (idempotency, HMR survival via
 * globalThis guard, schedule format). The actual tick behavior is
 * exercised by enrichment-batch.test.ts (submitDailyBatch /
 * pollAllInFlightBatches in isolation) plus the S-11 spike for cron
 * lifecycle in Next.js.
 */
import { TEST_DB_DIR } from "./enrichment-batch.test.setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import cron from "node-cron";
import { getDb } from "@/db/client";
import {
  POLL_CRON,
  SUBMIT_CRON,
  runPollTick,
  runSubmitTick,
  startEnrichmentBatchCron,
  stopEnrichmentBatchCron,
  type EnrichmentBatchCronDependencies,
} from "./enrichment-batch-cron";

const ORIGINAL_WORKER_MODE = process.env.BRAIN_BACKGROUND_WORKERS_MODE;
const ORIGINAL_DEPLOYMENT = process.env.BRAIN_DEPLOYMENT_ENV;
const ORIGINAL_PRODUCTION_RUNTIME = process.env.BRAIN_PRODUCTION_RUNTIME;

test.beforeEach(() => {
  // Each test starts from a clean slate — global guard cleared, all cron
  // tasks (registered by other modules in earlier tests) torn down.
  stopEnrichmentBatchCron();
  for (const task of cron.getTasks().values()) {
    task.destroy();
  }
  getDb().exec("DROP TABLE IF EXISTS content_processing_holds");
  process.env.BRAIN_BACKGROUND_WORKERS_MODE = "standard";
  process.env.BRAIN_DEPLOYMENT_ENV = "test";
  process.env.BRAIN_PRODUCTION_RUNTIME = "0";
});

test.after(() => {
  stopEnrichmentBatchCron();
  for (const task of cron.getTasks().values()) {
    task.destroy();
  }
  restoreEnvironment("BRAIN_BACKGROUND_WORKERS_MODE", ORIGINAL_WORKER_MODE);
  restoreEnvironment("BRAIN_DEPLOYMENT_ENV", ORIGINAL_DEPLOYMENT);
  restoreEnvironment("BRAIN_PRODUCTION_RUNTIME", ORIGINAL_PRODUCTION_RUNTIME);
  rmSync(TEST_DB_DIR, { recursive: true, force: true });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
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

function countingTickDependencies(): {
  dependencies: EnrichmentBatchCronDependencies;
  calls: { submit: number; poll: number };
} {
  const calls = { submit: 0, poll: 0 };
  return {
    calls,
    dependencies: {
      submit: async () => {
        calls.submit += 1;
        return { batch_id: "must_not_escape", count: 1 };
      },
      poll: async () => {
        calls.poll += 1;
      },
    },
  };
}

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
  assert.equal(
    after - before,
    2,
    "expected exactly 2 new tasks (submit + poll)",
  );
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
  const reloaded =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./enrichment-batch-cron") as typeof import("./enrichment-batch-cron");
  reloaded.startEnrichmentBatchCron();

  const afterRequire = cron.getTasks().size;
  assert.equal(
    afterRequire,
    beforeRequire,
    "re-importing the module must not add new tasks",
  );
});

test("disabled mode registers no schedules and invokes neither tick", async () => {
  process.env.BRAIN_BACKGROUND_WORKERS_MODE = "disabled";
  const before = cron.getTasks().size;
  startEnrichmentBatchCron();
  assert.equal(cron.getTasks().size, before);

  const { dependencies, calls } = countingTickDependencies();
  await runSubmitTick(dependencies);
  await runPollTick(dependencies);
  assert.deepEqual(calls, { submit: 0, poll: 0 });
});

test("manual-transcript-lab mode registers no schedules and invokes neither tick", async () => {
  process.env.BRAIN_BACKGROUND_WORKERS_MODE = "manual-transcript-lab";
  process.env.BRAIN_DEPLOYMENT_ENV = "lab";
  const before = cron.getTasks().size;
  startEnrichmentBatchCron();
  assert.equal(cron.getTasks().size, before);

  const { dependencies, calls } = countingTickDependencies();
  await runSubmitTick(dependencies);
  await runPollTick(dependencies);
  assert.deepEqual(calls, { submit: 0, poll: 0 });
});

test("incompatible schema registers no schedules and invokes neither tick", async () => {
  installPartialFeatureSchema();
  const before = cron.getTasks().size;
  startEnrichmentBatchCron();
  assert.equal(cron.getTasks().size, before);

  const { dependencies, calls } = countingTickDependencies();
  await runSubmitTick(dependencies);
  await runPollTick(dependencies);
  assert.deepEqual(calls, { submit: 0, poll: 0 });
});

test("standard-mode tick logs omit batch identifiers and raw exceptions", async (t) => {
  const privateBatchId = "PRIVATE_CRON_BATCH_ID_SENTINEL";
  const privateError = "PRIVATE_CRON_ERROR_SENTINEL";
  const writes: string[] = [];
  t.mock.method(console, "log", (...args: unknown[]) => {
    writes.push(args.map(String).join(" "));
  });
  t.mock.method(console, "error", (...args: unknown[]) => {
    writes.push(args.map(String).join(" "));
  });

  await runSubmitTick({
    submit: async () => ({ batch_id: privateBatchId, count: 2 }),
    poll: async () => undefined,
  });
  await runSubmitTick({
    submit: async () => {
      throw new Error(privateError);
    },
    poll: async () => undefined,
  });
  await runPollTick({
    submit: async () => null,
    poll: async () => {
      throw new Error(privateError);
    },
  });

  const output = writes.join("\n");
  assert.match(output, /submit tick completed count=2/);
  assert.match(output, /submit tick failed/);
  assert.match(output, /poll tick failed/);
  assert.equal(output.includes(privateBatchId), false);
  assert.equal(output.includes(privateError), false);
});
