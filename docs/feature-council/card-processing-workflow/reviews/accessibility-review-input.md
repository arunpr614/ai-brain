# Card Processing Workflow — Accessibility Review Input

**Council role:** Accessibility Specialist
**Status:** Pre-review input for prototype validation; not a final accessibility pass and not evidence of implementation
**Date:** 2026-07-11
**Baseline:** WCAG 2.2 Level AA, with the current AI Memory accessibility conventions as the implementation floor

## Executive recommendation

Proceed with **Direction B: Processing — Inbox-first triage**, using the list as the semantic and interaction baseline and the board as an optional spatial view.

Direction B is the safest of the three because its primary job can be completed in a linear reading order, on desktop and mobile, without drag, a dense data table, or simultaneous four-column navigation. It also makes a labeled set of destinations visible in the triage pane. That advantage is conditional: the split desktop layout must collapse to one task surface at narrow widths, the destination tiles must be real buttons, focus must advance predictably after a confirmed move, and the prototype must not introduce a second editable notes surface.

Direction C is the second-safest. Its list-first posture and explicit Move to controls are strong, but the dense table, inline expansion, many small controls, and desktop-width information architecture create substantial reflow, magnification, mobile, and screen-reader navigation risk.

Direction A is the highest-risk direction. It makes a four-column board and visible drag state the dominant mental model. The static concept does not demonstrate an equivalent labeled move control for every card, a keyboard model, focus behavior across columns, or a usable 390 × 844 representation. It can remain a comparison prototype, but it should not be the accessibility baseline.

This assessment is based on the three static concept images and discovery artifacts. Interactive semantics, computed contrast, focus behavior, assistive-technology output, zoom, reflow, and motion still require prototype testing.

## Accessibility decision matrix

| Dimension | Direction A — Workflow board-first | Direction B — Processing Inbox-first | Direction C — Queue/Library integrated |
|---|---|---|---|
| Non-drag completion | High risk; arrows and drag dominate, with no proven labeled Move to action on each card | Strongest; visible destination actions can be the primary path | Strong; each row exposes Move to, if the control is fully labeled and keyboard operable |
| Reading and focus order | Four independently populated columns create a long, fragile order | Linear Inbox list with one selected detail/triage pane is understandable | Linear rows are understandable, but inline expanded content can make order verbose and surprising |
| Mobile equivalence | Weakest; simultaneous columns cannot translate to 390 × 844 | Strongest; the same Inbox task can remain a list | Feasible only if the table becomes cards/grouped list rather than horizontal scrolling |
| Zoom and reflow | High risk from four fixed columns | Moderate risk from the split pane; safe if it collapses to one column | High risk from the wide table and dense toolbar |
| Screen-reader efficiency | Repeated card/column navigation and virtualization are complex | Best opportunity for headings, list position, next-source focus, and concise actions | Table semantics can help experts, but expanded row details and repeated controls may become noisy |
| Cognitive load | Backlog is exposed all at once; metrics, filters, columns, and actions compete | One-source-at-a-time decision model is clearest | Familiar browse model, but status, taxonomy, notes, metrics, and bulk actions compete in one shell |
| Safest disposition | Comparison only | **Recommended accessibility baseline** | Secondary comparison; reuse patterns selectively |

## Release-blocking accessibility risks

| Priority | Risk | Required gate |
|---|---|---|
| Critical | Any move, reorder, archive, restore, or reprocess task requires drag, swipe, hover, or precise pointer movement | Complete every task with keyboard and single-tap/click controls; meet WCAG 2.1.1, 2.5.1, and 2.5.7 |
| Critical | Focus is lost to the document body, an unloaded virtual row, or a removed card after a move, filter, Undo, archive, conflict, or deletion | Deterministic focus-return tests pass for list, board, detail, dialogs, and virtualization; meet WCAG 2.4.3 and 2.4.11, and target 2.4.12 where practical |
| Critical | A workflow action clears, silently saves, overwrites, or strands an unsaved/conflicted note draft | Workflow and note state remain independent; navigation safety and recovery are verified before Process next or return |
| High | Visual status/count changes, partial batch results, conflicts, offline restrictions, and rollback are not announced | Pre-existing polite and assertive live regions deliver concise, non-duplicative messages; meet WCAG 4.1.3 |
| High | The desktop board/table is retained at mobile width or high zoom, causing clipped controls or two-dimensional scrolling | At 390 × 844 and 400% zoom, use Inbox/List or one-status-at-a-time layout with no loss of action or content; meet WCAG 1.4.4 and 1.4.10 |
| High | Status, selected state, pending, error, conflict, archive, matching counts, or metric meaning relies on color, tint, position, or icons | Every state has visible text and programmatic state; text and non-text contrast pass WCAG 1.4.3 and 1.4.11 |
| High | Menus, filter sheets, confirmation dialogs, or drawers trap focus, close without returning it, or expose background controls | Component keyboard/focus contracts and AT tests pass; meet WCAG 2.1.2, 2.4.3, and 4.1.2 |
| High | Virtualization removes focused content or misrepresents list length/order to assistive technology | Focused rows remain mounted; explicit Load more is available; list position/count are accurate and tested |

