#!/usr/bin/env node

/**
 * Opt-in real-Chrome smoke for the NotebookLM connector pairing boundary.
 *
 * This test deliberately contacts production exactly once with a pairing code
 * that the server's code generator can never create. It uses a fresh temporary
 * Chrome profile and never reads the user's Chrome profile, cookies, or storage.
 *
 * Usage:
 *   BRAIN_NOTEBOOKLM_EXTENSION_BROWSER_SMOKE=1 \
 *   BRAIN_CHROME_FOR_TESTING_BIN="/path/to/Google Chrome for Testing" \
 *   node scripts/smoke-notebooklm-extension-browser.mjs
 */

import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const OPT_IN_ENV = "BRAIN_NOTEBOOKLM_EXTENSION_BROWSER_SMOKE";
const CHROME_BIN_ENV = "BRAIN_CHROME_FOR_TESTING_BIN";
const EXTENSION_DIR_ENV = "BRAIN_NOTEBOOKLM_EXTENSION_DIR";
const EXPECTED_EXTENSION_VERSION = "0.7.4";
const EXCHANGE_URL = "https://brain.arunp.in/api/notebooklm/connectors/exchange";
const GENERATOR_IMPOSSIBLE_CODE = "IIII-IIII";
const GENERIC_NETWORK_ERROR = "Brain could not complete connector setup. Try again shortly.";
const EXPECTED_INVALID_CODE_ERROR =
  "Brain did not recognize this code. Create a new code in Brain settings, then try again.";
const CONNECTOR_CREDENTIAL_KEY = "notebooklm_connector_credential_v1";
const STARTUP_TIMEOUT_MS = 15_000;
const REQUEST_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 100;
const TEMP_PREFIX = "brain-notebooklm-extension-smoke-";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionDir = resolveExtensionDirectory();

