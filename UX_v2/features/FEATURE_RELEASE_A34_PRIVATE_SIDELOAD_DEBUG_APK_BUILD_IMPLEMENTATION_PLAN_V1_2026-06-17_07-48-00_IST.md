# Feature Release A34 - Private Sideload Debug APK Build Implementation Plan v1

Created: 2026-06-17 07:48:00 IST
Owner: Codex
Status: Draft for adversarial review
PRD: `FEATURE_RELEASE_A34_PRIVATE_SIDELOAD_DEBUG_APK_BUILD_PRD_V2_2026-06-17_07-47-00_IST.md`

## Goal

Create a fresh private-sideload Android debug APK by bumping Android version metadata, running the existing debug APK build pipeline, verifying artifact identity, preparing install notes, and pushing source/docs changes.

## Execution Steps

1. Bump `android/app/build.gradle` from `versionName "1.0.5"` / `versionCode 6` to `versionName "1.0.6"` / `versionCode 7`.
2. Run `npm run build:apk`.
3. Verify `data/artifacts/brain-debug-v1.0.6-code7.apk` exists, record size and SHA-256.
4. Verify Gradle output exists and checksum matches shared artifact.
5. Attempt best-effort fresh install on available emulator/device; record pass or exact skip.
6. Create A34 QA report and private sideload install notes.
7. Update project, delivery, milestone, and release trackers.
8. Append root running log entry and keep it unstaged.
9. Stage source/docs only, excluding APK binary and ignored artifacts.
10. Commit and push branch.

## Validation Gates

| Gate | Required result |
| --- | --- |
| Version bump | Android metadata is `1.0.6/code7`. |
| Build | `npm run build:apk` exits 0. |
| Artifact identity | APK path, size, SHA-256, and matching Gradle output are recorded. |
| Private-only boundary | Notes say debug-signed private sideload only; no public/store release. |
| Accessibility boundary | Notes say A30 AX-equivalent risk accepted only for private sideload; no true spoken TalkBack claim. |
| Staging hygiene | No APK, `data/artifacts/`, keystore, root running log, `.env`, DB, raw evidence, or Telegram docs staged. |

## No-Go Gates

- Do not upload, publish, distribute externally, create a GitHub Release, create a PR, or submit to Play.
- Do not stage the APK binary.
- Do not claim full active goal completion unless private sideload build is treated as the owner-approved final Android delivery and all validations pass.
