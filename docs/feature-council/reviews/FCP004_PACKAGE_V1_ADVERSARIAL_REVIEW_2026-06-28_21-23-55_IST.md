# FCP-004 Package v1 Adversarial Review

Targets:

- `prd/PRD_FCP004_RELATIONSHIP_GRAPH_CONNECTION_MAP_v1.md`
- `ux/UX_FCP004_RELATIONSHIP_GRAPH_CONNECTION_MAP_v1.md`
- `technical/TECH_FCP004_RELATIONSHIP_GRAPH_CONNECTION_MAP_v1.md`

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
