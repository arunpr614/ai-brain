# Kanban Card Processing — brainstorm council recommendation

**Council:** Growth & Engagement · Platform & Data · Power User & Workflow
**Date:** 2026-07-12
**Recommendation:** proceed with Direction B — **Processing**, Inbox-first
**Authority note:** this is an execution recommendation grounded in the current goal and reviewed source package; it does not claim the older exploratory PRD was stakeholder-approved for production.

## Executive recommendation

Build Processing as a calm decision loop over existing saved `items`, not as a general Kanban/project-management system. A fresh entry opens an oldest-current-entry-first Inbox with no preselection. Board and List are alternate lenses over the same four-state lifecycle. Single-item actions, exact recovery, and canonical detail/notes continuity are first-release requirements; batch, manual rank, offline mutation queues, and editable quick preview are not.

The product should optimize for **fewer undecided captures and greater trust**, not more clicks or more status movement. The core growth loop is:

`capture → transparent Inbox placement → one deliberate decision → useful follow-through → recoverable completion/archive`

This recommendation adopts the normalized requirements in `docs/feature-council/kanban-card-processing/discovery/approved-requirements-baseline.md`.

## Evidence that shapes the recommendation

- The current product already has fast multichannel capture and a rich Library/detail experience but no persisted user-intent lifecycle (`KD/research/current-state-report.md`, “Executive finding”).
- `items` is canonical saved-source identity, while `cards` is SRS (`src/db/migrations/001_initial_schema.sql`, lines 15–35 and 81–97).
- Current Library is bounded to 100 loaded items and lacks multi-tag/topic, workflow, archive, and cursor behavior (`src/app/library/page.tsx`, lines 62–81; `src/db/items.ts`, lines 125–268).
- Direction B scored 94 versus 70/79 and was stakeholder-selected for continued design exploration (`KD/README.md`, “Product directions”; `KD/prototypes/AGENTS.md`, “Durable prototype decisions”).
- The reviewed v2 contract makes Inbox primary, Board secondary, status/archive/taxonomy independent, and native Move universal (`KD/product/prd-v2.md` §§1–4, 7, 10, 14).
- The accepted component handoff requires shared compact Group & sort, non-status grouping safety, and Light/Dark parity (`KD/prototypes/handoff/AI_AGENT_HANDOFF.md`, “Approved component contract”).

`KD/` is `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/`.

## Growth & Engagement position

### Product promise

“Every saved source has a visible next decision, without losing the knowledge you captured.”

Processing must not feel like a debt dashboard. The experience should make entry obvious, explain where new captures went, and make the next useful action smaller than reorganizing the whole backlog.

### Adoption loop

1. Every genuine new capture confirms `Saved to Library and Processing Inbox`.
2. Desktop navigation shows Processing beside Library; mobile exposes it through More and a Library Inbox-health summary.
3. Processing opens to a clean Inbox and one `Process next` action, with nothing preselected.
4. After a confirmed decision, advance to the next matching source and offer 10-second Undo.
5. Weekly return context compares intake and processing without streaks, red debt, overdue language, or confetti.

### First-use strategy

Never drop all historical Library items into a visible Inbox. Show an exact preview and let the owner enroll selected items, recent 30 days capped at 25, or all. This avoids a punitive first session while still making historical backlog usable. Evidence: `KD/product/prd-v2.md` §8 and `KD/decisions/decision-log.md`, CPW-006.

### Growth measures

Use outcomes rather than activity:

- share of genuinely new captures receiving an effective first decision within seven owner-local days;
- Inbox-now trend and median/oldest current-entry age;
- weekly Processed versus Added, with exact episode/capture-only definitions;
- first-lifetime completion;
- mutation recovery success and mobile discovery completion;
- qualitative note-loss/archive-understanding trust signals.

Do not target raw moves, board opens, time in app, archive volume, streaks, or zero-Inbox days. Evidence: `KD/product/prd-v2.md` §§12, 16, 19; `KD/product/metrics-framework.md`, “Anti-vanity guardrails.”

