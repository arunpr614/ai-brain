# Recall manual sync QA and release-risk report

Review date: 2026-07-11
Reviewer: independent QA/reviewer agent
Decision at review point: **No-go for review-ready handoff until High findings are fixed and regression-tested**

## Severity-ranked findings

### High — RMS-QA-001: automatic crash restart can duplicate a running occurrence

Affected criteria: AC 11 and AC 13.

`startRecallSyncExecution()` returns any existing execution for the occurrence key, including a non-terminal `running` row (`src/db/recall-manual-sync.ts:243-246`). Lifecycle `start` prints `running:<id>` for that row (`scripts/recall-sync-lifecycle.ts:48-58`). The wrapper treats only `terminal:*` as a stop condition and otherwise proceeds through dry run, backup, and apply (`scripts/recall-scheduled-apply.sh:160-165`). The automatic unit restarts failed wrappers after 60 seconds (`scripts/deploy/brain-recall-sync.service:18-19`), earlier than the 90-second stale threshold.

Deterministic repository reproduction:

1. Create an automatic execution with occurrence key `automatic:repro` at time 1000.
2. Call `startRecallSyncExecution()` again with the same occurrence key at time 2000 without terminalizing the first.
3. Observed result: both calls returned the same ID and `state: "running"`; the second start was not rejected or distinguished.
4. Under the wrapper, that response takes the normal execution path and creates fresh dry/apply run IDs.

Impact: a wrapper crash after lifecycle start can release the outer lock and be restarted against the same running occurrence. The retry can execute the guarded core path again instead of reconciling the first execution, violating killed-work no-duplicate-run and exactly-once automatic occurrence guarantees. Item idempotency/checkpoint overlap reduces some duplicate writes but does not make duplicate wrapper/core execution acceptable or prove partial-write truth across the crash window.

Required remediation:

- Make lifecycle start return a distinct `created`, `existing_terminal`, and `existing_running` result.
- Never let `existing_running` enter the normal wrapper body. Reconcile only after stale heartbeat plus free-lock/process/run evidence, or use an explicit trusted resume protocol that cannot create a new core run.
- Ensure automatic service retry cannot run before the prior occurrence is terminal/reconciled.
- Add process tests for crash before dry-run link, during dry run, after backup, during apply after one committed card, after apply completion before final validation, and after validation before lifecycle complete. Assert one occurrence, no overlapping stages, no duplicate apply, truthful terminal counts, and preserved daily execution.

### High — RMS-QA-002: stale claimed requests receive a new 30-minute deadline

Affected criteria: AC 10.

`requeueStaleClaimedRecallRequest()` rewrites `expires_at` to `now + RECALL_REQUEST_EXPIRY_MS` (`src/db/recall-manual-sync.ts:184-193`). A request claimed just before its original 30-minute deadline can lose its worker before lifecycle start, become stale after 90 seconds, and then be requeued with an additional 30 minutes. The next worker may run it more than 30 minutes after the owner requested it.

Deterministic repository reproduction:

1. Enqueue at time `T`; original `expires_at` is `T + 30m`.
2. Claim near `T + 30m`, set the claim heartbeat older than the 90-second stale threshold, and confirm the outer lock is free.
3. Call `requeueStaleClaimedRecallRequest(now, true)` after the original deadline.
4. Current behavior changes state to queued and sets expiry to `now + 30m` rather than expiring it.

Impact: a pre-execution owner request can run substantially after the promised immutable 30-minute window, contradicting “can never run later” and making the expired/no-run copy untrustworthy.

Required remediation:

- Preserve original `expires_at` on requeue.
- In the same immediate transaction, terminalize as `expired` when original expiry is at or before recovery time; otherwise return it to queued without changing the deadline.
- Add boundary tests at expiry minus 1ms, exact expiry, and expiry plus 1ms, plus a worker process test proving an expired stale claim cannot spawn the wrapper.

### Medium — RMS-QA-003: cooldown display becomes device-clock authoritative

