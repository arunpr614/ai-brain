# Card Processing Workflow — UX/UI v1

**Status:** v1 design specification · **Explored — not implemented.**
**Selected visual target:** Direction B — **Processing: Inbox-first triage**
**Primary source image:** ux/concepts/direction-b-processing-inbox-first.png
**Date:** 2026-07-11
**Scope:** Throwaway prototype direction and implementation-ready interaction specification. This document does not represent production behavior.

## Decision

Use **Processing** as the section name and make **Inbox** its landing view. The experience should feel like a calm decision queue, not a task-management system:

- New captures wait in Inbox until the owner deliberately moves them.
- The default desktop experience is an Inbox list with a read-only quick preview on wide screens.
- Board and List are secondary, equivalent views of active work.
- The existing item-detail route remains the canonical reading, note-editing, Ask, Related, quality, and provenance experience.
- Archive is separate from workflow status. Only Done sources can be archived in v1.
- Drag changes status only. v1 does not support manual rank or intra-column drag ordering.
- Workflow mutations are online-only, immediately visible as pending, server-confirmed, version-checked, reversible, and locally recoverable.

The permanent prototype marker must read:

> Throwaway prototype · Explored — not implemented

The v1 marker must remain visible in review notes and prototype metadata. No prototype may imply that workflow, archive, metrics, or migration behavior is shipped.

## Design principles

1. **One clear next decision.** The Inbox should answer “What needs my decision?” before it shows the full active workload.
2. **Sources, not tasks.** Use source/item language. Avoid assignees, due dates, reminders, sprints, dependencies, estimates, and WIP limits.
3. **Calm default, power on demand.** List-based triage is primary; board, batch operations, and filters are available without dominating the first screen.
4. **Trust is visible.** Pending, saved, failed, offline, conflicting, and changed-elsewhere states must be explicit.
5. **Same task, adapted layout.** Mobile does not reproduce four narrow columns; it provides the same outcomes in a one-status-at-a-time view.
6. **No drag dependency.** Every pointer gesture has a labeled keyboard- and touch-operable equivalent.
7. **Preserve place.** Filters, selected view, focused source, and return position survive the journeys where the user reasonably expects them to.
8. **Taxonomy stays separate.** Workflow status, User tags, AI topics, capture quality, and archive scope are independent concepts.

## Three directions

### Direction A — Workflow: board-first operations

**Visual source:** direction-a-workflow-board-first.png

Four columns dominate the screen. Metrics and filters sit above the board; each card supports status movement and Done cards expose Archive.

**Best for:** spatial scanning and repeated desktop moves across statuses.

**Strengths:** immediate state overview, obvious Kanban behavior, clear matching count per column.

**Risks:** makes a personal knowledge product look like project management, foregrounds backlog volume, creates the most complex mobile and virtualization model, and makes daily triage depend on scanning four columns.

**Disposition:** **Explored — not implemented.** Retain as a comparison prototype and as the Board view reference inside Direction B.

### Direction B — Processing: Inbox-first triage

**Visual source:** direction-b-processing-inbox-first.png

A chronological Inbox list is paired with a decision preview on wide desktop. Board, List, and Archived are visible but secondary. The user can process a bounded session without rebuilding context after each move.

**Best for:** turning capture accumulation into a repeatable, low-friction decision habit.

**Strengths:** clearest next action, strongest mobile parity, closest fit with the current Library list and existing detail route, and lowest risk of becoming a generic task manager.

**Risks:** board-oriented users may not notice Board immediately; the split preview can become a duplicate detail experience if scope is not constrained.

**Disposition:** **Selected v1 recommendation.**

### Direction C — Queue: Library-integrated workflow lens

**Visual source:** direction-c-queue-library-integrated.png

Workflow appears as a Library mode with a dense table, inline expansion, status controls, and shared search/filter conventions.

**Best for:** high-density desktop scanning and maximum reuse of Library patterns.

**Strengths:** lowest IA duplication, strongest table-based bulk operation posture, and simplest relationship to Library.

**Risks:** feels like another Library filter instead of a dedicated behavior-changing section, has a weak “process next” loop, and can become filter-heavy.

**Disposition:** **Explored — not implemented.** Retain as a comparison prototype and a reference for the Direction B List view.

