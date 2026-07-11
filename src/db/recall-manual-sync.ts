import { DB_BUSY_TIMEOUT_MS, getDb, newId } from "./client";
import { getRecallSyncRun, getRecallSyncState, setRecallSyncState } from "./recall-sync";

export const RECALL_REQUEST_EXPIRY_MS = 30 * 60 * 1000;
export const RECALL_REQUEST_COOLDOWN_MS = 5 * 60 * 1000;
export const RECALL_HEARTBEAT_STALE_MS = 90 * 1000;
// Refreshed by the daily trusted unit; allow one daily interval plus jitter and
// operational margin, while still rejecting missed/stale snapshots.
export const RECALL_SCHEDULE_MAX_AGE_MS = 26 * 60 * 60 * 1000;
export const RECALL_TIMER_NAME = "brain-recall-sync.timer";
export const RECALL_BUSY_RETRY_DELAYS_MS = [0, 50, 150] as const;
// Three possible SQLite busy_timeout waits plus retry delays total 15.2s.
// Keep 4.8s of scheduling/network overhead before absence can be definitive.
export const RECALL_IDEMPOTENCY_ABSENCE_RESOLUTION_MS =
  DB_BUSY_TIMEOUT_MS * RECALL_BUSY_RETRY_DELAYS_MS.length +
  RECALL_BUSY_RETRY_DELAYS_MS.reduce<number>((total, delay) => total + delay, 0) +
  4_800;

export const SAFE_RECALL_REASONS = [
  "active",
  "connection_attention",
  "authentication_attention",
  "rate_limited",
  "safety_attention",
  "worker_unavailable",
  "internal",
  "expired",
] as const;

export type SafeRecallReason = (typeof SAFE_RECALL_REASONS)[number];
export type RecallRequestState =
  | "queued"
  | "claimed"
  | "running"
  | "done"
  | "blocked"
  | "error"
  | "partial_failure"
  | "expired";
export type RecallExecutionState = "running" | "done" | "blocked" | "error" | "partial_failure";
export type RecallExecutionStage =
  | "starting"
  | "dry_run"
  | "dry_run_validated"
  | "backup"
  | "apply"
  | "apply_validated"
  | "terminal";

export interface RecallSyncRequestRow {
  id: string;
  idempotency_key: string;
  owner_id: string;
  trigger: "manual_ui";
  state: RecallRequestState;
  requested_at: number;
  claimed_at: number | null;
  started_at: number | null;
  heartbeat_at: number | null;
  completed_at: number | null;
  expires_at: number;
  execution_id: string | null;
  safe_reason: SafeRecallReason | null;
  cards_imported: number | null;
  cards_upgraded: number | null;
  cards_already_current: number | null;
}

export interface RecallSyncExecutionRow {
  id: string;
  occurrence_key: string;
  trigger: "automatic" | "manual_ui";
  request_id: string | null;
  state: RecallExecutionState;
  stage: RecallExecutionStage;
  started_at: number;
  heartbeat_at: number;
  completed_at: number | null;
  wrapper_validated_at: number | null;
  dry_run_id: string | null;
  apply_run_id: string | null;
  safe_reason: SafeRecallReason | null;
  cards_imported: number | null;
  cards_upgraded: number | null;
  cards_already_current: number | null;
}

export class RecallSyncBusyError extends Error {
  constructor() {
    super("Recall sync persistence is busy");
    this.name = "RecallSyncBusyError";
  }
}

export class RecallSyncCooldownError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Recall manual sync is cooling down");
    this.name = "RecallSyncCooldownError";
  }
}

export class RecallSyncTerminalReplayError extends Error {
  constructor(
    public readonly request: RecallSyncRequestRow,
    public readonly retryAfterSeconds: number,
  ) {
    super("Recall manual sync idempotency key is already terminal");
    this.name = "RecallSyncTerminalReplayError";
  }
}

export interface EnqueueResult {
  request: RecallSyncRequestRow;
  deduplicated: boolean;
}

function isBusy(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "SQLITE_BUSY");
}

async function retryBusy<T>(operation: () => T): Promise<T> {
  for (const delay of RECALL_BUSY_RETRY_DELAYS_MS) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      return operation();
    } catch (error) {
      if (!isBusy(error) || delay === RECALL_BUSY_RETRY_DELAYS_MS.at(-1)) {
        throw isBusy(error) ? new RecallSyncBusyError() : error;
      }
    }
  }
  throw new RecallSyncBusyError();
}

