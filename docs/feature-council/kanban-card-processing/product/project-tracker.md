# Kanban Card Processing — project tracker

**Updated:** 2026-07-12
**Goal:** implement, release, and live-verify Kanban Card Processing in production, then update repository documentation and GitHub Wiki
**Branch/worktree:** publication-record branch `codex/record-kanban-wiki-publication` in the dedicated Kanban worktree
**Current product status:** complete — application `ea7b159515fc37f76ffdb83dedf2d33d17f9a193` is deployed and live-verified; the synthetic fixture and every dependent row/vector were removed; PR #29 merged the closeout sources; Wiki commit `10a3e2b66bffbf362ffc87596d29fa5adb65b9f1` is published and fresh-clone/live-URL verified

## Status legend

- **Complete:** exit evidence exists in this worktree.
- **In progress:** active work/evidence incomplete.
- **Pending:** not started or not yet evidenced.
- **Blocked:** cannot proceed without an external dependency; none recorded at this update.

## Current production baseline

Read-only checks on 2026-07-12 found the service active on Node 22.22.3, authenticated loopback health `{ok:true}`, a 7,520,256-byte SQLite database with 129 retained items and 26 applied migrations through `024_recall_manual_sync.sql`, clean quick/foreign-key checks, and approximately 30,362,880 KB free. No production content or state was read/changed. This is current health/shape evidence, not feature, migration-capacity, release, or live-UX proof (`qa/baseline-verification.md`, “Production read-only baseline” and “Interpretation”).

## Milestone tracker

| Milestone | Status | Accountable role | Exit criteria | Evidence / next action |
|---|---|---|---|---|
| M0 — Clean worktree and governance | Complete | Coordinator | Correct origin, clean dedicated branch/worktree, goal and `AGENTS.md` read, file ownership assigned. | Origin `arunpr614/ai-brain`; branch `feat/kanban-card-processing`; root `AGENTS.md` inspected. |
| M1 — Full artifact/repository/wiki/production discovery | Complete | Coordinator + discovery specialists | Recursive artifact inventory; HTML desktop/mobile interaction evidence; current-state/code map; standalone source-conflict report; latest-main/wiki and read-only production baseline. | `discovery/current-state-report.md`; `discovery/relevant-code-map.md`; `discovery/source-conflict-report.md`; screenshots; `qa/baseline-verification.md`. Production feature behavior remains unverified by definition. |
| M2 — Product v1 review and PRD v2 source of truth | Complete | Expert PM / Product council + coordinator | PRD v1 reviewed; every finding disposed in PRD v2; decisions/tracker updated; UX/UI v2 and technical-plan v2 explicitly consistent before implementation. | `product/prd-v2.md` and `reviews/v2-consistency-review.md`. |
| M3 — UX/UI v2 and technical architecture/migration v2 consistency | Complete | UX lead + technical architect + data/migration specialist | UX and technical v2 match PRD v2 on AI Topics, visible Today/week metrics, exact archive matrix, private reads, current Done projection, 30-second tab Undo, exact counts, conditional virtualization, schema/events/indexes/flags/rollback. | `ux/ux-ui-v2.md`, `technical/technical-plan-v2.md`, and migration/release/rollback plans. |
| M4 — Persistence and domain implementation | Complete | Implementation lead | Migration, workflow repository, initialization, enrollment, metrics, archive, CAS/history/Undo, private query APIs, and tests land behind disabled flags. | `technical/implementation-report.md`; migration/domain/query/route tests. |
| M5 — Inbox and canonical detail integration | Complete | Implementation lead + UX/accessibility | Processing route/nav, Inbox loop, native Move, exact pending/failure/conflict/unknown/Undo, canonical detail/notes independence/return, mobile entry. | `/processing`, shared controls, detail/navigation integrations, local visual evidence. |
| M6 — Board/List/Archived and scale behavior | Complete | Implementation lead + UX | Shared filters/counts/Group & sort, Board/List parity, archive/restore/reprocess, per-status cursor, responsive mobile, optional gated drag. | Board/List/Archived shipped in candidate; drag remains intentionally off; performance evidence passes. |
| M7 — Automated quality gates | Complete | QA/reviewer + security/data specialists | Every-ingestion, migration, order, filters/counts, metrics/DST, archive matrix, concurrency/replay/Undo, hard delete, auth/privacy, performance, regression tests green. | `qa/verification-report.md`: 880 tests/93 suites, independent security GO, all build/smoke/performance gates green. |
| M8 — Manual UX/accessibility/production-size validation | Complete | UX + accessibility + QA | Real Library/More discovery; 320/390/mobile tasks; keyboard/semantic/focus/zoom/reflow/contrast/reduced motion; 10k/50k DB rehearsal. | Authenticated Library/More/command-palette discovery, desktop/mobile visual and keyboard tasks, 320/390 44px/no-overflow measurements, semantic/live-region/focus evidence, and 10k/50k pass. Physical NVDA/VoiceOver/TalkBack/switch speech/hardware remains explicitly documented manual-device coverage, not a claim from browser automation. |
| M9 — Adversarial review and v2 consistency | Complete | Adversarial reviewer + coordinator | Product v1 challenged and PRD v2 dispositions verified; UX/technical v1 challenged; all v2 artifacts cross-consistent; requirements traceability updated; no unresolved P0/P1. | Three v1 reviews, v2 consistency review, and remediated implementation security/adversarial review. |
| M10 — Controlled rollout and observability | Complete | Release/observability lead | Backup/readiness verified; flag rollout; operational logs/timer; rollback exercised; trust boundaries checked. | Bound backup, production-copy rollback, immutable candidate/known-good attestations, dark deploy, Stage A/B/C windows, timer, journals, deep audit, integrity and FK evidence passed. |
| M11 — Production release and live verification | Complete | Release lead + coordinator | Deployed through normal safeguards; live owner flow verified for capture→Inbox→Move→Done→Archive/Restore/Undo; errors/counts inspected; synthetic removed. | Deployed flow passed API/domain and authenticated desktop/mobile browser paths. Cleanup returned production to 129 retained items with zero synthetic dependents, a one-vector delta, quick check `ok`, foreign keys zero, and a successful app-SHA-bound installed audit. |
| M12 — Documentation/wiki closeout | Complete | Coordinator + documentation owner | Repository docs/wiki/status catalog/migrations/API/operations/rollback current and publication verified. | PR #29 merged as `2760837`; the concurrency-checked 86-page Wiki published as `10a3e2b`, fresh-cloned byte-for-byte, passed privacy/structure/reachability, and returned expected rendered live pages. |

