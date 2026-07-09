# Recall First Apply Status Read-Only Diagnostic Priority Execution Report

**Created:** 2026-06-25 06:22 IST
Status: Done for offline scope; real first-write remains blocked until external key rotation evidence and fresh proof pass.

## Purpose

Make the first-apply status helper choose the safest already-available read-only diagnostic path as the primary operator command.

Before this change, `gateSummary.safeReadOnlyDiagnosticCommand` always pointed to the prompt wrapper. That prompt path is still useful when the persisted env file is missing, stale, or intentionally not trusted, but it can also nudge an operator toward entering a key again. When the local live gate is green and the ignored private env file is loaded, the status helper should point first to the private env-file wrapper and keep the guarded prompt command as fallback.

## Implementation

- `scripts/check-recall-first-apply-status.mjs` now emits:
  - `diagnostics.liveReadConnectivity.primarySafeReadOnlyDiagnosticCommand`;
  - `diagnostics.liveReadConnectivity.primarySafeReadOnlyDiagnosticCredentialMode`;
  - `diagnostics.liveReadConnectivity.promptFallbackReadOnlyDiagnosticCommand`.
- `gateSummary.safeReadOnlyDiagnosticCommand` now uses the primary command instead of always using `optionalNoWritePromptCommand`.
- `optionalDiagnosticCommands` now marks the env-file wrapper as `preferred: true` when the local live gate is ready.
- `readOnlyDiagnosticNextAction` now names the env-file primary command and includes the guarded prompt fallback when both are available.
- `scripts/smoke-recall-first-apply-status.mjs` now proves both priority cases:
  - stale or unavailable env-file live gate: prompt command remains primary with `local_prompt_env_file_disabled`;
  - ready env-file live gate: private env-file wrapper becomes primary with `private_env_file`, and prompt remains fallback.

## Current Real Status Contract

The current real status remains `blocked_key_rotation_evidence`, but the local live gate is ready. The safe read-only diagnostic priority now reports:

```text
gateSummary.safeReadOnlyDiagnosticCommand:
npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json

diagnostics.liveReadConnectivity.primarySafeReadOnlyDiagnosticCredentialMode:
private_env_file

diagnostics.liveReadConnectivity.promptFallbackReadOnlyDiagnosticCommand:
npm run recall:first-apply:live-diagnostic:prompt -- --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json
```

The command remains diagnostic-only. It does not satisfy key rotation evidence, proof freshness, first-write approval, apply, deploy, scheduler, or checkpoint gates.

## Validation

Passed:

```text
node --check scripts/check-recall-first-apply-status.mjs
node --check scripts/smoke-recall-first-apply-status.mjs
npm run smoke:recall-first-apply-status
```

Smoke assertions include:

- live-ready but stale key evidence prefers the private env-file read-only diagnostic and keeps the prompt command as fallback;
- live-ready gate summary names the private env-file wrapper as the safe read-only diagnostic command;
- prompt remains primary only when the env-file live gate is not ready;
- proof refresh, first capped apply, deploy, scheduler, and checkpoint remain blocked.

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
