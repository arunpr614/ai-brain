# Note Focus Mode — UX Direction

Date: 2026-07-10
Status: council recommendation
Scope: focused writing and preview for an item's existing **My notes** document; no editor, persistence, or visual-system replacement

## Recommendation

Use a **full-viewport client overlay that keeps the existing `ManualNoteEditor` instance mounted**. Entering focus mode should remove the sidebar, original/digest context, item tabs, bottom navigation, AI settings, versions, export, clear, and delete from the visible workspace, while preserving the current note text, selection, undo history, local journal, autosave queue, conflict state, and Write/Preview mode.

The focused surface should be an enlarged version of the production editor—not a new writing product:

- a quiet Prism Memory background and one centered writing column;
- a persistent minimal top bar with `Exit focus`, item title, `My notes`, save state, manual Save, and overflow;
- the existing Write/Preview switch and Markdown formatting actions;
- an editor that consumes the remaining visual viewport;
- a compact persistent status/action bar on mobile, moved to the safe-area bottom after the product bottom navigation is hidden;
- critical recovery, privacy, save, quota, and conflict messages remain visible even when other secondary controls are hidden.

This gives materially more writing room without creating a second editor instance or weakening the feature's strongest quality: explicit, loss-resistant state.

## Evidence inspected

### Current production implementation

- `src/components/manual-note-editor.tsx:172-1093` owns canonical Markdown, local journaling, autosave, Save, conflict/recovery, Preview, AI policy, versions, clear, and delete.
- `src/components/manual-note-editor.tsx:504-508` already supports `Cmd/Ctrl+S` without interfering with normal typing.
- `src/components/manual-note-editor.tsx:693-735` defines the current My notes header, privacy disclosure, and Write/Preview control.
- `src/components/manual-note-editor.tsx:876-947` defines the labeled Markdown toolbar, native textarea, safe Preview, and selection-restoring formatting interaction.
- `src/components/manual-note-editor.tsx:951-1010` defines the save-status, Copy, and Save action group. Compact mode currently fixes this above the 64px mobile navigation.
- `src/components/manual-note-editor.tsx:1012-1090` contains secondary management actions that should stay outside focused writing unless needed to resolve a blocking state.
- `src/app/items/[id]/page.tsx:242-253` already dispatches a route-level source-reading focus mode.
- `src/app/items/[id]/page.tsx:328-430` shows the desktop constraint: source content plus a 360px companion column, with My notes inside `ItemCompanionTabs`.
- `src/app/items/[id]/page.tsx:700-765` appends Notes as the sixth mobile item tab; the focus design must not remove those tabs from normal item detail.
- `src/app/items/[id]/page.tsx:1564-1658` provides a useful minimal-chrome precedent for source reading, but it renders a separate server branch and is therefore not safe to copy literally for a stateful note editor.
- `src/components/item-companion-tabs.tsx:13-49` defaults the desktop companion to My notes and follows production tab, selected-control, and Lucide icon patterns.
- `src/components/sidebar.tsx:103-310` confirms the desktop shell and fixed 64px mobile bottom navigation that focus mode may temporarily cover.
- `src/styles/tokens.css` and `src/app/globals.css` establish Prism Memory surfaces, action/selected-control tokens, Inter/Charter/JetBrains Mono roles, semantic status colors, focus ring, reduced motion, and 68ch article width.

### Current visual evidence

