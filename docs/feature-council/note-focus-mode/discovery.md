# Note Focus Mode — Discovery Report

**Date:** 2026-07-10
**Source commit:** `870dc5ab3c9294ba749e218831fcb922098b447d` (`origin/main`)
**Evidence environment:** isolated local SQLite database, manual-note UI/write flags enabled, synthetic content only
**Production boundary:** the configured production host was confirmed healthy enough to present its authenticated shell, then correctly redirected to PIN unlock. No production credential, note, setting, consent, or data was read or changed.

## Executive finding

The current My notes feature has a robust editor but only a narrow writing surface. Desktop constrains it to a 360px companion rail. Mobile gives the editor a full tab, but six item tabs and the fixed product navigation consume meaningful vertical space. The highest-confidence solution is an app-level full-viewport overlay on the **same mounted editor and textarea**, with a content-free URL/history marker for Back and refresh.

This is a layout capability, not a new note system. The current note API, SQLite model, IndexedDB journal, autosave queue, conflict/recovery logic, consent boundary, Preview renderer, and semantic behavior should remain authoritative and unchanged.

## Evidence set

### Current-run screenshots

| Evidence | What it establishes |
|---|---|
| [Desktop My notes](discovery/current-desktop-notes-2026-07-10.png) | At a 1280×720 viewport, the editor is limited to the 360px companion column; toolbar wraps and the textarea is appropriate for quick comments but cramped for synthesis. |
| [Mobile My notes](discovery/current-mobile-notes-390x844-2026-07-10.png) | At 390×844, the editor itself is safe, but item tabs and bottom navigation take vertical space; status/Copy/Save already form a fixed trust bar. |
| [Existing source-reading Focus mode](discovery/current-reading-focus-mode-2026-07-10.png) | The product already uses “Focus mode” and reduced chrome for reading, but its server-rendered branch cannot be copied for a stateful note editor. |

The local item and note text are synthetic and contain no personal information. The same current commit and production design tokens were used.

### Code and state evidence

- `src/components/manual-note-editor.tsx:172-211` shows the editor owns an instance ID, content, Write/Preview mode, save status, recoveries, conflict, provider dialog, delete/version UI, textarea ref, journal, serialized save queue, timers, and BroadcastChannel.
- `manual-note-editor.tsx:224-258` reconciles the private server snapshot with device journals on mount. A route/remount is therefore not a visual-only change.
- `manual-note-editor.tsx:281-342` persists each edit into the local journal before autosave and uses a 750ms idle / 5s maximum save cadence.
- `manual-note-editor.tsx:345-462` serializes saves, rebases edits that arrive during an in-flight save, preserves conflicts, and distinguishes session/offline/failure/oversize states.
- `manual-note-editor.tsx:487-508` already restores textarea selection after formatting and reserves `Cmd/Ctrl+S` for explicit save.
- `manual-note-editor.tsx:693-735` defines the current My notes identity/privacy header and Write/Preview switch.
- `manual-note-editor.tsx:876-947` uses the real labeled native textarea, production Markdown toolbar, and safe Preview renderer.
- `manual-note-editor.tsx:951-1010` keeps save status, bytes, Copy, and Save visible; compact mode positions them above mobile navigation.
- `manual-note-editor.tsx:1012-1090` contains AI policy, versions, export, clear, and delete—important normal-mode management that can be hidden during focused writing.
- `src/app/items/[id]/page.tsx:328-430` uses a 68ch source column plus a 360px desktop companion.
- `page.tsx:709-765` renders Notes as the sixth mobile item tab and mounts the compact editor.
- `page.tsx:242-253,1564-1660` switches to a separate source-reading focus branch when `mode=focus`. That precedent supplies vocabulary and visual restraint, not safe editor architecture.
- `src/components/sidebar.tsx:255-290` fixes mobile navigation at `z-40` with safe-area padding. Note focus must cover it and move the editor trust bar to the viewport safe edge.

## Current experience audit

### What is already strong

- My notes is clearly separated from source and AI digest.
- Private-storage disclosure is present before typing.
- Native textarea preserves browser/OS selection, undo, spellcheck, IME, and accessibility behavior.
- Formatting is discoverable through named icon controls.
- Write/Preview, explicit Save, Copy, byte limit, and exact-save status are visible.
- Local journal, offline behavior, conflict comparison, recoverable drafts, tombstones, and versions make data durability unusually strong.
- AI inclusion is explicit and provider-gated; focus need not touch it.

### Tightening opportunity

