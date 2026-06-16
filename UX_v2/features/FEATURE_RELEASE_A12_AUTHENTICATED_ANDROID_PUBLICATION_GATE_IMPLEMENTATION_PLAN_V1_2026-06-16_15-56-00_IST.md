# Feature Release A12 Authenticated Android Publication Gate Implementation Plan V1

Created: 2026-06-16 15:56:00 IST
Owner: Main Codex execution agent
Status: Draft for adversarial review
Source PRD: `FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_PRD_V2_2026-06-16_15-52-00_IST.md`

## Scope

Execute the A12 Android publication gate against the deployed UX v2 web production build and the fresh Android APK candidate. A12 is primarily an evidence and release-ownership gate. It should change app code only if a blocking defect is found; any code/config change forces APK rebuild/reinstall and rerun of affected evidence.

## Expected Output Files

| File | Purpose |
| --- | --- |
| `UX_v2/execution/UX_V2_A12_ANDROID_PUBLICATION_GATE_QA_2026-06-16_16-00-00_IST.md` | Main A12 QA report and release verdict. |
| `UX_v2/execution/UX_V2_A12_RELEASE_OWNERSHIP_REVIEW_2026-06-16_16-00-00_IST.md` | Dirty-worktree ownership and release-change attribution. |
| `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a12/` | Screenshots, redacted UI trees, console/network summaries, and JSON manifests. |
| `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_16-00-00_IST.md` | PM tracker update for A12. |
| `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md` | Append/update A12 row if safe without rewriting unrelated content. |
| `UX_v2/trackers/milestone_tracker.md` | Update M7/APK publication status. |
| `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md` | Append/update A12 verdict and evidence links. |
| `RUNNING_LOG.md` | Append milestone entry after A12 cycle and execution checkpoint. |

## Environment Setup

Use the Android tooling paths discovered in the handover:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT=/opt/homebrew/share/android-commandlinetools
export PATH=/opt/homebrew/share/android-commandlinetools/platform-tools:/opt/homebrew/share/android-commandlinetools/emulator:/opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/bin:/opt/homebrew/opt/openjdk@21/bin:$PATH
```

Do not print or persist production PINs, cookies, bearer tokens, pairing codes, raw session values, device serials, private item titles, private source text, or raw item IDs.

## Phase 0: Preflight And APK Identity

1. Record `git status --short`, HEAD, and dirty-state summary.
2. Verify the expected APK files exist:
   - `data/artifacts/brain-debug-v1.0.3-code4.apk`
   - `android/app/build/outputs/apk/debug/brain-debug-v1.0.3-code4.apk`
3. Record SHA-256 for both APK paths and verify they match.
4. Record `versionName` and `versionCode` from `android/app/build.gradle`.
5. If app code, Android config, service worker/offline assets, manifest, package metadata, or public assets changed after A11, rebuild APK with the documented Java/Android environment before proceeding.
6. Start `Brain_API_36` or detect a running emulator/device.
7. Install the candidate APK with `adb install -r`.
8. Query installed package metadata where possible:
   - `adb shell dumpsys package com.arunprakash.brain`
   - redact device serials and irrelevant private output.
9. Launch the app and record current focus.

Exit gate:
- If APK identity/freshness cannot be proven, continue only to write a blocked QA report. Do not run publication-ready evidence.

## Phase 1: WebView DevTools And Auth Harness

1. Locate WebView DevTools socket:
   - `adb shell cat /proc/net/unix | rg 'webview_devtools'`
2. Forward a local port:
   - `adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>`
3. Read `http://127.0.0.1:9333/json/list` and identify the APK WebView target.
4. Create a redacted browser-control helper if needed under `/tmp` or as a script only if it will be retained for reproducibility without secrets.
5. Prefer real unlock/pairing if feasible. If CDP cookie/session injection is used:
   - label route proof `android_authenticated_route_via_session`;
   - do not count it as pairing-token runtime proof;
   - do not persist raw cookie/session values.

Exit gate:
- If WebView target cannot be controlled or authenticated, mark authenticated routes blocked and skip route publication-ready claims.

## Phase 2: Authenticated Route Evidence

Capture installed APK WebView evidence for:

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

For each route:

1. Navigate inside APK WebView.
2. Wait for route idle/render completion.
3. Save screenshot.
4. Save redacted UI text/tree or DOM summary.
5. Save console/network summary.
6. Record evidence label and pass/fail/block reason.

Use seeded or existing production-safe route targets without printing raw item IDs/titles. If route target selection requires IDs, store only redacted handles or hashes in evidence.

## Phase 3: Native Share Evidence

Use Android OS intents against the installed APK:

1. URL/text share:
   - Use a clearly named temporary fixture URL that is safe and non-private.
   - Run `adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT '<temporary-url>' -n com.arunprakash.brain/.MainActivity`.
   - Capture result state and cleanup any production item created/updated.
