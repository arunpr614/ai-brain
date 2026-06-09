/**
 * Unit tests for src/lib/lan/info.ts (v0.5.0 T-8).
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rotateApiToken } from "./info";

const ORIGINAL_TOKEN = process.env.BRAIN_API_TOKEN;

describe("info/rotateApiToken", () => {
  let tmpDir: string;
  let tmpEnvPath: string;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
    if (ORIGINAL_TOKEN === undefined) delete process.env.BRAIN_API_TOKEN;
    else process.env.BRAIN_API_TOKEN = ORIGINAL_TOKEN;
  });

  it("writes a fresh 64-hex token to .env when none exists", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "brain-rotate-new-"));
    tmpEnvPath = join(tmpDir, ".env");
    const token = rotateApiToken({ envPath: tmpEnvPath });
    assert.match(token, /^[0-9a-f]{64}$/);
    const body = readFileSync(tmpEnvPath, "utf8");
    assert.match(body, new RegExp(`^BRAIN_API_TOKEN=${token}$`, "m"));
    assert.equal(process.env.BRAIN_API_TOKEN, token);
  });

  it("replaces an existing BRAIN_API_TOKEN line, preserves other lines", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "brain-rotate-replace-"));
    tmpEnvPath = join(tmpDir, ".env");
    writeFileSync(
      tmpEnvPath,
      "# header\nFOO=bar\nBRAIN_API_TOKEN=oldoldoldoldoldoldoldoldoldoldold\nBAZ=qux\n",
    );
    const token = rotateApiToken({ envPath: tmpEnvPath });
    const body = readFileSync(tmpEnvPath, "utf8");
    assert.match(body, /^# header$/m);
    assert.match(body, /^FOO=bar$/m);
    assert.match(body, /^BAZ=qux$/m);
    assert.match(body, new RegExp(`^BRAIN_API_TOKEN=${token}$`, "m"));
    // Exactly one BRAIN_API_TOKEN line after rotate.
    const count = (body.match(/^BRAIN_API_TOKEN=/gm) ?? []).length;
    assert.equal(count, 1);
  });

  it("produces different tokens across calls", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "brain-rotate-distinct-"));
    tmpEnvPath = join(tmpDir, ".env");
    const t1 = rotateApiToken({ envPath: tmpEnvPath });
    const t2 = rotateApiToken({ envPath: tmpEnvPath });
    assert.notEqual(t1, t2);
  });
});
