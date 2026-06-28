# Recall Public Docs Privacy Corpus - Second Manual Reports

Generated: 2026-06-27 01:06:52 IST

## Summary

The Recall public-doc privacy gate now includes the public documents created after the first capped apply and production deploy, including scheduler handoff evidence, live-diagnostic proof reports, and second-manual verification readiness/approval guidance.

This change prevents the default no-live privacy check from passing while newer operator-facing Recall documents sit outside the curated fail-closed scan.

## Scope Added

| Document group | Files added to default scan |
| --- | --- |
| First apply/deploy evidence | `RECALL_FIRST_CAPPED_APPLY_AND_PRODUCTION_DEPLOY_EXECUTION_REPORT_2026-06-26_23-50-00_IST.md` |
| Scheduler handoff evidence | `RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md`, `RECALL_SCHEDULER_ENABLEMENT_MANUAL_CLEAN_RUN_EVIDENCE_GUARD_EXECUTION_REPORT_2026-06-26_23-56-37_IST.md`, `RECALL_SCHEDULER_ENABLEMENT_EVIDENCE_RECORDER_EXECUTION_REPORT_2026-06-27_00-07-12_IST.md` |
| Second manual verification evidence | `RECALL_SECOND_MANUAL_VERIFICATION_APPLY_WRAPPER_EXECUTION_REPORT_2026-06-27_00-14-29_IST.md`, `RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` |
| Live diagnostic evidence | `RECALL_LIVE_DIAGNOSTIC_LOCAL_STATUS_FAILURE_BYPASS_EXECUTION_REPORT_2026-06-27_00-23-39_IST.md`, `RECALL_LIVE_DIAGNOSTIC_LOCAL_STATUS_FAILURE_RELEASE_GATE_HARDENING_2026-06-27_00-31-34_IST.md`, `RECALL_LIVE_DIAGNOSTIC_STATUS_HELPER_FAILURE_ACTUAL_RUN_2026-06-27_00-36-10_IST.md` |
| Current gate guidance | `RECALL_COMPLETION_STATUS_SECOND_MANUAL_GATE_GUIDANCE_2026-06-27_00-45-20_IST.md`, `RECALL_SECOND_MANUAL_VERIFICATION_READINESS_GATE_2026-06-27_00-56-03_IST.md`, `RECALL_SECOND_MANUAL_READINESS_STATUS_GUIDANCE_ALIGNMENT_2026-06-27_01-01-12_IST.md` |

## Implementation

Updated `scripts/check-recall-public-docs-privacy.mjs` so the default curated scope scans 73 current Recall public documents instead of the prior 60. The scope label and help text now describe the apply, deploy, scheduler, live-diagnostic, and second-manual evidence coverage.

The scanner remains fail-closed: if any curated public document is missing, the default scan fails with `missing_current_doc`.

## Verification

| Check | Result |
| --- | --- |
| `node --check scripts/check-recall-public-docs-privacy.mjs` | Passed |
| `node --check scripts/smoke-recall-public-docs-privacy.mjs` | Passed |
| `npm run -s check:recall-public-docs-privacy` | Passed; scanned 73 curated public documents |
| `npm run -s smoke:recall-public-docs-privacy` | Passed; proves missing curated docs fail closed and synthetic leak previews are redacted |
| `npm run -s check:recall-approval-packet` | Passed |
| `npm run -s check:recall-scheduler` | Passed |
| `npm run -s recall:second-manual:readiness` | Passed; ready for approval only, with live write, scheduler, and checkpoint still disallowed |
| `npm run -s recall:daily-sync:completion-status` | Passed as incomplete by design; active gate remains `second_manual_verification_run` |
| `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` | Passed; included `public_docs_privacy_scan` with 73 scanned files |

## Safety Notes

- No Recall API call was made.
- No live write was run.
- No production deploy was run.
- No scheduler was enabled.
- No checkpoint was advanced.
- No private Recall content or API key value is included in this report.

## Current Gate

The real project gate remains `second_manual_verification_run`.

Next production action still requires exact owner approval for the second manual verification run. This privacy-corpus update only improves no-live release and handoff validation.
