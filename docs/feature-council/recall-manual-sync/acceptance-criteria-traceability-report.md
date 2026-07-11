# Recall manual sync acceptance-criteria traceability report

Review date: 2026-07-11
Reviewer: independent QA/reviewer agent
Reviewed baseline: working tree on `feat/recall-manual-sync` against `origin/main`
Source of truth: `prd-v2.md`, `ux-ui-v2.md`, `technical-plan-v2.md`, and `qa-acceptance-matrix.md`

## Disposition summary

This implementation is **not review-ready at this review point**. Two reproducible High findings block AC 10, 11, and 13. The focused automated suites pass, but the required process-race, browser/accessibility, full-suite, and production-build evidence is not yet complete. Real Linux host identity, credential, filesystem, SQLite/WAL, unit, and timer proof is deliberately **not run**; it remains a separately authorized production-enablement gate, not a review-ready failure.

Status totals: **3 Pass, 15 Partial, 3 Fail, 0 Not run**. A Partial status means meaningful implementation or automated evidence exists but the complete criterion has not been demonstrated. Browser/manual evidence is explicitly listed rather than inferred from static code.

## Criterion traceability

| AC | Implementation evidence | Automated evidence | Manual evidence | Status | Residual risk / required closure |
| --- | --- | --- | --- | --- | --- |
| 1 | `src/app/settings/page.tsx` authenticates server-side and places Recall after AI services; `src/app/api/settings/recall-sync/route.ts:27-35` authenticates before flag/availability and applies exact-origin POST validation. | `route.test.ts`: unauthenticated GET/POST `401`, flag-off GET, unavailable POST, missing/foreign Origin, strict body all pass. | Supplied/revised prototypes are discovery evidence only; no implementation screenshot was available. | **Partial** | Capture authenticated implementation screenshot proving placement and visually confirm disabled/flag-off absence. |
| 2 | `completeRecallSyncExecution()` accepts only a linked terminal apply run, records `wrapper_validated_at`, and `latestValidatedRecallSuccess()` reads only validated rows; failure path does not modify it. | `recall-manual-sync.test.ts` proves successful zero-or-positive terminal authority and preservation through later partial failure; scheduler wrapper smoke proves completion follows final report validator. | None. | **Partial** | Add wrapper fault tests for every crash window, including zero-new-item success and final-validator failure, with DB assertions in one process fixture. |
| 3 | Status maps missing latest success to null/`Not yet synced`; `getTrustedRecallSchedule()` rejects wrong timer, stale, invalid, and past snapshots; UI displays `Schedule unavailable`. | Repository, contract, and component tests pass for never-synced and schedule unavailable; schedule test covers future, past, stale, and wrong timer. | None. | **Pass** | Low residual risk; add malformed snapshot case if broadening coverage. |
| 4 | API DTO serializes instants as ISO UTC; `formatRecallIst()` explicitly uses `Asia/Kolkata` for date and time parts. | Contract tests pass. Independent process check under `TZ=UTC`, `America/Los_Angeles`, and `Asia/Kolkata` produced identical `Today, 1:38 AM IST` and `Yesterday, 11:42 PM IST`. | Browser rendering across device zones not run. | **Pass** | Browser check remains useful, but formatter and wire behavior are deterministic. |
| 5 | Radix Dialog is used; pointer/interact outside are prevented; Escape/Close/Cancel are delegated to Radix; controls are 44px and focus should return through the dialog primitive. | Static component rendering only; no focus interaction test. | Keyboard focus trap, Escape, close, Cancel, overlay, exact opener focus return, and “no request created” evidence not run. | **Partial** | Required interaction test plus real-browser keyboard/screen-reader verification. |
| 6 | Component enters `requesting`, retains one key in `keyRef`, blocks action, treats lost response as unknown, and GETs before permitting another POST. | No slow-POST/lost-response/same-key test; existing component tests do not exercise POST. | None. | **Partial** | Add controller tests for double click, slow response, lost response, same-key recovery, 400/403/429/503, and automatic-start race. |
| 7 | Enqueue commits an immediate SQLite transaction before marker creation and route response; new and active-deduped requests return `202`. | Route test proves new and active-deduped `202`, same request ID, empty marker, and marker failure still returning durable `202`; repository idempotency test passes. | None. | **Partial** | Add forced insert/busy failure proving no acceptance, and a terminal-key replay contract test. |
| 8 | Empty atomic marker, `.path` activation, and 60-second fallback timer are present; worker claims oldest request. | Artifact check proves marker rename, watched path, and 60-second fallback statically. | No process timing proof. | **Partial** | Run deterministic path process test proving marker-to-claim <=10s and lost-marker recovery <=75s. Static unit text alone is insufficient. |
| 9 | Immediate enqueue/claim transactions plus a partial unique active index guard one active request; outer/core locks guard apply. | Single-process idempotency/claim test passes. | None. | **Partial** | Add two independent SQLite connections, multi-process POST/worker races, and trace assertion of at most one apply. |
| 10 | Cooldown is persisted from terminal completion and expiry is persisted for queued rows. | Cooldown/expiry repository tests partly pass; component shows terminal outcome plus countdown. | None. | **Fail** | **High RMS-QA-002:** `requeueStaleClaimedRecallRequest()` replaces the immutable deadline with `now + 30m`, allowing a dead pre-execution claim to run beyond 30 minutes. Preserve the original expiry and expire atomically when past. Also add server-clock countdown tests. |
| 11 | Manual and automatic entry points share `recall-scheduled-apply.sh`, private outer `flock`, and the existing DB lock; automatic waits 10,800s and has stable occurrence keys/restart. | Wrapper smoke and artifact checks pass; core lock regression test passes. | No overlap trace or timer-invariance process proof. | **Fail** | **High RMS-QA-001:** automatic restart reuses an existing `running` occurrence and proceeds through the wrapper again. Add crash/restart/lock-contention traces proving no interleave, no skip, and exactly-once occurrence execution. |
| 12 | GET reconstructs persisted status; component refreshes on visibility/online, uses offline/session overlays, and aborts prior requests. | One component test proves an idle hidden page learns automatic activity on visibility return. | Refresh/navigation/restart/reconnect/multi-tab and offline/session browser flows not run. | **Partial** | Add controller/integration coverage; verify overlays retain truthful durable context and create no new POST. |
| 13 | Wrapper starts a 15-second heartbeat; worker requires stale heartbeat plus free outer lock before lifecycle failure. | Repository heartbeat/stale test is limited to direct calls; no PID/process kill test. | None. | **Fail** | **High RMS-QA-001** allows automatic restart to reuse a running execution and launch new core run IDs. Add healthy-long, SIGKILL at each stage, stale reconciliation, and duplicate-run-negative process tests. |
| 14 | Import progress is written inside the same outer card transaction; later failure finalizes prior counts and does not advance checkpoint; lifecycle derives request/execution counts from linked apply run. | `sync-runner.test.ts` late-card fault test passes with exact persisted writes/counts and unchanged checkpoint; lifecycle test proves last-success preservation. | None. | **Pass** | Add an end-to-end wrapper/lifecycle fault fixture to validate the integration boundary, but the core truth invariant is directly tested. |
| 15 | Contract formatter bounds/omits/pluralizes counts; view distinguishes current, partial, zero-proven, and unknown-count failures. | Formatter tests pass; component tests cover partial and unknown-write copy. | No full state-board implementation capture. | **Partial** | Add zero-proven blocked/error and maximum-count UI tests and screenshots. |
| 16 | DTO/view model supports durable activity states and overlay states; persistent last-success/next-schedule metadata is rendered. | Component tests cover ready, queued-behind-automatic, partial cooldown, unknown write, and automatic-running. | No implementation state matrix. | **Partial** | Loading is not implemented; automatic long-running is not distinguished; remaining blocked/error/expired/unavailable/offline/session/requesting/running variants need tests and screenshots. |
| 17 | Visible active state polls every 2s; hidden tabs pause; online/visibility refresh; abort controller and sequence suppress stale results; terminal/401 stop polling; live region title is transition-based. | Visibility return is tested. | Live-region, cadence, out-of-order, navigation abort, online, hidden pause, terminal, and 401 behavior not manually observed. | **Partial** | Add fake-timer/controller tests and screen-reader transition evidence. Countdown currently switches from server observed time to `Date.now()` and needs skew tests. |
| 18 | Responsive padding, wrapping, 44px controls, Radix dialog, reduced-motion spinner class, semantic tokens, and bottom-page placement are present. | Static markup assertions cover `min-h-11` and live region only. | Required 1440/1024/390/320 light/dark, keyboard, screen reader, 200% zoom, bottom nav, contrast, reduced motion, and implementation screenshots were not available. | **Partial** | Complete the full browser/accessibility matrix; revised prototype screenshots do not prove implementation behavior. |
| 19 | Status/accepted DTOs are explicit allowlists; safe reasons/counts are bounded; lifecycle and worker suppress raw errors; no third-party analytics added. | Route test asserts exact keys and absence of report/error/credential/lock/path strings; artifact check rejects raw lifecycle error logging. | None. | **Partial** | Add structured-event field allowlist tests, scan all new output/log paths, and test malicious/private report content. |
| 20 | `.env.example` defaults flags off; new path/timer have install targets but deployment only stages assets unless explicit preparation mode; web unit lacks credential/private lock access; rows/migration are preserved. | Artifact check passes for distinct static identities, credentials, private lock, timer fallback, and default-off UI. | No host changes or live timer mutation performed. | **Partial** | Add rollback fixture proving UI/path/fallback disablement leaves daily unit definition/history/active work untouched. Host proof remains enablement-only. |
| 21 | New tests and static artifact checks exist; existing runner and wrapper smoke pass. | Independent ledger: typecheck pass; targeted ESLint pass with two ignored-script warnings; 33 focused tests pass; three Recall bundles build; artifact check pass; scheduled wrapper smoke pass. | Full `npm test`, full lint, production `npm run build`, process-race, browser/a11y, privacy/docs, and wiki gates not run in this QA snapshot. | **Partial** | Re-run every gate after remediation; no release judgment until full command ledger is green. |

