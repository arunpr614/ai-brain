# Recall Key-Rotation Handoff Read-only Diagnostic Proof Fix

Generated: 2026-06-25 08:13:44 IST

Status: Done for no-live/no-write key-rotation handoff clarity scope; full project remains incomplete.

This document contains no Recall API key.

## Problem

The key-rotation handoff made the current blocker clear (`blocked_key_rotation_evidence`), but it did not surface the already-passing read-only live diagnostic proof. That made the operator state easy to misread as "local private gates stopped all live work" instead of the more precise state:

- the read-only Recall diagnostic already reached Recall successfully;
- the key-rotation gate still correctly blocks proof refresh, first capped apply, deploy, scheduler enablement, and checkpoint movement.

## Fix

`scripts/print-recall-key-rotation-handoff.mjs` now includes a `currentGate.readOnlyLiveDiagnostic` section in JSON output and a "Read-only Live Diagnostic" section in Markdown output.

The section summarizes:

- whether a private diagnostic proof already passed;
- the preferred safe rerun command;
- the no-live report check command;
- the private diagnostic proof path;
- the last read-only `/cards` probe status;
- the gates that the diagnostic explicitly does not authorize.

## Current Observed State

`npm run recall:key-rotation:handoff -- --json` now reports:

- `readOnlyLiveDiagnostic.status`: `read_only_live_diagnostic_already_succeeded`
- `existingPrivateProofOk`: `true`
- `currentGate.readOnlyLiveDiagnostic.proof.verdict`: `PASS_RECALL_LIVE_DIAGNOSTIC_REPORT`
- private proof: `data/private/recall-live-spikes/live-diagnostic-report.json`
- proof mode: `first_apply_live_read_diagnostic`
- probe: `GET /cards`
- HTTP status: `200`
- authenticated: `true`
- reachable: `true`
- result count: `0`
- `envFileMtimeAfterCheckpoint`: `false`

The same output still reports:

- `currentGate.status`: `blocked_key_rotation_evidence`
- failed rules: `env_file_not_rotated_after_checkpoint`, `missing_key_rotation_evidence_file`
- blocked actions: `proof_refresh`, `first_capped_apply`, `deploy`, `scheduler`, `checkpoint`
- explicit production gate id: `production_deploy`
- `proofRefreshAllowedNow`: `false`
- `applyAllowedNow`: `false`

## Safety Boundary Preserved

This fix does not:

- call the Recall API;
- read, print, store, rotate, or validate the Recall API key value;
- record key-rotation evidence;
- refresh dry-run or backup proof;
- write to the AI Brain database;
- deploy to production;
- enable the scheduler;
- advance checkpoints.

No new live Recall API call was made. No private key-rotation evidence was recorded. No proof was refreshed. No first capped apply was run. No production deploy was run. No scheduler was enabled. No checkpoint was advanced. The chat-pasted Recall API key was not used.

The successful read-only diagnostic remains diagnostic context only. It does not satisfy key-rotation evidence, proof freshness, first-write approval, apply, deploy, scheduler, or checkpoint gates.

## Files Changed

- `scripts/print-recall-key-rotation-handoff.mjs`
- `scripts/smoke-recall-key-rotation-handoff.mjs`

## Validation

Passed:

```text
node --check scripts/print-recall-key-rotation-handoff.mjs
node --check scripts/smoke-recall-key-rotation-handoff.mjs
npm run -s smoke:recall-key-rotation-handoff
npm run -s recall:key-rotation:handoff -- --json
```

The smoke now proves:

- blocked key-rotation handoff exits 0 and names stale private gates;
- blocked handoff surfaces prior read-only live diagnostic proof separately from first-write permission;
- Markdown handoff includes operator checklist and blocked-action section;
- fresh key-rotation metadata reports passing evidence;
- handoff output does not print env file contents or secret-shaped values;
- smoke uses no live Recall API call.

## Next Gate

External key rotation is still required before any proof refresh, first capped apply, production deploy, scheduler enablement, or checkpoint movement.
