import "./notebooklm-active-work-conflict.test.setup";

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rmSync } from "node:fs";
import { test } from "node:test";
import type { NotebookLmConnectorRow } from "@/lib/notebooklm/connector-auth";
import {
  NOTEBOOKLM_RETRY_BACKOFF_MS,
  NOTEBOOKLM_SAFE_TARGET_LABEL,
} from "@/lib/notebooklm/contracts";
import { getDb } from "./client";
import {
  applyNotebookLmConnectorEvent,
  bindNotebookLmTarget,
  claimNotebookLmExportRequest,
  createNotebookLmExportRequest,
  getActiveNotebookLmTarget,
  getNotebookLmExportRequest,
  NotebookLmExportError,
  revokeActiveNotebookLmConnector,
} from "./notebooklm-export";
import { TEST_DB_DIR } from "./notebooklm-active-work-conflict.test.setup";

const BASE_NOW = 1_700_100_000_000;
const TARGET_FINGERPRINT = "a".repeat(64);
const REBOUND_TARGET_FINGERPRINT = "b".repeat(64);
const SUBJECT_FINGERPRINT = "c".repeat(64);
const REBOUND_SUBJECT_FINGERPRINT = "e".repeat(64);
const SOURCE_ALIAS = "d".repeat(64);

let itemSequence = 0;

test.after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

test.beforeEach(() => {
  itemSequence = 0;
  const db = getDb();
  db.prepare("DELETE FROM notebooklm_export_events").run();
  db.prepare("DELETE FROM notebooklm_operational_events").run();
  db.prepare("DELETE FROM notebooklm_export_requests").run();
  db.prepare("DELETE FROM notebooklm_targets").run();
  db.prepare("DELETE FROM notebooklm_connectors").run();
  db.prepare("DELETE FROM notebooklm_connector_pairing_codes").run();
  db.prepare("DELETE FROM items WHERE id LIKE 'active-work-%'").run();
  db.prepare(
    `UPDATE notebooklm_runtime_control SET provider_write_blocked=0,
     protocol_failure_streak=0, block_reason=NULL, last_protocol_failure_at=NULL,
     retention_last_success_at=?, retention_last_failure_at=NULL,
     retention_failure_streak=0, retention_last_error_code=NULL,
     retention_last_expired_count=0, retention_last_purged_count=0,
     retention_overdue_snapshot_count=0, retention_physical_purge_pending=0,
     retention_physical_purge_generation=0, unresolved_over_24h_count=0,
     updated_at=? WHERE id=1`,
  ).run(BASE_NOW, BASE_NOW);
});

function createConnector(): NotebookLmConnectorRow {
  const db = getDb();
  db.prepare(
    `INSERT INTO notebooklm_connectors
     (id,token_hash,token_hint,label,extension_origin,protocol_version,state,created_at,updated_at)
     VALUES('connector-a',?,?,?, ?,1,'registered',?,?)`,
  ).run(
    "f".repeat(64),
    "f".repeat(8),
    "Synthetic connector",
    `chrome-extension://${"a".repeat(32)}`,
    BASE_NOW,
    BASE_NOW,
  );
  return db
    .prepare("SELECT * FROM notebooklm_connectors WHERE id='connector-a'")
    .get() as NotebookLmConnectorRow;
}

function bindInitialTarget(connector: NotebookLmConnectorRow): string {
  return bindNotebookLmTarget({
    connector,
    safeLabel: NOTEBOOKLM_SAFE_TARGET_LABEL,
    localBindingFingerprint: TARGET_FINGERPRINT,
    subjectFingerprint: SUBJECT_FINGERPRINT,
    sharingPosture: "private",
    sourceCount: 1,
    sourceLimit: 50,
    reserveCount: 5,
    observedBindingVersion: 0,
    now: BASE_NOW,
  }).id;
}

function enqueue() {
  itemSequence += 1;
  const itemId = `active-work-${itemSequence}`;
  const text = `# Synthetic ${itemSequence}\n\nSynthetic body ${itemSequence}`;
  getDb().prepare(
    `INSERT INTO items(id,source_type,title,body,captured_at)
     VALUES(?,'note','Synthetic test item','Synthetic test body',?)`,
  ).run(itemId, BASE_NOW + itemSequence);
  return createNotebookLmExportRequest({
    itemId,
    idempotencyKey: `active_work_${String(itemSequence).padStart(8, "0")}`,
    mappedTitle: `Synthetic ${itemSequence}`,
    mappedText: text,
    contentHash: crypto.createHash("sha256").update(text).digest("hex"),
    payloadBytes: Buffer.byteLength(text),
    payloadWords: text.split(/\s+/u).length,
    limitedCapture: false,
    now: BASE_NOW + itemSequence,
  });
}

function claimCreate(connector: NotebookLmConnectorRow, now: number) {
  const claim = claimNotebookLmExportRequest({ connector, allowCreate: true, now });
  assert.ok(claim);
  assert.equal(claim.action, "create");
  return claim;
}

