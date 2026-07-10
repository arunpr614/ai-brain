# Note Focus Mode — UX/UI Package v1

**Status:** Adversarial review pending
**Visual source of truth:** current Prism Memory implementation and tokens
**Prototype decision:** a separate HTML prototype is not warranted; validate the real editor implementation.

## Experience statement

Focus Mode is the current My notes editor with room to think. It is not a new page, editor, theme, or fullscreen permission. Entry expands the live editor over the application; exit restores the familiar item view without changing the writing session.

## Experience principles

1. **Same session, more space.** The textarea, native undo stack, selection, and editor controller stay alive.
2. **Calm, not blind.** Save/recovery/error state remains visible because durability is part of focus.
3. **One obvious way out.** Exit is persistent; Escape and Back are predictable secondary paths.
4. **Native product language.** Reuse Prism Memory colors, typography, radii, spacing, motion, controls, and Lucide icons.
5. **No mobile penalty.** Focus recovers the space used by item tabs and bottom navigation without reducing touch targets.

## Current-state evidence

- [Desktop normal Notes](../discovery/current-desktop-notes-2026-07-10.png): 360px companion rail constrains long-form writing.
- [Mobile normal Notes](../discovery/current-mobile-notes-390x844-2026-07-10.png): safe editor, but tabs/navigation reduce canvas height.
- [Existing source-reading Focus](../discovery/current-reading-focus-mode-2026-07-10.png): useful vocabulary and restrained chrome; not a safe architecture reference.

## Entry flow

1. My notes header shows a `Maximize2` control labeled **Focus**. Desktop shows icon + text. Compact mobile may show icon plus `aria-label="Focus on My notes"` and `title="Focus"` only if the visible label cannot fit without horizontal overflow.
2. Focus is enabled only when the manual-note UI and Note Focus Mode flags are enabled.
3. Pointer/Tab+Enter activation snapshots the active element, document scroll, textarea selection/direction, textarea scroll, and whether the textarea was focused.
4. The same section becomes the fixed focus surface. The shell is covered and inert. The URL gains `tab=notes&note_mode=focus` without an app navigation.
5. If entry started while typing, return focus and selection to the textarea. If entry started from the Focus button, move focus to the focus heading/Exit control; preserve the last editor selection for the next textarea focus.
6. A one-time accessible label identifies **My notes — {item title}**. Do not announce note content or continuously announce the mode.

## Exit flow

Priority order:

1. A deeper dismissible layer (provider dialog, delete confirmation, formatting/help layer if introduced) receives Escape first.
2. IME composition consumes Escape; focus does not exit when `isComposing`, key code 229, or the editor composition ref is active.
3. Otherwise **Exit focus**, Escape, or Back returns to normal Notes.
4. A locally created focus history entry unwinds with Back. A direct/refreshed focus URL removes the marker with replace and remains on the item.
5. Isolation and body-scroll lock restore before focus/page scroll restores.
6. Return focus to the entry trigger, or to the same textarea/selection when entry began while typing.

Exit does not save, wait for save, create a mutation, clear a timer, or show a generic unsaved confirmation. Draft durability remains the editor's existing responsibility.

## Desktop layout

### Full viewport

- Fixed opaque canvas: `inset: 0`, above command palette and mobile navigation, `100dvh` with `100vh` fallback.
- Background uses `--background`; writing surface uses `--surface`; borders use `--border`.
- No gradient, illustration, new color, decorative shadow, or browser Fullscreen API.
- Centered content column: target max width 880px; minimum gutters 24px, 32px at wider viewports.

### Top chrome

- Sticky first row, minimum 56px, safe-area-aware.
- Left: `Minimize2` + **Exit focus**, first focusable control.
- Center/start: pencil/lock identity, **My notes**, truncated item title, existing private-storage copy.
- Right: Write/Preview segmented control. Save remains in the persistent bottom/action row so it is not duplicated.
- At 200%/400% zoom the row wraps; Exit and item identity remain first in reading order.

### Editor

