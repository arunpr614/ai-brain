# Card Processing Workflow — Accessibility Review

**Council role:** Accessibility Specialist
**Date:** 2026-07-11
**Classification:** **Explored — not implemented**
**Review baseline:** WCAG 2.2 Level AA, with WCAG 2.1 AA criteria called out where they are the governing requirement
**Artifacts reviewed:** `product/prd-v1.md`, `ux/ux-ui-v1.md`, all three prototype entry points, `prototypes/src/App.jsx`, `prototypes/src/styles.css`, and the captured 1440×1024 / 390×844 screenshots
**Review limitation:** This is a code-, specification-, and screenshot-based final concept review. It is not evidence of production compliance. Manual NVDA, VoiceOver, TalkBack, 200%/400% zoom, text-spacing, switch-control, and touch-assistive-technology tests have not yet been run.

## Outcome

**Accessibility status: Fail — do not treat the prototype as an implementation-ready accessibility reference.**

Direction B remains the strongest product direction because its primary task is linear and every demonstrated drag move has a native, labeled `Move … to` select alternative. The prototype also uses visible status text, native controls, semantic headings/lists in Inbox and List, a pre-rendered polite live region, a strong visible focus color, a reduced-motion override, and distinct User tags / AI topics labels. Those strengths should be retained.

No P0 blocker was found: a keyboard user can reach a non-drag move control, open sources, and invoke archive/restore actions. Six P1 findings nevertheless prevent an accessibility pass. The most consequential failures are loss of focus after workflow mutations and an incomplete modal-dialog contract.

## Severity summary

| Priority | Skill severity | Count | Meaning in this review |
|---|---:|---:|---|
| P0 | 🔴 Critical | 0 | Complete task blocker for a disability group |
| P1 | 🟠 High | 6 | Major WCAG/product-contract failure; no-go before implementation approval |
| P2 | 🟡 Moderate | 5 | Task remains possible with notable friction or workaround |
| P3 | 🟢 Low | 0 | Best-practice issue with low task impact |
| **Total** |  | **11** |  |

---

### Finding 1: Item-detail dialog does not manage modal focus

**Priority / severity:** P1 — 🟠 High
**WCAG:** 2.1.1 Keyboard (A), 2.1.2 No Keyboard Trap (A), 2.4.3 Focus Order (A), 4.1.2 Name, Role, Value (A)

**What the issue is**

Opening item detail renders `role="dialog" aria-modal="true"`, but focus is not moved into it, Tab is not contained, Escape does not close it, the background is not made inert, and focus is not returned to the exact trigger on close. On mobile, the fixed bottom navigation remains in the DOM and focus order behind the declared modal. A keyboard or screen-reader user can therefore remain on or tab into controls that assistive technology has been told are unavailable.

**Where to find it**

- `prototypes/src/App.jsx:539-549` opens the dialog without recording the trigger.
- `prototypes/src/App.jsx:734-760` has no focus ref/effect, key handler, focus trap, or return-focus behavior.
- `prototypes/src/styles.css:207-233` changes only visual modality.
- `direction-b-detail-notes-desktop-1440x1024.png` confirms a visually modal surface over still-rendered background controls.

```jsx
<div className="dialog-backdrop" role="presentation" onMouseDown={...}>
  <section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
    <header><button onClick={onClose}>...Close</button></header>
```

**Recommended fix**

Use the existing production dialog primitive if it already supplies the full contract. Otherwise, store `document.activeElement` before opening, focus the Close button or title after mount, contain Tab/Shift+Tab, support Escape, make the application background inert while open, and restore focus to the originating source action. If the note draft is dirty, Escape/backdrop/Close must use the existing note navigation-safety decision before dismissing.

```jsx
<Dialog
  open={Boolean(detailCard)}
  onOpenChange={handleDialogChange}
  initialFocusRef={closeRef}
  returnFocusRef={detailTriggerRef}
  aria-labelledby="detail-title"
>
  <button ref={closeRef} type="button" onClick={requestSafeClose}>Close</button>
</Dialog>
```

**Why this happened & how to avoid it**

ARIA describes modality; it does not implement modality. Treat focus entry, containment, Escape, inert background, dirty-draft safety, and focus return as one indivisible dialog behavior, and test them together on desktop and mobile.

---

### Finding 2: Workflow mutations and Undo can drop focus to the document

**Priority / severity:** P1 — 🟠 High
**WCAG:** 2.4.3 Focus Order (A), 2.4.7 Focus Visible (AA), 4.1.3 Status Messages (AA)

