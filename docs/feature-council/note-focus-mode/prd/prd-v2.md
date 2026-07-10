# **Note Focus Mode Global PRD**

**Team:** AI Brain, Personal Knowledge Management
**Author (PM):** Arun Prakash, drafted by Codex coordinator
**Triad Partners (Design, Engineering):** Expert UX/UI Designer; Technical Architect; AI Brain Feature Council
**Legal Contact:** N/A — private single-owner product; no new data processing or consent behavior
**Applicable Countries:** N/A — self-hosted private product
**Market Segments:** N/A — self-hosted private product

**Date last edited:** 2026-07-10
**Doc Status:** V2 — implementation source of truth
**Related Links:** [Discovery](../discovery.md), [Product Council](../council/product-council.md), [UX Direction](../council/ux-direction.md), [Technical Architecture](../council/technical-architecture.md), [PRD v1 adversarial review](NOTE_FOCUS_MODE_PRD_V1_ADVERSARIAL_REVIEW_2026-07-10_21-07-55_IST.md), [UX/UI v2](../ux/ux-ui-v2.md), [Decision Log](../DECISION_LOG.md)

---

# **Overview**

## **Context & Insights**

- The owner explicitly requested a distraction-free, substantially larger canvas for the existing My notes editor while keeping normal item detail as the default.
- Current-run evidence shows desktop My notes constrained to a 360px companion rail and mobile writing space reduced by item tabs plus fixed product navigation.
- The note editor already provides durable Markdown editing, local journal-before-save, autosave, conflicts, recoverable drafts, Preview, explicit Save/Copy, privacy disclosure, provider consent, and versions.
- The editor owns native and in-memory state that a route or duplicate editor cannot faithfully reconstruct: undo, selection direction, textarea scroll, editor identity, active timers, in-flight/coalesced saves, child state, and IME composition.
- Current responsive rendering can mount two editors for one item and desktop Digest unmounts Notes. Consolidating that lifecycle is a normal-mode structural prerequisite and has a separate artifact rollback contract.
- Focus Mode is a substantial client-shell/editor-lifecycle change with no backend/data-model change. It is not treated as a trivial CSS toggle.

## **Problem Statement**

My notes is trustworthy for quick capture but spatially constrained for sustained writing. Focus Mode must give the active note a substantially larger, calmer canvas while preserving the live editor session, making save/recovery state continuously trustworthy, and returning users to the normal item interface without loss. The mode must work through an app-controlled surface, not browser fullscreen.

---

# **Goals & Metrics**

## **Goals** *What are the key business and customer goals (quant or qual) of this project?*

1. Make My notes useful for sustained synthesis while leaving source-linked quick-note workflows unchanged by default.
2. Increase owner trust by proving that Focus is a reversible layout/history transition, not a second editor or save path.
3. Recover material desktop width and mobile height without hiding Exit, Save, active line, or failure/recovery state.
4. Preserve durable content and the feasible in-document editor state across every supported entry/exit/history/responsive transition.

## **Success Metrics**

### **Primary Metric**

- In a privacy-safe scripted long-form task using synthetic content, the focused editor provides at least 2× the normal 360px desktop writing width, removes item/product navigation from the mobile visual viewport, and supports a 500+ word edit/Preview/Save/Exit/re-entry flow with every trust question answerable: where am I, is the draft durable, can I save/copy, how do I exit, and what happens on failure.

### **Supporting Metrics**

- Every atomic P0 acceptance criterion in this PRD has explicit implementation evidence and automated, browser/manual, geometry, keyboard, or accessibility evidence.
- Exactly one editor controller/note load/journal owner/BroadcastChannel owner exists for the item. In Write mode, one textarea exists and retains object identity across supported same-document focus transitions.
- Focus entry/exit creates no note mutation, journal write without a content change, status reset, or extra note load.
- Zero P0/P1 normal-note, data-loss, accessibility, responsive, production-health, provider, or Recall scheduler regressions.
- V1 emits no external product analytics and no private note/editor data in URL/history payloads/logs/evidence.

## **Non-Goals**

