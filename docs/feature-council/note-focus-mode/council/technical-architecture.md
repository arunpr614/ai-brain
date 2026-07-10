# Note Focus Mode — Technical Architecture Council

**Date:** 2026-07-10
**Role:** Technical architect
**Status:** Recommended architecture for PRD and technical planning; no implementation in this artifact
**Decision:** Build an application-level, full-viewport takeover that keeps the existing editor component and textarea DOM node mounted. Pair it with a content-free URL/history marker implemented through the native History API, not a Next.js route transition. Do not use the browser Fullscreen API or a portal-based modal in V1.

## Executive decision

The simplest reliable design is a **hybrid of in-place layout state and shallow browser history**:

1. The current `ManualNoteEditor` remains the sole owner of note content, the local journal, autosave, conflicts, recovery, Write/Preview mode, selection, and the textarea.
2. Entering Focus Mode changes classes and accessibility state on that same mounted editor. It does not render a second editor, change its React key, move it into a portal, or call an App Router navigation API.
3. The focused editor becomes an opaque, fixed, full-viewport surface. Background siblings are made inert, body scrolling is locked, and the sidebar, item content, mobile tabs, bottom navigation, and command palette are unavailable until exit.
4. Entry adds `note_mode=focus` and, where required, `tab=notes` to the current item URL with `history.pushState()`. Back exits, Forward re-enters, and refresh restores the focus intent. The state object contains only a versioned marker and random token—never note text, selection, or a draft.
5. Exit reverses the presentation and history state without saving, clearing, or remounting. The existing 750 ms idle / 5 s maximum autosave, IndexedDB journal, and concurrency protocol remain authoritative.

This is a presentation feature. It needs no database migration, API change, alternate save endpoint, search/index change, or browser-fullscreen permission.

There is one release-blocking prerequisite: the current responsive item page can mount more than one editor for the same item. The mobile Notes branch creates a compact editor while the CSS-hidden desktop companion also remains mounted; switching the desktop companion from Notes to Digest also unmounts and later recreates the editor. Focus Mode must first consolidate these paths into one responsive, persistently mounted editor host. Otherwise URL restoration and active-owner selection are ambiguous and duplicate editors can create extra API reads, independent journal identities, and false cross-instance notices.

## Architectural evidence

### Existing shell and item layout

- `src/app/layout.tsx:52-95` is a server root layout. `CommandPaletteProvider` wraps a flex shell containing `Sidebar` and `<main>`. The main element reserves bottom space for the fixed mobile navigation.
- `src/components/sidebar.tsx:95-100, 255-304` implements the sticky desktop sidebar and fixed `z-40` mobile bottom navigation.
- `src/components/command-palette.tsx:35-46, 61-113` owns the global `Cmd/Ctrl+K` handler and a `z-50` overlay.
- `src/app/items/[id]/page.tsx:242-253` already has a route/server-branch reading mode at `?mode=focus`. That branch replaces the normal item tree with `FocusReadMode`; it is not safe to reuse for a stateful note editor.
- `src/app/items/[id]/page.tsx:300-430` renders separate CSS-responsive mobile and desktop branches. The desktop branch contains `ManualNoteEditor` inside `ItemCompanionTabs`.
- `src/app/items/[id]/page.tsx:709-765` conditionally renders a second compact `ManualNoteEditor` when the mobile Notes tab is selected. CSS `hidden` does not stop the desktop branch from mounting.
- `src/components/item-companion-tabs.tsx:13-49` conditionally returns either the note or digest node. Selecting Digest unmounts the note editor rather than merely hiding its panel.

### Existing editor state and persistence

`src/components/manual-note-editor.tsx:172-1093` is already the complete note controller and view:

