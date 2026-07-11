# UX/UI v2: Recall sync Settings experience

Status: Approved UX source of truth for implementation
Date: 2026-07-11
Supersedes: `ux-ui-v1.md` where they differ

## Adversarial disposition

| V1 finding | V2 resolution |
| --- | --- |
| No POST acknowledgment state | Added local **Requesting sync…** and same-key status recovery. |
| Offline cached values could look current | All offline/unknown data is labelled **Last known** with **Last checked … IST**; past schedule is unavailable. |
| Cooldown hid or contradicted terminal outcome | Terminal result remains; only action changes to server countdown. |
| Revised prototype absent | Focused revised state board is a required pre-implementation UX gate. |
| 32px gutters too rigid at 320 | Use `px-4 sm:px-8`. |
| Overlay dismissal unresolved | Overlay click does not dismiss. |
| Aggregate copy/overflow undefined | Deterministic pluralization, zero-clause omission, bounded safe integers, wrap tests. |

## Placement and anatomy

Insert **Recall sync** directly after **AI services**, before **My notes** and **Data & Privacy**. Reuse the current Settings width, rhythm, surfaces, borders, semantic tokens, focus rings, dark theme, safe-area shell, and bottom navigation.

Panel order:

1. Recall icon, **Recall**, **Automatic import**, status badge.
2. Icon/title/detail state summary.
3. Persistent **Last successful sync** and **Next automatic sync**.
4. Optional request/start/complete or **Last checked** line.
5. One action and **Uses daily-sync safety checks**.
6. Stable offscreen/quiet live region.

Omit the semantic left rail in Ready by default; enable it only for progress/warning/danger if implementation comparison shows it improves recognition without over-emphasis.

## Exact time and stale rules

Use `Asia/Kolkata` only:

- Today: `Today, 1:38 AM IST`
- Yesterday: `Yesterday, 11:42 PM IST`
- Older: `10 Jul 2026, 1:38 AM IST`
- Never: `Not yet synced`
- Missing/stale/past schedule: `Schedule unavailable`

Use `<time dateTime="UTC-ISO">`. If network/status is unknown, prefix known metadata with **Last known** and show **Last checked … IST**. Never label a past value as **Next automatic sync**.

## State/copy/action matrix

| State | Badge | Summary | Action |
| --- | --- | --- | --- |
| Loading | Checking | **Checking Recall sync…** Loading the latest trusted status. | Disabled **Checking…** |
| Ready, never | Ready | **Recall is ready** New eligible Recall items are imported automatically each day. | **Sync now** |
| Ready, prior success | Ready | Same ready copy. | **Sync now** |
| Confirming | Dialog | Approved title/body/invariants. | **Start sync**, **Cancel**, close |
| Requesting | Starting | **Requesting sync…** Saving your request safely. | Disabled **Requesting…** |
| Queued | Queued | **Sync requested** Waiting for the trusted worker. You can leave this page. | Disabled **Queued** |
| Queued behind automatic | Queued | **Waiting for the active sync** Your request will start after the current sync. | Disabled **Queued** |
| Running manual | Syncing | **Sync in progress** Checking Recall and importing eligible items. You can leave. | Disabled **Syncing…** |
| Running automatic | Syncing | **Automatic sync in progress** Daily Recall synchronization is running. | Disabled **Sync in progress** |
| Long running | Syncing | **This is taking longer than usual** You can leave; sync will continue. | Disabled current label |
| Imported | Complete | **Sync complete** Safe bounded imported/upgraded/already-current clauses. | Countdown or **Sync now** |
| Current | Up to date | **You’re up to date** No new eligible Recall items were found. | Countdown or **Sync now** |
| Safety blocked, zero proven | Needs attention | **Sync couldn’t start safely** Nothing was imported. | Countdown then **Try again** |
| Failed, zero proven | Failed | **Sync failed** The run stopped before any items were imported. Your library was not changed. | Countdown then **Try again** |
| Failed, counts unknown | Failed | **Sync stopped** The result could not be fully confirmed. Check status before retrying. | **Check again**, then countdown/retry |
| Partial | Incomplete | **Sync stopped early** Safe imported/upgraded clauses; retry remains safe. | Countdown then **Try again** |
| Expired | Expired | **Request expired** The worker did not start this request; no sync was run. | Countdown then **Try again** |
| Unavailable | Unavailable | **Manual sync is temporarily unavailable** Daily sync is unchanged. | Disabled **Unavailable** |
| Offline before POST | Offline | **You’re offline** Connect to request a sync. Values are last known. | Disabled **Offline** |
| Ambiguous POST/status unknown | Status unavailable | **Checking whether your request was accepted** Do not start another sync yet. | Disabled **Checking…** |
| Offline after accepted | Status unavailable | **Status temporarily unavailable** Your accepted sync may still be continuing. | **Check again**; never POST |
| Session expired | Session expired | **Unlock AI Memory to check sync status** Server work is unchanged. | Link **Unlock** |

