# Recall Production Env Key Install And Live Probe Fix

## Summary

This fixes the active production blocker behind "the live call still did not run because local private gates stopped first." The current production host was not blocked by local private gates anymore. It was missing `RECALL_API_KEY` in `/etc/brain/.env`, so the production read-only Recall auth probe loaded the system env file but still exited with `missing_api_key` before making the live `/cards` call.

The fix added a guarded installer that copies the already-rotated ignored local Recall key into the production system env file without printing it, keeps `BRAIN_RECALL_CONFIRM_LIVE_API=0`, runs exactly one read-only production Recall auth probe, and reruns the production key-evidence gate.

## Root Cause

Production `/etc/brain/.env` existed and was readable, but its Recall/Brain key names were only:

- `BRAIN_API_TOKEN`
- `BRAIN_DB_PATH`
- `BRAIN_LAN_TOKEN`

There was no `RECALL_API_KEY`, so `scripts/run-recall-live-auth-probe.mjs --system-env-file --env-file /etc/brain/.env --confirm-live-api` loaded the file but could not authenticate.

## Changes

- Added `scripts/run-recall-production-env-key-install.mjs`.
- Added `scripts/smoke-recall-production-env-key-install.mjs`.
- Added package scripts:
  - `recall:production-env-key:install`
  - `smoke:recall-production-env-key-install`
- Updated `scripts/print-recall-production-key-evidence-repair-command.mjs` to report whether production has a `RECALL_API_KEY` key name and to print the guarded install command.
- Added the installer smoke to pre-live and deploy local gates.
- Added static scheduler-artifact assertions for the installer, handoff guidance, and smoke coverage.
- Updated completion-status guidance so missing production `RECALL_API_KEY` points to the installer before second-manual approval.

## Production Execution Evidence

Guarded production install command was run with exact `BRAIN_RECALL_PRODUCTION_KEY_INSTALL_ACK`.

Sanitized result:

- Status: `production_recall_key_installed_and_live_probe_passed`
- Production env write attempted: `true`
- Read-only Recall auth probe attempted: `true`
- Production env before: `RECALL_API_KEY` absent
- Production env after: `RECALL_API_KEY` present
- `BRAIN_RECALL_CONFIRM_LIVE_API` after install: `0`
- `/etc/brain/.env` mode after install: `640`
- `/etc/brain/.env` mtime after install: `2026-06-27T00:37:07.417Z`
- Read-only Recall probe: HTTP `200`, authenticated `true`, reachable `true`, future-window result count `0`
- Production key-evidence gate: `PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE`
- Evidence source: `env_file_mtime`

No Recall API key, bearer token, card ID, title, source URL, chunks, raw response body, apply payload, database row, or private content was printed in the command output or this report.

## Post-Fix Production State

Passed:

- `npm run -s recall:production-key-evidence:command -- --json`
  - `remoteEvidence.ok: true`
  - `evidenceSource: env_file_mtime`
  - `remoteEnvContract.hasRecallApiKey: true`
- `npm run -s recall:second-manual:remote-runtime-preflight`
  - `status: ready_for_second_manual_remote_runtime_preflight`
  - timer disabled/inactive
  - remote Recall enable flags disabled
  - runtime preflight ready
  - `liveApplyDelegationAllowed: true`
- `npm run -s recall:second-manual:production-command -- --json`
  - no-live/no-write handoff now passes
  - remote preflight ready
  - exact second-manual approval still absent
- `npm run -s recall:daily-sync:completion-status`
  - current gate remains `second_manual_verification_run`
  - scheduler still blocked until a second clean manual run and explicit scheduler approval exist

## Validation

Passed:

- `node --check` on the touched Recall scripts.
- `npm run -s smoke:recall-production-env-key-install`
- `npm run -s smoke:recall-daily-sync-completion-status`
- `npm run -s check:recall-scheduler`
- `npm run -s check:recall-node-env-file-separators`
- `npm run -s check:recall-public-docs-privacy`
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`

The public-doc privacy scan covered 96 curated Recall docs after this report was added.

## Safety Outcome

This fix made a real read-only Recall live call from production and repaired the missing production env credential. It did not:

- import Recall data;
- write AI Brain rows;
- run the second-manual production apply;
- enable the scheduler;
- move a checkpoint;
- deploy application code;
- print secret values.

The next live write remains blocked on exact second-manual approval in `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`.
