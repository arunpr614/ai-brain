import "./notebooklm-export.test.setup";

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { checkpointSensitiveDeletion, getDb } from "./client";
import { deleteItem } from "./items";
import {
  getNotebookLmRuntimeControl,
  markNotebookLmPhysicalPurgePending,
  notebookLmRuntimeProviderWritesAllowed,
} from "./notebooklm-export-control";
import { scrubNotebookLmSnapshotsFromBackup } from "@/lib/backup";
import {
  applyNotebookLmConnectorEvent,
  bindNotebookLmTarget,
  cancelNotebookLmExportRequest,
  claimNotebookLmExportRequest,
  cleanupNotebookLmRetention,
  createNotebookLmExportRequest,
  finalizeNotebookLmSensitivePurge,
  getActiveNotebookLmTarget,
  getNotebookLmConnectionSummary,
  getNotebookLmExportRequest,
  NotebookLmExportError,
  stopCheckingNotebookLmExportRequest,
} from "./notebooklm-export";
import type { NotebookLmConnectorRow } from "@/lib/notebooklm/connector-auth";
import {
  NOTEBOOKLM_EVENT_RETENTION_MS,
  NOTEBOOKLM_LEASE_MS,
  NOTEBOOKLM_MAX_SOURCE_LIMIT,
  NOTEBOOKLM_POST_DISPATCH_RETENTION_MS,
  NOTEBOOKLM_RECONCILE_ZERO_BACKOFF_MS,
  NOTEBOOKLM_RETENTION_SAFETY_MARGIN_MS,
  NOTEBOOKLM_RETRY_BACKOFF_MS,
  NOTEBOOKLM_SAFE_TARGET_LABEL,
} from "@/lib/notebooklm/contracts";
import { TEST_DB_DIR } from "./notebooklm-export.test.setup";

const BASE_NOW = 1_700_100_000_000;
const FP_A = "a".repeat(64);
const FP_B = "b".repeat(64);
const SUBJECT_A = "c".repeat(64);
const SUBJECT_B = "e".repeat(64);
const SOURCE_ALIAS = "d".repeat(64);

test.after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

test.beforeEach(() => {
  const db = getDb();
  db.prepare("DELETE FROM notebooklm_export_events").run();
  db.prepare("DELETE FROM notebooklm_operational_events").run();
  db.prepare("DELETE FROM notebooklm_export_requests").run();
  db.prepare("DELETE FROM notebooklm_targets").run();
  db.prepare("DELETE FROM notebooklm_connectors").run();
  db.prepare("DELETE FROM notebooklm_connector_pairing_codes").run();
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
});

function connector(now = BASE_NOW, id = "connector-a"): NotebookLmConnectorRow {
  const db = getDb();
  db.prepare(
    `INSERT INTO notebooklm_connectors
     (id,token_hash,token_hint,label,extension_origin,protocol_version,state,created_at,updated_at)
     VALUES(?,?,?,?,?,1,'registered',?,?)`,
  ).run(
    id,
    crypto.createHash("sha256").update(id).digest("hex"),
    crypto.createHash("sha256").update(id).digest("hex").slice(-8),
    "Synthetic connector",
    `chrome-extension://${"a".repeat(32)}`,
    now,
    now,
  );
  return db.prepare("SELECT * FROM notebooklm_connectors WHERE id=?").get(id) as NotebookLmConnectorRow;
}

function bind(
  owner: NotebookLmConnectorRow,
  overrides: Partial<Parameters<typeof bindNotebookLmTarget>[0]> = {},
) {
  return bindNotebookLmTarget({
    connector: owner,
    safeLabel: NOTEBOOKLM_SAFE_TARGET_LABEL,
    localBindingFingerprint: FP_A,
    subjectFingerprint: SUBJECT_A,
    sharingPosture: "private",
    sourceCount: 1,
    sourceLimit: 50,
    reserveCount: 5,
    observedBindingVersion: 0,
    now: BASE_NOW,
    ...overrides,
  });
}

function contentHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function databaseAndWalBytes(databasePath: string): Buffer {
  const paths = [databasePath, `${databasePath}-wal`];
  return Buffer.concat(
    paths.filter((path) => existsSync(path)).map((path) => readFileSync(path)),
  );
}

let idSequence = 0;
function enqueue(
  overrides: Partial<Parameters<typeof createNotebookLmExportRequest>[0]> = {},
) {
  idSequence += 1;
  const text = overrides.mappedText ?? `# Synthetic ${idSequence}\n\nSynthetic body ${idSequence}`;
  const itemId = overrides.itemId ?? `item-${idSequence}`;
  getDb().prepare(
    `INSERT OR IGNORE INTO items(id,source_type,title,body,captured_at)
     VALUES(?,'note','Synthetic test item','Synthetic test body',?)`,
  ).run(itemId, BASE_NOW + idSequence);
  return createNotebookLmExportRequest({
    itemId,
    idempotencyKey: `idem_key_${String(idSequence).padStart(8, "0")}`,
    mappedTitle: `Synthetic ${idSequence}`,
    mappedText: text,
    contentHash: contentHash(text),
    payloadBytes: Buffer.byteLength(text),
    payloadWords: text.split(/\s+/u).length,
    limitedCapture: false,
    now: BASE_NOW + idSequence,
    ...overrides,
  });
}

function expectCode(code: string, operation: () => unknown): NotebookLmExportError {
  let caught: unknown;
  try {
    operation();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof NotebookLmExportError, `expected NotebookLmExportError, got ${String(caught)}`);
  assert.equal(caught.code, code);
  return caught;
}

function claimCreate(owner: NotebookLmConnectorRow, now: number) {
  const claim = claimNotebookLmExportRequest({ connector: owner, allowCreate: true, now });
  assert.ok(claim);
  assert.equal(claim.action, "create");
  assert.ok(claim.source.title);
  assert.ok(claim.source.text);
  return claim;
}

function dispatch(owner: NotebookLmConnectorRow, request: ReturnType<typeof claimCreate>, now: number) {
  const preflight = getDb()
    .prepare(
      `SELECT 1 value FROM notebooklm_export_events
       WHERE request_id=? AND lease_epoch=? AND event_type='preflight_ok'`,
    )
    .get(request.requestId, request.leaseEpoch);
  if (!preflight) {
    const target = getActiveNotebookLmTarget();
    assert.ok(target);
    applyNotebookLmConnectorEvent({
      connector: owner,
      requestId: request.requestId,
      leaseToken: request.leaseToken,
      leaseEpoch: request.leaseEpoch,
      event: {
        type: "preflight_ok",
        sourceCount: target.source_count ?? 0,
        sourceLimit: target.source_limit,
        sharingPosture: "private",
      },
      allowProviderWrite: true,
      now,
    });
  }
  return applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: request.requestId,
    leaseToken: request.leaseToken,
    leaseEpoch: request.leaseEpoch,
    event: { type: "dispatch_started" },
    allowProviderWrite: true,
    now,
  });
}

test("binding is private-only, capacity-aware, versioned, and idempotent", () => {
  const owner = connector();
  expectCode("target_not_private", () => bind(owner, { sharingPosture: "shared" }));
  expectCode("target_not_private", () => bind(owner, { sharingPosture: "unknown" }));
  expectCode("target_capacity_exhausted", () =>
    bind(owner, { sourceCount: 45, sourceLimit: 50, reserveCount: 5 }),
  );
  expectCode("invalid_binding", () => bind(owner, { localBindingFingerprint: "raw-notebook-id" }));

  const first = bind(owner);
  assert.equal(first.binding_version, 1);
  assert.equal(first.sharing_policy, "private_only");
  assert.equal(first.sharing_posture, "private");

  expectCode("invalid_binding", () =>
    bind(owner, {
      observedBindingVersion: 1,
      safeLabel: "My actual private notebook",
      now: BASE_NOW + 1,
    }),
  );
  const refreshed = bind(owner, {
    observedBindingVersion: 1,
    sourceCount: 2,
    now: BASE_NOW + 1,
  });
  assert.equal(refreshed.id, first.id);
  assert.equal(refreshed.binding_version, 1);
  assert.equal(refreshed.source_count, 2);
  assert.equal(refreshed.safe_label, NOTEBOOKLM_SAFE_TARGET_LABEL);

  const rebound = bind(owner, {
    observedBindingVersion: 1,
    localBindingFingerprint: FP_B,
    now: BASE_NOW + 2,
  });
  assert.notEqual(rebound.id, first.id);
  assert.equal(rebound.binding_version, 2);
  assert.equal(
    (getDb().prepare("SELECT active FROM notebooklm_targets WHERE id=?").get(first.id) as { active: number }).active,
    0,
  );

  expectCode("invalid_binding", () =>
    bind(owner, {
      observedBindingVersion: 1,
      localBindingFingerprint: "e".repeat(64),
      now: BASE_NOW + 3,
    }),
  );
});

test("binding accepts the final safe slot at 44 sources and rejects 45", () => {
  const owner = connector();
  const atBoundary = bind(owner, { sourceCount: 44, sourceLimit: 50, reserveCount: 5 });
  assert.equal(atBoundary.source_count, 44);
  assert.equal(getNotebookLmConnectionSummary(BASE_NOW).safeSlots, 1);
  expectCode("target_capacity_exhausted", () =>
    bind(owner, {
      sourceCount: 45,
      observedBindingVersion: atBoundary.binding_version,
      now: BASE_NOW + 1,
    }),
  );
  assert.equal(getActiveNotebookLmTarget()?.source_count, 44);
});

