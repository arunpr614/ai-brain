# Library and Item Management

Purpose: Document browsing, filtering, selection, reading, bulk actions, and exports.
Audience: AI agents and contributors changing core library workflows.
Verified against: deployed application `ea7b159515fc37f76ffdb83dedf2d33d17f9a193`.
Runtime evidence through: 2026-07-12 for Processing integration; core Library retains its feature-specific evidence boundary.
Last reviewed: 2026-07-12.
Owner: AI Brain maintainer.

**Status:** Implemented · **Confidence:** High · **Availability:** Default

Users browse chronological items, filter by source/quality/tag, select multiple items, tag/collect/delete in bulk, and open an item for Original, Digest, Ask, Related, Details, My notes, trust/provenance, transcript preview, repair and export. Source-reading Focus reduces distraction without creating a second record.

The feature covers item/library Markdown/ZIP exports and selected-source Ask when the scope is healthy. It does not provide saved searches, rule-based smart filters, collaboration, a native PDF reader, annotations, or round-trip import.

Empty/loading/success/failure behavior is page-specific: empty library guidance, server-rendered result lists, selection validation, and action errors. Destructive actions require authenticated server actions and must preserve SQLite/FTS/vector integrity.

Primary files: `src/app/library/`, `src/app/items/[id]/`, `src/components/library-list.tsx`, `src/app/actions.ts`, `src/db/items.ts`, export routes, and library/item tests.

Related: [Organization](Organization-Tags-Topics-and-Collections), [Search and Ask](Search-RAG-and-Ask), [Capture Quality and Repair](Capture-Quality-Review-and-Repair).

## User problem, entry points, and journey

The single owner needs to scan a growing library, narrow it, act on several items, and inspect one source without losing provenance. Entry points are `/library`, `/items/[id]`, topic/collection links, global navigation and command palette. The typical journey is filter → select or open → read/inspect companions → organize, repair, ask, export or delete.

The separate [Card Processing Workflow](Card-Processing-Workflow) adds an owner-controlled Inbox/Board/List/Archived lifecycle over the same `items`. Workflow state does not remove an item from Library, search, Ask, export, detail, notes, enrichment, or hard-delete cleanup. Library shows a Processing summary, and the existing detail/notes surface remains canonical.

## State and failure matrix

| State | Behavior |
|---|---|
| Empty | Library guidance and capture entrypoint; empty filters distinguish no library from no matches |
| Loading | Server-rendered page transition and client selection/action pending state |
| Success | Stable item identity, selected count, action confirmation and refreshed list/detail |
| Failure | Auth/session redirect, invalid selection, transaction/export error or unavailable derived content without deleting valid source |

## Architecture, data, APIs, and security

Pages and `src/components/library-list.tsx` call authenticated server actions in `src/app/actions.ts`; repositories in `src/db/items.ts`, `tags.ts`, `topics.ts` and `collections.ts` update `items` and join tables. Export routes read the same model and generate item Markdown or library ZIP. AI appears only through derived Digest/Related/Ask companions; library browsing itself does not call a model. Single-owner session rules protect browser operations; destructive actions and exports must preserve FTS/vector/join integrity and private caching.

## Configuration, tests, operations, and change impact

No dedicated rollout flag controls the core library. Attached-note companions and source-reading Focus have their own availability rules. Protecting tests include `src/app/actions.bulk.test.ts`, `src/lib/library/selected-actions.test.ts`, `src/lib/library/scope-health.test.ts`, item/collection/topic repository tests and `src/app/api/library/export.zip/route.test.ts`. Changes can affect navigation, selected-source Ask, taxonomy, exports, review/repair and item deletion cleanup. Start at the page/component, then action, repository and dependent retrieval/queue tests.

### Theme, responsive shell, navigation, and command palette

**Status:** Implemented · **Confidence:** High for code/tests · **Availability:** default. `src/app/layout.tsx`, shared sidebar/mobile navigation, theme bootstrap/toggle and command palette provide light/dark preference, responsive desktop/mobile routes and capture/search shortcuts. Empty navigation still exposes core routes; loading follows page transitions; successful preference changes persist the explicit theme; invalid/legacy values normalize to Light. Theme and sidebar/command behavior are protected by theme, sidebar-routing and command/navigation safety tests. This shell does not change item data, implement saved searches or provide a separate feature workspace. Changes can affect every page, focus/isolation, deep links, keyboard access and mobile layout.

Pinned evidence: [current source tree](https://github.com/arunpr614/ai-brain/tree/23868faf13c8e3d0821715e6f5d0e3d2af1e1a34/src).
