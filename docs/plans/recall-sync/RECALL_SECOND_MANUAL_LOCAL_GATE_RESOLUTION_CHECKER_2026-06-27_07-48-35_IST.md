# Recall Second Manual Local-Gate Resolution Checker

**Created:** 2026-06-27 07:48 IST
**Owner:** Codex
**Scope:** No-live/no-write verifier proving the second-manual Recall -> AI Brain production path is no longer blocked by local private gates first.

## Summary

Added a dedicated no-live checker:

```bash
npm run -s check:recall-second-manual-local-gate-resolution
```

The checker ties together the current completion status, no-live production handoff, no-approval production apply runner, and a stale wording scan. Its purpose is to make the current blocker unambiguous:

1. The active gate is `second_manual_verification_run`.
2. The production handoff reaches `ready_for_exact_approval`.
3. The no-approval production apply reaches production remote preflight and stops at `approval_gate`.
4. Local private gates are reported as `not_blocking_production_path`.
5. `liveWriteAttempted` remains `false`.

This proves the current live write is blocked by missing exact second-manual approval, not by local private gates stopping first.

## What Changed

| Area | Change |
| --- | --- |
| Package scripts | Added `check:recall-second-manual-local-gate-resolution` and `smoke:recall-second-manual-local-gate-resolution`. |
| No-live checker | Added `scripts/check-recall-second-manual-local-gate-resolution.mjs`. |
| Fixture smoke | Added `scripts/smoke-recall-second-manual-local-gate-resolution.mjs`. |
| Pre-live readiness | Added the checker smoke to `scripts/check-recall-prelive-readiness.mjs`. |
| Static release guard | Extended `scripts/check-recall-scheduler-artifacts.mjs` so future changes must keep this checker and smoke coverage wired. |

## Real No-Live Evidence

Command:

```bash
npm run -s check:recall-second-manual-local-gate-resolution
```

Observed safe output facts:

| Field | Value |
| --- | --- |
| `ok` | `true` |
| `mode` | `second_manual_local_gate_resolution_check` |
| `noLiveNoWrite` | `true` |
| `liveWriteAttempted` | `false` |
| `currentGate` | `second_manual_verification_run` |
| `completionStatus.secondManualPathStatus` | `requires_no_live_production_handoff_then_exact_approval` |
| `completionStatus.localPrivateGatesAreNotThePlannedProductionGate` | `true` |
| `handoffProgress.stoppedAt` | `ready_for_exact_approval` |
| `handoffProgress.readyForExactApproval` | `true` |
| `handoffProgress.localGateStatus` | `not_blocking_production_path` |
| `handoffProgress.remotePreflightPassed` | `true` |
| `handoffProgress.liveWriteAttempted` | `false` |
| `preApplyProgress.stoppedAt` | `approval_gate` |
| `preApplyProgress.blockingFindingIds` | `approval_required` |
| `preApplyProgress.localGateStatus` | `not_blocking_production_path` |
| `preApplyProgress.remotePreflightPassed` | `true` |
| `preApplyProgress.approvalPresent` | `false` |
| `preApplyProgress.liveWriteAttempted` | `false` |
| `staleWordingScan.roots` | `scripts` |
| `staleWordingScan.scannedFiles` | `166` |
| `staleWordingScan.findingCount` | `0` |

## Smoke Coverage

The fixture smoke proves:

| Case | Expected Result |
| --- | --- |
| Ready completion status plus handoff plus no-approval apply | Passes. |
| Local private gates not blocking the production path | Passes. |
| Stale "local private gates stopped first" wording | Fails with `local_private_gates_stopped_first`. |
| Apply output that stops before remote preflight | Fails with `apply_wrong_stop_point`, `apply_local_gate_ambiguous`, and `apply_remote_preflight_not_passed`. |
| Checker output safety | Confirms no-live/no-write and no secret-shaped output. |

## Validation

Passed:

```bash
node --check scripts/check-recall-second-manual-local-gate-resolution.mjs scripts/smoke-recall-second-manual-local-gate-resolution.mjs scripts/check-recall-scheduler-artifacts.mjs scripts/check-recall-prelive-readiness.mjs
npm run -s smoke:recall-second-manual-local-gate-resolution
npm run -s check:recall-scheduler
npm run -s check:recall-second-manual-local-gate-resolution
npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

The manifest-enforced pre-live run passed and includes `second_manual_local_gate_resolution_smoke` as a required passed check.

## Safety Notes

- No live Recall apply was run.
- No Recall import was run.
- No AI Brain database write was performed.
- No scheduler was enabled.
- No checkpoint was advanced.
- No deploy or service restart was performed.
- No API key or private Recall content is included in this report.

## Current Gate

The current blocker remains exact second-manual approval:

```text
BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL
```

The first capped apply approval is already spent and does not authorize this second manual production verification run. Scheduler enablement remains blocked until two distinct clean manual runs and separate scheduler approval/evidence exist.
