# Kanban Card Processing — approved requirements baseline

**Baseline date:** 2026-07-12
**Repository:** `arunpr614/ai-brain` at `5b92e68ec09ceb03f010db1c4fb14be5348a54bf`
**Execution status:** authorized by the current goal; not implemented or production-verified at this baseline
**Product direction:** Direction B — **Processing**, Inbox-first

## 1. How to read this baseline

This document distinguishes four kinds of statements:

- **Approved fact (AF):** directly established by the execution goal, current repository, or an explicitly stakeholder-accepted design record.
- **Execution resolution (ER):** the product council's normalized requirement for implementation. It is decisive for autonomous execution unless later evidence or stakeholder direction supersedes it.
- **Assumption (AS):** a condition believed true but requiring verification.
- **Open validation (OV):** an evidence gap with a safe default; it does not silently broaden scope.

`KD/` below means the immutable input package at:

`/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/`

The package's PRD v2 is explicitly a proposal, not a stakeholder-approved implementation specification (`KD/product/prd-v2.md`, header and §23). Direction B and the compact Group & sort component were accepted for continued exploration (`KD/prototypes/AGENTS.md`, “Durable prototype decisions”; `KD/prototypes/handoff/agent-handoff.json`, `approved_direction`). The current execution goal supplies the later implementation/release authority. This baseline therefore adopts the reviewed v2 semantics as **execution resolutions**, while preserving the narrower set of stakeholder-approved design facts.

## 2. Source hierarchy applied

1. Current execution goal for authority, completion conditions, and mandatory outcome.
2. Explicit stakeholder decisions in `KD/prototypes/AGENTS.md` and the canonical handoff package.
3. Reviewed v2 product contract: `KD/product/prd-v2.md`, `KD/decisions/decision-log.md`, `KD/technical/technical-plan-v2.md`, and `KD/reviews/traceability-matrix-v2.md`.
4. Current repository code for existing behavior.
5. Supporting research and older recommendations, used only where consistent with 1–4.

Material conflicts are resolved in §11; no conflicting statement is silently merged.

## 3. Approved facts

| ID | Approved fact | Evidence |
|---|---|---|
| AF-01 | The execution goal authorizes research, application/schema/API/test/documentation/release work and requires a production-running, live-verified result before goal completion. | `/Users/arun.prakash/.codex/attachments/3a115369-f879-4661-8900-269defa7d59a/goal-objective.md`, “Goal,” “Intended feature outcome,” and “Autonomous execution rules.” |
| AF-02 | Direction B, **Processing — Inbox-first**, is the stakeholder-selected design direction. The selection was for continued exploration, not prior production authorization. | `KD/prototypes/AGENTS.md`, lines 9–16; `KD/prototypes/handoff/AI_AGENT_HANDOFF.md`, header and “Do not infer authorization”; `KD/prototypes/handoff/agent-handoff.json`, `approved_direction` and `review`. |
| AF-03 | Board and List share the compact Group & sort component. Non-status grouping is organizational only; native Move remains required. Light and Dark have behavioral/content parity. | `KD/prototypes/AGENTS.md`, lines 12–16; `KD/prototypes/handoff/AI_AGENT_HANDOFF.md`, “Approved component contract”; `KD/prototypes/design-qa.md`, “Approved-design HTML handoff QA.” |
| AF-04 | The saved-source aggregate is `items`; the existing `cards` table is an unrelated SRS substrate. Current `items` has no workflow lifecycle or archive. | `src/db/migrations/001_initial_schema.sql`, lines 15–35 and 81–97; `src/db/client.ts`, `ItemRow` at lines 166–207; `KD/research/existing-data-model-summary.md`, “Central aggregate” and “Do not reuse cards.” |
| AF-05 | Current creation converges on `insertCaptured`; it does not write workflow state. Duplicate/repair paths can reuse an existing identity. | `src/db/items.ts`, lines 54–101; `KD/research/current-state-report.md`, “Card creation and ingestion”; `KD/research/platform-data-workflow-assessment.md`, “All production item creation paths converge on insertCaptured.” |
| AF-06 | Current Library loads at most 100 items, counts separately, and supports only narrow source/quality/single-tag filtering. It has no workflow/archive/cursor contract. | `src/app/library/page.tsx`, lines 62–81; `src/db/items.ts`, lines 125–268; `KD/research/current-state-report.md`, “Library behavior.” |
| AF-07 | Desktop navigation has Library/Needs Upgrade/Ask/Settings; mobile has Library/Capture/Ask/More. Processing does not exist in runtime. | `src/components/sidebar.tsx`, lines 38–43 and 255–304; `docs/wiki/Feature-Catalog.md`, Card Processing Workflow row. |
| AF-08 | Current deletion is hard delete and cascades item state; there is no recoverable item archive. | `src/db/items.ts`, lines 280–289; `KD/research/current-state-report.md`, “Archive, deletion, and lifecycle.” |
| AF-09 | Existing item detail and My notes are canonical and have an independent lifecycle; workflow actions must not implicitly save, clear, or submit notes. | `KD/product/prd-v2.md`, §§3, 9, 18; `KD/research/current-state-report.md`, “Item detail and notes.” |