export async function enqueueRecallSyncRequest(input: {
  idempotencyKey: string;
  ownerId: string;
  now: number;
}): Promise<EnqueueResult> {
  return retryBusy(() => {
    const db = getDb();
    const tx = db.transaction(() => {
      expireQueuedRequests(input.now);
      const replay = db
        .prepare("SELECT * FROM recall_sync_requests WHERE idempotency_key = ?")
        .get(input.idempotencyKey) as RecallSyncRequestRow | undefined;
      if (replay) {
        if (isActiveRequestState(replay.state)) return { request: replay, deduplicated: true };
        const retryAt = (replay.completed_at ?? input.now) + RECALL_REQUEST_COOLDOWN_MS;
        throw new RecallSyncTerminalReplayError(
          replay,
          Math.max(0, Math.ceil((retryAt - input.now) / 1000)),
        );
      }

      const active = getActiveRecallRequest();
      if (active) return { request: active, deduplicated: true };

      const terminal = getLatestTerminalRequest();
      if (terminal?.completed_at) {
        const retryAt = terminal.completed_at + RECALL_REQUEST_COOLDOWN_MS;
        if (retryAt > input.now) {
          throw new RecallSyncCooldownError(Math.max(1, Math.ceil((retryAt - input.now) / 1000)));
        }
      }

      const id = newId();
      db.prepare(
        `INSERT INTO recall_sync_requests (
          id, idempotency_key, owner_id, state, requested_at, expires_at, safe_reason
        ) VALUES (?, ?, ?, 'queued', ?, ?, 'active')`,
      ).run(id, input.idempotencyKey, input.ownerId, input.now, input.now + RECALL_REQUEST_EXPIRY_MS);
      return { request: getRecallRequest(id)!, deduplicated: false };
    });
    return tx.immediate();
  });
}

export async function claimRecallSyncRequest(now: number): Promise<RecallSyncRequestRow | null> {
  return retryBusy(() => {
    const db = getDb();
    const tx = db.transaction(() => {
      expireQueuedRequests(now);
      const row = db
        .prepare(
          "SELECT * FROM recall_sync_requests WHERE state = 'queued' AND expires_at > ? ORDER BY requested_at, id LIMIT 1",
        )
        .get(now) as RecallSyncRequestRow | undefined;
      if (!row) return null;
      db.prepare(
        "UPDATE recall_sync_requests SET state = 'claimed', claimed_at = ?, heartbeat_at = ?, safe_reason = 'active' WHERE id = ? AND state = 'queued'",
      ).run(now, now, row.id);
      return getRecallRequest(row.id);
    });
    return tx.immediate();
  });
}

export function requeueClaimedRecallRequest(id: string): boolean {
  return (
    getDb()
      .prepare(
        "UPDATE recall_sync_requests SET state = 'queued', claimed_at = NULL, heartbeat_at = NULL WHERE id = ? AND state = 'claimed'",
      )
      .run(id).changes > 0
  );
}

/** Called only by the trusted worker after it has proved the outer lock free. */
export function requeueStaleClaimedRecallRequest(
  now: number,
  outerLockConfirmedFree: boolean,
): "none" | "requeued" | "expired" {
  if (!outerLockConfirmedFree) return "none";
  const db = getDb();
  const tx = db.transaction(() => {
    const stale = db.prepare(
      `SELECT * FROM recall_sync_requests
       WHERE state = 'claimed' AND execution_id IS NULL AND heartbeat_at <= ?
       ORDER BY requested_at, id LIMIT 1`,
    ).get(now - RECALL_HEARTBEAT_STALE_MS) as RecallSyncRequestRow | undefined;
    if (!stale) return "none" as const;
    if (stale.expires_at <= now) {
      db.prepare(
        `UPDATE recall_sync_requests SET state = 'expired', heartbeat_at = ?, completed_at = ?,
         safe_reason = 'expired', cards_imported = 0, cards_upgraded = 0, cards_already_current = 0
         WHERE id = ? AND state = 'claimed' AND execution_id IS NULL`,
      ).run(now, now, stale.id);
      return "expired" as const;
    }
    db.prepare(
      `UPDATE recall_sync_requests SET state = 'queued', claimed_at = NULL, heartbeat_at = NULL
       WHERE id = ? AND state = 'claimed' AND execution_id IS NULL`,
    ).run(stale.id);
    return "requeued" as const;
  });
  return tx.immediate();
}

