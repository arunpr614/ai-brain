import "./routes.test.setup";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rmSync } from "node:fs";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { setPin, issueSessionToken } from "@/lib/auth";
import { insertCaptured } from "@/db/items";
import { getDb } from "@/db/client";
import { runProcessingDeepAudit } from "@/db/processing-readiness";
import {
  __resetProcessingWriteRateLimitForTests,
  processingWriteGate,
} from "@/lib/processing/http";
import { TEST_DB_DIR } from "./routes.test.setup";
import { GET as summaryGet } from "./summary/route";
import { GET as itemsGet } from "./items/route";
import { GET as groupsGet } from "./board-groups/route";
import { GET as boardItemsGet } from "./board-items/route";
import { GET as filtersGet } from "./filters/route";
import { GET as timezoneGet, PUT as timezonePut } from "./preferences/timezone/route";
import { GET as workflowGet, PATCH as workflowPatch } from "../items/[id]/workflow/route";
import { POST as undoPost } from "../items/[id]/workflow/undo/route";
import { GET as mutationGet } from "./mutations/[mutationId]/route";
import { POST as enrollmentStart } from "./enrollment/jobs/route";

let session = "";
let itemId = "";

function request(path: string, options: {
  method?: string; session?: string; bearer?: string; origin?: string; body?: unknown;
} = {}) {
  const headers = new Headers();
  if (options.session) headers.set("cookie", `brain-session=${options.session}`);
  if (options.bearer) headers.set("authorization", `Bearer ${options.bearer}`);
  if (options.origin) headers.set("origin", options.origin);
  if (options.body !== undefined) headers.set("content-type", "application/json");
  return new NextRequest(`https://brain.test${path}`, {
    method: options.method ?? "GET", headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

function assertPrivate(response: Response) {
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(response.headers.get("vary"), "Cookie");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}

test.before(() => {
  setPin("1234");
  session = issueSessionToken();
  itemId = insertCaptured({ source_type: "note", title: "Private source", body: "Private body" }).id;
  assert.equal(runProcessingDeepAudit({ appSha: "test" }).ok, true);
});

test.after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

test("all Processing reads are handler-session-only and private", async () => {
  const unauth = await summaryGet(request("/api/processing/summary"));
  assert.equal(unauth.status, 401); assertPrivate(unauth);
  const bearerOnly = await summaryGet(request("/api/processing/summary", { bearer: "valid-looking-token" }));
  assert.equal(bearerOnly.status, 401); assertPrivate(bearerOnly);

  const calls: Array<() => Promise<Response>> = [
    () => summaryGet(request("/api/processing/summary", { session })),
    () => itemsGet(request("/api/processing/items?view=inbox&limit=10", { session })),
    () => groupsGet(request("/api/processing/board-groups?group=workflow_status", { session })),
    () => boardItemsGet(request("/api/processing/board-items?group=workflow_status&groupKey=inbox", { session })),
    () => filtersGet(request("/api/processing/filters", { session })),
    () => timezoneGet(request("/api/processing/preferences/timezone", { session })),
    () => workflowGet(request(`/api/items/${itemId}/workflow`, { session }), { params: Promise.resolve({ id: itemId }) }),
  ];
  for (const call of calls) {
    const response = await call();
    assert.equal(response.status, 200);
    assertPrivate(response);
  }
});

test("workflow writes require exact Origin before durable work", async () => {
  const mutationId = crypto.randomUUID();
  const body = {
    mutationId, actorTabId: crypto.randomUUID(), expectedVersion: 1,
    action: { type: "move", status: "done" },
  };
  const configuredOrigin = process.env.BRAIN_PUBLIC_ORIGIN;
  delete process.env.BRAIN_PUBLIC_ORIGIN;
  try {
    const unconfigured = await workflowPatch(request(`/api/items/${itemId}/workflow`, {
      method: "PATCH", session, origin: "https://brain.test", body,
    }), { params: Promise.resolve({ id: itemId }) });
    assert.equal(unconfigured.status, 503); assertPrivate(unconfigured);
    assert.deepEqual(await unconfigured.json(), { error: "processing_misconfigured" });
  } finally {
    process.env.BRAIN_PUBLIC_ORIGIN = configuredOrigin;
  }
  const cross = await workflowPatch(request(`/api/items/${itemId}/workflow`, {
    method: "PATCH", session, origin: "https://evil.test", body,
  }), { params: Promise.resolve({ id: itemId }) });
  assert.equal(cross.status, 403); assertPrivate(cross);

  const good = await workflowPatch(request(`/api/items/${itemId}/workflow`, {
    method: "PATCH", session, origin: "https://brain.test", body,
  }), { params: Promise.resolve({ id: itemId }) });
  assert.equal(good.status, 200); assertPrivate(good);
  const payload = await good.json();
  assert.equal(payload.item.status, "done");

  const lookup = await mutationGet(request(`/api/processing/mutations/${mutationId}?itemId=${itemId}&actorTabId=${body.actorTabId}`, { session }),
    { params: Promise.resolve({ mutationId }) });
  assert.equal(lookup.status, 200); assertPrivate(lookup);

  const undone = await undoPost(request(`/api/items/${itemId}/workflow/undo`, {
    method: "POST", session, origin: "https://brain.test",
    body: { mutationId: crypto.randomUUID(), actorTabId: body.actorTabId, expectedVersion: 2, targetEventUuid: payload.receipt.acceptedEventUuid },
  }), { params: Promise.resolve({ id: itemId }) });
  assert.equal(undone.status, 200); assertPrivate(undone);
});

test("malformed requests stay normalized and private", async () => {
  const malformed = await workflowPatch(new NextRequest(`https://brain.test/api/items/${itemId}/workflow`, {
    method: "PATCH", headers: { cookie: `brain-session=${session}`, origin: "https://brain.test", "content-type": "application/json" }, body: "{",
  }), { params: Promise.resolve({ id: itemId }) });
  assert.equal(malformed.status, 400); assertPrivate(malformed);
  assert.deepEqual(await malformed.json(), { error: "invalid_json" });

  const oversizedBody = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`{"padding":"${"x".repeat(17_000)}`));
      controller.enqueue(new TextEncoder().encode('"}'));
      controller.close();
    },
  });
  const oversized = await workflowPatch(new NextRequest(`https://brain.test/api/items/${itemId}/workflow`, {
    method: "PATCH",
    headers: { cookie: `brain-session=${session}`, origin: "https://brain.test", "content-type": "application/json" },
    body: oversizedBody,
  }), { params: Promise.resolve({ id: itemId }) });
  assert.equal(oversized.status, 413); assertPrivate(oversized);
  assert.deepEqual(await oversized.json(), { error: "request_too_large" });

  const bearerBadSession = await summaryGet(request("/api/processing/summary", { session: "invalid", bearer: "valid-looking-token" }));
  assert.equal(bearerBadSession.status, 401); assertPrivate(bearerBadSession);
});

