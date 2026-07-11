# FCP-001 Package v1 Adversarial Review

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Review record within the 2026-06-28 planning package.
Runtime verification: Not provided.
Superseded by: [Feature-Council-FCP-001-Capture-Quality-Repair-Center-PRD-v2](Feature-Council-FCP-001-Capture-Quality-Repair-Center-PRD-v2), [Feature-Council-FCP-001-Capture-Quality-Repair-Center-Technical-v2](Feature-Council-FCP-001-Capture-Quality-Repair-Center-Technical-v2), [Feature-Council-FCP-001-Capture-Quality-Repair-Center-UX-v2](Feature-Council-FCP-001-Capture-Quality-Repair-Center-UX-v2).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Historical planning review.** These findings are preserved for traceability. Use the reviewed planning successor: [Feature-Council-FCP-001-Capture-Quality-Repair-Center-PRD-v2](Feature-Council-FCP-001-Capture-Quality-Repair-Center-PRD-v2), [Feature-Council-FCP-001-Capture-Quality-Repair-Center-Technical-v2](Feature-Council-FCP-001-Capture-Quality-Repair-Center-Technical-v2), [Feature-Council-FCP-001-Capture-Quality-Repair-Center-UX-v2](Feature-Council-FCP-001-Capture-Quality-Repair-Center-UX-v2). Then check the living [Feature Catalog](Feature-Catalog) for present status.

Targets:

- [prd/PRD_FCP001_CAPTURE_QUALITY_REPAIR_CENTER_v1.md](Feature-Council-FCP-001-Capture-Quality-Repair-Center-PRD-v1)
- [ux/UX_FCP001_CAPTURE_QUALITY_REPAIR_CENTER_v1.md](Feature-Council-FCP-001-Capture-Quality-Repair-Center-UX-v1)
- [technical/TECH_FCP001_CAPTURE_QUALITY_REPAIR_CENTER_v1.md](Feature-Council-FCP-001-Capture-Quality-Repair-Center-Technical-v1)

## Findings

### P1 - v1 does not define the exact capture result taxonomy

The package says "shared taxonomy" but does not name the enums or map them to current API/extension/Android states. This would let channels drift again.

### P1 - Derived-state reset is underspecified

Repair can invalidate summaries, chunks, embeddings, related items, search, transcript jobs, and capture artifacts. v1 does not define transaction order or rollback.

### P1 - Auth and diagnostics are too vague

Repair APIs could expose captured text and source URLs. v1 needs a verified guard requirement and diagnostics allowlist.

### P2 - Android/extension verification needs to be a release gate

The package correctly mentions parity, but not as a hard release gate.

## Required v2 Changes

- Add explicit state taxonomy and channel mapping.
- Add repair data lifecycle and reset rules.
- Add auth, redaction, and diagnostics requirements.
- Add web/API/extension/Android acceptance criteria.
