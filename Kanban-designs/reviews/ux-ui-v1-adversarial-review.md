# Card Processing Workflow UX/UI v1 - Adversarial Review

**Created:** 2026-07-11 15:17:12 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/ux/ux-ui-v1.md` and the isolated working prototype/gallery
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/reviews/ux-ui-v1-adversarial-review.md`

## Executive Verdict

**No-go for claiming the selected prototype passes its own review acceptance.** The prototype builds and is clearly labeled **Explored — not implemented**, but it demonstrates only a subset of the UX v1 contract and materially misrepresents counts, session behavior, filtering, detail routing, notes boundaries, focus behavior, and failure coverage. It is useful as a visual direction artifact, not as evidence that the workflow is interaction-ready or accessible. No production UI should be derived from it until the P1 findings are corrected or explicitly excluded from v2 claims.

## Evidence Inspected

- UX/UI v1: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/ux/ux-ui-v1.md`, lines 1-780.
- Original objective prototype requirements: `/Users/arun.prakash/.codex/attachments/514e46ef-5f1a-4e64-9a0d-8e33e8c20f2e/goal-objective.md:394-452` and definition of done at lines 619-641.
- Prototype implementation: `prototypes/src/App.jsx`, lines 1-781, and `prototypes/src/styles.css`, lines 1-354.
- Prototype HTML/build configuration: `prototypes/index.html`, `direction-a.html`, `direction-b.html`, `direction-c.html`, `vite.config.mjs`, and `package.json`.
- Successful isolated production build: `npm run build` completed with Vite 6.4.2 and four HTML entries on 2026-07-11.
- Visual inspection: `prototype-gallery-1440x1024.png`, Direction A desktop/mobile, Direction B desktop/mobile/detail and loading/error/offline/empty/filtered-empty captures, and Direction C desktop/mobile under `prototypes/screenshots/`.
- Current product visual evidence under `research/screenshots/current-product/` and the three source concepts under `ux/concepts/`.
- Accessibility input: `reviews/accessibility-review-input.md`.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found. The prototype is isolated, fictional, locally buildable, and visibly marked non-production.

### P1 - High Risk

#### 1. The prototype omits most of the trust-critical states that UX v1 says are directly reviewable

**Evidence:** UX v1 lines 698-733 requires directly addressable onboarding, conflict, deleted, AI-topic-change, delayed/unknown outcome, local failure/Retry, batch, and partial-result interactions. `App.jsx:439-448` exposes only Normal, Loading, Load error, Offline, Empty Inbox, and Filtered empty. `App.jsx:482-524` renders those coarse states; there is no conflict, deleted, topic-change, onboarding, local action failure, unknown outcome, partial batch, selection, or pending-state controller.
**Why it matters:** Trust handling is the hard part of this feature. A static happy-path move proves almost nothing about conflict safety, honest success messaging, or place preservation.
**Failure mode:** Stakeholders approve an interaction model based on screenshots, then discover during implementation that failure recovery, selection, and accessibility require structural changes.
**Recommendation:** Either implement the v1-required fixture states in the throwaway prototype or explicitly narrow UX v2's prototype claims. At minimum, add directly addressable scenarios for per-item pending/success/failure/Retry, unknown outcome reconciliation, 409 conflict, deleted source, AI-topic membership change, mixed batch result, onboarding, and Undo conflict.

#### 2. The prototype displays mathematically false backlog and filter counts

**Evidence:** The UX fixture declares Inbox total 327 and active totals at lines 608-618. The implementation derives `inboxTotal` from only the five visible Inbox fixtures (`App.jsx:341-348`) and passes all filtered items, including non-Inbox and archived rows, as “matching” (`App.jsx:472-480`). `FilterBar` then renders “Showing {matching} matching · {total} total in Inbox” (`App.jsx:607-614`). The desktop screenshot visibly reads “Showing 12 matching · 5 total in Inbox,” an impossible relationship for an unfiltered Inbox view.
**Why it matters:** Count clarity is a named product requirement and acceptance gate. False counts directly undermine the trust thesis and invalidate filter evaluation.
**Failure mode:** Reviewers cannot tell whether a filter affects the current view, all active statuses, or total Inbox; production inherits the wrong predicate model.
**Recommendation:** Separate aggregate fixture totals from rendered rows. For Inbox show current-filter Inbox matching count and owner-wide Inbox total; for Board/List show matching counts by status plus the separately labeled total Inbox health. Add test fixtures where matching is 0, 5, and greater than the loaded page but never greater than the applicable total.

#### 3. “Canonical item detail” is implemented as an editable modal, contradicting the selected architecture and invalidating return-state testing

**Evidence:** UX v1 lines 165-173 and 278-280 make the existing full item route canonical; quick preview must be read-only at lines 254-276. `App.jsx:539-548` opens `DetailDialog`, and `App.jsx:734-760` renders a modal labeled “Canonical item detail prototype” with an editable notes textarea. The screenshot `direction-b-detail-notes-desktop-1440x1024.png` confirms the modal presentation.
**Why it matters:** A modal bypasses real route navigation, return URL validation, history, scroll anchors, notes navigation guards, and mobile route behavior—the exact risks the prototype is supposed to test.
**Failure mode:** The prototype appears to preserve place only because it never leaves the page; production route integration later breaks notes drafts or loses Processing context.
**Recommendation:** Make “Open full source” navigate to an isolated prototype route/page that simulates the existing item-detail IA and Back to Processing contract. Keep quick preview read-only. If a modal remains as a comparison direction, label it as a non-recommended alternative rather than canonical behavior.

#### 4. The core “Process next 3” loop is mostly cosmetic and contradicts the written flow

**Evidence:** UX v1 line 158 says the first row is not automatically selected, but `App.jsx:328` selects the first fixture on load. The Process next 3 handler only selects the first Inbox item and changes the view (`App.jsx:450-457`); it does not bound or advance a three-source session. Leave in Inbox is a no-op button (`App.jsx:653-656`), contradicting UX v1 lines 154-163, which requires advancing the session without a workflow event.
**Why it matters:** The product recommendation is Inbox-first because of the bounded decision loop, not merely because Inbox is the default tab. The prototype has not demonstrated its central thesis.
**Failure mode:** Direction B wins on a behavior that does not exist in the review artifact; users may experience the same scanning burden as Library.
**Recommendation:** Add explicit session state: 0/3 progress, no default selection before opt-in, deterministic oldest-first advance, Leave in Inbox advance, move confirmation advance, completion/stop behavior, and focus restoration. Compare it against ordinary unbounded Inbox use.

#### 5. Filtering does not implement the specified OR-within/AND-across model or URL persistence

**Evidence:** UX v1 lines 284-309 requires multi-value OR within facets, AND across facets, removable chips, and URL state. The prototype stores one string per facet (`App.jsx:324-339`), renders one native single-select per facet (`App.jsx:607-614`), and keeps all view/filter state only in React memory. No URL parameters, chips, “No user tags,” or “No AI topics” options exist.
**Why it matters:** The proposed filter algebra is a significant architectural and comprehension choice. A single-select demo cannot validate it.
**Failure mode:** Stakeholders approve compact controls that cannot express the actual filter model; production either changes the UI radically or silently implements weaker filtering.
**Recommendation:** Prototype multi-select facet sheets/menus, active removable chips, OR-within/AND-across fixtures, explicit unlabeled values, and browser Back/Forward/bookmark restoration.

#### 6. Accessibility claims exceed the implementation

**Evidence:** The dialog at `App.jsx:742-760` has no initial focus, focus trap, Escape handling, or explicit focus return. Tab buttons at `App.jsx:600-604` do not implement roving tab focus or arrow-key behavior. Mobile card actions are forced to 36px (`styles.css:299-301`) despite UX v1's 44×44 requirement at lines 402-407. HTML drag is enabled on cards (`App.jsx:661-688`) with no drag-state announcement or keyboard drag model; the select is an alternative, but the written focus and live-region contracts are not exercised.
**Why it matters:** Accessibility is a release gate, not visual polish. Missing focus containment and undersized controls can make core tasks unusable.
**Failure mode:** Keyboard focus escapes behind the modal, mobile controls miss WCAG target expectations, and reviewers mistake a semantic-looking prototype for validated accessibility.
**Recommendation:** Implement dialog focus entry/trap/Escape/return; 44px minimum mobile actions; correct tab keyboard behavior; visible focus-state captures; status announcements; and keyboard-only task verification. Do not claim screen-reader or focus acceptance from static markup alone.

### P2 - Medium Risk

#### 1. Directions A, B, and C share one behavior engine and differ less in interaction than the gallery implies

**Evidence:** All three pages render the same `Prototype` component (`App.jsx:201-213`). Direction changes default view, title, selected navigation, metric styling, and a small Library Browse/Queue control (`App.jsx:317-322`, `:461-468`), while the same tabs, filters, state selector, modal detail, actions, and archive behavior remain available everywhere.
**Why it matters:** The objective asks for meaningfully different workflow/IA directions, not only different default tabs.
**Failure mode:** Reviewers compare hierarchy and palette while believing they compared distinct processing models, detail models, mobile models, or archive concepts.
**Recommendation:** Give each direction one genuinely different end-to-end journey: A board-first spatial processing with board-preserved detail; B bounded Inbox session with canonical route; C Library browse/queue toggle with dense batch flow. Keep shared fixtures/tokens, not identical behavior.

#### 2. Archive reprocessing collapses two explicit lifecycle decisions into one prototype action

**Evidence:** UX v1 lines 195-204 distinguishes Restore to Done from a separate Reprocess to Inbox action. The prototype's archived view offers both buttons, but `restoreCard(id, true)` simultaneously clears archive and sets Inbox (`App.jsx:374-387`, `:714-720`). The technical plan requires two preserved lifecycle facts.
**Why it matters:** The UI can present a compound operation, but the prototype copy should make its two-step consequence explicit and support failure/Undo semantics for each stage.
**Failure mode:** Users believe “reprocess” is a direct archived-to-Inbox transition; implementation later exposes partial completion or confusing Undo behavior.
**Recommendation:** Prototype Reprocess as Restore to Done followed by a separately confirmed Move to Inbox, or explicitly specify an atomic compound contract and reconcile it with technical v2.

#### 3. Mobile screenshots do not prove task completion below the fold

**Evidence:** `direction-b-inbox-mobile-390x844.png` ends with the first source row partly obscured by the fixed bottom navigation. No mobile screenshot shows Move to, archive/restore, filter sheet, batch toolbar, detail return, or Undo. UX v1 lines 665-683 explicitly requires those captures.
**Why it matters:** A responsive header is not evidence of a usable mobile workflow.
**Failure mode:** Fixed navigation or long header/metrics pushes the actual processing controls below the useful viewport, and bottom notices cover them.
**Recommendation:** Capture complete mobile task sequences at 390×844, 360×800, and 412×915, including controls above the bottom nav, filters, Board status switching, archive/restore, detail return, and Undo.

### P3 - Low Risk Or Polish

#### 1. The gallery screenshot is not clean stakeholder evidence

**Evidence:** `prototype-gallery-1440x1024.png` visually contains a repeated/slivered right-edge segment and shows only part of the long page.
**Why it matters:** It distracts reviewers and can look like a responsive layout defect even if it is only a capture artifact.
**Failure mode:** The PR embeds misleading evidence or reviewers miss Directions B/C below the fold.
**Recommendation:** Replace it with a clean viewport capture plus separate full-page sections or a stitched artifact verified before publication.

## What The Original Plan Or Work Gets Wrong

- It mistakes a successful build for behavioral validation.
- It presents false fixture counts while claiming count semantics are unambiguous.
- It calls an editable modal “canonical item detail,” sidestepping the selected full-route design.
- It recommends a bounded processing loop without implementing the bound or advance behavior.
- It documents multi-select, URL-backed filters but prototypes single in-memory selects.
- It declares extensive failure and accessibility acceptance without the corresponding states or interaction evidence.
- It overstates how different the three interactive directions are.

## Missing Validation

- Browser-level console and interaction evidence for every direction.
- Directly addressable trust/failure states beyond initial load error/offline.
- Complete keyboard-only sequence and focus trace.
- Screen-reader announcement review.
- 200% zoom and text-size increase.
- Mobile end-to-end task captures.
- Correct total/matching count fixtures.
- Route-based detail return and unsaved-note protection.
- Multi-value filter algebra and URL history.
- Bounded Process next session behavior.
- A final design QA report was not present in the prototype root at review time.

## Revised Recommendations

1. Correct count fixtures before any further screenshot publication.
2. Implement the bounded Inbox session or stop using it as Direction B's differentiator.
3. Replace modal “canonical detail” with an isolated route simulation.
4. Add the minimum trust-state fixture suite and direct links.
5. Prototype the actual filter algebra and URL state.
6. Fix focus, tabs, 44px targets, and live announcements.
7. Differentiate A/B/C through end-to-end behavior, not just default view.
8. Keep the prototype isolated and visibly **Explored — not implemented**; make no production UI changes.

## Go / No-Go Recommendation

**No-go for asserting UX acceptance or using the prototype as implementation-ready evidence. Conditional go for continued throwaway prototyping.** The visual direction may be reviewed, but every P1 must be fixed or explicitly downgraded from the v2 prototype's claims. Production application code must remain untouched.

## Plan Revision Inputs

### Required Deletions

- Delete “canonical item detail” from the modal label.
- Delete the current impossible “12 matching · 5 total in Inbox” presentation.
- Delete any claim that Process next 3 works until bounded session state exists.
- Delete claims of direct-addressable conflict/deleted/topic states until they exist.

### Required Additions

- Add route-based prototype detail and return context.
- Add bounded-session progress and advance logic.
- Add multi-value filters, chips, unlabeled values, and URL persistence.
- Add trust/failure scenario routes.
- Add mobile Library summary and capture feedback.
- Add accessible dialog, tab, target-size, and live-region behavior.

### Required Acceptance Criteria Changes

- Require mathematically valid total/matching fixtures.
- Require an actual three-source session with Leave/move/stop behavior.
- Require full-route detail/return rather than modal-only evidence.
- Require a successful keyboard-only and 390×844 task sequence.
- Require every advertised review state to be directly addressable.

### Required Validation Changes

- Inspect and record each route at desktop/mobile sizes.
- Capture visible focus for Move to, tabs, dialog, Undo, and filters.
- Test Back/Forward/bookmark behavior.
- Test local failure, 409, unknown outcome, deletion, topic change, and partial batch.
- Produce a clean gallery screenshot and a design QA report.

### Required No-Go Gates

- Any impossible or ambiguous count display.
- Any modal described as the canonical existing detail route.
- Any core action that is only a visual control with no state change.
- Any primary mobile control below 44×44 CSS pixels.
- Any production application modification during this exploration.

## Residual Risks

Even a corrected prototype cannot validate server conflicts, real note-journal behavior, database scale, or assistive-technology behavior under production virtualization. The dark shell and high information density may still feel like backlog pressure. Those risks require measured usability and implementation spikes after, not during, this exploration phase.
