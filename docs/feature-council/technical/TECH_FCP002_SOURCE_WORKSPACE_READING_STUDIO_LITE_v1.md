# Technical Plan FCP-002 Source Workspace And Reading Studio Lite v1

Status: v1 draft

## Architecture

Add source workspace routes on top of existing item, artifact, chunk, and metadata tables. Store anchors as durable user-authored state separate from derived chunks.

## Data

- `source_anchors`
- `source_metadata_overrides`
- citation export helpers

## Risks

- PDF rendering and text-coordinate anchoring can be complex.
- Anchors can become stale after source repair.
- Citation metadata quality varies by source type.
