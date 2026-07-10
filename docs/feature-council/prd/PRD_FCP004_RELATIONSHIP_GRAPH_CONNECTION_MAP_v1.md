# PRD FCP-004 Relationship Graph And Connection Map v1

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
