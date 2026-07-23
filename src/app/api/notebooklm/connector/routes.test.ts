import "./routes.test.setup";

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rmSync } from "node:fs";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { createNotebookLmExportRequest, getNotebookLmExportRequest } from "@/db/notebooklm-export";
import {
  authenticateNotebookLmConnector,
  createConnectorPairingCode,
  exchangeConnectorPairingCode,
} from "@/lib/notebooklm/connector-auth";
import { OPTIONS as bindOptions, POST as bindPost } from "./bind/route";
import { OPTIONS as claimOptions, POST as claimPost } from "./claim/route";
import { OPTIONS as eventOptions, POST as eventPost } from "./requests/[id]/events/route";
import {
  OPTIONS as exchangeOptions,
  POST as exchangePost,
} from "../connectors/exchange/route";
import { TEST_API_TOKEN, TEST_DB_DIR } from "./routes.test.setup";
import {
  NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
  NOTEBOOKLM_SAFE_TARGET_LABEL,
} from "@/lib/notebooklm/contracts";

const ORIGIN = `chrome-extension://${"a".repeat(32)}`;
const OTHER_ORIGIN = `chrome-extension://${"b".repeat(32)}`;
let ipSequence = 0;

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
  path: string,
  options: {
    method?: "POST" | "OPTIONS";
    origin?: string | null;
    token?: string | null;
    protocol?: string | null;
    body?: unknown;
    rawBody?: string;
    contentType?: string | null;
  } = {},
): NextRequest {
  const headers = new Headers();
  if (options.origin !== null) headers.set("origin", options.origin ?? ORIGIN);
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  if (options.protocol !== null) {
    headers.set(
      "x-notebooklm-connector-protocol",
      options.protocol ?? String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION),
    );
  }
  const contentType = options.contentType === undefined ? "application/json" : options.contentType;
  if (contentType) headers.set("content-type", contentType);
  ipSequence += 1;
  headers.set("x-forwarded-for", `203.0.113.${(ipSequence % 200) + 1}`);
  const body = options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
  return new NextRequest(`https://brain.example${path}`, {
    method: options.method ?? "POST",
    headers,
    body,
  });
}

function pair(now = 1_700_300_000_000) {
  const pairing = createConnectorPairingCode({ now });
  const exchanged = exchangeConnectorPairingCode({
    code: pairing.code,
    origin: ORIGIN,
    protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
    now: now + 1,
  });
  assert.equal(exchanged.ok, true);
  if (!exchanged.ok) throw new Error("synthetic exchange failed");
  const authenticated = authenticateNotebookLmConnector({
    authorization: `Bearer ${exchanged.connectorToken}`,
    origin: ORIGIN,
    protocolVersion: String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION),
    now: now + 2,
  });
  assert.equal(authenticated.ok, true);
  if (!authenticated.ok) throw new Error("synthetic auth failed");
  return { token: exchanged.connectorToken, connector: authenticated.connector };
}

function bindingBody(overrides: Record<string, unknown> = {}) {
  return {
    bindingVersion: 0,
    safeLabel: NOTEBOOKLM_SAFE_TARGET_LABEL,
    localBindingFingerprint: "a".repeat(64),
    subjectFingerprint: "b".repeat(64),
    sharingPosture: "private",
    sourceCount: 1,
    sourceLimit: 50,
    reserveCount: 5,
    ...overrides,
  };
}

async function bindThroughRoute(token: string) {
  const response = await bindPost(
    req("/api/notebooklm/connector/bind", { token, body: bindingBody() }),
  );
  assert.equal(response.status, 200);
  return response;
}

function ensureItem(id: string) {
  getDb().prepare(
    `INSERT OR IGNORE INTO items(id,source_type,title,body,captured_at)
     VALUES(?,'note','Synthetic connector-route item','Synthetic body',?)`,
  ).run(id, Date.now());
}

