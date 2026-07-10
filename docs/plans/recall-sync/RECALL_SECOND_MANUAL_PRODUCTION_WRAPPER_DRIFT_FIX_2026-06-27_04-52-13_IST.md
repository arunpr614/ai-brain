# Recall Second Manual Production Wrapper Drift Fix

**Date:** 2026-06-27 04:52 IST
**Owner:** Codex
**Scope:** Narrow production scripts-only update for the second manual Recall -> AI Brain verification path.

## Context

The local scheduled wrapper had been hardened to preserve explicit manual verification env values across system env sourcing. Production still had the older `/opt/brain/scripts/recall-scheduled-apply.sh`, which sourced `/etc/brain/.env` before evaluating manual-mode gates. That meant an approved second manual production run could still be stopped or reshaped by disabled/stale system env defaults before the live Recall path.

## Change

Copied only these scripts to production:

- `scripts/recall-scheduled-apply.sh`
- `scripts/check-recall-second-manual-runtime-preflight.mjs`

Remote backups were written before replacement:

- `/opt/brain/data/private/recall-live-spikes/recall-scheduled-apply.pre-manual-env-override.20260626T231922Z.sh`
- `/opt/brain/data/private/recall-live-spikes/check-recall-second-manual-runtime-preflight.pre-wrapper-drift-check.20260626T232138Z.mjs`

Production now has:

- scheduled wrapper SHA-256: `f0c551ac3c85f47f0c85d8232f677a1b50ccfe0b80042506bb8084d4219ec5bd`
- runtime preflight SHA-256: `73c48acc25090a2913a73c7ba8eb9574a29d1efc28d138f091c29d6b49e0a063`

## Guard Added

`scripts/check-recall-second-manual-runtime-preflight.mjs` now rejects a deployed scheduled wrapper that does not contain:

- `manual_env_override_keys`
- `BRAIN_RECALL_SYSTEM_ENV_FILE`
- `manual_verification_mode_before_env`

This makes the no-live remote runtime preflight catch the exact production drift that caused the manual env preservation fix to be local-only.

## Verification

Completed:

- Verified production timer was disabled/inactive before copying.
- Verified remote Recall enable flags were disabled before copying.
- Backed up both production files before replacement.
- Verified deployed script hashes after replacement.
- `node --check` passed for the changed runtime preflight, runtime/remote/production smokes, and scheduler static checker.
- `npm run -s smoke:recall-second-manual-runtime-preflight` passed and now proves stale scheduled-wrapper drift fails.
- `npm run -s smoke:recall-second-manual-remote-runtime-preflight` passed and now proves remote stale scheduled-wrapper drift fails.
- `npm run -s smoke:recall-second-manual-production-apply` passed and now proves the production runner stops before remote apply when the deployed scheduled wrapper guard is missing.
- `npm run -s check:recall-scheduler` passed.
- `npm run -s check:recall-public-docs-privacy` passed across 92 current Recall docs.
- `npm run -s check:recall-approval-packet` passed.
- `npm run -s recall:second-manual:remote-runtime-preflight` passed against `/opt/brain`.
- `npm run -s recall:second-manual:production-command -- --json` passed as a no-live handoff.
- `npm run -s recall:second-manual:production-apply` without approval stopped before remote apply with `liveWriteAttempted: false`.
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` passed and still reports `currentBlockingGate: second_manual_verification_run`.

## Safety Outcome

No Recall API call was made. No Recall import was attempted. No AI Brain database write was made. No scheduler timer was enabled or started. No checkpoint was advanced. No application restart, broad deploy, commit, push, or PR was made.

The active live gate remains exact second-manual approval in `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`.
