# Recall Second Manual System Env Override Guard

**Date:** 2026-06-27 04:39 IST
**Owner:** Codex
**Scope:** No-live/no-write hardening for the second manual Recall -> AI Brain verification path.

## Context

The current production gate is the second manual verification apply before scheduler enablement. The first capped apply and production deploy already completed, but the scheduler remains disabled.

The latest operator text supplied the already-used first capped apply approval. That text is intentionally stale for the current gate and must not authorize the second manual verification run.

During no-live review, I found a separate local-wrapper risk: `scripts/recall-second-manual-verification-apply.sh` sets approved manual env values, then delegates into `scripts/recall-scheduled-apply.sh`. The scheduled wrapper sourced the system env file before evaluating gates. If the system env file contained disabled defaults or stale manual values, it could override the explicit manual-run env and stop, alter, or expand the approved run shape.

## Change

- `scripts/recall-scheduled-apply.sh` now records explicit manual verification env values before sourcing the system env file.
- When `BRAIN_RECALL_MANUAL_VERIFICATION_MODE=1` was present before sourcing, the wrapper restores those explicit manual values after sourcing system defaults.
- `BRAIN_RECALL_SYSTEM_ENV_FILE` allows smoke-safe substitution of the system env file without touching `/etc/brain/.env`.
- `scripts/smoke-recall-scheduled-wrapper.mjs` now creates a fake disabled system env file and proves an approved manual fixture run preserves:
  - manual mode and exact second-run approval,
  - sync enabled,
  - live API confirmation,
  - live-spike proof requirement and proof paths,
  - fidelity import flags,
  - capped import limits.
- `scripts/check-recall-scheduler-artifacts.mjs` now statically requires the manual-env preservation guard and the smoke proof string.

## Safety Outcome

This change does not approve or execute a live Recall call. It only protects the already-guarded manual path from being mutated by system env defaults after explicit approval has been supplied.

The active live gate remains this exact approval text:

```text
I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.
```

The first capped apply approval remains spent and is classified as stale for this gate.

## Verification

Completed verification:

- `node --check` passed for the changed smoke/static checker files.
- `npm run -s smoke:recall-scheduler-wrapper` passed, including the new disabled-system-env manual override case.
- `npm run -s smoke:recall-manual-verification-apply` passed.
- `npm run -s smoke:recall-second-manual-production-apply` passed.
- `npm run -s recall:second-manual:remote-runtime-preflight` passed with `commandEnvSource: remote_deployed_latest_spike_pair`, timer disabled/inactive, runtime preflight ready, and selected deployed SPIKE pair matching latest.
- `npm run -s recall:second-manual:production-command -- --json` passed as a no-live command handoff.
- The stale first capped approval probe stopped before remote apply with `liveWriteAttempted: false` and finding `stale_first_apply_approval`.
- `npm run -s check:recall-scheduler` passed.
- `npm run -s check:recall-public-docs-privacy` passed across 91 current Recall docs.
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` passed and still reports the current gate as `second_manual_verification_run`.
- `git diff --check` passed on touched files.
- Targeted secret-shaped token scan passed on non-log touched Recall files.
- Post-append running-log tail scan passed for the new entry.

## Non-Events

- No Recall API call was made.
- No Recall import was attempted.
- No AI Brain database write was made.
- No scheduler timer was enabled or started.
- No checkpoint was advanced.
- No production deploy, commit, push, or PR was made.
