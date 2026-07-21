import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DurableSyncEngine,
  ResearchStore,
  SimulatedCrashError,
  StaleFenceError,
} from "./durable-sync-harness.mjs";
import {
  FakeDriveProvider,
  FakeEnterpriseProvider,
  createAsyncBarrier,
} from "./fake-provider.mjs";
import {
  SYNTHETIC_CONNECTION_KEY,
  SYNTHETIC_ITEMS,
} from "./synthetic-fixtures.mjs";

function newDatabase(t) {
  const directory = mkdtempSync(join(tmpdir(), "notebooklm-durable-research-"));
  const dbPath = join(directory, "research.sqlite");
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return { directory, dbPath, store: new ResearchStore(dbPath) };
}

function capture(store, itemIndex, suffix = String(itemIndex + 1), occurredAt = 1_000 + itemIndex) {
  return store.captureSyntheticItem({
    eventUuid: `event-${suffix}`,
    item: structuredClone(SYNTHETIC_ITEMS[itemIndex]),
    occurredAt,
  });
}

function createEnterpriseTarget(store, targetAlias = "target-enterprise", baseline = "all") {
  return store.createTarget({
    targetAlias,
    path: "enterprise",
    strategy: "daily_digest",
    baseline,
  });
}

function enqueue(store, targetAlias, key, requestedAt, trigger = "manual") {
  return store.enqueueSync({
    targetAlias,
    trigger,
    idempotencyKey: key,
    requestedAt,
  });
}

function prepareExecution(store, {
  targetAlias = "target-enterprise",
  now = 2_000,
  requestKey = `prepare-${now}`,
  workerId = `prepare-worker-${now}`,
  pageSize = 2,
} = {}) {
  enqueue(store, targetAlias, requestKey, now);
  const lease = store.acquireLease({ targetAlias, workerId, now, ttlMs: 10_000 });
  assert.ok(lease);
  const execution = store.beginNextExecution(lease, { now });
  for (;;) {
    const page = store.materializeOutboxPage(lease, {
      executionId: execution.id,
      pageSize,
      now,
      connectionKey: SYNTHETIC_CONNECTION_KEY,
    });
    if (page.count === 0) break;
  }
  assert.equal(store.releaseLease(lease), true);
  return execution;
}

function engine(store, provider, clock, maxRetryAttempts = 2) {
  return new DurableSyncEngine({
    store,
    provider,
    connectionKey: SYNTHETIC_CONNECTION_KEY,
    clock: () => clock.value,
    maxRetryAttempts,
  });
}

test("outbox is atomic, monotonic across equal and older timestamps, and durable after reopen", (t) => {
  const { dbPath, store } = newDatabase(t);
  const one = capture(store, 0, "one", 10);
  const two = capture(store, 1, "two", 10);
  const lateOld = capture(store, 3, "late-old", 20);
  assert.deepEqual(
    [one.outboxSequence, two.outboxSequence, lateOld.outboxSequence],
    [1, 2, 3],
  );
  assert.equal(SYNTHETIC_ITEMS[0].capturedAt, SYNTHETIC_ITEMS[1].capturedAt);
  assert.ok(SYNTHETIC_ITEMS[3].capturedAt < SYNTHETIC_ITEMS[0].capturedAt);

  assert.throws(
    () =>
      store.captureSyntheticItem({
        eventUuid: "event-rolled-back",
        item: structuredClone(SYNTHETIC_ITEMS[2]),
        occurredAt: 30,
        failpoint: "after_outbox_insert_before_commit",
      }),
    SimulatedCrashError,
  );
  assert.equal(store.listOutbox().length, 3);
  const retried = capture(store, 2, "rolled-back", 30);
  assert.equal(retried.outboxSequence, 4);

  store.close();
  const reopened = new ResearchStore(dbPath);
  t.after(() => reopened.close());
  assert.deepEqual(
    reopened.listOutbox().map((row) => Number(row.seq)),
    [1, 2, 3, 4],
  );
});

test("new-only baseline and discovery cursor are independent for every target", (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "baseline");
  createEnterpriseTarget(store, "target-all", "all");
  createEnterpriseTarget(store, "target-new", "new_only");
  capture(store, 1, "after-connect");

  for (const targetAlias of ["target-all", "target-new"]) {
    enqueue(store, targetAlias, `request-${targetAlias}`, 2_000);
    const lease = store.acquireLease({ targetAlias, workerId: `worker-${targetAlias}`, now: 2_000, ttlMs: 100 });
    const execution = store.beginNextExecution(lease, { now: 2_000 });
    for (;;) {
      const page = store.materializeOutboxPage(lease, {
        executionId: execution.id,
        pageSize: 1,
        now: 2_000,
        connectionKey: SYNTHETIC_CONNECTION_KEY,
      });
      if (page.count === 0) break;
    }
    store.releaseLease(lease);
  }

  assert.equal(store.listWork("target-all").length, 2);
  assert.equal(store.listWork("target-new").length, 1);
  assert.equal(Number(store.getTarget("target-all").start_after_seq), 0);
  assert.equal(Number(store.getTarget("target-new").start_after_seq), 1);
  assert.equal(Number(store.getTarget("target-all").discovery_cursor), 2);
  assert.equal(Number(store.getTarget("target-new").discovery_cursor), 2);
});

