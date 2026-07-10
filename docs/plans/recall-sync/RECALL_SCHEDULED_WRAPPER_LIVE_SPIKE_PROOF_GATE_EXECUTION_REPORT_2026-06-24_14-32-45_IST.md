# Recall Scheduled Wrapper Live-Spike Proof Gate Execution Report

Created: 2026-06-24 14:32 IST
Owner: Codex
Status: Done for offline scope; live Recall and production scheduler remain blocked pending approval
Related tracker task: RDS-026aq5

## Summary

The manual production Recall CLI could already require accepted SPIKE-013/SPIKE-014 reports before dry-run/apply. This change closes the matching future scheduler gap: the dormant scheduled wrapper now honors `BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF=1` and refuses to proceed unless both live-spike report paths are present.

No live Recall API call, production dry-run, production apply, deployment, or scheduler enablement was performed.

## Files Changed

| File | Change |
|---|---|
| `scripts/recall-scheduled-apply.sh` | Adds optional live-spike proof arguments for scheduled dry-run and scheduled apply. |
| `scripts/smoke-recall-scheduled-wrapper.mjs` | Copies the live-spike report checker into the temp packaged environment, creates synthetic accepted SPIKE reports, proves missing proof paths fail, and proves valid proof permits fixture dry-run/apply. |
| `scripts/check-recall-scheduler-artifacts.mjs` | Adds static assertions that the wrapper honors proof env vars and passes SPIKE-013/SPIKE-014 proof flags. |
| `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Documents scheduler live-spike proof mode and keeps it disabled by default. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Adds artifact, report, task, and next-action evidence. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md` | Adds current-state completion evidence for scheduled proof enforcement. |

## Behavior

When `BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF=1`:

1. `scripts/recall-scheduled-apply.sh` requires `BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH`.
2. It also requires `BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH`.
3. Missing paths fail with exit code 2 before private report directories are created.
4. Valid paths are passed to the packaged CLI for both scheduled dry-run and scheduled apply.
5. Optional fidelity-change acceptance can be passed through with:
   - `BRAIN_RECALL_LIVE_SPIKE_ALLOW_FIDELITY_CHANGES=1`
   - `BRAIN_RECALL_LIVE_SPIKE_ACCEPTED_FIDELITY_RISK=<review note>`
6. Report freshness defaults to 1440 minutes unless `BRAIN_RECALL_LIVE_SPIKE_REPORT_MAX_AGE_MINUTES` is set.

When `BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF=0`, the scheduled wrapper keeps the prior dry-run proof and backup proof behavior.

## Validation

Validation passed:

```text
npm run check:recall-scheduler
npm run build:recall-cli
npm run smoke:recall-scheduler-wrapper
npm run smoke:recall-cli:bundle
npm run smoke:recall-live-spike-reports
npm run check:recall-approval-packet
npm run check:recall-prelive
npm run lint
npm run typecheck
find data/private/recall-live-spikes -maxdepth 1 \( -name '*status-smoke*.json' -o -name 'controlled-samples-init-smoke-*.json' -o -name 'controlled-samples-status-smoke-*.json' -o -name 'recall-env-init-smoke-*.env' \) -print
```

Observed result:

- static scheduler guard passed;
- packaged CLI rebuilt;
- bundled CLI smoke still passed for manual live-spike proof plus dry-run/backup proof;
- live-spike report gate smoke still passed blocker, accepted-change, and privacy-leak cases;
- approval packet consistency still passed across checklist, operating packet, runbook, audit, tracker, and package scripts;
- consolidated pre-live gate passed and included the updated scheduled-wrapper smoke;
- scheduled wrapper smoke rejected unconfirmed live mode;
- scheduled wrapper smoke rejected missing live-spike proof paths before creating `data/private/recall-live-spikes`;
- scheduled wrapper smoke completed fixture dry-run/apply with accepted synthetic SPIKE reports, dry-run proof, and backup proof.
- lint passed;
- typecheck passed;
- private smoke-file cleanup check printed no paths.

## Remaining Gates

This is an offline scheduler safety improvement only. Completion still requires:

1. approved API-key handling;
2. private controlled Recall sample manifest;
3. approved live SPIKE-013/SPIKE-014 run;
4. accepted live-spike report gate;
5. production dry-run and review;
6. first capped apply with backup proof;
7. production deploy;
8. repeated clean manual runs;
9. explicit scheduler enablement approval and first scheduled run verification.
