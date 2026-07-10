# Technical Plan FCP-004 Relationship Graph And Connection Map v2

Status: v2 final planning package  
Review addressed: `reviews/FCP004_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md`

## Recommended Architecture

Create a derived graph projection service that reads owner tables and emits graph DTOs. Owner tables remain source of truth. Graph snapshots are cache artifacts and can be rebuilt.

## Likely Affected Modules

- new `src/lib/graph/*`
- new `src/db/graph-snapshots.ts` if snapshots are persisted.
- `src/app/graph/page.tsx`
- `src/components/*graph*`
- `src/lib/related/index.ts`
- future FCP-002 anchor records and FCP-003 evidence records.

## Data Model

Optional first migration:

- `graph_snapshots`: `id`, `version`, `node_count`, `edge_count`, `payload_json` or artifact pointer, `source_watermark_json`, `created_at`, `stale_at`.

Avoid separate edge source-of-truth tables in v1. Generate edges from:

- tags/collections joins.
- semantic related-item calculation.
- anchors/citations/evidence only after those owner records exist.

## Staleness / Rebuild

- Mark snapshot stale after item delete, tag/collection change, anchor change, evidence acceptance, or embedding rebuild.
- Allow on-demand rebuild with cancellation for large libraries.
- Include source watermark in snapshot for diagnostics.

## Security / Privacy

- Graph DTOs may contain titles and source labels; they are user-visible but must be excluded from support/diagnostic exports by default.
- Future exports require separate approval.
- Shared auth guard required for graph APIs.

## Test Plan

- Graph builder fixtures for each edge type.
- Delete/rebuild/stale tests.
- Privacy DTO test that diagnostics exclude title/url/body.
- Accessibility/fallback render tests.
- Performance proof with realistic item counts before canvas implementation.

## Rollout

1. Build graph DTO and outline/list view.
2. Add graph visual behind same DTO.
3. Add stale/rebuild controls.
4. Add anchors/evidence edges only after FCP-002/FCP-003 records exist.

## Rollback

Hide graph route. Snapshots can remain unused; owner tables are unaffected.