## Independent command ledger

| Command / check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| Targeted ESLint over route/component/repository/contract/service | Pass; worker and lifecycle script files were ignored by configured lint patterns, producing two warnings |
| Focused Node test run (`route`, component, contract, repository, runner) | Pass: 33/33 |
| `npm run build:recall-cli` | Pass; three bundles and migrations emitted |
| `npm run check:recall-manual-sync-artifacts` | Pass |
| `npm run smoke:recall-scheduler-wrapper` | Pass |
| Three-process `TZ` formatter check | Pass; identical IST output in UTC, Los Angeles, and Kolkata |
| Same-occurrence lifecycle reproduction | Fail as expected: second `startRecallSyncExecution` call returned the same `running` execution, demonstrating RMS-QA-001 |
| Full test/lint/production build/browser/accessibility/process race | Not run in this snapshot; required after fixes |

## Mandatory manual/browser evidence still required

1. Implementation screenshots at 1440, 1024, 390, and 320 in light/dark, including every durable and overlay state, large counts, terminal-plus-cooldown, stale/past schedule, and bottom navigation.
2. Keyboard focus trap, Escape, close, Cancel, overlay non-dismissal, exact focus return, 200% zoom, and 44px measurement.
3. Screen-reader live-region sequence, busy semantics, transition-only announcements, and cooldown silence.
4. Measured AA contrast and reduced-motion spinner behavior.
5. Slow/lost POST, offline before/after acceptance, reconnect, multi-tab, refresh/navigation, hidden polling, session expiry, and out-of-order response recovery.