test("CORS preflight reflects only an exact Chrome extension origin", async () => {
  for (const handler of [exchangeOptions, bindOptions, claimOptions, eventOptions]) {
    const accepted = handler(
      req("/api/notebooklm/connector/test", { method: "OPTIONS", origin: ORIGIN }),
    );
    assert.equal(accepted.status, 204);
    assert.equal(accepted.headers.get("access-control-allow-origin"), ORIGIN);
    assert.match(accepted.headers.get("access-control-allow-methods") ?? "", /POST/);
    assert.match(accepted.headers.get("access-control-allow-headers") ?? "", /authorization/);
    assert.match(accepted.headers.get("access-control-allow-headers") ?? "", /x-notebooklm-connector-protocol/);
    assert.equal(accepted.headers.get("access-control-allow-credentials"), null);
    assert.equal(accepted.headers.get("vary"), "Origin");

    for (const invalid of [null, "https://evil.example", `chrome-extension://${"q".repeat(32)}`]) {
      const rejected = handler(
        req("/api/notebooklm/connector/test", { method: "OPTIONS", origin: invalid }),
      );
      assert.equal(rejected.status, 403);
      assert.equal(rejected.headers.get("access-control-allow-origin"), null);
    }
  }
});

test("pairing exchange is origin-bound, one-time, CORS-safe, and does not reveal the server token", async () => {
  const now = Date.now();
  const pairing = createConnectorPairingCode({ now });
  const response = await exchangePost(
    req("/api/notebooklm/connectors/exchange", {
      origin: ORIGIN,
      body: { code: pairing.code, label: "Synthetic browser", protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION },
    }),
  );
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("access-control-allow-origin"), ORIGIN);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.match(body.connectorId, /^[a-f0-9]{24}$/);
  assert.match(body.connectorToken, /^[a-f0-9]{64}$/);
  assert.notEqual(body.connectorToken, TEST_API_TOKEN);
  assert.equal(JSON.stringify(body).includes(TEST_API_TOKEN), false);

  const replay = await exchangePost(
    req("/api/notebooklm/connectors/exchange", {
      origin: ORIGIN,
      body: { code: pairing.code, protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION },
    }),
  );
  assert.equal(replay.status, 410);
  assert.deepEqual(await replay.json(), { error: "used_code" });

  const noOriginCode = createConnectorPairingCode({ now: now + 10 });
  const noOrigin = await exchangePost(
    req("/api/notebooklm/connectors/exchange", {
      origin: null,
      body: { code: noOriginCode.code, protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION },
    }),
  );
  assert.equal(noOrigin.status, 403);
  assert.deepEqual(await noOrigin.json(), { error: "invalid_origin" });
});

test("concurrent exchange of one code creates exactly one live connector", async () => {
  const pairing = createConnectorPairingCode({ now: Date.now() });
  const makeRequest = () => exchangePost(
    req("/api/notebooklm/connectors/exchange", {
      origin: ORIGIN,
      body: { code: pairing.code, label: "Concurrent synthetic browser", protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION },
    }),
  );
  const responses = await Promise.all([makeRequest(), makeRequest()]);
  assert.deepEqual(responses.map((response) => response.status).sort((a, b) => a - b), [201, 410]);
  const bodies = await Promise.all(responses.map((response) => response.json()));
  assert.equal(bodies.filter((body) => body.ok === true).length, 1);
  assert.equal(bodies.filter((body) => body.error === "used_code").length, 1);
  assert.equal(
    (getDb().prepare("SELECT COUNT(*) count FROM notebooklm_connectors WHERE state != 'revoked'").get() as { count: number }).count,
    1,
  );
  assert.equal(
    (getDb().prepare("SELECT COUNT(*) count FROM notebooklm_connectors").get() as { count: number }).count,
    1,
  );
});

