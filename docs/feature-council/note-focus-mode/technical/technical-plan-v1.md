# Note Focus Mode — Technical Implementation Plan v1

**Status:** Adversarial review pending
**Source contracts:** [PRD v1](../prd/prd-v1.md), [UX/UI v1](../ux/ux-ui-v1.md)
**Architecture basis:** [Technical Council](../council/technical-architecture.md)

## Architecture recommendation

Implement Focus Mode as presentation and same-document history state around one persistent editor:

```text
Item page (server; flags + item title)
  └─ responsive shared companion host (one instance)
      └─ ItemCompanionTabs (both panels mounted)
          └─ ManualNoteEditor (sole note/session owner)
              └─ same section + same textarea become fixed focus surface
                  ├─ focus-history helper
                  ├─ focus-isolation helper
                  └─ focus-session hook
```

No route, portal, second editor, database migration, API change, provider change, or runtime dependency is added.

## P0 prerequisite: one responsive persistent editor

The current server page mounts its CSS-hidden desktop branch at all widths and adds a compact mobile editor on the Notes tab. `ItemCompanionTabs` also conditionally unmounts Notes when Digest is chosen.

Required correction:

1. Remove the editor instantiation from `MobileItemDetailTabs`.
2. Keep one shared desktop/mobile grid/aside in the page tree.
3. On mobile, show that shared companion only for `activeTab === "notes"`; hide its article and non-note desktop panels.
4. On desktop, keep the existing article + 360px aside layout.
5. Change `ItemCompanionTabs` to render Notes and Digest simultaneously. Use responsive `display:none` classes for inactive panels; never conditionally return the note React node.
6. Force the note panel visible on mobile while hiding the desktop companion tablist/digest.
7. Pass `itemTitle`, `compact` (derived responsively or retained as a stable server prop), and `focusEnabled` to the one editor.
8. Add tests that fail if more than one `ManualNoteEditor`, textarea, note load, editor identity, or BroadcastChannel owner exists.

This consolidation ships behind normal manual-note flags and is independently regression-tested before focus is enabled.

## Component and module changes

| File/module | Planned change |
|---|---|
| `src/lib/notes/flags.ts` | Add `noteFocusModeEnabled()` for `NOTE_FOCUS_MODE_ENABLED`; effective only with manual-note UI enabled at the page call site. |
| `src/lib/notes/focus-history.ts` | Pure URL/state parser and transition planner. Preserve unrelated query params and existing Next history keys. |
| `src/lib/notes/focus-isolation.ts` | DOM helper to snapshot/apply/restore sibling `inert`/`aria-hidden`, body overflow, and document scroll. Idempotent cleanup. |
| `src/lib/notes/use-note-focus-session.ts` | Client hook/state machine for initial intent, enter/exit, popstate, Escape arbitration, selection/scroll snapshot, focus restoration, and cleanup. |
| `src/components/item-companion-tabs.tsx` | Keep both panels mounted; responsive visibility and correct tab/tabpanel semantics. |
| `src/components/manual-note-editor.tsx` | Add item title/focus flag props, Focus/Exit controls, same-node focus attributes/classes, focus-specific sizing/action placement, and hook integration. Do not move note state. |
| `src/app/items/[id]/page.tsx` | Consolidate editor host; pass props/flags; preserve source-reading `mode=focus`. |
| `src/components/command-palette.tsx` | Suppress Cmd/Ctrl+K while the document indicates active note focus. Contextual entry is optional P1. |
| Tests | Pure helper, component, responsive-host, DOM identity, shortcut/IME, isolation cleanup, normal editor regression. |
| Docs/wiki | User behavior, implementation, flag, QA, rollout/rollback, limitations. |

## Focus state machine

```text
normal -> entering -> focused -> exiting -> normal
             ^          |
             |          +-- Exit / Escape / popstate / cleanup
             +-- valid initial/direct focus intent after editor is ready
```

- Repeated enter/exit calls are idempotent.
- The editor remains the only owner of Markdown, snapshot, journal, save queue, conflict, and recovery.
- The focus session owns only presentation/navigation snapshots: active element; page scroll; textarea selection/direction/scroll; entry token; history ownership.
- Focus transition never calls `updateContent`, `persistDraft`, `performSave`, note API, or recovery mutation.

## URL and history contract

Canonical URL: `/items/:id?tab=notes&note_mode=focus`.

