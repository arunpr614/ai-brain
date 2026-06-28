# Recall Second Manual Runtime Preflight Deploy Alignment - 2026-06-27 02:48 IST

## Summary

The second manual Recall -> AI Brain verification wrapper is now aligned with the production deploy shape. It no longer depends on the local, repo-heavy second-manual readiness checker from inside the production wrapper. Instead, the wrapper reruns a deploy-safe runtime preflight that validates the approved runtime inputs and confirms the deployed helper scripts and public SPIKE proof files are present before delegating to the guarded scheduled apply path.

This work was no-live/no-write. No Recall API call, import, database write, deploy, scheduler enablement, or checkpoint movement happened.

## Root Cause

The prior wrapper hardening made `scripts/recall-second-manual-verification-apply.sh` call `scripts/check-recall-second-manual-verification-readiness.mjs` before apply delegation. That was safe locally, but production deploy copied the wrapper without copying the readiness helper and its broader local proof/doc dependencies.

Result: after exact approval, the production path could stop before the intended live Recall call because a local-only readiness dependency was missing on the production host.

## Fix

- Added `scripts/check-recall-second-manual-runtime-preflight.mjs`.
  - Requires exact manual verification approval.
  - Requires `BRAIN_RECALL_SYNC_ENABLED=1`.
  - Requires `BRAIN_RECALL_CONFIRM_LIVE_API=1` outside fixture mode.
  - Requires accepted live-spike proof env flags and concrete SPIKE-013/SPIKE-014 report paths.
  - Requires explicit fidelity flags for unverified and metadata-only Recall content.
  - Enforces `BRAIN_RECALL_MAX_IMPORTS` from 1 through 5.
  - Refuses `BRAIN_RECALL_SCHEDULER_ENABLED=1` for the manual run.
  - Confirms production helper scripts needed by the scheduled apply path are present.
- Updated `scripts/recall-second-manual-verification-apply.sh` to call the runtime preflight instead of the local readiness checker.
- Updated deploy to copy the runtime preflight, the post-apply report checker, and public SPIKE-013/SPIKE-014 proof reports into production.
- Added `scripts/smoke-recall-second-manual-runtime-preflight.mjs`.
- Updated the manual verification wrapper smoke to prove runtime-preflight pass/fail behavior.
- Updated static/pre-live/deploy gates to include the runtime-preflight smoke.
- Updated the second-manual command builder so the private manifest remains a local proof-validation input by default and is only included in the production command with `--include-runtime-manifest`.

## Verification

Passed:

- `node --check scripts/check-recall-second-manual-runtime-preflight.mjs scripts/smoke-recall-second-manual-runtime-preflight.mjs scripts/smoke-recall-manual-verification-apply.mjs scripts/print-recall-second-manual-verification-command.mjs scripts/smoke-recall-second-manual-command.mjs scripts/check-recall-scheduler-artifacts.mjs scripts/check-recall-prelive-readiness.mjs`
- `bash -n scripts/recall-second-manual-verification-apply.sh scripts/deploy.sh`
- `npm run -s smoke:recall-second-manual-runtime-preflight`
- `npm run -s smoke:recall-manual-verification-apply`
- `npm run -s smoke:recall-second-manual-command`
- `npm run -s check:recall-scheduler`
- `npm run -s recall:second-manual:command -- --json`
- `git diff --check` on the touched runtime-preflight, wrapper, command-builder, deploy, and static-gate files before this report was written.

## Current Gate

The current real production gate remains `second_manual_verification_run`.

Do not run `npm run recall:manual-verification-apply` unless the exact second-manual approval text is present. Scheduler enablement and checkpoint advancement remain blocked until after the second clean manual run is completed, reviewed, and recorded as distinct clean-run evidence.
