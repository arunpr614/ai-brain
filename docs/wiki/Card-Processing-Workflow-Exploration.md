# Card Processing Workflow Exploration

Purpose: Record the 2026-07-11 feature-council exploration for processing captured-source backlog.
Audience: Product/design reviewers, engineers, maintainers, and AI agents.
Verified against: canonical documentation baseline `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`; application exploration baseline `1cb5d36f37611e60442b4f2c4433b45455273500`; wiki base `88a3520038703108a0533501c7a384c6def7b74e`.
Runtime evidence through: None; prototypes use fictional in-memory data and do not represent deployed behavior.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

> **Status: Explored — not implemented.** This page is a proposal record, not current application behavior. No production schema, migration, API, feature flag, navigation, or workflow exists because of this exploration.

## Problem

AI Brain makes capture easy, but the Library does not provide a deliberate lightweight lifecycle for deciding what to do with each saved source. Tags and AI topics organize knowledge; capture quality and Review identify fidelity/attention needs; none expresses the owner's current workflow intent.

## Explored directions

| Direction | Thesis | Strength | Main risk |
|---|---|---|---|
| A — Workflow | Board-first spatial operations | Whole-workload visibility and repeated desktop movement | Project-management drift, scale, mobile, and accessibility complexity |
| B — Processing | Inbox-first deliberate triage | Clearest next decision, strongest mobile/accessibility fit | Read-only preview and mobile discovery must earn their complexity |
| C — Queue | Library-integrated dense lens | Maximum Library reuse and dense scanning | Easy to mistake for another Library filter; weak dedicated habit |

The weighted comparison scored A 70, B 94, and C 79. The council recommends **Direction B: Processing, Inbox-first** while preserving A and C for stakeholder comparison.

## Recommended proposal

- Dedicated **Processing** section, desktop peer to Library; Inbox is the landing job.
- Mobile begins under More, with a visible Library Inbox summary and capture feedback. A discoverability test can promote it to primary navigation.
- Workflow statuses: Inbox, To Do, In Progress, Done.
- Every genuinely new item is transactionally enrolled in Inbox; duplicate/repair/enrichment paths preserve lifecycle.
- Existing items remain dormant until explicit selected/recent/all enrollment. Recent is count-previewed, last 30 days, capped at 25.
- Board, List, Archived, and oldest-first Inbox views over the same active items.
- User tags, AI topics, quality/enrichment, SRS Review, workflow status, and archive remain separate.
- Native source-specific Move control is the universal action; desktop drag is optional enhancement and changes status only.
- No manual rank, batch mutation, offline mutation queue, or general project-management scope in first release.
- Existing item-detail route and My notes remain canonical. Quick preview is read-only and removable.
- Done-only workflow archive; Restore to Done; explicit Reprocess to Inbox.

## Proposed metrics

- Inbox now and oldest current Inbox-entry age.
- Processed this week compared with Added this week.
- Completed this week.

Processed means one effective owner-driven exit per distinct Inbox-entry episode. Repeated churn outside Inbox does not count; an explicit later return/reprocess starts a new episode. First-ever Triaged remains diagnostic. Linked Undo invalidates the target. Metrics contain no source/note content and describe currently retained items, so hard delete may recompute earlier totals downward.

Added means only a genuinely new item initialized by successful capture. Duplicate/repair, legacy enrollment, return/reprocess, and ordinary move-to-Inbox do not count as Added.

No streaks, guilt/debt colors, time-in-app, or raw transition volume are proposed as success metrics.

## Archive proposal

Archive is a separate Done-only `workflow_archived_at` timestamp that hides a source only from active Processing. It remains in Library, item detail/My notes, exact/semantic search, Ask/citations, Related, quality/Review eligibility, duplicate detection, export, and independent background processing, with Archived from Processing metadata where surfaced. Restore returns to Done; Reprocess atomically unarchives and enters Inbox.

