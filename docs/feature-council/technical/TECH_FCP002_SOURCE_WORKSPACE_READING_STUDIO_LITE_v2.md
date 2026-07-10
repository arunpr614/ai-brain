# Technical Plan FCP-002 Source Workspace And Reading Studio Lite v2

Status: v2 final planning package  
Review addressed: `reviews/FCP002_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md`

## Recommended Architecture

Add a `source workspace` route that reads existing item/artifact/chunk data and writes user-authored anchors plus metadata overrides. Keep anchors independent from derived chunks so source repair can mark stale without deleting user notes.

## Likely Affected Modules

- `src/app/items/[id]/source/page.tsx` or equivalent route.
- `src/app/items/[id]/page.tsx` link/entry.
- `src/db/items.ts`
- new `src/db/source-anchors.ts`
- new `src/db/source-metadata.ts`
- `src/lib/capture/artifacts.ts`
- `src/lib/citation/*`
- `src/components/*` for reader, anchors, metadata, citation.

## Data Model

### `source_anchors`

- `id TEXT PRIMARY KEY`
- `item_id TEXT REFERENCES items(id) ON DELETE CASCADE`
- `anchor_type TEXT CHECK IN ('chunk','selected_text','page','external')`
- `chunk_id TEXT NULL`
- `selected_text TEXT NULL`
- `page INTEGER NULL`
- `locator_json TEXT NULL`
- `note TEXT NULL`
- `state TEXT CHECK IN ('active','stale','unavailable')`
- `created_at INTEGER`
- `updated_at INTEGER`

### `source_metadata_overrides`

- `item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE`
- fields as nullable overrides: `title`, `author`, `source_url`, `published_at`, `doi`, `citation_type`, `updated_at`.

## Source Repair Interaction

When source text/body changes:

- Preserve anchors.
- Revalidate `chunk_id` anchors.
- Mark unresolved anchors `stale`.
- Do not delete selected text or user notes unless item is deleted.

## Security / Privacy

- Anchors and notes are user-authored durable content.
- Exports include anchors only when user explicitly chooses source/citation export.
- Logs and diagnostics must not include selected text or anchor note bodies.

## Test Plan

- DB migration and cascade tests.
- Anchor create/edit/delete tests.
- Source repair staleness tests.
- Citation formatter tests for missing metadata.
- Route/UI tests for mobile tabs and desktop panes.
- Export/copy tests with redacted diagnostics.

## Rollout

1. Add metadata overrides and citation preview.
2. Add text-based anchors from existing chunks/body.
3. Add PDF artifact display only if artifact availability is reliable.
4. Integrate Source Health and FCP-003 anchor consumers later.

## Rollback

Feature can be disabled by hiding route links. Anchor/metadata tables can remain inert; item detail should not depend on them for baseline rendering.
