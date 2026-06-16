# Feature Release A26 - Android Share Target Log Hygiene PRD v1

Created: 2026-06-16 23:34 IST
Owner: Codex
Status: Draft for adversarial review
Trigger: A25 Android runtime proof found raw shared URL in native logcat

## Problem

A25 fixed the user-facing Android URL-share result, but the runtime logcat proof exposed a native privacy defect from `@capgo/capacitor-share-target`: `CapacitorShareTargetPlugin.java` logs `Share received: <full shareData>`, including raw shared URL text.

The web share-result payload and client-error logs are sanitized, but Android logcat still receives raw shared content before JavaScript sees it. That violates the A25 no-go gate and blocks Android publication evidence.

## Goals

1. Patch the Android APK build so the share-target plugin logs only safe counts/metadata.
2. Remove raw shared URI/file path logging from plugin error paths we can patch locally.
3. Make the patch reproducible for future APK builds, not a one-off node_modules edit.
4. Bump the Android debug APK candidate from `1.0.4/code5` to `1.0.5/code6`.
5. Rebuild, install, rerun URL share, and prove no raw fixture URL, bearer token, `brain_token`, or app-owned 64-hex token appears in relevant logcat lines.

## Non-Goals

- Do not fork the upstream plugin.
- Do not change the share payload delivered to JavaScript.
- Do not change web capture behavior.
- Do not publish or distribute the APK without explicit user authorization.

## Acceptance Criteria

| ID | Acceptance |
| --- | --- |
| A26-F1 | A tracked script patches `node_modules/@capgo/capacitor-share-target/android/src/main/java/app/capgo/sharetarget/CapacitorShareTargetPlugin.java` before Gradle builds. |
| A26-F2 | The patch replaces `Log.d(TAG, "Share received: " + shareData.toString())` with a count-only log. |
| A26-F3 | The patch removes raw URI text from plugin error logs. |
| A26-F4 | `scripts/build-apk.sh` invokes the patch script before `npx cap sync android`. |
| A26-F5 | Android version is bumped to `1.0.5/code6`. |
| A26-F6 | Rebuilt APK installs over the prior candidate and URL-share result still shows "Link could not be saved". |
| A26-F7 | A fresh logcat scan for the A26 share fixture has no raw fixture URL, no `brain_token`, no bearer value, and no app-owned token leakage. |

## Open Questions

1. Should the patch fail the build if the upstream plugin source changes? v1 says yes.
2. Should all 64-hex log lines fail the gate? v1 says no if they are Android/Google `go/retraceme` frames outside the app/share plugin context.