## Selected visual target

Direction B is the visual and behavioral target. Preserve these qualities from the concept image:

- dark Structured Calm shell with the existing AI Memory logo and sidebar;
- editorial page title, quiet explanatory subtitle, and restrained blue focus/accent;
- three compact headline metrics rather than dashboard cards;
- Inbox, Board, List, and Archived as visible peer views;
- a bordered source queue with generous row rhythm;
- a companion decision surface on wide desktop;
- 1px separators, restrained elevation, and status expressed by text plus structure rather than saturated column color.

Refine the concept in four ways:

1. The right pane is labeled **Quick preview** and is read-only for content and notes.
2. “Add note” becomes **Open notes**, routing to the existing item detail Notes surface.
3. The status buttons are backed by one **Move to** command model used everywhere.
4. “Leave in Inbox” closes/advances the preview without creating a workflow event.

## Information architecture

### Desktop

Primary application sidebar:

1. Capture
2. Library
3. Processing — neutral Inbox count badge, capped at 99+
4. Needs Upgrade
5. Ask
6. Settings

Processing route structure:

- **Inbox** — default top-level entry; unarchived Inbox only.
- **Board** — all four active statuses as columns.
- **List** — all active statuses in a dense sortable list.
- **Archived** — Done sources removed from active Processing.

Use **Processing** in the sidebar and H1 because the section contains more than the Inbox. Use Inbox for the primary tab, count, and behavioral copy. A customer-facing nav label of Inbox is a naming-test variant only: **Explored — not implemented in v1.**

At 1280px and wider, Inbox uses a two-pane layout:

- left queue: approximately 55% of available content width, minimum 520px;
- right quick preview: approximately 45%, minimum 420px;
- 16px gutter and independent vertical scroll;
- selected queue row remains visible and focused while the preview changes.

Below 1280px, use a single queue. Quick preview opens as a non-destructive right sheet at tablet widths and is omitted on mobile. The full detail route is always available.

### Mobile

Keep the existing four-slot bottom navigation: Library, Capture, Ask, More.

Processing is reached through:

- a compact Library summary: **Inbox 18 · oldest 12d**;
- a Processing row inside More with the same neutral count;
- contextual **Saved to Inbox** capture feedback.

The Processing header uses a horizontally scrollable tablist: Inbox, Board, List, Archived. The selected tab is always fully visible.

- Inbox is the same chronological decision list as desktop.
- Board shows one status at a time with a four-option status selector and matching counts.
- List uses compact grouped source cards, not a desktop table.
- Filters open in a bottom sheet; active chips remain visible above results.
- Undo appears above the fixed bottom navigation and safe area.

No mobile flow requires horizontal four-column scrolling, drag, swipe, or a hover-only affordance.

## Core flows

### 1. Enter and process the next source

1. A fresh click on Processing opens an unfiltered Inbox, oldest first.
2. Header shows total Inbox, processed today, and completed this week.
3. The first row is not automatically selected. The user chooses a row or **Process next 3**.
4. On wide desktop, selection fills Quick preview and moves focus to the preview heading only when the user explicitly opens the preview. Selection alone does not steal keyboard focus.
5. The user chooses To Do, In Progress, Done, or Leave in Inbox.
6. The affected source shows **Moving to [status]…** and keeps focus while pending.
7. After confirmation, the row leaves Inbox, counts update, a polite announcement fires, Undo appears for at least 10 seconds, and focus advances to the next matching row at the same visual index.
8. Leave in Inbox advances the bounded session without changing state or metrics.

### 2. Open full detail and return

1. **Open full source** navigates to the existing item route.
2. The route receives a validated internal return context: Processing view, normalized query, selected source ID, status, and scroll anchor.
3. Detail shows a compact Processing control with current status, Move to, and Archive only when Done.
4. Notes retain their current autosave, journal, offline, conflict, and navigation-safety behavior. Workflow changes do not imply note save.
5. **Back to Processing** restores the prior view, URL filters, and best source anchor.
6. If the source moved out of the result, focus the next matching source and announce where the original moved.
7. Direct links and Library-origin detail continue to use **Back to Library**.

### 3. Board move

