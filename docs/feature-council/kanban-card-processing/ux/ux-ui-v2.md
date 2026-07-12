# Kanban Card Processing — UX/UI v2

**Status:** Implementation source of truth when read with PRD v2 and technical-plan v2
**Date:** 2026-07-12
**Selected visual direction:** Direction B — Processing, Inbox-first
**Companions:** [PRD v2](../product/prd-v2.md), [technical plan v2](../technical/technical-plan-v2.md), [decision log](../decisions/decision-log.md), [UX v1 review](../reviews/ux-ui-v1-adversarial-review.md)

## 1. Authority and review disposition

UX/UI v1 is preserved as a review draft. This v2 is the executable experience contract and incorporates every material review finding.

| V1 finding | V2 disposition |
|---|---|
| V1 claimed authority before review | Resolved: only aligned product/UX/technical v2 governs implementation. |
| Ten-second/rapid Undo inaccessible and ambiguous | Resolved: 30-second minimum, one most-recent confirmed action per tab, deterministic replacement, permanent reverse actions. |
| Non-status grouping undefined over partial pages | Resolved: server group descriptors and per-group keysets; canonical primary-value and bucket rules. |
| Process next cross-view behavior undefined | Resolved for every view/filter/offline/no-match state below. |
| Return/focus assumed a loaded DOM target | Resolved with seek-by-anchor, incremental states, and bounded fallback. |
| Detail placement ignored current product anatomy | Resolved against the current desktop rail and mobile Overview/Notes routes; note editor never remounts. |
| Dynamic mobile groups used an unbounded button strip | Resolved: four status buttons only; dynamic groups use one bounded native selector/dialog. |
| Nonexistent popover primitive assumed | Resolved: details disclosure with native fieldsets/radio groups on desktop and verified Radix Dialog on mobile. |
| Enrollment/paging/offline recovery states missing | Resolved in the state matrix. |
| Mobile entry/discovery placement vague | Resolved against current More and Library anatomy. |
| Malformed/prototype-only captures treated as authority | Resolved: canonical valid source images plus current application tokens/anatomy; prototype review controls are excluded. |

## 2. Experience thesis

Processing is a calm decision loop for saved sources, not project management. Inbox answers “what should happen to this source?” Board and List reveal the workload without changing the lifecycle model. Library, canonical item detail, My notes, User tags, AI Topics, search, Ask, Related, Needs Upgrade, Review, and hard delete remain existing AI Brain capabilities.

Principles:

1. Inbox is the landing job; nothing is preselected.
2. The oldest current Inbox entry—not the oldest capture and not DOM fixture order—is first.
3. Native Move completes every workflow task; drag is optional and off until its release gate passes.
4. Pending, failed, conflicted, unknown, superseded, and expired outcomes remain visibly distinct.
5. Workflow actions never save, clear, submit, index, or remount My notes.
6. Counts and metrics label their scope and never infer truth from loaded rows.
7. Timed Undo is a convenience; a permanent native path always permits a new corrective action.
8. Light/Dark, desktop/mobile, keyboard/touch/assistive technology retain content and task parity.

## 3. Visual target and product-system mapping

Use these valid source visuals for composition:

- `Kanban-designs/prototypes/screenshots/direction-b-inbox-reference-1487x1058.png`
- `Kanban-designs/prototypes/screenshots/direction-b-inbox-desktop-1440x1024.png`
- `Kanban-designs/prototypes/screenshots/direction-b-inbox-mobile-390x844.png`
- `Kanban-designs/prototypes/screenshots/direction-b-list-group-sort-menu-compact-light-1440x1024.jpg`
- the exact compact measurements in `Kanban-designs/prototypes/handoff/agent-handoff.json`.

Map the composition to the existing application:

- current logo, sidebar/bottom navigation, Lucide icon family, CSS tokens, focus style, global theme, and motion tokens;
- current page gutters and 6–10px product radii rather than copying the throwaway shell;
- no “Direction B,” “prototype,” review-state selector, prototype gallery link, prototype-specific appearance control, fictional status marker, or custom detail page;
- the global Theme preference remains the only Light/Dark owner.