export function getRecallRequest(id: string): RecallSyncRequestRow | null {
  return (
    (getDb().prepare("SELECT * FROM recall_sync_requests WHERE id = ?").get(id) as
      | RecallSyncRequestRow
      | undefined) ?? null
  );
}

export function getActiveRecallRequest(): RecallSyncRequestRow | null {
  return (
    (getDb()
      .prepare(
        "SELECT * FROM recall_sync_requests WHERE state IN ('queued','claimed','running') ORDER BY requested_at, id LIMIT 1",
      )
      .get() as RecallSyncRequestRow | undefined) ?? null
  );
}

export function getLatestTerminalRequest(): RecallSyncRequestRow | null {
  return (
    (getDb()
      .prepare(
        "SELECT * FROM recall_sync_requests WHERE state IN ('done','blocked','error','partial_failure','expired') ORDER BY completed_at DESC, id DESC LIMIT 1",
      )
      .get() as RecallSyncRequestRow | undefined) ?? null
  );
}

export function expireQueuedRequests(now: number): number {
  return getDb()
    .prepare(
      `UPDATE recall_sync_requests
       SET state = 'expired', completed_at = ?, safe_reason = 'expired',
           cards_imported = 0, cards_upgraded = 0, cards_already_current = 0
       WHERE state = 'queued' AND expires_at <= ?`,
    )
    .run(now, now).changes;
}

export type RecallExecutionStartResult =
  | { kind: "created"; execution: RecallSyncExecutionRow }
  | { kind: "existing_running"; execution: RecallSyncExecutionRow }
  | { kind: "existing_terminal"; execution: RecallSyncExecutionRow };

export function startRecallSyncExecution(input: {
  occurrenceKey: string;
  trigger: "automatic" | "manual_ui";
  requestId?: string | null;
  now: number;
}): RecallExecutionStartResult {
  const db = getDb();
  const tx = db.transaction(() => {
    const existing = db
      .prepare("SELECT * FROM recall_sync_executions WHERE occurrence_key = ?")
      .get(input.occurrenceKey) as RecallSyncExecutionRow | undefined;
    if (existing) {
      return {
        kind: existing.state === "running" ? "existing_running" : "existing_terminal",
        execution: existing,
      } as RecallExecutionStartResult;
    }
    const id = newId();
    db.prepare(
      `INSERT INTO recall_sync_executions
       (id, occurrence_key, trigger, request_id, state, stage, started_at, heartbeat_at, safe_reason)
       VALUES (?, ?, ?, ?, 'running', 'starting', ?, ?, 'active')`,
    ).run(id, input.occurrenceKey, input.trigger, input.requestId ?? null, input.now, input.now);
    if (input.requestId) {
      const changed = db.prepare(
        `UPDATE recall_sync_requests
         SET state = 'running', started_at = ?, heartbeat_at = ?, execution_id = ?, safe_reason = 'active'
         WHERE id = ? AND state = 'claimed'`,
      ).run(input.now, input.now, id, input.requestId).changes;
      if (changed !== 1) throw new Error("manual request is not claimable");
    }
    return { kind: "created", execution: getRecallExecution(id)! } as RecallExecutionStartResult;
  });
  return tx.immediate();
}

const STAGE_ORDER: RecallExecutionStage[] = [
  "starting",
  "dry_run",
  "dry_run_validated",
  "backup",
  "apply",
  "apply_validated",
  "terminal",
];

export function updateRecallExecutionStage(input: {
  id: string;
  stage: RecallExecutionStage;
  now: number;
  runId?: string;
}): RecallSyncExecutionRow {
  const row = getRecallExecution(input.id);
  if (!row || row.state !== "running") throw new Error("active Recall execution not found");
  if (STAGE_ORDER.indexOf(input.stage) < STAGE_ORDER.indexOf(row.stage)) {
    throw new Error("Recall execution stage cannot move backward");
  }
  const runColumn = input.stage === "dry_run" ? "dry_run_id" : input.stage === "apply" ? "apply_run_id" : null;
  if (runColumn && row[runColumn] && row[runColumn] !== input.runId) {
    throw new Error("Recall execution stage is already linked to a different run");
  }
  const sql = runColumn
    ? `UPDATE recall_sync_executions SET stage = ?, heartbeat_at = ?, ${runColumn} = COALESCE(?, ${runColumn}) WHERE id = ? AND state = 'running'`
    : "UPDATE recall_sync_executions SET stage = ?, heartbeat_at = ? WHERE id = ? AND state = 'running'";
  const params = runColumn ? [input.stage, input.now, input.runId ?? null, input.id] : [input.stage, input.now, input.id];
  getDb().prepare(sql).run(...params);
  heartbeatLinkedRequest(input.id, input.now);
  return getRecallExecution(input.id)!;
}

