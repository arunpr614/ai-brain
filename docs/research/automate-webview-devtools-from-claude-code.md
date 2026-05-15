# Automating Chrome DevTools Inspection of the Brain Android WebView from Claude Code

**Date:** 2026-05-14
**Audience:** Claude Code agent that will implement a headless inspection script for `com.arunprakash.brain`
**Goal:** Replace four manual chrome://inspect steps with a Node.js script that emits: current WebView URL, service worker registrations + states, cache storage names, and per-cache URL lists.
**Self-critique applied:** v1.1 incorporates fixes from `automate-webview-devtools-from-claude-code-SELF-CRITIQUE.md` §6 items #3–#15. Item #1 (run §F script against live device) was acted on by `scripts/inspect-webview.mjs` and `docs/research/inspect-webview-output-2026-05-14.md` — the run revealed a Capacitor-specific WebSocket-hangup issue that drove a 4-attempt retry loop into the production script.

---

## §0. TL;DR (read this first if you are an agent)

1. `npm install chrome-remote-interface` (already in `devDependencies` for this project).
2. Open the Brain APK on a connected Pixel; PIN-unlock so the WebView is on `https://brain.arunp.in/...` not `/unlock` or `/setup-apk`.
3. Run `node scripts/inspect-webview.mjs`.
4. The script asserts pass/fail for: SW status `activated`, three named caches exist, `brain-shell-v1` contains the 6 expected paths.
5. Exit code: 0 = all green; 1 = at least one assertion failed; 2 = 30s deadline exceeded.
6. If you only want target enumeration without WebSocket interaction, hit `http://localhost:9222/json` after `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>` — that path always works even when WebSocket connections are flaky in Capacitor's WebView (observed 2026-05-14).

The rest of this document explains *why* and provides the protocol details when the script needs adaptation.

---

## Table of Contents