The malformed cropped state captures identified by review are behavioral evidence only, not pixel targets. Final design QA compares production captures at the same state/viewport against the valid canonical target and current application anatomy.

## 4. Information architecture and discovery

### Desktop

- Add **Processing** immediately after Library in the primary sidebar.
- Icon: the closest existing Lucide Inbox/Tray icon; use the same 16px/2px-stroke optical treatment as Library.
- Badge: unfiltered enrolled active Inbox total, displayed as 99+ only in navigation.
- `/processing` is active for its route and canonical detail only through return context, not for ordinary Library detail entry.

### Mobile More

In the current `/more` routed page, add a first section named **Workflows**, above Preferences:

- row: Processing; Inbox icon; supporting text `{N} waiting · oldest {age}` or `Nothing waiting`;
- row remains at least 44px high and uses the existing MoreLink anatomy;
- loading shows `Checking Inbox…`; unavailable shows `Processing unavailable` and does not display zero;
- entering opens a clean Inbox.

### Library summary

Place a compact summary below the Library title/result summary and above filters/results:

- `Processing Inbox`;
- `{N} waiting · oldest {age}`;
- **Open Inbox** action;
- empty: `Nothing waiting in Processing` with no urgency styling;
- error/unavailable: honest unavailable text plus Retry, never false zero.

### Capture feedback

For a genuinely new successful item: `Saved to Library and Processing Inbox.` Link to Open Inbox. Duplicate/upgrade/repair copy must not claim a new Inbox entry. The message is visual and announced once by the existing capture result owner.

### Discovery gate

Moderated task: “Find where you would decide what to do next with saved sources.” Test at least five representative mobile attempts before broad navigation rollout. If more than 20% cannot open Processing unaided from More or Library, promote it to primary mobile navigation and repeat the gate.

## 5. Processing shell and responsive order

Shared order:

1. visible-on-focus Skip to Processing results;
2. title, calm description, **Process next**;
3. Inbox health and Today/week activity;
4. Inbox/Board/List/Archived view buttons;
5. typed count summary;
6. filters, active chips/Clear all;
7. Board/List Group & sort when applicable;
8. result surface;
9. persistent polite status and alert regions;
10. current tab Undo notice when present.

Desktop ≥1180px:

- Inbox may use a queue/details split; preview is read-only and optional. If omitted, the queue uses the full content width.
- Board shows bounded visible group columns; List/Archived use a dense table/list hybrid.

Tablet 768–1179px:

- Inbox is one column; preview follows selection if retained.
- status Board may scroll inside its own labeled region, never create page-level two-dimensional scrolling.

Mobile ≤767px:

- linear Inbox/List/Archived;
- one selected Board status/group at a time;
- no quick preview; Open uses canonical detail;
- content/focus clearance accounts for bottom navigation, safe area, and software keyboard;
- task controls ≥44×44 CSS px.

## 6. Metrics presentation

Use calm, non-judgmental values with no streaks, overdue states, red debt, confetti, or zero-Inbox goal.

Persistent hierarchy:

- `Inbox now` — count + oldest current entry age;
- `Processed` — Today and This week, with `Added this week` secondary comparison;
- `Completed` — Today and This week.

Desktop may use three divided metric regions. Mobile uses compact stacked rows. Today/week labels are visible, not tooltip-only. Disclosure: `Week starts Monday · {IANA timezone}` with Change timezone link/action.

Loading and errors display em dash/Unavailable. Empty Inbox displays Inbox 0 while historical Today/week values remain truthful.

## 7. View switcher and persistence

Inbox, Board, List, Archived are ordinary buttons with `aria-pressed`; do not implement tabs unless the complete tabs pattern is used. Each has an icon, text label, and visible focus.

Precedence:

1. valid explicit URL state;
2. Back/Forward normalized URL;
3. last explicitly used Board/List organization for active-work entry;
4. fresh primary Processing navigation resets to unfiltered Inbox;
5. invalid IDs/cursors/groups/filters normalize with a polite explanation.

Stable URL state uses IDs, not labels: view, group, sort, status/group lens, tag IDs, topic IDs, anchor ID, cursor/seek token. Theme is not Processing URL state.