test("connector handlers reject missing credentials, origin swaps, and protocol drift", async () => {
  const { token } = pair();
  const missing = await claimPost(req("/api/notebooklm/connector/claim", { body: {} }));
  assert.equal(missing.status, 401);
  assert.deepEqual(await missing.json(), { error: "missing_authorization" });

  const swapped = await claimPost(
    req("/api/notebooklm/connector/claim", { token, origin: OTHER_ORIGIN, body: {} }),
  );
  assert.equal(swapped.status, 403);
  assert.deepEqual(await swapped.json(), { error: "origin_mismatch" });

  const drift = await claimPost(
    req("/api/notebooklm/connector/claim", {
      token,
      protocol: String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION + 1),
      body: {},
    }),
  );
  assert.equal(drift.status, 426);
  assert.deepEqual(await drift.json(), {
    error: "protocol_mismatch",
    expectedProtocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
  });
});

test("binding blocks non-private targets and returns no raw binding or subject fingerprint", async () => {
  const { token } = pair();
  let response = await bindPost(
    req("/api/notebooklm/connector/bind", {
      token,
      body: bindingBody({ safeLabel: "My actual notebook title" }),
    }),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_request" });

  response = await bindPost(
    req("/api/notebooklm/connector/bind", {
      token,
      body: bindingBody({ sharingPosture: "shared" }),
    }),
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "target_not_private" });
  assert.equal(getDb().prepare("SELECT 1 FROM notebooklm_targets").get(), undefined);

  response = await bindPost(
    req("/api/notebooklm/connector/bind", { token, body: bindingBody() }),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.bound, true);
  assert.equal(body.target.bindingVersion, 1);
  assert.equal(body.target.sharingPosture, "private");
  assert.equal(body.target.safeSlots, 44);
  assert.equal(JSON.stringify(body).includes("a".repeat(64)), false);
  assert.equal(JSON.stringify(body).includes("b".repeat(64)), false);
});

