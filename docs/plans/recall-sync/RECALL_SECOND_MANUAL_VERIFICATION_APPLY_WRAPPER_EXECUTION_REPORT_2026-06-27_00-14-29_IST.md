# Recall Second Manual Verification Apply Wrapper Execution Report - 2026-06-27 00:14 IST

## Purpose

Add a guarded wrapper for the second distinct manual production verification run required before scheduler enablement.

The wrapper prepares the next approved write path but does not itself run without exact approval.

## Files Added Or Updated

Added:

- `scripts/recall-second-manual-verification-apply.sh`
- `scripts/smoke-recall-manual-verification-apply.mjs`
- `docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md`

Updated:

- `scripts/recall-scheduled-apply.sh`
- `scripts/check-recall-prelive-readiness.mjs`
- `scripts/deploy.sh`
- `scripts/check-recall-scheduler-artifacts.mjs`
- `package.json`
- `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md`

## Behavior

`scripts/recall-second-manual-verification-apply.sh`:

- requires exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`
- requires `BRAIN_RECALL_SYNC_ENABLED=1`
- requires `BRAIN_RECALL_CONFIRM_LIVE_API=1` for live mode
- sets `BRAIN_RECALL_MANUAL_VERIFICATION_MODE=1`
- delegates to `scripts/recall-scheduled-apply.sh`
- does not enable or start timers

`scripts/recall-scheduled-apply.sh` now supports manual verification mode. In that mode it refuses to run unless the same exact manual verification approval is present. The existing scheduler mode remains unchanged.

## Release Gate Wiring

The new smoke is wired into:

- `scripts/check-recall-prelive-readiness.mjs`
- `scripts/deploy.sh`
- `scripts/check-recall-scheduler-artifacts.mjs`

Deploy also copies `scripts/recall-second-manual-verification-apply.sh` to the production scripts directory on the next production deploy.

## Verification

Passed:

- `bash -n scripts/recall-second-manual-verification-apply.sh scripts/recall-scheduled-apply.sh scripts/deploy.sh`
- `node --check scripts/smoke-recall-manual-verification-apply.mjs`
- `node --check scripts/check-recall-prelive-readiness.mjs`
- `node --check scripts/check-recall-scheduler-artifacts.mjs`
- `npm run -s smoke:recall-manual-verification-apply`
- `npm run -s smoke:recall-scheduler-wrapper`
- `npm run -s check:recall-scheduler`
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`

Full pre-live passed with the new required step:

- `manual_verification_apply_smoke`

## Current Gate

This work did not enable the scheduler and did not run a second live write. The current real gate remains:

- `scheduler_enablement`
- owner `Arun`
- blocked actions `scheduler`, `checkpoint`

Next required action is explicit approval for the second manual verification run, using the approval packet created with this report.
