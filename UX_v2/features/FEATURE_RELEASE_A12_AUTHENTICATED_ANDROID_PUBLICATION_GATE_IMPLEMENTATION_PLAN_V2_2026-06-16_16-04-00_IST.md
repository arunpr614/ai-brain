# Feature Release A12 Authenticated Android Publication Gate Implementation Plan V2

Created: 2026-06-16 16:04:00 IST
Owner: Main Codex execution agent
Status: Approved for execution after adversarial review closure
Source PRD: `FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_PRD_V2_2026-06-16_15-52-00_IST.md`
Supersedes: `FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_IMPLEMENTATION_PLAN_V1_2026-06-16_15-56-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_15-52-55_IST.md`

## Review Closure

| Review finding | V2 resolution |
| --- | --- |
| Protected route target selection is not executable without leaking/guessing IDs | Adds Phase 0.5 target-selection preflight and redacted target manifest. Route aliases, not raw IDs/titles, are used in evidence. |
| Helper scripts and redaction scans may persist or print secrets | Adds secret-helper rules: environment/stdin only, `/tmp` only for temporary helpers, cleanup required, no raw match output in reports. |
| Native share cleanup lacks implementation method | Adds cleanup manifest and post-cleanup verification. Native share gates remain blocked if cleanup cannot be verified. |
| Full validation commands are not risk-sequenced | Splits validation into documentation/no-code blocked path versus publication-ready or code-change path. |
| TalkBack checklist needs artifact shape | Adds `talkback-checklist.md` under A12 evidence directory with required columns. |
| Timestamps are inconsistent | Uses a stable A12 execution timestamp `2026-06-16_16-04-00_IST` for new A12 plan outputs; older generated review timestamp remains linked as evidence. |

## Scope

Execute the A12 Android publication gate against the deployed UX v2 web production build and the fresh Android APK candidate. A12 is primarily an evidence and release-ownership gate. It should change app code only if a blocking defect is found; any code/config change forces APK rebuild/reinstall and rerun of affected evidence.

## Output Files

| File | Purpose |
| --- | --- |
| `UX_v2/execution/UX_V2_A12_ANDROID_PUBLICATION_GATE_QA_2026-06-16_16-04-00_IST.md` | Main A12 QA report and release verdict. |
| `UX_v2/execution/UX_V2_A12_RELEASE_OWNERSHIP_REVIEW_2026-06-16_16-04-00_IST.md` | Dirty-worktree ownership and release-change attribution. |
| `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a12/` | Screenshots, redacted UI trees, console/network summaries, and JSON manifests. |
| `.../android-runtime-a12/target-manifest.redacted.json` | Route aliases and redacted target selection metadata. |
| `.../android-runtime-a12/share-cleanup-manifest.redacted.json` | Native-share fixture, result, and cleanup proof without raw IDs/secrets. |
| `.../android-runtime-a12/talkback-checklist.md` | TalkBack/manual accessibility checklist. |
| `.../android-runtime-a12/helper-cleanup-manifest.md` | Helper script/temp-file cleanup status when helpers are used. |
| `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_16-04-00_IST.md` | PM tracker update for A12. |
| `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md` | Append/update A12 row if safe without rewriting unrelated content. |
| `UX_v2/trackers/milestone_tracker.md` | Update M7/APK publication status. |
| `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md` | Append/update A12 verdict and evidence links. |
| `RUNNING_LOG.md` | Append milestone entry after A12 cycle and execution checkpoint. |

## Environment Setup

Use Android tooling paths from the handover:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT=/opt/homebrew/share/android-commandlinetools
export PATH=/opt/homebrew/share/android-commandlinetools/platform-tools:/opt/homebrew/share/android-commandlinetools/emulator:/opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/bin:/opt/homebrew/opt/openjdk@21/bin:$PATH
```

Secret discipline:

- Helpers must read secrets from environment variables, stdin, or an existing secure runtime source only.
- Helpers must never hard-code, echo, write, or commit raw cookies, sessions, bearer tokens, production PINs, pairing codes, or private IDs.
- Temporary helpers that touch secrets must live under `/tmp`, use restrictive permissions where possible, and be deleted before final reporting.
- Retained helper scripts in the repo must be secret-free and use placeholders only.
- Redaction scans must report path/line/count or redacted labels; never paste raw secret matches into markdown.

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

## Phase 0.5: Safe Target And Fixture Selection

Before protected-route or share evidence:

1. Select route targets without writing raw production IDs/titles to repo files.
2. Preferred order:
   - Use already-created UX v2 evidence aliases if they can route inside production without exposing private data.
   - Use a server-side redacted query/helper that returns aliases plus hashes only.
   - Use current visible production routes that do not require private IDs where possible.
3. Create `target-manifest.redacted.json` with:
   - route alias, such as `item-a12-primary`;
   - route type, such as `item`, `repair`, `topic`, `collection`;
   - redacted hash prefix or slug class only;
   - selection method;
   - no raw title, source, item ID, token, or private text.
4. If safe target selection fails for item/topic/collection routes, mark those route gates blocked rather than guessing.
5. Create temporary share fixture names:
   - URL/text fixture must be clearly temporary and non-private.
   - PDF fixtures must contain non-private placeholder text.
6. Define cleanup method before running share intents:
   - cleanup API, DB command, duplicate-safe route, or blocked if cleanup cannot be verified.

Exit gate:
- Route evidence cannot pass without a redacted target manifest.
- Native share evidence cannot pass without a cleanup method.

## Phase 1: WebView DevTools And Auth Harness

1. Locate WebView DevTools socket:
   - `adb shell cat /proc/net/unix | rg 'webview_devtools'`
2. Forward a local port:
   - `adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>`
3. Read `http://127.0.0.1:9333/json/list` and identify the APK WebView target.
4. If a browser-control helper is needed:
   - create it under `/tmp` if it handles secrets;
   - pass secrets only through environment/stdin;
   - write only redacted summaries to the repo;
   - delete helper and temp data before final QA;
   - record cleanup in `helper-cleanup-manifest.md`.
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
- `/items/[id]` using `item-a12-primary` alias
- `/items/[id]/repair` using `item-a12-repair` alias
- `/topics/[slug]` using `topic-a12-primary` alias
- `/collections/[id]` using `collection-a12-primary` alias