test("binding supports a configurable safe ceiling through 259 and versions policy changes", () => {
  const owner = connector();
  expectCode("invalid_binding", () => bind(owner, { sourceLimit: 49 }));
  expectCode("invalid_binding", () => bind(owner, { sourceLimit: 265 }));

  const first = bind(owner);
  const raised = bind(owner, {
    observedBindingVersion: first.binding_version,
    sourceLimit: NOTEBOOKLM_MAX_SOURCE_LIMIT,
    now: BASE_NOW + 1,
  });
  assert.equal(raised.binding_version, 2);
  assert.equal(raised.source_limit, 264);
  assert.equal(raised.reserve_count, 5);
  assert.equal(getNotebookLmConnectionSummary(BASE_NOW + 1).safeSourceLimit, 259);
  assert.equal(getNotebookLmConnectionSummary(BASE_NOW + 1).safeSlots, 258);

  const replay = bind(owner, {
    observedBindingVersion: 1,
    sourceLimit: NOTEBOOKLM_MAX_SOURCE_LIMIT,
    sourceCount: 2,
    now: BASE_NOW + 2,
  });
  assert.equal(replay.id, raised.id);
  assert.equal(replay.binding_version, 2);
  assert.equal(replay.source_count, 2);
});

test("exact bind replays recover lost responses without weakening the binding-version CAS", () => {
  const owner = connector();

  const initial = bind(owner, { observedBindingVersion: 0 });
  const initialReplay = bind(owner, {
    observedBindingVersion: 0,
    sourceCount: 2,
    now: BASE_NOW + 1,
  });
  assert.equal(initialReplay.id, initial.id);
  assert.equal(initialReplay.binding_version, 1);
  assert.equal(initialReplay.source_count, 2);

  const rebound = bind(owner, {
    observedBindingVersion: 1,
    localBindingFingerprint: FP_B,
    subjectFingerprint: SUBJECT_B,
    now: BASE_NOW + 2,
  });
  assert.equal(rebound.binding_version, 2);
  assert.notEqual(rebound.id, initial.id);

  const reboundReplay = bind(owner, {
    observedBindingVersion: 1,
    localBindingFingerprint: FP_B,
    subjectFingerprint: SUBJECT_B,
    sourceCount: 3,
    now: BASE_NOW + 3,
  });
  assert.equal(reboundReplay.id, rebound.id);
  assert.equal(reboundReplay.binding_version, 2);
  assert.equal(reboundReplay.source_count, 3);

  expectCode("invalid_binding", () =>
    bind(owner, {
      observedBindingVersion: 1,
      localBindingFingerprint: "f".repeat(64),
      subjectFingerprint: SUBJECT_B,
      now: BASE_NOW + 4,
    }),
  );
  assert.equal(
    (getDb().prepare("SELECT COUNT(*) count FROM notebooklm_targets").get() as { count: number }).count,
    2,
  );
  assert.equal(getActiveNotebookLmTarget()?.id, rebound.id);
});

test("active work prevents changing the bound destination", () => {
  const owner = connector();
  bind(owner);
  enqueue();
  expectCode("target_has_active_work", () =>
    bind(owner, {
      observedBindingVersion: 1,
      localBindingFingerprint: FP_B,
      now: BASE_NOW + 10,
    }),
  );
});

test("idempotency and content dedupe return one durable request and one opaque marker", () => {
  const owner = connector();
  bind(owner);
  const text = "# Stable\n\nStable synthetic body";
  const hash = contentHash(text);
  const first = enqueue({
    itemId: "stable-item",
    idempotencyKey: "stable_idem_key_0001",
    mappedTitle: "Private item title",
    mappedText: text,
    contentHash: hash,
  });
  assert.equal(first.deduplicated, false);
  assert.match(first.request.opaque_marker, /^AI-MEM-[A-Za-z0-9_-]{22}$/);
  assert.equal(first.request.opaque_marker.includes("stable-item"), false);
  assert.equal(first.request.opaque_marker.includes(hash.slice(0, 8)), false);
  assert.equal(first.request.payload_title?.endsWith(` \u00b7 ${first.request.opaque_marker}`), true);
  assert.equal(first.request.payload_text, text);

  const replay = enqueue({
    itemId: "stable-item",
    idempotencyKey: "stable_idem_key_0001",
    mappedTitle: "Private item title",
    mappedText: text,
    contentHash: hash,
  });
  assert.equal(replay.deduplicated, true);
  assert.equal(replay.request.id, first.request.id);

  const contentDedupe = enqueue({
    itemId: "stable-item",
    idempotencyKey: "stable_idem_key_0002",
    mappedTitle: "Private item title",
    mappedText: text,
    contentHash: hash,
  });
  assert.equal(contentDedupe.deduplicated, true);
  assert.equal(contentDedupe.request.id, first.request.id);
  assert.equal(
    (getDb().prepare("SELECT count(*) n FROM notebooklm_export_requests").get() as { n: number }).n,
    1,
  );
  assert.equal(
    (getDb().prepare("SELECT count(*) n FROM notebooklm_export_events WHERE event_type='request_queued'").get() as { n: number }).n,
    1,
  );

  expectCode("idempotency_conflict", () =>
    enqueue({
      itemId: "different-item",
      idempotencyKey: "stable_idem_key_0001",
      mappedText: "Different text",
      contentHash: contentHash("Different text"),
    }),
  );
});

test("a changed item version requires explicit confirmation after a successful export", () => {
  const owner = connector();
  bind(owner);
  const first = enqueue({ itemId: "versioned-item" });
  const claimed = claimCreate(owner, BASE_NOW + 100);
  dispatch(owner, claimed, BASE_NOW + 101);
  const succeeded = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: first.request.id,
    leaseToken: claimed.leaseToken,
    leaseEpoch: claimed.leaseEpoch,
    event: { type: "create_accepted", sourceAlias: SOURCE_ALIAS, providerStatus: "ready" },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });
  assert.equal(succeeded.state, "succeeded");

  const changedText = "# Changed\n\nA changed synthetic version";
  expectCode("updated_confirmation_required", () =>
    enqueue({
      itemId: "versioned-item",
      idempotencyKey: "changed_idem_key_01",
      mappedText: changedText,
      contentHash: contentHash(changedText),
      now: BASE_NOW + 103,
    }),
  );
  const confirmed = enqueue({
    itemId: "versioned-item",
    idempotencyKey: "changed_idem_key_02",
    mappedText: changedText,
    contentHash: contentHash(changedText),
    confirmUpdatedVersion: true,
    now: BASE_NOW + 104,
  });
  assert.equal(confirmed.deduplicated, false);
  assert.notEqual(confirmed.request.id, first.request.id);
});

test("a different content version cannot overtake unresolved work for the same item", () => {
  const owner = connector();
  bind(owner);
  enqueue({ itemId: "same-item-in-flight" });
  const changedText = "A changed version while the first is unresolved";
  expectCode("item_has_active_export", () =>
    enqueue({
      itemId: "same-item-in-flight",
      idempotencyKey: "same_item_changed_01",
      mappedText: changedText,
      contentHash: contentHash(changedText),
      confirmUpdatedVersion: true,
      now: BASE_NOW + 100,
    }),
  );
  assert.equal(
    (getDb().prepare("SELECT count(*) n FROM notebooklm_export_requests WHERE item_id=?").get("same-item-in-flight") as { n: number }).n,
    1,
  );
});

test("capacity reserves include already queued creates and cancellation releases only the queue slot", () => {
  const owner = connector();
  bind(owner, { sourceCount: 44, sourceLimit: 50, reserveCount: 5 });
  assert.equal(getNotebookLmConnectionSummary(BASE_NOW).safeSlots, 1);
  const first = enqueue({ itemId: "capacity-one" });
  assert.equal(getNotebookLmConnectionSummary(BASE_NOW).safeSlots, 0);
  expectCode("target_capacity_exhausted", () => enqueue({ itemId: "capacity-two" }));

  const cancelled = cancelNotebookLmExportRequest({
    requestId: first.request.id,
    itemId: "capacity-one",
    now: BASE_NOW + 50,
  });
  assert.equal(cancelled.state, "cancelled");
  assert.equal(cancelled.phase, "terminal");
  assert.equal(cancelled.payload_title, null);
  assert.equal(cancelled.payload_text, null);
  assert.equal(getNotebookLmConnectionSummary(BASE_NOW + 50).safeSlots, 1);
  assert.equal(enqueue({ itemId: "capacity-two" }).deduplicated, false);
});

test("capacity_blocked accepts only observed exhaustion and rejects contradictory headroom", () => {
  const owner = connector();
  bind(owner, { sourceCount: 44, sourceLimit: 50, reserveCount: 5 });
  const queued = enqueue({ itemId: "capacity-observation-item" });
  const claimed = claimCreate(owner, BASE_NOW + 100);
  expectCode("invalid_transition", () =>
    applyNotebookLmConnectorEvent({
      connector: owner,
      requestId: queued.request.id,
      leaseToken: claimed.leaseToken,
      leaseEpoch: claimed.leaseEpoch,
      event: { type: "capacity_blocked", sourceCount: 44, sourceLimit: 50 },
      allowProviderWrite: true,
      now: BASE_NOW + 101,
    }),
  );
  assert.equal(getNotebookLmExportRequest(queued.request.id)?.state, "leased");
  assert.equal(getActiveNotebookLmTarget()?.source_count, 44);

  const blocked = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: claimed.leaseToken,
    leaseEpoch: claimed.leaseEpoch,
    event: { type: "capacity_blocked", sourceCount: 45, sourceLimit: 50 },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });
  assert.equal(blocked.state, "capacity_blocked");
  assert.equal(blocked.safe_reason, "capacity_exhausted");
  assert.equal(getActiveNotebookLmTarget()?.source_count, 45);
});

