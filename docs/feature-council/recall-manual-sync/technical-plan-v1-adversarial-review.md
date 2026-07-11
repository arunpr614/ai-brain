# Recall manual sync technical plan v1 - Adversarial Review

**Created:** 2026-07-11 14:35:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `docs/feature-council/recall-manual-sync/technical-plan-v1.md`
**Report path:** `docs/feature-council/recall-manual-sync/technical-plan-v1-adversarial-review.md`

## Executive Verdict

**No-go for implementation.** The reuse boundary and queue concept are right, but v1 can regress the daily schedule, lets the web identity contend on a lock path unless explicitly isolated, duplicates lifecycle ownership across request/execution/run/worker, and hand-waves heartbeat and credential isolation. These are architecture faults, not polish.

## Evidence Inspected

- `technical-plan-v1.md`, discovery/decision/council artifacts
- `src/db/client.ts`, `src/db/recall-sync.ts`, `src/lib/recall/sync-runner.ts`
- `scripts/recall-scheduled-apply.sh`, build/deploy scripts, current service/timer units
- Official systemd credential documentation indicating per-service credential directories are isolated when supported, while current checked-in units still share a user/environment

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Non-blocking outer lock can skip the automatic daily run

**Evidence:** `technical-plan-v1.md:28-30`, `44`, and `154` specify non-blocking `flock`; automatic contention records blocked and does not retry. The existing timer has one daily occurrence.
**Why it matters:** A manual run at timer fire can cause the daily run to be lost, violating the no-regression requirement.
**Failure mode:** Manual work holds the lock, automatic service exits, and no daily retry occurs until the next day.
**Recommendation:** Make lock policy trigger-aware: manual attempts wait briefly then requeue the same request; automatic execution waits for the active wrapper with a bounded duration that covers the tested maximum, or has an explicit automatic retry unit. Prove the scheduled run eventually executes once and only once.

#### 2. The lock path/security boundary is unspecified

**Evidence:** v1 names `flock` but no lock path/ownership; the web and Recall units currently share identity/environment.
**Why it matters:** If the web process can open/hold the lock, a compromised route/process can deny all Recall synchronization.
**Failure mode:** Web process acquires the wrapper lock indefinitely or deletes/replaces it.
**Recommendation:** Use a trusted runtime directory/lock owned only by a distinct Recall service identity. Both automatic and manual Recall units share that identity; the web identity cannot read/write/open it.

### P1 - High Risk

#### 1. Three lifecycle records have no single transactional owner

**Evidence:** Request, execution, and run tables all store states/counts (`technical-plan-v1.md:62-102`); lifecycle `complete` updates request/execution (`148-151`) while the worker also “reconciles terminal state” (`167`).
**Why it matters:** Two components can finalize the same request differently after a crash or final-validator failure.
**Failure mode:** Execution is done, request stays running, last-success advances without request, or worker overwrites partial with error.
**Recommendation:** Declare execution the whole-wrapper authority. Runner owns only run rows/progress. Lifecycle complete/fail performs one transaction updating execution, linked request, and last-success. Worker owns claim/spawn/requeue/reconciliation but never independently invents terminal outcome.

#### 2. Heartbeat is not operationally implemented

**Evidence:** v1 requires heartbeat (`technical-plan-v1.md:51`, `128-130`, `148-152`) but the wrapper can block for long network/backup/apply stages and no heartbeat process/cadence exists.
**Why it matters:** Stale recovery can launch duplicate work or leave work stuck.
**Failure mode:** A healthy long run appears stale; fallback worker requeues/starts another request.
**Recommendation:** Add a trusted heartbeat loop tied to the wrapper PID (for example every 15 seconds), plus stage transitions and inner-run progress. Stale threshold must exceed at least three missed heartbeats and be tested with a deliberately long fixture.

#### 3. Credential isolation remains an option instead of a design

**Evidence:** `technical-plan-v1.md:171-181` allows `LoadCredential` or a distinct identity, while current services share `brain` and `/etc/brain/.env`.
**Why it matters:** Implementation cannot test or review a security boundary that is undecided.
**Failure mode:** Code lands with the key still readable by the web process and the flag is later enabled by configuration alone.
**Recommendation:** V2 must choose a distinct `brain-recall` identity and shared data group, root-owned Recall credential source delivered only to Recall units, setgid/restrictive data permissions, and a fail-closed deploy preflight. `LoadCredential` may be used in addition, not as a substitute for identity separation.

