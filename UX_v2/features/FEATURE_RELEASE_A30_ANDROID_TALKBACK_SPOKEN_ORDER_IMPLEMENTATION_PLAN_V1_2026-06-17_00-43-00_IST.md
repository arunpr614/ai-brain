# Feature Release A30 - Android TalkBack Spoken Order Implementation Plan v1

Created: 2026-06-17 00:43:00 IST
Owner: Codex
Status: Draft for adversarial review
PRD: `FEATURE_RELEASE_A30_ANDROID_TALKBACK_SPOKEN_ORDER_PRD_V2_2026-06-17_00-42-00_IST.md`

## Scope

Run an Android accessibility evidence pass for APK `1.0.5/code6`. Prefer direct TalkBack/manual output if the environment supports it. Otherwise use WebView/Android accessibility-tree evidence and label the result with residual risk.

## Output Files

| File | Purpose |
| --- | --- |
| `UX_v2/execution/UX_V2_A30_ANDROID_TALKBACK_SPOKEN_ORDER_QA_2026-06-17_00-50-00_IST.md` | Main A30 QA report. |
| `UX_v2/execution/UX_V2_A30_ANDROID_TALKBACK_AX_SUMMARY_2026-06-17_00-50-00_IST.json` | Redacted accessibility order summary. |
| `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-17_00-50-00_IST.md` | PM update. |
| `UX_v2/trackers/milestone_tracker.md` | Milestone update. |
| `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md` | Delivery-gate update. |
| `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md` | Release-packet update. |
| `RUNNING_LOG.md` | Append-only milestone log entry. |

## Steps

1. Verify Android tooling and emulator/device target.
2. Start `Brain_API_36` if needed.
3. Verify installed `com.arunprakash.brain` version and reinstall `data/artifacts/brain-debug-v1.0.5-code6.apk` if needed.
4. Launch the app and determine whether an authenticated session is already available.
5. Try TalkBack enablement and focus traversal.
6. Try WebView DevTools accessibility tree capture.
7. For each required screen, collect ordered accessibility labels and roles.
8. Record locked-screen privacy separately for visual and accessibility content.
9. If share-result state is needed, prefer a non-mutating route/state; if a new share is required, use deterministic fixture cleanup.
10. Write A30 QA and redacted JSON summary.
11. Update trackers and running log.
12. Run whitespace and redaction checks over A30-created docs/evidence.
13. Stage only safe A30 docs/evidence/tracker changes and commit if complete.

## Validation Gates

| Gate | Required evidence |
| --- | --- |
| APK identity | Version and package metadata match `1.0.5/code6`. |
| Accessibility order | Each required screen has ordered label evidence or exact blocked reason. |
| Privacy | Locked accessibility content has no private data. |
| Evidence hygiene | Redaction scan passes. |
| Tracker consistency | Release packet and trackers use the same A30 verdict. |

## No-Go Gates

- No `talkback_spoken_passed` verdict without human-heard or audio/video transcript evidence.
- No APK publication-ready claim.
- No production mutation without cleanup.
- No raw secrets/private content in tracked evidence.
