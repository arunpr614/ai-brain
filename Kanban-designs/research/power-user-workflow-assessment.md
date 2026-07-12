# Card Processing Workflow — Power-User and Workflow Assessment

**Status:** Discovery recommendation; not implemented

**Council role:** Product Manager — Power User and Workflow

**Date:** 2026-07-11

**Direction assessed:** Processing — Inbox-first triage with a secondary board

## Executive assessment

Direction 2 is the strongest daily-use model, provided the prototype treats Processing as a fast, reversible queue rather than a small project-management system.

The primary power-user loop should be:

1. Open the oldest unprocessed matching source.
2. Inspect enough context to decide.
3. Move it with a labeled control, not only drag.
4. Keep focus on the next source at the same list position.
5. Undo without losing filters, notes, selection, or place.

The most important additions to the current product direction are:

- Make list-based triage the speed baseline. Drag is an optional board accelerator.
- Define stable ordering per status and do not imply manual priority where the current sort is chronological.
- Make batch results explicit and version-checked per source; partial success must never look like total success.
- Preserve a validated return context from Processing into the existing item-detail route.
- Keep filters in the URL, view preference local, and scroll anchors ephemeral. A fresh navigation entry should not silently reopen a narrow filter.
- Use server-confirmed versions for moves, reorders, archive, restore, and undo. No silent last-write-wins.
- Keep mobile task-equivalent through an Inbox list and one-status-at-a-time board representation.

The v1 release should not add assignments, due dates, reminders, dependencies, WIP limits, workflow automation, saved views, or AI-directed status changes.

## Evidence basis

This assessment distinguishes current behavior from proposed behavior. Nothing below represents the workflow feature as shipped.

Evidence path aliases:

- PROJECT is the repository root containing this document.
- WIKI is the sibling worktree at ../ai-brain-wiki-card-processing-workflow-20260711.
- GOAL is /Users/arun.prakash/.codex/attachments/514e46ef-5f1a-4e64-9a0d-8e33e8c20f2e/goal-objective.md.

