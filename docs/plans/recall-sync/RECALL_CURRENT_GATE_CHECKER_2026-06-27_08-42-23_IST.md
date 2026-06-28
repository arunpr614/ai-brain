# Recall Current Gate Checker

Date: 2026-06-27 08:42:23 IST
Owner: Codex
Status: Completed, no-live/no-write

## Purpose

Add one no-live command that answers the operator question:

> What is the current Recall daily-sync gate right now?

This prevents future confusion between:

- local private gates,
- production remote preflight,
- exact second-manual approval,
- scheduler enablement.

## Changes Made

### Current-Gate Checker

Added `scripts/check-recall-current-gate.mjs`.

The checker runs or reads:

- `scripts/check-recall-goal-completion-audit.mjs`
- `npm run -s recall:second-manual:production-command -- --json`

It validates:

- Goal completion audit still passes.
- The current gate is `second_manual_verification_run`.
- Active blocked requirement is `second_manual_verification`.
- Completion is still false.
- Manual clean-run count is still `1`.
- Second manual run is still needed.
- Production handoff is no-live/no-write.
- Production handoff reaches `ready_for_exact_approval`.
- Local gate status is `not_blocking_production_path`.
- Remote preflight passes.
- Remote preflight status is `ready_for_second_manual_remote_runtime_preflight`.
- Timer is disabled and inactive.
- Remote enable flags are disabled.
- Live apply delegation is ready after exact approval.
- No live write was attempted.
- Stale first capped apply approval is not present in the current environment.
- Second-manual approval text is not present outside `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`.
- Exact approval is not already present in the environment.

### Smoke Coverage

Added `scripts/smoke-recall-current-gate.mjs`.

The smoke proves:

- Ready current-gate fixture passes.
- Stale goal audit fixture fails.
- Local private-gate regression fails.
- Remote preflight blocked fixture fails.
- Stale first-apply approval fixture fails.
- Second-manual approval in the wrong environment fixture fails.
- Approval already present fixture fails.
- Normal checker output does not print secret-shaped values.

### Package Scripts

Added:

- `npm run recall:current-gate`
- `npm run smoke:recall-current-gate`

### Gate Wiring

Updated `scripts/check-recall-prelive-readiness.mjs` to run:

- `smoke:recall-current-gate`
- `recall:current-gate`

Updated `scripts/check-recall-scheduler-artifacts.mjs` to require:

- package script exposure
- checker ready status
- local-gate not-blocking assertion
- remote preflight assertion
- approval-present rejection
- stale first-apply approval rejection
- wrong-env second-manual approval rejection
- smoke coverage
- pre-live wiring

## Validation

Passed:

- `node --check scripts/check-recall-current-gate.mjs`
- `node --check scripts/smoke-recall-current-gate.mjs`
- `node --check scripts/check-recall-prelive-readiness.mjs`
- `node --check scripts/check-recall-scheduler-artifacts.mjs`
- `npm run -s smoke:recall-current-gate`
- `npm run -s recall:current-gate`
- `npm run -s check:recall-scheduler`
- package JSON parse check

Real `npm run -s recall:current-gate` output confirmed:

- `ok: true`
- `status: ready_for_second_manual_exact_approval`
- `currentBlockingGate: second_manual_verification_run`
- `activeBlockedRequirement: second_manual_verification`
- `exactApprovalPresent: false`
- `localGateStatus: not_blocking_production_path`
- `remotePreflightPassed: true`
- `liveWriteAttempted: false`
- `schedulerAllowedNow: false`
- `checkpointAllowedNow: false`

## 2026-06-27 08:51 IST Hardening Update

After Arun supplied first capped apply approval text while the first capped apply was already complete, the current-gate checker was hardened to classify approval mismatches directly.

The checker now exposes and fails on:

- `firstApplyApprovalPresent: true`
- `secondManualApprovalInWrongEnv: true`
- `stale_first_apply_approval_present`
- `second_manual_approval_wrong_env`

This keeps the operator path explicit: a first capped apply approval is stale for the current `second_manual_verification_run` gate and must not be treated as approval for the next production write.

## Safety Notes

No live Recall call was made.
No AI Brain import was applied.
No production deploy was run.
No scheduler was enabled.
No checkpoint was advanced.
No private Recall key or secret value was printed or copied into this report.

## Current Gate

The current no-live gate is ready for exact second-manual approval.

Before any approved apply, the current-gate output now requires this safe sequence:

1. `npm run recall:current-gate`
2. `npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`
3. `npm run recall:second-manual:production-command`
4. `npm run recall:second-manual:production-apply` only after exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is present

The required pre-live proof includes `localGateResolutionStoppedAt: approval_gate`, `remotePreflightStatus: ready_for_second_manual_remote_runtime_preflight`, `selectedBy: remote_latest_deployed_pair`, and `selectedMatchesRemoteLatest: true`.

Scheduler enablement remains separately blocked until two distinct clean manual runs exist and separate scheduler approval/evidence is recorded.

## 2026-06-27 09:50 IST Safe-Next Alignment

The current-gate checker was aligned with the approval packet's newer pre-live local-gate proof requirement. `npm run recall:current-gate` now surfaces:

- `requiredBeforeApply.manifestPreLiveCommand`
- `requiredBeforeApply.noLiveProductionHandoffCommand`
- `requiredBeforeApply.requiredPreLiveProof.selectedMatchesRemoteLatest: true`
- safe-next commands for manifest-enforced pre-live and the no-live production handoff before the approved apply

`scripts/smoke-recall-current-gate.mjs` now proves that the ready output includes manifest-enforced pre-live, no-live production handoff, and latest deployed proof-pair guidance.
