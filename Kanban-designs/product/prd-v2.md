# Card Processing Workflow — PRD v2

**Status:** **Explored — not implemented**
**Proposal state:** Recommended proposal awaiting stakeholder feedback; **not** an approved implementation specification.
**Recommended direction:** Direction B — **Processing**, Inbox-first.
**Baseline:** repository `1cb5d36f37611e60442b4f2c4433b45455273500`; wiki `88a3520038703108a0533501c7a384c6def7b74e`; 2026-07-11.
**Review inputs:** PRD/UX/technical v1 adversarial reviews, QA review, accessibility review, traceability v1, and prototype design QA.

## 1. Recommendation

Create a dedicated **Processing** section that opens to an oldest-current-entry-first **Inbox**. A user makes one deliberate decision at a time, may switch to Board or List for workload overview, and may archive only completed sources. The feature adds a workflow lifecycle to existing `items`; it does not turn AI Brain into a project-management product.

Direction B was selected over board-first Workflow and Library-integrated Queue because it best answers the user problem—captured sources waiting without a next decision—while offering the strongest mobile, accessibility, and architectural posture.

## 2. Goal and user problem

### Goal

Help a single AI Brain owner convert an accumulating capture backlog into deliberate, recoverable decisions without losing source context, notes, searchability, or trust.

### User problem

- Capture is easier than review, so Library grows without a clear next action.
- Existing tags/topics organize knowledge but do not say what the owner intends to do next.
- A board alone can display debt without creating a lightweight processing habit.
- Moves, archive, notes, conflicts, and metrics must be precise enough that the owner trusts them.

### Target users

- The current single-owner AI Brain user processing personal research, articles, notes, PDFs, videos, Telegram/Recall imports, and extension/Android captures.
- Power users who need deterministic batch-scale browsing, but not team assignment, planning, or collaboration.

## 3. Product principles

1. **Process before display.** Inbox is a next-decision loop; Board is secondary.
2. **One source, one explicit outcome.** Do not auto-complete or auto-archive.
3. **Separate concepts.** Workflow status, User tags, AI topics, quality/enrichment, SRS Review, and archive remain independent.
4. **Canonical source truth.** Existing item detail and My notes contracts remain canonical.
5. **Honest recovery.** Never claim a move that is pending, failed, conflicted, or unknown.
6. **No surprise backlog.** Existing items enter only through explicit enrollment.
7. **Calm metrics.** Show backlog health and useful throughput, not streaks, guilt, time-in-app, or churn totals.
8. **Accessibility is structural.** Drag is optional enhancement; every task has a native non-drag path.
9. **Privacy-first history.** Events contain workflow metadata, not source or note content.
10. **Stay lightweight.** No assignees, dates, sprints, WIP limits, dependencies, or collaboration.

## 4. Scope

### First-release proposal

- Dedicated desktop Processing navigation peer to Library.
- Mobile Processing entry under More, plus Library Inbox summary and “Saved to Inbox” capture feedback.
- Inbox, Board, List, and Archived views.
- Inbox / To Do / In Progress / Done workflow lifecycle.
- Single-item move through native controls; desktop pointer drag as enhancement.
- User tag and AI topic filters with explicit algebra and scoped counts.
- Existing item-detail route with workflow control and safe notes.
- Versioned optimistic move/archive/restore/reprocess with pending, success, failure, conflict, unknown-outcome, and Undo handling.
- Done-only archive, Archived view, Restore to Done, and explicit Reprocess to Inbox.
- Deterministic ordering, persisted view/filter preference, URL context, and return anchor.
- Backlog/processed/added/completed metrics with content-free events.
- Explicit existing-item enrollment.

### Removed from first-release scope after review

- Batch move and batch archive. They remain future work requiring a separate partial-outcome/receipt prototype.
- Manual priority/rank.
- Offline mutation queue.
- Editable quick preview; quick preview is read-only and optional.

## 5. Non-goals

- Task/project management: assignees, due dates, reminders, dependencies, sprints, WIP limits, team roles.
- Changes to source content, enrichment, note consent, or SRS Review semantics.
- Global content archive/deletion.
- Multiple notes per item or silent note rewriting.
- Production implementation, migrations, APIs, flags, deployment, or rollout in this exploration.

## 6. Information architecture and navigation

### Desktop

