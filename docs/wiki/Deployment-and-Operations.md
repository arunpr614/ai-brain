# Deployment and Operations

Purpose: Describe public-safe runtime, build/deploy, scheduling, health, monitoring and rollback concepts.
Audience: AI agents, contributors, and operators.
Verified against: deployed application `8c1341100b174fe4ca518e6a745c30b9078df21c`.
Runtime evidence through: 2026-07-21 Recall backup-permission incident diagnosis.
Last reviewed: 2026-07-21.
Owner: AI Brain maintainer.

The hosted Next.js standalone service runs unprivileged on loopback behind a managed edge. Instrumentation applies migrations and starts database backup, enrichment, transcript and conditional note-index workers plus batch cron. A separate persistent timer runs Recall import, and the deployed manual Recall path/timer/service units use a distinct trusted identity. Off-site database backup is separately scheduled.

## Release model

The current immutable release workflow accepts only protected-main GitHub-hosted artifacts with verified build provenance. It binds the candidate to the canonical production database, creates and restores-checks a SQLite backup, verifies every runtime/native/migration/file hash, stages builder-pinned tools, installs immutable runtime directories, switches the current link atomically, and restores the complete prior release/timer state on failure. The candidate holds one release lock across application and Recall artifact switches. Exact commands, hosts, and credentials remain private.

`/opt/brain/data/backups` is shared by application/release backups and the guarded Recall pre-apply backup. Its required contract is owner `brain`, group `brain-data`, mode `2770`. Release paths must preserve that contract and prove file creation as `brain-recall`; owner-only mode breaks both automatic and manual Recall apply after a successful dry run.

Card Processing adds a deep readiness audit at deploy, startup, and every six hours. Its production rollout enables reads, then writes, then navigation, with health/readiness/integrity/journal observation windows after each stage. The verified release applied migration 025, retained all 129 historical items dormant, enrolled one selected legacy item as a bounded proof, exercised the synthetic lifecycle, and kept the audit timer active.

### Recall manual-sync enablement gate

The manual control and daily timer are deployed. Repository review proves unit wiring, private-path intent, full-wrapper reuse, process races/crashes, and timer-state invariants with isolated fixtures, but actual host permissions remain a release invariant. The 2026-07-21 incident confirmed that an unrelated immutable deployment changed the shared backup directory to owner-only access and blocked every later apply. The hotfix restores the shared-group contract and adds release-time worker probes; production repair and a controlled recovery run remain separately authorized operations.

## Health and monitoring

Use service state/restarts, authenticated health, provider status, queue/backlog/lease state, error JSONL/system journal, Recall request/execution/core-run state, lock/checkpoint/redacted reports, backup evidence and client/webhook boundaries. These are owner-oriented operational signals, not centralized product analytics. An active timer or latest unit result of `success` does not prove Recall success: require a terminal `done` execution with final wrapper validation and a linked apply run.

## Rollback and recovery

Rollback requires an attested known application artifact, configuration/flag state, database backup, and migration compatibility. Card Processing first disables navigation, writes, and reads. The installed pre-feature known-good runtime can operate on schema 025 only with its explicit compatibility guard; restore is a last resort because later writes would be lost. Preserve current data before restore. Use [Backups and Restore](Backups-and-Restore) and private operator context.

Operational coupling is significant: HTTP, workers, cron, backups and SQLite share one Node process/database. GitHub CI validates documentation but not the full product suite; release validation remains an explicit gate.

## Local status tooling

**Status:** Implemented operator support · **Confidence:** High for code, runtime Unknown · **Availability:** machine-dependent. Read-only shell-count and menu/status helpers summarize local service/queue or project state for the owner. They are not a hosted product dashboard, general analytics or guaranteed to exist on every machine. Begin with the local status/SwiftBar scripts and their static/unit checks; configuration is local tool/runtime availability. Keep output content-free and do not promote a local poll result into production evidence.