## Platform & Data position

### Canonical model

Add an enrolled workflow projection to `items` and append-only, content-free workflow history. Required projection semantics are status, version, enrollment, current Inbox entry, latest status change, first/effective completion support, archive, and initialization. Keep `workflow_archived_at` independent from status.

Every genuine new insert initializes enrolled Inbox atomically. Legacy rows receive a valid dormant version-0 baseline and do not enter Processing until explicit enrollment. Duplicate, replay, repair, transcript upgrade, enrichment, and worker paths preserve lifecycle.

### State and archive rules

- Inbox, To Do, In Progress, Done; every active state can move to every other.
- Same-state is a no-op.
- Only Done archives; archive is Processing visibility only.
- Restore returns to Done; Reprocess atomically unarchives and enters Inbox.
- Library/search/Ask/Related/detail/notes/export/quality/Review/workers remain eligible.
- Hard delete remains privacy-destructive and cascades history.

### Data trust

All writes use expected version plus mutation ID. A conflict returns current state; exact replay returns the accepted receipt plus current truth. Unknown outcomes resolve by mutation ID before retry. One-level Undo is server-governed through the exact 10-second timestamp. There is no v1 offline mutation queue.

This follows `KD/technical/technical-plan-v2.md` §§4, 9–12 and corrects stale-response risk identified and remediated in `KD/reviews/v2-consistency-review.md`, “Post-review remediation disposition.”

### Scale posture

Use dedicated bounded Processing reads, per-status keyset cursors, aggregate SQL counts, and no full source/note payload. Virtualization is conditional on focus/semantics. Preserve the 50k p95 gates from `KD/technical/technical-plan-v2.md` §13.

## Power User & Workflow position

### Daily operating model

- Fresh Processing entry: clean Inbox, oldest current entry first.
- Process next: inspect excerpt/tags/topics/read-only note summary; Leave or Move to one of three other states.
- Workload overview: Board or dense List with shared filters and compact Group & sort.
- Canonical detail: full `/items/[id]` route with exact return context; workflow and notes remain independent.
- Completion: Done remains visible until explicit Archive; durable recovery is Restore or Reprocess.

### Ordering and organization

No manual rank in v1. Inbox correctness uses current Inbox-entry time; default lifecycle order elsewhere uses status/completion/archive timestamps with ID tie-breaks. Board/List retain the accepted default of Workflow status + Oldest captured and allow deterministic field sorts. Replace prototype-only “Custom fixture order” with “Workflow default”; never implement a hidden fixture or user rank.

Non-status grouping is purely organizational and disables drag. Native source-specific Move is always visible/available. This resolves the tension between `KD/prototypes/handoff/AI_AGENT_HANDOFF.md` defaults and the no-rank/current-entry contract in `KD/product/prd-v2.md` §§4 and 10.

### Persistence and place

Explicit valid URL state is canonical. Back/Forward and detail return preserve filters, status lens, view, cursor/anchor, and focus. A fresh primary nav click always returns to a clean Inbox; stored Board/List preferences cannot create a “missing cards” first impression. Invalid IDs/cursors normalize safely.

### Failure behavior

Pending remains visible. Failure rolls back only the affected source. Conflict installs current truth and offers an explicit retry of intent. Lost response shows “Checking saved state” and reconciles before Retry. Filter-driven removal chooses the next valid focus target and announces the changed result count. Offline disables writes honestly.

### Mobile equivalence

Mobile is outcome-equivalent, not layout-identical: linear Inbox/List, one Board status/group at a time, native Move, no drag dependency, 44×44 targets, safe-area/bottom-nav clearance, stacked canonical detail, and the same archive/recovery/failure outcomes.

## Consolidated first-release contract

### Must ship

