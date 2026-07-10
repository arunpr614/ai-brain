# Feature Release A31 - APK Publication Authorization Implementation Plan v2

Created: 2026-06-17 01:10:00 IST
Owner: Codex
Status: Ready for execution
PRD: `FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_PRD_V2_2026-06-17_01-07-00_IST.md`
Supersedes: `FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_IMPLEMENTATION_PLAN_V1_2026-06-17_01-08-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_01-09-00_IST.md`

## Revision Summary

Plan v2 adds a fixed path allowlist, fail-closed missing-artifact behavior, exact tracker labels, explicit scan patterns, running-log authorization rationale, and a PM sidecar integration checkpoint.

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
2. Verify the candidate artifact without rebuilding:
   - confirm `data/artifacts/brain-debug-v1.0.5-code6.apk` exists;
   - compute SHA-256;
   - compute size;
   - confirm `android/app/build.gradle` still contains `versionName "1.0.5"` and `versionCode 6`.
3. If artifact verification fails:
   - do not rebuild;
   - create the authorization packet as `blocked_artifact_verification_failed`;
   - keep APK publication blocked;
   - update trackers with the blocked verification state.
4. Inspect current release packet and delivery tracker for stale publication language.
5. Create the A31 authorization packet with:
   - artifact identity and fresh verification result;
   - evidence summary;
   - channel-risk matrix;
   - default-deny owner decision form;
   - accessibility residual-risk decision scope;
   - install/reinstall/rollback caveats;
   - no-go conditions;
   - recommended next action.
6. Update A7 release readiness packet using these exact labels:
   - `apk_publication_authorization_packet_ready`;
   - `apk_publication_authorization_missing`;
   - `platform_ax_equivalent_passed_with_residual_risk`.
7. Update delivery gate tracker with the same labels.
8. Add A31 milestone row to `UX_v2/trackers/milestone_tracker.md`.
9. Create A31 PM tracker update.
10. Integrate PM sidecar findings if available before final validation; if not available, continue with locally inspected evidence and record that the sidecar was not blocking.
11. Append root running log entry directly because the active goal explicitly requested running-log use at regular intervals or milestone achievement. Preserve append-only behavior and keep the root log unstaged.
12. Validate:
    - whitespace check over A31 docs and updated trackers;
    - redaction scan over A31 docs and updated trackers for `brain_token`, `Bearer`, `AIza`, `sk-`, `bot[0-9]+:`, `PRIVATE_KEY`, `PASSWORD`, `SECRET`, raw pairing codes, and suspicious signed URLs;
    - classify the APK SHA-256 as an allowed non-secret hash only when it exactly matches the verified artifact hash;
    - tracker label scan for stale `talkback_spoken_passed` or `APK publication authorized: Yes` language;
    - staged-file exclusion scan.
13. Stage only the A31 allowlist.
14. Review `git diff --cached --name-only`; it must match the allowlist and must not include root `RUNNING_LOG.md` or unrelated dirty files.
15. Commit safe staged A31 docs.

## Staging Allowlist

Only these paths may be staged for the A31 commit:

- `UX_v2/features/FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_PRD_V1_2026-06-17_01-05-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_PRD_ADVERSARIAL_REVIEW_2026-06-17_01-06-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_PRD_V2_2026-06-17_01-07-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_IMPLEMENTATION_PLAN_V1_2026-06-17_01-08-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_01-09-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_IMPLEMENTATION_PLAN_V2_2026-06-17_01-10-00_IST.md`
- `UX_v2/execution/UX_V2_A31_APK_PUBLICATION_AUTHORIZATION_PACKET_2026-06-17_01-15-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-17_01-15-00_IST.md`
- `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
- `UX_v2/trackers/milestone_tracker.md`

Root `RUNNING_LOG.md` is intentionally not in the staging allowlist.

## Validation Gates

| Gate | Required result |
| --- | --- |
| Artifact verification | Existing APK identity recorded with fresh SHA-256 and size, or packet marks artifact verification blocked. |
| Non-mutating scope | No APK rebuild, signing, upload, publish, deployment, production mutation, push, or PR. |
| Default-deny decisions | All owner decision fields start as not authorized/selected/accepted. |
| Tracker honesty | Trackers say A31 packet is ready but APK publication remains blocked. |
| Staging hygiene | Cached path list matches the A31 allowlist exactly, excluding root `RUNNING_LOG.md`. |
| Evidence hygiene | No secret/private data or forbidden artifacts are tracked. |

## No-Go Gates

- Do not publish, sign, upload, distribute, or rebuild an APK.
- Do not mark APK publication complete.
- Do not mark A30 as `talkback_spoken_passed`.
- Do not stage root `RUNNING_LOG.md`.
- Do not use broad staging.
- Do not commit if cached paths include unrelated dirty files, binary artifacts, raw evidence, keystores, `.env`, databases, `assets/`, or `data/artifacts/`.
