# PRD v2: Recall sync status and manual synchronization

Status: Approved product source of truth for implementation
Date: 2026-07-11
Supersedes: `prd-v1.md` where they differ

## Adversarial disposition

| V1 finding | V2 resolution |
| --- | --- |
| Deduplicated request `200` drifted from supplied contract | New and deduplicated active requests both return `202`; body says whether deduplicated. |
| Review-ready and host enablement proof were conflated | Separate delivery and production-enable gates are normative. |
| Try again contradicted five-minute cooldown | Terminal outcome remains visible; action is a disabled server countdown until eligible. |
| Automatic start racing POST was undefined | A confirmation already submitted may queue behind automatic work; GET disables new starts once automatic activity is known. |
| No measurable start target | Healthy marker-to-claim target is ≤10s; fallback recovery target is ≤75s. |
| Never wording varied | Public copy is **Not yet synced** everywhere. |

## Goal and user problem

Give the authenticated single owner a truthful Settings view of Recall freshness and a safe **Sync now** action. The browser creates one durable request; a trusted worker runs the complete existing guarded daily path. The owner can leave/reopen Settings and understand whether the run succeeded, changed nothing, was blocked, failed before writes, or partially wrote.

## Principles

1. One safe action; no client operational parameters.
2. Complete wrapper reuse; no second importer or web-side Recall client.
3. Server persistence and time are authoritative.
4. Previous validated success remains visible through later non-success.
5. Zero-write reassurance and partial-write counts require persisted proof.
6. Manual work never changes or skips the daily schedule.
7. Fixed IST presentation is the explicit product requirement.
8. Feature ships review-ready and default off; enablement is separate.

## Scope

- Recall section immediately after AI services, before My notes and Data & Privacy.
- Last validated successful apply time, **Not yet synced**, and trusted next automatic time/fallback.
- Confirmation and local Requesting state.
- Durable request queue, idempotency, single-active dedupe, cooldown, expiry, background worker, lost-wake fallback, and multi-tab convergence.
- Automatic/manual whole-wrapper serialization plus existing inner lock/checkpoint/dedupe.
- Loading, ready, requesting, queued, running, automatic-running, long-running, imported/current, blocked, zero/unknown-write failure, partial, cooldown, expired, unavailable, offline/last-known, status-unknown, and session-expired behavior.
- Owner auth, exact-origin POST, bounded strict body, safe DTO/logs, credential/lock identity split, feature flag off.
- Automated/manual/visual/accessibility/privacy/operations evidence, repository docs, wiki, and review-ready PR.

## Non-goals

Custom ranges/caps/fidelity/checkpoint/scheduler controls; cancellation; full history/per-item results; two-way Recall mutation; raw reports/errors/paths/commands/credentials; route-side execution; general jobs; Redis/WebSockets; third-party analytics; generative AI; Settings redesign; production enablement, merge, or deployment.

## Last-success and time semantics

**Last successful sync** is the wall-clock completion of the most recent automatic or manual apply that completed core apply, advanced checkpoint under existing rules, passed final report validation, and was atomically marked validated by the trusted wrapper lifecycle. Successful zero-new-items qualifies. All other attempts preserve the prior value.

Persist epoch/UTC. Display in `Asia/Kolkata`:

- `Today, 1:38 AM IST`
- `Yesterday, 11:42 PM IST`
- `10 Jul 2026, 1:38 AM IST`
- no validated success: **Not yet synced**

Today/Yesterday use the IST calendar independent of device/server zone.

Show a trusted persisted systemd next-elapse only when fresh and future. If missing, stale, or past, show **Schedule unavailable**. Offline/status-unknown qualifies visible values as **Last known** and shows **Last checked … IST**.

## Primary journey

1. Authenticated owner opens Settings; GET returns a safe status.
2. **Sync now** opens the confirmation dialog.
3. Cancel/close/Escape creates no request and returns focus. Overlay click does not dismiss.
4. **Start sync** enters local **Requesting sync…**, disables actions, and preserves one idempotency key.
5. POST durably enqueues or resolves the one active request, returning `202` only after durability.
6. Marker wakes the worker; healthy claim occurs within 10 seconds. A lost marker is recovered within 75 seconds by the safety timer.
7. UI displays queued/running/long-running from server state. The page may close.
8. Reopen/refresh/another tab reconstructs the same state.
9. Final validated success updates last-success; all non-success preserves it.

If automatic work becomes active after dialog open but before POST commits, the confirmed request may queue behind it. Once GET knows automatic work is active, Sync now is disabled. Lock occupancy is never reported as manual success.

## Manual request contract

- Strict body `{idempotencyKey}` only; bounded token and request size.
- Auth before flag evaluation; unauthenticated GET/POST is `401`.
- Exact same origin required for POST; missing/foreign is `403`.
- `202` for new and deduplicated active request; `deduplicated` boolean distinguishes them.
- `400` malformed; `429` cooldown with rounded `Retry-After`; `503` unavailable/persistence failure.
- At most one queued/claimed/running manual request.
- Five-minute cooldown after every terminal manual request. Terminal outcome remains visible; action becomes **Try again in m:ss** until server eligibility.
- Queued/unclaimed expires at 30 minutes and can never run later. Claimed/running does not expire from browser closure.
- Marker is empty/non-secret; SQLite is authority.
- No browser auto-replay after terminal failure or offline recovery.

## Automatic/manual interaction

- Both trusted Recall entry points share a web-inaccessible outer lock; core runner retains `tryAcquireRecallSyncLock`.
- Manual waits briefly; if unavailable, the same request returns queued for later pickup.
- Automatic waits through the tested wrapper maximum or follows an explicit trusted retry so overlap cannot skip the daily run.
- V1 does not coalesce manual into automatic success.
- Timer definition, enabled/active state, and next occurrence are never mutated by manual request/outcome/rollback.

