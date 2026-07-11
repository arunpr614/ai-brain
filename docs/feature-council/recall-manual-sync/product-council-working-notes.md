# Recall Manual Sync — Product Council Working Notes

Date: 2026-07-11
Status: Bounded council input for coordinator synthesis; not an implementation source of truth
Council roles represented: Expert Project Manager, Product Manager — Growth & Engagement, Product Manager — Platform & Data, Product Manager — Power User & Workflow, AI Expert Brainstorm Council

Citation key: `PRD:n-m` means `phase2/docs/plans/recall-manual-sync/RECALL_MANUAL_SYNC_SETTINGS_PRD_2026-07-10.md:n-m` in the authoritative source checkout. All other citations are paths in this project worktree.

## 1. Executive recommendation

Proceed with the PRD's narrow model: an owner-only Settings control creates one durable, deduplicated request; a trusted background worker executes the existing guarded daily pipeline. Do not add a browser-side importer, operational parameters, cancellation, run history UI, scheduler controls, or generative AI to this v1.

The feature is product-ready for PRD-v2 synthesis only after the coordinator resolves the explicit contract conflicts in section 7 and promotes the following implementation prerequisites into release-blocking acceptance criteria:

1. Define **last successful sync** as the completion instant of the most recent fully successful guarded **apply**, whether automatic or manual. A successful no-new-items run counts. Dry runs, queued requests, blocked runs, failures, and partial failures do not update it.
2. Persist enough lifecycle information to reconstruct automatic and manual activity after refresh. The current run code persists only terminal reports, despite the schema permitting `running` (`src/db/recall-sync.ts:36-55`, `src/lib/recall/sync-runner.ts:439-463`).
3. Prove write counts on every failure path before using zero-write reassurance. The current apply uses a synchronous `map` and its outer catch falls back to a zero-count base report, so a thrown import after an earlier write could lose partial-write counts (`src/lib/recall/sync-runner.ts:113-139`, `src/lib/recall/sync-runner.ts:354-360`, `src/lib/recall/sync-runner.ts:423-433`).
4. Reuse the complete shell-guarded sequence, not merely the TypeScript runner. The deployed wrapper performs dry run, report validation, fresh backup, proof-backed apply, and post-apply validation (`scripts/recall-scheduled-apply.sh:167-210`).
5. Treat fixed `Asia/Kolkata`/IST presentation as an explicit product exception to device-local time. Canonical instants remain server-authored UTC.
6. Add offline, session-expired, automatic-running, and long-running presentation variants; they are required by the goal/test plan but absent from the PRD's core state table.

The existing daily capability is real and should be preserved: production scheduler enablement and its first natural scheduled run were verified (`RUNNING_LOG.md:28047-28055`, `RUNNING_LOG.md:28103-28120`), and the timer remains a daily 20:00 UTC job with up to ten minutes of randomized delay (`scripts/deploy/brain-recall-sync.timer:4-8`).

## 2. Evidence baseline and product implications

