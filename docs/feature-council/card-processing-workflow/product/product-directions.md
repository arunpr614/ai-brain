# Card Processing Workflow — Product Directions

**Status:** Explored — not implemented
**Council owner:** AI Expert Brainstorm Council
**Date:** 2026-07-11
**Decision posture:** Discovery recommendation for prototype validation; no production behavior, schema, API, migration, or navigation change is represented as shipped.

## Executive recommendation

Prototype **Direction 2: Processing — Inbox-first triage with a secondary board**.

It best fits AI Brain's actual job: turn a growing capture backlog into useful, intentionally handled sources without turning the product into a generic project-management system. It gives the Inbox a clear behavioral loop, keeps Library as the durable browse/read/search home, preserves the existing full item-detail experience, and provides the required Kanban view without making four columns the only way to work. Its mobile posture is also substantially stronger than a compressed board.

The recommendation is intentionally not “Cards.” Current product language calls the central aggregate an `item` and user-facing Library records “sources,” while the existing database already has a `cards` table for a separate review/SRS substrate. “Processing” names the user job without colliding with that domain.

## Evidence and constraints

The following evidence shaped all three directions:

- AI Brain is a single-owner, source-first personal knowledge system. Its core object is a saved source; it is explicitly not a collaborative workspace or full project-management product (`Product-Overview.md`, `UX_DESIGN_PRODUCT_MODEL.md`).
- Library is the implemented home for chronological browsing, source/quality/tag filtering, bulk organization, selected-source Ask, and opening the full item route (`Library-and-Item-Management.md`; `src/app/library/page.tsx`; `src/components/library-list.tsx`).
- Desktop navigation has a collapsible primary rail; mobile has four bottom-navigation positions—Library, Capture, Ask, and More. A new peer section therefore has a real mobile IA cost (`src/components/sidebar.tsx`).
- All supported creation paths converge on `insertCaptured`, so a default workflow state can be conceptually consistent across capture channels. The current insert model has no workflow or archive field (`src/db/items.ts`; `src/db/client.ts`).
- The current taxonomy already distinguishes a scalar AI category, manual/auto tags, AI topics, and manual/auto collections. Workflow status must remain separate from all of them (`Organization-Tags-Topics-and-Collections.md`; `src/db/tags.ts`; `src/db/topics.ts`).
- The existing item detail is a full route with Original, Digest, Ask, Related, Details, and My notes experiences; desktop uses a reading column plus companion rail, while mobile uses tabs. It currently returns explicitly to Library (`src/app/items/[id]/page.tsx`; `src/components/item-companion-tabs.tsx`).
- Notes already have explicit offline, retry, conflict, recovery-journal, and server-snapshot behavior. A workflow feature should not weaken that trust model or pretend status moves have the same offline guarantees (`src/components/manual-note-editor.tsx`; `Manual-Content-Notes.md`).
- Current Library retrieval is capped and ordered by capture time, with offset support rather than an infinite all-items client board. Large-backlog design must not load every source into four DOM columns (`src/db/items.ts`; `src/app/library/page.tsx`).
- The existing `cards` table is review/SRS substrate, not the captured-source aggregate. A workflow implementation should extend or relate to `items`, not repurpose `cards` (`src/db/migrations/001_initial_schema.sql`; `Data-Model.md`).
- Structured Calm calls for quiet reading/thinking surfaces, crisp borders, restrained color, accessible labels, and different web/mobile postures. These directions vary workflow and IA, not visual styling (`UX_DESIGN_SYSTEM_PRISM_MEMORY.md`; `DESIGN_SYSTEM.md`).

## Shared product invariants

These are not direction-specific preferences; they prevent semantic drift.

### Object and state model

- The workflow applies to the existing captured **source/item**. “Card” is a view treatment, not a second content object.
- `workflowStatus` is one of Inbox, To Do, In Progress, or Done.
- User tags remain user-managed labels.
- AI category remains generated classification; generated tags/topics remain their existing distinct concepts.
- Archive is a separate lifecycle attribute such as `archivedAt`, not a fifth workflow status and not deletion.
- Workflow history is needed to define metrics correctly, support auditability, and restore state after conflicts. A future technical design should evaluate an event/history record rather than relying only on the current value.

### Status meanings

