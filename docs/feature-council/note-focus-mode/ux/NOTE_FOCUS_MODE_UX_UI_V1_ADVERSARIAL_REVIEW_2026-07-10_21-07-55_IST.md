# Note Focus Mode UX/UI v1 - Adversarial Review

**Created:** 2026-07-10 21:07:55 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `PROJECT/docs/feature-council/note-focus-mode/ux/ux-ui-v1.md`
**Report path:** `PROJECT/docs/feature-council/note-focus-mode/ux/NOTE_FOCUS_MODE_UX_UI_V1_ADVERSARIAL_REVIEW_2026-07-10_21-07-55_IST.md`

## Executive Verdict

**NO-GO for treating UX/UI v1 as implementation-ready.** The selected direction is defensible, but the UX contract still leaves high-risk behavior to implementation discovery in exactly the areas most likely to invalidate the feature: modal semantics, single-DOM responsive composition, nested Escape/IME arbitration, 320px/400% reflow, mobile keyboard geometry, session-expiry recovery, and proof of native state continuity.

There are no P0 defects in the design direction itself. There are **seven P1 gaps** that must be resolved in UX/UI v2 before implementation is allowed to claim conformance. A screenshot-perfect overlay could still remount the editor, strand keyboard or screen-reader users, cover the final editing line, or present a non-actionable “safe” state. UX/UI v1's current validation wording would not reliably catch those failures.

## Evidence Inspected

- Objective and artifact map: `PROJECT/docs/feature-council/note-focus-mode/README.md`
- Discovery report: `PROJECT/docs/feature-council/note-focus-mode/discovery.md`
- Current-run screenshots:
  - `PROJECT/docs/feature-council/note-focus-mode/discovery/current-desktop-notes-2026-07-10.png`
  - `PROJECT/docs/feature-council/note-focus-mode/discovery/current-mobile-notes-390x844-2026-07-10.png`
  - `PROJECT/docs/feature-council/note-focus-mode/discovery/current-reading-focus-mode-2026-07-10.png`
- Product council: `PROJECT/docs/feature-council/note-focus-mode/council/product-council.md`
- UX council: `PROJECT/docs/feature-council/note-focus-mode/council/ux-direction.md`
- Technical council: `PROJECT/docs/feature-council/note-focus-mode/council/technical-architecture.md`
- PRD v1: `PROJECT/docs/feature-council/note-focus-mode/prd/prd-v1.md`
- Technical plan v1: `PROJECT/docs/feature-council/note-focus-mode/technical/technical-plan-v1.md`
- Current implementation:
  - `PROJECT/src/components/manual-note-editor.tsx`
  - `PROJECT/src/components/item-companion-tabs.tsx`
  - `PROJECT/src/components/sidebar.tsx`
  - `PROJECT/src/components/command-palette.tsx`
  - `PROJECT/src/app/items/[id]/page.tsx`
  - `PROJECT/src/styles/tokens.css`
  - `PROJECT/src/app/globals.css`
- Adversarial-review skill and report template.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found in the UX direction itself. The current implementation still violates the future single-editor prerequisite, but UX/UI v1 explicitly identifies that prerequisite rather than claiming it already exists.

### P1 - High Risk

#### 1. The accessibility model is internally contradictory: application mode versus modal dialog

**Evidence:** UX/UI v1 mandates `role="dialog"` and `aria-modal="true"` at `PROJECT/docs/feature-council/note-focus-mode/ux/ux-ui-v1.md:153-163`. The technical council agrees at `.../council/technical-architecture.md:224-229`. The product council explicitly says the opposite: “application region/page state, not an aria-modal dialog” at `.../council/product-council.md:221`. The product council also rejects a conventional modal because nested consent/conflict/delete layers are risky (`.../council/product-council.md:55`).

**Why it matters:** Screen-reader announcement, focus containment, browser history behavior, nested layer semantics, Escape order, and test expectations all change depending on which model is authoritative. `aria-modal=true` is not decorative metadata; it asserts that content outside is unavailable and may change how assistive technology scopes navigation.