- Enter activates local focus, then `history.pushState()` using the same origin/path.
- Merge existing `history.state`; add `__brainNoteFocus: { v: 1, token, itemId }`. `itemId` is already present in the path, but may be retained for stale-marker validation; do not add title/content.
- Preserve `capture_state`, `repair`, `highlight`, and unknown query parameters.
- Do not mutate/reuse `mode=focus`; source-reading focus wins.
- `popstate` derives desired focus from URL + valid marker and toggles local presentation without router APIs.
- Exit owned entry: `history.back()` once. Direct/refreshed/unowned marker: `replaceState()` with focus marker removed and `tab=notes` retained.
- Forward to a valid entry re-enters after the editor is available.
- Disabled/invalid/stale/wrong-item markers fall back to normal Notes and are ignored/removed safely.
- Production-build test must prove the textarea object and editor identity survive query push/Back/Forward. If Next 16 replaces the tree, use a same-URL history entry containing only the namespaced state marker; state preservation outranks refresh-visible URL.

## Same-DOM session preservation

On entry snapshot in memory:

- trigger/active element;
- page `scrollX`/`scrollY`;
- textarea `selectionStart`, `selectionEnd`, `selectionDirection`;
- textarea `scrollTop`, `scrollLeft`;
- whether the textarea was active.

Apply fixed classes/semantics without changing React key/parent/portal. After layout, restore selection/scroll defensively. If entry began from the textarea, focus it with `preventScroll`; otherwise focus Exit/focus heading.

On exit:

1. remove focus classes/semantics;
2. restore inert/background/body state exactly;
3. restore page scroll;
4. restore original trigger when present, otherwise the same textarea or My notes heading;
5. restore textarea selection/scroll if relevant.

Do not claim caret/undo/scroll continuity across hard refresh; only durable server/local-journal recovery is guaranteed across documents.

## Background isolation

Starting at the focused section, walk ancestors to `<body>`. At each level:

- for every sibling branch, snapshot its prior `inert` property and `aria-hidden` attribute state;
- set `inert=true` and `aria-hidden=true`;
- do not mutate the branch containing the focused editor.

Also snapshot/lock `document.documentElement`/`body` overflow as required and mark `data-note-focus-active="true"` for command-palette suppression and diagnostic selectors.

Cleanup restores exact previous values in reverse order on Exit, popstate, error, and unmount. It is safe to call twice.

## Focus surface implementation