## Product workstream tracker

| Workstream | Baseline decision | Status | Delivery gate |
|---|---|---|---|
| Information architecture | Desktop Library peer; mobile More + Library summary + capture feedback; clean Inbox landing. | Defined | Real mobile discovery; promote if >20% fail unaided. |
| Workflow lifecycle | Four states, any-to-any, no-op same state, current-entry episodes. | Defined | Projection/event/move/order tests. |
| Existing items | Dormant baseline; selected/recent-30d capped 25/all explicit enrollment. | Defined | Exact preview/idempotency/migration tests. |
| New capture | Transactional enrolled Inbox; duplicates/repair preserve lifecycle. | Defined | Every-ingestion and raw-insert integrity matrix. |
| Ordering and completion | Inbox current-entry ASC; current Done ordering uses `workflow_current_done_entered_at`; first-lifetime Completed derives from events; no manual rank. | Defined in PRD v2; consistency pending | Transition/Undo/cursor/tie/metric fixtures and UX/technical v2 naming. |
| Group & sort | Shared compact accepted control; no fixture/custom rank; non-status grouping never moves status. | Defined | Stable-ID URL/query parity and task test. |
| History/concurrency | Typed content-free events; CAS; current-truth replay/outcome lookup. | Defined | Two-tab/lost-response/replay-after-later-mutation tests. |
| Undo | One most-recent eligible reversible action per tab; 30-second minimum server/visible window; confirmation-based supersession; permanent native reverse paths; no Undo-of-Undo. | Defined in PRD v2; consistency pending | Rapid same/different item/tab, before/at/after, superseded, replay, conflict, keyboard/AT/switch tests. |
| Archive | Done-only `workflow_archived_at`; Restore Done; atomic Reprocess Inbox; authoritative row-by-row include/badge/action/query/regression matrix. | Defined in PRD v2; consistency pending | Every matrix row passes without unrelated retrieval changes. |
| Metrics | Capture-only Added; episode Processed; first-lifetime Triaged/Completed; exact visible Today + week-to-date Processed/Completed; retained items. | Defined in PRD v2; consistency pending | Numeric API/UI truth table, neutral-pressure review, Undo/delete/calendar cases. |
| Calendar | Owner IANA timezone, UTC storage, Monday local week, half-open DST-aware windows. | Defined | Midnight/Monday/DST/timezone-change fixtures. |
| AI taxonomy and counts | Manual User tags + **AI Topics** only; exclude auto tags/scalar category; OR/AND; exact zero-filled total/matching maps for all four states; archive separate. | Defined in PRD v2; consistency pending | Taxonomy negative fixtures and multi-filter/page-independent SQL/UI parity. |
| Board/List parity | Same single-item tasks/trust/filter/count/return contract. | Defined | Desktop/mobile E2E and accessibility. |
| Private reads | Every Processing read/write/outcome/enrollment/workflow endpoint session-only, bearer-negative, dynamic private/no-store, cookie-varying, bounded/content-safe; exact-origin writes. | Defined in PRD v2; consistency pending | Credential/cache/allow-list/enumeration/limit/error negative matrix. |
| Large backlog | Bounded keyset pages, per-status cursors, aggregate counts; virtualization selected only if measured and evidence follows the implemented virtualized/non-virtualized branch. | Defined in PRD v2; consistency pending | 10k/50k plans/p95 plus selected DOM/memory/focus/AT branch. |
| Mobile | Linear Inbox/List, one-status Board, native Move, 44px, safe-area. | Defined | 320/390/real-device/AT/fixed-nav tests. |
| Scope guard | No batch, rank, offline queue, PM fields, collaboration, or global archive. | Defined | Diff/review audit each milestone. |