test("an unknown baseline value cannot silently enable historical synchronization", (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "historical-before-invalid-baseline");
  assert.throws(
    () =>
      store.createTarget({
        targetAlias: "target-typo",
        path: "enterprise",
        strategy: "daily_digest",
        baseline: "new-only",
      }),
    /invalid_baseline/,
  );
  assert.equal(store.getTarget("target-typo"), null);
});

test("materialized ledger rows and cursor commit atomically and replay without duplicates", (t) => {
  const { dbPath, store } = newDatabase(t);
  capture(store, 0, "atomic-one");
  capture(store, 1, "atomic-two");
  createEnterpriseTarget(store);
  enqueue(store, "target-enterprise", "atomic-request", 2_000);
  const lease = store.acquireLease({
    targetAlias: "target-enterprise",
    workerId: "atomic-worker",
    now: 2_000,
    ttlMs: 10_000,
  });
  const execution = store.beginNextExecution(lease, { now: 2_000 });

  assert.throws(
    () =>
      store.materializeOutboxPage(lease, {
        executionId: execution.id,
        pageSize: 2,
        now: 2_000,
        connectionKey: SYNTHETIC_CONNECTION_KEY,
        failpoint: "after_cursor_update_before_commit",
      }),
    SimulatedCrashError,
  );
  assert.equal(Number(store.getTarget("target-enterprise").discovery_cursor), 0);
  assert.equal(store.listWork("target-enterprise").length, 0);
  store.close();

  const reopened = new ResearchStore(dbPath);
  t.after(() => reopened.close());
  const page = reopened.materializeOutboxPage(lease, {
    executionId: execution.id,
    pageSize: 2,
    now: 2_000,
    connectionKey: SYNTHETIC_CONNECTION_KEY,
  });
  assert.equal(page.count, 2);
  assert.equal(Number(reopened.getTarget("target-enterprise").discovery_cursor), 2);
  assert.equal(reopened.listWork("target-enterprise").length, 2);
  assert.equal(
    reopened.materializeOutboxPage(lease, {
      executionId: execution.id,
      pageSize: 2,
      now: 2_000,
      connectionKey: SYNTHETIC_CONNECTION_KEY,
    }).count,
    0,
  );
  assert.equal(reopened.listWork("target-enterprise").length, 2);
});

test("durable requests deduplicate, coalesce through a cutoff, and queue post-cutoff work", (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "request-one");
  capture(store, 1, "request-two");
  createEnterpriseTarget(store);
  const manual = enqueue(store, "target-enterprise", "manual-key", 2_000, "manual");
  const repeated = enqueue(store, "target-enterprise", "manual-key", 2_001, "manual");
  const daily = enqueue(store, "target-enterprise", "daily-key", 2_002, "daily");
  assert.equal(repeated.id, manual.id);

  const lease = store.acquireLease({
    targetAlias: "target-enterprise",
    workerId: "request-worker",
    now: 2_010,
    ttlMs: 100,
  });
  const execution = store.beginNextExecution(lease, { now: 2_010 });
  assert.equal(Number(execution.cutoff_seq), 2);
  const covered = enqueue(store, "target-enterprise", "covered-key", 2_011, "manual");
  assert.equal(covered.state, "attached");
  assert.equal(covered.execution_id, execution.id);

  capture(store, 2, "request-after-cutoff", 2_012);
  const followUp = enqueue(store, "target-enterprise", "follow-up-key", 2_013, "daily");
  assert.equal(followUp.state, "queued");
  assert.equal(followUp.execution_id, null);
  const requests = store.listRequests("target-enterprise");
  assert.equal(requests.filter((row) => row.execution_id === execution.id).length, 3);
  assert.equal(requests.filter((row) => row.state === "queued").length, 1);
  assert.equal(daily.execution_id, null);
  store.releaseLease(lease);
});

