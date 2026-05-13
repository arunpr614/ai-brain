# M8 — Debugging and Incident Response

**Version:** 1.0
**Date:** 2026-05-13
**Previous version:** `Handover_docs_12_05_2026/08_Debugging_and_Incident_Response.md`
**Baseline:** full
**Scope:** known issues + diagnostic recipes (carries Lane C K-1; adds Lane L outbox failure modes)
**Applies to:** both lanes (with clear lane ownership per issue)
**Status:** COMPLETE (documentation)

> **For the next agent:** if something is broken, find the issue here first. If it's not here, add it. Lane ownership matters: the wrong lane attempting a fix can make things worse. Default rule: **production-path issues are Lane C**, **codebase bugs that don't involve the cloud are Lane L**, **ambiguous issues go to the user to route**. **New this session:** §3 (APK build failures), §4 (outbox failure modes), §5 (notification debugging). K-1 from v4 baseline still OPEN.

---

## 1. Known-issues register (at package creation)

| ID | Severity | Component | Description | Lane | Status |
|---|---|---|---|---|---|
| K-1 | **HIGH** | Hetzner SSH | Provisioned server rejects local SSH key (key wasn't attached at create time) | Lane C | OPEN (carries forward from v4 baseline) |
| K-2 | **LOW** | Docs/tag | `main` may not be at `cee808c` (v0.5.1 ship). Verify before rebase. | shared | audit (carries forward) |
| K-3 | **INFO** | package.json | Version now `0.5.5` per Lane L offline-mode shipment; v0.6.0 bump still belongs to Lane C | both | by design |
| K-4 | **INFO** | `docs/research/*` files untracked from prior sessions | Multiple research docs not committed to a Lane C branch yet | Lane C | pending commit |
| **K-5** | **MEDIUM** | **Lane L 16 commits unpushed** | All session-end commits from `90711f3..4a6548a` are local-only | Lane L | **action item M9 §3.1** |
| **K-6** | **HIGH** | **Outbox device verification** | APK 0.5.5 built but never installed on the Pixel; manual matrix unrun | Lane L | **action item M9 §3.2** |
| **K-7** | **LOW** | **`npm audit` 4 vulns ignored** | 3 plugin installs across 2 sessions, no audit review | Lane L | **action item M9 §3.5** |
| **K-8** | **LOW** | **`009_edges.sql` uncommitted** | Carried in working tree across 4 sessions; GRAPH-1 sketch | Lane L | resolve at GRAPH-1 kickoff |

## 2. K-1 — Hetzner SSH rejects key (BLOCKING Lane C, unchanged)

**Source:** carries forward verbatim from `../Handover_docs_12_05_2026/08_Debugging_and_Incident_Response.md` §2. Read that document for the full diagnostic + 2-path resolution flow. No update this session.

## 3. APK build failure modes (NEW this session — Lane L)

### 3.1 `Module not found: Can't resolve 'fs'` (or 'crypto', 'path')

**Symptom:** `npm run build:apk` step 2 (`next build`) fails with import-trace pointing through a client component file → some library → Node-only module.

**Real example from this session (`86cefb3` then fixed by `4a6548a`):**

```
Module not found: Can't resolve 'fs'

Import trace:
  Client Component Browser:
    ./node_modules/jsdom/lib/jsdom/browser/resources/jsdom-dispatcher.js [Client Component Browser]
    ./node_modules/jsdom/lib/api.js [Client Component Browser]
    ./src/lib/capture/youtube.ts [Client Component Browser]
    ./src/lib/outbox/dedup.ts [Client Component Browser]
    ./src/components/share-handler.tsx [Client Component Browser]
    ./src/components/share-handler.tsx [Server Component]
    ./src/app/layout.tsx [Server Component]
```

**Root cause:** a file imported by a `"use client"` component has a top-level `import { ... } from "<server-only-pkg>"`. ESM hoists every top-level import; webpack tries to bundle the server-only package into the browser bundle.

**Diagnostic:**

1. Read the import trace bottom-up. The leftmost file in the trace (closest to the failing module) is the culprit.
2. Look at that file's imports. Which top-level import pulls in the offending lib?
3. Check whether the symbols you actually use from that file need the server-only lib, or whether they're pure helpers that happen to coexist with server code.

**Fix pattern:**

1. Extract pure helpers into a new sibling file with zero server deps.
2. Have the original file re-export from the new file for back-compat.
3. Update the client-side caller to import from the new pure file.

Example (`4a6548a`): extracted `extractVideoId`, `canonicalYoutubeUrl`, `YOUTUBE_PATTERNS` from `src/lib/capture/youtube.ts` (which imports jsdom) into new `src/lib/capture/youtube-url.ts` (no server deps). `youtube.ts` re-exports them. `src/lib/outbox/dedup.ts` now imports from `youtube-url.ts` directly.

**Prevention:** run `npm run build:apk` BEFORE every commit that touches any file in `src/components/`, `src/app/`, or `src/lib/outbox/`. `npm test` + `tsc --noEmit` + server-only `next build` are necessary but NOT sufficient. The `next build` invoked by `build:apk` runs with the full client bundle split.

### 3.2 `gradlew assembleDebug` fails with license errors

**Symptom:** Gradle stops with "You have not accepted the license agreements".

**Fix:**

```bash
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
# Press y to accept all
```

### 3.3 `adb install -r` fails: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

**Symptom:** install rejected because the new APK is signed with a different debug key than the one previously installed.

**Fix:**

1. `adb uninstall com.arunprakash.brain` (wipes app data including bearer token + outbox; user re-pairs after).
2. `adb install data/artifacts/brain-debug-0.5.5.apk` (fresh install).

This commonly happens after `android/app/debug.keystore` regenerates (e.g., after a clean checkout on a new machine).

## 4. Outbox failure modes (NEW this session — Lane L)

### 4.1 Outbox-init fails silently

**Symptom:** Share enqueues but `/inbox` shows empty; no toast.

**Diagnostic:**

1. ADB logcat: `adb logcat | grep "share.outbox.init-failed"`. The `share-handler.tsx` falls through to direct-POST if init fails.
2. Open `chrome://inspect` on Mac → inspect the WebView → Console tab. Look for IDB errors.
3. Check WebView storage: `chrome://inspect` → Devtools → Application → IndexedDB → `brain-outbox`. If absent, `initOutbox()` never resolved.

**Likely causes:**

- IndexedDB unavailable in this Capacitor WebView build (rare; `OFFLINE-PRE` quota probe at `/debug/quota` will report this).
- `navigator.storage.persist()` threw and the catch silently swallowed it. The init still resolves but with `persistGranted=null`. (Not a failure mode for the share path itself — `share.outbox.persist-denied` is informational.)

### 4.2 Share enqueues to outbox but never syncs

**Symptom:** `/inbox` shows row queued; never flips to synced even when online.

**Diagnostic:**

1. Confirm bearer token: `adb logcat | grep "lan.bearer.reject"`. If reject lines appear, the bearer token is stale or the server expects a different one.
2. Confirm Mac server is up: `curl -I https://brain.arunp.in/api/health` — if 502, server is down.
3. Confirm triggers fire: in `chrome://inspect` Console, run:
   ```js
   await navigator.storage.estimate();
   // Then trigger sync manually:
   const db = await indexedDB.open('brain-outbox');
   ```
   ...or just tap "Sync now" on `/inbox`.
4. If sync-now does nothing: triggers.ts `running` flag is stuck. This is a code bug; reload the WebView to reset.

**Likely causes:**

- `@capacitor/network` listener never registered (plugin install failed silently). Check `npx cap doctor`.
- `EXPECTED_CLIENT_API` mismatch — server returns 422 with `code: 'version_mismatch'`. Row goes stuck:version_mismatch with "Update Brain" copy. Visible in `/inbox` row.

### 4.3 PDF row stuck despite filesystem present

**Symptom:** `/inbox` shows PDF row queued; manual Retry doesn't help.

**Diagnostic:**

1. ADB shell: `adb shell ls -la /data/data/com.arunprakash.brain/files/outbox-pdfs/`. If empty, `savePdf` never wrote the file.
2. Check the row: `chrome://inspect` → IDB → `brain-outbox.outbox` → find by id. `file_path` field should match what's on filesystem.
3. Try `pdfTransport` directly via Console:
   ```js
   const transport = ... // build from outbox/transport.ts
   await transport(entry);
   ```

**Likely causes:**

- File deleted by Android system (low storage, app cache cleanup). Discard the row.
- Filesystem permission issue. Re-pair APK or reinstall.

### 4.4 Storage almost full

**Symptom:** Toast: "Storage almost full — sync existing items before saving more." New shares rejected.

**Diagnostic:**

1. Run OFFLINE-PRE probe at `/debug/quota` → check `usage / quota`.
2. If usage / quota > 0.95: `/inbox` should show a lot of synced rows (auto-retained per plan §4.4). User can Discard the oldest.
3. If quota itself is low (<100 MB): the device may not be a good fit for PDF MVP — defer to v0.7.x WorkManager (plan §8.1).

**Fix paths:**

- User-driven: Discard old synced rows from `/inbox`.
- Automatic: `quota-pressure escape valve` at 85% prunes oldest > 200 synced rows (plan §4.4).

## 5. Notification debugging (NEW this session — Lane L)

### 5.1 First-enqueue permission prompt never fires

**Symptom:** A successful enqueue happens; no Android permission dialog.

**Diagnostic:**

1. ADB logcat: `adb logcat | grep "POST_NOTIFICATIONS"` — Android prints permission decisions here.
2. Check if permission was already granted/denied: `adb shell dumpsys package com.arunprakash.brain | grep POST_NOTIFICATIONS`.
3. If denied previously, the OS suppresses re-prompts. Settings → Apps → Brain → Notifications → enable manually.

**Likely causes:**

- `ensurePermissionRequested` was called on a previous session and got "denied" — `state.permissionGranted=false` persists in memory only, but Android remembers user-denied state across sessions.
- `@capacitor/local-notifications` plugin not installed. Check `npx cap doctor`.

### 5.2 Stuck-state notification never appears

**Symptom:** A row goes stuck (e.g., bearer rotated → row goes stuck:auth_bad), but no Android notification fires.

**Diagnostic:**

1. Confirm permission granted (§5.1).
2. Confirm transition: was the LAST observed stuck count 0 BEFORE this run? `notifications.ts` only fires on 0→≥1. If a stuck row was already present from a prior cycle, the count went 1→2 (no notification per plan §5.6).
3. Check debounce: the 30s debounce suppresses fires within the window. ADB logcat will not show this directly, but `last_attempt_at` on the row tells you when sync ran.

### 5.3 Notification fires but tap doesn't route to /inbox

**Symptom:** Notification appears; tapping it opens Brain on the library, not `/inbox`.

**Diagnostic:**

1. Check `notification.extra.route` was populated: `notifications.ts:120` sets `extra: { route: "/inbox" }`.
2. Check `share-handler.tsx` notification-tap listener registered: search ADB logcat for `localNotificationActionPerformed`.
3. Confirm Capacitor `LocalNotifications.addListener` returned without throwing.

**Likely causes:**

- Brain was force-stopped between the notification firing and the user tapping. The listener is per-session; tapping cold-launches Brain on the default route, not `/inbox`. **This is a known limitation; v0.7.x WorkManager design has notes on a foreground-service notification model that handles this better.**

## 6. Secret-leak playbook (carried forward)

Carries forward verbatim from `../Handover_docs_12_05_2026/08_Debugging_and_Incident_Response.md` §6.

## 7. Cross-references

- M3 — secrets policy (where to NEVER paste keys)
- M9 — action items per lane
- `RUNNING_LOG.md` 31st entry §"Session self-critique" — the five things that almost broke
- `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md` §10 — failure escalation procedure tied to specific scenarios