## 4. Product model requirements

### ER-01 — One source object, one independent workflow lifecycle

- Attach workflow to `items`; do not create a second captured-card entity and do not use SRS `cards`.
- Keep workflow status independent from User tags, AI topics, `items.category`, generated tags, collections, capture quality, enrichment state, SRS Review, and workflow archive.
- UI may say “source” or “card”; code/schema/API naming uses `itemWorkflow`/`workflow_*`.

Evidence: `KD/product/prd-v2.md` §§3, 7, 15; `KD/research/source-reconciliation.md`, “Reconciled conflicts.”

### ER-02 — Exactly four active statuses

| Stored value | Label | Meaning |
|---|---|---|
| `inbox` | Inbox | Enrolled source awaiting the current processing decision. |
| `todo` | To Do | Deliberately retained for later action. |
| `in_progress` | In Progress | Owner is actively using or working through it. |
| `done` | Done | Current processing intent is complete. |

- Any active status may move directly to any other active status.
- Same-state Move is a true no-op: no version change, event, metric, or timestamp change.
- Moving to Inbox starts a new Inbox-entry episode and sets a new current-entry timestamp.
- Done is reversible; it is not a terminal state and never auto-archives.

Evidence: `KD/product/prd-v2.md` §7; `KD/decisions/decision-log.md`, CPW-007; `KD/reviews/traceability-matrix-v2.md`, V2-10.

### ER-03 — New-capture and existing-card defaults

**Genuinely new item:** initialize and enroll in Inbox in the same transaction as the item insert, at workflow version 1, with initialized/current-entry/status-change timestamps and an initialization event. This applies to every current and future raw insertion channel.

**Duplicate, repair, transcript upgrade, enrichment retry, or Recall replay:** preserve workflow status, version, archive, and history. Never reset or unarchive implicitly.

**Legacy item:** persist a valid dormant baseline (`workflow_status='inbox'`, version 0), but set `workflow_enrolled_at` and current Inbox-entry timestamp to null. Dormant rows are excluded from every Processing read, count, age, and metric.

**Explicit enrollment choices:**

1. selected Library items;
2. captured in the last 30 days, capped at the newest 25 matching unenrolled items after an exact preview; explain overflow and offer All;
3. all existing unenrolled items.

Enrollment is idempotent. It sets Inbox-entry time to enrollment confirmation time, not capture time, and creates no Added/Processed/Completed milestone.

Evidence: `KD/product/prd-v2.md` §8 and AC 2–3; `KD/technical/technical-plan-v2.md` §§4.1–4.2; `KD/decisions/decision-log.md`, CPW-005/006.

### ER-04 — Deterministic ordering; no manual rank in first release

- Dedicated Inbox: `workflow_inbox_entered_at ASC, id ASC`.
- To Do and In Progress under workflow-default ordering: `workflow_status_changed_at DESC, id ASC`.
- Done: latest effective completion descending, then ID.
- Archived: `workflow_archived_at DESC, id ASC`.
- No persisted manual rank, drag reorder, fractional position, or custom user order in first release.
- Desktop pointer drag may change **status only** when grouped by Workflow status; it never changes order.

Board/List organization adopts the accepted compact control:

