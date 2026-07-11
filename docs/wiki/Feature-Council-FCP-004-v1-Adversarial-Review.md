# FCP-004 Package v1 Adversarial Review

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Review record within the 2026-06-28 planning package.
Runtime verification: Not provided.
Superseded by: [Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2), [Feature-Council-FCP-004-Relationship-Graph-Connection-Map-Technical-v2](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-Technical-v2), [Feature-Council-FCP-004-Relationship-Graph-Connection-Map-UX-v2](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-UX-v2).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Historical planning review.** These findings are preserved for traceability. Use the reviewed planning successor: [Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2), [Feature-Council-FCP-004-Relationship-Graph-Connection-Map-Technical-v2](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-Technical-v2), [Feature-Council-FCP-004-Relationship-Graph-Connection-Map-UX-v2](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-UX-v2). Then check the living [Feature Catalog](Feature-Catalog) for present status.

Targets:

- [prd/PRD_FCP004_RELATIONSHIP_GRAPH_CONNECTION_MAP_v1.md](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v1)
- [ux/UX_FCP004_RELATIONSHIP_GRAPH_CONNECTION_MAP_v1.md](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-UX-v1)
- [technical/TECH_FCP004_RELATIONSHIP_GRAPH_CONNECTION_MAP_v1.md](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-Technical-v1)

## Findings

### P1 - Edge ownership and provenance are not defined

Graph features fail when edges feel magical. v1 needs a strict edge taxonomy and owner source for each relationship.

### P1 - Snapshot/rebuild semantics are too vague

"Store snapshots or compute on demand" is not a plan. The graph must be derived, rebuildable, and marked stale when source data changes.

### P2 - Accessibility fallback is required

A graph canvas alone is not accessible or always useful. v1 mentions list fallback but does not make it acceptance criteria.

### P2 - Privacy/export risk is underplayed

Graph screenshots and exports can expose titles, URLs, and personal topics.

## Required v2 Changes

- Define edge taxonomy and source-of-truth owners.
- Choose projection/snapshot approach.
- Add list fallback and privacy redaction requirements.
- Keep Neo4j export out of v1.