## Required experience invariants

1. Board and List are two representations of the same active query, not different capability sets.
2. Open, Move to, move backward, archive, restore, reprocess, Undo, select, and batch actions are available without drag in every view where they are relevant.
3. Workflow status, User tags, AI topics, and archive state are distinct in visible copy and programmatic structure.
4. Total Inbox metrics remain distinguishable from filtered matching counts in text, not merely position or styling.
5. A confirmed move never implies that notes were saved. Note draft, save, offline, recovery, and conflict states remain independent.
6. Mobile is task-equivalent rather than layout-identical. It does not need four simultaneous columns or drag.
7. Pending client state is not announced as success. Success language follows server confirmation.
8. New information does not move focus unless moving focus is necessary to preserve the user's place or complete an explicitly initiated navigation.

## Semantic structure and Board/List equivalence

### Page and navigation

- Provide one descriptive page `<h1>` such as `Processing`, followed by a short purpose statement. View labels such as Inbox, Board, List, and Archived are navigation/view controls, not competing page-level headings.
- Retain the app's navigation landmark and a visible-on-focus skip link targeting the Processing `<main>` region.
- Use a semantic tab pattern for `Inbox | Board | List | Archived` only if the panels behave as tabs on one page. Implement one active tab with `aria-selected="true"`, roving `tabindex`, Arrow Left/Right, Home, and End. If they change routes, use links with `aria-current="page"` instead of tab roles.
- A fresh Processing entry must identify the active surface and put programmatic focus at the page heading/main start after route navigation. Browser Back and contextual return should restore the prior source anchor instead.

### Inbox and List

- Represent results as a semantic list. Each source is one list item with a descriptive source-title link and separate native buttons/checkboxes for actions.
- Do not make the whole row a custom button when it also contains nested actions. The title may open detail; Move to, selection, and Archive remain distinct controls.
- The accessible name for repeated controls must include the source title when context is otherwise ambiguous, for example `Move “Designing calmer weekly reviews” to another status`.
- Preserve meaningful DOM order: source identity and status before secondary metadata, followed by actions. CSS must not visually reorder information away from the screen-reader order.
- A virtualized list must keep the focused row mounted. Prefer an explicit `Load more sources` button over focus-triggered or automatic infinite loading. Announce the number loaded and the new total available.

### Board

- Treat each column as a labeled region or section with a heading and count, and its cards as an ordered/unordered list. Example accessible name: `To Do, 8 matching sources`.
- Do not apply `role="grid"` or application mode merely to imitate a kanban board. Native regions, lists, links, and buttons are safer unless a complete, documented grid keyboard model is implemented and tested.
- DOM order should follow Inbox, To Do, In Progress, Done. At high zoom/mobile, expose one selected status at a time or switch to the list baseline; do not preserve four fixed columns through horizontal scrolling.
- Board and List must expose the same source status, actions, filtered membership, selection state, pending/error state, and server counts.
- A view switch must retain the same normalized query and best available source anchor. If the exact source is not loaded in the destination, focus the destination view heading and announce that the source is outside the loaded page.

## Drag and pointer alternatives

