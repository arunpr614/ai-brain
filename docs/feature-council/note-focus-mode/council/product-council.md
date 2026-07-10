# Note Focus Mode — Product and AI Brainstorm Council

**Date:** 2026-07-10
**Council:** AI Expert Brainstorm Council; Product Manager — Growth/Engagement; Product Manager — Platform/Data; Product Manager — Power User/Workflow
**Status:** Recommended direction for PRD/UX/technical planning
**Decision:** **GO with a hybrid in-place application layout plus URL/history state. Do not use browser fullscreen or a conventional modal as the primary experience.**

## Executive Recommendation

Note Focus Mode should temporarily promote the **existing, live `ManualNoteEditor` instance** into a full-viewport writing surface. It should cover and make the surrounding application chrome inert without creating a second editor, changing the note's persistence model, or navigating to a separate editor route.

Pair that in-place presentation with a content-free URL/history marker:

```text
/items/:id?tab=notes&note_mode=focus
```

Entering focus updates local presentation immediately and pushes one browser-history entry without a server navigation. Browser Back exits. Refresh keeps the current item in note focus and reconstructs the editor from the existing server snapshot plus per-editor local journal. A direct/refreshed focus URL exits by removing `note_mode=focus` while staying on the item.

This hybrid resolves the central tension:

- route state gives Back, Forward, refresh, deep-link recovery, and testability;
- keeping the same component and DOM editor alive preserves unsaved content, autosave generation, IndexedDB journal, cursor/selection, undo history, and editor scroll far more reliably than a separate route.

The current note experience remains the default. Focus is always deliberate and item-scoped. The app should not remember a global “last mode,” auto-open future notes in focus, or switch notes inside the focused canvas in v1.

## Evidence From the Current Product

- The current attached-note editor is a 1,093-line client component with live server snapshot, per-editor IndexedDB journal, serialized autosave, optimistic conflict behavior, provider consent, formatting selection, Write/Preview state, versions, clear, delete, and local recovery (`src/components/manual-note-editor.tsx`). Remounting it is a material state-loss/regression risk.
- Desktop notes live in a 360 px companion rail behind `AI digest / My notes` tabs (`src/app/items/[id]/page.tsx:421-430`; `src/components/item-companion-tabs.tsx`). The editor is capable but cramped for sustained writing.
- Mobile gives Notes one of six item tabs and retains the bottom navigation. The editor's compact mode adds a fixed save/status bar above that navigation (`src/app/items/[id]/page.tsx:709-765`; `manual-note-editor.tsx:951-1009`). Hiding tabs and bottom navigation creates meaningful extra vertical space.
- The application already has a **different reading Focus Mode** at `?mode=focus`, which returns `FocusReadMode` instead of the normal item page (`src/app/items/[id]/page.tsx:242-252, 1564-1660`). Note focus must not overload that parameter or copy its server-branch/remount behavior.
- The existing reading Focus Mode proves the product vocabulary and reduced-chrome intent, but it does not implement Escape, in-place state preservation, or note editing.
- The editor currently preserves selection after formatting with `selectionStart`, `selectionEnd`, `focus()`, and `setSelectionRange()` and already owns `Cmd/Ctrl+S` (`manual-note-editor.tsx:487-508`). Focus Mode should build on those primitives.
- Current global shortcut conventions are minimal: `Cmd/Ctrl+K` opens the command palette, `Escape` closes it, and `Cmd/Ctrl+S` saves the note. There is no audited, collision-free dedicated focus chord.
- The product's analytics convention defaults to **no product analytics** and recommends local, content-free operational information only (`UX_v2/lightweight-specs/ANALYTICS-01-events-and-privacy.md`).
- Note content is fetched through private/no-store APIs and local recovery is already implemented. Focus Mode needs no database, API, search, AI, graph, or semantic-index schema change.

## Council Agenda