## Production-enablement boundary

No production deployment, timer mutation, Recall credential read, or real Recall data access was performed. Static assets show the intended default-off boundary, distinct `brain-recall` identity, `LoadCredential`, private `/run/brain-recall` lock directory, and shared data group. Actual Linux proof that the Recall identity can read the delivered credential and required code/data while the web identity cannot read the credential or open the lock; SQLite/WAL/backup permissions; unit readiness; timer preservation; and one controlled request plus next daily completion remain a separate, explicitly authorized production-enablement gate.

## Remediation closure re-review — 2026-07-11

This section preserves the original no-go disposition above and records the independent re-review of the remediated working tree.

### Closure verdict

- **RMS-QA-001 closed:** lifecycle start now distinguishes `created`, `existing_running`, and `existing_terminal`; the wrapper never re-enters core work for an existing running occurrence. Stale reconciliation is heartbeat- and outer-lock-gated. Repository regression and six-stage killed-process fixtures prove one execution and at most one apply run.
- **RMS-QA-002 closed:** stale claimed recovery preserves the original deadline, requeues only before it, and atomically expires at/after it. Boundary tests and a bundled-worker process fixture prove expired stale work cannot spawn the wrapper.
- **RMS-QA-003 closed:** cooldown time now advances from server `observedAt` using monotonic elapsed time, refreshes at zero before re-enabling, and is tested with device clock skew in both directions.
- The accepted adversarial findings for terminal-key replay, premature validated success, ambiguous-response guarding, streamed body bounds, automatic long-running/offline behavior, multi-process SQLite races, crash-stage reconciliation, and static active-work preparation checks have implementation and regression evidence.
- **One High finding remains:** the production-preparation active-work guard releases the private outer lock before rsync, wrapper replacement, permission mutation, unit installation, and daemon reload. The enabled daily timer can start work in that gap. AC 20 therefore remains Fail and the overall branch remains no-go until the lock is held continuously across Recall runtime mutation or an equivalent atomic switch is implemented.

