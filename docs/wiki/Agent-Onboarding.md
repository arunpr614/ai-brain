# AI Agent Start Here

Purpose: Establish a safe, evidence-first workflow for understanding and changing AI Brain.
Audience: AI agents and engineers entering the repository.
Verified against: `167a15d57b8f70574a017ea4cda507870f3600d4`.
Runtime evidence through: 2026-07-22 at deployed protected-main application `167a15d57b8f70574a017ea4cda507870f3600d4`; feature-specific live evidence still varies.
Last reviewed: 2026-07-22.
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
- NotebookLM is one deliberate static export to one fixed owner-only private consumer notebook, not synchronization; its queue, provider write, and signed-in canary are separate gates.
- A deployed UI or locally installed extension artifact is not proof of extension load/pairing, target privacy, provider delivery, or owner-only real-content enablement.
- Historical Feature Council pages are planning evidence, not implementation proof.

## Repository orientation

- `src/app/`: pages, routes, and server actions.
- `src/components/`: interactive UI and attached-note editor.
- `src/lib/`: domain behavior, providers, integrations, and policy.
- `src/db/`: persistence and migrations.
- `android/` and `extension/`: non-web clients. The extension contains separate capture and experimental NotebookLM connector trust lanes.
- `scripts/`: build, validation, and guarded operational tooling.
- `docs/wiki/`: canonical wiki source.

## Before editing

Confirm the worktree/branch and baseline, preserve existing changes, locate the feature catalog row, trace UI/client → action/API → domain → database → jobs/integrations, and select the smallest relevant tests. Check [Command Safety](Command-Safety) before any script outside the public local-development list.

The wiki is stale if its current-main SHA differs from the source being changed, cited files no longer exist, or a behavior/configuration/schema change is absent from the catalog and feature page. Update canonical documentation in the same change. For NotebookLM, preserve the evidence boundary explicitly: a paired private target and prior copied-text canary exist; migration 027, protocol v2, and extension 0.7.4 add URL-source delivery, which remains unproven until the signed-in post-deployment YouTube canary passes.
