# Feature PRD v1: Web Library, Search, Topics, and Collections

**Created:** 2026-06-15 22:34:03 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Feature owner:** Main Codex
**Status:** Draft for adversarial review
**Umbrella PRD:** `UX_v2/execution/WEB_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_20-27-04_IST.md`
**Umbrella plan:** `UX_v2/execution/WEB_EXPERIENCE_REVAMP_IMPLEMENTATION_PLAN_REVISED_2026-06-15_21-07-34_IST.md`

## 1. Purpose

Revamp the web Library, Search, Topic, and Collection surfaces so Arun can scan, filter, organize, and ask across saved sources with a coherent AI Memory desktop/mobile web experience.

This feature follows the already-completed contrast/token slice and shell/navigation slice. It must preserve the fixed route-active behavior from `FEATURE_WEB_SHELL_NAVIGATION_PRD_V2_2026-06-15_22-21-00_IST.md`.

## 2. Source Evidence

| Source | Evidence used |
| --- | --- |
| Revised web PRD | Library, Search, Topic, and Collection are P0 web surfaces. The PRD requires real capability audits, no fake mutation success, and no destructive delete unless explicitly validated. |
| Magic Patterns snapshot README | Confirms relevant source files: `pages/DesktopLibrary.tsx`, `pages/DesktopTopic.tsx`, `pages/DesktopCollection.tsx`, `data/sources.ts`, and shared UI primitives. Full source contents are not saved locally in the snapshot folder. |
| Current Library route | `src/app/library/page.tsx` has source/quality/tag filtering, search form, desktop filters, mobile filter sheet, Needs Upgrade entry, and Capture entry. |
| Current Library list | `src/components/library-list.tsx` has selectable rows, Ask selected, bulk tag, bulk add to collection, and bulk delete. |
| Current Search route | `src/app/search/page.tsx` supports FTS/semantic/hybrid modes and handles embed-provider offline state. |
| Current Topic route | `src/app/topics/[slug]/page.tsx` renders topic header, source count, description, item list, and Ask topic. |
| Current Collection route | `src/app/collections/[id]/page.tsx` renders collection header, item count, description, item list, and Ask collection. |
| Current data layer | `src/db/items.ts`, `src/db/topics.ts`, `src/db/collections.ts`, `src/app/actions.ts`, and search tests show real filters, topic lookups, collection lookup, tag attach, collection attach, and search behavior. |

## 3. User Outcomes

| User outcome | Required behavior |
| --- | --- |
| Scan the library quickly | Library presents count, search, filters, source rows, quality badges, captured metadata, and readable row hierarchy without overlap or low-contrast controls. |
| Narrow the library safely | Source, quality, and tag filters are route-backed and work on desktop and mobile. Active filter states are visually clear and accessible. |
| Ask selected sources | Selecting 1-50 sources exposes Ask selected and routes to `/ask?scope=selected&ids=...`. Above 50 sources the action is disabled with truthful copy. |
| Organize sources without fake success | Bulk tag and bulk add-to-collection remain available only if the current server actions are validated for success, validation failure, persistence after reload, and no fake success state. |
| Avoid destructive data loss | Library bulk delete must not appear as an active feature in this slice unless a separate recovery/audit/rollback plan exists. |
| Search with clear modes | Search supports FTS, semantic, and hybrid modes, with truthful copy when semantic dependencies are unavailable. |
| Use generated topics | Topic pages show source count, explanation, items, source quality, and Ask topic when items exist. Empty/not-found states are intentional. |
| Use collections | Collection pages show collection metadata, items, and Ask collection when items exist. Empty/not-found states are intentional. |

## 4. Product Decisions

| Decision ID | Decision | Status for this slice |
| --- | --- | --- |
| LSTC-001 | Library filtering | Approved. Source, quality, and tag filters must remain route-backed. |
| LSTC-002 | Ask selected | Approved. Must cap at 50 selected sources and route to supported Ask scope. |
| LSTC-003 | Bulk tag | Conditional. Active only with validation evidence for server action, persistence, error handling, and no fake success. |
| LSTC-004 | Bulk add to collection | Conditional. Active only with validation evidence for server action, persistence, empty-collection behavior, error handling, and no fake success. |
| LSTC-005 | Bulk delete | Deferred and excluded. Hide/remove from active Library UI for this slice unless a recovery/audit plan is created and reviewed. |
| LSTC-006 | Search modes | Approved. FTS always available; semantic/hybrid can be active only with truthful provider-down handling. |
| LSTC-007 | Topic route | Approved. Read-oriented topic page and Ask topic are in scope. Topic mutation drawers are out of scope. |
| LSTC-008 | Collection route | Approved. Read-oriented collection page and Ask collection are in scope. Collection rename/add-item drawers are out of scope for this slice unless already validated elsewhere. |

## 5. Functional Requirements

