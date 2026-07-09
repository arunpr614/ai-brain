# Recall Daily Snapshot Import - Run Report Persistence Execution Report

Created: 2026-06-24 10:40 IST
Status: Offline durable run-report gate complete; live Recall API gates still pending
Related PRD: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V2_2026-06-24_10-16-19_IST.md`
Related plan: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V2_2026-06-24_10-21-46_IST.md`

## Scope

This execution pass closed the persistent run-report privacy gap called out in the revised implementation plan. It did not run live Recall API probes, did not use credentials, did not apply imports, did not enable scheduling, and did not deploy.

## Implemented

| Area | Files | Result |
|---|---|---|
| Run table fidelity | `src/db/migrations/020_recall_sync.sql`, `src/db/migrations/020_recall_sync.test.ts` | `recall_sync_runs` now supports `blocked` state plus upgraded and changed-remote counters, matching the runner report shape. Migration test verifies blocked rows and new counters. |
| Run persistence helpers | `src/db/recall-sync.ts` | Added typed `insertRecallSyncRun`, `getRecallSyncRun`, and `listRecallSyncRuns` helpers. |
| Runner persistence | `src/lib/recall/sync-runner.ts` | `runRecallSync` now persists a redacted run summary by default for done, error, and blocked outcomes. Callers can opt out with `persistRunReport: false`. |
| Redaction proof | `src/lib/recall/sync-runner.test.ts` | Added coverage proving stored `last_error` and `report_json` redact a Recall bearer/API-key shaped secret before persistence. |
| Blocked run proof | `src/lib/recall/sync-runner.test.ts` | Extended cap-block test to verify persisted `blocked` row, blocked count, and zero imports. |

## Validation

Passed:

```bash
node --import tsx --test src/lib/recall/client.test.ts src/lib/recall/importer.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/sync-runner.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/security/redaction.test.ts src/lib/capture/quality.test.ts
npm run build:recall-cli
npm run smoke:recall-cli:bundle
npm run typecheck
npm run lint
```

Result summary:

- 34 targeted node tests passed.
- Recall CLI bundle rebuilt successfully after the persistence changes.
- Bundle smoke still proves the generated CLI can run a dry-run with packaged migrations in a directory with no `src/`.
- Typecheck and lint passed.

## Remaining Gates

| Gate | Status | Why |
|---|---|---|
| Live Recall REST enumeration | Blocked | Requires user-approved API-key handling and controlled sample cards. |
| Live Recall content fidelity | Blocked | Requires API access and approved evidence redaction policy. |
| Production dry-run against real Recall account | Blocked | Should run only after SPIKE-013/SPIKE-014 clarify API behavior. |
| First capped apply | Pending | Requires live dry-run, fresh backup, restore/integrity proof, and explicit approval. |
| Daily scheduler | Pending | Must remain disabled until manual apply is validated cleanly. |

## Notes For Next Agent

- `recall_sync_runs.report_json` now stores redacted summaries only; do not add raw Recall payloads, chunk bodies, titles, bearer headers, signed URLs, or stack traces to the report object.
- If future live testing needs richer evidence, write private raw evidence under ignored `data/private/recall-live-spikes/` and keep public docs redacted.
- Because migration 020 is still undeployed Recall work, its table shape was updated in place. If production or a long-lived local DB ever applies an earlier version of migration 020, create a follow-up migration instead of editing history.
