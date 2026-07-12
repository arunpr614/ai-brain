# Kanban Card Processing — UX/UI implementation package v1

**Status:** Implementation-authorized v1 for adversarial review; not implemented or production-verified

**Date:** 2026-07-12

**Selected direction:** Direction B — **Processing**, Inbox-first

**Product contract:** [PRD v1](../product/prd-v1.md)

**Requirements baseline:** [approved requirements](../discovery/approved-requirements-baseline.md)

**Current product baseline:** [current-state report](../discovery/current-state-report.md)

## 1. Purpose and authority

This package translates the selected Direction B exploration into a production implementation contract for layout, behavior, responsive adaptation, accessibility, and state recovery. It is intentionally a v1 input to adversarial review. It does not claim that any described behavior exists yet.

The immutable design-source package is abbreviated as `KD/` and lives at:

`/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/`

Evidence was reconciled in this order:

1. the current execution goal and this worktree's [approved requirements baseline](../discovery/approved-requirements-baseline.md);
2. this worktree's [PRD v1](../product/prd-v1.md);
3. stakeholder-accepted Direction B and compact Group & sort decisions in `KD/prototypes/AGENTS.md` and `KD/prototypes/handoff/`;
4. reviewed interaction and accessibility detail in `KD/ux/ux-ui-v2.md`, `KD/prototypes/design-qa.md`, and `KD/reviews/accessibility-review.md`;
5. current application architecture and design-system behavior in the [current-state report](../discovery/current-state-report.md).

Where the exploration conflicts with the implementation-authorized product contract, the product contract wins and the delta is explicit in §3.

## 2. Experience thesis and principles

Processing is a calm decision loop for saved sources, not a project-management board. Inbox is the default job. Board and List are alternate views of the same lifecycle. Library, canonical item detail, My notes, User tags, AI topics, search, Ask, Related, Needs Upgrade, and Review remain existing AI Brain capabilities rather than duplicated Processing features.

Implementation principles:

- Start with no source selected and no implied task debt.
- Make one source, its current state, and the next safe action understandable at a glance.
- Preserve source and note truth by routing to canonical item detail.
- Make every workflow outcome possible without drag.
- Keep pending, failed, conflicted, unknown, expired, and offline states honest.
- Treat status, workflow archive, User tags, AI topics, capture quality, enrichment, and Review as independent concepts.
- Use neutral backlog and throughput language; no streaks, overdue/debt copy, celebration, or zero-Inbox target.
- Preserve exact view, filters, anchor, and focus where valid.
- Use current AI Brain tokens, components, icons, theme behavior, and responsive shell conventions.
- Defer batch actions, manual rank, editable preview, saved views, and offline mutation queues.

## 3. Source reconciliation and known defects

### 3.1 Production deltas from the approved exploration

| Exploration artifact | Production v1 resolution | Reason |
|---|---|---|
| Desktop Inbox concept uses a queue plus quick-preview pane. | Omit the quick preview. Use one readable Inbox queue and canonical `/items/[id]` for detail and notes. Do not reserve a blank right pane. | PRD v1 §§7, 18 and approved baseline ER-12 explicitly omit quick preview unless later validated. |
| Prototype exposes `Review state` and a Processing-specific Light/Dark control. | Do not ship either control. Scenarios belong to tests; appearance uses the existing global application preference. | They are prototype-review affordances, not product features. |
| Prototype Group & sort includes `Custom order`. | Replace with `Workflow default`; do not implement custom/manual rank. | Approved baseline CR-02 and PRD v1 §13. |
| Prototype URL persists `theme`. | Do not add a Processing `theme` parameter. | Global appearance remains authoritative. |
| Prototype filters demonstrate one selected User tag and one AI topic. | Implement true multi-select facets, OR within each facet and AND across facets, including “No …” values. | PRD v1 §§15, 26.11. |
| Prototype may drag between status columns. | Ship native Move. Keep production drag disabled until all pointer, keyboard, AT, motion, and focus gates pass. | Approved baseline OV-06. |
| Prototype includes fictional counts/ages and an exploration banner. | Use server-typed counts and real lifecycle timestamps; remove exploration banner/copy. | Production truth and scope clarity. |

### 3.2 Known source defect — `Process next` selects newest

The Direction B prototype must not be copied literally for `Process next`.

- `KD/prototypes/src/App.jsx` initializes Inbox fixtures in newest-captured-first order (`50m`, `1h`, `1d`, `3d`, `4d`).
- Its `Process next` handler uses `cards.find(...)`, selecting the first matching Inbox fixture.
- The handler then announces, “The oldest Inbox source is selected for processing.”
- Therefore the prototype selects the newest fixture while claiming to select the oldest.

Production contract:

1. `Process next` requests or consumes the canonical matching Inbox page ordered by `workflow_inbox_entered_at ASC, id ASC`.
2. It selects the first valid source in that order, never the first item in an incidental client array.
3. Active filters are honored. Capture age and current Inbox-entry age are not interchangeable.
4. Automated tests must use deliberately contradictory capture and Inbox-entry timestamps so the defect cannot regress unnoticed.
5. The visual fixture shown in [Direction B Inbox](../discovery/screenshots/01-direction-b-inbox-normal-desktop-1440x1024.png) is composition evidence only, not ordering proof.

### 3.3 Source screenshots are visual evidence, not production truth

Use these captures for hierarchy and density:

- [Direction B desktop Inbox](../discovery/screenshots/01-direction-b-inbox-normal-desktop-1440x1024.png)
- [desktop Board and compact Group & sort](../discovery/screenshots/03-direction-b-board-group-sort-open-desktop-1440x1024.png)
- [desktop grouped List](../discovery/screenshots/11-direction-b-list-grouped-desktop-1440x1024.png)
- [desktop Archived](../discovery/screenshots/12-direction-b-archived-desktop-1440x1024.png)
- [canonical item detail simulation](../discovery/screenshots/13-item-detail-desktop-1440x1024.png)
- [mobile Board and open Group & sort](../discovery/screenshots/31-direction-b-mobile-board-todo-group-sort-open-390x844.png)
- [mobile grouped List in Light](../discovery/screenshots/32-direction-b-mobile-list-grouped-light-390x844.png)

Do not copy prototype-only banners, review controls, fake product/version copy, fixture values, bottom-nav overlap, or the quick-preview pane.

## 4. Information architecture and entry behavior

### 4.1 Desktop navigation

- Add **Processing** immediately after Library in the existing sidebar.
- Processing uses the existing navigation item anatomy, icon library, selected state, and focus treatment.
- Its badge is the unfiltered enrolled active Inbox total. Display may cap at `99+`; the accessible name exposes the exact count, for example `Processing, 327 sources in Inbox`.
- `/processing` and its child views retain Processing navigation highlighting.
- Activating the primary Processing link always opens a clean, unfiltered Inbox. Remembered Board/List state must not bypass it.

### 4.2 Mobile discovery

- Put Processing under **More** initially; do not displace Library, Capture, or Ask.
- Add a Library summary: `Inbox {N} · oldest {age}` plus **Open Inbox**.
- A genuine new-capture confirmation says `Saved to Library and Processing Inbox` when the feature is enabled.
- A Processing entry under More exposes the exact Inbox total in its visible secondary text or accessible description.
- Promote Processing to primary bottom navigation before broad rollout if more than 20% of moderated users cannot find it unaided.

### 4.3 Entry and persistence precedence

1. A valid explicit URL wins.
2. Browser Back/Forward restores normalized URL state and return anchor.
3. Last explicitly used Board/List organization and filters may seed re-entry to that active-work area.
4. A fresh top-level Processing navigation resets to unfiltered Inbox.
5. Invalid or stale IDs, facets, cursors, groups, sorts, or anchors normalize to a safe default and announce the adjustment.

## 5. Processing shell and visual hierarchy

### 5.1 Shared page order

The main region contains, in order:

1. page title and short purpose;
2. primary **Process next** action;
3. neutral metrics;
4. view switcher: Inbox, Board, List, Archived;
5. typed matching count and filters;
6. view-specific organization controls, where applicable;
7. results or state message;
8. one persistent visual Undo notice when eligible.

The visible-on-focus **Skip to Processing content** link is the first focusable element in the application shell and targets this `main`.

### 5.2 Header

- Eyebrow is not needed in production.
- Heading: **Processing**.
- Supporting copy: `Decide what happens to captured sources.`
- **Process next** is the only persistent primary action.
- Do not expose scenario controls, separate Processing appearance controls, “Process next 3,” or batch selection.

### 5.3 Metrics

Desktop uses three equal visual regions; mobile uses stacked rows. Information order is fixed:

1. **Inbox now** `{N}` with `oldest {age}`;
2. **Processed this week** `{N}` with `{N} added`;
3. **Completed this week** `{N}` with `first completions` where clarification is useful.

Add a low-emphasis disclosure near metrics: `Week starts Monday · {IANA timezone}`. Use an abbreviation or relative duration that remains understandable at 200% text size. Do not infer counts from loaded pages.

Loading and initial error show em dashes plus `Unavailable`, never stale numbers or zero. Empty Inbox shows Inbox now `0` while historical weekly metrics remain truthful.

### 5.4 View switcher