test("claim and dispatch enforce the write kill switch, one active lease, and stale-token rejection", () => {
  const owner = connector();
  bind(owner);
  const queued = enqueue();
  assert.equal(claimNotebookLmExportRequest({ connector: owner, allowCreate: false, now: BASE_NOW + 100 }), null);

  const claimed = claimCreate(owner, BASE_NOW + 101);
  assert.equal(claimed.leaseEpoch, 1);
  assert.equal(
    claimNotebookLmExportRequest({ connector: owner, allowCreate: true, now: BASE_NOW + 102 }),
    null,
  );
  expectCode("stale_lease", () =>
    applyNotebookLmConnectorEvent({
      connector: owner,
      requestId: queued.request.id,
      leaseToken: "f".repeat(64),
      leaseEpoch: claimed.leaseEpoch,
      event: { type: "dispatch_started" },
      allowProviderWrite: true,
      now: BASE_NOW + 103,
    }),
  );
  expectCode("stale_lease", () =>
    applyNotebookLmConnectorEvent({
      connector: owner,
      requestId: queued.request.id,
      leaseToken: claimed.leaseToken,
      leaseEpoch: claimed.leaseEpoch + 1,
      event: { type: "dispatch_started" },
      allowProviderWrite: true,
      now: BASE_NOW + 103,
    }),
  );
  expectCode("invalid_transition", () =>
    applyNotebookLmConnectorEvent({
      connector: owner,
      requestId: queued.request.id,
      leaseToken: claimed.leaseToken,
      leaseEpoch: claimed.leaseEpoch,
      event: { type: "dispatch_started" },
      allowProviderWrite: true,
      now: BASE_NOW + 103,
    }),
  );

  const preflight = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: claimed.leaseToken,
    leaseEpoch: claimed.leaseEpoch,
    event: { type: "preflight_ok", sourceCount: 1, sourceLimit: 50, sharingPosture: "private" },
    allowProviderWrite: false,
    now: BASE_NOW + 104,
  });
  assert.equal(preflight.state, "leased");
  assert.ok(preflight.lease_token_hash);

  expectCode("runtime_write_blocked", () =>
    applyNotebookLmConnectorEvent({
      connector: owner,
      requestId: queued.request.id,
      leaseToken: claimed.leaseToken,
      leaseEpoch: claimed.leaseEpoch,
      event: { type: "dispatch_started" },
      allowProviderWrite: false,
      now: BASE_NOW + 105,
    }),
  );
  assert.equal(getNotebookLmExportRequest(queued.request.id)?.attempt_count, 0);
  assert.equal(getNotebookLmExportRequest(queued.request.id)?.create_dispatched_at, null);

  const sending = dispatch(owner, claimed, BASE_NOW + 106);
  assert.equal(sending.state, "sending");
  assert.equal(sending.phase, "create");
  assert.equal(sending.attempt_count, 1);
  assert.equal(sending.create_dispatched_at, BASE_NOW + 106);
  assert.equal(
    sending.snapshot_purge_at,
    BASE_NOW + 106 + NOTEBOOKLM_POST_DISPATCH_RETENTION_MS -
      NOTEBOOKLM_RETENTION_SAFETY_MARGIN_MS,
  );
  expectCode("invalid_transition", () => dispatch(owner, claimed, BASE_NOW + 107));
});

test("an accepted create is counted once, polled without payload, and completed", () => {
  const owner = connector();
  bind(owner, { sourceCount: 10 });
  const queued = enqueue();
  const claimed = claimCreate(owner, BASE_NOW + 100);
  dispatch(owner, claimed, BASE_NOW + 101);
  const processing = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: claimed.leaseToken,
    leaseEpoch: claimed.leaseEpoch,
    event: { type: "create_accepted", sourceAlias: SOURCE_ALIAS, providerStatus: "processing" },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });
  assert.equal(processing.state, "processing");
  assert.equal(processing.phase, "poll");
  assert.equal(getActiveNotebookLmTarget()?.source_count, 11);

  const pollAt = BASE_NOW + 102 + NOTEBOOKLM_RETRY_BACKOFF_MS;
  const poll = claimNotebookLmExportRequest({ connector: owner, allowCreate: false, now: pollAt });
  assert.ok(poll);
  assert.equal(poll.action, "poll");
  assert.equal(poll.source.title, null);
  assert.equal(poll.source.text, null);
  assert.equal(poll.source.sourceAlias, SOURCE_ALIAS);
  const ready = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: poll.leaseToken,
    leaseEpoch: poll.leaseEpoch,
    event: { type: "source_status", providerStatus: "ready" },
    allowProviderWrite: false,
    now: pollAt + 1,
  });
  assert.equal(ready.state, "succeeded");
  assert.equal(ready.phase, "terminal");
  assert.equal(ready.completed_at, pollAt + 1);
  assert.equal(getActiveNotebookLmTarget()?.source_count, 11);
});

test("a provider source alias cannot be attached to two requests for the same target", () => {
  const owner = connector();
  bind(owner, { sourceCount: 5 });
  const first = enqueue({ itemId: "source-alias-first" });
  const firstClaim = claimCreate(owner, BASE_NOW + 100);
  dispatch(owner, firstClaim, BASE_NOW + 101);
  const firstReady = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: first.request.id,
    leaseToken: firstClaim.leaseToken,
    leaseEpoch: firstClaim.leaseEpoch,
    event: { type: "create_accepted", sourceAlias: SOURCE_ALIAS, providerStatus: "ready" },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });
  assert.equal(firstReady.state, "succeeded");
  assert.equal(getActiveNotebookLmTarget()?.source_count, 6);

  const second = enqueue({ itemId: "source-alias-second", now: BASE_NOW + 103 });
  const secondClaim = claimCreate(owner, BASE_NOW + 104);
  dispatch(owner, secondClaim, BASE_NOW + 105);
  const conflict = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: second.request.id,
    leaseToken: secondClaim.leaseToken,
    leaseEpoch: secondClaim.leaseEpoch,
    event: { type: "create_accepted", sourceAlias: SOURCE_ALIAS, providerStatus: "ready" },
    allowProviderWrite: true,
    now: BASE_NOW + 106,
  });
  assert.equal(conflict.state, "duplicate_conflict");
  assert.equal(conflict.phase, "terminal");
  assert.equal(conflict.safe_reason, "provider_source_identity_reused");
  assert.equal(conflict.source_alias, null);
  assert.equal(conflict.attempt_count, 1);
  assert.equal(getActiveNotebookLmTarget()?.source_count, 6);
  const runtime = getDb().prepare("SELECT * FROM notebooklm_runtime_control WHERE id=1").get() as {
    protocol_failure_streak: number;
    provider_write_blocked: number;
  };
  assert.equal(runtime.protocol_failure_streak, 3);
  assert.equal(runtime.provider_write_blocked, 1);
});

test("an ambiguous create always reconciles and zero matches never authorizes another create", () => {
  const owner = connector();
  bind(owner);
  const queued = enqueue();
  const claimed = claimCreate(owner, BASE_NOW + 100);
  dispatch(owner, claimed, BASE_NOW + 101);
  const uncertain = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: claimed.leaseToken,
    leaseEpoch: claimed.leaseEpoch,
    event: { type: "create_uncertain", reason: "timeout" },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });
  assert.equal(uncertain.state, "reconciling");
  assert.equal(uncertain.phase, "reconcile");
  assert.equal(uncertain.attempt_count, 1);

  const reconcileAt = BASE_NOW + 102 + NOTEBOOKLM_RETRY_BACKOFF_MS;
  const reconcile = claimNotebookLmExportRequest({ connector: owner, allowCreate: true, now: reconcileAt });
  assert.ok(reconcile);
  assert.equal(reconcile.action, "reconcile");
  assert.equal(reconcile.source.title, null);
  assert.equal(reconcile.source.text, null);
  const zero = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: reconcile.leaseToken,
    leaseEpoch: reconcile.leaseEpoch,
    event: { type: "reconcile_result", matches: 0 },
    allowProviderWrite: true,
    now: reconcileAt + 1,
  });
  assert.equal(zero.state, "reconciliation_required");
  assert.equal(zero.phase, "reconcile");
  assert.equal(zero.attempt_count, 1);

  const reconcileAgainAt = reconcileAt + 1 + NOTEBOOKLM_RECONCILE_ZERO_BACKOFF_MS;
  const reconcileAgain = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: true,
    now: reconcileAgainAt,
  });
  assert.ok(reconcileAgain);
  assert.equal(reconcileAgain.action, "reconcile");
  const conflict = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: reconcileAgain.leaseToken,
    leaseEpoch: reconcileAgain.leaseEpoch,
    event: { type: "reconcile_result", matches: 2 },
    allowProviderWrite: true,
    now: reconcileAgainAt + 1,
  });
  assert.equal(conflict.state, "duplicate_conflict");
  assert.equal(conflict.phase, "terminal");
  assert.equal(conflict.attempt_count, 1);
  assert.equal(getActiveNotebookLmTarget()?.source_count, 1);
});

