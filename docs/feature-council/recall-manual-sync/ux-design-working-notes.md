# UX/UI design working notes: Recall manual sync

**Role:** Expert UX/UI designer
**Review date:** 2026-07-11
**Authority order used:** supplied PRD, supplied rendered designs, current `main` patterns
**Recommendation:** A focused revised prototype is required before final visual sign-off. The current prototypes are a good compositional direction, but they are not complete or accessible enough to be used as literal implementation specifications.

## Executive verdict

The proposed Settings placement and overall card anatomy are sound. The Recall panel is findable without becoming a dashboard, the primary action is appropriately singular, progress and terminal outcomes are visually distinct, and the confirmation copy explains the operation without exposing internal implementation details.

However, four material issues must be resolved in the implementation source of truth and in a revised prototype:

1. The designs do not cover all PRD states. Loading, never-synced, active-run/coalesced, rate-limited, feature/worker unavailable, and request-expired presentations are absent.
2. Queued, running, and partial-failure designs replace the required persistent “last successful sync” and “next automatic sync” values with transient run copy. The PRD requires those two facts to remain visible.
3. The dialog is visually good but functionally incomplete: focus escapes to the underlying page, focus is not restored to the opener, and several mobile controls are smaller than 44px.
4. The prototype uses a parallel color/theme layer and shell details instead of the current project tokens and mobile safe-area shell. Implementation must use the current components and tokens.

Implementation can proceed once these decisions are encoded in PRD v2. Final design-parity approval should use a revised state board and interactive prototype.

## Sources inspected

- Authoritative PRD: supplied source checkout at `phase2/docs/plans/recall-manual-sync/RECALL_MANUAL_SYNC_SETTINGS_PRD_2026-07-10.md`
- Supplied designs: `desktop.html`, `mobile.html`, and `states.html` under the supplied source checkout's `phase2/docs/designs/recall-manual-sync-html-assets/`
- Current Settings structure: `src/app/settings/page.tsx`
- Current semantic tokens and focus/reduced-motion rules: `src/styles/tokens.css` and `src/app/globals.css`
- Current desktop/mobile shell: `src/components/sidebar.tsx`
- Existing visual baselines:
  - `phase2/UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/capture-settings-pairing-export-provider/desktop-settings-light.png`
  - `phase2/UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/a11y/a9-final-sweep/settings-mobile-touch.png`
  - `phase2/UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/shell-navigation/shell-settings-mobile-light.png`

## Rendered visual evidence

All three supplied HTML files were rendered in local Chrome and visually inspected. Desktop review used 1440px-wide viewports; mobile review used a 390 × 844 viewport. Scroll-offset captures preserve the stated viewport size while bringing the Recall section into view.

| Evidence | Viewport / purpose | Visual finding |
|---|---|---|
| `/tmp/recall-manual-sync-ux/desktop-ready-full.png` | Desktop, 1440px, full-page capture | Recall is correctly placed after AI services and before Data & Privacy; density broadly matches Settings. |
| `/tmp/recall-manual-sync-ux/desktop-ready-recall.png` | Desktop, 1440 × 900, Recall in viewport | Card hierarchy, badge, state message, two-column metadata, and quiet action row are visually coherent. |
| `/tmp/recall-manual-sync-ux/desktop-dialog.png` | Desktop confirmation | Modal width and content hierarchy are good; focused primary action is obvious. |
| `/tmp/recall-manual-sync-ux/desktop-dark-recall.png` | Desktop dark presentation | Structure remains legible, but colors differ from the project’s actual dark tokens and must not be copied literally. |
| `/tmp/recall-manual-sync-ux/mobile-ready-top.png` | Mobile, 390 × 844, top of Settings | The supplied design follows the current two-column Organization and stacked provider patterns. |
| `/tmp/recall-manual-sync-ux/mobile-ready-recall.png` | Mobile, 390 × 844, Recall in viewport | Metadata stacks and action becomes full width; bottom navigation visibly overlays the viewport and the safety note can sit behind it at intermediate scroll positions. |
| `/tmp/recall-manual-sync-ux/mobile-dialog.png` | Mobile, 390 × 844 confirmation | Content is readable, but close/secondary controls are undersized and the two-action row needs a 320px fallback. |
| `/tmp/recall-manual-sync-ux/states-desktop-full.png` | State board, 1440px | Eight non-dialog states are present: ready, queued, running, imported, current, blocked, failed, and partial failure. Required states are missing. |
| `/tmp/recall-manual-sync-ux/states-mobile-top.png` | State board, 390 × 844 | Cards correctly collapse to one column, but this does not add the missing states or persistent metadata. |