**Failure mode:** Engineering implements an in-place page state with inert background but no modal semantics, while QA expects a dialog announcement; or engineering applies `aria-modal` while leaving inline `role=dialog` consent/delete regions inside it, producing confusing nested dialog announcements and unreliable focus behavior. Both implementations could look identical in screenshots.

**Recommendation:** UX/UI v2 must record one explicit semantic decision and reconcile all council documents. If modal semantics are retained, state clearly that this is an in-place modal **semantic surface**, not a portalled/duplicated modal, and specify nested-layer behavior. If application/page semantics are selected, remove `aria-modal`, define the landmark/heading announcement, and prove inert/focus containment without relying on dialog behavior. Do not leave this to implementation preference.

#### 2. The 11-control toolbar plus two sticky chrome regions is not visually feasible at 320px and 400% zoom as currently specified

**Evidence:** UX/UI v1 says the top row may wrap at 200%/400% (`ux-ui-v1.md:56-62`), the toolbar may wrap (`:66-70`), the bottom action row is sticky (`:72-77`), and mobile may simply wrap all 11 controls without an overflow pattern (`:87-96`). The current 390px discovery screenshot already uses two toolbar rows; the 320px implementation evidence inspected during council work uses three rows. At 400% zoom, a nominal 1440px desktop viewport provides roughly 360 CSS pixels while retaining the wrapped header, toolbar, status/action row, and text editor.

**Why it matters:** The specification promises that Exit, Save, and the current editing line remain reachable at 200% and 400% (`ux-ui-v1.md:161,185-186`) but does not allocate a minimum editor viewport or decide which chrome stops being sticky. A technically “reflowed” layout can leave almost no writing area.

**Failure mode:** At 320px or 400% zoom, the top bar consumes two or more rows, the toolbar consumes three to six rows, and the bottom status bar consumes another row. The textarea is reduced to a sliver or its last line sits beneath fixed chrome. Every control is present, yet Focus Mode becomes worse than normal Notes.

**Recommendation:** V2 must choose a deterministic narrow/zoom toolbar model before implementation: a labeled More formatting disclosure, a single horizontally scrollable toolbar with explicit affordance and keyboard behavior, or a non-sticky wrapping toolbar in a scrollable document. Define a minimum usable editor height and a fallback in which the toolbar/header joins document scroll while Exit and Save remain persistent. “Validation will decide whether wrapping is acceptable” is not a UX contract.

#### 3. “Same DOM” is a release-critical claim, but UX/UI v1 does not specify a reviewable single-host source order or tab semantics

**Evidence:** The current item page mounts a desktop editor at `PROJECT/src/app/items/[id]/page.tsx:425` and a compact mobile editor at `:764`. `ItemCompanionTabs` conditionally renders Notes or Digest, so Notes unmounts on tab switch (`src/components/item-companion-tabs.tsx:13-49`). UX/UI v1 correctly requires one host and persistent panels (`ux-ui-v1.md:98-105`), but it only says a shared host is “present in a responsive grid.” It does not define the DOM reading order, tab/tabpanel ownership, `hidden`/`aria-hidden`/inert behavior for inactive panels, or where that one host appears relative to the six mobile tabs and desktop article.

**Why it matters:** This is not a small styling change. It restructures the normal item page before Focus Mode exists. A CSS grid can visually place one node in different regions while leaving keyboard/screen-reader order wrong. `display:none` preserves React state but removes content from the accessibility tree; incorrectly paired tabs/panels can expose two active panels or a panel without a controlling tab.

**Failure mode:** The implementation passes a “one textarea” count but normal mobile reading order places the Notes editor before its tab strip, desktop Digest exposes a hidden but focusable note panel, or breakpoint changes preserve the textarea object while focus/reading order jumps unpredictably. Screenshot comparison will not detect most of these failures.

**Recommendation:** UX/UI v2 must include a normal-mode DOM/anatomy contract: one host location, source order for mobile and desktop, exact tab/tabpanel IDs and `aria-controls`/`aria-labelledby`, inactive panel `hidden` behavior, and breakpoint focus behavior. Make this host-consolidation design a prerequisite review gate with normal-mode screenshots and keyboard/screen-reader evidence before the focus overlay is implemented.

