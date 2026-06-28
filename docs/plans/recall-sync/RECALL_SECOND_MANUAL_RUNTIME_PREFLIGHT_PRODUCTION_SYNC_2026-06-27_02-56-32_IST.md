# Recall Second Manual Runtime Preflight Production Sync - 2026-06-27 02:56 IST

## Summary

The production host `/opt/brain` now has the Recall runtime files needed for the second manual verification wrapper to pass the deploy-safe runtime preflight before the guarded live apply path.

This was a narrow Recall-runtime sync only. It did not run the full app deploy, did not restart the app, did not call Recall, did not import any cards, did not enable the scheduler, and did not advance checkpoints.

## Why This Was Needed

The local fix added `scripts/check-recall-second-manual-runtime-preflight.mjs` and changed `scripts/recall-second-manual-verification-apply.sh` to use it. Before this sync, the production host was missing:

- `scripts/recall-second-manual-verification-apply.sh`
- `scripts/check-recall-second-manual-runtime-preflight.mjs`
- `scripts/check-recall-apply-report.mjs`
- `docs/plans/spikes/` public proof report directory

That meant an approved second manual run on production could still stop on missing local/runtime files before reaching the intended guarded Recall path.

## Files Synced To Production

Synced to `/opt/brain/scripts/`:

- `scripts/check-recall-key-rotation-evidence.mjs`
- `scripts/check-recall-dry-run-report.mjs`
- `scripts/check-recall-apply-report.mjs`
- `scripts/check-recall-live-spike-reports.mjs`
- `scripts/check-recall-public-privacy.mjs`
- `scripts/check-recall-public-manifest-privacy.mjs`
- `scripts/check-recall-second-manual-runtime-preflight.mjs`
- `scripts/recall-first-apply-preflight.mjs`
- `scripts/recall-scheduled-apply.sh`
- `scripts/recall-second-manual-verification-apply.sh`
- `scripts/dist/sync-recall-prod.mjs` as `scripts/sync-recall-prod.mjs`

Synced to `/opt/brain/scripts/lib/`:

- `scripts/lib/recall-controlled-samples.mjs`

Synced to `/opt/brain/scripts/db/`:

- packaged Recall CLI migrations

Synced to `/opt/brain/docs/plans/spikes/`:

- public SPIKE-013 Recall REST enumeration reports
- public SPIKE-014 Recall content fidelity reports

## Verification

Local no-live checks passed before sync:

- `npm run -s build:recall-cli`
- `npm run -s smoke:recall-cli:bundle`
- `npm run -s smoke:recall-second-manual-runtime-preflight`
- `npm run -s smoke:recall-manual-verification-apply`
- `npm run -s check:recall-scheduler`
- `npm run -s check:recall-public-docs-privacy`
- `npm run -s recall:second-manual:command -- --json`

Remote verification after sync:

- Host: `ubuntu-4gb-hel1-1`
- `/opt/brain/scripts/recall-second-manual-verification-apply.sh` present
- `/opt/brain/scripts/check-recall-second-manual-runtime-preflight.mjs` present
- `/opt/brain/scripts/check-recall-apply-report.mjs` present
- `/opt/brain/scripts/sync-recall-prod.mjs` present
- `/opt/brain/scripts/db/migrations/020_recall_sync.sql` present
- `/opt/brain/docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-26_21-58-57_IST.md` present
- `/opt/brain/docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-26_21-58-57_IST.md` present

Remote runtime preflight passed from `/opt/brain` with the generated second-manual command environment:

- `status`: `ready_for_second_manual_runtime_preflight`
- `noLiveNoWrite`: `true`
- `liveApplyDelegationAllowed`: `true`
- `schedulerAllowedNow`: `false`
- `checkpointAllowedNow`: `false`
- `findings`: `[]`

## Current Gate

The previous production blocker, missing runtime/local gate files before the live path, is fixed.

The current real gate remains exact approval for `second_manual_verification_run`. Do not run the manual verification wrapper until that exact approval is present. Scheduler enablement and checkpoint advancement remain blocked until after the second clean manual run is completed, reviewed, and recorded as distinct clean-run evidence.
