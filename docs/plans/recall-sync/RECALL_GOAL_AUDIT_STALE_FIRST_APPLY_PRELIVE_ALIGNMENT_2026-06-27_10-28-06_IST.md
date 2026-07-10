# Recall Goal Audit Stale First-Apply Pre-Live Alignment

**Date:** 2026-06-27 10:28 IST
**Scope:** Recall daily sync / goal-completion audit and broad pre-live readiness
**Mode:** No-live/no-write checker hardening
**Result:** Passed. The top-level goal-completion audit now validates the same stale first-apply approval proof that broad pre-live exposes.

## Why This Exists

The local-gate failure mode is fixed in the second-manual production path, and the stale first-apply approval case is now automated in `check:recall-second-manual-local-gate-resolution`. This report records the next hardening step: goal-level audit validation now rejects a pre-live bundle if the stale approval proof is missing, stale, ambiguous, or stops before production remote preflight.

## Changes

| File | Change |
| --- | --- |
| `scripts/check-recall-goal-completion-audit.mjs` | Requires the audit doc and optional pre-live JSON to include stale first-apply approval proof fields. Validates `stale_first_apply_approval`, local-gate bypass, ready remote preflight, no live write, and latest deployed proof-pair freshness. |
| `scripts/smoke-recall-goal-completion-audit.mjs` | Adds good fixture assertions and stale pre-live fixture failures for stale first-apply approval proof regressions. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_GOAL_COMPLETION_AUDIT_2026-06-27_08-25-25_IST.md` | Documents that broad pre-live now carries stale first-apply approval proof in `nextGate.localGateResolution`. |
| `scripts/check-recall-scheduler-artifacts.mjs` | Adds static guards so goal-audit stale approval validation and smoke coverage cannot silently disappear. |

## Fresh Broad Pre-Live Evidence

Captured a fresh broad pre-live JSON at `/tmp/recall-prelive-goal-audit-stale-first-apply.json` and validated it with the goal audit.

Summary:

| Field | Value |
| --- | --- |
| `ok` | `true` |
| `nextGate.status` | `offline_readiness_passed` |
| `nextGate.currentProductionGate.currentBlockingGate` | `second_manual_verification_run` |
| `nextGate.localGateResolution.staleFirstApplyApprovalProgress.stoppedAt` | `approval_gate` |
| `nextGate.localGateResolution.staleFirstApplyApprovalProgress.blockingFindingIds` | `stale_first_apply_approval` |
| `nextGate.localGateResolution.staleFirstApplyApprovalProgress.localPrivateGatesSkippedForProductionPath` | `true` |
| `nextGate.localGateResolution.staleFirstApplyApprovalProgress.remotePreflightStatus` | `ready_for_second_manual_remote_runtime_preflight` |
| `nextGate.localGateResolution.staleFirstApplyApprovalProgress.deployedLatestReports.selectedMatchesRemoteLatest` | `true` |

Goal audit with fresh pre-live:

| Field | Value |
| --- | --- |
| `status` | `goal_completion_audit_current_incomplete_state_verified` |
| `currentBlockingGate` | `second_manual_verification_run` |
| `activeBlockedRequirement` | `second_manual_verification` |
| `checked.preliveReadiness.localGateResolution.staleFirstApplyStoppedAt` | `approval_gate` |
| `checked.preliveReadiness.localGateResolution.staleFirstApplyBlockingFindingIds` | `stale_first_apply_approval` |
| `checked.preliveReadiness.localGateResolution.staleFirstApplyLocalPrivateGatesSkipped` | `true` |
| `checked.preliveReadiness.localGateResolution.staleFirstApplyRemotePreflightStatus` | `ready_for_second_manual_remote_runtime_preflight` |
| `checked.preliveReadiness.localGateResolution.staleFirstApplySelectedMatchesRemoteLatest` | `true` |

## Verification

Passed:

```bash
node --check scripts/check-recall-goal-completion-audit.mjs
node --check scripts/smoke-recall-goal-completion-audit.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
npm run -s smoke:recall-goal-completion-audit
npm run -s check:recall-goal-completion-audit
npm run -s check:recall-scheduler
npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
node -- scripts/check-recall-goal-completion-audit.mjs --prelive-result /tmp/recall-prelive-goal-audit-stale-first-apply.json
```

## Safety Notes

- No live Recall API write was attempted.
- No AI Brain import was attempted.
- No scheduler timer was enabled.
- No checkpoint was advanced.
- No deploy or service restart occurred.

## Current Gate

The current live-write gate remains exact second-manual approval in `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`. First capped apply approval remains spent and is now checked as stale by the local-gate checker, broad pre-live, and goal-level audit.