- Use ordinary buttons or links with `aria-pressed`/`aria-current`; do not declare tabs unless the full tabs pattern is implemented.
- Visible labels and icons: Inbox, Board, List, Archived.
- Preserve stable DOM order and one active state.
- Switching views keeps valid filters, group/sort where relevant, and the best valid source anchor.
- Announce `{View} view selected. {Matching-count sentence}` through the polite status owner.

## 6. View specifications

### 6.1 Inbox

Inbox is a linear queue ordered by oldest current Inbox entry:

`workflow_inbox_entered_at ASC, id ASC`

An Inbox row contains:

- source-type icon from the existing icon library;
- title;
- source type and capture channel;
- current Inbox-entry age; capture age may appear only when clearly labeled separately;
- visible `Inbox` status text;
- **Open {title}**;
- source-specific native **Move {title} to** control.

Nothing is selected on entry. Production v1 does not render the prototype quick preview. When a row is selected by Process next or direct activation, expose an inline decision strip in that row containing **Leave in Inbox**, **Open {title}**, and native **Move {title} to**; do not duplicate source or note content.

**Process next** behavior:

1. If filters are active, choose the oldest matching Inbox source; otherwise choose the oldest Inbox source.
2. Move focus to its Inbox row heading or **Open** trigger and announce `{title}, Inbox, oldest matching source selected.`
3. Do not mutate status or count merely by selecting.
4. If no source matches but Inbox has sources, focus the filtered-empty heading.
5. If Inbox is truly empty, focus the empty heading.

**Leave in Inbox** is required in the selected row's inline decision strip. It creates no workflow event, version, timestamp, or metric and advances to the next matching source.

### 6.2 Board

- DOM/status order is Inbox, To Do, In Progress, Done.
- Each column is a labeled `section` containing an `h2`, exact matching count, and native `ul`/`li` card list.
- Empty columns remain present on desktop when grouping by Workflow status and state `No matching sources`.
- Each card contains title, type/channel, current status text, compact User tag and AI topic labels when available, **Open**, native **Move**, and Done-only **Archive**.
- Card status is never communicated by color alone.
- Each status has independent bounded pagination and a **Load more {status}** control; loading more must preserve focus and list position.
- Do not expose manual rank handles or imply within-column reorder.

Pointer drag is off by default. If later enabled, it may change status only when grouping is Workflow status. It must not change ordering. The card stays visually Pending until server confirmation. Native Move remains visible and complete.

### 6.3 List

List is the dense whole-workload view. It shares the Board's predicate, counts, group/sort model, actions, mutation contract, URL state, and focus rules.

Desktop columns:

- Status
- Source (title plus type/channel)
- Labels (User tags and AI topics visually separated)
- Captured or lifecycle age, explicitly labeled in the header
- Actions

Rows are native list or table semantics. If implemented as a table, preserve real table headers and responsive row labeling; do not use ARIA grid behavior. Mobile becomes stacked source cards in the same result order, not a horizontally clipped table.

### 6.4 Archived

- Archived is a separate Processing view, not a fifth status.
- Order: `workflow_archived_at DESC, id ASC`.
- Header copy: **Archived** and `Hidden from active Processing only`.
- Each row exposes title, Done status, archive age, `Still in Library`, **Open**, **Restore {title} to Done**, and **Reprocess {title} to Inbox**.
- Restore clears archive and stays Done.
- Reprocess is one atomic action that clears archive, enters Inbox, starts a new Inbox episode, and explains both effects before activation.
- Move is unavailable while archived.
- Hard delete does not appear as an Archived shortcut; it remains a separate canonical detail action.

### 6.5 Canonical item detail and My notes

- **Open** routes to existing `/items/[id]`; do not create a Processing modal, drawer, item copy, or note copy.
- Valid internal return context changes navigation copy to **Back to Processing** and records view, normalized filters, group/sort, status/group lens, anchor ID, and cursor/scroll key.
- Direct or Library entry retains existing **Back to Library** behavior.
- Add a compact Processing section to canonical detail: status, archived-from-Processing metadata, native Move or Restore/Reprocess as valid.
- Workflow controls and My notes have independent pending, error, conflict, version, and save lifecycles.
- A workflow action never saves, clears, submits, indexes, or remounts My notes.
- Note save/delete/restore never changes workflow version or status.
- Existing Save / Discard / Keep editing protection owns dirty-note navigation, including Process next and Back to Processing.
- Return focuses the exact originating trigger when still valid. Otherwise use the focus fallback in §11.

### 6.6 Legacy enrollment

On first use with dormant sources, show a calm enrollment step before an empty-looking Processing experience.

Choices:

- selected unenrolled Library sources;
- captured in the last 30 days, capped at newest 25 after exact preview;
- all unenrolled sources.

Show exact number before confirmation, explain overflow, and offer **All**. Enrollment time—not capture time—starts Inbox age. Confirmation is explicit, idempotent, resumable, and does not increase Added, Processed, or Completed metrics.

