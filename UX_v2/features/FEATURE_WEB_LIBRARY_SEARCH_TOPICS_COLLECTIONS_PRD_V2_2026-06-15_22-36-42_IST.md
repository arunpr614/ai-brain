# Feature PRD v2: Web Library, Search, Topics, and Collections

**Created:** 2026-06-15 22:36:42 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Feature owner:** Main Codex
**Status:** Approved feature PRD for implementation-plan drafting
**Supersedes:** `FEATURE_WEB_LIBRARY_SEARCH_TOPICS_COLLECTIONS_PRD_V1_2026-06-15_22-34-03_IST.md`
**Adversarial review:** `FEATURE_WEB_LIBRARY_SEARCH_TOPICS_COLLECTIONS_PRD_ADVERSARIAL_REVIEW_2026-06-15_22-36-00_IST.md`

## 1. Purpose

Revamp the web Library, Search, Topic, and Collection surfaces so Arun can scan, filter, organize, and ask across saved sources with a coherent AI Memory desktop/mobile web experience.

This slice is a production-truth adaptation of the Magic Patterns direction, not a strict pixel-perfect parity claim. The Magic Patterns source snapshot currently records page names and design notes, but not local page-source contents or screenshots for this exact feature. Strict parity claims require fresh MP screenshots or source excerpts later.

## 2. Source Evidence

| Source | Evidence used |
| --- | --- |
| Revised web PRD | Library, Search, Topic, and Collection are P0 web surfaces. The PRD requires real capability audits, no fake mutation success, no destructive delete without recovery/audit proof, and objective screenshots. |
| PRD v1 adversarial review | Blocks execution until fixture coverage, delete-removal checks, mutation postconditions, and viewport matrix are tightened. |
| Magic Patterns snapshot README | Confirms relevant source files: `pages/DesktopLibrary.tsx`, `pages/DesktopTopic.tsx`, `pages/DesktopCollection.tsx`, `data/sources.ts`, and shared UI primitives. |
| Current Library route | `src/app/library/page.tsx` has source/quality/tag filtering, search form, desktop filters, mobile filter sheet, Needs Upgrade entry, and Capture entry. |
| Current Library list | `src/components/library-list.tsx` has selectable rows, Ask selected, bulk tag, bulk add to collection, and currently has active bulk delete that must be removed from Library UI. |
| Current Search route | `src/app/search/page.tsx` supports FTS/semantic/hybrid modes and currently uses developer-facing provider-down copy that must be productized. |
| Current Topic route | `src/app/topics/[slug]/page.tsx` renders topic header, source count, description, item list, and Ask topic. |
| Current Collection route | `src/app/collections/[id]/page.tsx` renders collection header, item count, description, item list, and Ask collection. |
| Current data layer | `src/db/items.ts`, `src/db/topics.ts`, `src/db/collections.ts`, `src/db/tags.ts`, `src/app/actions.ts`, and search tests show real filters, topic lookups, collection lookup, tag attach, collection attach, and search behavior. |

## 3. Non-Negotiable Product Decisions

| Decision ID | Decision | Status for this slice | No-go condition |
| --- | --- | --- | --- |
| LSTC-001 | Library filtering | Approved. Source, quality, and tag filters must remain route-backed. | Any filter silently changes route/query semantics or loses active state. |
| LSTC-002 | Ask selected | Approved. Supports 1-50 selected sources and routes to `/ask?scope=selected&ids=...`. | Ask selected missing, routes incorrectly, or remains enabled above 50. |
| LSTC-003 | Bulk tag | Conditional active. May remain only with persisted-row validation and truthful success copy. | No DB postcondition tests or duplicate/idempotent behavior evidence. |
| LSTC-004 | Bulk add to collection | Conditional active. May remain only with persisted-row validation and truthful success copy. | No DB postcondition tests, invalid/empty collection behavior unvalidated, or fake success copy. |
| LSTC-005 | Bulk delete | Deferred and excluded. Remove from active Library UI for this slice. | Any visible or focusable Library Delete control remains. |
| LSTC-006 | Search modes | Approved. FTS always available; semantic/hybrid can be active with truthful provider-down handling. | Provider-down copy exposes raw terminal instructions in the main search surface. |
| LSTC-007 | Topic route | Approved. Read-oriented topic page, scope health, items, and Ask topic are in scope. | No populated topic fixture/evidence. |
| LSTC-008 | Collection route | Approved. Read-oriented collection page, scope health, items, and Ask collection are in scope. | No populated and empty collection fixture/evidence. |