The client initializes `tick` from server `observedAt`, but its one-second timer replaces it with `Date.now()` (`src/components/recall-manual-sync.tsx:91-100`). A skewed device clock can make **Try again** appear early or late. The server still enforces cooldown, so this is not a write-safety bypass, but it violates truthful server-authoritative countdown behavior.

Required remediation: advance elapsed time from a monotonic client baseline anchored to server `observedAt`, and refresh at zero before enabling. Add device clock ±24h and sleep/resume tests.

### Medium — RMS-QA-004: required process-race evidence is absent

The current tests directly exercise repository helpers but do not launch competing SQLite connections, workers, wrappers, or lock holders. There is no deterministic evidence for <=10s path claim, <=75s fallback recovery, manual-lock requeue, automatic wait/retry, crash reconciliation, at-most-one apply, or timer-invariance traces.

Required remediation: add fixture-only process tests with injected short intervals/timeouts. Never use real Recall credentials/data or mutate live timers.

### Medium — RMS-QA-005: implementation state and controller coverage is incomplete

The component suite covers ready, queued-behind-automatic, partial cooldown, unknown write, and visibility refresh. It does not exercise POST/requesting, lost response/same-key recovery, double click, offline/session overlays, abort/order suppression, polling cadence, terminal stop, or dialog focus. Loading is not implemented, and automatic long-running does not get the long-running copy.

Required remediation: add controller/component tests for every v2 state and complete browser/accessibility evidence before asserting AC 5, 6, 12, 16, 17, or 18.

### Low — RMS-QA-006: targeted lint does not cover trusted TypeScript scripts

The targeted ESLint command passed application files but reported `scripts/recall-manual-sync-worker.ts` and `scripts/recall-sync-lifecycle.ts` as ignored by configured patterns. Typecheck covers them only if included by `tsconfig`; an explicit script lint/static check would make the trusted boundary clearer.

## Positive evidence

- Authentication precedes feature evaluation; exact-origin and bounded strict POST behavior are implemented and route-tested.
- New and active-deduplicated requests return durable `202`; marker failure does not erase acceptance.
- Migration constraints, single-active repository behavior, cooldown, schedule freshness, lifecycle success/partial preservation, and heartbeat helper behavior have focused tests.
- Late-card fault injection proves exact prior committed writes, persisted progress, no checkpoint advance, and error reporting.
- IST formatting is independent of process timezone and aggregate copy omits zero clauses with deterministic pluralization.
- Three Recall bundles build; the static artifact check confirms default-off UI, distinct unit identity, credential delivery, private lock directory, trigger-aware waits, stable occurrence keys, 60-second fallback, and marker replacement.
- Existing scheduled-wrapper smoke passes the complete fixture-backed dry-run/backup/apply/final-validation path without real Recall access.

## Release and rollback assessment

Review-ready release risk remains **High** until RMS-QA-001 and RMS-QA-002 are resolved. The feature is statically default off, which limits exposure, but default-off configuration does not excuse correctness defects in code intended for later enablement.

The rollback shape is directionally safe: hide/disable the UI, disable only the new manual path and fallback timer, reject new manual requests, preserve migration/history, and leave the daily timer definition in place. Active trusted work should be allowed to finish unless an explicit runbook says otherwise. Do not destructively remove migration 024 or delete durable rows. No live rollback or timer manipulation was performed.

Required rollback evidence before review-ready:

1. Fixture showing flag-off GET is safe and POST unavailable while existing rows remain readable internally.
2. Static/process proof that disabling manual path/timer does not disable or reschedule `brain-recall-sync.timer`.
3. Active-run fixture showing UI/path disablement does not invent a terminal state or kill trusted work.
4. Re-enable fixture showing queued rows retain original expiry and do not resurrect expired work.

## Timer invariant statement

Only static/fixture evidence was reviewed. The manual code does not call `systemctl enable`, `disable`, `start`, `stop`, or timer-edit operations. The deploy preparation installs unit definitions and checks the new manual path/timer remain disabled; the default deploy stages them. The shared wrapper reads the daily timer's last trigger for a stable occurrence key and the automatic unit's post-step snapshots next elapse. **No live timer state was read or mutated.** Exactly-once automatic retry is not yet proven because of RMS-QA-001.

## Production-enablement boundary