## Durable data and state

Manual request stores state/times/expiry/idempotency/execution link/safe reason/safe counts. Whole-wrapper execution stores trigger, request link, state, heartbeat, run links, validated-at, and safe counts. Core run stores stable ID, trigger/execution/request, running-to-terminal progress, and private sanitized report. Existing checkpoint remains coverage state.

`queued -> claimed -> running -> done | blocked | error | partial_failure`; `queued -> expired`.

Execution is the whole-wrapper terminal authority. Lifecycle completion/failure atomically updates execution, linked request, and last-success. Worker may claim/spawn/requeue/reconcile but cannot invent a terminal outcome.

Heartbeat runs every 15 seconds while wrapper PID lives. Stale recovery requires at least three missed beats plus process/outer-lock/run evidence; it never blindly restarts.

## Failure and recovery

- Proven imported/upgraded >0 + failure = partial; show safe counts; no checkpoint/last-success advance.
- Proven imported=0 and upgraded=0 may say library unchanged.
- Unknown counts use neutral “result could not be fully confirmed” copy.
- Offline before POST creates no request.
- Ambiguous/lost POST response transitions to status-unknown, retains key, and GETs before any new POST.
- Offline after acceptance says accepted work may continue; data is last known.
- Session 401 stops polling and offers Unlock; sync state is not rewritten or exposed.
- Upstream auth/rate/timeout/safety failures map to allowlisted reasons only.
- No terminal apply is automatically retried by the browser.

## Desktop/mobile/accessibility

Use current Settings column/panels/tokens/shell. Metadata may be two columns on desktop and stacks on mobile. Use `px-4 sm:px-8` so 320px reflows. Action is full-width and every mobile target is 44px. Clear fixed bottom navigation and safe areas.

Use Radix Dialog with focus trap/inert background/Escape/focus return and no overlay dismissal. One stable polite atomic live region announces semantic transitions only; Requesting/queued/running use busy semantics. Icon/text/badge/action carry meaning beyond color. Spinner stops for reduced motion. Verify AA, keyboard, screen reader, 200% zoom, 1440/1024/390/320, light/dark.

Aggregate copy uses deterministic pluralization, omits zero clauses, and displays only bounded safe integers.

## Analytics and privacy

No third-party analytics. Durable records and source-safe structured events cover viewed/requested/accepted/deduped/claimed/started/terminal/rate-limit/activation failure. Allowed fields: request/run/execution IDs, trigger, transition, times/duration, safe reason, safe bounded aggregates, queue age, dedupe/collision. Never source IDs/titles/URLs/content, credentials/cookies, raw reports/errors/stderr, paths, commands, or environment names.

## Acceptance criteria

1. Owner-only section placement; auth-first `401`; exact-origin POST.
2. Last-success changes only after final validated successful apply; no-new-items qualifies; all non-success preserves it.
3. **Not yet synced** and schedule unavailable/stale/past behavior are correct.
4. UTC API and identical prescribed IST strings across UTC/Los Angeles/Kolkata and boundary dates.
5. Dialog trap/Escape/close/Cancel/no-overlay/focus-return creates no request.
6. Requesting state prevents duplicate action and ambiguous POST reuses one key until GET resolves.
7. New/deduplicated accepted POST is `202`; durability precedes response.
8. Healthy claim ≤10s; lost-wake recovery ≤75s.
9. Concurrent tabs/POSTs/workers yield one active request and at most one apply.
10. Cooldown/expiry/countdown are server-authoritative and truthful in every terminal state.
11. Full guarded wrapper and both locks are reused; automatic/manual overlap cannot interleave or skip daily execution.
12. Refresh/navigation/restart/reconnect/multi-tab restore state; offline/auth overlays never create false terminal state.
13. Heartbeat distinguishes healthy long work from stale; killed work reconciles without duplicate run.
14. Late-card failure persists exact prior writes and leaves checkpoint/last-success unchanged.
15. Zero/partial/unknown-write copy follows persisted proof.
16. All required durable and overlay states render with persistent metadata and bounded pluralized counts.
17. Polling is two seconds only while visible/active, slows/pauses hidden, refreshes on visibility/online, aborts stale requests, stops terminal/401, and announces only changes.
18. 1440/1024/390/320, light/dark, keyboard, screen reader, zoom, bottom-nav, 44px, AA, and reduced-motion verification passes.
19. Safe DTO/log/event privacy tests pass.
20. Feature/units default off; review-ready rollback preserves daily automation/history/running work.
21. Type/lint/unit/route/worker/process/wrapper/privacy/regression/full-test/build gates pass.

## Review-ready versus enablement gates

Review-ready PR requires implementation, default-off config/units, deterministic local/static/fixture process tests, screenshots, docs/wiki, full build/tests, and no critical/high review findings. It does not authorize host changes.

Production enablement separately requires explicit authorization plus host proof that the distinct Recall identity can access required code/data/credential/lock, the web identity cannot access credential/lock, SQLite/WAL/backup permissions work, path/fallback/timer units are ready, timer state is preserved, and one controlled request plus next daily completion is observed.

## Risks and assumptions

Risks: partial count truth, lock fairness, automatic skip, stale recovery, SQLite contention, credential/permission transition, schedule snapshot staleness, accessibility. Assumptions: single-owner SQLite, Linux systemd host, existing wrapper/checkpoint/item dedupe remain authoritative, production flag stays off.

No unresolved product question blocks implementation. Numeric timeout/stale bounds are engineering values that must be derived and test-locked in technical plan v2/implementation evidence.