**What the issue is**

Moving an Inbox source selects the next source in React state but never focuses it. The focused select/button can be unmounted when a row leaves Inbox or a board card changes columns; focus then falls to `<body>`. Archive, restore, Undo, empty-state transitions, and error recovery likewise update data without restoring a logical focus target. This directly contradicts the v1 focus contract in `ux/ux-ui-v1.md:374-383` and PRD `AC-27`.

**Where to find it**

- `prototypes/src/App.jsx:354-395` mutates cards and selection but has no DOM focus operation.
- `prototypes/src/App.jsx:335` declares `mainRef`; it is attached at line 419 but never used.
- `prototypes/src/App.jsx:482` makes main programmatically focusable, but no transition focuses it or a result heading.

```jsx
if (view === "inbox" && status !== "inbox") {
  const remaining = active.filter(...);
  setSelectedId(remaining[0]?.id ?? null);
}

function undo() {
  setCards(history.cards);
  setAnnouncement(`Undid action. ${history.action}`);
}
```

**Recommended fix**

Maintain refs keyed by source ID and status heading. After confirmed DOM reconciliation, focus the next source at the same index, else previous source, else the empty heading. A board move focuses the moved card in its destination or the destination heading. Undo focuses the restored source when it still matches; failures focus Retry/equivalent source action. Keep the focused source mounted while a server mutation is pending.

```jsx
useLayoutEffect(() => {
  if (!pendingFocusTarget) return;
  requestAnimationFrame(() => {
    sourceRefs.current.get(pendingFocusTarget.id)?.focus()
      ?? statusHeadingRefs.current.get(pendingFocusTarget.status)?.focus()
      ?? emptyHeadingRef.current?.focus();
  });
}, [cards, pendingFocusTarget]);
```

**Why this happened & how to avoid it**

Updating selection is not the same as moving keyboard focus. Any operation that removes or reparents the active element needs an explicit, tested post-mutation focus destination before the mutation is considered complete.

---

### Finding 3: Both tab interfaces expose incomplete ARIA tab behavior

**Priority / severity:** P1 — 🟠 High
**WCAG:** 2.1.1 Keyboard (A), 2.4.3 Focus Order (A), 4.1.2 Name, Role, Value (A)

**What the issue is**

The Processing view switcher and mobile board status switcher use `role="tablist"` / `role="tab"`, but every tab remains in the Tab sequence, Arrow Left/Right/Home/End are not implemented, and no tab has `aria-controls` pointing to a `role="tabpanel"`. Screen readers announce tabs while the keyboard behavior and relationships do not match that role.

**Where to find it**

```jsx
// App.jsx:600-604
<div className="view-tabs" role="tablist" aria-label="Processing views">
  <button role="tab" aria-selected={view === id} onClick={() => changeView(id)}>

// App.jsx:661-665
<div className="mobile-status-tabs" role="tablist" aria-label="Board status">
  <button role="tab" aria-selected={mobileStatus === status} ...>
```

**Recommended fix**

Either implement the WAI-ARIA tabs pattern completely—one tab at `tabIndex=0`, inactive tabs at `-1`, Arrow Left/Right, Home/End, stable tab IDs, `aria-controls`, and labeled tabpanels—or remove tab roles and use ordinary buttons/links with `aria-pressed`/`aria-current` as appropriate. Hidden mobile panels must remain absent from both Tab order and accessibility tree.

```jsx
<button
  id={`tab-${id}`}
  role="tab"
  tabIndex={view === id ? 0 : -1}
  aria-selected={view === id}
  aria-controls={`panel-${id}`}
  onKeyDown={handleTabKeyDown}
>
```

**Why this happened & how to avoid it**

Adding a tab role changes the interaction contract; native button behavior alone no longer suffices. Choose semantics after deciding the keyboard model, and test the component as a single widget rather than as four independent buttons.

---

### Finding 4: Result, loading, note, and Undo updates are not announced reliably or once

**Priority / severity:** P1 — 🟠 High
**WCAG:** 4.1.3 Status Messages (AA), 3.3.1 Error Identification (A)

**What the issue is**

User-tag and AI-topic changes directly update result content but do not update the pre-existing live region. The loading skeleton has an accessible label but no `role="status"` and no screen-reader text. Notes switch visually between “Saved” and “Unsaved draft,” but neither edit state nor save success is announced. The Undo toast is conditionally mounted already populated as `role="status"` while a second pre-rendered live region announces the same mutation, creating browser-dependent silence or duplicate speech.

