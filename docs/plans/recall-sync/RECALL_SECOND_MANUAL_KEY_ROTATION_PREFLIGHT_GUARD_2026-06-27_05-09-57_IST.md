# Recall Second Manual Key Rotation Preflight Guard

Date: 2026-06-27 05:09 IST

## Summary

The second manual production runtime preflight now checks the same production Recall key-rotation evidence gate that the real scheduled apply wrapper checks before any live Recall API call.

This closes a misleading readiness gap: the no-live remote preflight previously reported production ready even when `/opt/brain/scripts/recall-scheduled-apply.sh` would later stop before live work because `/etc/brain/.env` was stale and `data/private/recall-live-spikes/key-rotation-evidence.json` was missing.

## Root Cause

- `scripts/recall-scheduled-apply.sh` already runs `scripts/check-recall-key-rotation-evidence.mjs` before live work.
- `scripts/check-recall-second-manual-runtime-preflight.mjs` checked approval env, proof paths, helper files, import cap, scheduler-disabled state, and scheduled-wrapper drift, but did not check key-rotation evidence.
- Production `/etc/brain/.env` currently has mtime `2026-06-08T16:25:15.112Z`, older than the required checkpoint `2026-06-24T15:54:17.000Z`.
- Production `data/private/recall-live-spikes/key-rotation-evidence.json` is currently missing.

## Changes

| Area | Change |
| --- | --- |
| Runtime preflight | Added a no-live/no-write key-rotation evidence check by invoking `scripts/check-recall-key-rotation-evidence.mjs` with the same env-file selection used by the scheduled wrapper. |
| Failure summary | Runtime preflight now returns finding `key_rotation_evidence` with sanitized rule names only, such as `env_file_not_rotated_after_checkpoint` and `missing_key_rotation_evidence_file`. |
| Local smoke | `smoke:recall-second-manual-runtime-preflight` now copies the real key evidence checker into the scratch production root and proves stale key evidence blocks delegation. |
| Remote smoke | `smoke:recall-second-manual-remote-runtime-preflight` now proves stale remote key evidence blocks the SSH-shaped remote preflight. |
| Production apply smoke | `smoke:recall-second-manual-production-apply` now proves stale remote key evidence stops before remote apply with `liveWriteAttempted: false`. |
| Static release gate | `check:recall-scheduler` now requires the runtime preflight key evidence guard and the stale-key smoke assertions. |
| Completion status guidance | `recall:daily-sync:completion-status` now tells operators to run the no-live production handoff first, repair key evidence if it reports `key_rotation_evidence` or `remote_preflight_not_ready`, and seek approval only after remote preflight is ready. |
| Production script sync | Updated `/opt/brain/scripts/check-recall-second-manual-runtime-preflight.mjs` after backing up the prior file. |

## Production Backup And Hash

- Backup created on production: `data/private/recall-live-spikes/check-recall-second-manual-runtime-preflight.pre-key-evidence-guard.20260626T233855Z.mjs`
- Deployed runtime preflight hash: `f5da54102b8ef4ec99b675d14d8ff74af060662fa02ab5becfe4d808da8f0e86`
- `brain-recall-sync.timer`: disabled and inactive after the script-only sync

## Verification

Passed locally:

- `npm run -s smoke:recall-second-manual-runtime-preflight`
- `npm run -s smoke:recall-second-manual-remote-runtime-preflight`
- `npm run -s smoke:recall-second-manual-production-apply`
- `npm run -s smoke:recall-daily-sync-completion-status`
- `npm run -s check:recall-scheduler`

Production no-live checks:

- `npm run -s recall:second-manual:remote-runtime-preflight` now exits blocked with `status: blocked_second_manual_remote_runtime_preflight`.
- `npm run -s recall:second-manual:production-command -- --json` now exits blocked with `remote_preflight_not_ready`.
- `npm run -s recall:second-manual:production-apply` without approval exits blocked with `liveWriteAttempted: false`.
- `npm run -s recall:daily-sync:completion-status` now keeps the second manual phase active while telling operators to repair key evidence if the no-live handoff blocks.
- Direct production key evidence check exits blocked with:
  - `env_file_not_rotated_after_checkpoint`
  - `missing_key_rotation_evidence_file`

## Current Gate

The active blocker is now explicit and earlier in the operator path:

1. Repair production key-rotation evidence truthfully.
2. Re-run `npm run recall:second-manual:production-command`.
3. Proceed to exact second-manual approval only after remote preflight is ready.

Follow-up repair capability: `RECALL_PRODUCTION_SYSTEM_KEY_EVIDENCE_RECORDER_2026-06-27_05-26-09_IST.md` adds the production-safe `--system-env-file` evidence recorder path for `/etc/brain/.env`. That follow-up capability still requires exact production-specific acknowledgement and a successful read-only Recall auth probe before private evidence is recorded.

No Recall API call, import, AI Brain database write, scheduler enablement, checkpoint movement, or production app deploy happened during this guard hardening.
