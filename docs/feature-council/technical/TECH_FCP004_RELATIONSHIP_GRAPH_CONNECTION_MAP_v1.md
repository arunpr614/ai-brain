# Technical Plan FCP-004 Relationship Graph And Connection Map v1

Status: v1 draft

## Architecture

Build graph projection from owner tables and related-items computations. Store snapshots or compute on demand.

## Risks

- Graph can mislead if edge provenance is weak.
- Layout performance can degrade.
- Graph can leak sensitive titles in screenshots/exports.