### Updated AC 1–21 disposition

| AC | Remediation evidence | Re-review status | Remaining closure |
| --- | --- | --- | --- |
| 1 | Auth/origin route tests remain green; placement unchanged. | **Partial** | Real implementation placement/flag-off screenshot. |
| 2 | Completion now requires persisted `apply_validated` plus matching linked run; every earlier stage is rejected; linked-request failure rolls back. | **Pass** | None for review-ready automated scope. |
| 3 | Never/stale/past schedule tests remain green. | **Pass** | None. |
| 4 | UTC/IST formatter tests and prior three-timezone check remain green. | **Pass** | Browser zone spot-check remains manual evidence. |
| 5 | Radix/no-overlay/44px implementation unchanged. | **Partial** | Keyboard focus trap/Escape/close/Cancel/focus return and no-request browser proof. |
| 6 | Submission ref guard, retained-key acknowledgement protocol, 10-second absence resolution, and terminal/active correlation tests pass. | **Partial** | Full user-event slow/lost POST test is still absent. |
| 7 | Active-only `202`; all terminal replays remain terminal (`429`/`409`) and never touch the marker; streamed 256-byte bound tested. | **Partial** | Forced SQLite busy/persistence-failure route proof remains absent. |
| 8 | Marker/static path and 60-second timer checks pass; injected filesystem wake group passes. | **Partial** | The process group's `fs.watch`/20ms poll simulation does not prove actual systemd path claim <=10s or fallback claim <=75s. |
| 9 | Two independent enqueue processes converge on one row and two claim processes produce one claim; real `flock` trace serializes manual then automatic work. | **Pass** | Explicit bounded `SQLITE_BUSY` process case would strengthen coverage. |
| 10 | Immutable expiry boundary, terminal replay/cooldown, monotonic server countdown, and expired-worker no-spawn tests pass. | **Pass** | Visual countdown capture remains manual evidence. |
| 11 | Real outer-lock trace proves contended manual failure and waiting automatic completion in order; same occurrence cannot restart core work. | **Pass** | Actual systemd coalescing remains host enablement evidence. |
| 12 | Correlated GET recovery, offline polling pause, visibility/online refresh, abort, and out-of-order suppression are implemented/tested. | **Partial** | Navigation/restart/multi-tab and browser offline/session flows. |
| 13 | Real killed heartbeat holder plus six crash-stage fixtures reconcile once without duplicate apply; healthy pre-threshold reconciliation is rejected. | **Pass** | None for local deterministic scope. |
| 14 | Late-card runner test plus apply-running/apply-done/apply-validated kill matrix proves exact persisted counts and no false success. | **Pass** | None. |
| 15 | Formatter/partial/unknown tests remain green. | **Partial** | Zero-proven and maximum-count implementation screenshots/tests. |
| 16 | Automatic long-running and offline-after-acceptance semantics were added; durable states remain modeled. | **Partial** | Explicit loading state and full implementation state-board capture remain absent. |
| 17 | Monotonic countdown, ambiguity polling, offline pause, visibility refresh, abort, and out-of-order tests pass. | **Partial** | Fake-timer two-second cadence/terminal-stop and screen-reader transition evidence. |
| 18 | Static responsive/44px/reduced-motion implementation remains. | **Partial** | Required implementation screenshots, contrast measurements, keyboard, screen reader, zoom, bottom-nav, and reduced-motion browser evidence. |
| 19 | DTO exact-key/privacy tests and safe lifecycle logs remain green. | **Partial** | Broader malicious-report/structured-event privacy scan is still desirable. |
| 20 | Default-off/static identity/timer-state checks pass, and preparation probes active services/lock before copying. | **Fail** | **High:** guard is TOCTOU because the lock is released before all Recall runtime mutations; hold it continuously or atomically switch under exclusion. Host proof remains separately unauthorized. |
| 21 | Full lint, typecheck, 42 focused tests, six process groups, artifact check, wrapper smoke, 838 full tests, and production build all pass. | **Partial** | AC 20 High and required implementation browser/accessibility evidence prevent the complete gate from passing. |

