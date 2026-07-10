# Recall Stale First-Apply Approval Second-Manual Gate Recheck

**Date:** 2026-06-27 10:09 IST
**Scope:** Recall daily sync / second manual production verification gate
**Mode:** No-live/no-write regression proof
**Result:** Passed. The production apply runner no longer stops on broad local private gates first; it reaches production remote preflight and then stops at the second-manual approval gate.

## Why This Exists

The active goal originally called out this failure mode:

> "the live call still did not run because the local private gates stopped first"

That old failure mode is now fixed in the current runner path. This recheck captures the exact state after a first-capped-apply approval was supplied again: that approval is stale for the current phase, and the runner correctly refuses at `approval_gate` after production remote preflight passes.

## Current Gate Summary

`npm run -s recall:daily-sync:completion-status` still reports:

| Field | Value |
| --- | --- |
| `status` | `blocked_second_manual_verification_run` |
| `currentBlockingGate` | `second_manual_verification_run` |
| `activeBlockedRequirement` | `second_manual_verification` |
| `noLiveNoWrite` | `true` |
| clean manual runs | `1` |
| scheduler enablement | missing evidence, still blocked |

The completed historical steps remain:

- first capped apply passed post-apply review;
- production deploy evidence was accepted;
- scheduler artifacts are packaged but timer remains disabled/inactive.

## Direct Stale-Approval Probe

Command shape:

```bash
env -u BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL \
  BRAIN_RECALL_FIRST_APPLY_APPROVAL='<first capped apply approval text>' \
  npm run -s recall:second-manual:production-apply
```

Expected exit: `1`
Actual exit: `1`
Expected result: blocked before live write because the approval is stale for the active gate.
Actual result: blocked before live write with `stale_first_apply_approval`.

Key output:

| Field | Value |
| --- | --- |
| `status` | `blocked_second_manual_production_apply` |
| `noLiveNoWrite` | `true` |
| `liveWriteAttempted` | `false` |
| `approvalStatus.requiredEnv` | `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` |
| `approvalStatus.requiredApprovalKind` | `second_manual_verification` |
| `approvalStatus.currentGate` | `second_manual_verification_run` |
| `approvalStatus.firstApplyApprovalPresent` | `true` |
| `approvalStatus.manualVerificationApprovalExact` | `false` |
| `localGates.skippedByDefault` | `true` |
| `localGates.commandEnvSource` | `remote_deployed_latest_spike_pair` |
| `localGates.readinessStatus` | `skipped` |
| `localGates.liveSpikeGateVerdict` | `skipped` |
| `preApplyProgress.stoppedAt` | `approval_gate` |
| `preApplyProgress.blockingFindingIds` | `stale_first_apply_approval` |
| `preApplyProgress.localPrivateGatesSkippedForProductionPath` | `true` |
| `preApplyProgress.localGateStatus` | `not_blocking_production_path` |
| `preApplyProgress.remotePreflightAttempted` | `true` |
| `preApplyProgress.remotePreflightPassed` | `true` |
| `preApplyProgress.remotePreflightStatus` | `ready_for_second_manual_remote_runtime_preflight` |
| `preApplyProgress.liveCallNotAttemptedBecause` | `exact second-manual approval is missing after production remote preflight passed` |

The selected deployed proof pair was:

| Proof | Path |
| --- | --- |
| SPIKE-013 | `docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-26_21-58-57_IST.md` |
| SPIKE-014 | `docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-26_21-58-57_IST.md` |

The remote preflight also reported:

| Field | Value |
| --- | --- |
| `deployedLatestReports.selectedMatchesRemoteLatest` | `true` |
| `deployedLatestReports.selectedBy` | `remote_latest_deployed_pair` |
| `remoteBuildCommandEnv.status` | `remote_command_env_built_from_deployed_latest_spike_pair` |
| `timer.enabled` | `false` |
| `timer.active` | `false` |
| `runtimePreflightStatus` | `ready_for_second_manual_runtime_preflight` |
| `liveApplyDelegationAllowed` | `true` |

## Regression Commands

Passed:

```bash
npm run -s smoke:recall-second-manual-production-apply
npm run -s check:recall-second-manual-local-gate-resolution
npm run -s recall:daily-sync:completion-status
```

The local-gate resolution checker reported:

| Field | Value |
| --- | --- |
| `mode` | `second_manual_local_gate_resolution_check` |
| `noLiveNoWrite` | `true` |
| `liveWriteAttempted` | `false` |
| `currentGate` | `second_manual_verification_run` |
| `checked.handoffProgress.stoppedAt` | `ready_for_exact_approval` |
| `checked.handoffProgress.localGateStatus` | `not_blocking_production_path` |
| `checked.handoffProgress.remotePreflightPassed` | `true` |
| `checked.preApplyProgress.stoppedAt` | `approval_gate` |
| `checked.preApplyProgress.localGateStatus` | `not_blocking_production_path` |
| `checked.preApplyProgress.remotePreflightPassed` | `true` |
| `checked.preApplyProgress.remotePreflightStatus` | `ready_for_second_manual_remote_runtime_preflight` |
| `checked.preApplyProgress.deployedLatestReports.selectedMatchesRemoteLatest` | `true` |
| `checked.staleWordingScan.findingCount` | `0` |

## Interpretation

The original issue is fixed for the current production path. The live call did not run in this recheck for the correct reason:

1. Broad local private readiness/proof gates are skipped by default for the production second-manual path.
2. Production remote runtime preflight passes.
3. The runner validates the approval after remote preflight.
4. The supplied first-apply approval is classified as stale for the active `second_manual_verification_run`.
5. No live write is attempted.

The remaining blocker is not local private gates. It is exact approval for the second manual verification run in `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`.

## Safety Notes

- No live Recall API write was attempted.
- No AI Brain import was attempted.
- No scheduler timer was enabled.
- No checkpoint was advanced.
- No deploy or service restart occurred.

## Next Required Live Step

Before any live write, rerun:

```bash
npm run -s recall:current-gate
npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run -s recall:second-manual:production-command -- --json
```

Then run `npm run recall:second-manual:production-apply` only after exact second-manual approval is present in `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`.
