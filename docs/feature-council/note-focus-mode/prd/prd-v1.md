# **Note Focus Mode Global PRD**

**Team:** AI Brain, Personal Knowledge Management
**Author (PM):** Arun Prakash, drafted by Codex coordinator
**Triad Partners (Design, Engineering):** Expert UX/UI Designer; Technical Architect; AI Brain Feature Council
**Legal Contact:** N/A — private single-owner product; no new data processing or consent behavior
**Applicable Countries:** N/A — self-hosted private product
**Market Segments:** N/A — self-hosted private product

**Date last edited:** 2026-07-10
**Doc Status:** V1 — adversarial review pending
**Related Links:** [Discovery](../discovery.md), [Product Council](../council/product-council.md), [UX Direction](../council/ux-direction.md), [Technical Architecture](../council/technical-architecture.md), [Decision Log](../DECISION_LOG.md)

---

# **Overview**

## **Context & Insights**

- My notes is a capable, durable Markdown editor with local journaling, autosave, conflict handling, Preview, exact-search behavior, and explicit AI-provider privacy controls.
- Desktop places it in a 360px companion rail. That supports quick comments but makes sustained synthesis cramped.
- Mobile gives Notes a full tab, but six item tabs and fixed product navigation reduce writing height.
- The application already uses “Focus mode” for source reading. That server-rendered branch establishes product vocabulary, but would remount the stateful note editor.
- The editor owns transient state that IndexedDB cannot fully reconstruct: native undo, selection direction, caret, textarea scroll, in-flight/coalesced save intent, child-layer state, and editor identity.
- Current responsive item detail can mount a CSS-hidden desktop editor and a mobile editor at the same time. Desktop Digest also unmounts Notes. A single responsive, persistently mounted editor is a prerequisite.
- Council recommendation is unanimous: app-level full-viewport focus on the same DOM editor plus a content-free URL/history marker. Browser Fullscreen API, a dedicated editor route, and duplicate modal editors are rejected for v1.

## **Problem Statement**

Users can write My notes reliably, but the normal item layout limits the canvas and keeps unrelated navigation and item controls visible. Note Focus Mode must create substantially more writing space while preserving the exact active editor session and every trust-critical saving/recovery state. The normal item experience remains the default.

---

# **Goals & Metrics**

## **Goals** *What are the key business and customer goals (quant or qual) of this project?*

1. Increase the usefulness of My notes for sustained synthesis without expanding the note data or AI-processing model.
2. Strengthen trust in AI Brain as a durable writing workspace by making layout changes lossless and reversible.
3. Give the owner a substantially larger, distraction-free writing canvas on desktop, tablet, and mobile.
4. Preserve note content, cursor/selection, textarea scroll, native undo, unsaved work, and relevant editor state across focus entry/exit and same-document Back/Forward.

## **Success Metrics**

V1 adds no external product analytics. Success is established through content-free acceptance and release evidence.

### **Primary Metric**

- 100% pass rate across the release-blocking state-continuity matrix: one editor/textarea; unchanged content; preserved selection/caret/scroll/undo; no focus-triggered note mutation; Back/Forward/Exit continuity.

### **Supporting Metrics**

- Focused textarea/canvas gains at least 2× the normal desktop companion width at a 1280px+ viewport and removes item tabs/product navigation from the active mobile viewport.
- Zero P0/P1 accessibility failures across keyboard-only, focus containment/restoration, 200%/400% zoom, reduced motion, and VoiceOver/TalkBack smoke checks.
- Zero regressions in the full automated suite, production build, normal Notes save/recovery/Preview/management behavior, source-reading Focus mode, health, providers, and Recall scheduler.
- Focus entry/exit causes zero additional note `PUT` requests and no additional editor/journal/BroadcastChannel owner.

## **Non-Goals**

- Redesigning the Markdown editor, toolbar, Preview renderer, formatting model, or save queue.
- Adding WYSIWYG/contenteditable editing, multiple attached notes, annotations/highlights, or source/note split-screen.
- Changing note storage, API contracts, migrations, search, embeddings, Related, Ask, provider consent, exports, versions, or retention.
- Using or requiring the browser Fullscreen API.
- Remembering focus as a global/default preference or auto-opening future notes in focus.
- Switching between items while focused.
- Introducing a general shortcut registry, global focus chord, or new analytics platform.

