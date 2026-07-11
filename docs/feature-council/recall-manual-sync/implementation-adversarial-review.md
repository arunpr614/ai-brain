# Recall manual-sync implementation - Adversarial Review

**Created:** 2026-07-11 15:39:13 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** Uncommitted Recall manual-sync implementation on `feat/recall-manual-sync`, including persistence, runner, lifecycle, worker, wrapper, API, Settings client, systemd/deploy assets, tests, and approved v2 requirements
**Report path:** `docs/feature-council/recall-manual-sync/implementation-adversarial-review.md`

## Executive Verdict

**No-go for a review-ready PR and no-go for production enablement.** The feature is default off and the focused tests pass, but four review-ready P1 defects remain: a terminal idempotency replay is falsely acknowledged as newly queued, lifecycle completion can manufacture a validated success before the wrapper validator, ambiguous-response recovery can re-enable submission before acceptance is resolved, and the highest-risk process guarantees have only string/static coverage. The separately authorized host-preparation path also lacks an active-work guard before replacing trusted assets and changing permissions.

No production host proof was attempted or authorized. Distinct-user credential, filesystem, SQLite/WAL, tmpfiles, path/timer, and live timer-preservation claims therefore remain production-enablement gates even after the review-ready defects are fixed.

## Evidence Inspected

- `AGENTS.md`; `docs/feature-council/recall-manual-sync/prd-v2.md`; `ux-ui-v2.md`; `technical-plan-v2.md`; `decision-log.md`; `qa-acceptance-matrix.md`; and `project-tracker.md`.
- Full implementation diff and relevant baseline code in `src/db/recall-sync.ts`, `src/lib/recall/importer.ts`, `src/lib/recall/sync-runner.ts`, `src/lib/recall/client.ts`, `src/lib/recall/scheduler.ts`, and `src/lib/security/redaction.ts`.
- New persistence, service, route, client, worker, lifecycle, migration, unit, build, deploy, and test files.
- `npm run typecheck` - passed.
- `npm run build:recall-cli` - passed; all three bundles and migrations were emitted.
- `npm run check:recall-manual-sync-artifacts` - passed.
- Focused Node test run across repository, route, component, contract, and runner suites - 33/33 passed.
- `npm run smoke:recall-scheduler-wrapper` - passed.
- `git diff --check` - passed.
- An ephemeral-database fault probe called `completeRecallSyncExecution` while the execution stage was still `starting`; observed output was `{ "priorStage": "starting", "state": "done", "stage": "terminal", "validatedAt": 3000 }`, confirming premature validated success is currently accepted.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found. The feature and new activation units are default off, so the defects below do not create an immediate production action by merely landing the code.

### P1 - High Risk

#### 1. A replay of a terminal idempotency key returns a false `202 queued` acknowledgment

**Evidence:** `src/db/recall-manual-sync.ts:123-139` returns any same-key row before checking whether it is active and before applying cooldown. `src/app/api/settings/recall-sync/route.ts:54-61` then maps every non-`running` request state, including `done`, `blocked`, `error`, `partial_failure`, and `expired`, to public state `queued` with HTTP `202`. The approved contract limits `202` deduplication to an active request (`prd-v2.md`, Manual request contract). Existing route/repository tests cover active deduplication but not terminal replay (`src/app/api/settings/recall-sync/route.test.ts:47-80`; `src/db/recall-manual-sync.test.ts:40-52`).
**Why it matters:** The API claims durable queued work exists when no request was inserted and no worker will run it. This is a direct trust breach in the one action the feature is adding. It is especially reachable after a lost POST response whose server-side work finishes before the client resolves ambiguity.
**Failure mode:** A client retries its retained key after the request has become terminal. The server returns `202`, `deduplicated: true`, `state: queued`; the marker may be touched, but the terminal request is not claimable. The UI briefly says work was accepted even though nothing was queued. Cooldown is bypassed for the same key.
**Recommendation:** Resolve same-key replay by state. Return `202` only for `queued|claimed|running`. For a terminal replay, return an explicit safe terminal/cooldown response that cannot be confused with acceptance, and do not touch the wake marker. Add route and repository tests for every terminal state, replay during cooldown, replay after cooldown, and a lost-response request that becomes terminal before recovery.

#### 2. Lifecycle completion can mark false validated success before final wrapper validation

**Evidence:** `src/db/recall-manual-sync.ts:327-349` requires only a linked apply run in core state `done`; it never requires the execution to be at `apply_validated`. The runner marks the core run done before the external apply-report validator (`src/lib/recall/sync-runner.ts:439-466`). The wrapper calls the validator at `scripts/recall-scheduled-apply.sh:292-296`, sets `apply_validated` at line 297, and completes at line 298, but that order is convention rather than a repository invariant. The ephemeral probe described above proved an execution at `starting` can be moved to terminal `done` with `wrapper_validated_at` populated.
**Why it matters:** `wrapper_validated_at` is the sole source for “Last successful sync.” A misplaced call, future wrapper refactor, direct lifecycle invocation, or partial deployment can turn an unvalidated apply row into user-visible success and advance the trust marker.
**Failure mode:** The core apply writes a `done` row; the wrapper validator has not run or would fail; `complete` is invoked early; execution/request become done and `latestValidatedRecallSuccess()` publishes the timestamp.
**Recommendation:** In the same immediate transaction, require current execution `state='running' AND stage='apply_validated'`, require the execution's persisted `apply_run_id` to equal the supplied run, and fail closed otherwise. Add tests for completion rejection from every earlier stage, validator failure preserving last-success, success only after `apply_validated`, and transaction rollback if linked request finalization fails.