1. Identify who benefits and the moment Focus Mode becomes valuable.
2. Compare application-layout, route-based, modal, browser-fullscreen, and hybrid approaches.
3. Decide entry, exit, discovery, URL, Back, refresh, and last-mode behavior.
4. Define editor-state, autosave, offline, conflict, and navigation expectations.
5. Resolve keyboard and Escape conflicts.
6. Define desktop, tablet, mobile, split-screen, resize, accessibility, and reduced-motion behavior.
7. Decide analytics/privacy, rollout, rollback, and success signals.

## Option Comparison

| Approach | State preservation | Back/refresh | Mobile/browser reliability | Accessibility | Complexity | Council call |
|---|---|---|---|---|---|---|
| Application layout only | Excellent if the same editor stays mounted | Weak unless history is added; refresh loses mode | Strong | Strong if background is inert and focus order is managed | Low–medium | Good foundation, incomplete alone |
| Separate route/page | Weak by default; editor remounts and undo/selection can reset | Excellent | Strong navigation semantics | Conventional page semantics | Medium–high because controller state must be lifted/recovered | Rejected as primary |
| Conventional modal/dialog | Good if editor stays mounted | Back/refresh awkward; long sessions feel trapped | Risky with mobile keyboard and nested conflict/consent/delete dialogs | Focus trap is familiar but nested-dialog complexity is high | Medium | Rejected |
| Browser Fullscreen API | Editor can stay mounted | Browser-owned; Escape and refresh semantics inconsistent | Uneven in Capacitor/mobile; permission/user-gesture constraints | Browser behavior can surprise screen-reader/keyboard users | Medium with low product payoff | Rejected for v1 |
| Hybrid: in-place layout + URL/history | Excellent | Excellent when history is synchronized without navigation | Strong across web/Capacitor; no Fullscreen API dependency | Clear application mode with deterministic focus handling | Medium, narrowly scoped | **Recommended** |

### Why the recommended hybrid is not “route-based editor duplication”

The query parameter is a navigation contract, not a second rendering/persistence path. Entering focus must not call `router.push()` in a way that replaces the editor tree, render a second `ManualNoteEditor`, or create a new editor-instance journal. The current textarea, autosave controller, snapshot, local journal, conflict state, and undo history remain authoritative throughout entry and exit.

## Lens 1 — Product Manager, Growth and Engagement

### Position

**GO.** Focus Mode adds value when note writing moves beyond a quick takeaway into sustained synthesis. It increases the likelihood that saved content becomes personally processed knowledge, but only if entry is discoverable and exit is risk-free.

### Who benefits and when

- Users writing multi-paragraph reflections, decision logs, summaries in their own words, plans, or structured takeaways.
- Users revising a note over multiple sessions, especially when the 360 px desktop rail feels constrained.
- Mobile users whose note canvas currently competes with six item tabs, item navigation, toolbar, save bar, and bottom navigation.
- Users comparing a source and AI digest first, then intentionally switching into a pure writing phase.

Focus Mode is less valuable for one-line annotations. The normal editor remains the fast default and should never feel like a degraded “mini mode.”

### Discoverability

- Add a visible `Focus` action with a Maximize icon in the **My notes header**, next to Write/Preview or the note title—not in the item footer where the existing reading Focus Mode lives.
- Desktop shows icon + `Focus`; compact mobile may show the icon with the accessible label/tooltip `Open note focus mode`, retaining a 44 px target.
- Add the contextual command `Focus this note` to the existing `Cmd/Ctrl+K` palette when an item note editor is active.
- Do not show onboarding popovers, auto-prompts, or a default-on preference. The control itself is sufficient.

### Adoption and retention loop

```text
Review item → begin note normally → need more room → Focus → sustained writing → safe save/exit → retrieve the note later
```

The engagement win is not time spent in a fullscreen surface. It is more completed, revisited, searchable personal thinking with no loss of trust. The strongest success signals are focus sessions that include meaningful edits and safe returns to the normal item, not raw focus-entry counts.

### Growth caution

Do not remember Focus Mode across unrelated items or globally. Automatically reopening every note in focus turns a deliberate deep-work action into a surprising default and removes the source context that helps users start writing.

