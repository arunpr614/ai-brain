# Kanban Card Processing Technical Plan v1 - Adversarial Review

**Created:** 2026-07-12 11:35:04 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/technical/technical-plan-v1.md`
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/reviews/technical-plan-v1-adversarial-review.md`

## Executive Verdict

**No-go for implementation from technical plan v1; conditional go for technical plan v2.** The plan has four high-risk defects: it freezes unresolved/no-go product decisions into engineering scope; its mutation-outcome API cannot fulfill its own replay/no-op/rejected contract with the proposed storage; its readiness gate can place full-database integrity work on the request path; and its per-status pagination model cannot faithfully serve the approved non-status Board groupings. These defects threaten correctness, availability, and acceptance evidence. Technical v2 must resolve them before migration 025, feature APIs, or UI work begins.

## Evidence Inspected

- Execution goal: `/Users/arun.prakash/.codex/attachments/3a115369-f879-4661-8900-269defa7d59a/goal-objective.md`, especially source authority, product-model validation, v1/v2 gates, implementation, testing, and release requirements.
- Technical plan v1: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/technical/technical-plan-v1.md`, lines 1-566.
- PRD v1 and its review: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/product/prd-v1.md`, lines 1-521; `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/reviews/prd-v1-adversarial-review.md`, lines 1-196.
- Approved baseline, current-state report, code map, production baseline, and initial migration assessment under `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/`.
- Source technical/UX/product v2 and traceability evidence under `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/`.
- Current code at baseline `5b92e68`, including `src/db/items.ts:32-89`, `src/lib/recall/importer.ts:69-179`, `src/db/client.ts:20-153`, `src/lib/auth/bearer.ts:55-80`, `src/proxy.ts:76-157`, `src/lib/notes/http.ts:1-36`, and existing insert triggers in migrations 002, 003, and 021.
- Read-only production evidence: active Node 22 service, 7.52 MB SQLite database, 129 retained items, 26 applied migration filenames, clean quick/foreign-key checks, and about 30 GB free; no production content was inspected or mutated.
- Required adversarial-review template and path script; its timestamp was used while the goal-required stable review filename was preserved.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found. The artifact accurately says it is a v1 plan for review and does not claim implementation or deployment.

### P1 - High Risk

#### 1. The plan hard-codes product decisions that the PRD review has explicitly rejected as implementation-ready

**Evidence:** Technical v1 names PRD v1 as its product contract at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/technical/technical-plan-v1.md:3-7`, implements AI topics at `:115`, `:268`, and `:274-283`, exposes weekly metrics at `:291-300`, and refers to an archive matrix at `:464`. The PRD adversarial review is a no-go and finds unresolved AI-generated category taxonomy, daily metric scope, and a nonexistent downstream archive matrix at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/reviews/prd-v1-adversarial-review.md:28-65`. The goal states that PRD v2 becomes the implementation source of truth at `/Users/arun.prakash/.codex/attachments/3a115369-f879-4661-8900-269defa7d59a/goal-objective.md:334-380`.
**Why it matters:** The database/API/UI plan is already choosing taxonomy, summary DTOs, grouping, tests, and archive regression scope before the authoritative product contract exists.
**Failure mode:** Engineering implements AI topics and weekly-only summaries, then PRD v2 chooses generated tags/category or a required Today surface; archive badge/query behavior also changes after code and tests are built.
**Recommendation:** Make accepted PRD v2 a hard M0 dependency. Parameterize the plan's taxonomy and metric surface as unresolved until v2. Import the final row-level archive matrix verbatim into technical v2 and map every row to queries, DTOs, and tests.

#### 2. The proposed event table cannot satisfy the promised mutation-outcome and replay contract