- Drag is progressive enhancement for cross-status moves only in phase one. It must not be required for moving, reordering, archiving, restoring, or accessing source detail.
- Every draggable source has a clearly discoverable `Move to…` button or menu. Arrow-only affordances in Direction A are insufficient unless accompanied by visible text or an unambiguous accessible name; the visible design should still make the alternative discoverable.
- If manual ordering is later introduced, provide a `Reorder` menu with `Move up`, `Move down`, `Move to top`, and `Move to bottom`. The same server command must power pointer and non-drag actions.
- Start drag only after deliberate movement beyond a threshold. Do not start on pointer-down. Complete on pointer-up and allow cancellation by Escape or by releasing outside a valid target, satisfying pointer cancellation.
- Do not make the entire card a drag handle. Provide a distinct handle that does not interfere with the title link, text selection, touch scrolling, or embedded controls.
- During drag, identify the source and valid destinations with text, not color alone. Announce pickup, destination, cancellation, confirmed move, and rollback only when they are meaningful; avoid narrating every pointer movement.
- A screen-reader user is not required to use a simulated keyboard drag mode. The ordinary Move to menu is the primary equivalent.

## Keyboard model

### Page-level order

The expected Tab sequence is: skip link → primary navigation → page heading/actions → view control → filters and active chips → results → batch toolbar when present → pagination/load more. DOM order must match this sequence; positive `tabindex` is prohibited.

Within each source, keep the order consistent: selection checkbox when shown → title/open link → Move to → Reorder when applicable → Archive/Restore when eligible → overflow menu. Avoid placing every metadata chip in the Tab sequence.

### Native key behavior

- Enter activates links and buttons; Space activates buttons and toggles checkboxes.
- `Move to…` is a button with `aria-haspopup="menu"` and accurate `aria-expanded`. Opening it moves focus to the selected/current option or first enabled option.
- Menu Arrow Up/Down changes the active option; Home/End jump; Enter/Space chooses; Escape closes without mutation and returns focus to the trigger. Tab may close the menu and continue in document order according to the chosen component library pattern.
- Destination options expose current state and disabled/invalid states programmatically. Do not remove the current status without explaining it; either mark it checked/disabled or label the menu with current status.
- Selection uses real checkboxes. Escape clears selection only when no menu, popover, sheet, dialog, or note editor owns Escape. Clearing selection is announced.
- Single-character global shortcuts are excluded. Any future shortcuts require modifiers or a user setting to disable/remap them.

### Focus after mutation

- While a move is pending, focus remains on the initiating control/card and the focused DOM node stays mounted.
- When a confirmed move removes a row from the current result, focus the next remaining row at the same visual index; if none, focus the previous row; if the result is empty, focus the empty-state heading.
- On a board move, focus the moved card in its confirmed destination when it is rendered. If it is outside the loaded destination page, focus the destination heading and announce the destination and position rule.
- A failed action restores the source to its confirmed place and returns focus to the equivalent Retry or Move to control.
- Undo that restores a source returns focus to the restored source when it matches the current query. Otherwise focus stays on Undo/status feedback and the message explains where the source is.
- Archive/restore, conflict refresh, AI-topic filter membership changes, and deletion use the same stable-next-focus rule. Focus never falls to `<body>`.
- `Process next` must first run the existing note navigation-safety check. After explicit navigation, focus the next source heading/title, not a toolbar or document body.

## Live announcements and status messages

Pre-render one empty polite region and one assertive alert region. Inject messages after these containers exist. Keep visual notices and spoken messages aligned.

Use the polite region for:

- `Moved “A practical guide to calm prioritization” to To Do. Inbox has 31 total.`
- `Undo complete. “A practical guide…” returned to Inbox.`
- `Filters updated. 5 matching sources in Inbox; 32 total.`
- `20 more sources loaded, 50 shown.`
- `Selection cleared.`
- `Archive complete. 14 sources archived. Undo available.`
- read-only loading completion and reconnection when no urgent action is required.

Use the assertive region for actionable failures only:

- `Move failed. The source remains in Inbox. Retry.`
- `Conflict. This source was moved to Done in another session.`
- `Connection lost after sending. Checking saved state.`
- `This source is no longer available. Focus moved to the next source.`
- `Partial result: 98 moved, 2 conflicted. The 2 sources remain selected.`

Rules:

