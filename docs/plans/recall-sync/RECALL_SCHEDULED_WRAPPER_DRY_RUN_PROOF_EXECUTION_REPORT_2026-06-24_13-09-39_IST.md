# Recall Scheduled Wrapper Dry-Run Proof Execution Report

Created: 2026-06-24 13:09 IST
Status: Done for offline scope; scheduler remains disabled pending live validation and explicit approval
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Updated the disabled scheduled Recall wrapper so its eventual enabled path is dry-run-proof backed.

Before this change, `scripts/recall-scheduled-apply.sh` created backup proof and then invoked apply. Manual apply had already gained dry-run proof enforcement, but the future timer path still needed the same safety pattern. The wrapper now runs a scheduled dry-run, validates the dry-run report, creates backup proof, and invokes apply with both dry-run proof and backup proof.

No live Recall API call was made. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Scheduled wrapper | `scripts/recall-scheduled-apply.sh` | Adds scheduled dry-run report, dry-run report validator, proof-backed apply, env-driven optional fidelity/upgrade flags, and fixture mode for smoke testing. |
| Scheduler smoke | `scripts/smoke-recall-scheduled-wrapper.mjs` | Exercises the wrapper in a temp deployment-shaped directory with packaged CLI and no `src/`. |
| Static scheduler check | `scripts/check-recall-scheduler-artifacts.mjs` | Now verifies wrapper dry-run proof and report validation requirements. |
| Pre-live readiness gate | `scripts/check-recall-prelive-readiness.mjs` | Now runs `npm run smoke:recall-scheduler-wrapper` after bundled CLI build/smoke. |
| Production runbook | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Scheduler section now documents scheduled dry-run review and proof-backed apply behavior. |
| Project tracker | `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Added artifact, report, task, and next-action updates. |

## Scheduled Flow

When the timer is eventually enabled, the wrapper sequence is:

1. Require `BRAIN_RECALL_SYNC_ENABLED=1`.
2. Require `BRAIN_RECALL_SCHEDULER_ENABLED=1`.
3. Require `RECALL_API_KEY` unless `BRAIN_RECALL_FIXTURE_PATH` is supplied for smoke testing.
4. Run `scripts/sync-recall-prod.mjs --dry-run`.
5. Write `data/private/recall-live-spikes/scheduled-dry-run-<timestamp>.json`.
6. Validate the dry-run report with `scripts/check-recall-dry-run-report.mjs`.
7. Create backup proof with `scripts/recall-first-apply-preflight.mjs`.
8. Run `scripts/sync-recall-prod.mjs --apply --require-dry-run-proof --require-backup-proof`.
9. Write `data/private/recall-live-spikes/scheduled-apply-<timestamp>.json`.

Optional scheduled import policy remains env-gated:

- `BRAIN_RECALL_ALLOW_WEAK_UPGRADE_BY_URL=1`;
- `BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT=1`;
- `BRAIN_RECALL_ALLOW_TRUNCATED_IMPORT=1`;
- `BRAIN_RECALL_ALLOW_METADATA_ONLY_IMPORT=1`;
- `BRAIN_RECALL_WARNING_UI_AVAILABLE=1`.

## Validation Evidence

Static scheduler safety:

```text
npm run check:recall-scheduler
```

Result: passed.

Disabled wrapper smoke:

```text
BRAIN_DIR="$PWD" bash scripts/recall-scheduled-apply.sh
```

Result: exited `0` with `disabled: BRAIN_RECALL_SYNC_ENABLED is not 1`.

Scheduled wrapper packaged smoke:

```text
npm run build:recall-cli
npm run smoke:recall-scheduler-wrapper
```

Result:

```text
ok: scheduled wrapper runs dry-run review, backup proof, and proof-backed apply with packaged CLI
```

Pre-live readiness integration:

```text
npm run check:recall-prelive
```

Result: passed and included `scheduled_wrapper_smoke: passed`.

## Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| User-approved Recall API-key handling | Blocked | No key has been requested in chat or written to tracked files. |
| Private controlled sample manifest populated with real Recall card IDs | Blocked | Run the manifest form of `check:recall-prelive` once the file exists. |
| Live SPIKE-013/SPIKE-014 execution | Blocked | Use the combined runner after approval and pre-live readiness. |
| Production live dry-run | Blocked | Run only after live spike reports pass. |
| First capped production apply | Blocked | Requires reviewed dry-run, `PASS_APPLY_REVIEW_GATE`, enforced dry-run proof, backup proof, and explicit approval. |
| Timer enablement | Blocked | Requires repeated clean manual runs and explicit automation approval. |

## Operator Next Step

Keep the systemd timer disabled. After approved live spikes, live production dry-run, first capped apply, and repeated clean manual runs, rerun:

```text
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Then use the production runbook scheduler section for the explicit owner-approved enable sequence.