1. [Underlying Mechanism (CDP over ADB)](#a-underlying-mechanism)
2. [Discovery — Enumerating WebView Debug Sockets](#b-discovery)
3. [Library Comparison](#c-library-comparison)
4. [Specific CDP Commands Needed](#d-specific-cdp-commands)
5. [Pitfalls and Edge Cases](#e-pitfalls-and-edge-cases)
6. [Concrete Working Script](#f-concrete-working-script)
7. [Authoritative Sources](#g-authoritative-sources)
8. [Existing CLI Tools](#h-existing-cli-tools)

---

## A. Underlying Mechanism

### Chrome DevTools Protocol (CDP)

The Chrome DevTools Protocol is the instrumentation interface used by chrome://inspect, Puppeteer, Playwright, and all remote debugging tools. It organizes functionality into **domains** (DOM, Network, ServiceWorker, CacheStorage, Target, etc.), each exposing typed **commands** and **events** as bidirectional JSON-RPC messages over a WebSocket connection.

Source: https://chromedevtools.github.io/devtools-protocol/

### How chrome://inspect Actually Works

When you click "inspect" in chrome://inspect, Chrome Desktop:

1. Runs `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>` to tunnel the device's abstract Unix domain socket to localhost:9222.
2. Hits `http://localhost:9222/json` (HTTP, not WS) to get the list of debuggable targets (pages, workers).
3. Opens a WebSocket to the `webSocketDebuggerUrl` of the selected target.
4. Sends CDP commands over that WebSocket.

You can replicate every one of these steps from a Node.js script.

### The Socket Name Format

Confirmed from Chromium source (`android_webview/browser/aw_devtools_server.cc`):

```
webview_devtools_remote_<pid>
```

Where `<pid>` is the decimal process ID of the app process on the device. Example for PID 12345:

```
localabstract:webview_devtools_remote_12345
```

The Chrome browser itself uses `chrome_devtools_remote` (no PID suffix) because it manages its own single socket. WebViews always embed the PID so multiple WebView-hosting apps can coexist.

### The `adb forward` Command

```bash
adb forward tcp:9222 localabstract:webview_devtools_remote_12345
```

This binds port 9222 on the Mac (localhost) to the abstract socket on the device. After this, the full CDP HTTP/WS interface is available at `http://localhost:9222`.

Key HTTP endpoints after forwarding:

| URL | Purpose |
|-----|---------|
| `http://localhost:9222/json` | List all page/worker targets with `webSocketDebuggerUrl` per entry |
| `http://localhost:9222/json/version` | Browser-level info and browser `webSocketDebuggerUrl` |
| `http://localhost:9222/json/list` | Same as `/json` |

---

## B. Discovery

### Step 1 — Find the Running App's PID

```bash
adb shell ps -A | grep com.arunprakash.brain
```

This outputs a line like:
```
u0_a123   12345  1234  ... com.arunprakash.brain
```

The second column is the PID. You can also use:

```bash
adb shell pidof com.arunprakash.brain
```

### Step 2 — Verify the Debug Socket Exists

```bash
adb shell cat /proc/net/unix | grep webview_devtools_remote
```

Returns lines like:
```
00000000: 00000002 00000000 00010000 0001 01 12345 @webview_devtools_remote_12345
```

The `@` prefix denotes an abstract Unix socket. The socket name is everything after `@`. If this line does not appear, WebView debugging is not enabled (see §E for Capacitor debug flag details).

You can also query specifically for the brain app:

```bash
adb shell cat /proc/net/unix | grep webview_devtools_remote_$(adb shell pidof com.arunprakash.brain)
```

### Step 3 — Forward and Discover Targets

```bash
PID=$(adb shell pidof com.arunprakash.brain | tr -d '\r')
adb forward tcp:9222 localabstract:webview_devtools_remote_${PID}
curl -s http://localhost:9222/json
```

The JSON response is an array of target objects:

```json
[
  {
    "description": "",
    "devtoolsFrontendUrl": "/devtools/inspector.html?...",
    "faviconUrl": "https://brain.arunp.in/favicon.ico",
    "id": "ABCD-1234-...",
    "title": "Brain",
    "type": "page",
    "url": "https://brain.arunp.in/inbox",
    "webSocketDebuggerUrl": "ws://localhost:9222/devtools/page/ABCD-1234-..."
  }
]
```

There may also be `service_worker` type entries in this list — they are separate targets with their own `webSocketDebuggerUrl`.

### Complete Shell Discovery One-Liner

```bash
PID=$(adb shell pidof com.arunprakash.brain | tr -d '\r') && \
adb forward tcp:9222 localabstract:webview_devtools_remote_${PID} && \
curl -s http://localhost:9222/json | python3 -m json.tool
```

---

## C. Library Comparison

### Option 1: `chrome-remote-interface` (npm)

**Install:**
```bash
npm install chrome-remote-interface
```

**Character:** Minimal, low-level CDP wrapper. Thin JavaScript layer over the raw JSON-RPC protocol. All domains are first-class properties; you call commands like `client.CacheStorage.requestCacheNames({...})`. No browser abstraction.

**API for our use case:**

```javascript
const CDP = require('chrome-remote-interface');

// CDP.List() hits http://localhost:9222/json and returns target array
const targets = await CDP.List({ port: 9222 });

// Connect to a specific target by its webSocketDebuggerUrl
const client = await CDP({ target: 'ws://localhost:9222/devtools/page/TARGET-ID' });

// Enable domains
await client.ServiceWorker.enable();
await client.Runtime.enable();

// Call CacheStorage commands directly
const { caches } = await client.CacheStorage.requestCacheNames({
  securityOrigin: 'https://brain.arunp.in'
});

// Listen to events
client.ServiceWorker.workerVersionUpdated(({ versions }) => { ... });
```

**Capability fit:** thinnest correct CDP abstraction. Every domain is exposed as a first-class namespace property (e.g. `client.CacheStorage.requestCacheNames(...)` instead of `session.send('CacheStorage.requestCacheNames', ...)`). For our use case — query CacheStorage and ServiceWorker domains — this avoids the `session.send()` indirection that Puppeteer and Playwright force.

**Pros:** No overhead, exposes raw CDP 1:1, easy to use `client.send()` for any command, works with any Chromium target including Android WebViews.
**Cons:** No high-level abstractions; you manage all timing/waiting manually; actively maintained but smaller community than Puppeteer.

**Version at time of writing:** 0.34.x (npm). Node.js v6.3.0+ required.

---

### Option 2: `puppeteer-core` with `puppeteer.connect({ browserWSEndpoint })`

**Install:**
```bash
npm install puppeteer-core
```

**Character:** High-level browser automation. `puppeteer.connect()` attaches to an existing running browser. Returns a `Browser` object. Service workers appear as separate `Target` objects with `type === 'service_worker'`.

**API for our use case:**

```javascript
const puppeteer = require('puppeteer-core');

const browser = await puppeteer.connect({
  browserWSEndpoint: 'ws://localhost:9222/devtools/browser/<id>'
  // OR use browserURL: 'http://localhost:9222' (Puppeteer auto-discovers)
});

const pages = await browser.pages();                    // page targets
const targets = browser.targets();
const swTarget = targets.find(t => t.type() === 'service_worker');

// CacheStorage requires dropping to raw CDP via CDPSession:
const page = pages[0];
const session = await page.createCDPSession();
await session.send('ServiceWorker.enable');
const swData = await new Promise(resolve => {
  session.on('ServiceWorker.workerVersionUpdated', resolve);
});
const { caches } = await session.send('CacheStorage.requestCacheNames', {
  securityOrigin: 'https://brain.arunp.in'
});
```

**Capability fit:** higher-level, but for this use case the high-level API doesn't help. Puppeteer has no first-class API for `CacheStorage` or `ServiceWorker` domain commands — you fall through to `page.target().createCDPSession()` and then `session.send('CacheStorage.requestCacheNames', ...)`. That's the same JSON-RPC call you'd make with `chrome-remote-interface`, just routed through one extra abstraction layer. Net code is comparable; mental model is more confusing.

**Pros:** Familiar API; `page.evaluate()` available; strong documentation; large community.
**Cons:** `browserWSEndpoint` may require parsing `/json/version` for the browser-level URL. Android WebViews don't always expose this reliably; `browserURL: 'http://localhost:9222'` (Puppeteer auto-discovery) is the safer entry point. CacheStorage/ServiceWorker domains still drop to raw `CDPSession.send()` regardless.

---

### Option 3: `playwright-core` with `chromium.connectOverCDP()`

**Install:**
```bash
npm install playwright-core
```

**Character:** High-level, Microsoft-maintained. `connectOverCDP()` accepts either the HTTP URL (`http://localhost:9222`) or a WebSocket URL. Returns a `Browser`.

**API for our use case:**

```javascript
const { chromium } = require('playwright-core');

const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0];
const page = context.pages()[0];

// Drop to raw CDP for ServiceWorker/CacheStorage:
const session = await context.newCDPSession(page);
await session.send('ServiceWorker.enable');
const versions = await new Promise(resolve => {
  session.on('ServiceWorker.workerVersionUpdated', ({ versions }) => resolve(versions));
});
const { caches } = await session.send('CacheStorage.requestCacheNames', {
  securityOrigin: 'https://brain.arunp.in'
});
```

**Capability fit:** similar to Puppeteer — CacheStorage/ServiceWorker still require `context.newCDPSession(page)` and `session.send(...)`. `connectOverCDP` accepting a plain HTTP URL is a small ergonomic win over Puppeteer's browserWSEndpoint discovery, but doesn't change the depth of code needed for our use case.

**Pros:** `connectOverCDP` accepts plain HTTP URL (no need to manually parse `/json/version`); well-maintained; TypeScript types included.
**Cons:** Playwright docs explicitly warn "This connection is significantly lower fidelity than the Playwright protocol connection." Some Playwright-specific APIs don't work over CDP. `playwright-core` (no bundled browsers) is ~5–15 MB on disk vs `chrome-remote-interface` at ~200 KB — modest but real overhead for capabilities (page automation, screenshot, navigation) we don't need.

---

### Option 4: Raw `ws` + JSON-RPC

**Install:**
```bash
npm install ws
```

**Character:** Direct WebSocket with hand-written JSON-RPC. You manage message IDs, response correlation, and event routing yourself.

```javascript
const WebSocket = require('ws');
let id = 0;
const pending = new Map();
const ws = new WebSocket('ws://localhost:9222/devtools/page/TARGET-ID');
ws.on('message', (raw) => {
  const msg = JSON.parse(raw);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  } else if (msg.method) {
    // event dispatch
  }
});
const send = (method, params) => new Promise(resolve => {
  const thisId = ++id;
  pending.set(thisId, resolve);
  ws.send(JSON.stringify({ id: thisId, method, params }));
});
```

**Capability fit:** maximum control, maximum ceremony. You write the JSON-RPC message-correlation layer that `chrome-remote-interface` already provides for free. The only reasons to choose this: avoiding any external dep, or learning CDP from scratch.

**Pros:** Zero abstraction overhead; works anywhere `ws` works; no CDP library dependency.
**Cons:** You reinvent the message-correlation wheel; verbose; easy to miss edge cases (errors, timeouts).

---

### Recommendation for This Project

**Use `chrome-remote-interface`.**

Rationale (capability-based, not LOC-counted):
- It is the thinnest correct abstraction over raw CDP — domains are namespaced properties; no `session.send()` indirection.
- `CDP.List()` and `CDP({ target: wsUrl })` map exactly to our discovery and attach steps.
- All five CDP domains we need (Target, ServiceWorker, CacheStorage, Runtime, Page) are exposed as first-class namespaced properties.
- Puppeteer and Playwright force `CDPSession.send(...)` for our exact use case (CacheStorage / ServiceWorker have no high-level API in either) — same JSON-RPC call, more abstraction layers.
- `playwright-core` is ~5–15 MB; `puppeteer-core` similar. CRI is ~200 KB. The size argument is modest but consistent.
- The `ws` option is strictly more work with no benefit.

---

## D. Specific CDP Commands Needed

All commands below are from the Chrome DevTools Protocol "Total" (tip-of-tree) specification at https://chromedevtools.github.io/devtools-protocol/tot/.

### D.1 — List All Targets

**HTTP shortcut (no WebSocket needed):**
```
GET http://localhost:9222/json
```
Returns an array of target objects. Each has `id`, `type`, `url`, `title`, `webSocketDebuggerUrl`.

**CDP command (if already connected to browser target):**
```
Target.getTargets
  params: { filter?: TargetFilter }
  returns: { targetInfos: TargetInfo[] }
```

`TargetInfo.type` values relevant to us:
- `"page"` — the main WebView page
- `"service_worker"` — a registered service worker (separate target)
- `"browser"` — the browser-level target (only reachable via `/json/version`)
- `"iframe"` — sub-frames (rare in Capacitor apps)

**Practical approach:** Use the HTTP `/json` endpoint first. Connect to the page target. Then call `Target.getTargets` to enumerate service worker targets if they're not in `/json`.

### D.2 — Attach to a Target

```
Target.attachToTarget
  params: {
    targetId: TargetID,   // the "id" field from /json
    flatten: boolean      // true = use sessionId multiplexing on one WS connection
  }
  returns: { sessionId: SessionID }
```

With `chrome-remote-interface`, you don't need this explicitly — pass `target: wsUrl` to `CDP()` and it opens a direct WebSocket to that target. `attachToTarget` with `flatten: true` is the mechanism used by DevTools itself to multiplex multiple targets over one connection; for a script, direct per-target connections are simpler.

### D.3 — Get Service Worker Registrations and States

Service workers in CDP run as **separate targets** (type `service_worker`) AND can be inspected via the `ServiceWorker` domain on the **page** target.

**Via the ServiceWorker domain on the page target:**

```
ServiceWorker.enable
  params: (none)
  returns: (none)
  side-effect: starts emitting ServiceWorker.workerVersionUpdated and
               ServiceWorker.workerRegistrationUpdated events
```

```
Event: ServiceWorker.workerVersionUpdated
  params: { versions: ServiceWorkerVersion[] }
```

`ServiceWorkerVersion` fields:
```typescript
{
  versionId: string
  registrationId: string        // ties to a registration
  scriptURL: string             // e.g. "https://brain.arunp.in/sw.js"
  runningStatus: "stopped" | "starting" | "running" | "stopping"
  status: "new" | "installing" | "installed" | "activating" | "activated" | "redundant"
  scriptLastModified?: number
  scriptResponseTime?: number
  controlledClients: TargetID[]
  targetId?: TargetID
}
```

**Pattern for waiting for all workers to report:**

```javascript
await client.ServiceWorker.enable();
// The event fires once immediately with current state, then on each change.
// Collect for ~500ms to get a stable snapshot.
const versions = await new Promise(resolve => {
  const collected = [];
  const timer = setTimeout(() => resolve(collected), 500);
  client.ServiceWorker.workerVersionUpdated(({ versions }) => {
    collected.push(...versions);
    clearTimeout(timer);
    // reset timer so late-arriving updates don't cut snapshot short
    setTimeout(() => resolve(collected), 300);
  });
});
```

**Simpler alternative — just attach to the service_worker target directly:**

If the service worker shows up in `/json` as a separate target, connect directly:
```javascript
const swTarget = targets.find(t => t.type === 'service_worker' 
  && t.url.includes('brain.arunp.in'));
const swClient = await CDP({ target: swTarget.webSocketDebuggerUrl });
// swClient now speaks directly to the SW's JS runtime
```

### D.4 — List Cache Storage Names for an Origin

```
CacheStorage.requestCacheNames
  params: {
    securityOrigin: string   // REQUIRED: e.g. "https://brain.arunp.in"
    // storageKey and storageBucket are alternatives; only one of the three should be set
  }
  returns: {
    caches: Cache[]
  }
```

`Cache` type:
```typescript
{
  cacheId: string      // opaque ID used in subsequent requestEntries calls
  securityOrigin: string
  storageKey: string
  cacheName: string    // e.g. "brain-shell-v1"
}
```

**Important:** This command must be sent to the **page** target, not the service worker target. The page target has access to the storage partition; the SW target's context may not expose CacheStorage.requestCacheNames.

### D.5 — List Entries in a Specific Cache

```
CacheStorage.requestEntries
  params: {
    cacheId: string    // from Cache.cacheId above
    skipCount?: number // default 0
    pageSize?: number  // default: all entries (omit or use large value like 1000)
    pathFilter?: string // optional substring match on request path
  }
  returns: {
    cacheDataEntries: DataEntry[]
    returnCount: number   // total matching entries (for pagination)
  }
```

`DataEntry` type:
```typescript
{
  requestURL: string       // e.g. "https://brain.arunp.in/"
  requestMethod: string    // "GET"
  requestHeaders: Header[]
  responseTime: number     // Unix epoch seconds
  responseStatus: number   // 200
  responseStatusText: string
  responseType: "basic" | "cors" | "default" | "error" | "opaqueResponse" | "opaqueRedirect"
  responseHeaders: Header[]
}
```

The `requestURL` is the full URL including origin, not just the path.

---

## E. Pitfalls and Edge Cases

### E.1 — WebView vs Chrome Browser Socket Names

| Target | Socket name | ADB forward command |
|--------|------------|---------------------|
| Android WebView | `webview_devtools_remote_<pid>` | `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>` |
| Chrome browser | `chrome_devtools_remote` | `adb forward tcp:9222 localabstract:chrome_devtools_remote` |

The Chrome browser has no PID suffix. Every WebView-embedding app gets its own socket with its PID embedded. If multiple apps with WebViews are running simultaneously, each has a different socket name / PID. Enumerate with `/proc/net/unix` and match against `com.arunprakash.brain` via `ps`.

### E.2 — HTTP Endpoint Discovery vs WebSocket Endpoint

Do NOT try to connect a WebSocket to `http://localhost:9222`. The sequence is:

1. HTTP GET `http://localhost:9222/json` → get array of targets with `webSocketDebuggerUrl` per target.
2. Open WebSocket to `target.webSocketDebuggerUrl` (e.g. `ws://localhost:9222/devtools/page/XXXX`).

`chrome-remote-interface`'s `CDP.List({ port: 9222 })` does step 1 automatically and returns the parsed JSON array.

### E.3 — Service Worker as a Separate Target

Service workers appear in `/json` as separate entries with `"type": "service_worker"` and a URL pointing to the SW script (e.g. `https://brain.arunp.in/sw.js`). They are **not** sub-resources of the page target; they have their own `webSocketDebuggerUrl`.

You can inspect them two ways:
- **Via the page target's `ServiceWorker` domain:** Gives registration state, running state, version info — read-only inspection. Ideal for our use case.
- **By attaching directly to the SW target:** Gives full JS runtime access (eval, breakpoints) inside the service worker. Not needed for inspection.

For checking "is sw.js activated and running?", use the page target's `ServiceWorker.enable` + `workerVersionUpdated` event approach (§D.3). This is the same data source chrome://inspect → Application → Service Workers shows.

### E.4 — `securityOrigin` for CacheStorage

The `securityOrigin` parameter must be:
- The exact **scheme + host + port** of the page that registered the cache.
- Do NOT include a path — `"https://brain.arunp.in"` is correct; `"https://brain.arunp.in/sw.js"` is wrong.
- Port 443 is omitted for HTTPS (standard origin serialization): `"https://brain.arunp.in"` not `"https://brain.arunp.in:443"`.

For this project the correct value is **`"https://brain.arunp.in"`** because `capacitor.config.ts` sets `server.url: "https://brain.arunp.in"` and `androidScheme: "https"`. The WebView loads the live Cloudflare-tunneled URL directly.

### E.5 — Capacitor Android WebView URL and Origin

This project uses a "thin WebView" architecture:
- `server.url` is set to `"https://brain.arunp.in"` (the live Cloudflare tunnel).
- `androidScheme: "https"`.
- The WebView loads `https://brain.arunp.in` directly, NOT `https://localhost` or `capacitor://localhost`.

Capacitor defaults (`https://localhost`) only apply when `server.url` is absent. Since `server.url` is set, the WebView origin is `https://brain.arunp.in`.

Consequence: the `securityOrigin` for `CacheStorage.requestCacheNames` is `"https://brain.arunp.in"`, and the service worker's `scriptURL` will be `"https://brain.arunp.in/sw.js"`.

### E.6 — Capacitor `webContentsDebuggingEnabled` Flag

Capacitor's Android Bridge gates WebView debug exposure on the app's debuggable flag by default. Specifically: the `android.webContentsDebuggingEnabled` config option falls back to `(applicationInfo.flags & FLAG_DEBUGGABLE) != 0`. This is in `CapConfig.java` in the Capacitor source — the actual line drifts between major versions, so refer to `https://github.com/ionic-team/capacitor/blob/main/android/capacitor/src/main/java/com/getcapacitor/CapConfig.java` and search for `webContentsDebuggingEnabled` rather than relying on a paraphrased excerpt that will rot.

**Behavior summary:**

- **Debug builds** (built with `npx cap run android` or `./gradlew assembleDebug`): `FLAG_DEBUGGABLE` is set → WebView debugging is auto-enabled → the `webview_devtools_remote_<pid>` socket appears.
- **Release builds** (signed release APK, Google Play): `FLAG_DEBUGGABLE` is NOT set → WebView debugging is disabled by default → the socket does NOT appear.

To force it on in a release build, add to `capacitor.config.ts`:
```typescript
android: {
  webContentsDebuggingEnabled: true
}
```

For automated CI/CD inspection of a release APK, this must be explicitly set. For this project (Brain, debug-built APK), the flag is auto-enabled; the socket has been confirmed at `@webview_devtools_remote_<pid>` as recently as 2026-05-14.

### E.11 — PIN unlock state hides the SW from inspection

The Brain APK has a PIN-unlock screen on cold-launch. If the WebView is showing `https://brain.arunp.in/unlock` or `/setup-apk`, the page target's URL reflects that. CacheStorage queries still work (origin-bound), but the SW may not have intercepted page navigations yet (because the navigation that registered the SW hasn't happened from the user's perspective).

**Practical implication:** before running the inspector, drive the WebView through PIN unlock so the page target's URL is on `/`, `/inbox`, or another post-pairing route. The DIAG-1 hardened script in `scripts/inspect-webview.mjs` warns when the URL contains `/unlock` or `/setup-apk`.

### E.12 — Capacitor's WebView CDP server can be flaky on WebSocket connect

**Empirical finding 2026-05-14, Pixel 7 Pro, Brain APK 0.5.6:** the HTTP `/json` endpoint reliably returned the page target after `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`, but `chrome-remote-interface`'s WebSocket connect to the page target's `webSocketDebuggerUrl` consistently failed with `socket hang up` (4/4 attempts). HTTP `/json/version` and `/json/list` returned empty bodies on the same run.

This is **not** documented as a Capacitor-specific issue — it appears to be an Android System WebView CDP server quirk that surfaces under some Capacitor configurations (`server.url` + `androidScheme: "https"` is suspected). The `webview_devtools_remote_<pid>` socket itself is healthy (the page target enumeration via `/json` works), but interactive WebSocket sessions are gated.

**Mitigation:**

1. Implement retry-with-backoff on the CDP WebSocket connect (4 attempts, 500ms apart) — works in some cases.
2. Fall back to HTTP `/json` for read-only target enumeration when WebSocket is unavailable.
3. Use the WebView's own DevTools Console (chrome://inspect → click `inspect` → Console tab) and run JS directly. This is what the user has to do when the script can't reach the runtime.
4. As a last resort, drop CRI in favor of raw `ws` — there's no evidence this fixes the underlying issue, but it removes one library layer.

If you encounter this empirically, document the WebView/Capacitor versions in `docs/research/inspect-webview-output-<date>.md` so future agents can correlate.

### E.7 — Timing: Wait for `Runtime.executionContextCreated` Before Querying

Some CDP domains (particularly those that query live page state) require at least one execution context to be ready. The sequence:

1. Connect to target via WebSocket.
2. Call `Runtime.enable()` — this immediately fires `Runtime.executionContextCreated` for all existing contexts.
3. Only after receiving at least one `executionContextCreated` event is it safe to call `CacheStorage.requestCacheNames`.

In practice, by the time you've done `adb forward`, `curl /json`, and connected the WebSocket, the page is long-loaded and the context is ready. Add a short wait (200-300ms) or listen for the event if writing a robust script.

### E.8 — Multiple Simultaneous ADB Forwards

`adb forward tcp:9222` replaces any existing forward on port 9222. If another forward already occupies 9222, the new one wins. Be safe and call `adb forward --remove tcp:9222` at script teardown.

If running multiple parallel inspections (different devices or apps), use different port numbers: 9222, 9223, etc. Pass `adb -s <serial> forward ...` to target specific devices.

### E.9 — Service Worker May Not Appear in `/json` Until the SW Has Started

If the service worker is in `stopped` runningStatus (no active controlled clients), it may not appear as a separate target in `/json`. Use the page target's `ServiceWorker` domain instead — it reports all registered SWs regardless of running state. The `stopped` runningStatus is normal and expected for a shell SW; it doesn't mean the SW isn't registered.

### E.10 — `adb forward` Survives Across Calls; Clean Up

`adb forward` rules persist until the ADB server is killed or the device disconnects. Running the script multiple times without cleanup leaves stale forward rules. Wrap in try/finally and call:

```bash
adb forward --remove tcp:9222
```

Or use `adb forward --remove-all` to clear all forwards.

---

## F. Concrete Working Script

This script is self-contained and implements all four manual inspection steps headlessly. Save it as `scripts/inspect-webview.mjs` and run with `node scripts/inspect-webview.mjs`.

### Prerequisites

```bash
# From the ai-brain project root:
npm install chrome-remote-interface
# adb must be in PATH and device connected with USB debugging authorized
```

### The Script

```javascript
#!/usr/bin/env node
/**
 * inspect-webview.mjs
 *
 * Headless replacement for the four manual chrome://inspect steps:
 *   1. Connects to com.arunprakash.brain via ADB + CDP
 *   2. Reports the current WebView URL
 *   3. Reports all service worker registrations and their states
 *   4. Reports all cache storage names for the app origin
 *   5. Reports all cached request URLs per cache
 *
 * Usage:
 *   node scripts/inspect-webview.mjs
 *   node scripts/inspect-webview.mjs --port 9223   # use alternate port
 *   node scripts/inspect-webview.mjs --serial emulator-5554  # specific device
 *
 * Requirements:
 *   - npm install chrome-remote-interface
 *   - adb in PATH, device connected, USB debugging authorized
 *   - App must be a debug build OR android.webContentsDebuggingEnabled: true in capacitor.config
 */

import { execSync, execFileSync } from 'node:child_process';
import CDP from 'chrome-remote-interface';

// ─── Config ──────────────────────────────────────────────────────────────────

const APP_PACKAGE   = 'com.arunprakash.brain';
const APP_ORIGIN    = 'https://brain.arunp.in';   // securityOrigin for CacheStorage
const LOCAL_PORT    = parseInt(process.argv.find((a,i) => process.argv[i-1] === '--port') ?? '9222', 10);
const ADB_SERIAL    = process.argv.find((a,i) => process.argv[i-1] === '--serial') ?? null;

// Expected values — used for pass/fail assertions at the end
const EXPECTED_CACHES     = ['brain-shell-v1', 'brain-static-v1', 'brain-pages-v1'];
const EXPECTED_SHELL_URLS = ['/', '/inbox', '/share-target', '/capture', '/offline.html', '/favicon.ico'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function adb(...args) {
  const baseArgs = ADB_SERIAL ? ['-s', ADB_SERIAL] : [];
  return execFileSync('adb', [...baseArgs, ...args], { encoding: 'utf8' }).trim();
}

function log(label, value) {
  if (typeof value === 'object') {
    console.log(`\n[${label}]`);
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(`[${label}] ${value}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    return false;
  } else {
    console.log(`  PASS: ${message}`);
    return true;
  }
}

// ─── Step 1: Discover PID and forward ADB socket ────────────────────────────

console.log(`\n=== Brain WebView Inspector ===`);
console.log(`Package: ${APP_PACKAGE}`);
console.log(`Origin:  ${APP_ORIGIN}`);
console.log(`Port:    ${LOCAL_PORT}`);

// Get PID
let pid;
try {
  pid = adb('shell', 'pidof', APP_PACKAGE);
  if (!pid) throw new Error('empty pidof output');
  log('PID', pid);
} catch (e) {
  console.error(`ERROR: ${APP_PACKAGE} is not running on the device.`);
  console.error('Start the app first, then re-run this script.');
  process.exit(1);
}

// Verify debug socket exists
const socketName = `webview_devtools_remote_${pid}`;
try {
  const unixSockets = adb('shell', 'cat', '/proc/net/unix');
  if (!unixSockets.includes(socketName)) {
    console.error(`ERROR: Debug socket "${socketName}" not found in /proc/net/unix.`);
    console.error('The app may be a release build without webContentsDebuggingEnabled.');
    console.error('Add android.webContentsDebuggingEnabled = true to capacitor.config.ts');
    process.exit(1);
  }
  log('Socket', `@${socketName} — found`);
} catch (e) {
  console.error('ERROR: Could not read /proc/net/unix:', e.message);
  process.exit(1);
}

// ADB forward
try {
  adb('forward', `tcp:${LOCAL_PORT}`, `localabstract:${socketName}`);
  log('ADB Forward', `tcp:${LOCAL_PORT} -> localabstract:${socketName}`);
} catch (e) {
  console.error('ERROR: adb forward failed:', e.message);
  process.exit(1);
}

// ─── Step 2: Discover CDP targets ───────────────────────────────────────────

let targets;
try {
  targets = await CDP.List({ port: LOCAL_PORT });
  log('All Targets', targets.map(t => ({ type: t.type, url: t.url, id: t.id })));
} catch (e) {
  console.error('ERROR: Could not reach http://localhost:' + LOCAL_PORT + '/json');
  console.error('Detail:', e.message);
  process.exit(1);
}

// Find the main page target
const pageTarget = targets.find(t => t.type === 'page');
if (!pageTarget) {
  console.error('ERROR: No page target found. Is the WebView visible / not backgrounded?');
  process.exit(1);
}
log('Page Target', { url: pageTarget.url, id: pageTarget.id });

// ─── Step 3: Connect to page target and inspect ─────────────────────────────

let client;
try {
  client = await CDP({ target: pageTarget.webSocketDebuggerUrl, port: LOCAL_PORT });
} catch (e) {
  console.error('ERROR: Could not open CDP WebSocket:', e.message);
  process.exit(1);
}

try {
  // Enable Runtime first — ensures execution context is ready
  await client.Runtime.enable();

  // ── Report current URL ────────────────────────────────────────────────────
  console.log('\n=== 1. Current WebView URL ===');
  log('URL', pageTarget.url);
  assert(pageTarget.url.startsWith(APP_ORIGIN), `URL starts with ${APP_ORIGIN}`);

  // ── Service Workers ───────────────────────────────────────────────────────
  console.log('\n=== 2. Service Worker Registrations ===');

  await client.ServiceWorker.enable();

  // Collect versions from workerVersionUpdated events.
  // The event fires immediately after enable() with current state, then on changes.
  const versions = await new Promise((resolve) => {
    const collected = [];
    let timer;

    const reschedule = () => {
      if (timer) clearTimeout(timer);
      // Settle after 400ms with no new events
      timer = setTimeout(() => resolve(collected), 400);
    };

    client.ServiceWorker.workerVersionUpdated(({ versions: v }) => {
      collected.push(...v);
      reschedule();
    });

    // If no event arrives within 1s, the SW may not be registered at all
    setTimeout(() => {
      if (collected.length === 0) resolve([]);
    }, 1000);

    reschedule(); // start initial timer in case enable() fires no events
  });

  if (versions.length === 0) {
    console.log('  No service worker versions reported.');
  } else {
    // Deduplicate by versionId (event may fire multiple times)
    const unique = [...new Map(versions.map(v => [v.versionId, v])).values()];
    for (const v of unique) {
      log('SW Version', {
        scriptURL:     v.scriptURL,
        status:        v.status,          // "activated" | "installing" | etc.
        runningStatus: v.runningStatus,   // "running" | "stopped" | etc.
        registrationId: v.registrationId,
        versionId:      v.versionId,
        controlledClients: v.controlledClients?.length ?? 0,
      });
    }

    // Assertions
    const activeSW = unique.find(v =>
      v.scriptURL.includes(APP_ORIGIN) && v.status === 'activated'
    );
    assert(activeSW !== undefined, `sw.js is "activated"`);
    assert(
      activeSW?.runningStatus === 'running' || activeSW?.runningStatus === 'stopped',
      `sw.js runningStatus is "running" or "stopped" (stopped is normal when idle)`
    );
  }

  // ── Cache Storage ─────────────────────────────────────────────────────────
  console.log('\n=== 3. Cache Storage Names ===');

  let caches;
  try {
    const result = await client.CacheStorage.requestCacheNames({
      securityOrigin: APP_ORIGIN,
    });
    caches = result.caches;
  } catch (e) {
    console.error('  ERROR calling CacheStorage.requestCacheNames:', e.message);
    console.error('  This can happen if the page target has no cache storage.');
    caches = [];
  }

  log('Caches found', caches.map(c => c.cacheName));

  // Assert expected caches exist
  for (const expected of EXPECTED_CACHES) {
    assert(
      caches.some(c => c.cacheName === expected),
      `Cache "${expected}" exists`
    );
  }

  // ── Cache Entries ─────────────────────────────────────────────────────────
  console.log('\n=== 4. Cache Entries ===');

  for (const cache of caches) {
    console.log(`\n  Cache: "${cache.cacheName}" (id: ${cache.cacheId})`);

    let entries;
    try {
      const result = await client.CacheStorage.requestEntries({
        cacheId:   cache.cacheId,
        skipCount: 0,
        pageSize:  500,  // increase if you have >500 entries
      });
      entries = result.cacheDataEntries;
      console.log(`  Total entries: ${result.returnCount}`);
    } catch (e) {
      console.error(`  ERROR reading entries for "${cache.cacheName}":`, e.message);
      entries = [];
    }

    for (const entry of entries) {
      const path = new URL(entry.requestURL).pathname;
      console.log(`    ${entry.responseStatus} ${entry.requestMethod} ${path}`);
    }

    // Specific assertion for brain-shell-v1
    if (cache.cacheName === 'brain-shell-v1') {
      const cachedPaths = entries.map(e => new URL(e.requestURL).pathname);
      for (const expected of EXPECTED_SHELL_URLS) {
        assert(
          cachedPaths.includes(expected),
          `brain-shell-v1 contains "${expected}"`
        );
      }
    }
  }

} finally {
  // Always close the CDP connection
  await client.close();

  // Remove the adb forward rule
  try {
    adb('forward', '--remove', `tcp:${LOCAL_PORT}`);
    log('Cleanup', `Removed tcp:${LOCAL_PORT} forward`);
  } catch {
    // Non-fatal
  }

  console.log('\n=== Inspection complete ===\n');
}
```

### Expected Output (Happy Path)

```
=== Brain WebView Inspector ===
Package: com.arunprakash.brain
Origin:  https://brain.arunp.in
Port:    9222

[PID] 12345
[Socket] @webview_devtools_remote_12345 — found
[ADB Forward] tcp:9222 -> localabstract:webview_devtools_remote_12345
[All Targets] [...page and service_worker entries...]
[Page Target] { url: 'https://brain.arunp.in/inbox', id: 'ABCD-...' }

=== 1. Current WebView URL ===
[URL] https://brain.arunp.in/inbox
  PASS: URL starts with https://brain.arunp.in

=== 2. Service Worker Registrations ===
[SW Version] {
  scriptURL: "https://brain.arunp.in/sw.js",
  status: "activated",
  runningStatus: "running",
  ...
}
  PASS: sw.js is "activated"
  PASS: sw.js runningStatus is "running" or "stopped" (stopped is normal when idle)

=== 3. Cache Storage Names ===
[Caches found] [ 'brain-shell-v1', 'brain-static-v1', 'brain-pages-v1' ]
  PASS: Cache "brain-shell-v1" exists
  PASS: Cache "brain-static-v1" exists
  PASS: Cache "brain-pages-v1" exists

=== 4. Cache Entries ===

  Cache: "brain-shell-v1" (id: 0)
  Total entries: 6
    200 GET /
    200 GET /inbox
    200 GET /share-target
    200 GET /capture
    200 GET /offline.html
    200 GET /favicon.ico
  PASS: brain-shell-v1 contains "/"
  PASS: brain-shell-v1 contains "/inbox"
  ... (all 6 assertions pass)

  Cache: "brain-static-v1" (id: 1)
  Total entries: 47
    200 GET /_next/static/chunks/...

  Cache: "brain-pages-v1" (id: 2)
  Total entries: 3
    200 GET /items/...

[Cleanup] Removed tcp:9222 forward

=== Inspection complete ===
```

### Failure Modes and What They Mean

| Error message | Cause | Fix |
|---|---|---|
| `com.arunprakash.brain is not running` | App not open on device | Open the app, then re-run |
| `Debug socket not found` | Release APK without debug flag | Set `android.webContentsDebuggingEnabled: true` in capacitor.config.ts |
| `Could not reach http://localhost:9222/json` | ADB forward failed or device disconnected | Re-connect USB, re-authorize, re-run |
| `No page target found` | WebView is backgrounded or not rendered | Bring app to foreground |
| `CacheStorage.requestCacheNames error` | Service worker hasn't installed yet | Load the app in foreground for 5s, then re-run |
| SW status is `installing` not `activated` | First launch after APK install | Wait for install to complete |
| `brain-shell-v1` missing expected URLs | Service worker is old version | Clear app storage in Android settings and reinstall |

---

## G. Authoritative Sources

| Source | URL | Used for |
|--------|-----|---------|
| Chrome DevTools Protocol overview | https://chromedevtools.github.io/devtools-protocol/ | Protocol architecture, connection mechanism |
| CDP Target domain | https://chromedevtools.github.io/devtools-protocol/tot/Target/ | `getTargets`, `attachToTarget` method signatures |
| CDP ServiceWorker domain | https://chromedevtools.github.io/devtools-protocol/tot/ServiceWorker/ | `enable`, `workerVersionUpdated`, `ServiceWorkerVersion` type |
| CDP CacheStorage domain | https://chromedevtools.github.io/devtools-protocol/tot/CacheStorage/ | `requestCacheNames`, `requestEntries`, `Cache` + `DataEntry` types |
| CDP Runtime domain | https://chromedevtools.github.io/devtools-protocol/tot/Runtime/ | `executionContextCreated` event, `enable` method |
| Chromium source: aw_devtools_server.cc | https://chromium.googlesource.com/chromium/src/+/refs/heads/main/android_webview/browser/aw_devtools_server.cc | Socket name format `webview_devtools_remote_%d` confirmed |
| Chromium DevTools Remote Debugging | https://developer.chrome.com/docs/devtools/remote-debugging/ | ADB forward, USB debugging setup |
| Android WebView Debugging (Chrome DevTools) | https://developer.chrome.com/docs/devtools/remote-debugging/webviews/ | `WebView.setWebContentsDebuggingEnabled`, chrome://inspect workflow |
| chrome-remote-interface README | https://github.com/cyrus-and/chrome-remote-interface | `CDP()` API, `CDP.List()`, `target` option, `client.send()` |
| Puppeteer `connect()` API | https://pptr.dev/api/puppeteer.puppeteer.connect | `browserWSEndpoint` parameter, `Browser` return type |
| Puppeteer TargetType enum | https://pptr.dev/api/puppeteer.targettype | `page`, `service_worker`, `background_page` type values |
| Playwright `connectOverCDP` | https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp | `endpointURL`, limitations vs native Playwright connection |
| Capacitor Android configuration | https://capacitorjs.com/docs/config | `server.url`, `androidScheme`, default origin `https://localhost` |
| Capacitor CapConfig.java (GitHub) | https://github.com/ionic-team/capacitor/blob/main/android/capacitor/src/main/java/com/getcapacitor/CapConfig.java | `webContentsDebuggingEnabled` defaults to `isDebug` (FLAG_DEBUGGABLE) |
| Capacitor Bridge.java (GitHub) | https://github.com/ionic-team/capacitor/blob/main/android/capacitor/src/main/java/com/getcapacitor/Bridge.java | `WebView.setWebContentsDebuggingEnabled(config.isWebContentsDebuggingEnabled())` |
| adbkit (devicefarmer) | https://github.com/devicefarmer/adbkit | `device.forward('tcp:9222', 'localabstract:...')` Node.js API |

---

## H. Existing CLI Tools

### `cdp-cli`

The npm package `cdp-cli` is unmaintained (last publish circa 2016, Node.js 6 era). It exposes basic command invocation from a shell but has no support for Android/WebView discovery, ADB forwarding, or the ServiceWorker/CacheStorage domains. **Do not use.**

### `chrome-remote-interface` CLI mode

`chrome-remote-interface` ships a `chrome-remote-interface` binary that can send one-off CDP commands:

```bash
npx chrome-remote-interface -t ws://localhost:9222/devtools/page/XXX inspect
```

This is useful for ad-hoc exploration but not for scripted multi-step inspection with event handling.

### `android-debug-bridge` (`adbkit`) Node.js library

`adbkit` (npm: `@devicefarmer/adbkit`) can automate the `adb forward` step from Node.js. It is a pure-Node ADB client and supports `localabstract:` socket forwarding. Useful if you want to avoid shelling out to `adb`. However, it adds ~2 MB of dependency for something `execFileSync('adb', ...)` handles in 3 lines.

### `webview-debug-cli`

No package by this name exists on npm as of 2026-05-14. There is no established off-the-shelf CLI tool that combines ADB forwarding + CDP ServiceWorker + CacheStorage inspection in a single command.

### Assessment

There is no maintained, purpose-built CLI for "inspect Android WebView caches and service workers headlessly." The recommended approach is the ~100-line Node.js script in §F above using `chrome-remote-interface`. It is the minimal correct implementation and gives full programmatic control over pass/fail assertions.

---

## §I. Security note (added per self-critique §3.3)

Running `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>` exposes the WebView's full debugging surface to **localhost on the Mac**, unauthenticated. Any local process can connect to port 9222 and execute arbitrary JS in the WebView's context (`Runtime.evaluate`), read its IndexedDB, dump cookies, inspect the network. Treat the script as a developer-only tool:

- Don't run on shared/multi-user machines without considering blast radius.
- Always call `adb forward --remove tcp:9222` (or `--remove-all`) when done. The DIAG-1 hardened script does this automatically on exit (including SIGINT/SIGTERM).
- For CI/CD on shared runners: bind the inspector to a non-default port and tear it down in a `finally` step.

The WebView itself is not exposed to the network — only to the device's loopback interface, then tunneled to the Mac's loopback via ADB. But the Mac's loopback is shared by every local process.

---

*Research v1.1 compiled 2026-05-14. CDP protocol specs from chromedevtools.github.io/devtools-protocol/ (tip-of-tree). Socket name format from Chromium source aw_devtools_server.cc. Capacitor behavior from CapConfig.java source (look up the live line number rather than relying on the paraphrased excerpt that v1.0 of this doc shipped — see §E.6 fix). Project-specific origin and cache names from ai-brain/capacitor.config.ts and public/sw.js. v1.1 incorporates self-critique remediation per `automate-webview-devtools-from-claude-code-SELF-CRITIQUE.md` §6, including the empirical Capacitor WebSocket finding from §E.12.*
