# Note Focus Mode — Technical Implementation Plan v2

**Status:** Engineering source of truth
**Supersedes:** `technical-plan-v1.md`
**Contracts:** [PRD v2](../prd/prd-v2.md), [UX/UI v2](../ux/ux-ui-v2.md)
**Review resolved:** [Technical v1 adversarial review](NOTE_FOCUS_MODE_TECHNICAL_PLAN_V1_ADVERSARIAL_REVIEW_2026-07-10_21-07-55_IST.md)

## V1 review disposition

| Finding | V2 resolution |
|---|---|
| Flag cannot rollback shared host | Two rollback scopes: Focus flag/restart; shared-host previous artifact/commit with rehearsal. |
| Browser proof path undefined | Real component + selected Codex in-app browser against production build; DOM/network/history/geometry instrumentation and saved evidence. |
| Next history feasibility late | Production-build native-history tracer immediately after host consolidation, before full overlay. |
| Normal host semantics vague | Exact mobile/desktop source order, panels, IDs, hidden behavior, and count gates below. |
| Non-durable navigation unowned | Add explicit journal-write-failed/server-ack comparison, document unsafe marker, link/palette/beforeunload guard. |
| Escape hook lacks editor state | Editor owns arbitration; hook exposes request/perform enter/exit only. |
| Isolation failure cleanup | Transactional helper returns idempotent cleanup and rolls back partial application in catch/finally. |
| Mobile viewport optional | Predefine visualViewport CSS-variable seam and geometry gate; activate fallback only if CSS fails. |
| Provider overengineering | No root provider in v1. Local hook + content-free document events/markers only. |
| Item ID in history state | Removed. State is only `{v,token}`; item route comes from pathname. |
| Flag wiring vague | Add repo documentation/config path and explicit flag-off/on/rollback smoke. |

## Architecture

```text
ItemPage (server)
  ├─ reads manual-note UI + NOTE_FOCUS_MODE_ENABLED
  └─ renders one responsive shared companion host
       └─ ItemCompanionTabs (Notes + Digest stay mounted)
            └─ ManualNoteEditor (only note/session owner)
                 ├─ useNoteFocusSession (presentation/history snapshots only)
                 ├─ focus-history (pure URL/state decisions)
                 ├─ focus-isolation (transactional DOM isolation/scroll lock)
                 └─ navigation durability guard (only unsafe draft state)
```

No portal, alternate editor route, browser Fullscreen API, root content provider, data migration, note API change, journal schema change, analytics SDK, or runtime dependency.

## Implementation sequence and tracer bullets

### Slice 1 — persistent normal host

1. Red component test: type into Notes, switch desktop Digest → Notes, prove the input/editor state resets on baseline.
2. Change `ItemCompanionTabs` to keep both panels mounted and hide inactive panel.
3. Green component test plus tab semantics/focusability.
4. Remove mobile editor instantiation; expose one shared responsive host.
5. Browser evidence with Focus disabled: one My notes region/textarea/note GET/owner; normal desktop/mobile/Digest/save.

### Slice 2 — History feasibility tracer

1. Add pure focus URL/state planner tests.
2. Add temporary/minimal Focus toggle on the real shared editor without final styling.
3. Run production build in selected in-app browser.
4. Mark controller/textarea object, push visible query, Back, Forward; observe note GET/PUT and editor marker.
5. If identity survives, retain canonical visible query. If it does not, select same-URL state-only history and update URL-specific docs before proceeding. Never carry two runtime modes.

### Slice 3 — same-node Focus surface

1. Red interaction test for entry/exit preserving the same Write textarea/value/selection.
2. Implement local focus state/hook and same-section fixed classes/semantics.
3. Green test; add Back/direct/invalid/flag slices one at a time.

### Slice 4 — isolation, input, durability

1. Transactional isolation red/green tests.
2. Editor-owned IME/child/Escape red/green tests.
3. Unsafe journal failure/navigation red/green tests.
4. Palette suppression and cleanup tests.

### Slice 5 — responsive/a11y/release

1. Geometry/reflow/viewport fallback.
2. Failure-state traceability.
3. Production-build browser/device/AT matrix.
4. Flag-off deploy, enable, production smoke, docs/wiki/log.

## Responsive single-host implementation

### Item page tree

- Keep mobile `MobileItemDetailTabs` for navigation and non-note tab content, but remove its `ManualNoteEditor` rendering.
- Change the existing desktop grid into a shared responsive grid:
  - mobile: `display:grid` only when Notes route active; article hidden; companion visible;
  - desktop: grid always visible; article + companion;
  - other mobile tabs: shared grid `display:none`, but editor controller remains in the server/client tree as long as the item page identity is preserved.
- Inside companion, render `ItemCompanionTabs` and wrap all other desktop aside panels in `hidden md:flex`.