test("valid-session Processing writes are rate-limited before durable work", async () => {
  const previous = process.env.BRAIN_PROCESSING_WRITE_RATE_LIMIT;
  process.env.BRAIN_PROCESSING_WRITE_RATE_LIMIT = "2";
  __resetProcessingWriteRateLimitForTests();
  try {
    const first = processingWriteGate(request(`/api/items/${itemId}/workflow`, {
      method: "PATCH", session, origin: "https://brain.test",
    }));
    const second = processingWriteGate(request(`/api/items/${itemId}/workflow`, {
      method: "PATCH", session, origin: "https://brain.test",
    }));
    const limited = processingWriteGate(request(`/api/items/${itemId}/workflow`, {
      method: "PATCH", session, origin: "https://brain.test",
    }));
    assert.equal(first, null);
    assert.equal(second, null);
    assert.equal(limited?.status, 429);
    assertPrivate(limited!);
    assert.equal(limited?.headers.get("retry-after"), "60");
    assert.deepEqual(await limited?.json(), { error: "rate_limited" });
  } finally {
    if (previous === undefined) delete process.env.BRAIN_PROCESSING_WRITE_RATE_LIMIT;
    else process.env.BRAIN_PROCESSING_WRITE_RATE_LIMIT = previous;
    __resetProcessingWriteRateLimitForTests();
  }
});

test("timezone preference is CAS, idempotent, and private", async () => {
  const mutationId = crypto.randomUUID();
  const changed = await timezonePut(request("/api/processing/preferences/timezone", {
    method: "PUT", session, origin: "https://brain.test",
    body: { timezone: "Asia/Kolkata", expectedVersion: 0, mutationId },
  }));
  assert.equal(changed.status, 200); assertPrivate(changed);
  const first = await changed.json();
  assert.equal(first.preference.timezone, "Asia/Kolkata");
  assert.equal(first.preference.version, 1);
  const replay = await timezonePut(request("/api/processing/preferences/timezone", {
    method: "PUT", session, origin: "https://brain.test",
    body: { timezone: "Asia/Kolkata", expectedVersion: 0, mutationId },
  }));
  assert.equal((await replay.json()).replayed, true);
  const conflict = await timezonePut(request("/api/processing/preferences/timezone", {
    method: "PUT", session, origin: "https://brain.test",
    body: { timezone: "UTC", expectedVersion: 0, mutationId: crypto.randomUUID() },
  }));
  assert.equal(conflict.status, 409); assertPrivate(conflict);
});

test("red or stale readiness fails closed with private unavailable truth", async () => {
  getDb().prepare("UPDATE processing_runtime_state SET readiness_state='red',failure_code='test_red' WHERE singleton=1").run();
  const red = await summaryGet(request("/api/processing/summary", { session }));
  assert.equal(red.status, 503); assertPrivate(red);
  assert.equal((await red.json()).reason, "red");
  assert.equal(runProcessingDeepAudit({ appSha: "test" }).ok, true);
  getDb().prepare("UPDATE processing_runtime_state SET readiness_state='green',last_deep_success_at=0 WHERE singleton=1").run();
  const stale = await summaryGet(request("/api/processing/summary", { session }));
  assert.equal(stale.status, 503); assertPrivate(stale);
  assert.equal((await stale.json()).reason, "stale");
  assert.equal(runProcessingDeepAudit({ appSha: "test" }).ok, true);
});

test("recent enrollment with every source already enrolled returns a typed empty preview", async () => {
  const response = await enrollmentStart(request("/api/processing/enrollment/jobs", {
    method: "POST", session, origin: "https://brain.test", body: { mode: "recent" },
  }));
  assert.equal(response.status, 201); assertPrivate(response);
  const body = await response.json();
  assert.equal(body.job.state, "previewing");
  await new Promise((resolve) => setImmediate(resolve));
  // Background materialization is bounded and completes the empty snapshot.
  const { getEnrollmentJob } = await import("@/db/processing-enrollment");
  const ready = getEnrollmentJob(body.job.id)!;
  assert.equal(ready.state, "preview_ready");
  assert.equal(ready.frozenCount, 0);
});
