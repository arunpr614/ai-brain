# Kanban Card Processing v2 — cross-artifact consistency review

**Created:** 2026-07-12
**Reviewer:** Coordinator synthesis after independent PRD/UX/technical v1 adversarial reviews
**Targets:** `product/prd-v2.md`, `ux/ux-ui-v2.md`, `technical/technical-plan-v2.md`, decision/migration/release/rollback companions

## Executive verdict

**Go for implementation; no-go for release until the recorded implementation, QA, accessibility, security, migration, rollback, and production gates pass.**

The three v2 sources agree on the feature model, visible behavior, storage/API contracts, accessibility posture, and rollout boundary. Every P0/P1 finding from the three v1 reviews has a concrete v2 disposition. No unresolved cross-artifact contradiction requires another product decision before implementation.

This is not a claim that the feature is implemented, tested, deployed, or production-ready.

## Evidence inspected

- [PRD v2](../product/prd-v2.md), including its nine-finding disposition and 61 acceptance criteria.
- [UX/UI v2](../ux/ux-ui-v2.md), including the source-to-product mapping and 21 UX acceptance criteria.
- [Technical plan v2](../technical/technical-plan-v2.md), including eight technical-review dispositions and final engineering acceptance.
- [PRD v1 review](prd-v1-adversarial-review.md), [UX v1 review](ux-ui-v1-adversarial-review.md), and [technical v1 review](technical-plan-v1-adversarial-review.md).
- [Source-conflict report](../discovery/source-conflict-report.md), [decision log](../decisions/decision-log.md), [migration plan](../technical/migration-plan.md), [release plan](../release/release-plan.md), and [rollback plan](../release/rollback-plan.md).
- Latest-main/current-production discovery and visual/browser evidence under `discovery/` and `qa/baseline-verification.md`.

## Cross-artifact contract matrix

| Contract | Product v2 | UX/UI v2 | Technical v2 | Disposition |
|---|---|---|---|---|
| Authority | V2 only after review | V2 replaces review draft | V2 is engineering truth | Aligned |
| Identity | Extend `items`; never SRS `cards` | Existing source/detail remain canonical | Projection on `items` + events/receipts | Aligned |
| States | Inbox/To Do/In Progress/Done, any-to-any, no-op | Native Move everywhere | Validated transition service + projection triggers | Aligned |
| New capture | Genuine new identity transactionally Inbox; duplicates preserve | Capture feedback only for genuine new identity | Central transaction + permanent raw guard + preservation matrix | Aligned |
| Legacy | Dormant; explicit selected/recent-25/all enrollment | Full preview/progress/recovery states | Durable frozen job lifecycle with TTL/CAS/batches | Aligned |
| Inbox ordering | Current-entry ASC + ID | Process next/Inbox use exact query; prototype defect rejected | Indexed projection/keyset | Aligned |
| Current Done vs Completed | Latest current Done projection; first lifetime event metric | Done order and metric copy stay distinct | `workflow_completed_at` current projection + effective event query | Aligned |
| AI filter | AI Topics only; auto tags/category excluded | Separate User tags/AI Topics, explicit No values | Stable topic IDs, negative auto-tag/category tests | Aligned |
| Counts | Four filtered status counts + unfiltered Inbox total | Exact typed scope at page/group/status headings | Shared normalized predicate; page-independent aggregates | Aligned |
| Daily/weekly metrics | Visible Processed/Completed Today + week; Added week | Three calm regions/rows with timezone disclosure | Exact owner-local half-open intervals via Temporal polyfill | Aligned |
| Group/sort | Accepted comprehensive options; no manual rank | Canonical primary membership, bounded group selection | Server group descriptors/global per-group keysets; no client regrouping | Aligned |
| Board mobile | One selected status/group | Four status buttons; dynamic groups use bounded selector/dialog | Bounded group metadata/page API | Aligned |
| Archive | Done-only Processing attribute + exact matrix | Archive/Restore/Reprocess copy/focus | Matrix-specific DTO/query regression; no unrelated exclusion | Aligned |
| Detail/notes | Canonical route; independent note lifecycle | Existing desktop rail/mobile Overview/Notes placement; no remount | Separate workflow component/domain and validated return context | Aligned |
| Mutation truth | CAS, terminal receipts, outcome lookup | Pending/failure/conflict/unknown/reconciled states | Durable receipts for effective/no-op/rejected/conflicted/expired outcomes | Aligned |
| Undo | 30-second minimum, one most-recent per tab, permanent reversal | Exact replacement/focus/timing behavior | Durable tab slot/CAS/replay/current truth | Aligned |
| Pagination/place | Bounded keyset/conditional virtualization | Load-more/seek/error/end/unloaded focus | HMAC cursors, epochs, seek-by-anchor/group endpoints | Aligned |
| Offline | Loaded reads only; writes disabled; no queue | Cache/no-cache/reconnect states | No mutation outbox; outcome reconciliation first | Aligned |
| Private APIs | Session-only, private/no-store, bearer negative | No exposure or false cache state | Explicit handler auth, exact origin for writes, cache headers/limits | Aligned |
| Readiness | Fail closed; deep evidence before flags | Honest unavailable states | Deep deploy/periodic audit separated from O(1) hot checkpoint | Aligned |
| Accessibility | WCAG 2.2 AA/manual AT gates | Native semantics/focus/live regions/zoom/themes/touch | No drag/virtualization dependency before proof | Aligned |
| Rollout/rollback | Flagged staged release and live verification | Nav/read/write state copy remains truthful | Known-good checksum/ABI artifact, flags-first, forward repair, destructive restore last | Aligned |

