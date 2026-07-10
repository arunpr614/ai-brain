# Feature Release A34 - Private Sideload Debug APK Build Implementation Plan v2

Created: 2026-06-17 07:50:00 IST
Owner: Codex
Status: Ready for execution
PRD: `FEATURE_RELEASE_A34_PRIVATE_SIDELOAD_DEBUG_APK_BUILD_PRD_V2_2026-06-17_07-47-00_IST.md`
Supersedes: `FEATURE_RELEASE_A34_PRIVATE_SIDELOAD_DEBUG_APK_BUILD_IMPLEMENTATION_PLAN_V1_2026-06-17_07-48-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A34_PRIVATE_SIDELOAD_DEBUG_APK_BUILD_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_07-49-00_IST.md`

## Revision Summary

Plan v2 adds post-build tracked-change classification, explicit upstream push behavior, fresh-install state warning, and conservative goal-completion language.

## Goal

Create a fresh private-sideload Android debug APK by bumping Android version metadata, running the existing debug APK build pipeline, verifying artifact identity, preparing install notes, and pushing source/docs changes. A34 prepares a private-sideload artifact; it is not a public release.

## Execution Steps

1. Bump `android/app/build.gradle` from `versionName "1.0.5"` / `versionCode 6` to `versionName "1.0.6"` / `versionCode 7`.
2. Run `npm run build:apk`.
3. Verify `data/artifacts/brain-debug-v1.0.6-code7.apk` exists, record size and SHA-256.
4. Verify Gradle output exists and checksum matches shared artifact.
5. Attempt best-effort fresh install on available emulator/device; record pass or exact skip.
6. Inspect post-build tracked changes and classify every staged candidate as A34-owned before staging.
7. Create A34 QA report and private sideload install notes.
8. Update project, roadmap/delivery/milestone/release trackers as needed.
9. Append root running log entry and keep it unstaged.
10. Stage source/docs only, excluding APK binary and ignored artifacts.
11. Commit A34.
12. Push branch with `git push -u origin codex/ai-brain-ux-v2-execution`.

## Validation Gates

| Gate | Required result |
| --- | --- |
| Version bump | Android metadata is `1.0.6/code7`. |
| Build | `npm run build:apk` exits 0. |
| Artifact identity | APK path, size, SHA-256, and matching Gradle output are recorded. |
| Fresh install | Emulator/device fresh install passes, or exact skip reason is recorded. |
| Post-build ownership | Every staged tracked change is attributable to A34. |
| Private-only boundary | Notes say debug-signed private sideload only; no public/store release. |
| Accessibility boundary | Notes say A30 AX-equivalent risk accepted only for private sideload; no true spoken TalkBack claim. |
| Staging hygiene | No APK, `data/artifacts/`, keystore, root running log, `.env`, DB, raw evidence, or Telegram docs staged. |
| Push | Branch push succeeds, or exact push failure is reported. |

## Staging Allowlist

- `android/app/build.gradle`
- A34 PRD/review/plan files under `UX_v2/features/`
- A34 QA report under `UX_v2/execution/`
- A34 install notes under `UX_v2/execution/`
- A34 PM update under `UX_v2/project_management/`
- `PROJECT_TRACKER.md`
- `ROADMAP_TRACKER.md`
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
- `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
- `UX_v2/trackers/milestone_tracker.md`
- Any build-generated tracked Android config/assets only if post-build inspection proves they are A34-owned.

## Excluded Paths

- `RUNNING_LOG.md`
- `docs/plans/v0.6.5-telegram-capture-PRD.md`
- `docs/plans/v0.6.5-telegram-capture.md`
- `data/artifacts/**`
- `*.apk`
- `*.aab`
- keystores
- DBs
- `.env`
- raw logs/screenshots/XML
- Magic Patterns artifacts

## No-Go Gates

- Do not upload, publish, distribute externally, create a GitHub Release, create a PR, or submit to Play.
- Do not stage the APK binary.
- Do not mark the full active goal complete solely from A34 unless Arun later confirms private sideload artifact readiness is the final Android delivery state.
- Do not commit if unclassified tracked generated files are present.
