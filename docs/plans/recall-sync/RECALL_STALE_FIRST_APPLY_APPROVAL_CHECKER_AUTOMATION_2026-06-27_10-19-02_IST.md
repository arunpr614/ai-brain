# Recall Stale First-Apply Approval Checker Automation

**Date:** 2026-06-27 10:19 IST
**Scope:** Recall daily sync / second manual local-gate resolution checker
**Mode:** No-live/no-write checker hardening
**Result:** Passed. The stale first-apply approval regression is now an automated local-gate resolution check, not only a one-off terminal probe.

## Why This Exists

The project previously hit a production-readiness failure where the live call did not run because local private gates stopped first. The current production path already bypasses those broad local gates by default and reaches production remote preflight. This change makes the exact stale-approval case durable in automation:

- run the normal no-approval production apply probe with exact approval env cleared;
- run a second stale-first-apply approval probe with exact second-manual approval env cleared and historical first-apply approval set;
- require both probes to reach the approval boundary after remote preflight;
- fail if either probe regresses to local private gates, local command-builder gates, stale proof-pair selection, or a live write attempt.

## Code Changes

| File | Change |
| --- | --- |
| `scripts/check-recall-second-manual-local-gate-resolution.mjs` | Adds `FIRST_APPLY_APPROVAL`, `noApprovalEnv()`, `staleFirstApplyApprovalEnv()`, forced approval-env clearing for no-live probes, `validateStaleFirstApplyApprovalApply()`, and `checked.staleFirstApplyApprovalProgress`. |
| `scripts/smoke-recall-second-manual-local-gate-resolution.mjs` | Adds fixture coverage for good stale first-apply approval behavior and a regression where stale approval stops before remote preflight. |
| `scripts/check-recall-prelive-readiness.mjs` | Preserves `staleFirstApplyApprovalProgress` and `localPrivateGatesSkippedForProductionPath` in `nextGate.localGateResolution`. |
| `scripts/check-recall-scheduler-artifacts.mjs` | Adds static guards for stale-first-apply automation, approval-env clearing, broad pre-live summary visibility, and smoke coverage. |

## Real Checker Evidence

`npm run -s check:recall-second-manual-local-gate-resolution` passed with:

| Field | Value |
| --- | --- |
| `mode` | `second_manual_local_gate_resolution_check` |
| `noLiveNoWrite` | `true` |
| `liveWriteAttempted` | `false` |
| `currentGate` | `second_manual_verification_run` |
| `checked.preApplyProgress.stoppedAt` | `approval_gate` |
| `checked.preApplyProgress.blockingFindingIds` | `approval_required` |
| `checked.preApplyProgress.localPrivateGatesSkippedForProductionPath` | `true` |
| `checked.preApplyProgress.localGateStatus` | `not_blocking_production_path` |
| `checked.preApplyProgress.remotePreflightStatus` | `ready_for_second_manual_remote_runtime_preflight` |
| `checked.staleFirstApplyApprovalProgress.stoppedAt` | `approval_gate` |
| `checked.staleFirstApplyApprovalProgress.blockingFindingIds` | `stale_first_apply_approval` |
| `checked.staleFirstApplyApprovalProgress.localPrivateGatesSkippedForProductionPath` | `true` |
| `checked.staleFirstApplyApprovalProgress.localGateStatus` | `not_blocking_production_path` |
| `checked.staleFirstApplyApprovalProgress.remotePreflightStatus` | `ready_for_second_manual_remote_runtime_preflight` |
| `checked.staleFirstApplyApprovalProgress.deployedLatestReports.selectedMatchesRemoteLatest` | `true` |
| `checked.staleWordingScan.findingCount` | `0` |

Selected proof pair remained:

| Proof | Path |
| --- | --- |
| SPIKE-013 | `docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-26_21-58-57_IST.md` |
| SPIKE-014 | `docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-26_21-58-57_IST.md` |

## Verification

Passed:

```bash
node --check scripts/check-recall-second-manual-local-gate-resolution.mjs
node --check scripts/smoke-recall-second-manual-local-gate-resolution.mjs
node --check scripts/check-recall-prelive-readiness.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
npm run -s smoke:recall-second-manual-local-gate-resolution
npm run -s check:recall-second-manual-local-gate-resolution
npm run -s check:recall-scheduler
```

## Safety Notes

- No live Recall API write was attempted.
- No AI Brain import was attempted.
- No scheduler timer was enabled.
- No checkpoint was advanced.
- No deploy or service restart occurred.
- The exact second-manual approval env is explicitly cleared for no-live checker probes.

## Current Gate

The current live-write gate remains exact second-manual approval in `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`. First capped apply approval is intentionally classified as stale for the active `second_manual_verification_run` gate.