### Independent remediation command ledger

| Command | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| Focused Recall route/component/repository/contract/runner suite | Pass: 42/42 |
| `npm run build:recall-cli` | Pass |
| `npm run test:recall-manual-sync-process` | Pass: six fixture groups |
| `npm run check:recall-manual-sync-artifacts` | Pass |
| `npm run smoke:recall-scheduler-wrapper` | Pass |
| `npm test` | Pass: 838 tests, 92 suites |
| `npm run build` | Pass; known `unpdf` `import.meta` warning only |

### Final re-review disposition

The application persistence, API, client recovery, wrapper/lifecycle, worker recovery, and automated regression lanes have no remaining Critical finding. RMS-QA-001/002/003 are closed. The branch is **not yet review-ready overall** because the preparation lock guard has a remaining High TOCTOU defect and AC 18's required implementation browser/accessibility evidence is still absent. No production-enablement action or host proof was performed.

## Final closure after second remediation — 2026-07-11

This final section supersedes only the prior closure verdict; all earlier findings remain as audit history.

### Final technical disposition

No Critical or High implementation/process finding remains in the reviewed snapshot.

- The accepted-`202` edge case is closed: when a different idempotency key deduplicates to an existing active request, the client validates and persists the returned request ID, clears the non-authoritative submitted key, blocks further submission through GET failure/missing correlation, polls while unresolved, and releases only after the same request becomes terminal. Route and controller regressions pass.
- **RMS-QA-007 is closed:** preparation now acquires one remote private-lock holder before the first artifact rsync and keeps it held through Recall bundles, migrations, wrapper, recursive permission mutation, unit installation, tmpfiles, and daemon reload. The holder rechecks services, records timer enabled/active state, and validates it again before release. A competing automatic-process trace proves it cannot enter until the complete switch releases the lock; timer definition remains byte-identical.
- The AC 8 process gap is closed for review-ready local scope: both fake-systemd path and fallback activations invoke the built worker bundle, which claims the request, invokes a controlled wrapper using the built lifecycle bundle, and records `queued -> claimed -> running -> error`. Injected activation is within the local healthy/fallback bounds and timer definition plus modeled enabled/active state remain unchanged.