## Dependency register

| ID | Dependency | Needed by | Owner | Status / action |
|---|---|---|---|---|
| DEP-01 | Latest `main`, Wiki, and current production reconciliation | M2/M3/M4 | Coordinator | Complete for baseline `5b92e68` and read-only production check; refresh before deployment. |
| DEP-02 | Full current ingestion inventory and raw-insert paths | M3/M4/M7 | Data specialist | Discovery complete; final technical v2 must convert it into implementation/test contracts. |
| DEP-03 | Feature-flag and production rollout conventions | M3/M10 | Architect/release | Complete: default-off three-stage gates, strict readiness, timer, attested immutable deployment and rollback. |
| DEP-04 | Production-size anonymized/safe database snapshot or realistic generator | M3/M8 | Data/release | Complete: deterministic 10k/50k generator plus content-free isolated current-production-copy migration/restore/resume/lock rehearsal. |
| DEP-05 | Existing note/detail navigation contracts on latest main | M5/M7 | Implementation/QA | Preserve draft/conflict behavior and feature policy. |
| DEP-06 | Manual accessibility test environment | M8 | Accessibility | NVDA, VoiceOver, TalkBack, switch, zoom/reflow evidence. |
| DEP-07 | Production deployment access and normal approvals | M10/M11 | Release | SSH/authenticated health read access verified; deployment authority exists in goal; execute only after merge/attestation. |
| DEP-08 | GitHub Wiki publication access | M12 | Coordinator/docs | Verify live page after update. |
| DEP-09 | PRD v2 ↔ UX/UI v2 ↔ technical-plan v2 consistency record | M2/M3/M4 | Coordinator + UX/technical leads | Complete: `reviews/v2-consistency-review.md`. |

## Risk register

