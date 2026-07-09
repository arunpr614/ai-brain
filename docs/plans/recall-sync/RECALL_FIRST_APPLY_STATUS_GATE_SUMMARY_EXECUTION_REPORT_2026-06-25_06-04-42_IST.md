# Recall First Apply Status Gate Summary Execution Report

**Created:** 2026-06-25 06:04 IST
Status: Done for offline scope; real first-write remains blocked until external key rotation evidence and fresh proof pass.

## Purpose

Make the first-apply status helper expose a compact, machine-readable gate summary so future agents and automation can distinguish the current owner/action from safe local no-write work.

## Implementation

- `scripts/check-recall-first-apply-status.mjs` now emits top-level `gateSummary`.
- `scripts/smoke-recall-first-apply-status.mjs` now verifies `gateSummary` for stale-key, proof-refresh-needed, and ready-for-approval states.
- The current real status remains `blocked_key_rotation_evidence`.

## Current Gate Summary Contract

For the current real blocked state, `npm run recall:first-apply:status` reports:

```json
{
  "currentBlockingGate": "key_rotation_evidence",
  "owner": "Arun",
  "externalActionRequired": true,
  "externalAction": "rotate_recall_api_key_outside_chat",
  "safeNoWritePreviewCommand": "npm run recall:first-apply:prepare-plan",
  "safeReadOnlyDiagnosticCommand": "npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json",
  "blockedActions": [
    "proof_refresh",
    "first_capped_apply",
    "deploy",
    "scheduler",
    "checkpoint"
  ],
  "proofRefreshAllowedNow": false,
  "applyAllowedNow": false,
  "deployAllowedNow": false,
  "schedulerAllowedNow": false,
  "checkpointAllowedNow": false
}
```

## Validation

Passed:

```text
node --check scripts/check-recall-first-apply-status.mjs
node --check scripts/smoke-recall-first-apply-status.mjs
npm run smoke:recall-first-apply-status
npm run -s recall:first-apply:status
npm run -s recall:first-apply:prepare-plan
focused trailing-whitespace scan on scripts/check-recall-first-apply-status.mjs and scripts/smoke-recall-first-apply-status.mjs
```

`npm run smoke:recall-first-apply-status` now checks:

- stale key gate summary identifies external key rotation and keeps write/deploy actions blocked;
- live-ready gate summary names the private env-file wrapper as the safe read-only diagnostic command;
- refresh-needed gate summary allows only no-write proof refresh;
- ready gate summary requires exact first-write approval before apply.

## Safety Notes

- No live Recall API call was made in this change.
- No real private key-rotation evidence was recorded.
- No proof was refreshed.
- No production apply was run.
- No deploy was run.
- No scheduler was enabled.
- No checkpoint was advanced.
- The chat-pasted Recall API key was not used.

## Remaining Gate

Rotate the Recall API key outside chat, store the rotated key only in the ignored private Recall env file, then rerun `npm run recall:first-apply:status`. Only after key evidence passes should the gated post-rotation prepare wrapper refresh stale proof and stop at first capped apply approval.
