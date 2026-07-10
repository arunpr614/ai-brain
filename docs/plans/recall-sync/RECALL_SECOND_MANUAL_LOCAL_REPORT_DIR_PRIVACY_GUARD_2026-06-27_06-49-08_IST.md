# Recall Second Manual Local Report Directory Privacy Guard

Created: 2026-06-27 06:49 IST
Owner: Codex
Status: Completed; no live write performed
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Prevent the future approved second-manual production runner from copying a private remote `scheduled-apply-*.json` report into a public or non-private local directory.

This report contains no Recall API key, bearer token, private Recall card ID, title, source URL, raw chunk, raw response body, apply payload, or database row.

## Root Cause

The second-manual production runner already copied the successful remote apply report into a local private evidence directory and then ran `scripts/check-recall-apply-report.mjs --require-private-path`.

That was necessary but slightly too late for an unsafe `--local-report-dir` override: a bad override would be rejected by local review only after the approved remote apply had already run and the report copy had been attempted. The safer behavior is to reject unsafe local report directories before command building, remote preflight, or remote apply.

## Changes

| Area | File | Change |
| --- | --- | --- |
| Production runner | `scripts/run-recall-second-manual-production-apply.mjs` | Added `PRIVATE_RECALL_EVIDENCE_ROOT`, `isUnderPrivateRecallEvidenceRoot`, and an early `local_apply_report_dir_not_private` finding when `--local-report-dir` is outside `data/private/recall-live-spikes`. The runner reports `localReportDir.underPrivateRecallEvidencePath` in JSON output. |
| Smoke coverage | `scripts/smoke-recall-second-manual-production-apply.mjs` | Added an approved fixture case with a public `--local-report-dir`; it must fail before remote apply with `liveWriteAttempted: false` and no remote apply marker. |
| Static release guard | `scripts/check-recall-scheduler-artifacts.mjs` | Now asserts the private evidence root, private-path helper, unsafe-dir finding, and smoke coverage are present. |
| Project tracker | `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Added this privacy-guard milestone. |
| Public-doc privacy corpus | `scripts/check-recall-public-docs-privacy.mjs` | Added this report to the curated Recall public-doc scan. |

## Verification

Passed:

- `node --check scripts/run-recall-second-manual-production-apply.mjs scripts/smoke-recall-second-manual-production-apply.mjs`
- `npm run -s smoke:recall-second-manual-production-apply`
- `node --check scripts/check-recall-scheduler-artifacts.mjs`
- `npm run -s check:recall-scheduler`
- `npm run -s recall:second-manual:production-command -- --json`

Expected blocked probe:

- `npm run -s recall:second-manual:production-apply` without exact approval exited 1 with `localReportDir.underPrivateRecallEvidencePath: true`, remote preflight ready, local gates skipped, `liveWriteAttempted: false`, and the sole blocking finding `approval_required`.

## Current Gate

This hardening does not approve or run the second-manual live write.

The current gate remains exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`:

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
- The stale first capped apply approval remains spent and does not authorize the second-manual verification write.