test("lost response binds one exact target-marker-hash match without a duplicate", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "lost-response");
  createEnterpriseTarget(store);
  prepareExecution(store);
  const work = store.listWork("target-enterprise")[0];
  const provider = new FakeEnterpriseProvider();
  provider.setWritePlan(work.operation_key, ["accept_then_timeout"]);
  const clock = { value: 3_000 };
  const runner = engine(store, provider, clock);

  const first = await runner.runOnce({ targetAlias: "target-enterprise", workerId: "worker-one" });
  assert.equal(first.state, "partial");
  assert.equal(store.getWork(work.id).state, "needs_reconcile");
  assert.equal(provider.sources.length, 1);
  assert.equal(store.getTarget("target-enterprise").last_successful_run_at, null);

  enqueue(store, "target-enterprise", "reconcile-request", 3_100);
  clock.value = 3_100;
  const second = await runner.runOnce({ targetAlias: "target-enterprise", workerId: "worker-two" });
  assert.equal(second.state, "succeeded");
  assert.equal(store.getWork(work.id).state, "notebook_synced");
  assert.equal(provider.countCalls("write", work.operation_key), 1);
  assert.equal(provider.sources.length, 1);
});

test("non-exact reconciliation candidates are ignored and inconclusive zero requires manual resolution", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "wrong-match");
  createEnterpriseTarget(store);
  prepareExecution(store);
  const work = store.listWork("target-enterprise")[0];
  const provider = new FakeEnterpriseProvider({ conclusiveZeroAfterMs: null });
  provider.setWritePlan(work.operation_key, ["ambiguous_without_accept"]);
  const clock = { value: 3_000 };
  const runner = engine(store, provider, clock);
  await runner.runOnce({ targetAlias: "target-enterprise", workerId: "writer" });

  provider.reconcile = async () => [
    provider.seedSource({
      targetAlias: "wrong-target",
      marker: work.marker,
      desiredHash: work.desired_hash,
    }),
    provider.seedSource({
      targetAlias: "target-enterprise",
      marker: work.marker,
      desiredHash: "wrong-hash",
    }),
  ];
  enqueue(store, "target-enterprise", "wrong-match-reconcile", 3_100);
  clock.value = 3_100;
  const result = await runner.runOnce({ targetAlias: "target-enterprise", workerId: "reconciler" });
  assert.equal(result.state, "partial");
  assert.equal(store.getWork(work.id).state, "manual_reconcile");
  assert.equal(store.getWork(work.id).failure_code, "reconcile_zero_inconclusive");
  assert.equal(provider.countCalls("write", work.operation_key), 1);
});

test("multiple exact reconciliation matches block and never trigger another create", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "multiple-match");
  createEnterpriseTarget(store);
  prepareExecution(store);
  const work = store.listWork("target-enterprise")[0];
  const provider = new FakeEnterpriseProvider();
  provider.setWritePlan(work.operation_key, ["ambiguous_without_accept"]);
  const clock = { value: 3_000 };
  const runner = engine(store, provider, clock);
  await runner.runOnce({ targetAlias: "target-enterprise", workerId: "writer" });
  provider.seedSource({
    targetAlias: "target-enterprise",
    marker: work.marker,
    desiredHash: work.desired_hash,
  });
  provider.seedSource({
    targetAlias: "target-enterprise",
    marker: work.marker,
    desiredHash: work.desired_hash,
  });
  enqueue(store, "target-enterprise", "multiple-reconcile", 3_100);
  clock.value = 3_100;
  await runner.runOnce({ targetAlias: "target-enterprise", workerId: "reconciler" });
  assert.equal(store.getWork(work.id).state, "manual_reconcile");
  assert.equal(store.getWork(work.id).failure_code, "reconcile_multiple");
  assert.equal(provider.countCalls("write", work.operation_key), 1);
});

test("conclusive zero waits through uncertainty and permits only one ambiguity retry", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "conclusive-zero");
  createEnterpriseTarget(store);
  prepareExecution(store, { now: 0, requestKey: "initial-zero" });
  const work = store.listWork("target-enterprise")[0];
  const provider = new FakeEnterpriseProvider({ conclusiveZeroAfterMs: 100 });
  provider.setWritePlan(work.operation_key, ["ambiguous_without_accept", "complete"]);
  const clock = { value: 0 };
  const runner = engine(store, provider, clock);
  await runner.runOnce({ targetAlias: "target-enterprise", workerId: "writer", ttlMs: 1_000 });
  assert.equal(provider.countCalls("write", work.operation_key), 1);

  enqueue(store, "target-enterprise", "zero-before-horizon", 50);
  clock.value = 50;
  await runner.runOnce({ targetAlias: "target-enterprise", workerId: "early-reconciler" });
  assert.equal(store.getWork(work.id).state, "needs_reconcile");
  assert.equal(provider.countCalls("write", work.operation_key), 1);

  enqueue(store, "target-enterprise", "zero-at-horizon", 100);
  clock.value = 100;
  await runner.runOnce({ targetAlias: "target-enterprise", workerId: "horizon-reconciler" });
  assert.equal(store.getWork(work.id).state, "retry_wait");
  assert.equal(Number(store.getWork(work.id).ambiguity_retry_count), 1);

  enqueue(store, "target-enterprise", "bounded-retry", 101);
  clock.value = 101;
  const completed = await runner.runOnce({ targetAlias: "target-enterprise", workerId: "retry-worker" });
  assert.equal(completed.state, "succeeded");
  assert.equal(provider.countCalls("write", work.operation_key), 2);
  assert.equal(provider.sources.length, 1);

  enqueue(store, "target-enterprise", "terminal-rerun", 102);
  clock.value = 102;
  await runner.runOnce({ targetAlias: "target-enterprise", workerId: "rerun-worker" });
  assert.equal(provider.countCalls("write", work.operation_key), 2);
});

