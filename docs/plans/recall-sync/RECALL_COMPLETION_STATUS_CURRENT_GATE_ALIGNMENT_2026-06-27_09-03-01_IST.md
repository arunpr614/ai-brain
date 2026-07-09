# Recall Completion Status Current-Gate Alignment

Date: 2026-06-27 09:03:01 IST
Owner: Codex
Status: Completed, no-live/no-write

## Purpose

Align the top-level Recall daily-sync completion status with the hardened current-gate checker.

Before this change, `npm run recall:daily-sync:completion-status` pointed operators from the second-manual approval packet to readiness and the production command handoff. The approval packet and current-gate checker now require a stricter first step:

```bash
npm run recall:current-gate
```

This keeps stale first capped apply approval and wrong-env second-manual approval checks visible in the broad operator surface.

## Changes Made

### Completion Status Helper

Updated `scripts/check-recall-daily-sync-completion-status.mjs` so the second-manual path now includes:

- `SECOND_MANUAL_VERIFICATION_CURRENT_GATE_COMMAND`
- `safeNextCommands[]` entry: `npm run recall:current-gate`
- `nextAction` text that requires:
  - `status=ready_for_second_manual_exact_approval`
  - `firstApplyApprovalPresent=false`
  - `secondManualApprovalInWrongEnv=false`
  - `localGateStatus=not_blocking_production_path`
  - `remotePreflightPassed=true`
  - `liveWriteAttempted=false`
- `secondManualVerificationPath.currentGateCommand`
- `secondManualVerificationPath.readyCurrentGateMustShow`

### Smoke Coverage

Updated `scripts/smoke-recall-daily-sync-completion-status.mjs` to prove:

- scheduler-only state points to `npm run recall:current-gate`
- next action requires current-gate status and approval-mismatch fields
- `secondManualVerificationPath` exposes `currentGateCommand`
- `secondManualVerificationPath.readyCurrentGateMustShow` contains the required current-gate proof fields
- stale historical first-apply proof still points to current-gate before readiness or production handoff

### Static Release Guard

Updated `scripts/check-recall-scheduler-artifacts.mjs` to require:

- the current-gate command constant in completion status
- `npm run recall:current-gate` in completion status safe-next guidance
- `readyCurrentGateMustShow`
- `firstApplyApprovalPresent=false`
- `secondManualApprovalInWrongEnv=false`
- smoke strings for current-gate ordering and approval-mismatch guidance

### Pre-Live Projection

Updated `scripts/check-recall-prelive-readiness.mjs` so the sanitized `currentProductionGate.secondManualVerificationPath` keeps:

- `currentGateCommand`
- `readyCurrentGateMustShow`
- `firstApplyApprovalPresent`
- `secondManualApprovalInWrongEnv`

This prevents the broad pre-live output from losing the same current-gate proof fields that completion status now emits.

## Current Real Gate

The live write is no longer blocked by local private gates first.

Current gate remains:

- `second_manual_verification_run`
- exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` required
- no second manual production apply run yet
- scheduler enablement still blocked until two distinct clean manual runs and separate scheduler approval/evidence exist

## Validation

Expected validation for this change:

- `node --check scripts/check-recall-daily-sync-completion-status.mjs`
- `node --check scripts/smoke-recall-daily-sync-completion-status.mjs`
- `node --check scripts/check-recall-prelive-readiness.mjs`
- `node --check scripts/check-recall-scheduler-artifacts.mjs`
- `npm run -s smoke:recall-daily-sync-completion-status`
- `npm run -s recall:daily-sync:completion-status`
- `npm run -s check:recall-scheduler`
- `npm run -s check:recall-public-docs-privacy`
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`

## Safety Notes

No live Recall call was made.
No AI Brain import was applied.
No production deploy was run.
No scheduler was enabled.
No checkpoint was advanced.
No private Recall key, Recall title, source URL, card ID, chunk, or payload content is included in this report.

## 2026-06-27 09:55 IST Required-Before-Apply Update

`npm run recall:daily-sync:completion-status` now mirrors the current-gate `requiredBeforeApply` contract in `secondManualVerificationPath`.

Added fields:

- `secondManualVerificationPath.manifestPreLiveCommand`
- `secondManualVerificationPath.requiredBeforeApply.currentGateCommand`
- `secondManualVerificationPath.requiredBeforeApply.manifestPreLiveCommand`
- `secondManualVerificationPath.requiredBeforeApply.noLiveProductionHandoffCommand`
- `secondManualVerificationPath.requiredBeforeApply.applyCommandAfterExactApproval`
- `secondManualVerificationPath.requiredBeforeApply.approvalEnv`
- `secondManualVerificationPath.requiredBeforeApply.requiredPreLiveProof.selectedMatchesRemoteLatest`

The safe-next sequence now includes manifest-enforced pre-live before second-manual readiness and the no-live production handoff.