| Status | User meaning | Entry rule | Exit rule |
|---|---|---|---|
| Inbox | Captured but not yet intentionally triaged | Default for every new successful capture | A deliberate move to any later state |
| To Do | Intentionally kept for a future action | User chooses it from Inbox or another state | May move forward or backward |
| In Progress | Actively being read, noted, repaired, or otherwise worked | Deliberate user move | May move to Done, To Do, or Inbox |
| Done | The intended processing action is complete | Deliberate user move | Remains visible until archived; may move backward |

Status changes save immediately. Users can move backward. Every drag operation must have an equivalent labeled “Move to…” action and keyboard-operable control. No assignees, due dates, sprints, dependencies, WIP enforcement, or collaboration are introduced.

### Archive semantics

- Only Done sources can be archived in the first release; this makes archive meaning predictable.
- Completion does not auto-archive. The user can review Done and archive individually or in a batch.
- Archive removes a source from active Processing views only. It does not delete or alter source content, notes, tags, AI categories, citations, Library visibility, global search, or Ask eligibility.
- Archive supports immediate Undo and a dedicated archived view.
- Restore returns the source to Done by default, preserving the fact that it was completed. “Restore to Inbox” is a separate explicit action.
- Archived sources do not contribute to current active-state counts. Their historical completion/processing events remain eligible for time-window metrics.

### Filtering contract

- Manual-tag filters and AI-category filters are visually and semantically separate.
- Multiple values within one facet are OR; facets combine with AND. Example: `(tag = research OR product) AND (AI category = Strategy) AND status = Inbox`.
- “No user tags” and “No AI category” are first-class filter values.
- Active filters are always shown as removable labeled chips; color is never the only signal.
- The URL is the canonical transient filter state so browser navigation and returning from detail work. The last chosen view may persist locally; a later release can decide whether last-used filters also persist across sessions.
- Counts beside columns/statuses reflect the current filter result and are labeled “matching.” A separate Inbox backlog metric remains unfiltered and is labeled “total,” preventing misleading counts.

### Metrics contract

- **Processed** means the source leaves Inbox for the first time. Moving backward and out again does not inflate the metric.
- **Completed** means the source enters Done for the first time. Reopening and recompleting does not inflate the metric.
- **Inbox backlog** is the current count of non-archived Inbox sources.
- Primary metrics: Inbox backlog now, processed today, processed this week, completed today, completed this week, and current active count by status.
- Secondary diagnostic metrics: cards added today and average time in Inbox. Average time to completion should wait until enough history exists to avoid false precision.
- Archiving is an action count, not the headline measure of value. “Any transition” is not called processed because it rewards churn.

### Trust and failure contract

- Status/reorder/archive actions may be optimistic only while the affected source shows a pending state.
- A server-confirmed version is authoritative. Version conflicts refresh the affected source, announce the newer state, and offer the user's intended action again; no silent last-write-wins.
- A failed optimistic action returns the source to its confirmed position and shows a plain-language error with Retry. Other cards do not jump or reset.
- Undo is available for move, completion, archive, and batch actions; destructive deletion remains separate from archive.
- Workflow mutations are read-only while offline in the first release. They are not silently queued because reordering and multi-device conflicts are ambiguous. Existing note drafts keep their current recovery behavior.
- Deleted/inaccessible sources disappear from the active result with an announced explanation. AI category changes can alter filtered membership but never workflow status.
- Loading uses stable column/list skeletons; empty states distinguish “no sources in this state” from “no sources match filters.”

---

## Direction 1: Workflow — board-first operations

### Thesis and intended moment

Make the four-state board the product's primary processing surface. This direction is for a user who already thinks spatially in columns and wants the whole active workload visible at once.

### Naming, navigation, and relationship to Library

- **Name:** Workflow
- **Desktop navigation:** A top-level peer immediately after Library, with the Inbox count badge.
- **Mobile navigation:** Workflow lives under More to avoid displacing Library, Capture, or Ask; a prominent Inbox summary card in Library deep-links to it.
- **Relationship to Library:** Library remains the complete chronological/read/search archive. Workflow is the active operational projection of the same sources. Both reuse source cards, filter language, and the existing detail route.
- **Archive IA:** `Active | Archived` switch inside Workflow; Active opens Board by default.

### Default journey and information architecture

1. Open Workflow and see a compact metrics strip.
2. Scan the four columns: Inbox, To Do, In Progress, Done.
3. Drag a source or use Move to change status.
4. Open the full existing item-detail route; return restores board filters and each column's scroll anchor.
5. Archive Done sources from the column or a batch selection.

The board is the organizing frame; List is a view toggle that flattens the same active data and supports sorting/bulk actions.