1. User opens Board and sees four labeled regions with matching counts.
2. A pointer user may drag a card to another status.
3. A keyboard, touch, or screen-reader user opens Move to and chooses the same destination.
4. Both paths call the same status transition and insert the source using deterministic destination ordering.
5. There is no intra-column manual reorder in v1. Board copy must not show drag handles that imply priority ranking.
6. On failure, only the affected card returns to its confirmed column; other columns keep position and loaded pages.

### 4. Batch move or archive

1. Explicit checkboxes enter selection mode.
2. The toolbar states selected count and eligible count.
3. Board and List preserve selection when the normalized active query is unchanged.
4. Changing filters, search, sort, active/archive scope, or entering a different saved URL clears selection and announces it.
5. Batch Move applies one destination to selected active sources.
6. Batch Archive previews eligibility: **14 of 17 selected sources are Done. Archive 14?**
7. Result copy names succeeded, conflicted, failed, and ineligible counts. Failed/conflicted items remain selected.
8. Undo targets only the confirmed succeeded subset.

### 5. Archive, restore, and reprocess

- Archive is shown only for confirmed Done sources.
- Individual Archive is immediate, pending, then confirmed with Undo; no confirmation dialog is required.
- Batch Archive requires an eligibility preview because scope may be mixed.
- Archived removes the source only from active Processing.
- Archived sources remain in Library, detail, search, Ask, Related, notes, tags, and export, with an **Archived from Processing** badge.
- Restore clears archive and returns the source to Done.
- **Reprocess to Inbox** is a separate explicit action. It is not the default Restore behavior.
- Delete remains a separate destructive action on the existing detail surface and is never visually grouped with Archive.

### 6. First-use legacy enrollment

First-use message:

> New captures wait here until you decide what happens next.

Offer explicit choices with count previews:

- **Start with new captures** — default.
- **Bring in recent captures** — up to the 25 newest sources from the last 30 days.
- **Choose from Library**.
- **Bring in all history** — advanced disclosure with exact count and backlog warning.

Older unenrolled sources remain in Library. Enrollment does not count as processed, completed, or added today. “Unenrolled” is never presented as a fifth everyday status.

## Kanban (Board) and List parity

| Capability | Board | List |
|---|---|---|
| Active statuses | Four desktop columns; one status at a time on mobile | Status column/group with all active statuses |
| Open source | Card title and Open action | Row title and Open action |
| Change status | Drag between columns or Move to | Move to |
| Non-drag equivalent | Visible/menu Move to | Visible/menu Move to |
| Intra-status order | Deterministic, no manual reorder in v1 | Same deterministic order |
| Select/batch move | Checkbox and batch toolbar | Checkbox and batch toolbar |
| Archive | Done card/menu and batch | Done row/menu and batch |
| Filters | Same normalized query | Same normalized query |
| Counts | Matching count in each heading | Matching count in status summary |
| Scale | Independent cursor pages and virtualization | Cursor pagination/virtualization |
| Empty/error | Per-column local state | Whole-result or row-local state |
| Return from detail | Column/card anchor | Row anchor |

Board and List must use the same compact source identity, workflow snapshot, filters, counts, mutations, Undo, and failure language. A view switch must never change workflow state.

## Ordering

v1 ordering is explicit and non-manual:

| Scope | Default | Alternatives |
|---|---|---|
| Inbox | Oldest captured first | Newest first |
| To Do | Most recently moved first | Oldest/newest captured in List |
| In Progress | Most recently moved first | Oldest/newest captured in List |
| Done | Most recently completed first | Oldest completed |
| Archived | Most recently archived first | Oldest archived |

The active sort is always labeled. A cross-status move appears at the top of To Do, In Progress, or Done. A return to Inbox follows the selected Inbox chronology. Manual priority, Move up/down/top/bottom, and arbitrary rank are **Explored — not implemented in v1.**

## Detail route versus Quick preview

### Quick preview

Purpose: support a fast “read enough to decide” loop without impersonating full detail.

Allowed content:

- title, source type, capture channel, timestamp, character/duration metadata;
- short fictional excerpt or generated digest;
- capture quality and enrichment indicator;
- User tags and AI topics as read-only chips;
- current note presence and at most one read-only excerpt;
- current workflow status, Move to, Leave in Inbox, and Open full source.