- New editor model, WYSIWYG/contenteditable, toolbar/formatting redesign, multiple attached notes, highlight annotations, or source/note split.
- Database/API/IndexedDB schema, autosave cadence, conflict protocol, search, Related, Ask, semantic worker, provider consent, export, version, or retention changes.
- Browser Fullscreen API or browser-chrome control.
- Global/default Focus preference, automatic future Focus, or switching items while focused.
- New global Focus shortcut. Tab/Enter on the visible control is the v1 keyboard entry path.
- New analytics SDK/service. Future content-free events are not a release dependency.
- Guaranteeing native undo, caret, selection, or textarea scroll across hard refresh/new document. Durable server/journal recovery is the refresh guarantee.

---

# **User Personas / Stakeholders**

## **Users**

- **Primary — owner/researcher/writer** Persona:
  - Develops personal interpretation alongside captured sources.
  - Needs a larger canvas, visible durability state, and lossless return to context.
- **Secondary — mobile writer** Persona:
  - Writes with a software keyboard and intermittent connectivity.
  - Needs recovered vertical space, safe areas, predictable first/second Android Back, and visible final line/actions.
- **Stakeholders and decision owners:** owner/PM; coordinator; UX/accessibility reviewer; technical/reliability reviewer; release/operations owner.

---

# **Requirements**

## **Requirements**

