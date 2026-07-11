import "./recall-manual-sync.test.setup";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rmSync } from "node:fs";
import { DB_BUSY_TIMEOUT_MS, getDb } from "./client";
import { insertRecallSyncRun } from "./recall-sync";
import {
  RECALL_REQUEST_COOLDOWN_MS,
  RECALL_HEARTBEAT_STALE_MS,
  RECALL_BUSY_RETRY_DELAYS_MS,
  RECALL_IDEMPOTENCY_ABSENCE_RESOLUTION_MS,
  RecallSyncCooldownError,
  RecallSyncTerminalReplayError,
  claimRecallSyncRequest,
  completeRecallSyncExecution,
  enqueueRecallSyncRequest,
  failRecallSyncExecution,
  getActiveRecallRequest,
  getTrustedRecallSchedule,
  getRecallRequest,
  heartbeatRecallExecution,
  latestValidatedRecallSuccess,
  requeueStaleClaimedRecallRequest,
  reconcileStaleRecallExecution,
  startRecallSyncExecution,
  setRecallScheduleSnapshot,
  updateRecallExecutionStage,
} from "./recall-manual-sync";
import { TEST_DB_DIR } from "./recall-manual-sync.test.setup";

after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

test("migration 024 creates constrained request/execution schema and run correlations", () => {
  const db = getDb();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  assert.ok(tables.some((row) => row.name === "recall_sync_executions"));
  assert.ok(tables.some((row) => row.name === "recall_sync_requests"));
  const columns = db.prepare("PRAGMA table_info(recall_sync_runs)").all() as { name: string }[];
  assert.ok(columns.some((row) => row.name === "execution_id"));
  assert.throws(() => db.prepare(
    "INSERT INTO recall_sync_requests (id,idempotency_key,owner_id,state,requested_at,expires_at) VALUES ('x','k','owner','bogus',1,2)",
  ).run());
});

test("absent-idempotency resolution covers the complete SQLite busy retry model", () => {
  const maximumBusyWait =
    DB_BUSY_TIMEOUT_MS * RECALL_BUSY_RETRY_DELAYS_MS.length +
    RECALL_BUSY_RETRY_DELAYS_MS.reduce<number>((total, delay) => total + delay, 0);
  assert.deepEqual(RECALL_BUSY_RETRY_DELAYS_MS, [0, 50, 150]);
  assert.equal(DB_BUSY_TIMEOUT_MS, 5_000);
  assert.equal(maximumBusyWait, 15_200);
  assert.equal(RECALL_IDEMPOTENCY_ABSENCE_RESOLUTION_MS, 20_000);
  assert.ok(RECALL_IDEMPOTENCY_ABSENCE_RESOLUTION_MS >= maximumBusyWait + 4_800);
});

test("enqueue and claim are durable, single-active, and idempotent", async () => {
  const now = 1_800_000_000_000;
  const first = await enqueueRecallSyncRequest({ idempotencyKey: "key_abcdefghijklmnop", ownerId: "owner", now });
  assert.equal(first.deduplicated, false);
  const replay = await enqueueRecallSyncRequest({ idempotencyKey: "key_abcdefghijklmnop", ownerId: "owner", now: now + 1 });
  assert.equal(replay.deduplicated, true);
  assert.equal(replay.request.id, first.request.id);
  const otherTab = await enqueueRecallSyncRequest({ idempotencyKey: "key_qrstuvwxyz12345", ownerId: "owner", now: now + 2 });
  assert.equal(otherTab.request.id, first.request.id);
  const claimed = await claimRecallSyncRequest(now + 3);
  assert.equal(claimed?.state, "claimed");
  assert.equal(getActiveRecallRequest()?.id, first.request.id);
});