class CdpConnection {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener("message", (event) => this.handleMessage(JSON.parse(event.data)));
    socket.addEventListener("close", () => this.rejectPending("CDP connection closed"));
    socket.addEventListener("error", () => this.rejectPending("CDP connection failed"));
  }

  static async open(url) {
    const socket = new WebSocket(url);
    await new Promise((resolvePromise, rejectPromise) => {
      socket.addEventListener("open", resolvePromise, { once: true });
      socket.addEventListener("error", rejectPromise, { once: true });
    });
    return new CdpConnection(socket);
  }

  on(method, listener) {
    const methodListeners = this.listeners.get(method) ?? [];
    methodListeners.push(listener);
    this.listeners.set(method, methodListeners);
  }

  send(method, params = {}, timeoutMs = 10_000) {
    const id = ++this.nextId;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolvePromise, rejectPromise) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        rejectPromise(new Error(`CDP command timed out: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolvePromise, rejectPromise, timeout, method });
    });
  }

  close() {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.close();
    this.rejectPending("CDP connection closed");
  }

  rejectPending(message) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.rejectPromise(new Error(message));
    }
    this.pending.clear();
  }

  handleMessage(message) {
    if (message.id && this.pending.has(message.id)) {
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      clearTimeout(pending.timeout);
      if (message.error) {
        pending.rejectPromise(new Error(`CDP ${pending.method} failed: ${JSON.stringify(message.error)}`));
      } else {
        pending.resolvePromise(message.result);
      }
      return;
    }
    for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
  }
}

if (process.env[OPT_IN_ENV] !== "1") {
  console.log(
    `SKIP: set ${OPT_IN_ENV}=1 to allow one guaranteed-invalid production pairing request.`,
  );
  process.exit(0);
}

if (typeof WebSocket !== "function") {
  throw new Error("This smoke requires a Node.js runtime with the WebSocket global.");
}

const chromeBin = await resolveChromeBinary();
const manifest = await readExtensionManifest();
const profileDir = await mkdtemp(join(tmpdir(), TEMP_PREFIX));
let chromeProcess = null;
let cdp = null;
let chromeStderr = "";
let receivedSignal = null;
const signalHandlers = new Map(
  ["SIGINT", "SIGTERM"].map((signal) => [signal, () => {
    receivedSignal = signal;
    cdp?.close();
    if (chromeProcess?.exitCode === null && chromeProcess?.signalCode === null) {
      chromeProcess?.kill("SIGTERM");
    }
  }]),
);
for (const [signal, handler] of signalHandlers) process.once(signal, handler);

try {
  chromeProcess = spawn(
    chromeBin,
    [
      "--headless=new",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-sync",
      "--metrics-recording-only",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  chromeProcess.stderr.setEncoding("utf8");
  chromeProcess.stderr.on("data", (chunk) => {
    chromeStderr = `${chromeStderr}${chunk}`.slice(-8_000);
  });

  const port = await waitForDevToolsPort(profileDir, chromeProcess);
  const browserVersion = await getJson(`http://127.0.0.1:${port}/json/version`);
  const extensionOrigin = await discoverExtensionOrigin(port, manifest.background.service_worker);
  const pageTarget = await createTarget(port, "about:blank");
  cdp = await CdpConnection.open(pageTarget.webSocketDebuggerUrl);

  const exchangeRequests = [];
  const exchangeExtraHeaders = new Map();
  const exchangeResponses = new Map();
  const loadingFailures = new Map();

  cdp.on("Network.requestWillBeSent", ({ requestId, request }) => {
    if (request.url === EXCHANGE_URL && request.method === "POST") {
      exchangeRequests.push({ requestId, request });
    }
  });
  cdp.on("Network.requestWillBeSentExtraInfo", ({ requestId, headers }) => {
    exchangeExtraHeaders.set(requestId, normalizeHeaders(headers));
  });
  cdp.on("Network.responseReceived", ({ requestId, response }) => {
    if (response.url === EXCHANGE_URL) exchangeResponses.set(requestId, response);
  });
  cdp.on("Network.loadingFailed", ({ requestId, errorText, blockedReason, corsErrorStatus }) => {
    loadingFailures.set(requestId, { errorText, blockedReason, corsErrorStatus });
  });

  await Promise.all([
    cdp.send("Network.enable"),
    cdp.send("Page.enable"),
    cdp.send("Runtime.enable"),
  ]);
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Page.navigate", { url: `${extensionOrigin}/src/options.html` });
  await waitForOptionsReady(cdp);

  await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const input = document.getElementById("pairing-code");
      const button = document.getElementById("pair-connector");
      if (!(input instanceof HTMLInputElement) || !(button instanceof HTMLButtonElement)) {
        throw new Error("pairing controls unavailable");
      }
      input.value = ${JSON.stringify(GENERATOR_IMPOSSIBLE_CODE)};
      button.click();
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  await waitUntil(
    () => exchangeRequests.length === 1 && exchangeResponses.has(exchangeRequests[0].requestId),
    REQUEST_TIMEOUT_MS,
    "the production pairing response",
  );
  assert(exchangeRequests.length === 1, `expected exactly one exchange POST, saw ${exchangeRequests.length}`);
  const [{ requestId, request }] = exchangeRequests;
  const failure = loadingFailures.get(requestId);
  assert(!failure, `exchange request failed in Chrome: ${JSON.stringify(failure)}`);

  const requestHeaders = exchangeExtraHeaders.get(requestId) ?? normalizeHeaders(request.headers);
  assert(
    requestHeaders.origin === extensionOrigin,
    `expected Origin ${extensionOrigin}, received ${requestHeaders.origin ?? "<missing>"}`,
  );
  assert(!("cookie" in requestHeaders), "the isolated pairing request unexpectedly included a cookie");
  assert(!("authorization" in requestHeaders), "the pairing exchange unexpectedly included authorization");

  const response = exchangeResponses.get(requestId);
  assert(response.status === 400, `expected guaranteed-invalid code to return 400, received ${response.status}`);

  const status = await waitForConnectorStatus(cdp);
  assert(status && status.hidden === false, "connector status was not rendered");
  assert(status.className.includes("status--error"), `expected an error status, received ${status.className}`);
  assert(status.text !== GENERIC_NETWORK_ERROR, "the extension still rendered the generic network error");
  assert(status.text === EXPECTED_INVALID_CODE_ERROR, `unexpected pairing recovery text: ${status.text}`);
  const localState = await readSafeLocalPairingState(cdp);
  assert(localState.codeEmpty, "the terminal invalid code was not cleared");
  assert(localState.codeMasked, "the pairing-code input was not re-masked");
  assert(localState.pairButtonEnabled, "the Pair connector button did not recover");
  assert(!localState.credentialPresent, "an invalid pairing unexpectedly stored a credential");

  console.log(JSON.stringify({
    ok: true,
    browser: browserVersion.Browser,
    extensionVersion: manifest.version,
    extensionOriginMatched: requestHeaders.origin === extensionOrigin,
    request: { method: request.method, url: request.url, count: exchangeRequests.length },
    responseStatus: response.status,
    uiRecoveryMatched: status.text === EXPECTED_INVALID_CODE_ERROR,
    localState,
    isolatedProfile: true,
  }, null, 2));
} catch (error) {
  if (receivedSignal) throw new Error(`Smoke interrupted by ${receivedSignal}.`, { cause: error });
  const detail = chromeStderr.trim() ? `\nChrome diagnostics:\n${chromeStderr.trim()}` : "";
  throw new Error(`${error instanceof Error ? error.message : String(error)}${detail}`, { cause: error });
} finally {
  if (cdp) {
    try {
      await cdp.send("Browser.close", {}, 2_000);
    } catch {
      // The targeted process termination below is the fallback.
    }
    cdp.close();
  }
  if (chromeProcess) await stopOwnedProcess(chromeProcess);
  await removeOwnedTempProfile(profileDir);
  for (const [signal, handler] of signalHandlers) process.off(signal, handler);
}

async function resolveChromeBinary() {
  const configured = process.env[CHROME_BIN_ENV]?.trim();
  const candidates = [
    configured,
    "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (!isAbsolute(candidate)) {
      throw new Error(`${CHROME_BIN_ENV} must be an absolute path.`);
    }
    try {
      await access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Try the next explicit Chrome-for-Testing location.
    }
  }
  throw new Error(
    `Chrome for Testing was not found. Set ${CHROME_BIN_ENV} to its executable; ordinary Chrome may reject --load-extension.`,
  );
}