#### 3. Ambiguous POST recovery can clear its guard before acceptance is correlated

**Evidence:** `src/components/recall-manual-sync.tsx:26-47` clears the `unknown` overlay after any successful GET. If GET returns no activity, the retained key remains, but `actionDisabled` at line 141 ignores `hasPendingKey`, so Sync now becomes available again. `startSync` at lines 103-137 can issue another POST. The v2 controller contract says an ambiguous response must keep the same key, GET before any new POST, and permit no new POST until acceptance is resolved. The component tests have no slow/lost-response or same-key recovery interaction (`src/components/recall-manual-sync.test.ts:29-141`).
**Why it matters:** Idempotency limits duplicate durable work, but the UI can still contradict “Do not start another sync yet,” generate repeated POSTs, and combine with Finding 1 to display false queued acceptance for terminal work. A single GET that races before the original transaction commits is not proof of rejection.
**Failure mode:** The POST response is lost; immediate GET races before persistence is visible and returns Ready; the overlay clears; the user presses Sync now again; the same key is resent and may receive the false terminal-to-queued response.
**Recommendation:** Model ambiguity as an explicit controller state that remains submission-blocking until GET correlates an active/terminal request or a bounded server-defined resolution proves no persistence. Include the idempotency correlation needed for safe recovery without exposing internals, or define a safe expiry/rejection protocol. Add deterministic delayed-commit/lost-response tests, repeated GET tests, unmount/abort tests, and assertion that no second POST occurs while unresolved.

#### 4. The highest-risk no-skip, single-run, and stale-recovery guarantees are not tested at the process boundary

**Evidence:** `scripts/check-recall-manual-sync-artifacts.mjs:31-53` checks source substrings for identity, credentials, lock waits, occurrence keys, and wake behavior. The wrapper smoke replaces `flock` with a stub that always exits success (`scripts/smoke-recall-scheduled-wrapper.mjs:33-38`), so it cannot prove serialization. The new database tests use one shared connection and do not exercise two connections or processes (`src/db/recall-manual-sync.test.ts:28-135`). There are no worker process tests, simultaneous automatic/manual wrapper traces, lost-marker fallback timing tests, killed-wrapper/PID heartbeat tests, or timer-invariance fixture. `qa-acceptance-matrix.md:7-29` correctly still marks all 21 criteria Pending.
**Why it matters:** The design explicitly makes overlap/no-skip, heartbeat recovery, one active request, and truthful partial counts release no-go gates. Static presence cannot detect a wrong `flock` invocation, systemd coalescing behavior, restart crash window, duplicate apply, stale misclassification, or marker/timer delivery failure. Passing 33 focused tests creates false confidence because none drives the new orchestration as cooperating processes.
**Failure mode:** The code lands after unit tests pass, but manual work at daily timer fire skips an occurrence, two workers claim/spawn unexpectedly, a healthy long run is failed as stale, or a killed run is duplicated. There is no executable evidence to distinguish those outcomes.
**Recommendation:** Add short-bound Linux/process fixtures that run the real `flock`, wrapper, lifecycle bundle, worker bundle, independent SQLite connections, and fake systemd activation. Capture ordered traces proving: manual contention requeues; automatic contention retries and completes the same occurrence exactly once; dry/apply stages never interleave; marker pickup meets the healthy bound; fallback meets the 75-second bound; healthy heartbeats prevent reconciliation; killed processes reconcile once without duplicate apply; and timer definition/state is unchanged. Add a real two-process enqueue/claim race and busy-timeout tests.

#### 5. Separately authorized host preparation can replace trusted assets while Recall work is active

**Evidence:** `scripts/deploy.sh:359-370` copies standalone output, lifecycle/worker/sync bundles, migrations, units, and then the live wrapper before the remote preparation block. Lines 371-398 change data ownership/modes, install units/tmpfiles, and reload systemd. There is no check that `brain-recall-sync.service` and `brain-recall-manual-sync.service` are inactive, no outer-lock probe, and no wait/fail-closed behavior for running work. The rollout contract says rollback/deploy must preserve running work.
**Why it matters:** This path is explicitly gated by `BRAIN_RECALL_PREPARE_MANUAL_SYNC=1`, so it is not an unauthorized production action in this PR. However, once separately authorized, it can mix bundle/schema/lifecycle versions inside an active wrapper or recursively change permissions during SQLite/backup work. That is a high production-enablement risk.
**Failure mode:** Daily Recall work is between dry-run, backup, and apply while deploy overwrites a subsequently spawned bundle or installs new lifecycle behavior. The active run observes a mixed release, fails terminalization, or leaves misleading state.
**Recommendation:** Before any Recall bundle/wrapper/migration/unit or recursive permission mutation, fail closed unless both services are inactive and the private outer lock can be acquired under the trusted identity. Stage versioned assets, switch them atomically only after the guard, and document a forward-only rollback that never interrupts active work. Add a deploy fixture that proves active work blocks preparation and timer enabled/active state is unchanged before and after.