- Formatting toolbar remains named **Markdown formatting**, sticky under the top chrome when space permits.
- Textarea keeps JetBrains Mono, 14px minimum, 24px line height, current padding/border/focus ring, and native resize disabled only while focused.
- Focused textarea minimum height uses the remaining dynamic viewport and is at least 60vh on desktop.
- Preview uses the existing `.article` renderer and 68ch readable measure inside the wider surface.
- No width/height/scale animation. Optional transition is opacity-only at `--duration-med`; reduced motion is instant.

### Persistent bottom/action row

- Sticky to the focus surface bottom; opaque surface and border.
- Left: live save status + byte count.
- Right: Copy + Save/Recreate.
- Offline/failure/session-expired/oversize/conflict status uses existing icon/text/semantic colors; never color alone.

## Tablet layout

- Same full-viewport surface at 768–1023px.
- 720–840px content width with 24–32px gutters.
- Single writing column; no source split.
- Toolbar may wrap once but keeps 44px targets when touch is likely.
- Orientation change preserves the same editor DOM node, selection, and textarea scroll.

## Mobile layout

- Overlay covers six item tabs and the fixed product bottom navigation.
- Use `100dvh`, `env(safe-area-inset-*)`, and an opaque background.
- Top controls use at least 44×44px targets. Exit is visible as icon + short label when possible.
- Writing column uses 16px side gutters at 390px and 12px at 320px.
- Toolbar stays horizontally/vertically reachable. V1 may wrap the existing 11 controls; it does not introduce a new More sheet unless validation proves vertical cost unacceptable.
- The focus action row moves from `bottom-[72px]` to the focus viewport safe edge. It must not cover the last editable line.
- Software keyboard dismissal follows platform behavior; on Android, first Back may dismiss the keyboard, next Back exits focus.
- No horizontal document scroll at 320×700 or zoom. Preview tables retain their existing local horizontal wrapper.

## Responsive single-editor rule

The item page must mount one editor total:

- Mobile Notes navigation remains in the mobile tab strip, but it does not instantiate a mobile-only editor.
- One shared companion host is present in a responsive grid. On mobile it is visible only for `tab=notes`; on desktop it occupies the companion column.
- Desktop AI digest and My notes panels stay mounted; selecting Digest hides Notes with `display:none` rather than unmounting it.
- Normal mobile keeps compact sizing/action placement through responsive styles on the one editor.

## Component anatomy and labels

| Element | Icon | Visible label | Accessible contract |
|---|---|---|---|
| Normal entry | `Maximize2` | Focus | `aria-label="Focus on My notes"`; tooltip/title on icon-only mobile |
| Focus exit | `Minimize2` | Exit focus | First focusable control; always visible |
| Identity | `Pencil`, `LockKeyhole` | My notes; item title; existing privacy copy | Dialog labeled by item-aware heading |
| Mode switch | Existing `Pencil`, `Eye` | Write, Preview | Existing `aria-pressed` behavior |
| Toolbar | Existing icons | Tooltips/labels unchanged | Existing `role=toolbar`, named buttons |
| Status | Existing `Check`, `WifiOff`, semantic text | Existing `statusCopy()` strings | `aria-live=polite`; do not announce byte count per keystroke |
| Actions | Existing `Copy`, `Save` | Copy, Save | Existing behavior and disabled states |

## State specifications

| State | Focus treatment | Exit behavior |
|---|---|---|
| Empty | Normal placeholder in large canvas | Immediate; state unchanged |
| Loading | Disabled editor/frame and `Loading note`; never editable blank | Available |
| Saving on device | Polite status visible | Immediate; journal continues |
| Saved locally / server pending | Status pinned; editing continues | Immediate; autosave continues |
| Saving | Status pinned; duplicate Save disabled | Immediate; request continues |
| Saved | Check + Saved | Immediate |
| Offline | Warning + saved-on-device copy; Copy/Save state unchanged | Immediate |
| Failed | `Save failed · retry available`, Copy, manual Save retry | Immediate; failure remains visible in normal Notes |
| Session expired | Draft-kept copy; Copy; disabled server mutations | Immediate; normal Notes retains state |
| Oversize | Limit/status, byte count, Copy; editor usable | Immediate |
| Conflict | Existing both-versions alert/actions above editor; mobile stacks | Escape may exit only after deeper dismissible layers; conflict remains |
| Recoverable drafts | Existing Resume/Copy/Discard choices remain above editor | Exit available; drafts never auto-selected |
| Device recovery unavailable | Persistent warning; Save/Copy remain | Exit to normal Notes is safe because it is same-document |
| Deleted/recreate | Existing deliberate recreate state remains | Immediate |

