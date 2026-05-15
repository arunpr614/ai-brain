#!/usr/bin/env node
/**
 * inspect-webview.mjs (DIAG-1, hardened per self-critique §6)
 *
 * Headless replacement for chrome://inspect → DevTools clicks. Connects
 * to the running Brain APK via ADB + CDP and reports:
 *   - WebView URL + page target
 *   - All service worker versions for the origin (status, runningStatus,
 *     scriptURL, controlled clients)
 *   - All cache storage names for https://brain.arunp.in
 *   - Cached request URLs per cache (paths only, sorted)
 *
 * Hardening over the §F draft in the research doc:
 *   - adb preflight (fails fast with friendly message if adb not in PATH)
 *   - 30s overall deadline (no infinite hang on a wedged WebView)
 *   - Multi-PID pidof handling (split + take first)
 *   - Page target selected by APP_ORIGIN URL prefix, not just type
 *   - runningStatus assertion accepts all 4 valid values
 *   - client.close() in try/catch so it can't mask the real error
 *   - Logs page URL prominently (PIN unlock state warning)
 *
 * Plan: docs/plans/v0.5.6-app-shell-sw-REVISED.md DIAG-1 / DIAG-2.
 *
 * Usage:
 *   node scripts/inspect-webview.mjs                # default port 9222
 *   node scripts/inspect-webview.mjs --port 9223
 *   node scripts/inspect-webview.mjs --serial <id>  # specific device
 */

import { execFileSync } from "node:child_process";
import CDP from "chrome-remote-interface";

// ─── Config ──────────────────────────────────────────────────────────────────

const APP_PACKAGE = "com.arunprakash.brain";
const APP_ORIGIN = "https://brain.arunp.in";
const DEADLINE_MS = 30_000;

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback;
}
const LOCAL_PORT = parseInt(flag("--port", "9222"), 10);
const ADB_SERIAL = flag("--serial", null);

const EXPECTED_CACHES = ["brain-shell-v1", "brain-static-v1", "brain-pages-v1"];
const EXPECTED_SHELL_PATHS = [
  "/",
  "/inbox",
  "/share-target",
  "/capture",
  "/offline.html",
  "/favicon.ico",
];
const VALID_SW_RUNNING_STATUS = ["running", "stopped", "starting", "stopping"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function adb(...args) {
  const baseArgs = ADB_SERIAL ? ["-s", ADB_SERIAL] : [];
  return execFileSync("adb", [...baseArgs, ...args], {
    encoding: "utf8",
  }).trim();
}

function log(label, value) {
  if (typeof value === "object") {
    console.log(`\n[${label}]`);
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(`[${label}] ${value}`);
  }
}

const results = { pass: [], fail: [] };
function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    results.pass.push(message);
  } else {
    console.log(`  FAIL: ${message}`);
    results.fail.push(message);
  }
  return Boolean(condition);
}

function fatal(msg, detail) {
  console.error(`\nERROR: ${msg}`);
  if (detail) console.error("Detail:", detail);
  process.exit(1);
}

// ─── Overall deadline ────────────────────────────────────────────────────────

const deadline = setTimeout(() => {
  console.error(`\nTIMEOUT: script exceeded ${DEADLINE_MS}ms.`);
  console.error("Partial results:");
  console.error(`  passes: ${results.pass.length}`);
  console.error(`  fails:  ${results.fail.length}`);
  process.exit(2);
}, DEADLINE_MS);
deadline.unref?.();

// ─── Step 0: adb preflight ──────────────────────────────────────────────────

try {
  execFileSync("adb", ["version"], { stdio: "ignore" });
} catch {
  fatal(
    "adb not found in PATH. Install android-platform-tools or add SDK platform-tools to PATH.",
  );
}

console.log("\n=== Brain WebView Inspector ===");
console.log(`Package: ${APP_PACKAGE}`);
console.log(`Origin:  ${APP_ORIGIN}`);
console.log(`Port:    ${LOCAL_PORT}`);
console.log(`Deadline: ${DEADLINE_MS}ms`);

// ─── Step 1: Discover PID ───────────────────────────────────────────────────

