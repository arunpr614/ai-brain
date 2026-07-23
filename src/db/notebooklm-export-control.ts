import type Database from "better-sqlite3";
import { getDb } from "./client";
import { NOTEBOOKLM_RETENTION_SWEEP_MS } from "@/lib/notebooklm/contracts";

const NOTEBOOKLM_PROVIDER_WRITES_SETTING = "notebooklm.provider_writes_enabled";
const NOTEBOOKLM_EXPORT_MASTER_SETTING = "notebooklm.export_master_enabled";
const NOTEBOOKLM_EXPORT_QUEUE_SETTING = "notebooklm.export_queue_enabled";

export const NOTEBOOKLM_RESTORE_RECONCILIATION_BLOCK_REASON =
  "restore_reconciliation_required";
export const NOTEBOOKLM_IDENTITY_CONFLICT_BLOCK_REASONS = Object.freeze([
  "multiple_marker_matches",
  "provider_source_identity_reused",
] as const);

function notebookLmBlockRequiresDedicatedEvidence(
  reason: string | null,
): boolean {
  return (
    reason === NOTEBOOKLM_RESTORE_RECONCILIATION_BLOCK_REASON ||
    NOTEBOOKLM_IDENTITY_CONFLICT_BLOCK_REASONS.some(
      (identityReason) => identityReason === reason,
    )
  );
}

export interface NotebookLmRuntimeControlRow {
  id: 1;
  provider_write_blocked: 0 | 1;
  protocol_failure_streak: number;
  block_reason: string | null;
  last_protocol_failure_at: number | null;
  retention_last_success_at: number | null;
  retention_last_failure_at: number | null;
  retention_failure_streak: number;
  retention_last_error_code: string | null;
  retention_last_expired_count: number;
  retention_last_purged_count: number;
  retention_overdue_snapshot_count: number;
  retention_physical_purge_pending: 0 | 1;
  retention_physical_purge_generation: number;
  unresolved_over_24h_count: number;
  updated_at: number;
}

export class NotebookLmRuntimeControlError extends Error {
  constructor(
    public readonly code:
      | "target_not_recently_verified"
      | "acknowledgement_required"
      | "rollout_unavailable"
      | "provider_writes_unavailable"
      | "target_not_safe"
      | "target_capacity_exhausted"
      | "connector_offline"
      | "restore_reconciliation_required"
      | "identity_conflict_reconciliation_required",
  ) {
    super(code);
    this.name = "NotebookLmRuntimeControlError";
  }
}

export function getNotebookLmProviderWritesPreference(
  db: Database.Database = getDb(),
): boolean {
  return getNotebookLmBooleanPreference(NOTEBOOKLM_PROVIDER_WRITES_SETTING, db);
}

function getNotebookLmBooleanPreference(
  key: string,
  db: Database.Database = getDb(),
): boolean {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  if (!row) return true;
  try {
    return JSON.parse(row.value) === true;
  } catch {
    return false;
  }
}

export function getNotebookLmExportMasterPreference(
  db: Database.Database = getDb(),
): boolean {
  return getNotebookLmBooleanPreference(NOTEBOOKLM_EXPORT_MASTER_SETTING, db);
}

export function getNotebookLmExportQueuePreference(
  db: Database.Database = getDb(),
): boolean {
  return getNotebookLmBooleanPreference(NOTEBOOKLM_EXPORT_QUEUE_SETTING, db);
}

