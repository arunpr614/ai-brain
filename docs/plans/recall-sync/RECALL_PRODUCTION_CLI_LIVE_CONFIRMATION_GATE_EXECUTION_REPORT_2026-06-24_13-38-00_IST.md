# Recall Production CLI Live Confirmation Gate Execution Report

Created: 2026-06-24 13:38 IST
Status: Done and validated for offline scope; no live Recall API call made
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Added explicit live API confirmation to the production Recall sync CLI and scheduled wrapper.

Before this change, `scripts/sync-recall.ts` required a Recall API key for non-fixture mode, but a shell containing `RECALL_API_KEY` could still run a live dry-run. The CLI now refuses non-fixture mode unless `--confirm-live-api` or `BRAIN_RECALL_CONFIRM_LIVE_API=1` is present after approval. The scheduled wrapper also refuses non-fixture live mode unless `BRAIN_RECALL_CONFIRM_LIVE_API=1` is set.

No live Recall API call was made. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Production CLI | `scripts/sync-recall.ts` | Adds `--confirm-live-api` and `BRAIN_RECALL_CONFIRM_LIVE_API=1` live-mode gate. |
| Packaged CLI smoke | `scripts/smoke-recall-cli-bundle.mjs` | Proves non-fixture dry-run with a fake key fails before live API work unless confirmation is present. |
| Scheduled wrapper | `scripts/recall-scheduled-apply.sh` | Requires `BRAIN_RECALL_CONFIRM_LIVE_API=1` for future non-fixture scheduled live mode and passes `--confirm-live-api` into the bundled CLI. |
| Scheduled wrapper smoke | `scripts/smoke-recall-scheduled-wrapper.mjs` | Proves the future enabled live path rejects a fake-key run without confirmation before report directories are created, then proves fixture dry-run/proof/apply still works. |
| Static scheduler check | `scripts/check-recall-scheduler-artifacts.mjs` | Verifies the wrapper includes the live confirmation guard and CLI flag. |
| Production runbook | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Manual dry-run/apply examples and future scheduler enablement now include explicit live confirmation. |
| Project tracker | `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Adds production CLI live confirmation as a completed offline-scope hardening task. |

## Safety Behavior

- Fixture mode still works without `RECALL_API_KEY` and without live confirmation.
- Non-fixture dry-run refuses to run with only `RECALL_API_KEY`.
- Non-fixture apply still requires `BRAIN_RECALL_SYNC_ENABLED=1`, `--confirm-apply`, backup/dry-run proof when configured, and now live API confirmation.
- Future scheduled live mode requires both scheduler enable flags and `BRAIN_RECALL_CONFIRM_LIVE_API=1`.
- The failure message is redacted and does not print the API key value.

## Validation Evidence

Actual validation run on 2026-06-24:

```text
npm run build:recall-cli
npm run smoke:recall-cli:bundle
npm run check:recall-scheduler
BRAIN_DIR="$PWD" bash scripts/recall-scheduled-apply.sh
npm run smoke:recall-scheduler-wrapper
npm run check:recall-prelive
npm run lint
npm run typecheck
node --import tsx --test src/lib/recall/fidelity.test.ts src/lib/recall/importer.test.ts src/lib/recall/sync-runner.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/client.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/security/redaction.test.ts src/lib/capture/quality.test.ts
find data/private/recall-live-spikes -maxdepth 1 \( -name '*status-smoke*.json' -o -name 'controlled-samples-init-smoke-*.json' -o -name 'controlled-samples-status-smoke-*.json' \) -print
```

Observed results:

- packaged CLI build passed and wrote `scripts/dist/sync-recall-prod.mjs`;
- bundled CLI smoke passed, including the unconfirmed non-fixture live dry-run refusal and fixture dry-run/apply path;
- static scheduler check passed and validates the wrapper confirmation guard;
- disabled wrapper exited harmlessly with `BRAIN_RECALL_SYNC_ENABLED is not 1`;
- scheduled wrapper smoke passed; it rejects unconfirmed live mode before report-directory creation, then passes fixture dry-run review, backup proof, and proof-backed apply;
- pre-live readiness passed without a manifest and kept the live manifest/API gate explicit;
- lint and typecheck passed;
- focused Recall/security/capture tests passed: 46 pass, 0 fail;
- private smoke temp-file check printed no lingering files.

## Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| User-approved Recall API-key handling | Blocked | Still required before any live API command. |
| Private controlled sample manifest populated with real Recall card IDs | Blocked | Required before live SPIKE-013/SPIKE-014. |
| Production live dry-run/apply | Blocked | Must use `--confirm-live-api` only after approval and live spike gates. |
| Scheduler enablement | Blocked | Must keep disabled until repeated clean manual runs and explicit automation approval. |
