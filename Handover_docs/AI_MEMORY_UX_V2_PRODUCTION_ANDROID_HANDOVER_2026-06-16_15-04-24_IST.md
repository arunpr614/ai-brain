# AI Memory UX v2 Production + Android Handover

Created: 2026-06-16 15:04:24 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Branch: `codex/ai-brain-ux-v2-execution`
Base commit observed: `37c8285`
Goal status: **active, not complete**

## Executive Summary

The UX v2 web experience has been deployed to production at `https://brain.arunp.in` and postdeploy smoke passed. A fresh Android debug APK candidate was built as `brain-debug-v1.0.3-code4.apk`, installed on the `Brain_API_36` emulator, and launched successfully. The deployed locked Android shell no longer leaks the private Needs Upgrade count.

Do **not** mark the goal complete yet. Final APK publication is still blocked by missing authenticated Android runtime evidence: unlocked route flow, native share intents, session/pairing persistence after restart, WebView offline/stale-cache recovery, Android keyboard behavior, and TalkBack/accessibility evidence. Final release ownership/commit review is also still open because the worktree is broad and dirty.

## User Objective To Preserve

The user asked for end-to-end execution of the UX v2 implementation plans and PRDs, with the following process:

- Break work into individual features.
- For each feature, create a detailed PRD markdown file.
- Run adversarial review on the PRD.
- Revise into PRD v2.
- Create an implementation plan markdown file.
- Run adversarial review on the implementation plan.
- Revise into implementation plan v2.
- Execute end-to-end.
- Keep project management/tracker artifacts current.
- Use the running-log skill on regular milestone intervals.
- Complete only when project tasks/milestones are done, there are no identified bugs, and everything is deployed to production.

Important local instruction from prior work: running-log entries have been drafted inside QA/release docs, but the main `RUNNING_LOG.md` should not be appended unless explicitly approved by the user.

## Current Production State

### Web Production

Status: **deployed and smoke-tested**

Evidence:

- A11 QA report: `UX_v2/execution/UX_V2_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_QA_2026-06-16_14-18-00_IST.md`
- Release packet: `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`

Deploy command that completed:

```bash
BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh
```

Why warn-only was used locally:

- Local laptop provider config still defaults to local Ollama.
- Local Ollama is not installed/running/listening on port 11434.
- Production has real approved provider configuration, and the remote provider check passed after deploy.

Predeploy backup:

- Path: `/opt/brain/data/backups/web-revamp-predeploy-20260616-140305.sqlite`
- Integrity: `ok`
- Production item count before deploy: `28`
- Size: `4476928` bytes

Deploy-script gates passed:

- Typecheck passed.
- Lint passed with the existing warning in `src/lib/queue/enrichment-batch-cron.ts`.
- Tests passed: 551 tests / 78 suites.
- Env check passed.
- Build passed with known `unpdf` warning.
- Build artifact check passed.
- Remote authenticated health check passed.
- Remote AI provider check passed.
- Telegram webhook reachability passed.

Postdeploy route smoke passed:

- `GET /unlock`: 200 HTML.
- `GET /setup-apk`: 200 HTML.
- `GET /offline.html`: 200 HTML.
- `GET /ai-memory-logo.png`: 200 image/png.
- `GET /manifest.webmanifest`: 200 manifest JSON.
- `GET /library` without cookie: 307 redirect to unlock.
- `POST /api/telegram/webhook` without secret: 401 JSON.

Observability:

- Service active.
- `NRestarts=0`.
- Startup log showed Next.js ready, migration 017 applied, backup scheduler started, initial snapshot created.
- Background enrichment/backoff and transcript cooldown warnings were present. These are residual worker/queue observability risk, not a web deploy blocker because remote provider check and live Ask proof passed.

### Live Ask Provider Proof

Status: **passed on production**

A10 originally blocked because local Ollama was missing. A11 superseded the production blocker by using the production host's approved provider configuration.

Redacted proof shape:

- HTTP status: 200.
- Content type: `text/event-stream; charset=utf-8`.
- SSE data lines: 10.
- Frames: `retrieve`, eight `token`, `done`.
- Retrieved chunks: 2.
- Token characters: 447.
- Done frame: true.
- Error frames: none.
- Chunk hash prefixes: `948db0351ef4`, `0c834d995ee8`.
- Body hash prefix: `17dc2fad4228d5d8`.

Do not persist raw session tokens, production PIN, raw Ask answer text, source titles, or raw item IDs.

### Android APK Candidate

Status: **fresh candidate built, installed, and launched; not publication-ready**

Version:

- `versionName`: `1.0.3`
- `versionCode`: `4`

Artifacts:

- Published artifact: `data/artifacts/brain-debug-v1.0.3-code4.apk`
- Gradle output: `android/app/build/outputs/apk/debug/brain-debug-v1.0.3-code4.apk`
- SHA-256 for both: `5c8a3f398886f57ea572be62ab04025cfa716c661af4684d9ffbbbd3e1561440`
- Size: 7.5 MB