- Processing desktop peer; More + Library summary + capture feedback on mobile.
- Clean Inbox landing, Board, List, Archived.
- Four-state lifecycle and every-state-to-every-state native Move.
- Exact legacy enrollment and new-capture default.
- User-tag and AI-topic multi-select filters with OR-within/AND-across algebra.
- Exact matching versus total counts.
- Canonical detail/notes continuity and deterministic return.
- Single-item concurrency, replay, unknown outcome, 10-second Undo.
- Done-only workflow archive, Restore, Reprocess, downstream matrix.
- Content-free event history and owner-timezone/Monday metrics.
- Bounded keyset pagination, 50k performance gates, responsive/accessibility parity.
- Feature flag, observable rollout, rollback, production smoke test, docs/wiki update.

### Explicitly defer

- Batch actions, manual rank/reorder/priority, offline queue, editable preview, saved named views, due dates, assignees, reminders, dependencies, WIP limits, collaboration, and global content archive.

## Product defaults for autonomous execution

| Question | Default decision | Evidence/reopen gate |
|---|---|---|
| Name | Processing | Five-second test may reopen; `KD/product/prd-v2.md` §6. |
| Mobile placement | More + Library summary + capture feedback | Promote if >20% fail unaided discovery; PRD §6. |
| Quick preview | Omit from first release | Add only if read-only preview measurably improves confidence/speed. |
| Existing recent cap | 25 newest matching items from 30 days | Exact preview and All escape hatch; reopen on real-backlog friction. |
| Persistent metrics | Inbox health; Processed vs Added this week; first completion | Reopen presentation if dogfood shows pressure or misunderstanding. |
| Drag | Disabled until all manual accessibility/focus gates pass | Native Move remains complete. |
| Batch/manual rank | Deferred | Separate future contract and evidence required. |

## Key risks and mitigations

| Risk | Product impact | Mitigation / no-go gate |
|---|---|---|
| Processing duplicates Library | Confusion and low adoption | Keep distinct job, canonical detail, Library summary; omit unproven preview. |
| Backlog feels punitive | Avoidance/churn | Explicit enrollment, neutral copy, weekly health, no streak/debt/overdue language. |
| Mobile entry remains hidden | Low discovery | Two entry paths; >20% unaided-failure promotion gate. |
| Capture path misses Inbox | Invisible lifecycle gaps | Atomic repository insert + raw-insert guard + integrity readiness check; fail Processing closed. |
| Duplicate/repair resets intent | Loss of trust | Every-ingestion and duplicate-preservation fixtures. |
| Concurrency/replay shows stale state | Wrong card placement | CAS, current snapshot, mutation outcome endpoint, replay-after-later-mutation E2E. |
| Archive is mistaken for delete | Data-loss fear | Done-only, “Archived from Processing,” exact downstream regression matrix. |
| Metrics reward churn | Gaming/mistrust | Episode Processed, capture-only Added, first-lifetime Triaged/Completed, Undo linkage. |
| Large board degrades or loses focus | Unusable backlog | Bounded cursor pages, aggregate counts, conditional virtualization, 50k/focus gates. |
| Drag breaks accessibility | Task exclusion | Native Move primary; drag remains off until full gate passes. |
| Scope expands into project management | Slow/fragile delivery | Enforce deferred list at every milestone/review. |

## Recommendation by milestone

1. Freeze this product model and exact metric truth table.
2. Implement/test persistence, initialization, CAS/history, enrollment, and read contracts before UI breadth.
3. Build the Inbox loop and canonical detail continuity before Board/List decoration.
4. Add Board/List/Archived parity, filters, Group & sort, large-backlog behavior, and mobile task equivalence.
5. Pass archive matrix, concurrency/Undo, security/privacy, accessibility, and 50k gates.
6. Roll out behind a flag, dogfood the calm-workflow/discovery assumptions, then deploy and verify production.

## Final council position

Proceed. Direction B is differentiated enough from Library to solve a real job, technically aligned with the existing `items` aggregate, and strong for daily power use if the implementation protects trust. The release should be judged by accurate state, recovery, backlog health, and useful decisions—not by interaction volume.