**Where to find it**

- `prototypes/src/App.jsx:607-613` calls raw filter setters only.
- `prototypes/src/App.jsx:527-534` mounts a populated status and separately updates the persistent polite region.
- `prototypes/src/App.jsx:734-755` changes note state without the application announcement region.
- `prototypes/src/App.jsx:767-768` exposes only decorative skeletons and an `aria-label`.

```jsx
<select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
...
{history && <div className="undo-toast" role="status">...</div>}
<div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
```

**Recommended fix**

Pre-render exactly one empty polite region and one empty assertive region. Send one coalesced message per outcome through those regions: filtered matching plus total Inbox counts, loading/loading-complete, move/archive/restore/Undo, and note save state. Keep the visual Undo notice, but remove `role="status"` from it when the same message is sent through the persistent live region. Use assertive output only for an actionable failure/conflict.

```jsx
<div id="processing-status" className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
<div id="processing-alert" className="sr-only" role="alert" aria-atomic="true" />
// Later: “Filters updated. 2 matching sources in Inbox; 5 total.”
```

**Why this happened & how to avoid it**

Visual React state changes are not automatically spoken. Live-region containers must exist before their text changes, and one event should have one speaking owner; duplicating ARIA status roles across a toast and global region produces inconsistent output across assistive technologies.

---

### Finding 5: Core control boundaries fail non-text contrast

**Priority / severity:** P1 — 🟠 High
**WCAG:** 1.4.11 Non-text Contrast (AA)

**What the issue is**

The default 1px form/control boundary uses `--border: #2b3b52`. Its contrast is 1.27:1 against `--raised: #1b2a40` and 1.41:1 against `--surface: #162235`, below the required 3:1 for boundaries needed to identify controls. `--border-strong: #52647c` is 2.94:1 against `--bg: #101825`, also just below 3:1. Text contrast and the accent focus ring are strong; the failure is specifically the default outline/boundary that identifies selects, buttons, cards with actions, and the notes editor.

**Where to find it**

- Tokens: `prototypes/src/styles.css:4-13`.
- Focus rule: line 31 (passes visually with `--accent`).
- Control boundaries: lines 41, 65, 68, 70, 93-95, 124, 135-138, 161, 204-231.
- All reviewed desktop/mobile screenshots show the same low-contrast thin boundary system.

```css
--surface: #162235;
--raised: #1b2a40;
--border: #2b3b52;
--border-strong: #52647c;
```

**Recommended fix**

Introduce a measured control-boundary token that reaches at least 3:1 against every adjacent background where the boundary is necessary, and verify default, hover, focus, selected, disabled, and error states in dark and future light themes. Do not simply brighten all decorative dividers; scope the stronger token to interactive component boundaries.

```css
:root { --control-border: /* measured value >= 3:1 on surface and raised */; }
select, textarea, .secondary-button, .card-actions button { border-color: var(--control-border); }
```

**Why this happened & how to avoid it**

Dark-theme borders often look visible to a fully sighted reviewer while remaining below the non-text threshold. Record contrast pairs as token tests, not screenshot judgments, and distinguish decorative separators from boundaries required to perceive a control.

---

### Finding 6: Mobile controls miss the product target and the bottom bar covers content

**Priority / severity:** P1 — 🟠 High
**WCAG:** 1.4.10 Reflow (AA), 2.4.12 Focus Not Obscured — Minimum (WCAG 2.2 AA), 2.5.8 Target Size — Minimum (WCAG 2.2 AA); product requirement: 44×44 CSS pixels

**What the issue is**

The PRD sets a 44×44 mobile minimum, but source actions and Move selects are explicitly 36px high on mobile; Close, dialog workflow actions, and note Save are 36–40px in several states. The fixed 64px mobile navigation has no `scroll-padding-bottom`/per-control `scroll-margin-bottom`. In all three 390×844 screenshots, the first result/list area is visibly under the bottom bar; Direction B shows the first source title/row continuing beneath it. This can hide a focused nested action because the browser may consider its parent row already in view.

**Where to find it**

- `prototypes/src/styles.css:161-164` sets source actions to 34px.
- `prototypes/src/styles.css:301` raises them only to 36px on mobile.
- `prototypes/src/styles.css:209-231` keeps dialog controls at 36–40px.
- `prototypes/src/styles.css:328-340` fixes notices/nav and dialog geometry without scroll-padding.
- Screenshot evidence: `direction-a-board-mobile-390x844.png`, `direction-b-inbox-mobile-390x844.png`, `direction-c-list-mobile-390x844.png`.

