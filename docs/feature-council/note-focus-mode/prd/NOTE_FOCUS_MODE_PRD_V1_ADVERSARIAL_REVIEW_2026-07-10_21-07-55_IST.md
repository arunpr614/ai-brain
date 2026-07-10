# Note Focus Mode PRD v1 - Adversarial Review

**Created:** 2026-07-10 21:07:55 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `PROJECT/docs/feature-council/note-focus-mode/prd/prd-v1.md`
**Report path:** `PROJECT/docs/feature-council/note-focus-mode/prd/NOTE_FOCUS_MODE_PRD_V1_ADVERSARIAL_REVIEW_2026-07-10_21-07-55_IST.md`

## Executive Verdict

**NO-GO for using PRD v1 as an implementation or release source of truth.** One P0 release blocker, seven P1 risks, and three P2 gaps remain.

The central product direction is executable, but the document overstates rollback isolation, substitutes implementation pass rates for evidence of user value, and compresses dozens of trust-critical behaviors into compound requirements that cannot receive honest pass/fail status. It also leaves contradictory accessibility, shortcut, Android Back, URL/privacy, Preview, and unsafe-navigation contracts unresolved.

PRD v2 may proceed after the P0 is removed and every P1 is converted into an atomic requirement or an explicit, evidence-backed resolution. Implementation should not begin from v1 merely because the council selected the same-node approach.

## Evidence Inspected

- Goal objective: `local goal objective`.
- Discovery report: `PROJECT/docs/feature-council/note-focus-mode/discovery.md:1-120`.
- Discovery screenshots: `current-desktop-notes-2026-07-10.png`, `current-mobile-notes-390x844-2026-07-10.png`, and `current-reading-focus-mode-2026-07-10.png` under `PROJECT/docs/feature-council/note-focus-mode/discovery/`.
- Product council: `PROJECT/docs/feature-council/note-focus-mode/council/product-council.md:1-336`.
- UX council: `PROJECT/docs/feature-council/note-focus-mode/council/ux-direction.md:1-235`.
- Technical architecture council: `PROJECT/docs/feature-council/note-focus-mode/council/technical-architecture.md:1-398`.
- PRD v1: `PROJECT/docs/feature-council/note-focus-mode/prd/prd-v1.md:1-214`.
- Current editor implementation: `PROJECT/src/components/manual-note-editor.tsx:55-1093`.
- Current item layouts and source-reading focus branch: `PROJECT/src/app/items/[id]/page.tsx:220-430,680-784,1564-1660`.
- Current companion tabs, command palette, root shell, note flags, and test scripts: `PROJECT/src/components/item-companion-tabs.tsx:1-52`; `PROJECT/src/components/command-palette.tsx:1-136`; `PROJECT/src/app/layout.tsx:52-95`; `PROJECT/src/lib/notes/flags.ts:1-25`; `PROJECT/package.json:14-21,159-202`.
- Adversarial-review instructions and template: `adversarial-review skill` and `adversarial-review report template`.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. The advertised flag rollback cannot roll back the feature's riskiest prerequisite

**Evidence:** The PRD makes single-host responsive consolidation a prerequisite and P0 requirement (`prd-v1.md:25,93,114-116,162-169`) while promising that `NOTE_FOCUS_MODE_ENABLED=0` leaves ordinary Notes unchanged and that rollback is only flag-off/restart (`prd-v1.md:102,169,182`). The technical council confirms that this prerequisite removes the mobile editor instantiation, restructures the responsive item layout, keeps Notes mounted behind Digest, and changes compact behavior (`technical-architecture.md:20,99-109`); it separately admits that a consolidation regression requires deploying the previous artifact, not toggling the flag (`technical-architecture.md:349-364`). Current code proves this is a structural change across two render paths and conditional companion mounting (`page.tsx:300-328,421-430,709-765`; `item-companion-tabs.tsx:13-48`).

**Why it matters:** The prerequisite directly changes the default experience the goal requires the team to preserve. A flag that hides only Focus entry/restoration cannot isolate normal desktop Notes, mobile Notes, Digest switching, editor loading, compact action-bar positioning, or breakpoint behavior after the consolidation lands.