- `docs/feature-council/F08-manual-content-notes/validation/IMPLEMENTATION_DESKTOP_EDITOR_2026-07-10.png` shows that the current 360px companion is effective for quick notes but cramped for sustained writing: toolbar wraps, the textarea is narrow, and secondary controls dominate the vertical rhythm.
- `.../IMPLEMENTATION_MOBILE_EDITOR_390x844_2026-07-10.png` shows the mobile editor working safely, but the six item tabs plus bottom navigation consume substantial height.
- `.../IMPLEMENTATION_MOBILE_EDITOR_320x700_2026-07-10.png` proves the toolbar and fixed status bar can survive 320px, while also showing why focus mode should hide non-writing navigation rather than further shrink controls.
- `.../IMPLEMENTATION_CONFLICT_DESKTOP_2026-07-10.png` confirms that conflict review is a blocking trust state and must remain available inside focus mode.
- `.../IMPLEMENTATION_MOBILE_PREVIEW_SAFE_2026-07-10.png` confirms Preview is part of the writing loop, not a secondary settings action.
- `UX_UI_DESIGN_PACKAGE/screenshots/web/desktop-item-focus.png` and `.../android/mobile-item-focus.png` are older, visibly unstyled export references. They support the idea of reduced chrome, but they are not visual truth for the current Prism Memory UI.

## Interaction/layout approaches considered

| Approach | Description | Strengths | Risks / costs | Verdict |
|---|---|---|---|---|
| A. Dedicated route/server branch | Add a note-specific sibling to the current `?mode=focus` branch and render a new full-page editor shell. | Clean URL/deep link; simple mental model; closely resembles existing source focus mode. | Remounting the editor can lose caret, native undo stack, transient local state, queued save intent, or create a second editor identity; it may produce false recovery/conflict affordances through `BroadcastChannel`; duplicates editor composition. | Reject for V1. The routing neatness is not worth state risk. |
| B. Full-viewport mounted overlay | Expand the currently mounted editor over the shell, make the background inert, and preserve the same editor instance. Reflect focus in browser history without navigating/remounting. | Best state preservation; strongest focus; reuses current component/tokens; browser Back can exit; responsive behavior is consistent. | Requires careful focus containment, history/back semantics, visual-viewport handling, and a mode-aware editor layout. | **Recommend.** Best balance of trust, usability, and visual continuity. |
| C. In-place expansion / adjustable split | Collapse the source column or let the note companion resize within item detail; keep some shell and item context visible. | Lowest conceptual change; user can reference source while writing; no modal semantics. | Does not deliver true focus; competing source/sidebar/nav remain; complex split behavior on tablet/mobile; resizing creates additional controls and persistence questions. | Keep as a future “wider notes” feature, not focus mode. |

## Recommended focused surface

### Desktop anatomy

1. Full viewport uses `--bg`; no decorative surface or new palette.
2. Sticky top bar, 56px minimum:
   - left: `Minimize2` + **Exit focus**;
   - center: pencil/lock provenance, **My notes**, truncated item title;
   - right: current save state, **Save**, overflow (`Copy`, then help/shortcut reference only).
3. Centered editor region, maximum 840px; use the current `--surface`, `--border`, `--radius-lg`, and no shadow except floating menus.
4. Write/Preview stays visible. The full toolbar fits on one row at normal desktop widths and remains sticky below the top bar.
5. The Markdown textarea grows to the remaining viewport and uses the current JetBrains Mono role, 14–16px size, and at least 24px line height. Do not switch to contenteditable or WYSIWYG.
6. Preview uses current `.article` behavior and a readable 68ch maximum rather than stretching across 840px.
7. The status/Copy/Save group remains visible. Advanced management (`Include in AI`, versions, export, clear, delete) is available after exit; it is not moved into the writing canvas.

### Minimal chrome rules

- Persistent controls: Exit, item identity, privacy/authorship, Write/Preview, formatting, save status, Copy, Save.
- Conditional persistent controls: Retry, re-authenticate, quota/oversize guidance, conflict actions, local-recovery failure, recoverable-draft choice.
- Hidden while focused: app sidebar, item source/digest, normal item actions, tags/topics/collections, mobile item tabs, product bottom navigation, AI toggle, versions, export, clear, delete.
- Do not auto-hide the toolbar or top bar; auto-hide would reduce keyboard/screen-reader predictability and make save state harder to trust.
- Do not use a full-screen icon without an accessible label and tooltip.

## Entry and exit

### Entry