The following were intentionally not attempted and remain separately authorized production gates:

- creating/changing the real `brain-recall` user or `brain-data` permissions;
- reading, moving, or validating the real Recall credential;
- proving web-user denial and Recall-user access against actual host paths;
- changing systemd unit state or daily timer state;
- running against real Recall data;
- proving production SQLite/WAL/backup permissions;
- enabling the UI, path, or fallback timer;
- performing a controlled production request or observing the next daily completion.

This boundary is not a review-ready defect. Static/default-off assets must still pass, and host enablement must remain blocked until explicit authorization and the full host proof checklist are satisfied.

## Required final QA gate after remediation

1. Re-run focused repository/route/component/runner tests including new regressions for RMS-QA-001 and RMS-QA-002.
2. Run deterministic multi-process worker/wrapper/lock/crash/timer-invariance fixtures.
3. Run full typecheck, full lint, full unit suite, all Recall wrapper/privacy/docs checks, and production build/artifact validation.
4. Complete implementation browser and accessibility matrix with screenshots and measured results.
5. Reinspect the full diff and update AC 1-21 with final Pass/Partial/Fail evidence. Review-ready requires no unresolved Critical or High finding.

## Remediation closure re-review — 2026-07-11

This closure preserves the original findings above.

### Closed findings

- **RMS-QA-001 — Closed.** Existing running occurrences no longer enter core work. The wrapper only proceeds for `created:*`; `existing_running:*` is heartbeat/lock reconciled and exits without a new run. Repository and killed-process crash-stage tests pass.
- **RMS-QA-002 — Closed.** Stale claims never receive a renewed deadline. Before expiry they requeue with the original timestamp; at/after expiry they terminalize as expired. Exact-boundary and worker no-spawn tests pass.
- **RMS-QA-003 — Closed.** Cooldown uses a server epoch plus `performance.now()` elapsed time and refreshes server state before enabling at zero. Clock-skew tests pass.
- Original adversarial P1 terminal replay, premature completion, ambiguous recovery, missing process races, and streamed-body-limit defects have direct regression coverage. Automatic long-running/offline semantics and process fixtures were also added.

### Remaining High — RMS-QA-007: preparation lock exclusion is released before mutation

The new preparation guard checks both services and executes `flock -n /run/brain-recall/recall-sync.lock true` before the first artifact rsync. That subprocess releases the lock immediately when the probe exits. The script then performs application/runtime rsyncs, replaces the trusted wrapper, recursively changes data ownership/modes, installs units, and reloads systemd without holding the lock. Because the daily timer remains enabled, automatic work can start after the probe and before or during those mutations.

Impact: the explicitly authorized preparation path can still mix trusted runtime versions or change permissions while an automatic wrapper is active. The post-operation enabled/active comparison detects timer-state drift but cannot prevent or undo mixed execution.

Required closure:

1. Hold the private outer lock continuously across every Recall bundle, wrapper, migration, permission, tmpfiles, and unit mutation, while preserving the timer's enabled/active state; or stage versioned assets and perform one atomic switch under equivalent continuous exclusion.
2. Recheck both Recall services after acquiring the held lock and fail closed if either is active/transitioning.
3. Add a deploy fixture that starts a competing automatic lock holder after the initial preflight point and proves mutation cannot begin until it exits; assert timer enabled/active state and asset hashes on both success and refusal.

This is a static correctness defect in the authorized preparation workflow, not missing real-host proof. Production remains default off, and no external state was changed during review.

### Remaining medium/manual evidence

- The wake fixture proves local filesystem notification/poll bounds, not actual systemd `.path` marker-to-claim <=10 seconds or `.timer` recovery-to-claim <=75 seconds.
- Loading and parts of the full state matrix still lack implementation-level tests.
- Dialog focus, screen-reader announcements, measured contrast, 200% zoom, responsive 1440/1024/390/320 light/dark screenshots, bottom navigation, and reduced-motion evidence remain unperformed.
- Broader structured-event/malicious-report privacy tests and explicit SQLite busy-route proof remain useful residual gates.

### Re-review command results