```css
.card-actions button, .card-actions select { min-height: 36px; }
.mobile-nav { position: fixed; inset: auto 0 0; height: 64px; }
```

**Recommended fix**

Meet the documented 44×44 product target for every mobile action, including Close and inline source controls. Reserve bottom space using the actual nav plus safe-area height, set `scroll-padding-bottom`, add `scroll-margin-bottom` for focusable result actions, and test Tab/Switch Control/VoiceOver rotor navigation to the last action at 320 and 390 CSS pixels plus 200%/400% zoom.

```css
@media (max-width: 767px) {
  :where(button, select, [href]) { min-block-size: 44px; }
  html { scroll-padding-bottom: calc(80px + env(safe-area-inset-bottom)); }
  .view-stage :focus { scroll-margin-bottom: calc(80px + env(safe-area-inset-bottom)); }
}
```

**Why this happened & how to avoid it**

Adding body padding prevents the last row from being permanently unreachable, but it does not guarantee that browser focus scrolling clears a fixed overlay. Test focused descendants, not only static page screenshots, and treat the fixed-bar clearance plus target size as part of the component contract.

---

### Finding 7: There is no bypass link for repeated application navigation

**Priority / severity:** P2 — 🟡 Moderate
**WCAG:** 2.4.1 Bypass Blocks (A)

**What the issue is**

Every direction places repeated sidebar/header controls before Processing content, but no visible-on-focus “Skip to Processing content” link exists. A keyboard user must traverse navigation, Search, Capture, the review-state selector, metrics/view controls, and filters before returning to results on every page load.

**Where to find it**

- `prototypes/index.html` and all `direction-*.html` bodies contain only `#root`.
- `prototypes/src/App.jsx:416-482` renders sidebar and header before `<main>`.

**Recommended fix**

Render a skip link as the first focusable element and give the Processing main region a stable ID and programmatic focus target. Make the link visible when focused.

```jsx
<a className="skip-link" href="#processing-main">Skip to Processing content</a>
<main id="processing-main" className="view-stage" tabIndex={-1}>...</main>
```

**Why this happened & how to avoid it**

Landmarks help screen-reader navigation but do not replace a keyboard bypass mechanism. Include the skip link in the application shell template so new feature sections inherit it automatically.

---

### Finding 8: Board cards are not exposed as a list within each labeled column

**Priority / severity:** P2 — 🟡 Moderate
**WCAG:** 1.3.1 Info and Relationships (A)

**What the issue is**

Column headings and matching counts are textually clear, but each card collection is a generic `<div>` containing `<article>` elements. Screen readers do not receive list length or item position, and the implementation misses the explicit UX/PRD contract that board cards remain list items rather than an ARIA grid.

**Where to find it**

```jsx
// App.jsx:665-685
<section aria-labelledby={`column-${status}`}>
  <header><h2 ...>{LABEL[status]}</h2><span>{counts[status]} matching</span></header>
  <div className="column-list">
    ... <article className="board-card">...</article>
  </div>
</section>
```

**Recommended fix**

Keep each column as a native labeled section and use `<ul>` / `<li>` for its cards. Preserve Inbox → To Do → In Progress → Done DOM order. Do not introduce `role="grid"` unless a complete grid keyboard model is separately justified and tested.

```jsx
<section aria-labelledby={`column-${status}`}>
  <h2 id={`column-${status}`}>{LABEL[status]}, {counts[status]} matching</h2>
  <ul className="column-list">
    {columnCards.map(card => <li key={card.id}><WorkflowCard card={card} /></li>)}
  </ul>
</section>
```

**Why this happened & how to avoid it**

Visual card repetition does not create a programmatic collection. Prefer native list semantics for repeated work items so assistive technology can communicate set size and position without complex ARIA.

---

### Finding 9: Repeated actions lack source context in their accessible names

**Priority / severity:** P2 — 🟡 Moderate
**WCAG:** 2.4.6 Headings and Labels (AA), 2.5.3 Label in Name (A)

**What the issue is**

The Move select is well named (`Move {title} to`), but repeated `Open`, `Archive`, `Restore to Done`, and `Reprocess to Inbox` buttons expose only their visible generic text. In a screen-reader buttons list or voice-control disambiguation view, users hear many identical controls without the associated source. This is especially noisy in Direction A's four columns and Direction C's dense list.