- Add `Maximize2` **Focus** beside Write/Preview in the My notes header. Desktop shows icon + label; mobile may use the icon with `aria-label="Focus on My notes"` and tooltip/long-press label.
- Optional secondary entry: command palette action **Focus on My notes** when the current route is an item and Notes is available.
- Preserve textarea selection, scroll position, Write/Preview mode, status, and any open conflict/recovery state.
- If the textarea triggered entry, move focus back to the same selection after the overlay settles. If focus came from the Focus button, move focus to the editor heading, then allow Tab into the editor; do not unexpectedly begin text input.
- Add a browser-history entry for focus mode without causing a Next.js navigation/remount. Recommended URL state: `?tab=notes&note_mode=focus` so Back and refresh intent remain understandable.
- If focus URL is loaded directly, reconcile server and local journals first, then open focus. Never paint an editable blank before reconciliation.

### Exit

- `Exit focus` is always the first control.
- Desktop `Esc` exits only after closing deeper UI (format/help menu, conflict dialog, provider dialog) and only when IME composition is not active.
- Browser Back exits focus before leaving the item. Direct-loaded focus uses replace-to-Notes on exit rather than sending the user to an unrelated history entry.
- Android Back while the software keyboard is visible dismisses the keyboard first; the next Back exits focus.
- Successful exit returns to the same Notes tab/desktop companion, restores note scroll and selection, and returns focus to the Focus trigger.
- Do not show a generic “unsaved changes” confirmation when the device journal is acknowledged. Show a blocking confirmation only if device recovery is unavailable and current changes have not reached the server; default action is **Keep editing**.

## Keyboard behavior

| Shortcut | Behavior |
|---|---|
| `Cmd/Ctrl+Shift+F` | Enter/exit Note Focus Mode when My notes is active. Use a modified shortcut because plain `F` is valid note input. |
| `Esc` | Close the deepest open layer, then exit focus. Never exit during IME composition. |
| `Cmd/Ctrl+S` | Preserve the existing manual Save behavior. |
| Native editor shortcuts | Preserve browser/OS selection, undo/redo, word movement, spelling, and IME behavior. |
| `Tab` | Move through focus chrome/toolbar; inside the native textarea it follows the existing product decision (do not introduce indentation without a separate spec). |

Do not add global B/I/K/list handlers in this feature unless the normal editor gains and tests them first. Focus mode must not create a different Markdown editing contract.

## State preservation and history

- One mounted `ManualNoteEditor` instance is the hard requirement. Do not render a second focus editor and sync two React states.
- The local journal, editor instance ID, mutation ID, generation base, one-in-flight save queue, maximum autosave timer, conflict draft, and recovery list continue unchanged.
- Enter/exit must not trigger Save merely because layout changes. Existing 750ms idle / 5s maximum autosave remains authoritative.
- Resize, orientation change, theme change, and keyboard open/close preserve textarea selection and scroll.
- Background/app pause should flush the device journal and attempt the existing server save; it must not close focus.
- Hard reload at a focus URL reconciles first. If focus cannot reopen safely, fall back to the normal Notes tab with explicit local-recovery status rather than an error page.
- Preview/Write mode remains unchanged across focus entry/exit. Conflict or session-expiry state must not be dismissed by layout changes.

## Saving and error states in focus

Reuse `statusCopy()` exactly; do not invent focus-only meanings.