- Coalesce count updates into the action message. Do not announce every metric, column count, card animation, and toast separately.
- Do not use assertive announcements for ordinary success, filter changes, or pagination.
- `Loading…` uses `role="status"`; initial-load failure uses a visible message and Retry. Never render zero counts while the true count is unknown.
- Pending text changes to `Still saving` after the documented delay. Unknown outcome changes to `Checking saved state`; Retry remains unavailable until reconciliation.

## Menus, popovers, dialogs, sheets, and drawers

### Menus and popovers

- Use native buttons and the established accessible menu primitive. Provide name, role, selected/checked state, expanded state, and deterministic focus return.
- Hover/focus help must be dismissible with Escape, hoverable, persistent, and not the only source of instructions.
- Filter selectors must have persistent visible labels (`User tags`, `AI topics`). Placeholder text such as `All` or `Any` is a value, not a label.

### Dialogs and mobile filter sheets

- Filter sheets and batch previews use a labeled dialog. Move focus to the heading or first meaningful control, contain focus while modal, provide a visible Close/Cancel button and Escape, and return focus to the trigger.
- A dialog's accessible name describes the task, such as `Filter Processing sources` or `Archive 14 eligible sources`.
- The background is inert and not exposed to screen readers while a modal is open. Sticky bottom navigation cannot remain focusable behind it.
- Mixed-eligibility batch archive needs a preview stating selected, eligible, ineligible, conflicted, and failed counts in text. Do not silently skip sources.
- The council evidence currently contains two batch contracts: per-source partial results in the power-user direction and all-or-nothing transactions in the architecture recommendation. Accessibility does not require one transaction model, but the prototype must choose one honestly: announce exact per-source outcome counts if partial, or announce that nothing changed if the atomic batch fails.

### Detail drawer

- Do not use an editable board drawer for notes in v1. Reuse the existing full item-detail route and its recovery model.
- If a read-only quick-preview drawer is prototyped, label it as a complementary or dialog surface according to modality, include a descriptive heading, make Close available first/last, and preserve the source trigger for focus return.
- A non-modal drawer must not obscure focused background content or create a DOM order that places its controls far from the visual drawer. A modal drawer must use the full dialog contract.

## Status, filters, counts, and metrics

- Display workflow status as text (`Inbox`, `To Do`, `In Progress`, `Done`). Color and column position are redundant cues only.
- Archived is a separate text badge/state. Do not present it as a fifth status or style Archive like Delete.
- Pending, saved, failed, conflict, offline, restored, and archived states each need visible text and programmatic state. A spinner, tint, dashed border, or icon alone is insufficient.
- Use separate fieldsets/groups for User tags and AI topics. Their labels and selected values must remain programmatically distinct.
- Active filter chips are buttons named, for example, `Remove User tag calm`. A bare `×` cannot be the accessible name. `Clear all filters` is explicit and reports the result count after activation.
- If filters update on selection, retain focus in the selector, update results without route-like context change, and announce one concise result summary. If the whole page navigates, provide an explicit Apply button.
- Distinguish `32 Inbox total` from `5 matching filters/results` in complete phrases. Avoid Direction B's potentially ambiguous `6 of 32` and Direction C's `Showing 37 of 37` unless the numerator and denominator are explicitly named.
- Customer-facing metrics use `Triaged`, not `Processed`, and include their period: `6 triaged today`, `18 completed this week`.
- Metrics are ordinary text/headings or a description list, not interactive cards unless activation reveals detail. The reading order must preserve label, value, unit, and timeframe.
- The Activity disclosure communicates timezone and week boundary in text. Metric change or urgency cannot rely on red/green, arrows, or animation. No streak/confetti/zero-inbox pressure pattern is permitted.
- Navigation badges cap visually at `99+` only when necessary, while the page exposes the exact count. The accessible name can say `Processing, 327 sources in Inbox`.

## Color, contrast, typography, and focus visibility