| Priority | User Stories | Requirements | Dependencies | Mock ups & Prototypes |
| :---- | :---- | :---- | :---- | :---- |
| P0 | *As a user, I start in the familiar item experience.* | **NFM-001 Default:** Focus is deliberate, item-scoped, flag-gated, and never remembered globally. Normal Notes remains default. | Existing notes flags | Normal evidence |
| P0 | *As a user, I can find Focus without knowing a shortcut.* | **NFM-002 Entry:** Named Focus control with `Maximize2`, visible label at all supported widths, Tab/Enter activation, and a reason when disabled by an open management layer. | Editor header | UX v2 |
| P0 | *As a user, only one note session exists.* | **NFM-003 Controller:** Exactly one persistent `ManualNoteEditor`, note GET, active journal owner, and BroadcastChannel owner exist for the active item across normal mobile/desktop, Digest, Focus, and breakpoint changes. | Shared host | Browser/component evidence |
| P0 | *As a user in Write, my actual text control stays alive.* | **NFM-004 Textarea:** Exactly one textarea exists only in Write mode. Its DOM identity survives Focus, Exit, Escape, Back, Forward, orientation, resize, and breakpoint transitions that do not switch mode or reload. | Shared host/focus session | Object-identity evidence |
| P0 | *As a desktop/mobile user, the normal single-host layout remains correct.* | **NFM-005 Host semantics:** Mobile navigation precedes the shared Notes region; desktop article precedes companion; desktop tablist controls persistently mounted hidden panels; inactive panels are not focusable/AT-visible; Notes is forced visible on the mobile Notes route without a second node. | Item page/tabs | Keyboard/AT + screenshots |
| P0 | *As a writer, Focus gives materially more room.* | **NFM-006 Canvas:** Opaque app-level full viewport; centered wider writing column; mobile item/product nav covered; background isolated; no browser fullscreen; minimum focused editor area 12rem and target 40dvh after chrome. | Tokens/shell | Geometry + screenshots |
| P0 | *As a writer, essential controls stay available.* | **NFM-007 Trust chrome:** Exit, item identity, privacy/authorship, Write/Preview, toolbar, status/bytes, Copy, and Save remain reachable. Routine AI policy/versions/export/clear/delete are hidden only while focused. | Existing editor | State matrix |
| P0 | *As a writer, I can exit predictably.* | **NFM-008 Exit:** Persistent Exit, IME-safe Escape after deeper allowed layers, and Back exit Focus once. Exit is same-document, prompt-free, and does not wait for/save/mutate content. | Focus session/history | Transition evidence |
| P0 | *As a writer, relevant state is preserved.* | **NFM-009 Content/state:** Content, unsaved edits, editor controller, Write/Preview, status, notice, conflict/recovery, timers, in-flight/coalesced saves survive supported in-document Focus transitions. | Existing editor | Atomic traceability |
| P0 | *As a writer in Write, native editing state is preserved.* | **NFM-010 Native state:** Caret, forward/backward selection and direction, textarea scroll, page scroll, and native undo/redo survive supported same-document Focus/Exit/Back/Forward/responsive transitions. Preview mode is excluded from textarea identity but retains Markdown/controller state. | Browser runtime | Production-browser evidence |
| P0 | *As a user, URL history is predictable and private.* | **NFM-011 URL:** Focus URL may contain only the existing item path plus `tab=notes&note_mode=focus`; no token/private editor data. Preserve unrelated query params; source `mode=focus` wins. | History helper | Pure/browser tests |
| P0 | *As a user, Back/Forward/direct load/refresh work.* | **NFM-012 History:** Local entry pushes a namespaced state marker; Back exits; Forward re-enters valid owned entry; direct/refreshed query opens focus after reconciliation; unowned exit replaces marker; invalid/disabled markers normalize safely. No App Router focus navigation. | History helper | Production-build test |
| P0 | *As a user, loading never looks like an empty editable note.* | **NFM-013 Load:** Direct/refreshed Focus shows disabled loading; editing enables only after server/journal reconciliation. Failed/session states show actionable recovery and Exit. | Existing load | Failure evidence |
| P0 | *As a user, every save state remains trustworthy.* | **NFM-014 Save states:** Existing loading, device-saving, pending, saving, saved, offline, failed, session-expired, oversize, conflict, recovery, deleted/recreate, and IndexedDB-unavailable semantics remain unchanged and visible/actionable where applicable. | Editor state machine | One evidence row/state |
| P0 | *As a user with an expired session, I can restore syncing safely.* | **NFM-015 Unlock:** Session-expired Focus provides **Unlock to sync**, Copy, and Exit. Unlock returns to the focus URL; the durable local draft appears through normal recovery and is never auto-discarded. | Unlock/recovery | Browser flow |
| P0 | *As a user whose device journal failed, later navigation cannot silently lose my only copy.* | **NFM-016 Unsafe navigation:** When latest content is neither device-durable nor server-acknowledged, Focus Exit remains prompt-free, but later internal navigation/second Back/refresh/close is guarded where the platform permits, with Keep editing, Retry/Save, Copy, and explicit Leave behavior or browser-native equivalent. | Editor durability indicator + shell/palette guard | Failure/navigation suite |
| P0 | *As an IME/keyboard user, inputs have one arbitration order.* | **NFM-017 Input order:** IME → allowed child layer → software keyboard/platform → Focus → page navigation. Focus Escape ignores composition/229/ref; open palette closes before entry; Cmd/Ctrl+K is suppressed in Focus; no new focus chord. | Editor/palette | Real IME + keyboard tests |
| P0 | *As an assistive-technology user, Focus is contained and understandable.* | **NFM-018 Semantics:** Same section becomes an in-place modal semantic surface (`role=dialog`, `aria-modal=true`) without portal/duplicate. Item-aware heading labels it; background inert/aria-hidden restores exactly; focus contained/restored; allowed nested management dialogs cannot be open on entry. | Isolation/focus scope | Keyboard/VoiceOver/TalkBack |
| P0 | *As a narrow/zoom user, writing space remains usable.* | **NFM-019 Reflow:** At 320px/200%/400%, top Exit/title and bottom status/actions stay persistent; Write/Preview and wrapping toolbar scroll with content; no horizontal document overflow; focused editor retains ≥12rem height when visual viewport permits. | CSS geometry | Geometry + captures |
| P0 | *As a mobile user, the keyboard does not cover writing/action state.* | **NFM-020 Keyboard geometry:** Action bar lies within `visualViewport`; textarea bottom scroll padding clears bar+safe inset; active/final line can scroll above both bar and keyboard; selection/node survive keyboard/orientation changes. CSS first; measured visualViewport adjustment required if CSS fails. | Capacitor/WebView | Real-device geometry |
| P0 | *As an Android user, Back is predictable.* | **NFM-021 Android Back:** With keyboard visible, first Back dismisses keyboard without exiting Focus; next Back exits. With keyboard hidden, one Back exits. | WebView/history | Real-device evidence |
| P0 | *As owner, private writing stays private.* | **NFM-022 Privacy:** History state contains only `__brainNoteFocus:{v:1,token}`. URL/request/log/copied-link/telemetry deny note/title/selection/cursor/scroll/status/journal/mutation/clipboard data. | Helpers/privacy scan | Schema evidence |
| P0 | *As release owner, rollback is honest.* | **NFM-023 Rollback:** Focus presentation/history rolls back through `NOTE_FOCUS_MODE_ENABLED=0` + normal restart. Shared-host consolidation rolls back only through previous known-good artifact/commit unless independently gated; that artifact rollback must be rehearsed. | Deploy controls | Rollback evidence |
| P1 | *As a power user, I may want command-surface entry.* | **NFM-024 Context command:** Contextual command palette entry may ship only if it targets the single registered editor, closes palette before Focus, and passes overlay/unsafe-navigation tests. Otherwise defer. | Palette coordination | Optional |
| P2 | *As product owner, I may later measure use.* | **NFM-025 Future analytics:** Only content-free enter/exit method, coarse viewport, and duration bucket after a separate privacy-approved analytics foundation. | Future | Out of v1 |