## Lens 2 — Product Manager, Platform and Data

### Position

**GO with no persistence-model expansion.** Focus Mode is presentation and navigation state. It should not add note columns, API fields, server sessions, new local-draft types, search/index behavior, or alternate save endpoints.

### State model

- Canonical focus state: `note_mode=focus` in the current item URL plus matching client state.
- On mobile, retain `tab=notes` alongside `note_mode=focus` so exiting returns to Notes.
- Do not reuse `mode=focus`; it already means source-reading Focus Mode.
- Do not persist a global preference in SQLite, settings, IndexedDB, or a cookie.
- Current URL/history remembers mode for the current navigation only. Refreshing that URL restores focus; opening another item starts normal.

### Back, Forward, refresh, and direct entry

- Entry pushes one history entry after local presentation state is ready.
- Back exits focus and preserves the same item/tab. Forward may re-enter.
- Exit button or Escape consumes only the focus history entry; it must not navigate to Library.
- If the page was loaded directly/refreshed with `note_mode=focus` and there is no known in-app focus entry to pop, exit removes the parameter with replacement and stays on the item.
- Hard refresh restores focus, canonical/dirty content, and Write/Preview mode. Cursor/selection and editor scroll restore best-effort only when the stored UI state matches the loaded editor generation/content hash.

### Data and privacy

- Reuse the existing per-editor journal for unsaved content. Do not write a second focus-mode draft.
- Optional session-only UI restoration may store item ID, mode, selection indices, textarea scroll position, and page scroll—never note text, title, snippets, or clipboard content outside the existing journal.
- Focus URL and analytics contain no note content, selection text, item title, or source URL.
- The service worker may cache the item shell/focus URL under existing policy, but note text remains client-fetched/private/no-store as it is today.

### Analytics convention

Default recommendation: no third-party product analytics. If the coordinator decides local evaluation is necessary, use aggregate/content-free local counters only:

- `note_focus.entered` — entry method `button|palette|url_restore`, viewport class;
- `note_focus.exited` — exit method `button|escape|back|item_navigation`, duration bucket, whether edits occurred;
- `note_focus.restore_failed` — state kind `selection|scroll|mode`, no indices or IDs;
- reuse existing note-save failure diagnostics rather than duplicating them.

Never log note text, title, item/source URL, cursor/selection values, scroll values, exact keystrokes, or a browsable item identifier. Because this is a single-user private app, quality gates and direct usability evidence are more valuable than a pseudo-statistical adoption target.

## Lens 3 — Product Manager, Power User and Workflow

### Position

**Strong GO**, conditional on keeping one editor instance alive and preserving the no-loss contract. A larger canvas is useful only if Focus Mode is faster and safer than manually resizing the textarea or using browser zoom.

### Writing surface

- Use the full visual viewport, cover global sidebar/item tabs/bottom navigation, and center a writing column around 760–920 px rather than stretching text edge-to-edge.
- Keep a minimal top bar: `Exit note focus`, truncated item title, Write/Preview, truthful save status, and Manual Save.
- Keep the Markdown formatting toolbar visible/sticky because it directly serves writing. Hide privacy/provider toggle, versions, export, clear, delete, tags, digest, Related, and other management actions until exit.
- The textarea owns the remaining height and may resize with the visual viewport. In focus it should not retain the normal `resize-y` affordance or companion-card border constraints.
- Preview remains available; switching back to Write restores the editor selection and scroll.

### Entry, exit, and editor-state preservation

- Entry must not remount, refetch, create a new journal, reset undo, or force a server save.
- Capture textarea selection, textarea scroll, Write/Preview state, and page scroll before layout change. Restore after the next layout frame.
- Exit preserves the exact local editor/controller state. Autosave continues uninterrupted; offline and failed-save status remain visible.
- Escape from the editor exits and leaves focus/caret in the normal editor. Activating the visible Exit button returns keyboard focus to the original Focus control while retaining the selection for the next editor focus.
- Page scroll outside the editor returns to its pre-focus position. Editor scroll remains where the user was writing.