- Verify computed colors in both dark and light themes. Static screenshots are not contrast evidence.
- Normal text must reach 4.5:1; large text 3:1; meaningful icons, control borders, selected indicators, drag targets, chart/metric graphics, and focus indicators 3:1 against adjacent colors.
- Disabled controls are exempt from minimum contrast but still need to be perceivable. Prefer accompanying reason text such as `Move unavailable while offline` rather than relying on a dimmed button.
- The dark concept images use several muted metadata labels and thin borders that require measurement. Do not approve them by visual inspection.
- Focus uses a consistent, unobscured `:focus-visible` indicator with at least 3:1 contrast and enough offset to remain visible against cards, panels, menus, and selected rows.
- Selected row/card state needs more than the blue dot/outline shown in Direction B. Provide a checkbox/state label and `aria-checked`/native checked state where selection exists.
- Status badge colors in Direction C are acceptable only as redundant cues because the badge includes text. Verify each badge's text and boundary contrast in all states.
- Text must support user text-spacing overrides without clipping: line height 1.5, paragraph spacing 2× font size, letter spacing 0.12×, word spacing 0.16×.

## Zoom, reflow, and 390 × 844 mobile requirements

### Reflow

- At 200% text/browser zoom, no content or action is clipped, overlapped, or hidden.
- At 400% zoom on a 1280 CSS-pixel-wide viewport (approximately 320 CSS pixels), content reflows to one dimension without page-level horizontal scrolling. A kanban board or workflow table is not essential two-dimensional data and therefore does not qualify for a horizontal-scroll exception.
- Direction B's list/detail split becomes a single source list. Selecting a source opens the existing detail route or a full-width sequential panel; both panes must not remain side by side.
- Direction C's table becomes a card/grouped-list representation with the same labels and actions. Do not solve the table by shrinking text or hiding status/actions.
- Sticky headers, bottom navigation, action notices, and batch toolbars must not fully obscure the focused control. Apply safe-area padding and scroll margin.

### 390 × 844 target

- Default to Inbox list. Board is one status at a time with a labeled segmented control and matching counts.
- Keep the fixed app bottom navigation and place Undo/action notices and batch toolbar above it, including safe-area inset. They must not cover the last row or focused control.
- The mobile filter sheet exposes selected-filter count, visible labels, removable chips after close, Apply/Clear actions if needed, and proper dialog focus behavior.
- Every task remains available: move forward/backward, select, batch move, archive Done, restore to Done, reprocess to Inbox, Undo, retry, conflict resolution, open detail, return, and note safety.
- Do not require hover, swipe, long press, or drag. Optional gestures must duplicate visible controls.
- Test with screen magnification and large system text, not only a 390 × 844 screenshot at default text size.

## Touch targets and pointer safety

- Use 44 × 44 CSS pixel targets as the product minimum on mobile, exceeding the WCAG 2.2 AA 24 × 24 target minimum. Provide spacing so adjacent destructive and non-destructive actions cannot be hit accidentally.
- Expand the hit area of icon buttons without changing visual density. Tiny filter clears, chevrons, row checkboxes, drag handles, archive icons, and close icons in all three concepts need explicit target verification.
- Visible labels must be contained in accessible names so speech users can invoke `Move to`, `Archive`, `Clear`, `Process next`, and status choices.
- Activate on pointer-up/click, allow cancellation, and avoid destructive action placement directly beside common navigation actions.
- Archive is reversible and gets Undo. Delete remains separately named, located, and confirmed under the existing content-deletion safety rules.

## Reduced motion

- Respect `prefers-reduced-motion: reduce` and the existing zero-duration token behavior.
- With reduced motion, moves and rollbacks update in place without long-distance card travel, parallax, spring effects, shaking, pulsing, or celebratory animation.
- Motion must not be necessary to understand origin, destination, success, rollback, selection, or filter changes; the text/status message supplies meaning.
- Do not flash any content more than three times per second. Loading indicators must not pulse at a distracting rate.
- Preserve focus and reading position when motion is removed; disabling animation must not expose an intermediate layout state.

## Screen-reader requirements

- Establish a supported manual matrix before production: NVDA + Chrome on Windows, VoiceOver + Safari on macOS, VoiceOver + Safari on iOS at 390 × 844, and TalkBack + Chrome on Android at the supported mobile size.
- Confirm page language, landmark names, one page heading, view control semantics, column/list names, result count, source title, current workflow status, selected state, pending/offline/conflict state, and every action name.
- Screen-reader users must be able to discover and complete Move to without learning a drag metaphor.
- Avoid repetitive accessible names such as dozens of unlabeled `More`, `Arrow`, or `Archive` controls. Include source context when virtual cursor proximity is insufficient.
- Hidden panels, virtualized rows, collapsed details, and inert dialog backgrounds must not remain in the accessibility tree or Tab order.
- Do not over-announce routine focus movement. Instructions are concise and available on demand. Live messages identify the affected source and outcome once.
- When a list is paginated/virtualized, expose an accurate number currently shown and total matching count. Use `aria-setsize`/`aria-posinset` only if values remain truthful under filtering and concurrent updates; otherwise use native lists plus text counts and explicit Load more.

