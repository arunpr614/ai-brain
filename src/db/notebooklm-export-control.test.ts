import "./notebooklm-export-control.test.setup";

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { test } from "node:test";
import { getDb } from "./client";
import {
  clearNotebookLmPhysicalPurgePending,
  clearNotebookLmProtocolWriteBlock,
  getNotebookLmRetentionOperationalStatus,
  getNotebookLmRuntimeControl,
  markNotebookLmPhysicalPurgePending,
  notebookLmRuntimeProviderWritesAllowed,
  NotebookLmRuntimeControlError,
  NOTEBOOKLM_IDENTITY_CONFLICT_BLOCK_REASONS,
  NOTEBOOKLM_RESTORE_RECONCILIATION_BLOCK_REASON,
  recordNotebookLmProtocolFailure,
  recordNotebookLmProtocolSuccess,
  recordNotebookLmRetentionSweepFailure,
  recordNotebookLmRetentionSweepSuccess,
  tripNotebookLmProviderWriteBlock,
} from "./notebooklm-export-control";
import { NOTEBOOKLM_SAFE_TARGET_LABEL } from "@/lib/notebooklm/contracts";
import {
  notebookLmExportProviderWriteEnabled,
  notebookLmExportQueueEnabled,
} from "@/lib/notebooklm/flags";
import { TEST_DB_DIR } from "./notebooklm-export-control.test.setup";

const BASE_NOW = 1_700_400_000_000;
const CONNECTOR_ID = "runtime-control-connector";
const TARGET_ID = "runtime-control-target";

test.after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

test.beforeEach(() => {
  const db = getDb();
  db.prepare("DELETE FROM notebooklm_operational_events").run();
  db.prepare("DELETE FROM notebooklm_export_events").run();
  db.prepare("DELETE FROM notebooklm_export_requests").run();
  db.prepare("DELETE FROM notebooklm_targets").run();
  db.prepare("DELETE FROM notebooklm_connectors").run();
  db.prepare(
    `UPDATE notebooklm_runtime_control SET provider_write_blocked=0,
     protocol_failure_streak=0, block_reason=NULL, last_protocol_failure_at=NULL,
     retention_last_success_at=?, retention_last_failure_at=NULL,
     retention_failure_streak=0, retention_last_error_code=NULL,
     retention_last_expired_count=0, retention_last_purged_count=0,
     retention_overdue_snapshot_count=0, retention_physical_purge_pending=0,
     retention_physical_purge_generation=0, unresolved_over_24h_count=0,
     updated_at=0 WHERE id=1`,
  ).run(Date.now());
  process.env.BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED = "1";
  process.env.BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED = "1";
  process.env.BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED = "1";
});

function installHealthyTarget(verifiedAt = BASE_NOW) {
  const db = getDb();
  db.prepare(
    `INSERT INTO notebooklm_connectors
     (id,token_hash,token_hint,label,extension_origin,protocol_version,state,
      created_at,updated_at)
     VALUES(?,?,'12345678','Synthetic connector',?,1,'bound',?,?)`,
  ).run(
    CONNECTOR_ID,
    "a".repeat(64),
    `chrome-extension://${"a".repeat(32)}`,
    BASE_NOW - 1_000,
    BASE_NOW - 1_000,
  );
  db.prepare(
    `INSERT INTO notebooklm_targets
     (id,connector_id,binding_version,safe_label,local_binding_fingerprint,
      subject_fingerprint,sharing_policy,sharing_posture,source_limit,reserve_count,
      source_count,health_status,verified_at,active,created_at)
     VALUES(?,?,1,?,?,?,'private_only','private',50,5,1,
      'healthy',?,1,?)`,
  ).run(
    TARGET_ID,
    CONNECTOR_ID,
    NOTEBOOKLM_SAFE_TARGET_LABEL,
    "b".repeat(64),
    "c".repeat(64),
    verifiedAt,
    BASE_NOW - 1_000,
  );
}

function expectControlCode(code: string, operation: () => unknown) {
  let caught: unknown;
  try {
    operation();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof NotebookLmRuntimeControlError);
  assert.equal(caught.code, code);
}

