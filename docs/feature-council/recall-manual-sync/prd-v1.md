# PRD v1: Recall sync status and manual synchronization

Status: v1 for adversarial review
Date: 2026-07-11
Supersedes: none; reconciles the supplied draft PRD with current `main` and rendered designs

## Goal

Give the authenticated owner a trustworthy Settings view of Recall freshness and a safe **Sync now** action that creates one durable request for the existing guarded daily synchronization pipeline.

## User problem

The owner currently waits for the daily timer or uses operator-only tooling. Settings does not show whether the last guarded apply completed successfully, whether work is active, or whether a failure changed anything. This creates unnecessary delay and weak confidence after important Recall captures.

## Target user

The single authenticated owner of AI Brain. This is not a multi-user, API-token, anonymous, or operator-console feature.

## Product principles

1. One safe action; all operational parameters remain server owned.
2. Truth over reassurance; zero-write and partial-write outcomes are distinct.
3. Browser requests; trusted worker executes.
4. The complete daily safety path is reused.
5. Closing or refreshing Settings does not cancel accepted work.
6. Previous successful freshness remains visible through later failures.
7. Daily cadence and checkpoint rules remain authoritative and unchanged.
8. Quiet Settings density, accessible on desktop and mobile.

## Scope

- Recall sync section immediately after AI services.
- Last fully validated successful apply time, including successful no-new-items runs.
- Explicit never-synced state.
- Trusted next automatic time when available.
- Confirmation dialog and durable manual request.
- Queued, running, long-running, automatic-running, success/current, blocked, failure, partial, expired, cooldown, offline/status-unknown, session-expired, and unavailable presentations.
- Single-active deduplication, idempotency, cooldown, queue expiry, background recovery, and multi-tab convergence.
- Owner auth, exact-origin mutation protection, strict safe response/log schemas, and feature flag default off.
- Existing wrapper, lock, checkpoint, caps, proof, backup, fidelity, and report validation.
- Tests, operational units, repository docs, wiki, screenshots, and review-ready pull request.

## Non-goals

- Custom date ranges, import caps, fidelity/checkpoint controls, or scheduler controls.
- Cancellation, full run history, per-item results, raw reports, host paths, commands, credentials, or unsanitized errors.
- Two-way Recall edits/deletes, catch-up/recovery procedures, or a general job runner.
- Browser-side Recall access, route-side wrapper execution, WebSockets, Redis, third-party analytics, or generative AI.
- Settings redesign, production enablement, merge, or deployment.

## Product semantics

### Last successful sync

The wall-clock completion instant of the most recent automatic or manual apply that:

- completed the existing core apply safely;
- advanced the checkpoint under existing rules;
- passed the final apply-report validator; and
- was marked successful by the trusted orchestration layer.

A safe run with zero new items qualifies. Request/start time, checkpoint coverage end, dry-run success, lock contention, blocked, error, expired, and partial outcomes do not qualify. Failed attempts never overwrite the value.

### Time presentation

The server stores epoch/UTC instants. The client renders every absolute Recall time in `Asia/Kolkata` with visible `IST`:

- `Today, 1:38 AM IST`
- `Yesterday, 11:42 PM IST`
- `10 Jul 2026, 1:38 AM IST`

Today/Yesterday use the IST calendar regardless of browser/server timezone. This is an explicit PRD exception to device-local display. If no validated success exists, show **Not yet synced**. Exact time is already visible, so a tooltip is optional rather than required.

### Next automatic sync

Show the trusted persisted systemd next-elapse snapshot. Because the timer includes randomized delay, do not manufacture an exact time from a client constant. If a trustworthy snapshot is absent/stale, show **Schedule unavailable**. Manual requests and outcomes never alter the timer or snapshot except through the normal automatic service’s status refresh.

## User journeys

### Ready to manual sync

1. Owner opens Settings and sees last-success, next automatic time, and readiness.
2. Owner selects **Sync now**.
3. Dialog explains eligible imports/upgrades, deduplication, unchanged daily schedule, and reused safety checks.
4. Cancel, close, Escape, or approved backdrop dismissal creates no request and restores focus.
5. **Start sync** creates or resolves one active durable request.
6. UI shows queued/running from server state and may be closed.
7. Reopening Settings restores current/terminal state.

### Automatic work is active

The panel shows **Automatic sync in progress**, retains last-success/next schedule, disables manual action, and polls. A manual request already accepted remains queued for the same trusted worker; it is not falsely marked successful from lock occupancy.

### Successful imported/current result