## Loading, empty, error, offline, conflict, Undo, and archive states

| State | Visible and programmatic requirement | Focus/recovery requirement |
|---|---|---|
| Initial loading | Stable shell and labeled skeletons; `Loading Processing sources` in a polite status; counts are unavailable, not zero | Keep focus on the initiating navigation/page heading; do not focus skeletons |
| Incremental loading | `Loading more Inbox sources` tied to the column/list | Keep focus on Load more; announce added count after completion |
| Empty state | Distinguish `No sources in Inbox` from `No sources match these filters` | Focus the empty-state heading after the last result is removed; offer Clear filters only for filtered empty |
| Initial error | `Processing could not load` plus native Retry; navigation remains usable | Focus error heading only after explicit navigation/load failure; Retry returns focus to restored content heading |
| Item mutation error | Plain error beside/associated with the source and assertive summary | Restore confirmed item and focus Retry/Move to; do not refresh unrelated items |
| Offline before action | Read/filter remains available; mutation controls are disabled and explain `Connection required` | Controls remain discoverable or reason text is associated; re-enable only after refresh |
| Connection lost after send | `Checking saved state`; no duplicate Retry yet | Preserve source focus until authoritative state resolves |
| Version conflict | State current confirmed destination and that another session changed it; offer `Try your move again` | Focus conflict action/message associated with that source; never overwrite silently |
| Partial batch | State succeeded, conflicted, failed, and ineligible counts; unsuccessful sources remain selected | Focus batch result heading/toolbar; Undo applies only to succeeded subset |
| Undo available | Persistent non-modal notice for at least the documented interval; timer is not the only recovery path for archive | Do not steal focus; Undo is keyboard/touch reachable and announced once |
| Undo conflict/expiry | Explain that current state changed or Undo expired; provide current safe actions | Keep focus in notice or return to the affected source action |
| Archived | Text badge and Archive scope; disclose that content remains in Library/search/Ask | Archive success moves focus to next logical Done source; Undo/restored source follows return rules |
| Restore | Default destination is Done; Reprocess is a separate action | Focus restored source in Done when rendered, otherwise Done heading |
| Deleted/inaccessible | Announce removal and reason without exposing sensitive details | Focus next source, previous source, or empty heading; no Retry if access is gone |
| AI topic changes filter membership | Announce one result-set update; do not call it a workflow move | Keep current focus stable unless the focused source is removed, then use stable-next rule |

## Notes safety requirements

- The full existing item-detail route remains the only editable notes surface in v1. The Direction B preview may show note presence and an `Open notes`/`Add note` route action, but it must not become a second editor with separate persistence.
- Workflow status, note draft, note save, indexing, offline journal, recovery, and conflict are separate state machines. A move can succeed while note save fails, and the UI must state both outcomes independently.
- `Done`, `Move to`, `Process next`, Back to Processing, and closing a preview never imply or trigger silent note submission beyond the existing documented editor behavior.
- Before Process next or navigation, run the existing note navigation-safety check. If a draft is dirty, offline, failed, or conflicted, preserve it and present the existing safe choices.
- A failed/undone workflow action cannot roll back note content. A note retry/conflict action cannot change workflow status.
- Workflow live messages and note live messages must not overwrite each other or announce contradictory `Saved` states. Use separately labeled visual regions and coordinate polite announcements.
- Returning from detail restores the Processing query and next source even when the original moved; note recovery remains available through the canonical item identity.

## Direction-specific prototype corrections

### Direction A — Workflow board-first

- Add a visible, labeled Move to action on every card; arrow icons alone do not establish destination or operation.
- Replace the drag-centric pending card as the primary demonstration with paired examples: Move to menu and optional drag, both reaching the same confirmed state.
- Label column counts as total or matching. The concept currently combines global filters, backlog metrics, and column numbers without proving the distinction.
- Remove or reconsider `Add capture` inside every status column; new capture must enter Inbox, and repeated controls add noise and ambiguous status semantics.
- Demonstrate one-status mobile mode and a no-drag path before this direction can proceed beyond comparison.

