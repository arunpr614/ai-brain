# UX/UI v1: Recall sync Settings experience

Status: v1 for adversarial review
Visual baseline: supplied desktop/mobile/state HTML, reconciled with current Settings tokens and shell

## Experience objective

Make synchronization feel deliberate, ordinary, and truthful: the owner can see the last validated success, request one safe run, leave the page, and later understand the outcome without interpreting locks, services, proofs, or checkpoints.

## Entry point and layout

Place **Recall sync** immediately after **AI services**, before conditional **My notes** and **Data & Privacy**. Use the current `max-w-[680px]` Settings column, section spacing, 8px radius, surface/border/action tokens, and fixed mobile bottom-navigation clearance.

Panel anatomy:

1. Header: sync icon, **Recall**, **Automatic import**, semantic badge.
2. State summary: status icon, title, one concise detail, optional safe aggregate counts.
3. Persistent metadata: **Last successful sync** and **Next automatic sync**.
4. Optional transient metadata: requested/started/completed time.
5. Action row: one primary/disabled action and **Uses daily-sync safety checks**.
6. Dedicated visually discreet live region for transition announcements.

A restrained 3px semantic rail may reinforce state, but no shadow, dashboard expansion, or larger section heading is introduced.

## Timestamp presentation

Use a pure shared formatter with `timeZone: "Asia/Kolkata"`:

- Same IST date: `Today, 1:38 AM IST`
- Previous IST date: `Yesterday, 11:42 PM IST`
- Older: `10 Jul 2026, 1:38 AM IST`
- No validated success: `Not yet synced`
- Missing/stale trusted schedule: `Schedule unavailable`

Render with `<time dateTime="UTC-ISO">`; exact time is visible, so a tooltip is optional. Never show a failed attempt as the last-success value.

## State and copy matrix

| State | Badge | Title and detail | Action | Persistent metadata |
| --- | --- | --- | --- | --- |
| Loading | Checking | **Checking Recall sync…** Loading the latest trusted status. | Disabled **Checking…** | Hide unknown values; never invent |
| Ready, never | Ready | **Recall is ready** New eligible items are imported automatically each day. | **Sync now** | Not yet synced + trusted schedule/fallback |
| Ready, previous success | Ready | **Recall is ready** New eligible items are imported automatically each day. | **Sync now** | Previous success + schedule |
| Confirming | Dialog | **Sync Recall now?** AI Memory will import new eligible Recall items and safely upgrade weaker existing captures. | **Start sync**, **Cancel** | Background page inert |
| Queued | Queued | **Sync requested** Your request is waiting for the trusted sync worker. You can leave this page. | Disabled **Queued** | Retain previous success + schedule; add request time |
| Running manual | Syncing | **Sync in progress** Checking Recall and importing eligible items. You can leave this page. | Disabled **Syncing…** | Retain previous success + schedule; add start time |
| Running automatic | Syncing | **Automatic sync in progress** Daily Recall synchronization is running. | Disabled **Sync in progress** | Retain previous success + schedule |
| Long running | Syncing | **This is taking longer than usual** You can leave this page; sync will continue. | Disabled **Syncing…** | Retain values and start time |
| Imported | Complete | **Sync complete** `{n}` items imported, `{u}` upgraded, and `{c}` already current. | **Sync now**, subject to cooldown | Update success; retain schedule |
| Current | Up to date | **You’re up to date** No new eligible Recall items were found. | **Sync now**, subject to cooldown | Update success; retain schedule |
| Active collision | Queued | **Waiting for the active sync** Another Recall sync is finishing first. | Disabled **Queued** | Retain values |
| Safety blocked, proven zero | Needs attention | **Sync couldn’t start safely** Nothing was imported. | **Try again** only when eligible | Retain previous success + schedule |
| Failed, proven zero | Failed | **Sync failed** The run stopped before any items were imported. Your library was not changed. | **Try again** after cooldown/readiness | Retain previous success + schedule |
| Failed, counts unknown | Failed | **Sync stopped** The result could not be fully confirmed. Check again before retrying. | **Check again** | Retain previous success + schedule |
| Partial | Incomplete | **Sync stopped early** `{n}` items were imported and `{u}` upgraded before the run stopped. It is safe to try again. | **Try again** after cooldown | Preserve previous success + schedule |
| Cooldown | Recently requested | **A sync was requested recently** Try again when the cooldown ends. | Disabled **Try again in 4:32** | Retain values |
| Request expired | Expired | **Request expired** The worker did not start this request; no sync was run. | **Try again** | Retain values |
| Feature/worker unavailable | Unavailable | **Manual sync is temporarily unavailable** Daily sync is unchanged. | Disabled **Unavailable** | Retain safe known values |
| Offline before request | Offline | **You’re offline** Connect to request a sync. | Disabled **Offline** | Retain cached known values with status caveat |
| Status unknown after acceptance | Offline | **Status temporarily unavailable** Your accepted sync may still be continuing. | **Check again**; no new POST | Retain last known values |
| Session expired | Session expired | **Unlock AI Memory to check sync status** The server-side sync state is unchanged. | Link **Unlock** | Do not reveal server status |