#### 4. Escape/IME/deeper-layer behavior cannot be implemented from the stated contract without losing or hiding state

**Evidence:** UX/UI v1 says provider dialog, delete confirmation, and possible formatting/help layers receive Escape first (`ux-ui-v1.md:34-45`) while simultaneously hiding secondary management in focus. The current provider and delete surfaces are inline `role="dialog"` blocks at `PROJECT/src/components/manual-note-editor.tsx:833` and `:1080`; they have no current Escape handler or focus trap. The editor keydown handler only implements `Cmd/Ctrl+S` at `manual-note-editor.tsx:503-508`. Recoveries, conflict, consent, versions, and delete state are all owned inside the editor and can exist when Focus is entered.

**Why it matters:** “Deepest layer first” is only meaningful if the design defines which layers can be open, which are visible, which are dismissible, and which owns Escape. Hiding management chrome does not automatically dismiss or preserve its open child state safely.

**Failure mode:** A user opens consent/delete/version UI, enters Focus, and the layer becomes visually hidden but remains semantically active. Escape then exits Focus instead of closing it, or dismisses it without returning focus. During IME composition, a synthetic or browser-specific Escape leaks to the outer handler and exits the writing surface.

**Recommendation:** V2 must define an entry-state matrix. The safest V1 rule is to disable Focus while consent/delete/version management is open and tell the user to finish or close that task. Conflict and recoverable drafts remain visible and must never be auto-dismissed. Name the event owner for every allowed child layer, define focus return, and require `event.isComposing`, key code 229, and the editor composition ref to block outer Escape. Real IME testing remains mandatory; a synthetic keydown test is insufficient.

#### 5. Mobile keyboard and Android Back behavior is a requirement without a deterministic layout or evidence contract

**Evidence:** UX/UI v1 requires `100dvh`, safe areas, a bottom action bar moved to the viewport edge, and no overlap (`ux-ui-v1.md:87-96`) but leaves CSS-versus-`visualViewport` unresolved (`:199-200`). The current compact bar is fixed at `bottom-[72px]` in `PROJECT/src/components/manual-note-editor.tsx:951-956`. PRD v1 leaves the same question open (`.../prd/prd-v1.md:212`).

**Why it matters:** Capacitor/WebView keyboard resize behavior varies by platform configuration and device. `100dvh` and safe-area insets do not guarantee that a fixed action bar clears the keyboard or that the textarea scrolls the caret above it. Android Back may dismiss the keyboard without emitting the history transition expected by the web layer.

**Failure mode:** Save/status sits behind the keyboard, the final editable line is covered, a viewport resize resets scroll/caret, or the first Android Back closes Focus and the keyboard together rather than dismissing only the keyboard. A keyboard-hidden 390×844 screenshot can still pass.

**Recommendation:** V2 must make the geometry falsifiable: when the keyboard is visible, the action bar bounding rect must sit fully inside `visualViewport`; the textarea must have bottom scroll padding equal to action-bar height plus safe inset; the caret/final line must be scrolled above the bar; orientation changes must preserve selection and node identity. Require real Capacitor evidence at 390×844 and the narrowest supported device, with keyboard open/closed and first/second Back outcomes recorded. If CSS cannot pass, `visualViewport` adjustment is not optional.

#### 6. The proposed visual validation cannot detect the feature's defining failures

**Evidence:** UX/UI v1's prototype decision asks for implementation screenshots and same-viewport normal-versus-focus comparison (`ux-ui-v1.md:192-194`). Its acceptance list names same DOM, undo, selection, keyboard, and background isolation (`:179-190`) but gives no instrumentation or proof format. Technical plan v1 admits that jsdom cannot prove native undo, real Back, virtual-keyboard geometry, or assistive-technology behavior and leaves the browser harness open (`technical-plan-v1.md:203-213,256-261`).

**Why it matters:** Visual QA proves layout, not object identity, editor ownership, native undo, network/journal side effects, focus containment, IME behavior, or local-versus-server state continuity. Those are the actual success criteria.

**Failure mode:** A polished implementation capture passes UX QA while Focus remounts the textarea, creates a second journal owner, clears native undo, triggers a note GET/PUT, leaves covered navigation tabbable, or fails Back/Forward after a direct load.