---

# **Milestones / Sequencing Plan**

Sequencing is evidence-gated, not date-gated.

| MILESTONE | DESCRIPTION OF WHAT'S SHIPPING (Requirements) | TEST KITCHEN (Y/N) | LAUNCH TIER | GA DATE | JPD LINK |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Shared-host prerequisite** | NFM-003/004/005 normal-mode lifecycle fix; Focus flag off; normal desktop/mobile/Digest/save regression and artifact rollback proof | N | Tier 3 | After gates pass | N/A |
| **Flagged Focus Mode** | NFM-001/002/006–022, v2 UX/technical conformance, browser/device/AT traceability | N | Tier 3 | After gates pass | N/A |
| **Production release** | Full gate; flag-off deploy; normal smoke; enable; Focus/normal/mobile smoke; monitoring/wiki/log closeout | N | Tier 3 | After gates pass | N/A |

---

# **Additional Components & Resources**

## **Legal: Risk Checklist**

| Feature | Notes / Details | Included (Y/N) |
| :---- | :---- | :---- |
| **Card Saving** | Not applicable | N |
| **Card Linking** | Not applicable | N |
| **Loyalty Program** | Not applicable | N |
| **Guest Checkout** | Not applicable | N |
| **Toast User Auth** | Existing private PIN/session only; unchanged | N |
| **Marketing/Ads** | None | N |
| **Built-in consent mechanism** | Existing provider consent unchanged; cannot be open when entering Focus | N — no new consent |
| **Guest Book feed-in functionality** | Not applicable | N |
| **Digital Receipts** | Not applicable | N |
| **Feedback Loop to Merchant** | Not applicable | N |
| **Feedback Loop to Toast** | Not applicable | N |

## **Legal: Personal Data Processed**

| Information field | Is collection mandatory or voluntary? | Storage location | Storage: persistent or temporary? |
| :---- | :---- | :---- | :---- |
| No new personal-data field | N/A | N/A | N/A |
| Existing note Markdown | Voluntary; existing behavior | Existing private server + browser journal | Existing retention |
| `tab=notes&note_mode=focus` | Optional content-free presentation marker | Browser URL/history | Browser-managed |
| `__brainNoteFocus:{v,token}` | Content-free ownership marker | `history.state` only | Browser-managed |

## **Ideal User Experience**

### **User Flows**

1. Normal item/Notes opens as today through one persistent responsive editor host.
2. User selects Focus. If consent/delete/versions management is open, the button explains that task must be closed first.
3. Same editor expands into the in-place modal semantic surface; background is inert; URL/history marker is added without app navigation.
4. User writes/previews/saves and can resolve conflict/recovery or work offline with current semantics.
5. Exit/Escape/Back restores normal Notes and active session. Forward may re-enter.
6. Direct load/refresh reconciles durable state before editing. Session expiry provides Unlock to sync/Copy/Exit.
7. A non-durable latest edit may exit Focus but cannot silently leave the page without a targeted safety decision.

### **Wireframes / Mockups (Optional)**

