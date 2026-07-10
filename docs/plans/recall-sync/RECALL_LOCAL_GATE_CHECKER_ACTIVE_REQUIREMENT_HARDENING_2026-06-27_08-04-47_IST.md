# Recall Local-Gate Checker Active Requirement Hardening

**Created:** 2026-06-27 08:04 IST
**Owner:** Codex
**Scope:** No-live/no-write hardening for the second-manual local-gate resolution checker.

## Summary

The local-gate resolution checker already proved the important production boundary:

1. The no-live handoff reaches `ready_for_exact_approval`.
2. The no-approval production apply reaches remote preflight.
3. The no-approval production apply stops at `approval_gate`.
4. Local private gates report `not_blocking_production_path`.
5. `liveWriteAttempted` remains `false`.

After the completion-status helper gained `activeBlockedRequirement`, this checker needed to enforce that same status contract. This change makes the local-gate proof reject stale broad completion-status wording.

## What Changed

| Area | Change |
| --- | --- |
| Local-gate checker | Requires `status: blocked_second_manual_verification_run`. |
| Active requirement | Requires `activeBlockedRequirement: second_manual_verification`. |
| Completion requirement distinction | Requires `blockedRequirements` to preserve `scheduler_enablement` as the broader final missing requirement. |
| Blocked action evidence | Requires `blockedActions` to include `second_manual_verification`. |
| Fixture smoke | Adds a stale broad completion-status fixture that must fail. |
| Static release guard | Requires the checker and smoke to keep active blocked requirement coverage. |

## Real No-Live Evidence

Command:

```bash
npm run -s check:recall-second-manual-local-gate-resolution
```

Observed safe output facts:

| Field | Value |
| --- | --- |
| `ok` | `true` |
| `noLiveNoWrite` | `true` |
| `liveWriteAttempted` | `false` |
| `currentGate` | `second_manual_verification_run` |
| `checked.completionStatus.status` | `blocked_second_manual_verification_run` |
| `checked.completionStatus.currentBlockingGate` | `second_manual_verification_run` |
| `checked.completionStatus.activeBlockedRequirement` | `second_manual_verification` |
| `checked.completionStatus.blockedRequirements` | `scheduler_enablement` |
| `checked.completionStatus.blockedActions` | `second_manual_verification`, `scheduler`, `checkpoint` |
| `checked.handoffProgress.stoppedAt` | `ready_for_exact_approval` |
| `checked.handoffProgress.localGateStatus` | `not_blocking_production_path` |
| `checked.handoffProgress.remotePreflightPassed` | `true` |
| `checked.preApplyProgress.stoppedAt` | `approval_gate` |
| `checked.preApplyProgress.liveWriteAttempted` | `false` |
| `checked.staleWordingScan.findingCount` | `0` |

## Validation

Passed:

```bash
node --check scripts/check-recall-second-manual-local-gate-resolution.mjs scripts/smoke-recall-second-manual-local-gate-resolution.mjs scripts/check-recall-scheduler-artifacts.mjs
npm run -s smoke:recall-second-manual-local-gate-resolution
npm run -s check:recall-second-manual-local-gate-resolution
npm run -s check:recall-scheduler
```

## Safety Notes

- No live Recall apply was run.
- No Recall import was run.
- No AI Brain database write was performed.
- No scheduler was enabled.
- No checkpoint was advanced.
- No deploy or service restart was performed.
- No API key or private Recall content is included in this report.

## Current Gate

The current live-call blocker remains exact second-manual approval in:

```text
BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL
```

The no-approval path reaches production remote preflight and stops at `approval_gate`; local private gates are not the active blocker.
