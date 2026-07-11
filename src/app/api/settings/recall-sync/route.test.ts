import "./route.test.setup";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { issueSessionToken, setPin } from "@/lib/auth";
import { getDb } from "@/db/client";
import { RECALL_REQUEST_COOLDOWN_MS } from "@/db/recall-manual-sync";
import { GET, POST } from "./route";
import { TEST_DIR } from "./route.test.setup";

setPin("1234");
after(() => rmSync(TEST_DIR, { recursive: true, force: true }));

function request(method: "GET" | "POST", body?: unknown, options: { auth?: boolean; origin?: string | null } = {}) {
  const headers = new Headers();
  if (options.auth !== false) headers.set("cookie", `brain-session=${issueSessionToken()}`);
  if (method === "POST") headers.set("content-type", "application/json");
  if (method === "POST" && options.origin !== null) headers.set("origin", options.origin ?? "http://localhost");
  return new NextRequest("http://localhost/api/settings/recall-sync", {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("Recall status authenticates before feature evaluation and is private", async () => {
  process.env.BRAIN_RECALL_MANUAL_SYNC_UI_ENABLED = "0";
  const denied = await GET(request("GET", undefined, { auth: false }));
  assert.equal(denied.status, 401);
  const allowed = await GET(request("GET"));
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).enabled, false);
  assert.match(allowed.headers.get("cache-control") ?? "", /private.*no-store/);
  process.env.BRAIN_RECALL_MANUAL_SYNC_UI_ENABLED = "1";
});

test("POST enforces auth, availability, exact origin and a strict bounded body", async () => {
  assert.equal((await POST(request("POST", { idempotencyKey: "key_abcdefghijklmnop" }, { auth: false }))).status, 401);
  process.env.BRAIN_RECALL_MANUAL_WORKER_CONFIGURED = "0";
  assert.equal((await POST(request("POST", { idempotencyKey: "key_abcdefghijklmnop" }))).status, 503);
  process.env.BRAIN_RECALL_MANUAL_WORKER_CONFIGURED = "1";
  assert.equal((await POST(request("POST", { idempotencyKey: "key_abcdefghijklmnop" }, { origin: null }))).status, 403);
  assert.equal((await POST(request("POST", { idempotencyKey: "key_abcdefghijklmnop" }, { origin: "https://evil.example" }))).status, 403);
  assert.equal((await POST(request("POST", { idempotencyKey: "short", extra: true }))).status, 400);
  const cookie = `brain-session=${issueSessionToken()}`;
  const oversized = new NextRequest("http://localhost/api/settings/recall-sync", {
    method: "POST",
    headers: { cookie, origin: "http://localhost", "content-type": "application/json" },
    body: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("x".repeat(257))); controller.close(); } }),
  });
  assert.equal((await POST(oversized)).status, 400);
  const json = JSON.stringify({ idempotencyKey: "key_streamboundary123" });
  const exact = `${json}${" ".repeat(256 - Buffer.byteLength(json))}`;
  const exactBoundary = new NextRequest("http://localhost/api/settings/recall-sync", {
    method: "POST",
    headers: { cookie, origin: "http://localhost", "content-type": "application/json" },
    body: exact,
  });
  assert.equal((await POST(exactBoundary)).status, 202);
  getDb().prepare("DELETE FROM recall_sync_requests WHERE idempotency_key = ?").run("key_streamboundary123");
});

