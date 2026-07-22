import "./route.test.setup";

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rmSync } from "node:fs";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import {
  applyNotebookLmConnectorEvent,
  bindNotebookLmTarget,
  claimNotebookLmExportRequest,
} from "@/db/notebooklm-export";
import type { NotebookLmConnectorRow } from "@/lib/notebooklm/connector-auth";
import { issueSessionToken, setPin } from "@/lib/auth";
import { DELETE, GET, PATCH, POST } from "./route";
import { TEST_DB_DIR } from "./route.test.setup";
import { NOTEBOOKLM_SAFE_TARGET_LABEL } from "@/lib/notebooklm/contracts";

const ORIGIN = "http://localhost";
let requestSequence = 0;

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

function context(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function request(
  id: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  options: {
    auth?: boolean;
    origin?: string | null;
    body?: unknown;
    rawBody?: string;
    contentType?: string | null;
    idempotencyKey?: string;
  } = {},
): NextRequest {
  const headers = new Headers();
  if (options.auth !== false) headers.set("cookie", `brain-session=${issueSessionToken()}`);
  if (options.origin !== null && method !== "GET") {
    headers.set("origin", options.origin ?? ORIGIN);
  }
  if (options.idempotencyKey) {
    headers.set("x-notebooklm-idempotency-key", options.idempotencyKey);
  }
  const contentType = options.contentType === undefined ? "application/json" : options.contentType;
  if (contentType) headers.set("content-type", contentType);
  const body = options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
  return new NextRequest(`${ORIGIN}/api/items/${id}/notebooklm-export`, {
    method,
    headers,
    body,
  });
}

function configureTarget(sourceCount = 1): NotebookLmConnectorRow {
  const db = getDb();
  const now = 1_700_200_000_000;
  db.prepare(
    `INSERT INTO notebooklm_connectors
     (id,token_hash,token_hint,label,extension_origin,protocol_version,state,created_at,updated_at,last_seen_at)
     VALUES('route-connector',?,'12345678','Synthetic connector',?,1,'registered',?,?,?)`,
  ).run(
    crypto.createHash("sha256").update("route-connector").digest("hex"),
    `chrome-extension://${"a".repeat(32)}`,
    now,
    now,
    Date.now(),
  );
  const owner = db
    .prepare("SELECT * FROM notebooklm_connectors WHERE id='route-connector'")
    .get() as NotebookLmConnectorRow;
  bindNotebookLmTarget({
    connector: owner,
    safeLabel: NOTEBOOKLM_SAFE_TARGET_LABEL,
    localBindingFingerprint: "a".repeat(64),
    subjectFingerprint: "b".repeat(64),
    sharingPosture: "private",
    sourceCount,
    sourceLimit: 50,
    reserveCount: 5,
    observedBindingVersion: 0,
    now,
  });
  return owner;
}

function createItem(overrides: Parameters<typeof insertCaptured>[0] = {
  source_type: "note",
  title: "Synthetic memory",
  body: "Synthetic body",
}) {
  return insertCaptured(overrides);
}

function createBody(overrides: Record<string, unknown> = {}) {
  requestSequence += 1;
  return {
    idempotencyKey: `route_idem_${String(requestSequence).padStart(8, "0")}`,
    ...overrides,
  };
}

test("all item export reads require a valid session and private no-store response", async () => {
  const item = createItem();
  const response = await GET(request(item.id, "GET", { auth: false }), context(item.id));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthenticated" });
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("GET uses the corrected public NotebookLM URL and never returns saved content", async () => {
  const item = createItem({
    source_type: "note",
    title: "PRIVATE_TITLE_NEEDLE",
    body: "PRIVATE_BODY_NEEDLE",
  });
  const response = await GET(request(item.id, "GET"), context(item.id));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.notebookLmUrl, "https://notebooklm.google/");
  assert.equal(body.disclosure, "Sends a static copy of the saved text. Changes do not sync automatically.");
  assert.equal(body.destination.configured, false);
  assert.equal(body.item.eligible, true);
  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes("PRIVATE_TITLE_NEEDLE"), false);
  assert.equal(serialized.includes("PRIVATE_BODY_NEEDLE"), false);
});

test("disabled UI is indistinguishable from a missing endpoint", async () => {
  const item = createItem();
  process.env.BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED = "0";
  const response = await GET(request(item.id, "GET"), context(item.id));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "not_found" });
});