export function setNotebookLmExportGatePreference(input: {
  gate: "master" | "queue";
  enabled: boolean;
  acknowledgeExportsMayBeAccepted?: boolean;
  rolloutAvailable: boolean;
  now?: number;
  db?: Database.Database;
}): { enabled: boolean; changed: boolean } {
  const db = input.db ?? getDb();
  const now = input.now ?? Date.now();
  if (input.enabled && !input.acknowledgeExportsMayBeAccepted) {
    throw new NotebookLmRuntimeControlError("acknowledgement_required");
  }
  if (input.enabled && !input.rolloutAvailable) {
    throw new NotebookLmRuntimeControlError("rollout_unavailable");
  }
  const key =
    input.gate === "master"
      ? NOTEBOOKLM_EXPORT_MASTER_SETTING
      : NOTEBOOKLM_EXPORT_QUEUE_SETTING;
  const eventPrefix =
    input.gate === "master"
      ? "notebooklm.export_master"
      : "notebooklm.export_queue";
  return db.transaction(() => {
    const previous = getNotebookLmBooleanPreference(key, db);
    db.prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value, updated_at = excluded.updated_at`,
    ).run(key, JSON.stringify(input.enabled), now);
    if (previous !== input.enabled) {
      db.prepare(
        `INSERT INTO notebooklm_operational_events
         (event_type, safe_reason, created_at)
         VALUES (?, 'settings_control', ?)`,
      ).run(
        `${eventPrefix}_${input.enabled ? "enabled" : "disabled"}`,
        now,
      );
    }
    return { enabled: input.enabled, changed: previous !== input.enabled };
  }).immediate();
}

export function setNotebookLmProviderWritesPreference(input: {
  enabled: boolean;
  acknowledgeStaticCopiesWillBeCreated?: boolean;
  rolloutAvailable: boolean;
  now?: number;
  db?: Database.Database;
}): { enabled: boolean; changed: boolean } {
  const db = input.db ?? getDb();
  const now = input.now ?? Date.now();
  if (input.enabled && !input.acknowledgeStaticCopiesWillBeCreated) {
    throw new NotebookLmRuntimeControlError("acknowledgement_required");
  }
  if (input.enabled && !input.rolloutAvailable) {
    throw new NotebookLmRuntimeControlError("provider_writes_unavailable");
  }

  return db.transaction(() => {
    if (input.enabled) {
      const target = db
        .prepare(
          `SELECT target.id target_id, target.connector_id,
                  target.sharing_posture, target.health_status,
                  target.source_count, target.source_limit, target.reserve_count,
                  target.verified_at, connector.last_seen_at
           FROM notebooklm_targets target
           JOIN notebooklm_connectors connector ON connector.id = target.connector_id
           WHERE target.active = 1 AND connector.state = 'bound'
           LIMIT 1`,
        )
        .get() as {
          target_id: string;
          connector_id: string;
          sharing_posture: string;
          health_status: string;
          source_count: number | null;
          source_limit: number;
          reserve_count: number;
          verified_at: number | null;
          last_seen_at: number | null;
        } | undefined;
      if (
        !target ||
        target.sharing_posture !== "private" ||
        target.health_status !== "healthy"
      ) {
        throw new NotebookLmRuntimeControlError("target_not_safe");
      }
      if (
        target.verified_at === null ||
        target.verified_at < now - 5 * 60 * 1_000
      ) {
        throw new NotebookLmRuntimeControlError("target_not_recently_verified");
      }
      if (
        target.last_seen_at === null ||
        target.last_seen_at < now - 2 * 60 * 1_000
      ) {
        throw new NotebookLmRuntimeControlError("connector_offline");
      }
      if (
        target.source_count === null ||
        target.source_count + target.reserve_count >= target.source_limit
      ) {
        throw new NotebookLmRuntimeControlError("target_capacity_exhausted");
      }
    }

    const previous = getNotebookLmProviderWritesPreference(db);
    db.prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value, updated_at = excluded.updated_at`,
    ).run(
      NOTEBOOKLM_PROVIDER_WRITES_SETTING,
      JSON.stringify(input.enabled),
      now,
    );
    if (previous !== input.enabled) {
      db.prepare(
        `INSERT INTO notebooklm_operational_events
         (event_type, safe_reason, created_at)
         VALUES (?, ?, ?)`,
      ).run(
        input.enabled
          ? "notebooklm.provider_writes_enabled"
          : "notebooklm.provider_writes_disabled",
        "settings_control",
        now,
      );
    }
    return { enabled: input.enabled, changed: previous !== input.enabled };
  }).immediate();
}

export function getNotebookLmRuntimeControl(
  db: Database.Database = getDb(),
): NotebookLmRuntimeControlRow {
  return db
    .prepare("SELECT * FROM notebooklm_runtime_control WHERE id = 1")
    .get() as NotebookLmRuntimeControlRow;
}

