# AI Memory UX v2 Execution Baseline And Audit

Captured: 2026-06-14 10:53 IST
Lead integrator: Codex in this thread
Project root: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Approved plan authority: `UX_v2/UX_Final_Plan`

## Scope Authority

The approved `UX_Final_Plan` is a planning authority, not blanket implementation authorization. Its current gates control execution:

- G-001 PRD-11-SHELL verification: addressed in this baseline with smoke evidence.
- G-002 PRD-09 attachment/history semantics: still open; PRD-09-FU and PRD-12 remain no-go.
- G-003 PRD-10 mark-good-enough semantics: still open; do not implement mark-good-enough.
- G-004 PRD-14 active offline controls: still open; keep offline informational only.
- G-005 Android device/emulator evidence: still open; no Android-specific completion claims.
- G-006 Magic Patterns freshness: still open; no pixel/design parity claims until refreshed or approved frozen.
- G-007 Handoff durability: still open outside this local untracked workspace.

Hard scope rule for this execution: implement only items confirmed in `UX_Final_Plan`. Open decisions are not approval.

## Repository Baseline

| Field | Value |
| --- | --- |
| Starting branch | `codex/v0.7.7-deployment-hygiene` |
| Execution branch created | `codex/ai-brain-ux-v2-execution` |
| HEAD | `c33166e4c9b9a3af86165b1b83aaea355174ccd7` |
| Upstream | none on execution branch |
| Dirty entries before execution docs | `174` |
| Dirty state note | Large pre-existing modified/untracked worktree. Preserved as user/previous-agent work. No reset, clean, or revert performed. |

Important pre-existing dirty areas include web source, Android resources/version metadata, UX planning artifacts, docs, icons, `RUNNING_LOG.md`, and `ROADMAP_TRACKER.md`.

New execution evidence created by this goal so far:

- `UX_v2/execution/evidence/screenshots/2026-06-14-prd11-mobile-library.png`
- `UX_v2/execution/evidence/screenshots/2026-06-14-prd11-mobile-ask.png`
- `UX_v2/execution/evidence/screenshots/2026-06-14-prd11-mobile-capture.png`
- `UX_v2/execution/evidence/screenshots/2026-06-14-prd11-mobile-more.png`
- `UX_v2/execution/evidence/screenshots/2026-06-14-prd11-desktop-more.png`

## Tool Versions

| Tool | Version |
| --- | --- |
| Node | `v22.22.3` |
| npm | `10.9.8` |
| Next.js | `16.2.5` |
| Capacitor CLI | `8.3.3` |
| Java | OpenJDK `17.0.19` |
| Gradle | `8.14.3` |

Android SDK path from `android/local.properties`: `/opt/homebrew/share/android-commandlinetools`.

## App Architecture And Entrypoints

Web:

- Framework: Next.js App Router.
- Main shell/layout: `src/app/layout.tsx`, `src/components/sidebar.tsx`.
- Key pages: `/library`, `/capture`, `/ask`, `/more`, `/needs-upgrade`, `/items/[id]`, `/settings`, `/settings/device-pairing`, `/setup`, `/setup-apk`, `/unlock`.
- Key APIs: `/api/capture/url`, `/api/capture/pdf`, `/api/capture/note`, `/api/ask`, `/api/search`, `/api/threads`, `/api/settings/device-pairing`, `/api/health`.

Android:

- Capacitor shell only, not a separate native UI stack.
- Config: `capacitor.config.ts`.
- App id: `com.arunprakash.brain`.
- App name: `AI Memory`.
- Server URL: `https://brain.arunp.in`.
- Offline fallback bundle: `public/offline.html` via `webDir: "public"`.
- Main activity: `android/app/src/main/java/com/arunprakash/brain/MainActivity.java`.
- Share intents: registered in `android/app/src/main/AndroidManifest.xml`.

Data/API/storage:

- SQLite via `better-sqlite3`, default local DB path `data/brain.sqlite`.
- Migrations auto-run on server boot/build from `src/db/migrations`.
- Current local DB item count: `0`.
- Local DB migrations applied: `001_initial_schema.sql` through `017_topics.sql`.
- WAL side files present during dev server: `data/brain.sqlite-wal`, `data/brain.sqlite-shm`.

