# Recall Second Manual Remote-Built Command Env - 2026-06-27 04:29 IST

## Context

The production second-manual runner already skipped broad local readiness and local live-spike validation by default. One local dependency remained: the remote runtime preflight still began by running the local command builder to discover the SPIKE-013/SPIKE-014 proof pair and produce the guarded command env.

That meant a local checkout or proof-file discovery issue could still block before the production host proved runtime readiness.

## Change

- `scripts/check-recall-second-manual-remote-runtime-preflight.mjs` now builds the guarded command env from the latest deployed SPIKE-013/SPIKE-014 proof pair on the remote production host by default.
  - The output reports `commandEnvSource: remote_deployed_latest_spike_pair`.
  - The local command builder is skipped by default and reported as `remote_build_command_env`.
  - A `--local-build-command-env` flag remains available for explicit debugging of local proof selection.
- `scripts/run-recall-second-manual-production-apply.mjs` now uses the remote-built command env by default.
  - It still refuses to apply without exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`.
  - It still reruns remote runtime preflight before any approved remote apply.
  - It still supports `--local-build-command-env` for explicit local proof-selection debugging.
- `scripts/print-recall-second-manual-production-apply-command.mjs` now surfaces the remote preflight command-env source in the no-live handoff JSON.
- Smokes and static gates now assert that the default production path builds command env from the deployed remote proof pair.

## Verification

Passed:

- `node --check scripts/check-recall-second-manual-remote-runtime-preflight.mjs scripts/run-recall-second-manual-production-apply.mjs scripts/print-recall-second-manual-production-apply-command.mjs scripts/smoke-recall-second-manual-remote-runtime-preflight.mjs scripts/smoke-recall-second-manual-production-apply.mjs scripts/check-recall-scheduler-artifacts.mjs`
- `npm run -s smoke:recall-second-manual-remote-runtime-preflight`
- `npm run -s smoke:recall-second-manual-production-apply`
- `npm run -s smoke:recall-second-manual-production-command`
- `npm run -s recall:second-manual:remote-runtime-preflight`
- `npm run -s recall:second-manual:production-command -- --json`
- `BRAIN_RECALL_FIRST_APPLY_APPROVAL="<exact first capped apply approval text>" npm run -s recall:second-manual:production-apply` - expected blocked exit with `stale_first_apply_approval`, `commandEnvSource: remote_deployed_latest_spike_pair`, local command builder skipped, remote preflight ready, and `liveWriteAttempted: false`
- `npm run -s check:recall-scheduler`
- `npm run -s check:recall-public-docs-privacy` - scanned 90 curated public docs
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`

Observed real production preflight:

- `commandEnvSource: remote_deployed_latest_spike_pair`
- local command builder skipped with `status: remote_build_command_env`
- remote host `ubuntu-4gb-hel1-1`
- `brain-recall-sync.timer` disabled/inactive
- remote Recall enable flags disabled
- runtime preflight `ready_for_second_manual_runtime_preflight`
- latest deployed proof pair timestamp `2026-06-26_21-58-57_IST`
- `selectedMatchesRemoteLatest: true`
- remote command env built with `status: remote_command_env_built_from_deployed_latest_spike_pair`

## Safety Notes

- No Recall API call was made.
- No import, database write, checkpoint movement, scheduler enablement, deploy, service restart, commit, push, or PR happened.
- This change reduces local-machine masking before the production runtime preflight. It does not approve or execute the second manual verification live write.

## Current Gate

The current gate remains exact Arun approval for the second manual verification live write. The no-live handoff remains:

```bash
npm run recall:second-manual:production-command
```

Only after exact second-manual approval:

```bash
BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL="<exact second-manual approval text>" npm run recall:second-manual:production-apply
```