### Keyboard path and conflicts

- Primary accessible keyboard entry is Tab/Enter on the visible Focus control.
- Power entry is `Cmd/Ctrl+K` → `Focus this note`; this reuses the only established global shortcut instead of inventing an un-audited browser/assistive-technology conflict.
- V1 should not claim `F`, `F11`, `Cmd/Ctrl+Shift+F`, or `Ctrl+Alt+F`. `F` types into the textarea; F11/browser chords invoke browser fullscreen; Control+Option/Alt chords can collide with assistive technology.
- `Cmd/Ctrl+S` continues to save. Focus Mode must not intercept it.
- Escape follows a strict stack: IME composition is never interrupted; then close the topmost menu/dialog/palette; only when no child layer is open does Escape exit note focus.

### Switching notes while focused

Do not add next/previous note switching or an item selector in v1. It adds navigation chrome and creates ambiguous cursor/scroll restoration. If the user chooses a global navigation command, the app ensures the current edit is locally journaled, exits focus, and navigates normally. The next item's note opens in normal mode.

## Resolved Council Questions

| Question | Decision |
|---|---|
| Who benefits? | Sustained writers, revisers, and mobile users; not required for quick notes. |
| How is it discovered? | Visible My notes header action plus contextual command-palette command. |
| How is it entered/exited? | In-place toggle; visible Exit; Escape; Back; no click-outside dismissal. |
| Remember last mode? | No global memory. Current URL/history only; refresh preserves current focus URL. |
| Layout, route, modal, fullscreen, hybrid? | Hybrid in-place layout + query/history. Not conventional modal; no browser fullscreen in v1. |
| Browser Back? | Exits one focus history entry without leaving the item. |
| Refresh? | Remains focused; restores content and UI state through existing journal plus best-effort content-free session state. |
| Switch notes while focused? | Not in v1; exit/normal navigation first. |
| Autosave/offline/failure? | Existing controller remains live; same status, journal, retries, conflict, Copy, and Manual Save. |
| Cursor/selection/scroll? | Same DOM instance; capture/restore around layout; hard-refresh restoration only if state matches content generation/hash. |
| Keyboard shortcut? | Keyboard-accessible button and Cmd/Ctrl+K command; no new global chord until audited. |
| Escape? | Close IME/child layer first; then exit focus. |
| Mobile/tablet? | Full visual-viewport app mode, safe-area/keyboard aware, no tabs/bottom nav, same editor state. |
| Small/split/resized windows? | Full available viewport, centered max-width canvas, no minimum desktop width, reflow at 200%. |
| Unsaved navigation? | Existing journal is authoritative; focus adds no destructive confirmation or false “saved” state. |
| Accessibility? | Announced application mode, visible exit, inert background, deterministic focus return, 44 px targets, no motion dependency. |
| Analytics/privacy? | No third-party analytics; optional content-free local aggregates only. |
| Performance? | No duplicate editor, fetch, journal, or backend work; presentation CSS/history only. |
| Rollout/rollback? | Separate default-off UI flag; staged web/Capacitor verification; rollback hides entry and ignores/removes query state with no data rollback. |

## Responsive and Accessibility Contract

### Desktop and wide screens

- Full viewport over the current item shell.
- Editor max width 760–920 px; generous horizontal padding; minimal sticky header and toolbar.
- Do not enter browser fullscreen automatically or hide browser controls.

### Tablet, split-screen, resized desktop

- Same mode, reflowing to available width without a desktop minimum.
- Toolbar wraps or moves secondary formatting into an accessible overflow; Exit, status, and Save never disappear.
- Resizing does not exit focus, lose selection, or reset scroll.

### Mobile/Capacitor

- Hide item tabs and bottom navigation while focused.
- Respect top/bottom safe-area insets and `visualViewport` changes.
- Keep Exit and save state above the software keyboard; do not overlay the current line.
- Android system Back should consume the focus history entry before normal item navigation. A visible Exit remains mandatory.
- Browser Fullscreen API is not used.

