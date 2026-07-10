# Deployment and Operations

Purpose: Describe runtime, backup, scheduling, health, and rollback concepts without executable production instructions.
Audience: AI agents and engineers diagnosing or preparing operational work.
Verified against: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`, `8178117c80923e5724e355fb2684cbc836013d39`, and production `8654f293d0f8615617df883e4703c0ca098a6029`.
Runtime evidence through: 2026-07-10; production application tree verified at `8654f293d0f8615617df883e4703c0ca098a6029`.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

## Runtime Model

The hosted Next.js standalone application runs under a system service. Separate service/timer artifacts drive Recall synchronization. Backup scheduling runs independently. The application, database, provider configuration, and remote-client endpoint form one operational unit but can fail separately.

Pinned source: [deployment script](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/scripts/deploy.sh), [service artifacts](https://github.com/arunpr614/ai-brain/tree/8178117c80923e5724e355fb2684cbc836013d39/scripts/deploy), and [backup module](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/backup.ts).

## Deployment Evidence

Public records tie UX v2 production behavior through Android attribution source `60d670741522a25db33545ee23fc2881774347e2`. The 2026-07-10 attached-notes release established a new complete application baseline: clean source `8654f293d0f8615617df883e4703c0ca098a6029`, authenticated health, strict Anthropic/Gemini reachability, migrations through 023, Recall timer continuity, exact vector repair, and a fully cleaned synthetic lifecycle.

## Backups and Restore

AI Brain uses SQLite-aware backups and an encrypted off-site backup path. Historical evidence records an off-site round-trip restore at release `90b6c616952d1482867797438abd68ad6e43dbd0`. A successful historical restore does not prove that the newest backup is usable.

Restore execution is W4. Public documentation describes prerequisites only: identify the target revision, preserve the current database, verify backup integrity and age, stop conflicting writers, restore transactionally, validate schema and counts, then smoke the application. Exact commands and destinations are private.

## Health and Observability

Operational checks distinguish:

- Service process state and restart count.
- Authenticated application health.
- Public redirect/auth behavior.
- Provider reachability and model configuration.
- Queue backlog and stuck jobs.
- Recall timer, lock, checkpoint, and latest redacted report.
- Backup completion and restore evidence.
- Client/Telegram reachability.

## Rollback Principles

Every authorized production change needs a known previous revision, compatible database state, current backup, decision owner, and post-rollback checks. Do not assume code rollback is sufficient after a migration or backfill. Do not use historical production commands when runtime identity is Unknown.

The attached-notes rollout adds three default-off gates for UI, writes, and semantic processing. First deployment applies schema with all three disabled. A content-free audit must classify chunks, row-id bridge, vec0 rows, allocator, integrity, and foreign keys before semantic writers are enabled. Repair is backup-confirmed, exact-audit-ID, allowlisted, and atomic; unexplained manifest drift blocks enablement. Rollback begins by disabling the three gates and may require purging manual-note vectors before a prolonged old-code rollback. Schema down-migration is not supported.

See [Command Safety](Command-Safety), [Security, Privacy, and Redaction](Security-Privacy-and-Redaction), and the private owner runbooks when available.