## Baseline Checks

| Check | Result | Notes |
| --- | --- | --- |
| `npm run check:env` | Pass | `.env` gitignored, `.env.example` tracked. |
| `npm run lint` | Pass with warning | Existing warning: unused `no-var` eslint-disable in `src/lib/queue/enrichment-batch-cron.ts:49`. |
| `npm run typecheck` | Pass | `tsc --noEmit`. |
| `npm test` | Fail: 448/449 pass | `src/lib/capture/quality.test.ts` expects `metadata + transcript`, current code returns `Transcript`. |
| `npm run build` | Pass with warning | Known `unpdf` critical dependency warning. |
| Local health | Pass | `GET /api/health` returned `{"ok":true,...}` with local session cookie header. |
| `npm run build:apk` | Blocked by version guard | Current Android `versionName=1.0.2`, `versionCode=3`; `data/artifacts/brain-debug-v1.0.2-code3.apk` already exists. Version bump required before new APK. |

## Android And Deployment Environment

- `adb` is not on `PATH`, but exists at `/opt/homebrew/share/android-commandlinetools/platform-tools/adb`.
- Exact `adb devices` result: no attached devices.
- `avdmanager list avd` reports `Brain_API_36` exists but cannot load because the Google APIs arm64-v8a Brain API 36 system image is missing.
- No `emulator` binary was found on `PATH` or under `/opt/homebrew/share/android-commandlinetools`.
- Android device/emulator validation is blocked until a device is connected or the emulator package/system image is installed.
- `cloudflared` exists at `/opt/homebrew/bin/cloudflared`.
- Running `cloudflared` process is for `codex-token-dashboard`, not the `brain` tunnel. Production/live deploy was not touched.

## UX_Final_Plan Comparison

Existing or coded-unverified:

- Desktop shell/navigation.
- Mobile bottom nav Library/Capture/Ask/More.
- `/more` route.
- Library filters and empty state.
- Capture URL/PDF/Note surface.
- Ask empty state and composer.
- Settings/More trust surfaces.
- Android Capacitor shell, launcher assets, share intent manifest.

Partial or risky:

- Mobile raised Capture treatment still appears on `/more`; D-006 remains open and should not be silently fixed as approved scope.
- Disabled/low-contrast Capture CTAs are visible in mobile Library/Capture screenshots and should be tracked as UX polish defects.
- Ask scope/history/attachments remain decision-gated by D-001/D-002/D-003.
- Repair flow and derived-state reset remain incomplete and dependency-gated by PRD-06-FU.
- Android share result and Android Ask composer are missing/blocked by dependencies and device gate.

Missing or blocked:

- Canonical capture result contract from PRD-06-FU.
- PRD-09-FU attached context/high-quality-only/history semantics until decisions close.
- PRD-10 repair workflow derived-state reset and mark-good-enough decision.
- PRD-12 Android Ask composer.
- PRD-13 Android share result route/surface.
- PRD-16 complete QA evidence package.
- Android device/emulator evidence for share, pairing, offline fallback, launcher, install/open, and APK flows.

## Data-Safety Review

No schema, storage, or production data changes were intentionally made in this baseline. The local dev/build startup auto-applied existing migrations to the local empty DB. Future storage/API work must follow these rules:

- PRD-06-FU should not introduce a DB migration unless capture result persistence is explicitly approved. Prefer DB-derived banner truth from existing item fields.
- If a migration becomes necessary, create a migration plan, backup/restore strategy, rollback path, test-data validation, and failure-mode notes before implementation.
- PRD-10 repair must include derived-state reset for chunks, embeddings, summaries, topics, related items, and warnings before release.
- Analytics/events remain no-go unless Arun approves local/private telemetry.

## Baseline Verdict

Phase 1 PRD-11-SHELL smoke is evidence-backed with caveats. This clears the specific G-001 verification blocker enough to plan PRD-06-FU as the first implementation slice, while all other decision/device/freshness gates remain open.

Do not deploy production/live. Do not create a new APK until Android version metadata is bumped and release approval is granted.
