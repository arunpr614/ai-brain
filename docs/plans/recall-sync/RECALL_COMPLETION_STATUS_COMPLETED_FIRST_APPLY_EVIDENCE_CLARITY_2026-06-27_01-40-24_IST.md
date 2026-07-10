# Recall Completion Status Completed First-Apply Evidence Clarity

Date: 2026-06-27 01:40 IST
Status: Done for no-live/no-write operator status clarity
Scope: Recall -> AI Brain daily sync completion status

## Summary

`recall:daily-sync:completion-status` correctly kept the active production gate at `second_manual_verification_run`, but the completed `first_apply_key_and_proof_readiness` requirement still embedded stale pre-apply readiness failures inside its evidence payload after the first capped apply had already passed.

This created a misleading operator-facing shape:

- the requirement was marked `done`;
- the active top-level gate was correctly `second_manual_verification_run`;
- but the nested evidence still showed `blocked_first_apply_readiness`, `live_gate_status`, `dry_run_report_proof`, and `backup_proof`.

The status output now summarizes completed first-apply readiness using the durable passing first-apply report instead of stale pre-apply gate details.

## Root Cause

Completion status had two different jobs:

1. report current pre-apply readiness when the first capped apply has not happened yet;
2. report historical completion evidence after the first capped apply has already passed.

The earlier implementation used the current first-apply status helper evidence for both jobs. After an approved first apply, private dry-run and backup proof freshness can naturally become stale, so the current first-apply status helper may show pre-apply blockers that are no longer the active production gate.

## Implementation

Updated `scripts/check-recall-daily-sync-completion-status.mjs`:

- when `firstApplyDone` is true, `first_apply_key_and_proof_readiness.evidence.status` is now `satisfied_by_completed_first_apply`;
- the evidence includes the completed first-apply report verdict;
- stale pre-apply `failedChecks` and `gateSummary` are omitted in post-apply completion status;
- the requirement label changes from present-tense readiness to historical satisfaction after the completed write.

Updated `scripts/smoke-recall-daily-sync-completion-status.mjs`:

- asserts scheduler-only, stale-historical-apply, scheduler-ready, and complete fixtures summarize first-apply readiness from completed apply evidence;
- asserts stale pre-apply failed checks and gate summaries are not exposed after first apply is complete.

## Verification

Passed:

| Command | Result |
| --- | --- |
| `node --check scripts/check-recall-daily-sync-completion-status.mjs` | Passed |
| `node --check scripts/smoke-recall-daily-sync-completion-status.mjs` | Passed |
| `npm run -s smoke:recall-daily-sync-completion-status` | Passed; includes completed first-apply evidence clarity assertion |
| `npm run -s recall:daily-sync:completion-status` | Passed; active gate remains `second_manual_verification_run` |

The current real completion status now reports:

- `currentBlockingGate`: `second_manual_verification_run`;
- `blockedRequirements`: `scheduler_enablement`;
- one clean manual run counted;
- scheduler approval still disallowed;
- first-apply readiness evidence status: `satisfied_by_completed_first_apply`.

## Safety Notes

This change is no-live and no-write. It did not call Recall, import data, write to AI Brain, deploy production code, enable the scheduler, or advance checkpoints.

The next real gate remains exact Arun approval for the second manual verification run.