### Inbox and launch behavior

- Every new capture path defaults to Inbox; no ingestion path can bypass it.
- Existing sources are backfilled into Inbox in staged pages, preserving `captured_at` order. The launch banner explains that previously saved sources were added.
- To reduce shock, the board initially loads the newest 100 and offers “Load older,” but the total backlog metric shows the true count.
- Completed/archived sources return to Done on restore; the user can then move them to Inbox.

### Workflow, transitions, and ordering

- Any active status can move to any other active status.
- Manual ranking exists inside all four columns. A cross-column move inserts at the top; the user can then reorder.
- Drag handle, card menu, keyboard “Move to…,” and batch move have equivalent semantics.
- Undo appears after each move. Reordering is server-confirmed and version checked.
- Concurrent edits refresh only the affected card; the board does not globally reload.

### Kanban, list, scale, and mobile

- Desktop defaults to Kanban and persists the view preference.
- Switching views preserves filters, selected items, and the best available scroll anchor; all core actions exist in both.
- Columns use independent cursor pagination/virtualization. Counts come from server aggregates, not loaded card length.
- Mobile defaults to List. The Board option becomes one status at a time with a segmented status control, not a horizontally scrolling four-column miniature.
- List can sort by manual order, captured date, or last status change; board always uses manual order.

### Filtering and metrics presentation

- A shared filter bar sits above the board; matching counts appear in each column header.
- A separate metrics strip shows total Inbox backlog, processed today/week, and completed today/week.
- User tags and AI categories follow the shared faceted-filter contract.

### Card detail and notes

- Opens the existing full item route.
- A Workflow companion control shows current status and Move to actions; changing status does not require leaving detail.
- The return link becomes contextual—“Back to Workflow” when entered from Workflow—while preserving the existing Library entry path.
- Notes remain on the current item surface; unsaved-note warnings/recovery are not duplicated on the board.

### Completion, archive, and failure posture

- Done remains a visible working column; individual and batch Archive actions use the shared separate-lifecycle contract.
- A failed cross-column move restores the card to its confirmed column and rank. Each column keeps its scroll/loading state while the affected card is reconciled.
- Board-wide loading or error overlays are avoided; failures stay local to the source and action.

### Strengths

- Strongest at-a-glance model and fastest repeated drag workflow on desktop.
- Required Kanban behavior is obvious and discoverable.
- Current counts by state are naturally legible.

### Risks and unresolved hypotheses

- Backfilling every historical source makes the Inbox immediately truthful but potentially demoralizing and computationally heavy.
- A four-column default can feel like project management, conflicting with source-first Structured Calm.
- Board performance and independent column state are the most complex implementation path.
- Mobile is necessarily a different experience, weakening cross-platform continuity.

### Prototype validation question

Can the board remain calm and useful with hundreds or thousands of sources, or does the visual workload make the backlog feel heavier?

---

## Direction 2: Processing — Inbox-first triage, board for active work

### Thesis and intended moment

Make “process the next captured source” the default job. The Inbox is a focused triage list; the board is a secondary overview for sources that have been intentionally accepted into active work.

### Naming, navigation, and relationship to Library

- **Name:** Processing
- **Desktop navigation:** A top-level peer immediately after Library, with a numeric Inbox badge.
- **Mobile navigation:** Replace no primary bottom-nav destination initially; expose Processing from More and a tappable Inbox backlog summary on Library. If usage proves daily, test replacing Ask or More in a later navigation experiment rather than assuming it.
- **Relationship to Library:** Library answers “What have I saved?” Processing answers “What needs a decision or action?” They share source rows, taxonomy filters, search conventions, and the same item-detail route but retain distinct defaults.
- **Internal IA:** `Inbox | Board | List | Archived`. Processing opens Inbox. Board and List are two views of all active statuses.

### Default journey and information architecture

1. Open Processing to a chronological Inbox list, oldest first by default, with a visible total backlog.
2. Open or preview a source, review its note/digest/quality, and choose To Do, In Progress, Done, or Leave in Inbox.
3. Continue to the next source without returning to the top.
4. Use Board to rebalance intentional work or List for bulk operations.
5. Review Done and archive when ready.

The Inbox is deliberately a queue, not a fifth board mode. It gives the user one clear starting point while preserving the full four-state model.

### Inbox and launch behavior