| ID | Risk | Likelihood / impact | Early signal | Mitigation / gate | Owner |
|---|---|---|---|---|---|
| R-01 | A creation path bypasses Inbox initialization. | M / Critical | Enrolled new item missing projection/event. | Atomic app transaction, DB guard, startup integrity query, every-ingestion fixtures; fail Processing closed. | Data/implementation |
| R-02 | Legacy migration creates surprise debt or long startup/WAL pressure. | M / High | Huge visible Inbox, boot delay, WAL/disk spike. | Dormant baseline, explicit preview/enrollment, bounded resumable job, backup/free-space rehearsal. | Data/release |
| R-03 | Duplicate/repair/replay resets status/archive. | M / High | Reappearing archived/done source. | Identity-reuse tests across URL/Recall/transcript/repair/enrichment. | QA/data |
| R-04 | Stale replay or concurrent tab overwrites newer truth. | M / Critical | Card snaps back after retry/broadcast. | CAS, immutable receipt + current projection, outcome endpoint, replay-after-later-mutation E2E. | Architect/QA |
| R-05 | Rapid or timed Undo differs across UI/server/tab/metrics or excludes AT users. | M / High | Wrong action offered; superseded target accepted; user cannot reach Undo. | 30-second minimum, server tab slot, confirmation supersession, current-truth responses, permanent reversals, rapid/timed AT fixtures. | Implementation/QA/accessibility |
| R-06 | Archive is perceived as deletion or alters retrieval. | M / High | Source disappears or one surface lacks disclosure. | Authoritative row matrix, exact row regressions, Restore/Reprocess distinction, hard delete separate. | Product/QA |
| R-07 | Today/week metrics reward churn, create pressure, or use wrong timezone. | M / High | Moves inflate values; judgmental UI; midnight mismatch. | Capture-only Added, episode ID, first-lifetime Completed, neutral Today, IANA/Monday/DST fixtures, retained-item disclosure. | Data/product |
| R-08 | One or more four-state counts diverge from loaded/filter results. | M / High | Missing zero key, wrong To Do/Done count, or page length used as total. | Exact zero-filled total/matching maps, one normalized predicate, aggregate SQL independent of cursor, multi-filter/page fixtures. | Implementation/QA |
| R-09 | Large backlog causes unbounded payload, slow query, or focus loss. | H / High | DOM/memory growth, >p95, focus disappears on move. | Bounded DTO/keyset pages, indexes/query plans, conditional virtualization, 50k/manual focus gates. | Architect/QA |
| R-10 | Processing is hidden on mobile. | M / Medium | >20% unaided discovery failure. | More + Library summary + capture feedback; promote to primary nav at threshold. | Growth/UX |
| R-11 | Backlog presentation creates guilt/avoidance. | M / Medium | Dogfood avoids Processing or reports pressure. | Explicit enrollment, neutral copy, weekly health, no streak/red/overdue/confetti. | Growth/product |
| R-12 | Workflow action loses or implicitly saves note draft. | L / Critical | Note content changes on Move/return. | Independent endpoints/versioning; navigation guard; notes regression and offline/conflict tests. | Implementation/QA |
| R-13 | Drag/virtualization excludes keyboard or AT users. | H / High | Move impossible, focus/announcement failure. | Native Move primary; drag off until complete manual gates. | Accessibility/UX |
| R-14 | Accepted prototype-only “Custom fixture order” leaks into production. | M / Medium | Unexplained sort/default or hidden rank. | Decision KCP-008; replace with Workflow default; diff/UX copy review. | Product/UX |
| R-15 | Scope expands into project management. | M / High | Rank/batch/dates/assignees enter critical path. | Enforce deferred list and requirements traceability at every review. | Coordinator/PM |
| R-16 | Optional analytics leaks content. | L / Critical | Event contains title/URL/note/free-form error. | Typed allow-list only, payload property tests, local default, no generic JSON. | Security/data |
| R-17 | Production state differs from local/CI evidence. | M / Critical | Live capture/move/count fails after deploy. | Flagged rollout, backup/readiness, live smoke flow, error/count inspection, rollback. | Release/coordinator |
| R-18 | UX/UI or technical v2 silently retains exploratory 10s Undo, ambiguous taxonomy, weekly-only UI, generic archive, or non-private reads. | M / Critical | Cross-artifact terms/ACs disagree. | DEP-09 hard gate and consistency/adversarial report before implementation. | Coordinator/UX/technical |

## Assumption register

| ID | Assumption | Consequence if false | Verification owner / timing |
|---|---|---|---|
| A-01 | Production is private single-owner with current auth/session conventions. | Authorization/data model must expand before writes. | Architect · M3 |
| A-02 | Stable manual-tag and AI-topic IDs can back URL/query filters. | Add stable identifiers/migration before filter release. | Data/implementation · M3/M4 |
| A-03 | All current genuine creation can be covered through repository transaction plus raw-insert guard. | Additional adapter/trigger work and gate expansion. | Data specialist · M3 |
| A-04 | Current detail/notes can add workflow controls without remounting editor. | Detail integration design must change; Inbox can still ship independently behind flag. | Implementation/UX · M5 |
| A-05 | 50k fixture is a conservative scale ceiling for first-owner release. | Raise test volume/budgets while retaining bounded reads. | Release/data · M8 |
| A-06 | Current deployment supports feature flags/readiness checks and rollback. | Establish minimal safe flag mechanism before M10. | Release/architect · M3 |

