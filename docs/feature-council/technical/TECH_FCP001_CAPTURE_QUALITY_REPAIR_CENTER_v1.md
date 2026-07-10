# Technical Plan FCP-001 Capture Quality And Repair Center v1

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