## 8. Inbox and Process next

Inbox order is exactly `workflow_inbox_entered_at ASC, id ASC`. The source prototype's `cards.find()`/newest-first defect must never be copied.

Nothing is selected on entry. Each row has separate controls:

- **Select {title} for processing** — explicit button/row primary label that sets the read-only decision context;
- **Open {title}** — canonical detail;
- native **Move {title} to** control;
- status label and bounded source metadata.

Do not make a row containing nested controls itself a vague clickable target.

### Process next from every view

Process next means “open the oldest source matching the current User-tag/AI-topic filters in active Inbox.”

- From Inbox: seek/load the first matching result, select it, focus the decision heading/control.
- From Board or List: change URL view to Inbox while retaining filters, clear group lens, seek the oldest matching Inbox source, then select/focus it.
- From Archived: change to active Inbox, retain taxonomy filters, discard archive-only group lens, then seek/select.
- Filtered no-match: remain in current view and announce `No Inbox sources match these filters`; offer Clear filters/Open unfiltered Inbox.
- Empty Inbox: focus the empty heading; offer Capture/Browse Library.
- Offline with cached matching row: switching/viewing is allowed; mutation actions remain disabled.
- Offline without required page/cache: announce `Connect to load the next Inbox source`; do not change view or claim selection.
- Loading/error/stale cursor: normalize/retry before focus; never focus an unmounted target.

**Leave in Inbox** creates no event and advances to the next matching source. A confirmed exit advances only after server truth; pending/failure/conflict/unknown keeps the target mounted and focused according to the state matrix.

## 9. Board/List grouping and sorting

Board and List share the compact **Group & sort** trigger.

Desktop measurements from handoff: 36px trigger, 322px disclosure/panel width, ~50px option rows, 12–13px text, 18px icons, 12px radius. Mobile trigger ≥44px and rows ≥54px.

Implementation pattern:

- desktop: native `<details>` disclosure or a simple positioned region containing two `<fieldset>` radio groups; Escape/outside close may be added only with tested focus return;
- mobile: existing Radix Dialog containing the same two fieldsets, initial focus on current Group choice, Cancel/Apply, Escape/back closes, trigger focus restored;
- no nested menu, nested popup, custom radio emulation, or assumed missing Popover primitive.

### Options

Group: Workflow status, Primary User tag, Primary AI Topic, Source type, Capture channel, Capture quality, Capture age, No grouping.

Sort: Workflow default, Oldest captured, Newest captured, Title A–Z, Title Z–A, Workflow status, Source type, Capture channel.

Reset: Workflow status + Oldest captured for Board/List. Dedicated Inbox ignores these and remains oldest-current-entry.

### Canonical grouping

- each item belongs to exactly one visible group;
- primary User tag/AI Topic is canonical display name ascending, stable ID tie-break; absence maps to `No User tags`/`No AI Topics`;
- server returns group key, label, exact count, order, and independent cursor; client never regroups partial status pages;
- status order: Inbox, To Do, In Progress, Done;
- static enum groups use product enum order; dynamic tag/topic/source values use display label then stable key;
- capture-age buckets use the server-frozen owner-timezone/as-of contract from technical v2;
- empty groups are omitted except the four status columns, which remain visible with 0;
- taxonomy rename/delete/membership change invalidates the cursor, refreshes descriptors, and announces the new count.

### Desktop Board

- status grouping: four labeled sections with native `ul/li`, exact counts, independent Load more;
- non-status grouping: use server group descriptors, maximum 10 visible columns per group page; Next groups/Previous groups controls preserve focus;
- each group independently loads items; local count is the exact server group count, never loaded length;
- pointer drag exists only for status grouping and stays disabled until the drag gate passes.

### Mobile Board

- Workflow status uses four pressed buttons with counts.
- Dynamic/high-cardinality grouping uses one labeled native select (or the same Dialog choice list) showing current group/count; never render an unbounded horizontal strip.
- Test 50+ groups at 320px, 400% zoom, VoiceOver, TalkBack, and switch.

### List

