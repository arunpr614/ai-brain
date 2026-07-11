# PRD FCP-004 Relationship Graph And Connection Map v2

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Latest revision within the 2026-06-28 planning package.
Runtime verification: Not provided.
Superseded by: None.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Historical planning record from 2026-06-28.** This is the latest revision within that planning package. It is not proof of current implementation, deployment, or runtime behavior. Use the living [Feature Catalog](Feature-Catalog) for present status.

Status: v2 final planning package  
Review addressed: [reviews/FCP004_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-FCP-004-v1-Adversarial-Review)  
Council outcome: Proceed with reduced scope  
Priority: P2

## Review Response

v2 defines graph as a derived projection, adds edge taxonomy/provenance, requires a list fallback, and excludes export/Neo4j from first release.

## Goal

Help users inspect how their saved items relate to each other without making the graph a source of truth.

## User Problem

AI Brain has related items, tags, collections, citations, and future anchors/evidence, but users cannot see the larger structure or inspect why a relationship exists.

## Scope

- Derived graph projection over existing data.
- Nodes for items, tags, collections, source anchors, and accepted evidence where available.
- Edges with provenance labels.
- Graph visual plus accessible outline/list fallback.
- Filters by node type, relationship type, recency, and source quality.
- Open item/source from node or edge detail.

## Non-Goals

- Neo4j export.
- Manual graph as source of truth.
- Collaborative graph editing.
- Automatic tag/collection changes from graph operations.
- Large-scale graph analytics.

## Edge Taxonomy

| Edge | Source of truth |
| --- | --- |
| `tagged_with` | `item_tags` |
| `in_collection` | `item_collections` |
| `semantically_related` | computed related-items/chunk vectors |
| `cites_anchor` | FCP-002 anchors/citation records when implemented |
| `supports_claim` | FCP-003 accepted evidence when implemented |
| `same_source_url` | normalized source URL duplicate/relationship policy |

## User Journeys

1. User opens Graph from sidebar/More.
2. User filters to YouTube + notes, sees clusters.
3. User selects an edge and sees why the connection exists.
4. User opens the source item or anchor.
5. User switches to outline/list view for accessibility or dense scanning.

## Data Needs

- Graph projection DTO with nodes, edges, provenance, source quality, timestamps.
- Optional `graph_snapshots` for stable rendering/cache.
- Staleness marker when owner data changes.
- No new source-of-truth relationships in v1.

## Edge Cases

- Empty library.
- Library with hundreds/thousands of items.
- Weak/metadata-only sources.
- Deleted item after snapshot.
- Private/sensitive titles visible on screen.
- Semantic edges change after re-embedding.

## Acceptance Criteria

- Every edge shows provenance and source owner.
- Graph can be rebuilt from owner tables.
- Stale graph state is visible after source/index changes.
- User can switch to accessible outline/list view.
- Weak sources can be hidden or visibly marked.
- No export feature ships in v1.
- Graph diagnostics do not include raw titles/URLs unless user explicitly exports a graph in a later package.

## Risks And Open Questions

- Rendering library choice should wait for a proof packet with desktop/mobile performance.
- Semantic edge threshold needs empirical tuning.
- Should graph include chat threads? Defer.
