# Note Focus Mode — UX/UI Package v2

**Status:** Implementation source of truth
**Supersedes:** `ux-ui-v1.md`
**Review resolved:** [UX/UI v1 adversarial review](NOTE_FOCUS_MODE_UX_UI_V1_ADVERSARIAL_REVIEW_2026-07-10_21-07-55_IST.md)

## V1 review disposition

| Finding | V2 disposition |
|---|---|
| Application state vs modal contradiction | Chosen: **in-place modal semantic surface** (`dialog`/`aria-modal`) without portal/duplicate. Product council's “not conventional modal” is preserved as architecture, not ARIA. |
| 320px/400% toolbar infeasible | Top Exit/title and bottom trust/actions stay sticky. Write/Preview + wrapping toolbar join the scroll document. Minimum editor area 12rem; no new More sheet. |
| Single-host source order unspecified | Normative normal-mode DOM/tab contract added below. |
| Escape/IME/child states undefined | Entry disabled for consent/delete/versions; conflict/recoveries allowed; explicit arbitration table added. |
| Keyboard/Back geometry vague | Falsifiable visualViewport/action-bar/final-line requirements and first/second Back sequence added. |
| Screenshots cannot prove identity | Evidence-type matrix separates visual, DOM, network, native-state, geometry, IME, and AT proof. |
| Session expiry dead end | Add **Unlock to sync**, Copy, Exit; preserve focus return URL and recovery draft. |
| Initial focus ambiguous | Focus-button entry targets a `tabIndex=-1` heading; textarea-origin entry restores textarea. |
| Blocking state viewport domination | One focus-surface scroll owner; blocking panel precedes editor and may scroll; sticky Exit/trust rows remain. |
| Isolation exceptions/cleanup | Suppress root palette; exact reversible sibling isolation; error/unmount emergency cleanup. |

## Core experience

Focus Mode is the same live My notes editor promoted to an opaque, full-viewport, app-controlled surface. Normal item detail remains the default. The design changes space and attention, not content ownership, formatting, saving, recovery, privacy, or AI behavior.

## Semantic decision

Focus is an **in-place modal semantic surface**:

- Same `<section>` and descendants; no Radix outer Dialog, portal, clone, route, or second editor.
- In Focus: `role="dialog"`, `aria-modal="true"`, labeled by `My notes — {item title}`.
- Sibling branches along the surface-to-body path become `inert` and `aria-hidden`; prior values restore exactly.
- Global command palette is suppressed and cannot mount as a sibling overlay.
- Consent, delete confirmation, and versions management cannot be open when Focus begins. The entry control is disabled with a visible/screen-reader reason until that task closes.
- Conflict and recoverable drafts remain inline trust states, not nested modal dialogs, and stay visible.

## Normal-mode single-host DOM contract

### Mobile source order

1. Back to Library.
2. Item section navigation links, including Notes with `aria-current=page`.
3. Shared companion host only when Notes is active.
4. Inside host: My notes region/editor. Desktop companion tablist and Digest are `display:none`.
5. Product bottom navigation after main content in DOM, fixed visually.

### Desktop source order

1. Back/result/highlight content.
2. Desktop grid: source article, then companion aside.
3. Companion tablist (`AI digest`, `My notes`) with stable IDs/`aria-controls`.
4. Both panels remain mounted. Inactive panel uses `hidden`/`display:none`, is not focusable, and is absent from the accessibility tree.
5. Secondary tags/topics/Related/details follow companion within the aside.

### Responsive identity

- One editor React/controller node appears in the shared companion host.
- Mobile tab navigation does not instantiate an editor.
- Digest switching and breakpoint resize change only visibility/layout; controller stays mounted.
- In Preview, no textarea exists by current contract. Returning to Write creates the normal Write textarea; Focus does not promise native undo identity across Write↔Preview.

## Normal entry control

- `Maximize2` + visible **Focus** label at desktop, mobile, 320px, and zoom. It may wrap to its own header row; it is never icon-only.
- Accessible name: **Focus on My notes**.
- Keyboard path: Tab then Enter/Space.
- Disabled only while consent, delete confirmation, or versions management is open. Adjacent text: “Finish the open note task before focusing.”
- No `Cmd/Ctrl+Shift+F`, plain F, F11, or browser fullscreen.

## Focus layout

### Canvas and scroll ownership

