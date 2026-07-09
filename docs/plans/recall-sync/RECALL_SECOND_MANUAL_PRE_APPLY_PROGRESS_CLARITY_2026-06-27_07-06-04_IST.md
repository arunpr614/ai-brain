# Recall Second Manual Pre-Apply Progress Clarity

**Created:** 2026-06-27 07:06 IST
**Owner:** Codex
**Scope:** No-live/no-write production runner clarity for the second manual Recall -> AI Brain verification run.

## Summary

This change fixes the remaining ambiguity behind the recurring blocker phrase:

> the live call still did not run because the local private gates stopped first

The current second-manual production runner no longer stops at broad local private readiness or local live-spike gates by default. It builds the command environment from the latest deployed production SPIKE proof pair, reaches the production remote runtime preflight, and then stops at the exact second-manual approval gate when that approval is missing.

To make that state machine-readable, `scripts/run-recall-second-manual-production-apply.mjs` now emits a `preApplyProgress` block.

## What Changed

| Area | Change |
| --- | --- |
| Production apply runner | Adds `preApplyProgress` to the JSON output. |
| Stop classification | Reports `stoppedAt`, `blockingFindingIds`, and `liveCallNotAttemptedBecause`. |
| Local gate clarity | Reports `localPrivateGatesSkippedForProductionPath: true` and `localGateStatus: not_blocking_production_path` for the default production path. |
| Remote preflight clarity | Reports `remotePreflightAttempted`, `remotePreflightPassed`, and `remotePreflightStatus`. |
| Approval clarity | Reports `approvalCheckedAfterRemotePreflight` and explains that no live write was attempted because exact second-manual approval is missing after production preflight passed. |
| Smoke coverage | Extends `scripts/smoke-recall-second-manual-production-apply.mjs` to prove the no-approval run reaches remote preflight and stops at approval, not local private gates. |
| Static release guard | Extends `scripts/check-recall-scheduler-artifacts.mjs` to require the progress fields and smoke proof. |

## Real No-Approval Verification

Command:

```bash
npm run -s recall:second-manual:production-apply
```

Expected result: nonzero blocked exit, no live write.

Observed safe output facts:

| Field | Value |
| --- | --- |
| `status` | `blocked_second_manual_production_apply` |
| `noLiveNoWrite` | `true` |
| `liveWriteAttempted` | `false` |
| `preApplyProgress.stoppedAt` | `approval_gate` |
| `preApplyProgress.commandEnvSource` | `remote_deployed_latest_spike_pair` |
| `preApplyProgress.localPrivateGatesSkippedForProductionPath` | `true` |
| `preApplyProgress.localGateStatus` | `not_blocking_production_path` |
| `preApplyProgress.remotePreflightAttempted` | `true` |
| `preApplyProgress.remotePreflightPassed` | `true` |
| `preApplyProgress.remotePreflightStatus` | `ready_for_second_manual_remote_runtime_preflight` |
| `preApplyProgress.approvalPresent` | `false` |
| `preApplyProgress.liveCallNotAttemptedBecause` | `exact second-manual approval is missing after production remote preflight passed` |

This proves the current live-write blocker is the exact approval gate, not a local private gate.

## Validation

| Command | Result |
| --- | --- |
| `node --check scripts/run-recall-second-manual-production-apply.mjs scripts/smoke-recall-second-manual-production-apply.mjs scripts/check-recall-scheduler-artifacts.mjs` | Passed |
| `npm run -s smoke:recall-second-manual-production-apply` | Passed |
| `npm run -s check:recall-scheduler` | Passed |
| `npm run -s recall:second-manual:production-apply` without approval | Blocked as intended after production remote preflight; no live write attempted |

## Safety Notes

- No Recall import was run.
- No AI Brain database write was performed.
- No scheduler was enabled.
- No checkpoint was advanced.
- No API key or private Recall content is included in this report.

## Current Gate

The next live write still requires exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` for the second manual verification run. The first capped apply approval is already spent and does not authorize this distinct run.