**Evidence:** The only durable mutation receipt described is the event row with unique `mutation_id` and `request_fingerprint` at technical v1 lines 164-180. Same-state Move must create no event or version at `:241-249`. Yet the mutation lookup claims it can return `accepted/rejected/unknown` at `:291-300`, and CAS logic claims changed mutation-ID reuse is rejected at `:318-330`. No durable mutation-receipt table or storage rule exists for accepted no-ops, eligibility rejection, 409, expired Undo, or other terminal non-event outcomes.
**Why it matters:** Exact replay comparison requires the first request fingerprint and outcome to exist. An event-only receipt model stores only accepted state-changing mutations.
**Failure mode:** A same-state request succeeds without an event, loses its response, and lookup reports unknown. The same mutation ID can then be reused with a different payload because no fingerprint was persisted. A rejected request likewise cannot be distinguished from one never received, contradicting the API contract and potentially causing a later retry to be handled differently.
**Recommendation:** Add a content-free `item_workflow_mutations` receipt table or narrow the contract honestly. Persist mutation ID, item/action scope, canonical fingerprint, terminal outcome class, accepted event/version when any, timestamps/expiry, and safe rejection code in the same transaction as state changes. Define retention, hard-delete behavior, privacy, no-op receipts, rejection receipts, and lookup authorization. Test lost responses for accepted change, accepted no-op, 409, ineligible action, expired Undo, and changed-payload reuse.

#### 3. Readiness combines deep audits with request gating and can become an availability defect

**Evidence:** Writes require a green readiness check at technical v1 lines 372-380. Readiness includes global missing-event/invariant scans, enrollment consistency, `quick_check`, and `foreign_key_check` at `:382-390`. The database is a single SQLite writer with a 5-second busy timeout at `:318-332`; 50k performance gates expect mutation transactions at p95 <=250 ms at `:424-439`. The plan does not define readiness cadence, caching, invalidation, cost budget, or a cheap request-path signal.
**Why it matters:** Full quick/FK and projection-to-event scans are deployment/audit operations, not safe per-mutation prerequisites. Running them synchronously can dominate latency, increase lock pressure, and make every write unavailable as data grows. Caching them indefinitely creates the opposite problem: stale green status.
**Failure mode:** Production writes repeatedly scan the DB, exceed latency/busy budgets, and trigger fail-closed behavior during healthy load; or a cached green result misses a newly corrupted row and falsely authorizes writes.
**Recommendation:** Split readiness into tiers: boot/deploy deep audit; cheap request-path checks based on schema/version/guard manifest and a transactionally maintained integrity epoch; incremental post-write assertions for the affected item/event; periodic authenticated deep audit with last-success age and failure latch. Define budgets, cadence, invalidation, startup behavior, and exact flag/no-go responses. Prove deep audit and hot-path costs separately at 50k.

#### 4. Per-status Board pagination is incompatible with approved non-status grouping

