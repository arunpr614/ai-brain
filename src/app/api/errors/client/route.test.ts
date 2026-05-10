/**
 * Unit tests for POST /api/errors/client (v0.5.0 T-5 / REVIEW P2-3).
 *
 * Assertions cover the schema contract: valid namespaces accepted, malformed
 * rejected with 400, origin allow-list enforced with 403, oversize body
 * rejected with 413, invalid JSON with 400. The actual write to
 * `data/errors.jsonl` is exercised by F-050 tests elsewhere; this file
 * only checks the route-level behaviour.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "./route";

function mkReq(
  body: unknown,
  opts: { origin?: string | null; malformed?: boolean; rawBody?: string } = {},
): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.origin !== null && opts.origin !== undefined) {
    headers.set("origin", opts.origin);
  }
  const payload = opts.rawBody ?? (opts.malformed ? "{not json" : JSON.stringify(body));
  return new NextRequest("http://localhost/api/errors/client", {
    method: "POST",
    headers,
    body: payload,
  });
}

describe("/api/errors/client — schema validation", () => {
  it("accepts a valid lan.* event", async () => {
    const res = await POST(
      mkReq({ namespace: "lan.bearer.reject-mismatch", message: "m" }),
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  });

  it("accepts a valid share.* event with context", async () => {
    const res = await POST(
      mkReq({
        namespace: "share.intent.duplicate",
        message: "duplicate share suppressed",
        context: { url: "https://example.com" },
      }),
    );
    assert.equal(res.status, 200);
  });

  it("accepts a valid ext.* event", async () => {
    const res = await POST(mkReq({ namespace: "ext.fetch-failed", message: "net" }));
    assert.equal(res.status, 200);
  });

  it("rejects a namespace outside the three allow-listed prefixes", async () => {
    const res = await POST(mkReq({ namespace: "server.crash", message: "bad" }));
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "validation_failed");
  });

  it("rejects an empty namespace", async () => {
    const res = await POST(mkReq({ namespace: "", message: "x" }));
    assert.equal(res.status, 400);
  });

  it("rejects a namespace with uppercase or spaces", async () => {
    const r1 = await POST(mkReq({ namespace: "lan.BEARER", message: "x" }));
    assert.equal(r1.status, 400);
    const r2 = await POST(mkReq({ namespace: "lan.bearer reject", message: "x" }));
    assert.equal(r2.status, 400);
  });

  it("rejects an impersonated server-side namespace", async () => {
    const res = await POST(mkReq({ namespace: "enrich.worker-crashed", message: "x" }));
    assert.equal(res.status, 400);
  });

  it("rejects an empty message", async () => {
    const res = await POST(mkReq({ namespace: "lan.mdns.publish", message: "" }));
    assert.equal(res.status, 400);
  });

  it("rejects a message over 2 KB", async () => {
    const res = await POST(
      mkReq({ namespace: "lan.mdns.publish", message: "x".repeat(2049) }),
    );
    assert.equal(res.status, 400);
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await POST(mkReq({}, { malformed: true }));
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "invalid_json");
  });
});

describe("/api/errors/client — origin validation", () => {
  it("permits missing Origin (CLI, curl)", async () => {
    const res = await POST(mkReq({ namespace: "lan.mdns.test", message: "m" }));
    assert.equal(res.status, 200);
  });

  it("permits brain.arunp.in origin (Cloudflare named tunnel — v2.0 pivot)", async () => {
    const res = await POST(
      mkReq(
        { namespace: "lan.tunnel.test", message: "m" },
        { origin: "https://brain.arunp.in" },
      ),
    );
    assert.equal(res.status, 200);
  });

  it("permits chrome-extension origin", async () => {
    const res = await POST(
      mkReq(
        { namespace: "ext.test", message: "m" },
        { origin: "chrome-extension://abcdef" },
      ),
    );
    assert.equal(res.status, 200);
  });

  it("rejects disallowed origins with 403", async () => {
    const res = await POST(
      mkReq(
        { namespace: "lan.mdns.test", message: "m" },
        { origin: "http://evil.example" },
      ),
    );
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error, "origin_not_allowed");
  });
});