- Group options: Workflow status, Primary User tag, Primary AI topic, Source type, Capture channel, Capture quality, Capture age, No grouping.
- Sort options supported in production v1: Oldest captured, Newest captured, Title A–Z, Title Z–A, Workflow status, Source type, Capture channel, plus **Workflow default** for the deterministic rules above.
- Board/List default: Workflow status + Oldest captured, matching the accepted visual handoff. The dedicated Inbox remains fixed to oldest **current Inbox entry**, not oldest capture.
- Non-status grouping disables pointer drag and never mutates workflow status.

Evidence: `KD/product/prd-v2.md` §10; `KD/prototypes/handoff/AI_AGENT_HANDOFF.md`, “Approved component contract”; `KD/ux/ux-ui-v2.md` §18; conflict resolution CR-02 in §11.

## 5. History, concurrency, failure, and Undo

### ER-05 — Content-free canonical history

Persist an append-only `item_workflow_events` history transactionally with each projection change. Required bounded event types include initialization, legacy baseline, enrollment, status change, archive, restore, reprocess, and Undo. Record item/version, opaque event and mutation IDs, from/to workflow facts, origin/surface/channel, event time, bounded Inbox episode ID, and Undo target. Prohibit title, body, URL, note, summary, taxonomy labels, query text, provider payload, free-form errors, and generic metadata JSON.

Evidence: `KD/technical/technical-plan-v2.md` §§4.2–4.4; `KD/product/prd-v2.md` §§15–16.

### ER-06 — Compare-and-swap and idempotency

- Every user mutation sends `expectedVersion`, `mutationId`, and one bounded action.
- Commit projection, incremented version, and event atomically only when expected version matches.
- A mismatch returns 409 plus current canonical projection/version; never silently reapply intent.
- Exact mutation replay returns the immutable accepted receipt **and the current canonical projection/version**. The client installs current truth only.
- A lost response queries mutation outcome by mutation ID before retrying.
- Same-device broadcast is an invalidation hint, never authority; revalidation supplies truth.
- Offline permits already-loaded read/filter/detail but disables mutations. There is no offline workflow queue in v1.

Evidence: `KD/technical/technical-plan-v2.md` §§9–10; `KD/product/prd-v2.md` §13; `KD/decisions/decision-log.md`, CPW-014/015.

### ER-07 — Exact Undo contract

- One-level Undo applies to a confirmed Move, Archive, Restore, or Reprocess action.
- Server response/replay returns `undoEligibleUntil = confirmedAt + 10 seconds`.
- The server accepts Undo at or before that instant; after it, return `410 undo_expired` with current canonical truth.
- Undo is a new CAS/idempotent event linked to exactly one reversible non-Undo event.
- Undo-of-Undo is rejected; redo is an ordinary mutation.
- An intervening version change causes conflict and never overwrites current state.
- Client keeps the Undo action available across Inbox/Board/List/Archived/detail navigation within the same tab and time window, then announces expiry without moving focus.
- Undo restores the exact prior projection and prior Inbox-entry timestamp when relevant; linked metric milestones become ineffective.

Evidence: `KD/product/prd-v2.md` §§9, 13 and AC 12; `KD/technical/technical-plan-v2.md` §§9–10; `KD/decisions/decision-log.md`, CPW-016.

## 6. Workflow archive requirements

### ER-08 — Archive is Processing visibility, not content deletion

- Persist nullable `workflow_archived_at`; it is not a fifth workflow status.
- Only active Done may archive. Archive is always explicit and never automatic.
- Archived items retain `workflow_status='done'` and leave active Processing.
- Restore clears `workflow_archived_at` and remains Done.
- Reprocess is one explicit atomic command that clears archive and enters Inbox, preserving both facts in history.
- Status Move while archived is rejected; Restore or Reprocess first.
- Hard delete remains the separate destructive content operation.

Downstream scope is exact: workflow archive does **not** remove the item from Library, canonical detail/notes, exact or semantic search, Ask/citations, Related, Needs Upgrade/Attention Review/SRS eligibility, duplicate matching, export, enrichment/index/quality workers, or backups. Surfaces that show the item expose “Archived from Processing” metadata/badge where specified.

Evidence: `KD/product/prd-v2.md` §§7 and 9, especially the archive downstream matrix; `KD/technical/technical-plan-v2.md` §12; `KD/decisions/decision-log.md`, CPW-010/011.

## 7. Metrics and time semantics

### ER-09 — Primary metric hierarchy

1. **Inbox now** and **oldest current Inbox entry age**.
2. **Processed this week** beside **Added this week**.
3. **Completed this week**.

