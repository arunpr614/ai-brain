# Recall Second Manual Readiness Safe-Next Command Alignment

Date: 2026-06-27 08:16:02 IST
Owner: Codex
Status: Completed, no-live/no-write

## Purpose

Align the second manual verification readiness output with the current production execution path.

The readiness helper already reported the correct active blocked requirement:

- `status: ready_for_second_manual_verification_approval`
- `currentBlockingGate: second_manual_verification_run`
- `activeBlockedRequirement: second_manual_verification`
- `blockedRequirements: scheduler_enablement`
- `liveWriteAllowedNow: false`
- `schedulerAllowedNow: false`
- `checkpointAllowedNow: false`

However, its `safeNextCommands` still referenced the older `npm run recall:manual-verification-apply` alias. That was operator-facing drift because the current safe production sequence is:

1. Run the no-live production handoff: `npm run recall:second-manual:production-command`
2. After exact approval only, run the guarded production apply: `npm run recall:second-manual:production-apply`

## Root Cause

The second-manual production command and production apply runner were added after the original manual verification wrapper. Completion-status guidance had already been aligned to the newer sequence, but the dedicated readiness helper kept the older safe-next sentence.

This did not create a live-write path by itself because the helper is no-live/no-write and the production apply runner still requires exact approval. The risk was operator confusion at the final approval boundary.

## Changes Made

### Readiness Helper

Updated `scripts/check-recall-second-manual-verification-readiness.mjs`:

- Added explicit constants for the current production handoff and guarded apply commands.
- Replaced the stale `npm run recall:manual-verification-apply` safe-next guidance.
- Updated `nextAction` to tell operators to run the no-live handoff first and wait for exact approval before the guarded production apply.

Current `safeNextCommands`:

- `Review docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md`
- `npm run recall:second-manual:readiness`
- `No-live production handoff before approval: npm run recall:second-manual:production-command`
- `Only after exact approval: npm run recall:second-manual:production-apply`

### Smoke Coverage

Updated `scripts/smoke-recall-second-manual-verification-readiness.mjs`:

- Proves the ready fixture includes `npm run recall:second-manual:production-command`.
- Proves the ready fixture includes `npm run recall:second-manual:production-apply`.
- Proves the ready fixture omits the older `npm run recall:manual-verification-apply` alias.
- Proves `nextAction` names the current handoff and guarded apply path.

### Static Release Guard

Updated `scripts/check-recall-scheduler-artifacts.mjs`:

- Requires the readiness helper to include the current no-live production handoff command.
- Requires the readiness helper to include the guarded production apply command.
- Requires the smoke to prove current safe-next commands and reject stale alias guidance.

## Validation

Passed:

- `node --check scripts/check-recall-second-manual-verification-readiness.mjs`
- `node --check scripts/smoke-recall-second-manual-verification-readiness.mjs`
- `node --check scripts/check-recall-scheduler-artifacts.mjs`
- `npm run -s smoke:recall-second-manual-readiness`
- `npm run -s recall:second-manual:readiness`
- `npm run -s check:recall-scheduler`

Real readiness output confirmed:

- `ok: true`
- `status: ready_for_second_manual_verification_approval`
- `noLiveNoWrite: true`
- `approvalRequired: true`
- `currentBlockingGate: second_manual_verification_run`
- `activeBlockedRequirement: second_manual_verification`
- `safeNextCommands` now use the current no-live handoff and guarded production apply commands.

## Safety Notes

No live Recall call was made.
No import was applied.
No production deploy was run.
No scheduler was enabled.
No checkpoint was advanced.
No private key or secret value was printed or copied into this report.

## Current Gate

The active gate remains exact second-manual verification approval.

The previously provided first capped apply approval does not authorize this second manual verification production apply. The second manual production apply must not run until the exact second-manual approval text is provided.
