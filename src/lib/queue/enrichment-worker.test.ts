/**
 * F-051 (v0.3.1): first test file in the project. Uses Node 20's built-in
 * `node:test` runner via `tsx` so TS + path aliases work without extra
 * tooling. See package.json `test` script and docs/plans/v0.3.1-polish.md
 * §T-A-7.
 *
 * Target: the pure `shouldSweep(now, lastSweepAt)` helper introduced by
 * F-045 so the worker loop's rolling sweep has coverage.
 */
import { TEST_DB_DIR } from "./enrichment-batch.test.setup";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { after, beforeEach, describe, it } from "node:test";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { ERRORS_LOG_PATH } from "@/lib/errors/sink";
import {
  runEnrichmentWorkerIteration,
  shouldSweep,
  sweepStaleClaims,
  type EnrichmentWorkerIterationDependencies,
} from "./enrichment-worker";

// STALE_CLAIM_MS is not exported (intentional — it's a worker-internal
// constant). Tests exercise the function at known boundaries instead.
const STALE_CLAIM_MS = 90_000;

after(() => {
  rmSync(TEST_DB_DIR, { recursive: true, force: true });
});

beforeEach(() => {
  const db = getDb();
  db.exec("DROP TABLE IF EXISTS content_processing_holds");
  db.prepare(
    "UPDATE items SET enrichment_state = 'done', batch_id = NULL",
  ).run();
  db.prepare(
    `UPDATE enrichment_jobs
     SET state = 'done', claimed_at = NULL, last_error = NULL,
         completed_at = NULL`,
  ).run();
  rmSync(ERRORS_LOG_PATH, { force: true });
  rmSync(`${ERRORS_LOG_PATH}.1`, { force: true });
});

