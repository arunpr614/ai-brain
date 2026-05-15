/**
 * GET /api/items/:id/enrichment-status — v0.6.0 Phase C-8 surface check.
 *
 * Locks the `batch_id` field in the JSON response so the EnrichingPill
 * can render the "queued for tonight's batch" pill with optional debug
 * tooltip without a server-side schema drift.
 */
import "./route.test.setup";

import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { NextRequest } from "next/server";
import { TEST_DB_DIR } from "./route.test.setup";
import { GET } from "./route";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

function mkReq(id: string, opts: { auth?: boolean } = {}): NextRequest {
  const headers = new Headers();
  if (opts.auth !== false) headers.set("cookie", "brain-session=stub");
  return new NextRequest(
    `http://localhost/api/items/${id}/enrichment-status`,
    { method: "GET", headers },
  );
}

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

test("401 when no session cookie", async () => {
  const res = await GET(mkReq("anything", { auth: false }), paramsFor("anything"));
  assert.equal(res.status, 401);
});

test("404 when item id does not exist", async () => {
  const res = await GET(mkReq("nope_id"), paramsFor("nope_id"));
  assert.equal(res.status, 404);
});

test("returns batch_id=null for newly captured pending item", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "status pending",
    body: "x".repeat(50),
  });
  const res = await GET(mkReq(item.id), paramsFor(item.id));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.state, "pending");
  assert.equal(body.batch_id, null);
});

test("returns batch_id when item is in 'batched' state", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "status batched",
    body: "x".repeat(50),
  });
  getDb()
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
    .run("msgbatch_status_test", item.id);

  const res = await GET(mkReq(item.id), paramsFor(item.id));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.state, "batched");
  assert.equal(body.batch_id, "msgbatch_status_test");
});