- React state owns the server snapshot, Markdown content, Write/Preview mode, save status, recoveries, conflict, consent, delete/version panels, and notices (`:179-211`).
- A stable editor identity, `textareaRef`, IME composition ref, journal sequence, serialized journal promise, in-flight save flag, coalesced next-save intent, timers, and `BroadcastChannel` live in refs (`:179-211`).
- Initial load fetches the private/no-store note API and lists IndexedDB recoveries (`:224-258`).
- Every change is put into the per-editor IndexedDB journal before autosave is scheduled (`:281-343`).
- Autosave runs after 750 ms idle with a 5 s maximum, serializes one request at a time, coalesces later intent, detects offline state, and surfaces optimistic-generation conflicts (`:315-463`).
- `Cmd/Ctrl+S` already performs a manual save (`:503-508`).
- Formatting reads and restores native textarea selection (`:487-501`), and IME composition is explicitly tracked (`:895-916`).
- Compact mode currently fixes the status bar at `bottom-[72px]` to clear mobile navigation (`:951-1010`). Focus Mode must override this because the product navigation is covered.

These details make remounting expensive. A remount changes editor identity and can lose the native undo stack, cursor/selection, textarea scroll, in-memory conflict/recovery state, timers, and an in-flight/coalesced save. IndexedDB protects the draft, but recovery after a remount is not equivalent to preserving the active writing session.

### Current conventions

- The implemented global shortcut is `Cmd/Ctrl+K`; the editor owns `Cmd/Ctrl+S`. `DESIGN_SYSTEM.md:274-289` documents additional intended shortcuts, and `:315` mentions plain `F` for reading focus, but plain `F` is valid note input and must not be captured while editing.
- `UX_v2/lightweight-specs/ANALYTICS-01-events-and-privacy.md:9-28` defaults to no product analytics and prohibits raw private content in operational data.
- `src/lib/notes/flags.ts` already gates manual-note UI, writes, and the worker independently.
- `scripts/deploy.sh` runs type checking, linting, the Node test suite, environment/Recall gates, a clean standalone build, artifact checks, remote synchronization, service restart, authenticated health check, and provider/webhook checks. It also creates a verified SQLite backup.

## Alternatives considered