| State | Focus-mode treatment |
|---|---|
| Loading | Disabled skeleton/editor frame; announce `Loading note`. Do not show empty content. |
| Saving on this device | Visible polite status; Exit remains available, but guard only if the local write ultimately fails. |
| Saved locally / server pending | Visible at all times; keep editing and Save enabled. |
| Saving | Keep editing enabled; disable duplicate manual Save only while that generation is in flight. |
| Saved | Text + check; no celebratory toast or animation. |
| Offline | Pinned warning/status plus Copy; editor remains fully enabled. |
| Failed | Pinned `Save failed · retry available`, Retry, Copy; do not close focus automatically. |
| Session expired | Explain that the draft remains on this device; offer **Unlock to sync** and Copy. |
| Oversize | Keep editor usable; pin byte limit, Copy, and guidance to shorten. |
| Conflict | Expand the existing both-versions review above the editor. Desktop retains two columns; mobile stacks cards. Keep this draft / Use saved / Copy both remain visible. |
| Multiple recoverable drafts | Resolve the draft choice before normal writing; focus mode cannot hide or auto-select a draft. |
| Device recovery unavailable | Persistent alert; Save and Copy stay visible. Guard exit only when server has not acknowledged the latest content. |

`aria-live="polite"` should announce status transitions, not every keystroke. A newly surfaced conflict, session expiry, or device-storage failure uses a single alert announcement.

## Mobile and tablet

### Mobile (<768px / Capacitor)

- Focus overlay covers the six item tabs and fixed bottom navigation, recovering roughly 116px of vertical space visible in the 390×844 implementation evidence.
- Use `100dvh`/visual viewport behavior and safe-area padding; do not use a fixed 844px frame in production.
- Top bar target height 52–56px; all actions at least 44×44px.
- Keep Write/Preview and the most-used toolbar actions visible: Bold, Italic, Heading, bullets, numbered list, task list. Put strikethrough, quote, inline code, link, and rule in a labeled **More formatting** bottom sheet before reducing targets.
- Status/Copy/Save bar moves from `bottom-[72px]` to the safe-area bottom because product navigation is hidden. It must remain above the software keyboard and never cover the last editable line.
- Preview is independently scrollable and keeps safe-link/image/table behavior unchanged.
- Landscape uses the tablet pattern if width permits; otherwise keep single-column, compact chrome.

### Tablet (768–1023px)

- Use the same full-viewport overlay rather than the normal breakpoint's stacked item-detail layout.
- Center the editor at 720–840px, preserve 24–32px gutters, and show the complete toolbar when it fits.
- Do not introduce a source/notes split; that is Approach C and weakens the focus goal.

## Accessibility contract

- Treat the takeover as a full-screen modal view: `role="dialog"`, `aria-modal="true"`, labeled by `My notes — <item title>`, with the covered app shell made `inert` and hidden from the accessibility tree.
- Trap focus within the overlay, while still allowing browser/OS chrome and assistive technology commands. Restore focus to the Focus trigger on exit.
- If entry came from the textarea, restore its selection before focusing it. Do not place caret at the start or end arbitrarily.
- Preserve the current labeled textarea, `role="toolbar"`, named icon buttons, `aria-pressed` Write/Preview controls, status live region, alerts, and safe Preview semantics.
- Do not rely on color for saved/offline/error/conflict. Use existing icon + text + semantic token combinations.
- Keep desktop controls at least 32px and mobile controls 44px; use the existing 2px `--action-primary-focus` ring.
- At 200% zoom, the header may wrap to two rows but Exit and Save must remain visible; the document must not gain horizontal page scroll.
- Reduced motion collapses overlay transition to instant. Default motion, if used, is a single 150ms opacity/translate transition with `--duration-med` and existing easing—no scale/spring effect.
- Do not auto-hide chrome, announce character counts continuously, or trap screen readers inside the textarea.

## Visual-system mapping

| Focus element | Existing contract to reuse |
|---|---|
| Canvas | `--bg` / `--background` |
| Editor surface | `--surface`, `--surface-raised`, `--border`, `--radius-lg` |
| Primary Save | `--action-primary-bg`, `--action-primary-bg-hover`, `--action-primary-fg`, `--action-primary-focus` |
| Selected Write/Preview | `--control-selected-bg`, `--control-selected-fg`, `--control-selected-border` |
| Statuses | `--success`, `--warning`, `--danger` plus text/icon |
| UI text | Inter via `--font-ui` |
| Markdown source | JetBrains Mono via `--font-mono` |
| Preview | Existing `.article`, Charter stack, 68ch max |
| Icons | Existing Lucide `Maximize2`, `Minimize2`, `Pencil`, `LockKeyhole`, `Save`, `Copy`, status icons at 2px stroke |
| Spacing/motion | Existing 4px spacing scale, `--duration-fast/med`, `--ease-*` |

