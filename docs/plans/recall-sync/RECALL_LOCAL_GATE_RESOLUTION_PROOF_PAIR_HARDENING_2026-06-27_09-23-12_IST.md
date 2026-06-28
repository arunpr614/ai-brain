# Recall Local-Gate Resolution Proof-Pair Hardening

**Date:** 2026-06-27 09:23 IST
**Scope:** Recall daily sync / second manual local-gate resolution checker
**Mode:** No-live/no-write checker hardening
**Result:** Passed. The local-gate resolution checker now requires the no-approval production runner to expose the selected deployed SPIKE proof pair and prove it matches the latest remote pair.

## Why This Exists

The actual no-approval production runner already proved that the current path reaches remote preflight and stops at the exact approval gate. This hardening makes the reusable checker preserve more of that proof so future audits can verify not only the stop point, but also which deployed remote proof pair was selected.

## Code Changes

| File | Change |
| --- | --- |
| `scripts/check-recall-second-manual-local-gate-resolution.mjs` | Requires `remotePreflightStatus: ready_for_second_manual_remote_runtime_preflight`, selected deployed proof paths, `selectedBy: remote_latest_deployed_pair`, passing SPIKE-013/SPIKE-014 proof checks, and `selectedMatchesRemoteLatest: true`. |
| `scripts/smoke-recall-second-manual-local-gate-resolution.mjs` | Adds fixture coverage for selected proof-pair summary, passing remote proof readiness, and failure when the selected proof pair is missing, stale, or not the remote latest pair. |
| `scripts/check-recall-scheduler-artifacts.mjs` | Adds static release guards so the checker and smoke cannot drop the deployed proof-pair requirements silently. |

## Real Checker Evidence

`npm run -s check:recall-second-manual-local-gate-resolution` passed and reported:

| Field | Observed value |
| --- | --- |
| `mode` | `second_manual_local_gate_resolution_check` |
| `noLiveNoWrite` | `true` |
| `liveWriteAttempted` | `false` |
| `currentGate` | `second_manual_verification_run` |
| `checked.preApplyProgress.stoppedAt` | `approval_gate` |
| `checked.preApplyProgress.remotePreflightStatus` | `ready_for_second_manual_remote_runtime_preflight` |
| `checked.preApplyProgress.selectedReports.timestamp` | `2026-06-26_21-58-57_IST` |
| `checked.preApplyProgress.selectedReports.selectedBy` | `remote_latest_deployed_pair` |
| `checked.preApplyProgress.remoteProofReports.enumerationOk` | `true` |
| `checked.preApplyProgress.remoteProofReports.fidelityOk` | `true` |
| `checked.preApplyProgress.deployedLatestReports.selectedMatchesRemoteLatest` | `true` |
| `checked.staleWordingScan.findingCount` | `0` |

## Verification

Passed:

```bash
node --check scripts/check-recall-second-manual-local-gate-resolution.mjs
node --check scripts/smoke-recall-second-manual-local-gate-resolution.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
npm run -s smoke:recall-second-manual-local-gate-resolution
npm run -s check:recall-second-manual-local-gate-resolution
```

## Safety Notes

- No Recall API live write was attempted.
- No AI Brain import was attempted.
- No scheduler timer was enabled.
- No checkpoint was advanced.
- No deploy or service restart occurred.

## Current Gate

The current production write remains blocked until exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is present for the second manual verification run. The first capped apply approval is already spent and does not authorize this gate.