### P2 - Medium Risk

#### 1. Stale-claim recovery can extend a request beyond the promised 30-minute expiry

**Evidence:** New requests set `expires_at=requested_at+30m` (`src/db/recall-manual-sync.ts:141-147`), but stale recovery overwrites it with `now+30m` (`src/db/recall-manual-sync.ts:184-193`). GET/status does not expire rows; expiration occurs only during enqueue/claim (`src/db/recall-manual-sync.ts:124`, `157`, `224-233`).
**Why it matters:** Repeated worker crashes before lifecycle start can keep one request alive indefinitely, and a broken worker/path/timer can leave the UI showing Queued long after it can no longer run.
**Failure mode:** Claim, crash, wait 90 seconds, requeue with a fresh 30-minute lease, repeat. The product's original 30-minute boundary never arrives.
**Recommendation:** Treat expiry as immutable from original request time. On stale reconciliation, expire if the original deadline passed; otherwise requeue without changing it. Ensure status observation or a trusted periodic repository action makes overdue queued state visible as expired. Test repeated stale cycles and recovery after the deadline.

#### 2. Required client states and offline polling semantics are incomplete

**Evidence:** The component receives server state directly and has no Recall-specific loading rendering. Long-running detection exists only for manual runs (`src/components/recall-manual-sync.tsx:249-270`); automatic long-running remains generic. Offline after acceptance uses title “You're offline” instead of the approved “Status temporarily unavailable.” The active polling effect stops only for session expiration, not offline (`src/components/recall-manual-sync.tsx:53-73`), so an accepted offline run can attempt fetch every two seconds until connectivity returns.
**Why it matters:** This falls short of the approved state matrix and can create noisy retry behavior precisely when status is unavailable.
**Failure mode:** A running request goes offline; the UI uses the wrong semantic title and repeatedly performs doomed requests instead of waiting for the `online` event. An automatic run beyond the long threshold never receives the long-running reassurance.
**Recommendation:** Complete the state matrix, pause active polling while offline, refresh immediately on online/visibility, and add fake-timer tests for loading, automatic long-running, offline before/after acceptance, hidden/visible cadence, stop rules, and announcement transitions.

#### 3. The request body limit is checked only after unbounded buffering when length is absent

**Evidence:** `src/app/api/settings/recall-sync/route.ts:39-43` rejects a declared large Content-Length but calls `req.text()` before checking actual bytes. Chunked or missing-length input is buffered in full.
**Why it matters:** The route is owner-authenticated and exact-origin protected, which lowers exposure, but the promised strict bounded body is not a transport bound. A same-origin compromise or hostile local client with a session can force unnecessary memory use.
**Failure mode:** A very large chunked body is read into memory and only then rejected as 400.
**Recommendation:** Enforce the maximum while reading the stream or reject missing/invalid lengths under a bounded server/proxy policy. Add chunked, negative/invalid length, multibyte, wrong-content-type, and exact-boundary tests.

#### 4. The UI and accessibility evidence is not yet implementation evidence

**Evidence:** `qa-acceptance-matrix.md:41-48` lists implementation screenshots, final QA ledger, independent review, and wiki proof as Pending. Existing images are supplied-design or standalone revised-prototype evidence, not the running Settings implementation. Component tests are static markup plus one visibility test and do not exercise Radix focus trap/return, overlay dismissal, keyboard use, 200% zoom, screen reader sequence, contrast, touch-target measurement, or 320px/bottom-navigation layout.
**Why it matters:** The implementation may look correct in source while failing the interaction and responsive behavior that drove the redesign.
**Failure mode:** Focus return, modal initial focus, mobile reflow, or live announcements fail in-browser despite static JSX assertions.
**Recommendation:** Produce implementation screenshots at 1440/1024/390/320 in light/dark, run keyboard/focus/no-overlay tests, measure 44px targets and overflow, run automated contrast/accessibility checks, verify reduced motion and 200% zoom, and record evidence against each acceptance criterion.

### P3 - Low Risk Or Polish

#### 1. Static artifact checks are brittle proxies for semantic configuration

**Evidence:** `scripts/check-recall-manual-sync-artifacts.mjs:31-59` relies mainly on `String.includes`. It does not parse systemd units, run `systemd-analyze verify`, inspect effective sandbox properties, validate tmpfiles semantics, or prove enablement defaults.
**Why it matters:** Formatting-equivalent changes can fail the gate, while semantically broken configurations containing the expected substrings can pass.
**Failure mode:** A duplicate or overridden systemd property preserves the searched text but changes effective behavior.
**Recommendation:** Keep fast static checks, but supplement them with parsed/effective unit validation in a Linux fixture and explicit negative fixtures.

## What The Original Plan Or Work Gets Wrong

The approved v2 plan is substantially safer than the implementation evidence. The work currently treats wrapper call order as proof of final validation, treats all idempotency replays as active, and treats static source strings as proof of process behavior. Those are exactly the trust shortcuts v2 said were no-go conditions.

The implementation also silently weakens the 30-minute expiry by renewing it after stale claims and implements only a subset of the approved client-state matrix. The project tracker and QA matrix accurately say implementation/QA are still Pending; any summary that calls the feature complete based on passing focused tests would be stale and overclaiming.

