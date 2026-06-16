# Feature Release A26 - Android Share Target Log Hygiene PRD v2

Created: 2026-06-16 23:36 IST
Owner: Codex
Status: Approved for implementation planning
Supersedes: `FEATURE_RELEASE_A26_ANDROID_SHARE_TARGET_LOG_HYGIENE_PRD_V1_2026-06-16_23-34-00_IST.md`

## Decision Summary

A26 closes the native privacy blocker discovered during A25. The Android share-target plugin must not log raw shared URLs, text, filenames, file URIs, tokens, or full payload JSON.

## Requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| A26-F1 | Add a tracked, idempotent patch script. | Script patches the Capgo Android plugin source in `node_modules`; rerunning succeeds if already patched. |
| A26-F2 | Fail closed. | Script exits non-zero if the unsafe `shareData.toString()` log remains or the expected plugin file is missing. |
| A26-F3 | Sanitize success log. | Share received log contains only text/file counts, not raw payload data. |
| A26-F4 | Sanitize plugin error log with URI. | `Error getting file data for URI: ...` becomes a static message. |
| A26-F5 | Build integration. | `scripts/build-apk.sh` runs the patch before `npx cap sync android`. |
| A26-F6 | APK version bump. | Android candidate becomes `1.0.5/code6`. |
| A26-F7 | Runtime proof. | Rebuilt APK installs; URL share still shows "Link could not be saved"; focused log scan shows no raw fixture URL, no `brain_token`, no bearer value, and no token leakage in app/plugin lines. |

## Validation

- `npm run build:apk`
- `adb install -r data/artifacts/brain-debug-v1.0.5-code6.apk`
- `adb shell dumpsys package com.arunprakash.brain` version check
- Android URL-share fixture screenshot/XML/logcat
- Focused app/plugin log leak scan

## Remaining Gates

A26 does not authorize publication. APK distribution still needs explicit user approval and target.