Build command shape:

```bash
env \
  JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  ANDROID_HOME=/opt/homebrew/share/android-commandlinetools \
  ANDROID_SDK_ROOT=/opt/homebrew/share/android-commandlinetools \
  PATH=/opt/homebrew/share/android-commandlinetools/platform-tools:/opt/homebrew/share/android-commandlinetools/emulator:/opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/bin:/opt/homebrew/opt/openjdk@21/bin:$PATH \
  npm run build:apk
```

Runtime evidence:

- Emulator AVD: `Brain_API_36`
- Install: `adb install -r data/artifacts/brain-debug-v1.0.3-code4.apk` succeeded.
- Activity focus after launch: `com.arunprakash.brain/.MainActivity` resumed.
- Postdeploy locked screenshot: `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a11/postdeploy-locked.png`
- Postdeploy UI tree: `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a11/window-postdeploy.xml`
- Locked-shell privacy: passed visually; no private Needs Upgrade count appears while locked.

Temporary Android state at handover:

- Emulator was stopped.
- `adb devices` showed no attached devices after cleanup.
- `adb forward tcp:9333` was removed.
- No emulator session should be running from this handover.

## Worktree State And Caution

The worktree is very broad and dirty. Last observed `git status --short | wc -l` was `300`.

Do not revert or reset anything casually. Many modifications and untracked docs/assets predate this handover and include earlier UX v2 work. Treat the current worktree and production state as authoritative. If preparing commits, first split changes by feature/gate and audit ownership carefully.

Observed branch and commit:

```text
branch: codex/ai-brain-ux-v2-execution
HEAD: 37c8285
```

Major modified source areas include:

- `android/app/build.gradle`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/components/sidebar.tsx`
- `src/components/ask-input.tsx`
- `src/components/library-list.tsx`
- `src/components/theme-toggle.tsx`
- `src/app/capture/*`
- `src/app/items/[id]/*`
- `src/app/settings/*`
- `src/app/needs-upgrade/page.tsx`
- `scripts/ux-v2-*`
- many UX v2 docs and trackers

## Key Implemented Work By Milestone

### A1-A5 Android/Web UX Features

Completed locally with browser/mobile and script evidence:

- Android shell, Library, More, offline copy.
- Capture, repair, Needs Upgrade.
- Ask composer and item detail.
- Topic and collection flows.
- Login, pairing, session, entry states.

Evidence files:

- `UX_v2/execution/ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_QA_2026-06-16_10-53-45_IST.md`
- `UX_v2/execution/ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_QA_2026-06-16_11-36-00_IST.md`
- `UX_v2/execution/ANDROID_A3_ASK_ITEM_DETAIL_QA_2026-06-16_12-14-08_IST.md`
- `UX_v2/execution/ANDROID_A4_TOPIC_COLLECTION_QA_2026-06-16_12-29-51_IST.md`
- `UX_v2/execution/ANDROID_A5_LOGIN_PAIRING_SESSION_QA_2026-06-16_12-52-51_IST.md`

### A6 Android Runtime Preflight

Status: superseded in part by A11.

A6 originally reported runtime blocked because default shell path did not expose `adb`, no device was connected, and the APK was stale/unproven. A11 later found the Android SDK under Homebrew, built a fresh APK, and launched it on emulator. A6 remains useful for its static preflight structure but is no longer the final Android evidence.

Evidence:

- `UX_v2/execution/ANDROID_A6_RUNTIME_CLIENT_STATE_PREFLIGHT_2026-06-16_13-04-00_IST.json`
- `UX_v2/execution/ANDROID_A6_RUNTIME_CLIENT_STATE_QA_2026-06-16_13-04-00_IST.md`

### A7 Release Readiness

Status: updated after A11.

Release packet now says:

- Web production deployed.
- APK candidate partial.
- APK publication blocked.

Evidence:

- `UX_v2/execution/UX_V2_A7_CODE_REVIEW_2026-06-16_13-18-00_IST.md`
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`

### A8 Public Shell Privacy And Evidence Hygiene

Implemented:

- Added `src/lib/shell/private-counts.ts`.
- Added `src/lib/shell/private-counts.test.ts`.
- Updated `src/app/layout.tsx` to gate private Needs Upgrade counts behind verified session state.
- Updated A5 seed script to redact secrets in stdout and only write full secret manifests under `/tmp` with mode `0600`.
- Ran Capacitor sync and confirmed `public/offline.html` matches packaged Android asset.

Important runtime discovery:

- A11 initially saw a bottom-nav count leak in the old production WebView shell before deploy.
- After A11 web deploy and app data clear/relaunch, Android locked shell no longer showed that private count.

Evidence:

- `UX_v2/execution/UX_V2_A8_PUBLIC_SHELL_PRIVACY_AND_EVIDENCE_HYGIENE_QA_2026-06-16_13-45-00_IST.md`

### A9 Accessibility Final Sweep

Implemented:

- Fixed systemic focus-visible ordering in `src/app/globals.css`.
- Raised mobile touch targets to 44px across key controls.
- Added `scripts/ux-v2-a9-accessibility-release-sweep.ts`.
- Final A9 sweep found 0 issues across 11 routes.

Validation:

- A9 sweep passed.
- Redaction scan passed.
- `git diff --check` passed.
- Typecheck passed.
- Lint passed with existing unrelated warning.
- Tests passed: 551 / 78.
- Build passed with known `unpdf` warning.

Evidence:

- `UX_v2/execution/UX_V2_A9_ACCESSIBILITY_FINAL_SWEEP_QA_2026-06-16_14-20-00_IST.md`
- Sweep JSON: `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/a11y/a9-final-sweep/a9-accessibility-release-sweep-report.json`

### A10 Live Ask Provider Proof

Status: superseded for production by A11.

A10 local proof was blocked:

- `ollama` missing.
- No Ollama process.
- Port 11434 closed.
- Local provider preflight failed for enrichment, Ask, and embedding.

A11 production proof passed using production provider config.

Evidence:

- `UX_v2/execution/UX_V2_A10_LIVE_ASK_PROVIDER_PROOF_QA_2026-06-16_14-36-00_IST.md`

### A11 Production Deploy And Android Runtime

Completed:

- PRD v1, adversarial review, PRD v2.
- Implementation plan v1, adversarial review, implementation plan v2.
- Production backup.
- Web deploy.
- Production route smoke.
- Remote provider proof.
- Live Ask SSE proof.
- APK version bump to `1.0.3/code4`.
- APK build/install/locked launch.
- Postdeploy Android locked-shell privacy screenshot.

Evidence:

- `UX_v2/features/FEATURE_RELEASE_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_PRD_V1_2026-06-16_14-12-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_PRD_ADVERSARIAL_REVIEW_2026-06-16_14-13-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_PRD_V2_2026-06-16_14-14-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_IMPLEMENTATION_PLAN_V1_2026-06-16_14-15-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_14-16-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_IMPLEMENTATION_PLAN_V2_2026-06-16_14-17-00_IST.md`
- `UX_v2/execution/UX_V2_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_QA_2026-06-16_14-18-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_14-18-00_IST.md`

## Remaining Work To Finish The Goal

### 1. Authenticated Android Runtime

Need direct APK/WebView evidence for authenticated routes:

- `/library`
- `/ask`
- `/capture`
- `/more`
- `/settings`
- `/settings/device-pairing`
- `/items/[id]`
- `/items/[id]/repair`
- `/topics/[slug]`
- `/collections/[id]`

Possible path:

1. Start emulator:

   ```bash
   env ANDROID_HOME=/opt/homebrew/share/android-commandlinetools \
     ANDROID_SDK_ROOT=/opt/homebrew/share/android-commandlinetools \
     PATH=/opt/homebrew/share/android-commandlinetools/platform-tools:/opt/homebrew/share/android-commandlinetools/emulator:/opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/bin:$PATH \
     emulator -avd Brain_API_36 -no-window -no-audio -no-snapshot -gpu swiftshader_indirect
   ```

2. Install APK if needed:

   ```bash
   adb install -r data/artifacts/brain-debug-v1.0.3-code4.apk
   ```

3. Launch:

   ```bash
   adb shell am start -n com.arunprakash.brain/.MainActivity
   ```

4. Use WebView DevTools socket:

   ```bash
   adb shell cat /proc/net/unix | rg 'webview_devtools'
   adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>
   curl http://127.0.0.1:9333/json/list
   ```

At the time of handover, the socket was confirmed available as `webview_devtools_remote_4605` while the emulator was running, and the target URL was `https://brain.arunp.in/unlock?next=%2F&reason=session-expired`.

Potential next-agent approach:

- Generate a short-lived signed production session on the remote host without printing it.
- Inject it into the WebView cookie jar via Chrome DevTools Protocol.
- Navigate inside the APK WebView to the authenticated routes.
- Capture screenshots and console/network summaries.
- Do not persist the raw session cookie.

### 2. Native Android Share Proof

Need runtime proof for:

- `text/plain` URL share intent.
- `application/pdf` SEND.
- `application/pdf` SEND_MULTIPLE.
- Result screens, success/duplicate/error behavior.

Manifest support exists, but manifest support is not runtime proof.

Useful command direction:

```bash
adb shell am start \
  -a android.intent.action.SEND \
  -t text/plain \
  --es android.intent.extra.TEXT 'https://example.com/ux-v2-share-smoke' \
  -n com.arunprakash.brain/.MainActivity
```

PDF share likely needs a file staged on emulator storage plus grantable URI handling; inspect existing share scripts before inventing a new path.

### 3. Session/Pairing Persistence

Need proof that after pairing/unlock:

- session persists after app force-stop/relaunch;
- pairing token remains usable;
- unauthorized state remains truthful;
- no private counts leak while locked.

Existing A5 browser evidence is not enough for APK publication.

### 4. Offline Fallback And Stale Cache Recovery

Need WebView runtime proof:

- app displays bundled offline fallback when production server is unreachable;
- no false offline queue/sync claims;
- stale production shell/cache can recover to the new deployed shell;
- service worker cache cleanup works in WebView, not only browser.

Possible techniques:

- Use emulator network disable/enable.
- Use CDP Network emulation if available through WebView target.
- Capture screenshot and UI text.

### 5. Android Keyboard And TalkBack

Need real APK evidence:

- PIN input keyboard flow.
- Ask composer keyboard flow.
- Capture/repair text input keyboard flow.
- TalkBack labels/order for core navigation and forms.

A9 covered browser keyboard/focus/touch target sweep, not Android TalkBack.

### 6. Final Release Ownership

Need a clean release ownership review:

- The worktree is very broad and dirty.
- Identify which changes belong to UX v2 release.
- Do not revert unrelated user/previous-agent changes.
- Consider making structured commits only after grouping and review.
- Run final full validation after any further edits.

### 7. Final Release Packet

After Android gates pass, create a final release packet that says:

- Web production deployed.
- APK publication authorized.
- All P0/P1 release blockers resolved.
- Residual P2/P3 risks documented.
- Exact artifact SHA and APK install path recorded.
- Rollback path recorded.
- Running-log entry drafted or appended only with user approval.

## Validation Commands Recently Passing

Most recent full deploy run passed:

```bash
BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh
```

Within that:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run check:env`
- `npm run check:ai-providers -- --warn-only` locally, expected warning
- `npm run build`
- `npm run check:build-artifacts`
- remote provider check, passed
- authenticated health, passed

APK build passed:

```bash
env JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  ANDROID_HOME=/opt/homebrew/share/android-commandlinetools \
  ANDROID_SDK_ROOT=/opt/homebrew/share/android-commandlinetools \
  PATH=/opt/homebrew/share/android-commandlinetools/platform-tools:/opt/homebrew/share/android-commandlinetools/emulator:/opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/bin:/opt/homebrew/opt/openjdk@21/bin:$PATH \
  npm run build:apk
```

Warnings to expect:

- Existing lint warning in `src/lib/queue/enrichment-batch-cron.ts`.
- Known `unpdf` build warning.
- Gradle deprecation warnings for future Gradle 9 compatibility.
- Remote npm audit reported 2 vulnerabilities during native dependency repair; this was not treated as release-blocking in A11, but a future agent may want to audit separately.

## Important Paths

Core release docs:

- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
- `UX_v2/execution/UX_V2_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_QA_2026-06-16_14-18-00_IST.md`
- `UX_v2/trackers/milestone_tracker.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_14-18-00_IST.md`

Android runtime evidence:

- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a11/launch.png`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a11/postdeploy-locked.png`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a11/window-postdeploy.xml`

APK:

- `data/artifacts/brain-debug-v1.0.3-code4.apk`
- `android/app/build/outputs/apk/debug/brain-debug-v1.0.3-code4.apk`

Scripts:

- `scripts/deploy.sh`
- `scripts/build-apk.sh`
- `scripts/ux-v2-a9-accessibility-release-sweep.ts`
- `scripts/ux-v2-seed-android-a5-login-pairing.ts`
- `scripts/ux-v2-android-a6-runtime-preflight.ts`

Private count gating:

- `src/lib/shell/private-counts.ts`
- `src/lib/shell/private-counts.test.ts`
- `src/app/layout.tsx`

Android version:

- `android/app/build.gradle`

## Suggested Next Feature Cycle

Create A12 for "Authenticated Android Publication Gate":

1. `FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_PRD_V1_*.md`
2. Adversarial review.
3. PRD v2.
4. Implementation plan v1.
5. Adversarial review.
6. Implementation plan v2.
7. Execute emulator/WebView authenticated route proof.
8. Execute native share proof.
9. Execute offline/stale-cache proof.
10. Execute keyboard/TalkBack proof.
11. Update trackers and release packet.

Acceptance criteria for A12 should be strict: no APK publication until all runtime evidence exists.

## Known Non-Completion Statement

Do not call `update_goal(status="complete")` yet. The full user objective requires all milestones/tasks completed, no identified bugs, and production deployment. Web production is deployed, but APK publication and Android runtime/accessibility gates remain unresolved. The correct next state is continued execution, not goal completion.