### Accessibility

- Announce `Note focus mode` once on entry and expose an `Exit note focus mode` control first in the focus header.
- The background shell is visually hidden from interaction and `inert`; Tab cannot reach covered controls.
- The main focus surface is an application region/page state, not an `aria-modal` dialog. Nested conflict, provider-consent, delete, and command-palette layers retain their own semantics.
- At 200% zoom, Exit, status, Save, mode switch, toolbar, and current editor line remain reachable with no page-level horizontal scroll.
- Motion is a short opacity/layout transition only; reduced-motion makes the change immediate. State preservation never depends on animation completion.

## Scope Recommendation

### P0 for v1

- Visible Focus entry in My notes and command-palette action.
- Same mounted editor/controller in normal and focused layouts.
- Minimal focused header, sticky formatting toolbar, large editor canvas, Write/Preview.
- `note_mode=focus` history/refresh behavior, distinct from source `mode=focus`.
- Exit by visible control, Escape hierarchy, browser Back, Android system Back.
- Cursor/selection, editor/page scroll, mode, unsaved journal, autosave, offline/error/conflict preservation.
- Desktop, tablet, split-screen, mobile/Capacitor, keyboard, screen-reader, zoom, safe-area, and virtual-keyboard behavior.
- Default-off feature flag, regression tests for the normal note experience, staged rollout, and content-free/no analytics decision.

### P1 follow-ups

- Optional audited direct shortcut if user demand exceeds command-palette access.
- Optional session “resume where I was” beyond current URL refresh.
- Optional browser fullscreen action on proven desktop browsers only.
- Optional note switching after a safe, low-chrome navigation design exists.
- Writing themes, text width/font controls, outline, word count, or timer.

### Non-goals

- Redesigning the editor, changing Markdown, autosave, note schema, AI/search/graph behavior, or privacy controls.
- Replacing or renaming existing source-reading Focus Mode.
- Automatically focusing every note, persisting a global mode preference, or treating Focus as a new item route/destination.
- Fullscreen API as a requirement.
- Multiple editors for the same note, split editing/source view, collaborative presence, or note-to-note navigation.

## Disagreements and Resolutions

### Route purity versus state preservation

- **Platform/Data** initially preferred a dedicated route for clean Back/refresh semantics.
- **Power User/Workflow** rejected remounting because the editor's selection, undo history, local journal identity, queued saves, conflict state, and scroll are live client state.
- **Resolution:** content-free query/history state without Next navigation; the editor remains mounted. Refresh reconstructs from canonical/journal state and accepts that caret restoration is best-effort.

### Remembering Focus Mode

- **Growth/Engagement** saw value in reopening frequent writers directly into focus.
- **Platform/Data and Power User/Workflow** judged this surprising across items and harmful to source context.
- **Resolution:** remember only through the current URL/history, never as a global preference.

### Dedicated shortcut

- **Power User/Workflow** wanted a single-chord toggle.
- **Growth/Engagement** prioritized discoverability; **Platform/Data** found no conflict-audited chord in current conventions.
- **Resolution:** visible button plus contextual `Cmd/Ctrl+K` command in v1. Revisit a direct chord after browser/assistive-technology testing.

### Browser fullscreen

- **Power User/Workflow** acknowledged maximum distraction removal.
- **Platform/Data** highlighted browser ownership of Escape, inconsistent mobile/Capacitor support, permission constraints, and unpredictable exit.
- **Resolution:** no Fullscreen API in v1. The application layout already delivers the needed canvas reliably.

### Mobile value

- **Growth/Engagement** questioned whether an already single-column Notes tab needs another mode.
- **Power User/Workflow** observed that removing six tabs, bottom navigation, container chrome, and management actions materially increases writing space and reduces accidental navigation.
- **Resolution:** mobile ships with the same feature, simplified to the visual viewport and tested with the software keyboard.