test("an invalid visibility horizon fails closed and never enables a blind retry", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "invalid-horizon");
  createEnterpriseTarget(store);
  prepareExecution(store, { now: 0, requestKey: "invalid-horizon-initial" });
  const work = store.listWork("target-enterprise")[0];
  const provider = new FakeEnterpriseProvider({ conclusiveZeroAfterMs: -1 });
  provider.setWritePlan(work.operation_key, [{ kind: "accept_then_timeout", visibleAfterMs: 100 }]);
  const clock = { value: 0 };
  const runner = engine(store, provider, clock);
  await runner.runOnce({ targetAlias: "target-enterprise", workerId: "invalid-horizon-writer" });
  assert.equal(store.getWork(work.id).state, "needs_reconcile");
  assert.equal(store.getWork(work.id).uncertain_until, null);

  enqueue(store, "target-enterprise", "invalid-horizon-reconcile", 1);
  clock.value = 1;
  await runner.runOnce({ targetAlias: "target-enterprise", workerId: "invalid-horizon-reconciler" });
  assert.equal(store.getWork(work.id).state, "manual_reconcile");
  assert.equal(store.getWork(work.id).failure_code, "reconcile_zero_inconclusive");
  assert.equal(provider.countCalls("write", work.operation_key), 1);
  assert.equal(provider.sources.length, 1);

  enqueue(store, "target-enterprise", "invalid-horizon-rerun", 2);
  clock.value = 2;
  await runner.runOnce({ targetAlias: "target-enterprise", workerId: "invalid-horizon-rerunner" });
  assert.equal(provider.countCalls("write", work.operation_key), 1);
  assert.equal(provider.sources.length, 1);
});

test("store mutations reject a lease, execution, or work row from another target", (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "cross-target-scope");
  createEnterpriseTarget(store, "target-alpha");
  createEnterpriseTarget(store, "target-beta");
  const alphaExecution = prepareExecution(store, {
    targetAlias: "target-alpha",
    now: 10,
    requestKey: "alpha-request",
  });
  const betaExecution = prepareExecution(store, {
    targetAlias: "target-beta",
    now: 10,
    requestKey: "beta-request",
  });
  const betaWork = store.listWork("target-beta")[0];
  const alphaLease = store.acquireLease({
    targetAlias: "target-alpha",
    workerId: "alpha-worker",
    now: 20,
    ttlMs: 100,
  });
  assert.throws(
    () =>
      store.beginCreateIntent(alphaLease, {
        executionId: betaExecution.id,
        workId: betaWork.id,
        now: 20,
        conclusiveZeroAfterMs: null,
      }),
    /execution_scope_mismatch/,
  );
  assert.throws(
    () =>
      store.beginCreateIntent(alphaLease, {
        executionId: alphaExecution.id,
        workId: betaWork.id,
        now: 20,
        conclusiveZeroAfterMs: null,
      }),
    /work_scope_mismatch/,
  );
  assert.throws(
    () => store.finalizeExecution(alphaLease, { executionId: betaExecution.id, now: 20 }),
    /execution_scope_mismatch/,
  );
  assert.equal(store.getWork(betaWork.id).state, "prepared");
  assert.equal(store.getExecution(betaExecution.id).state, "running");
  store.releaseLease(alphaLease);
});

test("a provider adapter cannot run against a target from another path", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "provider-path-mismatch");
  createEnterpriseTarget(store);
  enqueue(store, "target-enterprise", "provider-path-request", 1);
  const provider = new FakeDriveProvider();
  await assert.rejects(
    engine(store, provider, { value: 1 }).runOnce({
      targetAlias: "target-enterprise",
      workerId: "wrong-provider-worker",
    }),
    /provider_path_mismatch/,
  );
  assert.equal(store.listWork("target-enterprise").length, 0);
  assert.equal(store.getTarget("target-enterprise").last_successful_run_at, null);
});

