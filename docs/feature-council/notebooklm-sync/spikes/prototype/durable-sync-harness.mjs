import { createHmac, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { MAPPER_VERSION, mapSyntheticItem } from "./sync-model.mjs";
import { FakeProviderError } from "./fake-provider.mjs";

const RESOLVED_STATES = new Set([
  "blocked_policy",
  "unsupported",
  "notebook_synced",
  "drive_updated_unverified",
]);
const GLOBAL_MAX_RETRY_ATTEMPTS = 2;

function assertRetryLimit(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > GLOBAL_MAX_RETRY_ATTEMPTS) {
    throw new Error("invalid_retry_limit");
  }
}

function assertPageSize(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("invalid_page_size");
}

function normalizeConclusiveHorizon(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export class StaleFenceError extends Error {
  constructor() {
    super("stale_fence");
    this.name = "StaleFenceError";
    this.code = "stale_fence";
  }
}

export class SimulatedCrashError extends Error {
  constructor(point) {
    super(`simulated_crash:${point}`);
    this.name = "SimulatedCrashError";
    this.code = "simulated_crash";
    this.point = point;
  }
}

function operationKey(connectionKey, target, event, mapped, strategy) {
  const input = [
    target,
    event.event_uuid,
    mapped.desiredHash ?? mapped.reason ?? mapped.state,
    strategy,
    MAPPER_VERSION,
  ].join("\u0000");
  return `abop_${createHmac("sha256", connectionKey).update(input).digest("base64url")}`;
}

function asNumber(value) {
  return typeof value === "bigint" ? Number(value) : Number(value);
}

function cloneRow(row) {
  return row ? { ...row } : null;
}

export class ResearchStore {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
    this.#initialize();
  }

  #initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS research_items (
        id TEXT PRIMARY KEY,
        captured_at INTEGER NOT NULL,
        item_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS research_outbox (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        event_uuid TEXT NOT NULL UNIQUE,
        item_id TEXT NOT NULL REFERENCES research_items(id),
        event_type TEXT NOT NULL CHECK(event_type='created'),
        occurred_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS research_targets (
        target_alias TEXT PRIMARY KEY,
        path TEXT NOT NULL CHECK(path IN ('enterprise','drive')),
        strategy TEXT NOT NULL,
        start_after_seq INTEGER NOT NULL,
        discovery_cursor INTEGER NOT NULL,
        lease_owner TEXT,
        lease_fence INTEGER NOT NULL DEFAULT 0,
        lease_expires_at INTEGER,
        drive_file_alias TEXT,
        drive_revision INTEGER,
        last_attempt_started_at INTEGER,
        last_attempt_finished_at INTEGER,
        last_progress_at INTEGER,
        last_successful_run_at INTEGER,
        last_notebook_source_complete_at INTEGER,
        last_drive_document_updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS sync_requests (
        id TEXT PRIMARY KEY,
        target_alias TEXT NOT NULL REFERENCES research_targets(target_alias),
        trigger_kind TEXT NOT NULL CHECK(trigger_kind IN ('manual','daily')),
        idempotency_key TEXT NOT NULL,
        requested_through_seq INTEGER NOT NULL,
        state TEXT NOT NULL,
        execution_id TEXT,
        requested_at INTEGER NOT NULL,
        completed_at INTEGER,
        UNIQUE(target_alias,idempotency_key)
      );

      CREATE TABLE IF NOT EXISTS sync_executions (
        id TEXT PRIMARY KEY,
        target_alias TEXT NOT NULL REFERENCES research_targets(target_alias),
        cutoff_seq INTEGER NOT NULL,
        fence_token INTEGER NOT NULL,
        state TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER
      );
      CREATE UNIQUE INDEX IF NOT EXISTS sync_one_running_execution
        ON sync_executions(target_alias) WHERE state='running';

      CREATE TABLE IF NOT EXISTS sync_work (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_alias TEXT NOT NULL REFERENCES research_targets(target_alias),
        outbox_sequence INTEGER NOT NULL REFERENCES research_outbox(seq),
        item_id TEXT NOT NULL,
        operation_key TEXT NOT NULL,
        marker TEXT NOT NULL,
        desired_hash TEXT,
        mapper_version TEXT NOT NULL,
        strategy TEXT NOT NULL,
        representation TEXT,
        payload TEXT,
        state TEXT NOT NULL,
        reason TEXT,
        provider_source_id TEXT,
        provider_file_alias TEXT,
        provider_revision INTEGER,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        retry_count INTEGER NOT NULL DEFAULT 0 CHECK(retry_count BETWEEN 0 AND 2),
        ambiguity_retry_count INTEGER NOT NULL DEFAULT 0 CHECK(ambiguity_retry_count BETWEEN 0 AND 1),
        resume_action TEXT,
        next_attempt_at INTEGER,
        uncertain_until INTEGER,
        failure_code TEXT,
        active_attempt_no INTEGER,
        last_fence INTEGER,
        first_attempt_at INTEGER,
        last_attempt_at INTEGER,
        last_success_at INTEGER,
        completed_at INTEGER,
        UNIQUE(target_alias,outbox_sequence),
        UNIQUE(target_alias,operation_key)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS sync_unique_provider_source
        ON sync_work(target_alias,provider_source_id)
        WHERE provider_source_id IS NOT NULL;

      CREATE TABLE IF NOT EXISTS attempt_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_id INTEGER NOT NULL REFERENCES sync_work(id),
        execution_id TEXT NOT NULL REFERENCES sync_executions(id),
        attempt_no INTEGER NOT NULL,
        event_kind TEXT NOT NULL,
        outcome TEXT NOT NULL,
        safe_error_code TEXT,
        fence_token INTEGER NOT NULL,
        occurred_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS execution_work (
        execution_id TEXT NOT NULL REFERENCES sync_executions(id),
        work_id INTEGER NOT NULL REFERENCES sync_work(id),
        PRIMARY KEY(execution_id,work_id)
      );
    `);
  }

  close() {
    this.db.close();
  }

  #transaction(callback) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = callback();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  maxOutboxSequence() {
    return asNumber(this.db.prepare("SELECT COALESCE(MAX(seq),0) AS value FROM research_outbox").get().value);
  }

  captureSyntheticItem({ eventUuid, item, occurredAt, failpoint = null }) {
    return this.#transaction(() => {
      this.db
        .prepare("INSERT INTO research_items(id,captured_at,item_json) VALUES(?,?,?)")
        .run(item.id, item.capturedAt, JSON.stringify(item));
      if (failpoint === "after_item_insert") throw new SimulatedCrashError(failpoint);
      const result = this.db
        .prepare(
          "INSERT INTO research_outbox(event_uuid,item_id,event_type,occurred_at) VALUES(?,?,'created',?)",
        )
        .run(eventUuid, item.id, occurredAt);
      if (failpoint === "after_outbox_insert_before_commit") throw new SimulatedCrashError(failpoint);
      return { outboxSequence: asNumber(result.lastInsertRowid) };
    });
  }

  listOutbox() {
    return this.db.prepare("SELECT * FROM research_outbox ORDER BY seq").all().map(cloneRow);
  }

  createTarget({
    targetAlias,
    path,
    strategy,
    baseline = "new_only",
    driveFileAlias = null,
    driveRevision = null,
  }) {
    if (!new Set(["new_only", "all"]).has(baseline)) throw new Error("invalid_baseline");
    return this.#transaction(() => {
      const current = this.maxOutboxSequence();
      const cursor = baseline === "new_only" ? current : 0;
      this.db
        .prepare(`
          INSERT INTO research_targets(
            target_alias,path,strategy,start_after_seq,discovery_cursor,drive_file_alias,drive_revision
          ) VALUES(?,?,?,?,?,?,?)
        `)
        .run(targetAlias, path, strategy, cursor, cursor, driveFileAlias, driveRevision);
      return this.getTarget(targetAlias);
    });
  }

  getTarget(targetAlias) {
    return cloneRow(
      this.db.prepare("SELECT * FROM research_targets WHERE target_alias=?").get(targetAlias),
    );
  }

  enqueueSync({ targetAlias, trigger, idempotencyKey, requestedAt }) {
    return this.#transaction(() => {
      const existing = this.db
        .prepare("SELECT * FROM sync_requests WHERE target_alias=? AND idempotency_key=?")
        .get(targetAlias, idempotencyKey);
      if (existing) return cloneRow(existing);

      const requestedThrough = this.maxOutboxSequence();
      const active = this.db
        .prepare("SELECT * FROM sync_executions WHERE target_alias=? AND state='running'")
        .get(targetAlias);
      const attaches = active && asNumber(active.cutoff_seq) >= requestedThrough;
      const request = {
        id: `request-${randomUUID()}`,
        state: attaches ? "attached" : "queued",
        executionId: attaches ? active.id : null,
      };
      this.db
        .prepare(`
          INSERT INTO sync_requests(
            id,target_alias,trigger_kind,idempotency_key,requested_through_seq,state,execution_id,requested_at
          ) VALUES(?,?,?,?,?,?,?,?)
        `)
        .run(
          request.id,
          targetAlias,
          trigger,
          idempotencyKey,
          requestedThrough,
          request.state,
          request.executionId,
          requestedAt,
        );
      return cloneRow(this.db.prepare("SELECT * FROM sync_requests WHERE id=?").get(request.id));
    });
  }

  getRequest(targetAlias, idempotencyKey) {
    return cloneRow(
      this.db
        .prepare("SELECT * FROM sync_requests WHERE target_alias=? AND idempotency_key=?")
        .get(targetAlias, idempotencyKey),
    );
  }

  listRequests(targetAlias) {
    return this.db
      .prepare("SELECT * FROM sync_requests WHERE target_alias=? ORDER BY requested_at,id")
      .all(targetAlias)
      .map(cloneRow);
  }

  acquireLease({ targetAlias, workerId, now, ttlMs }) {
    return this.#transaction(() => {
      const target = this.getTarget(targetAlias);
      if (!target) throw new Error("target_not_found");
      if (target.lease_owner && asNumber(target.lease_expires_at) > now) return null;
      const fence = asNumber(target.lease_fence) + 1;
      const expiresAt = now + ttlMs;
      this.db
        .prepare(`
          UPDATE research_targets
          SET lease_owner=?,lease_fence=?,lease_expires_at=?
          WHERE target_alias=?
        `)
        .run(workerId, fence, expiresAt, targetAlias);
      return { targetAlias, workerId, fence, expiresAt };
    });
  }

  #assertLease(lease, now) {
    const target = this.getTarget(lease.targetAlias);
    if (
      !target ||
      target.lease_owner !== lease.workerId ||
      asNumber(target.lease_fence) !== lease.fence ||
      asNumber(target.lease_expires_at) <= now
    ) {
      throw new StaleFenceError();
    }
    return target;
  }

  assertLease(lease, now) {
    return cloneRow(this.#assertLease(lease, now));
  }

  #assertExecutionScope(lease, executionId, { requireRunning = true } = {}) {
    const execution = this.getExecution(executionId);
    if (!execution || execution.target_alias !== lease.targetAlias) {
      throw new Error("execution_scope_mismatch");
    }
    if (requireRunning && execution.state !== "running") {
      throw new Error("execution_not_running");
    }
    return execution;
  }

  #assertWorkScope(lease, execution, workId) {
    const row = this.getWork(workId);
    if (
      !row ||
      row.target_alias !== lease.targetAlias ||
      asNumber(row.outbox_sequence) > asNumber(execution.cutoff_seq)
    ) {
      throw new Error("work_scope_mismatch");
    }
    return row;
  }

  renewLease(lease, { now, ttlMs }) {
    return this.#transaction(() => {
      this.#assertLease(lease, now);
      const expiresAt = now + ttlMs;
      this.db
        .prepare(`
          UPDATE research_targets SET lease_expires_at=?
          WHERE target_alias=? AND lease_owner=? AND lease_fence=?
        `)
        .run(expiresAt, lease.targetAlias, lease.workerId, lease.fence);
      return { ...lease, expiresAt };
    });
  }

  releaseLease(lease) {
    const result = this.db
      .prepare(`
        UPDATE research_targets SET lease_owner=NULL,lease_expires_at=NULL
        WHERE target_alias=? AND lease_owner=? AND lease_fence=?
      `)
      .run(lease.targetAlias, lease.workerId, lease.fence);
    return asNumber(result.changes) === 1;
  }

  beginNextExecution(lease, { now }) {
    return this.#transaction(() => {
      this.#assertLease(lease, now);
      const active = this.db
        .prepare("SELECT * FROM sync_executions WHERE target_alias=? AND state='running'")
        .get(lease.targetAlias);
      if (active) {
        this.db
          .prepare("UPDATE sync_executions SET fence_token=? WHERE id=?")
          .run(lease.fence, active.id);
        return cloneRow(this.db.prepare("SELECT * FROM sync_executions WHERE id=?").get(active.id));
      }

      const queued = this.db
        .prepare("SELECT COUNT(*) AS count FROM sync_requests WHERE target_alias=? AND state='queued'")
        .get(lease.targetAlias);
      if (asNumber(queued.count) === 0) return null;

      const id = `execution-${randomUUID()}`;
      const cutoff = this.maxOutboxSequence();
      this.db
        .prepare(`
          INSERT INTO sync_executions(id,target_alias,cutoff_seq,fence_token,state,started_at)
          VALUES(?,?,?,?,'running',?)
        `)
        .run(id, lease.targetAlias, cutoff, lease.fence, now);
      this.db
        .prepare(`
          UPDATE sync_requests SET state='attached',execution_id=?
          WHERE target_alias=? AND state='queued' AND requested_through_seq<=?
        `)
        .run(id, lease.targetAlias, cutoff);
      this.db
        .prepare("UPDATE research_targets SET last_attempt_started_at=? WHERE target_alias=?")
        .run(now, lease.targetAlias);
      return cloneRow(this.db.prepare("SELECT * FROM sync_executions WHERE id=?").get(id));
    });
  }

  getExecution(executionId) {
    return cloneRow(this.db.prepare("SELECT * FROM sync_executions WHERE id=?").get(executionId));
  }

  listExecutions(targetAlias) {
    return this.db
      .prepare("SELECT * FROM sync_executions WHERE target_alias=? ORDER BY started_at,id")
      .all(targetAlias)
      .map(cloneRow);
  }

  materializeOutboxPage(
    lease,
    { executionId, pageSize, now, connectionKey, failpoint = null },
  ) {
    assertPageSize(pageSize);
    const result = this.#transaction(() => {
      const target = this.#assertLease(lease, now);
      const execution = this.getExecution(executionId);
      if (!execution || execution.target_alias !== lease.targetAlias || execution.state !== "running") {
        throw new Error("execution_not_running");
      }
      const events = this.db
        .prepare(`
          SELECT o.*,i.item_json
          FROM research_outbox o JOIN research_items i ON i.id=o.item_id
          WHERE o.seq>? AND o.seq<=?
          ORDER BY o.seq LIMIT ?
        `)
        .all(target.discovery_cursor, execution.cutoff_seq, pageSize);
      if (events.length === 0) return { count: 0, cursor: asNumber(target.discovery_cursor) };

      for (const event of events) {
        const item = JSON.parse(event.item_json);
        let mapped;
        try {
          mapped = mapSyntheticItem(item, {
            connectionKey,
            targetAlias: target.target_alias,
            strategy: target.strategy,
            path: target.path,
          });
        } catch {
          mapped = {
            desiredHash: null,
            marker: null,
            payload: null,
            representation: null,
            state: "unsupported",
            reason: "mapping_failed",
          };
        }
        const opKey = operationKey(connectionKey, target.target_alias, event, mapped, target.strategy);
        this.db
          .prepare(`
            INSERT INTO sync_work(
              target_alias,outbox_sequence,item_id,operation_key,marker,desired_hash,
              mapper_version,strategy,representation,payload,state,reason
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(target_alias,outbox_sequence) DO NOTHING
          `)
          .run(
            target.target_alias,
            event.seq,
            event.item_id,
            opKey,
            mapped.marker ?? opKey,
            mapped.desiredHash,
            MAPPER_VERSION,
            target.strategy,
            mapped.representation ?? null,
            mapped.payload,
            mapped.state,
            mapped.reason,
          );
        const work = this.db
          .prepare("SELECT id FROM sync_work WHERE target_alias=? AND outbox_sequence=?")
          .get(target.target_alias, event.seq);
        this.db
          .prepare("INSERT OR IGNORE INTO execution_work(execution_id,work_id) VALUES(?,?)")
          .run(executionId, work.id);
      }
      if (failpoint === "before_cursor_update") throw new SimulatedCrashError(failpoint);
      const cursor = asNumber(events.at(-1).seq);
      this.db
        .prepare("UPDATE research_targets SET discovery_cursor=? WHERE target_alias=?")
        .run(cursor, target.target_alias);
      if (failpoint === "after_cursor_update_before_commit") throw new SimulatedCrashError(failpoint);
      return { count: events.length, cursor };
    });
    if (failpoint === "after_materialization_commit") {
      throw new SimulatedCrashError(failpoint);
    }
    return result;
  }

  listWork(targetAlias) {
    return this.db
      .prepare("SELECT * FROM sync_work WHERE target_alias=? ORDER BY outbox_sequence")
      .all(targetAlias)
      .map(cloneRow);
  }

  getWork(workId) {
    return cloneRow(this.db.prepare("SELECT * FROM sync_work WHERE id=?").get(workId));
  }

  listWorkThrough(targetAlias, cutoff) {
    return this.db
      .prepare("SELECT * FROM sync_work WHERE target_alias=? AND outbox_sequence<=? ORDER BY outbox_sequence")
      .all(targetAlias, cutoff)
      .map(cloneRow);
  }

  recoverInterruptedWrites(lease, { executionId, now }) {
    return this.#transaction(() => {
      this.#assertLease(lease, now);
      const execution = this.#assertExecutionScope(lease, executionId);
      const rows = this.db
        .prepare(`
          SELECT * FROM sync_work
          WHERE target_alias=? AND outbox_sequence<=? AND state='creating'
            AND (last_fence IS NULL OR last_fence<>?)
        `)
        .all(lease.targetAlias, execution.cutoff_seq, lease.fence);
      for (const row of rows) {
        this.db
          .prepare(`
            UPDATE sync_work SET state='needs_reconcile',failure_code='interrupted_write'
            WHERE id=?
          `)
          .run(row.id);
        this.#appendAttemptEvent({
          workId: row.id,
          executionId,
          attemptNo: row.active_attempt_no ?? row.attempt_count,
          eventKind: "recovery",
          outcome: "needs_reconcile",
          safeErrorCode: "interrupted_write",
          fence: lease.fence,
          now,
        });
      }
      return rows.length;
    });
  }

  beginCreateIntent(
    lease,
    { executionId, workId, now, conclusiveZeroAfterMs },
  ) {
    return this.#transaction(() => {
      const target = this.#assertLease(lease, now);
      const execution = this.#assertExecutionScope(lease, executionId);
      const row = this.#assertWorkScope(lease, execution, workId);
      const canCreate =
        row &&
        (row.state === "prepared" ||
          (row.state === "retry_wait" &&
            row.resume_action === "create" &&
            (row.next_attempt_at === null || asNumber(row.next_attempt_at) <= now)));
      if (!canCreate) return null;
      const attemptNo = asNumber(row.attempt_count) + 1;
      const horizon = normalizeConclusiveHorizon(conclusiveZeroAfterMs);
      const uncertainUntil = horizon === null ? null : now + horizon;
      this.db
        .prepare(`
          UPDATE sync_work SET
            state='creating',attempt_count=?,active_attempt_no=?,last_fence=?,
            first_attempt_at=COALESCE(first_attempt_at,?),last_attempt_at=?,
            uncertain_until=?,next_attempt_at=NULL,failure_code=NULL,resume_action=NULL
          WHERE id=?
        `)
        .run(attemptNo, attemptNo, lease.fence, now, now, uncertainUntil, workId);
      this.#appendAttemptEvent({
        workId,
        executionId,
        attemptNo,
        eventKind: "create_intent",
        outcome: "started",
        safeErrorCode: null,
        fence: lease.fence,
        now,
      });
      return {
        workId,
        executionId,
        attemptNo,
        targetAlias: target.target_alias,
        path: target.path,
        operationKey: row.operation_key,
        marker: row.marker,
        desiredHash: row.desired_hash,
        payload: row.payload,
        fileAlias: target.drive_file_alias,
        requiredRevision: target.drive_revision,
        now,
      };
    });
  }

  #appendAttemptEvent({
    workId,
    executionId,
    attemptNo,
    eventKind,
    outcome,
    safeErrorCode,
    fence,
    now,
  }) {
    this.db
      .prepare(`
        INSERT INTO attempt_events(
          work_id,execution_id,attempt_no,event_kind,outcome,safe_error_code,fence_token,occurred_at
        ) VALUES(?,?,?,?,?,?,?,?)
      `)
      .run(workId, executionId, attemptNo, eventKind, outcome, safeErrorCode, fence, now);
  }

  #bindReceipt({ row, receipt, now }) {
    const target = this.getTarget(row.target_alias);
    if (
      receipt.targetAlias !== row.target_alias ||
      receipt.marker !== row.marker ||
      receipt.desiredHash !== row.desired_hash
    ) {
      this.db
        .prepare("UPDATE sync_work SET state='manual_reconcile',failure_code='receipt_identity_mismatch' WHERE id=?")
        .run(row.id);
      return "manual_reconcile";
    }

    if (target.path === "drive") {
      const expectedRevision = asNumber(target.drive_revision) + 1;
      if (
        receipt.kind !== "drive_revision" ||
        receipt.fileAlias !== target.drive_file_alias ||
        !Number.isSafeInteger(receipt.revision) ||
        receipt.revision !== expectedRevision
      ) {
        this.db
          .prepare("UPDATE sync_work SET state='manual_reconcile',failure_code='receipt_identity_mismatch' WHERE id=?")
          .run(row.id);
        return "manual_reconcile";
      }
      this.db
        .prepare(`
          UPDATE sync_work SET
            state='drive_updated_unverified',provider_file_alias=?,provider_revision=?,
            failure_code=NULL,resume_action=NULL,next_attempt_at=NULL,last_success_at=?,completed_at=?
          WHERE id=?
        `)
        .run(receipt.fileAlias, receipt.revision, now, now, row.id);
      this.db
        .prepare(`
          UPDATE research_targets SET drive_revision=?,last_progress_at=?,last_drive_document_updated_at=?
          WHERE target_alias=?
        `)
        .run(receipt.revision, now, now, row.target_alias);
      return "drive_updated_unverified";
    }

    if (receipt.kind !== "enterprise_source" || !receipt.sourceId) {
      this.db
        .prepare("UPDATE sync_work SET state='manual_reconcile',failure_code='receipt_identity_mismatch' WHERE id=?")
        .run(row.id);
      return "manual_reconcile";
    }
    if (receipt.status === "COMPLETE") {
      this.db
        .prepare(`
          UPDATE sync_work SET
            state='notebook_synced',provider_source_id=?,failure_code=NULL,resume_action=NULL,
            next_attempt_at=NULL,last_success_at=?,completed_at=?
          WHERE id=?
        `)
        .run(receipt.sourceId, now, now, row.id);
      this.db
        .prepare(`
          UPDATE research_targets
          SET last_progress_at=?,last_notebook_source_complete_at=? WHERE target_alias=?
        `)
        .run(now, now, row.target_alias);
      return "notebook_synced";
    }
    if (receipt.status === "ERROR" || receipt.status === "PERMANENTLY_FAILED") {
      this.db
        .prepare("UPDATE sync_work SET state='permanent_failure',failure_code='provider_terminal_failure' WHERE id=?")
        .run(row.id);
      return "permanent_failure";
    }
    this.db
      .prepare(`
        UPDATE sync_work SET
          state='processing',provider_source_id=?,failure_code=NULL,resume_action='observe',next_attempt_at=?
        WHERE id=?
      `)
      .run(receipt.sourceId, now + 1_000, row.id);
    return "processing";
  }

  recordCreateReceipt(lease, { executionId, workId, receipt, now }) {
    return this.#transaction(() => {
      this.#assertLease(lease, now);
      const execution = this.#assertExecutionScope(lease, executionId);
      const row = this.#assertWorkScope(lease, execution, workId);
      if (!row || row.state !== "creating") throw new Error("work_not_creating");
      const outcome = this.#bindReceipt({ row, receipt, now });
      this.#appendAttemptEvent({
        workId,
        executionId,
        attemptNo: row.active_attempt_no,
        eventKind: "create_result",
        outcome,
        safeErrorCode: outcome === "manual_reconcile" ? "receipt_identity_mismatch" : null,
        fence: lease.fence,
        now,
      });
      return this.getWork(workId);
    });
  }

  recordCreateFailure(
    lease,
    {
      executionId,
      workId,
      acceptance,
      category,
      retryable,
      now,
      maxRetryAttempts,
    },
  ) {
    assertRetryLimit(maxRetryAttempts);
    return this.#transaction(() => {
      this.#assertLease(lease, now);
      const execution = this.#assertExecutionScope(lease, executionId);
      const row = this.#assertWorkScope(lease, execution, workId);
      if (!row || row.state !== "creating") throw new Error("work_not_creating");
      let nextState;
      let nextAttempt = null;
      let resumeAction = null;
      let retryCount = asNumber(row.retry_count);
      if (acceptance === "unknown") {
        nextState = "needs_reconcile";
      } else if (new Set(["revision_conflict", "stable_file_missing"]).has(category)) {
        nextState = "manual_reconcile";
      } else if (category === "reauth_required") {
        nextState = "auth_required";
        resumeAction = "create";
      } else if (retryable && retryCount < maxRetryAttempts) {
        nextState = "retry_wait";
        resumeAction = "create";
        retryCount += 1;
        nextAttempt = now + 1_000;
      } else {
        nextState = "permanent_failure";
      }
      this.db
        .prepare(`
          UPDATE sync_work SET
            state=?,retry_count=?,resume_action=?,next_attempt_at=?,failure_code=?
          WHERE id=?
        `)
        .run(nextState, retryCount, resumeAction, nextAttempt, category, workId);
      this.#appendAttemptEvent({
        workId,
        executionId,
        attemptNo: row.active_attempt_no,
        eventKind: "create_result",
        outcome: nextState,
        safeErrorCode: category,
        fence: lease.fence,
        now,
      });
      return this.getWork(workId);
    });
  }

  recordReconciliation(
    lease,
    {
      executionId,
      workId,
      matches,
      now,
      conclusiveZeroAfterMs,
      maxRetryAttempts,
    },
  ) {
    assertRetryLimit(maxRetryAttempts);
    return this.#transaction(() => {
      this.#assertLease(lease, now);
      const execution = this.#assertExecutionScope(lease, executionId);
      const row = this.#assertWorkScope(lease, execution, workId);
      if (!row || row.state !== "needs_reconcile") throw new Error("work_not_reconciling");
      const exact = matches.filter(
        (match) =>
          match.targetAlias === row.target_alias &&
          match.marker === row.marker &&
          match.desiredHash === row.desired_hash,
      );
      let outcome;
      if (exact.length === 1) {
        outcome = this.#bindReceipt({ row, receipt: exact[0], now });
      } else if (exact.length > 1) {
        outcome = "manual_reconcile";
        this.db
          .prepare("UPDATE sync_work SET state=?,failure_code='reconcile_multiple' WHERE id=?")
          .run(outcome, workId);
      } else if (
        normalizeConclusiveHorizon(conclusiveZeroAfterMs) === null ||
        row.uncertain_until === null
      ) {
        outcome = "manual_reconcile";
        this.db
          .prepare("UPDATE sync_work SET state=?,failure_code='reconcile_zero_inconclusive' WHERE id=?")
          .run(outcome, workId);
      } else if (row.uncertain_until !== null && asNumber(row.uncertain_until) > now) {
        outcome = "needs_reconcile";
        this.db
          .prepare("UPDATE sync_work SET next_attempt_at=?,failure_code='reconcile_wait' WHERE id=?")
          .run(row.uncertain_until, workId);
      } else if (
        asNumber(row.ambiguity_retry_count) < 1 &&
        asNumber(row.retry_count) < maxRetryAttempts
      ) {
        outcome = "retry_wait";
        this.db
          .prepare(`
            UPDATE sync_work SET
              state='retry_wait',resume_action='create',next_attempt_at=?,
              retry_count=retry_count+1,ambiguity_retry_count=ambiguity_retry_count+1,
              failure_code='reconcile_zero'
            WHERE id=?
          `)
          .run(now, workId);
      } else {
        outcome = "manual_reconcile";
        this.db
          .prepare("UPDATE sync_work SET state=?,failure_code='ambiguity_retry_exhausted' WHERE id=?")
          .run(outcome, workId);
      }
      this.#appendAttemptEvent({
        workId,
        executionId,
        attemptNo: row.active_attempt_no ?? row.attempt_count,
        eventKind: "reconcile_result",
        outcome,
        safeErrorCode: exact.length === matches.length ? null : "non_exact_matches_ignored",
        fence: lease.fence,
        now,
      });
      return this.getWork(workId);
    });
  }

  recordObservation(lease, { executionId, workId, observation, now }) {
    return this.#transaction(() => {
      this.#assertLease(lease, now);
      const execution = this.#assertExecutionScope(lease, executionId);
      const row = this.#assertWorkScope(lease, execution, workId);
      if (!row || (row.state !== "processing" && row.resume_action !== "observe")) {
        throw new Error("work_not_observable");
      }
      let outcome;
      if (!observation) {
        outcome = "needs_reconcile";
        this.db
          .prepare("UPDATE sync_work SET state=?,failure_code='accepted_source_missing' WHERE id=?")
          .run(outcome, workId);
      } else if (observation.status === "COMPLETE") {
        outcome = this.#bindReceipt({
          row,
          receipt: {
            ...observation,
            marker: row.marker,
            desiredHash: row.desired_hash,
          },
          now,
        });
      } else if (observation.status === "ERROR" || observation.status === "PERMANENTLY_FAILED") {
        outcome = "permanent_failure";
        this.db
          .prepare("UPDATE sync_work SET state=?,failure_code='provider_terminal_failure' WHERE id=?")
          .run(outcome, workId);
      } else {
        outcome = "processing";
        this.db
          .prepare("UPDATE sync_work SET state=?,resume_action='observe',next_attempt_at=? WHERE id=?")
          .run(outcome, now + 1_000, workId);
      }
      this.#appendAttemptEvent({
        workId,
        executionId,
        attemptNo: row.active_attempt_no ?? row.attempt_count,
        eventKind: "observe_result",
        outcome,
        safeErrorCode: null,
        fence: lease.fence,
        now,
      });
      return this.getWork(workId);
    });
  }

  finalizeExecution(lease, { executionId, now }) {
    return this.#transaction(() => {
      const target = this.#assertLease(lease, now);
      const execution = this.#assertExecutionScope(lease, executionId, { requireRunning: false });
      if (!execution || execution.state !== "running") return execution;
      if (asNumber(target.discovery_cursor) < asNumber(execution.cutoff_seq)) {
        throw new Error("discovery_incomplete");
      }
      const work = this.listWorkThrough(target.target_alias, execution.cutoff_seq);
      const unresolved = work.filter((row) => !RESOLVED_STATES.has(row.state));
      const state =
        unresolved.length === 0
          ? "succeeded"
          : unresolved.some((row) => row.state === "auth_required")
            ? "auth_required"
            : "partial";
      this.db
        .prepare("UPDATE sync_executions SET state=?,completed_at=? WHERE id=?")
        .run(state, now, executionId);
      this.db
        .prepare(`
          UPDATE sync_requests SET state=?,completed_at=?
          WHERE execution_id=? AND state='attached'
        `)
        .run(state, now, executionId);
      this.db
        .prepare(`
          UPDATE research_targets SET
            last_attempt_finished_at=?,
            last_successful_run_at=CASE WHEN ?='succeeded' THEN ? ELSE last_successful_run_at END
          WHERE target_alias=?
        `)
        .run(now, state, now, target.target_alias);
      return this.getExecution(executionId);
    });
  }

  listAttemptEvents(targetAlias) {
    return this.db
      .prepare(`
        SELECT a.* FROM attempt_events a JOIN sync_work w ON w.id=a.work_id
        WHERE w.target_alias=? ORDER BY a.id
      `)
      .all(targetAlias)
      .map(cloneRow);
  }

  projectSafeStatus(targetAlias) {
    const target = this.getTarget(targetAlias);
    if (!target) return null;
    const counts = Object.fromEntries(
      this.db
        .prepare("SELECT state,COUNT(*) AS count FROM sync_work WHERE target_alias=? GROUP BY state")
        .all(targetAlias)
        .map((row) => [row.state, asNumber(row.count)]),
    );
    return {
      targetAlias,
      path: target.path,
      lastAttemptStartedAt: target.last_attempt_started_at,
      lastAttemptFinishedAt: target.last_attempt_finished_at,
      lastSuccessfulRunAt: target.last_successful_run_at,
      lastNotebookSourceCompleteAt:
        target.path === "enterprise" ? target.last_notebook_source_complete_at : null,
      lastDriveDocumentUpdatedAt:
        target.path === "drive" ? target.last_drive_document_updated_at : null,
      terminalLabel:
        target.path === "drive"
          ? target.last_drive_document_updated_at === null
            ? null
            : "Drive document updated — NotebookLM refresh unverified"
          : target.last_notebook_source_complete_at === null
            ? null
            : "NotebookLM source complete",
      counts,
    };
  }
}

export class DurableSyncEngine {
  constructor({
    store,
    provider,
    connectionKey,
    clock = () => Date.now(),
    maxRetryAttempts = 2,
  }) {
    assertRetryLimit(maxRetryAttempts);
    this.store = store;
    this.provider = provider;
    this.connectionKey = connectionKey;
    this.clock = clock;
    this.maxRetryAttempts = maxRetryAttempts;
    this.conclusiveZeroAfterMs = normalizeConclusiveHorizon(provider.conclusiveZeroAfterMs);
  }

  async runOnce({
    targetAlias,
    workerId,
    ttlMs = 30_000,
    pageSize = 2,
    failpoint = null,
    failOperationKey = null,
  }) {
    assertPageSize(pageSize);
    const lease = this.store.acquireLease({
      targetAlias,
      workerId,
      now: this.clock(),
      ttlMs,
    });
    if (!lease) return { state: "coalesced" };
    let crashed = false;
    try {
      const boundTarget = this.store.getTarget(targetAlias);
      if (!boundTarget || this.provider.path !== boundTarget.path) {
        throw new Error("provider_path_mismatch");
      }
      const execution = this.store.beginNextExecution(lease, { now: this.clock() });
      if (!execution) return { state: "idle" };

      let firstPage = true;
      for (;;) {
        const materialized = this.store.materializeOutboxPage(lease, {
          executionId: execution.id,
          pageSize,
          now: this.clock(),
          connectionKey: this.connectionKey,
          failpoint: firstPage && failpoint === "after_materialization_commit" ? failpoint : null,
        });
        firstPage = false;
        if (materialized.count === 0) break;
      }

      this.store.recoverInterruptedWrites(lease, {
        executionId: execution.id,
        now: this.clock(),
      });
      const workRows = this.store.listWorkThrough(targetAlias, execution.cutoff_seq);
      const target = this.store.getTarget(targetAlias);
      for (const initialRow of workRows) {
        this.store.assertLease(lease, this.clock());
        let row = this.store.getWork(initialRow.id);
        if (RESOLVED_STATES.has(row.state) || row.state === "permanent_failure") {
          continue;
        }
        if (new Set(["auth_required", "blocked_capacity", "manual_reconcile"]).has(row.state)) {
          if (target.path === "drive") break;
          continue;
        }

        if (row.state === "needs_reconcile") {
          if (row.next_attempt_at !== null && asNumber(row.next_attempt_at) > this.clock()) {
            if (target.path === "drive") break;
            continue;
          }
          const matches = await this.provider.reconcile({
            targetAlias,
            marker: row.marker,
            desiredHash: row.desired_hash,
            now: this.clock(),
          });
          row = this.store.recordReconciliation(lease, {
            executionId: execution.id,
            workId: row.id,
            matches,
            now: this.clock(),
            conclusiveZeroAfterMs: this.conclusiveZeroAfterMs,
            maxRetryAttempts: this.maxRetryAttempts,
          });
          if (target.path === "drive" && row.state !== "drive_updated_unverified") break;
          continue;
        }

        if (row.state === "processing" || (row.state === "retry_wait" && row.resume_action === "observe")) {
          if (row.next_attempt_at !== null && asNumber(row.next_attempt_at) > this.clock()) {
            if (target.path === "drive") break;
            continue;
          }
          const observation = await this.provider.observe({
            targetAlias,
            sourceId: row.provider_source_id,
            fileAlias: row.provider_file_alias,
          });
          row = this.store.recordObservation(lease, {
            executionId: execution.id,
            workId: row.id,
            observation,
            now: this.clock(),
          });
          if (
            target.path === "drive" &&
            !new Set(["drive_updated_unverified", "permanent_failure"]).has(row.state)
          ) {
            break;
          }
          continue;
        }

        const intent = this.store.beginCreateIntent(lease, {
          executionId: execution.id,
          workId: row.id,
          now: this.clock(),
          conclusiveZeroAfterMs: this.conclusiveZeroAfterMs,
        });
        if (!intent) {
          if (target.path === "drive") break;
          continue;
        }
        const isFailureTarget = failOperationKey === null || failOperationKey === row.operation_key;
        if (failpoint === "after_create_intent" && isFailureTarget) {
          throw new SimulatedCrashError(failpoint);
        }

        try {
          const receipt = await this.provider.write(intent);
          if (failpoint === "after_provider_response" && isFailureTarget) {
            throw new SimulatedCrashError(failpoint);
          }
          row = this.store.recordCreateReceipt(lease, {
            executionId: execution.id,
            workId: row.id,
            receipt,
            now: this.clock(),
          });
          if (
            failpoint === "after_terminal_commit" &&
            isFailureTarget &&
            RESOLVED_STATES.has(row.state)
          ) {
            throw new SimulatedCrashError(failpoint);
          }
        } catch (error) {
          if (error instanceof SimulatedCrashError || error instanceof StaleFenceError) throw error;
          if (!(error instanceof FakeProviderError)) throw error;
          const retryable = new Set(["provider_unavailable", "rate_limited", "timeout"]).has(
            error.category,
          );
          row = this.store.recordCreateFailure(lease, {
            executionId: execution.id,
            workId: row.id,
            acceptance: error.acceptance,
            category: error.category,
            retryable,
            now: this.clock(),
            maxRetryAttempts: this.maxRetryAttempts,
          });
          if (
            target.path === "drive" &&
            !new Set(["drive_updated_unverified", "permanent_failure"]).has(row.state)
          ) {
            break;
          }
        }
      }

      return this.store.finalizeExecution(lease, {
        executionId: execution.id,
        now: this.clock(),
      });
    } catch (error) {
      if (error instanceof SimulatedCrashError) {
        crashed = true;
        return { state: "interrupted", point: error.point };
      }
      if (error instanceof StaleFenceError) return { state: "stale" };
      throw error;
    } finally {
      if (!crashed) this.store.releaseLease(lease);
    }
  }
}
