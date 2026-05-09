/**
 * Tests for POST /api/capture/pdf (v0.5.0 T-13 extensions to v0.2.0 base).
 *
 * The happy-path PDF extract hits unpdf which requires real PDF bytes
 * and would make this a slow test — covered at existing v0.3.1 smoke
 * and T-21 AVD round-trip. This file focuses on the v0.5.0 additions:
 * bearer auth, Origin validation, SHA256 round-trip, malformed payload.
 */
import "./route.test.setup";

import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rmSync } from "node:fs";
import { NextRequest } from "next/server";
import { TEST_DB_DIR } from "./route.test.setup";
import { POST } from "./route";

function mkPdfRequest(opts: {
  body?: FormData | string;
  cookie?: string;
  bearer?: string;
  origin?: string;
  expectedSha?: string;
}): NextRequest {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", `brain-session=${opts.cookie}`);
  if (opts.bearer) headers.set("authorization", `Bearer ${opts.bearer}`);
  if (opts.origin) headers.set("origin", opts.origin);
  if (opts.expectedSha) headers.set("x-expected-sha256", opts.expectedSha);
  return new NextRequest("http://localhost/api/capture/pdf", {
    method: "POST",
    headers,
    body: opts.body as BodyInit | undefined,
  });
}

function makePdfLikeBytes(size = 256): Uint8Array {
  // Not a valid PDF — enough to exercise multipart + SHA256 verification
  // paths before capturePdfAction runs the PDF extractor and fails.
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) bytes[i] = i & 0xff;
  return bytes;
}

function sha256Hex(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

describe("/api/capture/pdf — v0.5.0 T-13 extensions", () => {
  after(() => {
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("returns 401 with no cookie and no bearer", async () => {
    const fd = new FormData();
    fd.append("pdf", new File([makePdfLikeBytes().buffer.slice(0) as ArrayBuffer], "x.pdf", { type: "application/pdf" }));
    const res = await POST(mkPdfRequest({ body: fd }));
    assert.equal(res.status, 401);
  });

  it("rejects bearer path with disallowed Origin (403)", async () => {
    const fd = new FormData();
    fd.append("pdf", new File([makePdfLikeBytes().buffer.slice(0) as ArrayBuffer], "x.pdf", { type: "application/pdf" }));
    const res = await POST(
      mkPdfRequest({
        body: fd,
        bearer: "a".repeat(64),
        origin: "http://evil.example",
      }),
    );
    assert.equal(res.status, 403);
  });

  it("rejects non-multipart body with 400 invalid_multipart", async () => {
    const res = await POST(
      mkPdfRequest({
        body: "not-multipart",
        cookie: "stub",
      }),
    );
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, "invalid_multipart");
  });

  it("rejects missing pdf field with 400 missing_pdf_field", async () => {
    const fd = new FormData();
    fd.append("wrong_field", new File([new Uint8Array(8)], "x.bin"));
    const res = await POST(mkPdfRequest({ body: fd, cookie: "stub" }));
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, "missing_pdf_field");
  });

  it("detects SHA256 mismatch and returns 422 (F-039 round-trip)", async () => {
    const bytes = makePdfLikeBytes();
    const fd = new FormData();
    fd.append("pdf", new File([bytes.buffer.slice(0) as ArrayBuffer], "x.pdf", { type: "application/pdf" }));
    const res = await POST(
      mkPdfRequest({
        body: fd,
        cookie: "stub",
        expectedSha: "0".repeat(64), // deliberately wrong
      }),
    );
    assert.equal(res.status, 422);
    const data = await res.json();
    assert.equal(data.error, "sha256_mismatch");
    assert.equal(data.expected, "0".repeat(64));
    assert.equal(data.actual, sha256Hex(bytes));
  });

  it("accepts a matching X-Expected-SHA256 header (passes to extractor; 400 expected from non-PDF bytes)", async () => {
    const bytes = makePdfLikeBytes();
    const fd = new FormData();
    fd.append("pdf", new File([bytes.buffer.slice(0) as ArrayBuffer], "x.pdf", { type: "application/pdf" }));
    const res = await POST(
      mkPdfRequest({
        body: fd,
        cookie: "stub",
        expectedSha: sha256Hex(bytes),
      }),
    );
    // SHA256 passes → capturePdfAction is called → unpdf rejects invalid
    // bytes. The 400 comes from the extractor, not our mismatch branch.
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.notEqual(data.error, "sha256_mismatch");
  });
});
