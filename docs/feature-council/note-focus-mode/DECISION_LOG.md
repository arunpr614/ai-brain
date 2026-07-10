# Note Focus Mode — Decision Log

## D-NFM-001 — Keep the current item experience as the default

- **Status:** Decided
- **Decision:** Focus Mode is entered deliberately from My notes and is never remembered globally or applied automatically to future items.
- **Reason:** The feature solves sustained-writing constraints without disrupting source reading, AI digest, tags, collections, or quick-note workflows.

## D-NFM-002 — Use an app-level full-viewport overlay

- **Status:** Decided
- **Decision:** Promote the already-mounted editor with fixed full-viewport styling. Do not use the browser Fullscreen API in v1.
- **Reason:** App-level focus works in desktop browsers and the Capacitor WebView, retains app-controlled exit and error UI, avoids permission/user-gesture variability, and meets the distraction-free goal without a platform dependency.

## D-NFM-003 — Preserve the exact editor component and DOM node

- **Status:** Decided
- **Decision:** Never render a second focus editor and never branch to a new route/server component. Focus is a layout state inside the existing `ManualNoteEditor`.
- **Reason:** Remounting risks content, caret, selection, native undo, textarea scroll, journal identity, save queue, recovery, conflict, provider-dialog, and IME continuity.

## D-NFM-004 — Reflect focus in URL/history without app navigation

- **Status:** Decided
- **Decision:** Use the content-free query marker `tab=notes&note_mode=focus` with `history.pushState`/`replaceState` and `popstate`; do not call App Router navigation to toggle focus.
- **Reason:** Browser/Android Back, Forward, refresh intent, direct-load recovery, and testability are valuable, while App Router navigation can remount the editor.

## D-NFM-005 — Keep focus chrome minimal but trust-complete

- **Status:** Decided
- **Decision:** Always show Exit, item identity, authorship/privacy copy, Write/Preview, formatting, live save state, Copy, and Save. Keep recovery, conflict, offline, failure, session-expiry, and oversize states visible. Hide AI policy, versions, export, clear, delete, item tabs, source, sidebar, and bottom navigation until exit.
- **Reason:** Distraction-free cannot mean hiding state needed to trust that writing is durable.

## D-NFM-006 — Preserve current editor semantics

- **Status:** Decided
- **Decision:** Focus Mode adds no new persistence path, format model, contenteditable/WYSIWYG layer, autosave timing, note API, data schema, AI-provider behavior, or global preference.
- **Reason:** Layout is the user problem. Reopening the editor contract would expand risk without improving the core outcome.

## D-NFM-007 — Use real-component validation instead of a standalone HTML prototype

- **Status:** Decided
- **Decision:** Implement a thin real-component spike and validate the actual save/recovery editor across viewports and states. Do not build a parallel static prototype.
- **Reason:** A static prototype cannot credibly reproduce IndexedDB journal identity, native selection/undo, save queue, conflicts, or Back behavior and would become a false source of truth.

## D-NFM-008 — Treat usage measurement as local and content-free

- **Status:** Decided
- **Decision:** Do not add external analytics or note-content telemetry. If measurement is added, restrict it to content-free local operational counters for focus entry/exit/duration and failure category.
- **Reason:** The product has no general product-analytics pipeline and My notes has a strict private-content boundary.

## D-NFM-009 — Use in-place modal semantics, not a conventional modal architecture

- **Status:** Decided after adversarial review
- **Decision:** While focused, the same editor section uses `role="dialog"` and `aria-modal="true"`, with reversible inert background and focus containment. It is never portalled, cloned, or route-rendered. Consent/delete/versions management must close before Focus entry; conflict/recoveries remain inline.
- **Reason:** The takeover makes the rest of the app unavailable, so modal semantics match the accessibility contract. The rejected “modal” option was a conventional portal/duplicate architecture, not the semantic role.

## D-NFM-010 — Let narrow/zoom formatting chrome scroll

- **Status:** Decided after adversarial review
- **Decision:** Exit/title and status/Copy/Save stay sticky. Write/Preview and the full wrapping toolbar participate in the single surface scroll at 320px and zoom. Keep at least 12rem of usable editor height; do not add a new More sheet in v1.
- **Reason:** This preserves the current formatting contract and avoids stacking three sticky regions until the canvas disappears.

## D-NFM-011 — Separate configuration rollback from structural rollback

- **Status:** Decided after adversarial review
- **Decision:** `NOTE_FOCUS_MODE_ENABLED=0` rolls back only Focus presentation/history. A regression in the shared responsive host requires the previous known-good artifact/commit; that rollback is a rehearsed release gate.
- **Reason:** The host consolidation changes normal Notes regardless of the Focus flag. Claiming flag-only rollback would be false.

## D-NFM-012 — No new global Focus shortcut in v1

- **Status:** Decided after adversarial review
- **Decision:** Visible Focus with Tab/Enter is the keyboard entry path. Cmd/Ctrl+S remains Save; Cmd/Ctrl+K is suppressed while focused; Escape/Back exit under the documented arbitration order.
- **Reason:** The repository lacks an audited shortcut registry/help surface, and competing council proposals created avoidable collision/IME risk.

## D-NFM-013 — Guard only truly non-durable navigation

- **Status:** Decided after adversarial review
- **Decision:** Focus Exit is always prompt-free. A targeted later-navigation guard applies only when the latest content is neither successfully journaled on device nor acknowledged by the server.
- **Reason:** Layout exit is safe, but current IndexedDB failure can leave the only copy in React memory. A warning alone does not satisfy the no-loss goal.

## D-NFM-014 — Keep AI and connections inclusion as a global default preference

- **Status:** Confirmed from user feedback during implementation
- **Decision:** Keep **Include in AI & connections** as an owner-controlled default under **Settings → My notes**. It applies when a note is first saved or deliberately recreated; existing notes keep their individual choice. Focus Mode hides the per-note management row while focused and never changes the global or per-note value.
- **Reason:** A default removes repetitive setup without silently rewriting existing private notes. The existing provider-consent and eligibility boundary remains mandatory, and exact search remains independent.

## D-NFM-015 — Separate verified web release from unverified device claims

- **Status:** Decided at release-candidate review
- **Decision:** The production web rollout may proceed after its complete browser and rollback gate. Do not claim physical Android keyboard/Back/TalkBack or real screen-reader speech as verified until those environments are available; retain them as explicit post-release device certification work.
- **Reason:** The current environment provides a production Chromium browser and responsive viewport controls but no Android device/emulator or assistive-technology speech harness. Shipping a guarded web feature is distinct from inventing unavailable evidence.
