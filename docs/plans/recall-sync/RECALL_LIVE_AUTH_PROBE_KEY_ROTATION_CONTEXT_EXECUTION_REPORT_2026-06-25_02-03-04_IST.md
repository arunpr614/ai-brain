# Recall Live Auth Probe Key Rotation Context Execution Report

Created: 2026-06-25 02:03 IST
Owner: Codex
Status: Done for offline scope; no live Recall API call was made in this change

No live Recall API call was made in this change.

## Purpose

Make the standalone read-only Recall auth probe safer to operate after the Recall API key was exposed in chat.

The first-apply status helper already shows that live read connectivity is separate from first-write safety. This change carries that same distinction into `npm run recall:live-auth-probe` itself, so an operator who runs only the optional probe still sees whether the loaded private env-file timestamp is older than the key-rotation checkpoint and still sees that the probe does not satisfy write gates.

## Files Changed

| File | Change |
|---|---|
| `scripts/run-recall-live-auth-probe.mjs` | Adds `firstWriteSafety` diagnostic context to success and failure JSON, including key-rotation checkpoint, env-file mtime, stale/fresh timestamp context, and explicit `proofRefreshAllowedByThisProbe: false` / `applyAllowedByThisProbe: false`. |
| `scripts/smoke-recall-live-auth-probe.mjs` | Adds local mock-server coverage for no-env, stale private env-file, and fresh private env-file probe outputs using fake local keys only. |

## Behavior

The probe still:

- requires `--confirm-live-api` or `BRAIN_RECALL_CONFIRM_LIVE_API=1`;
- makes at most one read-only `GET /cards` request when run for real;
- defaults to the future date window `2100-01-01T00:00:00.000Z` through `2100-01-02T00:00:00.000Z`;
- does not print card IDs, titles, source URLs, chunks, raw response bodies, Recall API keys, private manifest values, dry-run payloads, apply payloads, backup payloads, or database rows;
- does not read or write the AI Brain database;
- does not create dry-run proof, backup proof, apply proof, deploy, enable a scheduler, or advance a checkpoint.

The new `firstWriteSafety` block is diagnostic context only:

```json
{
  "purpose": "diagnostic_context_only",
  "keyRotationEvidenceGateRun": false,
  "keyRotatedAfterIso": "2026-06-24T15:54:17.000Z",
  "envFileMtimeAfterCheckpoint": false,
  "proofRefreshAllowedByThisProbe": false,
  "applyAllowedByThisProbe": false
}
```

If a loaded private env file is older than the checkpoint, the probe says first-write preparation remains blocked until key-rotation evidence passes. If a loaded private env file is newer than the checkpoint, the probe still says the key-rotation evidence gate was not run and does not permit proof refresh or apply.

## Validation

```text
node --check scripts/run-recall-live-auth-probe.mjs
node --check scripts/smoke-recall-live-auth-probe.mjs
npm run smoke:recall-live-auth-probe
```

Smoke coverage passed for:

- missing live API confirmation refusal;
- missing API key refusal;
- read-only `/cards` future-window request through a local mock server;
- count-only output with no card IDs, titles, source URLs, chunks, or raw body;
- 401 mapping to auth-failure exit code without leaking key material;
- stale private env-file key-rotation context reporting `envFileMtimeAfterCheckpoint: false` while keeping proof refresh/apply disallowed;
- fresh private env-file key-rotation context reporting `envFileMtimeAfterCheckpoint: true` while still reporting `keyRotationEvidenceGateRun: false` and keeping proof refresh/apply disallowed.

## Current Real Gate State

`npm run recall:first-apply:status` still reports `blocked_key_rotation_evidence`.

The current private env file remains older than the key-rotation checkpoint and `data/private/recall-live-spikes/key-rotation-evidence.json` is absent. This is the intended stop condition until the Recall API key is rotated outside chat, the ignored private env file is updated with the rotated key, and key-rotation evidence passes.

## Stop Conditions

Do not use the optional live auth probe result as approval to run proof refresh, first capped apply, deploy, scheduler enablement, staging, commit, push, pull request, or checkpoint advancement.

The next real production step remains:

1. Rotate the Recall API key outside chat.
2. Store the rotated key only in the ignored owner-only private Recall env file.
3. Run the post-rotation prepare wrapper with exact `BRAIN_RECALL_KEY_ROTATION_ACK` and `BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1`.
4. Continue only after status/readiness are green and Arun gives exact first capped apply approval.