| Evidence | Current-product observation | Implication |
|---|---|---|
| PROJECT/src/app/library/page.tsx | Library is server-rendered, retrieves at most 100 items, orders through the repository, keeps source/quality/tag filters in query parameters, and distinguishes an empty library from no filter matches. | Processing needs server aggregates and bounded pages; URL filters and distinct empty states are compatible with current conventions. |
| PROJECT/src/db/items.ts | All current creation paths converge on insertCaptured; ItemRow has no workflow or archive field; Library ordering is captured_at descending with limit/offset. | New captures can receive one consistent Inbox default, but workflow state/history/rank/archive require new design. Totals cannot be inferred from loaded rows. |
| PROJECT/src/db/client.ts and PROJECT/src/db/migrations/001_initial_schema.sql | Items are the central source aggregate; the cards table is a separate review/SRS substrate. | Workflow belongs to items or a related workflow projection, not the existing cards table. |
| PROJECT/src/components/library-list.tsx | Desktop and mobile rows have explicit checkboxes; selection exposes bulk actions; Escape clears selection; changing the client quality filter clears selection; success/error feedback is announced. | Reuse explicit selection and toolbar conventions. Selection must not remain hidden after a query change. |
| PROJECT/src/components/sidebar.tsx | Desktop uses a collapsible rail; mobile has Library, Capture, Ask, and More. Command search already has a keyboard entry point. | Processing can be a desktop peer, but mobile should initially enter through More and a Library summary instead of displacing a primary destination. |
| PROJECT/src/app/items/[id]/page.tsx | Item detail is a full route and currently hard-codes Back to Library. The route contains reading, source trust, repair, Ask, export, taxonomy, and notes companions. | Reuse the route and add validated contextual return behavior. A separate first-release drawer would duplicate fragile state. |
| PROJECT/src/components/item-companion-tabs.tsx | Companion tabs implement tab semantics and arrow/Home/End keyboard behavior. | Processing controls should follow similarly explicit focus and keyboard semantics. |
| PROJECT/src/components/manual-note-editor.tsx | Notes journal locally, autosave, detect offline/session/failure/conflict states, preserve both versions, and announce cross-tab changes. | Workflow changes must not weaken note recovery or overwrite newer state. Status movement and note saving remain independent operations. |
| PROJECT/docs/feature-council/card-processing-workflow/research/screenshots/current-product/library-desktop-1440x1024.png | Desktop Library is a calm single-column source list with filter rows and a left rail. | Inbox-first list fits the existing visual and scanning model better than a four-column default. |
| PROJECT/docs/feature-council/card-processing-workflow/research/screenshots/current-product/library-mobile-390x844.png | Mobile uses compact selectable source cards, collapsed filters, and a persistent four-position bottom bar. | A compact Inbox list is already legible; a miniature four-column board is not. |
| PROJECT/docs/feature-council/card-processing-workflow/research/screenshots/current-product/card-detail-desktop-1440x1024.png and PROJECT/docs/feature-council/card-processing-workflow/research/screenshots/current-product/card-detail-mobile-390x844.png | Detail is a deep reading surface on both form factors and returns only to Library. | Processing must preserve origin, exact list position, and the current source even when a status change removes it from the origin filter. |
| PROJECT/docs/feature-council/card-processing-workflow/product/product-directions.md | The council recommends Processing, separate workflow/tag/category/archive concepts, first-exit metrics, reversible moves, online-only mutations, server counts, and an existing-detail-route posture. | This document makes those decisions operational for frequent daily use. |
| WIKI/Product-Overview.md | AI Brain is a single-owner, source-first personal system, not a collaborative workspace or full research-writing IDE. | Workflow should help one owner make decisions about sources without team/task-management concepts. |
| WIKI/Library-and-Item-Management.md | Library supports chronological browsing, filters, selection, bulk organization, detail, Ask, export, and page-specific failures. | Processing should reuse source identity, selection patterns, detail, and taxonomy language. |
| WIKI/Organization-Tags-Topics-and-Collections.md | Category, manual/generated tags, topics, and collections are distinct. | Workflow status and archive must remain separate facets. |
| WIKI/Capture-and-Ingestion.md | Duplicate URLs reuse existing identity; successful capture does not imply downstream processing completion. | Duplicate capture must not reset workflow. Inbox admission is separate from enrichment state. |
| WIKI/Manual-Content-Notes.md | My notes is an attached layer with local journal, compare-and-swap, recovery, and conflict review. | Processing may expose notes through detail but must not create a second editor or coupled save path. |
| WIKI/Data-Model.md | Items are canonical; cards exist without a spaced-repetition product. | “Card” remains a presentation noun, not a new aggregate. |

## Power-user success definition

A successful design lets a frequent user reduce a large Inbox without losing trust or context.

### Daily speed outcomes

- A source can leave Inbox from its row with one menu invocation and one destination choice.
- After a successful move, focus advances to the next matching source at the same visual index. The page does not jump to the top.
- The user can open detail, inspect or edit My notes, change status, and continue to the next source without rebuilding the query.
- Pending feedback appears immediately on only the affected source. No full-page refresh is required for a move.
- If confirmation takes longer than three seconds, the source changes from a generic pending indicator to plain “Still saving” feedback. Retry is unavailable until the unknown outcome is reconciled.
- A user can select visible sources and apply one destination without repeating the action per row.
- Board use is not required for a fast day-to-day loop.

### Trust outcomes

- The UI never reports a move, reorder, archive, restore, or undo as complete before server confirmation.
- A later change in another tab or device is never overwritten silently.
- A failed action returns only the affected source to its confirmed state and leaves the rest of the view stable.
- A source that no longer matches the query after a successful move has a predictable focus and return rule.
- Note drafts retain the current journal/conflict behavior regardless of workflow action success or failure.

## Recommended v1 workflow contract

### Status meanings and transitions

