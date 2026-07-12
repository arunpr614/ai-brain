# Kanban Card Processing — requirements extraction

**Date:** 2026-07-12
**Normalized authority:** execution goal → stakeholder-selected Direction B/handoff → reviewed source v2 → latest-main behavior

The executable normalization is `approved-requirements-baseline.md`; this file records the source-to-requirement extraction before PRD/UX/technical revision.

| Area | Extracted requirement | Primary source evidence |
|---|---|---|
| Name/job | Dedicated **Processing** section; Inbox-first deliberate decision loop; Board/List secondary | Source PRD v2 §§1–6; CPW-001/002 |
| Identity | Extend existing `items`; never create a parallel captured-card aggregate or reuse SRS `cards` | Technical v2 §§1–4; latest-main schema/code map |
| States | Inbox, To Do, In Progress, Done; any active state may move to any other; same-state no-op | PRD v2 §7; CPW-007 |
| New capture | Every genuinely new item initializes/enrolls Inbox transactionally; duplicates/repair/upgrades preserve lifecycle | PRD v2 §8; technical v2 §6; current `insertCaptured` seam |
| Existing items | Dormant valid baseline; explicit selected/recent-30-days capped 25/all enrollment with preview | PRD v2 §8; CPW-006 |
| Ordering | Inbox current-entry ASC; other states deterministic; no manual rank | PRD v2 §10; CPW-008 |
| Views | Inbox, Board, List, Archived with single-item task/trust parity | PRD v2 §§9–10; UX v2 §§4–7 |
| Group/sort | Board/List share compact Group & sort; non-status grouping is view-only; native Move remains authoritative | Prototype AGENTS/handoff; CPW-023–026 |
| Drag | Optional desktop status move only when grouped by status; never required; disabled pending accessibility proof | PRD/UX v2; CPW-009 |
| Filters | Manual User tags and AI topics are separate multi-select facets; OR within, AND across; no-tag/no-topic | PRD v2 §11; CPW-022 |
| Counts | Exact view-scoped matching count plus separately labeled unfiltered Inbox total | PRD v2 §11; traceability V2-19 |
| Detail/notes | Open canonical `/items/[id]`; workflow and attached note lifecycle remain independent; restore return context | PRD v2 §§9, 14; CPW-012 |
| Archive | Separate Done-only Processing archive; Restore→Done; atomic Reprocess→Inbox; no knowledge deletion | PRD v2 §7 archive matrix; CPW-010/011 |
| Concurrency | Expected version + mutation ID, one atomic event/projection commit, 409 current truth, outcome lookup | PRD v2 §13; technical v2 §§9–10 |
| Undo | One level for reversible confirmed action; server-provided inclusive 10-second eligibility; no Undo-of-Undo | PRD v2 §13/AC12; CPW-016 |
| Metrics | Inbox now/oldest entry; capture-only Added; per-Inbox-episode Processed; first-lifetime Completed headline | PRD v2 §12 after consistency remediation; CPW-017–019 |
| Calendar | Owner-selected IANA timezone; Monday-local week; UTC event storage and DST-safe boundaries | Technical v2 §11; approved baseline ER-11 |
| Scale | Bounded DTOs/keyset pages, independent Board cursors, exact aggregate queries, 10k/50k evidence | Technical v2 §§5,8,13 |
| Mobile | Entry under More + Library summary/capture feedback; linear Inbox/List; one-status Board; ≥44px tasks | PRD v2 §§6,14; UX v2 §§5,12 |
| Accessibility | Native non-drag task parity, native lists/headings, deterministic focus, live regions, reduced motion, manual AT gates | UX v2 §11; accessibility review |
| Offline/failure | Loaded read/filter/detail may remain; all workflow writes disabled offline; honest loading/error/pending/failure/conflict/unknown states | PRD v2 §13; UX v2 §10 |
| Security/privacy | Current single-owner auth; handler-level write auth/origin validation; bounded content-free events/analytics | Technical v2 §§14–15; latest-main bearer-prefix finding |
| Rollout | Additive migration, raw guard, integrity readiness, verified backup, flags/readiness, forward rollback, live smoke | Technical v2 §§19–21; current deploy conventions |
| Scope guard | No batch, rank/priority, offline outbox, PM fields, collaboration, or global content archive in v1 | PRD v2 §§4–5; CPW-013/014 |

## Acceptance themes extracted

1. Every current ingestion channel and raw future insert initializes exactly once; every identity-preserving path preserves workflow.
2. Legacy rows remain dormant until exact, explicit enrollment.
3. Projection/events/status/archive/episode/Undo invariants survive concurrency, replay, deletion, and failure.
4. Inbox/Board/List/Archived/detail/mobile expose the same truthful single-item outcome.
5. Filter results, counts, ordering, metrics, and time boundaries are exact and independent of page length.
6. Archive never changes Library/search/Ask/Related/Review/export/worker eligibility.
7. Keyboard, screen reader, switch, zoom/reflow, touch, reduced motion, fixed navigation, and focus recovery pass.
8. Migration, query plans, 50k scale, rollback, production deployment, live smoke, monitoring, and documentation are evidenced before completion.

## Explicitly deferred

Batch operations, manual order/rank, saved named views, offline mutation synchronization, editable preview, teams/assignment/dates, and global archive remain outside first release.
