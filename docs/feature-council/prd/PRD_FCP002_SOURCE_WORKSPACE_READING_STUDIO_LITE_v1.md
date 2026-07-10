# PRD FCP-002 Source Workspace And Reading Studio Lite v1

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