- Full lint and typecheck: pass.
- Focused Recall suite: 42/42 pass.
- Process suite: six fixture groups pass.
- Three-bundle build, static artifact check, and scheduled-wrapper smoke: pass.
- Full suite: 838 tests across 92 suites pass.
- Production build: pass with only the pre-existing `unpdf` `import.meta` warning.

### Final go/no-go

**No-go remains for review-ready handoff** while RMS-QA-007 is High and implementation browser/accessibility evidence remains incomplete. The core application/manual-sync runtime remediation is materially stronger and RMS-QA-001/002/003 are verified closed, but the branch does not yet meet the no-High and AC 18 gates. Production enablement remains separately unauthorized and unproven.

## Final closure after second remediation — 2026-07-11

This section preserves the earlier no-go reports as historical evidence.

### High-risk closure

- **RMS-QA-007 — Closed.** A durable remote holder now owns the private Recall lock continuously from before the first deployment rsync through bundles, migrations, wrapper, permission changes, units, tmpfiles, and daemon reload. It rechecks service state and compares timer enabled/active state before releasing. The process trace shows a competing automatic process blocked until `guard:release`, then completing; the timer file hash is unchanged.
- **Accepted-202 different-key dedupe — Closed.** The client treats the returned request ID as authoritative after validating the response. A failed or missing GET cannot clear that confirmed acceptance or permit another submission. Active correlation retains the guard; terminal correlation releases it. Route and pure-controller regressions pass.
- **Fake-systemd activation evidence — Closed for local review-ready scope.** Both path and fallback fixtures invoke the built worker and lifecycle bundles and observe `queued`, `claimed`, `running`, and terminal error states while preserving modeled timer state and the checked-in timer definition.
- RMS-QA-001/002/003 and all previously closed adversarial P1 issues remain closed.

No new Critical or High finding was identified in the final full-diff inspection or rerun.

### Remaining non-High evidence

The remaining gaps are manual/visual/accessibility or separately authorized host proof:

- implementation screenshots at 1440/1024/390/320 in light/dark and the full state matrix;
- real keyboard dialog focus/Escape/close/Cancel/focus return/no-overlay behavior;
- screen-reader announcement sequence, 200% zoom, bottom-nav clearance, measured AA, 44px, and reduced motion;
- navigation/restart/multi-tab/offline/session browser flows;
- final broad privacy/event ledger;
- real Linux identity/credential/lock/data/SQLite/WAL/backup/unit/timer proof, which remains production-enablement-only.

### Final command results

- Typecheck and full lint: pass.
- Focused Recall tests: 43/43 pass.
- Recall bundle build, process fixtures, and artifact guard: pass.
- Full repository tests: 839 pass across 92 suites.
- Production build: pass; existing `unpdf` warning only.

### Final recommendation

**Automated/code review: go.** There is no unresolved Critical/High finding in the implementation or default-off preparation path. **Final PRD v2 review-ready declaration: pending manual evidence.** The coordinator must complete and attach AC 18's browser/accessibility matrix plus the remaining visual/privacy delivery evidence before marking the whole feature review-ready. No production enablement, deployment, timer mutation, credential access, or real Recall data access was performed.

### Post-closure correction — High RMS-QA-008

The preceding automated/code “go” is withdrawn after an additional adversarial recovery sequence.

The confirmed request-ID guard can be stranded when a newer request supersedes the reduced status. The client retains accepted request A's ID but does not send it on GET. The API supplies only the current reduced activity. If A terminalizes during a GET failure and another tab later creates B, the recovering tab sees B. Its correlation for A remains `missing`, so A's guard blocks new submission and continues polling without a terminal resolution. Only a page reload incidentally discards the local guard.

Severity: **High**. This does not duplicate apply work, but it violates reconnect/multi-tab restoration and can leave the one manual action indefinitely unavailable with misleading status-unknown copy.

Required fix and test:

- support a bounded safe request-ID acknowledgement lookup (or equivalent) on authenticated GET;
- independently resolve A even when reduced activity is B;
- test A accepted, GET unavailable, A terminal, B becomes newer active/terminal, A lookup returns terminal, guard releases, and no second POST occurs before that proof.

