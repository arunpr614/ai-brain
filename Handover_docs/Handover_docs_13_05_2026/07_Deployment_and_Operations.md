# M7 — Deployment and Operations

**Version:** 1.0
**Date:** 2026-05-13
**Previous version:** `Handover_docs_12_05_2026/07_Deployment_and_Operations.md`
**Baseline:** full
**Scope:** APK build runbook (NEW section), Mac dev server, Hetzner setup (carries forward from v4 baseline)
**Applies to:** **Lane L primary for §1 (APK), Lane C primary for §3+ (cloud)**
**Status:** COMPLETE (documentation)

> **For the next agent:** the operational surface added this session is **APK build + install** (procedure §1) and the **device-side manual verification flow** (procedure §2). Hetzner runbook and B2 backup procedures from the v4 baseline are unchanged this session — see `../Handover_docs_12_05_2026/07_Deployment_and_Operations.md` for the full Hetzner content; this file references it rather than duplicating. **Lane L** runs §1–§2. **Lane C** runs §3 onward.

---

## 1. APK build runbook (Lane L)

### 1.1 Prerequisites

| Requirement | Where | Verify |
|---|---|---|
| Node 20.x | `nvm use 20` or system Node | `node --version` |
| Android SDK | `~/Library/Android/sdk` (per auto-memory) | `echo $ANDROID_HOME` |
| Gradle | bundled in `android/gradlew` | `cd android && ./gradlew --version` |
| Pixel connected via USB + ADB authorized | run `adb devices` | non-empty list |
| `BRAIN_LAN_TOKEN` in `.env` | `.env` file | `grep -c BRAIN_LAN_TOKEN .env` returns 1 |
| `BRAIN_TUNNEL_URL=https://brain.arunp.in` | `.env` + `src/lib/config/tunnel.ts` | both files match |

### 1.2 Build APK from current branch

```bash
cd /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain
npm install   # reconcile node_modules with package.json (3 new plugins this session)
npm run build:apk
```

What happens:

1. `tsc --noEmit` (typecheck pre-flight)
2. `next build` (full Next.js client + server bundle — catches client-side import errors that `tsc` misses)
3. `npx cap sync android` (copies plugin manifests into `android/app/`)
4. `cd android && ./gradlew assembleDebug` (~90 sec cold, ~10 sec warm)
5. Copy `android/app/build/outputs/apk/debug/app-debug.apk` → `data/artifacts/brain-debug-${VERSION}.apk`

Output: `data/artifacts/brain-debug-0.5.5.apk` (10.9 MB at v0.5.5).

### 1.3 Install on Pixel

```bash
adb install -r data/artifacts/brain-debug-0.5.5.apk
```

`-r` reinstalls without uninstalling first. App data (PIN, bearer token, outbox, theme) is preserved. After install:

1. Open Brain on the Pixel.
2. Confirm version 0.5.5 in `Settings`.
3. Confirm pairing intact (library loads after PIN unlock). If rotated since last APK: re-scan QR via `Settings → LAN Info` on Mac.

### 1.4 If build fails

| Failure | Likely cause | Fix |
|---|---|---|
| `Module not found: 'fs'` (or 'crypto', 'path') | A client-component file imports a server-only module top-level (e.g., jsdom) | See M8 §3 — extract pure helpers into a no-server-deps module |
| `tsc` error | Type drift; recent change broke types | Read the error; fix at the source |
| `gradlew assembleDebug` fail | SDK or licenses missing | Run `sdkmanager --licenses` to accept Android licenses |
| `adb: device offline` | Pixel disconnected or USB-debugging revoked | Re-plug; tap "Always allow from this computer" |

## 2. Manual verification flow (Lane L; runs every patch release)

The full template is at `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md` (NEW this session). Summary of the gate:

### 2.1 Pre-flight (5 steps; ~10 min)

1. APK install via §1.3 above.
2. Confirm Mac dev server is running (`npm run dev`) and `https://brain.arunp.in` loads in a browser.
3. Confirm pairing on Pixel (PIN unlock + library loads).
4. Open ADB logcat in a third terminal: `adb logcat | grep -E "Capacitor|Brain" --line-buffered`.
5. Run OFFLINE-PRE quota probe: in Brain APK, navigate to `https://brain.arunp.in/debug/quota` → tap "Run probe" → record the four data points (storage quota, persist() result, SW availability, Worker availability). Save the JSON to a new doc at `docs/research/webview-quota-pixel-2026-05-13.md`.

