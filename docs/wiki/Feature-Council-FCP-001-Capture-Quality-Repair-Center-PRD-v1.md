# PRD FCP-001 Capture Quality And Repair Center v1

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Superseded draft within the 2026-06-28 planning package - do not implement.
Runtime verification: Not provided.
Superseded by: [Feature-Council-FCP-001-Capture-Quality-Repair-Center-PRD-v2](Feature-Council-FCP-001-Capture-Quality-Repair-Center-PRD-v2).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Superseded planning draft - do not implement.** Use the later planning successor: [Feature-Council-FCP-001-Capture-Quality-Repair-Center-PRD-v2](Feature-Council-FCP-001-Capture-Quality-Repair-Center-PRD-v2). Then check the living [Feature Catalog](Feature-Catalog) for present status.

Status: v1 draft  
Decision: Proceed  
Priority: P0

## Goal

Make capture quality visible, repairable, and consistent across web capture, Android share, Chrome extension, review queue, item detail, and Ask/search eligibility.

## User Problem

AI Brain can save weak captures: metadata-only YouTube pages, Substack previews, failed summaries, missing embeddings, duplicates, or transcript failures. Today those states are visible in pieces, but the user does not get one clear contract for what was saved, what is usable, and what to do next.

## Target Users

- Primary daily AI Brain user capturing links, PDFs, YouTube videos, Telegram items, and notes.
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