- Fixed opaque surface above `z-50`; `100dvh` with `100vh` fallback; safe-area padding.
- The surface is the single vertical scroll owner. Avoid nested page/editor-panel scroll except textarea's native internal scroll and Preview table wrapper.
- Center column max width 880px. Gutters: 32px wide desktop, 24px tablet, 16px mobile, 12px at 320px.

### Persistent top row

- Sticky, opaque, border-bottom, safe-area-aware.
- First control: `Minimize2` + **Exit focus**.
- `tabIndex=-1` heading: **My notes — {item title}**, truncated visually but full accessible name.
- Existing privacy/authorship copy follows or wraps below.
- At narrow widths/zoom, row may wrap; Exit stays first and visible.

### Scrolling writing controls

- Write/Preview segmented control and full existing Markdown toolbar appear after the heading within the normal scroll flow, not sticky.
- Toolbar retains wrapping and 44px mobile targets. At 320px/400%, users scroll past it to maximize the writing area; no new overflow menu or horizontal toolbar is introduced.
- Focused textarea is non-resizable and has `min-height: max(12rem, 40dvh)` where supported. Desktop target fills remaining space without fixed pixel height.
- Preview retains `.article`, 68ch measure, safe links/images/tables.

### Persistent bottom trust row

- Sticky to visual viewport/surface bottom, opaque, border-top, safe-area-aware.
- Status and byte count left/top; Copy and Save right/bottom; may wrap to two rows at 320px/zoom.
- Textarea/Preview receives bottom padding at least action-row measured height + safe inset, so the last line/content is not covered.

## Focus entry and initial focus

1. Snapshot active element, page scroll, Write textarea selection/direction/scroll, and textarea-active boolean.
2. Apply modal semantics/isolation and push focus history without app navigation.
3. If the textarea was active, refocus the same textarea with selection/scroll and `preventScroll`.
4. If Focus button initiated entry, programmatically focus the focus heading (`tabIndex=-1`) so screen reader announces context. First Tab moves to Exit; subsequent order follows visual source order.
5. Do not auto-save, alter content, or move selection because of entry.

## Exit and return focus

- Exit control, eligible Escape, and Back close Focus.
- Locally owned entry unwinds one history step; direct/refreshed/unowned entry removes the marker by replace.
- Remove layout/isolation first, restore page scroll, then return focus:
  - textarea-origin entry → same Write textarea/selection/scroll;
  - button-origin entry → normal Focus trigger;
  - missing trigger/textarea → My notes heading.
- Exit is prompt-free even for pending/unsafe drafts because it does not leave the document. Later navigation guard owns non-durable risk.

## Input arbitration

| Priority | Condition | Result |
|---:|---|---|
| 1 | `isComposing`, key 229, or editor composition ref active | IME owns Escape; no child/focus exit |
| 2 | Allowed dismissible child exists | Child owns Escape and returns focus to its trigger |
| 3 | Android software keyboard visible | Platform first Back dismisses keyboard; Focus remains |
| 4 | Focus active | Exit/Escape/Back closes Focus once |
| 5 | Non-durable navigation after Focus | Targeted guard before page/app navigation where supported |
| 6 | Normal page | Existing browser/app navigation |

- Cmd/Ctrl+S remains Save.
- Cmd/Ctrl+K does nothing while Focus is active unless future tested in-surface command support ships.
- Palette already open must close before Focus activation.

## Entry-state matrix

| State before entry | Focus available? | Behavior |
|---|---:|---|
| Write/Preview/empty/loading/saving/saved/offline/failed/session/oversize | Yes | Same state shown in Focus |
| Conflict | Yes | Conflict panel remains before editor; never auto-resolved |
| Recoverable drafts | Yes | Recovery list remains before editor; never auto-selected |
| Device recovery unavailable | Yes | Persistent warning; Copy/Save/status visible |
| Consent dialog | No | Finish/close task first |
| Delete confirmation | No | Finish/close task first |
| Versions panel | No | Close panel first |
| Deleted/recreate | Yes | Deliberate recreate state preserved |

## Failure and recovery states

| State | Required Focus actions/copy |
|---|---|
| Loading | Disabled content + `Loading note`; Exit |
| Load failed | Existing failure copy + Retry/refresh when available, Copy if local content exists, Exit |
| Session expired | **Unlock to sync**, Copy, Exit; unlock returns to focus URL and recoverable draft |
| Saving locally/pending/saving/saved | Existing status; Copy/Save states unchanged |
| Offline | Device-saved copy, WifiOff, Copy, Save behavior unchanged |
| Failed | `Save failed · retry available`; Save acts as retry; Copy |
| Oversize | Limit/bytes; editable; Copy; Save disabled |
| Conflict | Existing saved/draft comparison and actions; single scroll owner |
| Recoveries | Existing Resume/Copy/Discard list; single scroll owner |
| Journal unavailable, server unacknowledged | Persistent warning; Copy/Retry; Focus Exit safe; subsequent navigation guarded |