Not allowed:

- editing notes, tags, topics, source content, or metadata;
- Ask, Related, repair, export, delete, or full provenance;
- a second autosave/conflict model;
- claiming an AI topic is user-authored.

**Open notes** routes to the canonical detail Notes tab. On mobile, tapping a source opens full detail; v1 has no mobile quick-preview sheet.

### Full detail route

The canonical route owns deep reading, all notes behavior, Ask, Related, Details, quality repair, taxonomy editing, export, and delete. It adds only a compact Processing control and contextual return behavior. Changing workflow status must not remount or clear the notes editor.

## Filters, counts, and metrics

### Filters

Primary facets:

- **User tags** — manual tags only.
- **AI topics** — generated topics only.

Secondary disclosure:

- source type;
- capture quality;
- status in List;
- No user tags;
- No AI topics.

Semantics:

- multiple values inside one facet use OR;
- facets combine with AND;
- active filters appear as removable, text-labeled chips;
- Clear all is available whenever a chip is active;
- filters, search, scope, and sort live in the URL;
- a fresh primary-nav entry opens unfiltered Inbox;
- a bookmark, browser Back/Forward, or validated detail return restores the URL.

Do not label AI topics as tags or categories. AI topic refresh may change result membership but never workflow state.

### Counts

- **Inbox now** is the unfiltered total of enrolled, non-archived Inbox sources and is labeled **total**.
- Column/status counts use the full current filter predicate and are labeled **matching** when filters are active.
- Loaded row/card count is never presented as a total.
- Sidebar uses a neutral total Inbox badge, capped at 99+.
- When counts are stale during refresh, retain the last confirmed value with a subtle **Updating…** label; never flash zero.

Example filtered copy:

> Showing 5 matching · 327 total in Inbox

### Metrics

Primary, always visible:

1. Inbox now
2. Processed today
3. Completed this week

Activity disclosure:

- processed this week;
- completed today;
- added today;
- oldest Inbox age;
- net Inbox change this week.

Definitions:

- Processed = first-ever confirmed deliberate exit from Inbox.
- Completed = first-ever confirmed entry to Done.
- Archive is not completion.
- Undo can reverse a qualifying first event; an ordinary backward move does not.
- Migration/enrollment events do not count.
- Any transition count, streak, time in app, and archive count are not headline metrics.

Use neutral copy and no red debt indicators, confetti, overdue language, streaks, or pressure to reach zero.

## Accessibility and focus contract

### Semantic structure

- App shell uses nav and main landmarks.
- Processing views use a real tablist.
- Board columns are labeled regions with headings and counts, not an ARIA grid.
- Inbox/List results are semantic lists or tables appropriate to the layout.
- Each source has a descriptive accessible name combining title and current status.
- Icons use installed Lucide-style icons with explicit labels where meaning is not adjacent.
- Color is never the only status, pending, conflict, archive, or selection signal.

### Keyboard behavior

- Tab order follows header, metrics disclosure, tabs, filters, result controls, source actions, then pagination.
- Enter opens source links and activates buttons.
- Space toggles a focused checkbox.
- Move to opens a menu with Inbox, To Do, In Progress, and Done.
- Arrow keys navigate the open menu; Enter confirms; Escape closes without action.
- Escape clears selection only when no menu, sheet, dialog, or preview is open.
- Tab never traverses hidden card actions.
- No single-character global shortcuts in v1.
- The existing command palette may expose **Move focused source to…**, **Archive focused source**, and **Undo last Processing action** as optional accelerators.

### Focus after changes

- While pending, focus remains on the affected source or invoked command.
- Confirmed removal from Inbox focuses the next matching source at the same index; if none, the previous source.
- If the Inbox becomes empty, focus moves to the empty-state heading.
- Confirmed board movement focuses the moved card in its destination if rendered; otherwise focus the destination heading.
- Failure returns focus to the restored source and exposes Retry immediately after the error text.
- Undo restores and focuses the source when it matches the query.
- Deleted/inaccessible source removal focuses the next logical source.
- Virtualization must keep the focused row mounted or transfer focus intentionally; focus must never fall to body.

