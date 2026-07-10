# Recall First-Apply Backup And Runbook Execution Report

Created: 2026-06-24 10:50 IST
Status: Offline first-apply safety gate complete; live production apply still blocked
Related runbook: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md`

## Scope

This pass implemented and documented first-apply backup proof and rollback readiness. It did not use Recall credentials, did not call the live Recall API, did not apply to production, did not enable a scheduler, and did not deploy.

## Implemented

| Area | Files | Result |
|---|---|---|
| Backup preflight | `scripts/recall-first-apply-preflight.mjs` | Creates a SQLite backup, runs `PRAGMA integrity_check` on the backup, copies it to a temp restore path, and verifies integrity again. |
| Apply guard | `scripts/sync-recall.ts` | Apply mode can now require backup proof via `--require-backup-proof` or `BRAIN_RECALL_REQUIRE_BACKUP_PROOF=1`; it verifies backup existence, freshness, and SQLite integrity before fetching/importing. |
| Bundle smoke | `scripts/smoke-recall-cli-bundle.mjs` | Smoke now proves bundled CLI can run both dry-run and backup-guarded apply in a deployment-shaped temp directory with no `src/`. |
| Deploy copy | `scripts/deploy.sh` | Deploy now copies `scripts/recall-first-apply-preflight.mjs` and `scripts/restore-from-backup.sh` alongside the bundled Recall CLI. |
| Package script | `package.json` | Added `npm run recall:first-apply:preflight` for operator discovery. |
| Production runbook | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Added env handling, schema smoke, live spike commands, dry-run, first-apply backup proof, capped apply, rollback, scheduler policy, redaction checks, and stop conditions. |

## Validation

Passed:

```bash
node scripts/recall-first-apply-preflight.mjs --db-path <temp-db> --backup-dir <temp-backup-dir> --json
BRAIN_RECALL_SYNC_ENABLED=1 BRAIN_RECALL_REQUIRE_BACKUP_PROOF=1 RECALL_API_KEY=<fake> node --import tsx scripts/sync-recall.ts --apply --confirm-apply --fixture <temp-fixture> --db-path <temp-run-db> --migrations-dir src/db/migrations --backup-path <temp-backup> --max-cards 1 --max-imports 1
node --import tsx --test src/lib/recall/fidelity.test.ts src/lib/recall/client.test.ts src/lib/recall/importer.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/sync-runner.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/security/redaction.test.ts src/lib/capture/quality.test.ts
npm run build:recall-cli
npm run smoke:recall-cli:bundle
npm run typecheck
npm run lint
```

Result summary:

- Temp backup preflight produced a backup and verified direct plus temp-restore integrity.
- Temp backup-guarded apply imported one synthetic Recall card and advanced checkpoint in an isolated temp DB.
- 38 targeted Recall tests passed.
- Bundled CLI smoke passed and now covers dry-run plus backup-guarded apply.
- Typecheck and lint passed.

## Remaining Gates

| Gate | Status | Why |
|---|---|---|
| Live REST enumeration | Blocked | Requires user-approved API-key handling and controlled Recall cards. |
| Live content fidelity | Blocked | Requires API access and evidence privacy decision. |
| Production dry-run | Blocked | Must follow SPIKE-013/SPIKE-014. |
| First production apply | Pending | Requires live dry-run review, fresh backup proof, explicit cap approval, and Arun approval. |
| Daily scheduler | Pending | Must remain disabled until manual apply is clean and reviewed. |

## Notes For Next Agent

- Use `scripts/recall-first-apply-preflight.mjs` for non-destructive backup proof. Do not use `scripts/restore-from-backup.sh` for proof because it is an actual restore tool.
- First apply should include both `BRAIN_RECALL_REQUIRE_BACKUP_PROOF=1` and `--require-backup-proof --backup-path <fresh-backup>`.
- The CLI only verifies that the referenced backup is fresh and valid; the operator/runbook must ensure it is the backup created immediately before the apply.
