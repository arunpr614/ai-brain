# Technical Plan FCP-001 Capture Quality And Repair Center v1

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Historical draft - do not implement.
Runtime verification: Not provided.
Superseded by: [Feature-Council-FCP-001-Capture-Quality-Repair-Center-Technical-v2](Feature-Council-FCP-001-Capture-Quality-Repair-Center-Technical-v2).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Historical draft - do not implement.** Use the current successor: [Feature-Council-FCP-001-Capture-Quality-Repair-Center-Technical-v2](Feature-Council-FCP-001-Capture-Quality-Repair-Center-Technical-v2).

Status: v1 draft

## Architecture

Introduce a capture result contract shared by web, extension, Android, Telegram, Review, and item detail. Keep existing capture tables and enrich them with repair history and eligibility semantics.

## Likely Affected Areas

- `src/lib/capture/*`
- `src/app/api/capture/*`
- `src/lib/telegram/*`
- `src/components/share-handler.tsx`
- `extension/src/*`
- `src/app/review/*`
- `src/app/items/[id]/*`
- `src/db/migrations/*`

## Data Changes

- Add repair attempts/history or extend transcript/capture artifacts.
- Add source eligibility/status fields if existing quality columns are insufficient.
- Add derived-state reset transaction for summary, chunks, embeddings, and jobs.

## Security / Privacy

Do not put captured text or transcript snippets into diagnostics by default. Verify session/bearer guards before new repair APIs.

## Test Plan

- Unit tests for result mapping.
- Route tests for capture and repair.
- Extension result contract test.
- Android share manual test.
- Regression test for duplicate/update behavior.

## Rollout

Ship behind no new provider dependency. Start with web Review + item detail, then extension/Android parity before release.

## Risks

Capture orchestration is duplicated; a refactor toward an application service should precede large changes.