test("lifecycle atomically validates success and preserves it through a later partial failure", async () => {
  const request = getActiveRecallRequest()!;
  const started = 1_800_000_000_100;
  const startedResult = startRecallSyncExecution({ occurrenceKey: `manual:${request.id}`, trigger: "manual_ui", requestId: request.id, now: started });
  assert.equal(startedResult.kind, "created");
  const execution = startedResult.execution;
  assert.equal(getRecallRequest(request.id)?.state, "running");
  assert.equal(heartbeatRecallExecution(execution.id, started + 15_000), true);
  updateRecallExecutionStage({ id: execution.id, stage: "apply", now: started + 20_000, runId: "apply-one" });
  insertRecallSyncRun({
    id: "apply-one", mode: "apply", started_at: started, completed_at: started + 25_000, state: "done",
    date_from: null, date_to: null, cards_seen: 2, cards_imported: 1, cards_upgraded: 0,
    cards_skipped: 1, cards_changed_remote: 0, cards_blocked: 0, total_chars_planned: 1,
    total_chunks_fetched: 1, last_error: null, report_json: "{}", execution_id: execution.id,
    trigger: "manual_ui", request_id: request.id,
  });
  assert.throws(
    () => completeRecallSyncExecution({ id: execution.id, applyRunId: "apply-one", now: started + 29_000 }),
    /has not validated/,
  );
  assert.equal(latestValidatedRecallSuccess(), null);
  updateRecallExecutionStage({ id: execution.id, stage: "apply_validated", now: started + 29_500 });
  const complete = completeRecallSyncExecution({ id: execution.id, applyRunId: "apply-one", now: started + 30_000 });
  assert.equal(complete.state, "done");
  assert.equal(latestValidatedRecallSuccess()?.id, execution.id);
  assert.deepEqual(
    [getRecallRequest(request.id)?.cards_imported, getRecallRequest(request.id)?.cards_already_current],
    [1, 1],
  );
  await assert.rejects(
    () => enqueueRecallSyncRequest({ idempotencyKey: request.idempotency_key, ownerId: "owner", now: started + 31_000 }),
    (error) => error instanceof RecallSyncTerminalReplayError && error.request.state === "done",
  );

  const later = started + 30_000 + RECALL_REQUEST_COOLDOWN_MS + 1;
  const next = await enqueueRecallSyncRequest({ idempotencyKey: "key_secondrequest123", ownerId: "owner", now: later });
  await claimRecallSyncRequest(later + 1);
  const failedExecution = startRecallSyncExecution({ occurrenceKey: `manual:${next.request.id}`, trigger: "manual_ui", requestId: next.request.id, now: later + 2 }).execution;
  insertRecallSyncRun({
    id: "apply-two", mode: "apply", started_at: later + 2, completed_at: later + 5, state: "error",
    date_from: null, date_to: null, cards_seen: 3, cards_imported: 2, cards_upgraded: 0,
    cards_skipped: 0, cards_changed_remote: 0, cards_blocked: 0, total_chars_planned: 1,
    total_chunks_fetched: 1, last_error: "redacted", report_json: "{}", execution_id: failedExecution.id,
    trigger: "manual_ui", request_id: next.request.id,
  });
  const failed = failRecallSyncExecution({ id: failedExecution.id, applyRunId: "apply-two", safeReason: "internal", now: later + 10 });
  assert.equal(failed.state, "partial_failure");
  assert.equal(failed.cards_imported, 2);
  assert.equal(getRecallRequest(next.request.id)?.state, "partial_failure");
  assert.equal(latestValidatedRecallSuccess()?.id, execution.id);
  await assert.rejects(
    () => enqueueRecallSyncRequest({ idempotencyKey: "key_cooldown123456", ownerId: "owner", now: later + 11 }),
    (error) => error instanceof RecallSyncCooldownError && error.retryAfterSeconds > 0,
  );
});

test("every terminal idempotency replay remains terminal after cooldown", async () => {
  const now = 1_850_000_000_000;
  for (const [index, state] of ["done", "blocked", "error", "partial_failure", "expired"].entries()) {
    const requestedAt = now - RECALL_REQUEST_COOLDOWN_MS - 10_000 + index;
    const completedAt = now - RECALL_REQUEST_COOLDOWN_MS - 1_000 + index;
    const key = `terminal-replay-${state}-key`;
    getDb().prepare(
      `INSERT INTO recall_sync_requests
       (id,idempotency_key,owner_id,state,requested_at,completed_at,expires_at,safe_reason)
       VALUES (?,?,?,?,?,?,?,?)`,
    ).run(
      `terminal-replay-${state}`,
      key,
      "owner",
      state,
      requestedAt,
      completedAt,
      requestedAt + RECALL_REQUEST_COOLDOWN_MS,
      state === "expired" ? "expired" : "internal",
    );
    await assert.rejects(
      () => enqueueRecallSyncRequest({ idempotencyKey: key, ownerId: "owner", now }),
      (error) => error instanceof RecallSyncTerminalReplayError && error.request.state === state && error.retryAfterSeconds === 0,
    );
  }
});