---

# **User Personas / Stakeholders**

## **Users**

- **Primary — owner/researcher/writer** Persona:
  - Captures articles, transcripts, PDFs, and notes; writes personal interpretations in My notes.
  - Needs long-form focus without losing source-linked context, drafts, or trust in autosave.
  - Most important because the product is private and single-owner; state loss would directly damage trust.
- **Secondary — mobile capture/review user** Persona:
  - Adds or develops thoughts on a phone/Capacitor app, often with the software keyboard visible.
  - Needs more vertical space, clear Save/Exit, predictable Android Back, and safe offline behavior.
- **Stakeholders:** owner/PM; UX/accessibility reviewer; technical/reliability reviewer; release/operations owner.

---

# **Requirements**

## **Requirements**

| Priority | User Stories | Requirements | Dependencies | Mock ups & Prototypes |
| :---- | :---- | :---- | :---- | :---- |
| P0 | *As a writer, I want the current item experience to remain familiar until I choose focus.* | **NFM-P0-001:** Normal item detail and My notes remain the default. Focus is deliberate, item-scoped, flag-gated, and never globally remembered. | Existing item page and manual-note flags | Current desktop/mobile evidence in `discovery/` |
| P0 | *As a writer, I want a clear way to gain more writing space.* | **NFM-P0-002:** My notes exposes a visible, named Focus control with a Lucide icon and keyboard-reachable Tab/Enter activation. | Existing My notes header | UX package v1 |
| P0 | *As a writer, I want focus to preserve my exact writing session.* | **NFM-P0-003:** Exactly one responsive, persistently mounted `ManualNoteEditor` and textarea exist. Entry, Exit, Escape, Back, Forward, resize, and breakpoint change do not remount or duplicate them. | Item layout consolidation; production-build DOM identity test | Technical plan v1 |
| P0 | *As a writer, I want a genuinely larger, calmer canvas.* | **NFM-P0-004:** Focus covers the shell in an opaque app-controlled full viewport, makes the background inert, centers a substantially wider editor, hides unrelated item/navigation/management chrome, and retains essential writing/trust controls. | Existing tokens, sidebar, editor | Real-component implementation captures |
| P0 | *As a writer, I want to exit quickly without losing anything.* | **NFM-P0-005:** A persistent Exit control, Escape hierarchy, and browser/Android Back exit focus. Exit returns to the normal Notes location and never requires a generic unsaved-work prompt. | History/isolation/focus helpers | UX package v1 |
| P0 | *As a writer, I want my text and editor state unchanged after focus.* | **NFM-P0-006:** Content, unsaved edits, cursor, selection/direction, textarea scroll, native undo/redo, Write/Preview, note status, notices, conflict/recovery, journal identity, timers, in-flight save, and coalesced save intent survive in-document focus transitions. | Existing editor refs/state | Automated + production browser tests |
| P0 | *As a user, I want Back, Forward, direct load, and refresh to behave predictably.* | **NFM-P0-007:** Focus uses `tab=notes&note_mode=focus` through native same-origin History API without App Router navigation. Back exits; Forward may re-enter; direct/refreshed focus reconciles note/journal before enabling editing; source `mode=focus` retains precedence. | History helper; Next.js identity proof | Technical plan v1 |
| P0 | *As a user, I want saving and recovery to remain trustworthy in focus.* | **NFM-P0-008:** Loading, device-saving, pending, saving, saved, offline, failed, session-expired, oversize, conflict, recoverable-draft, and IndexedDB-unavailable states remain visible/actionable. Focus adds no save path or focus-triggered mutation. | Current editor state machine | Failure-state traceability |
| P0 | *As a mobile user, I want focus to work with small screens and the keyboard.* | **NFM-P0-009:** Focus uses dynamic viewport and safe-area behavior, covers item tabs/product navigation, keeps Exit/Save/status visible, avoids horizontal overflow at 320px and zoom, and is tested with Capacitor keyboard/Back. | Mobile shell; real device/WebView | 390×844, 320×700, Android evidence |
| P0 | *As a keyboard or assistive-technology user, I want a true contained focus surface.* | **NFM-P0-010:** Focus has dialog semantics, a stable item-aware label, background inert/`aria-hidden` restoration, focus containment, visible focus rings, IME-safe Escape, and deterministic focus restoration. | DOM isolation helper; accessibility QA | UX package v1 |
| P0 | *As the owner, I want the privacy boundary unchanged.* | **NFM-P0-011:** No note content, title, selection, cursor, URL, mutation/journal ID, or clipboard data enters history or logs. No new API/schema/provider/analytics boundary is added. | Existing auth/privacy rules | Privacy gate |
| P0 | *As the release owner, I want safe rollout and rollback.* | **NFM-P0-012:** `NOTE_FOCUS_MODE_ENABLED` gates entry/restoration. Flag-off ignores stale markers and leaves ordinary Notes unchanged. Deploy flag-off, smoke, enable, smoke; rollback is flag-off/restart. | Existing guarded deploy | Release plan |
| P1 | *As a power user, I want Focus in the command surface.* | **NFM-P1-001:** Optionally expose a contextual **Focus on My notes** command only if it can target the single mounted editor and cannot open behind focus. A new global chord is not required for v1. | Command palette coordination | Deferred unless low risk |
| P2 | *As a writer, I may want source and notes together at a wider size.* | **NFM-P2-001:** Explore a separate adjustable source/notes split after Focus usage and reliability are established. | Future research | Not in v1 |
| P3 | *As a product owner, I may want adoption insight.* | **NFM-P3-001:** If a privacy-approved analytics foundation is later introduced, allow only content-free enter/exit method, coarse viewport, and duration bucket. | Future analytics platform | Not in v1 |
| P4 | *As a user, I may want browser chrome hidden too.* | **NFM-P4-001:** Reconsider browser Fullscreen only after demonstrated demand and platform/escape testing. | Fullscreen API research | Explicitly rejected for v1 |