let pid;
try {
  const raw = adb("shell", "pidof", APP_PACKAGE);
  if (!raw) throw new Error("empty pidof output");
  // Multi-PID handling: pidof may return space-separated PIDs
  pid = raw.split(/\s+/)[0];
  log("PID", pid);
} catch (e) {
  fatal(
    `${APP_PACKAGE} is not running on the device. Open the app and re-run.`,
    e.message,
  );
}

// ─── Step 2: Verify debug socket ────────────────────────────────────────────

const socketName = `webview_devtools_remote_${pid}`;
try {
  const unixSockets = adb("shell", "cat", "/proc/net/unix");
  if (!unixSockets.includes(socketName)) {
    fatal(
      `Debug socket "${socketName}" not found in /proc/net/unix.\n` +
        "  - For debug APKs this should be auto-enabled.\n" +
        "  - For release APKs, set android.webContentsDebuggingEnabled = true in capacitor.config.ts.",
    );
  }
  log("Socket", `@${socketName} — found`);
} catch (e) {
  if (e.message.includes("Debug socket")) throw e;
  fatal("Could not read /proc/net/unix.", e.message);
}

// ─── Step 3: ADB forward ────────────────────────────────────────────────────

try {
  adb("forward", `tcp:${LOCAL_PORT}`, `localabstract:${socketName}`);
  log("ADB Forward", `tcp:${LOCAL_PORT} -> localabstract:${socketName}`);
} catch (e) {
  fatal("adb forward failed.", e.message);
}

// Cleanup forward on exit
function cleanupForward() {
  try {
    adb("forward", "--remove", `tcp:${LOCAL_PORT}`);
    console.log(`[Cleanup] Removed tcp:${LOCAL_PORT} forward`);
  } catch {
    /* non-fatal */
  }
}
process.on("exit", cleanupForward);
process.on("SIGINT", () => process.exit(130));
process.on("SIGTERM", () => process.exit(143));

// ─── Step 4: Discover CDP targets ───────────────────────────────────────────

let targets;
try {
  targets = await CDP.List({ port: LOCAL_PORT });
  console.log("\n[All Targets]");
  for (const t of targets) {
    console.log(`  - ${t.type.padEnd(16)} ${t.url}`);
  }
} catch (e) {
  fatal(`Could not reach http://localhost:${LOCAL_PORT}/json`, e.message);
}

// ─── Step 5: Page target selection (with origin filter, not just type) ──────

const originPageTargets = targets.filter(
  (t) => t.type === "page" && t.url.startsWith(APP_ORIGIN),
);
const pageTarget = originPageTargets[0] ?? targets.find((t) => t.type === "page");
if (!pageTarget) {
  fatal(
    "No page target found. Is the WebView visible / not backgrounded?",
  );
}
log("Page Target", { url: pageTarget.url, id: pageTarget.id });

// PIN unlock state warning
if (pageTarget.url.includes("/unlock") || pageTarget.url.includes("/setup-apk")) {
  console.warn(
    "\nWARN: Page is on /unlock or /setup-apk. SW may not have intercepted page navigations yet.\n" +
      "      Drive the WebView through PIN unlock / pairing before re-running.",
  );
}

// Service worker targets (separate from page)
const swTargets = targets.filter((t) => t.type === "service_worker");
log(
  "Service Worker Targets",
  swTargets.map((t) => ({ url: t.url, id: t.id })),
);

// ─── Step 6: Connect to page target and inspect ─────────────────────────────

let client;
let lastErr;
for (let attempt = 1; attempt <= 4; attempt++) {
  try {
    client = await CDP({
      target: pageTarget.webSocketDebuggerUrl,
      port: LOCAL_PORT,
    });
    break;
  } catch (e) {
    lastErr = e;
    console.warn(
      `[retry ${attempt}/4] CDP connect failed: ${e.message} — sleeping 500ms`,
    );
    await new Promise((r) => setTimeout(r, 500));
  }
}
if (!client) fatal("Could not open CDP WebSocket after 4 retries.", lastErr?.message);

