# Recall Daily Snapshot Import - CLI Packaging Execution Report

Created: 2026-06-24 10:35 IST
Status: Offline production CLI/package gate complete; live Recall API gates still pending
Related PRD: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V2_2026-06-24_10-16-19_IST.md`
Related plan: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V2_2026-06-24_10-21-46_IST.md`

## Scope

This execution pass implemented the production-capable Recall sync CLI packaging path that was called out as a blocker in the revised implementation plan. It did not run live Recall API probes, did not use credentials, did not apply imports, did not install cron/systemd scheduling, and did not deploy to production.

## Implemented

| Area | Files | Result |
|---|---|---|
| Recall REST client | `src/lib/recall/client.ts`, `src/lib/recall/client.test.ts` | Implemented documented read-only `/cards` and `/cards/{card_id}` access with bearer auth, date filters, `max_chunks`, normalized `card_id`, mocked-fetch tests, and status-aware token-safe errors. |
| Production CLI | `scripts/sync-recall.ts` | Added dry-run/apply CLI. Defaults to dry-run. Apply requires `BRAIN_RECALL_SYNC_ENABLED=1` and `--confirm-apply`. Supports date windows, caps, max chunks, weak-upgrade opt-in, stale-lock recovery opt-in, fixture mode, env files, DB path, migrations dir, and redacted JSON output. |
| Bundling | `scripts/build-recall-cli.mjs`, `package.json`, `package-lock.json` | Added `esbuild` dev dependency and `npm run build:recall-cli`. Bundles `scripts/dist/sync-recall-prod.mjs` and packages SQL migrations under `scripts/dist/db/migrations`. Generated `scripts/dist/` remains ignored. |
| Bundle smoke | `scripts/smoke-recall-cli-bundle.mjs`, `package.json` | Added `npm run smoke:recall-cli:bundle`. Smoke copies the bundle and migrations into a temp directory with no `src/`, links production dependencies, runs `--help`, then runs a fixture dry-run against a temp SQLite DB. |
| Migration packaging hook | `src/db/client.ts` | Added `BRAIN_MIGRATIONS_DIR`; DB migration logs now go to stderr so CLI stdout remains parseable JSON. |
| Deploy packaging | `scripts/deploy.sh` | Deploy gate now builds and smokes the Recall CLI, then copies the bundled CLI and packaged migrations to `/opt/brain/scripts`. No scheduler is installed. |
| Tracker | `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Marked offline CLI/package path done and split remaining execution into live dry-run, first capped apply, and scheduler tasks. |

## Validation

Passed:

```bash
node --import tsx --test src/lib/recall/client.test.ts src/lib/recall/importer.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/sync-runner.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/security/redaction.test.ts src/lib/capture/quality.test.ts
npm run build:recall-cli
npm run smoke:recall-cli:bundle
npm run typecheck
```

Result summary:

- 33 targeted node tests passed.
- Recall CLI bundle built successfully.
- Bundle smoke proved the generated CLI can run a dry-run with packaged migrations in a directory with no `src/`.
- Typecheck passed.

## Known Non-Goals And Remaining Gates

| Gate | Status | Why |
|---|---|---|
| Live Recall REST enumeration | Blocked | Requires user-approved API-key handling and controlled sample cards. |
| Live Recall content fidelity | Blocked | Requires API access and approved evidence redaction policy. |
| Production dry-run against real Recall account | Blocked | Should run only after SPIKE-013/SPIKE-014 clarify API behavior. |
| First capped apply | Pending | Requires live dry-run, fresh backup, restore/integrity proof, and explicit approval. |
| Daily scheduler | Pending | Must remain disabled until manual apply is validated cleanly. |
| Production deploy | Pending | Deploy only after live gates, QA, and owner approval. |

## Next Recommended Commands After Approval

First re-run local package gates:

```bash
npm run build:recall-cli
npm run smoke:recall-cli:bundle
```

Then, after API-key/sample approval, run live spikes before production CLI dry-run:

```bash
RECALL_API_KEY=<redacted> node --import tsx scripts/spikes/recall-rest-enumeration.ts --date-from <iso> --date-to <iso>
```

Only after live API behavior is accepted, run the bundled CLI in dry-run mode:

```bash
RECALL_API_KEY=<redacted> node scripts/dist/sync-recall-prod.mjs --dry-run --date-from <iso> --date-to <iso> --max-cards 20 --max-imports 20
```

Do not run `--apply` until the first-apply backup and rollback checklist is complete.
