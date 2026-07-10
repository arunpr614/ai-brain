# UX Android Ask Unified Composer Implementation Plan - Adversarial Review

**Created:** 2026-06-13 18:01:14 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_ANDROID_ASK_UNIFIED_COMPOSER_IMPLEMENTATION_PLAN_2026-06-13_17-56-02_IST.md`
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_ANDROID_ASK_UNIFIED_COMPOSER_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-13_18-01-14_IST.md`

## Executive Verdict

Conditional no-go for direct execution as written. The design direction is defensible, but the plan is too broad and under-specified for the exact failure it is trying to fix: bottom-area overlap and unclear Ask hierarchy. It should be revised before implementation so the team does not publish a complex prototype that looks interactive but has broken state rules, misleading scoped Ask behavior, or a composer that still fails under keyboard/safe-area conditions.

## Evidence Inspected

- Target plan with line numbers: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_ANDROID_ASK_UNIFIED_COMPOSER_IMPLEMENTATION_PLAN_2026-06-13_17-56-02_IST.md`
- Magic Patterns Android design status for editor `d5w3fb6rzxdeht7urnye5r`: active artifact `16464dd2-f619-488b-b629-d7f7f8ef38bb`, not generating.
- Magic Patterns artifact files inspected through `read_artifact_files`: `App.tsx`, `components/MobileBottomNav.tsx`, `pages/MobileAsk.tsx`, `pages/MobileCapture.tsx`, `pages/MobileShareCapture.tsx`.
- Review path generated with `/Users/arun.prakash/.codex/skills/adversarial-review/scripts/report_path.py`.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. The plan explicitly avoids the keyboard state, which is the highest-risk mobile overlap case

**Evidence:** The plan says the composer must never overlap the nav at lines 106-115, but then says a real keyboard does not need to be simulated unless Magic Patterns supports it at lines 132-135.
**Why it matters:** The original problem is a bottom-area collision. On Android, the keyboard-open state is the most likely place for the composer, send button, bottom nav, and sheet controls to collide.
**Failure mode:** The published design can look fixed in the idle state while still failing when the user taps the text field. The user will verify the normal state, then later find the Ask textbox or send button blocked, shifted out of frame, or hidden by a bottom sheet/keyboard state.
**Recommendation:** Add a required keyboard-open design state. If Magic Patterns cannot simulate the actual keyboard, create an explicit prototype state with a keyboard placeholder and verify composer position, visible plus button, visible send button, and attached-context chips above the keyboard.

#### 2. Scope is too large for one implementation pass and is likely to create a fragile prototype

**Evidence:** The objective promises plus flow, attach saved item, paste link, write note, send, loading, answer, citations, warnings, follow-ups, and cross-screen navigation at lines 13-21. File-level changes add route-aware nav, large Ask state management, four sheet flows, answer generation, and history at lines 369-400.
**Why it matters:** This is not a small UX fix anymore. It is a mini Ask product prototype plus bottom navigation rewrite. That scale raises the risk of broken flows, inconsistent state, and false confidence if only the happy path works.
**Failure mode:** Implementation ships a visually improved composer but leaves one or more key interactions shallow: history opens but does not restore state, paste link creates a chip but no answer scope, selected items attach but citations do not reflect them, or send state breaks after sheet interactions.
**Recommendation:** Split execution into two acceptance-gated stages: first fix route-aware nav plus unified composer/send happy path; second add Add Context subflows and history. If doing it in one artifact, define a state matrix for every sheet and message state before writing code.

#### 3. Scoped Ask and attached context have conflicting rules that can silently change what the user is asking about

**Evidence:** Existing scoped URLs must continue working at lines 417-423. The plan says attached items become the primary scope at lines 172-177 and later says attached items override or narrow the scope at lines 296-302. It does not define what happens when both URL scope and attached items exist.
**Why it matters:** Ask trust depends on the user understanding which sources the answer used. Silent precedence changes are a serious UX integrity problem.
**Failure mode:** A user enters Ask from a tag/topic/collection, attaches one item, asks a question, and gets an answer from only the attachment while the UI still implies the broader scope. Or the reverse happens: attached context appears selected but citations come from the route scope.
**Recommendation:** Add explicit scope composition rules. Example: show a source-scope banner with one of three states: `All saved items`, `Scoped to Topic`, or `Attached context overrides scope`. Add acceptance criteria that citations and warning copy match the visible scope exactly.

#### 4. The route-aware FAB rule is under-specified for actual nested screens and future bottom docks

**Evidence:** The plan lists screens where the FAB remains visible at lines 51-60 and suppresses it on Ask/Capture/future bottom-composer screens at lines 64-72. It then reduces implementation to route checks for `/ask` and `/capture` at lines 80-86.
**Why it matters:** The visual bug was caused by a global component ignoring screen context. A shallow route check can reproduce the same class of bug later, especially on item detail tabs, repair flows, share capture, or any future docked action.
**Failure mode:** A future or existing screen with a bottom dock still receives the raised FAB because it is not exactly `/ask` or `/capture`. Or a route containing `/ask` is hidden unexpectedly due to broad pathname matching.
**Recommendation:** Replace ad hoc route checks with an explicit nav variant contract: `fab`, `standard`, or `hidden`. At minimum, centralize a `shouldShowCaptureFab(pathname)` helper with listed route tests and a no-FAB rule for composer/docked-action screens.

### P2 - Medium Risk

#### 1. Add Context bottom-sheet stacking and back behavior are not defined

**Evidence:** The plan allows attach saved item to open a second bottom sheet or replace sheet content at lines 153-158, but does not define Android back, close, cancel, or nested-sheet recovery behavior. It adds history as another sheet at lines 304-316.
**Why it matters:** Multiple modal layers around a docked composer are easy to trap or confuse on mobile.
**Failure mode:** User opens Add Context, enters Attach Saved Item, presses Android back or close, and either loses selected context unexpectedly or returns to the wrong layer. History and Add Context could also compete for modal ownership.
**Recommendation:** Define a single-sheet state machine: `addContext`, `attachPicker`, `pasteLink`, `writeNote`, `history`, `attachedSources`. Specify close/back behavior for each state.

#### 2. Mock capture/link states can overclaim functionality unless clearly labeled

**Evidence:** Paste-link flow supports validating/saving, full-text result, metadata-only result, duplicate result, and attaching newly saved sources at lines 196-220. Write note creates a mock manual note source at lines 235-240.
**Why it matters:** This is a design prototype, not production capture. Without explicit simulation labels, reviewers may believe URL parsing, duplicate detection, and source creation logic are actually designed end to end.
**Failure mode:** A stakeholder tests the prototype and misinterprets mocked results as committed product behavior, especially around duplicate detection or full-text capture.
**Recommendation:** Mark these as deterministic prototype states in UI copy or QA notes: `Prototype result`, `Simulated save`, or provide a segmented test control only in the prototype environment if acceptable.

#### 3. Acceptance criteria do not verify source-citation integrity

**Evidence:** The send checklist verifies that citations appear and tapping citation opens item detail at lines 454-462. It does not require citations to match the visible scope, attached context, or warning state.
**Why it matters:** For AI Brain, source grounding is core trust infrastructure. Seeing citations is not enough; they must be the right citations.
**Failure mode:** The answer cites arbitrary first-three sources while the UI claims the answer was based on selected items, a tag, or newly attached context.
**Recommendation:** Add acceptance criteria: citation list must come from the exact active scope; limited-source warning must appear when any cited or attached source is not fully readable; citation tap must open the same item named in the citation.

#### 4. Conversation history behavior is too shallow for the promised interaction

**Evidence:** The plan says conversation history receives the new conversation at line 279 and tapping history loads a mocked conversation at lines 310-314. It does not define whether messages, attachments, citations, scope, and warnings are restored.
**Why it matters:** A conversation without restored source context is misleading in a source-grounded AI app.
**Failure mode:** User loads a prior conversation and sees messages but no attached context or outdated scope chips. The UI implies continuity while the underlying state has reset.
**Recommendation:** Define history item payload requirements: title, date/time, scope label, attached source IDs, message list, citations, and quality warnings. If not implementing full restoration, label history as static preview.

#### 5. Publish plan treats compile success as sufficient

**Evidence:** Publish plan says publish the draft artifact if implementation compiles at lines 480-488. The QA list is manual and does not include screenshot verification, route traversal, or preview readiness beyond final handoff.
**Why it matters:** The prior issues in this project were visual/layout problems, not only compile problems. Compile success will not catch overlap, clipping, blocked taps, or broken state transitions.
**Failure mode:** A compiled Magic Patterns artifact is published with an invisible sheet action, clipped composer, or still-overlapping nav on one route.
**Recommendation:** Add a publish no-go gate requiring visual inspection of Ask idle, Ask sheet open, Attach picker, Paste link, Write note, loading answer, answer with citations, keyboard-open placeholder, Library nav, and Capture nav.

### P3 - Low Risk Or Polish

#### 1. The plan uses “Ask AI Brain button” language imprecisely

**Evidence:** The user asked to develop the UX when clicking the `"Ask AI Brain" button`, the plus button, and send icon. The plan uses `Ask AI Brain` as a composer label at lines 108-112 and 320-330, not as a button.
**Why it matters:** This may not block implementation, but unclear nomenclature can cause the wrong UI element to receive behavior.
**Failure mode:** The implementer creates interactions for plus/send but misses whatever the user perceived as an `Ask AI Brain` actionable area.
**Recommendation:** Rename the composer pieces explicitly: composer label, text input, add-context button, send button. If the label is not tappable, say so.

#### 2. Accessibility is underdeveloped beyond a single add-context label

**Evidence:** The plan mentions an accessible label for Add context at line 326, but not for send, chips, remove actions, sheet close, disabled send, or source warning announcements.
**Why it matters:** Even in a prototype, accessibility labels help clarify interaction intent and reduce ambiguity in icon-heavy controls.
**Failure mode:** The UI is visually clear but inscrutable to assistive tech or to reviewers inspecting element purpose.
**Recommendation:** Add labels for send, attach/remove source, close sheet, open history, disabled send, and warning chips.

## What The Original Plan Or Work Gets Wrong

The plan correctly identifies the global Capture FAB as the structural cause of the Ask overlap, but it underestimates the interaction debt created by moving capture into Ask. The moment capture becomes `Add context`, the product now needs source-scope rules, attachment state, bottom-sheet navigation, warning semantics, and citation integrity. The plan lists these pieces, but does not yet define their state model tightly enough to execute safely.

It also treats Magic Patterns compile/publish as a late mechanical step, when visual regression and route traversal should be publish blockers for this kind of mobile UI work.

## Missing Validation

- Keyboard-open or keyboard-placeholder state for the composer.
- Screenshot or visual inspection requirements for each major Ask state.
- Scope/citation integrity checks.
- Attached-context precedence checks against tag/topic/collection/selected-item routes.
- Bottom-sheet back/close/cancel behavior.
- Disabled-send and empty-input behavior.
- Route-aware nav checks for both normal FAB and standard-tab modes.
- Verification that Capture itself does not show a redundant raised Capture FAB.
- Verification that Library, item detail, topic, and collection still retain expected capture access.

## Revised Recommendations

1. Add a formal state matrix before implementation:
   - idle
   - input focused
   - keyboard placeholder
   - add-context sheet
   - attach picker
   - paste link empty/saving/success/limited/duplicate
   - write note empty/valid/saved
   - attached-context chips
   - empty send nudge
   - loading answer
   - answer with citations
   - history sheet

2. Add an explicit scope model:
   - route scope
   - attached context
   - combined or override behavior
   - visible copy for whichever model is active

3. Add a route-aware nav contract instead of one-off `/ask` and `/capture` checks.

4. Split execution into two stages unless the state matrix is implemented fully:
   - Stage 1: route-aware nav, unified composer, empty/send/loading/answer happy path.
   - Stage 2: attach picker, paste link, write note, history restoration.

5. Add no-go visual checks before publishing.

## Go / No-Go Recommendation

No-go for executing the current plan unchanged. Conditional go after the plan is revised to include keyboard/safe-area states, scoped Ask precedence, bottom-sheet state machine, and stronger publish validation.

## Plan Revision Inputs

### Required Deletions

- Remove or demote “Upload file” as an optional future action unless it is explicitly included in this implementation scope.
- Remove vague “second bottom sheet or replace sheet content” language; choose one modal navigation model.
- Remove any implication that compile success is enough to publish.

### Required Additions

- Keyboard-open/keyboard-placeholder state.
- Explicit active-scope model and attached-context precedence.
- Bottom-sheet state machine.
- Route-aware nav variant helper or contract.
- Prototype labels for simulated capture/link/note outcomes.
- Conversation history restoration payload or static-history limitation.

### Required Acceptance Criteria Changes

- Citations must match the visible active scope.
- Source warnings must match attached/cited limited sources.
- Composer must remain visible in idle, sheet-open, and keyboard-placeholder states.
- Add-context actions must be reversible or clearly cancellable.
- Standard Capture tab must work on Ask/Capture when the raised FAB is suppressed.

### Required Validation Changes

- Add visual review for every planned state.
- Add route review for `/ask`, `/capture`, `/library`, `/item/:id`, `/topic/:topicSlug`, `/collection/:collectionSlug`, `/needs-upgrade`, and `/more`.
- Add screenshot evidence or explicit manual checklist results before publishing.
- Add Magic Patterns status and version-history check before and after publish.

### Required No-Go Gates

- Do not publish if the composer overlaps the nav, sheet, or keyboard-placeholder.
- Do not publish if send, plus, or remove-chip buttons are partially obscured.
- Do not publish if citations do not match the current visible scope.
- Do not publish if any route loses intended capture access.
- Do not publish if a bottom sheet can trap the user without close/back/cancel recovery.

## Residual Risks

Even after revision, this remains a high-interaction prototype inside Magic Patterns rather than production code. Some mobile behaviors, especially real Android keyboard resizing, safe-area handling, and hardware back behavior, may only be approximated. The final design should still be validated later in a real Android build or a closer mobile prototyping environment before being treated as implementation-ready.
