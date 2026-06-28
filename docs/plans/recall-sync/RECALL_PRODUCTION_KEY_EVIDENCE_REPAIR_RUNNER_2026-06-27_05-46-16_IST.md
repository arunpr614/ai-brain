# Recall Production Key-Evidence Repair Runner

Date: 2026-06-27 05:46 IST

## Summary

Added a guarded production key-evidence repair handoff and runner so the production `/etc/brain/.env` evidence blocker can be repaired without relying on raw SSH copy-paste.

This does not loosen the gate. The runner refuses before any live Recall request unless exact `BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK` is present. With exact acknowledgement, it runs the existing production system-env evidence recorder on `/opt/brain`, which performs one read-only Recall auth probe and writes private key-rotation evidence only if the probe passes.

## Why This Was Needed

The second-manual production path is currently blocked by the remote key-evidence gate:

- `/etc/brain/.env` predates checkpoint `2026-06-24T15:54:17.000Z`.
- `data/private/recall-live-spikes/key-rotation-evidence.json` is missing on production.
- `npm run recall:second-manual:production-command -- --json` still blocks with `remote_preflight_not_ready`.

The prior repair capability documented the raw production command. This change adds an operator-facing local command handoff and a guarded local runner that executes the repair on `/opt/brain` through SSH only after exact production-specific acknowledgement.

## Changes

| Area | Change |
| --- | --- |
| No-live command handoff | Added `scripts/print-recall-production-key-evidence-repair-command.mjs`, exposed as `npm run recall:production-key-evidence:command`. |
| Guarded repair runner | Added `scripts/run-recall-production-key-evidence-repair.mjs`, exposed as `npm run recall:production-key-evidence:repair`. |
| Smoke coverage | Added `scripts/smoke-recall-production-key-evidence-repair.mjs`, exposed as `npm run smoke:recall-production-key-evidence-repair`. |
| Pre-live/deploy gates | Added the new smoke to `scripts/check-recall-prelive-readiness.mjs` and `scripts/deploy.sh`. |
| Static release guard | Updated `scripts/check-recall-scheduler-artifacts.mjs` to require the package scripts, pre-live/deploy smoke hooks, exact acknowledgement gate, wrong-ack refusal, system env-file mode, and no import/database/scheduler/checkpoint claims. |
| Node arg separator guard | Updated `scripts/check-recall-node-env-file-separators.mjs` so new env-file-aware scripts must use `node --`. |

## Operator Path

No-live handoff:

```bash
npm run recall:production-key-evidence:command
```

Expected current production status before repair:

- `repairStatus: needs_repair_or_operator_review`
- finding rules include `env_file_not_rotated_after_checkpoint`
- finding rules include `missing_key_rotation_evidence_file`

Guarded repair command, only after the production Recall API key in `/etc/brain/.env` has truly been rotated after chat exposure:

```bash
BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK="I confirm the Recall API key in the production Recall system env file was rotated after chat exposure and should be verified by a read-only live auth probe before recording production key-rotation evidence." \
npm run recall:production-key-evidence:repair
```

After repair, rerun:

```bash
npm run recall:second-manual:production-command -- --json
```

Only proceed to exact second-manual approval after that no-live production handoff reports remote preflight ready.

## Verification

Passed:

- `node --check scripts/print-recall-production-key-evidence-repair-command.mjs scripts/run-recall-production-key-evidence-repair.mjs scripts/smoke-recall-production-key-evidence-repair.mjs scripts/check-recall-scheduler-artifacts.mjs scripts/check-recall-prelive-readiness.mjs scripts/check-recall-node-env-file-separators.mjs`
- `npm run -s smoke:recall-production-key-evidence-repair`
- `npm run -s smoke:recall-daily-sync-completion-status`
- `npm run -s check:recall-scheduler`
- `npm run -s check:recall-node-env-file-separators`
- `npm run -s check:recall-public-docs-privacy` (`scannedFiles: 95`)
- `npm run -s check:recall-approval-packet`
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`

Production no-live checks:

- `npm run -s recall:production-key-evidence:command -- --json` passed as a no-live handoff and reported the current repair blocker rules.
- `npm run -s recall:production-key-evidence:repair` without exact acknowledgement blocked before any read-only Recall auth probe or private evidence write.
- `npm run -s recall:daily-sync:completion-status` now names `npm run recall:production-key-evidence:command` as the repair handoff if the second-manual production handoff reports `key_rotation_evidence` or `remote_preflight_not_ready`.
- `npm run -s recall:second-manual:production-command -- --json` still blocks with `remote_preflight_not_ready`, as expected until production key evidence is repaired.

## Safety Outcome

No production Recall API call, Recall import, AI Brain database write, scheduler enablement, checkpoint movement, production app deploy, or service restart happened while adding this runner.

The new live-capable path remains blocked until exact `BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK` is supplied and the production key-rotation fact is true.
