# Recall Apply Dry-Run Proof Gate Execution Report

Created: 2026-06-24 13:05 IST
Status: Done for offline scope; live Recall API execution and production apply still blocked pending approval
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Added apply-time dry-run proof enforcement to the Recall production CLI.

The previous dry-run report validator made the production runbook safer, but the apply command itself could still be invoked without proving that a reviewed dry-run report existed. This change adds a CLI-level proof gate: when `--require-dry-run-proof` or `BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=1` is set, apply refuses to run unless a fresh dry-run report is supplied and passes conservative checks.

No live Recall API call was made. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Apply CLI | `scripts/sync-recall.ts` | Added `--require-dry-run-proof`, `--dry-run-report-path`, proof freshness, date-window, planned-import, policy-block, changed-remote, weak-upgrade, and fidelity-class checks. |
| Bundle smoke | `scripts/smoke-recall-cli-bundle.mjs` | Now proves missing dry-run proof fails and proof-backed apply passes in the packaged CLI. |
| Deploy script | `scripts/deploy.sh` | Copies `scripts/check-recall-dry-run-report.mjs` to production for the standalone runbook command. |
| Production runbook | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | First-apply command now sets `BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=1` and passes dry-run proof flags. |
| Project tracker | `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Added artifact, report, task, and next-action updates. |

## Apply Proof Rules

When dry-run proof is required, apply fails unless:

- `--dry-run-report-path` exists and is fresh;
- report JSON has `mode = dry_run`, `state = done`, and `exitCode = 0`;
- `checkpointAdvanced` is `false`;
- `cardsImported` and `cardsUpgraded` are `0`;
- if apply passes `--date-from` and `--date-to`, the dry-run report has the same normalized ISO window;
- `cardsPlannedForImport` is under the approved cap;
- no blocked cards, policy blocks, changed remote cards, or unknown fidelity classes are present;
- weak upgrades are present only when apply also passes `--allow-weak-upgrade-by-url`;
- risky fidelity classes are present only when apply passes the matching explicit import flag.

## Production Apply Command Shape

```text
BRAIN_RECALL_SYNC_ENABLED=1 \
BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=1 \
BRAIN_RECALL_REQUIRE_BACKUP_PROOF=1 \
node scripts/sync-recall-prod.mjs \
  --apply \
  --confirm-apply \
  --require-dry-run-proof \
  --dry-run-report-path data/private/recall-live-spikes/dry-run-report.json \
  --dry-run-report-max-planned-imports 5 \
  --dry-run-report-require-cards-seen \
  --require-backup-proof \
  --backup-path <backupPath-from-preflight> \
  --max-imports 5
```

## Validation Evidence

CLI help:

```text
node scripts/sync-recall.ts --help
```

Result: passed and includes the dry-run proof flags.

Typecheck:

```text
npm run typecheck
```

Result: passed.

Packaged CLI build and smoke:

```text
npm run build:recall-cli
npm run smoke:recall-cli:bundle
```

Result:

```text
ok: bundled CLI runs dry-run and dry-run-proof/backup-guarded apply with packaged migrations and no src/
```

The smoke specifically verifies:

- apply with `--require-dry-run-proof` and no report path exits with config error before writes;
- a dry-run with explicit unverified import approval can write a proof report;
- apply with matching explicit unverified import approval, fresh dry-run proof, and backup proof succeeds in the packaged CLI.

## Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| User-approved Recall API-key handling | Blocked | No key has been requested in chat or written to tracked files. |
| Private controlled sample manifest populated with real Recall card IDs | Blocked | Run the manifest form of `check:recall-prelive` once the file exists. |
| Live SPIKE-013/SPIKE-014 execution | Blocked | Use the combined runner after approval and pre-live readiness. |
| Production live dry-run | Blocked | Run only after live spike reports pass. |
| First capped production apply | Blocked | Requires reviewed dry-run, `PASS_APPLY_REVIEW_GATE`, enforced dry-run proof, backup proof, and explicit approval. |

## Operator Next Step

After approved live SPIKE-013/SPIKE-014 and live production dry-run, run the report validator, create backup proof, then use the updated first-apply command from the production runbook. The apply command should keep both proof requirements enabled.
