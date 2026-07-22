import "./route.test.setup";

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { bindNotebookLmTarget } from "@/db/notebooklm-export";
import {
  getNotebookLmRuntimeControl,
  markNotebookLmPhysicalPurgePending,
  recordNotebookLmProtocolFailure,
  recordNotebookLmRetentionSweepFailure,
} from "@/db/notebooklm-export-control";
import {
  authenticateNotebookLmConnector,
  createConnectorPairingCode,
  exchangeConnectorPairingCode,
} from "@/lib/notebooklm/connector-auth";
import { issueSessionToken, setPin } from "@/lib/auth";
import { DELETE, GET, PATCH, POST } from "./route";
import { TEST_DB_DIR } from "./route.test.setup";
import { NOTEBOOKLM_SAFE_TARGET_LABEL } from "@/lib/notebooklm/contracts";

const ORIGIN = "http://localhost";

setPin("1234");

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
  process.env.BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED = "1";
  process.env.BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED = "1";
  process.env.BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED = "1";
});

function req(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  options: {
    auth?: boolean;
    origin?: string | null;
    body?: unknown;
    rawBody?: string;
  } = {},
): NextRequest {
  const headers = new Headers();
  if (options.auth !== false) headers.set("cookie", `brain-session=${issueSessionToken()}`);
  if (method !== "GET" && options.origin !== null) {
    headers.set("origin", options.origin ?? ORIGIN);
  }
  headers.set("content-type", "application/json");
  const body = options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
  return new NextRequest(`${ORIGIN}/api/settings/notebooklm-export`, {
    method,
    headers,
    body,
  });
}

function installBoundTarget(verifiedAt = Date.now()) {
  const extensionOrigin = `chrome-extension://${"a".repeat(32)}`;
  const pairing = createConnectorPairingCode({ now: verifiedAt - 2 });
  const exchanged = exchangeConnectorPairingCode({
    code: pairing.code,
    origin: extensionOrigin,
    protocolVersion: 1,
    now: verifiedAt - 1,
  });
  assert.equal(exchanged.ok, true);
  if (!exchanged.ok) throw new Error("synthetic exchange failed");
  const authenticated = authenticateNotebookLmConnector({
    authorization: `Bearer ${exchanged.connectorToken}`,
    origin: extensionOrigin,
    protocolVersion: "1",
    now: verifiedAt,
  });
  assert.equal(authenticated.ok, true);
  if (!authenticated.ok) throw new Error("synthetic auth failed");
  const target = bindNotebookLmTarget({
    connector: authenticated.connector,
    safeLabel: NOTEBOOKLM_SAFE_TARGET_LABEL,
    localBindingFingerprint: "a".repeat(64),
    subjectFingerprint: "b".repeat(64),
    sharingPosture: "private",
    sourceCount: 2,
    sourceLimit: 50,
    reserveCount: 5,
    observedBindingVersion: 0,
    now: verifiedAt,
  });
  return { connector: authenticated.connector, target };
}

test("settings reads require a session, stay private, and hide the disabled feature", async () => {
  let response = await GET(req("GET", { auth: false }));
  assert.equal(response.status, 401);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);

  process.env.BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED = "0";
  response = await GET(req("GET"));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "not_found" });
});

