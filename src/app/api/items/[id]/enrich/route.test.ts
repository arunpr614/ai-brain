/**
 * Tests for POST /api/items/[id]/enrich (v0.6.0 Phase C-5).
 *
 * Realtime coverage stubs the local Ollama HTTP boundary so no network is
 * touched while authority-change races remain deterministic.
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
import { issueSessionToken, setPin } from "@/lib/auth";
import { resetProviderCache } from "@/lib/llm/factory";

setPin("1234");

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

function mkReq(
  id: string,
  opts: { force?: string; auth?: boolean } = {},
): NextRequest {
  const url = new URL(`http://localhost/api/items/${id}/enrich`);
  if (opts.force) url.searchParams.set("force", opts.force);
  const headers = new Headers();
  if (opts.auth !== false)
    headers.set("cookie", `brain-session=${issueSessionToken()}`);
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
    .prepare(
      "UPDATE enrichment_jobs SET state = 'batched', attempts = 2 WHERE item_id = ?",
    )
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

for (const driftState of [
  "pending",
  "running",
  "batched",
  "done",
  "error",
] as const) {
  test(`queue and realtime paths preserve an unresolved batch reservation in drifted ${driftState} state`, async () => {
    const item = insertCaptured({
      source_type: "note",
      title: `ambiguous batch reservation ${driftState}`,
      body: "x".repeat(500),
    });
    const reservation = `opaque-reservation-v1:${"A".repeat(43)}`;
    const db = getDb();
    db.prepare(
      "UPDATE items SET enrichment_state = ?, batch_id = ? WHERE id = ?",
    ).run(driftState, reservation, item.id);
    db.prepare(
      `UPDATE enrichment_jobs
       SET state = ?, attempts = 2, last_error = NULL
       WHERE item_id = ?`,
    ).run(driftState, item.id);
    const beforeItem = db
      .prepare("SELECT * FROM items WHERE id = ?")
      .get(item.id);
    const beforeJob = db
      .prepare("SELECT * FROM enrichment_jobs WHERE item_id = ?")
      .get(item.id);

    for (const force of [undefined, "realtime"] as const) {
      const response = await POST(
        mkReq(item.id, { force }),
        paramsFor(item.id),
      );
      assert.equal(response.status, 409);
      assert.deepEqual(await response.json(), {
        error: "conflict",
        state: "batched",
      });
      assert.equal(
        response.headers.get("Cache-Control"),
        "private, no-store, max-age=0",
      );
      assert.equal(response.headers.get("Vary"), "Cookie, Origin");
      assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
      assert.deepEqual(
        db.prepare("SELECT * FROM items WHERE id = ?").get(item.id),
        beforeItem,
      );
      assert.deepEqual(
        db
          .prepare("SELECT * FROM enrichment_jobs WHERE item_id = ?")
          .get(item.id),
        beforeJob,
      );
    }
  });
}

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

  const res = await POST(
    mkReq(item.id, { force: "realtime" }),
    paramsFor(item.id),
  );
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error, "conflict");
  assert.equal(body.state, "running");
});

test("realtime path preserves a reservation introduced during provider execution", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "realtime reservation race",
    body: "Synthetic body for a realtime reservation race. ".repeat(20),
  });
  const db = getDb();
  const reservation = `opaque-reservation-v1:${"R".repeat(43)}`;
  const originalFetch = globalThis.fetch;
  const originalProvider = process.env.LLM_ENRICH_PROVIDER;
  let providerCalls = 0;
  let markerSnapshot:
    | { item: unknown; job: unknown; usage: number }
    | undefined;
  process.env.LLM_ENRICH_PROVIDER = "ollama";
  resetProviderCache();
  globalThis.fetch = async () => {
    providerCalls += 1;
    db.prepare("UPDATE items SET batch_id = ? WHERE id = ?").run(
      reservation,
      item.id,
    );
    markerSnapshot = {
      item: db.prepare("SELECT * FROM items WHERE id = ?").get(item.id),
      job: db
        .prepare("SELECT * FROM enrichment_jobs WHERE item_id = ?")
        .get(item.id),
      usage: (
        db.prepare("SELECT COUNT(*) AS n FROM llm_usage").get() as {
          n: number;
        }
      ).n,
    };
    return new Response(
      JSON.stringify({
        response: JSON.stringify({
          summary:
            "This sufficiently long synthetic summary must never be applied after authority changes.",
          quotes: ["Synthetic quote"],
          category: "General",
          title: "Synthetic Enriched Title",
          tags: ["synthetic"],
        }),
        prompt_eval_count: 11,
        eval_count: 7,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const response = await POST(
      mkReq(item.id, { force: "realtime" }),
      paramsFor(item.id),
    );
    assert.equal(providerCalls, 1);
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: "conflict",
      state: "batched",
    });
    assert.equal(
      response.headers.get("Cache-Control"),
      "private, no-store, max-age=0",
    );
    assert.ok(markerSnapshot);
    assert.deepEqual(
      db.prepare("SELECT * FROM items WHERE id = ?").get(item.id),
      markerSnapshot.item,
    );
    assert.deepEqual(
      db
        .prepare("SELECT * FROM enrichment_jobs WHERE item_id = ?")
        .get(item.id),
      markerSnapshot.job,
    );
    assert.equal(
      (
        db.prepare("SELECT COUNT(*) AS n FROM llm_usage").get() as {
          n: number;
        }
      ).n,
      markerSnapshot.usage,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalProvider === undefined) {
      delete process.env.LLM_ENRICH_PROVIDER;
    } else {
      process.env.LLM_ENRICH_PROVIDER = originalProvider;
    }
    resetProviderCache();
  }
});

test("queue path: missing enrichment_jobs row gets re-inserted (drift recovery)", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "drift test",
    body: "x".repeat(500),
  });
  // Simulate a drifted state: jobs row deleted somehow.
  getDb().prepare("DELETE FROM enrichment_jobs WHERE item_id = ?").run(item.id);

  const res = await POST(mkReq(item.id), paramsFor(item.id));
  assert.equal(res.status, 200);

  const job = getDb()
    .prepare("SELECT state FROM enrichment_jobs WHERE item_id = ?")
    .get(item.id) as { state: string } | undefined;
  assert.ok(job, "enrichment_jobs row should be re-created on demand");
  assert.equal(job!.state, "pending");
});

test("feature-schema marker returns private 503 with no item or job effect", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "incompatible schema containment",
    body: "x".repeat(500),
  });
  const db = getDb();
  db.prepare(
    "UPDATE items SET enrichment_state = 'done', batch_id = ? WHERE id = ?",
  ).run("private-batch-sentinel", item.id);
  db.prepare(
    "UPDATE enrichment_jobs SET state = 'done', attempts = 7 WHERE item_id = ?",
  ).run(item.id);
  db.prepare("INSERT INTO _migrations(name, sha256) VALUES (?, ?)").run(
    "028_youtube_browser_transcript.sql",
    "a".repeat(64),
  );

  try {
    const response = await POST(mkReq(item.id), paramsFor(item.id));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      ok: false,
      code: "processing_schema_incompatible",
      effect: "none",
    });
    assert.equal(
      response.headers.get("Cache-Control"),
      "private, no-store, max-age=0",
    );
    assert.equal(response.headers.get("Vary"), "Cookie, Origin");

    const itemAfter = db
      .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
      .get(item.id) as { enrichment_state: string; batch_id: string | null };
    const jobAfter = db
      .prepare("SELECT state, attempts FROM enrichment_jobs WHERE item_id = ?")
      .get(item.id) as { state: string; attempts: number };
    assert.deepEqual(itemAfter, {
      enrichment_state: "done",
      batch_id: "private-batch-sentinel",
    });
    assert.deepEqual(jobAfter, { state: "done", attempts: 7 });
  } finally {
    db.prepare("DELETE FROM _migrations WHERE name = ?").run(
      "028_youtube_browser_transcript.sql",
    );
  }
});
