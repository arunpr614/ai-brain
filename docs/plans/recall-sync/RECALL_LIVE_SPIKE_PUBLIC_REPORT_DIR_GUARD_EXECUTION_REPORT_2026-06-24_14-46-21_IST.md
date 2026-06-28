# Recall Live-Spike Public Report Directory Guard Execution Report

Created: 2026-06-24 14:46 IST
Owner: Codex
Status: Done for offline scope; live Recall execution remains blocked pending approval
Related tracker task: RDS-026aq0a

## Summary

Closed a live-runner safety gap: approved live SPIKE-013/SPIKE-014 runs now refuse report directories outside the public SPIKE report path, `docs/plans/spikes`. Fixture rehearsals can still write reports to temporary directories.

No live Recall API call, production dry-run, production apply, deployment, or scheduler enablement was performed.

## Files Changed

| File | Change |
|---|---|
| `scripts/run-recall-live-spikes.mjs` | Live mode now requires `--report-dir` to be `docs/plans/spikes` or a child directory and validates optional timestamps. |
| `scripts/smoke-recall-live-spikes.mjs` | Adds a negative live-mode smoke that proves invalid report directories fail before output directory creation and without leaking the API-key value. |
| `scripts/check-recall-approval-packet.mjs` | Adds the report-directory rule to approval-packet drift checks. |
| `docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_CHECKLIST_2026-06-24_14-00-43_IST.md` | Adds the public report-directory rule and stop condition. |
| `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` | Documents the live-vs-fixture report directory rule. |
| `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Documents that approved live reports stay under `docs/plans/spikes`. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Adds artifact, report, task, and next-action evidence. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md` | Adds current-state safety-gate evidence. |

## Behavior

Approved live mode:

- requires local `RECALL_API_KEY`;
- requires `--confirm-live-api` or `BRAIN_RECALL_CONFIRM_LIVE_API=1`;
- refuses `--report-dir` outside `docs/plans/spikes`;
- refuses malformed `--timestamp` values.

Fixture rehearsal mode:

- still requires both `--enumeration-fixture` and `--fidelity-fixture`;
- can write to temporary report directories;
- still runs the public privacy scanner on the generated reports.

## Validation

Focused validation passed:

```text
npm run smoke:recall-live-spikes
```

Observed result:

- manifest-driven SPIKE-013/SPIKE-014 fixture rehearsal still passed;
- unconfirmed live mode still failed before API work;
- mixed fixture/live mode still failed;
- invalid approved-live report directory failed before output directory creation;
- failure output did not include the API-key test value.

## Remaining Gates

The guard improves live-runner safety but does not clear the live blockers. Completion still requires:

1. approved API-key handling;
2. private controlled Recall sample manifest;
3. approved live SPIKE-013/SPIKE-014 run;
4. accepted live-spike report gate;
5. production dry-run and review;
6. first capped apply with backup proof;
7. production deploy;
8. scheduler enablement and first scheduled run verification.
