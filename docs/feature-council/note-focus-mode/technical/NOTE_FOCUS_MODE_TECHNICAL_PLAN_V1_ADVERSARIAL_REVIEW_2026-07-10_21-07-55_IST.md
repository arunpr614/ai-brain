# Note Focus Mode Technical Plan v1 - Adversarial Review

**Created:** 2026-07-10 21:07:55 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `PROJECT/docs/feature-council/note-focus-mode/technical/technical-plan-v1.md`
**Report path:** `PROJECT/docs/feature-council/note-focus-mode/technical/NOTE_FOCUS_MODE_TECHNICAL_PLAN_V1_ADVERSARIAL_REVIEW_2026-07-10_21-07-55_IST.md`

## Executive Verdict

**NO-GO for implementation from technical plan v1.** The same-node architecture is the right direction, but the plan does not yet make its riskiest structural rewrite independently reversible, leaves the Next/History behavior and browser proof harness undefined, omits the known non-durable-navigation failure, and turns accessibility/mobile-keyboard correctness into post-implementation discovery.

Two P0 release blockers and six P1 risks must be resolved in technical plan v2. No backend/schema issue blocks the feature; the blockers are client lifecycle, evidence, and truthful rollback.

## Evidence Inspected

- Objective: `local goal objective`.
- Discovery and current-run screenshots under `docs/feature-council/note-focus-mode/`.
- Product, UX, and technical council briefs.
- PRD v1 and UX/UI v1 plus their adversarial reviews.
- `technical/technical-plan-v1.md`.
- Current `src/app/items/[id]/page.tsx`, `src/components/item-companion-tabs.tsx`, `src/components/manual-note-editor.tsx`, `src/components/command-palette.tsx`, `src/app/layout.tsx`, `src/lib/notes/flags.ts`, `src/lib/notes/local-journal.ts`, `package.json`, and `scripts/deploy.sh`.
- Current local desktop/mobile/source-focus browser evidence.
- Adversarial-review skill and report template.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. The plan's primary rollback cannot remove the normal-mode shared-host rewrite

**Evidence:** Technical plan v1 makes removal of the mobile editor, persistent mounting behind Digest, shared responsive grid/aside, and compact-style consolidation a prerequisite, then calls `NOTE_FOCUS_MODE_ENABLED=0` the primary rollback. Current code proves those changes affect normal Notes before the Focus flag is consulted: the desktop editor is at `src/app/items/[id]/page.tsx:425`, mobile editor at `:764`, and Digest/Notes conditional unmount at `src/components/item-companion-tabs.tsx:48`.

**Why it matters:** The shared-host rewrite is the most regression-prone part and remains active with Focus disabled.

**Failure mode:** Mobile Notes, desktop Digest, action-bar positioning, source order, or hidden-panel focusability breaks in production. Flag-off hides Focus but leaves the defect live.

**Recommendation:** Technical plan v2 must separate two rollback scopes. Focus presentation/history uses configuration rollback. Shared-host consolidation requires a rehearsed previous-artifact/commit rollback unless independently gated. Normal Notes with Focus disabled is a prerequisite gate before overlay work and again before release.

#### 2. The plan promises no-loss state continuity without a defined production-browser proof path

**Evidence:** V1 requires textarea object identity, native undo, Back/Forward, selection direction, journal/request/channel counts, keyboard geometry, VoiceOver/TalkBack, and real IME. The repository exposes Node/jsdom tests but no dedicated browser/E2E command. The plan leaves the production-browser harness as an open question and says jsdom cannot prove the defining behaviors.

**Why it matters:** These are not optional polish checks; they are the feature's central data-trust promise.

**Failure mode:** Implementation passes pure/jsdom tests and screenshots while native undo resets, Next replaces the editor on popstate, or background focus remains reachable. Release evidence cannot falsify the defect.

**Recommendation:** V2 must name the browser control path, production-build fixture, instrumentation markers, request observation, required commands/artifacts, and manual/AT boundaries before coding. Same-node native state is a no-go gate, not a best-effort check.

### P1 - High Risk

#### 1. Next.js native-history integration is treated as a fallback decision instead of an early feasibility gate

**Evidence:** The plan proposes visible-query `history.pushState`, admits Next may replace the tree, and offers a same-URL state-only fallback after production testing. The server page consumes search params and currently branches on them.

**Why it matters:** If the preferred query contract remounts, URL/direct-refresh semantics and implementation shape change materially.

**Failure mode:** Most Focus code is built against the visible-query model before identity testing reveals a remount; late fallback creates duplicated history logic and stale requirements.

**Recommendation:** Make the first implementation tracer a production-build history spike around the consolidated real editor. Decide visible-query versus same-URL marker before the full focus surface. Keep one pure transition planner that supports the selected mode.