**Failure mode:** The shared-host rewrite regresses the ordinary Notes tab, mobile action bar, Digest panel, breakpoint layout, focusability of hidden content, or editor lifecycle. Production smoke fails; setting the Focus flag off and restarting leaves the regression live. Operators follow the PRD's rollback and falsely believe the risky change has been removed.

**Recommendation:** PRD v2 must choose one truthful release contract: either (a) independently gate the shared-host consolidation and prove both old and new normal layouts can be selected safely, or (b) explicitly classify previous-artifact/commit deployment as the rollback for consolidation and make it a rehearsed release gate. Replace “flag-off leaves ordinary Notes unchanged” with separately testable Focus-UI and shared-host rollback scopes. Do not release until the default normal experience passes before and after the consolidation and the applicable rollback has been exercised.

### P1 - High Risk

#### 1. The success metrics measure build correctness, not whether the product solves the writing problem

**Evidence:** The stated goals are sustained synthesis, trust, and a larger distraction-free canvas (`prd-v1.md:38-41`), but the primary metric is a 100% test-matrix pass rate and the supporting metrics are pixels, defect counts, suite status, and network/component invariants (`prd-v1.md:43-56`). The discovery screenshots and audit establish that 360px desktop width and mobile chrome constrain space (`discovery.md:20-22,54-63`), but no evidence establishes that the owner will write more effectively, prefer Focus over ordinary Notes, or consider the additional controls/transition cost worthwhile. The product council explicitly says the engagement outcome is completed, revisited personal thinking rather than raw entry or time (`product-council.md:85-95`).

**Why it matters:** A technically perfect mode can still be a low-value feature. A two-times-wider textarea is an output specification, not evidence that distraction is reduced or that sustained synthesis improves. The implementation carries meaningful structural and accessibility risk, so value cannot be assumed from available pixels alone.

**Failure mode:** The team completes a large layout/history/isolation project, passes every technical gate, and ships a mode that the single owner rarely uses or finds more cumbersome than the normal source-plus-note view. With no product outcome check, the release is declared successful anyway.

**Recommendation:** Keep external analytics out of v1, but add a privacy-safe owner validation protocol: complete the same representative long-form note task in normal and focused layouts at desktop and mobile sizes, then record whether writing space, distraction, trust-state visibility, entry/exit confidence, and preference meet predefined thresholds. Define one qualitative primary product outcome and keep the current matrix as release-quality gates, not the primary product metric.

#### 2. The acceptance section cannot truthfully certify the no-loss promise

**Evidence:** The acceptance section merely says the twelve P0 requirement IDs must appear one-for-one in a future traceability report (`prd-v1.md:192-194`). Those rows are compound: NFM-P0-006 combines content, unsaved edits, selection direction, scroll, undo, mode, notices, conflict/recovery, journal identity, timers, in-flight save, and coalesced intent (`prd-v1.md:96`); NFM-P0-008 combines twelve load/save/recovery states (`prd-v1.md:98`); NFM-P0-010 combines semantics, labeling, isolation, focus containment, rings, IME, and restoration (`prd-v1.md:100`). The “100% pass” matrix is not actually present (`prd-v1.md:49`). The repository declares only a Node test command and no dedicated browser/E2E command (`package.json:14-21`); its dependencies include jsdom and Chrome Remote Interface but no specified Focus test harness (`package.json:159-202`). The technical council correctly says jsdom cannot prove native undo, real Back integration, keyboard geometry, or assistive-technology behavior (`technical-architecture.md:299-339`).

**Why it matters:** One green status against a compound P0 can hide several untested or failed clauses. Native undo, DOM identity, visual viewport behavior, Back/Forward, and screen-reader containment are the exact properties most likely to fail outside unit tests.

**Failure mode:** QA marks NFM-P0-006 “passed” because content and caret survive one desktop Exit test, while backward selection, scroll, in-flight coalescing, Forward, breakpoint resize, or native undo remains broken. The traceability report looks complete but provides false confidence.