After complete wrapper validation, show aggregate imported/upgraded/already-current counts or “No new eligible Recall items were found.” Update last-success. Keep the daily schedule unchanged.

### Failure and recovery

- Proven zero writes: safe copy may say the library was unchanged.
- Proven non-zero writes: show partial failure and exact safe aggregate counts; checkpoint/last-success remain unchanged; deliberate retry is safe after cooldown/readiness.
- Unknown counts: use neutral failure copy, never zero-write reassurance.
- Offline after acceptance: show status unavailable; accepted work may continue; reconcile before offering another request.
- Session expiration: stop polling and offer Unlock; do not call the sync failed.

## Desktop behavior

Use the current 680px Settings column and panel language. Header contains Recall identity and semantic badge; state summary uses icon/title/detail; persistent metadata displays last-success and next schedule; action row contains one primary/disabled action plus safety reminder. Desktop controls follow existing compact Settings sizing and visible focus rings.

## Mobile and narrow behavior

- Current shell and fixed bottom navigation remain unchanged.
- Metadata stacks; the action is full width.
- Every interactive target is at least 44×44px.
- Copy/timestamps wrap at 320px without horizontal scrolling or losing `IST`.
- Dialog fits short viewports, scrolls internally, respects safe areas, and keeps actions reachable.
- Page content clears bottom navigation and zoom/reflow at 200%.

## Manual synchronization contract

- POST accepts only a strict bounded idempotency token.
- A new durable request returns `202`; an existing active request returns `200` and `deduplicated:true`.
- At most one queued/claimed/running manual request exists.
- Five-minute server-time cooldown follows any terminal manual request.
- Unclaimed requests expire after 30 minutes and cannot execute later.
- The browser disables immediately after confirmation; server constraints are the real safety control.
- The marker contains no payload and only wakes the worker; a 60-second trusted safety timer recovers lost wakeups.
- Terminal failures are never automatically resubmitted by the browser.

## Background and automatic interaction

- Daily and manual entry points share a full-wrapper lock and retain the existing inner database lock.
- Manual waits queued while another wrapper owns execution; v1 does not coalesce into an automatic outcome.
- Worker claim uses an immediate transaction; repeated workers/tabs resolve one request.
- The worker writes heartbeat/progress and reconciles stale claims from durable request/run/lock evidence before retrying.
- The accepted job is independent of browser lifetime.

## Data requirements

- Durable request ID, bounded idempotency key, state, request/claim/start/heartbeat/complete/expiry times, trigger, safe reason, typed aggregate counts, and TEXT run linkage.
- Stable run ID plus trigger/request/execution linkage, running-to-terminal lifecycle, incremental aggregate progress, and final wrapper validation time.
- Separate last-success completion marker and existing checkpoint coverage state.
- Active wrapper execution and safe next-elapse state.
- UTC/epoch values only; no preformatted strings in persistence/API.
- No private source identifiers/content or raw errors in request/public status rows.

## Durable state transitions

`queued -> claimed -> running -> done | blocked | error | partial_failure`

`queued -> expired` when never claimed before expiry.

Client overlays such as loading, offline/status-unknown, session-expired, long-running, cooldown, and feature unavailable do not rewrite an accepted server state. A stale claimed/running request is reconciled from heartbeat, execution, run, and lock evidence; it is never blindly restarted.

## Edge cases

- Repeated click/idempotency replay/different-key simultaneous tabs.
- Automatic/manual collision at every wrapper stage.
- Worker crash before claim, after claim, after writes, after core success, and before/after final validation.
- Lost marker, inactive path unit, fallback pickup, stale queue, and SQLite busy contention.
- Page refresh, navigation, app restart, hidden tab, multi-tab, and out-of-order responses.
- Offline before POST versus after accepted response.
- Owner-session expiration versus upstream Recall authentication failure.
- Upstream 429/timeout/5xx, caps, fidelity, changed remote, proof/backup/final-validator failure.
- IST midnight, foreign browser DST, server clock authority, and absent next schedule.

## Accessibility

- Radix Dialog provides focus trap, background isolation, Escape, and focus return.
- One stable `role=status`/`aria-live=polite`/`aria-atomic=true` region announces only semantic transitions.
- Queued/running uses `aria-busy`; unchanged polling does not announce.
- Icon, text, badge, and color convey every status.
- Meaningful visible disabled labels: Checking…, Queued, Syncing…, Try again in…, Unavailable.
- Current semantic tokens meet AA; muted metadata is verified in light/dark.
- Spinner stops under reduced motion while status text remains complete.