### Live regions

Use one polite status region for successful and informational updates, and role=alert for failures requiring action.

Polite examples:

- **Moved “Designing calmer weekly reviews” to To Do. Inbox now 326 total. Undo available.**
- **Loaded 30 more sources in In Progress.**
- **Filters updated. 5 sources match; Inbox remains 327 total.**
- **Topic update removed one source from these results. Workflow status did not change.**

Assertive examples:

- **Move failed. “How attention shapes memory” remains in Inbox. Retry available.**
- **This source changed in another session and is now Done.**
- **This source is no longer available. Focus moved to the next source.**

### Motion and touch

- Respect reduced motion by removing travel animations and using immediate state replacement.
- Keep motion within existing 80/120/150/300ms tokens.
- Minimum mobile target is 44×44 CSS pixels.
- Drag is optional progressive enhancement and must not be enabled until pointer, touch, keyboard equivalent, screen-reader announcement, reduced-motion, and virtualization behavior are verified.

## State preservation

| State | Persistence | Rule |
|---|---|---|
| Filters, search, scope, status, list sort | URL | Survives refresh, bookmark, Back/Forward, and detail return |
| Board/List preference | Local setting | Applies only when entering active work without an explicit view |
| Processing landing | Fixed | Fresh nav entry always opens unfiltered Inbox |
| Selection | In memory, current normalized query | Preserved Board/List; cleared by query/scope change or reload |
| Inbox source anchor | Browser/session history keyed by source ID and query | Restored after detail and view switch when possible |
| Per-column scroll/cursor | In memory for current visit | Preserved until query change |
| Quick-preview selection | In memory | Restored on same history entry; not a permanent preference |
| Undo | Same tab, at least 10 seconds | Survives view switches and detail navigation; not full reload or tab close |

When an exact anchor is no longer present, restore the nearest status/time neighbor and announce that the original source moved or is outside the loaded page.

## UI state specification

### Loading

**Initial:** render the stable shell, metric placeholders, filter controls, and 5–7 row skeletons. Board renders each column header plus 2–3 card skeletons. Do not show zero counts.

**Pagination:** keep current content, show an inline loading row/card at the end, and announce completion.

**Mutation pending:** affect only the source being changed. Show spinner plus **Moving…**, **Archiving…**, **Restoring…**, or **Checking saved state…**. Disable repeat mutations for that source.

### Empty

True empty Inbox:

> Nothing waiting for a decision
> New captures will appear here. You can also add selected sources from Library.

Actions: Capture; Browse Library.

Empty status:

> No sources in To Do

Action: View Inbox.

Empty Archive:

> Nothing archived from Processing

Supporting copy explains that archived sources would remain in Library.

### Filtered empty

> No sources match these filters
> Inbox still has 327 total.

Actions: Clear all filters; remove individual chips. Never use the true-empty illustration or claim the Inbox is empty.

### Initial load error

Keep navigation, page title, tabs, and filters visible.

> Processing could not load
> Your sources are unchanged.

Action: Retry. Counts display em dashes, not zero.

### Local action error

Restore the confirmed card/row and position.

> Couldn’t move this source. It remains in Inbox.

Actions: Retry; Dismiss. Other sources remain interactive.

### Offline

Persistent non-modal banner:

> You’re offline. Saved Processing views are available to read, but moving and archiving require a connection.

Disable Move, drag, Archive, Restore, Reprocess, enrollment, and batch mutations with the same explanatory tooltip/description. Filters over loaded data remain usable. Existing note recovery behavior remains independent.

### Sent, outcome unknown

If connection drops after send:

> Checking saved state…

Do not offer Retry until the current server snapshot is fetched. Never send a duplicate status event speculatively.

### Conflict

Replace the optimistic projection with the authoritative source snapshot.

> Changed in another session
> This source is now Done.

Actions: Use current; Try moving to To Do again. Never overwrite silently.

### Deleted or inaccessible

Remove only the affected source.

> This source is no longer available.

Move focus to the next logical source, update matching counts from confirmed data, and provide no Retry when access is gone.

### AI-topic change

If a refreshed AI topic causes a source to leave an active filtered result:

> AI topics changed. One source no longer matches this view; its workflow status is unchanged.

