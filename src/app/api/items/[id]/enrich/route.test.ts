/**
 * Tests for POST /api/items/[id]/enrich (v0.6.0 Phase C-5).
 *
 * The realtime path calls enrichItem() which hits the LLM provider; we
 * cover ONLY the queue path here so no network is touched. Realtime
 * coverage is exercised end-to-end by the C-10 smoke script.
 */
import "./route.test.setup";

import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { NextRequest } from "next/server";
import { TEST_DB_DIR } from "./route.test.setup";
import { POST } from "./route";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

function mkReq(id: string, opts: { force?: string; auth?: boolean } = {}): NextRequest {
  const url = new URL(`http://localhost/api/items/${id}/enrich`);
  if (opts.force) url.searchParams.set("force", opts.force);
  const headers = new Headers();
  if (opts.auth !== false) headers.set("cookie", "brain-session=stub-session");
  return new NextRequest(url, { method: "POST", headers });
}

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

test("returns 401 when no session cookie", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "401 test",
    body: "x".repeat(500),
  });
  const res = await POST(mkReq(item.id, { auth: false }), paramsFor(item.id));
  assert.equal(res.status, 401);
});

test("returns 404 when item id does not exist", async () => {
  const res = await POST(mkReq("nonexistent_id"), paramsFor("nonexistent_id"));
  assert.equal(res.status, 404);
});

test("queue path: marks item back to 'pending' and clears batch_id", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "queue test",
    body: "x".repeat(500),
  });
  // Pretend it was already batched to verify the reset.
  getDb()
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
    .run("msgbatch_old", item.id);
  getDb()
    .prepare("UPDATE enrichment_jobs SET state = 'batched', attempts = 2 WHERE item_id = ?")
    .run(item.id);

  const res = await POST(mkReq(item.id), paramsFor(item.id));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.mode, "queued");
  assert.equal(body.item_id, item.id);

  const row = getDb()
    .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
    .get(item.id) as { enrichment_state: string; batch_id: string | null };
  assert.equal(row.enrichment_state, "pending");
  assert.equal(row.batch_id, null);

  const job = getDb()
    .prepare(
      "SELECT state, attempts, last_error, claimed_at FROM enrichment_jobs WHERE item_id = ?",
    )
    .get(item.id) as {
    state: string;
    attempts: number;
    last_error: string | null;
    claimed_at: number | null;
  };
  assert.equal(job.state, "pending");
  assert.equal(job.attempts, 0);
  assert.equal(job.last_error, null);
  assert.equal(job.claimed_at, null);
});

test("queue path: works on items already in 'done' state", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "done-rerun test",
    body: "x".repeat(500),
  });
  getDb()
    .prepare(
      "UPDATE items SET enrichment_state = 'done', enriched_at = unixepoch() * 1000 WHERE id = ?",
    )
    .run(item.id);
  getDb()
    .prepare("UPDATE enrichment_jobs SET state = 'done' WHERE item_id = ?")
    .run(item.id);

  const res = await POST(mkReq(item.id), paramsFor(item.id));
  assert.equal(res.status, 200);

  const row = getDb()
    .prepare("SELECT enrichment_state FROM items WHERE id = ?")
    .get(item.id) as { enrichment_state: string };
  assert.equal(row.enrichment_state, "pending");
});

test("realtime path: returns 409 when item is already 'running'", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "race B test",
    body: "x".repeat(500),
  });
  // Simulate a concurrent caller already in flight.
  getDb()
    .prepare("UPDATE items SET enrichment_state = 'running' WHERE id = ?")
    .run(item.id);

  const res = await POST(mkReq(item.id, { force: "realtime" }), paramsFor(item.id));
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error, "conflict");
  assert.equal(body.state, "running");
});

test("queue path: missing enrichment_jobs row gets re-inserted (drift recovery)", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "drift test",
    body: "x".repeat(500),
  });
  // Simulate a drifted state: jobs row deleted somehow.
  getDb()
    .prepare("DELETE FROM enrichment_jobs WHERE item_id = ?")
    .run(item.id);

  const res = await POST(mkReq(item.id), paramsFor(item.id));
  assert.equal(res.status, 200);

  const job = getDb()
    .prepare("SELECT state FROM enrichment_jobs WHERE item_id = ?")
    .get(item.id) as { state: string } | undefined;
  assert.ok(job, "enrichment_jobs row should be re-created on demand");
  assert.equal(job!.state, "pending");
});