- Sidebar peer: `Library` → `Processing` → existing destinations.
- Badge: unfiltered enrolled active Inbox total.
- Processing default route: Inbox.

### Mobile

- Processing is reachable under More in the initial proposal.
- Library shows a visible summary: `{N} saved sources waiting in Processing` with Open Inbox.
- Every successful new capture says `Saved to Library and Processing Inbox` when Processing is available.
- Discovery gate: if more than 20% of moderated users cannot find Processing unaided, promote it to primary bottom navigation before implementation approval.

### Naming validation

Use Processing in v2. Before authorization, run a five-second comprehension comparison with Processing, Inbox, and Queue using the same screen.

## 7. Product model

### Workflow status definitions

| Status | Meaning | Permitted next action |
|---|---|---|
| Inbox | Enrolled source has not received the current processing decision. | Leave; move to To Do, In Progress, or Done. |
| To Do | Deliberately saved for later action. | Move to any active status. |
| In Progress | Owner is actively using or working through the source. | Move to any active status. |
| Done | Current processing intent is complete. | Move to any active status or archive. |

- Same-state move is a no-op and creates no event.
- Returning/reprocessing to Inbox starts a new Inbox-entry episode and a new current-entry timestamp.
- Status is not a tag or AI topic.

### Archive

- Separate nullable `workflow_archived_at`; only Done can archive. The prefix makes clear that this hides an item from active Processing only; it is not global content archive.
- Never automatic.
- Restore clears archive and remains Done.
- Reprocess is one explicit atomic command that clears archive and enters Inbox while preserving both history facts.

### Archive downstream matrix

| Surface | Behavior after workflow archive |
|---|---|
| Active Processing | Exclude. |
| Archived view | Include with archive time and Restore/Reprocess. |
| Library | Include; Archived from Processing badge/filter. |
| Item detail / My notes | Include; workflow archive badge; notes unchanged. |
| Exact/semantic search | Include; badge and optional archive facet. |
| Ask and citations | Include by default; citation/detail can disclose workflow archive. |
| Related | Include; badge when shown. |
| Needs Upgrade / Attention Review / SRS | Eligibility unchanged; badge if surfaced. |
| Duplicate capture | Resolve to existing item; preserve status/archive; do not reset to Inbox. |
| Export | Include source and archive metadata according to existing export scope. |
| Enrichment/index/quality workers | Continue according to their own lifecycle; workflow archive does not pause them. |

Any exception is a pre-implementation no-go decision, not “where practical.”

## 8. Inbox default and existing items

### New captures

Every genuinely new `items` insert—web capture, standalone note, URL/article, browser selection, PDF, YouTube, Android, extension, Telegram, Recall, and future raw insert—initializes and enrolls Inbox transactionally. Duplicate, repair, transcript, enrichment, embedding, or upgrade paths preserve workflow lifecycle.

### Existing items

Legacy rows receive a valid dormant baseline but remain excluded from Processing and metrics until owner enrollment.

Enrollment choices show a count preview before confirmation:

- selected Library items;
- recent 30 days, capped at the newest 25 matching items, with overflow explained and a link to choose All;
- all existing items.

Enrollment sets current Inbox-entry time to enrollment time, never original capture time, and does not count as processed/completed.

## 9. Core journeys

### Process next

1. Open Processing Inbox.
2. Nothing is preselected.
3. Choose `Process next` or select a row.
4. Review source excerpt, User tags, AI topics, and read-only note summary.
5. Leave in Inbox or move to To Do / In Progress / Done.
6. On confirmed move, focus/selection advances to the next matching Inbox source.
7. Undo is available for 10 seconds after the confirmed one-level action; confirmation/replay carries `undoEligibleUntil`, and expiry retains current truth.

### Whole-workload review

1. Switch to Board or List.
2. Filters, URL state, and valid focus anchor persist.
3. Open or move any visible source through the same single-item action.
4. Desktop drag may move status; native Move remains the primary contract.

### Detail and notes

1. Open canonical `/items/[id]` with encoded Processing return context.
2. Status can change from detail without submitting/clearing the note.
3. Note navigation guard protects unsaved drafts.
4. Back restores view, filters, scroll/virtual anchor, and source focus if still valid; otherwise nearest valid anchor.

### Archive and recovery