test("migration seeds one unblocked singleton and feature flags honor it", () => {
  getDb().prepare(
    `UPDATE notebooklm_runtime_control SET retention_last_success_at=NULL, updated_at=0
     WHERE id=1`,
  ).run();
  assert.deepEqual(getNotebookLmRuntimeControl(), {
    id: 1,
    provider_write_blocked: 0,
    protocol_failure_streak: 0,
    block_reason: null,
    last_protocol_failure_at: null,
    retention_last_success_at: null,
    retention_last_failure_at: null,
    retention_failure_streak: 0,
    retention_last_error_code: null,
    retention_last_expired_count: 0,
    retention_last_purged_count: 0,
    retention_overdue_snapshot_count: 0,
    retention_physical_purge_pending: 0,
    retention_physical_purge_generation: 0,
    unresolved_over_24h_count: 0,
    updated_at: 0,
  });
  assert.equal(notebookLmRuntimeProviderWritesAllowed(getDb(), BASE_NOW), false);
  const initializedAt = Date.now();
  recordNotebookLmRetentionSweepSuccess({
    expired: 0,
    snapshotsPurged: 0,
    overdueSnapshots: 0,
    unresolvedOver24h: 0,
    now: initializedAt,
  });
  assert.equal(notebookLmRuntimeProviderWritesAllowed(getDb(), initializedAt), true);
  assert.equal(notebookLmExportQueueEnabled(), true);
  assert.equal(notebookLmExportProviderWriteEnabled(), true);
  assert.throws(
    () => getDb().prepare(
      `INSERT INTO notebooklm_runtime_control
       (id,provider_write_blocked,protocol_failure_streak,updated_at)
       VALUES(2,0,0,0)`,
    ).run(),
    /CHECK constraint failed/,
  );
});

test("retention health initializes fail-closed, records bounded failure state, and recovers on success", () => {
  getDb().prepare(
    `UPDATE notebooklm_runtime_control SET retention_last_success_at=NULL, updated_at=0
     WHERE id=1`,
  ).run();
  assert.equal(notebookLmRuntimeProviderWritesAllowed(getDb(), BASE_NOW), false);
  const failed = recordNotebookLmRetentionSweepFailure({
    errorCode: "cleanup_failed",
    now: BASE_NOW,
  });
  assert.equal(failed.retention_failure_streak, 1);
  assert.equal(failed.retention_last_error_code, "cleanup_failed");
  assert.equal(notebookLmRuntimeProviderWritesAllowed(getDb(), BASE_NOW), false);

  const recovered = recordNotebookLmRetentionSweepSuccess({
    expired: 2,
    snapshotsPurged: 3,
    overdueSnapshots: 0,
    unresolvedOver24h: 1,
    now: BASE_NOW + 1,
  });
  assert.equal(recovered.retention_last_success_at, BASE_NOW + 1);
  assert.equal(recovered.retention_failure_streak, 0);
  assert.equal(recovered.retention_last_error_code, null);
  assert.equal(recovered.retention_last_expired_count, 2);
  assert.equal(recovered.retention_last_purged_count, 3);
  assert.equal(recovered.unresolved_over_24h_count, 1);
  assert.equal(notebookLmRuntimeProviderWritesAllowed(getDb(), BASE_NOW + 1), true);
});

test("a durable physical-purge generation blocks writes and cannot be cleared by retention success", () => {
  const firstGeneration = markNotebookLmPhysicalPurgePending({ now: BASE_NOW });
  assert.equal(firstGeneration, 1);
  assert.equal(getNotebookLmRuntimeControl().retention_failure_streak, 0);
  assert.equal(notebookLmRuntimeProviderWritesAllowed(getDb(), BASE_NOW), false);
  assert.equal(getNotebookLmRetentionOperationalStatus(BASE_NOW).physicalPurgePending, true);

  recordNotebookLmRetentionSweepFailure({ errorCode: "cleanup_failed", now: BASE_NOW + 1 });

  assert.throws(
    () => recordNotebookLmRetentionSweepSuccess({
      expired: 0,
      snapshotsPurged: 0,
      overdueSnapshots: 0,
      unresolvedOver24h: 0,
      now: BASE_NOW + 2,
    }),
    /physical_purge_pending/,
  );
  assert.equal(getNotebookLmRuntimeControl().retention_failure_streak, 1);
  assert.equal(getNotebookLmRuntimeControl().retention_last_error_code, "cleanup_failed");

  const secondGeneration = markNotebookLmPhysicalPurgePending({ now: BASE_NOW + 3 });
  assert.equal(secondGeneration, 2);
  assert.equal(clearNotebookLmPhysicalPurgePending({
    expectedGeneration: firstGeneration,
    now: BASE_NOW + 4,
  }), false);
  assert.equal(getNotebookLmRuntimeControl().retention_physical_purge_pending, 1);
  assert.equal(clearNotebookLmPhysicalPurgePending({
    expectedGeneration: secondGeneration,
    now: BASE_NOW + 5,
  }), true);

  const recovered = recordNotebookLmRetentionSweepSuccess({
    expired: 0,
    snapshotsPurged: 0,
    overdueSnapshots: 0,
    unresolvedOver24h: 0,
    now: BASE_NOW + 6,
  });
  assert.equal(recovered.retention_physical_purge_pending, 0);
  assert.equal(recovered.retention_failure_streak, 0);
  assert.equal(notebookLmRuntimeProviderWritesAllowed(getDb(), BASE_NOW + 6), true);
});

