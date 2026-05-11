/**
 * Tests for GET /api/settings/lan-info (v0.5.0 T-8; pivoted T-CF-9).
 *
 * Covers the auth gate (401 without cookie), the 503 (no token) path, the
 * happy path (url + token + QR), and the explicit Cache-Control / Pragma
 * headers (REVIEW TM-1). Post-pivot there is no LAN IP dependency, so the
 * "no_lan_interface" branch is gone.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "./route";

function mkReq(opts: { cookie?: string } = {}): NextRequest {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", `brain-session=${opts.cookie}`);
  return new NextRequest("http://localhost/api/settings/lan-info", {
    method: "GET",
    headers,
  });
}

describe("/api/settings/lan-info", () => {
  it("returns 401 without session cookie", async () => {
    const res = await GET(mkReq());
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
    assert.equal(res.headers.get("pragma"), "no-cache");
  });

  it("returns 503 when BRAIN_LAN_TOKEN is absent", async () => {
    const saved = process.env.BRAIN_LAN_TOKEN;
    delete process.env.BRAIN_LAN_TOKEN;
    try {
      const res = await GET(mkReq({ cookie: "stub" }));
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.error, "token_not_configured");
    } finally {
      if (saved !== undefined) process.env.BRAIN_LAN_TOKEN = saved;
    }
  });

  it("returns 200 with url + token + qr data-uri on valid auth", async () => {
    const saved = process.env.BRAIN_LAN_TOKEN;
    process.env.BRAIN_LAN_TOKEN = "f".repeat(64);
    try {
      const res = await GET(mkReq({ cookie: "stub" }));
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
      assert.equal(res.headers.get("pragma"), "no-cache");
      const body = await res.json();
      assert.equal(body.url, "https://brain.arunp.in");
      assert.equal(body.token, "f".repeat(64));
      assert.match(body.setup_uri, /^brain:\/\/setup\?/);
      assert.match(body.qr_png_data_uri, /^data:image\/png;base64,/);
      // No ip field post-pivot
      assert.equal(body.ip, undefined);
    } finally {
      if (saved === undefined) delete process.env.BRAIN_LAN_TOKEN;
      else process.env.BRAIN_LAN_TOKEN = saved;
    }
  });
});