The existing editor `<section>` conditionally receives:

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby=<focus heading id>`;
- fixed `inset-0`, z-index above current `z-50` palette, opaque token background;
- dynamic viewport height/safe-area padding and internal overflow;
- centered wider column; focus-aware toolbar/textarea/preview/action classes;
- a persistent Exit control and item-title context;
- hidden secondary management section while focused.

The textarea node stays in the same JSX position. Avoid a portal, conditional keyed wrapper, duplicate hidden focus content, or transition that recreates the textarea.

## Keyboard and focus behavior

- Section-level keydown capture handles Escape only while focused.
- Ignore when `nativeEvent.isComposing`, key code 229, or `composingRef.current`.
- Child dismissals: consent dialog and delete confirmation first; versions/help if treated as dismissible; conflict/recovery never auto-resolved.
- Otherwise prevent default/propagation and exit once.
- A focusable-elements query within the section loops Tab/Shift+Tab. Background inert is the primary protection.
- `Cmd/Ctrl+S` remains unchanged in textarea.
- `Cmd/Ctrl+K` is suppressed by CommandPaletteProvider while `data-note-focus-active` is set.
- No new global focus chord in v1; Tab/Enter on the visible control is the accessible path.

## Responsive behavior

- Use CSS `100dvh`/safe-area and sticky layout first; avoid continuous resize listeners.
- Focused compact action bar uses safe viewport bottom rather than current `bottom-[72px]` because product nav is covered.
- Textarea minimum height derives from the remaining viewport; no fixed device height.
- If real Capacitor keyboard testing shows CSS failure, add a narrowly scoped `visualViewport` CSS-variable update with cleanup and no content/state coupling.
- Resize across `md` must preserve textarea/editor object identity.

## Persistence, autosave, offline, and failures

No note subsystem changes:

- keep 750ms idle / 5s max timers;
- keep IndexedDB journal-before-save;
- keep one in-flight request + coalesced intent;
- keep epoch/generation compare-and-swap, mutation idempotency, BroadcastChannel notices, conflicts, recovery, tombstones, and provider consent;
- do not add focus-specific `beforeunload` or exit confirmation;
- keep critical alerts mounted and visible;
- hide only routine AI policy/versions/export/clear/delete while focused.

## Data model, API, storage, dependencies

- Database migrations: none.
- API routes/contracts: none.
- IndexedDB schema/journal: none.
- AI providers/semantic queue/search/Related/Ask: none.
- New dependencies: none.
- Browser history: only namespaced version/token/mode marker; no private content.
- Feature configuration: `NOTE_FOCUS_MODE_ENABLED`.

## Security and privacy

- Keep verified-session/same-origin/no-store note API behavior unchanged.
- Do not store note content, title, selection, cursor, scroll, status, mutation/journal ID, clipboard, or full URL in history/logs/events.
- Do not introduce raw HTML/contenteditable or relax Preview URL/image behavior.
- Background inert prevents covered destructive/navigation activation.
- No v1 product analytics. Browser QA artifacts use synthetic notes.

## Test plan

### Unit

- URL merge/remove; unrelated query preservation; source focus precedence.
- History state merge preserving arbitrary Next keys.
- owned entry vs direct load Back/replace; invalid version/token/item/flag.
- selection direction/textarea scroll/page scroll capture and restoration.
- editable target and IME Escape filtering.
- isolation snapshots/restores pre-existing `inert`/`aria-hidden`/overflow exactly; double cleanup.
- feature flag parsing/effective gate.

### Component/integration

- one editor, textarea, note API load, BroadcastChannel, and journal owner at desktop/mobile.
- Digest hides Notes without unmount; switching back preserves textarea object/content/status.
- Focus/Exit/Escape/Back/Forward preserve same textarea object, instance ID, value, mode, status, selection, scroll.
- entry/exit causes no note PUT or journal mutation.
- in-flight/coalesced save completes while focus toggles.
- offline, failed, session expired, oversize, conflict, recoveries, local-storage failure remain visible/actionable.
- background cannot focus; Tab loops; exit restores trigger/textarea.
- command palette does not open behind focus.

### Production-build browser/manual

- 1440×900, 1024×768, 768×1024, 390×844, 320×700.
- Chrome plus Safari/WebKit and Firefox where available.
- light/dark, reduced motion, 200%/400% zoom, split/resized window.
- same-DOM identity and native undo/redo across entry/exit/Back/Forward/breakpoint resize.
- direct focus URL, refresh, invalid marker, source-reading `mode=focus`.
- autosave idle/in-flight, offline/online, failed response, session expiry, oversize, conflict, cross-tab update.
- Android/Capacitor software keyboard and hardware/software Back.
- keyboard-only, VoiceOver, TalkBack.
- normal Notes formatting/Preview/save/recovery/AI policy/versions/export/clear/delete regressions.

## Rollout and monitoring

1. Implement/test single-editor consolidation.
2. Implement focus helpers/surface with `NOTE_FOCUS_MODE_ENABLED=0`.
3. Run full automated/build/privacy/docs/a11y/visual gates.
4. Deploy through `scripts/deploy.sh` with flag off; verify normal Notes, health, providers, webhook, Recall scheduler.
5. Enable flag through normal production configuration/restart.
6. Run production focus and normal-note smoke with synthetic content and cleanup.
7. Review console/client errors, duplicate GET/PUT, save/conflict behavior, and health.

No new analytics/monitoring service is added. Existing health, note API error logs, visible status, browser console, and request counts are sufficient.

## Rollback

Primary: set `NOTE_FOCUS_MODE_ENABLED=0`, restart normally, verify Focus absent, stale marker falls back to normal Notes, save still works, and health passes.

Secondary: deploy previous known-good artifact/commit if single-editor consolidation regresses normal Notes. No down migration, data repair, worker drain, consent rollback, or journal conversion is needed.

## Implementation milestones

1. Red tests for duplicate/unmounted editor behavior.
2. Single responsive persistent host.
3. Flag and pure history/isolation helpers with unit tests.
4. Focus-session hook and same-node surface.
5. Keyboard/focus/IME/command-palette coordination.
6. Component/save/error integration coverage.
7. Production-build responsive/a11y/native-state QA.
8. Flag-off deploy, enable, production smoke, documentation/wiki closeout.

## V1 risks and blockers

| Priority | Risk/blocker | Required evidence |
|---|---|---|
| P0 | Current duplicate/unmounting editors | Failing baseline test, then one-host passing test |
| P0 | Next reacts to native query changes by replacing editor | Production-build textarea pointer/instance/fetch-count proof or state-only fallback |
| P0 | Focus transition changes content/save behavior | No PUT/journal/value/timer reset assertions |
| P1 | Inert/focus cleanup leaves app inaccessible | Exact prior-state restoration and unmount/error tests |
| P1 | IME/child Escape conflict | Composition and deepest-layer test matrix |
| P1 | Mobile keyboard covers actions/last line | Real Capacitor evidence |
| P1 | Direct focus exposes blank before reconciliation | Loading/failed/direct-load browser evidence |

## Open technical questions for adversarial review

1. Is a root `NoteFocusModeProvider` necessary, or can a local hook plus document marker enforce the single-owner invariant more simply after host consolidation?
2. Should `itemId` be included in history state for stale validation, or is path parsing sufficient and more privacy-minimal?
3. Can ItemCompanionTabs maintain correct tab semantics when its Notes panel is forced visible on mobile through CSS, or should responsive behavior be explicit in component props?
4. Which production-browser harness can prove native undo and actual DOM pointer identity without adding a permanent E2E dependency?