#### 2. The responsive single-host plan does not specify enough DOM/ARIA structure to prevent a different normal-mode regression

**Evidence:** V1 says to reuse a shared grid and force Notes visible on mobile while both desktop panels stay mounted, but leaves exact source order, tab IDs/controls, hidden behavior, breakpoint focus, and secondary-aside grouping unresolved.

**Why it matters:** One textarea count can pass while normal mobile source order, desktop tab semantics, or hidden focusability is wrong.

**Failure mode:** Mobile exposes a panel controlled by an invisible desktop tab, Digest's inactive Notes remains reachable, or breakpoint resizing moves focus into hidden content.

**Recommendation:** V2 must give exact responsive source order and tab/tabpanel semantics, distinguish mobile route navigation from desktop tabs, and require normal-mode keyboard/AT evidence before Focus enablement.

#### 3. The known IndexedDB failure can still lose the only current draft on later navigation

**Evidence:** `persistDraft` failure leaves React content updated but does not schedule autosave, while current UI warns not to close. V1 explicitly avoids a Focus-specific unload prompt but adds no global internal-navigation/second-Back/palette guard or durable state signal.

**Why it matters:** Focus Exit is safe; the next navigation may not be.

**Failure mode:** Journal put fails, content differs from the acknowledged server snapshot, user exits Focus, then navigates through Link/palette/Back and loses the in-memory-only edit.

**Recommendation:** Add an explicit journal-write-failed/latest-server-ack comparison. Mark the document unsafe only in that state. Guard later internal navigation, palette navigation, second Back, and beforeunload where supported; provide Copy/Retry/Leave behavior. Clear the marker after successful journal or server acknowledgement.

#### 4. Escape and nested-layer handling is not implementable as a generic hook without editor-owned callbacks

**Evidence:** Consent, delete confirmation, versions, conflict, recovery, and composition refs are private inside `ManualNoteEditor`. V1 assigns “deepest layer first” to the focus hook but does not define a callback contract. Current inline dialogs do not own Escape.

**Why it matters:** A generic document handler cannot safely infer which private editor state may close.

**Failure mode:** Outer Escape exits while a hidden/open child remains, dismisses a non-dismissible conflict, or ends IME composition.

**Recommendation:** Keep arbitration in `ManualNoteEditor` where state/composition are known. Disable Focus entry while consent/delete/versions is open; allow conflict/recoveries to stay visible. Pass a simple `requestExit` from the hook rather than exposing editor state to a provider.

#### 5. Inert/isolation and command-palette cleanup rely on a mutable document marker without failure containment

**Evidence:** V1 proposes a sibling walk and `data-note-focus-active` suppression but does not define exception rollback, an already-open palette, state changes during entry, or cleanup if the editor unmounts mid-transition.

**Why it matters:** A stale marker or partially applied inert state can leave the app inaccessible or permit a sibling overlay above Focus.

**Failure mode:** Entry throws after some siblings become inert; Exit cannot reach cleanup; command palette remains open or later refuses to open after Focus.

**Recommendation:** Isolation must be one transactional helper returning idempotent cleanup, with try/finally on partial failure. Close an open palette before activation through a content-free event/context; suppress new opens while active. Test pre-existing inert/aria values, injected exception, double cleanup, and unmount.

#### 6. Mobile keyboard behavior is still optional architecture despite being a P0 UX claim

**Evidence:** V1 says CSS first and `visualViewport` only if real-device testing proves necessary, without defining the geometry threshold or implementation seam.

**Why it matters:** Fixed/sticky behavior in Capacitor varies; retrofitting viewport offsets late can affect scroll restoration and action layout.

**Failure mode:** Action/status sits behind the keyboard or final line cannot scroll above it; first Android Back also exits Focus.

**Recommendation:** Define measurable geometry and a small viewport-offset hook/CSS variable seam from the start. Keep it disabled when CSS passes, but make fallback testable and cleanup-safe. Require real WebView first/second Back evidence before enablement.

### P2 - Medium Risk

#### 1. A root Focus provider is unnecessary unless contextual command entry ships

**Evidence:** The plan lists a provider as a possible boundary while also requiring exactly one editor and making contextual command entry optional.

**Why it matters:** A provider adds another state owner and rerender/cleanup surface without solving note persistence.

**Failure mode:** Local and provider focus state drift, or future code treats provider state as editor state.

**Recommendation:** Use a local `useNoteFocusSession` plus document-level content-free marker/event. Add a provider only if a concrete second consumer requires it and tests prove ownership.

#### 2. `itemId` in history state is unnecessary and expands the privacy/test schema

**Evidence:** The item identifier already exists in the path; V1 suggests also serializing it for validation.

**Why it matters:** Browser history state may be persisted; duplicate identifiers add no capability if path and owner token are checked.