| From | Inbox | To Do | In Progress | Done | Archived |
|---|---|---|---|---|---|
| Inbox | Reorder only | Allowed | Allowed | Allowed | Not allowed |
| To Do | Allowed | Reorder only | Allowed | Allowed | Not allowed |
| In Progress | Allowed | Allowed | Reorder only | Allowed | Not allowed |
| Done | Allowed | Allowed | Allowed | Reorder only | Archive allowed |
| Archived | Reprocess explicitly | Not directly | Not directly | Restore default | No-op |

Concrete transition rules:

1. Every newly created, non-duplicate item enters Inbox after the item write succeeds.
2. A duplicate capture keeps the existing workflow status, rank, and archive state.
3. Any active state may move to any other active state. Backward movement is valid and not treated as an error.
4. Every confirmed exit from Inbox is an event. firstProcessedAt is the earliest confirmed, non-undone exit; later ordinary returns and exits do not increment “processed.”
5. Every confirmed entry to Done is an event. firstCompletedAt is the earliest confirmed, non-undone entry; later ordinary reopening and recompletion do not increment “completed.”
6. A move back to Inbox preserves capturedAt, firstProcessedAt, and firstCompletedAt and records returnedToInboxAt for ordering/audit.
7. Only a currently Done, non-archived source may archive.
8. Archive is a separate archivedAt lifecycle attribute; workflowStatus remains Done.
9. Restore clears archivedAt and leaves workflowStatus as Done.
10. Reprocess is a separate explicit action that clears archivedAt if necessary and moves the source to Inbox.
11. Every mutation carries the source version the user acted on. A version mismatch returns a conflict rather than overwriting.
12. The mutation response is authoritative. Client position changes remain visibly pending until it arrives.
13. Existing sources remain legacy/unclassified until an explicit recent, selected, or all-history import. Import places them in Inbox without manufacturing processed or completed events.

### Ordering and prioritization

Ordering must be explainable at a glance.

| Scope | Default order | Alternatives | Reorder behavior |
|---|---|---|---|
| Inbox | Oldest captured first | Newest first; Manual priority | Manual reorder is enabled only in Manual priority. Chronological modes never write rank. |
| To Do | Manual priority | Oldest/newest captured | Cross-status entry goes to the top in manual mode. |
| In Progress | Manual priority | Most recently changed | Cross-status entry goes to the top in manual mode. |
| Done | Most recently completed | Oldest completed | No default manual rank; Done is a review/archive buffer. |
| Archived | Most recently archived | Oldest archived; restored source title search | No manual rank. |

Additional rules:

- The active sort is always labeled. “Priority” is not shown unless a manual rank exists.
- Manual rank is scoped to one status. Moving a source to another status creates its rank in the destination and retires its prior active rank.
- Moving to Inbox while Inbox is chronological places the source by the selected chronological rule. It does not silently jump to the top.
- Moving to a manual destination inserts at the top. The confirmation says the destination and position.
- Drag reorder and Move up/Move down/Move to top/Move to bottom operate on the same rank mutation.
- Reordering a filtered result changes order within the full status, not merely the visible subset. The action preview names the nearest visible neighbor; hidden filtered sources retain their relative order.
- Batch movement inserts the selected block at the top of a manual destination while preserving the selected sources’ current visible order.
- v1 does not include arbitrary priority scores, due-date sort, WIP limits, or cross-status “global priority.”

### Inbox triage loop

Each Inbox row exposes Open and Move to. Leave in Inbox is available in an opened triage/detail state but does not create a workflow event.

After a successful move from Inbox:

- The moved row collapses only after confirmation.
- Focus moves to the next remaining matching row at the same index.
- If no later row exists, focus moves to the previous row.
- If the Inbox is empty, focus moves to the empty-state heading and the completion summary is announced.
- Undo restores the source and returns focus to that restored row when the current query includes it.

Detail adds a “Process next” action. It navigates only after the note editor has completed its existing navigation-safety check. If the current source leaves Inbox from detail, Back to Processing returns to the next matching source anchor rather than an empty gap.