- Every newly created source enters Inbox through the common capture path. A duplicate capture keeps the existing source's status rather than resetting it.
- Existing sources are not silently backfilled. They receive a launch-only `legacy/unclassified` treatment outside the four active states until the user chooses one of three explicit imports: recent 30 days, selected Library sources, or all historical sources.
- The recommended launch default is “recent 30 days,” offered but not automatically executed. This avoids corrupting first-time processed metrics and creating an unusable backlog.
- A source cannot bypass Inbox during ingestion. “Capture and start now” is implemented as capture to Inbox followed by an explicit user move.
- Restored archive sources return to Done; “Reprocess” explicitly moves one to Inbox.

### Workflow, transitions, and ordering

- Any active status can move backward or forward.
- Inbox has a stable triage order: oldest first by default, with newest-first and manual priority alternatives. To Do and In Progress support manual ranking; Done defaults to most recently completed.
- Moving from Inbox inserts at the top of the target active state. Moving back to Inbox uses the current time as `returnedAt` but retains original `capturedAt` and first-processed history.
- Accessible Move to controls are the primary action; drag is a progressive enhancement on Board.
- Each action saves immediately, shows pending state, and supports Undo. Batch moves use one confirmation result and one undo window.

### Kanban, list, scale, and mobile

- Desktop and mobile default to Inbox list. The last explicit Board/List choice persists only when entering those views.
- Board shows all four states with independent cursor pagination/virtualization; List offers grouped or flat status display and bulk actions.
- Switching Board/List preserves filters, selections, and per-status anchors. Entering Inbox preserves the last triage position.
- The same actions—open, move, archive when Done, and accessible reorder—are available in Board and List. Inbox adds “next source” navigation.
- Mobile uses the same Inbox-first list and a status-segmented Board equivalent. It does not require drag; swipe is not the only status control.

### Filtering and metrics presentation

- Inbox and active views use the shared manual-tag/AI-category facets. Source type and capture quality may be reused from Library as secondary filters.
- “Matching” state counts update with filters; the top-line Inbox backlog remains the total active Inbox.
- The header prioritizes three numbers: Inbox now, processed today, completed this week. A disclosure reveals the full metric set.
- Average time in Inbox is shown only after sufficient events and as a trend, not a score or streak.

### Card detail and notes

- Opening a source uses the existing detail route, preserving reading, quality, notes, Ask, Related, and Details.
- A small Processing control in detail exposes status, previous move/Undo when relevant, and Archive only when Done.
- Return context restores the exact Inbox item/Board column/List row, filters, and scroll. Direct links still return to Library by default.
- On wider desktop prototypes, an optional detail drawer may be tested for quick triage, but the full route remains the source of truth; the drawer must not duplicate fragile note editing in the first release.

### Completion, archive, and failure posture

- The Done portion of Board/List is a reviewable buffer, not an automatic archive chute. Archive is available individually and in batches, with Undo and restore-to-Done.
- Failed triage leaves the user on the same Inbox source, restores its confirmed state, and keeps the intended destination available as Retry.
- Offline Processing remains readable and filterable but clearly disables moves, reorder, and archive; note recovery continues under the existing note system.

### Strengths

- Strongest backlog-reduction loop and clearest answer to “what do I do next?”
- Preserves the required board without making the app feel like a task manager.
- Best mobile parity because the primary behavior is a list on both platforms.
- Staged legacy adoption protects trust, metrics integrity, and performance.
- Fits the product principle “calm default, power on demand.”

### Risks and unresolved hypotheses

- Users who expect a board immediately may initially miss it.
- `legacy/unclassified` is a migration concern that must not leak into long-term everyday vocabulary.
- Oldest-first may feel dutiful; prototype tests should compare oldest-first with newest-first and user priority.
- A contextual detail drawer is attractive but should be rejected if it fragments notes or return-state behavior.

### Prototype validation question

Does an Inbox-first default cause more sources to leave Inbox with less cognitive load than a board-first default, while keeping Board discoverable for power use?

---

## Direction 3: Queue — Library-integrated workflow lens

### Thesis and intended moment

Treat workflow as a powerful lens over Library rather than a separate operating world. Queue is a top-level shortcut into a shared Library shell with workflow grouping, minimizing duplicate IA and interaction models.

### Naming, navigation, and relationship to Library

- **Name:** Queue
- **Desktop navigation:** A top-level peer after Library, but it opens the shared source-browser shell with workflow controls selected.
- **Mobile navigation:** Queue is a Library subview reachable from a `Browse | Queue` switch; no new bottom-nav destination.
- **Relationship to Library:** One source browser, one filter model, one selection model, and one detail return contract. Library defaults to chronology; Queue defaults to workflow status.
- **Archive IA:** Archived is another clearly separated Queue scope; Library continues to show the source unless the user explicitly filters archived-from-processing items.