test("GET returns only safe configuration, liveness, capacity, and runtime-control fields", async () => {
  const { connector, target } = installBoundTarget();
  const response = await GET(req("GET"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.feature.queueAccepting, true);
  assert.equal(body.feature.providerWritesEnabled, true);
  assert.equal(body.feature.runtimeWriteBlocked, false);
  assert.equal(body.feature.protocolFailureStreak, 0);
  assert.equal(body.feature.retentionHealthy, true);
  assert.match(body.feature.retentionLastSuccessAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(body.feature.retentionLastFailureAt, null);
  assert.equal(body.feature.retentionFailureStreak, 0);
  assert.equal(body.feature.retentionErrorCode, null);
  assert.equal(body.feature.physicalPurgePending, false);
  assert.equal(body.feature.overdueSnapshots, 0);
  assert.equal(body.feature.unresolvedOver24h, 0);
  assert.equal(body.connection.configured, true);
  assert.equal(body.connection.targetLabel, NOTEBOOKLM_SAFE_TARGET_LABEL);
  assert.equal(body.connection.sharingPosture, "private");
  assert.equal(body.connection.healthStatus, "healthy");
  assert.equal(body.connection.healthReason, null);
  assert.equal(body.connection.safeSlots, 43);
  const serialized = JSON.stringify(body);
  for (const forbidden of [
    connector.id,
    target.id,
    target.local_binding_fingerprint,
    target.subject_fingerprint,
    "token_hash",
    "token_hint",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `settings leaked ${forbidden}`);
  }
});

test("GET exposes only bounded retention-health status and fails the write rollout closed", async () => {
  installBoundTarget();
  recordNotebookLmRetentionSweepFailure({
    errorCode: "cleanup_failed",
    now: Date.now(),
  });
  markNotebookLmPhysicalPurgePending({ now: Date.now() });
  const response = await GET(req("GET"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.feature.retentionHealthy, false);
  assert.equal(body.feature.retentionFailureStreak, 1);
  assert.equal(body.feature.retentionErrorCode, "cleanup_failed");
  assert.equal(body.feature.physicalPurgePending, true);
  assert.match(body.feature.retentionLastFailureAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(body.feature.queueAccepting, false);
  assert.equal(body.feature.providerWritesEnabled, false);
  assert.equal(JSON.stringify(body).includes("Error:"), false);
});

test("POST requires same-origin strict JSON and stores only a hashed, expiring pairing code", async () => {
  for (const origin of [null, "https://evil.example"]) {
    const response = await POST(req("POST", { origin, body: {} }));
    assert.equal(response.status, 403);
  }
  let response = await POST(req("POST", { body: { unexpected: true } }));
  assert.equal(response.status, 400);
  response = await POST(req("POST", { body: { label: "Synthetic browser" } }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.match(body.code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.ok(Date.parse(body.expiresAt) > Date.now());
  const stored = getDb()
    .prepare("SELECT code_hash,label,expires_at FROM notebooklm_connector_pairing_codes")
    .get() as { code_hash: string; label: string; expires_at: number };
  assert.match(stored.code_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(stored.code_hash, body.code.replace("-", ""));
  assert.equal(stored.label, "Synthetic browser");
  assert.equal(stored.expires_at, Date.parse(body.expiresAt));
});

test("PATCH cannot clear protocol drift without literal acknowledgement and fresh target verification", async () => {
  const stale = Date.now() - 5 * 60_000 - 10;
  const { connector, target } = installBoundTarget(stale);
  for (let count = 0; count < 3; count += 1) {
    recordNotebookLmProtocolFailure({
      connectorId: connector.id,
      targetId: target.id,
      now: stale + count,
    });
  }
  assert.equal(getNotebookLmRuntimeControl().provider_write_blocked, 1);

  let response = await PATCH(
    req("PATCH", {
      body: {
        action: "clear_protocol_block",
        acknowledgeConnectorUpdatedAndTargetRevalidated: false,
      },
    }),
  );
  assert.equal(response.status, 400);
  response = await PATCH(
    req("PATCH", {
      body: {
        action: "clear_protocol_block",
        acknowledgeConnectorUpdatedAndTargetRevalidated: true,
      },
    }),
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "target_not_recently_verified" });
  assert.equal(getNotebookLmRuntimeControl().provider_write_blocked, 1);

  getDb().prepare("UPDATE notebooklm_targets SET verified_at=? WHERE id=?").run(Date.now(), target.id);
  response = await PATCH(
    req("PATCH", {
      body: {
        action: "clear_protocol_block",
        acknowledgeConnectorUpdatedAndTargetRevalidated: true,
      },
    }),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.cleared, true);
  assert.equal(body.status.feature.runtimeWriteBlocked, false);
  assert.equal(body.status.feature.providerWritesEnabled, true);
});

test("DELETE revokes the active scoped connector and removes the target from active status", async () => {
  const { connector, target } = installBoundTarget();
  const response = await DELETE(req("DELETE"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.disconnected, true);
  assert.equal(body.status.connection.configured, false);
  const storedConnector = getDb()
    .prepare("SELECT state,revoked_at FROM notebooklm_connectors WHERE id=?")
    .get(connector.id) as { state: string; revoked_at: number | null };
  assert.equal(storedConnector.state, "revoked");
  assert.ok(storedConnector.revoked_at);
  const storedTarget = getDb()
    .prepare("SELECT active,deactivated_at FROM notebooklm_targets WHERE id=?")
    .get(target.id) as { active: number; deactivated_at: number | null };
  assert.equal(storedTarget.active, 0);
  assert.ok(storedTarget.deactivated_at);
});