export function notebookLmRuntimeProviderWritesAllowed(
  db: Database.Database = getDb(),
  now: number = Date.now(),
): boolean {
  const control = getNotebookLmRuntimeControl(db);
  if (
    control.provider_write_blocked !== 0 ||
    control.retention_failure_streak !== 0 ||
    control.retention_physical_purge_pending !== 0 ||
    control.retention_last_success_at === null ||
    now - control.retention_last_success_at > NOTEBOOKLM_RETENTION_SWEEP_MS * 3
  ) {
    return false;
  }
  const overdue = db
    .prepare(
      `SELECT 1 value FROM notebooklm_export_requests
       WHERE snapshot_purged_at IS NULL AND snapshot_purge_at <= ? LIMIT 1`,
    )
    .get(now) as { value: number } | undefined;
  return !overdue;
}

export function getNotebookLmRetentionOperationalStatus(
  now: number = Date.now(),
  db: Database.Database = getDb(),
): {
  healthy: boolean;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  failureStreak: number;
  lastErrorCode: string | null;
  overdueSnapshots: number;
  physicalPurgePending: boolean;
  unresolvedOver24h: number;
} {
  const control = getNotebookLmRuntimeControl(db);
  const overdueSnapshots = (db
    .prepare(
      `SELECT COUNT(*) value FROM notebooklm_export_requests
       WHERE snapshot_purged_at IS NULL AND snapshot_purge_at <= ?`,
    )
    .get(now) as { value: number }).value;
  const unresolvedOver24h = (db
    .prepare(
      `SELECT COUNT(*) value FROM notebooklm_export_requests
       WHERE create_dispatched_at IS NOT NULL
         AND create_dispatched_at <= ?
         AND state NOT IN ('succeeded', 'provider_failed', 'cancelled', 'expired')`,
    )
    .get(now - 24 * 60 * 60 * 1_000) as { value: number }).value;
  const healthy =
    control.retention_failure_streak === 0 &&
    control.retention_physical_purge_pending === 0 &&
    control.retention_last_success_at !== null &&
    now - control.retention_last_success_at <= NOTEBOOKLM_RETENTION_SWEEP_MS * 3 &&
    overdueSnapshots === 0;
  return {
    healthy,
    lastSuccessAt: control.retention_last_success_at,
    lastFailureAt: control.retention_last_failure_at,
    failureStreak: control.retention_failure_streak,
    lastErrorCode: control.retention_last_error_code,
    overdueSnapshots,
    physicalPurgePending: control.retention_physical_purge_pending === 1,
    unresolvedOver24h,
  };
}

/**
 * Mark a physical purge as pending in the same transaction that removes the
 * sensitive logical values. The generation prevents one process from clearing
 * a newer purge that committed while it was checkpointing an older one.
 */
export function markNotebookLmPhysicalPurgePending(input: {
  now?: number;
  db?: Database.Database;
} = {}): number {
  const db = input.db ?? getDb();
  const now = input.now ?? Date.now();
  db.prepare(
    `UPDATE notebooklm_runtime_control SET
       retention_physical_purge_pending = 1,
       retention_physical_purge_generation = retention_physical_purge_generation + 1,
       updated_at = MAX(updated_at, ?)
     WHERE id = 1`,
  ).run(now);
  return getNotebookLmRuntimeControl(db).retention_physical_purge_generation;
}

export function clearNotebookLmPhysicalPurgePending(input: {
  expectedGeneration: number;
  now?: number;
  db?: Database.Database;
}): boolean {
  const db = input.db ?? getDb();
  const now = input.now ?? Date.now();
  return db.prepare(
    `UPDATE notebooklm_runtime_control SET
       retention_physical_purge_pending = 0,
       updated_at = MAX(updated_at, ?)
     WHERE id = 1
       AND retention_physical_purge_pending = 1
       AND retention_physical_purge_generation = ?`,
  ).run(now, input.expectedGeneration).changes === 1;
}