“Today” may appear only in transient action confirmation or a secondary Activity disclosure. Do not ship streaks, overdue/debt language, confetti, time-in-app, raw transition volume, archive volume, or zero-Inbox targets.

### ER-10 — Exact metric dictionary

| Metric | Exact rule |
|---|---|
| Inbox now | Count retained items with enrollment non-null, active Inbox, and archive null. Unaffected by page length or active filters. |
| Oldest current Inbox age | Query time minus minimum `workflow_inbox_entered_at` among Inbox-now rows. Capture initializes it; legacy enrollment uses enrollment time; return/reprocess uses operation time; Undo of an exit restores the prior continuous anchor. |
| Added in period | Distinct genuinely new item identities successfully initialized and automatically enrolled by capture in the period. Exclude duplicate/repair/replay, legacy baseline/enrollment, return/reprocess, and ordinary move to Inbox. |
| Processed in period | One effective owner-driven exit from each distinct Inbox-entry episode in the period. Repeated movement outside Inbox does not count; a deliberate later return/reprocess creates a new episode that can count once. |
| Triaged diagnostic | First effective owner-driven Inbox exit in item lifetime. Never substitute this first-lifetime diagnostic for episode-based Processed. |
| Completed in period | First effective owner-driven Done entry in item lifetime. Recompletion is diagnostic only. |
| Archived diagnostic | Distinct retained item with an effective archive event in the selected period; not a headline success metric. |

Linked Undo makes its target ineffective. Failed, pending, conflicted, rejected, unknown, same-state, baseline, and enrollment actions never affect product metrics. Hard delete removes item history and may reduce recomputed prior totals; help copy states that metrics describe currently retained sources.

### ER-11 — Calendar contract

- Persist one owner-selected IANA timezone; initialize it once from browser/device and allow changes.
- Store event timestamps as UTC epoch milliseconds; never use host/database timezone or a remembered fixed UTC offset.
- Today is `[owner-local 00:00, next owner-local 00:00)` converted to UTC.
- Week-to-date starts owner-local Monday 00:00. Completed weeks are half-open Monday-to-Monday intervals.
- DST days may be 23 or 25 hours. A timezone change re-buckets at query time and never rewrites events.
- Metrics disclosure shows `Week starts Monday · {IANA timezone}`.

Evidence: `KD/product/prd-v2.md` §12; `KD/technical/technical-plan-v2.md` §11; `KD/reviews/traceability-matrix-v2.md`, V2-20. The older first-lifetime Processed definition in `KD/product/metrics-framework.md` §§“Metric dictionary” and “Why processed is first-ever” is superseded by CR-01 in §11.

## 8. Views, persistence, filters, and parity

### ER-12 — Processing information architecture

- Desktop: Processing is a sidebar peer immediately after Library; badge is unfiltered enrolled active Inbox total, visually capped only in navigation.
- Mobile: Processing starts under More; Library contains `Inbox {N} · oldest {age}` with Open Inbox; successful new capture says `Saved to Library and Processing Inbox`.
- A fresh primary Processing navigation opens a clean, unfiltered Inbox. A remembered Board/List choice must not bypass Inbox.
- Canonical item detail remains `/items/[id]`; validated internal return context restores view/query/anchor/focus. No editable duplicate preview. A read-only quick preview is optional and omitted from v1 unless it earns measurable value.

### ER-13 — URL and preference precedence

1. Valid explicit URL state wins.
2. Browser Back/Forward restores normalized URL state and return anchor.
3. Last explicitly used Board/List organization and filters may seed an entry into the active-work area only.
4. Fresh top-level Processing always resets to unfiltered Inbox.
5. Invalid/stale IDs, taxonomy values, cursors, or anchors normalize safely; no broken or empty-looking state is retained silently.

Canonical URL uses stable IDs for `view`, `group`, `sort`, status lens, User-tag IDs, AI-topic IDs, archive scope, and return anchor. Theme follows the application's global appearance preference; prototype-only `theme` review URLs are not a second production preference system.

### ER-14 — Filter and count algebra

- User tags (`tags.kind='manual'`) and AI topics (`topics`/`item_topics`) are separate multi-select facets.
- OR within a facet; AND across facets.
- Include `No user tags` and `No AI topics`.
- Show removable value/facet chips and Clear all.
- Pages and aggregate counts use the same normalized predicate.
- Matching counts change with filters; unfiltered Inbox total and primary metrics do not.
- Never infer a count from loaded rows.