No standalone prototype. The real component is the prototype; current-run normal screenshots and implementation Focus screenshots must be combined at identical viewports for visual judgment, while DOM/network/native-state claims use instrumentation.

## **Technical Considerations**

- One responsive editor/controller host is a release-blocking prerequisite.
- Same-node fixed surface and native History API; no route/portal/fullscreen.
- In-place modal semantics are distinct from a conventional portalled modal.
- Exact isolation/history cleanup, unsafe-navigation guard, keyboard geometry, and artifact rollback are P0.
- No data/API/provider/analytics dependency.

## **Risks & Mitigations**

| Risk | Impact | Likelihood | Mitigation |
| ----- | ----- | ----- | ----- |
| Shared-host regression survives Focus flag-off | High | Medium | Normal-mode gate + rehearsed previous-artifact rollback |
| Native history remounts editor | High | Medium | Production-build identity gate; same-URL state-only fallback |
| Non-durable edit navigates away | High | Low/Medium | Explicit durability state + navigation guard/Copy/Retry |
| Modal/nested management ambiguity | High | Medium | Disable entry during consent/delete/versions; real AT validation |
| Narrow/zoom chrome removes canvas | High | Medium | Scrolling toolbar/mode controls + 12rem minimum + geometry assertions |
| Mobile keyboard overlap/Back mismatch | High | Medium | Visual viewport contract + real Capacitor gate |
| Validation gives false confidence | High | Medium | Atomic evidence matrix; screenshots never prove DOM/native/AT claims |

## **Atomic Acceptance and Evidence Matrix**

Every NFM-001–023 row is independently pass/fail. The final traceability report records implementation path, automated evidence, browser/manual/geometry/AT evidence, status, and residual risk. Required cross-products:

- Entry: pointer, Tab/Enter, direct URL, Forward.
- Exit: button, Escape, Back, flag-off/invalid normalization, unmount/navigation cleanup.
- Mode: Write and Preview; identity claims scoped correctly.
- Save/recovery: all NFM-014 states; in-flight/coalesced; cross-tab.
- Viewport: 1440×900, 1024×768, 768×1024, 390×844, 320×700, 200%, 400%, orientation/breakpoint.
- Input/accessibility: keyboard-only, real IME, keyboard visible/hidden, VoiceOver, TalkBack.
- Privacy: URL, copied link, server request/log observation, history state, artifacts, future-event denylist.
- Rollback: Focus flag-off and previous artifact.

## **Supported Platform Matrix**

| Platform | Required evidence | Status boundary |
|---|---|---|
| Current production Chromium/Codex in-app browser | Full desktop/tablet/mobile production-build matrix | Required |
| Current production Capacitor Android WebView | 390px-class and narrow supported device, keyboard open/closed, first/second Back, orientation | Required for enablement |
| Chrome-compatible desktop keyboard | Native undo, selection direction, history, resize, zoom | Required |
| Safari/WebKit desktop and Firefox | Core entry/exit/save/history/inert smoke where available | Best effort; failures affecting standards contract block broad support claim |
| macOS VoiceOver + Chromium/WebKit | Dialog label/order/containment/status/focus restoration | Required when accessible in release environment |
| Android TalkBack + production WebView | Same, plus keyboard/Back | Required when accessible in release environment |

If a required physical-device/AT environment is unavailable, production enablement remains blocked; all other work continues and the exact smallest access requirement is reported.

## **Analytics & Events**

V1 adds none. Scripted owner-value and release evidence are synthetic/content-free. Future allowlist is NFM-025; all private fields are denied.

## **Assumptions**

- App-level chrome removal delivers the requested value without browser fullscreen.
- Focus can be disabled independently, but shared-host structural risk requires artifact rollback.
- Browser-owned native undo is supportable only when same Write-mode textarea/document survives.
- CSS keyboard handling is preferred but not assumed sufficient until geometry passes.

## **Open Questions**

No product decision remains open. The following are execution gates:

1. Whether Next preserves the editor for visible-query push/Back/Forward; use state-only same-URL fallback if not.
2. Whether CSS alone clears the production WebView keyboard; add measured visualViewport offset if not.
3. Whether required physical Android/AT environments are available for enablement.