List uses the identical normalized group/sort/filter result. Group headings show exact counts; rows show status, source, separated labels, captured/current-entry age where applicable, Open, native Move, and Done-only Archive.

## 10. Filters and counts

Facets:

- manual User tags only;
- AI Topics only; auto tags and scalar category are intentionally excluded;
- multi-select OR within each facet, AND across facets;
- `No User tags` and `No AI Topics` values;
- stable-ID URL state, removable facet/value chips, Clear all.

Desktop uses compact disclosures/checkbox lists; mobile uses the existing Dialog pattern with focus containment/return. Filter metadata has loading, error/Retry, empty taxonomy, stale selection normalization, and changed-membership refresh states.

Typed copy:

- Inbox: `{matching} sources match in Inbox · {Inbox total} total in Inbox`;
- Board/List: `{matching} active sources match · {Inbox total} total in Inbox`;
- Archived: `{matching} archived sources match · {Inbox total} total in Inbox`;
- every Board status heading shows exact filtered count for Inbox/To Do/In Progress/Done;
- dynamic group heading shows exact filtered group count.

Counts come from the server predicate and remain independent of page length. If taxonomy changes remove the focused item, focus the next matching item, previous, then result heading and announce the changed count.

## 11. Mutation and Undo interaction

Universal item state: idle → pending → confirmed | failed | conflicted | outcome unknown → reconciled. Pending stays visually distinct and keeps its focus target mounted.

### Move/archive/recovery

- Native Move is available in Inbox/Board/List/detail; same-state selection is an accepted no-op with no success inflation.
- Archive appears only for active Done and says **Archive from Processing**.
- Archived view offers **Restore to Done** and **Reprocess to Inbox** with distinct explanatory copy.
- Offline disables all workflow writes and references one visible reason.

### One tab-scoped Undo slot

- A confirmed reversible action A owns the tab slot for 30 seconds.
- A later reversible action B replaces A only after B confirms. Copy: `{B outcome}. Undo now applies to this latest change.`
- Failed/conflicted/unknown/no-op B leaves A until A expires; reconciliation may replace only when B is confirmed.
- Same-item later confirmation supersedes earlier version; different tabs own independent slots.
- Notice names source + action, shows Undo, optional non-ticking `Available briefly` text, and may expose remaining seconds only without noisy live announcements.
- Expiry removes Undo without moving focus and announces once that confirmed state remains.
- Success focuses the restored source if visible; otherwise seek/load it, then fall back to results heading.

Thirty seconds is the minimum. Manual timed keyboard/screen-reader/switch testing may lengthen it; it cannot be shortened silently.

### Permanent reversal

After expiry the owner can always use ordinary native Move, Archive, Restore, or Reprocess to establish desired current state. This creates new history rather than invalidating the earlier metric event. Help text distinguishes `Undo restores the prior recorded change` from `Move/Restore makes a new change`.

## 12. Pagination, seek, and focus

Every result surface defines:

- initial loading skeleton with unavailable counts/metrics;
- incremental Load more control, busy state, failure/Retry, and end-of-results message;
- source/group cursor stale normalization;
- a server seek-by-anchor operation that returns the containing normalized page/cursor when the ID is still eligible;
- unloaded destination after Move/Undo loads before focus;
- canonical detail return attempts seek for the saved anchor before using nearest-source fallback;
- nearest fallback is permitted only for deleted/inaccessible/filtered-out sources or bounded seek failure and is announced.

Focus order after removal: next matching source, previous matching source, result/group heading, empty heading. Load-more failure focuses Retry. Successful Load more returns focus to the trigger while newly added rows follow it in DOM order.

Do not virtualize for first release unless measured need remains after bounded pages. If virtualization is used, it requires separate keyboard/AT/set-size/focus evidence. Without virtualization, prove bounded pages/DOM and 50k query budgets.

## 13. Canonical item detail and notes

Do not copy the throwaway detail simulation.

### Desktop current detail

Add a compact **Processing** section to the existing right metadata rail, after source status/metadata and before destructive Delete:

- status badge + native Move;
- Done-only Archive or archived Restore/Reprocess;
- Pending/failure/conflict/unknown/Undo status local to workflow;
- no sticky overlay and no new editor.

