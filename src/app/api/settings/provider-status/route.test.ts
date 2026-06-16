import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "./route";

function mkReq(opts: { cookie?: string } = {}): NextRequest {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", `brain-session=${opts.cookie}`);
  return new NextRequest("http://localhost/api/settings/provider-status", {
    method: "GET",
    headers,
  });
}

describe("/api/settings/provider-status", () => {
  it("returns 401 without a session cookie and disables caching", async () => {
    const res = await GET(mkReq());

    assert.equal(res.status, 401);
    assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
    assert.equal(res.headers.get("pragma"), "no-cache");
    assert.deepEqual(await res.json(), { error: "unauthenticated" });
  });
});