test("mutations require an exact same-origin request before parsing or writing", async () => {
  const item = createItem();
  configureTarget();
  for (const origin of [null, "https://evil.example", "http://localhost.evil.example"]) {
    const response = await POST(
      request(item.id, "POST", { origin, body: createBody() }),
      context(item.id),
    );
    assert.equal(response.status, 403, `origin ${String(origin)}`);
    assert.deepEqual(await response.json(), { error: "cross_origin_forbidden" });
  }
  assert.equal(
    (getDb().prepare("SELECT count(*) n FROM notebooklm_export_requests").get() as { n: number }).n,
    0,
  );
});

test("PATCH records only the bounded export-view lifecycle event", async () => {
  const item = createItem({
    source_type: "note",
    title: "PRIVATE_VIEW_TITLE",
    body: "PRIVATE_VIEW_BODY",
  });
  let response = await PATCH(
    request(item.id, "PATCH", { body: { event: "export_viewed", unexpected: true } }),
    context(item.id),
  );
  assert.equal(response.status, 400);

  response = await PATCH(
    request(item.id, "PATCH", { body: { event: "export_viewed" } }),
    context(item.id),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { recorded: true });
  const events = getDb()
    .prepare(
      `SELECT event_type,connector_id,target_id,safe_reason
       FROM notebooklm_operational_events ORDER BY id`,
    )
    .all();
  assert.deepEqual(events, [{
    event_type: "notebooklm.export_viewed",
    connector_id: null,
    target_id: null,
    safe_reason: null,
  }]);
  assert.equal(JSON.stringify(events).includes("PRIVATE_VIEW"), false);
});

test("POST validates content type, body size, JSON, and strict idempotency schema", async () => {
  const item = createItem();
  configureTarget();
  const cases = [
    request(item.id, "POST", { rawBody: "{}", contentType: "text/plain" }),
    request(item.id, "POST", { rawBody: "{" }),
    request(item.id, "POST", { body: {} }),
    request(item.id, "POST", { body: { idempotencyKey: "short" } }),
    request(item.id, "POST", { body: { ...createBody(), unexpected: true } }),
    request(item.id, "POST", { rawBody: JSON.stringify({ idempotencyKey: "x".repeat(600) }) }),
  ];
  const expected = [400, 400, 400, 400, 400, 413];
  for (const [index, candidate] of cases.entries()) {
    const response = await POST(candidate, context(item.id));
    assert.equal(response.status, expected[index], `case ${index}`);
  }
  assert.equal(
    (getDb().prepare("SELECT count(*) n FROM notebooklm_export_requests").get() as { n: number }).n,
    0,
  );
});

test("queue and configuration kill switches fail before any frozen snapshot is written", async () => {
  const item = createItem();
  process.env.BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED = "0";
  let response = await POST(request(item.id, "POST", { body: createBody() }), context(item.id));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "export_queue_disabled" });

  process.env.BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED = "1";
  response = await POST(request(item.id, "POST", { body: createBody() }), context(item.id));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "connector_not_configured" });
  assert.equal(
    (getDb().prepare("SELECT count(*) n FROM notebooklm_export_requests").get() as { n: number }).n,
    0,
  );
});

