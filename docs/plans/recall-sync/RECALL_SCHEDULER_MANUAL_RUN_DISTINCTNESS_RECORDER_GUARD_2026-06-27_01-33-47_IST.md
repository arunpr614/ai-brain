# Recall Scheduler Manual Run Distinctness Recorder Guard

Date: 2026-06-27 01:33 IST
Status: Done for no-live/no-write scheduler-evidence hardening
Scope: Recall -> AI Brain daily sync scheduler enablement evidence recorder

## Summary

The scheduler enablement path already required two clean manual apply reports before scheduler approval can be accepted. The strict completion evidence checker rejected duplicate manual clean-run apply report paths, but the scheduler evidence recorder could still accept duplicate `--manual-clean-run` arguments long enough to write an invalid private evidence file and then rely on the downstream checker to fail it.

This report records a small guardrail improvement: the recorder now rejects duplicate manual clean-run apply report inputs before any scheduler evidence file is written.

## Root Cause

The validation was split across two layers:

| Layer | Previous behavior |
| --- | --- |
| `scripts/record-recall-scheduler-enable-evidence.mjs` | Required at least two `--manual-clean-run` entries, then validated reports and wrote evidence. |
| `scripts/check-recall-completion-evidence.mjs` | Rejected duplicate `manualCleanRuns[].applyReportPath` values after evidence existed. |

That meant the final gate was safe, but the recorder's local failure mode was messier than needed. A duplicate input should fail before evidence creation, because scheduler enablement depends on two distinct clean manual runs, not two references to the same reviewed report.

## Implementation

Updated `scripts/record-recall-scheduler-enable-evidence.mjs`:

- added a pre-write `validateDistinctManualCleanRunArgs(...)` guard;
- normalizes each manual clean-run report path for duplicate detection;
- fails with `duplicate_manual_clean_run_apply_report` when the same apply report is supplied twice;
- keeps the existing downstream strict evidence checker as defense in depth.

Updated `scripts/smoke-recall-scheduler-enable-evidence-record.mjs`:

- adds a duplicate manual-run input fixture;
- verifies the recorder exits before writing scheduler evidence;
- verifies the failure code is explicit;
- keeps the existing successful fixture coverage.

## Verification

Passed:

| Command | Result |
| --- | --- |
| `node --check scripts/record-recall-scheduler-enable-evidence.mjs` | Passed |
| `node --check scripts/smoke-recall-scheduler-enable-evidence-record.mjs` | Passed |
| `npm run -s smoke:recall-scheduler-enable-evidence-record` | Passed; duplicate manual clean-run reports fail before evidence write |
| `npm run -s smoke:recall-completion-evidence` | Passed; strict checker still rejects duplicate manual clean-run reports |
| `npm run -s check:recall-scheduler` | Passed |
| `npm run -s smoke:recall-second-manual-readiness` | Passed |
| `npm run -s recall:second-manual:readiness` | Passed; still ready for approval only |
| `npm run -s recall:daily-sync:completion-status` | Passed; still blocked at `second_manual_verification_run` |

## Current Gate

The real production gate is unchanged:

- `currentBlockingGate`: `second_manual_verification_run`
- `owner`: Arun
- one clean manual run is currently counted;
- scheduler approval is still disallowed by manual-run evidence;
- scheduler and checkpoint remain blocked.

No Recall API call, import, database write, production deploy, scheduler enablement, or checkpoint movement happened as part of this guardrail work.

## Next Step

Run `npm run -s recall:second-manual:readiness` before any live write. Only after exact Arun approval from `docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` should the second manual verification apply be run.
