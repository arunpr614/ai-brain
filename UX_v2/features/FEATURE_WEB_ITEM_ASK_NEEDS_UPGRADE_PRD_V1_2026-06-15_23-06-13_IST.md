# Feature PRD v1: Web Item Detail, Ask, and Needs Upgrade

**Created:** 2026-06-15 23:06:13 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Feature owner:** Main Codex execution agent
**Status:** Draft for adversarial review

## Product Problem

The web revamp currently has a stronger shell and library surface, but the reading, repair, and Ask flows still need to feel like one coherent AI Memory experience. The user should be able to open a source, understand its quality, ask about the right scope, repair weak saves, and clear the Needs Upgrade queue without encountering unsafe destructive actions or prototype-only states.

## Source Inputs

| Source | Relevant requirements |
| --- | --- |
| `WEB_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_20-27-04_IST.md` | W-006 item detail/read/repair, W-007 Ask scopes/citations, W-005 destructive delete exclusion, M4 reading/repair/Ask |
| `WEB_EXPERIENCE_REVAMP_IMPLEMENTATION_PLAN_REVISED_2026-06-15_21-07-34_IST.md` | Phase 5 source detail, Needs Upgrade, and Ask states |
| `UX_v2/02_REQUIREMENTS_PRD_BACKLOG.md` | PRD-05 Needs Upgrade, PRD-07 Item Detail, PRD-09 Scoped Ask, PRD-10 Repair |
| Existing code | `src/app/items/[id]`, `src/app/items/[id]/repair`, `src/app/ask`, `src/app/needs-upgrade`, `/api/ask`, repair backend |

## Goals

1. Make item detail a trustworthy reading surface with source quality, repair, organization, AI digest, related items, focus mode, and Ask item entry.
2. Make weak captures visible and actionable through Needs Upgrade and item repair.
3. Ensure all advertised Ask scopes are real: library, item, selected items, tag, topic, and collection.
4. Remove unapproved destructive delete from Item Detail and keep Needs Upgrade free of unsafe delete or mark-good-enough controls.
5. Produce deterministic QA evidence for full-text, weak, repaired, Ask, and provider-down states.

## Non-Goals

- No new high-quality-only Ask toggle.
- No new attachment system or persisted non-library/non-item Ask history.
- No destructive delete from Item Detail or Needs Upgrade.
- No fake related items, fake AI digest, fake citations, or fake repair success.
- No embedded YouTube player.
- No production deployment in this feature slice.

## User Stories

| Priority | Story | Acceptance criteria |
| --- | --- | --- |
| P0 | As Arun, I want to read a full-text item clearly, so I can trust what was captured. | Item page shows title, body, platform, capture source, quality, saved time, source link where present, tags, collections, included topics, related items when real, digest state, export, focus mode, and Ask item. |
| P0 | As Arun, I want weak captures to tell me what is missing, so I know how to repair them. | Weak item detail and focus mode show a repair panel with reason, Add text, and Source link where present. |
| P0 | As Arun, I want Needs Upgrade to be a working repair queue. | `/needs-upgrade` lists weak items with reason, quality, platform, age, Add text, Source, and item detail links. Empty state is calm and accurate. |
| P0 | As Arun, I want repairing a weak item to make it useful for Ask. | Repair requires sufficient text, updates body/title/quality, clears warning, resets stale derived state, queues enrichment, redirects with a success banner, and removes the item from Needs Upgrade. |
| P0 | As Arun, I want Ask to respect the scope I chose. | Ask from item, selected, tag, topic, and collection sends only the intended item ids or item id to `/api/ask`; missing scopes show a recovery state instead of falling back silently. |
| P1 | As Arun, I want Ask to be honest when AI services are down. | Ask failures show product-facing copy and do not mention internal commands. |
| P1 | As Arun, I want mobile web reading and repair to stay usable. | 390px screenshots show no overlapping controls, clipped action bars, or hidden primary repair/Ask paths. |

## Current Gaps Observed