**Where to find it**

- `prototypes/src/App.jsx:719` renders repeated archive-view actions.
- `prototypes/src/App.jsx:724-730` renders repeated `Open` and `Archive` controls.

```jsx
<button onClick={() => setDetailId(card.id)}>Open</button>
<button onClick={() => archiveCard(card.id)}>Archive</button>
```

**Recommended fix**

Include the visible action text at the start of each accessible name, followed by the source title. This preserves Label in Name for speech control.

```jsx
<button aria-label={`Open ${card.title}`} ...>Open</button>
<button aria-label={`Archive ${card.title} from Processing`} ...>Archive</button>
```

**Why this happened & how to avoid it**

Visual proximity supplies context that a global buttons list does not. Review repeated controls outside their card/row context and require a stable “action + source” naming convention.

---

### Finding 10: Offline restrictions are disabled without control-level explanation

**Priority / severity:** P2 — 🟡 Moderate
**WCAG:** 3.3.2 Labels or Instructions (A), 4.1.2 Name, Role, Value (A)

**What the issue is**

The persistent offline banner is useful and carries `role="status"`, but every Move, Archive, Restore, and Reprocess control becomes natively disabled without `aria-describedby` or nearby reason text. Disabled controls leave the Tab sequence, so a keyboard/screen-reader user who enters after the transient status announcement may not discover which actions exist or why they are unavailable. The implemented prototype also leaves `Process next 3` enabled while workflow writes are described as connection-required.

**Where to find it**

- `prototypes/src/App.jsx:425-429` supplies the global banner.
- `prototypes/src/App.jsx:654, 677, 719, 728-729, 754` disables individual mutation controls without association.
- `prototypes/src/App.jsx:450-457` does not disable `Process next 3` offline.

**Recommended fix**

Give the banner a stable ID and associate every unavailable mutation group/control with it. If native `disabled` would make discovery inadequate, keep an explanatory group description adjacent and expose enabled read-only actions separately. Apply offline policy consistently to `Process next` and note navigation safety.

```jsx
<p id="offline-write-reason">Connection required to move or archive sources.</p>
<select disabled={offline} aria-describedby={offline ? "offline-write-reason" : undefined}>...</select>
```

**Why this happened & how to avoid it**

A global alert announces a state change but does not necessarily explain each unavailable control later. Treat disabled state and disabled reason as paired information, and verify offline behavior by navigating from the top with a screen reader after the banner has already appeared.

---

### Finding 11: The visible and spoken result summary uses conflicting scopes

**Priority / severity:** P2 — 🟡 Moderate
**WCAG:** 1.3.1 Info and Relationships (A), 3.3.2 Labels or Instructions (A)

**What the issue is**

The filter summary receives `filtered.length`, which spans all workflow statuses (and can include archived matches), but labels the adjacent denominator as total Inbox. Direction B visibly says `Showing 12 matching · 5 total in Inbox` while the Inbox section says `5 matching`. A screen-reader user cannot infer whether 12 means active workflow results, all cards, or Inbox results. This violates the PRD requirement that matching and total Inbox counts cannot be confused.

**Where to find it**

- `prototypes/src/App.jsx:341-348` computes `filtered`, `active`, status counts, and `inboxTotal` with different scopes.
- `prototypes/src/App.jsx:472-480` passes `filtered.length` as `matching` in every view.
- `prototypes/src/App.jsx:607-613` labels it only “Showing {matching} matching”.
- Screenshot evidence: every normal desktop/mobile capture shows `12 matching · 5 total in Inbox` while the active surface has another count.

**Recommended fix**

Calculate and announce a view-scoped matching count, then name both scopes completely. For example: `5 sources match in Inbox; 5 total sources in Inbox` or, in Board/List, `11 active sources match across all statuses; 5 sources remain in Inbox`. Archived uses an archived matching count and retains the separate Inbox health metric only when useful.

```jsx
<p role="status">
  {viewMatching} {viewLabel} sources match; {inboxTotal} total sources in Inbox.
</p>
```

**Why this happened & how to avoid it**

Counts were reused across surfaces without carrying their query scope. Treat every displayed count as a typed value—scope, filters, lifecycle, and freshness—and include those qualifiers in both visible and spoken text.

## Desktop, mobile, keyboard, and screen-reader behavior