export function recordNotebookLmRetentionSweepSuccess(input: {
  expired: number;
  snapshotsPurged: number;
  overdueSnapshots: number;
  unresolvedOver24h: number;
  now?: number;
  db?: Database.Database;
}): NotebookLmRuntimeControlRow {
  const db = input.db ?? getDb();
  const now = input.now ?? Date.now();
  const previous = getNotebookLmRuntimeControl(db);
  const updated = db.prepare(
    `UPDATE notebooklm_runtime_control SET
       retention_last_success_at = ?, retention_failure_streak = 0,
       retention_last_error_code = NULL, retention_last_expired_count = ?,
       retention_last_purged_count = ?, retention_overdue_snapshot_count = ?,
       unresolved_over_24h_count = ?, updated_at = ?
     WHERE id = 1 AND retention_physical_purge_pending = 0`,
  ).run(
    now,
    input.expired,
    input.snapshotsPurged,
    input.overdueSnapshots,
    input.unresolvedOver24h,
    now,
  );
  if (updated.changes !== 1) throw new Error("physical_purge_pending");
  if (
    previous.retention_last_success_at === null ||
    now - previous.retention_last_success_at >= 60 * 60 * 1_000 ||
    input.expired > 0 ||
    input.snapshotsPurged > 0 ||
    input.overdueSnapshots > 0 ||
    input.unresolvedOver24h > 0
  ) {
    db.prepare(
      `INSERT INTO notebooklm_operational_events
       (event_type, safe_reason, created_at)
       VALUES ('notebooklm.retention_sweep_succeeded', ?, ?)`,
    ).run(
      `expired=${input.expired},purged=${input.snapshotsPurged},overdue=${input.overdueSnapshots},unresolved24h=${input.unresolvedOver24h}`,
      now,
    );
  }
  return getNotebookLmRuntimeControl(db);
}

export function recordNotebookLmRetentionSweepFailure(input: {
  errorCode: "cleanup_failed" | "physical_purge_pending" | "wal_checkpoint_incomplete";
  now?: number;
  db?: Database.Database;
}): NotebookLmRuntimeControlRow {
  const db = input.db ?? getDb();
  const now = input.now ?? Date.now();
  db.prepare(
    `UPDATE notebooklm_runtime_control SET
       retention_last_failure_at = ?,
       retention_failure_streak = retention_failure_streak + 1,
       retention_last_error_code = ?, updated_at = ?
     WHERE id = 1`,
  ).run(now, input.errorCode, now);
  db.prepare(
    `INSERT INTO notebooklm_operational_events
     (event_type, safe_reason, created_at)
     VALUES ('notebooklm.retention_sweep_failed', ?, ?)`,
  ).run(input.errorCode, now);
  return getNotebookLmRuntimeControl(db);
}