## 4. Required Fixture Set

Implementation must create or use a local temporary QA database with deterministic records. Production smoke remains read-only.

| Fixture ID | Required state | Must support |
| --- | --- | --- |
| FIX-LIB-001 | At least 4 library items | Full-text note/article, YouTube transcript or metadata item, PDF item, weak/needs-upgrade item. |
| FIX-LIB-002 | Long text stress row | Long title/provider/metadata that can test truncation and wrapping. |
| FIX-TAG-001 | Manual tag with at least 2 items | `/library?tag=<tag>`, Ask tag, desktop/mobile tag filter, selected rows. |
| FIX-COL-001 | Populated manual collection | Collection page with at least 2 items, Ask collection, bulk add validation. |
| FIX-COL-002 | Empty manual collection | Empty collection state. |
| FIX-TOP-001 | Populated generated topic | Topic page with at least 2 items and Ask topic. |
| FIX-TOP-002 | Weak-source topic mix | Topic or collection scope with at least 1 limited/needs-upgrade item to validate scope health. |
| FIX-SEARCH-001 | Searchable keyword | Query that returns at least 1 FTS result. |
| FIX-SEARCH-002 | No-result keyword | Query that returns no results. |

No local completion if populated Topic and populated Collection states cannot be generated.

## 5. User Outcomes and Requirements

### Library

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| L-001 | Library header and summary | Shows total or filtered count, `Library` heading, Needs Upgrade link only when count > 0, and Capture entry. |
| L-002 | Search entry | Library search form submits to `/search?q=...` and does not create a second search implementation. |
| L-003 | Desktop filters | Source, quality, and tag filters are visible above the list and use clear selected state. |
| L-004 | Mobile filters | Mobile filter sheet opens from compact control, closes by button/backdrop/Escape, and stays above bottom nav. |
| L-005 | Source rows | Rows show source icon, title, platform/source, capture channel, quality badge, age, char count when available, warning when present, and enrichment state. |
| L-006 | Selection model | Checkboxes select rows without navigating. Escape clears selection. Toolbar appears only when rows are selected. |
| L-007 | Ask selected | Routes to `/ask?scope=selected&ids=<comma ids>` for 1-50 selected items. Disabled above 50 with clear title/copy. |
| L-008 | Bulk tag | Blank tag rejected. Success leaves each selected item with the canonical tag after reload. Duplicate submission remains idempotent. Error displays without clearing selection. |
| L-009 | Bulk add collection | Disabled when no manual collections exist. Success leaves each selected item in the selected collection after reload. Duplicate submission remains idempotent. Error displays without clearing selection. |
| L-010 | Destructive actions | No Library Delete button, destructive icon, destructive success copy, or focusable delete control remains. |
| L-011 | Empty states | Unfiltered empty state sends user to Capture. Filtered empty state offers clear filters. |

### Search

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| S-001 | Search query | Empty query shows a calm prompt. Non-empty query renders result count or no-match state. |
| S-002 | Search modes | Mode controls preserve query and show active state for FTS, Semantic, and Hybrid. |
| S-003 | Provider-down state | Semantic/hybrid provider-down state uses product copy: "AI search is unavailable" or equivalent, mentions AI services/settings, and does not put terminal commands in the primary UI. |
| S-004 | Result rows | Results link to item detail and show source type and relative capture time without text overlap. |

### Topic

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| T-001 | Topic header | Shows topic name, generated/derived-topic label, source count, optional description, and Ask topic when items exist. |
| T-002 | Topic scope health | Shows compact scope health: total sources, readable/full-text count when derivable, and weak/needs-upgrade count when derivable. |
| T-003 | Topic item list | Shows topic items with source icon, title, platform, quality, relative time, and excerpt when body exists. |
| T-004 | Topic empty/not-found | Empty topic state is truthful. Unknown topic uses app not-found behavior with shell still stable. |
| T-005 | Topic Ask | Ask topic routes to `/ask?scope=topic&topic=<slug>` only when items exist. |

### Collection

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| C-001 | Collection header | Shows collection name, item count, kind badge for auto collections, optional description, and Ask collection when items exist. |
| C-002 | Collection scope health | Shows compact scope health: total items, readable/full-text count when derivable, and weak/needs-upgrade count when derivable. |
| C-003 | Collection item list | Shows items with icon, title, source type/platform where available, quality where available, and relative capture time. |
| C-004 | Collection empty/not-found | Empty state is truthful. Unknown collection uses app not-found behavior with shell still stable. |
| C-005 | Collection Ask | Ask collection routes to `/ask?scope=collection&collection=<id>` only when items exist. |