| Option | Benefits | Failure modes and cost | Decision |
|---|---|---|---|
| Layout state only | Same component and DOM node; lowest implementation cost; best state preservation | Back would leave the item unless a same-document entry is added; refresh would forget the mode | Use as the rendering foundation, but add shallow history |
| Dedicated route or App Router query navigation | Conventional deep link, Back, and refresh behavior | The current server branch pattern replaces the editor tree. Remounting loses native and in-memory state and creates a new local-journal identity | Reject |
| Portal/modal | Familiar modal layering and focus containment | Rendering the inline editor in a new portal target recreates portal content when the target changes; duplicating inline and modal editors creates two writers. Nested consent/delete/conflict surfaces also make a long-form modal stack brittle. [React documents portal recreation when the target changes](https://react.dev/reference/react-dom/createPortal) | Reject |
| Browser Fullscreen API | Can hide browser chrome and use the browser top layer | Requires transient user activation, can reject for policy/platform reasons, introduces asynchronous `fullscreenchange`/`fullscreenerror`, and lets the user agent terminate fullscreen. Escape is browser-owned and conflicts with app exit. The API does not solve editor state or app-chrome isolation. [Fullscreen standard](https://fullscreen.spec.whatwg.org/) and [MDN requestFullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen) | Reject for V1 |
| App focus plus browser fullscreen | Maximum pixels on supported browsers | Two independent mode state machines, partial-success states, ambiguous Escape, broader browser/device testing, and little added value after app chrome is removed | Reject for V1; reconsider only with validated demand |
| **In-place layout + shallow URL/history** | Same live editor and textarea; deterministic app behavior; Back/Forward/refresh intent; no permission or backend dependency | Requires careful History API ownership, background isolation, focus restoration, and a proof that Next does not replace the textarea on Back/Forward | **Recommend** |

The selected “hybrid” means application layout plus History API state. It does **not** mean application focus plus browser fullscreen.

## Required invariants

The implementation and tests should treat these as hard gates:

1. Exactly one `ManualNoteEditor` is mounted for the active item.
2. The editor component identity and, in Write mode, `textareaRef.current` are identical before entry, during focus, and after exit.
3. Enter/exit never changes `content`, creates a journal identity, clears a recovery/conflict, or calls the note mutation API.
4. The editor remains mounted while the desktop Digest tab is selected; the inactive panel is hidden and non-focusable rather than unmounted.
5. Note focus never reuses `mode=focus`, which belongs to source-reading focus.
6. Focus history contains no note content or transient editor data.
7. Browser Back exits Note Focus Mode before leaving the item; Forward may re-enter. A direct/refreshed focus URL exits by replacing its marker rather than navigating to an unrelated prior page.
8. The current note UI remains the default. Focus is item-scoped and is not remembered globally.
9. Existing autosave, offline journal, conflict, tombstone, and server concurrency semantics remain unchanged.
10. When the flag is off or the focus marker is invalid, the page safely renders the normal note experience.

## Recommended component boundaries

| Boundary | Responsibility | Explicit non-responsibility |
|---|---|---|
| `NoteFocusModeProvider` (new client provider near the root shell) | Own the one active focus owner `{ownerToken, itemId}`, expose activate/exit, set a document-level focus marker, arbitrate global overlays, and guarantee only one active owner | Never own Markdown, selection, save status, journal data, or a second editor model |
| `useNoteFocusSession` (new hook used by the editor) | Reconcile initial URL intent, shallow history, Back/Forward, entry/exit snapshots, Escape priority, body scroll lock, sibling isolation, and cleanup | Never fetch or save the note |
| `NoteFocusSurface` (small wrapper inside `ManualNoteEditor`) | Apply fixed/full-viewport classes, dialog semantics, focus sentinels, safe-area layout, and the persistent Exit control around the same children | Never portal or clone its children |
| `ManualNoteEditor` | Continue to own all note and editor state; expose its existing textarea ref to the focus hook; render Focus/Exit controls and focus-specific layout classes | No focus-specific API, storage, save queue, or draft format |
| `ItemCompanionTabs` and item-detail layout | Keep Notes and Digest mounted, expose the single note host in the appropriate responsive position, and ensure inactive content is `display:none`/non-focusable | No note-state synchronization between responsive copies |
| `CommandPaletteProvider` | Optionally register a contextual “Focus on My notes” command and suppress opening the global palette behind an active focus surface | No independent focus state or editor content |
| `src/lib/notes/focus-history.ts` (pure helper) | Parse/merge/remove `note_mode`, preserve unrelated query parameters and Next history state, version the marker, and decide push/back/replace transitions | No DOM or React state |
| `src/lib/notes/focus-isolation.ts` (small DOM helper) | Apply and exactly restore `inert`/`aria-hidden` to background siblings along the focused element’s ancestor chain; lock and restore document scroll | No visual layout or application routing |

The provider is coordination state, not lifted editor state. That keeps context updates rare and prevents every keystroke from rerendering the shell.

### Responsive single-editor prerequisite

Before enabling Focus Mode:

1. Remove the `ManualNoteEditor` instantiation from `MobileItemDetailTabs`.
2. Keep one shared companion/editor region mounted in the item page. On mobile it is visible only for `tab=notes`; on desktop it occupies the companion column.
3. Change the current desktop wrapper from an all-or-nothing `hidden ... md:grid` branch so its shared note region can appear below the mobile tab navigation while the desktop article and secondary companion panels remain hidden on mobile.
4. Change `ItemCompanionTabs` to keep both panels mounted. When Digest is selected, Notes becomes CSS-hidden and non-focusable; on mobile Notes is forced visible without creating a second React node.
5. Replace the `compact` fork that creates mobile-only behavior with responsive and `data-note-focus` styles on the one editor. Normal mobile retains its fixed status bar; focused mobile uses a sticky/safe-area bar at the actual viewport bottom.

This is a targeted layout consolidation, not a general item-detail redesign. It also repairs an existing durability risk independently of Focus Mode.

## State and navigation model

### Focus state machine

Use a small explicit state machine rather than loosely coupled booleans:

```text
normal -> entering -> focused -> exiting -> normal
             ^          |
             |          +-- popstate / Exit / Escape
             +-- initial focus URL after editor registration
```

`entering` captures the restore snapshot and activates isolation before focus is moved. `exiting` removes isolation, unwinds or replaces history, restores page scroll/focus/selection, then returns to `normal`. Repeated entry or exit is idempotent.

The provider rejects activation if another owner is already active. With the single-editor prerequisite this should not happen, but the guard prevents future nested or duplicate focus surfaces.

### URL and History API contract

Canonical focused URL:

```text
/items/:id?tab=notes&note_mode=focus
```

Rules:

- Preserve all unrelated query parameters (`capture_state`, `repair`, `highlight`, and future parameters).
- Do not reuse or mutate `mode=focus`. If both source `mode=focus` and `note_mode=focus` are present, source-reading mode wins and the note marker is ignored/removed when the normal item tree next renders.
- Entering from the mounted editor immediately activates local focus, then calls `history.pushState()` with the merged URL. Merge into the existing `history.state`; do not replace Next’s internal keys. Add only a namespaced, versioned marker such as `{ __brainNoteFocus: { v: 1, token } }`.
- The History API permits a state object and same-origin URL without loading the URL immediately; `popstate` returns the stored state. [MDN History.pushState](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)
- A `popstate` without the active marker exits focus. Forward to a valid marker re-enters after the editor is registered and ready.
- Exit from an entry created by the current mounted session calls `history.back()` once. Exit from a direct/refreshed focus URL uses `replaceState()` to remove `note_mode` while keeping the item and Notes tab, because Back may refer to an unrelated site/page.
- Do not use `router.push`, `router.replace`, a server action, or a link for focus transitions.
- Unmount/pathname change always runs isolation cleanup. It must not synthesize an extra Back after navigation has already left the item.

Next.js may observe native history changes. A production-build integration test must assert textarea object identity, editor instance identity, fetch count, and journal owner across push, Back, and Forward. If the framework version replaces the editor tree despite the native API, the safe fallback is a same-URL history entry containing only the marker (Back still exits, but refresh no longer restores focus). State preservation has priority over a visible query parameter.

### Refresh and direct entry

- The server must continue rendering the normal item-detail tree for `note_mode=focus`; it only passes initial focus intent to the single client editor.
- The focused frame may show the existing loading state, but it must not expose an editable blank before server snapshot/local recovery reconciliation completes.
- A successful load opens focus with the same save/recovery behavior as normal Notes.
- A failed load shows the current failed/session-expired/local-recovery UI inside the focus surface. Exit remains available.
- Refresh necessarily creates a new document and textarea. Preserve durable note content and local recovery, but do not claim that native undo, cursor, selection, or textarea scroll survive a hard reload. Those guarantees apply to in-document entry/exit, Back/Forward, and resize.
- Do not persist Focus Mode in a cookie, SQLite, note metadata, IndexedDB preference, or global localStorage setting.

## Preserving the live editor session

### Entry snapshot

Keep the following in memory only:

- triggering/active element;
- document scroll X/Y;
- textarea `selectionStart`, `selectionEnd`, and `selectionDirection` when in Write mode;
- textarea `scrollTop` and `scrollLeft`;
- whether the textarea was focused.

Changing focus mode must not change the textarea `value`, React `key`, parent portal, or editor ID. After the fixed layout settles, use `focus({ preventScroll: true })`, `setSelectionRange()`, and the saved textarea scroll values defensively. If entry came from the Focus button, move focus to the focus heading/Exit control rather than unexpectedly beginning text input; the saved selection remains available when the textarea is focused.

### Exit restoration

Remove fixed layout and inert state first, restore document scroll, then restore focus. If the entry element still exists, return focus to it. If the user entered while typing, refocus the same textarea and restore its selection and scroll. If neither target exists, focus the My notes heading or companion tab.

Use `useLayoutEffect` plus one animation frame for geometry-sensitive restoration. The default transition should be absent or opacity-only; never animate width/height of a 100 KB controlled textarea. Honor `prefers-reduced-motion` with an instant transition.

### Unsaved changes, autosave, and exit

Entry and exit are same-document layout changes, so they do not require a save or a generic unsaved-change confirmation. The editor remains mounted and the current journal/write promise continues. Specifically:

- do not clear the 750 ms/5 s timers;
- do not wait for an in-flight PUT before exiting;
- do not create a new mutation ID merely because layout changed;
- do not call `persistDraft` if content is unchanged;
- do not dismiss conflict, offline, oversize, failed, or session-expired states;
- do not add a focus-specific `beforeunload` prompt.

The only unsafe-exit case is a pre-existing device-journal failure combined with a server-unacknowledged draft. Because exiting focus does not navigate, even that state can safely return to normal Notes; a guard belongs on later page navigation, not on Focus Mode exit.

### Offline and concurrency behavior

No backend changes are necessary. The current client already:

- journals locally before scheduling server save;
- keeps editing enabled offline;
- retries on `online`;
- serializes one in-flight save and coalesces the next intent;
- uses epoch/generation compare-and-swap and idempotent mutations;
- keeps both versions on conflict;
- announces newer cross-tab saves through `BroadcastChannel`.

Focus Mode must leave those paths untouched. Required integration cases are: go offline while focused, enter/exit during an in-flight save, edit after a request is sent, receive a cross-tab generation while focused, resolve a conflict while focused, session expiry, oversize content, and local IndexedDB failure. Trust/recovery panels remain mounted and visible even when routine secondary actions are hidden.

## Layout and accessibility architecture

### Full-viewport surface

The existing editor `<section>` becomes the focus surface through conditional attributes/classes:

- `position: fixed; inset: 0; z-index` above command palette and mobile navigation;
- opaque tokenized background so no private source text or controls show through;
- `height: 100dvh` with safe-area padding and a `100vh` fallback;
- internal column layout with sticky Exit/status chrome and a centered writing column;
- editor/preview height fills the remaining viewport without replacing the textarea;
- mobile status bar changes from `bottom-[72px]` to the safe-area bottom because global navigation is covered;
- no horizontal document overflow at 320 px or at 200–400% zoom.

The overlay may cover shell chrome visually, but visual cover is insufficient for accessibility. On entry, walk from the focus surface to `<body>` and set `inert` plus `aria-hidden` on each sibling branch. Preserve previous values and restore them exactly on exit/unmount. Do not set `inert` on `<main>` because the focused editor is its descendant.

### Semantics and focus containment

- In normal mode keep the existing named section semantics.
- In focus mode add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the My notes/focus heading. Pass the item title only for visible context and labeling; never place note content in the label.
- Exit is the first focusable control and is always visible.
- Trap sequential focus within the active surface with stable sentinels or a tested focus-scope utility. Background `inert` remains the primary containment mechanism.
- Restore focus explicitly on exit.
- Retain the existing labeled textarea, formatting toolbar name, pressed states, safe Markdown preview, `aria-live="polite"` save status, and conflict alert.
- Do not announce mode changes and save status in the same live region. A concise one-time “Note focus mode” announcement is sufficient.
- Maintain visible focus rings, 44 px mobile targets, keyboard zoom/reflow, screen-reader reading order, and reduced-motion behavior.

The project already depends on Radix Dialog, but using it for the outer takeover would normally portal/reparent content. A small in-place focus scope is safer than configuring a modal primitive around this stateful textarea. Existing inline consent/delete elements should not become nested modal portals as part of this feature.

### Escape and keyboard arbitration

Handle Escape at the focus controller in this order:

1. Ignore the event when `event.isComposing`, key code `229`, or the editor composition ref says IME composition is active.
2. Let an open dismissible child layer (help/menu, versions, consent, delete confirmation) handle Escape first.
3. Do not silently resolve or discard a conflict/recovery decision. A later Escape may exit focus while preserving that state.
4. Otherwise prevent default and exit focus once.

`Cmd/Ctrl+S` remains the editor’s save command. Native undo/redo, selection, word movement, spelling, and IME shortcuts remain browser/OS-owned.

For V1, the visible Focus button provides the reliable keyboard entry path through Tab/Enter. A contextual `Cmd/Ctrl+K` action is acceptable if the provider can register the single active editor and close the palette before activation. Do not capture plain `F` while an input, textarea, select, or contenteditable is active. Do not add `Cmd/Ctrl+Shift+F` until the product has an audited shortcut registry/help surface and browser/OS collision testing; the UX proposal can be staged behind that decision. Browser fullscreen shortcuts and `F11` are explicitly out of scope.

While focus is active, the global command palette must not open behind the modal surface. It may expose only a deliberate “Exit note focus” action if nested-overlay behavior is fully tested; otherwise its shortcut is suppressed until exit.

## Security, privacy, and data

- No schema, API contract, authentication, authorization, CSRF/origin, worker, vector, export, or retention change is required.
- The note APIs remain verified-session, same-origin, and `cache: no-store`.
- The focused URL contains only the existing item identifier and a mode marker. Note text, selection, cursor, scroll, save status, mutation IDs, and journal IDs never enter URL/history state.
- History state may be serialized by browsers, so store only a version and random owner token. Do not store the item title if it is not needed.
- Continue using the existing safe Markdown URL transform and image/table behavior. Focus Mode must not add raw HTML rendering or `contenteditable`.
- Background isolation prevents keyboard or assistive-technology activation of covered destructive/navigation controls. Restore `inert` and `aria-hidden` exactly to avoid leaving the app inaccessible after an exception.
- Client errors and any future telemetry must never log note content, item title, full URL/query, selection text, or clipboard content.

## Performance and maintainability

- No new runtime dependency is needed.
- Focus entry/exit should cause only the provider/shell and active editor wrapper to rerender; content remains in the existing controlled textarea.
- Do not render a duplicate hidden focus surface or duplicate Markdown preview.
- The inert-sibling walk is bounded by the shallow ancestor tree and runs only on enter/exit.
- Use CSS media queries and `dvh`/safe-area primitives rather than continuous JavaScript resize state. `visualViewport` should be used only if real-device testing proves CSS cannot keep the status bar above the software keyboard.
- Avoid width/height/scale animations and global `transition: all` on the editor.
- Keep history parsing, isolation, and focus-transition logic in small testable helpers. Do not expand `ManualNoteEditor` into a general editor framework or lift its content into application context.

## Analytics and operational monitoring

V1 should add **no product analytics**. The repository has no product analytics SDK and its documented privacy posture defaults to none. Focus Mode is presentation-only, so adding a telemetry service would be disproportionate and would create a new private-data boundary.

Release monitoring should use existing signals:

- authenticated `/api/health` and deploy checks;
- browser console/client error review during smoke testing;
- visible note save/offline/conflict state;
- existing operational logs for note API failures and conflicts;
- confirmation that focus entry/exit generates no extra GET/PUT requests.

If a future analytics foundation is approved, allowed events are content-free `note_focus_enter` and `note_focus_exit` with input method, coarse viewport class, and coarse duration bucket. Exclude item ID, item title, note length/content, URL, cursor, selection, and free text. Do not block this feature on those events.

## Verification strategy

### Unit tests

Add deterministic tests for pure helpers:

- merge/remove `note_mode` while preserving unrelated query parameters;
- source-reading `mode=focus` precedence;
- history transitions for local entry, Back, Forward, direct URL exit, repeated exit, and disabled flag;
- merge namespaced focus state without deleting existing Next history fields;
- reject stale/wrong-version/wrong-item markers;
- capture/restore selection direction, textarea scroll, and page scroll;
- shortcut filtering for editable targets and IME composition;
- sibling isolation preserves and exactly restores prior `inert`/`aria-hidden` values;
- provider rejects a second active owner and cleans up on unmount.

### Component/integration tests

Using the existing Node test runner plus jsdom/React DOM where practical:

- assert there is one `ManualNoteEditor`, one note API load, one BroadcastChannel, and one editor journal owner for the item;
- assert the same textarea object and editor instance ID before/during/after entry, Escape, Back, and Forward;
- assert switching Notes/Digest hides rather than unmounts the editor;
- assert entering/exiting performs no note PUT and does not reset status, Write/Preview, conflict, recovery, or queued-save state;
- assert an in-flight save can complete and a later edit is coalesced while focus is toggled;
- assert offline, failed, session-expired, oversize, conflict, and IndexedDB-unavailable states remain actionable;
- assert the command palette and background shell cannot receive focus while the surface is active;
- assert direct focus URL loading never shows an editable blank before reconciliation.

jsdom cannot prove native undo history, real browser Back integration, virtual-keyboard geometry, or assistive-technology behavior. Those remain real-browser gates.

### Production-build browser tests

Run against a production build, not only development mode:

- normal entry, Exit button, Escape, Back, Forward, direct focus URL, refresh, and invalid marker;
- pointer identity of the textarea across same-document transitions;
- selection (forward/backward), caret, textarea scroll, outer page scroll, and native undo/redo before and after exit;
- entry/exit while autosave is idle, saving locally, PUT in flight, offline, failed, conflicted, session-expired, and oversize;
- cross-tab save while focused;
- resize across the `md` breakpoint and orientation change without remount;
- source-reading `?mode=focus` remains unchanged;
- normal note editor, Digest tab, mobile Notes tab, save, recovery, preview, formatting, export, clear, and delete regressions.

Viewport/device matrix:

- 1440×900 desktop;
- 1024×768 small desktop/split window;
- 768×1024 tablet portrait;
- 390×844 mobile;
- 320×700 narrow mobile;
- Android/Capacitor with software keyboard visible and hardware/software Back;
- current Chrome, Safari/WebKit, and Firefox where available;
- light/dark theme, 200% and 400% zoom, reduced motion;
- keyboard-only, VoiceOver, and Android TalkBack checks.

Accessibility release blockers are: unreachable Exit/Save, focus escaping into covered UI, lost focus restoration, horizontal page scrolling at zoom, software keyboard covering the last editable line/status bar, or Escape ending IME composition.

## Rollout, deployment, and rollback

### Feature gate

Add `NOTE_FOCUS_MODE_ENABLED` alongside existing note flags. The control and initial URL restoration are enabled only when both manual-note UI and Note Focus Mode are enabled. When off, ignore/remove `note_mode=focus` and render the normal note experience. No cohort system is warranted for this private application.

### Rollout sequence

1. Land the single-editor responsive consolidation and its regression tests with the focus flag off.
2. Land the provider, history/isolation helpers, focus surface, and tests with the flag off.
3. Run typecheck, lint, the full Node suite, production build, normal-note regression, keyboard/accessibility checks, and the viewport matrix.
4. Deploy using the existing guarded `scripts/deploy.sh` path with the new flag off. Verify the normal note experience and API health.
5. Enable the flag in production and restart through the normal service process.
6. Run post-deploy smoke tests for normal editing, entry/exit, Back/Forward, refresh, selection/undo/scroll, offline/local journal, save, and mobile keyboard/Back.
7. Watch client/operational errors and note save/conflict behavior. Roll back immediately for editor remount, lost text/selection/undo, duplicate requests/editors, inaccessible background/focus, or blocked exit.

### Rollback

The first rollback is configuration-only:

1. Set `NOTE_FOCUS_MODE_ENABLED=0` and restart the service.
2. Confirm the Focus control is absent, a stale focus URL falls back to normal Notes, ordinary note editing/saving still works, and `/api/health` passes.

If the shared responsive-host consolidation regresses normal Notes, deploy the previous known-good application artifact/commit. There is no schema down migration, data repair, worker drain, or note rollback. Existing journals and server generations remain valid because Focus Mode does not change their format or protocol.

## Principal risks and mitigations

| Priority | Risk | Consequence | Mitigation / release gate |
|---|---|---|---|
| P0 | Multiple editor mounts remain | Competing journal identities, extra fetches, ambiguous URL restoration, false conflict notices | Consolidate to one responsive persistent host before enabling; assert one instance/request/channel |
| P0 | History integration triggers a Next remount | Lost undo/caret/scroll and new editor ID | Production-build DOM-identity test; fall back to same-URL state-only history if necessary |
| P0 | Exit or layout change mutates/saves content | Data loss or unexpected generations | Invariant tests: no value change, journal creation, timer reset, or PUT on entry/exit |
| P1 | Background is only visually covered | Keyboard/screen-reader users can activate hidden navigation/destructive controls | Inert sibling-chain isolation, dialog semantics, focus trap, and keyboard/AT gates |
| P1 | Escape conflicts with IME or child state | Lost composition or accidental exit | Composition guards and deepest-layer-first arbitration |
| P1 | Mobile status/editor is obscured by keyboard | Cannot see save state or final lines | `100dvh`, safe areas, sticky bar, real Capacitor keyboard/Back testing |
| P1 | Direct focus URL paints a blank editable note | User overwrites a recoverable/saved note | Keep loading disabled; reconcile snapshot/journals before editing |
| P1 | Compact and desktop behavior diverge | Breakpoint remount or inconsistent controls | One editor with CSS-responsive styles; resize-across-breakpoint identity test |
| P1 | Inert/scroll cleanup fails on exception/navigation | App remains inaccessible or frozen | Idempotent cleanup restoring exact previous values; unmount/path-change tests |
| P2 | Focus becomes a second editor product | Maintenance and behavioral drift | Reuse current textarea, toolbar, preview, status copy, recovery, and save controller; hide only secondary chrome |
| P2 | New analytics leaks private context | Privacy regression | No V1 analytics; content-free future allowlist only |
| P2 | Browser Fullscreen is added opportunistically | Escape ambiguity and platform fragmentation | Explicit V1 non-goal and no Fullscreen API calls |

## Recommended implementation order

1. Add tests that expose the current duplicate/unmounting editor behavior.
2. Consolidate item detail to one responsive, persistently mounted editor.
3. Add the flag and pure history/isolation helpers with unit tests.
4. Add the root coordination provider and command-palette arbitration.
5. Add the in-place focus wrapper, controls, state snapshot/restoration, and responsive styles.
6. Add component/integration coverage for DOM identity, autosave/concurrency, and accessibility isolation.
7. Complete production-build browser, responsive, keyboard, AT, offline, and failure-state verification.
8. Deploy flag-off, smoke normal Notes, enable, and complete post-release smoke/monitoring.

## Council conclusion

**GO**, conditional on the single-editor prerequisite and DOM-identity release gate.

The recommended design earns the larger writing canvas by changing only presentation and same-document navigation state. It preserves the current editor as the source of truth, preserves existing durability/concurrency/security guarantees, uses no new dependency or backend surface, works without browser fullscreen permission, and has a clean flag-based rollback. Any design that navigates to a new editor tree, changes portal target, or renders responsive/focused copies should be rejected even if its URL or modal implementation appears simpler.