## Fit with current Settings and design system

### What should be retained

- Place **Recall sync** immediately after **AI services**. If the conditional **My notes** section is enabled, Recall still follows AI services, then My notes, then Data & Privacy. This follows the explicit PRD placement.
- Keep the current Settings content width (`max-w-[680px]`), section rhythm, 8px panel radius, 1px border, 14px/12px type hierarchy, and quiet visual density.
- Retain the prototype’s card anatomy: identity and status badge, state summary, persistent metadata, action row, and safety reminder.
- Retain a full-width mobile primary action and stacked metadata.
- Retain icon + text + semantic color for every status.

### What must not be copied literally

- The prototype defines a parallel palette (`--success`, `--progress`, separate dark base/panel colors). Use the current `--success`, `--warning`, `--danger`, `--info`, action, surface, border, and focus tokens instead.
- Do not recreate the prototype sidebar or bottom navigation. Reuse the current shell, including its `safe-area-inset-bottom` handling and route behavior.
- The prototype lowers the mobile Settings heading to 26px; the current page uses the same 30px heading across widths. Preserve the current page heading unless the whole Settings page is intentionally revised later.
- The prototype emphasizes the Recall section heading and adds a 3px semantic rail. The rail is acceptable for state recognition, but it should use semantic tokens and must not make the normal Ready card appear more important than security/privacy panels. A restrained rail is preferable to a larger heading or shadow.

## Recommended component anatomy

1. Section heading: **Recall sync**.
2. Panel header:
   - sync icon;
   - **Recall**;
   - secondary label **Automatic import**;
   - semantic text badge such as **Ready**, **Queued**, **Syncing**, **Complete**, **Needs attention**, **Failed**, or **Unavailable**.
3. State summary:
   - status icon;
   - concise state title;
   - one explanatory sentence;
   - optional aggregate counts or safe recovery instruction.
4. Persistent metadata block, present in every state after loading:
   - **Last successful sync** — `Today, 1:38 AM IST`, `Yesterday, 11:42 PM IST`, `10 Jul 2026, 1:38 AM IST`, or **Never**;
   - **Next automatic sync** — an absolute `Asia/Kolkata` value with visible `IST` suffix;
   - transient request/start/completion time may be a third line but must not replace either persistent fact.
5. Action row:
   - primary or disabled status action;
   - safety reminder **Uses daily-sync safety checks**;
   - on mobile, action first at full width and reminder below it.

Do not use the prototype strings “Last synced today at…” or “tomorrow at…”. They conflict with the PRD’s explicit formatter and obscure whether the value represents success. Label the value **Last successful sync** and use the prescribed capitalization/punctuation.

## Required state coverage

| Required state | Prototype coverage | Required presentation / correction |
|---|---|---|
| Loading | Missing | Title **Checking Recall sync…**; neutral/progress icon; disabled 44px action labeled **Checking…**; use `aria-busy="true"`. Do not show invented timestamps. |
| Ready, never synced | Missing | Ready copy plus **Last successful sync: Never** and a valid next automatic time. **Sync now** opens confirmation. |
| Ready, previous success | Present | Keep the composition, but rename metadata to **Last successful sync** and apply the exact IST formatter. |
| Confirming | Present | Keep supplied title/body/invariants/actions; add a real focus trap, inert background, Escape handling, and opener focus restoration. |
| Queued | Present, incomplete | Disabled **Queued** action. Keep last-success and next-auto metadata visible; show request time as additional context. Explain that the page may be closed. |
| Running | Present, incomplete | Disabled **Syncing…** action, `aria-busy="true"`, same persistent metadata, and “You can leave this page” copy. |
| Complete: imported/upgraded | Present | Aggregate counts are clear. Update last-success from the server response and retain next-auto. |
| Complete: current | Present | **No new eligible Recall items were found.** Update last-success because this is a successful run; retain next-auto. |
| Blocked: existing active run | Missing | Distinct from readiness failure: **A Recall sync is already running.** Do not offer a duplicate request. Show a disabled **Sync in progress** or **Waiting for active sync** action based on the server state. |
| Blocked: readiness/safety | Partially present | Use approved “couldn’t start safely / nothing imported” copy only when zero writes are proven. Show **Try again** only when readiness/cooldown allows it; otherwise disable with an explanatory label. |
| Failed before writes | Present | Keep explicit zero-write reassurance only when persisted counts prove it. Retain last-success and next-auto metadata. |
| Partial failure | Present, incomplete | Keep explicit imported/upgraded counts and safe retry copy. Retain the previous last-success value and next-auto; the failed attempt must not replace the success timestamp. |
| Rate limited / cooldown | Missing | Badge **Recently requested**; title **A sync was requested recently**; visible remaining cooldown; disabled action such as **Try again in 4:32**. Do not announce every countdown tick. |
| Feature/worker unavailable | Missing | **Manual sync is temporarily unavailable. Daily sync is unchanged.** Disabled **Unavailable** action; retain safe metadata when available. |
| Request expired | Missing, conditional on open decision | If 30-minute expiry is adopted, show **Request expired** with **Try again** and make clear that no run was started. |
| Status fetch/offline interruption | Missing | Do not convert an unknown server state into “failed.” Preserve the last known state, show **Status temporarily unavailable**, and offer **Check again**. A durably accepted run may still be continuing. |

