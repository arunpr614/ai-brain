# Recall Private Env Template Init Helper Execution Report

Created: 2026-06-24 13:47 IST
Status: Done and validated for offline scope; no live Recall API call made
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Added a safe initializer for the ignored local Recall environment file used by the approved live API spike path.

The initializer writes an empty-key template to `data/private/recall-live-spikes/recall.env` only after the private ignore guard passes. It refuses unsafe paths, refuses overwrite unless `--force` is passed, sets file permissions to `0600`, and keeps `BRAIN_RECALL_CONFIRM_LIVE_API=0` by default so the template cannot accidentally authorize live API execution.

No real API key was written. No live Recall API call, production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Private env initializer | `scripts/init-recall-env.mjs` | Adds `npm run recall:env:init` and writes only an empty-key, confirmation-disabled template under the ignored private Recall path. |
| Env initializer smoke | `scripts/smoke-recall-env-init.mjs` | Proves stdout template safety, unsafe path refusal, traversal refusal, private write after ignore check, `0600` permissions, overwrite refusal, force overwrite, and cleanup. |
| Pre-live readiness | `scripts/check-recall-prelive-readiness.mjs` | Adds the env initializer smoke to the consolidated offline readiness gate. |
| Live gate status | `scripts/check-recall-live-gate-status.mjs` | Points missing-credential setups toward `npm run recall:env:init` without printing secrets. |
| Package scripts | `package.json` | Adds `recall:env:init` and `smoke:recall-env-init`. |

## Safety Behavior

- The template includes `export RECALL_API_KEY=""`; it never includes a real key or key-shaped placeholder.
- The template includes `export BRAIN_RECALL_CONFIRM_LIVE_API=0`; explicit live confirmation is still required later.
- The writer refuses paths outside `data/private/recall-live-spikes/`.
- The writer runs `scripts/check-recall-private-ignore.mjs` before writing.
- The written env file is `0600`.
- Smoke tests create only temporary private files and remove them.

## Validation Evidence

Actual validation run on 2026-06-24:

```text
npm run smoke:recall-env-init
npm run recall:live-gate:status
npm run check:recall-prelive
npm run smoke:recall-live-gate-status
npm run lint
npm run typecheck
```

Observed results:

- env initializer smoke passed and reported no persistent private env file;
- live gate status returned `needs_manifest_template` without printing secrets;
- consolidated pre-live readiness passed with `recall_env_init_smoke`;
- live gate status smoke still passed and did not print API key values;
- lint passed;
- typecheck passed.

## Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| User-approved API-key handling | Blocked | The template exists only to support an approved local handling method; it must not be filled without approval. |
| Controlled sample manifest | Blocked | Still required before live SPIKE-013/SPIKE-014. |
| Live SPIKE-013/SPIKE-014 | Blocked | Requires approved API handling, manifest, and explicit live confirmation. |
| Production dry-run/apply/deploy/scheduler | Blocked | Still gated behind live spike evidence and explicit approval. |