### Default journey and information architecture

1. Open Queue and see a grouped List: Inbox, To Do, In Progress, Done.
2. Expand/collapse groups, select sources, and move them with row actions or batch controls.
3. Toggle to Board for spatial planning.
4. Open the existing item detail and return to the same shared browser state.
5. Switch to Library without losing taxonomy/search context.

List is the primary representation. Board is a view of the same query rather than a distinct workspace. The IA favors continuity over a dedicated triage ritual.

### Inbox and launch behavior

- Every new source enters Inbox through the common capture path.
- Existing sources remain unclassified and continue to appear normally in Library. Queue offers an `Unclassified` import group with Select all on page, Add recent, and Add all actions.
- Unlike Direction 2, Queue keeps Unclassified visible as a persistent migration group until resolved; this maximizes transparency but adds a fifth temporary grouping.
- Ingestion cannot bypass Inbox. Restores return to Done with an explicit Move to Inbox option.

### Workflow, transitions, and ordering

- Any active transition is permitted; row menus and batch actions are primary.
- Manual priority is represented by pin-to-top within To Do and In Progress rather than arbitrary rank everywhere. Inbox/Done remain chronological.
- Board drag changes status, while list movement uses Move to and priority controls. Undo and version checks follow the shared trust contract.
- Multi-tab conflicts refresh the row in place and preserve the user's Library/Queue query.

### Kanban, list, scale, and mobile

- List is the default on all platforms; Board preference can persist on desktop.
- List and Board use one cursor-paginated server query. Group/column counts are server aggregates.
- Switching views preserves filters and selection; exact scroll preservation is strongest in List and best-effort per status in Board.
- Mobile does not expose Board as four simultaneous columns. It uses grouped List with a “Board by status” secondary view.
- Large backlog behavior is simplest because it extends the existing Library list/repository conventions rather than creating an independent data-loading shell.

### Filtering and metrics presentation

- Queue inherits Library's source/quality/tag controls and adds workflow status and AI category as separate facets.
- The shared faceted-filter contract applies; active chips remain visible across Library and Queue.
- Metrics appear as a compact Queue summary rather than a dashboard: Inbox total, processed today, completed this week. Full metrics live behind “View activity.”

### Card detail and notes

- Uses the existing full item route unchanged except for a workflow status control and contextual return label.
- Because Library and Queue share query state, the return behavior is straightforward and notes remain wholly on the existing detail route.
- No drawer is proposed; this direction optimizes fidelity and reuse over rapid one-by-one triage.

### Completion, archive, and failure posture

- Done is one collapsible list group. Archive is a row or batch action governed by the shared separate-lifecycle and restore-to-Done rules.
- Failed actions use the existing shared-browser feedback pattern: keep selection and filters, restore only affected rows, and provide Retry.
- Library content never disappears because a Queue mutation fails or a source is archived from Processing.

### Strengths

- Lowest IA duplication and closest fit to implemented Library patterns.
- Lowest delivery risk and strongest consistency for filtering, selection, detail, and mobile.
- Avoids a project-management feel and keeps the source object dominant.
- Naturally reuses existing source/quality filters and bulk-action behavior.

### Risks and unresolved hypotheses

- Queue may feel like “another Library filter,” failing the objective's demand for a dedicated section comparable in importance to Library.
- Weak behavioral loop: grouped browsing does not actively help the user process the next source.
- A shared filter model can become crowded when workflow, taxonomy, source, and quality facets are all present.
- Temporary Unclassified grouping may confuse users if migration is not completed promptly.

### Prototype validation question

Is a shared Library/Queue shell sufficient to create a durable processing habit, or does it need a more opinionated Inbox experience to change behavior?

## Weighted decision matrix

Scores use a 1–5 scale, where 5 is strongest. Weighted points equal `weight × score ÷ 5`; maximum total is 100. Criteria derive from the objective's required outcomes and constraints, not visual preference.

