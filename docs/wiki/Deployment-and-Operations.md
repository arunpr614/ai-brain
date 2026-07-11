# Deployment and Operations

Purpose: Describe public-safe runtime, build/deploy, scheduling, health, monitoring and rollback concepts.
Audience: AI agents, contributors, and operators.
Verified against: `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`.
Runtime evidence through: 2026-07-10 at deployed application `6858529ef179a51442d319c6c58e5ace79757619`.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

The hosted Next.js standalone service runs unprivileged on loopback behind a managed edge. Instrumentation applies migrations and starts database backup, enrichment, transcript and conditional note-index workers plus batch cron. A separate persistent timer runs Recall import. Off-site database backup is separately scheduled.

## Release model

The guarded workflow checks toolchain/environment/private integration readiness, creates and integrity-checks a SQLite backup, runs code/document/provider gates, builds against isolated temporary data, synchronizes the standalone server/public/static artifacts, rebuilds native SQLite dependencies, restarts the service, then verifies authenticated health, providers, webhook boundaries and selected features. Exact commands/hosts/credentials remain private.

## Health and monitoring

Use service state/restarts, authenticated health, provider status, queue/backlog/lease state, error JSONL/system journal, Recall lock/checkpoint/redacted reports, backup evidence and client/webhook boundaries. These are owner-oriented operational signals, not centralized product analytics.

## Rollback and recovery

Rollback requires a known application artifact, configuration/flag state, database backup and migration compatibility. Feature flags can disable Note UI/processing/Focus but cannot reverse structural code or applied migrations. Preserve current data before restore. Use [Backups and Restore](Backups-and-Restore) and private operator context.

Operational coupling is significant: HTTP, workers, cron, backups and SQLite share one Node process/database. GitHub CI validates documentation but not the full product suite; release validation remains an explicit gate.

## Local status tooling

**Status:** Implemented operator support · **Confidence:** High for code, runtime Unknown · **Availability:** machine-dependent. Read-only shell-count and menu/status helpers summarize local service/queue or project state for the owner. They are not a hosted product dashboard, general analytics or guaranteed to exist on every machine. Begin with the local status/SwiftBar scripts and their static/unit checks; configuration is local tool/runtime availability. Keep output content-free and do not promote a local poll result into production evidence.