**Recommendation:** PRD v2 must atomize every P0 into independently traceable criteria and publish the state-transition × save-state × viewport/input matrix inside the PRD or an explicitly linked normative appendix. For each criterion, identify automation level, real-browser/manual evidence, environment, expected result, and release owner. Define the production-build browser harness before treating “100% pass” as a metric.

#### 3. The PRD exposes a real unsaved-data escape path when device journaling fails

**Evidence:** Current editing updates React content before asynchronous journal persistence; autosave is scheduled only after the journal write succeeds (`manual-note-editor.tsx:281-340`). Journal failure sets `localRecoveryAvailable=false` and returns no stored draft (`manual-note-editor.tsx:305-310`), leaving an explicit warning: “do not close this page with unsaved work” (`manual-note-editor.tsx:737-741`). PRD v1 requires IndexedDB-unavailable state to remain “visible/actionable” but never defines what action or navigation guard is required (`prd-v1.md:98`); it says focus exit never requires a generic prompt (`prd-v1.md:95`) and allows subsequent normal navigation (`prd-v1.md:150-155`). The UX council proposes a targeted guard for this exact device-recovery/server-unacknowledged case (`ux-direction.md:91-99,126-140`), while the technical council says that guard belongs on later page navigation, not focus exit (`technical-architecture.md:178-190`). The PRD assigns it nowhere.

**Why it matters:** Focus exit itself is same-document, but the user's next Back, palette navigation, item link, refresh, or close can discard the only in-memory copy. The goal explicitly requires preserving unsaved changes and considering navigation/error recovery (`goal-objective.md:13-23,111-117`). A warning without a required safe action is not a no-loss contract.

**Failure mode:** IndexedDB fails, the edit never enters the journal and autosave is not scheduled, the user exits Focus successfully, then navigates away believing the visible save system protected the draft. The content is lost.

**Recommendation:** Preserve unguarded Focus Exit, but add a P0 unsafe-navigation state: when the latest content is neither device-durable nor server-acknowledged, ordinary route navigation, a second Back, refresh/close where browser support permits, and command-palette navigation must present a targeted “Keep editing / Copy / Retry save / Leave” guard. Specify what happens when browser `beforeunload` text cannot be customized and require recovery-copy evidence.

#### 4. The accessibility model is contradictory and unvalidated against nested dialogs

**Evidence:** PRD v1 mandates dialog semantics and `aria-modal=true` (`prd-v1.md:100`). Discovery and UX/technical councils agree (`discovery.md:87-95`; `ux-direction.md:161-171`; `technical-architecture.md:221-232`), but the product council explicitly says the focus surface is an application region/page state and **not** an `aria-modal` dialog (`product-council.md:217-223`). Current editor content can itself render provider-consent and delete elements with `role="dialog"` (`manual-note-editor.tsx:832-851,1079-1089`), so the outer modal decision creates a nested-dialog model that none of the acceptance criteria define or validate.

**Why it matters:** This is not editorial wording. It changes screen-reader announcements, focus trapping, nested-layer behavior, Escape ordering, and how the app restores focus. Implementers can follow different council briefs and all claim compliance.

**Failure mode:** The outer surface announces as modal while an inline consent/delete “dialog” appears inside it without a separate focus scope; screen-reader and keyboard users encounter ambiguous landmarks or a focus dead end. Alternatively, an implementer follows the product council and omits modal semantics, failing the PRD.

**Recommendation:** PRD v2 must select one semantic model through an accessibility spike with the real editor and nested states. Record the rejected model and evidence. Define role/label/description, initial focus by entry method, containment, nested-dialog behavior, Escape priority, and restoration. Do not use “dialog semantics” as a proxy for tested accessibility.

#### 5. The textarea-identity requirement is impossible in the current Preview lifecycle

**Evidence:** PRD v1 says exactly one persistently mounted editor **and textarea** exist and that transitions do not remount either (`prd-v1.md:49,93`). Current code renders the textarea only when `mode === "write"` and replaces it with the Preview subtree when `mode === "preview"` (`manual-note-editor.tsx:876-947`). The technical council uses the correct narrower invariant—textarea identity only “in Write mode” (`technical-architecture.md:69-75`)—and admits refresh necessarily creates a new textarea (`technical-architecture.md:149-156`). The PRD preserves Write/Preview state but does not state how direct Focus entry from Preview or Preview→Write during focus affects identity, undo, selection, and scroll (`prd-v1.md:96,150-155,207`).

