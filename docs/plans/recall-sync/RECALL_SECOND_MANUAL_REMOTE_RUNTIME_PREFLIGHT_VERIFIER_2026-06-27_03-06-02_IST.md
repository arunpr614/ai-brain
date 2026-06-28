# Recall Second Manual Remote Runtime Preflight Verifier - 2026-06-27 03:06 IST

## Summary

Added a repeatable no-live/no-write verifier for the exact production blocker that previously stopped the second manual Recall -> AI Brain run before the intended live path. The verifier builds the current guarded second-manual command locally, then uses SSH to run the deploy-safe runtime preflight from `/opt/brain`.

## What Changed

- Added `scripts/check-recall-second-manual-remote-runtime-preflight.mjs`.
  - Builds the current command with `scripts/print-recall-second-manual-verification-command.mjs --json`.
  - Uses the structured `commandEnv` from the command builder instead of reparsing shell text.
  - SSHes to the production host and runs `scripts/check-recall-second-manual-runtime-preflight.mjs` from the remote project root.
  - Checks that `brain-recall-sync.timer` is disabled/inactive.
  - Checks that remote Recall enable flags are not already set in `/etc/brain/.env`.
  - Reports `noLiveNoWrite: true`.
- Added `scripts/smoke-recall-second-manual-remote-runtime-preflight.mjs`.
  - Uses a fake SSH shim and a production-shaped scratch root.
  - Proves the verifier passes with required remote files present.
  - Proves the verifier fails when a remote runtime helper is missing.
- Updated `scripts/print-recall-second-manual-verification-command.mjs` to include structured `commandEnv` in JSON output.
- Added package scripts:
  - `recall:second-manual:remote-runtime-preflight`
  - `smoke:recall-second-manual-remote-runtime-preflight`
- Added the smoke to pre-live and deploy local gates.
- Added static scheduler-artifact assertions for the remote verifier.

## Verification

Passed locally:

- `node --check scripts/check-recall-second-manual-remote-runtime-preflight.mjs scripts/smoke-recall-second-manual-remote-runtime-preflight.mjs scripts/print-recall-second-manual-verification-command.mjs scripts/check-recall-scheduler-artifacts.mjs scripts/check-recall-prelive-readiness.mjs`
- `npm run -s smoke:recall-second-manual-remote-runtime-preflight`
- `npm run -s check:recall-scheduler`

Passed against production:

- `npm run -s recall:second-manual:remote-runtime-preflight`

Production verifier result:

- `status`: `ready_for_second_manual_remote_runtime_preflight`
- `host`: `ubuntu-4gb-hel1-1`
- `timer.enabled`: `false`
- `timer.active`: `false`
- `envFlags.status`: `recall_remote_enable_flags_disabled`
- `runtimePreflight.status`: `ready_for_second_manual_runtime_preflight`
- `runtimePreflight.liveApplyDelegationAllowed`: `true`
- `findings`: `[]`

## Current Gate

The accidental production blocker is now covered by a repeatable command:

```bash
npm run -s recall:second-manual:remote-runtime-preflight
```

This command does not approve or run a live apply. The current real gate remains exact approval for `second_manual_verification_run`. Scheduler enablement and checkpoint advancement remain blocked until after the second clean manual run is completed, reviewed, and recorded as distinct clean-run evidence.
