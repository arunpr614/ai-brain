# Core Artifacts v1 Adversarial Review

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Review record.
Runtime verification: Not provided.
Superseded by: [Feature-Council-Research](Feature-Council-Research).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Review record.** These findings are preserved for traceability. Use the current successor: [Feature-Council-Research](Feature-Council-Research).

Target: [docs/feature-council/00_CORE_ARTIFACTS_v1.md](Feature-Council-Core-Artifacts-v1)  
Reviewer stance: adversarial-review skill  
Created: 2026-06-28 21:23 IST

## Findings

### P1 - Approval scope is still too broad for product-ready packages

The v1 summary approves five packages, but three of them bundle multiple research features into one outcome. `Source Workspace And Reading Studio Lite` combines PDF source management, reading, anchors, metadata, and citations. `Contextual Ask And Evidence Scan` combines retrieval UX and claim checking. Without explicit reduced scope, the final PRDs could become unimplementable.

Recommendation: In v2, define a narrow first release for every approved package, list non-goals, and carry deferred note.md capabilities as later phases.

### P1 - The live-app audit underplays cross-channel consistency risk

Capture and repair behavior crosses web, Android WebView, extension service worker, review queue, API, and enrichment queues. v1 mentions inconsistency, but does not make it a release-blocking risk. This is where users will feel broken trust first.

Recommendation: Make cross-channel result contracts and mobile/extension behavior explicit in the gap matrix and FCP-001 acceptance criteria.

### P2 - Research evidence confidence is not carried into decisions

The source package distinguishes official confirmed, official technical, marketplace partial, and inferred claims, but v1 decisions flatten them. This can make marketplace-derived vault/import ideas look as strong as official technical claims.

Recommendation: Add source confidence to the research inventory and decision log. Park or gate weak-evidence items.

### P2 - Technical feasibility needs data lifecycle language

The current app already has SQLite migrations, FTS, chunks, embeddings, artifacts, transcript jobs, and backups. v1 does not yet say how new features avoid corrupting derived state or leaking sensitive content.

Recommendation: Every approved technical plan should include data lifecycle, deletion, rollback, and diagnostics boundaries.

### P3 - The v1 artifact does not yet prove every required final file exists

The v1 baseline is useful, but the goal explicitly names final files. Without a master index and project tracker, completion could become hard to audit.

Recommendation: Split v2 into the required named artifacts and include a master index with status and review links.

## No-Go Recommendation

Do not treat v1 as ready for handoff. Proceed only if v2 narrows scope, labels evidence confidence, and creates per-approved-feature PRD/UX/technical packages with explicit non-implementation language.
