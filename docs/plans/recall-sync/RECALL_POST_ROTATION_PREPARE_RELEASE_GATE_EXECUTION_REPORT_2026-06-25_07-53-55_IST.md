# Recall Post-Rotation Prepare Release Gate Execution Report

| Field | Value |
|---|---|
| Date | 2026-06-25 07:53 IST |
| Status | Done for no-live/no-write release-gate smoke scope; full project remains incomplete |
| Owner | Codex |
| Related tracker item | RDS-026k |
| Public safety | This document contains no Recall API key, private Recall titles, private source URLs, card IDs, card content, raw chunks, dry-run payloads, apply payloads, backup payloads, or database rows. |

## Problem

The local release path now surfaces the key-rotation handoff, but the next operator action after external key rotation is the guarded post-rotation prepare wrapper. That wrapper is responsible for recording private key-rotation evidence when safe, refreshing stale no-write proof when needed, and stopping before first capped apply approval. If pre-live/deploy do not smoke that wrapper, a future release could expose the owner action while failing to prove the next command still behaves safely.

## Change

- Updated `scripts/check-recall-prelive-readiness.mjs` with a required no-live step:
  - `post_rotation_prepare_smoke`: runs `npm run smoke:recall-first-apply-prepare-after-rotation`.
- Updated `scripts/deploy.sh` local release gates to run:
  - `npm run smoke:recall-first-apply-prepare-after-rotation`.
- Updated `scripts/check-recall-scheduler-artifacts.mjs` so `npm run check:recall-scheduler` statically requires:
  - the `smoke:recall-first-apply-prepare-after-rotation` package script;
  - deploy-time post-rotation prepare smoke wiring;
  - pre-live post-rotation prepare smoke wiring.

## Current Real Output Summary

Current status remains blocked before live proof refresh or first write:

```json
{
  "ok": false,
  "status": "blocked_key_rotation_evidence",
  "currentBlockingGate": "key_rotation_evidence",
  "failedKeyEvidenceRules": [
    "env_file_not_rotated_after_checkpoint",
    "missing_key_rotation_evidence_file"
  ]
}
```

The added smoke is no-live/no-write. It proves the post-rotation prepare wrapper:

- supports plan-only mode without acknowledgement or prepare confirmation;
- refuses missing key-rotation acknowledgement before private evidence creation;
- refuses missing prepare confirmation before private evidence creation;
- refuses tainted private evidence as `non_recordable_key_evidence_failure` without overwriting it;
- can record safe private evidence through a mocked read-only auth probe;
- can refresh stale proof through the existing no-write ready-or-refresh wrapper;
- does not print key material.

## Validation Evidence

```text
node --check scripts/check-recall-prelive-readiness.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
bash -n scripts/deploy.sh
npm run -s smoke:recall-first-apply-prepare-after-rotation
npm run -s check:recall-scheduler
npm run -s check:recall-prelive
```

Expected post-change pre-live output includes:

- `post_rotation_prepare_smoke`;
- `smoke:recall-first-apply-prepare-after-rotation`;
- `blocked_key_rotation_evidence`;
- `env_file_not_rotated_after_checkpoint`;
- `missing_key_rotation_evidence_file`;
- no secret-shaped Recall key output.

## Non-Actions

- No new live Recall API call was made.
- No private key-rotation evidence was recorded.
- No proof was refreshed.
- No first capped apply was run.
- No production deploy was run.
- No scheduler was enabled.
- No checkpoint was advanced.
- The chat-pasted Recall API key was not used.

## Next Gate

The next real gate is unchanged: rotate the Recall API key outside chat, store the rotated key only in the ignored private Recall env file, establish key rotation evidence, run the guarded post-rotation prepare command to record private evidence and refresh stale proof if needed, then use the no-secret first capped apply approval packet and guarded wrapper only after exact approval.