### Companion tab semantics

- Stable IDs derived from component `useId`:
  - `digest-tab`, `notes-tab`, `digest-panel`, `notes-panel` (unique prefix).
- Buttons use `role=tab`, `aria-selected`, `aria-controls`, and roving/normal tab behavior consistent with current buttons.
- Panels use `role=tabpanel`, `aria-labelledby`.
- Desktop inactive panel uses `hidden`/`display:none`; component subtree remains mounted.
- Mobile tablist and Digest panel are `display:none`; Notes panel is visible and can use an explicit `mobileNotesOnly`/responsive prop rather than relying on an invisible controlling tab for accessible naming. My notes region remains self-labeled.
- Breakpoint changes never key/reparent/duplicate the editor.

### Compact behavior

Remove the server-selected `compact` lifecycle fork if it impedes one host. Prefer responsive classes on the one editor:

- section `p-4 pb-28 md:p-5 md:pb-5`;
- touch controls `h-11`/`w-11`, desktop `md:h-9` or `md:h-10`;
- textarea `min-h-72 md:min-h-80`;
- normal action bar `fixed ... bottom-[72px] md:static`;
- Focus action bar uses focus-specific sticky/safe-area classes.

## Feature flag

- Add `noteFocusModeEnabled()` in `src/lib/notes/flags.ts` for `NOTE_FOCUS_MODE_ENABLED` using existing boolean parsing.
- Server item page passes `focusEnabled = manualNotesUiEnabled() && noteFocusModeEnabled()` to the editor.
- Flag off:
  - Focus control absent;
  - no initial URL restoration;
  - stale focus marker ignored/normalized without changing note;
  - shared-host normal behavior remains and must already be proven safe.
- Document the flag in user/technical wiki and production configuration. Never print its raw environment file.

## Focus history module

`src/lib/notes/focus-history.ts` is pure and browser-independent.

### Approved schemas

```text
URL: /items/:id?<existing params>&tab=notes&note_mode=focus
history.state.__brainNoteFocus: { v: 1, token: <random opaque string> }
```

No item ID, title, content, selection, scroll, status, journal/mutation ID, or clipboard in state. Path parsing proves item context.

### Pure operations

- `withNoteFocus(url)` preserves unrelated params, sets `tab=notes`, sets `note_mode=focus`, and rejects source `mode=focus`.
- `withoutNoteFocus(url)` removes `note_mode`, retains `tab=notes` and unrelated params.
- `mergeFocusState(existing, token)` shallow-copies existing Next keys and adds namespace.
- `withoutFocusState(existing)` removes only namespace.
- `readFocusIntent(url,state,flag)` returns disabled/invalid/direct/owned intent.
- `planExit(intent)` returns local-back or replace-normalize.

### Runtime rules

- Local entry first applies local Focus, then pushes state/URL selected by the tracer.
- Locally owned Exit removes presentation immediately and calls Back once; popstate cleanup is idempotent.
- Direct/refreshed/unowned Exit replaces marker and stays on Notes.
- Back without active marker exits; Forward to valid owned marker re-enters after editor load/registration.
- Invalid version/token/path, source focus collision, or flag-off never enables Focus.
- Do not use `router.push`, `router.replace`, Link, server action, or route branch to toggle Focus.

## `useNoteFocusSession`

Local to `ManualNoteEditor`; owns only:

- `normal | entering | focused | exiting` presentation state;
- entry token/history ownership;
- trigger/active element;
- page scroll;
- Write textarea selection start/end/direction/scroll and active flag;
- transaction cleanup from isolation;
- initial/direct intent after editor load state is known.

Interface remains small:

```ts
{
  isFocused: boolean;
  enterFocus(trigger: HTMLElement | null): void;
  exitFocus(reason: "button" | "escape" | "history"): void;
  handlePopState(event: PopStateEvent): void;
}
```

It never owns Markdown, editor mode, note snapshot, save status, journal, conflict/recovery, or child-layer state.

## Editor-owned focus arbitration

`ManualNoteEditor` knows `composingRef`, consent, delete, versions, conflict, and recovery.

- `focusBlocked = consentRequired.length>0 || deleteConfirm || showVersions`.
- Focus button disabled with explanation while blocked.
- Conflict/recoveries remain visible in Focus.
- Section keydown capture:
  1. ignore IME composition/229/ref;
  2. close an allowed dismissible child if one can exist;
  3. never resolve conflict/recovery;
  4. request Focus exit.
- `Cmd/Ctrl+S` remains current textarea handler.
- No new Focus chord.

## Transactional background isolation

`src/lib/notes/focus-isolation.ts`:

1. Build a mutation list without changing DOM.
2. Snapshot every sibling branch's `inert` property and exact `aria-hidden` presence/value.
3. Snapshot document/body overflow and page scroll.
4. Apply isolation in a guarded block.
5. On any throw, immediately restore already-applied mutations and rethrow.
6. Return an idempotent cleanup that restores in reverse order.

Set `document.documentElement.dataset.noteFocusActive="true"` only after isolation succeeds. Cleanup removes/restores prior dataset value, overflow, inert/aria state, scroll, and focus even when called twice or on unmount.

Command palette behavior:

- If open, close before Focus through a content-free custom event or a small `close` integration that does not own editor state.
- Global Cmd/Ctrl+K handler checks `data-note-focus-active` and does nothing while active.
- No palette DOM may mount above/behind Focus.

## Same-section Focus surface

Conditional attributes/classes on existing editor section:

- `role=dialog`, `aria-modal=true`, `aria-labelledby` item-aware focus heading;
- fixed opaque `inset-0`, z-index above palette/nav;
- `height:100dvh` with fallback; safe-area padding;
- one scroll owner and centered max 880px content;
- sticky top Exit/title row;
- Write/Preview/toolbar in scroll flow;
- textarea `min-height:max(12rem,40dvh)`, non-resize in Focus;
- sticky bottom status/bytes/Copy/Save row;
- management block hidden while focused; critical recovery/failure blocks remain;
- no key/portal/conditional wrapper that replaces the editor/Write textarea.

## Selection, scroll, focus, and native undo

Entry snapshot applies only when Write textarea exists. After layout, restore using `focus({preventScroll:true})`, `setSelectionRange(start,end,direction)`, then textarea scroll. Button entry focuses `tabIndex=-1` focus heading; textarea entry refocuses textarea.

Exit removes presentation/isolation first, restores page scroll, then:

- textarea-origin → same Write textarea/selection/scroll;
- button-origin → Focus trigger;
- fallback → My notes heading.

No content update, React key, mode change, save/journal call, or timer cancellation occurs. Preview retains controller/Markdown/mode but no textarea identity claim. Hard refresh creates a new document and relies on existing durable recovery.

## Unsafe navigation guard

Add an explicit durability signal inside the editor:

- `journalWriteFailed` becomes true only when a journal write for current content fails; false after a later successful journal write.
- `serverAcknowledgedCurrent = snapshot.note?.contentMarkdown === content` (with deleted/recreate semantics handled explicitly).
- `unsafeNavigation = journalWriteFailed && !serverAcknowledgedCurrent`.
- Mirror only a boolean content-free marker on `document.documentElement.dataset.noteUnsafeNavigation` for shell/palette coordination.

Behavior:

- Focus Exit never prompts.
- `beforeunload` uses browser-native guard while unsafe.
- Same-origin anchor/navigation capture and command-palette `go()` check unsafe state and use a targeted confirmation/guard; cancel keeps editing. Copy and manual Save/Retry are visible in the editor. Explicit Leave performs the stored destination once and clears only the pending navigation, not content.
- A second Back/page navigation while unsafe is intercepted where the platform permits; browser-native limitations are documented/tested.
- Successful journal or server acknowledgement clears unsafe marker/listeners.

Do not log draft content or destination full query.

## Session expiry recovery

When status is `session-expired`, render:

- `Unlock to sync` link to `/unlock?next=<encoded current same-origin item Focus URL>`;
- Copy;
- Exit.

Local journal remains. On return, normal server/journal reconciliation shows the old editor draft as recoverable if the document changed. Never auto-discard or claim native state continuity across unlock navigation.

## Mobile visual viewport seam

CSS is default. Add a small optional hook only if geometry fails:

- listen to `visualViewport.resize/scroll` while Focus active;
- write content-free CSS variables for visual height/offset;
- debounce via animation frame, not timers tied to save;
- remove listeners/variables transactionally on exit/unmount;
- never modify textarea value/selection; restore scroll after geometry settles.

Required geometry:

- bottom action rect inside visual viewport;
- textarea bottom padding ≥ action height + safe inset;
- caret/final line scrolls above keyboard/action;
- first Back hides keyboard, second exits Focus.

## Persistence, concurrency, and APIs

Unchanged:

- server snapshot/no-store API;
- IndexedDB record schema and editor identity;
- 750ms idle/5s max autosave;
- one in-flight + coalesced intent;
- mutation idempotency, epoch/generation conflict, BroadcastChannel;
- deleted tombstones, versions, provider consent, worker/search/AI behavior.

Focus transitions never invoke note GET/PUT/DELETE/PATCH, local journal put/delete, or semantic work.

## Privacy and security

- Same session/auth/origin boundary.
- Content-free URL/state schemas only.
- Safe Preview behavior unchanged.
- Background destructive/navigation controls inert/unreachable.
- No v1 analytics.
- Synthetic-only screenshots/evidence.
- Privacy checks inspect URL, copied link, state, server request/log observation, artifacts, and docs for denied fields.