**Why it matters:** An impossible criterion either blocks release forever or gets quietly weakened during QA. It also conflates persistent editor-controller identity with conditional DOM-node identity.

**Failure mode:** A user enters Focus from Preview; QA cannot find the required textarea. Or the user switches Preview→Write and receives a new textarea/undo stack, while the release report claims the same textarea survived all Focus transitions.

**Recommendation:** Split the contract: exactly one `ManualNoteEditor` controller/instance is mounted at all times; exactly one textarea exists only in Write mode; its DOM identity must survive Focus entry/exit, Back/Forward, resize, orientation, and breakpoint changes that do not switch mode or reload the document. Define selection/scroll snapshots across Write↔Preview separately and explicitly exclude hard refresh/native Preview remount from undo identity claims.

#### 6. The URL/history privacy contract contradicts itself

**Evidence:** NFM-P0-007 requires the focused URL `tab=notes&note_mode=focus` in browser history (`prd-v1.md:97`), while NFM-P0-011 literally says no “URL” enters history or logs (`prd-v1.md:101`). The personal-data table groups `note_mode=focus` and “version/token” together under same-origin URL/browser history (`prd-v1.md:138-145`). The technical council instead specifies that only the query marker enters the URL and a random token remains in `history.state`; the existing item identifier necessarily remains in the URL (`technical-architecture.md:128-147,249-257`).

**Why it matters:** The current wording is impossible to test and leaves room to place the owner token in the query string, where it can enter request logs, copied links, screenshots, and referrers. It also risks a QA check that fails every legitimate History API implementation because browser history necessarily contains a URL.

**Failure mode:** Different implementers serialize different markers, a token leaks into the URL, or the privacy gate is waived as nonsensical. Direct-load and Forward behavior then depend on state the PRD never defines precisely.

**Recommendation:** Publish a normative schema: URL may contain only the pre-existing item route plus `tab=notes&note_mode=focus`; `history.state.__brainNoteFocus={v,token}` may contain only version and random session token; neither contains note/editor state; logs must not record the full private query URL. Add tests for copied URL, server requests, history state, stale/wrong-version token, source-mode collision, and flag-off normalization.

#### 7. Global overlay and Back-key arbitration is incomplete and internally inconsistent

**Evidence:** The current command palette listens globally for `Cmd/Ctrl+K` and always toggles its own overlay (`command-palette.tsx:28-46,58-114`). PRD v1 makes a contextual palette command optional P1 but does not make suppression/closure of the existing palette a P0 behavior while Focus is active (`prd-v1.md:103`); generic containment in NFM-P0-010 is insufficient for a sibling overlay mounted after isolation (`prd-v1.md:100`). The technical council requires the palette not to open behind Focus and recommends suppression if nested behavior is unproven (`technical-architecture.md:234-247`). Separately, UX requires `Cmd/Ctrl+Shift+F` (`ux-direction.md:100-110`) while PRD and technical/product councils reject a new chord (`prd-v1.md:66,103`; `product-council.md:268-272`; `technical-architecture.md:243-247`). UX says Android Back dismisses the software keyboard first, then exits Focus (`ux-direction.md:91-97`), whereas NFM-P0-005 simply says Android Back exits (`prd-v1.md:95`).

**Why it matters:** Input priority is part of the data-safety and accessibility contract. A palette opening above/behind the focus surface can steal focus or navigate away; conflicting Back rules produce accidental exits; conflicting shortcut requirements guarantee inconsistent implementation and test plans.

**Failure mode:** `Cmd/Ctrl+K` mounts a second overlay outside the isolated subtree, Escape closes the wrong layer, or a palette navigation leaves a vulnerable draft. On Android, one implementation exits Focus while the keyboard remains active and another merely hides the keyboard, so tests and user expectations diverge.

