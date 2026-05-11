#!/usr/bin/env node
/**
 * v0.5.0 Cloudflare-tunnel pivot smoke.
 *
 * Code-only assertions — runs without a live server. Verifies the static
 * invariants that the LAN→tunnel pivot must preserve:
 *   - BRAIN_TUNNEL_URL is the single source of truth and points at brain.arunp.in
 *   - QR schema uses url=<https>, not the legacy ip=<dotted-quad>
 *   - validateOrigin admits https://brain.arunp.in + chrome-extension://*
 *     and rejects random origins
 *   - Bearer verification rejects missing / malformed / too-short tokens
 *     (fingerprint on valid token is deterministic 16-hex)
 *   - No `brain.local` references survive in source (SPIKE-002 gate)
 *   - Capacitor config APK asset points at brain.arunp.in (R-release)
 *   - Extension manifest has the right host_permissions + MV3 shape
 *
 * Live-server SSE + capture smokes are covered empirically in RUNNING_LOG
 * entries 29+ (T-CF-14 Ask streaming over cellular, T-CF-20 extension E2E).
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..");

let failures = 0;
async function section(name, fn) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL ${name}: ${err.message}`);
  }
}

async function run() {
  // 1) Tunnel URL constant is the single source of truth
  await section("BRAIN_TUNNEL_URL points at brain.arunp.in", async () => {
    const mod = await import("../src/lib/config/tunnel.ts");
    assert.equal(mod.BRAIN_TUNNEL_URL, "https://brain.arunp.in");
  });

  // 2) QR schema: url= not ip=, enforces https
  await section("buildSetupUri emits brain://setup?url=...&token=...", async () => {
    const { buildSetupUri } = await import("../src/lib/lan/info.ts");
    const token = "a".repeat(64);
    const uri = buildSetupUri(token);
    const u = new URL(uri);
    assert.equal(u.protocol, "brain:");
    assert.equal(u.hostname, "setup");
    assert.equal(u.searchParams.get("url"), "https://brain.arunp.in");
    assert.equal(u.searchParams.get("token"), token);
    assert.equal(u.searchParams.get("ip"), null, "legacy ip= must not be emitted");
  });

  await section("parseSetupUri rejects legacy ip= shape", async () => {
    const { parseSetupUri } = await import("../src/lib/lan/setup-uri.ts");
    const legacy = parseSetupUri("brain://setup?ip=192.168.0.1&token=" + "a".repeat(64));
    assert.equal(legacy.ok, false);
    assert.match(legacy.reason, /ip-field-deprecated|url/i);
  });

  await section("parseSetupUri rejects http:// (cleartext)", async () => {
    const { parseSetupUri } = await import("../src/lib/lan/setup-uri.ts");
    const v = parseSetupUri("brain://setup?url=http://foo.com&token=" + "a".repeat(64));
    assert.equal(v.ok, false);
    assert.match(v.reason, /url-not-https|https/i);
  });

  // 3) Origin validation — admits tunnel + extensions, rejects randos
  await section("validateOrigin admits tunnel, loopback, chrome-extension://*", async () => {
    const { validateOrigin } = await import("../src/lib/auth/bearer.ts");
    assert.equal(validateOrigin("https://brain.arunp.in"), true);
    assert.equal(validateOrigin("http://localhost:3000"), true);
    assert.equal(validateOrigin("http://127.0.0.1:3000"), true);
    assert.equal(validateOrigin("chrome-extension://abcdef0123456789"), true);
    assert.equal(validateOrigin(null), true, "CLI/server-to-server must pass");
    assert.equal(validateOrigin("https://evil.example"), false);
    assert.equal(validateOrigin("http://brain.arunp.in"), false, "http must be rejected");
  });

  // 4) Bearer verification invariants
  await section("bearer rejects missing, malformed, short", async () => {
    // The module sees a real BRAIN_LAN_TOKEN via .env — set a stable one for
    // assertions so ordering doesn't matter.
    const priorEnv = process.env.BRAIN_LAN_TOKEN;
    const okToken = "f".repeat(64);
    process.env.BRAIN_LAN_TOKEN = okToken;
    const { verifyBearerToken, tokenFingerprint } = await import(
      "../src/lib/auth/bearer.ts"
    );
    assert.deepEqual(verifyBearerToken(undefined), {
      ok: false,
      reason: "missing-header",
    });
    assert.deepEqual(verifyBearerToken("Token abc"), {
      ok: false,
      reason: "malformed-header",
    });
    assert.deepEqual(verifyBearerToken("Bearer "), {
      ok: false,
      reason: "malformed-header",
    });
    const short = verifyBearerToken("Bearer short");
    assert.equal(short.ok, false);
    assert.equal(short.reason, "length-mismatch");
    const good = verifyBearerToken(`Bearer ${okToken}`);
    assert.equal(good.ok, true);
    assert.match(tokenFingerprint(okToken), /^[a-f0-9]{16}$/);
    if (priorEnv !== undefined) process.env.BRAIN_LAN_TOKEN = priorEnv;
    else delete process.env.BRAIN_LAN_TOKEN;
  });

  // 5) LAN-era removal gate (SPIKE-002). Excludes *.test.ts — test files
  // legitimately carry brain.local in negative assertions ("prove it's rejected").
  await section("no brain.local references survive in production source", () => {
    const result = execSync(
      "git grep -l 'brain\\.local' -- 'src/**/*.ts' 'src/**/*.tsx' ':!src/**/*.test.ts' android scripts capacitor.config.ts || true",
      { cwd: repoRoot, encoding: "utf8", shell: "/bin/bash" },
    ).trim();
    assert.equal(result, "", `brain.local still present in:\n${result}`);
  });

  await section("no bonjour-service in package.json", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    assert.ok(!("bonjour-service" in all), "bonjour-service must be removed");
    assert.ok(
      !("@capacitor/camera" in all),
      "@capacitor/camera must be removed (no camera-based QR flow)",
    );
  });

  await section("network_security_config.xml is gone", () => {
    const path = join(
      repoRoot,
      "android/app/src/main/res/xml/network_security_config.xml",
    );
    assert.ok(!existsSync(path), "cleartext-allowance XML must not exist");
  });

  // 6) Capacitor config bakes the tunnel URL
  await section("capacitor.config.ts wires server.url to brain.arunp.in", () => {
    const src = readFileSync(join(repoRoot, "capacitor.config.ts"), "utf8");
    assert.match(src, /brain\.arunp\.in/, "server.url references the named tunnel");
  });

  // 7) Extension manifest invariants
  await section("extension manifest is MV3 with brain.arunp.in host permission", () => {
    const mf = JSON.parse(
      readFileSync(join(repoRoot, "extension/manifest.json"), "utf8"),
    );
    assert.equal(mf.manifest_version, 3);
    assert.equal(mf.version, "0.5.0");
    assert.deepEqual(mf.host_permissions, ["https://brain.arunp.in/*"]);
    for (const p of ["activeTab", "tabs", "contextMenus", "storage", "notifications"]) {
      assert.ok(mf.permissions.includes(p), `permission ${p} declared`);
    }
    assert.ok(mf.background?.service_worker, "MV3 service worker configured");
    assert.equal(mf.background.type, "module", "SW is module type");
  });

  await section("extension build output exists at dist/", () => {
    const distPath = join(repoRoot, "extension/dist");
    assert.ok(existsSync(distPath), "extension/dist/ must exist (run npm run build in extension/)");
    assert.ok(
      existsSync(join(distPath, "manifest.json")),
      "dist/manifest.json exists",
    );
  });

  // 8) Root package.json at 0.5.0
  await section("package.json version bumped to 0.5.0", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    assert.equal(pkg.version, "0.5.0");
  });
}

await run();

if (failures > 0) {
  console.error(`\n[smoke v0.5.0] ${failures} FAILED`);
  process.exit(1);
}
console.log("\n[smoke v0.5.0] all checks passed");