## Missing Validation

- No premature-complete rejection or final-validator crash-window test.
- No terminal-key replay contract test.
- No ambiguous POST delayed-commit/lost-response controller test.
- No independent SQLite connection/process race or bounded `SQLITE_BUSY` test.
- No real outer-`flock` automatic/manual overlap and no-skip trace.
- No marker-path pickup or 60-second fallback process timing test.
- No heartbeat/PID/lock healthy-long versus killed-stale process test.
- No deploy active-work refusal, atomic asset switch, or rollback fixture.
- No migration-from-real-023 snapshot compatibility test or effective systemd/tmpfiles validation.
- No implementation browser screenshots, keyboard/focus/screen-reader/contrast/zoom/reduced-motion evidence.
- No full lint, full test, production build, privacy/docs gate, wiki publication proof, or final acceptance ledger observed in this review turn.

## Revised Recommendations

1. Fix terminal idempotency replay and ambiguous-response correlation as one end-to-end contract.
2. Make `apply_validated` a database-enforced precondition for lifecycle completion and test every crash window.
3. Add real process fixtures for outer locking, automatic retry/no-skip, worker wake/fallback, heartbeat/stale recovery, and multi-process SQLite races.
4. Preserve immutable request expiry and complete the required client/offline state machine.
5. Make host preparation refuse active work before copying Recall runtime assets, then add atomic version switching and rollback evidence.
6. Run independent QA against all 21 acceptance criteria and produce implementation—not prototype—visual/accessibility evidence.

## Go / No-Go Recommendation

**No-go.** Do not call the branch review-ready until Findings P1-1 through P1-4 are fixed and verified by executable tests. P1-5 must be fixed before the separately authorized host-preparation path can be used. Do not enable the UI, path, fallback timer, or new Recall identity in production until explicit authorization and host proof confirm credential isolation, lock denial for the web user, Recall-user data/SQLite/WAL/backup access, effective unit hardening, marker/timer readiness, timer preservation, one controlled request, and the following daily completion.

## Plan Revision Inputs

### Required Deletions

- Delete the repository behavior that treats terminal idempotency rows as active deduplicated acceptance.
- Delete the route's catch-all non-running-to-queued state collapse.
- Delete expiry renewal during stale-claim recovery.
- Delete any implication that substring artifact checks prove concurrency, heartbeat, identity, or timer behavior.
- Delete direct Recall runtime asset replacement from preparation before active-work exclusion.

### Required Additions

- Lifecycle `apply_validated` and persisted apply-run-link preconditions in the terminal transaction.
- Explicit terminal-replay and ambiguous-correlation API/client states.
- Real process fixtures for `flock`, workers, lifecycle, heartbeat, path/timer fallback, and independent SQLite connections.
- Immutable request expiry behavior and overdue-status reconciliation.
- Active-service/outer-lock deploy guard plus versioned atomic switch and forward rollback.
- Full implementation browser/accessibility evidence.

### Required Acceptance Criteria Changes

- AC7 must explicitly reject or safely resolve terminal idempotency replay; `202 queued|running` is active-only.
- AC8, AC9, AC11, and AC13 require process traces, not source-string checks.
- AC14 must include process termination after a committed card and before terminal report persistence, not only an injected synchronous throw.
- AC20 must include deploy refusal while either Recall service or the outer lock is active.
- AC21 cannot pass until the final full command ledger and implementation visual/accessibility evidence exist.

### Required Validation Changes

- Add negative lifecycle tests from every pre-validator stage.
- Add route/repository/client tests for terminal replay, cooldown, delayed commit, lost response, and no second POST.
- Replace the fake-success `flock` smoke for concurrency claims with a real-lock fixture and ordered stage log.
- Kill real wrapper/worker processes at claimed, starting, dry-run, backup, apply-after-one-card, validator, and terminal boundaries.
- Run two independent database connections and two processes against enqueue/claim contention.
- Run `systemd-analyze verify`/tmpfiles checks in Linux and capture effective identity/sandbox expectations.
- Render and inspect the real Settings implementation at all required viewports/themes and interaction modes.

### Required No-Go Gates

- Any terminal idempotency replay reported as newly queued.
- Any path that writes `wrapper_validated_at` before persisted `apply_validated` stage.
- Any ambiguous client state that permits a new POST before correlation is resolved.
- Any missing process proof for automatic/manual no-skip, one apply, heartbeat recovery, or lost-wake fallback.
- Any host preparation while a Recall service or outer lock is active.
- Any production enablement without separately authorized host credential/identity/filesystem/unit/timer proof.

## Residual Risks

Even after remediation, systemd path/timer behavior, `LoadCredential` isolation, Unix identity/group permissions, SQLite/WAL/backups, timer preservation, and real Recall latency/rate behavior remain host-dependent. Local/static fixtures can make the PR review-ready but cannot authorize or prove production enablement. The first enabled request and the next automatic occurrence need controlled observation with rollback ready, without merging or deploying as part of this task.

---

## Closure Review - 2026-07-11 16:15:05 IST