**Recommendation:** V2 must define required evidence per claim:

- tag the textarea/editor instance before entry and prove the same DOM object and instance marker after Focus, Exit, Back, Forward, and breakpoint resize;
- record note GET/PUT, journal mutation, BroadcastChannel, and editor-owner counts before/after transition;
- prove native undo by making an edit, toggling focus, invoking browser undo, and checking the exact value—not React state;
- record forward/backward selection, selection direction, textarea scroll, and page scroll before/after;
- verify tab order and background unreachability from DOM/keyboard evidence plus VoiceOver/TalkBack smoke;
- verify IME with a real composition path;
- verify keyboard overlap with viewport and element geometry plus screenshots;
- verify `document.scrollWidth <= clientWidth` and persistent-control visibility at 320px, 200%, and 400%;
- prove direct load never exposes an editable blank before reconciliation.

Screenshots remain necessary, but they cannot be the final acceptance mechanism for same-session claims.

#### 7. Session-expired and some recovery states are visible but not actually actionable inside focus

**Evidence:** UX/UI v1 says session expiry shows draft-kept copy, Copy, disabled server mutations, and immediate exit (`ux-ui-v1.md:129-135`). The current editor disables itself when status is `session-expired` (`PROJECT/src/components/manual-note-editor.tsx:690`) and disables Save (`:1000-1007`), but exposes no Unlock/Re-authenticate action. Focus Mode hides normal shell/navigation and secondary management. The status string alone says `Session expired · draft kept on this device`.

**Why it matters:** “Visible” is not the same as recoverable. A user in Focus can copy or exit but has no direct path to restore syncing, and the UX does not explain what happens after unlock or whether focus/content returns. The same ambiguity applies to a failed load before a note snapshot exists.

**Failure mode:** The user remains in a disabled editor with no repair CTA, exits, searches for unlock, and loses focus context or assumes Copy is the only safe recovery. A direct focus URL with an expired session can present a dead-end focused shell.

**Recommendation:** V2 must define a primary recovery action for session expiry (`Unlock to sync`) that preserves the device draft and a safe return target, plus Copy and Exit. Direct-load failure must state whether Focus opens at all or falls back to normal Notes. Add explicit action/copy rows for load failure, local journal failure with server-unsaved content, and post-unlock restoration.

### P2 - Medium Risk

#### 1. Initial focus placement is still a slash choice, not a decision

**Evidence:** UX/UI v1 says entry from the Focus button moves to the “focus heading/Exit control” (`ux-ui-v1.md:31`) and lists this as an open adversarial question (`:196-201`). Its accessibility order says Exit is first (`:158`) but does not identify the actual initial focus target.

**Why it matters:** Focus placement controls what a screen reader announces, whether keyboard users understand the mode transition, and whether pressing Space/Enter again accidentally exits.

**Failure mode:** Different implementations focus Exit, heading, or textarea. Screen-reader behavior and focus-return tests become non-deterministic.

**Recommendation:** V2 must choose exactly one. Recommended: Focus button entry moves programmatic focus to a `tabIndex=-1` focus heading for context; the first Tab reaches Exit. Entry initiated while the textarea is active restores the same textarea/selection.

#### 2. Conflict/recovery content can consume the entire narrow viewport with no focus-mode scroll hierarchy

**Evidence:** UX/UI v1 preserves conflict and recoverable-draft panels above the editor (`ux-ui-v1.md:119-136`). Current conflict is a two-card block and recoveries can be an unbounded list (`manual-note-editor.tsx:744-830`). The focus design also keeps top chrome, toolbar, and bottom actions sticky.

**Why it matters:** At 320px or with large text, the blocking panel can be taller than the visual viewport. Users still need Exit, Copy, conflict actions, and a comprehensible scroll path.

**Failure mode:** Nested scrolling traps keyboard/touch users, conflict actions move below sticky bars, or the editor remains technically mounted but unreachable.

**Recommendation:** V2 must define one scroll owner for blocking-state content, maximum heights for version previews, sticky boundaries, and a mobile stacked-state layout. Consider temporarily prioritizing the blocking state over toolbar/editor until resolved while keeping the underlying draft mounted.

