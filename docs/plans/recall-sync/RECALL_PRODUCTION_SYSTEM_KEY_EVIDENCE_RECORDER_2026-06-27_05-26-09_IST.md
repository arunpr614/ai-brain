# Recall Production System Key Evidence Recorder

Date: 2026-06-27 05:26 IST

## Summary

Added and deployed a production-safe repair path for the current second-manual blocker: production key-rotation evidence for `/etc/brain/.env`.

The repair path does not loosen the key evidence gate. It adds an explicit `--system-env-file` mode to the read-only auth probe and key-evidence recorder so production can record private key-rotation evidence only after an exact production-specific acknowledgement and a successful read-only Recall auth probe.

## Why This Was Needed

The current production blocker is:

- `/etc/brain/.env` exists but has mtime `2026-06-08T16:25:15.112Z`.
- The required checkpoint is `2026-06-24T15:54:17.000Z`.
- `/opt/brain/data/private/recall-live-spikes/key-rotation-evidence.json` is missing.

The existing recorder supported the local ignored private env flow, but not the production system env-file flow. That meant there was no safe production command to record key evidence for `/etc/brain/.env` after a real production key rotation when the env-file metadata gate remained stale.

## Changes

| Area | Change |
| --- | --- |
| Live auth probe | `scripts/run-recall-live-auth-probe.mjs` now supports `--system-env-file`, validating restrictive system-file permissions such as `0600` or `0640` without requiring git-ignore/private-root checks. |
| Key evidence recorder | `scripts/record-recall-key-rotation-evidence.mjs` now supports `--system-env-file` and defaults the env file to `/etc/brain/.env` in that mode. |
| Acknowledgement gate | System mode requires exact `BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK`, distinct from the local private-env acknowledgement. |
| Evidence verification | System mode verifies the recorded evidence through `scripts/check-recall-key-rotation-evidence.mjs --system-env-file`. |
| Smoke coverage | `scripts/smoke-recall-key-rotation-evidence-record.mjs` now proves system mode refuses the private acknowledgement, runs a read-only auth probe against a fixture server, records no key material, and passes the system env-file evidence gate. |
| Static release gate | `scripts/check-recall-scheduler-artifacts.mjs` now asserts the system-env probe/recorder behavior and smoke coverage. |

## Production Sync

Copied these helper files to `/opt/brain`:

- `scripts/record-recall-key-rotation-evidence.mjs`
- `scripts/run-recall-live-auth-probe.mjs`
- `scripts/lib/recall-env-file.mjs`

Production hashes after sync:

- `scripts/record-recall-key-rotation-evidence.mjs`: `7fc93cbda547aa4c46ddacb2bae9f52c650174872959957e2ea4d4ecca9a8aba`
- `scripts/run-recall-live-auth-probe.mjs`: `0a0b265fdcf82cd342a939ba7b661912f859d9a2ed3482fb2d885c950955e1da`
- `scripts/lib/recall-env-file.mjs`: `242f38424a6fd62ba0fce549d1e4346c9854a5fb7a409412cb370bb696e61fef`

`brain-recall-sync.timer` remained disabled and inactive.

## Production Repair Command

Run this on production only after the production Recall API key has truly been rotated after chat exposure and `/etc/brain/.env` contains the production key intended for the second manual run:

```bash
BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK="I confirm the Recall API key in the production Recall system env file was rotated after chat exposure and should be verified by a read-only live auth probe before recording production key-rotation evidence." \
node -- scripts/record-recall-key-rotation-evidence.mjs \
  --system-env-file \
  --env-file /etc/brain/.env \
  --evidence-file data/private/recall-live-spikes/key-rotation-evidence.json \
  --min-rotated-after 2026-06-24T15:54:17.000Z
```

This command makes one read-only `GET /cards` auth probe with a future empty window. It does not fetch details, import data, write the AI Brain database, deploy, enable a scheduler, or move a checkpoint.

## Verification

Passed locally:

- `node --check scripts/run-recall-live-auth-probe.mjs scripts/record-recall-key-rotation-evidence.mjs scripts/smoke-recall-key-rotation-evidence-record.mjs`
- `npm run -s smoke:recall-key-rotation-evidence-record`
- `npm run -s check:recall-node-env-file-separators`

Passed on production:

- Remote syntax checks for the copied helper files.
- Recorder refusal without exact `BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK`; exit code `2`, no key printed, no private Recall content printed, and no evidence file recorded.

## Current Gate

The production key evidence blocker is not fixed yet. The new capability provides the safe command to repair it after the production key rotation fact is true and acknowledged.

After evidence repair, rerun:

```bash
npm run -s recall:second-manual:production-command -- --json
```

Only proceed to exact second-manual approval if remote preflight becomes ready.