## Batch-action contract

### Included in v1

- Select visible sources.
- Shift-select a contiguous range in the currently loaded list.
- Move selected active sources to one status.
- Archive selected eligible Done sources.
- Restore selected archived sources to Done.
- Clear selection with Escape.

### Batch safety rules

1. Changing scope, filters, search, sort, or archive/active mode clears selection and announces it. Switching Board and List for the same query preserves selection.
2. Selection never includes unloaded pages in v1. “Select all matching” is deferred because it creates hidden-scope and long-running mutation risk.
3. The toolbar always states selected count and eligible count for the chosen action.
4. A mixed-state Archive request does not silently skip. The preview states, for example, “14 of 17 selected sources are Done; archive 14.” The user confirms the eligible subset or cancels.
5. One batch request version-checks each source and returns succeeded, conflicted, ineligible, and failed IDs.
6. Partial success is reported explicitly. Failed/conflicted sources stay selected; successful sources clear from selection.
7. One Undo action targets exactly the succeeded subset and carries the confirmed post-mutation versions.
8. Batch reorder is not supported. Batch move preserves visible order on insertion.
9. The current Library maximum of 100 loaded rows is a useful prototype stress input, not a permanent Processing limit.

## Keyboard and non-drag operations

Drag is never the only or primary semantic operation.

### Required keyboard path

- Tab reaches filters, view controls, row selection, row Open, Move to, reorder, and archive controls in a logical order.
- Space toggles an explicitly focused checkbox.
- Enter opens a focused source link or activates the focused control.
- The Move to button opens a menu with Inbox, To Do, In Progress, and Done; arrow keys move within the menu, Enter confirms, and Escape closes without change.
- In manual ordering, a Reorder menu provides Move up, Move down, Move to top, and Move to bottom.
- Escape clears selection only when no menu/dialog is open, matching the current Library convention.
- Focus remains on the affected source while pending. After confirmed removal from the current result, it follows the Inbox focus rule.
- Status/count changes use a polite live region; conflicts and lost-access events use an assertive alert.

### Optional power accelerators

The existing command palette may add “Move focused source to…,” “Archive focused source,” and “Undo last Processing action.” These commands are discoverable by label and are not required for task completion.

Single-character global shortcuts are out of scope for v1. They conflict with text entry and assistive-technology navigation unless users can disable or remap them.

### Board equivalence

- Every draggable source has a visible or menu-based Move to control.
- Every reorder handle has the Reorder menu equivalent.
- Dragging across columns and choosing Move to call the same transition contract.
- Dropping at an uncertain virtualized position is prohibited; use top insertion or a server-addressable neighbor.
- A drag failure returns the card to the confirmed column and rank without reloading other columns.

## Undo and recovery

### Undo policy

- Move, completion, archive, restore, reprocess, and batch actions offer Undo for at least 10 seconds after server confirmation.
- Undo remains available while switching Inbox/Board/List/Archived or opening detail in the same browser tab during that window.
- Undo does not survive a full reload or closed tab. Archived restore remains the durable recovery after the archive Undo window.
- Undo is a new version-checked mutation, not a client-only visual reversal.
- If the source changed after the original action, Undo does not overwrite it. The UI shows the current state and offers an explicit new Move to action.
- Undo appends a reversal and marks the original event undone; it does not erase audit history. If the original was the only qualifying first exit or first completion, the current processed/completed metric decrements and the projection clears. A later confirmed, non-undone exit/entry can then become the first. An ordinary backward move is not Undo and does not decrement the metric.

### Recovery boundaries

- Failed optimistic moves restore confirmed status and rank.
- Failed archive keeps the source in Done.
- Failed restore keeps the source in Archived.
- Lost connectivity disables new workflow mutations. Existing pending requests resolve to confirmed, failed, or unknown; unknown is reconciled from the server before Retry is enabled.
- Workflow actions are not silently queued offline in v1.
- Note drafts continue journaling offline under the existing note model. A workflow error must not clear, submit, or alter a note draft.