test("a fresh healthy target cannot clear a write block that was never tripped", () => {
  installHealthyTarget(BASE_NOW);
  expectControlCode("target_not_recently_verified", () =>
    clearNotebookLmProtocolWriteBlock({
      acknowledgeConnectorUpdatedAndTargetRevalidated: true,
      now: BASE_NOW + 1,
    }),
  );
  assert.equal(getNotebookLmRuntimeControl().provider_write_blocked, 0);
});

test("three consecutive protocol failures trip and cap the durable write kill switch", () => {
  installHealthyTarget();
  for (let streak = 1; streak <= 3; streak += 1) {
    const state = recordNotebookLmProtocolFailure({
      connectorId: CONNECTOR_ID,
      targetId: TARGET_ID,
      now: BASE_NOW + streak,
    });
    assert.equal(state.protocol_failure_streak, streak);
    assert.equal(state.provider_write_blocked, streak === 3 ? 1 : 0);
  }
  const capped = recordNotebookLmProtocolFailure({
    connectorId: CONNECTOR_ID,
    targetId: TARGET_ID,
    now: BASE_NOW + 4,
  });
  assert.equal(capped.protocol_failure_streak, 3);
  assert.equal(capped.provider_write_blocked, 1);
  assert.equal(capped.block_reason, "protocol_drift");
  assert.equal(capped.last_protocol_failure_at, BASE_NOW + 4);
  assert.equal(notebookLmRuntimeProviderWritesAllowed(), false);
  assert.equal(notebookLmExportQueueEnabled(), false);
  assert.equal(notebookLmExportProviderWriteEnabled(), false);

  const events = getDb()
    .prepare("SELECT event_type,safe_reason FROM notebooklm_operational_events ORDER BY id")
    .all();
  assert.deepEqual(events, [
    { event_type: "notebooklm.protocol_failure", safe_reason: "protocol_failure" },
    { event_type: "notebooklm.protocol_failure", safe_reason: "protocol_failure" },
    { event_type: "notebooklm.write_kill_switch_tripped", safe_reason: "protocol_drift" },
    { event_type: "notebooklm.write_kill_switch_tripped", safe_reason: "protocol_drift" },
  ]);
});

test("protocol success resets a warning streak but never silently clears a tripped block", () => {
  installHealthyTarget();
  recordNotebookLmProtocolFailure({ connectorId: CONNECTOR_ID, targetId: TARGET_ID, now: BASE_NOW + 1 });
  assert.equal(recordNotebookLmProtocolSuccess({ now: BASE_NOW + 2 }).protocol_failure_streak, 0);

  for (let streak = 0; streak < 3; streak += 1) {
    recordNotebookLmProtocolFailure({
      connectorId: CONNECTOR_ID,
      targetId: TARGET_ID,
      now: BASE_NOW + 10 + streak,
    });
  }
  const blocked = recordNotebookLmProtocolSuccess({ now: BASE_NOW + 20 });
  assert.equal(blocked.provider_write_blocked, 1);
  assert.equal(blocked.protocol_failure_streak, 3);
  assert.equal(blocked.block_reason, "protocol_drift");
});

test("clearing a tripped block requires explicit acknowledgement and a fresh private target check", () => {
  installHealthyTarget(BASE_NOW - 5 * 60_000 - 1);
  for (let streak = 0; streak < 3; streak += 1) {
    recordNotebookLmProtocolFailure({
      connectorId: CONNECTOR_ID,
      targetId: TARGET_ID,
      now: BASE_NOW - 10 + streak,
    });
  }
  expectControlCode("acknowledgement_required", () =>
    clearNotebookLmProtocolWriteBlock({
      acknowledgeConnectorUpdatedAndTargetRevalidated: false,
      now: BASE_NOW,
    }),
  );
  expectControlCode("target_not_recently_verified", () =>
    clearNotebookLmProtocolWriteBlock({
      acknowledgeConnectorUpdatedAndTargetRevalidated: true,
      now: BASE_NOW,
    }),
  );
  assert.equal(getNotebookLmRuntimeControl().provider_write_blocked, 1);

  getDb().prepare("UPDATE notebooklm_targets SET verified_at=? WHERE id=?").run(BASE_NOW, TARGET_ID);
  const cleared = clearNotebookLmProtocolWriteBlock({
    acknowledgeConnectorUpdatedAndTargetRevalidated: true,
    now: BASE_NOW + 1,
  });
  assert.equal(cleared.provider_write_blocked, 0);
  assert.equal(cleared.protocol_failure_streak, 0);
  assert.equal(cleared.block_reason, null);
  assert.equal(notebookLmExportProviderWriteEnabled(), true);
  assert.deepEqual(
    getDb()
      .prepare("SELECT event_type,safe_reason FROM notebooklm_operational_events ORDER BY id DESC LIMIT 1")
      .get(),
    {
      event_type: "notebooklm.write_kill_switch_cleared",
      safe_reason: "operator_acknowledged_revalidation",
    },
  );
});