test("three consecutive normalized provider failures block writes without stranding reconciliation", () => {
  const owner = connector();
  bind(owner);
  const uncertainRequest = enqueue({ itemId: "normalized-failure-uncertain" });
  const waitingRequest = enqueue({ itemId: "normalized-failure-waiting" });

  const create = claimCreate(owner, BASE_NOW + 100);
  assert.equal(create.requestId, uncertainRequest.request.id);
  dispatch(owner, create, BASE_NOW + 101);
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: uncertainRequest.request.id,
    leaseToken: create.leaseToken,
    leaseEpoch: create.leaseEpoch,
    event: { type: "create_uncertain", reason: "timeout" },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });
  assert.equal(getNotebookLmRuntimeControl().protocol_failure_streak, 1);

  const firstRetryAt = BASE_NOW + 102 + NOTEBOOKLM_RETRY_BACKOFF_MS;
  const firstReconcile = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: true,
    now: firstRetryAt,
  });
  assert.ok(firstReconcile);
  assert.equal(firstReconcile.action, "reconcile");
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: uncertainRequest.request.id,
    leaseToken: firstReconcile.leaseToken,
    leaseEpoch: firstReconcile.leaseEpoch,
    event: { type: "retryable_failure", reason: "network" },
    allowProviderWrite: true,
    now: firstRetryAt + 1,
  });
  assert.equal(getNotebookLmRuntimeControl().protocol_failure_streak, 2);

  const secondRetryAt = firstRetryAt + 1 + NOTEBOOKLM_RETRY_BACKOFF_MS;
  const secondReconcile = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: true,
    now: secondRetryAt,
  });
  assert.ok(secondReconcile);
  assert.equal(secondReconcile.action, "reconcile");
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: uncertainRequest.request.id,
    leaseToken: secondReconcile.leaseToken,
    leaseEpoch: secondReconcile.leaseEpoch,
    event: { type: "retryable_failure", reason: "server" },
    allowProviderWrite: true,
    now: secondRetryAt + 1,
  });

  const stopped = getNotebookLmRuntimeControl();
  assert.equal(stopped.protocol_failure_streak, 3);
  assert.equal(stopped.provider_write_blocked, 1);
  assert.equal(stopped.block_reason, "protocol_drift");
  assert.equal(stopped.last_protocol_failure_at, secondRetryAt + 1);

  const readOnlyRetry = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: true,
    now: secondRetryAt + 1 + NOTEBOOKLM_RETRY_BACKOFF_MS,
  });
  assert.ok(readOnlyRetry);
  assert.equal(readOnlyRetry.requestId, uncertainRequest.request.id);
  assert.equal(readOnlyRetry.action, "reconcile");
  assert.equal(readOnlyRetry.source.title, null);
  assert.equal(readOnlyRetry.source.text, null);
  assert.equal(getNotebookLmExportRequest(waitingRequest.request.id)?.state, "queued");
  expectCode("runtime_write_blocked", () =>
    enqueue({
      itemId: "normalized-failure-new",
      now: secondRetryAt + 2 + NOTEBOOKLM_RETRY_BACKOFF_MS,
    }),
  );

  const operationalEvents = getDb()
    .prepare(
      `SELECT event_type,safe_reason FROM notebooklm_operational_events
       WHERE event_type IN ('notebooklm.protocol_failure', 'notebooklm.write_kill_switch_tripped')
       ORDER BY id`,
    )
    .all();
  assert.deepEqual(operationalEvents, [
    { event_type: "notebooklm.protocol_failure", safe_reason: "protocol_failure" },
    { event_type: "notebooklm.protocol_failure", safe_reason: "protocol_failure" },
    { event_type: "notebooklm.write_kill_switch_tripped", safe_reason: "protocol_drift" },
  ]);
});

test("a successful provider preflight resets the normalized failure streak", () => {
  const owner = connector();
  bind(owner);
  const queued = enqueue({ itemId: "normalized-failure-reset" });
  const firstClaim = claimCreate(owner, BASE_NOW + 100);
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: firstClaim.leaseToken,
    leaseEpoch: firstClaim.leaseEpoch,
    event: { type: "retryable_failure", reason: "network" },
    allowProviderWrite: true,
    now: BASE_NOW + 101,
  });
  assert.equal(getNotebookLmRuntimeControl().protocol_failure_streak, 1);

  const retry = claimCreate(owner, BASE_NOW + 101 + NOTEBOOKLM_RETRY_BACKOFF_MS);
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: retry.leaseToken,
    leaseEpoch: retry.leaseEpoch,
    event: {
      type: "preflight_ok",
      sourceCount: 1,
      sourceLimit: 50,
      sharingPosture: "private",
    },
    allowProviderWrite: true,
    now: BASE_NOW + 102 + NOTEBOOKLM_RETRY_BACKOFF_MS,
  });
  const recovered = getNotebookLmRuntimeControl();
  assert.equal(recovered.protocol_failure_streak, 0);
  assert.equal(recovered.provider_write_blocked, 0);
  assert.equal(recovered.block_reason, null);
});

test("create-response protocol drift immediately blocks writes without stranding read-only reconciliation", () => {
  const owner = connector();
  bind(owner);
  const uncertainRequest = enqueue({ itemId: "create-protocol-drift" });
  const waitingRequest = enqueue({ itemId: "create-protocol-drift-waiting" });

  const create = claimCreate(owner, BASE_NOW + 100);
  assert.equal(create.requestId, uncertainRequest.request.id);
  dispatch(owner, create, BASE_NOW + 101);
  const uncertain = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: uncertainRequest.request.id,
    leaseToken: create.leaseToken,
    leaseEpoch: create.leaseEpoch,
    event: { type: "create_uncertain", reason: "protocol" },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });
  assert.equal(uncertain.state, "reconciling");
  assert.equal(uncertain.phase, "reconcile");

  const stopped = getNotebookLmRuntimeControl();
  assert.equal(stopped.provider_write_blocked, 1);
  assert.equal(stopped.protocol_failure_streak, 3);
  assert.equal(stopped.block_reason, "protocol_drift");
  assert.equal(stopped.last_protocol_failure_at, BASE_NOW + 102);
  assert.equal(notebookLmRuntimeProviderWritesAllowed(getDb(), BASE_NOW + 102), false);

  const reconcileAt = BASE_NOW + 102 + NOTEBOOKLM_RETRY_BACKOFF_MS;
  const reconcile = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: true,
    now: reconcileAt,
  });
  assert.ok(reconcile);
  assert.equal(reconcile.requestId, uncertainRequest.request.id);
  assert.equal(reconcile.action, "reconcile");
  assert.equal(reconcile.source.title, null);
  assert.equal(reconcile.source.text, null);

  const zero = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: uncertainRequest.request.id,
    leaseToken: reconcile.leaseToken,
    leaseEpoch: reconcile.leaseEpoch,
    event: { type: "reconcile_result", matches: 0 },
    allowProviderWrite: false,
    now: reconcileAt + 1,
  });
  assert.equal(zero.state, "reconciliation_required");
  assert.equal(zero.attempt_count, 1);

  const stillStopped = getNotebookLmRuntimeControl();
  assert.equal(stillStopped.provider_write_blocked, 1);
  assert.equal(stillStopped.protocol_failure_streak, 3);
  assert.equal(stillStopped.block_reason, "protocol_drift");
  assert.equal(
    claimNotebookLmExportRequest({
      connector: owner,
      allowCreate: true,
      now: reconcileAt + 2,
    }),
    null,
  );
  assert.equal(getNotebookLmExportRequest(waitingRequest.request.id)?.state, "queued");
  expectCode("runtime_write_blocked", () =>
    enqueue({ itemId: "create-protocol-drift-new", now: reconcileAt + 3 }),
  );

  const events = getDb()
    .prepare(
      `SELECT event_type,safe_reason FROM notebooklm_operational_events
       WHERE event_type='notebooklm.write_kill_switch_tripped'`,
    )
    .all();
  assert.deepEqual(events, [
    { event_type: "notebooklm.write_kill_switch_tripped", safe_reason: "protocol_drift" },
  ]);
});

test("source-list protocol drift immediately blocks writes before create", () => {
  const owner = connector();
  bind(owner);
  const queued = enqueue({ itemId: "source-list-protocol-drift" });
  const create = claimCreate(owner, BASE_NOW + 100);

  const updateRequired = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: create.leaseToken,
    leaseEpoch: create.leaseEpoch,
    event: { type: "connector_update_required", reason: "protocol_drift" },
    allowProviderWrite: true,
    now: BASE_NOW + 101,
  });
  assert.equal(updateRequired.state, "connector_update_required");
  assert.equal(updateRequired.phase, "pre_create");
  assert.equal(updateRequired.attempt_count, 0);

  const stopped = getNotebookLmRuntimeControl();
  assert.equal(stopped.provider_write_blocked, 1);
  assert.equal(stopped.protocol_failure_streak, 3);
  assert.equal(stopped.block_reason, "protocol_drift");
  assert.equal(
    claimNotebookLmExportRequest({
      connector: owner,
      allowCreate: true,
      now: BASE_NOW + 101 + NOTEBOOKLM_RECONCILE_ZERO_BACKOFF_MS,
    }),
    null,
  );
  assert.equal(getNotebookLmExportRequest(queued.request.id)?.state, "connector_update_required");
});