| Gap | Evidence | Required outcome |
| --- | --- | --- |
| Item Detail still has Delete | `src/app/items/[id]/page.tsx` imports `Trash2` and renders a delete form | Remove destructive delete from this slice |
| Needs Upgrade is flat | `src/app/needs-upgrade/page.tsx` lists all weak items together | Preserve usable queue; grouping by reason is desired if it does not add fragility |
| Ask scope evidence is not explicit | `AskClient` treats item-id arrays as item-set scope, including tag/topic/collection routes | Add tests or browser interception evidence showing correct request bodies |
| Browser QA needs deterministic weak/repaired states | Current LSTC seed has weak items but no repair success path fixture | Add or reuse deterministic fixtures for repair before/after |

## Functional Requirements

### Item Detail

- Remove Item Detail delete action and `Trash2` affordance.
- Keep full-text content readable at desktop and mobile widths.
- Keep focus mode available and ensure weak focus mode shows repair CTA.
- Show trust/quality metadata with real stored item fields.
- Show repair panel only when `needsUpgradeReason` or limited capture quality applies.
- Keep tags, included topics, collections, digest, and related items real-data only.
- Keep export as `.md` if already backed by existing API.

### Needs Upgrade

- List only weak/limited items returned by `listNeedsUpgradeItems`.
- Show reason, platform, quality, age, short hint, Add text, Source if available, and detail link.
- Do not show Delete, mark-good-enough, merge, or retry unless separately implemented with tests.
- Provide a clear empty state.

### Repair

- Use existing repair route and backend.
- Require at least `MIN_REPAIR_TEXT_CHARS` useful characters.
- On success, clear extraction warning, set `capture_quality` to `user_provided_full_text`, reset summary/quotes/category/enrichment state, clear stale chunks/vectors/auto tags/topics, queue enrichment, and redirect to item detail with success banner.
- Verify repaired item no longer appears in Needs Upgrade.

### Ask

- Library, item, selected, tag, topic, and collection scopes must display a scope banner with source count and limited-source warning.
- Item scope must send `{ scope: "item", item_id }`.
- Selected/tag/topic/collection scopes must send `{ scope: "items", item_ids }` with the route-derived ids.
- Missing selected/tag/topic/collection scopes must show a recovery state and not ask across the full library.
- Provider-down and retrieval errors must be readable product states.
- Citations must map to real retrieved items; no citation should point to a missing item.

## Data and Fixture Requirements

- Add a deterministic seed script or extend the existing UX v2 fixture seed for:
  - full-text article item
  - weak metadata-only item
  - item with included topic
  - collection and tag Ask scopes
  - Needs Upgrade populated state
  - repair success path
  - Ask provider-down state
- The seed must print a manifest with item ids and routes.

## QA Requirements

| QA area | Required evidence |
| --- | --- |
| Static checks | `git diff --check`, focused tests, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` |
| Unit tests | Repair postconditions, Needs Upgrade removal after repair, Item Detail delete removal scan, Ask request-body scope mapping |
| Browser viewport matrix | 390, 768, 1024, 1280, and 1440 for full item, weak item, focus mode, Needs Upgrade, repair form, Ask item, Ask selected/topic/collection where practical |
| Browser interactions | Ask provider-down submission, repair short-text error, repair success redirect, Needs Upgrade removal, no visible/focusable Delete |
| Console | 0 fresh browser console warnings/errors on final route sweep |

## Risks

| Risk | Mitigation |
| --- | --- |
| Scope banner says one thing while API asks another | Add request-body verification for each scoped Ask entry |
| Repair appears successful but stale derived data remains | Assert chunk/vector/topic/auto-tag reset and enrichment queue state |
| Delete remains reachable by keyboard | Scan source and browser focusable actions |
| Weak-source copy overstates Ask quality | Use limited-source warning and repair CTA |
| Provider unavailable blocks Ask QA | Use provider-down browser state as the minimum local interaction; answer-with-citations requires live/stubbed provider evidence before release |

## Release Gate

This slice can be marked complete locally only when the PRD v2, implementation plan v2, code changes, static gates, browser evidence, and tracker update are complete. It cannot be marked production-ready until the broader UX v2 integrated QA, review, backup/rollback, and deployment gates complete.
