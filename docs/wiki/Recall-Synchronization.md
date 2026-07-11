# Recall Synchronization

Purpose: Document the guarded Recall daily import architecture and its limits.
Audience: AI agents and operators changing the integration.
Verified against: `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`.
Runtime evidence through: 2026-07-10; the daily timer was recorded active, not directly re-probed here.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

**Status:** Partially implemented · **Confidence:** High · **Availability:** Configured external timer

The daily runner acquires a lock, overlaps the checkpoint window, enumerates bounded Recall records, maps content, classifies fidelity, enforces record/content/action caps, and produces dry-run or apply reports. Apply blocks unapproved fidelity and changed-remote cases, imports new items or upgrades weak same-URL items, persists run/item state, and advances the checkpoint only after a safe complete run.

It is a one-way guarded import, not general two-way synchronization. There is no broad user-facing sync management UI. A dated active timer does not prove every later run succeeded; inspect private run evidence and current state before operational actions.

Primary files: `src/lib/recall/`, `src/db/recall-sync.ts`, migration `020`, packaged runner/build scripts, service/timer definitions and tests.

## User problem, entrypoint, and states

The owner needs bounded daily ingestion from an external library without silent fidelity loss or overwriting changed remote records. The operator timer invokes the packaged runner; there is no general user UI.

| State | Behavior |
|---|---|
| Empty enumeration | Records a safe no-change result; checkpoint behavior follows complete-run policy |
| Loading/running | Holds the durable lock and reports bounded progress without claiming success |
| Disabled/not configured | Runner refuses apply; no implied sync |
| Dry run | Enumerates/maps/classifies and reports without product writes |
| Safe apply | Imports new or upgrades approved weak same-URL items, then advances checkpoint |
| Blocked | Fidelity/cap/approval/changed-remote/lock/key evidence prevents writes |
| Partial/failure | Run/item state persists; checkpoint does not advance as complete |

## Architecture, data, security, and configuration

Client → mapper → fidelity policy → importer → sync runner/scheduler. `recall_sync_state`, `runs` and `items` preserve checkpoint, lock and outcomes; imported content enters normal item/artifact/enrichment/index flows. External credentials, enable/apply flags, caps, overlap window, lock/report paths and approval evidence are private configuration. The feature is broad Partially implemented as “synchronization,” but the narrower one-way guarded daily-import contract is implemented and flag-controlled.

## Tests, operations, and impact

Protecting tests: Recall client, fidelity, importer, scheduler and sync-runner suites plus migration `020` and packaged script smoke/checks. Operational proof is dated: an enabled/active timer does not prove each later run. Changes can cause duplicate/lost imports, checkpoint corruption, fidelity regression, source attribution or production writes; start with dry-run and synthetic fixtures. Pinned evidence: [current Recall source](https://github.com/arunpr614/ai-brain/tree/23868faf13c8e3d0821715e6f5d0e3d2af1e1a34/src/lib/recall).

Related current features are capture provenance, quality/repair, enrichment, search and backups. Related ideas include general two-way synchronization and Markdown/Obsidian adoption; neither is part of the current contract.