function resolveExtensionDirectory() {
  const configured = process.env[EXTENSION_DIR_ENV]?.trim();
  if (!configured) return resolve(projectRoot, "extension/dist");
  if (!isAbsolute(configured)) throw new Error(`${EXTENSION_DIR_ENV} must be an absolute path.`);
  return resolve(configured);
}

async function readExtensionManifest() {
  const path = join(extensionDir, "manifest.json");
  const parsed = JSON.parse(await readFile(path, "utf8"));
  assert(parsed.manifest_version === 3, "extension/dist is not a Manifest V3 build");
  assert(
    parsed.version === EXPECTED_EXTENSION_VERSION,
    `extension manifest must be version ${EXPECTED_EXTENSION_VERSION}`,
  );
  assert(
    Array.isArray(parsed.host_permissions) && parsed.host_permissions.includes("https://brain.arunp.in/*"),
    "extension/dist lacks the required narrow Brain host permission",
  );
  assert(
    typeof parsed.background?.service_worker === "string",
    "extension/dist manifest has no service worker",
  );
  return parsed;
}

async function waitForDevToolsPort(profilePath, child) {
  const activePortPath = join(profilePath, "DevToolsActivePort");
  return waitUntil(async () => {
    if (child.exitCode !== null) {
      throw new Error(`Chrome exited during startup with code ${child.exitCode}`);
    }
    try {
      const [portText] = (await readFile(activePortPath, "utf8")).trim().split(/\r?\n/u);
      const port = Number(portText);
      return Number.isInteger(port) && port > 0 ? port : false;
    } catch (error) {
      if (error?.code === "ENOENT") return false;
      throw error;
    }
  }, STARTUP_TIMEOUT_MS, "Chrome DevTools startup");
}

