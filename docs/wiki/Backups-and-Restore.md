# Backups and Restore

Purpose: Document the public-safe backup model, recovery boundaries, and known coverage gap.
Audience: AI agents, maintainers, and operators.
Verified against: Deployed protected-main release `167a15d57b8f70574a017ea4cda507870f3600d4`, including the NotebookLM backup/restore hardening.
Runtime evidence through: Historical dated database backup/restore evidence plus the 2026-07-22 release-smoke proof, scrubbed pre-deploy production backup, migration 026 deployment, and healthy NotebookLM retention/operations timers. Provider queueing and writes remain off.
Last reviewed: 2026-07-22.
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

NotebookLM adds a second privacy and duplicate-safety boundary. Every supported backup path creates raw SQLite bytes only in an identity-specific owner-only `tmpfs` stage, clears frozen export title/body and leases, normalizes interrupted export work back to claimable recovery, securely vacuums, and publishes only the sanitized copy. The application worker and the independent mutating `brain-notebooklm-retention.timer` enforce cleanup; the similarly named `brain-notebooklm-operations.timer` is read-only and never purges.

The hardened restore stops application writers, both NotebookLM timers, and any running retention oneshot before publication. It rejects snapshots predating migration 026 because they cannot carry the required durable duplicate-safety latch. A schema-026 restore is published with provider writes blocked as `restore_reconciliation_required`; ordinary restart, deployment, protocol recovery, and generic settings reset cannot clear it. Before any future clear, the owner must reconcile the exact bound owner-only private NotebookLM target against all sources/markers that may postdate the backup and preserve redacted evidence of backup time/hash, target-binding fingerprint, inspection time, and dispositions. No approved unblock command exists in this release; a separately reviewed feature-aware command is required. Direct SQLite edits are not an approved recovery interface. After restarting `brain`, explicitly enable/start and verify both NotebookLM timers, then execute the retention oneshot and require `Result=success`; these retention/audit steps do not clear the provider-write latch. The public NotebookLM entrance (`https://notebooklm.google/`) is not the bound target: reconciliation concerns the exact signed-in app notebook under `https://notebooklm.google.com/`, and its raw URL/identifiers remain private.

## Tests, runtime evidence, operations, and impact

Protecting evidence includes backup module tests/release checks, pre-deploy integrity snapshots, dated off-site round-trip restore evidence at `90b6c616952d1482867797438abd68ad6e43dbd0`, and later deploy backup records. The 2026-07-22 NotebookLM deployment began from a scrubbed, integrity-checked backup and execution-proved the immutable retention fallback without enabling queueing or provider writes. The subsequent UI-only verification produced two content-free view events, so the database is no longer eligible for the narrowly allowed pre-026 binary rollback state; safe feature rollback keeps a schema-026-aware runtime and turns the feature tuple off. Historical success does not prove the newest snapshot. Any schema/artifact/retention change must update backup coverage and restore rehearsal. Pinned evidence: [deployed backup module](https://github.com/arunpr614/ai-brain/blob/167a15d57b8f70574a017ea4cda507870f3600d4/src/lib/backup.ts).

Related current features are deployment, SQLite migrations, capture artifacts and Recall. Related improvement work includes complete artifact backup, stronger restore automation and centralized evidence; exact operator procedures remain private.
