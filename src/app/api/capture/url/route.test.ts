/**
 * Tests for POST /api/capture/url (v0.5.0 T-12).
 *
 * The 201 happy path would require a live HTTP endpoint for Readability
 * to fetch — covered at T-21 AVD smoke. This file exercises the pre-
 * extraction guards (Origin, schema, dedup, historical duplicate) that
 * fail before any network call.
 */
import "./route.test.setup";

import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { NextRequest } from "next/server";
import { TEST_DB_DIR } from "./route.test.setup";
import { POST } from "./route";
import { __resetDedupForTests } from "@/lib/capture/dedup";
import { getDb } from "@/db/client";
import { getItem, insertCaptured } from "@/db/items";

function mkReq(
  body: unknown,
  opts: { origin?: string | null; rawBody?: string } = {},
): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.origin !== null && opts.origin !== undefined) {
    headers.set("origin", opts.origin);
  }
  return new NextRequest("http://localhost/api/capture/url", {
    method: "POST",
    headers,
    body: opts.rawBody ?? JSON.stringify(body),
  });
}

describe("/api/capture/url", () => {
  beforeEach(() => __resetDedupForTests());
  after(() => {
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("rejects a disallowed Origin with 403", async () => {
    const res = await POST(
      mkReq({ url: "https://example.com" }, { origin: "http://evil.example" }),
    );
    assert.equal(res.status, 403);
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await POST(mkReq({}, { rawBody: "{nope" }));
    assert.equal(res.status, 400);
  });

  it("rejects missing or malformed url with 400 validation_failed", async () => {
    const r1 = await POST(mkReq({ url: "" }));
    assert.equal(r1.status, 400);
    const r2 = await POST(mkReq({ url: "not-a-url" }));
    assert.equal(r2.status, 400);
    const r3 = await POST(mkReq({ url: "https://" + "a".repeat(3000) }));
    assert.equal(r3.status, 400);
  });

  it("second POST of the same URL within 2s returns {duplicate, reason:'window'}", async () => {
    // Seed the DB with an existing item at this URL so the path short-
    // circuits on the historical-duplicate branch (we return before any
    // network call) — but the FIRST POST hits the dedup window first
    // and should return reason:'window'.
    const url = "https://example.com/post-1";
    // First POST: dedup doesn't fire (fresh) → hits findItemByUrl → no
    // match → would try to extract. To avoid a network call we seed the
    // item first so the historical-duplicate branch triggers.
    insertCaptured({ source_type: "url", title: "seed", body: "x", source_url: url });

    const r1 = await POST(mkReq({ url }));
    assert.equal(r1.status, 200);
    const d1 = await r1.json();
    assert.equal(d1.duplicate, true);
    // First call: dedup miss, historical hit → reason:'exists'.
    assert.equal(d1.reason, "exists");
    assert.equal(d1.capture_result.state, "duplicate_existing");
    assert.equal(d1.capture_result.itemId, d1.itemId);
    assert.equal(d1.capture_result.existingItemId, d1.itemId);

    // Second call within 2s: dedup fires first → reason:'window'.
    const r2 = await POST(mkReq({ url }));
    assert.equal(r2.status, 200);
    const d2 = await r2.json();
    assert.equal(d2.duplicate, true);
    assert.equal(d2.reason, "window");
    assert.equal(d2.capture_result.state, "duplicate_existing");
    assert.equal(d2.capture_result.recommendedAction, "open_existing");
  });

  it("upgrades an existing LinkedIn metadata-only item when pasted text is provided", async () => {
    const url = "https://www.linkedin.com/posts/example";
    const existing = insertCaptured({
      source_type: "url",
      title: "LinkedIn link",
      body: "Preview only",
      source_url: url,
      source_platform: "linkedin",
      capture_quality: "metadata_only",
      extraction_method: "linkedin_opengraph",
      extraction_version: "capture-v0.7.5",
    });

    const res = await POST(mkReq({
      url,
      note: `${url}

This is the complete post body with enough useful words to save as user provided full text.

- It keeps a bullet.
- It keeps this secondary link https://example.com/context`,
    }));

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.action, "upgraded");
    assert.equal(body.id, existing.id);
    assert.equal(body.capture_result.state, "updated_existing");
    assert.equal(body.capture_result.itemId, existing.id);
    assert.match(body.capture_result.message, /No duplicate was created/);
    const rowsForUrl = getDb()
      .prepare("SELECT COUNT(*) AS count FROM items WHERE source_url = ?")
      .get(url) as { count: number };
    assert.equal(rowsForUrl.count, 1);

    const updated = getItem(existing.id)!;
    assert.equal(updated.capture_quality, "user_provided_full_text");
    assert.match(updated.body, /It keeps a bullet/);
    assert.match(updated.body, /https:\/\/example\.com\/context/);
  });
});
