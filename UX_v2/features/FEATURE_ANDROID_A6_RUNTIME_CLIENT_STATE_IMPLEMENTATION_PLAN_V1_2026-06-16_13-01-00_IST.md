# Android A6 Runtime, Client State, And APK Evidence Implementation Plan V1

Timestamp: 2026-06-16 13:01:00 IST
Owner: Main Codex execution agent
Source PRD: `FEATURE_ANDROID_A6_RUNTIME_CLIENT_STATE_PRD_V2_2026-06-16_13-00-00_IST.md`

## Scope

Implement an Android runtime preflight and evidence package. This is not an APK/device validation run unless Android tooling and a device/emulator are available.

## Implementation Steps

1. Add `scripts/ux-v2-android-a6-runtime-preflight.ts`.
   - Parse `android/app/build.gradle` for namespace, applicationId, versionCode, versionName, and APK filename pattern.
   - Parse `capacitor.config.ts` for appId, appName, server URL, androidScheme, errorPath, webDir, and CapacitorHttp setting.
   - Inspect `android/app/src/main/AndroidManifest.xml` for launcher, text share, PDF share, multi-PDF share, camera permission, and direct VIEW setup support.
   - Inspect `public/offline.html` and `public/sw.js` for server-required fallback, no offline queue/read/sync claims, cache names, cleanup behavior, network-only setup/unlock, `/offline.html` precache, and production origin mapping.
   - Detect expected Gradle output APK and published artifact APK, recording size, mtime, and SHA-256 if present.
   - Classify APK freshness as `current`, `stale_or_unproven`, or `missing`.
   - Detect `adb`, emulator, Java, and Android SDK common paths.
   - If `adb` exists, run `adb devices -l`, count devices, and record only redacted serial fingerprints.
   - Emit JSON to `UX_v2/execution/ANDROID_A6_RUNTIME_CLIENT_STATE_PRELIGHT_2026-06-16_13-04-00_IST.json`.

2. Make the preflight status explicit.
   - `statuses` must include `preflight_passed`.
   - If `adb` or device/emulator evidence is absent, include `runtime_blocked` and `release_blocked`.
   - Set `releaseBlocked: true` until APK runtime validation, backup/rollback, deploy, live smoke, WebView asset pickup, and stale-cache recovery pass.

3. Add the evidence label matrix inside the JSON.
   - Browser mobile only for A1-A5 local browser-completed route groups.
   - Runtime blocked for Android authenticated routes and native paths that lack device proof.
   - Direct VIEW intent marked `not_supported_by_manifest` if no VIEW filter exists.

4. Run validation.
   - A6 preflight.
   - `git diff --check`.
   - `npm run typecheck`.
   - `npm run lint`.
   - `npm test`.
   - `npm run build`.

5. Add QA/tracker docs.
   - `UX_v2/execution/ANDROID_A6_RUNTIME_CLIENT_STATE_QA_2026-06-16_13-04-00_IST.md`.
   - `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_13-04-00_IST.md`.
   - Update `UX_v2/project_management/UX_V2_PROJECT_TRACKER_2026-06-15_21-46-45_IST.md`.
   - Update `UX_v2/trackers/testing_qa_readiness_tracker.md` if useful.

## Files Expected To Change

- `scripts/ux-v2-android-a6-runtime-preflight.ts`
- `UX_v2/execution/ANDROID_A6_RUNTIME_CLIENT_STATE_PRELIGHT_2026-06-16_13-04-00_IST.json`
- `UX_v2/execution/ANDROID_A6_RUNTIME_CLIENT_STATE_QA_2026-06-16_13-04-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_13-04-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_2026-06-15_21-46-45_IST.md`
- `UX_v2/trackers/testing_qa_readiness_tracker.md` if needed

## Rollback

Remove the A6 script and generated A6 evidence docs. No app behavior should change in this slice.

## Evidence Limits

This plan can produce a release-blocking preflight. It cannot close Android runtime validation while `adb`/device proof is unavailable.