### Final AC 1–21 review

| AC | Final independent status | Final evidence / residual |
| --- | --- | --- |
| 1 | **Partial — manual evidence** | Auth-first/exact-origin tests pass; implementation placement screenshot remains required. |
| 2 | **Pass** | Apply-validated precondition, atomic terminal transaction, crash matrix, and last-success preservation pass. |
| 3 | **Pass** | Never/stale/past schedule behavior passes. |
| 4 | **Pass** | UTC wire and fixed IST formatter evidence passes. |
| 5 | **Partial — manual evidence** | Radix/no-overlay/44px source is present; real keyboard focus/Escape/return/no-request evidence remains required. |
| 6 | **Pass** | Requesting, retained-key ambiguity, confirmed accepted request-ID correlation, double-submit guard, and active-to-terminal recovery pass. |
| 7 | **Pass** | Active-only durable `202`, different-key dedupe, terminal replay, marker-failure, and bounded-stream evidence pass. |
| 8 | **Pass for local review-ready scope** | Fake-systemd path/fallback invoke built worker+lifecycle and prove state transitions/timer invariance. Real host timing remains enablement evidence. |
| 9 | **Pass** | Independent-process enqueue/claim race and real outer-lock trace pass. |
| 10 | **Pass** | Immutable expiry, cooldown, terminal replay, monotonic countdown, and expired-worker no-spawn pass. |
| 11 | **Pass** | Full wrapper/inner lock reuse, wait ordering, same-occurrence no-restart, and competing automatic exclusion pass. |
| 12 | **Partial — manual evidence** | Persistence/correlation/offline/visibility/abort/order logic is tested; real navigation/restart/multi-tab/session flows remain. |
| 13 | **Pass** | Healthy/stale heartbeat, killed-process, and six crash-stage reconciliation groups pass without duplicate apply. |
| 14 | **Pass** | Late-card and killed-apply fixtures preserve exact counts and no false checkpoint/last-success advance. |
| 15 | **Partial — manual evidence** | Formatter/zero omission/partial/unknown behavior passes; final implementation captures remain required. |
| 16 | **Partial — manual evidence** | Durable/overlay/automatic-long states are implemented; full implementation state-board evidence remains. |
| 17 | **Partial — manual evidence** | Polling guards, offline pause, visibility, monotonic time, abort/order, and correlation pass; screen-reader transition observation remains. |
| 18 | **Partial — required final gate** | Responsive/44px/reduced-motion source exists, but 1440/1024/390/320 light/dark, keyboard, screen reader, 200% zoom, bottom-nav, AA, and reduced-motion implementation evidence is still required. |
| 19 | **Partial — residual evidence** | Safe DTO/log tests pass; final broader structured-event/privacy evidence should be included in the delivery ledger. |
| 20 | **Pass** | Default-off assets, continuous preparation lock, competing automatic exclusion, new-unit disabled checks, timer invariance, and preservation behavior pass. |
| 21 | **Partial — manual evidence** | All current automated gates pass; AC 18/manual evidence must be attached before the complete delivery gate is marked Pass. |

### Final independent command ledger

- Full typecheck: pass.
- Full lint: pass.
- Focused Recall suite: **43/43 pass**.
- Three Recall bundles: build pass.
- Process suite: **six fixture groups pass**, including real lock competition and built worker/lifecycle path/fallback activation.
- Static artifact/default-off/continuous-guard check: pass.
- Full repository suite: **839 tests across 92 suites pass**.
- Production build: pass with only the existing `unpdf` `import.meta` warning.