### Direction B — Processing Inbox-first

- Make the four destination tiles native buttons in a labeled `Move source` group. Communicate current state, pending state, and invalid choices programmatically.
- Replace ambiguous `Processed today` and `6 of 32` with `6 triaged today` and a separately named total/matching value.
- Do not use the small blue dots as the only selected/unread/priority cue. Define their meaning in text or remove them; selection must use a checkbox and programmatic checked state.
- Ensure `Process next 3` has a clear accessible name and visible meaning. If it means a batch size, expose a labeled selector; if it means the next three sources, state that explicitly.
- Ensure the `Next source` label identifies the actual next source. The concept appears to repeat the selected source title, which would make sequential navigation untrustworthy for visual and screen-reader users.
- Collapse the two-pane design at narrow widths/high zoom. Opening a source should use the canonical detail route on mobile.
- Change `Add note` in the preview to a route into the existing note editor unless the preview is deliberately read-only.

### Direction C — Queue/Library integrated

- Transform the desktop table to a card/grouped-list mobile representation. Do not require horizontal table scrolling at 390 × 844 or 400% zoom.
- Keep native table headers/scopes only at widths where the table remains usable. The inline expanded row must be programmatically associated with its source and expose a concise collapse control.
- Increase and measure touch targets for checkboxes, chevrons, status controls, Archive, Clear, and Metrics.
- Retain text inside colored status badges and verify contrast. Do not use the green auto-update dot without the adjacent `Auto-updates enabled` text.
- Avoid a duplicate notes editor in the expanded row. `View all notes` should enter the canonical detail route.
- Clarify the hierarchy between the Library `Queue` selector and `Browse | Queue`; two controls expressing the same mode risk redundant focus stops and inconsistent state.

## Accessibility acceptance scenarios

| ID | Scenario | Pass condition |
|---|---|---|
| A11Y-01 | Keyboard-only user enters Processing, filters by two User tags and one AI topic, moves the first Inbox source to To Do, and undoes it | No drag; visible focus throughout; one polite confirmation per action; source and counts restore correctly |
| A11Y-02 | Screen-reader user switches Inbox → Board → List with filters and selection active | View state, active view, selected count, matching counts, and best source anchor are announced and preserved |
| A11Y-03 | Keyboard user opens Move to, cancels, reopens, chooses In Progress, then moves backward to Inbox | Menu keys and Escape work; focus returns predictably; backward movement is available and announced |
| A11Y-04 | Pointer user starts a drag, cancels outside a target, then uses Move to instead | Cancellation makes no mutation; alternative is visible and reaches the identical result |
| A11Y-05 | Focused virtualized card moves to a destination page that is not loaded | Focus lands on the destination heading, does not disappear, and message states destination/position rule |
| A11Y-06 | The last filtered Inbox result moves out of Inbox while total Inbox remains nonzero | Focus moves to `No sources match these filters`; message retains the true total and offers Clear filters |
| A11Y-07 | A batch of 17 includes 14 archive-eligible Done sources | Preview states eligibility; partial outcome is explicit; unsuccessful sources stay selected; Undo targets only successes |
| A11Y-08 | Another tab changes a focused source before the user confirms a move | Stale move cannot overwrite; current state is announced; focus stays with a safe retry action |
| A11Y-09 | Network is lost after a status request is sent | `Checking saved state` is announced; no duplicate Retry appears until reconciliation; focus remains stable |
| A11Y-10 | Previously loaded Processing opens offline | Reading/filtering work; mutation controls explain why unavailable; no action is silently queued |
| A11Y-11 | User opens detail, creates an unsaved/offline/conflicted note, invokes Process next, and returns | Existing note safety blocks or safely resolves navigation; workflow never clears or falsely reports the note as saved |
| A11Y-12 | Archive, Undo, archive again after Undo expiry, restore, then Reprocess | Archive remains distinct from delete/status; durable restore returns to Done; Reprocess explicitly moves to Inbox |
| A11Y-13 | AI topic regeneration removes the focused source from a filtered result | Workflow state remains unchanged; one concise membership announcement; stable-next focus rule applies |
| A11Y-14 | Source is deleted or becomes inaccessible in another session | Alert explains removal; focus moves to next/previous/empty heading; no whole-view reset |
| A11Y-15 | Mobile 390 × 844 user performs five triage moves, a batch move, detail return, archive, restore, and Undo | All tasks work without drag/swipe/hover; 44px targets; bottom UI does not cover focus/content |
| A11Y-16 | Desktop viewport is tested at 200% and 400% zoom plus large text/text-spacing overrides | No content/action loss, clipping, overlap, or two-dimensional page scroll; board/table transform to linear equivalent |
| A11Y-17 | Reduced-motion user moves, rolls back, switches view, opens filter sheet, and uses Undo | No long-distance motion/flash; meaning and focus remain intact |
| A11Y-18 | NVDA, desktop VoiceOver, iOS VoiceOver, and Android TalkBack complete the primary triage path | Names, roles, values, order, announcements, dialogs, and focus transitions are coherent on every supported pairing |