### Library

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| L-001 | Library header and summary | Shows total or filtered count, `Library` heading, Needs Upgrade link only when count > 0, and Capture entry. |
| L-002 | Search entry | Library search form submits to `/search?q=...` and does not create a second search implementation. |
| L-003 | Desktop filters | Desktop source, quality, and tag filters are visible above the list and use clear selected state. |
| L-004 | Mobile filters | Mobile filter sheet opens from a compact control, closes by button, backdrop, and Escape, and keeps options readable above bottom nav. |
| L-005 | Source rows | Rows show source icon, title, platform/source, capture channel, quality badge, age, char count when available, warning when present, and enrichment state. |
| L-006 | Selection model | Checkboxes select rows without navigating. Escape clears selection. Bulk toolbar appears only when at least one row is selected. |
| L-007 | Ask selected | Routes to `/ask?scope=selected&ids=<comma ids>` for 1-50 selected items. Disabled above 50 with a clear tooltip/title. |
| L-008 | Bulk tag | If retained, validates blank tag rejection, success count, persistence after reload, and error display. |
| L-009 | Bulk add collection | If retained, disables when no manual collections exist, validates success count, persistence after reload, and error display. |
| L-010 | Destructive actions | No active bulk delete control ships in this slice. |
| L-011 | Empty states | Unfiltered empty state sends user to Capture. Filtered empty state offers clear filters. |

### Search

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| S-001 | Search query | Empty query shows a calm prompt. Non-empty query renders result count or no-match state. |
| S-002 | Search modes | Mode controls preserve query and show active state for FTS, Semantic, and Hybrid. |
| S-003 | Provider-down state | Semantic/hybrid provider-down state is truthful, does not leak local secrets, and points user to Settings/AI services or current supported recovery copy. |
| S-004 | Result rows | Results link to item detail and show source type and relative capture time without text overlap. |

### Topic

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| T-001 | Topic header | Shows topic name, derived-topic label, source count, optional description, and Ask topic when items exist. |
| T-002 | Topic item list | Shows topic items with source icon, title, platform, quality, relative time, and excerpt when body exists. |
| T-003 | Topic empty/not-found | Empty topic state is truthful. Unknown topic uses app not-found behavior with shell still stable. |
| T-004 | Topic Ask | Ask topic routes to `/ask?scope=topic&topic=<slug>` only when items exist. |

### Collection

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| C-001 | Collection header | Shows collection name, item count, kind badge for auto collections, optional description, and Ask collection when items exist. |
| C-002 | Collection item list | Shows items with icon, title, source type, and relative capture time. |
| C-003 | Collection empty/not-found | Empty state is truthful. Unknown collection uses app not-found behavior with shell still stable. |
| C-004 | Collection Ask | Ask collection routes to `/ask?scope=collection&collection=<id>` only when items exist. |

## 6. Visual and UX Requirements

| Surface | Requirement |
| --- | --- |
| Desktop width | Validate at 1280x800 and 1440x900. Content remains within the shell, no horizontal scroll, row metadata wraps cleanly. |
| Mobile width | Validate at 390x844. Mobile filter sheet does not overlap bottom nav or trap content behind it. |
| Dark theme | Validate Library and mobile filter sheet in dark theme. Active controls and primary buttons use contrast-safe tokens. |
| Touch targets | Mobile controls should be at least 36px high where practical; key bottom-sheet buttons must be easy to tap. |
| Copy | Use AI Memory naming only. No `AI Brain`, fake account/device, QR, offline sync, storage-chart, or destructive success claims. |

## 7. Data Safety and Privacy

- No raw tokens, PINs, cookies, provider keys, or private personal notes may appear in docs/screenshots.
- Production QA for this slice is read-only unless a temporary object and cleanup proof are documented later.
- Destructive delete is out of scope for this feature. Existing destructive server action may remain in code if used elsewhere, but the Library UI must not expose it as a shipped active affordance for this slice.
- Bulk tag and bulk collection mutation QA should run against the local temporary QA database.

## 8. Required Validation

| Gate | Required check |
| --- | --- |
| Unit/focused tests | Add or update tests for route/filter helpers or mutation behavior touched by this slice. |
| Static checks | `git diff --check`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. |
| Browser visual QA | Capture Library default, filtered, selected, mobile filter sheet, Search empty/results/no-results/provider-down if feasible, Topic populated/unknown, Collection populated/empty if feasible. |
| Interaction QA | Select rows, Ask selected route, Escape clears selection, mobile filter open/close, bulk tag if retained, bulk collection if retained. |
| Accessibility | Focusable controls have labels, disabled controls are not misleading, dialog state has `role="dialog"` and close path, no visible low contrast. |
| Console check | Browser console has no fresh warnings/errors on changed routes. |
| Forbidden scan | Scan `src` for stale `AI Brain`, fake profile/email, prototype routes, and forbidden destructive/offline/QR copy introduced by this slice. |

## 9. Out of Scope

- Item detail revamp beyond links from rows.
- Needs Upgrade revamp beyond existing count/link.
- Capture revamp beyond existing Capture entry.
- Settings revamp beyond collection/tag support needed by validated Library actions.
- Android native runtime validation.
- QR pairing, offline sync/cache, automatic backups, storage charts, telemetry, E2EE, connected-device management.
- Active Library bulk delete.

## 10. Release Definition

This feature can be marked locally complete when:

1. PRD v2 and implementation plan v2 exist after adversarial reviews.
2. Required code changes are implemented.
3. Static checks pass.
4. Browser visual and interaction evidence exists for representative desktop/mobile light/dark states.
5. Destructive Library actions are absent from active UI.
6. The project tracker records the feature status and any release blockers.

This feature cannot be marked released until the broader web revamp release packet, backup/rollback, production deploy, and live smoke gates pass.