## Architecture proposal

- Add workflow projection fields to `items`, including authoritative `workflow_inbox_entered_at`, enrollment/version/status/completion/archive timestamps.
- Add append-only content-free item workflow events with bounded typed episode/reason fields and no free-form metadata payload.
- Single-item writes use expected version + mutation ID, 409 current snapshot, source-local rollback, unknown-outcome reconciliation, and one-level Undo eligible for 10 seconds. Replay returns the immutable receipt plus current canonical truth, never a stale accepted-time snapshot.
- Undo-origin events are not Undo targets; redo is a normal move.
- Normal capture transaction supplies valid workflow fields/event; a database guard protects raw inserts.
- If guard/integrity is uncertain, Processing fails closed and readiness/repair blocks enablement—new captures never silently disappear into a dormant state.
- Additive schema work is separate from a resumable/observable legacy baseline job; no unbounded first-open event backfill.
- Keyset pagination, partial indexes, bounded DTOs, and 10k/50k query/virtualization gates precede rollout.

## Prototype evidence

The concept branch includes a locally runnable isolated gallery, three responsive directions, a route-based item-detail simulation, and inspected screenshots. It uses fictional data and no production APIs.

- [Feature-council package](https://github.com/arunpr614/ai-brain/tree/df4c42b9869f8a35b9557bc64bf6ecdb9d11b416/docs/feature-council/card-processing-workflow)
- [Prototype gallery source](https://github.com/arunpr614/ai-brain/blob/df4c42b9869f8a35b9557bc64bf6ecdb9d11b416/docs/feature-council/card-processing-workflow/prototypes/index.html)
- [PRD v2](https://github.com/arunpr614/ai-brain/blob/df4c42b9869f8a35b9557bc64bf6ecdb9d11b416/docs/feature-council/card-processing-workflow/product/prd-v2.md)
- [UX/UI v2](https://github.com/arunpr614/ai-brain/blob/df4c42b9869f8a35b9557bc64bf6ecdb9d11b416/docs/feature-council/card-processing-workflow/ux/ux-ui-v2.md)
- [Technical plan v2](https://github.com/arunpr614/ai-brain/blob/df4c42b9869f8a35b9557bc64bf6ecdb9d11b416/docs/feature-council/card-processing-workflow/technical/technical-plan-v2.md)
- [Decision log](https://github.com/arunpr614/ai-brain/blob/df4c42b9869f8a35b9557bc64bf6ecdb9d11b416/docs/feature-council/card-processing-workflow/decisions/decision-log.md)

Interactive hosting is not established by this wiki page; the files run locally from the concept branch.

## Risks and open validation

- Processing versus Inbox versus Queue comprehension.
- More + Library-summary mobile discoverability.
- Read-only quick preview value versus direct canonical detail.
- Calmness of the 25-item recent-enrollment cap and weekly metrics.
- SQLite migration/query/event performance and hard-delete metric behavior.
- CAS/idempotency/unknown-outcome and multi-tab/device correctness.
- Multi-value filter UI/URL normalization.
- Keyboard, screen-reader, switch, reduced-motion, contrast, 200%/400% zoom, fixed-nav, and virtualized-focus behavior.

## What must happen before implementation

1. Stakeholder approves mutually consistent PRD/UX/technical v2 and the archive matrix.
2. Naming, mobile discovery, preview, enrollment, and metric usability tests pass or revise the proposal.
3. Production-size backup/migration/backfill/query-plan rehearsal passes wall-time, WAL/disk, interruption, resume, and 10k/50k budgets.
4. Every ingestion path, duplicate/repair preservation, DB guard/integrity alarm, CAS/idempotency/Undo, unknown outcome, archive matrix, and hard-delete metrics pass tests.
5. Keyboard and manual assistive-technology/responsive gates pass.
6. A separate implementation authorization is given.

Until then, the feature remains **Explored — not implemented**.
