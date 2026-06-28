# Recall Disabled Systemd Scheduler Readiness Report

Created: 2026-06-24 10:54 IST
Status: Disabled-by-default scheduler artifacts ready; timer not enabled or deployed
Related runbook: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md`

## Scope

This pass prepared scheduler artifacts for a future daily Recall import, while preserving the production no-go gate. It did not run live Recall API calls, did not apply imports to production, did not enable a scheduler, and did not deploy.

## Implemented

| Area | Files | Result |
|---|---|---|
| Scheduled wrapper | `scripts/recall-scheduled-apply.sh` | Exits harmlessly unless both `BRAIN_RECALL_SYNC_ENABLED=1` and `BRAIN_RECALL_SCHEDULER_ENABLED=1`; requires `RECALL_API_KEY` unless a test fixture is supplied; runs scheduled dry-run, validates the dry-run report, creates backup proof, and invokes apply with dry-run proof plus backup proof; writes private reports under `data/private/recall-live-spikes/`. |
| Systemd service | `scripts/deploy/brain-recall-sync.service` | Oneshot service runs as `brain`, calls wrapper through `/usr/bin/bash`, sources `/etc/brain/.env`, writes only under `/opt/brain/data`, and logs to journald with `brain-recall-sync` identifier. |
| Systemd timer | `scripts/deploy/brain-recall-sync.timer` | Daily timer set to `20:00 UTC`, equivalent to 01:30 IST. The timer is not enabled by deploy. |
| Deploy artifact copy | `scripts/deploy.sh` | Copies wrapper and systemd files to the host and runs `systemctl daemon-reload`, but intentionally does not enable or start the timer; deploy now also fails if the timer is already enabled/active unless `BRAIN_RECALL_ALLOW_EXISTING_TIMER=1`, or if remote Recall enable flags are already set, including exported, quoted, or spaced assignments, unless `BRAIN_RECALL_ALLOW_ENABLED_FLAGS=1`. |
| Static safety check | `scripts/check-recall-scheduler-artifacts.mjs`, `package.json` | Added `npm run check:recall-scheduler`; deploy gates now verify service/timer/wrapper safety, disabled/active timer preflight, remote Recall enable-flag preflight, and absence of timer enable/start commands. |
| Runbook update | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Added scheduler artifact names, disabled env flags, future enable sequence, emergency disable path, and static check command. |

## Validation

Passed:

```bash
npm run check:recall-scheduler
BRAIN_DIR="$PWD" bash scripts/recall-scheduled-apply.sh
npm run build:recall-cli
npm run smoke:recall-scheduler-wrapper
node --import tsx --test src/lib/recall/fidelity.test.ts src/lib/recall/client.test.ts src/lib/recall/importer.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/sync-runner.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/security/redaction.test.ts src/lib/capture/quality.test.ts
npm run build:recall-cli
npm run smoke:recall-cli:bundle
npm run typecheck
npm run lint
```

Result summary:

- Static scheduler safety check passed, including deploy-time detection of already-enabled/active Recall timer state and remote Recall enable flags.
- Wrapper disabled smoke exited with `BRAIN_RECALL_SYNC_ENABLED is not 1`.
- Scheduled wrapper fixture smoke passed with packaged CLI: dry-run review, backup proof, and proof-backed apply all completed in a temp directory without `src/`.
- Targeted Recall tests passed.
- Bundled CLI smoke still passes.
- Typecheck and lint passed.

## Remaining Gates

| Gate | Status | Why |
|---|---|---|
| Live SPIKE-013 enumeration | Blocked | Requires user-approved API key and controlled cards. |
| Live SPIKE-014 fidelity | Blocked | Requires API access and report privacy decision. |
| Production dry-run | Blocked | Must follow live spikes. |
| First capped apply | Pending | Requires live dry-run review, backup proof, cap approval, and Arun approval. |
| Timer enablement | Pending | Requires repeated clean manual runs and explicit approval. |

## Safety Notes

- Deploying these files is not the same as enabling the timer.
- The wrapper requires both sync and scheduler flags, so `BRAIN_RECALL_SYNC_ENABLED=1` for a manual apply does not automatically permit scheduled runs.
- Every scheduled apply runs a dry-run first, validates the dry-run report, creates and verifies backup proof, and then invokes the bundled Recall CLI with both dry-run proof and backup proof.