test("binding accepts the internal envelope for a 259 safe limit and rejects values above it", async () => {
  const atCeiling = pair();
  let response = await bindPost(
    req("/api/notebooklm/connector/bind", {
      token: atCeiling.token,
      body: bindingBody({ sourceLimit: 264 }),
    }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).target.safeSlots, 258);

  response = await bindPost(
    req("/api/notebooklm/connector/bind", {
      token: atCeiling.token,
      body: bindingBody({ sourceLimit: 265 }),
    }),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_request" });
});

test("bind endpoint recovers lost initial and rebind responses only for the exact proof", async () => {
  const { token } = pair();
  const initialProof = bindingBody();

  let response = await bindPost(
    req("/api/notebooklm/connector/bind", { token, body: initialProof }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).target.bindingVersion, 1);

  response = await bindPost(
    req("/api/notebooklm/connector/bind", {
      token,
      body: { ...initialProof, bindingVersion: 0, sourceCount: 2 },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).target.bindingVersion, 1);

  const reboundProof = bindingBody({
    bindingVersion: 1,
    localBindingFingerprint: "c".repeat(64),
    subjectFingerprint: "d".repeat(64),
  });
  response = await bindPost(
    req("/api/notebooklm/connector/bind", { token, body: reboundProof }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).target.bindingVersion, 2);

  response = await bindPost(
    req("/api/notebooklm/connector/bind", {
      token,
      body: { ...reboundProof, bindingVersion: 1, sourceCount: 3 },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).target.bindingVersion, 2);

  response = await bindPost(
    req("/api/notebooklm/connector/bind", {
      token,
      body: {
        ...reboundProof,
        bindingVersion: 1,
        subjectFingerprint: "e".repeat(64),
      },
    }),
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "invalid_binding" });
  assert.equal(
    (getDb().prepare("SELECT COUNT(*) count FROM notebooklm_targets").get() as { count: number }).count,
    2,
  );
});

test("claim validates a strict empty body and returns 204 while no authorized work exists", async () => {
  const { token } = pair();
  await bindThroughRoute(token);
  let response = await claimPost(
    req("/api/notebooklm/connector/claim", { token, body: { extra: true } }),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_request" });

  response = await claimPost(req("/api/notebooklm/connector/claim", { token, body: {} }));
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("retry-after"), "15");
  assert.equal(response.headers.get("access-control-allow-origin"), ORIGIN);
});

test("provider-write kill switch withholds create claims but keeps reconciliation claims available", async () => {
  const { token } = pair();
  await bindThroughRoute(token);
  const text = "# Synthetic route payload\n\nBody";
  ensureItem("connector-route-item");
  const queued = createNotebookLmExportRequest({
    itemId: "connector-route-item",
    idempotencyKey: "connector_route_idem_0001",
    mappedTitle: "Synthetic route payload",
    mappedText: text,
    contentHash: crypto.createHash("sha256").update(text).digest("hex"),
    payloadBytes: Buffer.byteLength(text),
    payloadWords: text.split(/\s+/u).length,
    limitedCapture: false,
  });

  process.env.BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED = "0";
  let response = await claimPost(req("/api/notebooklm/connector/claim", { token, body: {} }));
  assert.equal(response.status, 204);
  assert.equal(getNotebookLmExportRequest(queued.request.id)?.state, "queued");

  process.env.BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED = "1";
  response = await claimPost(req("/api/notebooklm/connector/claim", { token, body: {} }));
  assert.equal(response.status, 200);
  const claimed = await response.json();
  assert.equal(claimed.claim.action, "create");
  assert.match(claimed.claim.source.title, /AI-MEM-/);
  assert.equal(claimed.claim.source.text, text);

  let eventResponse = await eventPost(
    req(`/api/notebooklm/connector/requests/${queued.request.id}/events`, {
      token,
      body: {
        leaseToken: claimed.claim.leaseToken,
        leaseEpoch: claimed.claim.leaseEpoch,
        event: { type: "dispatch_started" },
      },
    }),
    { params: Promise.resolve({ id: queued.request.id }) },
  );
  assert.equal(eventResponse.status, 409);
  assert.deepEqual(await eventResponse.json(), { error: "invalid_transition" });
  assert.equal(getNotebookLmExportRequest(queued.request.id)?.attempt_count, 0);

  eventResponse = await eventPost(
    req(`/api/notebooklm/connector/requests/${queued.request.id}/events`, {
      token,
      body: {
        leaseToken: claimed.claim.leaseToken,
        leaseEpoch: claimed.claim.leaseEpoch,
        event: {
          type: "preflight_ok",
          sourceCount: 1,
          sourceLimit: 50,
          sharingPosture: "private",
        },
      },
    }),
    { params: Promise.resolve({ id: queued.request.id }) },
  );
  assert.equal(eventResponse.status, 200);
  assert.equal((await eventResponse.json()).dispatchAuthorized, false);

  process.env.BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED = "0";
  eventResponse = await eventPost(
    req(`/api/notebooklm/connector/requests/${queued.request.id}/events`, {
      token,
      body: {
        leaseToken: claimed.claim.leaseToken,
        leaseEpoch: claimed.claim.leaseEpoch,
        event: { type: "dispatch_started" },
      },
    }),
    { params: Promise.resolve({ id: queued.request.id }) },
  );
  assert.equal(eventResponse.status, 503);
  assert.deepEqual(await eventResponse.json(), { error: "provider_writes_disabled" });
  assert.equal(getNotebookLmExportRequest(queued.request.id)?.state, "leased");
  assert.equal(getNotebookLmExportRequest(queued.request.id)?.attempt_count, 0);

  process.env.BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED = "1";
  eventResponse = await eventPost(
    req(`/api/notebooklm/connector/requests/${queued.request.id}/events`, {
      token,
      body: {
        leaseToken: claimed.claim.leaseToken,
        leaseEpoch: claimed.claim.leaseEpoch,
        event: { type: "dispatch_started" },
      },
    }),
    { params: Promise.resolve({ id: queued.request.id }) },
  );
  assert.equal(eventResponse.status, 200);
  const dispatched = await eventResponse.json();
  assert.equal(dispatched.accepted, true);
  assert.equal(dispatched.dispatchAuthorized, true);
  assert.equal(dispatched.request.state, "sending");
  assert.equal(JSON.stringify(dispatched).includes(text), false);
  assert.equal(JSON.stringify(dispatched).includes(claimed.claim.leaseToken), false);

  process.env.BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED = "0";
  eventResponse = await eventPost(
    req(`/api/notebooklm/connector/requests/${queued.request.id}/events`, {
      token,
      body: {
        leaseToken: claimed.claim.leaseToken,
        leaseEpoch: claimed.claim.leaseEpoch,
        event: { type: "create_uncertain", reason: "timeout" },
      },
    }),
    { params: Promise.resolve({ id: queued.request.id }) },
  );
  assert.equal(eventResponse.status, 200);
  assert.equal((await eventResponse.json()).request.state, "reconciling");

  response = await claimPost(req("/api/notebooklm/connector/claim", { token, body: {} }));
  assert.equal(response.status, 204);
  getDb().prepare(
    "UPDATE notebooklm_export_requests SET next_attempt_at=? WHERE id=?",
  ).run(Date.now() - 1, queued.request.id);
  response = await claimPost(req("/api/notebooklm/connector/claim", { token, body: {} }));
  assert.equal(response.status, 200);
  const reconcile = await response.json();
  assert.equal(reconcile.claim.action, "reconcile");
  assert.equal(reconcile.claim.source.title, null);
  assert.equal(reconcile.claim.source.text, null);

  eventResponse = await eventPost(
    req(`/api/notebooklm/connector/requests/${queued.request.id}/events`, {
      token,
      body: {
        leaseToken: reconcile.claim.leaseToken,
        leaseEpoch: reconcile.claim.leaseEpoch,
        event: {
          type: "reconcile_result",
          matches: 1,
          sourceAlias: "d".repeat(64),
          providerStatus: "failed",
        },
      },
    }),
    { params: Promise.resolve({ id: queued.request.id }) },
  );
  assert.equal(eventResponse.status, 200);
  const failed = await eventResponse.json();
  assert.equal(failed.request.state, "processing_failed");
  assert.equal(failed.request.phase, "terminal");
  const failedRow = getNotebookLmExportRequest(queued.request.id)!;
  assert.equal(failedRow.provider_status, "failed");
  assert.equal(failedRow.safe_reason, "provider_processing_failed");
});

test("event schema rejects unknown fields and inconsistent reconcile evidence before mutating state", async () => {
  const { token } = pair();
  await bindThroughRoute(token);
  const text = "Strict schema payload";
  ensureItem("strict-schema-item");
  const queued = createNotebookLmExportRequest({
    itemId: "strict-schema-item",
    idempotencyKey: "strict_schema_idem_0001",
    mappedTitle: "Strict",
    mappedText: text,
    contentHash: crypto.createHash("sha256").update(text).digest("hex"),
    payloadBytes: Buffer.byteLength(text),
    payloadWords: 3,
    limitedCapture: false,
  });
  const claimResponse = await claimPost(
    req("/api/notebooklm/connector/claim", { token, body: {} }),
  );
  const claim = (await claimResponse.json()).claim;

  const invalidBodies = [
    {
      leaseToken: claim.leaseToken,
      leaseEpoch: claim.leaseEpoch,
      event: { type: "dispatch_started", extra: true },
    },
    {
      leaseToken: claim.leaseToken,
      leaseEpoch: claim.leaseEpoch,
      event: { type: "reconcile_result", matches: 1 },
    },
    {
      leaseToken: claim.leaseToken,
      leaseEpoch: claim.leaseEpoch,
      event: { type: "reconcile_result", matches: 0, sourceAlias: "d".repeat(64) },
    },
  ];
  for (const body of invalidBodies) {
    const response = await eventPost(
      req(`/api/notebooklm/connector/requests/${queued.request.id}/events`, { token, body }),
      { params: Promise.resolve({ id: queued.request.id }) },
    );
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid_request" });
  }
  const row = getNotebookLmExportRequest(queued.request.id)!;
  assert.equal(row.state, "leased");
  assert.equal(row.attempt_count, 0);
  assert.equal(row.create_dispatched_at, null);
});