## Interactive prototype verification checklist

### Structure and names

- [ ] One page heading, valid heading hierarchy, landmarks, page language, and skip link.
- [ ] Inbox/Board/List/Archived uses either a complete tab pattern or route-link pattern, not mixed semantics.
- [ ] Every icon-only control has a source-specific accessible name; visible label text is contained in the accessible name.
- [ ] Workflow status, archive, User tags, and AI topics are exposed as separate concepts.
- [ ] Lists/columns/table headers and expanded details have correct programmatic relationships.

### Keyboard, focus, and drag equivalence

- [ ] All primary and batch tasks complete from keyboard without drag.
- [ ] Move menu, filters, tabs, dialogs, sheet, preview/drawer, and Undo follow expected keys and Escape precedence.
- [ ] No positive `tabindex`, keyboard trap, hidden focus, or focus loss after render/virtualization.
- [ ] Focus return passes for move success/failure, Undo, archive/restore, filters, view switch, detail return, conflict, deletion, and empty state.
- [ ] Pointer drag cancels safely and produces the same server operation as Move to.

### Announcements and states

- [ ] Polite and assertive live regions exist before messages and do not duplicate visual toasts.
- [ ] Pending, still-saving, confirmed, failed, unknown, offline, conflict, partial batch, Undo, archived, restored, and deleted states are visible and announced appropriately.
- [ ] Total versus matching counts are explicit; loading unknown is never rendered as zero.
- [ ] Screen-reader output remains concise during filter/count/virtualization updates.

### Visual and responsive

- [ ] Dark and light theme text, metadata, status badges, borders, controls, and focus indicators pass measured contrast.
- [ ] Color/icons/motion are never the only state cue.
- [ ] 200% zoom, 400% reflow, text spacing, and large system text pass without content/action loss.
- [ ] 390 × 844 passes with one-dimensional layout, safe areas, visible focus, and no horizontal workflow scrolling.
- [ ] All mobile targets are at least 44 × 44 CSS pixels with safe spacing.
- [ ] Reduced motion removes non-essential transitions without changing outcome or focus.

### Assistive technology and trust

- [ ] NVDA/Chrome, VoiceOver/Safari desktop, VoiceOver/Safari mobile, and TalkBack/Chrome mobile complete the acceptance path.
- [ ] Virtualized list/column length, loaded count, and focus behavior are truthful.
- [ ] Workflow and note state remain independent across save, failure, offline, conflict, Process next, and return.
- [ ] Archive is explained as Processing-only and never confused with Delete.
- [ ] Automated accessibility checks run on every major state, followed by manual keyboard, zoom, screen-reader, touch, and reduced-motion testing.

## Council gate

Advance Direction B to interactive prototype review only when it demonstrates these five proof points:

1. The complete triage/archive/restore path works without drag on desktop and 390 × 844 mobile.
2. Focus remains deterministic through confirmed moves, virtualization, filters, detail return, Undo, failure, conflict, and deletion.
3. Total/matching counts and every asynchronous state are visible and announced without noise.
4. The split layout reflows to a single task surface at high zoom/mobile with 44px targets and no obscured focus.
5. Workflow actions cannot lose, overwrite, or falsely report the state of notes.

Until an interactive prototype passes those gates, this document should be treated as requirements and risk input, not a compliance verdict.
