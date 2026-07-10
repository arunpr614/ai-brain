# PRD FCP-003 Contextual Ask And Evidence Scan v2

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Current feature-council artifact.
Runtime verification: Not provided.
Superseded by: None.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Current feature-council artifact.** This is planning evidence, not proof of production implementation or current runtime behavior.

Status: v2 final planning package  
Review addressed: [reviews/FCP003_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-FCP-003-v1-Adversarial-Review)  
Council outcome: Proceed with reduced scope  
Priority: P1

## Review Response

v2 narrows Evidence Scan to local selected-source support classification, adds source-set snapshots, defines quality policy, and separates no-evidence from technical failure.

## Goal

Make Ask and evidence workflows more controllable and trustworthy by letting users select source context, exclude weak captures, and classify one claim against local sources.

## User Problem

Streaming Ask is useful, but source drift and weak captures can undermine trust. Users need to know what the AI used, what it skipped, and how strongly local sources support a claim.

## Target Users

- Daily user asking questions across a personal library.
- Power user comparing claims against saved PDFs/articles.
- User who has repaired or anchored important sources.

## Scope

- Context chips for items, collections, tags, anchors, and recent capture sets where supported.
- Source picker with quality/readiness indicators.
- High-quality-only retrieval mode.
- Evidence Scan over a single user claim and selected local source set.
- Verdict groups: Supports, Contradicts, Nuances, Irrelevant, Insufficient evidence, Technical failure.
- Citation chips linking to item/chunk/anchor where possible.

## Non-Goals

- Internet fact-checking.
- Full automated literature review.
- Matrix extraction.
- Multi-claim batch scan.
- Guarantee that a claim is true or false outside the selected source set.

## User Journeys

1. User opens Ask, attaches three sources, and asks a question only over those sources.
2. User toggles high-quality-only mode; weak sources are counted and excluded with explanation.
3. User highlights a sentence and runs Evidence Scan against selected sources.
4. Result groups cited passages by source-support label and shows when evidence is insufficient.
5. User opens cited source or Source Workspace anchor.

## Quality Policy

A source is high-quality eligible when:

- It has sufficient body text or a repaired body.
- It has chunks available.
- It has embeddings or FTS fallback depending on mode.
- It is not metadata-only unless user explicitly includes weak sources.
- It is not marked ignored/deleted/failed repair.
- Its source health state is not stale after a body-changing repair.

## Source-Set Snapshot

For Ask/Evidence runs, store or compute:

- Selected source identifiers.
- Inclusion/exclusion reason per source.
- Capture quality and index readiness at run time.
- Retrieval mode and version.
- Model/provider identifier without secrets.
- Prompt template version.
- Created timestamp.

## Data Needs

- Optional `ask_context_sets` or request-local source-set object.
- `evidence_scan_runs`: claim hash, source-set metadata, status, created_at, completed_at.
- `evidence_candidates`: item/chunk/anchor references, verdict, confidence band, explanation, order.
- Diagnostics fields limited to counts/error codes.

## Edge Cases

- All selected sources are weak.
- Embedding provider down but FTS is available.
- Source repaired while scan is running.
- Claim is too broad or too long.
- Retrieved passages are irrelevant.
- Contradictory evidence exists from different sources.
- User deletes source before opening citation.

## Acceptance Criteria

- Ask can run over explicit source sets.
- User sees included and excluded source counts before or during the answer.
- High-quality-only mode uses the policy above and is test-covered.
- Evidence Scan labels are phrased as "these sources support..." not "this is true."
- No-evidence, all-irrelevant, provider-down, and indexing-stale outcomes have distinct UI states.
- Citations open item, chunk, or anchor when available.
- Claims, queries, retrieved passages, and answer text are excluded from diagnostics unless user explicitly exports them.

## Analytics / Events

Only content-free local events:

- ask_context_source_count
- ask_weak_source_excluded_count
- evidence_scan_started
- evidence_scan_completed_with_verdict_counts
- evidence_scan_failed_code

## Risks And Open Questions

- Should scan runs persist by default or be ephemeral? Recommendation: persist metadata and verdict references, not raw prompts/excerpts beyond user-visible result.
- Which model handles classification? Needs provider readiness from FCP-005.
- Should anchors be required before Evidence Scan v1? No; chunks are sufficient, anchors improve precision later.