## Filters, view persistence, and place preservation

### Filter semantics

- Manual tags and AI category are separate facets.
- Values within a facet combine with OR; facets combine with AND.
- No user tags and No AI category are explicit values.
- Active filters appear as removable chips and in the URL.
- Status/column counts are server totals for the current query and are labeled “matching.”
- Inbox backlog is an unfiltered total of non-archived Inbox sources and is labeled “total.”
- AI category changes may add/remove a source from a filtered result but never change workflow status.

### Persistence rules

| State | Storage/lifetime |
|---|---|
| Filters, search, active/archived scope, list sort | Canonical URL; survives refresh, Back/Forward, and detail return. |
| Last explicit Board/List choice | Local preference; used only when entering the active-work area without an explicit view. |
| Inbox as Processing landing view | Always the default top-level Processing entry; a remembered board preference does not bypass Inbox. |
| Selection | In-memory for the current query; preserved Board/List, cleared on query/scope change or reload. |
| Scroll/card anchor | Browser history/session state keyed by source ID and query; survives detail return and Board/List switch, not a permanent preference. |
| Per-column loaded cursor | In-memory for the current visit; refreshed when query changes. |

A fresh click on the primary Processing navigation opens an unfiltered Inbox. Returning with browser Back or a validated Back to Processing link restores the URL and anchor. This avoids the “missing cards” problem caused by silently persistent filters while keeping bookmarkable power-user views.

### View-switch rules

- Board and List use the same active query and matching counts.
- Switching view preserves filters, selection, and a best-available source anchor.
- List-specific sort remains in the URL while Board is open but is not presented as Board ordering. Returning to List restores it.
- If the anchor source is not rendered in the target view, restore the nearest status and captured-time neighbor and announce that the exact source is outside the loaded page.

## Multi-tab and multi-device trust

Every workflow projection needs a monotonically changing source workflow version.

1. A mutation submits expectedVersion plus the intended transition/rank/archive operation.
2. The server commits only if expectedVersion still matches.
3. Success returns the new source projection, rank neighbors, counts delta, and new version.
4. Conflict returns the current projection and a reason such as “Moved to Done in another tab.”
5. The client replaces only the affected source with confirmed current state and offers “Try your move again.”
6. Same-device tabs receive confirmed workflow changes through a broadcast mechanism after server acknowledgement. Broadcast is a freshness hint, not authority.
7. A pending local mutation that receives a newer broadcast waits for its server response, then reconciles; it never applies both blindly.
8. Reorder conflicts refresh the affected card and neighbor range, not the whole board.
9. A deleted or inaccessible source is removed with an alert and a stable next-focus target.
10. Metrics and counts reconcile from server deltas and periodic aggregate refresh; clients do not compute global truth from loaded rows.

## Failure-state matrix

| State | User-visible behavior | Recovery |
|---|---|---|
| Initial load fails | Stable Inbox/List/Board shell with “Processing could not load” and Retry; navigation remains available. | Retry query; do not display zero counts as real. |
| One status move fails | Affected source returns to confirmed state/rank; plain error appears beside it. | Retry same intent or choose another destination. |
| Confirmation delayed | Source remains visibly pending; other sources remain usable unless the action changes shared selection. | Show “Still saving” after three seconds; reconcile before allowing a duplicate mutation. |
| Version conflict | Show current status and who/where only if that metadata truly exists; otherwise say another session changed it. | Refresh affected source and offer intended action again. |
| Reorder conflict | Keep status, restore confirmed neighbor position, announce changed ordering. | Retry Move up/down/top/bottom against new version. |
| Batch partial success | State exact succeeded/conflicted/failed/ineligible counts. Failed/conflicted sources remain selected. | Undo succeeded subset; retry selected remainder. |
| Archive fails | Source remains in Done and visible. | Retry Archive. |
| Restore fails | Source remains Archived. | Retry Restore. |
| Undo conflicts | Never force old state. Show current state and that Undo is no longer safe. | Offer labeled Move to/Restore actions. |
| Offline before action | Read/filter remains available from loaded data; mutation controls are disabled with reason. | Re-enable after connection and server refresh. |
| Connection lost after send | Do not assume failure or success. Mark “Checking saved state.” | Fetch authoritative projection, then show confirmed outcome or Retry. |
| Source deleted/inaccessible elsewhere | Remove only that source and announce it. | Focus next logical source; no Retry if access is gone. |
| AI category changes under active filter | Source leaves/enters matching results after confirmed taxonomy refresh; workflow status unchanged. | Announce result-set change; keep current focus stable. |
| No sources in status | “No sources in this state.” | Offer another status or capture entry. |
| No sources match filters | “No sources match these filters.” | Clear individual chips or all filters. |