test("stale claimed work preserves its original expiry and expires at the exact boundary", async () => {
  const latest = getLatestTerminalCompletedAt();
  const now = latest + RECALL_REQUEST_COOLDOWN_MS + 1;
  const queued = await enqueueRecallSyncRequest({ idempotencyKey: "key_staleclaim12345", ownerId: "owner", now });
  await claimRecallSyncRequest(now + 1);
  getDb().prepare("UPDATE recall_sync_requests SET heartbeat_at = ? WHERE id = ?").run(now - 100_000, queued.request.id);
  assert.equal(requeueStaleClaimedRecallRequest(now, false), "none");
  assert.equal(getRecallRequest(queued.request.id)?.state, "claimed");
  const originalExpiry = getRecallRequest(queued.request.id)!.expires_at;
  assert.equal(requeueStaleClaimedRecallRequest(originalExpiry - 1, true), "requeued");
  assert.equal(getRecallRequest(queued.request.id)?.state, "queued");
  assert.equal(getRecallRequest(queued.request.id)?.expires_at, originalExpiry);
  await claimRecallSyncRequest(originalExpiry - RECALL_HEARTBEAT_STALE_MS - 2);
  getDb().prepare("UPDATE recall_sync_requests SET heartbeat_at = ? WHERE id = ?").run(
    originalExpiry - RECALL_HEARTBEAT_STALE_MS,
    queued.request.id,
  );
  assert.equal(requeueStaleClaimedRecallRequest(originalExpiry, true), "expired");
  assert.equal(getRecallRequest(queued.request.id)?.state, "expired");
  getDb().prepare(
    `INSERT INTO recall_sync_requests
     (id,idempotency_key,owner_id,state,requested_at,claimed_at,heartbeat_at,expires_at,safe_reason)
     VALUES ('expiry-plus','expiry-plus-key','owner','claimed',?,?,?,?, 'active')`,
  ).run(originalExpiry + 10, originalExpiry + 11, originalExpiry - RECALL_HEARTBEAT_STALE_MS, originalExpiry + 20);
  assert.equal(requeueStaleClaimedRecallRequest(originalExpiry + 21, true), "expired");
  assert.equal(getRecallRequest("expiry-plus")?.state, "expired");
});

test("validated success is rejected from every pre-validator stage", () => {
  const priorSuccess = latestValidatedRecallSuccess()?.id;
  const stages = ["starting", "dry_run", "dry_run_validated", "backup", "apply"] as const;
  for (const [index, stage] of stages.entries()) {
    const now = 2_100_000_000_000 + index * 1_000;
    const execution = startRecallSyncExecution({
      occurrenceKey: `automatic:pre-validator-${stage}`,
      trigger: "automatic",
      now,
    }).execution;
    const runId = `pre-validator-run-${index}`;
    insertRecallSyncRun({
      id: runId, mode: "apply", started_at: now, completed_at: now + 1, state: "done",
      date_from: null, date_to: null, cards_seen: 0, cards_imported: 0, cards_upgraded: 0,
      cards_skipped: 0, cards_changed_remote: 0, cards_blocked: 0, total_chars_planned: 0,
      total_chunks_fetched: 0, last_error: null, report_json: "{}", execution_id: execution.id,
      trigger: "automatic", request_id: null,
    });
    getDb().prepare("UPDATE recall_sync_executions SET stage = ?, apply_run_id = ? WHERE id = ?").run(stage, runId, execution.id);
    assert.throws(
      () => completeRecallSyncExecution({ id: execution.id, applyRunId: runId, now: now + 2 }),
      /has not validated/,
    );
    assert.equal(getRecallExecutionState(execution.id), "running");
    failRecallSyncExecution({ id: execution.id, applyRunId: runId, safeReason: "internal", now: now + 3 });
  }
  assert.equal(latestValidatedRecallSuccess()?.id, priorSuccess);
});