export function recordNotebookLmProtocolFailure(input: {
  connectorId: string;
  targetId: string;
  now?: number;
  db?: Database.Database;
}): NotebookLmRuntimeControlRow {
  const db = input.db ?? getDb();
  const now = input.now ?? Date.now();
  db.prepare(
    `UPDATE notebooklm_runtime_control SET
       protocol_failure_streak = MIN(3, protocol_failure_streak + 1),
       provider_write_blocked = CASE
         WHEN protocol_failure_streak + 1 >= 3 THEN 1
         ELSE provider_write_blocked
       END,
       block_reason = CASE
         WHEN block_reason IN (?, ?, ?) THEN block_reason
         WHEN protocol_failure_streak + 1 >= 3 THEN 'protocol_drift'
         ELSE block_reason
       END,
       last_protocol_failure_at = ?, updated_at = ?
     WHERE id = 1`,
  ).run(
    NOTEBOOKLM_RESTORE_RECONCILIATION_BLOCK_REASON,
    ...NOTEBOOKLM_IDENTITY_CONFLICT_BLOCK_REASONS,
    now,
    now,
  );
  const state = getNotebookLmRuntimeControl(db);
  db.prepare(
    `INSERT INTO notebooklm_operational_events
     (event_type, connector_id, target_id, safe_reason, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    state.provider_write_blocked ? "notebooklm.write_kill_switch_tripped" : "notebooklm.protocol_failure",
    input.connectorId,
    input.targetId,
    notebookLmBlockRequiresDedicatedEvidence(state.block_reason)
      ? state.block_reason
      : state.provider_write_blocked
        ? "protocol_drift"
        : "protocol_failure",
    now,
  );
  return state;
}

export function recordNotebookLmProtocolSuccess(input: {
  now?: number;
  db?: Database.Database;
} = {}): NotebookLmRuntimeControlRow {
  const db = input.db ?? getDb();
  const now = input.now ?? Date.now();
  db.prepare(
    `UPDATE notebooklm_runtime_control
     SET protocol_failure_streak = 0, updated_at = ?
     WHERE id = 1 AND provider_write_blocked = 0 AND protocol_failure_streak != 0`,
  ).run(now);
  return getNotebookLmRuntimeControl(db);
}

export function tripNotebookLmProviderWriteBlock(input: {
  connectorId: string;
  targetId: string;
  reason: "protocol_drift" | "multiple_marker_matches" | "provider_source_identity_reused";
  now?: number;
  db?: Database.Database;
}): NotebookLmRuntimeControlRow {
  const db = input.db ?? getDb();
  const now = input.now ?? Date.now();
  db.prepare(
    `UPDATE notebooklm_runtime_control SET
       provider_write_blocked = 1, protocol_failure_streak = 3,
       block_reason = CASE WHEN block_reason IN (?, ?, ?) THEN block_reason ELSE ? END,
       last_protocol_failure_at = ?, updated_at = ?
     WHERE id = 1`,
  ).run(
    NOTEBOOKLM_RESTORE_RECONCILIATION_BLOCK_REASON,
    ...NOTEBOOKLM_IDENTITY_CONFLICT_BLOCK_REASONS,
    input.reason,
    now,
    now,
  );
  const state = getNotebookLmRuntimeControl(db);
  db.prepare(
    `INSERT INTO notebooklm_operational_events
     (event_type, connector_id, target_id, safe_reason, created_at)
     VALUES ('notebooklm.write_kill_switch_tripped', ?, ?, ?, ?)`,
  ).run(
    input.connectorId,
    input.targetId,
    notebookLmBlockRequiresDedicatedEvidence(state.block_reason)
      ? state.block_reason
      : input.reason,
    now,
  );
  return state;
}

export function clearNotebookLmProtocolWriteBlock(input: {
  acknowledgeConnectorUpdatedAndTargetRevalidated: boolean;
  now?: number;
}): NotebookLmRuntimeControlRow {
  if (!input.acknowledgeConnectorUpdatedAndTargetRevalidated) {
    throw new NotebookLmRuntimeControlError("acknowledgement_required");
  }
  const db = getDb();
  const now = input.now ?? Date.now();
  const tx = db.transaction(() => {
    const control = getNotebookLmRuntimeControl(db);
    if (control.block_reason === NOTEBOOKLM_RESTORE_RECONCILIATION_BLOCK_REASON) {
      throw new NotebookLmRuntimeControlError("restore_reconciliation_required");
    }
    if (
      NOTEBOOKLM_IDENTITY_CONFLICT_BLOCK_REASONS.some(
        (reason) => reason === control.block_reason,
      )
    ) {
      throw new NotebookLmRuntimeControlError(
        "identity_conflict_reconciliation_required",
      );
    }
    const failureAt = control.last_protocol_failure_at;
    if (control.provider_write_blocked !== 1 || failureAt === null) {
      throw new NotebookLmRuntimeControlError("target_not_recently_verified");
    }
    const verified = db
      .prepare(
        `SELECT 1 value FROM notebooklm_targets target
         JOIN notebooklm_connectors connector ON connector.id = target.connector_id
         WHERE target.active = 1 AND target.sharing_posture = 'private'
           AND target.health_status = 'healthy' AND target.verified_at >= ?
           AND target.verified_at > ?
           AND connector.state = 'bound' LIMIT 1`,
      )
      .get(now - 5 * 60 * 1_000, failureAt) as { value: number } | undefined;
    if (!verified) {
      throw new NotebookLmRuntimeControlError("target_not_recently_verified");
    }
    db.prepare(
      `UPDATE notebooklm_runtime_control
       SET provider_write_blocked = 0, protocol_failure_streak = 0,
           block_reason = NULL, updated_at = ? WHERE id = 1`,
    ).run(now);
    db.prepare(
      `INSERT INTO notebooklm_operational_events
       (event_type, safe_reason, created_at) VALUES ('notebooklm.write_kill_switch_cleared', ?, ?)`,
    ).run("operator_acknowledged_revalidation", now);
    return getNotebookLmRuntimeControl(db);
  });
  return tx.immediate();
}
