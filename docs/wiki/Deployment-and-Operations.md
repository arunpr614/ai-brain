# Deployment and Operations

Purpose: Describe public-safe runtime, build/deploy, scheduling, health, monitoring and rollback concepts.
Audience: AI agents, contributors, and operators.
Verified against: deployed application `167a15d57b8f70574a017ea4cda507870f3600d4`.
Runtime evidence through: 2026-07-22 protected-main NotebookLM dark/UI-only deployment verification.
Last reviewed: 2026-07-22.
Owner: AI Brain maintainer.

The hosted Next.js standalone service runs unprivileged on loopback behind a managed edge. Instrumentation applies migrations and starts database backup, enrichment, transcript and conditional note-index workers plus batch cron. Separate persistent timers run Recall import, the NotebookLM operations gate, and the independent NotebookLM retention writer; the deployed manual Recall path/timer/service units use a distinct trusted identity. Off-site database backup is separately scheduled.

## Release model

The current immutable release workflow accepts only protected-main GitHub-hosted artifacts with verified build provenance. It binds the candidate to the canonical production database, creates and restores-checks a SQLite backup, verifies every runtime/native/migration/file hash, stages builder-pinned tools, installs immutable runtime directories, switches the current link atomically, and restores the complete prior release/timer state on failure. The candidate holds one release lock across application and Recall artifact switches. Exact commands, hosts, and credentials remain private.

`/opt/brain/data/backups` is shared by application/release backups and the guarded Recall pre-apply backup. Its required contract is owner `brain`, group `brain-data`, mode `2770`. Release paths must preserve that contract and prove file creation as `brain-recall`; owner-only mode breaks both automatic and manual Recall apply after a successful dry run.

Card Processing adds a deep readiness audit at deploy, startup, and every six hours. Its production rollout enables reads, then writes, then navigation, with health/readiness/integrity/journal observation windows after each stage. Its retained rollout evidence covers migration 025, 129 dormant historical items, one bounded legacy-item proof, the synthetic lifecycle, and the active audit timer. The current protected-main release additionally applies migration 026 for NotebookLM export.

### NotebookLM export rollout gate

The protected-main server release and migration 026 are deployed, with the operations and durable-retention timers enabled and healthy. The current rollout is experimental UI-only: UI/queue/provider flags are `1:0:0`, so setup and read-only status can be observed but no new export can enter the queue and no provider create can be authorized. The attested extension 0.7.0 is stable-installed but not loaded or paired. A fixed private target, signed-in synthetic provider canary, and owner-only real-content enablement remain pending.

### Recall manual-sync enablement gate

The manual control and daily timer are deployed. Repository review proves unit wiring, private-path intent, full-wrapper reuse, process races/crashes, and timer-state invariants with isolated fixtures, but actual host permissions remain a release invariant. The 2026-07-21 incident confirmed that an unrelated immutable deployment changed the shared backup directory to owner-only access and blocked every later apply. The hotfix restores the shared-group contract and adds release-time worker probes; production repair and a controlled recovery run remain separately authorized operations.

## Health and monitoring

Use service state/restarts, authenticated health, provider status, queue/backlog/lease state, error JSONL/system journal, Recall request/execution/core-run state, NotebookLM runtime/retention control and content-free operations evidence, lock/checkpoint/redacted reports, backup evidence and client/webhook boundaries. These are owner-oriented operational signals, not centralized product analytics. An active timer or latest unit result of `success` does not prove Recall success: require a terminal `done` execution with final wrapper validation and a linked apply run. Likewise, healthy NotebookLM timers do not prove provider delivery; require an explicit private synthetic canary and reconciled terminal source state.

## Rollback and recovery

Rollback requires an attested known application artifact, configuration/flag state, database backup, and migration compatibility. Card Processing first disables navigation, writes, and reads; NotebookLM first disables provider writes, queue acceptance, and UI. An audited pre-026 runtime may cross the additive migration only while NotebookLM request/connector/target state is absent and runtime-control/retention state is proven pristine. The current post-UI database already has two content-free `notebooklm.export_viewed` operational events, so it is ineligible for pre-026 rollback; the safe current rollback is schema-026-aware with NotebookLM flags off. Restore is a last resort because later writes would be lost. Preserve current data before restore. Use [Backups and Restore](Backups-and-Restore) and private operator context.

Operational coupling is significant: HTTP, workers, cron, backups and SQLite share one Node process/database. GitHub CI validates documentation but not the full product suite; release validation remains an explicit gate.

## Local status tooling

**Status:** Implemented operator support · **Confidence:** High for code, runtime Unknown · **Availability:** machine-dependent. Read-only shell-count and menu/status helpers summarize local service/queue or project state for the owner. They are not a hosted product dashboard, general analytics or guaranteed to exist on every machine. Begin with the local status/SwiftBar scripts and their static/unit checks; configuration is local tool/runtime availability. Keep output content-free and do not promote a local poll result into production evidence.
