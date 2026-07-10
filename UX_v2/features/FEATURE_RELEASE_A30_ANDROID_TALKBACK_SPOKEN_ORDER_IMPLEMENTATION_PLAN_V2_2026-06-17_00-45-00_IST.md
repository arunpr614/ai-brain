# Feature Release A30 - Android TalkBack Spoken Order Implementation Plan v2

Created: 2026-06-17 00:45:00 IST
Owner: Codex
Status: Ready for execution
PRD: `FEATURE_RELEASE_A30_ANDROID_TALKBACK_SPOKEN_ORDER_PRD_V2_2026-06-17_00-42-00_IST.md`
Supersedes: `FEATURE_RELEASE_A30_ANDROID_TALKBACK_SPOKEN_ORDER_IMPLEMENTATION_PLAN_V1_2026-06-17_00-43-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A30_ANDROID_TALKBACK_SPOKEN_ORDER_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_00-44-00_IST.md`

## Revision Summary

Plan v2 adds a state-safe Android preflight, a tiered accessibility evidence ladder, safe item/repair target selection, a dedicated A30 evidence directory, and tracker stale-wording validation.

## Evidence Tiers

Use the strongest feasible tier and record it in the QA report:

1. `talkback_spoken_passed`: human-heard TalkBack or audio/video transcript.
2. `platform_ax_equivalent_passed_with_residual_risk`: CDP Accessibility tree or Android accessibility/focus tree proves order/labels, but no human-heard speech.
3. `dom_ax_proxy_passed_with_residual_risk`: DOM/accessibility proxy from the WebView page proves semantic order, but Android platform focus cannot be captured.
4. `blocked`: none of the above can be captured credibly.

## Output Files

| File | Purpose |
| --- | --- |
| `UX_v2/execution/UX_V2_A30_ANDROID_TALKBACK_SPOKEN_ORDER_QA_2026-06-17_00-50-00_IST.md` | Main A30 QA report. |
| `UX_v2/execution/UX_V2_A30_ANDROID_TALKBACK_AX_SUMMARY_2026-06-17_00-50-00_IST.json` | Redacted ordered accessibility summary. |
| `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a30/` | Runtime screenshots/XML/raw local evidence; stage only redacted summaries if needed. |
| `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-17_00-50-00_IST.md` | PM update. |
| `UX_v2/trackers/milestone_tracker.md` | Milestone update. |
| `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md` | Delivery-gate update. |
| `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md` | Release-packet update. |
| `RUNNING_LOG.md` | Append-only milestone log entry. |

## Execution Steps

1. Preflight Android tooling.
   - Use `/opt/homebrew/share/android-commandlinetools/platform-tools/adb`.
   - Use `/opt/homebrew/share/android-commandlinetools/emulator/emulator`.
   - Use AVD `Brain_API_36` if no device is running.
2. Verify APK identity.
   - Check `data/artifacts/brain-debug-v1.0.5-code6.apk`.
   - Query installed `com.arunprakash.brain` metadata.
   - Reinstall only if package is absent or wrong version.
3. Force-stop and relaunch.
   - Record baseline screenshot/XML under `android-runtime-a30/`.
   - Classify baseline screen as locked, authenticated, share-result, or blocked.
4. Establish safe target selection.
   - Reuse existing visible navigation where possible.
   - For item detail/repair, use an already available safe route alias from prior evidence if present.
   - If safe target selection would expose raw IDs/titles, mark item/repair blocked instead of writing private values.
5. Try evidence tier 1.
   - Enable TalkBack only if the environment supports observation or transcript/audio capture.
   - Restore TalkBack settings after the attempt.
6. Try evidence tier 2.
   - Forward WebView DevTools if available.
   - Use CDP `Accessibility.getFullAXTree` if supported.
   - Otherwise inspect UIAutomator XML/focused nodes for labels/order.
7. Try evidence tier 3.
   - Use WebView/DOM-derived semantic order only if tier 1/2 cannot capture enough data.
   - Label the result as residual risk.
8. Audit required screens.
   - Locked/unpaired launch.
   - Library.
   - Ask.
   - Capture.
   - More.
   - Device pairing.
   - Item detail.
   - Item repair.
   - Native share saved-result screen if safely reachable.
   - Native share failure/result state if safely reachable.
9. For each screen, record:
   - screen alias;
   - evidence tier;
   - route/state classification;
   - ordered labels/actions;
   - expected order;
   - observed order;
   - pass/fail/blocked;
   - evidence path;
   - residual risk.
10. If a new share fixture is required:
    - precheck production count is zero for a deterministic fixture;
    - create the share through Android intent;
    - capture result;
    - cleanup with foreign keys enabled;
    - verify immediate and delayed zero counts.
11. Write QA report and redacted JSON summary.
12. Update release packet, milestone tracker, delivery tracker, and PM update.
13. Append the running log.
14. Validate:
    - whitespace check for A30-created docs/evidence;
    - redaction scan for token/session/PIN/private ID patterns;
    - targeted TalkBack wording scan over updated trackers/release packet.
15. Stage only safe A30 docs/evidence/tracker changes and commit if validation is clean.

## Validation Gates

| Gate | Required evidence |
| --- | --- |
| APK identity | Installed package is `versionName=1.0.5`, `versionCode=6`, or A30 documents why a newer candidate was required. |
| State safety | Each audit row records the actual screen/route state before judging labels/order. |
| Evidence tier | QA report uses one of the four defined tiers and does not overclaim. |
| Locked privacy | Locked visible sample and accessibility-label sample contain no private data. |
| Route coverage | Required screens pass or have exact blocker reasons. |
| Tracker consistency | Release packet, milestone tracker, delivery tracker, and PM update use the same A30 verdict. |
| Evidence hygiene | Redaction scan passes over A30-created tracked docs/evidence. |

## No-Go Gates

- No `talkback_spoken_passed` without observed spoken output or transcript.
- No publication-ready claim without publication authorization and owner acceptance of any residual AX-only risk.
- No pass if screen state cannot be verified.
- No pass for share-result evidence if production fixture cleanup fails.
- No staging of root `RUNNING_LOG.md`, raw runtime logs, screenshots, APKs, DBs, `.env`, keystores, `assets/`, or `data/artifacts/`.

## Expected Outcome

A30 should either:

- close the accessibility gate as `talkback_spoken_passed`; or
- reduce it to `platform_ax_equivalent_passed_with_residual_risk` / `dom_ax_proxy_passed_with_residual_risk`, requiring owner acceptance before publication; or
- keep it `blocked` with precise tooling or state evidence.

In all cases, APK publication remains blocked until Arun explicitly authorizes a signing/distribution target.