let inspectionError;
try {
  await client.Runtime.enable();

  // ── 1. Current URL ────────────────────────────────────────────────────────
  console.log("\n=== 1. Current WebView URL ===");
  log("URL", pageTarget.url);
  assert(pageTarget.url.startsWith(APP_ORIGIN), `URL starts with ${APP_ORIGIN}`);

  // ── 2. Service Worker registrations ───────────────────────────────────────
  console.log("\n=== 2. Service Worker Registrations ===");
  await client.ServiceWorker.enable();

  const swVersions = await new Promise((resolve) => {
    const collected = [];
    let settleTimer;
    const settle = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => resolve(collected), 400);
    };
    client.ServiceWorker.workerVersionUpdated(({ versions: v }) => {
      collected.push(...v);
      settle();
    });
    // Give-up timer if no events fire — SW may not be registered at all
    setTimeout(() => {
      if (collected.length === 0) resolve([]);
    }, 1500);
    settle();
  });

  if (swVersions.length === 0) {
    console.log("  No service worker versions reported for this page target.");
    results.fail.push("SW: no versions reported");
  } else {
    const unique = [
      ...new Map(swVersions.map((v) => [v.versionId, v])).values(),
    ];
    for (const v of unique) {
      log("SW Version", {
        scriptURL: v.scriptURL,
        status: v.status,
        runningStatus: v.runningStatus,
        registrationId: v.registrationId,
        versionId: v.versionId,
        controlledClients: v.controlledClients?.length ?? 0,
      });
    }
    const ours = unique.find(
      (v) => v.scriptURL && v.scriptURL.startsWith(APP_ORIGIN),
    );
    assert(ours !== undefined, `SW for ${APP_ORIGIN} is registered`);
    if (ours) {
      assert(ours.status === "activated", `SW status is "activated"`);
      assert(
        VALID_SW_RUNNING_STATUS.includes(ours.runningStatus),
        `SW runningStatus is one of ${VALID_SW_RUNNING_STATUS.join("/")} (got "${ours.runningStatus}")`,
      );
    }
  }

  // ── 3. Cache Storage names ────────────────────────────────────────────────
  console.log("\n=== 3. Cache Storage Names ===");
  let caches = [];
  try {
    const result = await client.CacheStorage.requestCacheNames({
      securityOrigin: APP_ORIGIN,
    });
    caches = result.caches ?? [];
  } catch (e) {
    console.error("  ERROR calling CacheStorage.requestCacheNames:", e.message);
  }
  log(
    "Caches found",
    caches.map((c) => c.cacheName),
  );
  for (const expected of EXPECTED_CACHES) {
    assert(
      caches.some((c) => c.cacheName === expected),
      `Cache "${expected}" exists`,
    );
  }

  // ── 4. Cache entries ──────────────────────────────────────────────────────
  console.log("\n=== 4. Cache Entries (paths only) ===");
  for (const cache of caches) {
    console.log(`\n  Cache: "${cache.cacheName}" (id: ${cache.cacheId})`);
    let entries = [];
    let returnCount = 0;
    try {
      const result = await client.CacheStorage.requestEntries({
        cacheId: cache.cacheId,
        skipCount: 0,
        pageSize: 500,
      });
      entries = result.cacheDataEntries ?? [];
      returnCount = result.returnCount ?? entries.length;
    } catch (e) {
      console.error(`  ERROR reading entries for ${cache.cacheName}:`, e.message);
    }
    console.log(`  Total entries: ${returnCount}`);
    const paths = entries
      .map((e) => {
        try {
          return new URL(e.requestURL).pathname;
        } catch {
          return e.requestURL;
        }
      })
      .sort();
    for (const p of paths) console.log(`    ${p}`);

    if (cache.cacheName === "brain-shell-v1") {
      for (const expected of EXPECTED_SHELL_PATHS) {
        assert(
          paths.includes(expected),
          `brain-shell-v1 contains "${expected}"`,
        );
      }
    }
  }
} catch (e) {
  inspectionError = e;
  console.error("\nERROR during inspection:", e.message);
} finally {
  try {
    await client.close();
  } catch {
    /* don't mask the real error */
  }
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log("\n=== Summary ===");
console.log(`PASS: ${results.pass.length}`);
console.log(`FAIL: ${results.fail.length}`);
if (results.fail.length > 0) {
  console.log("\nFailed assertions:");
  for (const f of results.fail) console.log(`  - ${f}`);
}

clearTimeout(deadline);

if (inspectionError || results.fail.length > 0) process.exit(1);
console.log("\n=== Inspection complete (all assertions green) ===\n");