#### 4. Automatic next-elapse capture has no reliable command/permission contract

**Evidence:** Lifecycle `schedule` is named (`technical-plan-v1.md:152`) but how/when it reads `systemctl show`, handles jitter, verifies freshness, and avoids web privilege is unspecified.
**Recommendation:** Add a trusted `ExecStartPost` or dedicated read-only status helper in the automatic Recall unit, persist value plus observed-at/timer identity, and treat missing/stale/past as unavailable. Add static timer-definition drift and fixture parser tests.

#### 5. Run-progress persistence can increase contention without transaction boundaries

**Evidence:** Every card updates run/execution/request (`technical-plan-v1.md:134-142`) while multiple processes share SQLite.
**Recommendation:** Runner updates its run after each committed card in a short immediate transaction; request/execution counts are derived/finalized transactionally from the run, not redundantly written after each card.

### P2 - Medium Risk

#### 1. Migration linkage and constraints are vague

Request/execution/run circular links need explicit creation/ALTER order, foreign keys or intentionally documented soft links, state/count CHECK constraints, and migration compatibility tests.

#### 2. `busy_timeout` alone is not a retry policy

Specify exact duration, retry count/backoff for enqueue/claim only, and surface queue unavailable after the bound. Never globally retry arbitrary writes.

#### 3. Build/deploy changes are under-enumerated

The current build emits one bundle and deploy copies explicit filenames. V2 must name every bundle/unit/script copied, installed, verified, and intentionally left disabled.

#### 4. Systemd timeout has no derived value

Derive timeout from maximum cards × per-request timeout × dry/apply plus backup/validation margin, then use a deliberately smaller tested fixture or reviewed production cap. Do not guess.

### P3 - Low Risk Or Polish

The example GET exposes both active request and active execution; the public DTO may not need execution as a separate object. Prefer one reduced active status to minimize client coupling.

## What The Original Plan Or Work Gets Wrong

It assumes crash-safe `flock` is sufficient without addressing fairness, daily retry, or lock ownership. It adds an execution table for truth but leaves two other actors able to finalize that truth. It labels credential delivery and heartbeat as implementation details even though they determine safety.

## Missing Validation

- Manual holds lock at automatic timer fire and automatic eventually runs once.
- Web identity cannot open/read/delete lock or credential.
- Worker crash after wrapper validation but before return.
- Healthy long wrapper with heartbeat versus truly stale wrapper.
- One-transaction terminal update across execution/request/last-success.
- Exact next-elapse capture/staleness/past handling.
- Explicit packaged/deployed file manifest.

## Revised Recommendations

Choose distinct Recall identity, trusted runtime lock, trigger-aware contention policy, single lifecycle ownership, real PID-bound heartbeat, exact schedule snapshot mechanism, non-duplicated progress writes, and explicit migration/build/deploy contracts.

## Go / No-Go Recommendation

**No-go until P0/P1 findings are resolved in technical plan v2.**

## Plan Revision Inputs

### Required Deletions

- Delete unconditional non-blocking lock behavior for automatic runs.
- Delete “LoadCredential or distinct identity” ambiguity.
- Delete worker authority to invent terminal outcomes.
- Delete per-card redundant writes to all three tables.

### Required Additions

- Trigger-specific lock wait/retry policy and trusted lock path.
- Distinct Recall identity/shared data group/credential/preflight design.
- One terminal transaction owned by lifecycle command.
- PID-bound heartbeat implementation and thresholds.
- Exact schedule status capture and packaged/deploy manifest.

### Required Acceptance Criteria Changes

- Automatic run eventually executes once across manual collision.
- Web identity cannot access lock/credential; Recall identity can access required DB/data.
- Terminal execution/request/last-success update is atomic.
- Healthy long run never becomes stale; killed run is reconciled safely.

### Required Validation Changes

- Add process-level lock, identity/permission, heartbeat, crash-window, migration, bundle, and systemd artifact tests.

### Required No-Go Gates

- No implementation with unresolved identity/lock/lifecycle owner.
- No release if manual activity can skip automatic daily sync.
- No enablement without host permission/credential/unit proof.

## Residual Risks

SQLite multi-process behavior and host systemd semantics remain environment-sensitive and require both deterministic tests and separately authorized host verification.