| Criterion | Weight | Direction 1: Workflow | Direction 2: Processing | Direction 3: Queue |
|---|---:|---:|---:|---:|
| Backlog reduction and workflow clarity | 20 | 4 / 16 | 5 / 20 | 3 / 12 |
| Fit with source-first model and Library relationship | 15 | 3 / 9 | 5 / 15 | 5 / 15 |
| Naming/navigation discoverability | 10 | 5 / 10 | 4 / 8 | 3 / 6 |
| Cross-platform usability and accessibility | 15 | 3 / 9 | 5 / 15 | 4 / 12 |
| Trust, undo, conflicts, and failure recovery | 10 | 4 / 8 | 5 / 10 | 4 / 8 |
| Large-backlog scalability | 10 | 2 / 4 | 4 / 8 | 5 / 10 |
| Metrics and lifecycle correctness | 10 | 4 / 8 | 5 / 10 | 3 / 6 |
| Delivery feasibility and scope discipline | 10 | 3 / 6 | 4 / 8 | 5 / 10 |
| **Weighted total** | **100** | **70** | **94** | **79** |

### Matrix rationale

- **Workflow** scores highly for discoverability and spatial clarity, but pays for loading/ordering four independently paged columns, mobile translation, and an overwhelming historical backfill.
- **Processing** scores highest because the default experience directly targets Inbox reduction, works consistently as a list on mobile and desktop, keeps the board available, and treats launch migration/history as product trust problems rather than implementation footnotes.
- **Queue** is the safest extension of current Library patterns and scales well, but its weakest dimension is the core outcome: changing “save now, maybe later” into a repeatable processing habit.

## Recommended product contract for prototype work

Prototype Direction 2 with these decisions held constant across the high-fidelity variants:

1. **Name the section Processing.** Use “sources” or “items” in copy; use cards only as a visual noun when necessary.
2. **Place Processing beside Library on desktop.** On mobile, start from More plus a Library Inbox summary; test primary-nav promotion only with usage evidence.
3. **Default every new successful capture to Inbox.** Duplicate capture does not reset prior workflow state.
4. **Do not silently backfill all history.** Offer recent-30-days, selected, or all import; keep launch migration out of steady-state IA.
5. **Default Processing to the Inbox list.** Provide Board and List as peer active-work views; persist view preference.
6. **Use permissive reversible transitions.** Save immediately, show pending, provide Move to as the accessible baseline, and offer Undo.
7. **Keep manual tags, AI category, workflow status, and archive state separate.** Use OR within facets and AND across facets.
8. **Define processed as first exit from Inbox and completed as first entry to Done.** Do not use transition count as progress.
9. **Keep archive separate from status.** Only Done can archive initially; restore to Done; archived sources remain in Library/search/Ask.
10. **Reuse the existing detail route and notes.** Add a small workflow control and contextual return state; do not duplicate the note editor in an initial drawer.
11. **Scale with server counts, cursors, and virtualization.** Never infer totals from loaded cards or render the full backlog at once.
12. **Keep mutations online-only initially.** Fail visibly, reconcile version conflicts per source, and preserve the current note-recovery guarantees.

## Prototype scenarios required to validate the recommendation

- Desktop: Inbox with 327 sources, five matching filters, process one source into To Do, Undo, then continue.
- Desktop: Board with 100+ sources per state, filtered counts versus total Inbox backlog, drag and menu-based equivalent moves.
- Desktop: Open item detail from Processing, edit/review My notes, change status, and return to the exact row/column position.
- Mobile: Enter Processing from Library summary, triage without drag, view status counts, and return from item detail.
- Archive: Batch archive Done sources, Undo one operation, view Archived, restore to Done, and explicitly reprocess to Inbox.
- Failure: Status move fails, concurrent tab changes the same source, source is deleted elsewhere, and connection goes offline.
- Launch: Existing owner chooses recent-30-days import while older Library sources remain unaffected and metrics start honestly.
- Accessibility: Complete the full triage flow by keyboard and screen reader with no drag dependence and announced count/state changes.

## Decision boundaries and non-goals

- This exploration does not authorize production implementation.
- It does not define final storage/API details; it defines semantics those designs must preserve.
- It does not merge Processing with the current Needs Upgrade source-quality queue. A source may be both Inbox and Needs Upgrade because workflow intent and capture quality are orthogonal.
- It does not add task-management concepts such as owners, due dates, reminders, dependencies, sprints, or collaboration.
- It does not make archive equivalent to delete or remove a source from Library/search by default.
- It does not make AI classification drive workflow status automatically.

**Final council recommendation:** Proceed to high-fidelity throwaway prototypes for **Processing — Inbox-first triage with a secondary board**, while retaining Workflow and Queue as comparison baselines. The feature remains **Explored — not implemented**.