test("crash after provider response recovers from a reopened database by reconciliation", async (t) => {
  const { dbPath, store } = newDatabase(t);
  capture(store, 0, "response-crash");
  createEnterpriseTarget(store);
  enqueue(store, "target-enterprise", "response-crash-request", 0);
  const provider = new FakeEnterpriseProvider();
  const clock = { value: 0 };
  const firstRunner = engine(store, provider, clock);
  const interrupted = await firstRunner.runOnce({
    targetAlias: "target-enterprise",
    workerId: "crashing-worker",
    ttlMs: 10,
    failpoint: "after_provider_response",
  });
  assert.deepEqual(interrupted, { state: "interrupted", point: "after_provider_response" });
  assert.equal(store.listWork("target-enterprise")[0].state, "creating");
  assert.equal(provider.sources.length, 1);
  store.close();

  const reopened = new ResearchStore(dbPath);
  t.after(() => reopened.close());
  clock.value = 20;
  const recoveryRunner = engine(reopened, provider, clock);
  const recovered = await recoveryRunner.runOnce({
    targetAlias: "target-enterprise",
    workerId: "recovery-worker",
    ttlMs: 100,
  });
  assert.equal(recovered.state, "succeeded");
  assert.equal(reopened.listWork("target-enterprise")[0].state, "notebook_synced");
  assert.equal(provider.countCalls("write"), 1);
  assert.equal(provider.sources.length, 1);
});

test("expired lease takeover fences a paused writer and reconciles its accepted source", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "fence-race");
  createEnterpriseTarget(store);
  prepareExecution(store, { now: 0, requestKey: "fence-request" });
  const work = store.listWork("target-enterprise")[0];
  const barrier = createAsyncBarrier();
  const provider = new FakeEnterpriseProvider();
  provider.setWritePlan(work.operation_key, [{ kind: "accept_then_wait", barrier }]);
  const clock = { value: 0 };
  const runner = engine(store, provider, clock);

  const staleRun = runner.runOnce({
    targetAlias: "target-enterprise",
    workerId: "worker-a",
    ttlMs: 10,
  });
  await barrier.arrived;
  assert.equal(store.getWork(work.id).state, "creating");
  assert.equal(provider.sources.length, 1);

  clock.value = 20;
  const takeover = await runner.runOnce({
    targetAlias: "target-enterprise",
    workerId: "worker-b",
    ttlMs: 100,
  });
  assert.equal(takeover.state, "succeeded");
  assert.equal(store.getWork(work.id).state, "notebook_synced");
  assert.equal(Number(store.getTarget("target-enterprise").lease_fence), 3);

  barrier.release();
  assert.equal((await staleRun).state, "stale");
  assert.equal(provider.countCalls("write", work.operation_key), 1);
  assert.equal(provider.sources.length, 1);
  assert.throws(
    () =>
      store.assertLease(
        { targetAlias: "target-enterprise", workerId: "worker-a", fence: 2 },
        clock.value,
      ),
    StaleFenceError,
  );
});

test("a poison item is isolated while cursor and healthy newer work progress without false success", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "healthy-before");
  capture(store, 1, "poison");
  capture(store, 2, "healthy-after");
  createEnterpriseTarget(store);
  prepareExecution(store);
  const initialWork = store.listWork("target-enterprise");
  const provider = new FakeEnterpriseProvider();
  provider.setWritePlan(initialWork[1].operation_key, ["permanent_failure"]);
  const clock = { value: 3_000 };
  const runner = engine(store, provider, clock);
  const first = await runner.runOnce({ targetAlias: "target-enterprise", workerId: "poison-worker" });
  assert.equal(first.state, "partial");
  assert.deepEqual(
    store.listWork("target-enterprise").map((row) => row.state),
    ["notebook_synced", "permanent_failure", "notebook_synced"],
  );
  assert.equal(Number(store.getTarget("target-enterprise").discovery_cursor), 3);
  assert.equal(store.getTarget("target-enterprise").last_successful_run_at, null);

  capture(store, 3, "newer-after-poison", 3_100);
  enqueue(store, "target-enterprise", "newer-request", 3_100);
  clock.value = 3_100;
  const second = await runner.runOnce({ targetAlias: "target-enterprise", workerId: "newer-worker" });
  assert.equal(second.state, "partial");
  assert.equal(store.listWork("target-enterprise")[3].state, "notebook_synced");
  assert.equal(Number(store.getTarget("target-enterprise").discovery_cursor), 4);
  assert.equal(store.getTarget("target-enterprise").last_successful_run_at, null);
  assert.equal(provider.countCalls("write"), 4);
});