**Reviewed snapshot:** Remediated uncommitted implementation on `feat/recall-manual-sync`
**Closure stance:** Fresh adversarial retest of every original P1/P2 plus regression search
**Closure verdict:** **No-go remains.** Three P1 issues remain: a normal different-key active dedupe strands the client in unresolved ambiguity, the host-preparation guard releases before Recall assets are replaced, and the claimed lost-wake/fallback fixture does not exercise the worker or systemd activation path. The snapshot cannot yet proceed as implementation-complete to visual/docs delivery.

### Closure Evidence

- Re-read the complete adversarial-review skill and report template.
- Re-inspected the remediated request repository, lifecycle terminal transaction, worker reconciliation, wrapper retry/reconcile flow, route/body handling, client controller, process fixture, artifact gate, units, and deploy preparation path.
- `npm run typecheck` - passed.
- `npm run build:recall-cli` - passed.
- `npm run check:recall-manual-sync-artifacts` - passed.
- Focused repository/route/component/contract/runner tests - 42/42 passed.
- `npm run test:recall-manual-sync-process` - six fixture groups reported passed.
- `npm run smoke:recall-scheduler-wrapper` - passed.
- Passing commands do not close the three P1s below because the affected scenarios are absent from or simulated incorrectly by those tests.

### Original-Finding Disposition

| Original finding | Closure status | Evidence and residual |
| --- | --- | --- |
| P1-1 terminal key replay falsely returns `202 queued` | **Closed** | `src/db/recall-manual-sync.ts:138-145` distinguishes active from terminal replay; `src/app/api/settings/recall-sync/route.ts:71-82` returns `429`/`409` without waking; route and repository tests cover all terminal states and marker invariance. |
| P1-2 completion before final validator | **Closed** | `src/db/recall-manual-sync.ts:382-400` requires `stage='apply_validated'` and the exact persisted apply link; linked-request finalization must affect one row at lines 450-473. Tests reject every earlier stage and prove transaction rollback. |
| P1-3 ambiguous response permits another POST | **Partially closed; new P1 regression below** | Pending keys now disable submission and GET carries a correlation key (`src/components/recall-manual-sync.tsx:33-88`, `153-198`). Same-key absence is bounded, but different-key active dedupe is not correlated. |
| P1-4 process guarantees had only static/string proof | **Partially closed; P1 remains below** | The new fixture now uses independent processes for enqueue/claim, a real OS lock for serialization, killed heartbeat processes, crash-stage reconciliation, and an expired claimed-worker case. Its wake/fallback group is not an activation test, and the real wrapper is still not driven through the automatic/manual overlap trace. |
| P1-5 deploy preparation can replace active work | **Open P1** | The guard moved before artifact copy, but it releases before copy/switch and is therefore racy. |
| P2-1 stale recovery renews expiry | **Closed** | `src/db/recall-manual-sync.ts:200-229` preserves the original deadline and expires at/after it; status observation also expires queued rows (`src/lib/recall/manual-sync-service.ts:52`). Boundary tests pass. |
| P2-2 incomplete/offline client behavior | **Mostly closed; visual/loading residual** | Offline polling pauses, accepted-offline copy is corrected, automatic long-running copy exists, monotonic cooldown is tested, and out-of-order GETs are suppressed. A Recall-specific loading state is still not exercised because the component begins with server status. |
| P2-3 body buffered before limit | **Closed** | `src/app/api/settings/recall-sync/route.ts:93-120` validates declared length and cancels streaming input above 256 bytes; route boundary/invalid-length tests pass. |
| P2-4 implementation visual/a11y evidence absent | **Open P2 delivery gate** | No running-implementation screenshot, focus, screen-reader, contrast, zoom, reduced-motion, or touch-target evidence was added in this remediation snapshot. |
| P3 static artifact checks are brittle | **Residual P3** | The gate now also asserts deploy-guard ordering, but still uses source substrings rather than effective systemd/tmpfiles evaluation. |

### Remaining P1 - High Risk

#### C1. Different-key active deduplication leaves the client permanently unresolved

**Evidence:** When request A is active, `enqueueRecallSyncRequest` returns A for a POST carrying key B without persisting key B (`src/db/recall-manual-sync.ts:147-148`). POST returns A's `requestId` and `deduplicated: true` (`src/app/api/settings/recall-sync/route.ts:47-62`). The client does not parse that accepted body; it keeps key B and calls GET with B (`src/components/recall-manual-sync.tsx:153-190`). GET correctly reports B as `absent`. Because `unknownSince` is reset/null after the successful POST, `pendingAcknowledgementResolved` can never resolve that absence (`src/components/recall-manual-sync.tsx:58-78`, `353-360`). Existing tests cover pure helper cases and route active dedupe separately, but not the two-tab interaction.
**Why it matters:** Multi-tab convergence is a normative acceptance criterion, and this is the ordinary second-tab path rather than an exotic crash. The second tab remains “Checking whether your request was accepted,” polls indefinitely, and never reconstructs the real terminal state through its retained key.
**Failure mode:** Tab A enqueues key A. Tab B POSTs key B and receives a valid deduplicated `202` for request A. Tab B ignores request A, looks up key B forever, and keeps submission blocked even after A finishes.
**Required fix:** Correlate definitive `202` acceptance using the returned request ID or persist a safe idempotency alias. The client must distinguish “accepted existing active request” from “ambiguous response,” then follow the returned durable request to terminal state. Add a real component/route flow for two tabs with different keys, deduplicated `202`, refresh/offline recovery, and terminal convergence. The bounded absence interval must also be no shorter than the maximum server-side enqueue ambiguity window or be replaced with a server-issued definitive rejection token.