describe("shouldSweep", () => {
  it("returns true on first call when lastSweepAt = 0", () => {
    assert.equal(shouldSweep(1_000_000, 0), true);
  });

  it("returns false when less than STALE_CLAIM_MS has elapsed", () => {
    const now = 1_000_000;
    assert.equal(shouldSweep(now, now - (STALE_CLAIM_MS - 1)), false);
  });

  it("returns true exactly at STALE_CLAIM_MS elapsed", () => {
    const now = 1_000_000;
    assert.equal(shouldSweep(now, now - STALE_CLAIM_MS), true);
  });

  it("returns true when more than STALE_CLAIM_MS has elapsed", () => {
    const now = 1_000_000;
    assert.equal(shouldSweep(now, now - (STALE_CLAIM_MS + 1)), true);
  });

  it("is monotonic — once it fires at T, it keeps firing at T + delta", () => {
    const base = 1_000_000;
    const lastSweep = base - STALE_CLAIM_MS;
    for (let d = 0; d < 10; d++) {
      assert.equal(shouldSweep(base + d * 1000, lastSweep), true);
    }
  });
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

function queueSnapshot(itemId: string): {
  itemState: string;
  batchId: string | null;
  jobState: string;
  attempts: number;
  claimedAt: number | null;
  lastError: string | null;
} {
  const db = getDb();
  const item = db
    .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
    .get(itemId) as {
    enrichment_state: string;
    batch_id: string | null;
  };
  const job = db
    .prepare(
      `SELECT state, attempts, claimed_at, last_error
       FROM enrichment_jobs
       WHERE item_id = ?`,
    )
    .get(itemId) as {
    state: string;
    attempts: number;
    claimed_at: number | null;
    last_error: string | null;
  };
  return {
    itemState: item.enrichment_state,
    batchId: item.batch_id,
    jobState: job.state,
    attempts: job.attempts,
    claimedAt: job.claimed_at,
    lastError: job.last_error,
  };
}

function dependencies(
  overrides: Partial<EnrichmentWorkerIterationDependencies> = {},
): EnrichmentWorkerIterationDependencies {
  return {
    isProviderAlive: async () => true,
    enrich: async (itemId) => ({
      ok: true,
      item_id: itemId,
      output: {
        summary: "Synthetic worker summary long enough for the test contract.",
        quotes: [],
        category: "General",
        title: "Synthetic title",
        tags: [],
      },
      wall_ms: 1,
      attempts: 1,
    }),
    embed: async (itemId) => ({
      ok: true,
      item_id: itemId,
      chunk_count: 1,
      duration_ms: 1,
    }),
    ...overrides,
  };
}

describe("enrichment worker containment", () => {
  for (const driftState of [
    "pending",
    "running",
    "batched",
    "done",
    "error",
  ] as const) {
    it(`refuses a ${driftState} item carrying an unresolved reservation before any provider contact`, async () => {
      const item = insertCaptured({
        source_type: "note",
        title: `unresolved ${driftState} candidate`,
        body: "synthetic body",
      });
      const reservation = `opaque-reservation-v1:${"W".repeat(43)}`;
      const db = getDb();
      db.prepare(
        "UPDATE items SET enrichment_state = ?, batch_id = ? WHERE id = ?",
      ).run(driftState, reservation, item.id);
      db.prepare(
        `UPDATE enrichment_jobs
         SET state = 'pending', attempts = 2, claimed_at = NULL
         WHERE item_id = ?`,
      ).run(item.id);
      const before = queueSnapshot(item.id);
      let livenessCalls = 0;
      let enrichCalls = 0;
      let embedCalls = 0;

      const outcome = await runEnrichmentWorkerIteration(
        dependencies({
          isProviderAlive: async () => {
            livenessCalls += 1;
            return true;
          },
          enrich: async (itemId) => {
            enrichCalls += 1;
            return {
              ok: false,
              item_id: itemId,
              error: "enrichment_provider_failed",
            };
          },
          embed: async (itemId) => {
            embedCalls += 1;
            return {
              ok: true,
              item_id: itemId,
              chunk_count: 1,
              duration_ms: 1,
            };
          },
        }),
      );

      assert.equal(outcome, "idle");
      assert.equal(livenessCalls, 0);
      assert.equal(enrichCalls, 0);
      assert.equal(embedCalls, 0);
      assert.deepEqual(queueSnapshot(item.id), before);
    });
  }

  it("atomic claim revalidation refuses a reservation introduced after candidate selection", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "claim reservation race",
      body: "synthetic body",
    });
    const reservation = `opaque-reservation-v1:${"C".repeat(43)}`;
    let livenessCalls = 0;
    let enrichCalls = 0;

    const outcome = await runEnrichmentWorkerIteration(
      dependencies({
        isProviderAlive: async () => {
          livenessCalls += 1;
          getDb()
            .prepare("UPDATE items SET batch_id = ? WHERE id = ?")
            .run(reservation, item.id);
          return true;
        },
        enrich: async (itemId) => {
          enrichCalls += 1;
          return {
            ok: false,
            item_id: itemId,
            error: "enrichment_provider_failed",
          };
        },
      }),
    );

    assert.equal(outcome, "blocked");
    assert.equal(livenessCalls, 1);
    assert.equal(enrichCalls, 0);
    const after = queueSnapshot(item.id);
    assert.equal(after.itemState, "pending");
    assert.equal(after.batchId, reservation);
    assert.equal(after.jobState, "pending");
    assert.equal(after.attempts, 0);
    assert.equal(after.claimedAt, null);
    assert.equal(after.lastError, null);
  });

  it("dispatch revalidation refuses a reservation introduced after the atomic claim", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "dispatch reservation race",
      body: "synthetic body",
    });
    const reservation = `opaque-reservation-v1:${"D".repeat(43)}`;
    let enrichCalls = 0;
    let embedCalls = 0;

    const outcome = await runEnrichmentWorkerIteration(
      dependencies({
        afterClaim: (itemId) => {
          getDb()
            .prepare("UPDATE items SET batch_id = ? WHERE id = ?")
            .run(reservation, itemId);
        },
        enrich: async (itemId) => {
          enrichCalls += 1;
          return {
            ok: false,
            item_id: itemId,
            error: "enrichment_provider_failed",
          };
        },
        embed: async (itemId) => {
          embedCalls += 1;
          return {
            ok: true,
            item_id: itemId,
            chunk_count: 1,
            duration_ms: 1,
          };
        },
      }),
    );

    assert.equal(outcome, "blocked");
    assert.equal(enrichCalls, 0);
    assert.equal(embedCalls, 0);
    const after = queueSnapshot(item.id);
    assert.equal(after.itemState, "running");
    assert.equal(after.batchId, reservation);
    assert.equal(after.jobState, "running");
    assert.equal(after.attempts, 1);
    assert.notEqual(after.claimedAt, null);
    assert.equal(after.lastError, null);
  });

  it("stale-claim retry sweep leaves an unresolved reservation exactly unchanged", () => {
    const item = insertCaptured({
      source_type: "note",
      title: "stale reservation",
      body: "synthetic body",
    });
    const reservation = `opaque-reservation-v1:${"S".repeat(43)}`;
    const db = getDb();
    db.prepare(
      `UPDATE items
       SET enrichment_state = 'running', batch_id = ?
       WHERE id = ?`,
    ).run(reservation, item.id);
    db.prepare(
      `UPDATE enrichment_jobs
       SET state = 'running', attempts = 2, claimed_at = 0
       WHERE item_id = ?`,
    ).run(item.id);
    const before = queueSnapshot(item.id);

    sweepStaleClaims();

    assert.deepEqual(queueSnapshot(item.id), before);
  });

  it("does not probe provider liveness when no eligible candidate exists", async () => {
    let livenessCalls = 0;
    const outcome = await runEnrichmentWorkerIteration(
      dependencies({
        isProviderAlive: async () => {
          livenessCalls += 1;
          return true;
        },
      }),
    );
    assert.equal(outcome, "idle");
    assert.equal(livenessCalls, 0);
  });

  it("does not probe liveness, claim, or sweep when the schema is incompatible", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "incompatible worker candidate",
      body: "synthetic body",
    });
    const before = queueSnapshot(item.id);
    let livenessCalls = 0;
    let enrichCalls = 0;
    installPartialFeatureSchema();

    const outcome = await runEnrichmentWorkerIteration(
      dependencies({
        isProviderAlive: async () => {
          livenessCalls += 1;
          return true;
        },
        enrich: async (itemId) => {
          enrichCalls += 1;
          return {
            ok: false,
            item_id: itemId,
            error: "enrichment_provider_failed",
          };
        },
      }),
    );

    assert.equal(outcome, "idle");
    assert.equal(livenessCalls, 0);
    assert.equal(enrichCalls, 0);
    assert.deepEqual(queueSnapshot(item.id), before);

    const db = getDb();
    db.prepare(
      `UPDATE enrichment_jobs
       SET state = 'running', claimed_at = 0
       WHERE item_id = ?`,
    ).run(item.id);
    db.prepare(
      "UPDATE items SET enrichment_state = 'running' WHERE id = ?",
    ).run(item.id);
    const staleBefore = queueSnapshot(item.id);
    sweepStaleClaims();
    assert.deepEqual(queueSnapshot(item.id), staleBefore);
  });

  it("uses a read-only candidate probe before liveness and rechecks before claim", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "claim race",
      body: "synthetic body",
    });
    const before = queueSnapshot(item.id);
    let livenessCalls = 0;
    let enrichCalls = 0;

    const outcome = await runEnrichmentWorkerIteration(
      dependencies({
        isProviderAlive: async () => {
          livenessCalls += 1;
          installPartialFeatureSchema();
          return true;
        },
        enrich: async (itemId) => {
          enrichCalls += 1;
          return {
            ok: false,
            item_id: itemId,
            error: "enrichment_provider_failed",
          };
        },
      }),
    );

    assert.equal(outcome, "blocked");
    assert.equal(livenessCalls, 1);
    assert.equal(enrichCalls, 0);
    assert.deepEqual(queueSnapshot(item.id), before);
  });

  it("treats a pipeline blocked result as neither success nor failure", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "dispatch race",
      body: "synthetic body",
    });
    let embedCalls = 0;
    const outcome = await runEnrichmentWorkerIteration(
      dependencies({
        enrich: async () => {
          installPartialFeatureSchema();
          return {
            ok: false,
            blocked: true,
            code: "processing_schema_incompatible",
          };
        },
        embed: async (itemId) => {
          embedCalls += 1;
          return {
            ok: true,
            item_id: itemId,
            chunk_count: 1,
            duration_ms: 1,
          };
        },
      }),
    );

    assert.equal(outcome, "blocked");
    assert.equal(embedCalls, 0);
    const after = queueSnapshot(item.id);
    assert.equal(after.itemState, "running");
    assert.equal(after.jobState, "running");
    assert.equal(after.attempts, 1);
    assert.notEqual(after.claimedAt, null);
    assert.equal(after.lastError, null);
    assert.equal(existsSync(ERRORS_LOG_PATH), false);
  });

  it("gates success completion and embedding when authority changes during enrichment", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "completion race",
      body: "synthetic body",
    });
    let embedCalls = 0;
    const outcome = await runEnrichmentWorkerIteration(
      dependencies({
        enrich: async (itemId) => {
          installPartialFeatureSchema();
          return {
            ok: true,
            item_id: itemId,
            output: {
              summary: "Synthetic summary",
              quotes: [],
              category: "General",
              title: "Synthetic title",
              tags: [],
            },
            wall_ms: 1,
            attempts: 1,
          };
        },
        embed: async (itemId) => {
          embedCalls += 1;
          return {
            ok: true,
            item_id: itemId,
            chunk_count: 1,
            duration_ms: 1,
          };
        },
      }),
    );

    assert.equal(outcome, "blocked");
    assert.equal(embedCalls, 0);
    const after = queueSnapshot(item.id);
    assert.equal(after.itemState, "running");
    assert.equal(after.jobState, "running");
    assert.equal(after.lastError, null);
  });

  it("gates retry, error storage, and failure logging when authority changes during failure", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "failure race",
      body: "synthetic body",
    });
    const privateSentinel = "PRIVATE_PROVIDER_FAILURE_SENTINEL";
    const outcome = await runEnrichmentWorkerIteration(
      dependencies({
        enrich: async (itemId) => {
          installPartialFeatureSchema();
          assert.equal(typeof itemId, "string");
          throw new Error(privateSentinel);
        },
      }),
    );

    assert.equal(outcome, "blocked");
    const after = queueSnapshot(item.id);
    assert.equal(after.itemState, "running");
    assert.equal(after.jobState, "running");
    assert.equal(after.attempts, 1);
    assert.equal(after.lastError, null);
    assert.equal(existsSync(ERRORS_LOG_PATH), false);
    if (existsSync(ERRORS_LOG_PATH)) {
      assert.equal(
        readFileSync(ERRORS_LOG_PATH, "utf8").includes(privateSentinel),
        false,
      );
    }
  });

  it("gates terminal error state and logging when authority changes during failure", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "terminal failure race",
      body: "synthetic body",
    });
    getDb()
      .prepare("UPDATE enrichment_jobs SET attempts = 2 WHERE item_id = ?")
      .run(item.id);
    const privateSentinel = "PRIVATE_TERMINAL_FAILURE_SENTINEL";
    const outcome = await runEnrichmentWorkerIteration(
      dependencies({
        enrich: async (itemId) => {
          installPartialFeatureSchema();
          assert.equal(typeof itemId, "string");
          throw new Error(privateSentinel);
        },
      }),
    );

    assert.equal(outcome, "blocked");
    const after = queueSnapshot(item.id);
    assert.equal(after.itemState, "running");
    assert.equal(after.jobState, "running");
    assert.equal(after.attempts, 3);
    assert.equal(after.lastError, null);
    assert.equal(existsSync(ERRORS_LOG_PATH), false);
  });

  it("success completion and embedding refuse a reservation introduced during enrichment", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "success apply reservation race",
      body: "synthetic body",
    });
    const reservation = `opaque-reservation-v1:${"A".repeat(43)}`;
    let embedCalls = 0;
    const outcome = await runEnrichmentWorkerIteration(
      dependencies({
        enrich: async (itemId) => {
          getDb()
            .prepare("UPDATE items SET batch_id = ? WHERE id = ?")
            .run(reservation, itemId);
          return {
            ok: true,
            item_id: itemId,
            output: {
              summary: "Synthetic summary",
              quotes: [],
              category: "General",
              title: "Synthetic title",
              tags: [],
            },
            wall_ms: 1,
            attempts: 1,
          };
        },
        embed: async (itemId) => {
          embedCalls += 1;
          return {
            ok: true,
            item_id: itemId,
            chunk_count: 1,
            duration_ms: 1,
          };
        },
      }),
    );

    assert.equal(outcome, "blocked");
    assert.equal(embedCalls, 0);
    const after = queueSnapshot(item.id);
    assert.equal(after.itemState, "running");
    assert.equal(after.batchId, reservation);
    assert.equal(after.jobState, "running");
    assert.equal(after.attempts, 1);
    assert.equal(after.lastError, null);
  });

  for (const [label, attempts] of [
    ["retry", 0],
    ["terminal", 2],
  ] as const) {
    it(`${label} failure boundary refuses a reservation introduced during enrichment`, async () => {
      const item = insertCaptured({
        source_type: "note",
        title: `${label} reservation race`,
        body: "synthetic body",
      });
      const reservation = `opaque-reservation-v1:${"F".repeat(43)}`;
      getDb()
        .prepare("UPDATE enrichment_jobs SET attempts = ? WHERE item_id = ?")
        .run(attempts, item.id);

      const outcome = await runEnrichmentWorkerIteration(
        dependencies({
          enrich: async (itemId) => {
            getDb()
              .prepare("UPDATE items SET batch_id = ? WHERE id = ?")
              .run(reservation, itemId);
            return {
              ok: false,
              item_id: itemId,
              error: "enrichment_provider_failed",
            };
          },
        }),
      );

      assert.equal(outcome, "blocked");
      const after = queueSnapshot(item.id);
      assert.equal(after.itemState, "running");
      assert.equal(after.batchId, reservation);
      assert.equal(after.jobState, "running");
      assert.equal(after.attempts, attempts + 1);
      assert.notEqual(after.claimedAt, null);
      assert.equal(after.lastError, null);
      assert.equal(existsSync(ERRORS_LOG_PATH), false);
    });
  }

  it("preserves schema-026 success completion and inline embedding", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "legacy success",
      body: "synthetic body",
    });
    let embedCalls = 0;
    const result = await runEnrichmentWorkerIteration(
      dependencies({
        enrich: async (itemId) => {
          getDb()
            .prepare(
              `UPDATE items
               SET enrichment_state = 'done', enriched_at = unixepoch() * 1000
               WHERE id = ?`,
            )
            .run(itemId);
          return {
            ok: true,
            item_id: itemId,
            output: {
              summary: "Synthetic summary",
              quotes: [],
              category: "General",
              title: "Synthetic title",
              tags: [],
            },
            wall_ms: 1,
            attempts: 1,
          };
        },
        embed: async (itemId) => {
          embedCalls += 1;
          return {
            ok: true,
            item_id: itemId,
            chunk_count: 1,
            duration_ms: 1,
          };
        },
      }),
    );

    assert.equal(result, "processed");
    assert.equal(embedCalls, 1);
    const after = queueSnapshot(item.id);
    assert.equal(after.itemState, "done");
    assert.equal(after.jobState, "done");
    assert.equal(after.attempts, 1);
    assert.equal(after.lastError, null);
  });

  it("preserves schema-026 retry state with content-free failure logging", async (t) => {
    const item = insertCaptured({
      source_type: "note",
      title: "legacy retry",
      body: "synthetic body",
    });
    const privateSentinel = "PRIVATE_WORKER_ERROR_SENTINEL";
    const writes: string[] = [];
    for (const method of ["log", "warn", "error"] as const) {
      t.mock.method(console, method, (...args: unknown[]) => {
        writes.push(args.map(String).join(" "));
      });
    }
    const result = await runEnrichmentWorkerIteration(
      dependencies({
        enrich: async () => {
          throw new Error(privateSentinel);
        },
      }),
    );

    assert.equal(result, "processed");
    const after = queueSnapshot(item.id);
    assert.equal(after.itemState, "pending");
    assert.equal(after.jobState, "pending");
    assert.equal(after.attempts, 1);
    assert.equal(after.lastError, "enrichment_worker_exception");
    const diagnostic = readFileSync(ERRORS_LOG_PATH, "utf8");
    const consoleOutput = writes.join("\n");
    assert.match(diagnostic, /"claimant":"scheduled_enrichment"/);
    assert.equal(diagnostic.includes(privateSentinel), false);
    assert.equal(diagnostic.includes(item.id), false);
    assert.equal(consoleOutput.includes(privateSentinel), false);
    assert.equal(consoleOutput.includes(item.id), false);
  });
});