1. Move source to Done.
2. Archive from Processing.
3. Archived source leaves active Processing only.
4. Restore to Done or choose Reprocess to Inbox.
5. Pending/failure/conflict rules apply identically.

## 10. Board and List

### Shared parity

Both expose source title/type, status, key labels, open, Move, Done-only Archive, counts, filter state, pending/failure/conflict state, and return context. Batch is not first-release parity because batch is out of scope.

### Board

- Columns: Inbox, To Do, In Progress, Done in stable DOM order.
- Counts are filtered visible matches; unfiltered total appears separately.
- Desktop pointer drag changes status only.
- Mobile shows one selected status at a time; no four-column horizontal board and no drag dependency.

### List

- Deterministic rows optimized for scanning.
- Status, source, labels, captured/current-entry age, and single-item actions.
- Same cursor/filter semantics as Board.

### Ordering

- Inbox: `workflow_inbox_entered_at ASC, id ASC`.
- To Do / In Progress: latest status-change descending, ID tie-break.
- Done: latest effective completion descending.
- Archived: archive time descending.
- No manual rank in v1.

## 11. Filtering and counts

- User tags and AI topics are separate multi-select facets.
- OR within a facet; AND across facets.
- Include explicit `No user tags` and `No AI topics` options.
- Active chips identify every value and support individual removal plus Clear all.
- URL and persisted preference use stable IDs, not display labels.
- AI topic changes may remove a source from the current result after a transparent refresh; focus moves to the next valid item and announces the changed count.

Count copy is typed by scope:

- Inbox: `{matching} sources match in Inbox · {total} total sources in Inbox`.
- Board/List: `{matching} active sources match across all statuses · {total} total sources in Inbox`.
- Archived: `{matching} archived sources match · {total} total sources in Inbox` when Inbox health remains visible.

## 12. Metrics

### Persistent hierarchy

1. **Inbox now** and **oldest current Inbox entry age**.
2. **Processed this week** compared with **Added this week**.
3. **Completed this week**.

Today may appear only as short-lived confirmation after an action, not a persistent pressure metric.

### Definitions

- **Added:** genuinely new items initialized by a successful capture and automatically enrolled in Inbox during the period. Duplicate/repair paths, manual legacy enrollment, return/reprocess to Inbox, and ordinary moves to Inbox are excluded.
- **Processed:** one effective owner-driven exit from each distinct Inbox-entry episode. Repeated movement outside Inbox does not count. An explicit later return/reprocess creates a new episode that may count once.
- **Triaged (diagnostic):** first effective deliberate Inbox exit in item lifetime.
- **Completed:** first effective deliberate Done entry in item lifetime for the headline; recurring Done entries remain diagnostic.
- **Archived:** effective archive events, diagnostic only.
- Linked Undo invalidates the target while it remains reversible. Undo-origin events cannot be undone.
- Owner timezone is explicitly initialized; week starts Monday.
- Metrics describe currently retained items. Hard delete removes events and may recompute prior totals downward.

## 13. Trust, failure, and recovery

- Save immediately through expected version + mutation ID.
- UI may optimistically place a source but marks it Pending until server confirmation.
- Success replaces Pending and enables Undo until the server-provided `undoEligibleUntil` timestamp (10 seconds after confirmation in this proposal).
- Local failure rolls back only that source and focuses Retry.
- 409 conflict shows current status/snapshot and does not silently reapply intent.
- Unknown/lost response queries mutation outcome before retrying.
- Deleted/inaccessible source is removed with source-local explanation and next-valid focus.
- Offline permits loaded read/filter/detail but disables workflow mutation; no queue promise.
- Error states never show stale metrics as authoritative; unknown values use em dash/unavailable.
- One persistent polite status region owns success/count/note messages; one alert region owns actionable failure/conflict.

## 14. Desktop, mobile, and accessibility

### Desktop

- Library-peer sidebar, full Inbox split, four-column Board, dense List.
- Keyboard completes every task without drag.

### Mobile

- Linear Inbox/List; one-status Board; bottom-navigation clearance.
- All task controls meet the product target of at least 44×44 CSS px.
- Library summary and More entry are both required in the usability test.

### Accessibility contract