**Evidence:** Technical v1 requires one Board cursor per workflow status at lines 270-287 and `GET /api/processing/items` returns one status page at `:291-300`. It also supports Board grouping by primary User tag, primary AI topic, source type, capture channel, quality, capture age, and no grouping at `:266-268`. Source UX v2 says non-status grouping changes the visible grouping and mobile Board shows one selected group at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/ux/ux-ui-v2.md:257-285`. Grouping already-paginated per-status rows in the client cannot produce complete group counts, stable group pages, or a reliable selected group at 50k.
**Why it matters:** Pagination must follow the visible grouping key or explicitly limit grouping to loaded rows. The current plan promises global query/count truth while architecting only status partitions.
**Failure mode:** A tag group appears empty because matching cards are beyond hidden status cursors; Load more behaves by status rather than visible group; mobile selected-group counts are wrong; concurrent taxonomy changes duplicate or omit cards.
**Recommendation:** Define the Board data model per grouping mode. Either restrict v1 Board columns to Workflow status and offer other grouping only in List, or add group metadata/count queries and independent keysets per visible group with bounded group cardinality/overflow behavior. Specify primary-tag/topic null/rename/delete semantics, capture-age boundary behavior, URL/cursor binding, and 50k acceptance fixtures.

### P2 - Medium Risk

#### 1. Cross-column and event-link invariants remain mostly advisory

**Evidence:** Technical v1 explicitly avoids rebuilding `items` and leaves cross-column invariants to repositories and the insert guard at lines 128-162. The raw guard only matches default version-0 inserts at `:203-212`; a raw or buggy insert supplying partial workflow fields can bypass it. Event design names a unique Undo target but does not require a self-foreign-key or explicit orphan-target audit at `:164-180`; append-only behavior is not enforced against direct update/delete except through convention.
**Why it matters:** Current code contains many direct SQL updates to `items`; future scripts and migrations can bypass the workflow repository. Readiness detects some corruption after commit but does not prevent it.
**Failure mode:** An item commits at version 1 without its event, an Undo references a missing event, or direct SQL alters history. Reads fail closed later, but the corrupt state already exists.
**Recommendation:** Define the maximum safe DB-enforced invariant set using focused UPDATE/INSERT guard triggers, self-FK/target checks where compatible with hard-delete cascade, and post-transaction affected-item assertions. Add explicit corrupt-row injection tests and an audited repair path; do not claim the guard covers arbitrary partial workflow inserts.

#### 2. Enrollment job lifecycle is incomplete under deletion, expiry, cancellation, and concurrent taxonomy/time changes

**Evidence:** Technical v1 introduces job/item tables and says deletion is “handled explicitly” at lines 182-186, but does not define FK action, preview expiration, abandoned-job cleanup, cancellation, re-preview rules, or whether confirmation timestamp/timezone freezes the recent-30-day boundary. Tests at `:453-465` cover interruption/resume but not these lifecycle cases.
**Why it matters:** Resumable all-history enrollment can outlive the request and race hard delete or later enrollment. Frozen target truth and privacy cleanup must remain exact.
**Failure mode:** Progress counts never complete after an item is deleted; stale previews remain confirmable; orphan item IDs survive hard delete; two jobs enroll the same item with conflicting progress; cleanup holds a long writer lock.
**Recommendation:** Specify job state machine, TTL, confirmation/cancellation, FK/cascade behavior, concurrent-job exclusion, item-deleted outcome, bounded cleanup batches, and stable preview boundary. Test two jobs, hard delete before/during confirmation, expired preview, restart, cancellation, and cleanup at 50k.

#### 3. Timezone computation and update concurrency are not implementation-safe yet

**Evidence:** Technical v1 proposes a typed settings key and built-in `Intl` unless tests justify a library at lines 342-360 and `:484-489`. JavaScript `Intl` does not directly construct an instant from an arbitrary zoned local time; the plan itself asks whether ambiguous/skipped local times are correct at `:551-564`. The timezone PUT has no version/idempotency or concurrent first-initialization rule at `:304-316`.
**Why it matters:** Local midnight transitions, concurrent device initialization, and timezone changes can alter Today/week buckets without event changes.
**Failure mode:** DST or midnight-transition zones compute wrong UTC boundaries, or two devices race and silently replace the owner's timezone while metrics re-bucket unexpectedly.
**Recommendation:** Define one tested zoned-time algorithm/library decision before implementation, version the owner preference, make first initialization compare-and-set, return current truth on conflict, and test ambiguous/skipped midnight plus concurrent device updates. Align the final Today surface with PRD v2.

#### 4. Rollback and observability are intentions rather than executable operator contracts

**Evidence:** Current deployment does not retain/switch a named prior application release, according to `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/current-state-report.md:205-214`. Technical v1 says to retain a known-good artifact at `:492-510` but names no artifact format, location, checksum, restoration command, native dependency handling, or proof. Observability lists counters and “sustained p95” thresholds at `:410-422` without a collection window, persistence, alert route, or operator response.
**Why it matters:** Rollback and alerts must work under failure, not merely appear in a plan.
**Failure mode:** Flags turn off but old code cannot be restored reproducibly; native SQLite dependencies mismatch; a p95 regression is logged but never noticed; production smoke creates state without a cleanup/identification record.
**Recommendation:** Technical v2 must define the named artifact/checksum/restore commands, flag snapshot, compatibility matrix, rehearsal transcript, smoke fixture IDs/cleanup, alert windows, notification destination, and operator runbook. Treat restore-from-DB as destructive last resort with explicit post-snapshot loss accounting.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

- It assumes an unapproved v1 product contract can safely determine schema/API/grouping scope.
- It conflates accepted state-change events with a complete durable mutation receipt ledger.
- It treats deep integrity scans and request-path readiness as one mechanism.
- It assumes client-side presentation grouping can remain truthful over independently paginated status partitions.
- It overstates raw-insert defense for callers that supply non-default partial workflow fields.
- It describes resumable enrollment without a complete durable job lifecycle.
- It treats timezone and rollback correctness as test details instead of explicit algorithms/operator contracts.

## Missing Validation

- Accepted PRD v2 traceability for AI taxonomy, Today/week metrics, archive matrix, state counts, and timed Undo.
- Durable lookup/replay fixtures for accepted changes, accepted no-ops, rejected actions, 409, expired Undo, and unknown requests.
- Separate hot-path readiness and deep-audit performance/concurrency measurements.
- Non-status Board group counts/pages/cursors under 50k, taxonomy mutation, and capture-age boundary changes.
- Partial-field raw insert, corrupt event link, direct history mutation, and repair rehearsal.
- Enrollment deletion/expiry/cancel/two-job/restart/cleanup tests.
- Zoned-midnight algorithm proof and concurrent timezone preference tests.
- Executable known-good artifact rollback and observed alert-response rehearsal.

## Revised Recommendations

1. Block technical implementation until PRD v2 is accepted.
2. Add a durable, content-free mutation receipt model or narrow the outcome API.
3. Split readiness into hot-path, incremental, periodic, and deployment tiers.
4. Re-architect Board pagination around the selected visible grouping model.
5. Strengthen DB invariants and accurately state raw-guard limits.
6. Complete enrollment, timezone, observability, and rollback state machines/runbooks.

## Go / No-Go Recommendation

**No-go for migration/API/UI implementation from technical v1. Conditional go for technical v2 revision.** Technical v2 may become the engineering source of truth only after the four P1 findings are closed, each P2 has executable acceptance evidence, and it is consistent with accepted PRD v2 and UX/UI v2.

## Plan Revision Inputs

### Required Deletions

- Delete PRD v1 as the implementation product contract.
- Delete the claim that event rows alone support rejected/no-op mutation lookup.
- Delete any implication that full integrity/quick/FK checks run safely on every write.
- Delete non-status Board grouping backed only by per-status pages.
- Delete claims that the raw guard covers arbitrary partial workflow inserts.

### Required Additions

- Add PRD v2/UX v2 dependency and traceability gates.
- Add mutation receipt schema, lifecycle, privacy, and hard-delete semantics.
- Add tiered readiness architecture and budgets.
- Add grouping-specific query/count/cursor contracts.
- Add DB invariant/repair, enrollment lifecycle, timezone concurrency, rollback, and alert runbooks.

### Required Acceptance Criteria Changes

- Require exact replay/outcome evidence for every terminal mutation class.
- Require hot-path readiness p95 separately from deep-audit completion/cadence.
- Require complete visible-group counts and pagination, not grouping of loaded rows.
- Require partial raw insert/corruption rejection or fail-closed repair evidence.
- Require enrollment lifecycle and concurrent timezone fixtures.
- Require a successful old-artifact rollback rehearsal with checksums and post-rollback capture proof.

### Required Validation Changes

- Run 50k mutation/readiness contention benchmarks.
- Run group-mode-specific pagination under concurrent status/taxonomy changes.
- Inject trigger ID collisions, event failures, partial workflow inserts, orphan Undo links, and DB busy errors.
- Exercise every ingestion path new/duplicate/repair under normal, nested Recall, raw guard, and old-code rollback.
- Verify private/no-store/session-only/bearer-denied behavior for every endpoint.
- Verify DST/midnight/timezone races, production flag sequencing, alerts, forward repair, and destructive restore accounting.

### Required No-Go Gates

- PRD v2 or UX/UI v2 remains unresolved or inconsistent with technical v2.
- Mutation lookup cannot distinguish accepted change/no-op/rejected/unknown durably.
- Deep readiness work is on the synchronous request path without proven budget.
- Any supported grouping lacks complete bounded server pagination/count semantics.
- New/old/raw capture can commit without exactly one valid projection and initialization event.
- Any private endpoint accepts bearer-only access, shared caching, unbounded input, or content-bearing logs/events.
- Enrollment, metrics/DST, 50k scale, rollback artifact, alerting, or production smoke evidence is missing.

## Residual Risks

Even after revision, SQLite remains single-writer and writer contention can still degrade captures and workflow mutations. A permanent raw guard improves rollback safety but increases trigger coupling. HMAC cursor rotation invalidates navigation state, taxonomy mutation can reshuffle visible groups, and retained-item metrics can decrease after hard delete. Production has only 129 retained items, so synthetic 50k results remain necessary but hardware-specific; they cannot replace live staged monitoring.