test("POST queues one frozen copy but returns only a safe status DTO", async () => {
  const item = createItem({
    source_type: "url",
    source_url: "https://example.com/synthetic",
    title: "PRIVATE_ROUTE_TITLE",
    body: "PRIVATE_ROUTE_BODY",
    capture_quality: "full_text",
  });
  configureTarget();
  const body = createBody();
  const first = await POST(request(item.id, "POST", { body }), context(item.id));
  assert.equal(first.status, 202);
  const accepted = await first.json();
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.deduplicated, false);
  assert.equal(accepted.request.state, "queued");
  assert.equal(accepted.request.canCancel, true);
  const serialized = JSON.stringify(accepted);
  for (const forbidden of ["PRIVATE_ROUTE_TITLE", "PRIVATE_ROUTE_BODY", "AI-MEM-"]) {
    assert.equal(serialized.includes(forbidden), false, `response leaked ${forbidden}`);
  }

  const stored = getDb().prepare("SELECT * FROM notebooklm_export_requests").get() as {
    payload_title: string;
    payload_text: string;
    lease_token_hash: string | null;
  };
  assert.match(stored.payload_title, /PRIVATE_ROUTE_TITLE.*AI-MEM-/);
  assert.match(stored.payload_text, /PRIVATE_ROUTE_BODY/);
  assert.equal(stored.lease_token_hash, null);

  const replay = await POST(request(item.id, "POST", { body }), context(item.id));
  assert.equal(replay.status, 202);
  const replayBody = await replay.json();
  assert.equal(replayBody.deduplicated, true);
  assert.equal(replayBody.request.requestId, accepted.request.requestId);

  getDb().prepare(
    `UPDATE notebooklm_runtime_control
     SET provider_write_blocked=1, protocol_failure_streak=3,
         block_reason='protocol_drift', last_protocol_failure_at=?, updated_at=?
     WHERE id=1`,
  ).run(Date.now(), Date.now());
  const blockedReplay = await POST(
    request(item.id, "POST", { body }),
    context(item.id),
  );
  assert.equal(blockedReplay.status, 202);
  const blockedReplayBody = await blockedReplay.json();
  assert.equal(blockedReplayBody.deduplicated, true);
  assert.equal(blockedReplayBody.request.requestId, accepted.request.requestId);

  const blockedNew = await POST(
    request(item.id, "POST", { body: createBody() }),
    context(item.id),
  );
  assert.equal(blockedNew.status, 503);
  assert.deepEqual(await blockedNew.json(), { error: "export_queue_disabled" });
});

test("GET correlation cannot attach one tab's idempotency acknowledgement to another item", async () => {
  const firstItem = createItem({
    source_type: "note",
    title: "First correlated item",
    body: "First correlated body",
  });
  const secondItem = createItem({
    source_type: "note",
    title: "Second correlated item",
    body: "Second correlated body",
  });
  configureTarget();
  const idempotencyKey = "correlated_tab_key_0001";
  const queuedResponse = await POST(
    request(firstItem.id, "POST", { body: { idempotencyKey } }),
    context(firstItem.id),
  );
  assert.equal(queuedResponse.status, 202);
  const queued = await queuedResponse.json();

  let response = await GET(
    request(firstItem.id, "GET", { idempotencyKey }),
    context(firstItem.id),
  );
  assert.equal(response.status, 200);
  let status = await response.json();
  assert.equal(status.idempotencyAcknowledgement, "accepted");
  assert.equal(status.request.requestId, queued.request.requestId);

  response = await GET(
    request(secondItem.id, "GET", { idempotencyKey }),
    context(secondItem.id),
  );
  assert.equal(response.status, 200);
  status = await response.json();
  assert.equal(status.idempotencyAcknowledgement, "absent");
  assert.equal(JSON.stringify(status).includes(queued.request.requestId), false);

  response = await GET(
    request(firstItem.id, "GET", { idempotencyKey: "bad key" }),
    context(firstItem.id),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_request" });
});

test("limited capture needs explicit confirmation and over-limit text is rejected", async () => {
  const weak = createItem({
    source_type: "url",
    title: "Weak synthetic preview",
    body: "Metadata preview",
    capture_quality: "metadata_only",
  });
  configureTarget();
  let response = await POST(request(weak.id, "POST", { body: createBody() }), context(weak.id));
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: "limited_confirmation_required" });

  response = await POST(
    request(weak.id, "POST", { body: createBody({ confirmLimitedCapture: true }) }),
    context(weak.id),
  );
  assert.equal(response.status, 202);

  const large = createItem({
    source_type: "note",
    title: "Large synthetic item",
    body: "x".repeat(200_001),
  });
  response = await POST(request(large.id, "POST", { body: createBody() }), context(large.id));
  assert.equal(response.status, 413);
  const rejected = await response.json();
  assert.equal(rejected.error, "payload_too_large");
  assert.ok(rejected.bytes > 200_000);
});