#### C2. The deploy active-work guard has a time-of-check/time-of-use race

**Evidence:** `scripts/deploy.sh:359-382` checks service state and momentarily probes `/run/brain-recall/recall-sync.lock`. That remote command exits and releases its probe. Artifact replacement begins later at lines 384-395; recursive permission changes and unit installation occur at lines 396-423. The daily timer remains enabled, so Recall work can start after the check but before or during those mutations. The after-check at lines 424-428 detects only timer-state drift, not a run that started in the gap.
**Why it matters:** The remediation changes the location of the check but does not provide exclusion. An authorized preparation can still mix wrapper/lifecycle/bundle versions or alter permissions during backup/SQLite work.
**Failure mode:** Guard observes inactive services/free lock. The daily timer starts automatic work one second later. Deploy overwrites bundles/wrapper and changes data modes while that work is running.
**Required fix:** Hold the private outer lock continuously, under the trusted identity, across the Recall asset/version switch, permission transition, unit installation, and daemon reload; or use an equivalent atomic deployment protocol that prevents timer-started work from entering the critical section. Stage versioned assets before acquiring the lock, switch atomically while holding it, and verify service/timer state before release. Add a fixture that deliberately starts a contender between guard and switch and proves preparation cannot proceed concurrently.

#### C3. The wake/fallback fixture passes without invoking the activation path

**Evidence:** `scripts/test-recall-manual-sync-process.mjs:139-170` uses `fs.watch` to notice a marker written by the same fixture. For the fallback case it creates the marker before starting a local 20ms polling loop, so the poll succeeds immediately. It does not invoke the worker, path unit, fallback timer, queue claim, wrapper, or systemd-equivalent scheduler. The asserted 75 is milliseconds in this synthetic loop, unrelated to the product's 75-second recovery target.
**Why it matters:** AC8 is still unproved. The highest-risk delivery failure is not “can this process observe a file it just created”; it is “does a lost path wake cause the trusted worker to claim durable work within the fallback bound.”
**Failure mode:** Path activation or the timer-to-service wiring is broken, but the fixture remains green because neither is involved. Reviewers infer recovery proof from a test that cannot fail for those defects.
**Required fix:** Build a short-bound systemd-equivalent harness (and Linux effective-unit validation) that enqueues a real request, deliberately suppresses the first marker/path wake, fires the fallback activation, runs the packaged worker, and observes claim/start exactly once within the injected bound. Separately test healthy path pickup. Preserve and hash the automatic timer definition/state around both flows.

### Closure P2/P3 Residuals

- The process crash matrix creates lifecycle/run rows in child processes and kills those children, but it does not kill the actual wrapper at each named boundary. This is useful repository proof, not full wrapper process proof. Add actual wrapper boundary injection before final acceptance.
- The real-lock trace proves OS serialization order but does not drive the manual worker's requeue code and automatic systemd retry/occurrence path together. Add one packaged overlap trace showing one manual request requeued and one automatic occurrence completed exactly once.
- The 10-second absent-key resolution is shorter than the theoretical three `busy_timeout=5000` enqueue attempts plus retry delays. The one-active database constraint prevents two applies, but the client can still clear ambiguity before the original server request finishes. Either derive the resolution bound from the server maximum or use a server-backed definitive result.
- Recall-specific loading behavior and all running implementation visual/accessibility evidence remain delivery work.
- Effective Linux user/group/credential/lock/tmpfiles/systemd proof remains a separately authorized production-enablement gate, not something local fixtures can claim.

### Closure Go / No-Go Recommendation

**No-go remains for implementation completion.** Fix C1-C3, rerun the focused and process suites, and obtain a clean closure review before treating backend/client implementation as ready for visual/docs delivery. After those fixes, visual/accessibility QA and repository/wiki documentation can proceed. Production enablement remains separately blocked on explicit authorization and host identity, credential, permission, unit, SQLite/WAL/backup, and timer proof.

---

## Final Closure Review - 2026-07-11 16:32:38 IST

**Reviewed snapshot:** Second remediation of C1-C3 on `feat/recall-manual-sync`
**Final closure verdict:** **No-go remains because C1 is not fully closed.** C2 and C3 are closed for review-ready local/static scope. One high-severity multi-tab/reconnect correlation failure remains, so implementation is not yet approved to proceed as complete to visual/docs delivery.

### Final Evidence

- Re-read the complete adversarial-review skill and report template.
- Re-inspected confirmed-request client state/ref behavior, reduced status correlation, route/repository dedupe behavior, continuous deploy guard acquisition/release, timer-state verification, artifact selection, packaged worker/lifecycle activation harness, and process assertions.
- `bash -n scripts/deploy.sh scripts/recall-scheduled-apply.sh` - passed.
- `git diff --check` - passed before this report append.
- `npm run typecheck` - passed.
- `npm run build:recall-cli` - passed.
- `npm run check:recall-manual-sync-artifacts` - passed.
- Focused repository/route/component/contract/runner tests - 43/43 passed.
- `npm run test:recall-manual-sync-process` - six fixture groups passed.
- `npm run smoke:recall-scheduler-wrapper` - passed.