## Archive and restore assessment

Archive should remain a Processing lifecycle control, not a content control.

- Done acts as a review buffer; completion never auto-archives.
- Archived sources disappear from active Processing only.
- They remain available in Library, global search, Ask eligibility, tags, collections, detail, notes, and export according to existing rules.
- Archived view supports the same taxonomy filters and source search.
- Restore to Done is the primary action and is available individually and in batch.
- Reprocess to Inbox is visually separate because it changes both archive state and workflow intent.
- Direct Move to To Do/In Progress from Archived is excluded in v1. Restore first, then move, producing understandable history.
- Delete remains a separate destructive action on the existing detail surface and must not be styled or worded as Archive.

## Detail and notes continuity

The existing item-detail route remains the source of truth.

### Entry and return

- Opening detail from Processing records a validated internal return context: scope, query, source anchor, view, status, and scroll position.
- Back copy becomes “Back to Processing” only for that valid context; direct links and Library entry retain “Back to Library.”
- Return context must not accept an arbitrary external URL.
- If the source still matches, return focuses it.
- If a confirmed transition removed it from the query, return focuses the next matching source and announces where the original moved.
- Browser Back/Forward preserves the same behavior.

### Workflow controls in detail

- Detail shows current workflow status and a labeled Move to control.
- Archive appears only when the confirmed state is Done.
- Pending/conflict/failure behavior matches list and board.
- Changing status does not close detail or remount the note editor.
- “Process next” uses the stored Inbox order and filters, not an unfiltered global next item.

### Notes independence

- Workflow status and notes save independently.
- A status move never implies that note text was saved.
- A failed status move never rolls back note content.
- A dirty/offline/conflicted note retains the current journal and navigation-safety behavior before Process next or return.
- v1 does not place an editable duplicate note surface in a board drawer.

## Mobile equivalence

Mobile should be task-equivalent, not layout-identical.

| Task | Desktop | Mobile |
|---|---|---|
| Daily triage | Inbox list | Same Inbox list with compact rows |
| Board overview | Four columns when space permits | One status at a time with a segmented status control and matching counts |
| Move | Drag or Move to | Move to; optional gesture is never required |
| Reorder | Drag handle or Reorder menu | Reorder menu; optional long-press drag only if it remains accessible |
| Batch | Checkboxes and floating toolbar | Checkboxes and bottom toolbar above app navigation |
| Filters | Inline facets/chips | Collapsed filter sheet plus visible active chips/count |
| Detail | Existing full route, contextual return | Existing tabbed full route, contextual return |
| Archive/restore | Row/card/batch controls | Row menu and batch toolbar |
| Undo | Non-modal action notice | Non-modal action notice above bottom navigation |

Mobile acceptance requires the same outcomes: process, move backward, batch move, archive, restore, reprocess, filter, undo, resolve failure, and preserve notes. It does not require simultaneous visibility of four columns or drag.

## Scope discipline

### Required for v1 prototype

- Inbox-first Processing entry.
- Board and List active views.
- Explicit Move to and accessible reorder.
- Stable ordering modes defined above.
- Visible pending, Retry, conflict, and partial-batch states.
- Undo and archived restore.
- Contextual item-detail return with note continuity.
- URL filters and server matching counts.
- Mobile one-status board equivalent.