function dispatchCreate(
  connector: NotebookLmConnectorRow,
  claim: ReturnType<typeof claimCreate>,
  now: number,
): void {
  const target = getActiveNotebookLmTarget();
  assert.ok(target);
  applyNotebookLmConnectorEvent({
    connector,
    requestId: claim.requestId,
    leaseToken: claim.leaseToken,
    leaseEpoch: claim.leaseEpoch,
    event: {
      type: "preflight_ok",
      sourceCount: target.source_count ?? 0,
      sourceLimit: target.source_limit,
      sharingPosture: "private",
    },
    allowProviderWrite: true,
    now,
  });
  applyNotebookLmConnectorEvent({
    connector,
    requestId: claim.requestId,
    leaseToken: claim.leaseToken,
    leaseEpoch: claim.leaseEpoch,
    event: { type: "dispatch_started" },
    allowProviderWrite: true,
    now,
  });
}

function expectTargetHasActiveWork(operation: () => unknown): void {
  assert.throws(
    operation,
    (error: unknown) =>
      error instanceof NotebookLmExportError &&
      error.code === "target_has_active_work",
  );
}

function assertConflictBlocksTargetChanges(input: {
  connector: NotebookLmConnectorRow;
  targetId: string;
  requestId: string;
  reason: "multiple_marker_matches" | "provider_source_identity_reused";
}): void {
  expectTargetHasActiveWork(() =>
    bindNotebookLmTarget({
      connector: input.connector,
      safeLabel: NOTEBOOKLM_SAFE_TARGET_LABEL,
      localBindingFingerprint: REBOUND_TARGET_FINGERPRINT,
      subjectFingerprint: REBOUND_SUBJECT_FINGERPRINT,
      sharingPosture: "private",
      sourceCount: 2,
      sourceLimit: 50,
      reserveCount: 5,
      observedBindingVersion: 1,
      now: BASE_NOW + 200,
    }),
  );
  expectTargetHasActiveWork(() =>
    revokeActiveNotebookLmConnector({ now: BASE_NOW + 201 }),
  );

  const conflict = getNotebookLmExportRequest(input.requestId);
  assert.ok(conflict);
  assert.equal(conflict.state, "duplicate_conflict");
  assert.equal(conflict.phase, "terminal");
  assert.equal(conflict.safe_reason, input.reason);
  assert.equal(getActiveNotebookLmTarget()?.id, input.targetId);
  const connectorState = getDb()
    .prepare("SELECT state FROM notebooklm_connectors WHERE id=?")
    .get(input.connector.id) as { state: string };
  assert.equal(connectorState.state, "bound");
}

test("multiple-marker conflict blocks both target rebind and safe disconnect", () => {
  const connector = createConnector();
  const targetId = bindInitialTarget(connector);
  const queued = enqueue();
  const create = claimCreate(connector, BASE_NOW + 100);
  dispatchCreate(connector, create, BASE_NOW + 101);
  applyNotebookLmConnectorEvent({
    connector,
    requestId: queued.request.id,
    leaseToken: create.leaseToken,
    leaseEpoch: create.leaseEpoch,
    event: { type: "create_uncertain", reason: "timeout" },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });
  const reconcile = claimNotebookLmExportRequest({
    connector,
    allowCreate: false,
    now: BASE_NOW + 102 + NOTEBOOKLM_RETRY_BACKOFF_MS,
  });
  assert.ok(reconcile);
  assert.equal(reconcile.action, "reconcile");
  const conflict = applyNotebookLmConnectorEvent({
    connector,
    requestId: queued.request.id,
    leaseToken: reconcile.leaseToken,
    leaseEpoch: reconcile.leaseEpoch,
    event: { type: "reconcile_result", matches: 2 },
    allowProviderWrite: false,
    now: BASE_NOW + 103 + NOTEBOOKLM_RETRY_BACKOFF_MS,
  });
  assert.equal(conflict.state, "duplicate_conflict");

  assertConflictBlocksTargetChanges({
    connector,
    targetId,
    requestId: queued.request.id,
    reason: "multiple_marker_matches",
  });
});

test("source-identity conflict blocks both target rebind and safe disconnect", () => {
  const connector = createConnector();
  const targetId = bindInitialTarget(connector);
  const first = enqueue();
  const firstCreate = claimCreate(connector, BASE_NOW + 100);
  dispatchCreate(connector, firstCreate, BASE_NOW + 101);
  applyNotebookLmConnectorEvent({
    connector,
    requestId: first.request.id,
    leaseToken: firstCreate.leaseToken,
    leaseEpoch: firstCreate.leaseEpoch,
    event: {
      type: "create_accepted",
      sourceAlias: SOURCE_ALIAS,
      providerStatus: "ready",
    },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });

  const second = enqueue();
  const secondCreate = claimCreate(connector, BASE_NOW + 104);
  dispatchCreate(connector, secondCreate, BASE_NOW + 105);
  const conflict = applyNotebookLmConnectorEvent({
    connector,
    requestId: second.request.id,
    leaseToken: secondCreate.leaseToken,
    leaseEpoch: secondCreate.leaseEpoch,
    event: {
      type: "create_accepted",
      sourceAlias: SOURCE_ALIAS,
      providerStatus: "ready",
    },
    allowProviderWrite: true,
    now: BASE_NOW + 106,
  });
  assert.equal(conflict.state, "duplicate_conflict");

  assertConflictBlocksTargetChanges({
    connector,
    targetId,
    requestId: second.request.id,
    reason: "provider_source_identity_reused",
  });
});