test("reconcile protocol drift latches writes while leaving read-only recovery claimable", () => {
  const owner = connector();
  bind(owner);
  const queued = enqueue({ itemId: "reconcile-protocol-drift" });
  const create = claimCreate(owner, BASE_NOW + 100);
  dispatch(owner, create, BASE_NOW + 101);
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: create.leaseToken,
    leaseEpoch: create.leaseEpoch,
    event: { type: "create_uncertain", reason: "timeout" },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });

  const firstReconcileAt = BASE_NOW + 102 + NOTEBOOKLM_RETRY_BACKOFF_MS;
  const firstReconcile = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: true,
    now: firstReconcileAt,
  });
  assert.ok(firstReconcile);
  assert.equal(firstReconcile.action, "reconcile");
  const updateRequired = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: firstReconcile.leaseToken,
    leaseEpoch: firstReconcile.leaseEpoch,
    event: { type: "connector_update_required", reason: "protocol_drift" },
    allowProviderWrite: false,
    now: firstReconcileAt + 1,
  });
  assert.equal(updateRequired.state, "connector_update_required");
  assert.equal(updateRequired.phase, "reconcile");
  assert.equal(getNotebookLmRuntimeControl().provider_write_blocked, 1);

  const retry = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: false,
    now: firstReconcileAt + 1 + NOTEBOOKLM_RECONCILE_ZERO_BACKOFF_MS,
  });
  assert.ok(retry);
  assert.equal(retry.requestId, queued.request.id);
  assert.equal(retry.action, "reconcile");
  assert.equal(retry.source.title, null);
  assert.equal(retry.source.text, null);
});

test("a zero-match reconcile backoff does not starve a different due create", () => {
  const owner = connector();
  bind(owner);
  const ambiguous = enqueue({ itemId: "zero-backoff-ambiguous", now: BASE_NOW + 10 });
  const create = claimCreate(owner, BASE_NOW + 100);
  dispatch(owner, create, BASE_NOW + 101);
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: ambiguous.request.id,
    leaseToken: create.leaseToken,
    leaseEpoch: create.leaseEpoch,
    event: { type: "create_uncertain", reason: "timeout" },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });
  const reconcileAt = BASE_NOW + 102 + NOTEBOOKLM_RETRY_BACKOFF_MS;
  const reconcile = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: true,
    now: reconcileAt,
  });
  assert.ok(reconcile);
  assert.equal(reconcile.action, "reconcile");
  const zero = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: ambiguous.request.id,
    leaseToken: reconcile.leaseToken,
    leaseEpoch: reconcile.leaseEpoch,
    event: { type: "reconcile_result", matches: 0 },
    allowProviderWrite: true,
    now: reconcileAt + 1,
  });
  assert.equal(zero.next_attempt_at, reconcileAt + 1 + NOTEBOOKLM_RECONCILE_ZERO_BACKOFF_MS);

  const other = enqueue({ itemId: "zero-backoff-other", now: reconcileAt + 2 });
  const next = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: true,
    now: reconcileAt + 3,
  });
  assert.ok(next);
  assert.equal(next.requestId, other.request.id);
  assert.equal(next.action, "create");
  assert.equal(getNotebookLmExportRequest(ambiguous.request.id)?.state, "reconciliation_required");
});

test("a possible write keeps one capacity reservation through zero-match and stop-checking", () => {
  const owner = connector();
  bind(owner, { sourceCount: 43, sourceLimit: 50, reserveCount: 5 });
  const ambiguous = enqueue({ itemId: "capacity-ambiguous", now: BASE_NOW + 10 });
  const create = claimCreate(owner, BASE_NOW + 100);
  dispatch(owner, create, BASE_NOW + 101);
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: ambiguous.request.id,
    leaseToken: create.leaseToken,
    leaseEpoch: create.leaseEpoch,
    event: { type: "create_uncertain", reason: "timeout" },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });

  const queued = enqueue({ itemId: "capacity-definite-queue", now: BASE_NOW + 103 });
  assert.equal(getNotebookLmConnectionSummary(BASE_NOW + 103).safeSlots, 0);
  expectCode("target_capacity_exhausted", () =>
    enqueue({ itemId: "capacity-overbooked-before-reconcile", now: BASE_NOW + 104 }),
  );

  const reconcileAt = BASE_NOW + 102 + NOTEBOOKLM_RETRY_BACKOFF_MS;
  const reconcile = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: true,
    now: reconcileAt,
  });
  assert.ok(reconcile);
  assert.equal(reconcile.action, "reconcile");
  const zero = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: ambiguous.request.id,
    leaseToken: reconcile.leaseToken,
    leaseEpoch: reconcile.leaseEpoch,
    event: { type: "reconcile_result", matches: 0 },
    allowProviderWrite: true,
    now: reconcileAt + 1,
  });
  assert.equal(zero.state, "reconciliation_required");
  assert.equal(zero.next_attempt_at, reconcileAt + 1 + NOTEBOOKLM_RECONCILE_ZERO_BACKOFF_MS);
  expectCode("target_capacity_exhausted", () =>
    enqueue({ itemId: "capacity-overbooked-after-zero", now: reconcileAt + 2 }),
  );

  const stopped = stopCheckingNotebookLmExportRequest({
    requestId: ambiguous.request.id,
    itemId: "capacity-ambiguous",
    acknowledgeSourceMayExist: true,
    now: reconcileAt + 3,
  });
  assert.equal(stopped.phase, "terminal");
  assert.equal(getNotebookLmConnectionSummary(reconcileAt + 3).safeSlots, 0);
  expectCode("target_capacity_exhausted", () =>
    enqueue({ itemId: "capacity-overbooked-after-stop", now: reconcileAt + 4 }),
  );

  cancelNotebookLmExportRequest({
    requestId: queued.request.id,
    itemId: "capacity-definite-queue",
    now: reconcileAt + 5,
  });
  assert.equal(getNotebookLmConnectionSummary(reconcileAt + 5).safeSlots, 1);
  assert.equal(
    enqueue({ itemId: "capacity-final-slot", now: reconcileAt + 6 }).deduplicated,
    false,
  );
});

test("one reconciliation match recovers success and source occupancy without recreating", () => {
  const owner = connector();
  bind(owner, { sourceCount: 5 });
  const queued = enqueue();
  const claimed = claimCreate(owner, BASE_NOW + 100);
  dispatch(owner, claimed, BASE_NOW + 101);
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: claimed.leaseToken,
    leaseEpoch: claimed.leaseEpoch,
    event: { type: "create_uncertain", reason: "network" },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });
  const reconcileAt = BASE_NOW + 102 + NOTEBOOKLM_RETRY_BACKOFF_MS;
  const reconcile = claimNotebookLmExportRequest({ connector: owner, allowCreate: false, now: reconcileAt });
  assert.ok(reconcile);
  assert.equal(reconcile.action, "reconcile");
  const ready = applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: reconcile.leaseToken,
    leaseEpoch: reconcile.leaseEpoch,
    event: { type: "reconcile_result", matches: 1, sourceAlias: SOURCE_ALIAS, providerStatus: "ready" },
    allowProviderWrite: false,
    now: reconcileAt + 1,
  });
  assert.equal(ready.state, "succeeded");
  assert.equal(ready.attempt_count, 1);
  assert.equal(ready.source_alias, SOURCE_ALIAS);
  assert.equal(getActiveNotebookLmTarget()?.source_count, 6);
});

test("expired leases retry only before dispatch and reconcile after any possible write", () => {
  const owner = connector();
  bind(owner);
  const queued = enqueue();
  const first = claimCreate(owner, BASE_NOW + 100);
  const second = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: true,
    now: BASE_NOW + 100 + NOTEBOOKLM_LEASE_MS,
  });
  assert.ok(second);
  assert.equal(second.action, "create");
  assert.equal(second.leaseEpoch, 2);
  expectCode("stale_lease", () =>
    applyNotebookLmConnectorEvent({
      connector: owner,
      requestId: queued.request.id,
      leaseToken: first.leaseToken,
      leaseEpoch: first.leaseEpoch,
      event: { type: "dispatch_started" },
      allowProviderWrite: true,
      now: BASE_NOW + 100 + NOTEBOOKLM_LEASE_MS,
    }),
  );

  dispatch(owner, second, BASE_NOW + 101 + NOTEBOOKLM_LEASE_MS);
  const recoveredAt = BASE_NOW + 101 + 2 * NOTEBOOKLM_LEASE_MS;
  assert.equal(claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: false,
    now: recoveredAt,
  }), null);
  const recovered = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: false,
    now: recoveredAt + NOTEBOOKLM_RETRY_BACKOFF_MS,
  });
  assert.ok(recovered);
  assert.equal(recovered.action, "reconcile");
  assert.equal(recovered.source.title, null);
  assert.equal(recovered.source.text, null);
  assert.equal(getNotebookLmExportRequest(queued.request.id)?.attempt_count, 1);
});

