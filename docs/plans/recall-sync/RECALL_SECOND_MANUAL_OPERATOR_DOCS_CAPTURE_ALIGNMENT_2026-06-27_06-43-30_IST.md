# Recall Second Manual Operator Docs Capture Alignment

Created: 2026-06-27 06:43 IST
Owner: Codex
Status: Completed; no live write performed
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Align the second-manual production apply operator docs and static release guard with the current runner behavior: after a future approved production apply, `scripts/run-recall-second-manual-production-apply.mjs` captures the remote `scheduled-apply-*.json` report, stores a local private copy, validates it with the post-apply report checker, and returns the result in `secondManualApplyReport`.

This report contains no Recall API key, bearer token, private Recall card ID, title, source URL, raw chunk, raw response body, apply payload, or database row.

## Root Cause

The implementation had been hardened to capture and locally validate the second-manual apply report, but two operator documents still described the older post-apply flow as a separate manual validation step only. That was easy to misread during the future approved live run, and the static scheduler-artifact guard did not yet require the new capture behavior.

## Changes

| Area | File | Change |
| --- | --- | --- |
| Static release guard | `scripts/check-recall-scheduler-artifacts.mjs` | Now requires `captureAndValidateRemoteApplyReport`, `secondManualApplyReport`, remote `apply_report=` parsing, production-shaped `scheduled-apply-\d{8}T\d{6}Z` paths, local `check-recall-apply-report.mjs` validation, `--local-report-dir`, and smoke proof that local review reaches `PASS_POST_APPLY_REVIEW_GATE`. |
| Approval packet | `docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` | Added the current production runner capture behavior and expected `secondManualApplyReport.remoteApplyReportPath`, `localApplyReportPath`, and `localReview.verdict` evidence. |
| Approval-ready handoff | `docs/plans/recall-sync/RECALL_SECOND_MANUAL_APPROVAL_READY_HANDOFF_2026-06-27_06-15-41_IST.md` | Replaced the generic manual validation instruction with concrete checks against `secondManualApplyReport.localReview.verdict` and the local private report path. |
| Project tracker | `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Added this milestone and kept the active gate unchanged. |
| Public-doc privacy corpus | `scripts/check-recall-public-docs-privacy.mjs` | Added this report to the curated Recall public-doc scan. |

## Verification

Passed:

- `node --check scripts/check-recall-scheduler-artifacts.mjs`
- `npm run -s check:recall-scheduler`
- `npm run -s check:recall-public-docs-privacy`
- `npm run -s check:recall-approval-packet`
- `npm run -s smoke:recall-second-manual-production-apply`
- `npm run -s recall:second-manual:readiness`
- `npm run -s recall:second-manual:production-command -- --json`
- `npm run -s recall:daily-sync:completion-status`
- `git diff --check -- scripts/check-recall-scheduler-artifacts.mjs docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md docs/plans/recall-sync/RECALL_SECOND_MANUAL_APPROVAL_READY_HANDOFF_2026-06-27_06-15-41_IST.md`

Expected blocked probe:

- `npm run -s recall:second-manual:production-apply` without exact approval exited 1 with `liveWriteAttempted: false`, `localGates.skippedByDefault: true`, `localGates.readinessStatus: skipped`, `localGates.liveSpikeGateVerdict: skipped`, remote preflight ready, and the sole blocking finding `approval_required`.

## Current Gate

The live write is no longer blocked by local private gates first. The current production runner reaches the ready remote preflight and then stops only because exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is absent.

The required approval remains:

```text
I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.
```

Scheduler enablement remains separately blocked until two distinct clean manual runs exist and the separate scheduler evidence gate passes.

## Safety Notes

- No Recall import was run.
- No AI Brain row was written.
- No production apply was run.
- No scheduler timer was enabled or started.
- No checkpoint was moved.
- The stale first-capped-apply approval remains spent and does not authorize the second-manual verification write.
