# PRD FCP-002 Source Workspace And Reading Studio Lite v1

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Superseded draft within the 2026-06-28 planning package - do not implement.
Runtime verification: Not provided.
Superseded by: [Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-PRD-v2](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-PRD-v2).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Superseded planning draft - do not implement.** Use the later planning successor: [Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-PRD-v2](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-PRD-v2). Then check the living [Feature Catalog](Feature-Catalog) for present status.

Status: v1 draft  
Decision: Proceed with reduced scope  
Priority: P1

## Goal

Create a source-centered workspace for captured PDFs/articles where users can read, preserve important passages, correct metadata, and generate simple citations.

## User Problem

AI Brain stores content and can answer from it, but it does not yet help the user inspect sources deeply, mark important evidence, or cite source metadata.

## Scope

- Source workspace for an item.
- PDF/article reading pane where feasible.
- Bookmarks/highlights/anchors.
- Source metadata edit.
- Simple citation export/copy.

## Non-Goals

- Full writing editor.
- Neo4j export.
- Matrix extraction.
- Multi-vault project management.

## Acceptance Criteria

- User can open a source workspace from item detail.
- User can create an anchor/bookmark against a passage/page or text range.
- User can edit citation metadata.
- User can copy APA-ish citation and BibTeX for eligible sources.
- Anchors can be used by Ask/evidence features later.