Keep focus stable. If the focused source is affected, retain it until focus leaves or show a short “No longer matches” transition before selecting the next result. Do not move it between statuses.

### Archive/restore

Confirmed Archive removes the source from active Processing and shows:

> Archived from Processing. It remains in Library. Undo

Confirmed Restore shows:

> Restored to Done. Undo

### Undo conflict

> Undo is no longer safe because this source changed again.

Show current status and the available Move to or Restore command. Never force the older state.

## Components and tokens

### Reuse

- Existing AppShell, collapsible desktop sidebar, mobile bottom navigation, logo asset, search/command entry, buttons, menus, dialogs/sheets, tabs, checkboxes, tag chips, status regions, and item source icons.
- Existing Library source-row density and mobile filter sheet.
- Existing item-detail route, companion tabs, and note state language.
- Installed Lucide-style 2px outline icons; no emoji, custom inline SVG, CSS drawings, or placeholder icon boxes.

### Processing-specific components

| Component | Responsibility |
|---|---|
| PrototypeNotice | Persistent prototype status marker |
| ProcessingHeader | Title, subtitle, Process next session action |
| MetricStrip | Three primary metrics and Activity disclosure |
| ProcessingTabs | Inbox, Board, List, Archived |
| FilterBar / FilterSheet | User tags, AI topics, secondary facets, chips, clear |
| InboxQueue | Virtualized chronological source list and focus progression |
| QuickPreview | Read-only decision context on wide desktop |
| WorkflowCard | Compact Board representation of an item |
| WorkflowColumn | Labeled region, matching count, pagination/error state |
| ActiveList | Dense desktop table / grouped mobile list |
| MoveToMenu | Canonical non-drag movement command |
| SelectionToolbar | Selected/eligible counts and batch commands |
| WorkflowStatusControl | Compact current status and actions in detail |
| MutationStatus | Pending, confirmed, failed, conflict, unknown outcome |
| UndoNotice | Non-modal same-tab reversal affordance |
| StatePanel | Empty, filtered-empty, error, offline, deleted messaging |

### Tokens

- Light base: #FBFCFE; panel: #FFFFFF; ink: #14213D; border: #D7DFEA.
- Primary prototype dark base: #101825; panel: #162235; raised: #1B2A40; border: #2B3B52.
- UI font: Inter/system sans; 16px body, 1.5 line height.
- Editorial title only: Charter/Iowan/Cambria/Georgia stack.
- 4px spacing system; use 8, 12, 16, 24, 32, and 48px as primary increments.
- Radius: 6px controls/chips, 8px rows/cards, 10–12px sheets/floating notices.
- Cards use 1px borders; reserve shadows for floating preview sheet, menu, dialog, and Undo notice.
- Global focus-visible: 2px outline with offset.
- Status colors are semantic accents only; every state includes a visible text label and icon.

## Copy deck

| Surface | Copy |
|---|---|
| Page title | Processing |
| Subtitle | Decide what happens to captured sources. |
| Inbox metric | Inbox now |
| Session CTA | Process next 3 |
| Inbox action | Leave in Inbox |
| To Do action | Save for later work |
| In Progress action | Start working on it now |
| Done action | Mark processing complete |
| Full route | Open full source |
| Notes route | Open notes |
| Archive | Archive from Processing |
| Restore | Restore to Done |
| Reprocess | Reprocess to Inbox |
| Filter count | Showing 5 matching · 327 total in Inbox |
| Pending | Moving to To Do… |
| Delayed pending | Still saving… |
| Offline | Connection required to change workflow |
| Conflict | Changed in another session |
| Prototype marker | Throwaway prototype · Explored — not implemented |

Avoid **card processed by AI**, **task**, **overdue**, **assigned**, **priority score**, **zero Inbox goal**, and **archive permanently**.

## Fictional prototype fixtures

All prototype data is fictional. Do not use private or copied real source content.

Headline aggregate fixture:

- Inbox total: 327
- Processed today: 6
- Processed this week: 28
- Completed today: 3
- Completed this week: 18
- Added today: 9
- Oldest Inbox: 43 days
- Active totals: Inbox 327, To Do 82, In Progress 19, Done 54
- Archived total: 146