- Visible-on-focus skip link and landmarks.
- Native lists and headings; no ARIA grid.
- Ordinary pressed view/status buttons unless a complete tabs pattern is implemented.
- Source-specific action names.
- Deterministic focus after move, archive, restore, reprocess, Undo, Retry, conflict, filtered removal, empty state, and detail return.
- Canonical route draft guard; no focusable background behind a modal because selected v2 uses no detail modal.
- Non-text control boundaries ≥3:1, text contrast per WCAG 2.2 AA, strong focus, reduced motion.
- Production no-go: NVDA, VoiceOver, TalkBack, 200%/400% zoom, text spacing, switch control, and virtualized focus tests.

## 15. Data requirements

- Status, workflow version, enrollment time, current Inbox-entry time, latest status-change/completion time, archive time.
- Append-only content-free workflow events with actor/origin/surface, mutation ID, target event for Undo, and timestamps.
- View/filter preference keyed by stable taxonomy IDs.
- No source text, URL, note content, digest, tag/topic label text, or provider content in analytics events.

## 16. Analytics and events

Required events are content-free and separate product analytics from canonical mutation history:

- Processing opened and entry source (sidebar, More, Library summary, capture feedback).
- View/filter changes with counts only.
- Move attempted/confirmed/failed/conflicted/unknown/reconciled.
- Archive/restore/reprocess/Undo outcomes.
- Detail opened/returned and return-anchor success.
- Enrollment preview/confirmed mode and count.

Success indicators during dogfood:

- share of new captures receiving a first Inbox decision within seven days;
- median current Inbox age and backlog trend;
- source-local mutation failure/conflict recovery success;
- Processing discoverability task completion;
- no increase in accidental note loss or archive misunderstanding.

No streaks, time-in-app, or raw move volume as success metrics.

## 17. Edge cases

- Untagged/topicless source.
- AI topic changes while filtered.
- Source deleted/inaccessible between list and action.
- Duplicate capture points to archived source without reset.
- Same-state no-op.
- Backward move from Done before archive.
- Restore versus Reprocess distinction.
- Lost response, retry, idempotent replay, two-tab conflict.
- Undo after source leaves filter; Undo expiry; Undo target version changed; Undo-of-Undo rejected.
- Empty Inbox while other statuses remain populated.
- Hard delete recomputes retained-item metrics.
- Long title, missing excerpt, metadata-only capture, note feature unavailable.

## 18. Acceptance criteria

All criteria are proposal gates; none is evidence of current implementation.

1. **Model:** Given one item with User tag Research, AI topic Memory science, quality metadata, status Inbox, and archive null, each concept can be queried and changed independently without altering the others.
2. **New capture:** For every named ingestion fixture, a genuinely new insert returns enrolled Inbox, version 1, current Inbox-entry time, and one initialized event in the same transaction; duplicate/repair fixtures preserve prior workflow lifecycle.
3. **Legacy:** A 100-item legacy fixture remains absent from Processing after baseline; selecting recent 30 days previews the exact count, caps at 25, and enrolls only confirmed IDs with enrollment-time Inbox age.
4. **Status:** Every active status can move to every other through a native control; same-state action creates no event/version change.
5. **Ordering:** Given known entry/change timestamps, Inbox/To Do/In Progress/Done/Archived return exact deterministic order with ID tie-breaks.
6. **Counts:** Default Inbox fixture shows `5 match · 5 total`; Research + Memory science shows the exact filtered Inbox number while total stays 5; Board labels active scope separately.
7. **Filters:** Research OR Writing combined with Memory science returns `(Research ∪ Writing) ∩ Memory science`; unlabeled options and chip removal behave exactly.
8. **Detail:** Open `/items/[id]` from Processing, edit an unsaved note, attempt return, receive Save/Discard/Keep editing protection, then restore exact view/filter/anchor/focus after a safe return.
9. **Notes independence:** Moving/archiving never saves, clears, or submits the note and note save never changes workflow version.
10. **Archive:** Only Done can archive; active Processing excludes it; every archive-matrix surface matches Include/Exclude/Badge behavior; Restore yields Done; Reprocess atomically unarchives and enters Inbox.
11. **Failure:** Pending is visible; injected local failure rolls back one source and focuses Retry; injected 409 shows current snapshot; lost response reconciles mutation ID before retry.
12. **Undo:** Confirmed reversible action offers one Undo through the returned `undoEligibleUntil` timestamp, exactly 10 seconds after confirmation. Before/at the boundary it restores state/focus and invalidates the target metric event; after the boundary the server returns `undo_expired` plus current truth and the UI announces expiry. Undo-of-Undo is rejected and redo is an ordinary move.
13. **Offline:** Loaded sources remain readable/filterable; every workflow mutation is disabled with explanation; no queued-success copy appears.
14. **Metrics:** Capture, enrollment, reprocess, exit, Undo, Done, archive, and hard-delete fixtures produce exact Added/Processed/Triaged/Completed results in owner timezone/Monday week.
15. **Performance:** At 10k and 50k fixtures, indexed count/page/oldest queries and virtualized interaction meet approved p95 budgets without unbounded payloads.
16. **Mobile:** At 390×844 and 320px CSS width, user finds Processing from Library/More, completes move/archive/restore/Undo, and no control is below 44×44 or obscured by fixed navigation.
17. **Accessibility:** Keyboard-only flow, focus trace, status messages, contrast, reduced motion, 200%/400% reflow, NVDA/VoiceOver/TalkBack, and virtualized no-drag tasks pass the recorded matrix.
18. **Privacy/security:** Unauthorized/invalid-origin writes fail; event payload inspection contains no content; cursor/body/ID bounds reject abuse.
19. **Scope:** No assignee, due date, reminder, dependency, sprint, WIP limit, collaboration, or production implementation enters this proposal.
20. **Classification:** Every exposed artifact and wiki record says **Explored — not implemented** until separately authorized and shipped.