Corrected final recommendation: **no-go for review-ready handoff** until RMS-QA-008 is fixed and independently rerun. All previously reported automated gates remain green, and manual/browser/accessibility evidence is still required afterward.

## Binary RMS-QA-008 closure — 2026-07-11

**RMS-QA-008 is verified closed. The automated/code recommendation is GO.**

The final implementation adds a distinct exact request-ID acknowledgement on authenticated GET. It is bounded, auth-first, private, non-echoing when absent, and reduced to safe state fields. The client sends the validated request ID returned by `202`, retains it across GET failure, and cannot submit again until that exact request is proven terminal.

The decisive regression constructs A, terminalizes it, advances beyond cooldown, creates newer B, and proves simultaneously that:

- reduced activity is B active and later B terminal;
- exact acknowledgement remains A terminal in both cases;
- A's local confirmed guard releases only on exact terminal proof;
- B active still disables the action;
- no duplicate POST or retained submitted key is needed;
- malicious/missing request-ID lookups do not expose input or private internals.

Independent rerun: route/component **15/15 pass**, typecheck pass, and targeted lint pass. The previously recorded full suite, production build, process fixtures, bundle build, and artifact checks remain green.

No Critical or High issue remains after the binary regression scan. Remaining items are manual evidence, not code no-go findings: real implementation responsive/theme screenshots, dialog keyboard/focus/no-overlay behavior, screen-reader/live-region sequence, zoom/bottom-nav/contrast/touch-target/reduced-motion verification, and browser navigation/reconnect/multi-tab/session flows. Separately authorized real-host credential/identity/filesystem/unit/timer proof is still a production-enablement gate.

Final recommendation: **GO for automated/code review; final PRD-v2 review-ready declaration remains pending the manual visual/accessibility evidence package.**

## Final manual and visual closure — 2026-07-11

The independent reviewer read `visual-accessibility-qa-report.md` and inspected the implementation captures for desktop, tablet, 390px, 320px, light, dark, ready, dialog, queued, long automatic/reduced-motion, partial/cooldown, offline accepted, and session expired states.

### Closed manual gates

- **Placement and responsive layout:** implemented Recall placement is correct; 1440/1024/390/320 captures and DOM measurements show no horizontal overflow. At 200% scale, document/layout widths remain bounded and bottom navigation clearance is retained through normal page scroll.
- **Dialog and keyboard:** real Chrome input proves initial focus, trapped cycling, overlay non-dismissal, Escape, and exact opener focus return. Close and actions meet 44px minimums.
- **Accessibility semantics:** the browser AX tree exposes a named dialog and controls; the stable role=status node is polite/atomic; a real request announces Requesting then Queued only; cooldown seconds are silent.
- **Contrast and non-color meaning:** Recall minimums are 4.97:1 light and 6.31:1 dark; badge/icon/title/detail/action provide redundant meaning. Recall and dialog axe runs have zero violations.
- **Reduced motion and touch sizing:** no active animation remains under reduced-motion emulation; primary mobile actions measure 324×44px at 390 and 254×44px at 320.
- **Truthful state evidence:** ready/never, queued, long automatic, partial bounded counts/cooldown, offline accepted/last-known, and session expiration match the approved copy and retain freshness metadata.

The whole light Settings page's two 4.48:1 warning-badge findings are pre-existing and outside the Recall section; they are documented but do not reopen this feature. Physical VoiceOver/TalkBack audio and physical touch hardware were unavailable. Browser AX, live mutation, keyboard, target measurement, zoom, contrast, axe, and reduced-motion evidence close the review-ready accessibility gate without claiming a physical AT lab run.

### Final risk verdict

No Critical, High, or required browser evidence gap remains. Combined with the green type/lint/focused/full/process/wrapper/privacy/build ledger and closed RMS-QA-001/002/003/007/008 findings, the feature is **GO for review-ready PR handoff**.

This remains a delivery verdict only. Real Linux identity/credential/lock/data/SQLite/WAL/backup/unit/tmpfiles/timer proof, controlled live request, and following daily completion are separately authorized production-enablement gates. No production action was performed or authorized by this review.