| Area | Current prototype behavior | Required behavior before implementation |
|---|---|---|
| Desktop keyboard | Native links/buttons/selects are reachable and focus has a high-contrast outline. Moving an Inbox source can unmount the active control; modal focus can remain behind the dialog. | Complete core flow from skip link through move/archive/restore/Undo with deterministic focus and no background modal focus. |
| Mobile keyboard / switch access | One-status board and list reflow avoid a four-column horizontal board. Inline controls are 36px and result content sits beneath the fixed nav in 390×844 captures. | 44×44 product targets, bottom-bar clearance for every focused action, one-status board parity, and successful 320/390px + zoom tests. |
| Screen-reader reading | Page language, main headings, status text, native lists in Inbox/List, native Move selects, and visible User tags/AI topics labels are present. Board card sets lack list semantics; repeated actions lack source context. | Announce page/view/result scope, list/column size, source title/current status, and action + source names without forcing a drag metaphor. |
| Screen-reader updates | A persistent polite region exists and move/archive messages include Undo availability. Filters, loading, notes, and some state transitions bypass it; the Undo toast can duplicate it. | One pre-existing polite region + one alert region, one concise message per outcome, with exact source and count scopes. |
| Drag alternative | Every card/row has a native `Move {title} to` select. Mobile does not require drag. | Retain this as the primary command; do not enable production drag until pointer cancellation, Escape/cancel, AT announcements, reduced motion, and virtualization focus pass. |
| Dialog/detail | Dialog has an accessible name and visible Close button. | Initial focus, containment, Escape, inert background, exact return focus, and dirty-note safety. |
| Motion | Only an 80ms opacity transition is present; `prefers-reduced-motion` sets transitions/animations to 0ms. No flashing was observed. | Retain override and verify focus/announcement still communicates move/rollback without travel animation. |
| Contrast | Text and focus accent pass by token calculation; status text is redundant with color. | Raise required control-boundary contrast to ≥3:1 and verify all states/themes. |

## No-go gates

This explored concept must not be represented as accessibility-approved or advance to production implementation review until all of the following are true:

1. **All P1 findings are closed** with code evidence and repeatable tests.
2. **Modal gate:** keyboard-only open/close, Tab/Shift+Tab containment, Escape, inert background, dirty-note safety, and exact trigger focus return pass on desktop and mobile.
3. **Mutation-focus gate:** move forward/backward, archive, restore, reprocess, Undo, error rollback, conflict, deleted source, filtered removal, empty result, and virtualized load preserve or intentionally transfer focus; focus never falls to `<body>`.
4. **No-drag gate:** every task completes by native keyboard and single-tap/click controls; production drag stays off until cancellation, reduced motion, screen-reader output, and virtualized destination focus are verified.
5. **Status-message gate:** filters, loading, success, Undo, notes, offline, failure, conflict, partial/atomic batch outcome, and count changes produce one correct visible/spoken message with no duplication.
6. **Responsive gate:** 390×844 and 320 CSS-pixel widths plus 200% and 400% zoom have no lost action, two-dimensional page scroll, fixed-bar obstruction, or target below the 44×44 product minimum.
7. **Contrast gate:** automated token checks and manual review confirm 4.5:1 normal text, 3:1 large text, and 3:1 meaningful non-text/control/focus boundaries in every enabled state and supported theme.
8. **Assistive-technology gate:** complete the core workflow with NVDA + Chrome (Windows), VoiceOver + Safari (macOS), VoiceOver + Safari (iOS at 390×844), and TalkBack + Chrome (Android), including the error/offline/Undo/dialog paths.
9. **Semantic gate:** a visible-on-focus skip link, complete view-switch semantics, list semantics in every board column, contextual repeated action names, and accurate scoped counts pass accessibility-tree inspection.

## Summary

| Severity | Count |
|---|---:|
| 🔴 Critical / P0 | 0 |
| 🟠 High / P1 | 6 |
| 🟡 Moderate / P2 | 5 |
| 🟢 Low / P3 | 0 |
| **Total** | **11** |

**WCAG 2.2 AA concept status:** **Fail**

**Top priority fixes before any implementation approval:**

1. Implement the full dialog/focus/dirty-note contract.
2. Implement deterministic post-mutation, error, empty, and Undo focus.
3. Complete or remove ARIA tab semantics.
4. Consolidate all dynamic output into pre-existing, non-duplicative status/alert regions.
5. Raise required control-boundary contrast to 3:1.
6. Meet 44×44 mobile targets and prove fixed navigation never obscures content or focus.

**What is done well**