The component receives workflow projection separately and updates without changing the identity/key of the existing ManualNoteEditor or its parent tab container.

### Mobile current detail

- Show the same compact workflow section in the Overview metadata/action region and, when Notes is the active route tab, as a non-sticky summary/control above the note footer/actions without unmounting the editor.
- Workflow mutation never changes the active Overview/Notes route tab.
- Software keyboard open: workflow controls do not overlay Save, note status, or bottom navigation.
- Notes feature disabled: workflow remains present in Overview with no empty Notes promise.

### Return and dirty notes

Validated internal return context stores view/filter/group/sort/anchor/seek token. External return URLs are rejected. Back from detail invokes the existing Save / Discard / Keep editing safety when a draft is unsafe. Workflow action never triggers that guard or implicitly navigates. Safe return uses seek and restores the exact trigger/source focus.

## 14. State, focus, and announcement matrix

| State | Visual/action | Focus/announcement |
|---|---|---|
| Initial loading | Stable shell, skeleton, em dash metrics | Main heading; polite `Loading Processing` once |
| Initial error | Alert, `Sources unchanged`, Retry | Retry focused; alert once |
| Empty Inbox | Capture/Browse Library | Empty heading focused when arrived by action |
| Filtered empty | Total Inbox retained, Clear filters | Heading then Clear; typed count |
| Offline with cache | Banner, reads allowed, writes disabled | Preserve focus; explain no queue |
| Offline without cache | No false empty; Reconnect/Retry | Retry/reconnect action; announce content unavailable |
| Reconnected | Refresh current URL, reconcile pending/unknown first | Preserve/seek focus; announce updated count |
| Pending | Item remains mounted, Pending text | Preserve source/action focus; polite pending |
| Local failure | Roll back one item, Retry | Retry focused; alert `{title} was not moved` |
| Conflict | Current canonical status + Use current version | Conflict action focused; alert; never auto-reapply |
| Outcome unknown | Checking outcome; blind retry unavailable | Preserve source; alert only if action needed |
| Confirmed | Install current truth; advance/slot per flow | Polite outcome and slot owner |
| Undo replaced | Notice updates to newest confirmed action | No focus move; one polite replacement message |
| Undo expired | Remove action; state unchanged | If focused, move to notice container/source; announce once |
| Deleted/inaccessible | Remove source locally | Seek next/previous/heading; alert without existence leak |
| Taxonomy changed | Refresh membership/groups/counts | Seek next/previous/heading; polite typed count |
| Filter metadata loading/error | Keep current valid filters; retry metadata | Focus Retry on explicit error action |
| Page loading | Load more busy; existing items stable | Trigger remains focus owner |
| Page failure/end | Retry or end copy | Retry focused only after explicit invocation failure |
| Enrollment preview | Exact mode/count/overflow; Confirm/Cancel | Dialog title then choice; no mutation before confirm |
| Enrollment running | Progress + safe leave/resume | Status updates throttled; Cancel at batch boundary |
| Enrollment partial/failure | Exact processed/remaining; Resume/Cancel | Action focus; alert safe code |
| Enrollment complete | Count enrolled; Open Inbox | Open Inbox action; polite completion |
| Dirty note return | Save/Discard/Keep editing | Existing guard containment and trigger return |

One persistent polite live region owns non-urgent status/count/view messages. One alert region owns actionable failures/conflicts. Visual toasts do not duplicate `role=status`/`alert`.

## 15. Accessibility and interaction semantics

- one `main`, labeled nav, skip link, logical headings;
- Board sections with `ul/li`; no ARIA grid;
- view/status buttons use `aria-pressed`; fieldsets/radio groups use native semantics;
- source-specific accessible names: Open/Select/Move/Archive/Restore/Reprocess + title;
- status is text/icon plus color, never color alone;
- 2px visible focus; meaningful boundaries ≥3:1; body text ≥4.5:1;
- reduced motion removes card travel/reordering animation while retaining messages;
- all tasks work without drag, hover, long press, or fine pointer;
- fixed-nav/keyboard clearance, `scroll-padding-bottom`, and focus `scroll-margin-bottom` use actual safe-area values;
- forced-colors preserves boundaries/focus/status differentiation;
- text spacing and 200%/400% zoom do not clip controls or create page-level horizontal scroll.

