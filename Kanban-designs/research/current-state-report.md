# Card Processing Workflow — Current-State Report

**Status:** Discovery evidence; no workflow feature is implemented
**Repository baseline:** `1cb5d36f37611e60442b4f2c4433b45455273500`
**Wiki baseline:** `88a3520038703108a0533501c7a384c6def7b74e`
**Observed locally:** 2026-07-11 using a new ignored SQLite database and fictional cards only

## Executive finding

AI Brain already supports the two ends of a processing loop—fast multi-channel capture and a rich Library/item-detail experience—but does not persist the user's intent between them. Current status labels describe extraction, enrichment, embeddings, transcript recovery, and note save/index state. None means Inbox, To Do, In Progress, Done, or archived.

The feature should therefore be a projection of existing `items`, not a new content object. Library remains the durable browse/search/read surface; a new Processing section should answer “what needs a decision or action?”

## Application information architecture

- Desktop has a 240px collapsible sidebar with Capture, Library, Needs Upgrade, Ask, and Settings; utility links sit at the bottom (`src/components/sidebar.tsx:38-43`, `:91-253`).
- Mobile has a fixed four-slot bottom navigation for Library, Capture, Ask, and More (`src/components/sidebar.tsx:255-304`).
- Library and item/topic routes resolve to the Library navigation target; Settings subroutes resolve to Settings/More (`src/components/sidebar-routing.ts`).
- A Processing section can be a desktop peer after Library, but its mobile cost is higher. The evidence-backed first release should keep it under More and add a visible Inbox entry from Library rather than displacing Capture or Ask before usage is known.

## Library behavior

- Library lists `items` chronologically, provides server-side source/quality/tag filters, a search box, and a separate count query (`src/app/library/page.tsx:65-81`; `src/db/items.ts:125-268`).
- The page loads at most 100 records; the client applies an additional capture-quality tab filter to the loaded subset (`src/app/library/page.tsx:76`; `src/components/library-list.tsx:106-117`, `:380-405`).
- Rows/cards open the canonical item route and preserve source provenance, capture quality, time, and enrichment state (`src/components/library-list.tsx:279-345`).
- Bulk selection supports tagging, collection assignment, selected-source Ask, and hard delete; mobile and desktop toolbars differ but share actions (`src/components/library-list.tsx:356-365`, `:438-579`; `src/app/actions.ts:45-80`, `:174-194`).
- Current Library filtering does not support multiple manual tags, AI topics, workflow states, archive scope, or cursor pagination.

## Card creation and ingestion

Every confirmed creation path converges on `insertCaptured`:

1. Web manual note: `src/app/actions.ts:19-35` → `src/db/items.ts:91-101`.
2. Web URL and PDF: `src/app/capture-actions.ts:42-74`, `:104-142`.
3. Android/extension note API: `src/app/api/capture/note/route.ts:57-100`.
4. Android/extension URL API: `src/app/api/capture/url/route.ts:300-354`.
5. Telegram URL/text/PDF: `src/lib/telegram/dispatch.ts:358-374`, `:473-507`, `:551-594`.
6. Guarded Recall import: `src/lib/recall/importer.ts:146-165`.

`insertCaptured` currently defaults only capture time/source and inserts no workflow/archive values (`src/db/items.ts:54-89`). URL duplicate and repair/upgrade paths reuse an existing item, so they must preserve workflow and archive rather than resetting to Inbox.

## Item detail and notes

- The canonical item experience is the full `/items/[id]` route, not a modal. Desktop uses a reading column and companion rail; mobile uses Original, Digest, Ask, Related, Details, and feature-flagged Notes tabs (`src/app/items/[id]/page.tsx`; `src/components/item-companion-tabs.tsx`).
- The route provides source content, capture/provenance metadata, quality/repair affordances, tags, AI topics, collections, Ask, Related, export, and hard delete.
- Attached My notes are feature-flagged (`src/lib/notes/flags.ts:1-28`). When enabled, they support explicit save state, preview/focus, recovery journal, cross-tab invalidation, compare-and-swap conflicts, and consent-aware AI inclusion (`src/components/manual-note-editor.tsx`; `src/db/item-notes.ts`).
- Processing should add a compact status control to this route and preserve contextual return state. A quick-triage drawer may be prototyped, but it should not duplicate the full notes editor in v1.

