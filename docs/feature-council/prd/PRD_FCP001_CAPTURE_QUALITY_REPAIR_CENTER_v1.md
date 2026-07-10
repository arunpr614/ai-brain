# PRD FCP-001 Capture Quality And Repair Center v1

Status: v1 draft  
Decision: Proceed  
Priority: P0

## Goal

Make capture quality visible, repairable, and consistent across web capture, Android share, Chrome extension, review queue, item detail, and Ask/search eligibility.

## User Problem

AI Brain can save weak captures: metadata-only YouTube pages, Substack previews, failed summaries, missing embeddings, duplicates, or transcript failures. Today those states are visible in pieces, but the user does not get one clear contract for what was saved, what is usable, and what to do next.

## Target Users

- Arun as daily AI Brain user capturing links, PDFs, YouTube videos, Telegram items, and notes.
- Mobile user sharing into Brain from Android.
- Extension user saving page/link/selection.

## Scope

- Shared capture result taxonomy.
- Review/repair dashboard for weak sources.
- Item-level repair panel.
- Android and extension result parity.
- Derived-state reset after repair.

## Non-Goals

- Full offline Android queue.
- Full PDF annotation/reading studio.
- New source types beyond existing capture sources.
- Production code in this planning package.

## User Journeys

1. User saves a URL and sees whether it is full text, metadata-only, duplicate, updated, or failed with recoverable item.
2. User opens Review and fixes a weak YouTube capture by retrying transcript recovery or pasting transcript text.
3. User opens an item and sees whether Ask/search can use it.
4. User saves from Android or extension and receives the same truth, not generic success.

## Data Needs

- Capture result enum.
- Capture quality/status reason.
- Repair action history.
- Derived-state reset marker.
- Source eligibility for Ask/search.

## Acceptance Criteria

- Every capture channel maps API results to the same user-facing states.
- Metadata-only captures do not look like full successes.
- Repair actions re-run or reset summary/chunks/embeddings as needed.
- Ask/search can filter to high-quality or repaired sources.
- Review queue counts match item-level repair states.

## Risks

- Capture logic duplication across HTTP route and Telegram dispatch.
- Extension and Android are outside some root test sweeps.
- Competing enrichment modes may make repair status confusing.