### C1-C3 Disposition

#### C1. Different-key dedupe correlation - **Open P1 after partial remediation**

The client now parses a definitive `202`, stores the returned durable request ID, clears the unpersisted second-tab key, blocks another submission, and follows the ID through GET failures (`src/components/recall-manual-sync.tsx:171-226`). That closes the immediate different-key deadlock while request A remains the reduced `status.activity`.

It does not close supersession. GET never sends `confirmedAcceptedRequestId`; server status exposes only one reduced activity. Correlation at `src/components/recall-manual-sync.tsx:421-436` returns `missing` whenever that one activity has a different request ID. A hidden/offline tab can miss request A's terminal period and five-minute cooldown; another tab can then start request B. When the original tab returns, status shows B active and later B terminal. A will never again be the reduced activity, so the original tab remains status-unknown and submission-blocked forever. The added test at `src/components/recall-manual-sync.test.ts:141-179` covers A active to A terminal, not A superseded by B.

**Required remediation:** Add an authenticated, safe request-ID acknowledgement lookup to GET (or a formally equivalent supersession rule) and have the client send the confirmed request ID until the server says that exact request is terminal. Test: accept A via different-key dedupe, hide/offline the tab, terminalize A, pass cooldown, start and terminalize B, restore the tab, prove exact-A acknowledgement releases the guard and converges without another POST. Keep DTO/log privacy allowlisted.

#### C2. Continuous deployment exclusion and timer state - **Closed for review-ready scope**

`scripts/deploy.sh:20-140` now creates a remote holder that acquires the private outer lock and retains it until explicit release. Runtime bundles, migrations, wrapper, permission changes, unit installation, and daemon reload occur while the holder is alive (`scripts/deploy.sh:483-530`). The holder records enabled/active timer state before and after and fails release verification on drift. Non-preparation deploys preserve Recall runtime assets. The real-lock fixture proves automatic work cannot enter during the guarded switch and runs after release (`scripts/test-recall-manual-sync-process.mjs:76-106`).

Residual: this is local/static proof, not authorized host proof. Initial identity/runtime transition and effective systemd behavior remain production-enablement gates. A failed SSH release intentionally fails safe by potentially retaining the lock and needs an operational cleanup runbook.

#### C3. Actual worker/lifecycle path and fallback harness - **Closed for review-ready scope**

`scripts/test-recall-manual-sync-process.mjs:148-264` now enqueues real durable requests and invokes the packaged `recall-manual-sync-worker-prod.mjs`, a controlled wrapper, and packaged lifecycle through both path-like marker activation and injected fallback activation. Both traces observe `queued -> claimed -> running -> error`, prove worker and wrapper invocation, enforce injected timing bounds, and hash timer definition plus enabled/active fixture state. The earlier marker-only false proof has been removed.

Residual: the harness is systemd-equivalent, not a live Linux unit execution. Effective `.path`, `.timer`, tmpfiles, identity, credentials, and production timing still require separately authorized host validation.

### Regression Search

No new critical finding was found in lifecycle validation, terminal replay, immutable expiry, bounded request streaming, partial counts, heartbeat reconciliation, wrapper occurrence handling, or safe DTO/log behavior during this pass.

The earlier 10-second absent-key resolution remains a medium residual because it is shorter than the theoretical maximum contended enqueue duration. One-active SQLite arbitration prevents duplicate apply, but the client may resolve absence before the original request finishes. Derive the bound from server retry limits or provide a definitive server result as part of the C1 request-ID lookup.

### Final Go / No-Go Recommendation

**No-go.** Remediate exact request-ID supersession and add the hidden/offline A-then-B convergence test. After a clean targeted closure, the implementation may proceed to real visual/accessibility evidence and repository/wiki documentation. Production enablement remains unauthorized and separately blocked on host identity, credential, lock, data/SQLite/WAL/backup, effective unit/tmpfiles, timer, controlled-request, and next-daily-run proof.

---

## Binary Final Closure - 2026-07-11 16:41:00 IST

**Reviewed snapshot:** Exact-request supersession remediation plus final regression scan
**Binary verdict:** **Approved to proceed to visual/accessibility and documentation delivery. No P0 or P1 implementation finding remains.** This approval is for review-ready local/static implementation scope only; it is not production enablement approval.

### Exact-Request Supersession - Closed

- GET authenticates before parsing or resolving either correlation header (`src/app/api/settings/recall-sync/route.ts:30-38`). Unauthenticated lookup is `401`, so request existence is not exposed before auth.
- `x-recall-request-id` is bounded to the same safe identifier alphabet and 8-96 length (`src/app/api/settings/recall-sync/route.ts:23`, `33-37`). Invalid input returns a generic non-echoing `400`.
- The service performs exact primary-key lookup and returns only `state`, `requestId`, and reduced `activityState` (`src/lib/recall/manual-sync-service.ts:38-90`). It does not return idempotency keys, raw reports/errors, counts, source data, paths, locks, credentials, commands, or environment details.
- The client sends the confirmed durable request ID independently of the current reduced activity (`src/components/recall-manual-sync.tsx:36-49`, `439-447`) and releases the submission guard only when the exact acknowledgement becomes terminal (`src/components/recall-manual-sync.tsx:84-94`, `422-436`).
- The route test creates A, terminalizes A, advances beyond cooldown, creates newer B, and proves exact-A terminal acknowledgement while B is first active and then terminal (`src/app/api/settings/recall-sync/route.test.ts:158-212`). Auth-first, malicious/absent-ID, non-echo, and DTO allowlist behavior is covered at lines 214-240.
- The client contract test proves confirmed A remains guarded, resolves terminal even when reduced activity belongs to newer B, emits only the request-ID lookup header, and then permits submission (`src/components/recall-manual-sync.test.ts:143-206`).