### ER-15 — Board/List task parity

Inbox, Board, List, Archived, and canonical detail use the same single-item Move/Archive/Restore/Reprocess mutation contract and the same pending/failure/conflict/unknown/Undo truth rules.

Board and List both expose title/type, status, relevant labels, Open, native Move, Done-only Archive, matching counts, active filters, and return context. Batch mutation is deferred. Board columns remain in DOM order Inbox, To Do, In Progress, Done. Pointer drag is optional desktop enhancement only when grouping is Workflow status; every operation has native non-drag parity.

Evidence: `KD/product/prd-v2.md` §§6, 9–11, 13–14; `KD/ux/ux-ui-v2.md` §§7–8, 12, 18; `KD/reviews/traceability-matrix-v2.md`, V2-14/18/19/50.

## 9. Large backlog and responsive requirements

### ER-16 — Bounded scale behavior

- Reads return bounded summary DTOs and keyset-paginated pages; never load full source/note content for Processing.
- Board uses an independent keyset cursor per status; List/Inbox/Archived use their normalized sort cursor.
- Cursor binds sort tuple, stable ID, view/status, filter hash/version, and archive scope; a mismatch restarts through an explicit normalized contract.
- Aggregate counts and oldest age are indexed server queries independent of pagination.
- Virtualization is allowed only after semantic/focus tests pass. Native lists and stable item focus targets remain valid across page loads/reconciliation.
- Production-size gates at 50k realistic items: unfiltered summary/count p95 ≤100 ms; filtered summary p95 ≤200 ms; first page p95 ≤200 ms; mutation transaction p95 ≤250 ms excluding network. Record test hardware and query plans.

Evidence: `KD/technical/technical-plan-v2.md` §§8, 13; `KD/reviews/traceability-matrix-v2.md`, V2-37.

### ER-17 — Responsive task equivalence

- ≥1180 px: split Inbox, four-column Board, dense List.
- 768–1179 px: linear Inbox; Board may scroll within its own contained region only, never page-level two-dimensional scroll.
- ≤767 px: linear Inbox/List, one selected Board status/group at a time, no drag dependency, quick preview hidden, canonical detail stacked.
- All task controls meet at least 44×44 CSS px on mobile and clear bottom navigation/safe area.
- Mobile supports the same outcomes: Move forward/backward, Done, Archive, Restore, Reprocess, filter, Undo, failure recovery, and detail/notes continuity.

Evidence: `KD/product/prd-v2.md` §14; `KD/ux/ux-ui-v2.md` §12; `KD/reviews/traceability-matrix-v2.md`, V2-15/43.

## 10. First-release scope boundary

**Required:** Processing navigation, Inbox/Board/List/Archived, four statuses, single-item native Move, optional gated desktop drag, User-tag/AI-topic filters, canonical detail/notes continuity, exact counts/metrics, explicit legacy enrollment, Done-only archive/restore/reprocess, concurrency/unknown outcome/Undo, bounded scale, mobile equivalence, accessibility, feature flag, rollout/rollback, production verification, and documentation.

**Deferred:** batch move/archive/restore, manual rank/reorder/priority, offline mutation queue, editable quick preview, saved named views, due dates, assignees, reminders, dependencies, sprints, WIP limits, team/collaboration, and a global content archive.

Evidence: `KD/product/prd-v2.md` §§4–5 and 22; `KD/decisions/decision-log.md`, CPW-013/014.

## 11. Material conflict resolutions

