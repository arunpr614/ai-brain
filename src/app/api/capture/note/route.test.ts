/**
 * Tests for POST /api/capture/note (v0.5.0 T-12).
 */
import "./route.test.setup";

import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { NextRequest } from "next/server";
import { TEST_DB_DIR } from "./route.test.setup";
import { POST } from "./route";
import { __resetDedupForTests } from "@/lib/capture/dedup";

function mkReq(
  body: unknown,
  opts: { origin?: string | null; rawBody?: string } = {},
): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.origin !== null && opts.origin !== undefined) {
    headers.set("origin", opts.origin);
  }
  return new NextRequest("http://localhost/api/capture/note", {
    method: "POST",
    headers,
    body: opts.rawBody ?? JSON.stringify(body),
  });
}

describe("/api/capture/note", () => {
  beforeEach(() => __resetDedupForTests());
  after(() => {
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("rejects a disallowed Origin with 403", async () => {
    const res = await POST(mkReq({ title: "t", body: "b" }, { origin: "http://evil.example" }));
    assert.equal(res.status, 403);
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await POST(mkReq({}, { rawBody: "{nope" }));
    assert.equal(res.status, 400);
  });

  it("rejects empty title/body with 400 validation_failed", async () => {
    const r1 = await POST(mkReq({ title: "", body: "b" }));
    assert.equal(r1.status, 400);
    const r2 = await POST(mkReq({ title: "t", body: "" }));
    assert.equal(r2.status, 400);
  });

  it("inserts a note and returns 201 with id", async () => {
    const res = await POST(mkReq({ title: "My note", body: "Some body text" }));
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.match(data.id, /./);
    assert.equal(data.duplicate, false);
  });

  it("deduplicates an identical title+body within the 2s window", async () => {
    const first = await POST(mkReq({ title: "Dup", body: "body" }));
    assert.equal(first.status, 201);
    const second = await POST(mkReq({ title: "Dup", body: "body" }));
    assert.equal(second.status, 200);
    const data = await second.json();
    assert.equal(data.duplicate, true);
    assert.equal(data.reason, "window");
  });
});