## 7. Group & sort contract

Board and List share one component, option source, URL normalization, and reset behavior.

### 7.1 Visual anatomy

Desktop:

- trigger height: `36px`;
- trigger minimum width: `238px`;
- popover: `322px` wide and approximately `148px` high with two `50px` rows;
- popover padding: `6px`;
- popover radius: `12px`;
- label: `13px`; value: `12px`; icon: `18px`;
- restrained shadow and interactive-border token, not a primary-task card.

Mobile:

- trigger at least `44px` high;
- rows at least `54px` high;
- menu width fits the content viewport with no horizontal page overflow;
- menu stays above fixed navigation and within the visible/focusable scroll area.

Trigger label: **Group & sort**. Summary: `{Group label} · {Sort label}`. Popover rows: **Group by**, **Sort by**. Quiet reset: **Reset to Status · Oldest**.

### 7.2 Options

Group:

- Workflow status
- Primary User tag
- Primary AI topic
- Source type
- Capture channel
- Capture quality
- Capture age
- No grouping

Sort:

- Workflow default
- Oldest captured
- Newest captured
- Title A–Z
- Title Z–A
- Workflow status
- Source type
- Capture channel

Board/List default remains **Workflow status · Oldest captured**. Dedicated Inbox ignores this sort and remains oldest current Inbox-entry first.

### 7.3 Interaction and semantics

- Use a button trigger with `aria-expanded` and `aria-controls`.
- Use the application's accessible popover/menu primitive. Move focus into the first row on open; Escape closes and restores trigger focus; outside click closes without changing values.
- Each row opens a single-choice list using native radios or a complete radio-menu pattern. Current value is programmatically exposed.
- Selection updates immediately, closes the choice list, keeps the parent popover open, updates URL, and announces the new result order.
- Reset returns to Workflow status + Oldest captured.
- Non-status grouping shows `Grouping changes layout only. Move still changes workflow status.`
- Non-status grouping must disable drag and must never write workflow state.
- Long values truncate visually but remain fully available in the accessible name/title.

## 8. Filtering and count presentation

### 8.1 Facets

Two separately labeled multi-select facets:

- **User tags** from manual tags only, including **No user tags**;
- **AI topics**, including **No AI topics**.

OR values within one facet; AND across facets. Use stable IDs in URL/query state and visible labels in the UI.

### 8.2 Desktop and mobile control model

Desktop facet triggers open checkbox popovers. Mobile uses the existing accessible Dialog primitive as a bottom sheet or full-screen sheet only if it provides initial focus, containment, Escape/back behavior, inert background, and exact trigger return. Do not copy the current incomplete Library filter dialog.

- Trigger names include selection count: `User tags, 2 selected`.
- Checkbox labels include exact visible value.
- Desktop applies immediately; mobile may stage changes and use **Show {N} results**, with **Cancel** preserving prior URL state.
- Selected values render as removable chips with facet context where ambiguous, for example `User tag: Research`.
- Each chip has `Remove User tag Research`.
- **Clear all filters** is available beside chips and in filtered-empty state.
- Renamed/deleted taxonomy IDs normalize, explain the removal once, and preserve remaining selections.

### 8.3 Typed count copy

- Inbox: `{matching} sources match in Inbox · {total} total sources in Inbox`.
- Board/List: `{matching} active sources match across all statuses · {total} total sources in Inbox`.
- Archived: `{matching} archived sources match · {total} total sources in Inbox`.

Matching changes with filters. Inbox total and headline metrics do not. Column/group headings repeat local matching counts. Never use `Showing N` without a scope and never derive totals from loaded rows.

## 9. Mutation interaction contract

### 9.1 Universal native Move

- Every active source exposes a native select labeled `Move {title} to`.
- Options are Inbox, To Do, In Progress, Done. Current value is selected.
- Choosing current value is a true no-op and does not display Pending or announce success.
- Selecting another value starts one mutation with expected version and mutation ID.
- Keep the source/control mounted, mark it **Pending**, and prevent duplicate submission while allowing Open/read context.
- On confirmation install canonical state, update typed counts, announce outcome, choose deterministic focus, and expose Undo.

### 9.2 Archive, Restore, Reprocess

- Archive appears only for active Done.
- Restore appears only in Archived and returns to Done.
- Reprocess appears only in Archived and explicitly means `Restore from Processing archive and move to Inbox`.
- The same Pending/confirmed/failure/conflict/unknown/Undo model applies.

### 9.3 Undo