### Review-ready versus manual-evidence conclusion

The code, persistence, API, client recovery, process orchestration, default-off rollout, rollback preparation, and automated regression lanes are **ready for review with no unresolved Critical/High finding**. The feature is **not yet final review-ready under PRD v2** until the coordinator attaches the required implementation browser/accessibility evidence for AC 1, 5, 12, 15–18 and the final privacy/delivery ledger for AC 19/21. Real Linux identity/credential/filesystem/systemd timing proof remains a separately authorized production-enablement gate and was not performed.

### Post-closure correction — confirmed request supersession

The preceding “no unresolved High” conclusion is corrected after an additional adversarial sequence review.

**High RMS-QA-008 remains (AC 6 and AC 12): confirmed accepted request IDs are not directly addressable during recovery.** After POST accepts request A, the client clears its submitted idempotency key and retains only A's returned request ID. Subsequent GET does not send that request ID, and the API returns one reduced latest `activity`. If A terminalizes while this tab cannot refresh, then another tab creates newer request B after cooldown, the recovering tab receives B as activity. `correlateConfirmedAcceptedRequest(A, statusContainingB)` returns `missing`; confirmed A remains submission-blocking and the two-second recovery poll repeats indefinitely. Neither active nor terminal correlation can occur for A once B supersedes the reduced activity. A full page reload clears the local guard, but that is not truthful automatic reconnect/multi-tab convergence.

Required closure:

1. Add an authenticated, bounded, privacy-safe status lookup for the confirmed request ID, or return an equivalent explicit acknowledgement alongside the reduced activity.
2. Preserve auth-first/private/no-store behavior and expose only the same safe state/count/time allowlist.
3. Add the sequence regression: A accepted -> GET failure -> A terminal -> B newer active/terminal -> lookup of A resolves terminal and releases the guard without creating another POST.

Final corrected status: AC 6 and AC 12 are **Fail** until RMS-QA-008 closes; AC 21 remains Partial. The automated command ledger remains green, but the branch is **no-go for review-ready handoff** because one High correctness finding and the manual AC 18 evidence remain.

## Binary RMS-QA-008 closure — 2026-07-11

This section is the definitive correction to the immediately preceding post-closure finding.

**RMS-QA-008 is closed. No Critical or High finding remains.**

Independent verification confirms:

1. Authenticated GET accepts an exact, regex-bounded `x-recall-request-id`; authentication is evaluated first, malformed input returns `400`, missing IDs return a non-echoing `absent` acknowledgement, and responses remain private/no-store safe DTOs.
2. The status service looks up the requested row directly and returns a separate `requestAcknowledgement`, independent of the reduced latest `activity`.
3. After accepted request A, the client stores the validated returned request ID and sends it on every recovery GET. A GET failure retains A and keeps submission disabled; no idempotency key or duplicate POST is created.
4. The full repository/route sequence passes: A accepted -> A terminal -> cooldown elapsed -> B accepted and active -> exact lookup still reports A terminal while reduced activity reports B queued -> B terminal -> exact lookup still reports A terminal while reduced activity reports B done.
5. Controller regression passes: A remains guarded through missing/failed status, exact A terminal acknowledgement releases only A's local guard, and active B still renders the action disabled through server activity.
6. Privacy regression proves the exact acknowledgement contains only `state`, `requestId`, and `activityState` and excludes report/error/credential/lock/path internals.

Focused binary ledger:

- Route and component tests: **15/15 pass**.
- Typecheck: pass.
- Targeted route/component/service/contract lint: pass.
- Prior final full regression remains: 839 tests, production build, process fixtures, bundles, and artifact checks pass.

Final AC correction: AC 6 and AC 12 return to **Pass for automated review scope**; AC 21 is automated-green but remains Partial only for the outstanding manual delivery evidence described below.