Authentication expiration is not a Recall failure state. Follow the existing owner-session flow (re-authentication/Unlock) and do not imply the sync itself failed.

## Interaction requirements

### Ready to confirmation

- **Sync now** opens the dialog; opening it makes the rest of the page inert.
- Initial focus may land on **Start sync** as in the prototype, provided the dialog is not treated as destructive.
- **Cancel**, close, Escape, or approved backdrop dismissal closes without a request and returns focus to the exact initiating button.
- **Start sync** disables immediately on activation to prevent a double submission and changes to an acceptance/progress label while the POST resolves.

### Queue and run

- After `202`, show the durable server state; do not simulate fixed queued/running/success timers as the prototype does.
- Repeated clicks/submissions resolve to the active request and never create duplicate progress cards.
- Poll every two seconds only while queued/running, slow or pause in hidden tabs, cancel stale requests on navigation, and restore from server state on return.
- Page closure does not cancel the run. Say this in queued/running copy.
- In another tab, server state remains authoritative. Optional cross-tab notification may improve responsiveness but must not become the source of truth.

### Failure and recovery

- Keep “Nothing was imported / library was not changed” exclusive to persisted zero-write outcomes.
- For partial failure, show available import/upgrade counts and **Try again**. Never advance the displayed last-success timestamp from a partial outcome.
- For a network loss after enqueue, do not invite another POST until the client has first re-read server status or reused the same idempotency key.
- Cooldown countdown text may update visually, but only announce the transition to “Try again available,” not every second.

## Responsive behavior

### Desktop

- Preserve the current 680px Settings column rather than expanding to dashboard width.
- Keep the two metadata values in one row when they fit; values may wrap but should not truncate the `IST` suffix.
- Desktop controls may follow the existing 32–34px compact Settings convention, with clear focus rings.

### Mobile and narrow screens

- At 390px, retain 32px page gutters and stacked metadata as shown in the supplied mobile design.
- At 320px, allow state copy and timestamp values to wrap without horizontal scrolling. The dialog action row should stack at the narrowest width, with **Start sync** first visually only if DOM/focus order remains logical; otherwise use full-width Start then Cancel in DOM and visual order.
- The primary action, disabled progress action, dialog actions, and close target must each be at least 44 × 44px.
- Keep the current fixed bottom navigation and safe-area padding. Add enough page/dialog bottom clearance so every line and action can be scrolled fully above the navigation.
- The dialog should use `max-height: calc(100dvh - safe areas - margins)` and scroll internally on short screens; actions must remain reachable with the on-screen keyboard/zoom.

Measured prototype exceptions at 390px:

- Ready **Sync now**: 42px high.
- Dialog **Cancel**: 34px high.
- Dialog close target: 30 × 30px.
- Dialog **Start sync**: 42px high.

All four must be raised to at least 44px for the implementation and revised prototype.

## Accessibility review

### Confirmed strengths

- State is generally conveyed by icon, text, badge, and color rather than color alone.
- Keyboard focus styling is visually obvious on the primary confirmation action.
- The spinner has a `prefers-reduced-motion` rule that stops rotation.
- The dialog has `role="dialog"`, `aria-modal="true"`, and a labelled title in the prototype.