## Risks and Required Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `note_mode=focus` triggers a server navigation/remount | Lost undo/selection, new journal, save races | Use in-place state + History API; assert one editor instance/fetch/journal |
| Collision with existing source `mode=focus` | Wrong surface or broken Back behavior | Separate query key and explicit UI naming |
| Escape closes focus while conflict/palette/IME is active | Data loss or inaccessible child state | Central/topmost Escape ordering; composition guard |
| Covered app controls remain tabbable | Accessibility failure | Set background inert and restore it on every exit/unmount path |
| Mobile fixed bars cover the caret | Writing interruption | Visual viewport/safe-area positioning; real WebView/IME tests |
| Exit/back leaves the item | Trust/navigation regression | Focus-owned history marker and direct-load fallback |
| Refresh restores stale selection against changed content | Caret jumps to wrong place | Restore only when generation/hash matches; clamp indices; otherwise focus safely |
| Focus hides failed/offline save state | False confidence | Status and Manual Save are P0 header elements |
| Duplicate focus and normal editors | Conflicts and multiple autosaves | One component instance; no hidden duplicate |
| Large component grows harder to maintain | Regression risk | Technical plan separates focus presentation/state helpers without replacing save controller |
| Product analytics leaks behavior/context | Privacy regression | No third-party analytics; content-free local aggregates only if approved |

## Rollout and Rollback Recommendation

1. Add a separate default-off `NOTE_FOCUS_MODE_ENABLED` presentation flag; no migrations.
2. Validate the same-editor invariant, Back/refresh/direct-load history, Escape stack, cursor/selection/scroll, autosave, offline, conflict, and normal-mode regression in automated browser tests.
3. Enable for controlled desktop verification; compare 1280/1440 and split-window/200% zoom states.
4. Validate 320/390/600 px, physical Capacitor WebView, Android system Back, IME, selection handles, background/resume, safe areas, and keyboard covering.
5. Enable broadly only after zero note-content loss, duplicate editor, duplicate save, navigation escape, or hidden-status failures.

Rollback is presentation-only: disable the flag, stop offering entry, and normalize any `note_mode=focus` URL to the normal Notes item view. Existing notes, journals, APIs, search, AI, and database state are untouched. No data rollback or down-migration is needed.

## Decision Record

| ID | Decision | Status |
|---|---|---|
| NFM-PC-01 | Keep current note experience as default | Accepted |
| NFM-PC-02 | Use one mounted editor in an in-place full-viewport application layout | Accepted |
| NFM-PC-03 | Add `note_mode=focus` URL/history state without route navigation | Accepted |
| NFM-PC-04 | Preserve current URL focus on refresh; do not globally remember mode | Accepted |
| NFM-PC-05 | Browser Back, visible Exit, Escape hierarchy, and Android Back exit focus first | Accepted |
| NFM-PC-06 | No switching notes inside focus v1 | Accepted |
| NFM-PC-07 | No dedicated global chord in v1; use visible control and Cmd/Ctrl+K command | Accepted |
| NFM-PC-08 | Do not use browser Fullscreen API in v1 | Accepted |
| NFM-PC-09 | No backend/data/search/AI changes | Accepted |
| NFM-PC-10 | No third-party analytics; optional content-free local aggregates only | Accepted |
| NFM-PC-11 | Roll out behind a separate presentation flag with no data migration | Accepted |

## Final Council Call

**3–0 GO for the hybrid in-place layout + URL/history approach.**

- **Growth/Engagement:** GO because the feature supports deeper personal synthesis without changing the fast default.
- **Platform/Data:** GO because it is presentation-only, content-free navigation state with no new persistence or AI surface.
- **Power User/Workflow:** Strong GO if the exact same editor remains mounted and all save, cursor, selection, scroll, undo, and conflict state survives entry and exit.

The principal open risks are implementation risks, not unresolved product choices: preserving one editor instance while making the background inert; synchronizing History API state without a Next remount; ordering Escape against command palette/dialog/IME behavior; and proving mobile visual-viewport behavior. Any implementation that duplicates/remounts the editor or hides save failure is a no-go.
