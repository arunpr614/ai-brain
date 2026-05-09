/**
 * Tests for POST /api/settings/rotate-token (v0.5.0 T-8 / F-037).
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { POST } from "./route";

const ORIGINAL_TOKEN = process.env.BRAIN_LAN_TOKEN;
const ORIGINAL_CWD = process.cwd();

let tmpDir: string | null = null;

function mkReq(opts: { cookie?: string } = {}): NextRequest {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", `brain-session=${opts.cookie}`);
  return new NextRequest("http://localhost/api/settings/rotate-token", {
    method: "POST",
    headers,
  });
}

describe("/api/settings/rotate-token", () => {
  afterEach(() => {
    process.chdir(ORIGINAL_CWD);
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
      tmpDir = null;
    }
    if (ORIGINAL_TOKEN === undefined) delete process.env.BRAIN_LAN_TOKEN;
    else process.env.BRAIN_LAN_TOKEN = ORIGINAL_TOKEN;
  });

  it("returns 401 without session cookie", async () => {
    const res = await POST(mkReq());
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
  });

  it("rotates the token on valid auth + updates process.env + writes .env", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "brain-rotate-route-"));
    process.chdir(tmpDir); // so rotateLanToken writes into our tmp .env

    const before = "a".repeat(64);
    process.env.BRAIN_LAN_TOKEN = before;

    const res = await POST(mkReq({ cookie: "stub" }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);

    const after = process.env.BRAIN_LAN_TOKEN!;
    assert.notEqual(after, before);
    assert.match(after, /^[0-9a-f]{64}$/);

    const env = readFileSync(join(tmpDir, ".env"), "utf8");
    assert.match(env, new RegExp(`^BRAIN_LAN_TOKEN=${after}$`, "m"));
  });
});
