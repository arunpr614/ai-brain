# Recall Dry-Run Report Review Gate Execution Report

Created: 2026-06-24 12:59 IST
Status: Done for offline scope; live Recall API execution and production apply still blocked pending approval
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Added a machine-readable dry-run report review gate before first production apply.

Before this change, the production runbook asked the operator to inspect the live dry-run JSON manually. That review remains mandatory, but now the report can also be checked with a command that returns `PASS_APPLY_REVIEW_GATE` or `DO_NOT_APPLY`.

No live Recall API call was made. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Dry-run report validator | `scripts/check-recall-dry-run-report.mjs` | Checks a redacted Recall dry-run JSON report before first apply. |
| Validator smoke | `scripts/smoke-recall-dry-run-report-check.mjs` | Proves clean reports pass and unsafe reports fail. |
| Package commands | `package.json` | Added `npm run check:recall-dry-run-report` and `npm run smoke:recall-dry-run-report`. |
| Pre-live readiness gate | `scripts/check-recall-prelive-readiness.mjs` | Now runs the dry-run validator smoke. |
| Production runbook | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Added the machine-review command after live dry-run and before first-apply backup/apply. |
| Project tracker | `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Added artifact, report, task, and next-action updates. |

## Default Pass Criteria

The validator passes only when all default checks hold:

- report is JSON from `sync-recall` dry-run mode;
- `state` is `done`;
- `exitCode` is `0`;
- `checkpointAdvanced` is `false`;
- `cardsImported` and `cardsUpgraded` are `0`;
- `cardsPlannedForImport` is under the approved cap, default `5`;
- no blocked cards, policy blocks, changed remote cards, weak upgrades, risky fidelity classes, obvious secret leaks, or raw payload fields are present.

Risky fidelity classes require explicit validator flags after approval:

- `--allow-unverified-fidelity`;
- `--allow-possibly-truncated-fidelity`;
- `--allow-metadata-only-fidelity`.

## Production Command

After live dry-run writes `data/private/recall-live-spikes/dry-run-report.json`:

```text
npm run check:recall-dry-run-report -- \
  --report data/private/recall-live-spikes/dry-run-report.json \
  --max-planned-imports 5 \
  --require-private-path \
  --require-cards-seen
```

Expected:

```text
verdict: PASS_APPLY_REVIEW_GATE
```

Any `DO_NOT_APPLY` result blocks first apply until the report is reviewed and the underlying issue is resolved.

## Validation Evidence

Validator smoke:

```text
npm run smoke:recall-dry-run-report
```

Result:

```text
ok: true
clean dry-run report passes
blocked fidelity report fails
checkpoint advancement fails
planned import cap fails
risky fidelity requires explicit validator allow flag
obvious secret leak fails
```

Help output:

```text
npm run check:recall-dry-run-report -- --help
```

Result: passed.

Missing report negative control:

```text
npm run check:recall-dry-run-report -- /tmp/does-not-exist-recall-dry-run.json
```

Result: exited with code `1` and verdict `DO_NOT_APPLY`.

Pre-live readiness integration:

```text
npm run check:recall-prelive
```

Result: passed and included `dry_run_report_review_gate: passed`.

## Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| User-approved Recall API-key handling | Blocked | No key has been requested in chat or written to tracked files. |
| Private controlled sample manifest populated with real Recall card IDs | Blocked | Run the manifest form of `check:recall-prelive` once the file exists. |
| Live SPIKE-013/SPIKE-014 execution | Blocked | Use the combined runner after approval and pre-live readiness. |
| Production live dry-run | Blocked | Run only after live spike reports pass. |
| First capped production apply | Blocked | Requires reviewed dry-run, `PASS_APPLY_REVIEW_GATE`, backup proof, and explicit approval. |

## Operator Next Step

After approved live SPIKE-013/SPIKE-014 and production dry-run, run the dry-run report validator before creating the first-apply backup:

```text
npm run check:recall-dry-run-report -- \
  --report data/private/recall-live-spikes/dry-run-report.json \
  --max-planned-imports 5 \
  --require-private-path \
  --require-cards-seen
```