- Show one visual notice for confirmed Move, Archive, Restore, or Reprocess.
- Copy: `{Outcome}. Undo available for 10 seconds.`
- The server-provided `undoEligibleUntil` owns eligibility; do not start a guessed client-only duration before confirmation.
- Keep the action available across Processing views and canonical detail in the same tab.
- Expiry removes Undo without moving focus and announces `Undo expired. The confirmed workflow state is unchanged.`
- Success restores exact prior status/archive/current-entry facts and focuses the restored source if visible, otherwise the scoped results heading.
- Conflict or expiry installs current truth and never implies rollback succeeded.

### 9.4 Optional pointer drag gate

Do not enable production drag by default. Before enabling, prove:

- only Workflow-status grouping accepts drag;
- pointer and touch activation has a movement threshold and does not steal ordinary scrolling;
- Escape cancels; pointer cancel returns the card; no drop outside a valid column mutates state;
- a visible drop target and text status identify destination without color;
- reduced motion removes travel animation;
- screen readers receive pickup, destination, cancel, pending, success, and failure messages;
- the native Move control remains visible;
- focus lands on the moved card in destination or destination heading;
- virtualized/paginated columns preserve valid destination focus;
- no within-column reorder or rank is suggested.

## 10. State and recovery specification

| State | Visual behavior | Announcement and action |
|---|---|---|
| Initial loading | Stable shell, page title, disabled result controls, skeletons matching final geometry; metrics show em dash + Unavailable. | Polite: `Loading Processing.` Do not move focus. |
| Loaded | Replace skeletons without layout jump. | Polite: `Processing loaded. {typed count}.` |
| Initial load error | Stable shell; no stale/zero metrics; inline alert with Retry. | Alert: `Processing could not load. Your sources are unchanged.` Focus Retry after user-initiated navigation. |
| Truly empty Inbox | Metrics show 0; other views remain available; heading `Nothing waiting for a decision`; Capture and Browse Library. | Focus heading after Process next or a mutation empties Inbox. |
| Filtered empty | Heading `No sources match these filters`; show total Inbox truth and Clear all. | Polite typed count; focus heading when active source disappears. |
| Empty Board group/column | Preserve section and local count where structure matters. | Heading includes `0 matching`; no redundant alert. |
| Offline with cached data | Persistent banner; read, filter, Open, and detail remain usable; workflow writes disabled with reason association. | Polite once: `You’re offline. Loaded sources remain readable; moving and archiving require a connection.` |
| Mutation pending | Affected source remains mounted with Pending text/spinner; duplicate action disabled. | Polite: `Moving {title} to {status}.` |
| Delayed | Keep Pending; add `Still saving`. | Polite once after threshold: `{Title} is still saving.` No blind Retry. |
| Confirmed | Install canonical projection, counts, position, and Undo. | Polite: `{Title} moved to {status}. Undo available for 10 seconds.` |
| Local/server failure | Roll back only affected source; status remains unchanged; source-local error and Retry. | Alert: `{Title} was not moved. It remains in {status}.` Focus Retry. |
| Unknown outcome | Keep a neutral checking state; no success or rollback claim. | Polite: `Checking the saved state for {title}.` Reconcile mutation ID before offering Retry. |
| Version conflict | Install and display authoritative current state; explain original intent was not applied. | Alert: `{Title} changed in another session and is now {status}. Your move was not applied.` Focus **Use current version** or source action. |
| Deleted/inaccessible | Remove source from local results, close detail if needed, preserve other results. | Alert: `{Title} is no longer available.` Focus next, previous, or results heading. |
| AI topic/tag membership changed | Refresh predicate and counts; source may leave result without status change. | Polite: `Filters updated. {typed count}.` Apply deterministic focus. |
| Undo success | Restore canonical prior projection and relevant result placement. | Polite: `Move undone. {Title} is back in {status}.` Focus restored source or results heading. |
| Undo expired | Remove control only; do not alter data or focus. | Polite: `Undo expired. The confirmed workflow state is unchanged.` |
| Undo conflict | Keep authoritative current state. | Alert: `{Title} changed after that action, so it could not be undone.` |
| Invalid URL/cursor | Normalize to safe state, restart bounded page, preserve valid filters. | Polite: `The saved Processing view was updated because part of it is no longer available.` |
| Dirty note navigation | Existing note guard blocks navigation. | Present Save / Discard / Keep editing; return to initiating workflow/navigation control when cancelled. |
| Feature unavailable/readiness failed | Hide or disable entry according to rollout state; never render a seemingly empty Inbox. | Explain Processing is temporarily unavailable; no mutation controls. |

State copy must say what changed, what did not change, and the next safe action. A visual toast never duplicates the live-region message.

## 11. Keyboard, focus, and screen-reader contract

### 11.1 Keyboard behavior