**Recommendation:** Store only `{v:1, token}` under the namespace. Derive item path from `location.pathname`; reject markers off an item path.

#### 3. Feature-flag deployment wiring is not identified

**Evidence:** `src/lib/notes/flags.ts` has manual-note flags, but V1 does not name configuration documentation, remote env update, or flag-off/enable verification command. `scripts/deploy.sh` preserves remote configuration rather than authoring a new value.

**Why it matters:** Code can merge and deploy with no way to prove the flag is off/on in production or rollback it predictably.

**Recommendation:** V2 must include the flag in repository env/docs conventions, production configuration procedure, authenticated HTML/API smoke signals, and rollback evidence without exposing env values.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

- It calls rollback configuration-first while the prerequisite is not configuration-isolated.
- It postpones the framework/history feasibility decision until after architecture-dependent work.
- It treats “one editor” as enough without defining normal responsive DOM/tab accessibility.
- It recognizes a local-journal failure warning but never owns the later navigation hazard.
- It gives a generic hook responsibility for editor-private child/IME state.
- It assumes isolation cleanup will run normally instead of designing it transactionally.
- It lists browser/device/AT proof but does not establish a runnable evidence path.

## Missing Validation

- Production-build native-history tracer before full Focus implementation.
- Normal-mode one-host source-order/tab/hidden-focus audit with Focus flag disabled.
- Journal put failure followed by internal Link, palette, second Back, refresh, and close.
- Already-open palette, injected isolation exception, unmount, double cleanup, and stale marker tests.
- Real IME composition and allowed/disallowed child-layer matrix.
- visualViewport/action-bar/textarea geometry and Android keyboard-visible/hidden Back sequence.
- Flag-off/on production configuration and prior-artifact rollback rehearsal.

## Revised Recommendations

1. Sequence implementation as: red normal-host lifecycle test → single host → production history tracer → select history contract → focus helpers/surface.
2. Use a local focus hook and transactional isolation helper; avoid a provider unless contextual command entry ships.
3. Keep Escape/child arbitration in the editor and expose only a small focus-session exit interface.
4. Add a precise unsafe-draft signal and global navigation protection.
5. Make mobile keyboard geometry and rollback two first-class seams with test evidence.
6. Separate configuration rollback from previous-artifact rollback.

## Go / No-Go Recommendation

**NO-GO for implementation from v1.** Proceed only after technical plan v2 resolves both P0s, assigns the non-durable navigation risk, defines the normal-host DOM, chooses the early history tracer, specifies transactional cleanup and keyboard geometry, and names the evidence/rollback paths.

## Plan Revision Inputs

### Required Deletions

- Delete flag-only rollback language for shared-host risk.
- Delete the root provider as a default requirement.
- Delete `itemId` from history state.
- Delete generic-hook ownership of editor-private Escape/layer decisions.
- Delete “visualViewport only later” wording without a predesigned seam/geometry gate.

### Required Additions

- Separate shared-host and Focus rollback plans.
- Exact mobile/desktop single-host DOM/tab contract.
- First tracer for production-build History/DOM identity.
- Transactional isolation/cleanup and palette-close coordination.
- Unsafe non-durable navigation guard.
- Measured keyboard viewport seam and Android Back contract.
- Concrete flag configuration and browser evidence procedures.

### Required Acceptance Criteria Changes

- Distinguish controller identity from Write-mode textarea identity.
- Add one-host note GET/journal/channel counts and inactive-panel focusability.
- Split every history transition and selected/fallback contract.
- Add journal-failure navigation safety and marker-clear cases.
- Add partial-failure cleanup and already-open palette cases.
- Add keyboard geometry rather than screenshot-only criteria.
- Add configuration and artifact rollback evidence separately.

### Required Validation Changes

- Implement the browser history tracer before overlay code.
- Use direct DOM object markers, native undo/value checks, network observation, and state schema inspection.
- Run one-host regression in production build with Focus disabled.
- Inject isolation/journal failures and verify navigation/cleanup.
- Require real Capacitor/IME/AT evidence for enablement.

### Required No-Go Gates

- Shared-host regression cannot be removed through a rehearsed artifact rollback.
- Native query/state transition replaces the Write textarea/controller unexpectedly.
- Non-durable latest content can navigate away silently.
- Partial isolation/entry failure leaves app inert, hidden, scroll-locked, or palette-conflicted.
- Keyboard/action/final-line geometry fails or Android first/second Back is wrong.
- Feature flag cannot be proven off/on/rolled back in production.

## Residual Risks

Native undo and popstate remain browser-owned; WebView keyboard behavior varies; assistive technologies interpret in-place modal surfaces differently; and single-host consolidation changes normal rendering. These risks are acceptable only with the flag off until all evidence passes, previous-artifact rollback ready, and immediate rollback for identity, content, focus, or blocked-exit failure.