## Mobile keyboard geometry

When keyboard is visible:

- Focus action row bounding rect is fully within `visualViewport`.
- Textarea bottom scroll padding is at least action-row height + safe-area inset.
- Active caret/final editable line can scroll above action row and keyboard.
- Opening/closing keyboard and orientation change preserve textarea/controller identity, value, selection, and scroll as practical.
- If `100dvh`/sticky CSS fails measured geometry, production must add a scoped `visualViewport` offset; this is a required fallback, not a future option.

Android Back evidence records:

1. keyboard visible + Focus active → first Back hides keyboard, Focus/URL/editor remain;
2. keyboard hidden + Focus active → next Back exits Focus, editor remains;
3. normal Notes → subsequent Back follows ordinary item navigation, subject to unsafe-navigation guard.

## Narrow width and zoom

At 320px, 200%, and 400%:

- `document.scrollWidth <= document.documentElement.clientWidth` except local Preview table scroller.
- Exit and bottom trust row remain visible/reachable.
- Header/trust row can wrap; Write/Preview/toolbar scroll away with content.
- Textarea has ≥12rem visible/editable height when visual viewport is tall enough; otherwise surface scroll exposes it without trapping controls.
- Touch targets remain ≥44px on mobile.

## Isolation and emergency cleanup

- Isolate sibling branches only; never inert the editor's ancestors.
- Command palette/root navigation are suppressed. System/browser UI remains outside DOM scope.
- Snapshot previous `inert`, `aria-hidden`, document/body overflow, scroll, and focus values; restore exactly in reverse order.
- Exit, Back, route unmount, thrown entry/exit work, and feature-flag disable run idempotent cleanup.
- QA injects an entry/cleanup exception and verifies app remains accessible/scrollable.

## Evidence contract

| Claim | Required proof |
|---|---|
| Visual alignment/space | Same-viewport normal + Focus composite, screenshot inspection, geometry |
| One controller/owner | Component instrumentation + request/channel/journal counts |
| Same Write textarea | Direct DOM object identity marker before/after each transition |
| Native undo | Edit → Focus transition → browser undo → exact value assertion |
| Selection/scroll | Forward/backward selection/direction + textarea/page scroll snapshots |
| No save side effect | GET/PUT/journal count before/after focus-only transition |
| History | Production-build URL/state/Back/Forward/direct-load/refresh evidence |
| Background isolation | Tab sequence + DOM inert/aria state + VoiceOver/TalkBack smoke |
| IME | Real composition smoke; synthetic guard is supplemental |
| Keyboard clearance | visualViewport/action-row/textarea geometry + keyboard screenshot |
| Zoom/reflow | Bounding rects, scrollWidth, screenshots at 320/200%/400% |
| Failure states | One traceability row and evidence artifact per state |

Screenshots never count as proof of object identity, native undo, IME, requests/journals, or assistive-technology containment.

## Visual system

Reuse only current `--background`, surfaces, borders, action/selected/status tokens, Inter/JetBrains Mono/`.article`, current radii, focus rings, safe-area patterns, and Lucide 2px-stroke icons. No new palette, theme, gradient, illustration, editor font, decorative shadow, or unrelated redesign.

## Animation and reduced motion

No size/scale animation. Default may use one opacity-only transition at `--duration-med`; reduced motion is instant. Text, toolbar, and status do not auto-hide.

## Prototype decision and validation

The real component is the only high-fidelity prototype. It must be exercised with synthetic realistic content and important live states. Normal/reference and Focus screenshots are placed in one comparison artifact at identical viewports, then visually reviewed for broken spacing, clipping, wrapping, borders, radii, typography, and hidden controls. Nonvisual evidence follows the table above.

## UX acceptance gates

- Normal single-host source order and tab semantics pass before Focus implementation is enabled.
- Visible Focus and Exit behavior passes keyboard, narrow, zoom, and AT checks.
- Same controller/Write textarea/native state passes supported in-document transitions.
- No active line/action/status overlap with software keyboard.
- Every failure/recovery state is actionable; session expiry has safe unlock path.
- Background/command palette are unreachable; cleanup restores app after normal/error exit.
- No screenshot-only acceptance for nonvisual claims.