## 19. Risks and mitigations

| Risk | Mitigation / gate |
|---|---|
| Workflow feels like guilt/debt | Neutral language, no streaks, Inbox-first decision, dogfood pressure test. |
| Duplicates Library | Dedicated job, Library summary, canonical detail, remove preview if unhelpful. |
| Mobile entry is hidden | Two entry paths plus 20% failure promotion gate. |
| Legacy enrollment surprises | Dormant baseline, count preview, 25-item recent cap, explicit confirmation. |
| Archive resembles deletion | Complete downstream matrix and “Archived from Processing” copy. |
| Metric gaming/mistrust | Episode-based Processed, first-lifetime diagnostics, linked Undo, retained-item disclosure. |
| Concurrency loses intent | CAS, idempotency, current snapshot, unknown-outcome reconciliation. |
| SQLite scale/startup risk | Projection/index benchmarks and split resumable backfill. |
| Accessibility regresses with drag/virtualization | Native Move primary, production drag off until gates pass. |
| Scope expands into PM | Explicit non-goals and decision-log review at every milestone. |

## 20. Assumptions

- Single-owner private deployment and existing session authorization remain.
- `items` is the source aggregate; SRS `cards` is unrelated.
- Existing item detail/My notes remain canonical and may be feature-flagged according to current product rules.
- Current taxonomy stable IDs are available for filters.
- Exact UI copy and mobile placement remain stakeholder-validation inputs, not approvals.

## 21. Open questions for stakeholder feedback

Only these validation questions remain; technical semantics above are resolved for v2:

1. Do users understand Processing faster than Inbox or Queue?
2. Does read-only quick preview improve decision speed/confidence enough to keep?
3. Does More + Library summary meet the mobile discovery gate, or should Processing become primary nav?
4. Is the recent-enrollment cap of 25 appropriately calm for real owner backlogs?
5. Does episode-based weekly Processed feel accurate without creating pressure?

## 22. Future opportunities

- Separately designed batch move/archive with durable per-item receipts and partial outcomes.
- Manual prioritization after deterministic-order evidence.
- Saved processing views and keyboard shortcuts.
- Primary mobile navigation promotion.
- Broader offline workflow only as a sync/outbox project.

## 23. Review resolution summary

- Aligned metrics, recent-enrollment cap, mobile entry, archive, detail, and batch decisions across v2 artifacts.
- Added a complete archive matrix and removed “where practical.”
- Replaced modal-as-canonical prototype with route-based detail and draft protection.
- Fixed count scopes, mobile targets, focus, view semantics, control contrast, and core failure/conflict fixtures.
- Deferred batch instead of approving an untested safety contract.
- Preserved unproven production/AT/scale behavior as explicit no-go gates.

This PRD remains a proposal for review. It does not authorize production work.