test("pending observation never recreates and only COMPLETE advances last-success truth", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "pending-source");
  createEnterpriseTarget(store);
  prepareExecution(store, { now: 0, requestKey: "pending-request" });
  const work = store.listWork("target-enterprise")[0];
  const provider = new FakeEnterpriseProvider();
  provider.setWritePlan(work.operation_key, ["pending"]);
  const clock = { value: 0 };
  const runner = engine(store, provider, clock);
  const first = await runner.runOnce({ targetAlias: "target-enterprise", workerId: "creator" });
  assert.equal(first.state, "partial");
  assert.equal(store.getWork(work.id).state, "processing");
  assert.equal(store.getTarget("target-enterprise").last_successful_run_at, null);

  enqueue(store, "target-enterprise", "early-poll", 500);
  clock.value = 500;
  await runner.runOnce({ targetAlias: "target-enterprise", workerId: "early-poller" });
  assert.equal(provider.countCalls("write", work.operation_key), 1);
  assert.equal(store.getWork(work.id).state, "processing");

  provider.setStatus(provider.sources[0].sourceId, "COMPLETE");
  enqueue(store, "target-enterprise", "complete-poll", 1_000);
  clock.value = 1_000;
  const completed = await runner.runOnce({ targetAlias: "target-enterprise", workerId: "final-poller" });
  assert.equal(completed.state, "succeeded");
  assert.equal(store.getWork(work.id).state, "notebook_synced");
  assert.equal(provider.countCalls("write", work.operation_key), 1);
  assert.equal(Number(store.getTarget("target-enterprise").last_successful_run_at), 1_000);
});

test("crash after terminal item commit finalizes exactly once after reopen", async (t) => {
  const { dbPath, store } = newDatabase(t);
  capture(store, 0, "finalize-crash");
  createEnterpriseTarget(store);
  enqueue(store, "target-enterprise", "finalize-crash-request", 0);
  const provider = new FakeEnterpriseProvider();
  const clock = { value: 0 };
  const firstRunner = engine(store, provider, clock);
  const interrupted = await firstRunner.runOnce({
    targetAlias: "target-enterprise",
    workerId: "terminal-writer",
    ttlMs: 10,
    failpoint: "after_terminal_commit",
  });
  assert.equal(interrupted.state, "interrupted");
  assert.equal(store.listWork("target-enterprise")[0].state, "notebook_synced");
  assert.equal(store.getTarget("target-enterprise").last_successful_run_at, null);
  store.close();

  const reopened = new ResearchStore(dbPath);
  t.after(() => reopened.close());
  clock.value = 20;
  const recovery = engine(reopened, provider, clock);
  const finalized = await recovery.runOnce({
    targetAlias: "target-enterprise",
    workerId: "finalizer",
    ttlMs: 100,
  });
  assert.equal(finalized.state, "succeeded");
  assert.equal(Number(reopened.getTarget("target-enterprise").last_successful_run_at), 20);
  assert.equal(provider.countCalls("write"), 1);
  assert.equal(reopened.listExecutions("target-enterprise").length, 1);
});

test("definite transient failures allow the initial call plus no more than two retries", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "retry-cap");
  createEnterpriseTarget(store);
  prepareExecution(store, { now: 0, requestKey: "retry-initial" });
  const work = store.listWork("target-enterprise")[0];
  const provider = new FakeEnterpriseProvider();
  provider.setWritePlan(work.operation_key, [
    "definite_transient",
    "definite_transient",
    "definite_transient",
    "complete",
  ]);
  const clock = { value: 0 };
  const runner = engine(store, provider, clock, 2);
  for (const [index, now] of [0, 1_000, 2_000].entries()) {
    if (index > 0) enqueue(store, "target-enterprise", `retry-${index}`, now);
    clock.value = now;
    await runner.runOnce({ targetAlias: "target-enterprise", workerId: `retry-worker-${index}` });
  }
  assert.equal(provider.countCalls("write", work.operation_key), 3);
  assert.equal(store.getWork(work.id).state, "permanent_failure");
  assert.equal(Number(store.getWork(work.id).retry_count), 2);
  enqueue(store, "target-enterprise", "after-retry-cap", 3_000);
  clock.value = 3_000;
  await runner.runOnce({ targetAlias: "target-enterprise", workerId: "after-cap-worker" });
  assert.equal(provider.countCalls("write", work.operation_key), 3);
});

test("the global retry maximum cannot be configured above two", (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  const provider = new FakeEnterpriseProvider();
  assert.throws(() => engine(store, provider, { value: 0 }, 3), /invalid_retry_limit/);
});