| Evidence | Current fact | Product implication |
| --- | --- | --- |
| `PRD:12-16` | UI enqueues; trusted worker executes the existing safety path. | This is the v1 product boundary. |
| `PRD:49-59` | Date ranges, caps, scheduler controls, cancellation, low-level details, and non-owner access are non-goals. | Do not let recovery or power-user requests expand v1 into an operator console. |
| `src/app/settings/page.tsx:136-195` | AI services is followed by optional My notes and then Data & Privacy. | The requested Recall section is discoverable, but “between AI services and Data & Privacy” means it must remain before optional My notes or the PRD must explicitly accept the My notes interposition. |
| `src/app/settings/page.tsx:58-61`, `src/app/settings/page.tsx:140-159`, `src/styles/tokens.css:37-65` | Settings has a 680px shell, bordered panels, and semantic action/status tokens. | Reuse these patterns; no dashboard redesign. |
| `src/app/layout.tsx:79-89`, `src/components/sidebar.tsx:255-261` | Mobile content already reserves room for a fixed bottom nav and safe-area inset. | Recall must stay in the normal Settings flow and avoid its own fixed action. |
| `src/styles/tokens.css:177-183` | Reduced-motion duration tokens already collapse to zero. | A new spinner still needs an explicit animation-off rule; token behavior alone does not stop a custom infinite rotation. |
| `src/lib/auth.ts:98-135`, `src/proxy.ts:84-87`, `src/proxy.ts:140-148` | Session HMAC is verified; API requests without a valid cookie receive 401; cookie is HttpOnly, SameSite=Lax, Secure in production. | Owner authentication is reusable. Feature-flag response order must fit the proxy behavior. |
| `src/lib/notes/http.ts:21-35` | Exact same-origin validation already exists for cookie-authenticated writes. | Reuse this policy for POST rather than inventing a looser origin allowlist. |
| `src/db/migrations/020_recall_sync.sql:142-169` | Runs and key/value sync state are durable; no manual request queue exists. | A migration and request repository are required. Current migration ordering reaches `023_source_aware_chunks.sql:1-7`, so implementation must reconcile and take the next free number. |
| `src/db/recall-sync.ts:188-213` | Shared checkpoint is persisted under `checkpoint:last_successful_to`. | Keep checkpoint semantics shared, but do not display the checkpoint window boundary as the completion timestamp. |
| `src/db/recall-sync.ts:215-260` | A transactional shared lock prevents overlapping sync runners and supports guarded stale recovery. | The lock remains concurrency authority; a request queue adds intent/lifecycle, not a second lock. |
| `src/lib/recall/scheduler.ts:45-61` | Sync windows are computed from checkpoint to server `now` with overlap and UTC ISO strings. | Manual and automatic runs can share the same window/checkpoint behavior. |
| `src/lib/recall/scheduler.ts:92-105` | Checkpoint eligibility requires completed apply, zero failures, no cap breach, and no suspicious enumeration. | Unsuccessful/partial outcomes must leave last-successful/checkpoint unchanged. |
| `src/lib/recall/scheduler.ts:108-129`, `src/lib/recall/sync-runner.test.ts:652-681` | Errors are categorized and persisted reports redact secrets. | API responses need a stricter allowlisted mapper; never expose persisted report JSON directly. |
| `src/lib/recall/sync-runner.ts:141-155`, `src/lib/recall/sync-runner.test.ts:684-706` | Existing lock contention returns a blocked run. | Manual requests should wait/coalesce instead of creating a second apply. |
| `src/lib/recall/sync-runner.ts:395-422`, `src/lib/recall/sync-runner.test.ts:459-489` | Successful apply advances the shared checkpoint and persists counts. | A no-new-item success is still a successful synchronization; a failure must not overwrite it. |
| `src/lib/recall/sync-runner.test.ts:709-738` | Retry after an import-before-checkpoint crash skips the existing item and can advance safely. | “It is safe to try again” is supportable only while existing deduplication/checkpoint behavior remains intact. |
| `scripts/deploy/brain-recall-sync.service:6-21` | Trusted service runs as `brain` with hardening and only `/opt/brain/data` writable. | Worker activation must preserve this boundary; no general web-to-systemd capability. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_COMPLETION_AUDIT_2026-06-28_01-40-12_IST.md:36-53` | Final evidence includes actual next elapse and service completion, including randomized scheduling. | “Next automatic sync” should come from trusted runtime schedule evidence, not a client constant. |

## 3. Consolidated council decisions for every required question

### 3.1 Sync meaning, timestamps, and refresh

| Required question | Council recommendation | Acceptance implication |
| --- | --- | --- |
| What does “last sync” mean? | Rename the visible label to **Last successful sync**. It is the server-recorded completion instant of the latest fully successful guarded apply across automatic and manual triggers. It is not the request time, start time, checkpoint `date_to`, latest attempt, or per-item `last_synced_at`. | Query/derive only from validated successful apply outcomes. Dry runs cannot qualify. |
| Successful completion or last attempt? | Successful completion only. Latest attempt is represented separately by the current/latest outcome. | Blocked, failed, expired, rate-limited, and partial outcomes preserve the prior value. |
| Never synchronized | Show **Last successful sync: Not yet synced**. Do not substitute a request time or hide the row. Next automatic sync may still be shown when known. | Test both no run rows and historical failed-only rows. |
| Server-authoritative timestamp | Yes. The trusted worker/database authors instants. Client clock is presentation-only and must not determine success or cooldown eligibility. | Tests skew browser time and still receive canonical server results. |
| UTC storage and presentation | Store epoch milliseconds or UTC ISO instants; API emits UTC ISO-8601. Format in explicit `Asia/Kolkata`. | Response schemas reject preformatted dates; formatter tests cover several browser zones. |
| Local time vs IST | The PRD explicitly overrides the general device-local principle: all absolute times in this section use IST, regardless of device/server zone (`PRD:160-163`, `PRD:256-258`). | Browser zones UTC, Los Angeles, and Kolkata render identical IST values. |
| Relative vs exact time | Use the PRD's calendar-relative prefix plus an exact time: `Today, 1:38 AM IST`, `Yesterday, ...`, or an exact older date. “Just now” may decorate request/latest outcome for under one minute, but the last-successful row remains an absolute IST value. No tooltip is required for v1 because exact time is already visible. | Tests cover same day, previous IST day, older date, and midnight boundary. |
| Time zone and DST | Determine Today/Yesterday using `Asia/Kolkata`, never the browser zone. IST has no DST; UTC-to-IST remains +05:30. Test foreign browser DST boundaries to prove they do not alter the displayed IST calendar date. | No locale-dependent parsing or ambiguous abbreviations generated by the browser. Explicit visible `IST` suffix required. |
| When does the timestamp refresh? | On initial GET, after any terminal poll response, when the tab becomes visible, and when Settings regains network connectivity. While visible and active, two-second polling is sufficient. Avoid a free-running clock that recomputes server status. | Automatic and manual success become visible without hard reload; failure leaves value stable. |
| Next automatic sync | Display the trusted timer's next elapse when available. Because the timer uses `RandomizedDelaySec=10m`, a hard-coded `1:30 AM IST` is not exact (`scripts/deploy/brain-recall-sync.timer:5-8`). If exact trusted data is temporarily unavailable, show **Next automatic sync: Schedule unavailable** rather than a fabricated instant. | Manual sync must not change the before/after next-elapse value. |

### 3.2 Automatic/manual interaction, repetition, idempotency, and concurrency

| Required question | Council recommendation | Acceptance implication |
| --- | --- | --- |
| During automatic sync | Show a distinct **Automatic sync in progress** variant, retain the previous last-successful time, disable Sync now, and continue status polling. On terminal success, update last-successful and counts; on failure, preserve last-successful and show safe failure copy. | Status API must detect an active automatic run without exposing lock owner/internal details. |
| Manual and automatic overlap | The shared lock is authoritative. Keep the manual request queued behind the automatic run. Coalesce it into the automatic outcome only if the worker can prove the automatic window covered the request and link that run; otherwise claim it after the automatic run. Never report a manual success merely because the lock was occupied. | Collision test proves one apply, correct request/run linkage, and unchanged timer. |
| Repeated clicks | Disable the active tab's button immediately after confirmation. Server-side, return the one active request for all repeated clicks, tab races, request retries, and idempotency-token replay. Do not enqueue a second request. A UI debounce is optional polish, not the safety control. | Concurrent POST test and multi-tab test both produce one request and one apply. |
| Ignore/debounce/queue/deduplicate? | **Deduplicate** to the active request. Ignore extra click events client-side after submission. Do not queue multiple manual requests. | Partial unique constraint or equivalent transaction guard is release-blocking. |
| Idempotency | Enforce a bounded idempotency key plus a global single-active-manual invariant. The request contains no operational parameters. Existing item-level dedupe and shared checkpoint remain defense in depth. | Replay before/after network timeout yields the same request; malformed/oversized keys fail safely. |
| Concurrency control | Use an immediate transaction for request claim, one active-request constraint, and existing Recall lock before guarded execution. Stale recovery must inspect the lock and latest run, not blindly rerun. | Competing worker and stale-claim tests are mandatory. |
| Five-minute cooldown | Keep the PRD's five-minute terminal cooldown. It protects against compulsive repetition without blocking recovery indefinitely. Show rounded remaining time and disable action; do not silently queue a future run. | Countdown derives from server time; POST returns 429 with `Retry-After`. |
| Thirty-minute queued expiry | Approve the PRD recommendation. Expire only unclaimed requests after 30 minutes; show **Request expired; try again**. A claimed/running job never expires by this UI policy. | Expired work cannot wake later and surprise the user. |

### 3.3 Long-running, partial, failure, retry, navigation, and multiple tabs

| Required question | Council recommendation | Acceptance implication |
| --- | --- | --- |
| Long-running synchronization | After 60 seconds in queued/running, retain the same durable state but change support copy to **This is taking longer than usual. You can leave this page; sync will continue.** Do not promise completion time or enable another request. | Queue-age metric at 60 seconds; control remains disabled; reduced-motion respected. |
| Partial success | Terminal `partial_failure` requires proven non-zero imports/upgrades, displays those safe aggregate counts, says retry is safe, and leaves last-successful/checkpoint unchanged. | Fault injection after at least one write must persist correct counts. |
| Zero-write failure | Say the library was unchanged only if persisted counts prove zero imports and zero upgrades, as the PRD requires (`PRD:160-167`). Otherwise use neutral failure copy. | Copy mapper has explicit proven-zero predicate. |
| Offline before request | Show **You're offline. Connect to request a sync.** No durable request exists and no background replay should be registered by the client/service worker. | Failed fetch does not display queued/accepted or auto-submit later. |
| Offline after accepted 202 | Keep last known queued/running state with **Status unavailable while offline; the accepted sync may continue.** Reconcile from GET on reconnect. | Closing/reconnect cannot cancel or duplicate the job. |
| Authentication expiration | On 401, stop polling, show **Session expired. Unlock AI Memory to check sync status**, and offer the existing unlock flow. Do not label the sync failed; its durable server state is unchanged. | Re-auth restores the same request status. No feature state leaks in 401 body. |
| Upstream auth expiration | Map Recall credential/auth failures to a safe connection-attention category for the owner; do not expose credential names or raw upstream text. Daily schedule remains unchanged. | Internal classification may use exit code; API exposes only allowlisted reason. |
| Upstream rate limiting | Treat a worker-side upstream 429 as a terminal safe failure/attention outcome distinct from the UI's five-minute submission cooldown. Recommend retry after the server-provided safe window when available; otherwise generic later retry. | No automatic apply retry that could create ambiguous writes. |
| Other upstream failures/timeouts | Fail truthfully, preserve last-successful/checkpoint, retain proven write counts, and expose only safe categories such as connection, timeout, safety, or unexpected. | Raw exception strings and report JSON never reach client. |
| Retry behavior | No automatic new manual request after a terminal failure. The user selects Try again after health/cooldown permits. Activation fallback may re-attempt claiming the same queued request because that is delivery, not a second sync request. | Retry produces a new request only after the prior one is terminal and cooldown permits. |
| Page refresh/navigation | Once 202 is returned, work continues independently. GET reconstructs state from database/lock/run records. Abort client fetches on navigation; never mark the server job cancelled. | Refresh, close/reopen, navigate away/back tests. |
| Multi-tab | All tabs read the same server authority. No BroadcastChannel is required in v1; two-second polling/visibility refresh is enough. Server dedupe handles simultaneous confirmations. Each tab announces only state changes it observes. | Two tabs converge to one request/outcome and do not create repetitive live-region announcements. |

### 3.4 Accessibility, mobile, privacy, analytics, performance, and operations

| Required question | Council recommendation | Acceptance implication |
| --- | --- | --- |
| Accessibility announcements | One dedicated `role=status`/`aria-live=polite` region announces meaningful transitions only: queued, running, completed, blocked, failed, partial, offline, session expired. Counts are included in terminal announcements. Polls with unchanged semantic state announce nothing. | Screen-reader test verifies no two-second announcement loop. |
| Dialog behavior | Confirmation every time in v1; trap focus, Escape/backdrop/Cancel make no request, and return focus to Sync now. Start sync becomes disabled once activated. | Keyboard-only and focus restoration tests. |
| Status semantics | Badge/icon/text all convey meaning; color is supplementary. Disabled buttons have visible labels `Queued`, `Syncing…`, or unavailability reason. | WCAG AA and non-color review. |
| Mobile/narrow screens | Stack metadata, make the action full-width, keep at least 44px touch height, and remain in normal content above the existing fixed bottom nav. Do not introduce a sticky bottom action that competes with navigation. | Verify 320px minimum and 390px target, safe-area, zoom, and long localized count strings. |
| Privacy | Client receives only allowed state, timestamps, aggregate counts, safe category, cooldown, next schedule, and request ID. Never expose Recall IDs/titles/URLs/content, host paths, commands, environment names, raw errors, or reports. | Schema and log privacy tests; no source payload in analytics. |
| Product analytics | No third-party analytics in v1. Use request/run records and source-safe structured events for request, dedupe, claim, start, terminal outcomes, rate limit, and activation failure. | Event payload allowlist includes request/run IDs, trigger, durations, category, and aggregate counts only. |
| Confirmation cancellation analytics | Defer in v1. The PRD says the durable request table can answer cancellation, but Cancel intentionally creates no request, so that table cannot measure it (`PRD:473-484`). | Do not add a new analytics subsystem solely for cancellation. Revisit only if confirmation friction is a real decision. |
| Polling performance | Poll every two seconds only while queued/running; slow or pause while hidden, stop at terminal, refresh on visibility, abort stale requests. Single-user scope makes this low risk, but responses should be small and `private, no-store`. | Hidden-tab and terminal-stop tests; no overlapping fetch accumulation. |
| Operational risk | Highest risks are broadening web privilege, wake-signal loss, stale claims, partial-write misreporting, and timer mutation. Mitigate with durable DB authority, narrow marker, safety poll, queue-age alert, existing service hardening, and explicit timer invariance checks. | Production-readiness gate compares wrapper artifacts and timer next-elapse before/after controlled manual run. |

## 4. Product-manager perspectives

### 4.1 Growth & Engagement

**Finding:** The feature's growth value is confidence and reduced time-to-value, not increased sync frequency. Placement in Settings plus a clear “Sync now” label is discoverable enough for the single owner; a global nav entry, notification badge, or repeated prompt would overstate the feature.

Recommendations:

- Keep the confirmation for every v1 run. The action writes library data and is expected to be occasional; current evidence does not justify a “don't ask again” affordance.
- Lead with the last-successful fact and current state, not operational machinery. The status should reassure through truth: previous success stays visible through failures.
- Count “no new eligible items” as a successful sync. It confirms freshness and should not feel like an error.
- Product learning should track request-to-start latency, success/current rates, deduplication, and repeated cooldown encounters. Avoid optimizing raw click volume.
- Success criterion: an owner can find the control, understand that daily sync remains intact, request once, leave the page, and later trust the displayed result.

### 4.2 Platform & Data

**Finding:** The core safety assets exist—durable SQLite, checkpoint, lock, caps, sanitization, guarded wrapper, hardened service—but request lifecycle and UI-safe status do not. The request queue must wrap these assets rather than reimplement them.

Recommendations:

- One durable request table, one atomic claimer, one active manual request, one shared Recall lock.
- Record trigger (`manual_ui`/`automatic`) and request/run linkage sufficient to explain automatic/manual collisions without exposing internal details.
- Derive last-successful only from a completed, validated apply. Do not use the checkpoint window end or per-item timestamps.
- Persist explicit aggregate progress/outcome through exceptional paths. Current terminal-only insertion and outer catch are insufficient for truthful partial failure.
- Prefer path activation plus a 60-second trusted safety poll. The marker carries no payload; SQLite remains authority.
- Persist/trust the runtime next-elapse value through the worker/operations boundary; do not grant the web process general service-control privileges.

### 4.3 Power User & Workflow

**Finding:** Trust comes from resumability and clear recovery, not extra controls. A power user needs to know whether the request was accepted, whether another run is already doing the work, whether leaving is safe, what changed, and when retry is appropriate.

Recommendations:

- Confirmation -> queued -> running -> terminal is the primary workflow. Restore it after refresh and across tabs.
- Never convert a network error into “failed sync” unless the server reports a terminal failure; distinguish “request not accepted” from “status temporarily unavailable.”
- Expose aggregate imported/upgraded/already-current counts, but no item history in v1.
- A single latest outcome plus last-successful and next-automatic time is enough. Full history remains an operator/data capability.
- Queue behind automatic work and explain it plainly. Do not force the user to interpret locks, services, dry runs, caps, or checkpoint windows.
- Try again is always deliberate; never schedule a surprise retry from an offline browser action or expired request.

### 4.4 AI Expert Brainstorm Council

**Consolidated finding:** This is a deterministic safety/control feature; adding a generative model to the runtime would increase latency, privacy surface, and failure ambiguity without improving the job.

Recommended AI-informed design, without an AI runtime dependency:

- Use a deterministic status reducer that combines durable request state, safe run outcome, lock activity, readiness, cooldown, and network/auth overlays into one allowlisted UI state.
- Treat explanation quality as a mapping problem: each state has one approved title, detail, action, and announcement. Never generate failure copy from raw exceptions.
- Make “truth confidence” explicit internally: zero-write reassurance requires proven counts; coalesced success requires proven window/run linkage; unknowns map to neutral copy.
- Instrument safe categories so later analysis can reveal whether confirmation/cooldown/activation choices create friction. Do not send private note or Recall source data to an AI or analytics provider.
- Defer predictive completion estimates, AI-written summaries of imported content, proactive sync suggestions, and anomaly explanations. They are outside v1 and conflict with the quiet, private control surface.

## 5. Recommended v1 scope

### In scope

- Owner-only Recall sync section in Settings, at the PRD-defined location.
- Fixed IST last-successful and next-automatic display; explicit never-synced state.
- Required confirmation dialog.
- Durable request with idempotency, single-active dedupe, five-minute cooldown, 30-minute unclaimed expiry.
- Narrow trusted activation plus 60-second fallback claim path.
- Existing guarded wrapper, shared lock, shared checkpoint, and timer invariance.
- Automatic/manual collision handling and automatic-running visibility.
- Loading, ready, confirming, queued, running, long-running, imported, current, blocked, zero-write failure, partial failure, rate-limited, expired request, unavailable, offline, and session-expired variants.
- Refresh/navigation/multi-tab recovery.
- Aggregate counts, safe reason categories, accessibility, mobile behavior, source-safe structured events.
- Feature-flagged rollout, with production enablement separately authorized.

### Explicitly out of scope

- Custom ranges, caps, fidelity/checkpoint controls, timer management, cancellation, run history UI, per-item results, raw diagnostics, operator commands, multi-user roles, API-token access.
- Browser background sync/replay, automatic new requests after terminal failure, completion-time estimates.
- Third-party analytics or any generative AI dependency.
- Redesigning Settings, adding global navigation, or changing the automatic schedule.

## 6. Acceptance implications for PRD v2 and QA traceability

The coordinator should turn these into uniquely numbered criteria:

1. **Semantic source:** latest fully successful validated apply controls last-successful; no-new-item success updates it; all non-success outcomes preserve it.
2. **Never state:** absence of successful apply renders `Not yet synced` without hiding next schedule.
3. **Time:** API UTC; UI fixed `Asia/Kolkata`; explicit IST; Today/Yesterday use IST; device zones and DST do not change result.
4. **Automatic activity:** active daily run disables manual action, presents an automatic-running state, and refreshes outcome afterward.
5. **Exactly-once intent:** simultaneous/replayed requests resolve to one active request and at most one guarded apply.
6. **Collision:** daily/manual overlap uses one lock and either provable coalescing or post-daily claim; no false completion from lock contention.
7. **Full pipeline reuse:** manual execution produces the same dry-run validation, backup proof, apply proof, post-apply validation, lock, and checkpoint behavior as daily execution.
8. **Partial truth:** injected failure after a write persists accurate counts, maps partial failure, leaves checkpoint/last-successful unchanged, and permits deliberate retry.
9. **Zero-write truth:** unchanged-library copy appears only with persisted zero imported/upgraded counts.
10. **Durability:** refresh, navigation, page close/reopen, app restart, worker delay, and reconnect restore server state.
11. **Offline/auth:** pre-accept offline creates no request; post-accept offline does not cancel/replay; 401 stops polling and re-auth restores status.
12. **Long running:** 60-second variant keeps action disabled, promises no completion time, and continues in background.
13. **Expiry/cooldown:** unclaimed request expires at 30 minutes and cannot later run; terminal cooldown is server-timed five minutes with rounded Retry-After.
14. **Multi-tab:** two tabs converge on one request/outcome and do not create duplicate announcements.
15. **Accessibility/mobile:** dialog focus/Escape/return, transition-only polite announcements, 44px targets, full-width narrow action, non-color status, AA contrast, no spinner rotation under reduced motion, bottom-nav clearance.
16. **Privacy:** allowlisted response/event/log schema contains no source identifiers/content, secrets, raw exceptions, report paths, host details, commands, or environment names.
17. **Timer invariant:** next timer/config/enabled state is unchanged by manual request, success, failure, and rollback.
18. **Operational recovery:** activation failure after durable insert returns accepted queued state and fallback worker eventually claims the same request; stale claims never start a second run blindly.

## 7. Explicit conflicts and proposed resolutions

| Conflict | Evidence | Proposed resolution / synthesis need |
| --- | --- | --- |
| Goal default says display local time; PRD explicitly mandates IST. | `PRD:160-163`, `PRD:256-258`. | **Resolve in favor of PRD:** fixed Asia/Kolkata with visible IST. Record as an intentional exception. |
| “Between AI services and Data & Privacy” conflicts with the current optional My notes section in that interval. | `PRD:84-98`; current page `src/app/settings/page.tsx:136-195`. | **Coordinator decision:** recommended order AI services -> Recall sync -> My notes (when enabled) -> Data & Privacy, preserving Recall's exact placement. |
| State table omits offline, session-expired, long-running, request-expired, and distinct automatic-running states required by the goal/test plan. | State table `PRD:140-156`; reliability/test requirements `PRD:420-444`, `PRD:547-566`. | **Add presentation variants in PRD v2.** They may be overlays over the durable state machine, not new DB terminal states except request expiry. |
| Feature-flag-off unauthorized response conflicts with general owner authorization and current proxy order. | FR-1 says 401 (`PRD:171-177`); FR-17 says 404 to unauthorized while off (`PRD:252-254`); proxy returns 401 before handler (`src/proxy.ts:84-87`, `src/proxy.ts:140-148`). | **Recommend auth-first 401 for every unauthenticated API call.** Authenticated owner receives a safe disabled response/404 per final API contract. Coordinator must make one rule normative. |
| Existing active request response is both 202 and 200 in the PRD. | Primary flow/API says 202 for new or existing (`PRD:107-113`, `PRD:382-394`); safe codes call 200 an idempotent active response (`PRD:396-405`). | **Recommend 202 for newly persisted request, 200 for deduplicated existing request**, same response schema. Client treats both as accepted/active. |
| “Next automatic sync” exact instant vs randomized timer. | PRD requests timestamp (`PRD:90-96`); timer has 10m jitter (`scripts/deploy/brain-recall-sync.timer:5-8`); final evidence records actual next elapse (`docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_COMPLETION_AUDIT_2026-06-28_01-40-12_IST.md:36-48`). | Source it from trusted runtime `nextElapse`; never duplicate a hard-coded client time. Decide fallback copy when unavailable. |
| Latest successful run record may not equal completion of the full guarded wrapper. | Runner persists apply result before wrapper post-apply validation (`src/lib/recall/sync-runner.ts:439-463`; `scripts/recall-scheduled-apply.sh:188-210`). | Worker/request success must be marked only after the whole wrapper exits successfully. Coordinator/architect should decide whether automatic last-successful needs an additional persisted wrapper validation marker. |
| Current partial-failure name is used for a detail-fetch error with zero writes, while product partial failure means proven non-zero writes. | Test labels detail fetch failure partial (`src/lib/recall/sync-runner.test.ts:589-613`); PRD defines partial as writes before failure (`PRD:153-154`, `PRD:235-237`). | Separate internal technical error code from product `partial_failure`. Product mapper uses write counts, not the existing error name alone. |
| PRD claims cancellation can be learned from the durable request table, but Cancel creates no request. | Cancel makes no request (`PRD:490-493`); analytics claim (`PRD:475-482`). | Defer cancellation analytics or add a separate privacy-reviewed event later. Do not create a fake sync request on cancel. |
| Current runner run state supports `running`, but inserts only terminal reports. | Type includes running (`src/db/recall-sync.ts:36-55`); insertion occurs in terminal persistence (`src/lib/recall/sync-runner.ts:439-463`). | Add a durable lifecycle signal sufficient for automatic-running/restart recovery; coordinator and architect decide whether to update run rows or maintain a separate execution state. |
| PRD open decision allows wait or coalesce during automatic run. | FR-7 (`PRD:195-197`); recommendation (`PRD:632-639`). | Approve provable coalescing only; otherwise queue and run afterward. Never equate lock contention with completion. |

## 8. Project-management milestones and tracker inputs

### Milestones

| Milestone | Exit criteria | Primary owner role | Dependencies / blockers |
| --- | --- | --- | --- |
| M0 — Council synthesis and PRD v2 | Section 7 conflicts resolved; state/copy matrix and numbered ACs approved. | Coordinator + Product | Must precede implementation. |
| M1 — Persistence/API dark launch | Migration, request repository, idempotency/dedupe/cooldown/expiry, safe GET/POST, auth/origin/flag, unit/route tests. UI flag off. | Implementation + Platform/Data | Migration number reconciliation; response-code/flag decisions. |
| M2 — Trusted worker and operations | Atomic claim, path/poll activation, full wrapper reuse, request/run linkage, automatic collision, stale recovery, partial count truth, safe metrics. | Architect + Implementation | Activation choice; wrapper success marker; systemd writable path review. |
| M3 — Settings UX | Section, confirmation, all variants, IST formatter, polling/visibility/reconnect, mobile and accessibility. | UX + Implementation | Stable status contract and copy matrix. |
| M4 — Integrated verification | Required unit/route/worker/UI/E2E, fault injection, two-tab, time zones, mobile, screen reader, reduced motion, timer invariance, privacy scan, production build. | QA/Reviewer | M1-M3 complete; test fixtures for automatic/manual overlap and partial writes. |
| M5 — Review-ready delivery | Adversarial findings closed, PRD/UX/technical v2 aligned, docs/wiki updated and verified, PR created with flag off. | Coordinator + Project Manager | No critical/high findings; no unverified claims. |
| M6 — Separately authorized enablement | Worker readiness, queue/activation permissions, rollback, controlled manual run, comparison to daily artifacts, observation window. | Owner + Operations | Explicit production approval; not authorized by implementation prompt. |

### Tracker rows to create

| Tracker ID | Deliverable | Done definition | Risk if omitted |
| --- | --- | --- | --- |
| RMS-PROD-01 | Normative state/copy matrix | Every durable state and overlay has title, detail, action, announcement, last-successful behavior. | Contradictory UI and tests. |
| RMS-DATA-01 | Last-successful derivation | Validated apply source works for automatic/manual/no-new-item and excludes all failures. | False freshness. |
| RMS-DATA-02 | Partial-write accounting | Fault after N writes persists N and never claims zero. | Trust/safety breach. |
| RMS-CONC-01 | One-active request + atomic claim | Concurrent POST/worker tests prove one request/apply. | Duplicate imports/work. |
| RMS-CONC-02 | Daily/manual collision | Provable coalescing or queue-after behavior with run linkage. | False completion/checkpoint race. |
| RMS-OPS-01 | Narrow activation + fallback | Wake marker has no payload; lost wake is recovered within fallback interval. | Stuck accepted requests. |
| RMS-OPS-02 | Next-elapse source and timer invariant | Trusted next schedule is displayed and unchanged across manual outcomes. | Misleading schedule / regression. |
| RMS-SEC-01 | Owner/same-origin/flag response contract | One documented precedence and exhaustive tests. | State leak or CSRF. |
| RMS-PRIV-01 | Allowlisted API/log/event schema | Privacy scan proves no Recall/source/host/secret leakage. | Sensitive-data exposure. |
| RMS-UX-01 | Responsive/accessibility state controller | 320/390/desktop, keyboard, screen reader, reduced motion, focus return. | Goal/acceptance failure. |
| RMS-REL-01 | Refresh/offline/auth/multi-tab recovery | State reconstructs without duplicate or false terminal result. | Broken real-world workflow. |
| RMS-ROLLOUT-01 | Flag-off rollback and controlled enablement | UI/new requests off, running work safely completes, daily timer unchanged. | Operational regression. |

### Critical path and blockers

Critical path: M0 contract resolution -> M1 status/persistence contract -> M2 trusted execution -> M3 UI integration -> M4 integrated verification -> M5 delivery.

Current material blockers for downstream planning—not blockers to writing PRD v2—are:

- authoritative source for “full wrapper validated” automatic success;
- accurate partial-write accounting under thrown importer/apply failures;
- trusted next-timer elapse handoff without broadening web privileges;
- normative flag/auth and 200/202 response precedence;
- durable representation of active automatic runs.

## 9. Decisions requiring coordinator synthesis

The coordinator should explicitly record these decisions in the main decision log and then propagate them consistently into PRD v2, UX/UI v2, technical plan v2, and QA traceability:

1. Approve fixed IST as the intentional exception to device-local display.
2. Approve exact Settings order relative to optional My notes.
3. Approve `Not yet synced` and the definition/source of last-successful.
4. Approve the added offline, session-expired, long-running, automatic-running, and expired-request variants.
5. Resolve auth-first 401 versus feature-off 404.
6. Resolve 202-new / 200-deduplicated response semantics.
7. Approve 30-minute unclaimed expiry, five-minute cooldown, and 60-second activation fallback.
8. Approve provable coalescing; otherwise queue-after-daily.
9. Choose how a full guarded-wrapper success is durably marked for automatic runs.
10. Choose how partial-write counts survive exceptional exits before any user-facing copy is enabled.
11. Choose a trusted next-elapse persistence/read mechanism and unavailable fallback copy.
12. Approve latest-outcome-only UI and no confirmation-cancel analytics in v1.

## 10. Council disposition

**Growth & Engagement:** Approve with truth-first copy, confirmation retained, no engagement gimmicks, and success measured by confidence/latency rather than click volume.
**Platform & Data:** Approve conditionally on durable lifecycle, full-wrapper reuse, atomic dedupe/claim, partial-write truth, and trusted schedule source.
**Power User & Workflow:** Approve with explicit offline/auth/long-running/automatic overlap recovery and no surprise retries.
**AI Expert Brainstorm Council:** Approve deterministic state mapping; reject a generative AI runtime dependency for v1.
**Expert Project Manager:** Advance to coordinated PRD-v2 synthesis after section 9 decisions are logged; treat RMS-DATA-02, RMS-CONC-01/02, RMS-OPS-01/02, RMS-SEC-01, and RMS-PRIV-01 as release-blocking.