- The primary Move alternative is native, discoverable, source-specific, and does not require drag.
- Workflow status, archive state, User tags, and AI topics are textually distinct rather than color-only.
- The prototype preserves real headings, native controls, Inbox/List list semantics, strong focus color, and a reduced-motion override.
- Direction B's linear Inbox-first model remains the safest accessibility baseline once the P1 implementation gaps are closed.

---

## Post-fix static disposition — 2026-07-11

**Scope:** Independent static re-review of current `prototypes/src/App.jsx`, `prototypes/src/styles.css`, `prototypes/item-detail.html`, `prototypes/design-qa.md`, `product/prd-v2.md`, and `ux/ux-ui-v2.md`. The original findings above are preserved as the record of the first pass.

**Disposition language:**

- **Fixed** — the original static defect is no longer present in the current prototype source.
- **Scope-resolved** — v2 removed the problematic interaction from the selected prototype and replaced it with a safer model; production behavior still follows the v2 implementation gates.
- **Still manual-gated** — meaningful static remediation exists, but source inspection cannot prove the required keyboard, assistive-technology, zoom, or focus behavior. Any residual static caveat is stated explicitly.

### Original finding map

| Original finding | Priority | Post-fix disposition | Current evidence and remaining gate |
|---|---:|---|---|
| 1. Item-detail dialog does not manage modal focus | P1 | **Scope-resolved** | `openDetail` now navigates to `item-detail.html` (`App.jsx:546-548`); `ItemDetailPage` is a full route with its own `main`, skip link, note state, unload guard, and Processing return URL (`App.jsx:218-282`). No detail dialog is rendered. The old `.dialog-*` CSS is dead styling only. The prototype's unsaved-note overlay uses `role="alert"` plus `autoFocus`, not a complete production dialog primitive; production must reuse the existing Save / Discard / Keep editing component with Escape, containment/inertness where modal, exact focus return, and a tested discard bypass for the `beforeunload` guard. |
| 2. Workflow mutations and Undo can drop focus to the document | P1 | **Still manual-gated** | Source refs and `pendingFocusTarget` are implemented (`App.jsx:409-426`); move, archive, restore/reprocess, and Undo choose a logical target (`App.jsx:451-498`); route return carries view/source focus (`App.jsx:229`, `394-421`). Static caveat: terminal fallbacks use `__main__`, not the empty/status heading required by UX v2, and production virtualization/deleted/filter-removal behavior is specification-only. Manual active-element traces remain required for next/previous/empty, destination, Retry/conflict, Undo, route return, and virtualized cases. |
| 3. Both tab interfaces expose incomplete ARIA tab behavior | P1 | **Fixed** | Processing views and mobile Board statuses are ordinary native buttons with `aria-pressed`; `role="tablist"`, `role="tab"`, and false tabpanel promises were removed (`App.jsx:739-743`, `800-804`). Native Tab/Enter/Space behavior now matches the declared semantics. |
| 4. Result, loading, note, and Undo updates are not announced reliably or once | P1 | **Still manual-gated** | Filter changes now generate scoped messages (`App.jsx:506-525`); move/archive/restore/Undo use the persistent polite region; the visual Undo toast no longer owns a second status role (`App.jsx:451-498`, `677-684`); note dirty/save updates use the route's persistent polite region (`App.jsx:249-278`). Static caveats remain: `LoadingState` still has only an `aria-label`, not visible/screen-reader `role="status"` text (`App.jsx:877-878`), and actionable failures are conditionally mounted `role="alert"` sections rather than a pre-existing alert region (`App.jsx:881-890`). Real NVDA/VoiceOver/TalkBack testing must prove one announcement per outcome, no initial-load silence, and no duplicate speech. |
| 5. Core control boundaries fail non-text contrast | P1 | **Fixed** | `--control-border: #7186a2` is scoped to interactive boundaries (`styles.css:9`, `72`). Independent token calculation confirms 4.78:1 on `#101825`, 4.29:1 on `#162235`, and 3.88:1 on `#1b2a40`, all above 3:1. Supported production themes and every state remain a release test, but the original dark-prototype static failure is closed. |
| 6. Mobile controls miss the product target and the bottom bar covers content | P1 | **Still manual-gated** | Mobile native buttons/selects are forced to at least 44px; card actions are 44px; the document reserves 84px plus safe area through `scroll-padding-bottom` and focused Processing controls use matching `scroll-margin-bottom` (`styles.css:294`, `331-333`). The fixed nav is 64px and route content has bottom clearance (`styles.css:361-370`). This closes the source-level target-size defect, but the 390×844 capture still shows ordinary result content passing behind the fixed bar at the initial scroll position. Keyboard/switch focus, last-action clearance, 320px reflow, text spacing, and 200%/400% zoom remain manual no-go tests. |
| 7. There is no bypass link for repeated application navigation | P2 | **Fixed** | A visible-on-focus skip link is the first focusable child of Processing and item detail and targets their real `main` IDs (`App.jsx:256`, `554`, `624`; `styles.css:34-35`). |
| 8. Board cards are not exposed as a list within each labeled column | P2 | **Fixed** | Every labeled Board column now contains a native `ul`; each source and empty entry is an `li` (`App.jsx:804-825`; `styles.css:111`, `157`). No ARIA grid was introduced. |
| 9. Repeated actions lack source context in their accessible names | P2 | **Fixed** | List and archive Open, CardActions Open/Archive, Restore, Reprocess, quick-preview full source, and notes actions include visible action text plus source title (`App.jsx:787`, `791`, `842`, `858`, `866-868`). This also preserves Label in Name for speech input. |
| 10. Offline restrictions are disabled without control-level explanation | P2 | **Fixed** | The persistent offline explanation has stable ID `offline-write-reason` and status semantics; mutation controls reference it, including Process next, decision buttons, Move, Archive, Restore, and Reprocess (`App.jsx:562-566`, `589`, `793`, `858`, `867-868`). Process next is disabled offline. Manual AT review must still verify that the global explanation remains discoverable after native disabled controls leave the Tab order. |
| 11. The visible and spoken result summary uses conflicting scopes | P2 | **Fixed** | `viewMatching` and `viewScope` now distinguish Inbox, active Board/List, and Archived; loading/error show unavailable; `FilterBar` renders complete typed phrases (`App.jsx:440-445`, `609-622`, `746-752`). The current Direction B capture reflects the fix. `direction-c-list-mobile-390x844.png` still shows pre-fix `Process next 3` / `12 matching` copy and should be treated as stale evidence or recaptured before a visual package is approved. |