## 6. Validation Matrix

| Gate | Required evidence |
| --- | --- |
| Focused tests | Add tests for retained bulk tag/collection postconditions, duplicate/idempotent behavior, and actual persisted rows. |
| Delete negative scan | In `src/components/library-list.tsx`, no `Trash2` import, no `bulkDeleteItemsAction` import/use, no `handleBulkDelete`, and no rendered Library `Delete` button. |
| Delete browser negative check | In selected Library state, no visible or focusable control with accessible name `Delete`; no destructive success copy appears. |
| Static checks | `git diff --check`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. |
| Browser routes | `/library`, filtered `/library?source=...`, tagged `/library?tag=...`, `/search`, `/search?q=<hit>`, `/search?q=<miss>`, semantic provider-down state, populated `/topics/<slug>`, unknown `/topics/<missing>`, populated `/collections/<id>`, empty `/collections/<id>`, unknown `/collections/<missing>`. |
| Interaction QA | Select rows, Ask selected route, Escape clears selection, mobile filter open/close, bulk tag success/error, bulk collection success/disabled/error. |
| Accessibility | Focusable controls have labels, disabled controls are truthful, dialog state has `role="dialog"` and close path, active controls meet contrast targets. |
| Console check | Browser console has no fresh warnings/errors on changed routes. |
| Forbidden scan | Scan `src` for stale `AI Brain`, fake profile/email, prototype routes, forbidden QR/offline/storage/telemetry copy, and Library destructive affordances introduced or retained by this slice. |

## 7. Required Viewports and Themes

| Surface | Required screenshots |
| --- | --- |
| Library default | 390x844 light, 390x844 dark, 768x1024 light, 1024x768 light, 1280x800 light, 1440x900 dark |
| Library filtered/tagged | 390x844 light with sheet open, 1280x800 light |
| Library selected toolbar | 390x844 light, 1280x800 light |
| Search | 390x844 light empty, 1280x800 light result, 1280x800 light no result, provider-down state if feasible by environment |
| Topic populated | 390x844 light, 1280x800 light |
| Topic not-found | 1280x800 light shell-stable check |
| Collection populated | 390x844 light, 1280x800 light |
| Collection empty | 1280x800 light |
| Collection not-found | 1280x800 light shell-stable check |

## 8. Data Safety and Privacy

- No raw tokens, PINs, cookies, provider keys, or private personal notes may appear in docs/screenshots.
- QA must use a local temporary database for mutations.
- Production QA is read-only unless a later release runbook defines a temporary object and cleanup proof.
- Existing destructive server action may remain for other app surfaces, but Library must not expose destructive bulk delete in this feature.
- Success messages for bulk tag/collection must be truthful. If the implementation reports attempted count rather than changed count, copy must say "Applied to N selected items" or equivalent, not imply N new attachments were created.

## 9. Out of Scope

- Item detail revamp beyond links from rows.
- Needs Upgrade revamp beyond existing count/link.
- Capture revamp beyond existing Capture entry.
- Settings revamp beyond collection/tag support needed by validated Library actions.
- Android native runtime validation.
- QR pairing, offline sync/cache, automatic backups, storage charts, telemetry, E2EE, connected-device management.
- Active Library bulk delete.
- Topic mutation drawers and Collection rename/add-item drawers.
- Pixel-perfect Magic Patterns claim without fresh MP screenshots/source for these exact surfaces.

## 10. Local Completion Definition

This feature can be marked locally complete when:

1. Implementation plan v2 exists after adversarial review.
2. Required code changes are implemented.
3. Deterministic fixture data or equivalent temporary local data covers populated Library, Topic, Collection, Search hit, Search miss, and empty Collection.
4. Static checks pass.
5. Browser visual and interaction evidence exists for the required viewport matrix.
6. Library destructive delete is absent from source imports, rendered UI, focusable controls, and selected-state screenshots.
7. Bulk tag and bulk collection have persisted-row validation if retained.
8. The project tracker records the feature status and remaining release blockers.

This feature cannot be marked released until the broader web revamp release packet, backup/rollback, production deploy, and live smoke gates pass.