Visible source fixtures:

| ID | Title | Type / channel / age | Status | User tags | AI topics | Note |
|---|---|---|---|---|---|---|
| src-001 | A practical guide to calm prioritization | Article / Extension / 50m | Inbox | productivity, focus | prioritization, decision-making | None |
| src-002 | Designing calmer weekly reviews | Note / Web / 1h | Inbox | calm, work | reflection, workflows | Weekly cadence excerpt |
| src-003 | How attention shapes memory | YouTube / Android / 1d | Inbox | learning | attention, memory | None |
| src-004 | Research notes on personal knowledge workflows | PDF / Web / 3d | Inbox | research | workflow, systems | Two saved notes |
| src-005 | Idea: make weekly reflection lighter | Note / Telegram / 4d | Inbox | ideas | reflection, habits | None |
| src-006 | The case for spaced reflection | Article / Extension / 2d | To Do | memory | learning, reflection | One note |
| src-007 | Template: weekly review questions | Note / Web / 5d | To Do | workflows | reflection | None |
| src-008 | Capture habits that stick | Note / Telegram / 6d | In Progress | habits | behavior-change | Draft note |
| src-009 | Attention management in deep work | Article / Web / 8d | In Progress | focus | attention | None |
| src-010 | Morning pages as a cognitive reset | PDF / Web / 10d | Done | habits | writing, reflection | Complete |
| src-011 | Ideas: make weekly reflection lighter | Note / Telegram / 12d | Done | calm | reflection | Complete |
| src-012 | The psychology of review and recall | Article / Extension / 14d | Done | memory | learning | Complete |
| src-013 | Lightweight notes versus heavy notes | Note / iOS / 21d | Archived | notes | note-taking, tools | Archived 2d ago |
| src-014 | Understanding context switching costs | Article / Web / 30d | Archived | focus | cognitive-load | Archived 1w ago |

Edge-state fixtures:

- src-003: status move failure.
- src-007: changed in another session from To Do to Done.
- src-009: delayed response followed by authoritative success.
- src-011: individual Archive and Undo.
- src-013: Restore to Done, then explicit Reprocess.
- src-004: AI topic changes while workflow remains Inbox.
- src-005: deleted elsewhere while focused.
- batch-001: 17 selected, 14 Done eligible, 12 succeed, 1 conflict, 1 failure, 3 ineligible.

## Viewport and state coverage

### Required viewports

| Viewport | Required layout |
|---|---|
| 1440×1024 | Full sidebar, Inbox split view, four-column Board, dense List |
| 1280×800 | Full/collapsible sidebar, minimum viable split view |
| 1024×768 | Collapsed sidebar option, single Inbox queue, right preview sheet |
| 390×844 | Primary mobile acceptance viewport |
| 360×800 | Small mobile stress case |
| 412×915 | Larger mobile with filter sheet and batch toolbar |

Verify at 200% browser zoom on desktop and with text-size increase on mobile. No horizontal page scroll is allowed; Board may manage internal column overflow only on desktop.

### Required screen/state captures

1. Desktop Inbox, unfiltered, 327 total.
2. Desktop Inbox, five matching filters, Quick preview open.
3. Desktop Board, four statuses, one pending pointer move.
4. Desktop Board, Move to menu open with visible focus.
5. Desktop List, selection toolbar and mixed Archive eligibility preview.
6. Desktop detail route, notes visible, Processing status control, contextual return.
7. Desktop Archived, Restore and Reprocess distinction.
8. Mobile Library summary entry.
9. Mobile Inbox, Process next 3.
10. Mobile Board, one status at a time.
11. Mobile filter sheet with active chips visible behind/after dismissal.
12. Mobile batch toolbar above bottom navigation.
13. Loading, true empty, filtered empty, initial error.
14. Offline, sent-outcome-unknown, conflict, deleted, AI-topic-change.
15. Archive Undo, restore confirmation, Undo conflict.
16. First-use recent-import choice with exact count.

## Throwaway prototype build specification

### Prototype set

Create three isolated comparison prototypes using the same shell, tokens, aggregate fixtures, and visible sources:

- **Direction A comparison:** board-first hierarchy from direction-a-workflow-board-first.png.
- **Direction B primary:** Inbox-first hierarchy from direction-b-processing-inbox-first.png, with the refinements in this document.
- **Direction C comparison:** Library-integrated Queue hierarchy from direction-c-queue-library-integrated.png.

Direction B receives full responsive, keyboard, state, and failure coverage. Directions A and C need only enough interaction to compare hierarchy: switch Board/List, filter, open a source, perform Move to, and demonstrate archive visibility.

Every prototype displays **Throwaway prototype · Explored — not implemented** persistently and uses fictional fixtures only.

### Direction B prototype routes/states

The prototype may use client-side routes or an explicit state switcher, but each state must be directly addressable for review:

- processing/inbox
- processing/board
- processing/list
- processing/archived
- items/src-001 with Processing return context
- processing/onboarding
- processing/state/loading
- processing/state/empty
- processing/state/filtered-empty
- processing/state/error
- processing/state/offline
- processing/state/conflict
- processing/state/deleted
- processing/state/ai-topic-change

### Required working interactions

- switch Inbox, Board, List, and Archived;
- apply/remove User tags and AI topics with OR-within/AND-across behavior;
- show matching counts separately from total Inbox;
- select a source and change Quick preview without focus theft;
- open full detail and return to the same anchor;
- Move to from Inbox, Board, List, and detail;
- pointer drag between Board statuses only;
- keyboard/touch Move to equivalent;
- select visible sources and run a batch move/archive preview;
- show pending, success, Undo, failure/Retry, delayed/checking, and conflict reconciliation;
- archive Done, Undo, view Archived, Restore to Done, and Reprocess to Inbox;
- switch online/offline fixture mode and disable mutations;
- simulate source deletion and AI-topic membership change;
- preserve filters and anchors across view/detail navigation;
- run the core flow with reduced motion.

Controls outside the core experience may be visual-only but must not falsely appear to save data.

### Build constraints

- Do not modify production application code, database schema, migrations, or wiki.
- Do not connect to production or local private data.
- Use the existing logo asset and installed icon set.
- Reuse current design tokens and responsive shell patterns.
- Do not create fake icons or visible assets with emoji, ASCII, CSS drawings, or handcrafted SVG.
- Keep card DOM bounded; simulate virtualization/pagination at the UI layer.
- Do not implement offline mutation queuing or silent last-write-wins.
- Do not add manual ranking, due dates, priority scores, notifications, or collaboration.

### Review acceptance

The selected prototype is ready for council review when:

1. A keyboard-only user can process, move backward, archive, restore, reprocess, undo, filter, and return from detail without drag.
2. The same semantic tasks work at 390×844 without four-column scrolling.
3. Matching counts and total Inbox are never visually confused.
4. Quick preview does not duplicate note editing or the full detail experience.
5. Failure affects only the changed source and preserves the rest of the view.
6. Conflict, deleted, offline, and AI-topic-change states explain what happened and preserve focus.
7. Archive visibly preserves Library/search/Ask meaning and Restore defaults to Done.
8. Filters, view, and source anchor survive the specified journeys.
9. The prototype marker is visible in every route/state.
10. Reviewers can distinguish Direction B’s focused Inbox loop from Direction A’s board-first workload and Direction C’s Library-integrated density.

## v1 non-goals

- Production implementation, migration, navigation rollout, or analytics.
- Assignees, teams, sharing, comments, permissions, presence, or collaboration.
- Due dates, reminders, recurrence, dependencies, milestones, sprints, WIP limits, estimates, or time tracking.
- AI-generated priority or automatic workflow transitions.
- Automatic archive or archive as delete.
- Hiding archived sources from Library, search, Ask, Related, notes, or export.
- Editable notes or full detail inside Quick preview.
- Offline queued workflow mutations.
- Manual intra-column ranking or “select all matching” across unloaded pages.
- Custom statuses, custom columns, saved views, automations, or reporting dashboards.

## Final UX/UI position

Proceed with **Direction B — Processing: Inbox-first triage** as the v1 visual target. It creates the clearest decision loop, respects the current Library/detail architecture, works without drag on mobile and keyboard, and keeps the board available without letting it define the product.

Direction A and Direction C remain comparison artifacts only: **Explored — not implemented.**