test("new and active-deduplicated requests return durable 202 safe DTOs", async () => {
  const first = await POST(request("POST", { idempotencyKey: "key_abcdefghijklmnop" }));
  assert.equal(first.status, 202);
  const firstBody = await first.json();
  assert.equal(firstBody.deduplicated, false);
  assert.equal(firstBody.state, "queued");
  const wakeMarker = join(TEST_DIR, "spool", "wake");
  const firstMarkerInode = statSync(wakeMarker).ino;
  assert.equal(readFileSync(wakeMarker).byteLength, 0);
  const second = await POST(request("POST", { idempotencyKey: "key_qrstuvwxyz12345" }));
  assert.equal(second.status, 202);
  const secondBody = await second.json();
  assert.equal(secondBody.deduplicated, true);
  assert.equal(secondBody.requestId, firstBody.requestId);
  assert.notEqual(statSync(wakeMarker).ino, firstMarkerInode);
  assert.equal(readFileSync(wakeMarker).byteLength, 0);
  assert.deepEqual(Object.keys(secondBody).sort(), ["deduplicated", "observedAt", "requestId", "state"]);
  const differentKeyLookupHeaders = new Headers({
    cookie: `brain-session=${issueSessionToken()}`,
    "x-recall-idempotency-key": "key_qrstuvwxyz12345",
  });
  const differentKeyLookup = await GET(new NextRequest("http://localhost/api/settings/recall-sync", {
    headers: differentKeyLookupHeaders,
  }));
  assert.equal((await differentKeyLookup.json()).idempotencyAcknowledgement.state, "absent");
  const statusResponse = await GET(request("GET"));
  const statusText = await statusResponse.text();
  const safeStatus = JSON.parse(statusText);
  assert.deepEqual(Object.keys(safeStatus).sort(), [
    "activity", "available", "enabled", "idempotencyAcknowledgement", "lastSuccessfulSyncAt", "nextAutomaticSyncAt", "observedAt", "requestAcknowledgement", "retryAfterSeconds",
  ]);
  assert.doesNotMatch(statusText, /report_json|last_error|credential|lock|\/opt\//i);
  const marker = process.env.BRAIN_RECALL_WAKE_MARKER;
  process.env.BRAIN_RECALL_WAKE_MARKER = "/dev/null/wake";
  try {
    const markerFailure = await POST(request("POST", { idempotencyKey: "key_markerfailure123" }));
    assert.equal(markerFailure.status, 202);
    assert.equal((await markerFailure.json()).requestId, firstBody.requestId);
  } finally {
    if (marker === undefined) delete process.env.BRAIN_RECALL_WAKE_MARKER;
    else process.env.BRAIN_RECALL_WAKE_MARKER = marker;
  }
  getDb().prepare("DELETE FROM recall_sync_requests").run();
});

test("terminal idempotency replay is never acknowledged as queued or reactivated", async () => {
  const accepted = await POST(request("POST", { idempotencyKey: "key_terminalreplay123" }));
  assert.equal(accepted.status, 202);
  getDb().prepare(
    `UPDATE recall_sync_requests SET state = 'done', completed_at = ?, safe_reason = NULL,
     cards_imported = 0, cards_upgraded = 0, cards_already_current = 0
     WHERE idempotency_key = ?`,
  ).run(Date.now(), "key_terminalreplay123");
  const marker = join(TEST_DIR, "spool", "wake");
  const before = statSync(marker).ino;
  const cooldownReplay = await POST(request("POST", { idempotencyKey: "key_terminalreplay123" }));
  assert.equal(cooldownReplay.status, 429);
  const cooldownBody = await cooldownReplay.json();
  assert.equal(cooldownBody.error, "cooldown");
  assert.equal(cooldownBody.state, "done");
  assert.notEqual(cooldownBody.state, "queued");
  assert.equal(statSync(marker).ino, before);

  const completedAt = (getDb().prepare("SELECT completed_at AS value FROM recall_sync_requests WHERE idempotency_key = ?").get(
    "key_terminalreplay123",
  ) as { value: number }).value;
  const originalDateNow = Date.now;
  let terminalReplay: Response;
  try {
    Date.now = () => completedAt + RECALL_REQUEST_COOLDOWN_MS + 1;
    terminalReplay = await POST(request("POST", { idempotencyKey: "key_terminalreplay123" }));
  } finally {
    Date.now = originalDateNow;
  }
  assert.equal(terminalReplay!.status, 409);
  assert.equal((await terminalReplay!.json()).error, "terminal_replay");
  assert.equal(statSync(marker).ino, before);

  const lookupHeaders = new Headers({
    cookie: `brain-session=${issueSessionToken()}`,
    "x-recall-idempotency-key": "key_terminalreplay123",
  });
  const lookup = await GET(new NextRequest("http://localhost/api/settings/recall-sync", { headers: lookupHeaders }));
  const lookupBody = await lookup.json();
  assert.deepEqual(lookupBody.idempotencyAcknowledgement, {
    state: "terminal",
    requestId: cooldownBody.requestId,
    activityState: "done",
    resolutionAfterMs: 20_000,
  });
  assert.doesNotMatch(JSON.stringify(lookupBody), /key_terminalreplay123/);
});

test("exact request lookup resolves accepted A after newer B supersedes reduced activity", async () => {
  getDb().prepare("DELETE FROM recall_sync_requests").run();
  const acceptedA = await POST(request("POST", { idempotencyKey: "key_exact_request_a123" }));
  assert.equal(acceptedA.status, 202);
  const bodyA = await acceptedA.json();
  const completedA = Date.now();
  getDb().prepare(
    `UPDATE recall_sync_requests SET state = 'done', completed_at = ?, safe_reason = NULL,
     cards_imported = 0, cards_upgraded = 0, cards_already_current = 0 WHERE id = ?`,
  ).run(completedA, bodyA.requestId);

  const originalDateNow = Date.now;
  let acceptedB: Response;
  try {
    Date.now = () => completedA + RECALL_REQUEST_COOLDOWN_MS + 1;
    acceptedB = await POST(request("POST", { idempotencyKey: "key_exact_request_b123" }));
  } finally {
    Date.now = originalDateNow;
  }
  assert.equal(acceptedB!.status, 202);
  const bodyB = await acceptedB!.json();
  assert.notEqual(bodyB.requestId, bodyA.requestId);

  const exactHeaders = new Headers({
    cookie: `brain-session=${issueSessionToken()}`,
    "x-recall-request-id": bodyA.requestId,
  });
  const whileBActive = await GET(new NextRequest("http://localhost/api/settings/recall-sync", { headers: exactHeaders }));
  const whileBActiveBody = await whileBActive.json();
  assert.deepEqual(whileBActiveBody.requestAcknowledgement, {
    state: "terminal",
    requestId: bodyA.requestId,
    activityState: "done",
  });
  assert.equal(whileBActiveBody.activity.requestId, bodyB.requestId);
  assert.equal(whileBActiveBody.activity.state, "queued");

  const requestedB = (getDb().prepare("SELECT requested_at AS value FROM recall_sync_requests WHERE id = ?").get(
    bodyB.requestId,
  ) as { value: number }).value;
  getDb().prepare(
    `UPDATE recall_sync_requests SET state = 'done', completed_at = ?, safe_reason = NULL,
     cards_imported = 0, cards_upgraded = 0, cards_already_current = 0 WHERE id = ?`,
  ).run(requestedB + 1, bodyB.requestId);
  const afterBTerminal = await GET(new NextRequest("http://localhost/api/settings/recall-sync", { headers: exactHeaders }));
  const afterBTerminalText = await afterBTerminal.text();
  const afterBTerminalBody = JSON.parse(afterBTerminalText);
  assert.equal(afterBTerminalBody.requestAcknowledgement.requestId, bodyA.requestId);
  assert.equal(afterBTerminalBody.requestAcknowledgement.state, "terminal");
  assert.equal(afterBTerminalBody.activity.requestId, bodyB.requestId);
  assert.equal(afterBTerminalBody.activity.state, "done");
  assert.deepEqual(Object.keys(afterBTerminalBody.requestAcknowledgement).sort(), ["activityState", "requestId", "state"]);
  assert.doesNotMatch(afterBTerminalText, /report_json|last_error|credential|lock|\/opt\//i);
  getDb().prepare("DELETE FROM recall_sync_requests").run();
});

test("request-ID lookup is auth-first, bounded, non-echoing, and rejects malicious input", async () => {
  const malicious = "../../etc/passwd?token=secret";
  const unauthenticatedHeaders = new Headers({ "x-recall-request-id": malicious });
  assert.equal((await GET(new NextRequest("http://localhost/api/settings/recall-sync", {
    headers: unauthenticatedHeaders,
  }))).status, 401);
  const maliciousHeaders = new Headers({
    cookie: `brain-session=${issueSessionToken()}`,
    "x-recall-request-id": malicious,
  });
  const rejected = await GET(new NextRequest("http://localhost/api/settings/recall-sync", { headers: maliciousHeaders }));
  assert.equal(rejected.status, 400);
  assert.doesNotMatch(await rejected.text(), /passwd|secret/);

  const absentId = "absentRequest123";
  const absentHeaders = new Headers({
    cookie: `brain-session=${issueSessionToken()}`,
    "x-recall-request-id": absentId,
  });
  const absent = await GET(new NextRequest("http://localhost/api/settings/recall-sync", { headers: absentHeaders }));
  const absentText = await absent.text();
  assert.deepEqual(JSON.parse(absentText).requestAcknowledgement, {
    state: "absent",
    requestId: null,
    activityState: null,
  });
  assert.doesNotMatch(absentText, new RegExp(absentId));
});