## V1 finding closure

### Product review

- Premature v1 authority removed.
- AI-generated taxonomy and daily metrics explicitly resolved.
- Full archive matrix supplied.
- Private reads/cache contract supplied.
- First completion and latest Done projection separated.
- Production baseline, rapid Undo, timing accessibility, exact counts, and conditional virtualization incorporated.

### UX review

- Premature authority removed.
- 30-second rapid-action Undo ownership and permanent reversal specified.
- Group membership/count/pagination algorithm specified.
- Process next defined from every view/state with explicit Select control.
- Seek/load/end/error and conditional virtualization focus defined.
- Current desktop/mobile detail placement defined without note remount.
- High-cardinality mobile groups use a bounded selector.
- Verified disclosure/dialog primitives and missing operational states supplied.
- More/Library/capture discovery specified.
- Malformed/prototype-only captures are not pixel authority.

### Technical review

- PRD v2/UX v2 are hard dependencies.
- Durable terminal receipts cover no-op/rejected/conflicted/expired outcomes.
- Deep readiness is off request paths; hot gating is O(1).
- Non-status grouping uses global group metadata/per-group keysets.
- Projection/event/receipt/Undo invariants and repair evidence strengthened.
- Enrollment/timezone/rollback/alert lifecycles are executable.

## Minor implementation clarifications (not blockers)

1. Technical API group-metadata maximum is 20; UX desktop should request/render 10 at a time. The server maximum and client default are compatible and must be constants with tests.
2. `@js-temporal/polyfill` is a reviewed new dependency; lockfile/security audit evidence is required before merge.
3. Desktop Group & sort may use native `details`; if outside-click/Escape behavior becomes custom, it must pass focus-return tests. Do not add a popover dependency merely for prototype parity.
4. Pointer drag and virtualization are initially off. Their code should not enter the first release unless the conditional gates actually pass.

## Implementation no-go gates

Implementation must stop and reopen v2 if:

- migration 025 cannot atomically initialize every current/nested/raw creation path;
- a receipt/event/projection invariant cannot be enforced or audited without unsafe request-path work;
- group/count/page truth requires client regrouping of partial data;
- the current item detail cannot add workflow controls without remounting/changing My notes;
- the 30-second slot/permanent reversal model cannot pass keyboard/AT evidence;
- production rollout cannot preserve a verified known-good artifact and flags-first containment;
- an approved requirement would otherwise be silently deferred.

## Go / no-go recommendation

**Implementation may start from the aligned v2 package.** Release remains no-go until every acceptance criterion is traced to code, automated evidence, manual evidence, residual risk, and production verification.
