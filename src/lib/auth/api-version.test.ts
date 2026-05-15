/**
 * Unit tests for src/lib/auth/api-version.ts (OFFLINE-6 / plan v3 §5.5).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  CLIENT_API_HEADER,
  EXPECTED_CLIENT_API,
  checkClientApiVersion,
} from "./api-version";

function mkReq(headerValue: string | null): NextRequest {
  const headers = new Headers();
  if (headerValue !== null) headers.set(CLIENT_API_HEADER, headerValue);
  return new NextRequest("http://localhost/api/capture/url", {
    method: "POST",
    headers,
  });
}

describe("checkClientApiVersion", () => {
  it("accepts a missing header (legacy clients)", () => {
    assert.equal(checkClientApiVersion(mkReq(null)), null);
  });

  it("accepts the exact expected version", () => {
    assert.equal(checkClientApiVersion(mkReq(String(EXPECTED_CLIENT_API))), null);
  });

  it("rejects a different numeric version with 422 + version_mismatch code", async () => {
    const res = checkClientApiVersion(mkReq(String(EXPECTED_CLIENT_API + 1)));
    assert.ok(res !== null);
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.code, "version_mismatch");
    assert.equal(body.expected, EXPECTED_CLIENT_API);
    assert.equal(body.received, String(EXPECTED_CLIENT_API + 1));
  });

  it("rejects a non-numeric value", async () => {
    const res = checkClientApiVersion(mkReq("not-a-number"));
    assert.ok(res !== null);
    assert.equal(res.status, 422);
  });

  it("rejects an empty header (present but malformed)", async () => {
    const res = checkClientApiVersion(mkReq(""));
    assert.ok(res !== null);
    assert.equal(res.status, 422);
  });

  it("response body shape is what classify.ts expects", async () => {
    // classify.ts treats body.code === 'version_mismatch' on 422 as the
    // discriminator. This test pins the contract between the two modules.
    const res = checkClientApiVersion(mkReq("999"));
    assert.ok(res !== null);
    const body = (await res.json()) as { code: string; message: string };
    assert.equal(body.code, "version_mismatch");
    assert.match(body.message, /Update Brain/);
  });
});