test("a connector event at the exact lease deadline is stale", () => {
  const owner = connector();
  bind(owner);
  const queued = enqueue();
  const claimedAt = BASE_NOW + 100;
  const claimed = claimCreate(owner, claimedAt);
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: claimed.leaseToken,
    leaseEpoch: claimed.leaseEpoch,
    event: { type: "preflight_ok", sourceCount: 1, sourceLimit: 50, sharingPosture: "private" },
    allowProviderWrite: true,
    now: claimedAt + 1,
  });
  expectCode("stale_lease", () =>
    applyNotebookLmConnectorEvent({
      connector: owner,
      requestId: queued.request.id,
      leaseToken: claimed.leaseToken,
      leaseEpoch: claimed.leaseEpoch,
      event: { type: "dispatch_started" },
      allowProviderWrite: true,
      now: claimedAt + NOTEBOOKLM_LEASE_MS,
    }),
  );
  assert.equal(getNotebookLmExportRequest(queued.request.id)?.attempt_count, 0);
  assert.equal(getNotebookLmExportRequest(queued.request.id)?.create_dispatched_at, null);
});

test("pre-create leases stop after three expirations instead of retrying forever", () => {
  const owner = connector();
  bind(owner);
  const queued = enqueue();
  let now = BASE_NOW + 100;
  for (let epoch = 1; epoch <= 3; epoch += 1) {
    const claimed = claimNotebookLmExportRequest({ connector: owner, allowCreate: true, now });
    assert.ok(claimed);
    assert.equal(claimed.action, "create");
    assert.equal(claimed.leaseEpoch, epoch);
    now += NOTEBOOKLM_LEASE_MS;
  }
  assert.equal(claimNotebookLmExportRequest({ connector: owner, allowCreate: true, now }), null);
  const row = getNotebookLmExportRequest(queued.request.id)!;
  assert.equal(row.state, "retryable_failure");
  assert.equal(row.phase, "pre_create");
  assert.equal(row.safe_reason, "lease_exhausted");
  assert.equal(row.lease_epoch, 3);
  assert.equal(row.create_dispatched_at, null);

  const refreshed = bind(owner, {
    observedBindingVersion: 1,
    sourceCount: 2,
    now: now + 1,
  });
  assert.equal(refreshed.binding_version, 1);
  const afterBind = getNotebookLmExportRequest(queued.request.id)!;
  assert.equal(afterBind.state, "retryable_failure");
  assert.equal(afterBind.safe_reason, "lease_exhausted");
  assert.equal(afterBind.lease_epoch, 3);
  assert.equal(
    claimNotebookLmExportRequest({
      connector: owner,
      allowCreate: true,
      now: now + NOTEBOOKLM_RETRY_BACKOFF_MS + 2,
    }),
    null,
  );
});

test("retention purges frozen content but preserves the state ledger and reconcile safety", () => {
  const owner = connector();
  bind(owner);
  const queued = enqueue({ now: BASE_NOW + 10 });
  const expiry = queued.request.expires_at;
  const expiredCounts = cleanupNotebookLmRetention(expiry);
  assert.equal(expiredCounts.expired, 1);
  const expired = getNotebookLmExportRequest(queued.request.id)!;
  assert.equal(expired.state, "expired");
  assert.equal(expired.phase, "terminal");
  assert.equal(expired.payload_title, null);
  assert.equal(expired.payload_text, null);
  assert.equal(expired.snapshot_purged_at, expiry);
  assert.ok(getDb().prepare("SELECT 1 FROM notebooklm_export_events WHERE request_id=?").get(expired.id));

  const second = enqueue({ itemId: "post-dispatch-item", now: expiry + 1 });
  const claimed = claimCreate(owner, expiry + 2);
  const sending = dispatch(owner, claimed, expiry + 3);
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: second.request.id,
    leaseToken: claimed.leaseToken,
    leaseEpoch: claimed.leaseEpoch,
    event: { type: "create_uncertain", reason: "timeout" },
    allowProviderWrite: true,
    now: expiry + 4,
  });
  const purgeAt = sending.snapshot_purge_at;
  const purgedCounts = cleanupNotebookLmRetention(purgeAt);
  assert.ok(purgedCounts.snapshotsPurged >= 1);
  const purged = getNotebookLmExportRequest(second.request.id)!;
  assert.equal(purged.payload_title, null);
  assert.equal(purged.payload_text, null);
  assert.equal(purged.state, "reconciling");
  assert.equal(purged.attempt_count, 1);
  const reconcile = claimNotebookLmExportRequest({ connector: owner, allowCreate: true, now: purgeAt + 1 });
  assert.ok(reconcile);
  assert.equal(reconcile.action, "reconcile");
  assert.equal(reconcile.source.text, null);

  getDb().prepare("UPDATE notebooklm_export_events SET created_at=?").run(
    purgeAt - NOTEBOOKLM_EVENT_RETENTION_MS - 1,
  );
  getDb().prepare("UPDATE notebooklm_operational_events SET created_at=?").run(
    purgeAt - NOTEBOOKLM_EVENT_RETENTION_MS - 1,
  );
  const deleted = cleanupNotebookLmRetention(purgeAt);
  assert.ok(deleted.eventsDeleted > 0);
  assert.equal(
    (getDb().prepare("SELECT count(*) n FROM notebooklm_export_events").get() as { n: number }).n,
    0,
  );
  assert.equal(
    (getDb().prepare("SELECT count(*) n FROM notebooklm_operational_events").get() as { n: number }).n,
    0,
  );
  assert.ok(getNotebookLmExportRequest(second.request.id), "request ledger must outlive event retention");
});

test("re-clicking an expired pre-send export restores its frozen snapshot safely", () => {
  const owner = connector();
  bind(owner);
  const text = "# Expiring\n\nSynthetic expiring payload";
  const first = enqueue({
    itemId: "expiring-item",
    idempotencyKey: "expiring_idem_0001",
    mappedText: text,
    contentHash: contentHash(text),
    now: BASE_NOW + 10,
  });
  cleanupNotebookLmRetention(first.request.expires_at);
  const replay = enqueue({
    itemId: "expiring-item",
    idempotencyKey: "expiring_idem_0002",
    mappedText: text,
    contentHash: contentHash(text),
    now: first.request.expires_at + 1,
  });
  assert.equal(replay.deduplicated, true);
  assert.equal(replay.request.id, first.request.id);
  assert.equal(replay.request.state, "queued");
  assert.equal(replay.request.phase, "pre_create");
  assert.equal(replay.request.payload_text, text);
  assert.equal(replay.request.snapshot_purged_at, null);
});

test("re-clicking a cancelled pre-send export restores its frozen snapshot safely", () => {
  const owner = connector();
  bind(owner);
  const text = "# Cancelled\n\nSynthetic cancelled payload";
  const first = enqueue({
    itemId: "cancelled-replay-item",
    idempotencyKey: "cancelled_replay_01",
    mappedText: text,
    contentHash: contentHash(text),
  });
  cancelNotebookLmExportRequest({
    requestId: first.request.id,
    itemId: "cancelled-replay-item",
    now: BASE_NOW + 50,
  });
  const replay = enqueue({
    itemId: "cancelled-replay-item",
    idempotencyKey: "cancelled_replay_02",
    mappedText: text,
    contentHash: contentHash(text),
    now: BASE_NOW + 51,
  });
  assert.equal(replay.request.id, first.request.id);
  assert.equal(replay.request.state, "queued");
  assert.equal(replay.request.phase, "pre_create");
  assert.equal(replay.request.payload_text, text);
  assert.equal(replay.request.completed_at, null);
  assert.equal(replay.request.cancelled_at, null);
  assert.equal(replay.request.snapshot_purged_at, null);
});

test("secure deletion plus WAL truncation removes cancelled snapshot bytes physically", () => {
  const owner = connector();
  bind(owner);
  const sentinel = `NOTEBOOKLM_PHYSICAL_PURGE_${crypto.randomBytes(12).toString("hex")}`;
  const queued = enqueue({
    itemId: "physical-purge-item",
    idempotencyKey: "physical_purge_idem_0001",
    mappedTitle: sentinel,
    mappedText: sentinel,
    contentHash: contentHash(sentinel),
  });
  const storedItem = getDb()
    .prepare("SELECT title,body FROM items WHERE id=?")
    .get("physical-purge-item") as { title: string; body: string };
  assert.equal(JSON.stringify(storedItem).includes(sentinel), false);

  const databasePath = process.env.BRAIN_DB_PATH!;
  assert.equal(databaseAndWalBytes(databasePath).includes(Buffer.from(sentinel)), true);
  cancelNotebookLmExportRequest({
    requestId: queued.request.id,
    itemId: "physical-purge-item",
    now: BASE_NOW + 50,
  });

  assert.equal(databaseAndWalBytes(databasePath).includes(Buffer.from(sentinel)), false);
  const purged = getNotebookLmExportRequest(queued.request.id)!;
  assert.equal(purged.payload_title, null);
  assert.equal(purged.payload_text, null);
  assert.equal(purged.snapshot_purged_at, BASE_NOW + 50);
});

test("overlapping app and fallback finalizers treat an already-cleared generation as success", () => {
  const generation = markNotebookLmPhysicalPurgePending({ now: BASE_NOW });
  assert.equal(generation, 1);

  finalizeNotebookLmSensitivePurge(BASE_NOW + 1);
  const cleared = getNotebookLmRuntimeControl();
  assert.equal(cleared.retention_physical_purge_pending, 0);
  assert.equal(cleared.retention_physical_purge_generation, generation);

  finalizeNotebookLmSensitivePurge(BASE_NOW + 2);
  const replayed = getNotebookLmRuntimeControl();
  assert.equal(replayed.retention_physical_purge_pending, 0);
  assert.equal(replayed.retention_physical_purge_generation, generation);
  assert.equal(replayed.retention_failure_streak, 0);
  assert.equal(replayed.retention_last_failure_at, null);
});

