# Card Processing Workflow Technical Plan v1 - Adversarial Review

**Created:** 2026-07-11 15:17:12 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/technical/technical-plan-v1.md` against current repository architecture and companion product/UX evidence
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/reviews/technical-plan-v1-adversarial-review.md`

## Executive Verdict

**No-go for implementation.** The plan is strong at naming the right aggregate (`items`), CAS, idempotency, separate archive, and content-free history, but it contains three high-risk correctness gaps: current Inbox age has no coherent authoritative anchor; Undo effectiveness is underspecified for Undo chains; and the proposed emergency trigger-disable rollback silently turns new captures into dormant, invisible workflow rows. It also proposes a synchronous boot migration that writes one history row per legacy item without a measured availability/disk gate. The plan may remain an **Explored — not implemented** architecture proposal and should be revised before any migration, trigger, API, schema, flag, or production code is created.

## Evidence Inspected

- Technical plan v1: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/technical/technical-plan-v1.md`, lines 1-862.
- Architecture options: `docs/feature-council/card-processing-workflow/technical/architecture-options.md`, especially data, API, batch, mutation, archive, test, and rollout sections.
- Current database runner: `src/db/client.ts:1-162`; migrations run synchronously inside `getDb()` and each migration is one transaction (`src/db/client.ts:31-72`, `:98-150`).
- Current insert contract: `src/db/items.ts:54-89`; `insertCaptured` inserts then re-reads the item.
- Current base schema: `src/db/migrations/001_initial_schema.sql:15-35` and `:67-97`.
- Current-state/data-model/code-map/source-reconciliation reports under `docs/feature-council/card-processing-workflow/research/`.
- PRD v1 lines 130-195, 265-333, 369-469; UX/UI v1 lines 152-238, 282-422, 424-534.
- Original objective: `/Users/arun.prakash/.codex/attachments/514e46ef-5f1a-4e64-9a0d-8e33e8c20f2e/goal-objective.md:46-200`, `:454-527`, and `:617-641`.
- Prototype source and screenshots for contract comparison only; successful isolated `npm run build`. No production implementation exists.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found because no production implementation or migration has been created. The P1 findings become blockers before execution.

### P1 - High Risk

#### 1. “Oldest Inbox age” has no consistent source of truth and the proposed index measures the wrong thing

**Evidence:** Technical v1 line 149 says `current_inbox_entered_at` is derived initially and may become a projection later. The oldest-Inbox index at lines 187-193 uses `captured_at`, while legacy duration begins at enrollment (`:210-219`) and reprocessed items can return to Inbox long after capture (`:223-256`). The API nevertheless promises `oldestInboxEnteredAt` at line 346. PRD v1 line 304 ambiguously says “current enrolled Inbox start/capture boundary.”
**Why it matters:** Capture order and current Inbox dwell time are different measures. An item captured two years ago, enrolled today, or reprocessed today must not report two years of current Inbox age.
**Failure mode:** The headline “oldest Inbox age” becomes fabricated or extremely expensive to derive from event history, especially under Undo and 50k-item counts. Indexing `captured_at` makes the wrong query fast rather than making the right query possible.
**Recommendation:** Define one authoritative `workflow_inbox_entered_at` projection on `items`, set transactionally on new capture, enrollment, move-to-Inbox, linked Undo, restore/reprocess behavior, and null/ignored outside Inbox. Specify exact Undo restoration rules and index a partial `(workflow_inbox_entered_at ASC, id)` for enrolled, active Inbox. If the team refuses the projection, provide the exact effective-event SQL and prove its p95 budget before approval.

#### 2. Disabling the initialization trigger preserves capture availability by silently violating the core Inbox-default promise

**Evidence:** New rows default to `workflow_status='inbox'`, version 0, timestamps 0, and `workflow_enrolled_at=NULL` (`technical-plan-v1.md:127-136`). The AFTER INSERT trigger is solely responsible for setting version 1, real timestamps, enrollment, and the initialized event (`:196-205`). Rollback permits a forward migration that disables the problematic workflow trigger while retaining “safe default columns” (`:741-747`). Processing queries always require enrollment (`:281-299`).
**Why it matters:** Those defaults are not safe for product behavior. With the trigger disabled, captures succeed but remain dormant and invisible from Processing, with no initialization event or Added metric. This is silent data-integrity and trust failure.
**Failure mode:** An emergency rollback appears successful because capture works, but every new source disappears from Inbox until a repair job is noticed and run.
**Recommendation:** Define a degraded-mode contract before implementation. Options: application insert supplies valid workflow fields/event in the same transaction with the trigger acting only as a guard; or trigger-disable automatically disables Processing UI and records a durable repair queue that backfills missed rows before re-enable. Add a startup/integrity query for post-migration rows with version 0/null enrollment and make any nonzero result a write/UI no-go gate.

#### 3. Undo effectiveness is not defined for Undo-of-Undo or chained reversal

**Evidence:** Events include nullable `undo_of_event_uuid` (`technical-plan-v1.md:151-176`). A milestone is effective when no later valid Undo references it (`:174-176`, `:543-550`). Undo targets the most recent reversible event (`:248-257`), but the plan does not say whether an `origin='undo'` event is itself reversible. The simple “has a later Undo reference” rule does not restore the original milestone if an Undo event is later undone.
**Why it matters:** First Triaged/Completed metrics and current state can diverge if reversal chains are legal but metric effectiveness only checks one level.
**Failure mode:** User completes an item, undoes it, then undoes that reversal or retries through another surface. Current state is Done again, but the original completion remains marked ineffective and later completion derivation may double-count or omit it.
**Recommendation:** Choose one invariant. Simplest v1: Undo-origin events are not Undo targets; “redo” is an ordinary new move with no link. Enforce this in repository validation and DB tests. If chained Undo is required, define parity/graph reduction, cycle prevention, unique target rules, and deterministic effective-event SQL.

#### 4. The migration performs an unbounded history write synchronously at first database open

**Evidence:** Technical v1 lines 196-205 baselines every legacy item and inserts one `legacy_baselined` event per item inside migration 024. The current runner executes unapplied SQL synchronously during `getDb()` and wraps each migration in one transaction (`src/db/client.ts:31-72`, `:98-150`). The plan benchmarks later query fixtures but has no maximum migration wall time, WAL growth, disk amplification, or startup unavailability gate for the one-event-per-item backfill.
**Why it matters:** Schema correctness does not guarantee operational safety. A large transaction at first request can block application startup, grow WAL/disk unexpectedly, and make rollback depend on a backup restore.
**Failure mode:** Production deploy starts, first database access performs a long write transaction, capture/read traffic fails or times out, and disk pressure leaves the application unavailable even though the migration is logically correct.
**Recommendation:** Split additive schema/defaults/triggers from resumable legacy-event backfill. Let schema migration create dormant defaults, then run a bounded, idempotent, observable baseline job before Processing read enablement. Define wall-time, WAL/disk, free-space, backup, interruption, and resume gates on the actual production-size snapshot. UI remains off until baseline integrity is proven.

### P2 - Medium Risk

#### 1. Active-status indexing is unlikely to match the dominant predicate cleanly

**Evidence:** The proposed active index begins `(workflow_enrolled_at, archived_at, workflow_status, ...)` (`technical-plan-v1.md:187-194`), while active queries require `workflow_enrolled_at IS NOT NULL` and `archived_at IS NULL` (`:281-309`). The first predicate is a range/non-null test, which can limit use of later columns.
**Why it matters:** Four status counts plus filtered joins are the most frequent read shape. A superficially matching composite index may still scan large active sets.
**Failure mode:** Count latency misses the 50k budgets and encourages premature caches/rollups.
**Recommendation:** Prototype partial indexes for enrolled active rows, potentially keyed by status and each sort tuple. Preserve `EXPLAIN QUERY PLAN` and benchmark evidence for unfiltered, tag-filtered, topic-filtered, and archive queries before locking schema.

#### 2. The event UUID and trusted initialization provenance contract is not executable as written

**Evidence:** `event_uuid` is required and unique, and initialized events require actor channel/origin/surface (`technical-plan-v1.md:153-173`). The AFTER INSERT trigger is responsible for creating the event (`:196-205`), but the plan does not define SQL-safe UUID generation, how `capture_source` maps to the bounded actor enum, or what a future raw insert with missing/unknown provenance records.
**Why it matters:** The database trigger is the claimed universal protection for future direct inserts. An undefined event identity/provenance expression turns that protection into an implementation-time guess.
**Failure mode:** The trigger fails captures, emits inconsistent IDs, or records misleading actor metadata.
**Recommendation:** Add the exact trigger pseudocode and deterministic provenance mapping. Use a collision-resistant SQLite expression or application-supplied event UUID with a guarded fallback; test unknown/raw inserts and collision handling.

#### 3. Partial batch retry semantics need a durable per-item receipt contract, not just aggregate counts

**Evidence:** `workflow_batch_operations` stores request hash and counts only (`technical-plan-v1.md:178-185`), while the API promises classified per-item replay/conflict outcomes and retry of only uncommitted mutations (`:405-418`). Item mutation IDs can reconstruct committed events, but the plan does not state how a retry validates that the per-item request set exactly matches the original batch or detects omitted/substituted entries.
**Why it matters:** Partial outcomes are safe only if retries cannot mutate a different set under the same batch operation identity.
**Failure mode:** A client retries a truncated or altered request with the same batch ID; aggregate state and UI selection diverge, or valid uncommitted items are never attempted.
**Recommendation:** Define canonical sorted batch request hashing over every per-item semantic request, require exact hash equality, and specify whether durable per-item receipts are queried from canonical events or stored separately. Add lost-response, reordered-body, omitted-item, substituted-item, and replay-after-later-mutation tests.

#### 4. Hard-delete makes historical metrics mutable without a user-facing truth contract

**Evidence:** Technical v1 lines 545-553 says hard delete removes events and can decrease recomputed history; lines 564-568 prohibit anonymous rollups without approval. PRD v1 only says the effect is documented (AC-25).
**Why it matters:** Privacy-first deletion is correct, but a weekly number that shrinks after deletion can appear corrupt unless the UI and test model explicitly accept recomputation.
**Failure mode:** A user deletes one item and later sees fewer completed items for the same week, undermining trust or triggering false incident diagnosis.
**Recommendation:** Record this as an explicit product decision: metrics describe currently retained items, not immutable historical activity. Add a small explanatory note where historical values are reviewed and tests that prove hard-delete consistency across summary/count caches.

### P3 - Low Risk Or Polish

#### 1. Route notation and dependency gates should match repository conventions exactly

**Evidence:** The plan uses `PATCH /api/items/:id/workflow` while the Next.js repository uses bracketed route folders. Dependencies remain “evaluate” decisions at lines 612-619 while later milestones treat browser/a11y gates as required.
**Why it matters:** Small notation drift becomes copy/paste ambiguity, and unresolved test tooling can defer release-critical validation.
**Failure mode:** Implementation creates inconsistent route docs or reaches M4 without a supported E2E harness.
**Recommendation:** Use `/api/items/[id]/workflow` in repository-facing planning and make direct E2E/a11y tooling approval an M0/M1 gate, not a late dependency note.

## What The Original Plan Or Work Gets Wrong

- It conflates capture chronology with current Inbox dwell time.
- It calls trigger-disabled defaults safe even though they produce unenrolled invisible rows.
- It assumes a one-level Undo reference is enough without defining whether Undo itself can be reversed.
- It treats a potentially large legacy-event backfill as an ordinary synchronous schema migration.
- It claims universal DB initialization without executable event UUID/provenance rules.
- It specifies partial batch resumability without fully binding the retry to the original item set.

## Missing Validation

- Exact SQL/fixture for current Inbox entry time after capture, enrollment, return, reprocess, and Undo.
- Trigger-disable/degraded-mode capture test and missed-row repair test.
- Undo-of-Undo prohibition or chain-reduction tests.
- Production-size migration wall time, WAL growth, free-space, interruption, and restart evidence.
- Trigger UUID/provenance collision and unknown-source tests.
- Exact batch request hash/replay matrix.
- Query-plan evidence for active partial indexes plus tag/topic fan-out.
- Hard-delete metric explanation and cache invalidation evidence.

## Revised Recommendations

1. Add a transactional current-Inbox-entry projection and partial index.
2. Make initialization safe without relying on an always-on trigger, or fail closed with UI disabled and durable repair.
3. Prohibit Undo-of-Undo in v1 and test it.
4. Split schema migration from resumable legacy-event backfill.
5. Specify trigger UUID/provenance pseudocode.
6. Bind batch retries to a canonical complete request hash and durable item receipts.
7. Benchmark partial active indexes before approving the schema.
8. Keep the entire plan **Explored — not implemented** and make no production changes in this phase.

## Go / No-Go Recommendation

**No-go for production implementation. Conditional go for technical plan v2.** Technical v2 must close every P1 with explicit schema, mutation, fallback, migration, and test contracts. No schema, trigger, migration, API, feature flag, or production code is authorized by this review.

## Plan Revision Inputs

### Required Deletions

- Delete the claim that trigger-disabled default columns are safe.
- Delete `captured_at` as the oldest-current-Inbox-age basis.
- Delete ambiguous “most recent reversible event” language unless Undo events are explicitly excluded.
- Delete the one-transaction legacy event backfill from the boot migration.

### Required Additions

- Add `workflow_inbox_entered_at` or exact proven equivalent.
- Add degraded-mode initialization/repair behavior.
- Add Undo-chain invariant and constraints.
- Add resumable legacy baseline operation and readiness gate.
- Add trigger UUID/provenance mapping.
- Add canonical batch request hashing and receipt rules.

### Required Acceptance Criteria Changes

- Prove reprocessed/enrolled items report correct current Inbox age.
- Prove new capture never becomes silently dormant when workflow writes are disabled or trigger initialization fails.
- Prove Undo-of-Undo is rejected or correctly reduced.
- Prove migration/backfill stays within wall-time/disk/availability budgets and resumes after interruption.
- Prove altered batch retries are rejected.

### Required Validation Changes

- Add SQL-level current-Inbox-anchor tests.
- Add trigger-disable, fallback, repair, and flags-off E2E.
- Add migration fault injection and WAL/free-space monitoring.
- Add event UUID collision/provenance tests.
- Add active partial-index plan snapshots and 50k fan-out benchmarks.
- Add hard-delete metric/cache consistency tests.

### Required No-Go Gates

- Any nonzero post-migration item with invalid workflow initialization or unexpected null enrollment for a new capture.
- Any undefined current-Inbox-age anchor.
- Any legal Undo chain without proven metric reduction.
- Any unmeasured synchronous production backfill.
- Any altered batch retry accepted under an existing operation ID.
- Any production application change during this exploration goal.

## Residual Risks

SQLite remains a single-writer store; CAS protects semantics but not availability under long writes. Cross-device freshness remains polling-based. Virtualization plus drag plus focus is still a difficult UI integration even after data correctness is fixed. Workflow-only archive may surprise users because content remains retrievable. These are acceptable discovery risks only after the P1 correctness gaps are closed and separate implementation authorization is granted.
