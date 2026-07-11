# PRD FCP-004 Relationship Graph And Connection Map v1

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Superseded draft within the 2026-06-28 planning package - do not implement.
Runtime verification: Not provided.
Superseded by: [Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Superseded planning draft - do not implement.** Use the later planning successor: [Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2). Then check the living [Feature Catalog](Feature-Catalog) for present status.

Status: v1 draft  
Decision: Proceed with reduced scope  
Priority: P2

## Goal

Create a derived relationship map showing connections among items, tags, collections, sources, anchors, citations, related items, and accepted evidence.

## User Problem

AI Brain can find related items, but users cannot inspect the structure of their memory or understand why things are connected.

## Scope

- Graph view of items and relationships.
- Relationship detail panel.
- Filters by type/source/recency.
- Rebuildable graph snapshot.

## Non-Goals

- Graph as source of truth.
- Neo4j export.
- Auto-editing tags/collections from graph.

## Acceptance Criteria

- Graph is derived and rebuildable.
- User can open item/source from graph node.
- Edge provenance is visible.