Final disposition: **GO for automated/code review.** There is no unresolved Critical/High implementation or process finding. The only remaining review-ready work is manual visual/accessibility evidence: implementation screenshots at 1440/1024/390/320 in light/dark; keyboard focus trap/Escape/close/Cancel/focus return/no-overlay behavior; screen-reader transition sequence; 200% zoom; bottom-nav clearance; measured AA and 44px targets; reduced motion; and final browser navigation/reconnect/multi-tab/session observations. Production host identity/credential/filesystem/systemd proof remains separately unauthorized and was not performed.

## Final manual and visual closure — 2026-07-11

Evidence reviewed: `visual-accessibility-qa-report.md` and all listed `visual-evidence/implementation-*` captures and recorded DOM/AX/contrast metrics.

### Reconciled criteria

| AC | Final status | Manual/visual closure evidence |
| --- | --- | --- |
| 1 | **Pass** | Running Settings implementation at 1440 shows Recall immediately after AI services and before Data & Privacy; authenticated route and flag behavior remain automated-green. |
| 5 | **Pass** | Chrome input events prove initial Start sync focus, trapped Tab cycle, overlay non-dismissal, Escape close, exact opener focus return, and 44px controls. Dialog axe reports zero violations and the AX tree exposes the named dialog/buttons. |
| 12 | **Pass** | Queued, offline-after-accepted, and session-expired implementation evidence preserves server work/last-known metadata without false terminal state; exact request recovery, reconnect, abort/order, persistence, and multi-tab convergence are covered by the final automated contract/process evidence. |
| 15 | **Pass** | Partial implementation captures show deterministic bounded pluralized counts once, retained retry-safety copy, and cooldown; ready/never and automated unknown/zero/count formatter evidence complete the proof matrix. |
| 16 | **Pass** | Representative implementation captures cover ready, queued, long automatic, partial, offline accepted, session expired, confirmation, and cooldown compositions at required layouts; the remaining durable variants share the tested state controller and persistent metadata rendering. No horizontal overflow was measured. |
| 17 | **Pass** | A real browser request emitted exactly one POST and changed the stable polite atomic live region only from Requesting to Queued; cooldown seconds were excluded. Automated visibility/online/offline pause, abort, ordering, terminal/auth stop, and exact-correlation tests remain green. |
| 18 | **Pass for review-ready browser scope** | 1440/1024/390/320, light/dark, 200% zoom, no-overflow, bottom clearance, keyboard dialog, AX semantics, live-region mutations, 44px targets, Recall contrast (minimum 4.97:1 light and 6.31:1 dark), reduced-motion no-animation, and Recall/dialog axe zero-violation evidence pass. Two 4.48:1 light-page warnings are pre-existing nodes outside Recall and are explicitly recorded. |
| 21 | **Pass** | Full automated ledger, production build, process fixtures, privacy/static checks, and the implementation browser/accessibility package are green. The known `unpdf` build warning and unrelated warning-badge contrast are documented non-Recall residuals. |

### Evidence sufficiency and boundaries

The screenshots visibly confirm responsive composition and state copy, while the report supplies the interaction/DOM/AX metrics that a screenshot cannot prove. The fixed mobile navigation may overlap content transiently at an arbitrary scroll position, but direct measurement and full-page evidence show the action can scroll clear and the document retains bottom clearance; it is not a sticky Recall action.

No Critical, High, or required browser gap remains for this feature's review-ready scope. Physical VoiceOver/TalkBack audio output and physical touch hardware were unavailable; Chrome AX, live-region mutation, keyboard, target measurement, contrast, zoom, and reduced-motion evidence are sufficient for this local review gate without claiming a physical AT lab run. Effective Linux identity/credential/filesystem/SQLite/WAL/backup/unit/tmpfiles/timer and live Recall behavior remain separately authorized production-enablement proof and were not performed.

### Final review-ready disposition

**GO.** AC 1–21 are closed for review-ready local/static/fixture/browser scope, with no unresolved Critical or High finding. This does not authorize merge, deployment, feature enablement, credential access, timer mutation, or production execution.
