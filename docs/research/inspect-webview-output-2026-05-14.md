# Inspect-WebView CDP output — 2026-05-14

**Plan:** `docs/plans/v0.5.6-app-shell-sw-REVISED.md` DIAG-2
**Device:** Pixel 7 Pro (`2A121FDH300DXA`)
**APK:** `data/artifacts/brain-debug-0.5.6.apk` (v0.5.6, post-SHELL-7)
**Script:** `scripts/inspect-webview.mjs` (DIAG-1 hardened)

---

## §1. Run 1 — 2026-05-14 — first attempt (Brain online + library rendered)

**Command:** `node scripts/inspect-webview.mjs`

**Output (relevant excerpt):**

```
=== Brain WebView Inspector ===
Package: com.arunprakash.brain
Origin:  https://brain.arunp.in
Port:    9222
[PID] 7250
[Socket] @webview_devtools_remote_7250 — found
[ADB Forward] tcp:9222 -> localabstract:webview_devtools_remote_7250

[All Targets]
  - page             https://brain.arunp.in/

[Page Target]
{
  "url": "https://brain.arunp.in/",
  "id": "28C0F1BA890E121C33E5E904CF159A4B"
}

[Service Worker Targets]
[]

ERROR: Could not open CDP WebSocket.
Detail: socket hang up
```

**Headline finding:**

`[Service Worker Targets]` is **empty** — `targets.filter(t => t.type === 'service_worker')` returned `[]`.

The page target is on the correct origin (`https://brain.arunp.in/`), so the WebView is reachable via CDP. But there is **no service_worker target** registered for this origin at the time of inspection.

This maps to **Scenario D** in the revised plan §3.2:

> CDP can't enumerate any service_worker target, but page works → the Capacitor WebView is intercepting the SW registration but not exposing it to CDP. **This may be a Capacitor WebView limitation (real possibility).**

**Confounding factor:** the run hit a "socket hang up" on the page-target WebSocket connect, so we never got to interrogate `ServiceWorker.workerVersionUpdated` from the page side. That data path (page → SW registration list) might still report a registered SW even when the SW target itself isn't enumerable. The retry logic in DIAG-1.1 below should answer this.

## §2. Script hardening between Run 1 and Run 2

After Run 1, added 4-attempt retry with 500ms backoff to the CDP WebSocket connect (Capacitor's WebView occasionally needs settle time after `adb forward`).

## §3. Run 2 — pending

User needs to re-open Brain on the Pixel (it backgrounded between Run 1 and Run 2 attempt; PID gone).

**Expected to confirm or refute:**
- Is the SW empty list a CDP enumeration limitation, OR
- Is the SW genuinely not registered (the page-target's `ServiceWorker.workerVersionUpdated` will report `[]` even after `enable()`).

If the latter, the registration is failing entirely — not a "claim" timing issue but a "register never succeeded" issue. That changes the fix path significantly.

## §4. What this means for the offline cold-launch failure

If the SW is genuinely not registered (Scenario B in the revised plan):
- Cache `brain-shell-v1` was created by a **prior** SW version that activated, ran install, then was orphaned.
- After that SW went redundant, no new SW took its place.
- `register()` from `useEffect` in SHELL-2 either never ran, or ran but failed silently.

Possible causes:
1. **Capacitor WebView restriction:** Android System WebView on Capacitor with `androidScheme: "https"` + `server.url` may have SW disabled by default for security. Citation needed.
2. **CSP / scope issue:** the SW scope `/` may be rejected by the WebView even though it's allowed in regular Chrome.
3. **`<SWBootstrap />` not mounting:** the React component might not be hydrating in this Capacitor context.

## §5. Next steps (after Run 2 confirms)

If SW genuinely not registered:
- Inspect from the WebView Console (chrome://inspect → page → Console) directly:
  - `await navigator.serviceWorker.getRegistrations()` → expect array, may be empty
  - `await navigator.serviceWorker.register('/sw.js')` → call manually, see what error fires
- If manual registration succeeds: `<SWBootstrap />` is the broken link.
- If manual registration fails with an error: that error pinpoints the architectural blocker.

## §6. Cross-references

- `docs/plans/v0.5.6-app-shell-sw-REVISED.md` §3.2 decision matrix
- `scripts/inspect-webview.mjs` — the script
- `docs/research/automate-webview-devtools-from-claude-code-SELF-CRITIQUE.md` — the report this script implements