test("finalization checkpoints again before clearing a generation that advances concurrently", () => {
  const db = getDb();
  assert.equal(markNotebookLmPhysicalPurgePending({ now: BASE_NOW, db }), 1);
  let checkpointCount = 0;

  finalizeNotebookLmSensitivePurge(
    BASE_NOW + 2,
    db,
    (database) => {
      checkpointSensitiveDeletion(database);
      checkpointCount += 1;
      if (checkpointCount === 1) {
        assert.equal(
          markNotebookLmPhysicalPurgePending({ now: BASE_NOW + 1, db: database }),
          2,
        );
      }
    },
  );

  const control = getNotebookLmRuntimeControl(db);
  assert.equal(checkpointCount, 2);
  assert.equal(control.retention_physical_purge_pending, 0);
  assert.equal(control.retention_physical_purge_generation, 2);
  assert.equal(control.retention_failure_streak, 0);
  assert.equal(control.retention_last_failure_at, null);
});

test("an item-deletion checkpoint failure remains pending until the next successful sweep", () => {
  const owner = connector();
  bind(owner);
  const sentinel = `NOTEBOOKLM_PENDING_PURGE_${crypto.randomBytes(12).toString("hex")}`;
  const queued = enqueue({
    itemId: "pending-physical-purge-item",
    idempotencyKey: "pending_physical_purge_0001",
    mappedTitle: sentinel,
    mappedText: sentinel,
    contentHash: contentHash(sentinel),
  });
  const databasePath = process.env.BRAIN_DB_PATH!;
  const writer = getDb();
  const previousBusyTimeout = writer.pragma("busy_timeout", { simple: true }) as number;
  const reader = new Database(databasePath, { readonly: true, fileMustExist: true });

  try {
    reader.exec("BEGIN");
    assert.equal(
      (reader.prepare("SELECT payload_text FROM notebooklm_export_requests WHERE id=?")
        .get(queued.request.id) as { payload_text: string }).payload_text,
      sentinel,
    );
    writer.pragma("busy_timeout = 0");

    assert.throws(
      () => deleteItem("pending-physical-purge-item"),
      /sensitive_wal_checkpoint_incomplete/,
    );
    assert.equal(
      writer.prepare("SELECT 1 FROM items WHERE id=?").get("pending-physical-purge-item"),
      undefined,
    );
    const logicallyPurged = getNotebookLmExportRequest(queued.request.id)!;
    assert.equal(logicallyPurged.payload_title, null);
    assert.equal(logicallyPurged.payload_text, null);

    const failed = getNotebookLmRuntimeControl();
    assert.equal(failed.retention_physical_purge_pending, 1);
    assert.equal(failed.retention_physical_purge_generation, 1);
    assert.equal(failed.retention_failure_streak, 1);
    assert.equal(failed.retention_last_error_code, "wal_checkpoint_incomplete");
    assert.equal(notebookLmRuntimeProviderWritesAllowed(writer, Date.now()), false);
    assert.equal(databaseAndWalBytes(databasePath).includes(Buffer.from(sentinel)), true);
    const lastSuccessBeforeRetry = failed.retention_last_success_at;

    const blockedRetryAt = Date.now() + 1;
    assert.throws(
      () => cleanupNotebookLmRetention(blockedRetryAt),
      /sensitive_wal_checkpoint_incomplete/,
    );
    const stillPending = getNotebookLmRuntimeControl();
    assert.equal(stillPending.retention_physical_purge_pending, 1);
    assert.equal(stillPending.retention_failure_streak, 2);
    assert.equal(stillPending.retention_last_success_at, lastSuccessBeforeRetry);
    assert.equal(stillPending.retention_last_error_code, "wal_checkpoint_incomplete");

    reader.exec("ROLLBACK");
    const recoveredAt = blockedRetryAt + 1;
    cleanupNotebookLmRetention(recoveredAt);
    const recovered = getNotebookLmRuntimeControl();
    assert.equal(recovered.retention_physical_purge_pending, 0);
    assert.equal(recovered.retention_physical_purge_generation, 1);
    assert.equal(recovered.retention_failure_streak, 0);
    assert.equal(recovered.retention_last_error_code, null);
    assert.equal(recovered.retention_last_success_at, recoveredAt);
    assert.equal(notebookLmRuntimeProviderWritesAllowed(writer, recoveredAt), true);
    assert.equal(databaseAndWalBytes(databasePath).includes(Buffer.from(sentinel)), false);
  } finally {
    if (reader.inTransaction) reader.exec("ROLLBACK");
    reader.close();
    writer.pragma(`busy_timeout = ${previousBusyTimeout}`);
  }
});

test("backup scrubbing expires pre-create work and makes in-flight recovery claimable", () => {
  const owner = connector();
  bind(owner);
  const pollingSentinel = `NOTEBOOKLM_BACKUP_POLL_${crypto.randomBytes(12).toString("hex")}`;
  const polling = enqueue({
    itemId: "backup-scrub-poll-item",
    idempotencyKey: "backup_scrub_poll_0001",
    mappedTitle: pollingSentinel,
    mappedText: pollingSentinel,
    contentHash: contentHash(pollingSentinel),
  });
  const pollingCreate = claimCreate(owner, BASE_NOW + 100);
  dispatch(owner, pollingCreate, BASE_NOW + 101);
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: polling.request.id,
    leaseToken: pollingCreate.leaseToken,
    leaseEpoch: pollingCreate.leaseEpoch,
    event: { type: "create_accepted", sourceAlias: SOURCE_ALIAS, providerStatus: "processing" },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });
  const pollingLease = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: false,
    now: BASE_NOW + 102 + NOTEBOOKLM_RETRY_BACKOFF_MS,
  });
  assert.ok(pollingLease);
  assert.equal(pollingLease.action, "poll");

  const sendingSentinel = `NOTEBOOKLM_BACKUP_SENDING_${crypto.randomBytes(12).toString("hex")}`;
  const sending = enqueue({
    itemId: "backup-scrub-sending-item",
    idempotencyKey: "backup_scrub_sending_0001",
    mappedTitle: sendingSentinel,
    mappedText: sendingSentinel,
    contentHash: contentHash(sendingSentinel),
    now: BASE_NOW + 103 + NOTEBOOKLM_RETRY_BACKOFF_MS,
  });
  const sendingClaim = claimCreate(owner, BASE_NOW + 104 + NOTEBOOKLM_RETRY_BACKOFF_MS);
  dispatch(owner, sendingClaim, BASE_NOW + 105 + NOTEBOOKLM_RETRY_BACKOFF_MS);

  const sentinel = `NOTEBOOKLM_BACKUP_SCRUB_${crypto.randomBytes(12).toString("hex")}`;
  const queued = enqueue({
    itemId: "backup-scrub-item",
    idempotencyKey: "backup_scrub_idem_0001",
    mappedTitle: sentinel,
    mappedText: sentinel,
    contentHash: contentHash(sentinel),
  });
  const storedItem = getDb()
    .prepare("SELECT title,body FROM items WHERE id=?")
    .get("backup-scrub-item") as { title: string; body: string };
  assert.equal(JSON.stringify(storedItem).includes(sentinel), false);

  const backupPath = join(TEST_DB_DIR, `notebooklm-backup-${crypto.randomBytes(6).toString("hex")}.sqlite`);
  rmSync(backupPath, { force: true });
  getDb().exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
  assert.equal(readFileSync(backupPath).includes(Buffer.from(sentinel)), true);

  scrubNotebookLmSnapshotsFromBackup(backupPath);
  const backup = new Database(backupPath, { readonly: true, fileMustExist: true });
  try {
    const rows = backup
      .prepare(
        `SELECT id,state,phase,safe_reason,payload_title,payload_text,
                opaque_marker,source_alias,lease_token_hash,lease_until,
                snapshot_purged_at,completed_at
         FROM notebooklm_export_requests WHERE id IN (?,?,?)`,
      )
      .all(queued.request.id, sending.request.id, polling.request.id) as Array<{
        id: string;
        state: string;
        phase: string;
        safe_reason: string | null;
        payload_title: string | null;
        payload_text: string | null;
        opaque_marker: string;
        source_alias: string | null;
        lease_token_hash: string | null;
        lease_until: number | null;
        snapshot_purged_at: number | null;
        completed_at: number | null;
      }>;
    const byId = new Map(rows.map((row) => [row.id, row]));
    const row = byId.get(queued.request.id)!;
    assert.deepEqual({
      state: row.state,
      phase: row.phase,
      safe_reason: row.safe_reason,
      payload_title: row.payload_title,
      payload_text: row.payload_text,
      lease_token_hash: row.lease_token_hash,
      lease_until: row.lease_until,
    }, {
      state: "expired",
      phase: "terminal",
      safe_reason: "backup_snapshot_omitted",
      payload_title: null,
      payload_text: null,
      lease_token_hash: null,
      lease_until: null,
    });
    const sendingRow = byId.get(sending.request.id)!;
    assert.deepEqual({
      state: sendingRow.state,
      phase: sendingRow.phase,
      payload_title: sendingRow.payload_title,
      payload_text: sendingRow.payload_text,
      opaque_marker: sendingRow.opaque_marker,
      source_alias: sendingRow.source_alias,
      lease_token_hash: sendingRow.lease_token_hash,
      lease_until: sendingRow.lease_until,
    }, {
      state: "reconciling",
      phase: "reconcile",
      payload_title: null,
      payload_text: null,
      opaque_marker: sending.request.opaque_marker,
      source_alias: null,
      lease_token_hash: null,
      lease_until: null,
    });
    const pollingRow = byId.get(polling.request.id)!;
    assert.deepEqual({
      state: pollingRow.state,
      phase: pollingRow.phase,
      payload_title: pollingRow.payload_title,
      payload_text: pollingRow.payload_text,
      opaque_marker: pollingRow.opaque_marker,
      source_alias: pollingRow.source_alias,
      lease_token_hash: pollingRow.lease_token_hash,
      lease_until: pollingRow.lease_until,
    }, {
      state: "processing",
      phase: "poll",
      payload_title: null,
      payload_text: null,
      opaque_marker: polling.request.opaque_marker,
      source_alias: SOURCE_ALIAS,
      lease_token_hash: null,
      lease_until: null,
    });
    assert.ok((row.snapshot_purged_at ?? 0) > 0);
    assert.ok((row.completed_at ?? 0) > 0);
    assert.deepEqual(backup.pragma("quick_check"), [{ quick_check: "ok" }]);
  } finally {
    backup.close();
  }
  assert.equal(databaseAndWalBytes(backupPath).includes(Buffer.from(sentinel)), false);
  assert.equal(databaseAndWalBytes(backupPath).includes(Buffer.from(sendingSentinel)), false);
  assert.equal(databaseAndWalBytes(backupPath).includes(Buffer.from(pollingSentinel)), false);
  assert.equal(getNotebookLmExportRequest(queued.request.id)?.payload_text, sentinel);
});