---

# **Milestones / Sequencing Plan**

| MILESTONE | DESCRIPTION OF WHAT'S SHIPPING (Requirements) | TEST KITCHEN (Y/N) | LAUNCH TIER | GA DATE | JPD LINK |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Single-editor prerequisite** | Consolidate responsive/companion rendering; prove one persistent editor and normal Notes regression safety | N | Tier 3 — small visible enhancement with no new system/data workflow | 2026-07-10 target | N/A |
| **Flagged Focus Mode** | NFM-P0-001 through NFM-P0-012 behind `NOTE_FOCUS_MODE_ENABLED`, complete acceptance/visual/a11y evidence | N | Tier 3 | 2026-07-10 target | N/A |
| **Production release** | Flag-off deploy, normal-note smoke, enable, focus/Back/save/mobile smoke, docs/wiki closeout | N | Tier 3 | 2026-07-10 target | N/A |

---

# **Additional Components & Resources**

## **Legal: Risk Checklist**

| Feature | Notes / Details | Included (Y/N) |
| :---- | :---- | :---- |
| **Card Saving** | No payments surface | N |
| **Card Linking** | No payments surface | N |
| **Loyalty Program** | Not applicable | N |
| **Guest Checkout** | Not applicable | N |
| **Toast User Auth** | Existing private PIN/session boundary is unchanged | N |
| **Marketing/Ads** | No analytics, ads, or marketing | N |
| **Built-in consent mechanism** | Existing note AI/provider controls remain unchanged and outside focus chrome | N — no new consent |
| **Guest Book feed-in functionality** | Not applicable | N |
| **Digital Receipts** | Not applicable | N |
| **Feedback Loop to Merchant** | Not applicable | N |
| **Feedback Loop to Toast** | Not applicable | N |

## **Legal: Personal Data Processed**

| Information field | Is collection mandatory or voluntary? | Storage location | Storage: persistent or temporary? |
| :---- | :---- | :---- | :---- |
| No new field | N/A | N/A | N/A |
| Existing note Markdown | Voluntary; behavior unchanged | Existing private SQLite + browser recovery journal | Existing retention unchanged |
| Focus marker (`note_mode=focus`, version/token) | Optional presentation state; contains no note data | Same-origin URL/browser history | Browser-managed/transient |

## **Ideal User Experience**

### **User Flows**