### 2.2 MUST-pass scenarios (7; ~20 min)

| Scenario | What | Expected |
|---|---|---|
| A-1 | Share URL online | Routes to /items/<id>; no toast |
| A-2 | Share URL offline (airplane mode) | "Saved offline" toast; row in /inbox queued |
| A-3 | Drain after reconnect | Row flips to synced within ~3s of network return |
| B-1 | Share PDF online | Routes to /items/<id> |
| B-2 | Share PDF offline | "Saved offline — PDF will sync" toast; row in /inbox queued |
| C-1 | 2-second URL re-share | Silent no-op (in-mem dedup) |
| F-1 | First successful enqueue → notification permission dialog | Android permission prompt fires |

If any MUST-pass fails: stop, capture evidence (logcat + WebView IDB state via `chrome://inspect`), file in the matrix doc's Evidence field, escalate to user.

### 2.3 Sign-off

When all MUST-pass items are ✅ + the matrix's nice-to-have items are run as time permits:

1. Update the matrix doc's §11 "Sign-off" block.
2. Commit the filled report: `git add docs/test-reports/v0.5.5-offline-mode-manual-matrix.md && git commit`.
3. Announce ready for push to origin.

## 3. Mac dev server (current prod, unchanged)

```bash
cd /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain
npm run dev   # port 3000, bound to 127.0.0.1
```

Cloudflared launchd daemon serves `https://brain.arunp.in` → `http://127.0.0.1:3000`. To verify:

```bash
curl -sI https://brain.arunp.in/api/health
# Expect: HTTP/2 200 (with the user's bearer token in Authorization header if you actually want a body)
```

## 4. Hetzner runbook (Lane C; carries forward from v4 baseline)

**Source of truth for Hetzner setup:** `../Handover_docs_12_05_2026/07_Deployment_and_Operations.md` §3 onward. That document covers:

- §3 Hetzner provisioning
- §4 Server hardening (brain user, disable root, firewall)
- §5 Cloudflared on Hetzner (named tunnel re-point)
- §6 Migration script + cutover runbook
- §7 Backup/restore (B2 + gpg)
- §8 Restore drill procedure
- §9 Rollback procedure

**Status carried forward:** Hetzner provisioned at IP `204.168.155.44` (Ubuntu 24.04, 4GB RAM); SSH still rejects the local key (K-1 from M8). No new Hetzner work this session.

## 5. APK release procedure (Lane L tiered rule)

Per commit `48967cd`:

| Bump type | Lane allowed | Tag |
|---|---|---|
| Patch (0.5.4 → 0.5.5) | either | NO tag |
| Minor (0.5.x → 0.6.0) | Lane C only | YES tag (Lane C creates) |
| Major | Lane C only | YES tag |

**Why no patch tags:** prevents Lane L from creating tag conflicts with Lane C's in-flight v0.6.0 work. Lane L still bumps `package.json` version on patch releases (so APK file name self-identifies), but no `git tag` is pushed.

**This session's release:** v0.5.4 → 0.5.5 (`c56ea90`). No tag, per rule.

## 6. Where artifacts live

| Artifact | Location | Owner | Lifecycle |
|---|---|---|---|
| APK debug builds | `data/artifacts/brain-debug-<version>.apk` | Lane L | gitignored; rebuild from source |
| Server logs | `data/errors.jsonl` (5 MB cap; rotates) | server | append-only; read via `tail -f` |
| SQLite DB | `data/brain.sqlite` | server | backed up every 6h to `data/backups/` |
| SQLite backups | `data/backups/brain-YYYY-MM-DDTHH-MM.sqlite` | server | retains 28 (config in `Settings`); auto-prune oldest |
| Test reports (filled) | `docs/test-reports/<version>-*.md` | Lane L | committed to git |
| Handover packages | `Handover_docs/Handover_docs_<DD_MM_YYYY>/` | both lanes | committed to git |

## 7. Cross-references

- M2 §3.1 — APK npm dep table (3 new this session)
- M3 §6 — secret rotation (carries forward)
- M8 §3 — APK build failures (NEW this session: jsdom-in-client-bundle)
- M9 §3.1 — Lane L's exact next push command
- `../Handover_docs_12_05_2026/07_Deployment_and_Operations.md` — full Hetzner runbook
