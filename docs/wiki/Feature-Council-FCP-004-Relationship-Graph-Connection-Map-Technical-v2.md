# Technical Plan FCP-004 Relationship Graph And Connection Map v2

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

> **Deferred on 2026-07-13; not active for implementation.** This technical plan is historical evidence. No schema, projection, dependency, route, background process, or proof implementation is authorized by the [current decision](Graphify-Opportunity-Decision).

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