Manual release matrix:

- keyboard-only at 1440, 1024, 390, 320;
- NVDA + Chrome, VoiceOver + Safari macOS/iOS, TalkBack + Chrome Android;
- switch control including dynamic group selection and timed Undo;
- Light, Dark, forced colors, reduced motion, text spacing, 200%/400%;
- normal, pending, error, conflict, unknown, Undo replacement/expiry, enrollment, page failure, archived/detail/note return;
- 30-second timed task plus permanent reversal task.

Pointer drag remains disabled until pointer cancellation, Escape cancellation, AT announcement, reduced motion, status-only grouping, pagination destination focus, and mobile/non-drag parity all pass.

## 16. Design QA and implementation evidence

Before handoff, capture production implementation at matching states/viewports:

- Inbox desktop 1440×1024 Dark and Light;
- Inbox mobile 390×844 and 320px;
- Board status + Group & sort open;
- List non-status group + Light;
- Archived + Restore/Reprocess;
- More entry, Library summary, capture confirmation;
- current desktop detail rail and mobile Overview/Notes with keyboard;
- loading/error/offline/empty/filtered/failure/conflict/unknown/Undo states.

Put source and implementation images into the same comparison input. Evaluate typography, spacing, tokens, icons/assets, copy, states, responsiveness, and accessibility. Fix every P0/P1/P2 and record `final result: passed` in the required `design-qa.md`; P3 polish may remain documented.

## 17. UX acceptance criteria

1. Fresh Processing entry is unfiltered Inbox with no selection.
2. Process next selects exact current-entry oldest fixture from every view and handles no-match/offline/stale states.
3. Explicit Select/Open/Move controls have distinct names and no nested row ambiguity.
4. Board/List share exact group/sort/filter/order/count result over partial pages.
5. Dynamic primary tag/topic/null membership and group ordering match server truth.
6. Status Board has exact four filtered counts independent of loaded rows.
7. Mobile dynamic groups remain bounded with 50+ groups at 320px/400%.
8. Multi-select User tags/AI Topics, No values, chips, Clear, URL restore, taxonomy invalidation pass.
9. Pending/failure/conflict/unknown/reconciled behavior keeps one source/focus truthful.
10. 30-second one-tab slot replacement rules pass same/different-item and multi-tab fixtures.
11. Timed Undo and permanent reversal complete with keyboard, NVDA/VoiceOver/TalkBack, and switch.
12. Page loading/error/end, seek beyond page one, unloaded Move/Undo destination, and detail return focus pass.
13. Workflow controls in desktop/mobile detail never remount, save, clear, obscure, or change My notes.
14. Archive/Restore/Reprocess copy and focus match the full downstream product matrix.
15. Enrollment preview/running/partial/failure/resume/cancel/complete states remain exact and recoverable.
16. Offline-no-cache/reconnect/filter-metadata/page-failure states never show false success/zero.
17. More/Library/capture discovery completes the moderated threshold and real mobile tasks.
18. Light/Dark/forced colors/reduced motion/text spacing/200%/400% and fixed-nav/keyboard clearance pass.
19. Native non-drag parity passes before any drag enablement.
20. Same-state Move is an honest no-op without success/Undo replacement.
21. Design QA uses same-state, same-viewport combined comparisons and ends `final result: passed`.

## 18. No-go gates

Do not ship if:

- Process next can select by capture/fixture/DOM order;
- any grouping/count is computed from partial loaded rows;
- a valid anchor/destination cannot be sought and focused;
- Undo scope/timing differs between product, UI, and server;
- native permanent reversal is absent;
- workflow interaction remounts or changes a note draft;
- mobile uses an unbounded dynamic button strip or obscures/subsizes a task;
- private/error/offline states imply false current truth;
- drag is required;
- any P0/P1 accessibility/design QA finding remains;
- PRD v2, UX/UI v2, and technical-plan v2 disagree.