2. Single PDF share:
   - Stage a harmless temporary PDF on emulator storage.
   - Use a grantable URI path supported by Android, or mark blocked with exact reason.
   - Capture result state and cleanup emulator file and any production item created/updated.
3. Multi-PDF share:
   - Stage two harmless PDFs or use an Android-safe blocked path.
   - Prove approved rejection or supported behavior.
   - Cleanup all temporary files and production items.

Mutation cleanup requirements:

- Record temporary fixture naming policy.
- Record redacted item handle/hash if created or updated.
- Verify cleanup with redacted post-cleanup check, or mark share gate blocked.

## Phase 4: Persistence And Locked Privacy

1. Validate session persistence:
   - authenticated state before force-stop;
   - `adb shell am force-stop com.arunprakash.brain`;
   - relaunch;
   - authenticated or truthful expired state after relaunch.
2. Validate pairing-token runtime separately:
   - real pairing exchange or existing redacted token-preservation proof;
   - if unavailable, mark A12-R8 blocked even if session route proof passes.
3. Validate locked privacy:
   - expired/logout/locked shell;
   - no private counts, item names, source names, raw IDs, or private queue details.

## Phase 5: Offline And Stale-Cache Recovery

1. Record service worker/cache state or route-visible shell version marker where feasible.
2. Force offline through emulator network controls or CDP network emulation.
3. Reload production origin inside APK WebView.
4. Capture bundled fallback UI and confirm no false offline queue/sync/read claims.
5. Restore network.
6. Reload and capture recovery to current deployed shell.
7. Record cache/update/reload behavior. If true stale-cache simulation is infeasible, mark stale-cache proof blocked rather than passing from offline fallback alone.

## Phase 6: Android Keyboard And TalkBack

Keyboard:

- PIN/unlock input.
- Ask composer input.
- Capture note/URL/PDF state as applicable.
- Repair text input.

For each, capture runtime screenshot or UI summary showing keyboard-safe layout, visible controls, and no critical overlap.

TalkBack:

- Prefer TalkBack transcript/video/manual checklist.
- Minimum acceptable manual checklist columns:
  - route
  - element order
  - expected spoken label
  - actual observed label/result
  - pass/fail
- Screenshot-only evidence cannot pass TalkBack.
- If TalkBack tooling is unavailable, mark A12-R12 blocked unless owner explicitly accepts.

## Phase 7: Release Ownership Review

Create `UX_v2/execution/UX_V2_A12_RELEASE_OWNERSHIP_REVIEW_2026-06-16_16-00-00_IST.md` with:

- Current branch and HEAD.
- Dirty tracked file summary.
- Untracked file summary.
- UX v2-owned changes.
- A12-created/updated files.
- Files that must not be staged blindly.
- Commit/staging recommendation.
- P0/P1 ownership blockers.

Do not stage, commit, push, or create PR unless separately requested.

## Phase 8: Validation And Redaction

Run:

```bash
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
```

Run targeted redaction scans over A12 evidence:

```bash
rg -n "Bearer |brain_token|session=|PIN|pairing|cookie|Set-Cookie|Authorization|[A-Za-z0-9_=-]{32,}" UX_v2/execution/UX_V2_A12* UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_16-00-00_IST.md
```

Manually classify long hashes/APK SHA values as safe and redact anything credential-like.

## Phase 9: Reporting And Tracker Updates

1. Write A12 QA report.
2. Update A7 release packet with final A12 status:
   - `apk_publication_ready`
   - `apk_publication_blocked`
   - `apk_publication_deferred_by_owner`
3. Update milestone tracker.
4. Create A12 PM tracker update.
5. Update PM delivery gate tracker with A12 row/status.
6. Append `RUNNING_LOG.md` only at a verified end-of-file anchor, noting the previous 15:44/15:49 insertion correction history.

## No-Go Gates

- No APK publication-ready claim if APK identity/freshness is unproven.
- No APK publication-ready claim if any P0 requirement is blocked/failed/missing.
- No APK publication-ready claim if P1 TalkBack/keyboard gates are missing unless owner acceptance is documented.
- No native share pass without mutation cleanup proof or explicit blocked verdict.
- No pairing-token runtime pass from CDP/session injection alone.
- No final goal completion after A12 if APK publication remains blocked.

## Rollback / Cleanup

- Remove `adb forward tcp:9333` unless intentionally needed for ongoing validation.
- Stop emulator unless intentionally left running and recorded.
- Delete temporary PDFs from emulator storage.
- Delete/cleanup any temporary production share items or record cleanup blocker.
- Do not delete evidence files after they are written; append corrections if needed.

## Expected Outcome

A12 should produce a defensible APK-publication verdict. The most likely acceptable outcomes are:

- `apk_publication_ready` if all gates pass with evidence.
- `apk_publication_blocked` if Android runtime/tooling/auth/TalkBack/share/cleanup/ownership evidence remains incomplete.

Both outcomes complete the A12 feature cycle, but only `apk_publication_ready` can move the overall user goal toward completion.