| Control | Keys | Behavior |
|---|---|---|
| Skip link | Tab, Enter | Becomes visible on focus; moves focus to Processing `main`. |
| View buttons | Tab, Enter/Space | Ordinary independent buttons; no arrow-key promise. |
| Process next | Tab, Enter/Space | Focus/select oldest matching current Inbox entry. |
| Result/Open/Archive/Restore/Reprocess/Undo | Tab, Enter/Space | Native behavior; source-specific accessible names. |
| Move select | Tab, platform-native select keys | Complete status task without drag. |
| Group & sort trigger | Tab, Enter/Space, Escape | Open; Escape closes and restores trigger focus. |
| Group/sort single-choice list | Arrow keys per native radio/menu pattern, Enter/Space | Choose one value; expose current selection. |
| Filter trigger | Tab, Enter/Space | Opens facet. |
| Filter checkboxes | Tab/Space; native checkbox behavior | Toggle values without custom key traps. |
| Mobile filter sheet | Escape/back, Tab/Shift+Tab | Close/cancel, contain focus, inert background, restore exact trigger. |
| Optional drag | Escape | Cancel with no mutation; native Move remains the primary path. |

Do not add application-wide single-key shortcuts in v1. Browser/system shortcuts remain untouched.

### 11.2 Deterministic focus after change

| Event | First target | Fallback |
|---|---|---|
| Inbox source exits current result | Next source at same result index | Previous source, then empty/results heading |
| Leave in Inbox | Next oldest matching source | Previous/first source, then results heading |
| Board move | Moved card in destination | Destination heading |
| List move that remains visible | Same source row | Current group heading |
| Archive/Restore/Reprocess removes row | Next source at same index | Previous source, then view heading |
| Failure rollback | Retry for affected source | Affected source Move control |
| Conflict | Use current version / affected source action | Results heading |
| Unknown outcome reconciliation | Affected source action if visible | Results heading |
| Deleted/inaccessible/filter membership removal | Next source at same index | Previous source, then results heading |
| Undo restores visible source | Restored source primary action | Scoped results heading |
| View switch | New view heading or preserved anchor | Results heading |
| Detail return | Exact originating trigger/anchor | Nearest valid source, then results heading |
| Load more | Invoking Load more control or first newly loaded item only on explicit user request | Status/group heading |

Never leave focus on `<body>`, a removed node, an inert background, or behind fixed navigation. Selection state is not keyboard focus.

### 11.3 Semantics

- One `nav` per application navigation region and one Processing `main`.
- Logical heading order: page `h1`; view/result/group/column `h2`; source titles at the next valid level.
- Inbox, Board columns, List groups, and Archived use native lists; a real table is acceptable for desktop List.
- Do not use `role="grid"` or incomplete tabs semantics.
- Repeated action names start with visible label then title: `Open {title}`, `Archive {title} from Processing`, `Restore {title} to Done`, `Reprocess {title} to Inbox`.
- Status, archive, Pending, error, and selected states use visible text/icon plus programmatic state, not color alone.
- The navigation badge and every displayed count carry their scope.

### 11.4 Dynamic announcements

Mount exactly one empty polite status region and one empty assertive alert region before updates begin.

Polite owner:

- loading/loaded;
- view changes;
- filter and count changes;
- pending/confirmed mutation;
- Undo availability, success, and expiry;
- note saved where the existing note system does not already own it;
- URL normalization.

Alert owner:

- load failure;
- mutation failure;
- conflict;
- deleted/inaccessible source;
- Undo conflict;
- unrecoverable readiness failure.

One event produces one concise spoken message. Visual banners/toasts do not carry a second live role when the persistent region owns speech.

## 12. Responsive layout and touch

### 12.1 Breakpoints

| Width | Required layout |
|---|---|
| `≥1180px` | Existing desktop sidebar; metrics in three regions; Board four columns; dense List; Inbox uses a readable single queue with no preview pane. |
| `768–1179px` | Existing desktop/tablet shell where applicable; metrics may remain three columns if readable; linear Inbox; Board may horizontally scroll inside its own labeled region only. |
| `≤767px` | Existing fixed bottom nav; stacked header and metrics; linear Inbox/List/Archived; Board shows one selected status/group at a time; no quick preview; canonical detail stacks; no drag dependency. |

At `320px`, content must not require page-level horizontal scrolling. Long titles wrap; labels wrap or truncate with an accessible full name; actions stack rather than clip.

### 12.2 Mobile order

1. title and purpose;
2. full-width Process next;
3. Library Inbox summary when entered from/embedded in Library context—not as permanent duplicate content inside every Processing visit;
4. metrics;
5. horizontally scrollable view-button row with visible active state and no hidden task outcome;
6. typed count;
7. filters;
8. Group & sort for Board/List;
9. one-status/group selector for Board;
10. results;
11. Undo notice above bottom navigation.