## Analytics and observability

No third-party product analytics. Durable requests answer usage/latency/outcome questions. Structured source-safe logs may record request/run/execution IDs, trigger, transition, timestamps/duration, safe reason, aggregates, dedupe, cooldown, and activation failure. Never record source content/IDs/titles/URLs, credentials/cookies, raw error/stderr/report, paths, commands, or environment names.

Operational signals include oldest queue age, stale heartbeat, missing request/run link, active lock age, last validated success, persisted next elapse, dedupe/collision/rate-limit counts, and path/timer readiness.

## Acceptance criteria

1. Owner sees Recall immediately after AI services; unauthenticated users receive `401` and no feature state.
2. Last-success is sourced only from final validated apply completion; no-new-item success updates it; all other outcomes preserve it.
3. No validated success renders **Not yet synced**.
4. API instants are UTC; UTC/Los Angeles/Kolkata browsers render identical prescribed IST strings including boundary cases.
5. Trusted next elapse displays when present; missing/stale data displays **Schedule unavailable**; manual work never mutates timer configuration/next occurrence.
6. Dialog Cancel/close/Escape/backdrop creates no request, traps focus while open, and restores the opener.
7. A confirmed new request is durable before `202`; marker failure still leaves accepted queued work for fallback pickup.
8. Replay/simultaneous tabs/workers produce one active request and at most one full apply.
9. New request returns `202`; active dedupe returns `200`; cooldown returns `429` with rounded `Retry-After`.
10. Unclaimed work expires after 30 minutes and cannot execute later; claimed/running work does not expire from page closure.
11. Manual execution reuses the full guarded wrapper and both outer/inner concurrency controls.
12. Automatic/manual overlap never interleaves wrapper stages or treats lock contention as success.
13. Refresh, navigation, restart, reconnect, and another tab reconstruct the same server state.
14. Offline before POST creates no request; offline after acceptance does not cancel/replay or display false failure.
15. Session `401` stops polling and offers Unlock without exposing or rewriting sync state.
16. A late-card fault persists exact prior writes, maps partial failure, and leaves checkpoint/last-success unchanged.
17. Zero-write reassurance appears only from persisted zero imported/upgraded counts; unknown counts use neutral copy.
18. Loading, ready/never, queued, running/long, automatic-running, imported/current, blocked, zero-write failure, partial, cooldown, expired, unavailable, offline/status-unknown, and session-expired variants are implemented.
19. Active polling is two seconds while visible, slows/pauses when hidden, refreshes on visibility/reconnect, stops at terminal/auth-expired, aborts stale fetches, and does not repeat announcements.
20. 320/390/desktop, light/dark, keyboard, 200% zoom, bottom-nav clearance, 44px targets, AA contrast, and reduced motion pass.
21. API/log/event privacy tests prove no source details, secrets, raw reports/errors, host paths, commands, or environment names escape.
22. Feature flag defaults off; rollback rejects/hides new manual requests, preserves history/running work, and leaves daily automation unchanged.
23. Web credential-boundary verification proves the web service cannot read Recall credentials before production enablement.
24. Relevant type, lint, unit, route, worker, integration, wrapper, privacy, accessibility, visual, full test, and production-build gates pass.

## Risks

- False success if final wrapper validation is not persisted.
- Data/trust breach if partial writes are under-counted.
- Interleaved dry-run/apply if only the core lock is used.
- Duplicate work from deferred transactions or missing active constraint.
- Stuck accepted requests from lost wake or stale claims.
- Credential exposure because current units share user/environment.
- Misleading next time because systemd randomizes execution.
- Accessibility regression from copying the prototype literally.
- SQLite contention from new multi-process writes.

## Assumptions

- Single-owner SQLite deployment remains the target.
- The daily guarded wrapper and current checkpoint/item dedupe behavior remain authoritative.
- Systemd path/timer units are available on the deployment host.
- Production feature flag remains off until a separately authorized enablement gate.

## Open questions for adversarial review

1. Is an OS file lock or a durable DB wrapper lease the safer outer serialization mechanism under systemd crash/restart behavior?
2. Is systemd `LoadCredential` with the existing service identity sufficient, or must Recall use a distinct Unix identity/shared data group?
3. Should deduplicated active POST be `200` as selected here or consistently `202` for simpler clients?
4. What exact staleness threshold and heartbeat cadence safely cover the worst permitted wrapper duration?
5. Should last-success have its own typed table or a constrained state row linked to the validated apply run?
