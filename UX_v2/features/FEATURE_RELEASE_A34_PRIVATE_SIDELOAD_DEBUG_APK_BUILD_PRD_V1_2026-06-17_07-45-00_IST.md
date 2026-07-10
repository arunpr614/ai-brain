# Feature Release A34 - Private Sideload Debug APK Build PRD v1

Created: 2026-06-17 07:45:00 IST
Owner: Codex
Status: Draft for adversarial review
Related gates: A31 APK publication authorization packet, A33 completion audit, Android debug APK build pipeline

## Objective

Build a fresh Android debug APK for Arun's private sideload use, with a version bump before sharing, existing debug-keystore signing, fresh-install posture, and standalone Markdown install notes. A34 is not a public distribution or store release.

## Owner Decisions Captured

| Decision | Owner response / A34 interpretation |
| --- | --- |
| APK publication approval | Approved for building a new debug APK artifact only. |
| Distribution target | No distribution strategy; Arun will privately sideload the local APK. |
| Signing mode | Debug APK. |
| Signing authority | Existing project debug keystore. |
| Accessibility decision | Codex to decide; A34 should use A30 AX-equivalent evidence only for private sideload residual-risk acceptance. |
| Artifact/version | Bump Android version before sharing. |
| Install/rollback posture | Fresh install. |
| Repository action | Codex decides; owner prefers pushing remaining code once done. |
| Notes | Create a separate Markdown notes file for Arun. |

## Requirements

| ID | Requirement | Priority | Acceptance evidence |
| --- | --- | --- | --- |
| A34-R1 | Bump Android installable metadata before building. | P0 | `android/app/build.gradle` changes from `1.0.5/code6` to `1.0.6/code7`. |
| A34-R2 | Build a new debug APK through the existing build pipeline. | P0 | `npm run build:apk` passes and creates `data/artifacts/brain-debug-v1.0.6-code7.apk`. |
| A34-R3 | Use existing debug signing authority. | P0 | Build uses `android/app/debug.keystore`; no release keystore, AAB, Play signing, or new signing config. |
| A34-R4 | Treat A30 accessibility evidence as private-sideload-only risk acceptance. | P0 | Notes and QA say A30 is AX-equivalent residual risk, not `talkback_spoken_passed`, and not approved for public/store release. |
| A34-R5 | Use fresh-install posture. | P0 | Notes tell Arun to uninstall `com.arunprakash.brain` first, then install and re-pair. |
| A34-R6 | Create standalone Markdown install notes. | P0 | `UX_v2/execution/UX_V2_A34_PRIVATE_SIDELOAD_APK_INSTALL_NOTES_*.md` includes artifact path, SHA-256, install steps, risk notes, and rollback/fresh-install guidance. |
| A34-R7 | Update trackers and running log. | P1 | Project/delivery/milestone trackers and root running log record A34. |
| A34-R8 | Push code/doc changes after validation. | P1 | Branch push succeeds, or failure is reported exactly. APK binary remains local/ignored unless explicitly requested. |

## Acceptance Criteria

1. A34 PRD/review/plan/review files exist before version/build execution.
2. New artifact path, size, SHA-256, versionName, versionCode, and package are recorded.
3. Build validation result is recorded, including any warnings.
4. Notes file is clear enough for private fresh-install sideload.
5. No public distribution, upload, release signing, Play submission, PR creation, or Magic Patterns mutation occurs.
6. Staged paths exclude root `RUNNING_LOG.md`, APK binaries, `data/artifacts/`, keystores, DBs, `.env`, raw logs/screenshots, and unrelated Telegram docs.

## Out Of Scope

- Public APK release.
- Google Play internal testing.
- GitHub Release or hosted storage upload.
- Release signing or AAB generation.
- True human-heard/audio-video TalkBack audit.
- Production web deploy.
- Magic Patterns edits or publishing.

## No-Go Conditions

- Build fails.
- New APK artifact does not exist or checksum cannot be computed.
- Version metadata does not bump before the build.
- Notes claim public-release readiness or `talkback_spoken_passed`.
- Staged files include APK binaries, keystores, secrets, root running log, or unrelated Telegram docs.
