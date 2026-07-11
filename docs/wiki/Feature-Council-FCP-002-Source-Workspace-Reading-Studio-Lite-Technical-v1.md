# Technical Plan FCP-002 Source Workspace And Reading Studio Lite v1

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Superseded draft within the 2026-06-28 planning package - do not implement.
Runtime verification: Not provided.
Superseded by: [Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-Technical-v2](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-Technical-v2).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Superseded planning draft - do not implement.** Use the later planning successor: [Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-Technical-v2](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-Technical-v2). Then check the living [Feature Catalog](Feature-Catalog) for present status.

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