test("DELETE cancels only the matching pre-dispatch item request and purges its snapshot", async () => {
  const item = createItem();
  configureTarget();
  const queuedResponse = await POST(
    request(item.id, "POST", { body: createBody() }),
    context(item.id),
  );
  assert.equal(queuedResponse.status, 202);
  const queued = await queuedResponse.json();
  assert.match(queued.request.requestId, /^[a-f0-9]{24}$/);

  const wrongItem = createItem({ source_type: "note", title: "Other", body: "Other" });
  assert.match(wrongItem.id, /^[a-f0-9]{24}$/);
  const wrongRequest = request(wrongItem.id, "DELETE", {
    body: { mode: "cancel", requestId: queued.request.requestId },
  });
  assert.deepEqual(await wrongRequest.clone().json(), {
    mode: "cancel",
    requestId: queued.request.requestId,
  });
  let response = await DELETE(wrongRequest, context(wrongItem.id));
  const wrongBody = await response.json();
  assert.equal(response.status, 404, JSON.stringify(wrongBody));
  assert.deepEqual(wrongBody, { error: "request_not_found" });

  response = await DELETE(
    request(item.id, "DELETE", {
      body: { mode: "cancel", requestId: queued.request.requestId },
    }),
    context(item.id),
  );
  assert.equal(response.status, 200);
  const cancelled = await response.json();
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.request.state, "cancelled");
  const stored = getDb()
    .prepare("SELECT payload_title,payload_text FROM notebooklm_export_requests WHERE id=?")
    .get(queued.request.requestId) as { payload_title: string | null; payload_text: string | null };
  assert.equal(stored.payload_title, null);
  assert.equal(stored.payload_text, null);
});

test("DELETE stop_checking requires acknowledgement and terminally preserves possible-delivery truth", async () => {
  const item = createItem({
    source_type: "note",
    title: "Ambiguous synthetic route item",
    body: "Payload that may have been delivered",
  });
  const owner = configureTarget();
  const queuedResponse = await POST(
    request(item.id, "POST", { body: createBody() }),
    context(item.id),
  );
  assert.equal(queuedResponse.status, 202);
  const queued = await queuedResponse.json();
  const claim = claimNotebookLmExportRequest({
    connector: owner,
    allowCreate: true,
    now: Date.now(),
  });
  assert.ok(claim);
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.requestId,
    leaseToken: claim.leaseToken,
    leaseEpoch: claim.leaseEpoch,
    event: { type: "preflight_ok", sourceCount: 1, sourceLimit: 50, sharingPosture: "private" },
    allowProviderWrite: true,
    now: Date.now(),
  });
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.requestId,
    leaseToken: claim.leaseToken,
    leaseEpoch: claim.leaseEpoch,
    event: { type: "dispatch_started" },
    allowProviderWrite: true,
    now: Date.now() + 1,
  });
  applyNotebookLmConnectorEvent({
    connector: owner,
    requestId: queued.request.requestId,
    leaseToken: claim.leaseToken,
    leaseEpoch: claim.leaseEpoch,
    event: { type: "create_uncertain", reason: "timeout" },
    allowProviderWrite: true,
    now: Date.now() + 2,
  });

  let response = await DELETE(
    request(item.id, "DELETE", {
      body: {
        mode: "stop_checking",
        requestId: queued.request.requestId,
        acknowledgeSourceMayExist: false,
      },
    }),
    context(item.id),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_request" });

  response = await DELETE(
    request(item.id, "DELETE", {
      body: {
        mode: "stop_checking",
        requestId: queued.request.requestId,
        acknowledgeSourceMayExist: true,
      },
    }),
    context(item.id),
  );
  assert.equal(response.status, 200);
  const stopped = await response.json();
  assert.equal(stopped.cancelled, false);
  assert.equal(stopped.checkingStopped, true);
  assert.equal(stopped.request.state, "reconciliation_required");
  assert.equal(stopped.request.phase, "terminal");
  assert.equal(stopped.request.possiblyDelivered, true);
  assert.equal(stopped.request.canCancel, false);
  const stored = getDb()
    .prepare("SELECT * FROM notebooklm_export_requests WHERE id=?")
    .get(queued.request.requestId) as {
      payload_title: string | null;
      payload_text: string | null;
      attempt_count: number;
      create_dispatched_at: number | null;
    };
  assert.equal(stored.payload_title, null);
  assert.equal(stored.payload_text, null);
  assert.equal(stored.attempt_count, 1);
  assert.ok(stored.create_dispatched_at);
});
