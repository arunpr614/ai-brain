/**
 * T-10 tests — provider-offline preflight on /api/ask.
 *
 * Setup points OLLAMA_HOST at 127.0.0.1:1 (closed port) so isOllamaAlive()
 * consistently returns false. The route should short-circuit with a
 * 503 + LLM_PROVIDER_OFFLINE error frame BEFORE attempting retrieve or stream.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./route.test.setup";
import { NextRequest } from "next/server";
import { issueSessionToken, setPin } from "@/lib/auth";
import { POST } from "./route";

setPin("1234");

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

function mockRequest(
  body: unknown,
  cookieValue: string | null = issueSessionToken(),
): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (cookieValue) {
    headers.set("cookie", `brain-session=${cookieValue}`);
  }
  return new NextRequest("http://localhost/api/ask", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

test("returns 401 when no session cookie", async () => {
  const req = mockRequest({ question: "test" }, null);
  const res = await POST(req);
  assert.equal(res.status, 401);
  const body = await res.text();
  assert.match(body, /UNAUTHENTICATED/);
});

test("returns 401 when the session cookie is unsigned", async () => {
  const req = mockRequest({ question: "test" }, "stub-session");
  const res = await POST(req);
  assert.equal(res.status, 401);
  const body = await res.text();
  assert.match(body, /UNAUTHENTICATED/);
});

test("returns 503 LLM_PROVIDER_OFFLINE when provider unreachable", async () => {
  const req = mockRequest({ question: "what did I save about growth loops?" });
  const res = await POST(req);
  assert.equal(res.status, 503);
  assert.match(
    res.headers.get("content-type") ?? "",
    /text\/event-stream/,
  );
  const body = await res.text();
  assert.match(body, /LLM_PROVIDER_OFFLINE/);
  assert.match(body, /OLLAMA_OFFLINE/);
  assert.match(body, /AI provider/);
});

test("returns 400 BAD_REQUEST on malformed body", async () => {
  const req = mockRequest({ not_a_question: true });
  const res = await POST(req);
  assert.equal(res.status, 400);
  const body = await res.text();
  assert.match(body, /BAD_REQUEST/);
});

test("returns 400 when scope=item but item_id missing", async () => {
  const req = mockRequest({ question: "q", scope: "item" });
  const res = await POST(req);
  assert.equal(res.status, 400);
  const body = await res.text();
  assert.match(body, /item_id/);
});

test("returns 400 when scope=items but item_ids missing", async () => {
  const req = mockRequest({ question: "q", scope: "items" });
  const res = await POST(req);
  assert.equal(res.status, 400);
  const body = await res.text();
  assert.match(body, /item_ids/);
});

test("returns 400 when scope=items has too many ids", async () => {
  const req = mockRequest({
    question: "q",
    scope: "items",
    item_ids: Array.from({ length: 51 }, (_, index) => `item-${index}`),
  });
  const res = await POST(req);
  assert.equal(res.status, 400);
  const body = await res.text();
  assert.match(body, /BAD_REQUEST/);
});
