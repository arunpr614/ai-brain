# FCP-003 Package v1 Adversarial Review

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Review record within the 2026-06-28 planning package.
Runtime verification: Not provided.
Superseded by: [Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-PRD-v2](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-PRD-v2), [Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-Technical-v2](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-Technical-v2), [Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-UX-v2](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-UX-v2).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Historical planning review.** These findings are preserved for traceability. Use the reviewed planning successor: [Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-PRD-v2](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-PRD-v2), [Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-Technical-v2](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-Technical-v2), [Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-UX-v2](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-UX-v2). Then check the living [Feature Catalog](Feature-Catalog) for present status.

Targets:

- [prd/PRD_FCP003_CONTEXTUAL_ASK_EVIDENCE_SCAN_v1.md](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-PRD-v1)
- [ux/UX_FCP003_CONTEXTUAL_ASK_EVIDENCE_SCAN_v1.md](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-UX-v1)
- [technical/TECH_FCP003_CONTEXTUAL_ASK_EVIDENCE_SCAN_v1.md](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-Technical-v1)

## Findings

### P1 - Evidence Scan could overclaim truth

v1 says classify support/contradiction, but does not limit the claim to selected local sources. The result must be framed as source support, not universal truth.

### P1 - Source-set snapshots are underspecified

Ask and Evidence Scan need reproducibility. v1 does not define what source set, quality state, retrieval version, or prompt/model state is stored.

### P2 - High-quality filter needs exact policy

"High quality" cannot be vague. It should map to capture quality, extraction warning, chunks, embedding readiness, and repair state.

### P2 - UX needs a no-evidence taxonomy

No eligible sources, no matching evidence, irrelevant evidence, provider failure, and indexing stale are different outcomes.

## Required v2 Changes

- Frame verdicts as local-source evidence labels.
- Define source-set snapshots and quality policy.
- Add no-evidence/failure taxonomy.
- Add privacy requirements for claims, queries, and retrieved excerpts.