| ID | Conflict | Resolution | Basis |
|---|---|---|---|
| CR-01 | `KD/product/metrics-framework.md` defines Processed as first-lifetime exit, while later v2 PRD/technical/traceability define one exit per Inbox-entry episode. | Use episode-based **Processed**; retain first-lifetime **Triaged** as diagnostic. | Higher-order reviewed v2 contract: `KD/product/prd-v2.md` §12; `KD/technical/technical-plan-v2.md` §11; `KD/reviews/traceability-matrix-v2.md`, V2-20. |
| CR-02 | Accepted prototype sort includes “Custom fixture order”; PRD removes manual rank. | Do not implement fixture order or manual rank. Production offers “Workflow default” plus supported deterministic field sorts. | `KD/ux/ux-ui-v2.md` §18 calls it “Custom fixture order”; `KD/product/prd-v2.md` §§4 and 10 removes manual rank. |
| CR-03 | Accepted Board/List default is Oldest captured, while Inbox correctness requires current Inbox-entry order. | Dedicated Inbox is fixed oldest-current-entry-first. Board/List keep accepted Workflow status + Oldest captured default; “Workflow default” exposes status-specific lifecycle ordering. | `KD/prototypes/handoff/AI_AGENT_HANDOFF.md` approved defaults; `KD/technical/technical-plan-v2.md` §4.2. |
| CR-04 | Earlier research used `archived_at`; later contract uses `workflow_archived_at`. | Standardize storage/API on `workflow_archived_at`; customer copy is “Archived from Processing.” | `KD/reviews/v2-consistency-review.md`, post-review disposition; `KD/technical/technical-plan-v2.md` §4.1. |
| CR-05 | Earlier power-user research proposed batch/manual ordering; PRD v2 removes both. | First release is single-item and deterministic. Preserve research only as future input. | `KD/product/prd-v2.md` §4; `KD/decisions/decision-log.md`, CPW-008/013. |
| CR-06 | Prototype handoff persists `theme` in review URLs; production already has a global appearance system. | Preserve Light/Dark parity and accepted component density; use the existing global theme preference in production, not a Processing-only theme state. | `KD/prototypes/handoff/agent-handoff.json`, `appearance`; `KD/ux/ux-ui-v2.md` §18 calls durable production preference an implementation gate. |

## 12. Assumptions

| ID | Assumption | Verification |
|---|---|---|
| AS-01 | Deployment remains private, single-owner, with current session/bearer authorization. | Confirm current production topology and auth middleware before write API release. |
| AS-02 | Stable IDs exist for manual tags and AI topics and are safe for URL/query use. | Repository/integration tests against current tag/topic schema. |
| AS-03 | Existing item detail and note conflict/draft behavior can accept a separate workflow control without remounting or mutating notes. | Detail integration and navigation-guard tests. |
| AS-04 | Current capture callers continue to converge on the repository insertion seam; raw/future inserts can be guarded. | Every-ingestion fixture plus integrity query on a production-size copy. |
| AS-05 | 50k items is a conservative first-release large-backlog validation ceiling for the owner deployment. | Measure actual production distribution; retain bounded architecture even if lower. |

## 13. Open validations and default decisions

| ID | Validation still open | Default if evidence is unavailable | Reopen trigger |
|---|---|---|---|
| OV-01 | Is “Processing” understood faster than Inbox/Queue? | Ship “Processing.” | Strong comprehension failure in moderated test. |
| OV-02 | Is More + Library summary discoverable on mobile? | Ship both paths. | If >20% cannot find Processing unaided, promote to primary bottom navigation before broad rollout. |
| OV-03 | Does read-only quick preview improve decisions? | Omit from first release. | Measured improvement in time/confidence without note/detail duplication. |
| OV-04 | Is the recent-enrollment cap of 25 calm and useful? | Keep 25 with exact preview and All escape hatch. | Real-backlog test shows repeated friction or debt shock. |
| OV-05 | Do weekly metrics create pressure? | Ship neutral weekly hierarchy and disclosure; no streak/debt language. | Dogfood reports guilt, gaming, or misunderstanding. |
| OV-06 | Can pointer drag meet AT, cancel, reduced-motion, and virtualization-focus gates? | Keep production drag disabled; native Move ships. | All manual and automated gates pass. |

## 14. Release acceptance baseline

Implementation is not releasable until tests prove: every insertion path/default and duplicate preservation; dormant/enrollment counts; all four-state moves/no-op/order; filter algebra/count parity; canonical detail/note independence/return; archive matrix; CAS/replay/outcome lookup/two-tab conflict; Undo before/at/after boundary; exact metric truth table with DST/timezone change/hard delete; 10k/50k query and focus behavior; mobile discovery/task completion; keyboard, NVDA, VoiceOver, TalkBack, switch, 200%/400% zoom, text spacing, contrast, and reduced motion; unauthorized/cross-origin/bounds/content-free events; flag rollout/rollback; production smoke test; and current repository/wiki documentation.

The execution goal remains incomplete until production is running and the live experience is verified.