**Recommendation:** Add one P0 input-arbitration table covering IME, nested editor layers, command palette, software keyboard, Focus, and page navigation. Require any open palette to close before Focus entry; suppress `Cmd/Ctrl+K` while focused unless a tested in-surface command design is deliberately adopted. Resolve and delete the `Cmd/Ctrl+Shift+F` contradiction for v1. Define Android hardware/system Back separately for keyboard-visible and keyboard-hidden states.

### P2 - Medium Risk

#### 1. “Presentation-only” obscures a structural normal-mode rewrite and its ownership

**Evidence:** The PRD repeatedly frames Focus as presentation-only/no new system behavior (`prd-v1.md:26,38,60-67,160-169,184-190`) but requires a single responsive editor host, persistent mounting behind Digest, history ownership, root-level coordination, background isolation, and command-palette arbitration (`prd-v1.md:25,93-103,162-169`). The current editor is created in two item-page branches and unmounted by companion-tab selection (`page.tsx:300-328,421-430,709-765`; `item-companion-tabs.tsx:13-48`).

**Why it matters:** Labeling this as a layout-only enhancement understates regression surface, review ownership, and release sequencing. It makes the same-day Tier 3 schedule look safer than the evidence supports.

**Failure mode:** Review concentrates on the overlay while normal responsive rendering, Digest switching, command-palette lifecycle, and root-shell cleanup receive inadequate review.

**Recommendation:** In v2, distinguish “no backend/data-model change” from “substantial client-shell and editor-lifecycle change.” Name owners for shared-host migration, focus/history, accessibility, mobile/Capacitor, and release rollback.

#### 2. Supported browser/device and zoom claims are broader than the normative matrix

**Evidence:** The PRD promises desktop, tablet, mobile, 200%/400% zoom, VoiceOver, TalkBack, and Capacitor behavior (`prd-v1.md:40,53-55,99-100`) but names only 390×844, 320×700, and Android evidence in the P0 requirements (`prd-v1.md:99`). It does not identify supported Chrome/Safari/Firefox versions, macOS versus iOS VoiceOver, tablet platform, Capacitor/WebView version, external keyboard behavior, or what “no horizontal overflow at zoom” means for browser viewport versus the editor's own scroll. The technical council contains a broader proposed matrix (`technical-architecture.md:314-339`), but the PRD does not adopt it normatively.

**Why it matters:** “Zero P0/P1 accessibility failures” has no stable denominator. Teams can test different environments and still claim the same metric.

**Failure mode:** Desktop Chrome passes, while Safari Back/history, Firefox dialog/inert, or Android WebView keyboard behavior fails after release because those environments were treated as optional.

**Recommendation:** Add a supported-platform table with minimum browser/WebView versions, viewport/zoom definitions, AT pairings, required versus best-effort cells, and evidence type. Make unsupported combinations explicit.

#### 3. The same-day milestone plan has no credible dependency or evidence budget

**Evidence:** All three milestones—single-editor prerequisite, flagged Focus, and production release—target 2026-07-10 (`prd-v1.md:110-116`). The same PRD requires production-build DOM-identity tests, real Capacitor keyboard/Back evidence, VoiceOver/TalkBack smoke checks, 200%/400% zoom, full-suite regression, flag-off deploy, enablement, and post-enable smoke (`prd-v1.md:49-56,93-102,112-116`). The repository has no declared Focus browser-test command (`package.json:14-21`).

**Why it matters:** An unsupported date encourages compression of the exact validation work intended to prevent note loss and accessibility regressions.

**Failure mode:** The team treats manual evidence, accessibility checks, or rollback rehearsal as documentation work to finish after implementation so the nominal GA date can remain green.

**Recommendation:** Replace the calendar promise with evidence-gated sequencing. Add explicit prerequisites, owner, estimated validation window, and stop conditions; set a GA date only after the browser harness and physical-device access are confirmed.

### P3 - Low Risk Or Polish

No P3 findings found. The defects are substantive product, trust, acceptance, and release issues rather than wording polish.

## What The Original Plan Or Work Gets Wrong