export function heartbeatRecallExecution(id: string, now: number): boolean {
  const changed = getDb()
    .prepare("UPDATE recall_sync_executions SET heartbeat_at = ? WHERE id = ? AND state = 'running'")
    .run(now, id).changes;
  if (changed) heartbeatLinkedRequest(id, now);
  return changed > 0;
}

function heartbeatLinkedRequest(executionId: string, now: number): void {
  getDb()
    .prepare("UPDATE recall_sync_requests SET heartbeat_at = ? WHERE execution_id = ? AND state = 'running'")
    .run(now, executionId);
}

export function getRecallExecution(id: string): RecallSyncExecutionRow | null {
  return (
    (getDb().prepare("SELECT * FROM recall_sync_executions WHERE id = ?").get(id) as
      | RecallSyncExecutionRow
      | undefined) ?? null
  );
}

export function getActiveRecallExecution(): RecallSyncExecutionRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM recall_sync_executions WHERE state = 'running' ORDER BY started_at, id LIMIT 1")
      .get() as RecallSyncExecutionRow | undefined) ?? null
  );
}

export function completeRecallSyncExecution(input: {
  id: string;
  applyRunId: string;
  now: number;
}): RecallSyncExecutionRow {
  const db = getDb();
  const tx = db.transaction(() => {
    const execution = getRecallExecution(input.id);
    if (!execution || execution.state !== "running") throw new Error("active Recall execution not found");
    if (execution.stage !== "apply_validated" || execution.apply_run_id !== input.applyRunId) {
      throw new Error("Recall execution has not validated its linked apply run");
    }
    const run = getRecallSyncRun(input.applyRunId);
    if (!run || run.execution_id !== input.id || run.mode !== "apply" || run.state !== "done") {
      throw new Error("validated apply run does not match execution");
    }
    const counts = countsFromRun(run);
    db.prepare(
      `UPDATE recall_sync_executions SET state = 'done', stage = 'terminal', heartbeat_at = ?,
       completed_at = ?, wrapper_validated_at = ?, apply_run_id = ?, safe_reason = NULL,
       cards_imported = ?, cards_upgraded = ?, cards_already_current = ? WHERE id = ? AND state = 'running'`,
    ).run(input.now, input.now, input.now, input.applyRunId, counts.imported, counts.upgraded, counts.current, input.id);
    finalizeLinkedRequest(execution, "done", null, counts, input.now);
    return getRecallExecution(input.id)!;
  });
  return tx.immediate();
}

export function failRecallSyncExecution(input: {
  id: string;
  now: number;
  safeReason: SafeRecallReason;
  applyRunId?: string | null;
}): RecallSyncExecutionRow {
  const db = getDb();
  const tx = db.transaction(() => {
    const execution = getRecallExecution(input.id);
    if (!execution || execution.state !== "running") return execution ?? (() => { throw new Error("Recall execution not found"); })();
    const runId = input.applyRunId ?? execution.apply_run_id ?? execution.dry_run_id;
    const run = runId ? getRecallSyncRun(runId) : null;
    const counts = run?.execution_id === input.id ? countsFromRun(run) : null;
    const safeReason = input.safeReason === "internal" && run ? safeReasonFromRun(run.report_json) : input.safeReason;
    const state: RecallExecutionState = counts && counts.imported + counts.upgraded > 0
      ? "partial_failure"
      : run
        ? run.state === "blocked" || (run.mode === "dry_run" && run.cards_blocked > 0) ? "blocked" : "error"
        : "error";
    db.prepare(
      `UPDATE recall_sync_executions SET state = ?, stage = 'terminal', heartbeat_at = ?, completed_at = ?,
       apply_run_id = COALESCE(?, apply_run_id), safe_reason = ?, cards_imported = ?, cards_upgraded = ?,
       cards_already_current = ? WHERE id = ? AND state = 'running'`,
    ).run(state, input.now, input.now, run?.mode === "apply" ? runId : null, safeReason,
      counts?.imported ?? null, counts?.upgraded ?? null, counts?.current ?? null, input.id);
    finalizeLinkedRequest(execution, state, safeReason, counts, input.now);
    return getRecallExecution(input.id)!;
  });
  return tx.immediate();
}