## Open validation register

| ID | Open validation | Safe default | Deadline / action |
|---|---|---|---|
| O-01 | Processing/Inbox/Queue comprehension | Processing | Moderated test before broad rollout; does not block backend work. |
| O-02 | Real mobile More + Library discovery | Two visible paths | Test by M8; promote if >20% fail. |
| O-03 | Recent cap 25 suitability | Keep cap + All | Validate on real backlog during migration preview/dogfood. |
| O-04 | Visible Today + weekly metric pressure/usefulness | Weekly primary, Today neutral secondary | Four-week dogfood; change presentation but preserve required visibility/truth. |
| O-05 | Pointer drag readiness | Off | Enable only after M8 accessibility/focus pass. |
| O-06 | Quick preview value | Omit | Future experiment after core release. |

## Release evidence checklist

### Data and domain

- [ ] New capture initializes enrolled Inbox/version/event atomically for every named ingestion fixture.
- [ ] Duplicate/repair/replay/upgrade preserves status/version/archive/history.
- [ ] Legacy baseline is dormant; selected/recent-25/all preview and enrollment are exact/idempotent/resumable.
- [ ] Every active-state transition works; same-state is a no-op; deterministic order and tie-breaks pass.
- [ ] Event payload contains no prohibited content and hard delete cascades/recomputes correctly.

### Trust and recovery

- [ ] CAS conflict returns current truth; two tabs produce one winner.
- [ ] Exact replay after a later mutation cannot install stale state.
- [ ] Lost response resolves by mutation ID before retry.
- [ ] One-tab rapid A/B, multi-tab, superseded/replay, before/at/after 30s, version conflict, filter removal, metric reversal, and permanent native reversal pass.
- [ ] Offline disables mutation with honest copy; no queued-success claim.

### Product behavior

- [ ] Clean Inbox landing and Process next/Leave/advance/focus behavior.
- [ ] Board/List/Archived/detail parity for native single-item actions and trust states.
- [ ] User-tag/AI-Topic algebra, negative auto-tag/category fixtures, chips, unlabeled values, URL persistence, and exact zero-filled four-state counts pass.
- [ ] Every authoritative archive matrix row, Restore, Reprocess, duplicate matching, workers, search/Ask/detail/export/backup/delete passes.
- [ ] Note save/draft/offline/conflict behavior is unchanged by workflow.

### Metrics and scale

- [ ] Numeric API/UI truth table covers Today/week capture, enrollment, return/reprocess, episode exit, first Completed versus current Done ordering, archive/restore, Undo, failure, duplicate, and hard delete.
- [ ] Owner-local midnight, Monday boundary, DST, and timezone change pass with UTC events unchanged.
- [ ] 10k/50k unfiltered/filtered/tag/topic/archive/count/oldest/metrics plans and p95 meet budgets.
- [ ] Pagination/cursor invalidation and the selected conditional virtualized/non-virtualized evidence branch prove bounded payload/DOM, focus, memory, AT, and 50k behavior.

### Accessibility, security, and release

- [ ] Keyboard-only and source-specific native Move complete every task.
- [ ] NVDA, VoiceOver, TalkBack, switch, 200%/400%, text spacing, contrast, reduced motion, 320/390/fixed-nav pass.
- [ ] Session-only read/write, bearer-negative, private/no-store/Vary, cross-origin, allow-list, malformed enum/ID/body/cursor/mutation, enumeration, and error privacy tests pass.
- [ ] Flag/readiness, backup, rollout, observability, and rollback runbook verified.
- [ ] Production capture→Inbox→Move→Done→Archive/Restore/Undo smoke flow verified live.
- [ ] Repository docs and GitHub Wiki updated and publication verified.

## Immediate next actions

None for the release goal. Continue normal dogfood monitoring and separately schedule physical assistive-technology coverage when the relevant devices are available.

## Completion rule

Green local tests, a merged PR, or a deployed flag alone does not complete the goal. Completion requires successful production operation, live experience verification, and current repository plus GitHub Wiki documentation.
