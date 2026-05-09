/**
 * Unit tests for src/lib/lan/info.ts (v0.5.0 T-8).
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSetupUri, getLanIpv4, rotateLanToken } from "./info";

const ORIGINAL_TOKEN = process.env.BRAIN_LAN_TOKEN;

describe("info/buildSetupUri", () => {
  it("encodes ip + token as query params on brain://setup", () => {
    const uri = buildSetupUri("192.168.1.17", "a".repeat(64));
    assert.match(uri, /^brain:\/\/setup\?ip=192\.168\.1\.17&token=a+$/);
  });

  it("does not leak the token in a URL-unencoded form if the token contains special chars", () => {
    // Hex tokens are [0-9a-f] so this is belt-and-braces; confirm URL
    // construction doesn't silently drop characters.
    const uri = buildSetupUri("10.0.0.1", "1234567890abcdef".repeat(4));
    assert.match(uri, /token=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef/);
  });
});

describe("info/getLanIpv4", () => {
  it("returns either null or a dotted-quad IPv4 string", () => {
    const ip = getLanIpv4();
    if (ip !== null) {
      assert.match(ip, /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
      // Must not be loopback.
      assert.notEqual(ip, "127.0.0.1");
    }
  });
});

describe("info/rotateLanToken", () => {
  let tmpDir: string;
  let tmpEnvPath: string;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
    if (ORIGINAL_TOKEN === undefined) delete process.env.BRAIN_LAN_TOKEN;
    else process.env.BRAIN_LAN_TOKEN = ORIGINAL_TOKEN;
  });

  it("writes a fresh 64-hex token to .env when none exists", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "brain-rotate-new-"));
    tmpEnvPath = join(tmpDir, ".env");
    const token = rotateLanToken({ envPath: tmpEnvPath });
    assert.match(token, /^[0-9a-f]{64}$/);
    const body = readFileSync(tmpEnvPath, "utf8");
    assert.match(body, new RegExp(`^BRAIN_LAN_TOKEN=${token}$`, "m"));
    assert.equal(process.env.BRAIN_LAN_TOKEN, token);
  });

  it("replaces an existing BRAIN_LAN_TOKEN line, preserves other lines", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "brain-rotate-replace-"));
    tmpEnvPath = join(tmpDir, ".env");
    writeFileSync(
      tmpEnvPath,
      "# header\nFOO=bar\nBRAIN_LAN_TOKEN=oldoldoldoldoldoldoldoldoldoldold\nBAZ=qux\n",
    );
    const token = rotateLanToken({ envPath: tmpEnvPath });
    const body = readFileSync(tmpEnvPath, "utf8");
    assert.match(body, /^# header$/m);
    assert.match(body, /^FOO=bar$/m);
    assert.match(body, /^BAZ=qux$/m);
    assert.match(body, new RegExp(`^BRAIN_LAN_TOKEN=${token}$`, "m"));
    // Exactly one BRAIN_LAN_TOKEN line after rotate.
    const count = (body.match(/^BRAIN_LAN_TOKEN=/gm) ?? []).length;
    assert.equal(count, 1);
  });

  it("produces different tokens across calls", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "brain-rotate-distinct-"));
    tmpEnvPath = join(tmpDir, ".env");
    const t1 = rotateLanToken({ envPath: tmpEnvPath });
    const t2 = rotateLanToken({ envPath: tmpEnvPath });
    assert.notEqual(t1, t2);
  });
});
