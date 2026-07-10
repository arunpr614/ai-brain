# PRD FCP-002 Source Workspace And Reading Studio Lite v2

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Current feature-council artifact.
Runtime verification: Not provided.
Superseded by: None.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Current feature-council artifact.** This is planning evidence, not proof of production implementation or current runtime behavior.

Status: v2 final planning package  
Review addressed: [reviews/FCP002_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-FCP-002-v1-Adversarial-Review)  
Council outcome: Proceed with reduced scope  
Priority: P1

## Review Response

v2 narrows the feature to source inspection, anchors, metadata correction, and simple citation export. It explicitly excludes full PDF annotation and writing-editor behavior.

## Goal

Give users a source workspace where they can inspect captured content, preserve important passages, correct source metadata, and copy/export simple citations.

## User Problem

AI Brain can answer from sources, but users cannot easily audit source quality, mark passages, or manage citation metadata. This weakens trust in Ask and future Evidence Scan.

## Target Users

- Power user reading PDFs/articles in Brain.
- User who wants to cite saved material in external writing tools.
- User repairing weak source metadata after capture.

## Scope

- `Source Workspace` entry from item detail.
- Desktop two-pane layout: reader/text pane and source tools panel.
- Mobile tabbed layout: Content, Anchors, Metadata.
- Anchors/bookmarks against text chunks, selected text, or page reference where available.
- Metadata override UI for title, author, source URL, published date, source type/platform, DOI/ISBN if added later.
- Copy citation in a simple built-in style and export BibTeX for eligible sources.

## Non-Goals

- Full block-based Markdown/article editor.
- Rich PDF ink annotation.
- Collaborative comments.
- Multi-source literature review table.
- Neo4j export.
- Automatic citation correctness guarantee.

## User Journeys

1. Open item detail -> Source Workspace -> inspect original text/PDF.
2. Select a passage or chunk -> create anchor with optional note.
3. Correct missing author/date -> copy citation.
4. Source is repaired later -> anchor remains valid, reattached, or marked stale.
5. Ask/Evidence features can reference user anchors in future packages.

## Web / Mobile Behavior

- Desktop uses side-by-side layout when viewport allows.
- Mobile uses top tabs or segmented control; no squeezed two-column view.
- PDF unavailable fallback shows extracted text and artifact status.
- Source metadata incomplete state offers correction, not a generic error.

## Data Needs

- `source_anchors`: `id`, `item_id`, `anchor_type`, `chunk_id`, `selected_text`, `page`, `locator_json`, `note`, `state`, `created_at`, `updated_at`.
- `source_metadata_overrides`: item-scoped user-authored overrides separate from captured metadata.
- Citation formatter over effective metadata.
- Anchor staleness state after source repair or chunk reset.

## Edge Cases

- Source body changed after repair.
- PDF artifact missing but extracted text exists.
- Metadata incomplete or conflicting.
- Duplicate source with different metadata.
- User deletes item with anchors.
- Citation export requested for note or selected text capture.

## Acceptance Criteria

- Source Workspace opens for every item type with graceful capability differences.
- User can create, list, edit, and delete anchors.
- Anchor state is one of active, stale, or unavailable.
- Metadata override never destroys original captured metadata.
- Citation copy/export clearly labels missing fields.
- Mobile layout is usable without horizontal scrolling.
- Deleting an item cascades or safely removes anchors and overrides.

## Analytics / Events

Optional content-free local events:

- source_workspace_opened
- anchor_created
- anchor_marked_stale
- citation_copied
- metadata_override_saved

No raw titles, URLs, excerpts, citation strings, or notes in events.

## Risks And Open Questions

- PDF page-coordinate anchoring may be deferred if only text extraction is reliable.
- DOI/metadata enrichment is out of v1 unless source already captures it.
- Ask/Evidence use of anchors should be designed in FCP-003, not hidden here.