## Keyboard interactions

| Input | Behavior |
|---|---|
| Tab / Shift+Tab | Cycles through active focus surface; background inert prevents escape |
| Enter/Space on Focus | Enters focus |
| Escape | Deepest dismissible layer first; then exit; never during IME composition |
| Browser/Android Back | Exits focus before item navigation; keyboard may dismiss first on Android |
| Forward | Re-enters a valid in-document focus entry |
| Cmd/Ctrl+S | Existing manual Save |
| Cmd/Ctrl+K | Suppressed while focused unless a tested contextual Exit behavior is implemented |
| Native undo/redo/selection/spelling/IME | Unchanged and browser/OS-owned |

No plain `F` or new global chord in v1. Tab/Enter is the accessible entry path. A contextual command-palette action is P1 and must not block release.

## Accessibility specification

- Normal mode remains a named region. Focus mode changes the same section to `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` for the focus heading.
- The overlay is opaque, but background isolation also sets `inert` and `aria-hidden` on sibling branches along the editor-to-body ancestor path. Previous values restore exactly.
- A tested focus loop keeps sequential focus within the surface. Background inert is the primary safety mechanism.
- Exit is first; heading, privacy copy, mode switch, toolbar, textarea/Preview, status, and actions follow visual order.
- Visible focus rings use `--action-primary-focus`.
- Controls remain named; icon alone is never the accessible name.
- 200% and 400% zoom reflow without horizontal page scroll or unreachable Exit/Save.
- Reduced motion collapses any optional transition to zero.
- VoiceOver/TalkBack validation checks dialog announcement, textarea label, toolbar names, status changes, and background unreachability.

## Visual-token mapping

| Need | Existing token/pattern |
|---|---|
| Canvas | `--background` / `--bg` |
| Surface | `--surface`, `--surface-raised` |
| Borders/focus | `--border`, `--border-strong`, `--action-primary-focus` |
| Primary action | `--action-primary-*` |
| Selected mode | `--control-selected-*` |
| State | `--success`, `--warning`, `--danger` + text/icon |
| UI / source / preview type | Inter / JetBrains Mono / existing `.article` Charter stack |
| Icons | Existing Lucide 2px-stroke set |
| Motion | Existing durations/easing and reduced-motion tokens |

## Interaction acceptance checklist

- [ ] Focus control is discoverable and reachable without a pointer.
- [ ] Focus surface is substantially larger and hides/covers unrelated product chrome.
- [ ] One editor/textarea remains mounted through Focus, Exit, Escape, Back, Forward, Digest switch, and breakpoint resize.
- [ ] Content, selection/direction, textarea scroll, page scroll, native undo, mode, and save/recovery state persist.
- [ ] Exit/status/Copy/Save remain visible at 1440×900, 1024×768, 768×1024, 390×844, 320×700, and zoom.
- [ ] Software keyboard does not cover last editable line or action/status bar.
- [ ] Loading/offline/failed/session/oversize/conflict/recovery states remain actionable.
- [ ] Background cannot receive focus or screen-reader navigation.
- [ ] Source-reading Focus mode and normal Notes remain visually/behaviorally unchanged.
- [ ] All styling comes from the current design system.

## Prototype decision

A static HTML prototype would duplicate the production editor and could not validate journal ownership, same-DOM selection/undo, Back/Forward, autosave, conflicts, or keyboard geometry. V1 therefore specifies a real-component spike as the prototype. High-fidelity implementation screenshots and a same-viewport normal-vs-focus comparison are required before UX v2/release.

## V1 open questions for adversarial review

1. Should entry from the Focus button place focus on Exit, the heading, or the textarea? V1 chooses Exit/heading; typing-entry restoration chooses textarea.
2. Does the full 11-control toolbar remain usable at 320px without a new overflow sheet?
3. Does pure CSS `dvh`/sticky positioning clear the Capacitor software keyboard, or is a measured visual-viewport offset needed?
4. Should the contextual command-palette action ship in v1 or defer to avoid coordination complexity?