### Final Regression Evidence

- `npm run typecheck` - passed.
- Focused ESLint - zero errors; the two packaged script sources are intentionally ignored by the repository's lint pattern and emitted warnings only.
- `npm run build:recall-cli` - passed.
- `npm run check:recall-manual-sync-artifacts` - passed.
- Focused repository/route/component/contract/runner tests - 45/45 passed.
- `npm run test:recall-manual-sync-process` - six fixture groups passed.
- `npm run smoke:recall-scheduler-wrapper` - passed.
- `git diff --check` - passed before this append.

### P0/P1 Status

- **P0:** No open finding.
- **P1:** No open finding. Terminal replay, lifecycle validator authority, ambiguous/deduplicated request correlation, immutable expiry, process locking/heartbeat/wake recovery, continuous deploy exclusion, and exact-request supersession are all closed for review-ready scope.

### Residual Risks And Separate Gates

- **Manual visual/accessibility gate:** Real Settings screenshots and browser evidence are still required for 1440/1024/390/320, light/dark, dialog focus trap/return/no-overlay dismissal, keyboard and screen-reader behavior, contrast, 200% zoom, bottom-navigation clearance, 44px targets, reduced motion, and transition-only announcements. This is the next delivery phase, not a hidden P1 implementation finding.
- **P2 ambiguity timing:** The 10-second absent-idempotency resolution remains shorter than the theoretical maximum contended enqueue duration. One-active SQLite arbitration prevents duplicate apply, but the UI could release an unresolved absent key early. Derive this bound from the server retry maximum or replace it with a definitive server result before production enablement.
- **Host enablement gate:** Effective Linux identity/group, systemd `LoadCredential`, web denial of credential/lock, tmpfiles, SQLite/WAL/backups, `.path`/`.timer`, timer state, controlled request, and next daily completion remain unproved and unauthorized. Local/systemd-equivalent fixtures cannot substitute for this separately authorized host proof.
- **Operational guard cleanup:** A failed SSH release intentionally fails safe and can leave the continuous deploy lock held. The operations documentation must provide an authenticated inspection and cleanup procedure before the preparation path is authorized.
- **Documentation/wiki gate:** Repository architecture/API/data/operations/rollback/limitations docs and separately published wiki verification remain required.

### Binary Go Recommendation

**Go for visual/accessibility QA and repository/wiki documentation delivery.** Do not merge, deploy, enable the UI/path/fallback timer, alter the production timer, or claim production readiness from this closure. Final review-ready delivery still requires the manual visual/accessibility evidence, full project QA ledger, docs/wiki verification, and preservation of the explicit host-enablement boundary.

---

## Targeted Residual Closure - 2026-07-11 16:52:21 IST

**Verdict:** **Closed. No unresolved P0, P1, or P2 implementation-review finding remains before documentation delivery.**

- `DB_BUSY_TIMEOUT_MS` is a shared exported 5,000ms value used to configure SQLite (`src/db/client.ts:30-39`).
- `RECALL_BUSY_RETRY_DELAYS_MS` is the same `[0, 50, 150]` sequence consumed by `retryBusy` (`src/db/recall-manual-sync.ts:11`, `121-132`).
- `RECALL_IDEMPOTENCY_ABSENCE_RESOLUTION_MS` is derived from those shared values: three possible 5,000ms waits plus 200ms retry delays plus 4,800ms scheduling/network margin, exactly 20,000ms (`src/db/recall-manual-sync.ts:12-17`).
- The status service imports that constant and returns it in every active, terminal, or absent idempotency acknowledgement (`src/lib/recall/manual-sync-service.ts:3-18`, `93-105`); the client compares elapsed monotonic time to the server-provided value and does not embed its own production threshold (`src/components/recall-manual-sync.tsx:391-397`).
- Repository tests lock the component values, 15,200ms maximum busy model, exact 20,000ms result, and 4,800ms minimum margin (`src/db/recall-manual-sync.test.ts:45-54`). The route test locks the public DTO to 20,000ms (`src/app/api/settings/recall-sync/route.test.ts:143-155`).
- Targeted typecheck and 26 repository/route/component tests passed; `git diff --check` passed before this append.
- `visual-accessibility-qa-report.md` records passed local browser evidence for required implementation viewports/themes, no overflow/200% zoom, keyboard focus trap/return/no-overlay dismissal, 44px targets, accessibility tree/live announcements, reduced motion, and Recall-section contrast/axe results. It explicitly excludes production host enablement and does not overclaim a physical assistive-technology lab.

The earlier 10-second timing concern is superseded and closed. Remaining work is documentation/wiki delivery and separately gated production-host proof; neither is an unresolved implementation-review severity finding.
