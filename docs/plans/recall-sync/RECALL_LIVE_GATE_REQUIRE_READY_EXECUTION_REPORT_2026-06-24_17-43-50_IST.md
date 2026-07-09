# Recall Live Gate Require-Ready Execution Report

Created: 2026-06-24 17:43 IST
Owner: Codex
Status: Done for offline scope; live API still blocked pending approval and private controlled samples

## Purpose

Remove a remaining automation false-positive risk from the live-gate status command. `npm run recall:live-gate:status` intentionally exits successfully as a no-secret status report, even when JSON `ok` is false. That is useful for humans, but unsafe for scripts that need a fail-closed readiness check.

## Change

- Added `--require-ready` to `scripts/check-recall-live-gate-status.mjs`.
- Added package alias:

```text
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

- The strict mode prints the same JSON status report, then exits nonzero unless `status` is `ready_for_approved_live_spikes`.
- Updated `scripts/smoke-recall-live-gate-status.mjs` to prove:
  - missing manifest plus `--require-ready` exits nonzero and still prints JSON;
  - fully ready fixture state plus `--require-ready` exits successfully.
- Updated the approval checklist, operating packet, production runbook, current-state audit, project tracker, and approval-packet checker to document and preserve the strict command.

## Validation

Passed:

```text
node --check scripts/check-recall-live-gate-status.mjs
node --check scripts/smoke-recall-live-gate-status.mjs
npm run smoke:recall-live-gate-status
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run check:recall-approval-packet
npm run check:recall-prelive
npm run lint
npm run typecheck
npm test
git diff --check
```

`npm run check:recall-prelive` passed in non-enforcing mode and reported the default private manifest is still placeholder-invalid. That is the expected safe state: offline gates remain green, while live API execution still requires filling the private manifest and rerunning the manifest-enforced command.

Expected blocked strict-mode result:

```text
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json
exitCode: 1
status: needs_manifest_fix
readyForApprovedLiveSpikes: false
```

No live Recall API call was made. No API key, private Recall title, private source URL, card content, or raw Recall payload was printed.

## Remaining Gate

Strict mode does not unblock live work. The private controlled sample manifest still needs approved real values, then the manifest-enforced pre-live gate and strict live-gate readiness command must pass before SPIKE-013/SPIKE-014 live execution.