test("deleting an item cancels queued work and purges its frozen snapshot", () => {
  const owner = connector();
  bind(owner);
  const queued = enqueue({ itemId: "delete-queued-item" });
  deleteItem("delete-queued-item");

  assert.equal(getDb().prepare("SELECT 1 FROM items WHERE id=?").get("delete-queued-item"), undefined);
  const deleted = getNotebookLmExportRequest(queued.request.id)!;
  assert.equal(deleted.state, "cancelled");
  assert.equal(deleted.phase, "terminal");
  assert.equal(deleted.safe_reason, "item_deleted_before_send");
  assert.equal(deleted.payload_title, null);
  assert.equal(deleted.payload_text, null);
  assert.ok(deleted.snapshot_purged_at);
  assert.ok(deleted.cancelled_at);
  assert.equal(
    claimNotebookLmExportRequest({ connector: owner, allowCreate: true, now: Date.now() + 1 }),
    null,
  );
});

test("deleting an item after dispatch preserves possible-delivery truth without further claims", () => {
  const owner = connector();
  bind(owner);
  const queued = enqueue({ itemId: "delete-possible-write-item" });
  const claimed = claimCreate(owner, BASE_NOW + 100);
  dispatch(owner, claimed, BASE_NOW + 101);
  deleteItem("delete-possible-write-item");

  const deleted = getNotebookLmExportRequest(queued.request.id)!;
  assert.equal(deleted.state, "reconciliation_required");
  assert.equal(deleted.phase, "terminal");
  assert.equal(deleted.safe_reason, "item_deleted_source_may_exist");
  assert.equal(deleted.payload_title, null);
  assert.equal(deleted.payload_text, null);
  assert.equal(deleted.attempt_count, 1);
  assert.ok(deleted.create_dispatched_at);
  assert.equal(
    claimNotebookLmExportRequest({ connector: owner, allowCreate: false, now: Date.now() + 1 }),
    null,
  );
});

test("claim fails closed when an item disappears outside the repository delete path", () => {
  const owner = connector();
  bind(owner);
  const queued = enqueue({ itemId: "delete-race-item" });
  getDb().prepare("DELETE FROM items WHERE id=?").run("delete-race-item");

  assert.equal(
    claimNotebookLmExportRequest({ connector: owner, allowCreate: true, now: BASE_NOW + 100 }),
    null,
  );
  const guarded = getNotebookLmExportRequest(queued.request.id)!;
  assert.equal(guarded.state, "cancelled");
  assert.equal(guarded.phase, "terminal");
  assert.equal(guarded.safe_reason, "item_deleted_before_send");
  assert.equal(guarded.payload_title, null);
  assert.equal(guarded.payload_text, null);
});

test("an exact idempotency replay remains readable while the runtime write gate is blocked", () => {
  const owner = connector();
  bind(owner);
  const text = "# Exact replay\n\nFrozen payload";
  const first = enqueue({
    itemId: "runtime-replay-item",
    idempotencyKey: "runtime_replay_idem_0001",
    mappedTitle: "Exact replay",
    mappedText: text,
    contentHash: contentHash(text),
  });
  getDb().prepare(
    `UPDATE notebooklm_runtime_control
     SET provider_write_blocked=1, protocol_failure_streak=3,
         block_reason='protocol_drift', last_protocol_failure_at=?, updated_at=?
     WHERE id=1`,
  ).run(BASE_NOW + 50, BASE_NOW + 50);

  const replay = enqueue({
    itemId: "runtime-replay-item",
    idempotencyKey: "runtime_replay_idem_0001",
    mappedTitle: "Exact replay",
    mappedText: text,
    contentHash: contentHash(text),
    now: BASE_NOW + 51,
  });
  assert.equal(replay.deduplicated, true);
  assert.equal(replay.request.id, first.request.id);

  expectCode("runtime_write_blocked", () =>
    enqueue({ itemId: "runtime-replay-new-item", now: BASE_NOW + 52 }),
  );
});

test("cancellation is impossible after dispatch acknowledgment", () => {
  const owner = connector();
  bind(owner);
  const queued = enqueue({ itemId: "dispatch-cancel-item" });
  const claimed = claimCreate(owner, BASE_NOW + 100);
  dispatch(owner, claimed, BASE_NOW + 101);
  expectCode("request_not_cancellable", () =>
    cancelNotebookLmExportRequest({
      requestId: queued.request.id,
      itemId: "dispatch-cancel-item",
      now: BASE_NOW + 102,
    }),
  );
});

test("stop checking requires explicit ambiguity acknowledgement, purges content, and can never recreate", () => {
  const owner = connector();
  bind(owner);
  const text = "# Ambiguous\n\nPayload that may already exist";
  const queued = enqueue({
    itemId: "stop-checking-item",
    idempotencyKey: "stop_checking_idem_01",
    mappedText: text,
    contentHash: contentHash(text),
  });
  const claimed = claimCreate(owner, BASE_NOW + 100);
  dispatch(owner, claimed, BASE_NOW + 101);
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: claimed.leaseToken,
    leaseEpoch: claimed.leaseEpoch,
    event: { type: "create_uncertain", reason: "timeout" },
    allowProviderWrite: true,
    now: BASE_NOW + 102,
  });

  expectCode("acknowledgement_required", () =>
    stopCheckingNotebookLmExportRequest({
      requestId: queued.request.id,
      itemId: "stop-checking-item",
      acknowledgeSourceMayExist: false,
      now: BASE_NOW + 103,
    }),
  );
  const stopped = stopCheckingNotebookLmExportRequest({
    requestId: queued.request.id,
    itemId: "stop-checking-item",
    acknowledgeSourceMayExist: true,
    now: BASE_NOW + 104,
  });
  assert.equal(stopped.state, "reconciliation_required");
  assert.equal(stopped.phase, "terminal");
  assert.equal(stopped.safe_reason, "checking_stopped_source_may_exist");
  assert.equal(stopped.payload_title, null);
  assert.equal(stopped.payload_text, null);
  assert.equal(stopped.snapshot_purged_at, BASE_NOW + 104);
  assert.equal(stopped.completed_at, BASE_NOW + 104);
  assert.equal(stopped.attempt_count, 1);
  assert.equal(
    claimNotebookLmExportRequest({ connector: owner, allowCreate: true, now: BASE_NOW + 105 }),
    null,
  );

  const replay = enqueue({
    itemId: "stop-checking-item",
    idempotencyKey: "stop_checking_idem_02",
    mappedText: text,
    contentHash: contentHash(text),
    now: BASE_NOW + 106,
  });
  assert.equal(replay.request.id, queued.request.id);
  assert.equal(replay.request.phase, "terminal");
  assert.equal(replay.request.payload_text, null);
  assert.equal(replay.request.attempt_count, 1);
});

test("event history contains only bounded event metadata, never frozen payload text", () => {
  const owner = connector();
  bind(owner);
  const privateNeedle = "PRIVATE_SYNTHETIC_PAYLOAD_NEEDLE";
  const queued = enqueue({ mappedText: privateNeedle });
  const claimed = claimCreate(owner, BASE_NOW + 100);
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.id,
    leaseToken: claimed.leaseToken,
    leaseEpoch: claimed.leaseEpoch,
    event: { type: "authentication_required", phase: "pre_create" },
    allowProviderWrite: false,
    now: BASE_NOW + 101,
  });
  const events = getDb()
    .prepare("SELECT * FROM notebooklm_export_events WHERE request_id=? ORDER BY id")
    .all(queued.request.id);
  assert.equal(JSON.stringify(events).includes(privateNeedle), false);
  assert.equal(JSON.stringify(events).includes(queued.request.payload_title ?? "impossible"), false);
});