The Board status/group selector uses ordinary pressed buttons. Horizontal scrolling is allowed within that selector, with the active option scrolled into view, but not across the entire page.

### 12.3 Touch and fixed navigation

- Every mobile task target is at least `44×44 CSS px`, including icon-only controls, filter chips, Close, Undo, and inline actions.
- Maintain at least `8px` separation where adjacent targets could cause destructive errors.
- Use actual bottom-navigation height plus `env(safe-area-inset-bottom)` for content padding and Undo placement.
- Apply matching `scroll-padding-bottom` to the scroll container and `scroll-margin-bottom` to focusable result actions.
- Focused or activated controls must never be obscured by the bottom nav, on-screen keyboard, sheet, or Undo notice.
- Preserve ordinary vertical page scrolling; avoid drag/touch handlers that block it.
- Validate 320, 360×800, 390×844, and 412×915 CSS-pixel viewports in portrait, plus keyboard-open states.

## 13. Visual system, themes, and motion

### 13.1 Existing system reuse

- Use `src/styles/tokens.css` and existing Tailwind/Radix conventions as source of truth.
- Reuse current AI Brain logo, sidebar/bottom-nav density, type scale, Lucide icons, spacing, focus treatment, and 6–10px application radii unless the accepted Group & sort popover requires its documented 12px radius.
- Do not import the prototype's Georgia display type if it differs from production tokens; use current application heading typography.
- Do not add emoji, handcrafted SVG/CSS art, placeholder icons, decorative graphs, bright debt indicators, or project-management metaphors.
- Use the stronger interactive boundary token only for meaningful control/card boundaries; keep decorative dividers quiet.

### 13.2 Light and Dark

- Preserve equivalent information, hierarchy, states, and operations in current global Light and Dark themes.
- Do not use a blanket color inversion.
- Verify normal, hover, pressed, selected, focus, disabled, Pending, success, warning, error, conflict, and skeleton states in both themes.
- Text: at least 4.5:1 for normal text and 3:1 for large text.
- Meaningful controls, focus indicators, and status boundaries: at least 3:1 against adjacent colors.
- Status is always textual/icon-supported, never color-only.
- Forced-colors mode must retain visible boundaries, focus, current view, selected filter, and Pending/error states.

### 13.3 Motion

- Honor the existing `prefers-reduced-motion` tokens.
- Under reduced motion, remove card travel, column slide, popover/sheet transform, skeleton shimmer, and smooth scrolling.
- Keep immediate state changes, Pending text, focus transfer, and live announcements; motion reduction must not remove outcome information.
- No auto-advancing carousel, flashing, confetti, or celebration.
- Even when motion is allowed, mutation movement waits for or clearly distinguishes confirmation; never animate a false success.

## 14. Content rules

Use **source** in descriptive UI and **Processing** / **Inbox** for product/navigation labels. Avoid “task,” “overdue,” “stale,” “debt,” “clear your backlog,” and “productivity streak.”

Required copy anchors:

| Purpose | Copy |
|---|---|
| Page support | `Decide what happens to captured sources.` |
| Empty Inbox | `Nothing waiting for a decision` |
| Empty Inbox support | `New captures will appear here. You can also add selected sources from Library.` |
| Filtered empty | `No sources match these filters` |
| Load failure | `Processing could not load. Your sources are unchanged.` |
| Offline | `You’re offline. Loaded sources remain readable; moving and archiving require a connection.` |
| Archive success | `Archived {title} from Processing. It remains in Library.` |
| Reprocess explanation | `Restore from Processing archive and move to Inbox.` |
| Conflict | `{Title} changed in another session and is now {status}. Your move was not applied.` |
| Unknown | `Checking the saved state for {title}.` |
| Undo expiry | `Undo expired. The confirmed workflow state is unchanged.` |

Use sentence case. Error copy identifies the affected source when safe, current truth, whether intent applied, and the available recovery action.

## 15. URL, place, and pagination behavior

Canonical URL state uses stable IDs and normalized enum values for:

- `view`;
- `group` and `sort` for Board/List;
- mobile status/group lens;
- User-tag IDs;
- AI-topic IDs;
- archive scope where needed;
- source anchor;
- cursor/scroll key or return-context token.

Do not put title, taxonomy label, note text, theme, or raw query payload in the URL. Back/Forward must restore visible state without replaying mutations. Bookmarks normalize stale state and never show a silently broken or apparently empty page.

Keyset pagination rules:

- each Board status has its own cursor;
- Inbox/List/Archived use the cursor bound to their normalized order;
- loading a later page does not change aggregate counts;
- cursor/filter mismatch restarts through an explicit normalized state;
- focus targets remain keyed by stable item ID;
- virtualization is allowed only after semantic and focus gates pass.

## 16. Implementation accessibility acceptance