### Explicitly out of scope

- Assignees, teams, sharing, comments, permissions, or presence.
- Due dates, reminders, recurring work, dependencies, milestones, sprints, or WIP limits.
- AI-selected or rules-driven workflow state.
- Workflow-specific note editor or board detail drawer in v1.
- Offline queued workflow mutations.
- Select all matching across unloaded pages.
- Saved filter views, custom statuses, custom columns, automations, or reporting dashboards.
- Priority scores, effort estimates, time tracking, or cross-status global rank.
- Archive as deletion or removal from Library/search/Ask.
- Silent historical backfill.

## Acceptance inputs for prototype and later specification

These are concrete scenarios the prototype and subsequent PRD/technical design must accept. They are not evidence of implementation.

| ID | Input/setup | Required result | Evidence path motivating it |
|---|---|---|---|
| PWF-01 | Inbox total 327; 100 rows loaded; oldest-first; no filters. Move the first row to To Do. | Only the row is pending; confirmation removes it; focus moves to the next row; total becomes 326; processed first-exit metric increments once. | PROJECT/src/app/library/page.tsx; PROJECT/src/db/items.ts; PROJECT/docs/feature-council/card-processing-workflow/product/product-directions.md |
| PWF-02 | Undo the first To Do move, then move to To Do again; later move back to Inbox normally and out again. | Undo restores Inbox and removes the undone event from the processed metric without deleting history; the next confirmed exit counts once; the later ordinary return/exit does not count again. | GOAL; PROJECT/docs/feature-council/card-processing-workflow/product/product-directions.md |
| PWF-03 | Inbox filtered by two manual tags and one AI category. | Within-facet OR/across-facet AND is visible; column counts say matching; total Inbox remains 327 total. | WIKI/Organization-Tags-Topics-and-Collections.md; PROJECT/docs/feature-council/card-processing-workflow/product/product-directions.md |
| PWF-04 | Switch filtered List to Board and back. | Query, selection, and best source anchor persist; list sort returns; Board labels its independent order. | PROJECT/src/app/library/page.tsx; PROJECT/src/components/library-list.tsx |
| PWF-05 | Keyboard-only user focuses a source, opens Move to, selects In Progress, then reorders it to top. | No drag is needed; focus and announcements follow the keyboard contract. | PROJECT/src/components/item-companion-tabs.tsx; PROJECT/src/components/library-list.tsx |
| PWF-06 | Select 17 sources: 14 Done, 3 other states; invoke Archive. | Preview identifies 14 eligible; no silent skip; result names succeeded/conflicted/failed counts; failed remainder stays selected. | PROJECT/src/components/library-list.tsx; PROJECT/docs/feature-council/card-processing-workflow/product/product-directions.md |
| PWF-07 | Batch move 100 visible sources to To Do while 2 were changed elsewhere. | 98 succeed in visible order at destination top; 2 conflicts remain selected with current state; one Undo targets only 98. | PROJECT/src/app/library/page.tsx 100-row input; PROJECT/src/components/library-list.tsx |
| PWF-08 | Tab A displays Inbox; Tab B moves the same source to Done; Tab A tries To Do using its old version. | Tab A cannot overwrite Done; it shows current state and offers Try your move again. | PROJECT/src/components/manual-note-editor.tsx cross-tab/conflict precedent |
| PWF-09 | Send a move, then lose network before response. | UI says Checking saved state; it reads authoritative state before Retry; no duplicate event is created. | WIKI/Capture-and-Ingestion.md; PROJECT/src/components/manual-note-editor.tsx |
| PWF-10 | Open a filtered Inbox source in detail, edit My notes offline, move source to To Do after reconnect, then Back. | Note draft survives independently; detail stays open during move; Back restores the query and focuses the next matching Inbox row. | PROJECT/src/app/items/[id]/page.tsx; PROJECT/src/components/manual-note-editor.tsx; WIKI/Manual-Content-Notes.md |
| PWF-11 | Archive a Done source, Undo within 10 seconds, archive again, let Undo expire, then restore from Archived. | First Undo safely returns Done; durable restore later returns Done; content, notes, tags, Library/search presence are unchanged. | PROJECT/docs/feature-council/card-processing-workflow/product/product-directions.md; WIKI/Library-and-Item-Management.md |
| PWF-12 | Restore three archived sources in batch, then reprocess one. | All restore to Done; only explicit Reprocess moves one to Inbox; history remains readable. | GOAL; PROJECT/docs/feature-council/card-processing-workflow/product/product-directions.md |
| PWF-13 | AI category changes while category filter is active. | Result membership and matching count update; workflow status/history do not; focus does not jump. | WIKI/Organization-Tags-Topics-and-Collections.md |
| PWF-14 | A source is deleted in another session while focused. | Source is removed with an alert; focus moves to the next logical source; no whole-view reset. | PROJECT/src/components/manual-note-editor.tsx; PROJECT/docs/feature-council/card-processing-workflow/product/product-directions.md |
| PWF-15 | Mobile 390 × 844: enter from Library summary, process five sources, batch-move three, open detail, return, archive Done, restore. | All tasks are available without drag; action notice stays above bottom nav; exact query/place returns. | PROJECT/docs/feature-council/card-processing-workflow/research/screenshots/current-product/library-mobile-390x844.png; PROJECT/docs/feature-council/card-processing-workflow/research/screenshots/current-product/card-detail-mobile-390x844.png; PROJECT/src/components/sidebar.tsx |
| PWF-16 | Offline with previously loaded Processing data. | Reading and filtering remain available; Move/Reorder/Archive/Restore explain that connection is required; nothing queues silently. | PROJECT/docs/feature-council/card-processing-workflow/product/product-directions.md; WIKI/Product-Overview.md |
| PWF-17 | Active query has no results, while Inbox has sources. | Empty state says no sources match filters and offers Clear filters; it does not claim Inbox is empty. | PROJECT/src/app/library/page.tsx |
| PWF-18 | Fresh click on Processing after previously using a narrow bookmarked filter. | Unfiltered Inbox opens; browser Back or the bookmark restores the narrow URL. | PROJECT/src/app/library/page.tsx query-filter convention |
| PWF-19 | Existing owner launches with 5,000 historical sources and chooses recent-30-days import. | Only the explicit recent set enters Inbox; older sources remain available in Library as legacy/unclassified; no processed/completed history is fabricated. | PROJECT/src/db/items.ts; WIKI/Library-and-Item-Management.md; PROJECT/docs/feature-council/card-processing-workflow/product/product-directions.md |

## Prototype evaluation questions

1. Can a user process 20 mixed sources without the viewport jumping or rebuilding their query?
2. Does oldest-first feel motivating, or do users immediately switch to newest/manual priority?
3. Can users discover Board without mistaking it for the required daily path?
4. Can keyboard and mobile users complete every transition, reorder, batch, archive, restore, and undo task without drag?
5. Do partial batch results and multi-tab conflicts feel recoverable rather than alarming?
6. Does contextual detail return preserve enough place to make notes and source inspection part of triage?
7. Are matching counts versus total Inbox unmistakable?
8. Does Done remain a useful review buffer without creating pressure to auto-archive?

## Final recommendation

Proceed with the Processing prototype, using the Inbox list as the performance and accessibility baseline and the Board as a secondary spatial tool.

The prototype should prioritize five proof points before expanding scope:

1. Confirmed move plus automatic next-source focus.
2. Version-checked Undo and multi-tab conflict recovery.
3. Explicit partial-batch outcomes.
4. Exact filter/detail/place continuity with independent note safety.
5. Mobile completion of the same semantic tasks without drag.

If those five behaviors do not feel fast and trustworthy, adding more workflow features will amplify friction rather than solve the backlog problem.