## Test and evidence plan

### Repository Node/jsdom tests

- Companion persistent state and tab semantics.
- Focus flag.
- URL/state operations/collisions/invalid/flag-off.
- Transactional isolation exact restore/throw/double cleanup.
- IME/child/Escape filtering.
- Unsafe durability marker/guard clear.
- Component entry/exit via accessible controls; one controller/textarea in Write; Preview contract; no Focus-triggered fetch mutation.

The TDD workflow follows repository `node:test`/jsdom conventions because this repository does not use Vitest/RTL.

### Production-build in-app-browser evidence

- Start isolated synthetic DB with Notes/Focus flags; create representative item.
- Use selected Codex in-app browser and viewport capability.
- Inspect current DOM/requests/console; never read private production credentials/storage.
- Store content-free editor instance marker in a DOM/debug attribute intended only for tests if necessary.
- Prove actual textarea object identity within one browser session, native undo exact value, selection direction, scroll, no extra GET/PUT, Back/Forward/direct/refresh/invalid/flag-off.
- Save screenshots and a combined normal-vs-Focus comparison at same viewport.

### Required matrix

- 1440×900, 1024×768, 768×1024, 390×844, 320×700.
- 200%/400% reflow using supported browser zoom/viewport method.
- light/dark, reduced motion, keyboard-only.
- offline, failed, session expired, oversize, conflict, recoveries, journal unavailable, in-flight/coalesced, cross-tab.
- Android/Capacitor keyboard and Back; real IME; VoiceOver/TalkBack when available.

Evidence labels each cell required/pass/fail/blocked and never substitutes screenshot for native/DOM/AT proof.

## Rollout, monitoring, and rollback

### Pre-release

1. Shared-host implementation passes Focus-disabled normal regression.
2. Previous known-good artifact/commit rollback command is recorded and rehearsed in safe environment.
3. History tracer selects one contract.
4. All P0/P1 atomic evidence passes.
5. Full test/lint/typecheck/build/privacy/docs/dependency gates pass.

### Deploy

1. Guarded production deploy with `NOTE_FOCUS_MODE_ENABLED=0`, preserving existing manual notes, Recall flags/timer, provider approvals, and data.
2. Smoke normal desktop/mobile Notes, Digest, save, Preview, health, providers, webhook, Recall.
3. Enable Focus flag through normal remote configuration and restart.
4. Smoke Focus entry/exit/Back/Forward/Save/selection/undo/normal Notes/mobile keyboard/Back with synthetic content and cleanup.

### Monitoring

- authenticated health;
- service/Recall timer;
- strict provider checks;
- browser console/client errors;
- note API failures/conflicts;
- duplicate GET/PUT/editor/channel/journal observations during smoke.

No product telemetry is added.

### Rollback

- Focus-only defect: flag off + normal restart; prove Focus absent, stale URL normalizes, normal Notes/health pass.
- Shared-host/normal defect: deploy previous known-good artifact/commit; prove normal desktop/mobile/Digest/save and health. No schema/data rollback.
- Immediate rollback triggers: content loss, controller/textarea replacement in supported transition, false Saved state, duplicate owners/requests, blocked Exit, background focus leak, keyboard overlap preventing writing/save, or cleanup leaving app inert/locked.

## Files likely to change

- `src/app/items/[id]/page.tsx`
- `src/components/item-companion-tabs.tsx` + new test
- `src/components/manual-note-editor.tsx` + new interaction test
- `src/components/command-palette.tsx` + test if guard changes
- `src/lib/notes/flags.ts` + test coverage
- new `src/lib/notes/focus-history.ts` + tests
- new `src/lib/notes/focus-isolation.ts` + tests
- new `src/lib/notes/use-note-focus-session.ts`
- optional small viewport helper after measured failure
- canonical Manual Content Notes wiki/docs, feature folder, running log

## Implementation no-go gates

- More than one editor/note GET/journal/channel owner.
- Shared-host normal regression or unrehearsed artifact rollback.
- History tracer cannot preserve controller/Write textarea; no selected fallback.
- Focus transition mutates content/journal/save or resets status/timers.
- Unsafe non-durable content can navigate away silently.
- Partial isolation cleanup leaves app inert/hidden/locked/palette-conflicted.
- IME/child/Back arbitration fails.
- Exit/Save/status/final line is obscured at required viewport/zoom/keyboard state.
- Flag cannot be proven off/on/rolled back.
- Required device/AT cell is unavailable or fails.

## Residual risks

Browser-native undo, History integration, WebView keyboard geometry, and assistive-technology interpretation remain platform-owned. They are acceptable only under the documented supported matrix, with the feature flag off until evidence passes and immediate configuration/artifact rollback ready.
