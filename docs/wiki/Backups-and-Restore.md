# Backups and Restore

Purpose: Document the public-safe backup model, recovery boundaries, and known coverage gap.
Audience: AI agents, maintainers, and operators.
Verified against: `ea7b159515fc37f76ffdb83dedf2d33d17f9a193`.
Runtime evidence through: Dated database backup and restore evidence exists; current operator state must be checked privately.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

**Status:** Implemented database backup; operator-oriented restore · **Confidence:** High

**Target user:** the authorized AI Brain maintainer/operator responsible for recoverability.

The application creates consistent SQLite snapshots locally and supports an encrypted off-site database backup workflow. Deployment performs a pre-release snapshot and integrity check. Restore is intentionally operator-controlled and private.

Known boundary: filesystem capture artifacts referenced by `capture_artifacts.relative_path` are outside SQLite and are not included in the database-only backup paths. A database restore can therefore recover artifact metadata without the corresponding file unless those files are protected separately.

Do not reconstruct or publish private credentials, destinations, host identifiers, or production-write commands from historical reports. Begin with `src/lib/backup.ts`, backup/restore scripts, deployment checks, and the owning private runbook.

## User/operator problem, entrypoints, and states

The owner needs recoverable database state before failure or release without exposing operational credentials. Entry points are instrumentation/local schedule, off-site schedule and guarded deployment/restore workflows. States are snapshot started/completed/pruned/failed; off-site upload and integrity evidence; restore candidate validated/rejected/applied; post-restore schema/count/health verification.

The operator journey is select authorized backup context → validate configuration/destination → create or identify snapshot → verify integrity/age → restore only under private authority → validate schema/counts/health. An empty candidate set blocks restore; loading/transfer state is not success.

## Architecture, data, security, and configuration

SQLite-aware snapshot logic in `src/lib/backup.ts` creates consistent database copies; scripts schedule encrypted off-site transfer and operator-controlled restore. Backups contain sensitive library/chat/note/settings data and require private destinations/keys/retention. They do not include filesystem capture artifacts. Restore is a production write with service/database/migration compatibility constraints and no public executable recipe.

## Tests, runtime evidence, operations, and impact

Protecting evidence includes backup module tests/release checks, pre-deploy integrity snapshots, dated off-site round-trip restore evidence at `90b6c616952d1482867797438abd68ad6e43dbd0`, and later deploy backup records. Historical success does not prove the newest snapshot. Any schema/artifact/retention change must update backup coverage and restore rehearsal. Pinned evidence: [current backup module](https://github.com/arunpr614/ai-brain/blob/23868faf13c8e3d0821715e6f5d0e3d2af1e1a34/src/lib/backup.ts).

Related current features are deployment, SQLite migrations, capture artifacts and Recall. Related improvement work includes complete artifact backup, stronger restore automation and centralized evidence; exact operator procedures remain private.