for (const reason of NOTEBOOKLM_IDENTITY_CONFLICT_BLOCK_REASONS) {
  test(`ordinary reset cannot clear or overwrite identity conflict ${reason}`, () => {
    installHealthyTarget(BASE_NOW + 2_000);
    const blocked = tripNotebookLmProviderWriteBlock({
      connectorId: CONNECTOR_ID,
      targetId: TARGET_ID,
      reason,
      now: BASE_NOW + 1_000,
    });
    assert.equal(blocked.provider_write_blocked, 1);
    assert.equal(blocked.block_reason, reason);

    expectControlCode("identity_conflict_reconciliation_required", () =>
      clearNotebookLmProtocolWriteBlock({
        acknowledgeConnectorUpdatedAndTargetRevalidated: true,
        now: BASE_NOW + 2_001,
      }),
    );
    assert.equal(recordNotebookLmProtocolSuccess({ now: BASE_NOW + 2_002 }).provider_write_blocked, 1);
    assert.equal(
      recordNotebookLmProtocolFailure({
        connectorId: CONNECTOR_ID,
        targetId: TARGET_ID,
        now: BASE_NOW + 2_003,
      }).block_reason,
      reason,
    );
    assert.equal(
      tripNotebookLmProviderWriteBlock({
        connectorId: CONNECTOR_ID,
        targetId: TARGET_ID,
        reason: "protocol_drift",
        now: BASE_NOW + 2_004,
      }).block_reason,
      reason,
    );
    assert.equal(notebookLmRuntimeProviderWritesAllowed(getDb(), BASE_NOW + 2_005), false);
    assert.equal(notebookLmExportQueueEnabled(), false);
    assert.equal(notebookLmExportProviderWriteEnabled(), false);
    assert.deepEqual(
      getDb()
        .prepare(
          `SELECT safe_reason FROM notebooklm_operational_events
           WHERE event_type = 'notebooklm.write_kill_switch_tripped'
           ORDER BY id`,
        )
        .all(),
      [{ safe_reason: reason }, { safe_reason: reason }, { safe_reason: reason }],
    );
  });
}

test("a restore reconciliation block survives restarts and ordinary protocol reset paths", () => {
  installHealthyTarget(BASE_NOW + 1_000);
  getDb().prepare(
    `UPDATE notebooklm_runtime_control
     SET provider_write_blocked=1, protocol_failure_streak=0, block_reason=?,
         last_protocol_failure_at=NULL, updated_at=? WHERE id=1`,
  ).run(NOTEBOOKLM_RESTORE_RECONCILIATION_BLOCK_REASON, BASE_NOW);

  expectControlCode("restore_reconciliation_required", () =>
    clearNotebookLmProtocolWriteBlock({
      acknowledgeConnectorUpdatedAndTargetRevalidated: true,
      now: BASE_NOW + 1_001,
    }),
  );
  assert.equal(recordNotebookLmProtocolSuccess({ now: BASE_NOW + 1_002 }).provider_write_blocked, 1);
  assert.equal(
    recordNotebookLmProtocolFailure({
      connectorId: CONNECTOR_ID,
      targetId: TARGET_ID,
      now: BASE_NOW + 1_003,
    }).block_reason,
    NOTEBOOKLM_RESTORE_RECONCILIATION_BLOCK_REASON,
  );
  assert.equal(
    tripNotebookLmProviderWriteBlock({
      connectorId: CONNECTOR_ID,
      targetId: TARGET_ID,
      reason: "protocol_drift",
      now: BASE_NOW + 1_004,
    }).block_reason,
    NOTEBOOKLM_RESTORE_RECONCILIATION_BLOCK_REASON,
  );
  assert.equal(notebookLmRuntimeProviderWritesAllowed(getDb(), BASE_NOW + 1_005), false);
  assert.deepEqual(
    getDb()
      .prepare(
        `SELECT safe_reason FROM notebooklm_operational_events
         WHERE event_type = 'notebooklm.write_kill_switch_tripped'
         ORDER BY id DESC LIMIT 2`,
      )
      .all(),
    [
      { safe_reason: NOTEBOOKLM_RESTORE_RECONCILIATION_BLOCK_REASON },
      { safe_reason: NOTEBOOKLM_RESTORE_RECONCILIATION_BLOCK_REASON },
    ],
  );
});
