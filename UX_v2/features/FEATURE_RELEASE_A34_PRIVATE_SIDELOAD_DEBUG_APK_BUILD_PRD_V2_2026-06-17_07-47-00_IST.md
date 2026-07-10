# Feature Release A34 - Private Sideload Debug APK Build PRD v2

Created: 2026-06-17 07:47:00 IST
Owner: Codex
Status: Ready for implementation planning
Supersedes: `FEATURE_RELEASE_A34_PRIVATE_SIDELOAD_DEBUG_APK_BUILD_PRD_V1_2026-06-17_07-45-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A34_PRIVATE_SIDELOAD_DEBUG_APK_BUILD_PRD_ADVERSARIAL_REVIEW_2026-06-17_07-46-00_IST.md`

## Revision Summary

PRD v2 adds best-effort fresh-install validation, explicit debug-only/private-only release boundaries, and source/docs-only push scope.

## Objective

Build a fresh Android debug APK for Arun's private sideload use, with a version bump before sharing, existing debug-keystore signing, fresh-install posture, and standalone Markdown install notes. A34 is not a public distribution or store release.

## Owner Decisions Captured

| Decision | Owner response / A34 interpretation |
| --- | --- |
| APK publication approval | Approved for building a new debug APK artifact only. |
| Distribution target | No distribution strategy; Arun will privately sideload the local APK. |
| Signing mode | Debug APK. |
| Signing authority | Existing project debug keystore. |
| Accessibility decision | Accept A30 AX-equivalent residual risk for private sideload only; do not claim `talkback_spoken_passed`. |
| Artifact/version | Bump Android version before sharing. |
| Install/rollback posture | Fresh install. |
| Repository action | Commit and push source/docs branch after validation; do not push APK binary. |
| Notes | Create a separate Markdown notes file for Arun. |

## Requirements

| ID | Requirement | Priority | Acceptance evidence |
| --- | --- | --- | --- |
| A34-R1 | Bump Android installable metadata before building. | P0 | `android/app/build.gradle` changes from `1.0.5/code6` to `1.0.6/code7`. |
| A34-R2 | Build a new debug APK through the existing build pipeline. | P0 | `npm run build:apk` passes and creates `data/artifacts/brain-debug-v1.0.6-code7.apk`. |
| A34-R3 | Use existing debug signing authority. | P0 | Build uses `android/app/debug.keystore`; no release keystore, AAB, Play signing, or new signing config. |
| A34-R4 | Treat A30 accessibility evidence as private-sideload-only risk acceptance. | P0 | Notes and QA say A30 is AX-equivalent residual risk, not `talkback_spoken_passed`, and not approved for public/store release. |
| A34-R5 | Use fresh-install posture. | P0 | Notes tell Arun to uninstall `com.arunprakash.brain` first, then install and re-pair. |
| A34-R6 | Validate fresh install when tooling is available. | P1 | If emulator/adb is available, uninstall/install and verify package version; otherwise record exact skip reason. |
| A34-R7 | Create standalone Markdown install notes. | P0 | `UX_v2/execution/UX_V2_A34_PRIVATE_SIDELOAD_APK_INSTALL_NOTES_*.md` includes artifact path, SHA-256, install steps, risk notes, and rollback/fresh-install guidance. |
| A34-R8 | Update trackers and running log. | P1 | Project/delivery/milestone trackers and root running log record A34. |
| A34-R9 | Push source/docs changes after validation. | P1 | Branch push succeeds, or failure is reported exactly. APK binary remains local/ignored unless explicitly requested. |

## Acceptance Criteria

1. A34 PRD/review/plan/review files exist before version/build execution.
2. New artifact path, size, SHA-256, versionName, versionCode, and package are recorded.
3. Build validation result is recorded, including any warnings.
4. Fresh-install validation passes on an available emulator/device or the skip reason is explicit.
5. Notes file is clear enough for private fresh-install sideload.
6. No public distribution, upload, release signing, Play submission, PR creation, or Magic Patterns mutation occurs.
7. Staged paths exclude root `RUNNING_LOG.md`, APK binaries, `data/artifacts/`, keystores, DBs, `.env`, raw logs/screenshots, and unrelated Telegram docs.

## Out Of Scope

- Public APK release.
- Google Play internal testing.
- GitHub Release or hosted storage upload.
- Release signing or AAB generation.
- True human-heard/audio-video TalkBack audit.
- Production web deploy.
- Magic Patterns edits or publishing.
- Committing APK binaries.

## No-Go Conditions

- Build fails.
- New APK artifact does not exist or checksum cannot be computed.
- Version metadata does not bump before the build.
- Notes claim public-release readiness or `talkback_spoken_passed`.
- Staged files include APK binaries, keystores, secrets, root running log, or unrelated Telegram docs.