- It equates “no backend change” with low release risk, even though the feature requires a normal-mode responsive/editor-lifecycle rewrite and root-shell coordination.
- It promises flag-only rollback for a prerequisite that the flag does not remove.
- It treats test pass rate as the primary product metric and never tests whether focused writing is actually more useful to the owner.
- It calls twelve large requirement bundles acceptance criteria instead of defining atomic, executable outcomes.
- It claims textarea continuity in states where the current product deliberately renders no textarea.
- It leaves the only known non-durable-draft navigation path assigned to neither Focus nor normal navigation requirements.
- It chooses modal semantics without resolving the product council's opposite decision or validating nested dialogs.
- It describes URL/history privacy in mutually incompatible terms.
- It silently chooses among conflicting shortcut, command-palette, Escape, and Android Back proposals rather than recording a single normative arbitration order.
- It sets a same-day production target without proving browser-test infrastructure, real-device access, or rollback rehearsal.

## Missing Validation

- Owner-centered before/after writing task demonstrating that Focus improves sustained synthesis, not merely canvas width.
- A normative atomic state-continuity matrix covering entry method, exit method, Back/Forward, Write/Preview, selection direction, scroll, undo, breakpoint, and save/recovery state.
- A production-build browser harness and evidence format for DOM identity, native undo, request counts, History API, and query/state privacy.
- IndexedDB failure followed by Focus Exit and every subsequent navigation path, including a second Back, command palette, refresh, and close.
- Shared-host flag-off regression tests for desktop Notes/Digest switching, mobile tabs, action-bar placement, hidden-panel focusability, item changes, and editor load/channel counts.
- Accessibility validation comparing application-region and modal-dialog semantics with the real consent/delete/conflict states.
- Global overlay tests for palette already open on entry, `Cmd/Ctrl+K` while focused, nested layer Escape, IME, and cleanup after route/unmount exceptions.
- Android Back with software keyboard visible versus hidden, plus background/resume and orientation changes in the production WebView.
- Copied URL, server request/log, `history.state`, stale token, invalid marker, both focus parameters, and flag-off normalization checks.
- Named browser/WebView/AT coverage and explicit required/best-effort boundaries.
- Rehearsal of both configuration rollback and previous-artifact rollback for the shared-host consolidation.

## Revised Recommendations

1. Keep the selected same-node app-focus direction, but present it as a high-risk client lifecycle change with no backend migration—not as a trivial presentation toggle.
2. Separate the shared-host prerequisite from Focus UI in requirements, rollout, monitoring, and rollback. Make artifact rollback an explicit P0 if the prerequisite is not independently gated.
3. Replace the primary “100% pass” product metric with a single-owner qualitative outcome; retain zero-loss and accessibility matrices as release gates.
4. Atomize all P0 requirements and publish the full state/device/input matrix before implementation.
5. Define controller identity, Write-mode textarea identity, Preview behavior, and hard-refresh limitations independently.
6. Add targeted unsafe-navigation protection for the device-journal-failed/server-unacknowledged state while keeping Focus Exit itself prompt-free.
7. Resolve accessibility semantics through a real-component spike and document nested-dialog behavior.
8. Publish exact URL and `history.state` schemas plus collision, invalid-state, logging, and copied-link rules.
9. Publish one keyboard/overlay/Back arbitration table and delete conflicting v1 shortcut proposals.
10. Adopt an evidence-gated schedule and supported-platform table before assigning GA.

## Go / No-Go Recommendation

**NO-GO on implementation or release from PRD v1.**

**Conditional GO for PRD v2 drafting** when:

- the rollback contract truthfully covers the shared-host consolidation;
- all seven P1 findings have explicit v2 dispositions;
- requirements are atomic and mapped to a feasible validation environment;
- unresolved semantic/input choices are recorded as decisions, not left across conflicting council documents.

No production release should occur until every P0/P1 acceptance cell has evidence and the artifact rollback path has been rehearsed.

## Plan Revision Inputs

### Required Deletions