### Required corrections

- **Focus trap:** In a rendered desktop interaction test, opening the dialog focused **Start sync**, but the next Tab moved to `body`, then to the underlying **Navigation**, **Search**, and **Capture** controls. The modal does not trap focus.
- **Focus restoration:** After Escape, focus remained on an underlying **Capture** control rather than returning to the Recall opener. Store the opener and restore focus on every dismissal path.
- **Background isolation:** Apply `inert`/appropriate dialog primitive behavior so page controls are not reachable or exposed as active modal content.
- **Live region scope:** The prototype puts `aria-live="polite"` on the entire card. Use a dedicated, stable, `aria-atomic="true"` status message instead so polling does not repeatedly announce unchanged identity, timestamps, and actions.
- **Busy semantics:** Add `aria-busy="true"` to the status region while queued/running as appropriate; clear it at terminal state.
- **Disabled labels:** Use visible, meaningful labels: **Checking…**, **Queued**, **Syncing…**, **Try again in 4:32**, or **Unavailable**.
- **Reduced motion:** The icon may remain static for reduced-motion users; status text must carry the progress meaning.
- **Touch size:** Correct the four measured mobile failures listed above.
- **Contrast:** The prototype’s light `--muted` value `#8a94a6` on white measures approximately 3.06:1, below WCAG AA for its 9–11px safety and metadata text. Use the project’s stronger `--text-muted`/`--text-secondary` tokens and verify all light/dark combinations. The prototype’s semantic foreground/background pairs measured approximately 4.57:1 or higher, but implementation colors still require automated and visual verification using project tokens.
- **Zoom/reflow:** Verify at 200% browser zoom and 320 CSS px without clipped timestamps, actions, or dialog content.

## Conflict and decision log

| Conflict/gap | Decision |
|---|---|
| Prototype says “Last synced today at…” while PRD defines last successful semantics and exact IST formats. | PRD wins. Label **Last successful sync** and use `Today, 1:38 AM IST`, `Yesterday, 11:42 PM IST`, or `10 Jul 2026, 1:38 AM IST`. |
| Prototype drops last-success/next-auto during queued, running, and partial failure. | PRD wins. Both persistent metadata values remain visible in all resolved states. |
| Prototype state board includes only eight non-dialog states. | Add all state rows listed above before final approval. |
| Prototype offers **Try again** for every blocked state. | Action availability follows server readiness, cooldown, and active-run state. Never invite a duplicate request. |
| Prototype uses separate colors and shell CSS. | Current project tokens and shell win. Reuse existing semantic/action/focus/safe-area conventions. |
| Prototype mobile controls are below 44px. | PRD accessibility requirement wins; use at least 44px for every mobile interactive target. |
| Prototype Escape listener closes the modal but lacks trap/restoration. | PRD wins; use a proven dialog primitive or implement and test trap, inertness, Escape, and focus return. |
| Conditional My notes currently sits between AI services and Data & Privacy. | Insert Recall immediately after AI services, before My notes, to honor explicit placement while retaining My notes. |
| Prototype uses “tomorrow” for the next run while the PRD only specifies Today/Yesterday/older formatting rules. | Prefer an unambiguous absolute `Asia/Kolkata` date/time with `IST`; only use “Tomorrow” if PRD v2 explicitly adds it to the shared formatter. |

## Focused prototype revision requested

A full redesign is unnecessary. Revise the existing artifacts to:

1. add loading, never-synced, active-run/coalesced, rate-limited, unavailable, expired (if approved), and status-fetch interruption states;
2. show last-success and next-auto metadata in every resolved state;
3. use the exact IST formats and **Never** treatment;
4. correct dialog focus behavior, live-region scope, mobile target sizes, and narrow-screen action layout;
5. replace prototype-only colors with project tokens and reuse the current mobile safe-area shell;
6. provide light/dark captures at desktop 1440/1024 and mobile 390/320, plus reduced-motion and 200% zoom evidence.

Final UX approval should require the revised state board, keyboard-dialog evidence, and verified 44px/contrast checks. Until then, the supplied prototypes should be treated as compositional guidance rather than pixel-exact implementation authority.

## Magic Patterns operation boundary

- Magic Patterns changed: no.
- Published: no.
- Local project files created: this working-notes file only.
- Preview verification: not applicable; the supplied standalone HTML assets were rendered locally.