Cooldown countdown may update visually, but the live region announces only when retry becomes available.

## Confirmation dialog

Use the existing Radix Dialog dependency.

Title: **Sync Recall now?**

Body: AI Memory will import new eligible Recall items and safely upgrade weaker existing captures.

Invariants:

- Existing items won’t be duplicated.
- The daily schedule stays unchanged.
- The same safety checks run first.

Actions:

- Primary **Start sync**; initial focus is acceptable because the action is not destructive.
- Secondary **Cancel**.
- Close target with accessible label.

Required behavior:

- Focus remains inside the modal; background is inert.
- Escape, close, Cancel, and approved overlay dismissal create no request.
- Every dismissal restores the exact opener.
- Start disables immediately while the POST resolves.
- At 320px actions stack and each target, including close, is at least 44×44px.
- Short screens use internal scrolling with safe-area-aware maximum height.

## Interaction controller

- Initial GET is authoritative.
- Active queued/running states poll every two seconds while visible.
- Hidden tabs pause or use a materially slower interval; visibility/reconnect performs an immediate GET.
- Abort in-flight work on unmount/navigation; ignore out-of-order responses.
- Stop polling on terminal, disabled, or authentication-expired status.
- Preserve the same idempotency key across an uncertain POST result until a GET resolves whether it was accepted.
- Multiple tabs may poll independently; the server resolves deduplication.
- Network failure is an overlay, not an automatic server failure transition.

## Accessibility

- Dedicated stable `role="status" aria-live="polite" aria-atomic="true"` announces queued, running, long-running, complete/current, blocked, failed, partial, offline/status-unknown, and session-expired transitions only.
- Use `aria-busy="true"` for loading/queued/running status content.
- Badge, icon, title, detail, and action label carry semantics without color.
- Spinner is decorative, hidden from assistive technology, and stops under `prefers-reduced-motion`; progress text remains complete.
- All mobile interactive targets are 44px minimum.
- Use current `--text-secondary`/semantic tokens, not the prototype’s weak muted color.
- Verify AA contrast, keyboard-only flow, 200% zoom/reflow, and screen-reader announcement sequence.

## Responsive behavior

### Desktop

- 680px column; two metadata columns when they fit.
- Values wrap rather than truncate the IST suffix.
- Action and safety note share one row.
- Existing compact desktop control convention may be used with clear focus rings.

### 390px mobile

- Current page gutters and shell.
- Metadata stacks; action is full width and 44px.
- Safety note sits below action.
- Sufficient bottom padding lets every line scroll above navigation.

### 320px and zoom

- Copy, badges, counts, and timestamps wrap without horizontal scrolling.
- Dialog actions stack; logical DOM and visual order match.
- No fixed Recall action competes with bottom navigation.

## Visual tokens

Use current surface, border, action, success, warning, danger, info, focus, typography, spacing, radius, dark-theme, and reduced-motion tokens. No new global palette is required. Semantic rail/icon/message background use existing tokens with AA-verified foregrounds.

## Revised prototype requirement

Create a focused standalone state board that:

- includes every matrix state above;
- retains persistent metadata in every resolved state;
- uses exact IST/fallback copy;
- demonstrates desktop two-column and narrow stacked metadata;
- has 44px controls, project-token approximations, strong contrast, and reduced-motion CSS;
- uses a real focus-trapping dialog or documents that the static board is non-interactive and defers modal proof to the implementation.

Final evidence requires light/dark desktop 1440/1024, mobile 390/320, dialog keyboard focus, reduced motion, 200% zoom, and bottom-nav clearance.

## V1 validation checklist

- [ ] Every PRD state mapped to badge/title/detail/action/announcement.
- [ ] Last-success retained through queued/running/blocked/failure/partial.
- [ ] Never and schedule-unavailable are explicit.
- [ ] Dialog trap/Escape/return and no-request cancellation verified.
- [ ] Status announcements occur only on semantic transitions.
- [ ] Desktop/mobile/320/zoom/dark/reduced-motion/contrast checks pass.
- [ ] No raw internal reason, report, path, credential, source identifier, or content is displayed.

## Open questions for adversarial review

1. Should overlay click dismiss the confirmation, or should v2 require explicit Cancel/close to reduce accidental dismissal ambiguity?
2. Is a semantic left rail too visually prominent in Ready state relative to adjacent Settings panels?
3. Should cooldown appear immediately after every successful run or only after a user attempts another request?
4. Is **Not yet synced** preferable to the supplied designer’s **Never** for clarity and tone?
