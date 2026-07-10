import "./route.test.setup";

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { insertCaptured } from "@/db/items";
import { issueSessionToken, setPin } from "@/lib/auth";
import { DELETE, GET, PUT } from "./route";
import { TEST_DB_DIR } from "./route.test.setup";

setPin("1234");

after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function request(
  id: string,
  method: "GET" | "PUT" | "DELETE",
  body?: unknown,
  options: { auth?: boolean; origin?: string | null } = {},
) {
  const headers = new Headers();
  if (options.auth !== false) headers.set("cookie", `brain-session=${issueSessionToken()}`);
  if (method !== "GET") headers.set("content-type", "application/json");
  if (options.origin !== null) headers.set("origin", options.origin ?? "http://localhost");
  return new NextRequest(`http://localhost/api/items/${id}/note`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function saveBody(overrides: Record<string, unknown> = {}) {
  return {
    editorInstanceId: "route-editor",
    mutationId: randomUUID(),
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "A private route note",
    saveKind: "auto",
    ...overrides,
  };
}

test("note routes require a verified session and private no-store responses", async () => {
  const item = insertCaptured({ source_type: "url", title: "Auth", body: "source" });
  const denied = await GET(request(item.id, "GET", undefined, { auth: false }), context(item.id));
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get("cache-control"), "private, no-store, max-age=0");

  const allowed = await GET(request(item.id, "GET"), context(item.id));
  assert.equal(allowed.status, 200);
  assert.deepEqual(await allowed.json(), { state: null, note: null });
  assert.equal(allowed.headers.get("vary"), "Cookie");
});

test("note mutations reject missing and foreign origins", async () => {
  const item = insertCaptured({ source_type: "url", title: "Origin", body: "source" });
  const missing = await PUT(
    request(item.id, "PUT", saveBody(), { origin: null }),
    context(item.id),
  );
  assert.equal(missing.status, 403);
  const foreign = await PUT(
    request(item.id, "PUT", saveBody(), { origin: "https://evil.example" }),
    context(item.id),
  );
  assert.equal(foreign.status, 403);
  assert.equal((await foreign.json()).error, "NOTE_CROSS_ORIGIN_FORBIDDEN");
});

test("PUT creates, replays, and exposes immediate canonical state", async () => {
  const item = insertCaptured({ source_type: "url", title: "Create", body: "source" });
  const body = saveBody({ contentMarkdown: "## My thought\r\n\r\nroute keyword" });
  const created = await PUT(request(item.id, "PUT", body), context(item.id));
  assert.equal(created.status, 201);
  const createdJson = await created.json();
  assert.equal(createdJson.state.generation, 1);
  assert.equal(createdJson.note.contentMarkdown, "## My thought\n\nroute keyword");
  assert.equal(createdJson.replayed, false);

  const replay = await PUT(request(item.id, "PUT", body), context(item.id));
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).replayed, true);

  const loaded = await GET(request(item.id, "GET"), context(item.id));
  const loadedJson = await loaded.json();
  assert.equal(loadedJson.note.contentMarkdown, "## My thought\n\nroute keyword");
});

test("PUT returns a no-store 409 with the saved version on stale CAS", async () => {
  const item = insertCaptured({ source_type: "url", title: "Conflict", body: "source" });
  await PUT(request(item.id, "PUT", saveBody()), context(item.id));
  await PUT(
    request(
      item.id,
      "PUT",
      saveBody({ epoch: 1, baseGeneration: 1, contentMarkdown: "Winner" }),
    ),
    context(item.id),
  );
  const stale = await PUT(
    request(
      item.id,
      "PUT",
      saveBody({ epoch: 1, baseGeneration: 1, contentMarkdown: "Losing draft" }),
    ),
    context(item.id),
  );
  assert.equal(stale.status, 409);
  const body = await stale.json();
  assert.equal(body.error, "NOTE_CONFLICT");
  assert.equal(body.current.note.contentMarkdown, "Winner");
  assert.equal(stale.headers.get("cache-control"), "private, no-store, max-age=0");
});

test("DELETE is replay-safe and old writes cannot resurrect content", async () => {
  const item = insertCaptured({ source_type: "url", title: "Delete", body: "source" });
  await PUT(request(item.id, "PUT", saveBody()), context(item.id));
  const deletion = {
    editorInstanceId: "route-editor",
    mutationId: randomUUID(),
    epoch: 1,
    baseGeneration: 1,
  };
  const deleted = await DELETE(request(item.id, "DELETE", deletion), context(item.id));
  assert.equal(deleted.status, 204);
  assert.equal(deleted.headers.get("x-note-generation"), "2");
  const replay = await DELETE(request(item.id, "DELETE", deletion), context(item.id));
  assert.equal(replay.status, 204);
  assert.equal(replay.headers.get("x-idempotent-replay"), "1");

  const stale = await PUT(
    request(
      item.id,
      "PUT",
      saveBody({ epoch: 1, baseGeneration: 1, contentMarkdown: "Old offline payload" }),
    ),
    context(item.id),
  );
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).current.state.deleted, true);
});

test("PUT enforces the UTF-8 100 KiB limit", async () => {
  const item = insertCaptured({ source_type: "url", title: "Limit", body: "source" });
  const oversized = await PUT(
    request(item.id, "PUT", saveBody({ contentMarkdown: "é".repeat(51_201) })),
    context(item.id),
  );
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).error, "NOTE_TOO_LARGE");
});