test("a malformed mapped item is isolated and does not wedge a healthy later item", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  store.captureSyntheticItem({
    eventUuid: "event-malformed-body",
    item: { ...structuredClone(SYNTHETIC_ITEMS[0]), body: null },
    occurredAt: 1,
  });
  capture(store, 1, "healthy-after-malformed", 2);
  createEnterpriseTarget(store);
  prepareExecution(store, { now: 10, requestKey: "malformed-request" });
  const provider = new FakeEnterpriseProvider();
  const clock = { value: 20 };
  const result = await engine(store, provider, clock).runOnce({
    targetAlias: "target-enterprise",
    workerId: "malformed-worker",
  });
  assert.equal(result.state, "succeeded");
  assert.deepEqual(
    store.listWork("target-enterprise").map((row) => [row.state, row.reason]),
    [["unsupported", "text_unavailable"], ["notebook_synced", null]],
  );
  assert.equal(Number(store.getTarget("target-enterprise").discovery_cursor), 2);
  assert.equal(provider.countCalls("write"), 1);
});

test("invalid page sizes are rejected and an incomplete cutoff cannot finalize success", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "incomplete-cutoff");
  createEnterpriseTarget(store);
  enqueue(store, "target-enterprise", "incomplete-request", 1);
  const provider = new FakeEnterpriseProvider();
  await assert.rejects(
    engine(store, provider, { value: 1 }).runOnce({
      targetAlias: "target-enterprise",
      workerId: "invalid-page-worker",
      pageSize: 0,
    }),
    /invalid_page_size/,
  );
  assert.equal(store.getTarget("target-enterprise").last_successful_run_at, null);
  const lease = store.acquireLease({
    targetAlias: "target-enterprise",
    workerId: "incomplete-finalizer",
    now: 2,
    ttlMs: 100,
  });
  const execution = store.beginNextExecution(lease, { now: 2 });
  assert.throws(
    () => store.finalizeExecution(lease, { executionId: execution.id, now: 2 }),
    /discovery_incomplete/,
  );
  assert.equal(store.getTarget("target-enterprise").last_successful_run_at, null);
  store.releaseLease(lease);
});

test("Drive uses one stable revisioned file, reconciles a lost response, and never claims NotebookLM sync", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "drive-one");
  store.createTarget({
    targetAlias: "target-drive",
    path: "drive",
    strategy: "rolling_doc",
    baseline: "all",
    driveFileAlias: "stable-file-a",
    driveRevision: 0,
  });
  const provider = new FakeDriveProvider();
  provider.createStableFile({ targetAlias: "target-drive", fileAlias: "stable-file-a", revision: 0 });
  prepareExecution(store, {
    targetAlias: "target-drive",
    now: 0,
    requestKey: "drive-initial",
  });
  const firstWork = store.listWork("target-drive")[0];
  provider.setWritePlan(firstWork.operation_key, ["accept_then_timeout"]);
  const clock = { value: 0 };
  const runner = engine(store, provider, clock);

  await runner.runOnce({ targetAlias: "target-drive", workerId: "drive-writer" });
  assert.equal(store.getWork(firstWork.id).state, "needs_reconcile");
  assert.equal(provider.snapshot("target-drive").revision, 1);
  assert.equal(Number(store.getTarget("target-drive").drive_revision), 0);

  enqueue(store, "target-drive", "drive-reconcile", 1);
  clock.value = 1;
  const reconciled = await runner.runOnce({ targetAlias: "target-drive", workerId: "drive-reconciler" });
  assert.equal(reconciled.state, "succeeded");
  assert.equal(store.getWork(firstWork.id).state, "drive_updated_unverified");
  assert.equal(Number(store.getTarget("target-drive").drive_revision), 1);
  assert.equal(provider.countCalls("write", firstWork.operation_key), 1);

  capture(store, 1, "drive-two", 2);
  enqueue(store, "target-drive", "drive-second", 2);
  clock.value = 2;
  const second = await runner.runOnce({ targetAlias: "target-drive", workerId: "drive-second-writer" });
  assert.equal(second.state, "succeeded");
  const snapshot = provider.snapshot("target-drive");
  assert.equal(snapshot.fileAlias, "stable-file-a");
  assert.equal(snapshot.revision, 2);
  assert.equal(Object.keys(snapshot.entries).length, 2);
  assert.equal(provider.files.size, 1);

  const status = store.projectSafeStatus("target-drive");
  assert.equal(status.lastNotebookSourceCompleteAt, null);
  assert.equal(Number(status.lastDriveDocumentUpdatedAt), 2);
  assert.equal(status.terminalLabel, "Drive document updated — NotebookLM refresh unverified");
});