async function discoverExtensionOrigin(port, serviceWorkerPath) {
  return waitUntil(async () => {
    const targets = await getJson(`http://127.0.0.1:${port}/json/list`);
    const suffix = `/${serviceWorkerPath}`;
    const worker = targets.find(
      (target) => target.type === "service_worker" && target.url.startsWith("chrome-extension://") && target.url.endsWith(suffix),
    );
    if (!worker) return false;
    // Node serializes non-special URL origins such as chrome-extension:// as
    // "null", so derive the extension origin from the already-validated URL.
    const workerUrl = new URL(worker.url);
    const origin = `${workerUrl.protocol}//${workerUrl.host}`;
    assert(/^chrome-extension:\/\/[a-p]{32}$/u.test(origin), `invalid discovered extension origin: ${origin}`);
    return origin;
  }, STARTUP_TIMEOUT_MS, "the unpacked Brain extension service worker");
}

async function createTarget(port, url) {
  return getJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
}

async function waitForOptionsReady(connection) {
  await waitUntil(async () => {
    const result = await connection.send("Runtime.evaluate", {
      expression: `(() => {
        const input = document.getElementById("pairing-code");
        const button = document.getElementById("pair-connector");
        return Boolean(input && button && !button.disabled && button.textContent === "Pair connector");
      })()`,
      returnByValue: true,
    });
    return result.result?.value === true;
  }, STARTUP_TIMEOUT_MS, "the extension Options controls");
}

async function waitForConnectorStatus(connection) {
  return waitUntil(async () => {
    const result = await connection.send("Runtime.evaluate", {
      expression: `(() => {
        const status = document.getElementById("pairing-status");
        return status ? { text: status.textContent ?? "", className: status.className, hidden: status.hidden } : null;
      })()`,
      returnByValue: true,
    });
    const status = result.result?.value;
    return status && !status.hidden && status.text !== "Pairing with Brain…" ? status : false;
  }, 5_000, "the connector error status");
}

async function readSafeLocalPairingState(connection) {
  const result = await connection.send("Runtime.evaluate", {
    expression: `(async () => {
      const input = document.getElementById("pairing-code");
      const button = document.getElementById("pair-connector");
      const stored = await chrome.storage.local.get(${JSON.stringify(CONNECTOR_CREDENTIAL_KEY)});
      return {
        codeEmpty: input instanceof HTMLInputElement && input.value === "",
        codeMasked: input instanceof HTMLInputElement && input.type === "password",
        pairButtonEnabled: button instanceof HTMLButtonElement && !button.disabled,
        credentialPresent: Boolean(stored[${JSON.stringify(CONNECTOR_CREDENTIAL_KEY)}]),
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  return result.result?.value;
}

async function getJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function waitUntil(check, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    if (receivedSignal) throw new Error(`Smoke interrupted by ${receivedSignal}.`);
    try {
      const value = await check();
      if (value) return value;
      lastError = null;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, POLL_INTERVAL_MS));
  }
  if (lastError) throw lastError;
  throw new Error(`Timed out waiting for ${label}.`);
}

async function stopOwnedProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  if (await waitForExit(child, 3_000)) return;
  child.kill("SIGKILL");
  await waitForExit(child, 3_000);
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolvePromise) => {
    const timeout = setTimeout(() => {
      child.off("exit", onExit);
      resolvePromise(false);
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timeout);
      resolvePromise(true);
    };
    child.once("exit", onExit);
  });
}

async function removeOwnedTempProfile(path) {
  const expectedParent = `${resolve(tmpdir())}${sep}`;
  const resolvedPath = resolve(path);
  assert(
    resolvedPath.startsWith(expectedParent) && resolvedPath.split(sep).at(-1)?.startsWith(TEMP_PREFIX),
    `refusing to remove unexpected temporary path: ${resolvedPath}`,
  );
  await rm(resolvedPath, { recursive: true, force: true });
}

function normalizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers ?? {}).map(([name, value]) => [name.toLowerCase(), String(value)]),
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