- Delete the claim that flag-off/restart alone rolls back all feature risk.
- Delete “100% pass rate” as the primary product success metric; retain it only after the matrix is fully enumerated as a release gate.
- Delete the unqualified statement that a textarea always exists and never remounts.
- Delete the ambiguous prohibition that no “URL” enters browser history.
- Delete the unresolved `Cmd/Ctrl+Shift+F` proposal from the v1 contract, or reverse the other council decisions with evidence; do not retain both.
- Delete the unsupported same-day GA commitment until validation dependencies are confirmed.

### Required Additions

- Add separate rollout/rollback contracts for shared-host consolidation and Focus presentation/history.
- Add a privacy-safe owner usability task and explicit product-value threshold.
- Add an unsafe-navigation requirement for device-journal failure plus server-unacknowledged content.
- Add a normative semantic/focus model, including nested consent/delete/conflict states.
- Add exact URL and `history.state` schemas.
- Add a command-palette/IME/nested-layer/software-keyboard/Focus/page-navigation arbitration table.
- Add a supported browser, WebView, viewport, zoom, keyboard, and assistive-technology table.
- Add normal-mode shared-host requirements for Digest/mobile tab behavior, hidden-panel inertness, and load/channel counts.

### Required Acceptance Criteria Changes

- Split NFM-P0-003 into controller-instance, Write-mode textarea, responsive host, hidden-panel, and no-duplicate-owner criteria.
- Split NFM-P0-006 by state property and transition; scope native DOM identity to same-document Write-mode transitions.
- Split NFM-P0-007 into entry push, Back, Forward, direct load, refresh, invalid marker, source-mode collision, flag-off, and exit normalization.
- Split NFM-P0-008 into one criterion per trust state and add the non-durable/latest-content navigation guard.
- Split NFM-P0-009 by viewport, keyboard visibility, safe area, orientation, and Android Back order.
- Split NFM-P0-010 by semantic role, label, initial focus, containment, nested layer, Escape/IME, focus restoration, zoom/reflow, and AT pairing.
- Split NFM-P0-011 into URL query, history state, request/log, clipboard/copied-link, and telemetry denylist checks.
- Split NFM-P0-012 into Focus-flag rollback and shared-host artifact rollback with separate evidence.

### Required Validation Changes

- Define and implement a production-build browser test command before relying on DOM/native-history metrics.
- Require object-identity, native undo, forward/backward selection, editor/page scroll, request count, journal owner, and BroadcastChannel evidence.
- Add an IndexedDB-failure navigation suite and manual copy/retry/leave evidence.
- Run the shared-host normal-mode regression suite with Focus disabled before enabling any focus code.
- Validate the chosen semantics with keyboard, VoiceOver, and TalkBack against nested editor states.
- Test palette and Escape priority at the root-shell level, not only inside the editor.
- Verify the exact URL/state privacy schema through copied links, requests, logs, Back/Forward, direct load, and stale markers.
- Rehearse configuration rollback and previous-artifact rollback in the target release environment.

### Required No-Go Gates

- Any ordinary Notes regression that remains after `NOTE_FOCUS_MODE_ENABLED=0`.
- Inability to restore the previous artifact when shared-host consolidation is implicated.
- More than one editor, note fetch, active journal owner, or BroadcastChannel owner for the active item.
- Any content loss or non-durable latest edit allowed to navigate away without a targeted warning/recovery path.
- Any same-document Focus transition that replaces the Write-mode textarea or resets native undo unexpectedly.
- Any hidden save/conflict/recovery state, false “Saved” indication, or focus-triggered note mutation.
- Any command palette/background control reachable behind Focus, focus dead end, IME cancellation, or unresolved nested-dialog behavior.
- Any required browser/WebView/AT cell without evidence.
- Any note/editor data or owner token entering the URL, logs, or copied links beyond the approved schema.

## Residual Risks

Even after v2 resolves these findings, native undo behavior remains browser-owned; mobile visual-viewport behavior varies by WebView and keyboard; History API integration may change with the pinned Next.js runtime; `inert`/focus-scope behavior may differ across assistive technologies; and a shared responsive host still broadens normal-mode regression surface. Those are acceptable only with explicit supported-platform boundaries, real-browser/device evidence, immediate artifact rollback, and no claim that hard refresh preserves native editor state.