test("Drive stops after an ambiguous earlier revision and resumes later items in sequence", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "drive-sequence-one", 1);
  capture(store, 1, "drive-sequence-two", 2);
  store.createTarget({
    targetAlias: "target-drive",
    path: "drive",
    strategy: "rolling_doc",
    baseline: "all",
    driveFileAlias: "stable-file-a",
    driveRevision: 0,
  });
  const provider = new FakeDriveProvider();
  provider.createStableFile({ targetAlias: "target-drive", fileAlias: "stable-file-a", revision: 0 });
  prepareExecution(store, { targetAlias: "target-drive", now: 0, requestKey: "drive-sequence" });
  const [firstWork, secondWork] = store.listWork("target-drive");
  provider.setWritePlan(firstWork.operation_key, ["accept_then_timeout"]);
  const clock = { value: 0 };
  const runner = engine(store, provider, clock);

  const first = await runner.runOnce({ targetAlias: "target-drive", workerId: "drive-sequence-writer" });
  assert.equal(first.state, "partial");
  assert.deepEqual(store.listWork("target-drive").map((row) => row.state), ["needs_reconcile", "prepared"]);
  assert.equal(provider.countCalls("write", firstWork.operation_key), 1);
  assert.equal(provider.countCalls("write", secondWork.operation_key), 0);
  assert.equal(provider.snapshot("target-drive").revision, 1);
  assert.equal(Number(store.getTarget("target-drive").drive_revision), 0);

  enqueue(store, "target-drive", "drive-sequence-resume", 1);
  clock.value = 1;
  const second = await runner.runOnce({ targetAlias: "target-drive", workerId: "drive-sequence-resumer" });
  assert.equal(second.state, "succeeded");
  assert.deepEqual(
    store.listWork("target-drive").map((row) => row.state),
    ["drive_updated_unverified", "drive_updated_unverified"],
  );
  assert.equal(provider.countCalls("write", firstWork.operation_key), 1);
  assert.equal(provider.countCalls("write", secondWork.operation_key), 1);
  assert.equal(provider.snapshot("target-drive").revision, 2);
  assert.equal(Number(store.getTarget("target-drive").drive_revision), 2);
});

test("Drive rejects a same-revision receipt and does not claim an update", async (t) => {
  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "drive-nonadvancing", 1);
  store.createTarget({
    targetAlias: "target-drive",
    path: "drive",
    strategy: "rolling_doc",
    baseline: "all",
    driveFileAlias: "stable-file-a",
    driveRevision: 0,
  });
  enqueue(store, "target-drive", "drive-nonadvancing-request", 1);
  const provider = new FakeDriveProvider();
  provider.createStableFile({ targetAlias: "target-drive", fileAlias: "stable-file-a", revision: 0 });
  provider.write = async (intent) => ({
    kind: "drive_revision",
    targetAlias: intent.targetAlias,
    fileAlias: intent.fileAlias,
    revision: intent.requiredRevision,
    marker: intent.marker,
    desiredHash: intent.desiredHash,
    status: "DRIVE_UPDATED",
  });
  const result = await engine(store, provider, { value: 1 }).runOnce({
    targetAlias: "target-drive",
    workerId: "drive-nonadvancing-worker",
  });
  assert.equal(result.state, "partial");
  assert.equal(store.listWork("target-drive")[0].state, "manual_reconcile");
  assert.equal(store.getTarget("target-drive").last_drive_document_updated_at, null);
  assert.equal(store.projectSafeStatus("target-drive").terminalLabel, null);
});

test("safe status is content-free, fixtures stay under ten, and the harness makes no network call", async (t) => {
  assert.ok(SYNTHETIC_ITEMS.length <= 10);
  assert.equal(new Set(SYNTHETIC_ITEMS.map((item) => item.id)).size, SYNTHETIC_ITEMS.length);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network_forbidden");
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const { store } = newDatabase(t);
  t.after(() => store.close());
  capture(store, 0, "safe-status");
  createEnterpriseTarget(store);
  assert.equal(store.projectSafeStatus("target-enterprise").terminalLabel, null);
  enqueue(store, "target-enterprise", "safe-status-request", 1);
  const provider = new FakeEnterpriseProvider();
  const clock = { value: 1 };
  await engine(store, provider, clock).runOnce({
    targetAlias: "target-enterprise",
    workerId: "safe-worker",
  });
  const serialized = JSON.stringify(store.projectSafeStatus("target-enterprise"));
  assert.doesNotMatch(serialized, /synthetic-item-/);
  assert.doesNotMatch(serialized, /fake-source-/);
  assert.doesNotMatch(serialized, /abop_/);
  assert.doesNotMatch(serialized, /Alpha is a fictional/);
  assert.doesNotMatch(serialized, /example\.com/);
});