function countsFromRun(run: { cards_imported: number; cards_upgraded: number; cards_skipped: number }) {
  return { imported: run.cards_imported, upgraded: run.cards_upgraded, current: run.cards_skipped };
}

function safeReasonFromRun(reportJson: string | null): SafeRecallReason {
  try {
    const errorName = (JSON.parse(reportJson ?? "{}") as { errorName?: unknown }).errorName;
    if (errorName === "auth_failure") return "authentication_attention";
    if (errorName === "rate_limited") return "rate_limited";
    if (["cap_exceeded", "policy_blocked", "remote_changed"].includes(String(errorName))) return "safety_attention";
  } catch {
    // Private report corruption maps to the bounded internal reason.
  }
  return "internal";
}

function finalizeLinkedRequest(
  execution: RecallSyncExecutionRow,
  state: Exclude<RecallExecutionState, "running">,
  safeReason: SafeRecallReason | null,
  counts: { imported: number; upgraded: number; current: number } | null,
  now: number,
): void {
  const changed = getDb().prepare(
    `UPDATE recall_sync_requests SET state = ?, heartbeat_at = ?, completed_at = ?, safe_reason = ?,
     cards_imported = ?, cards_upgraded = ?, cards_already_current = ?
     WHERE execution_id = ? AND state = 'running'`,
  ).run(
    state,
    now,
    now,
    safeReason,
    counts?.imported ?? null,
    counts?.upgraded ?? null,
    counts?.current ?? null,
    execution.id,
  ).changes;
  if (execution.request_id && changed !== 1) {
    throw new Error("linked Recall request could not be finalized");
  }
}

export function latestValidatedRecallSuccess(): RecallSyncExecutionRow | null {
  return (
    (getDb()
      .prepare(
        "SELECT * FROM recall_sync_executions WHERE wrapper_validated_at IS NOT NULL ORDER BY wrapper_validated_at DESC, id DESC LIMIT 1",
      )
      .get() as RecallSyncExecutionRow | undefined) ?? null
  );
}

export interface RecallScheduleSnapshot {
  timerName: string;
  nextElapseAt: string;
  observedAt: number;
}

export function setRecallScheduleSnapshot(snapshot: RecallScheduleSnapshot): void {
  setRecallSyncState("schedule:next_elapse", JSON.stringify(snapshot), snapshot.observedAt);
}

export function getTrustedRecallSchedule(now: number): RecallScheduleSnapshot | null {
  const row = getRecallSyncState("schedule:next_elapse");
  if (!row || now - row.updated_at > RECALL_SCHEDULE_MAX_AGE_MS) return null;
  try {
    const parsed = JSON.parse(row.value) as RecallScheduleSnapshot;
    const next = Date.parse(parsed.nextElapseAt);
    if (parsed.timerName !== RECALL_TIMER_NAME || parsed.observedAt !== row.updated_at || !Number.isFinite(next) || next <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isRecallExecutionStale(execution: RecallSyncExecutionRow, now: number): boolean {
  return execution.state === "running" && now - execution.heartbeat_at >= RECALL_HEARTBEAT_STALE_MS;
}

/**
 * Reconciles an abandoned occurrence without ever creating a second core run.
 * The caller must already hold the private outer lock, which proves the former
 * wrapper process released it. The persisted heartbeat supplies the second,
 * independent stale signal.
 */
export function reconcileStaleRecallExecution(input: {
  id: string;
  now: number;
  outerLockConfirmedFree: boolean;
}): RecallSyncExecutionRow | null {
  const execution = getRecallExecution(input.id);
  if (!input.outerLockConfirmedFree || !execution || !isRecallExecutionStale(execution, input.now)) return null;
  if (execution.stage === "apply_validated" && execution.apply_run_id) {
    return completeRecallSyncExecution({ id: execution.id, applyRunId: execution.apply_run_id, now: input.now });
  }
  return failRecallSyncExecution({
    id: execution.id,
    applyRunId: execution.apply_run_id,
    safeReason: "internal",
    now: input.now,
  });
}

export function getRecallRequestByIdempotencyKey(key: string): RecallSyncRequestRow | null {
  return (
    (getDb().prepare("SELECT * FROM recall_sync_requests WHERE idempotency_key = ?").get(key) as
      | RecallSyncRequestRow
      | undefined) ?? null
  );
}

export function isActiveRequestState(state: RecallRequestState): boolean {
  return state === "queued" || state === "claimed" || state === "running";
}