| Finding | User impact | Focus response |
|---|---|---|
| Desktop editor is 360px wide | Sustained synthesis has short lines, a wrapped toolbar, and high chrome-to-canvas ratio | Center an approximately 800–900px editor in the viewport |
| Mobile retains item tabs and bottom navigation | Roughly 116px of writing height is unavailable | Cover both layers and use visual viewport/safe-area sizing |
| Existing reading Focus remounts through a server branch | Copying it could lose transient editor/DOM state | Keep editor mounted and change only presentation/history state |
| Normal mode mixes writing and management | AI policy/versions/export/delete compete with focused composition | Hide secondary management while focused; keep trust/error state |
| No note-focus URL marker exists | Back/Forward/refresh intent cannot be expressed | Add `tab=notes&note_mode=focus` via History API only |
| Background controls remain reachable under a plain fixed layer | Keyboard/screen-reader users could escape the focused surface | Make every sibling on the editor's ancestor path inert and restore exactly |

## Alternatives evaluated

| Option | State continuity | Back/refresh | Responsive reliability | Complexity | Decision |
|---|---:|---:|---:|---:|---|
| Collapse/resize the existing split | Strong | Weak | Medium | Medium | Future wider-notes feature; not sufficiently distraction-free |
| Dedicated note focus route/server branch | Weak | Strong | Strong | Medium | Rejected: remount and duplicate-editor risk |
| Conventional modal/portal with a second editor | Weak | Medium | Medium | High | Rejected: split state, false conflicts, focus and save duplication |
| Browser Fullscreen API | Medium | Weak | Weak in mobile/WebView | Medium | Rejected for v1: platform/permission variability and not required |
| Same-node full-viewport overlay + History API | **Strongest** | **Strong** | **Strong** | Medium | **Selected** |

## Selected behavior contract

1. Normal item detail remains the initial/default experience.
2. A visible **Focus** action in My notes enters a fixed full-viewport presentation of the same section and textarea.
3. Enter pushes `tab=notes&note_mode=focus` without invoking Next navigation.
4. Browser/Android Back exits before leaving the item. Direct-loaded focus exits by replacing the focus marker rather than navigating to an unrelated page.
5. Exit, Escape, Back, resize, orientation, theme, and Write/Preview changes preserve content, caret/selection, textarea scroll, native undo, editor identity, save queue, notices, and recovery/conflict state.
6. Background app chrome is covered and inert. Focus stays within the note surface and returns to a useful note control on exit.
7. Focus always exposes Exit, item identity, privacy/authorship, Write/Preview, toolbar, note canvas/Preview, live save state, Copy, and Save.
8. Recovery, conflict, offline, failed, session-expired, and oversize states remain visible and actionable.
9. AI inclusion, versions, export, clear, and delete remain in normal mode and are not duplicated.

## Responsive and accessibility constraints

- Use viewport-relative height (`100dvh` with safe fallback) and safe-area padding; never hard-code device height.
- Mobile overlay must sit above the existing `z-40` navigation and place its bottom trust bar above the visual keyboard/safe area.
- Controls remain at least 44px on compact/mobile and retain existing focus-visible styling.
- At 200% zoom, header/actions may wrap but Exit, status, Copy, and Save remain reachable without horizontal page scroll.
- Focus surface uses modal semantics (`role=dialog`, `aria-modal=true`, stable label), a keyboard focus loop, and inert/`aria-hidden` restoration for background siblings.
- Escape closes a deeper provider/delete layer before focus and never exits during IME composition.
- Reduced-motion behavior remains instant through the current motion tokens; no new animation is required.

## Analytics and privacy

No product-analytics pipeline is present for this surface, and Focus Mode requires no content telemetry. V1 should ship with no external analytics. Acceptance and production smoke can use content-free observations: focus entered/exited, URL state, one-editor count, status category, viewport, and console errors. If durable measurement is later added, keep it local and content-free.

## Release and rollback discovery

- Manual notes already roll out through `MANUAL_NOTES_UI_ENABLED`, `MANUAL_NOTES_WRITE_ENABLED`, and `MANUAL_NOTES_WORKER_ENABLED`.
- Focus Mode is UI-only and can be guarded by a dedicated UI flag if council review determines rollback isolation is worth the small branch cost; disabling it must leave normal notes unchanged.
- No migration or data repair is required.
- The standard guarded deploy performs backup, full tests, lint/typecheck/build, artifact/privacy validation, service restart, authenticated health, provider checks, and scheduler preservation.
- Rollback is source/flag rollback. Existing notes, journals, versions, jobs, consent, and semantic chunks must remain untouched.

## Primary risks to close in implementation

1. React or Next remounts the editor during focus URL changes.
2. The fixed layer visually covers the app but leaves background controls in the accessibility tree.
3. Escape exits during IME or while a deeper dialog is active.
4. Mobile software keyboard covers the trust/action bar or last editable line.
5. Direct-load/refresh opens an empty editor before reconciliation.
6. Focus hides a save/recovery/conflict state needed to avoid loss.
7. Tests assert React state but miss native DOM continuity (selection, scroll, undo).

These risks define the adversarial review and acceptance matrix; none require widening the data or provider scope.
