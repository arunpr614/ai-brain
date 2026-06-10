import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleDevicePairingExchangePost } from "@/lib/device-pairing/exchange-route-handler";

function mkReq(body: string): NextRequest {
  return new NextRequest(
    "http://localhost/api/settings/device-pairing/exchange",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    },
  );
}

async function assertExchangeError(
  reason:
    | "token_not_configured"
    | "invalid_code"
    | "expired_code"
    | "used_code"
    | "rate_limited",
  status: number,
): Promise<void> {
  const res = await handleDevicePairingExchangePost(mkReq('{"code":"ABCD-EFGH"}'), {
    exchangeCode: () => ({ ok: false, reason }),
  });
  assert.equal(res.status, status);
  assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
  assert.equal(res.headers.get("pragma"), "no-cache");
  assert.deepEqual(await res.json(), { error: reason });
}

describe("/api/settings/device-pairing/exchange", () => {
  it("returns url and token for a valid exchange", async () => {
    const res = await handleDevicePairingExchangePost(mkReq('{"code":"ABCD-EFGH"}'), {
      exchangeCode: (code) => {
        assert.equal(code, "ABCD-EFGH");
        return { ok: true, token: "a".repeat(64) };
      },
      tunnelUrl: "https://example.test",
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
    assert.equal(res.headers.get("pragma"), "no-cache");
    assert.deepEqual(await res.json(), {
      url: "https://example.test",
      token: "a".repeat(64),
    });
  });

  it("maps invalid codes to 401", async () => {
    await assertExchangeError("invalid_code", 401);
  });

  it("maps expired codes to 410", async () => {
    await assertExchangeError("expired_code", 410);
  });

  it("maps used codes to 409", async () => {
    await assertExchangeError("used_code", 409);
  });

  it("maps rate-limited attempts to 429", async () => {
    await assertExchangeError("rate_limited", 429);
  });

  it("maps missing token configuration to 503", async () => {
    await assertExchangeError("token_not_configured", 503);
  });

  it("treats malformed JSON as an invalid empty code", async () => {
    const res = await handleDevicePairingExchangePost(mkReq("{"), {
      exchangeCode: (code) => {
        assert.equal(code, "");
        return { ok: false, reason: "invalid_code" };
      },
    });

    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: "invalid_code" });
  });
});