### Requested verification checklist

| Check | Static disposition |
|---|---|
| Visible-on-focus skip link | **Fixed.** Present for Processing and route detail with valid targets. |
| No modal item detail | **Scope-resolved.** Full route replaces the v1 detail modal; only unused legacy dialog CSS remains. |
| Note protection | **Scope-resolved with production gate.** Route has in-product Keep editing / Discard plus `beforeunload`; production must use the canonical note guard and verify Discard does not trigger a second native unload prompt from stale React state. |
| Post-mutation and return focus | **Still manual-gated.** Refs, return query, and focus scheduling exist; empty/status-heading fallback and all virtualized/removed-item traces are not statically complete. |
| Pressed-button view/status semantics | **Fixed.** Native buttons + `aria-pressed`; no incomplete tabs pattern. |
| Live regions | **Still manual-gated.** Persistent polite regions and non-duplicating toast are present; loading status and pre-existing assertive-region ownership need completion/AT proof. |
| Control-border contrast token | **Fixed for the dark prototype.** Independently measured at 3.88:1 minimum. |
| 44px mobile targets / fixed-nav clearance | **Still manual-gated.** Static CSS is present; zoom, switch input, focus scrolling, and supported mobile viewport evidence remain required. |
| Board/list semantics | **Fixed.** Native lists are present. |
| Contextual repeated names | **Fixed.** Action + source naming is present. |
| Offline descriptions | **Fixed statically.** Stable description ID and associations are present; discoverability remains part of manual AT testing. |
| Typed counts | **Fixed in current source.** One stale Direction C screenshot must not be used as current evidence. |

### Post-fix disposition summary

| Disposition | Count |
|---|---:|
| Fixed | 7 |
| Scope-resolved | 1 |
| Still manual-gated | 3 |
| **Original findings mapped** | **11** |

The v2 artifacts correctly retain **Explored — not implemented** and preserve manual accessibility as a no-go gate (`PRD v2` §14 and acceptance criterion 17; `UX/UI v2` §11). This post-fix static pass materially improves the prototype's accessibility posture but **does not change the original compliance status into a WCAG pass**. Before implementation authorization, the team must still complete the recorded keyboard-only, NVDA, VoiceOver, TalkBack, switch-control, 320px/390×844, text-spacing, 200%/400% zoom, high-contrast, and virtualized-focus matrix.