#### 3. The hidden-background contract may suppress unrelated critical live regions and lacks exception rules

**Evidence:** UX/UI v1 says to set `inert` and `aria-hidden` on sibling branches along the editor-to-body path (`ux-ui-v1.md:155-157`). It does not identify global live regions, error boundaries, route announcements, or safety UI that must remain available. The command palette is a root overlay at `src/components/command-palette.tsx:63` and needs separate suppression.

**Why it matters:** Exact restoration is necessary but not sufficient if the isolation walk hides the wrong system-level surface or a crash prevents cleanup.

**Failure mode:** A global session/error announcement is suppressed, a service failure is invisible, or an exception leaves major app branches `aria-hidden` after Focus exits.

**Recommendation:** V2 should define allowed/excluded root overlays, an emergency cleanup path, and a test that throws during entry/exit and proves prior `inert`, `aria-hidden`, overflow, and focus state are restored exactly.

### P3 - Low Risk Or Polish

#### 1. “No mobile penalty” is overconfident until the toolbar and keyboard questions are closed

**Evidence:** UX/UI v1 principle 5 says “No mobile penalty” (`ux-ui-v1.md:17`), while its own open questions admit unresolved toolbar and keyboard behavior (`:199-200`).

**Why it matters:** It reads as a validated outcome rather than an objective.

**Failure mode:** Stakeholders interpret the phrase as evidence and underweight real-device validation.

**Recommendation:** In V2, change this to a measurable principle such as “Mobile Focus must recover net usable writing height without hiding Exit, status, Save, or the active line.”

## What The Original Plan Or Work Gets Wrong

1. It treats modal semantics as settled even though the product council explicitly rejected them for an application/page-state model.
2. It states the responsive single-editor result but does not expose the normal-mode DOM/source-order design needed to review that prerequisite.
3. It uses “may wrap” as a substitute for a 320px/400% toolbar design.
4. It assumes “deepest layer first” Escape behavior exists, although the current inline dialog-like states do not own Escape and may be hidden in focus.
5. It treats CSS `dvh`/safe-area behavior as an implementation preference even though keyboard clearance is a release-blocking UX requirement.
6. It correctly rejects a static prototype, then under-specifies the real-component evidence needed to prove the nonvisual promises.
7. It equates visible status copy with an actionable recovery path in the session-expired case.

## Missing Validation

- No defined normal-mode source-order/tab semantics audit after consolidating two responsive editors into one.
- No browser-level same-object marker and editor-owner/fetch/channel/journal count evidence.
- No native undo test across Focus, Exit, Back, Forward, and breakpoint resize.
- No real IME composition test; synthetic `isComposing` alone is not sufficient.
- No explicit child-layer open/enter/exit matrix for consent, delete, versions, conflict, and recoveries.
- No geometry-based keyboard test using `visualViewport` and action-bar/textarea bounds.
- No 320px plus 400% zoom proof of minimum editor height and reachable persistent controls.
- No exact initial-focus target and screen-reader announcement expectation.
- No direct-load/session-expired recovery path test.
- No exception/interrupted-cleanup test for background inert/`aria-hidden` restoration.
- No evidence artifact format tying each UX acceptance item to DOM, network, geometry, screenshot, keyboard, or AT proof.

## Revised Recommendations

1. Keep the same mounted-overlay direction, but explicitly separate **modal semantics** from **portalling/duplicating the editor** and choose one accessibility model.
2. Add a normal-mode DOM anatomy and tab semantics section before describing focus presentation.
3. Choose the narrow/zoom toolbar behavior now; do not defer it to visual QA.
4. Add an entry-state and Escape-ownership matrix for every existing inline layer.
5. Specify session-expiry and load-failure recovery actions, including safe unlock return.
6. Make mobile keyboard clearance a measured geometry contract with mandatory Capacitor evidence.
7. Turn every same-session claim into a falsifiable evidence requirement; screenshots supplement, not replace, those proofs.
8. Choose one initial focus target and one return-focus path for each entry method.

## Go / No-Go Recommendation

