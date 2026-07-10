# Recall Second Manual Handoff Local Report Directory Short-Circuit

Created: 2026-06-27 06:58 IST
Owner: Codex
Status: Completed; no live write performed
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Make the no-live second-manual production command handoff reject unsafe local apply-report directories before it runs completion status or remote runtime preflight.

This report contains no Recall API key, bearer token, private Recall card ID, title, source URL, raw chunk, raw response body, apply payload, or database row.

## Root Cause

The handoff already refused unsafe `--local-report-dir` values and returned `command: null`, but it still performed no-live completion-status and remote-preflight checks before returning that local input failure. That was safe but noisy and unnecessary. A local argument error should fail locally before any remote inspection.

## Changes

| Area | File | Change |
| --- | --- | --- |
| No-live handoff | `scripts/print-recall-second-manual-production-apply-command.mjs` | Computes `localReportDir` and `localReportDirFindings` before completion status or remote preflight. Unsafe local report-dir input sets `localInputBlocked` and returns skipped summaries for both checks. |
| Smoke coverage | `scripts/smoke-recall-second-manual-production-command.mjs` | Asserts unsafe local report-dir handoff skips completion status and remote preflight with status `blocked_local_report_dir_not_private`. |
| Static release guard | `scripts/check-recall-scheduler-artifacts.mjs` | Requires `localInputBlocked` and smoke proof that unsafe local report-dir overrides short-circuit before remote preflight. |
| Project tracker | `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Added this short-circuit milestone. |
| Public-doc privacy corpus | `scripts/check-recall-public-docs-privacy.mjs` | Added this report to the curated Recall public-doc scan. |

## Verification

Passed:

- `node --check scripts/print-recall-second-manual-production-apply-command.mjs scripts/smoke-recall-second-manual-production-command.mjs scripts/check-recall-scheduler-artifacts.mjs`
- `npm run -s smoke:recall-second-manual-production-command`
- `npm run -s check:recall-scheduler`
- `npm run -s recall:second-manual:production-command -- --json`

Expected no-live failure:

- `npm run -s recall:second-manual:production-command -- --json --local-report-dir docs/plans/recall-sync/unsafe-handoff-report-cache` exited 1 with `local_apply_report_dir_not_private`, `command: null`, `completionStatus.skipped: true`, `completionStatus.status: blocked_local_report_dir_not_private`, `remotePreflight.skipped: true`, and `remotePreflight.status: blocked_local_report_dir_not_private`.

## Current Gate

The normal no-live handoff still reports:

- `localReportDir.path: data/private/recall-live-spikes`
- `localReportDir.underPrivateRecallEvidencePath: true`
- remote preflight ready
- `liveApplyDelegationAllowed: true`

This does not approve or run the live write. The current gate remains exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`:

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