Every resolved server state retains last-success and safe next schedule/fallback. Terminal outcome stays visible during cooldown; action alone shows **Try again in 4:32**. Countdown changes are not announced each second; only “Try again available” is announced.

## Aggregate copy

- Server values are bounded non-negative integers.
- Use singular/plural correctly: `1 item imported`; `2 items imported`.
- Omit zero clauses. If all zero on success, use current-state sentence rather than `0 items...`.
- Wrap long strings; never truncate counts or IST.

## Confirmation behavior

Use Radix Dialog. Background is inert; focus stays inside; Escape/Cancel/close dismiss and restore the exact opener; overlay click does not dismiss. **Start sync** may receive initial focus and disables immediately. All mobile dialog actions and close target are 44×44px minimum. At 320px actions stack in logical DOM/visual order. Short screens scroll internally with safe-area-aware maximum height.

## Client interaction controller

- Initial GET is authority.
- Start click enters Requesting without closing into Ready.
- Preserve one idempotency key until an accepted/terminal result or definite pre-persistence rejection.
- A lost/ambiguous response transitions to “checking whether accepted,” performs GET, and permits no new POST.
- Poll every two seconds only while visible and active; hidden tabs pause or slow materially; visibility/online triggers immediate GET.
- Abort on navigation/unmount and ignore out-of-order results.
- Stop on terminal, disabled, or 401.
- Multi-tab server state is authoritative; no BroadcastChannel required.
- Automatic execution learned before confirmation disables Sync now; a submission already in flight may return queued behind it.

## Responsive specification

- Container uses responsive horizontal padding `px-4 sm:px-8` while retaining current 680px maximum.
- Desktop: metadata columns when fit; action/reminder row.
- 390px: stacked metadata; full-width 44px action; reminder below.
- 320px/200% zoom: wrap badge/copy/counts/timestamps; no horizontal scrolling; stack dialog actions; enough bottom padding to clear nav.
- No sticky Recall action.

## Accessibility

- Stable `role=status`, `aria-live=polite`, `aria-atomic=true`; announce semantic transitions only.
- `aria-busy=true` for loading/requesting/queued/running.
- Spinner is decorative and stops under reduced motion.
- Status uses badge/icon/title/detail/action, not color alone.
- Current project semantic foreground/background combinations must be measured in light/dark; no claim of AA without evidence.
- Keyboard-only, focus trap/return, real screen-reader announcement sequence, 200% zoom, and touch target verification are required.

## Revised prototype gate

Before implementation agent changes UI files, create and inspect a focused standalone HTML state board with all matrix states, persistent metadata, Requesting/unknown/cooldown composition, exact IST/fallback/stale copy, responsive 1440/390/320 layouts, light/dark, project-token approximations, 44px controls, reduced-motion CSS, and no overlay-dismiss behavior. Static prototype does not prove focus trapping; implementation must.

## Acceptance evidence

- Desktop 1440 and 1024; mobile 390 and 320; light/dark.
- Confirmation open/cancel/Escape/close/focus-return and no overlay dismissal.
- Slow POST, lost response, same-key recovery, automatic-race queueing.
- Terminal outcome plus cooldown, large counts, pluralization, wrap.
- Offline before/after acceptance, stale/past schedule, session expiration.
- Hidden polling, out-of-order suppression, transition-only live announcements.
- Reduced motion, 44px, AA, 200% zoom, bottom-nav clearance.

No UX question remains open for implementation. The implementation may deviate only when current project tokens/components require an equivalent accessible rendering; any material deviation must be recorded in the decision log.