## User tags, AI classifications, and collections

- User/generated tags share `tags` with `kind='manual'|'auto'`; item detail deliberately exposes only manual tags in the editor (`src/db/migrations/001_initial_schema.sql:67-79`; `src/app/items/[id]/page.tsx:208-213`).
- AI topics are separate `topics`/`item_topics` records with evidence and confidence (`src/db/migrations/017_topics.sql:1-24`).
- `items.category` is a legacy scalar classification, and enrichment currently writes category, auto tags, and topics (`src/lib/enrich/pipeline.ts:219-249`).
- Manual/auto collections are another organization concept (`src/db/collections.ts`).
- The proposed filter labels should be **User tags** (manual tags) and **AI topics** (topic joins). Workflow status and archive must remain separate from all taxonomy.

## Search and filtering

- Exact item search uses FTS over title/body; unified search combines item and note FTS with semantic/hybrid retrieval (`src/db/items.ts:359-384`; `src/lib/search/index.ts:56-137`).
- Search APIs currently accept query, mode, and limit, not workflow/taxonomy/archive predicates (`src/app/api/search/route.ts:21-53`).
- Archive should initially hide items only from active Processing. Archived items stay eligible in Library, direct detail, search, Ask, Related, and export, with an Archived badge. This limits blast radius and preserves saved knowledge.

## Archive, deletion, and lifecycle

- No item archive field, repository, route, or restore behavior exists.
- `deleteItem` removes artifacts, chunks/vectors, note-citing chat messages, and the item in one transaction; foreign keys cascade related rows (`src/db/items.ts:280-289`).
- Attached-note tombstones are a precedent for delayed-write safety, but are not an item archive (`src/db/migrations/022_item_notes.sql:1-13`; `src/db/item-notes.ts:467-515`).

## Analytics and metrics

- The application has provider usage accounting, error JSONL, queue/health signals, and operational logs, but no centralized product analytics system (`src/db/migrations/001_initial_schema.sql:120-133`; wiki `Deployment-and-Operations.md:16-18`).
- Product metrics cannot be derived accurately from current item rows. A content-free workflow event history is required for first exit from Inbox, first completion, archive/restore, reversals, and owner-timezone windows.

## Responsive and accessibility conventions

- The `md` breakpoint changes the application from sidebar to fixed bottom navigation.
- Mobile Library uses a modal filter sheet and 44px-equivalent targets; desktop uses inline filter controls (`src/components/mobile-library-filters.tsx`).
- Global focus-visible outlines and reduced-motion token collapse are built in (`src/app/globals.css:51-59`; `src/styles/tokens.css:177-183`).
- Existing components use semantic navigation, tablists, dialogs, toolbars, status regions, labels, and screen-reader names.
- Drag-and-drop is net-new and must be progressive enhancement. A labeled Move to control, keyboard-operable destination selection, focus restoration, and live announcement are required.

## Visual evidence

- [Library desktop](screenshots/current-product/library-desktop-1440x1024.png)
- [Library mobile](screenshots/current-product/library-mobile-390x844.png)
- [Item detail desktop](screenshots/current-product/card-detail-desktop-1440x1024.png)
- [Item detail mobile](screenshots/current-product/card-detail-mobile-390x844.png)
- [Attached notes desktop](screenshots/current-product/card-notes-desktop-1440x1024.png)
- [Attached notes mobile](screenshots/current-product/card-notes-mobile-390x844.png)

These screenshots prove an isolated local render against fictional data, not deployed production behavior.

## Current-state conclusion

The safest product seam is a new Processing route backed by a small lifecycle on `items`, an event history, and a separate archive timestamp. It should reuse Library cards, filters, and full item detail; preserve quality queues and AI enrichment as orthogonal systems; and avoid claiming workflow or archive behavior exists today.