No new colors, gradients, illustrations, shadows, editor font, or standalone card language are warranted.

## Is a high-fidelity HTML prototype warranted?

**Not before implementation.** This is a constrained layout/state extension with unusually strong production evidence:

- the complete editor and state system already exists;
- current desktop, 390px, 320px, conflict, and Preview screenshots are available;
- source focus mode establishes the reduced-chrome precedent;
- the recommendation deliberately avoids changing editor behavior or visual language.

A separate HTML prototype would duplicate the production editor, cannot credibly reproduce its IndexedDB/save/conflict behavior, and risks becoming a false source of truth. The higher-value validation is a thin implementation spike using the real component, followed by browser captures and interaction checks at:

- 1440×900 desktop;
- 1024×768 small desktop;
- 768×1024 tablet portrait;
- 390×844 mobile;
- 320×700 narrow mobile;
- mobile with software keyboard visible;
- 200% zoom and dark/light themes.

Capture saved, local-only, offline, failed, session-expired, oversize, conflict, multiple-recovery, Write, and Preview states. A standalone prototype becomes warranted only if the team later considers changing the editor model (for example WYSIWYG/contenteditable), adding a source split, or introducing an auto-hiding toolbar.

## Acceptance criteria for the UX

- [ ] Entering and exiting focus never remounts or duplicates `ManualNoteEditor`.
- [ ] Text, selection, scroll, native undo, Write/Preview, conflict/recovery, and save queue survive entry, exit, resize, and orientation change.
- [ ] Browser Back exits focus before leaving the item; Android Back dismisses the keyboard first.
- [ ] Exit, status, Copy, and Save remain visible at all supported viewports and 200% zoom.
- [ ] Mobile focus hides item tabs and bottom navigation, uses safe areas, and leaves no horizontal page overflow.
- [ ] Critical local-recovery, offline, failed, session-expired, oversize, and conflict states remain actionable.
- [ ] Focus mode does not add a different Markdown or keyboard-formatting contract.
- [ ] Background content is inert, focus is contained/restored, and all controls retain semantic names and production focus styling.
- [ ] Visual styling uses only current Prism Memory tokens, typography, radii, Lucide icons, and motion.
- [ ] No generic leave confirmation appears when the latest draft is device-durable; the rare unsafe-exit guard defaults to Keep editing.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Overlay accidentally mounts a second editor | False conflicts, split drafts, lost selection | Move/expand the existing mounted instance; assert one editor instance in tests. |
| URL/history work causes App Router remount | Undo/caret/save intent loss | Use client history state/shallow URL reflection; test Back/direct load/hard refresh explicitly. |
| Software keyboard covers status or last lines | Mobile writing becomes unreliable | Visual viewport + safe-area positioning; keyboard-visible screenshot and real-device check. |
| Hidden critical state | User exits without seeing recovery/conflict/save failure | Define blocking states as focus chrome, not secondary settings; keep Copy/Retry visible. |
| Escape conflicts with IME/dialogs | Accidental exit or lost composition | Respect composition; close deepest layer first; require modified shortcut for toggle. |
| Focus trap harms editor/assistive technology | Keyboard or screen-reader dead end | Use proven modal semantics, inert background, explicit focus restoration, TalkBack/VoiceOver and keyboard tests. |
| Minimal chrome becomes a second editor UX | Behavioral drift and higher maintenance | Reuse the same component, status copy, toolbar, Preview, tokens, and persistence logic. |
| Old focus screenshots are mistaken for target | Raw/obsolete visual treatment ships | Treat current implementation screenshots and live tokens as visual truth; old exports are historical context only. |