This v1 is not an accessibility pass. Release remains no-go until recorded evidence covers:

### 16.1 Keyboard and focus traces

- Skip link through all core actions.
- Process next, Move forward/backward, Done, Archive, Restore, Reprocess, Undo.
- Local failure, delayed/unknown outcome, conflict, deleted source, filtered removal, empty result.
- Group & sort, multi-select filters, Clear all, Back/Forward, canonical detail return, dirty-note guard.
- Load more and any virtualization at status boundaries.
- No trace ends on body, removed content, inert background, or obscured focus.

### 16.2 Assistive technology

- NVDA + Chrome on Windows.
- VoiceOver + Safari on macOS.
- VoiceOver + Safari on iOS at 390×844.
- TalkBack + Chrome on Android.
- Switch Control / equivalent switch navigation.

Each run covers normal, offline, failure, conflict, unknown, Undo, filter, archive, detail/notes, and empty states. Verify one message per outcome and useful rotor/elements-list names.

### 16.3 Visual and responsive

- 320px, 360×800, 390×844, 412×915, 768–1179, 1024×768, 1280×800, 1440×1024.
- Browser zoom 200% and 400% with reflow.
- WCAG text-spacing overrides.
- Light, Dark, forced colors/high contrast.
- Reduced motion.
- Software keyboard open, safe-area devices, and last-action focus clearance.
- No page-level two-dimensional scroll and no sub-44px mobile task target.

### 16.4 Semantics and contrast

- Valid landmark and heading outline.
- Native list/table relationships and exact set sizes where loaded.
- No incomplete tab/grid/menu/dialog semantics.
- Contextual repeated action names and exact count scopes.
- 4.5:1 normal text, 3:1 large text, and 3:1 meaningful non-text/focus boundaries in every supported theme/state.

Production drag remains disabled unless its full gate in §9.4 passes independently.

## 17. UX acceptance traceability

| PRD acceptance area | UX evidence required |
|---|---|
| AC 8, transitions | Native Move completes every active-state transition; current value is no-op; Pending and confirmed truth are distinct. |
| AC 9, ordering | Contradictory capture/current-entry fixtures prove Process next and Inbox use oldest current entry. |
| AC 10, group/sort | Shared Board/List control, exact options, no custom rank, non-status grouping never enables drag or writes status. |
| AC 11–12, filters/counts | Multi-value algebra, “No …” values, chips/Clear all, URL restore, and page-independent typed counts. |
| AC 13, Inbox loop | No preselection; Process next and confirmed exit use deterministic focus; empty heading receives focus. |
| AC 14, parity | Inbox/Board/List/detail and desktop/mobile share one mutation/recovery model. |
| AC 15–16, detail/notes | Valid return context; exact focus return; note guard and independent note/workflow versions. |
| AC 17, archive | Done-only Archive; Restore and atomic Reprocess; copy consistently says Archived from Processing/still in Library. |
| AC 18–22, trust | CAS, replay, unknown outcome, Undo boundary, offline, rollback, conflict, and announcements match §§9–11. |
| AC 23–24, metrics/time | Exact neutral hierarchy, unavailable states, Monday/IANA disclosure, no activity-gaming visuals. |
| AC 26–28, scale/mobile/a11y | Bounded pages, stable focus, required viewport/touch/reflow/AT matrix, no drag dependency. |
| AC 33, scope | No batch, rank, offline queue, editable preview, PM fields, collaboration, or global archive appears. |

## 18. Adversarial-review targets

The next review should try to disprove, with code or interaction evidence:

1. that Process next uses current Inbox-entry ordering rather than capture/client order;
2. that no source is preselected and no quick-preview duplicate survives;
3. that filter/count predicates are identical across rows, groups, totals, URLs, and pagination;
4. that every mutation remains truthful across pending, failure, conflict, unknown outcome, replay, and Undo;
5. that note state is independent and dirty-note protection cannot be bypassed;
6. that focus remains deterministic when a source moves, disappears, is restored, or is not loaded;
7. that mobile offers every outcome with no drag, clipping, overlay obstruction, or sub-44px target;
8. that one event has one spoken owner and every repeated action has source context;
9. that non-status grouping and optional drag can never mutate or imply rank;
10. that Light, Dark, forced colors, reduced motion, zoom/reflow, and real assistive technology preserve the complete task.

## 19. Explicit non-claims

This document does not claim that:

- the source prototype proves production behavior, multi-select filtering, backend ordering, CAS, idempotency, scale, or accessibility;
- the captured screenshots pass mobile bottom-navigation clearance or 320px/zoom testing;
- pointer drag is authorized;
- the production feature is implemented, tested, deployed, released, or live-verified.

Those claims require implementation and recorded verification against the PRD and this package.
