# AI Agent Start Here

Purpose: Establish a safe, evidence-first workflow for understanding and changing AI Brain.
Audience: AI agents and engineers entering the repository.
Verified against: `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`.
Runtime evidence through: 2026-07-10 at `6858529ef179a51442d319c6c58e5ace79757619`; current runtime must be verified separately.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

## Recommended reading order

1. [Source Baselines and Status](Source-Baselines-and-Status)
2. [Feature Catalog](Feature-Catalog)
3. The relevant detailed feature page
4. [Architecture Overview](System-Architecture) and [Feature Architecture](Feature-Architecture)
5. [Repository Map](Repository-Map), [Data Model](Data-Model), and [APIs and Integrations](APIs-and-Integrations)
6. [Local Development and Testing](Local-Development-and-Testing), [Command Safety](Command-Safety), and [Known Limitations](Known-Limitations-and-Technical-Debt)

## System invariants

- AI Brain is private and single-owner.
- Original source, generated digest, standalone note item, and attached My notes are separate layers.
- Capture provenance and quality survive repair and reprocessing.
- Save, enrichment, embedding, transcript, and note-index state can fail independently.
- Migrations are append-only historical records; order is by full filename, not numeric prefix alone.
- Production writes require current private context and explicit authority.
- Historical Feature Council pages are planning evidence, not implementation proof.

## Repository orientation

- `src/app/`: pages, routes, and server actions.
- `src/components/`: interactive UI and attached-note editor.
- `src/lib/`: domain behavior, providers, integrations, and policy.
- `src/db/`: persistence and migrations.
- `android/` and `extension/`: non-web clients.
- `scripts/`: build, validation, and guarded operational tooling.
- `docs/wiki/`: canonical wiki source.

## Before editing

Confirm the worktree/branch and baseline, preserve existing changes, locate the feature catalog row, trace UI/client → action/API → domain → database → jobs/integrations, and select the smallest relevant tests. Check [Command Safety](Command-Safety) before any script outside the public local-development list.

The wiki is stale if its current-main SHA differs from the source being changed, cited files no longer exist, or a behavior/configuration/schema change is absent from the catalog and feature page. Update canonical documentation in the same change.