test("lifecycle completion rolls back if its linked request cannot be finalized", () => {
  const now = 2_200_000_000_000;
  getDb().prepare(
    `INSERT INTO recall_sync_requests
     (id,idempotency_key,owner_id,state,requested_at,claimed_at,heartbeat_at,expires_at,safe_reason)
     VALUES ('rollback-request','rollback-request-key','owner','claimed',?,?,?,?, 'active')`,
  ).run(now, now, now, now + 60_000);
  const execution = startRecallSyncExecution({
    occurrenceKey: "manual:rollback-request",
    trigger: "manual_ui",
    requestId: "rollback-request",
    now,
  }).execution;
  updateRecallExecutionStage({ id: execution.id, stage: "apply", runId: "rollback-apply", now: now + 1 });
  insertRecallSyncRun({
    id: "rollback-apply", mode: "apply", started_at: now, completed_at: now + 2, state: "done",
    date_from: null, date_to: null, cards_seen: 0, cards_imported: 0, cards_upgraded: 0,
    cards_skipped: 0, cards_changed_remote: 0, cards_blocked: 0, total_chars_planned: 0,
    total_chunks_fetched: 0, last_error: null, report_json: "{}", execution_id: execution.id,
    trigger: "manual_ui", request_id: "rollback-request",
  });
  updateRecallExecutionStage({ id: execution.id, stage: "apply_validated", now: now + 3 });
  getDb().prepare("UPDATE recall_sync_requests SET state = 'error' WHERE id = 'rollback-request'").run();
  assert.throws(
    () => completeRecallSyncExecution({ id: execution.id, applyRunId: "rollback-apply", now: now + 4 }),
    /could not be finalized/,
  );
  const afterRollback = getDb().prepare(
    "SELECT state, wrapper_validated_at FROM recall_sync_executions WHERE id = ?",
  ).get(execution.id) as { state: string; wrapper_validated_at: number | null };
  assert.deepEqual(afterRollback, { state: "running", wrapper_validated_at: null });
  getDb().prepare("UPDATE recall_sync_requests SET state = 'running' WHERE id = 'rollback-request'").run();
  assert.equal(completeRecallSyncExecution({ id: execution.id, applyRunId: "rollback-apply", now: now + 5 }).state, "done");
});

function getRecallExecutionState(id: string): string {
  return (getDb().prepare("SELECT state FROM recall_sync_executions WHERE id = ?").get(id) as { state: string }).state;
}

test("same occurrence never starts core work twice and stale reconciliation is heartbeat gated", () => {
  const now = 2_000_000_000_000;
  const first = startRecallSyncExecution({ occurrenceKey: "automatic:test-occurrence", trigger: "automatic", now });
  assert.equal(first.kind, "created");
  const duplicate = startRecallSyncExecution({ occurrenceKey: "automatic:test-occurrence", trigger: "automatic", now: now + 1 });
  assert.equal(duplicate.kind, "existing_running");
  assert.equal(duplicate.execution.id, first.execution.id);
  assert.equal(reconcileStaleRecallExecution({
    id: first.execution.id,
    now: now + RECALL_HEARTBEAT_STALE_MS - 1,
    outerLockConfirmedFree: true,
  }), null);
  const reconciled = reconcileStaleRecallExecution({
    id: first.execution.id,
    now: now + RECALL_HEARTBEAT_STALE_MS,
    outerLockConfirmedFree: true,
  });
  assert.equal(reconciled?.state, "error");
  assert.equal(startRecallSyncExecution({ occurrenceKey: "automatic:test-occurrence", trigger: "automatic", now: now + 100_000 }).kind, "existing_terminal");
  assert.equal((getDb().prepare("SELECT count(*) AS value FROM recall_sync_executions WHERE occurrence_key = ?").get("automatic:test-occurrence") as { value: number }).value, 1);
});

function getLatestTerminalCompletedAt(): number {
  return (getDb().prepare("SELECT max(completed_at) AS value FROM recall_sync_requests").get() as { value: number }).value;
}

test("next-elapse snapshots are trusted only when timer, freshness and future checks pass", () => {
  const now = 1_900_000_000_000;
  setRecallScheduleSnapshot({
    timerName: "brain-recall-sync.timer",
    nextElapseAt: new Date(now + 60_000).toISOString(),
    observedAt: now,
  });
  assert.equal(getTrustedRecallSchedule(now)?.timerName, "brain-recall-sync.timer");
  assert.equal(getTrustedRecallSchedule(now + 61_000), null);
  setRecallScheduleSnapshot({
    timerName: "brain-recall-sync.timer",
    nextElapseAt: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
    observedAt: now,
  });
  assert.equal(getTrustedRecallSchedule(now + 27 * 60 * 60 * 1000), null);
  setRecallScheduleSnapshot({
    timerName: "wrong.timer",
    nextElapseAt: new Date(now + 60_000).toISOString(),
    observedAt: now,
  });
  assert.equal(getTrustedRecallSchedule(now), null);
});
