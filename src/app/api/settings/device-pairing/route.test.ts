/**
 * Tests for GET /api/settings/device-pairing (v0.5.0 T-8; pivoted T-CF-9; renamed v0.6.1 T-12).
 *
 * Covers the auth gate (401 without cookie), the 503 (no token) path, the
 * happy path (url + token), and the explicit Cache-Control / Pragma
 * headers (REVIEW TM-1). Post-pivot there is no LAN IP dependency, so the
 * "no_lan_interface" branch is gone.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  handleDevicePairingGet,
  handleDevicePairingPost,
} from "@/lib/device-pairing/create-route-handler";

function mkReq(opts: { cookie?: string } = {}): NextRequest {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", `brain-session=${opts.cookie}`);
  return new NextRequest("http://localhost/api/settings/device-pairing", {
    method: "GET",
    headers,
  });
}

describe("/api/settings/device-pairing", () => {
  it("returns 401 without session cookie", async () => {
    const res = await handleDevicePairingGet(mkReq());
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
    assert.equal(res.headers.get("pragma"), "no-cache");
  });

  it("returns 503 when BRAIN_API_TOKEN is absent", async () => {
    const saved = process.env.BRAIN_API_TOKEN;
    delete process.env.BRAIN_API_TOKEN;
    try {
      const res = await handleDevicePairingGet(mkReq({ cookie: "stub" }), {
        verifySession: () => true,
      });
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.error, "token_not_configured");
    } finally {
      if (saved !== undefined) process.env.BRAIN_API_TOKEN = saved;
    }
  });

  it("returns 401 for an unsigned session cookie before returning token data", async () => {
    const saved = process.env.BRAIN_API_TOKEN;
    process.env.BRAIN_API_TOKEN = "f".repeat(64);
    try {
      const res = await handleDevicePairingGet(mkReq({ cookie: "stub" }));
      assert.equal(res.status, 401);
      assert.deepEqual(await res.json(), { error: "unauthenticated" });
    } finally {
      if (saved === undefined) delete process.env.BRAIN_API_TOKEN;
      else process.env.BRAIN_API_TOKEN = saved;
    }
  });

  it("returns 200 with url + token on valid auth", async () => {
    const saved = process.env.BRAIN_API_TOKEN;
    process.env.BRAIN_API_TOKEN = "f".repeat(64);
    try {
      const res = await handleDevicePairingGet(mkReq({ cookie: "stub" }), {
        verifySession: () => true,
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
      assert.equal(res.headers.get("pragma"), "no-cache");
      const body = await res.json();
      assert.deepEqual(Object.keys(body).sort(), ["token", "url"]);
      assert.equal(body.url, "https://brain.arunp.in");
      assert.equal(body.token, "f".repeat(64));
    } finally {
      if (saved === undefined) delete process.env.BRAIN_API_TOKEN;
      else process.env.BRAIN_API_TOKEN = saved;
    }
  });

  it("returns 401 before creating a code without session cookie", async () => {
    const res = await handleDevicePairingPost(mkReq());
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
    assert.equal(res.headers.get("pragma"), "no-cache");
  });

  it("returns a temporary Android code on valid auth", async () => {
    const res = await handleDevicePairingPost(mkReq({ cookie: "stub" }), {
      verifySession: () => true,
      createCode: () => ({
        ok: true,
        code: "ABCD-EFGH",
        expiresAt: 1_719_000_000_000,
      }),
      tunnelUrl: "https://example.test",
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
    assert.equal(res.headers.get("pragma"), "no-cache");
    assert.deepEqual(await res.json(), {
      code: "ABCD-EFGH",
      expires_at: 1_719_000_000_000,
      url: "https://example.test",
    });
  });

  it("returns 503 when code creation cannot load the API token", async () => {
    const res = await handleDevicePairingPost(mkReq({ cookie: "stub" }), {
      verifySession: () => true,
      createCode: () => ({ ok: false, reason: "token_not_configured" }),
    });
    assert.equal(res.status, 503);
    assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
    assert.equal(res.headers.get("pragma"), "no-cache");
    assert.deepEqual(await res.json(), { error: "token_not_configured" });
  });
});
