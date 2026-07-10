# Feature Release A31 - APK Publication Authorization Implementation Plan v1

Created: 2026-06-17 01:08:00 IST
Owner: Codex
Status: Draft for adversarial review
PRD: `FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_PRD_V2_2026-06-17_01-07-00_IST.md`

## Goal

Execute A31 by creating a publication authorization packet and updating project trackers while preserving the current no-publication state. This is a decision-readiness slice, not an APK release.

## Output Files

| File | Purpose |
| --- | --- |
| `UX_v2/execution/UX_V2_A31_APK_PUBLICATION_AUTHORIZATION_PACKET_2026-06-17_01-15-00_IST.md` | Owner-ready authorization packet. |
| `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-17_01-15-00_IST.md` | PM update for A31. |
| `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md` | Gate tracker update. |
| `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md` | Release packet update. |
| `UX_v2/trackers/milestone_tracker.md` | Milestone row for A31. |
| `RUNNING_LOG.md` | Append-only A31 milestone entry; do not stage unless explicitly approved. |

## Execution Steps

1. Verify current branch and dirty state.
2. Verify the candidate artifact:
   - confirm `data/artifacts/brain-debug-v1.0.5-code6.apk` exists;
   - compute SHA-256;
   - compute size;
   - confirm `android/app/build.gradle` still contains `versionName "1.0.5"` and `versionCode 6`.
3. Inspect current release packet and delivery tracker for stale publication language.
4. Create the A31 authorization packet with:
   - artifact identity;
   - evidence summary;
   - channel-risk matrix;
   - owner decision form;
   - install/reinstall/rollback caveats;
   - no-go conditions;
   - recommended next action.
5. Update A7 release readiness packet.
6. Update delivery gate tracker.
7. Add A31 milestone row.
8. Create A31 PM tracker update.
9. Append root running log entry.
10. Validate:
    - whitespace check over A31 docs and updated trackers;
    - redaction scan over A31 docs;
    - staged-file exclusion scan;
    - ensure no APK, AAB, keystore, DB, `.env`, raw runtime evidence, screenshots, XML, `assets/`, `data/artifacts/`, or root `RUNNING_LOG.md` are staged.
11. Stage only safe A31 docs and tracker updates.
12. Commit safe staged A31 docs.

## Validation Gates

| Gate | Required result |
| --- | --- |
| Artifact verification | Existing APK identity recorded with fresh SHA-256 and size, or packet marks artifact verification blocked. |
| Non-mutating scope | No APK rebuild, signing, upload, publish, deployment, production mutation, push, or PR. |
| Default-deny decisions | All owner decision fields start as not authorized/selected/accepted. |
| Tracker honesty | Trackers say A31 packet is ready but APK publication remains blocked. |
| Evidence hygiene | No secret/private data or forbidden artifacts are tracked. |

## No-Go Gates

- Do not publish, sign, upload, distribute, or rebuild an APK.
- Do not mark APK publication complete.
- Do not mark A30 as `talkback_spoken_passed`.
- Do not stage root `RUNNING_LOG.md`.
- Do not use broad staging.