1. User opens an item; normal My notes remains in the current companion/mobile tab.
2. User selects Focus. The same editor expands over the app, unrelated chrome becomes inert, and the URL gains the focus marker without loading a new route.
3. User writes, previews, formats, saves, goes offline/online, or resolves a conflict using existing behavior.
4. User selects Exit, presses Escape after deeper layers close, or uses Back. The normal Notes view returns with the same content and editor state.
5. Forward may re-enter. Refresh/direct load reconstructs a new document from durable server/journal state before enabling editing.

### **Wireframes / Mockups (Optional)**

No standalone prototype in v1. The council determined that the real component plus current-run desktop/mobile/reading-focus screenshots is a stronger source of truth. Implementation screenshots become the high-fidelity validation artifact.

## **Technical Considerations**

- Consolidate current responsive duplication before focus is enabled.
- Use same-node fixed styling, not a portal, route branch, or duplicate editor.
- Preserve Next history state keys; namespace only a versioned, content-free focus marker.
- Prove production-build textarea identity across native pushState/Back/Forward. If Next replaces the tree, fall back to a same-URL state-only history entry.
- Walk ancestor siblings to apply/restore prior `inert` and `aria-hidden`; do not inert the editor's ancestors.
- Lock and exactly restore body scroll; snapshot selection direction and textarea/page scroll in memory only.
- Keep current note autosave/recovery/concurrency code untouched except for layout-aware class/keyboard integration.
- Use a dedicated feature flag and configuration-first rollback.

## **Risks & Mitigations**

| Risk | Impact | Likelihood | Mitigation |
| ----- | ----- | ----- | ----- |
| Duplicate/remounted editor survives | High | High on current baseline | P0 single-host consolidation and one-instance/request/channel tests |
| Native history triggers Next remount | High | Medium | Production-build DOM identity gate; state-only same-URL fallback |
| Background remains keyboard/AT reachable | High | Medium | Tested inert sibling-chain isolation + focus loop + exact cleanup |
| IME Escape exits focus | High | Medium | `isComposing`/229/composition-ref guard and deepest-layer-first behavior |
| Mobile keyboard hides final lines/actions | High | Medium | `dvh`, safe areas, sticky action bar; real Capacitor validation |
| Focus hides save/recovery failure | High | Low after spec | Explicit persistent state matrix and traceability |
| Feature adds private telemetry | High | Low | No v1 analytics; privacy scan and content-free history tests |
| Layout consolidation regresses normal Notes | High | Medium | Land/test prerequisite flag-off; normal desktop/mobile/Digest regression suite |

## **Product Principles**

1. Same note, same editor, more room.
2. Trust state is not distraction.
3. Layout transitions never imply saving or navigation.
4. Default remains familiar; Focus remains deliberate.
5. Private writing stays out of URLs, history payloads, logs, and analytics.

## **Acceptance Criteria**

The twelve P0 requirement IDs are release blockers and must appear one-for-one in the final QA traceability report with implementation evidence, automated/manual test evidence, status, and residual risk. No P0/P1 accessibility or data-loss finding may be deferred.

## **Analytics & Events**

- V1: no product analytics events and no new SDK.
- Release observation: content-free DOM/request/status/console evidence only.
- Future allowlist: `note_focus_enter` / `note_focus_exit` with input method, coarse viewport, coarse duration. Explicit denylist: item ID/title, note content/length, selection, cursor, URLs, journal/mutation IDs, clipboard, error payload free text.

## **Assumptions**

- Current manual-note UI/write flags remain enabled in production.
- A fixed app overlay provides sufficient distraction reduction; browser chrome need not be hidden.
- Current production tokens and native textarea behavior remain the visual/interaction source of truth.
- Hard refresh cannot preserve native undo/caret/scroll; it must preserve durable content and recovery and must not overclaim in-document continuity.

## **Open Questions**

1. Does Next.js 16.2.9 preserve the client editor/textarea when the native History API changes the focused query and Back/Forward fires? This is a measured release gate, not a user decision.
2. Is CSS dynamic-viewport behavior sufficient in the production Capacitor WebView, or is a narrowly scoped `visualViewport` adjustment required? Decide from real-device evidence.
3. Can contextual command-palette entry be added without introducing a root coordination framework or nested overlay risk? Defer if not clearly low-risk.