For each route:

1. Navigate inside APK WebView.
2. Wait for route idle/render completion.
3. Save screenshot.
4. Save redacted UI text/tree or DOM summary.
5. Save console/network summary.
6. Record evidence label and pass/fail/block reason.

If route target selection requires IDs, use only the private in-memory mapping or `/tmp` mapping and never write raw values to repo evidence.

## Phase 3: Native Share Evidence

Use Android OS intents against the installed APK:

1. URL/text share:
   - Use a clearly named temporary fixture URL that is safe and non-private.
   - Run `adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT '<temporary-url>' -n com.arunprakash.brain/.MainActivity`.
   - Capture result state.
   - Verify cleanup of any production item created/updated.
2. Single PDF share:
   - Stage a harmless temporary PDF on emulator storage.
   - Use a grantable URI path supported by Android, or mark blocked with exact reason.
   - Capture result state.
   - Cleanup emulator file and any production item created/updated.
3. Multi-PDF share:
   - Stage two harmless PDFs or use an Android-safe blocked path.
   - Prove approved rejection or supported behavior.
   - Cleanup all temporary files and production items.

Cleanup manifest must include:

- fixture alias;
- result state;
- redacted item handle/hash if created or updated;
- cleanup command/method, with raw sensitive values omitted;
- post-cleanup verification;
- final cleanup status `passed`, `blocked`, or `not_applicable`.

Native share gate remains blocked if cleanup status is not `passed` or `not_applicable`.

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

- Save checklist to `android-runtime-a12/talkback-checklist.md`.
- Minimum columns:
  - route
  - element order
  - expected spoken label
  - actual observed label/result
  - pass/fail
  - evidence path or blocker
- Screenshot-only evidence cannot pass TalkBack.
- If TalkBack tooling is unavailable, mark A12-R12 blocked unless owner explicitly accepts.

## Phase 7: Release Ownership Review

Create `UX_v2/execution/UX_V2_A12_RELEASE_OWNERSHIP_REVIEW_2026-06-16_16-04-00_IST.md` with:

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

Risk-sequenced validation:

1. Always run:
   - `git diff --check` on A12-created docs/evidence.
   - path/count redaction scan over A12-created docs/evidence.
2. If A12 changes app code/config/assets or claims `apk_publication_ready`, also run:
   - `git diff --check`
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - APK rebuild/reinstall if affected by code/config changes.
3. If A12 ends blocked without app code changes, cite latest A11/A9 static gates and explain why full rerun was not required for the blocked evidence outcome.

Redaction scan discipline:

- Use path/count or redacted output where feasible.
- Do not paste raw matches into markdown.
- Manually classify APK SHA-256 hashes and short hash prefixes as safe.
- If a credential-like raw match is found, fix/redact the evidence and record only `<redacted:secret>` in the QA report.

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
- No APK publication-ready claim if route targets are guessed, raw, or unsafe.
- No APK publication-ready claim if any P0 requirement is blocked/failed/missing.
- No APK publication-ready claim if P1 TalkBack/keyboard gates are missing unless owner acceptance is documented.
- No native share pass without mutation cleanup proof or explicit blocked verdict.
- No pairing-token runtime pass from CDP/session injection alone.
- No evidence package pass if helper scripts persist secrets.
- No final goal completion after A12 if APK publication remains blocked.

## Rollback / Cleanup

- Remove `adb forward tcp:9333` unless intentionally needed for ongoing validation.
- Stop emulator unless intentionally left running and recorded.
- Delete temporary helpers and private route mapping files from `/tmp`.
- Delete temporary PDFs from emulator storage.
- Delete/cleanup any temporary production share items or record cleanup blocker.
- Do not delete evidence files after they are written; append corrections if needed.

## Expected Outcome

A12 should produce a defensible APK-publication verdict. The most likely acceptable outcomes are:

- `apk_publication_ready` if all gates pass with evidence.
- `apk_publication_blocked` if Android runtime/tooling/auth/TalkBack/share/cleanup/ownership evidence remains incomplete.

Both outcomes complete the A12 feature cycle, but only `apk_publication_ready` can move the overall user goal toward completion.
