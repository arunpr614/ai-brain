/**
 * Tests for GET /api/settings/lan-info (v0.5.0 T-8).
 *
 * Covers the auth gate (401 without cookie), the happy path (token + QR),
 * and the explicit Cache-Control / Pragma headers (REVIEW missing-risk).
 * The getLanIpv4() helper returns null in sandboxed environments — tests
 * accept either a 200 with ip or a 503 `no_lan_interface`, but never a
 * silent pass through the cache layer.
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

  it("returns 200 with ip + token + qr data-uri on valid auth", async () => {
    const saved = process.env.BRAIN_LAN_TOKEN;
    process.env.BRAIN_LAN_TOKEN = "f".repeat(64);
    try {
      const res = await GET(mkReq({ cookie: "stub" }));
      // 503 is acceptable in environments without a LAN interface; in that
      // case the body must still carry the no-lan-interface error code.
      if (res.status === 503) {
        const body = await res.json();
        assert.equal(body.error, "no_lan_interface");
      } else {
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
        assert.equal(res.headers.get("pragma"), "no-cache");
        const body = await res.json();
        assert.match(body.ip, /^\d+\.\d+\.\d+\.\d+$/);
        assert.equal(body.token, "f".repeat(64));
        assert.match(body.setup_uri, /^brain:\/\/setup\?/);
        assert.match(body.qr_png_data_uri, /^data:image\/png;base64,/);
      }
    } finally {
      if (saved === undefined) delete process.env.BRAIN_LAN_TOKEN;
      else process.env.BRAIN_LAN_TOKEN = saved;
    }
  });
});