**NO-GO for implementation handoff from UX/UI v1.** Proceed to UX/UI v2 only after all P1 findings are dispositioned. Implementation may begin only when V2 contains a single semantic model, a feasible narrow/zoom layout, a reviewable single-host normal DOM, an actionable child/error state matrix, and a browser/real-device evidence contract capable of detecting remount, undo loss, IME exit, keyboard overlap, and focus leakage.

## Plan Revision Inputs

### Required Deletions

- Delete the unresolved “heading/Exit control” initial-focus slash choice.
- Delete the placeholder rule that all 11 controls may simply wrap at 320px/zoom unless later validation complains.
- Delete any claim that screenshot comparison can validate same-DOM, undo, IME, keyboard geometry, or background isolation.
- Delete one of the conflicting application-region versus `aria-modal` semantic contracts after council disposition.
- Delete “No mobile penalty” as an achieved claim until measured evidence exists.

### Required Additions

- One authoritative focus semantic model with nested-layer rules.
- Normal-mode single-host DOM/source-order and tab/tabpanel contract.
- Deterministic 320px/200%/400% toolbar and sticky-chrome behavior with minimum editor height.
- Child-layer entry/visibility/Escape/focus-return matrix.
- Session-expired Unlock-to-sync and failed-load recovery flows.
- Keyboard-visible mobile geometry and Back sequence contract.
- Blocking conflict/recovery scroll hierarchy.
- Isolation exception and crash-cleanup rules.
- Evidence map naming the proof type for each UX acceptance criterion.

### Required Acceptance Criteria Changes

- Replace “one editor remains mounted” with measurable identity/owner/request assertions across every transition.
- Add normal mobile/desktop source-order, tab semantics, and inactive-panel focusability criteria after host consolidation.
- Add minimum focused editor height and persistent-control visibility criteria at 320px, 200%, and 400%.
- Add session-expired action and safe unlock-return criteria.
- Add child-layer-open entry/exit and IME-safe Escape criteria.
- Add keyboard-open final-line visibility and first/second Android Back criteria.
- Add exception-safe inert/`aria-hidden`/overflow restoration criteria.

### Required Validation Changes

- Browser instrumentation for DOM identity, instance ID, fetch/PUT, BroadcastChannel, journal owner/mutations, selection direction, scroll, and undo.
- Real production-build Back/Forward/direct-load/refresh checks; development mode is insufficient.
- Real Capacitor keyboard-open/closed and Android Back evidence, with geometry and screenshots.
- Real IME composition smoke in at least one supported input method.
- VoiceOver and TalkBack checks with expected initial announcement and background-unreachability results.
- 320px, 200%, and 400% reflow captures plus `scrollWidth`/bounding-rect assertions.
- Failure-state evidence for offline, failed, session-expired, oversize, conflict, multiple recoveries, and IndexedDB unavailable.
- A traceability report mapping each UX criterion to the exact artifact and pass/fail result.

### Required No-Go Gates

- More than one note editor, textarea, journal owner, BroadcastChannel owner, or note load exists for the item.
- Textarea DOM identity or native undo fails across Focus/Exit/Back/Forward/breakpoint resize.
- Focus transition triggers a note mutation, journal mutation without content change, or status reset.
- Semantic model remains inconsistent across UX, PRD, product council, and technical plan.
- Exit, Save, status, or active editing line is obscured at 320px, 200%/400%, or with the mobile keyboard open.
- Background navigation/destructive controls remain keyboard or screen-reader reachable.
- IME Escape exits focus or a child layer does not receive Escape/focus restoration correctly.
- Session-expired direct focus has no safe, visible recovery path.
- Validation relies on screenshots alone for same-session or accessibility claims.

## Residual Risks

Even after V2 closes these gaps, native undo behavior across complex browser history and responsive layout changes remains browser-dependent; real-browser release gates reduce but do not eliminate that risk. Capacitor keyboard behavior can vary by OS/WebView configuration. Screen-reader interpretation of an in-place modal editor with rich inline recovery states may still differ between VoiceOver and TalkBack. These are acceptable residual risks only if the feature remains flag-gated, normal Notes stays unchanged, and any identity, data-loss, blocked-exit, or inaccessible-background failure triggers immediate flag-off rollback.
