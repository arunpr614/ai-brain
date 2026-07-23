# Card Processing Workflow — PRD v1

**Proposal name:** Processing
**Status:** Recommended discovery proposal awaiting adversarial and stakeholder review
**Classification:** **Explored — not implemented**
**Version:** v1 · 2026-07-11
**Repository baseline:** `1cb5d36f37611e60442b4f2c4433b45455273500`
**Primary evidence:** [current-state report](../research/current-state-report.md), [product directions](product-directions.md), [metrics framework](metrics-framework.md), [platform/data assessment](../research/platform-data-workflow-assessment.md), [architecture options](../technical/architecture-options.md)

## 1. Recommendation

Prototype and plan **Processing: an Inbox-first triage experience with a secondary Board and List**.

Library remains the durable home for all saved sources. Processing answers a different question: **what still needs a decision or action?** Every new source enters Inbox. The owner can move it through To Do, In Progress, and Done, then explicitly archive completed work from the active workflow without deleting or hiding the source from Library, search, Ask, Related, or export.

The desktop navigation label is **Processing**, immediately after Library, with a neutral Inbox-count badge. “Inbox” remains the landing view and the more immediately understandable job label. The prototypes must compare Processing and Inbox naming; v2 may change the navigation label if comprehension evidence strongly favors Inbox.

## 2. Goal

Help AI Brain's single owner turn passive capture accumulation into deliberate, recoverable decisions while preserving the product's source-first, trust-before-magic posture.

The experience should make it easy to:

1. see what is waiting;
2. process one source without losing place;
3. revisit active sources;
4. complete and optionally archive them;
5. retain full knowledge value everywhere else in AI Brain.

## 3. User problem

AI Brain makes capture intentionally easy across web, Android, extension, Telegram, PDFs, notes, and Recall. The current Library then presents a chronological collection. It does not persist whether the owner has intentionally reviewed a capture, plans to act on it, is working with it, has completed it, or wants it removed from an active workflow.

The result is a “save now, maybe understand later” backlog. A board alone would visualize that backlog; it would not necessarily help the user process it. The proposed Inbox-first loop creates one obvious next action and makes Board/List secondary tools for intentionally active work.

## 4. Target user

Primary target:

- the single owner of AI Brain;
- a high-volume reader/watcher who captures business, product, technology, AI, and long-form knowledge;
- comfortable with keyboard and power workflows;
- values ownership, source fidelity, recovery, and retrieval more than team-project features.

Not a target:

- collaborative teams;
- task/project managers needing assignees, deadlines, dependencies, sprints, or workload planning;
- a general-purpose kanban or issue tracker.

## 5. Product principles

1. **A source stays a source.** Processing is a lifecycle projection of the existing `item`, not a new content object.
2. **One clear starting point.** Inbox-first triage is the default; Board is a secondary overview.
3. **Status is not taxonomy.** Workflow status, user tags, AI topics, and archive state remain separate.
4. **Reversible by design.** Backward moves, Undo, archive restore, and conflict reconciliation preserve trust.
5. **Library remains complete.** Processing never replaces browsing, reading, search, Ask, notes, quality review, or collections.
6. **Drag is enhancement.** Every action works without drag, pointer precision, or visual color recognition.
7. **Calm, not compulsive.** No streaks, overdue framing, red debt badges, or proactive v1 notifications.
8. **Metrics answer a decision.** Show backlog health and meaningful first milestones; do not reward movement churn.
9. **Online writes, honest offline.** Read-only cached state may remain visible; mutations are disabled rather than silently queued.
10. **Prototype before migration.** This phase changes no production UI, schema, APIs, flags, or runtime.

## 6. Scope

### V1 proposal includes

- Dedicated Processing section comparable in importance to Library.
- Inbox, Board, List, and Archived views.
- Workflow states: Inbox, To Do, In Progress, Done.
- Every new capture enrolled into Inbox by default.
- Explicit enrollment choices for existing Library sources.
- Status movement in rows, cards, item detail, and batches.
- Cross-column drag on desktop Board as progressive enhancement.
- Labeled Move to menu as the primary accessible alternative.
- Deterministic ordering; no manual intra-column rank in v1.
- Combined filters for User tags and AI topics, plus optional source/quality filters.
- Filtered matching counts and separately labeled total Inbox health.
- Current-state counts, processed/completed metrics, oldest Inbox age, and added/triaged weekly context.
- Existing full item-detail route with Processing status controls and contextual return.
- Existing attached My notes on the canonical detail route when its flags are enabled.
- Done-only archive, batch archive, Undo, Archived view, restore to Done, explicit Reprocess to Inbox.
- Loading, empty, filtered-empty, failure, offline, conflict, deleted/inaccessible, and AI-topic-change states.
- Desktop and mobile behavior with action parity.

### Non-goals

- Assignees, roles, teams, sharing, comments, mentions, or activity feeds.
- Due dates, reminders, overdue states, recurrence, estimates, sprints, dependencies, WIP limits, or automation.
- AI-generated priority or automatic status movement/completion/archive.
- A second notes editor, reading surface, search index, or content copy inside Processing.
- Replacement of Library, Needs Upgrade/quality Review, SRS Review, Ask, Related, tags/topics, or collections.
- Archive-as-delete, archive-as-worker-cancellation, or hiding archived sources from Library/search/Ask by default.
- Offline workflow mutation queue.
- Manual intra-column priority/ranking in v1.
- Production implementation during this goal.

## 7. Information architecture and naming

### Desktop

Add **Processing** directly after Library in the primary sidebar. Show a neutral Inbox badge, capped at `99+` in constrained navigation. Never use red, overdue, pulse, or loss-framed copy.

Processing internal navigation:

1. **Inbox** — default focused triage list.
2. **Board** — all enrolled active states as four columns.
3. **List** — all enrolled active states in a grouped/flat list.
4. **Archived** — completed sources hidden from active Processing.

### Mobile

Do not displace Library, Capture, Ask, or More in v1. Provide:

- an Inbox row in More; and
- a compact, tappable Library summary such as `Inbox 18 · oldest 12d`.

Mobile bottom-nav promotion is a future dogfood decision, not a launch assumption.

### Relationship to Library

| Library | Processing |
|---|---|
| “What have I saved?” | “What needs a decision or action?” |
| Complete durable collection | Explicitly enrolled active workflow projection |
| Browse/search/read/export | Triage/move/complete/archive |
| Existing source/quality/tag filters | User tags + AI topics + workflow status; optional source/quality |
| Opens canonical item detail | Opens the same canonical item detail with contextual return |

## 8. Workflow model

### Status definitions

| Status | Meaning | Default order | Permitted transitions |
|---|---|---|---|
| Inbox | Enrolled capture not yet deliberately triaged | Oldest captured first; optional newest first | To Do, In Progress, Done |
| To Do | Intentionally retained for later action | Most recently moved first | Inbox, In Progress, Done |
| In Progress | Actively being read, noted, repaired, or used | Most recently moved first | Inbox, To Do, Done |
| Done | Intended processing action is complete | Most recently completed first | Inbox, To Do, In Progress; Archive |

All active states may move backward or forward. A backward move is a valid user decision, not a failure. Moving to the same state is a no-op.

### Ordering and prioritization

V1 drag changes **status only**. It does not imply arbitrary position or priority.

- Inbox default: `captured_at ASC, id ASC`.
- To Do/In Progress/Done: `workflow_status_changed_at DESC, captured_at DESC, id`.
- Archived: `archived_at DESC, id`.
- Board/List use the same deterministic ordering.
- Manual priority/rank requires a separate future schema, conflict, keyboard, filtering, and rebalance contract.

### Save behavior

- Changes save immediately.
- UI may move the affected source optimistically while showing a pending state.
- Server-confirmed version is authoritative.
- Other cards/columns must not globally jump or reload when one action fails.

## 9. Inbox behavior

### New captures

Every newly created, non-duplicate item enters and enrolls in Inbox in the same database transaction as capture. This covers:

- web note, URL, and PDF;
- Android/extension note and URL APIs;
- Telegram URL, text note, and PDF;
- new Recall imports;
- future direct insert callers protected by database defaults/triggers.

Duplicate capture, transcript upgrade, repair, enrichment, embedding, transcript recovery, and note indexing preserve existing workflow status, participation, version, and archive.

If a duplicate matches an archived source, the capture result explains that the existing source remains archived and offers an explicit Restore action. It never silently unarchives.

### Existing sources

Migration gives every legacy item a valid dormant Inbox baseline but does not silently place it in the visible Processing backlog. A nullable `workflow_enrolled_at` separates technical lifecycle validity from product participation.

First use offers count-previewed choices:

1. Start with new captures only — default.
2. Bring in recent captures — recommended, up to the recent 30-day cohort shown with exact count.
3. Choose sources from Library.
4. Bring in all history — advanced, explicit, resumable.

Enrollment does not count as added, processed, completed, or a duration sample. Unenrolled is an internal participation boundary, not a fifth user-facing status.

### Processing one source

1. Inbox opens oldest-first at the last stable anchor for the current URL state.
2. The user opens a source or uses a concise quick preview.
3. Labeled actions offer To Do, In Progress, Done, or Leave in Inbox.
4. After confirmation, focus advances to the next matching source at the same index.
5. Undo returns the source and focus when it still matches the query.

## 10. Kanban and List behavior

### Board

- Four labeled column regions: Inbox, To Do, In Progress, Done.
- Each header shows **matching** count for the current filters.
- Columns paginate independently with keyset cursors and virtualization.
- Desktop supports pointer/touch cross-column drag.
- Drop target changes status only and inserts by deterministic order.
- Every card exposes the same Move to command.
- Archive appears only on Done sources.

### List

- Supports grouped-by-status or flat status display.
- Provides Open, Move to, Archive/Restore, selection, and bounded batch actions.
- Uses the same filter predicate, counts, mutation contract, ordering, and archive rules as Board.

### View and place persistence

- URL is canonical for view, active/archive scope, filters, search, status, and sort.
- Direct Processing entry always lands on Inbox.
- Board/List preference may persist locally for the active-work sub-area.
- Switching Board/List preserves filters, selection, loaded cursors, and best available per-status anchor.
- Detail return state is a validated Processing URL plus an opaque/safe anchor, never an arbitrary external URL.
- Scroll anchors live only for the browser session.

### Scale

- Never infer totals from loaded rows.
- Default page size is approximately 50.
- Desktop board keeps no more than about 200 card DOM nodes plus small overscan.
- Mobile does not render four miniature horizontal columns; it uses Inbox/List and a one-status-at-a-time segmented board.

## 11. Filtering

### Facets

- **User tags:** IDs from `tags.kind='manual'`.
- **AI topics:** IDs from `topics/item_topics`.
- Optional secondary facets: source type and capture quality.
- Status and active/archive scope are separate controls.

### Algebra

- Values within one facet are OR.
- Facets combine with AND.
- Example: `(tag Research OR Writing) AND (AI topic Productivity) AND status Inbox`.
- “No user tags” and “No AI topics” are explicit values.

### Communication

- Active filters appear as removable labeled chips and in the URL.
- Clear all is visible whenever any filter is active.
- Column/status counts show matching results.
- Total Inbox count and oldest age remain explicitly labeled total/unfiltered.
- If AI topic regeneration removes a source from the current filtered result, announce the membership change; do not alter workflow status.

## 12. Card detail and notes

- The canonical interaction is the existing `/items/[id]` route.
- Add a compact Processing status control, current version/pending state, Move to, Archive when Done, Restore when archived, and recent Undo when applicable.
- Return text is contextual: Back to Processing/Inbox/Board/List when entered from Processing; direct links keep Back to Library.
- Preserve filters, anchor, and next-source intent.
- The optional quick preview in the prototype may show source excerpt, tags/topics, quality, notes-present indicator, and status actions.
- Quick preview does not edit My notes in v1. “Open full item” reaches the existing detail route.
- Existing note drafts, autosave, conflict, offline journal, navigation safety, consent, and deletion/recreation behavior remain independent. A workflow mutation must never clear or submit a note.

## 13. Batch actions

V1 supports bounded selection of loaded sources only:

- move selected active sources to one status;
- archive selected eligible Done sources;
- restore selected archived sources to Done;
- clear selection with Escape.

Rules:

- Selection clears when scope, filters, search, sort, or active/archive mode changes.
- Selection persists across Board/List for the same normalized query.
- “Select all matching” is deferred.
- The action preview states selected and eligible counts.
- The technical v1 plan decides all-or-nothing versus explicit partial-result semantics; the UI must never report full success when any source conflicted or failed.
- Undo targets exactly the confirmed successful set and is version checked.

## 14. Completion, archive, and restore

- Completion is a deliberate entry to Done.
- Completion does not auto-archive.
- Only enrolled, active Done sources may archive.
- Archive sets a separate `archived_at`; `workflow_status` remains Done.
- Individual and bounded batch archive are supported.
- A confirmed archive exposes Undo for at least 10 seconds.
- Archived view supports Open, Restore to Done, and Reprocess to Inbox.
- Restore clears `archived_at` and leaves status Done.
- Reprocess is a separate explicit move from restored Done to Inbox.
- Archived sources are hidden only from active Processing.
- They remain visible/eligible in Library, item detail, exact/semantic search, Ask, Related, Needs Upgrade/quality Review, and export, with an Archived badge where practical.
- Archive does not cancel background enrichment, transcript, embedding, or note-index work.
- Hard delete remains separate and removes the item plus workflow history under current privacy-first cascade semantics.

## 15. Metrics

### Canonical definitions

- **Inbox now:** current enrolled, non-archived Inbox count.
- **Oldest Inbox age:** now minus the oldest current enrolled Inbox start/capture boundary.
- **Processed/triaged:** a source's first effective, deliberate, non-undone exit from Inbox. It counts once per item lifetime.
- **Completed:** a source's first effective, deliberate, non-undone entry to Done. It counts once per item lifetime.
- **Added:** a genuinely new item initialized/enrolled by capture; duplicate/repair/enrollment excluded.
- **Archived:** archive events; not a headline success measure.
- **Today/week:** boundaries in a persisted owner timezone; week starts Monday; timestamps remain UTC epoch milliseconds.

Ordinary return to Inbox and later exit does not inflate processed. It may contribute to a separate diagnostic exit count. Undo can invalidate the qualifying first event; a later effective event can become first.

### Recommended display

Primary:

1. Inbox now + oldest age.
2. Processed this week versus newly added this week.
3. First completions this week.

Secondary Activity disclosure:

- processed today;
- completed today;
- current counts by status;
- archive activity;
- average time in Inbox only after sufficient post-launch samples, with sample size.

Do not show streaks, time in app, raw transitions, archive count as value, zero-Inbox celebrations, or notification opens.

### Privacy

Workflow history and any optional local instrumentation are content free. Prohibited fields include title, body, URL, note, summary, query, tag/topic name, transcript, citation, auth, token, and secret.

## 16. Desktop experience

- Existing left sidebar and dark/light Prism Memory tokens.
- Processing header, neutral total Inbox badge, restrained health strip, internal tabs, filters, and main task.
- Inbox uses a calm list with optional concise preview pane at wide widths.
- Board uses four equal/near-equal virtualized columns.
- List uses a dense but readable single surface.
- Item detail stays full route and may use its existing companion rail for workflow controls.
- Loading preserves column/list geometry to limit layout shift.

## 17. Mobile experience

- Entry from Library summary or More.
- Inbox list is the default and primary processing surface.
- Filters use the existing bottom-sheet pattern.
- Board becomes a segmented one-status-at-a-time list, with counts for all states.
- No drag is required. Move to is always visible/available.
- Source detail uses existing tabs; Processing status is available in a compact sticky/non-obscuring control.
- Fixed bottom navigation must not cover rows, toasts, Undo, menus, or primary actions.
- Minimum touch target is 44×44 CSS pixels.

## 18. Accessibility

- Every drag operation has a labeled Move to equivalent using the same domain command.
- Columns are labeled regions with headings and matching counts; cards remain list items, not an ARIA grid unless a full grid model is implemented.
- Move menu supports arrow keys, Enter, and Escape.
- Focus remains on the affected source while pending, then moves predictably to the new instance/next row/destination heading.
- Polite live region announces move, count changes, archive/restore, Undo, load-more, and filter-membership changes.
- Errors/conflicts requiring action use an alert.
- Status, pending, conflict, and archive never rely on color alone.
- Controls meet contrast, zoom/reflow, reduced-motion, and target-size expectations.
- Virtualization must preserve focused elements and announce newly loaded results.
- Mobile and List provide complete task equivalence without drag.

## 19. Data requirements

Planning assumption from [architecture options](../technical/architecture-options.md):

- current state on `items`: status, version, initialized/status-changed/enrolled/archive timestamps;
- append-only content-free `item_workflow_events`;
- database default and after-insert initialization for new items;
- dormant baseline for legacy items;
- explicit enrollment runs for recent/selected/all history;
- unique mutation IDs, request hashes, per-item versions, and compare-and-swap;
- dedicated workflow query repository for filters/counts/cursors;
- no manual rank in v1.

This PRD does not authorize those changes.

## 20. Failure and recovery states

| State | Required behavior |
|---|---|
| Initial loading | Stable list/column skeletons with labeled regions |
| Empty Inbox | “Nothing waiting for a decision” plus Library/Capture actions |
| Empty state | Explain the selected status has no sources |
| Filtered empty | Name active filters and offer Clear filters |
| Move pending | Mark only affected source pending; disable duplicate mutation |
| Slow unknown | After ~3 seconds say Still saving; reconcile before enabling Retry |
| Network/5xx/503 | Restore confirmed position, retain intent, show Retry |
| Conflict/409 | Render canonical current state; explain changed elsewhere; offer Use current or reapply |
| Archive failure | Keep source in Done |
| Restore failure | Keep source archived |
| Undo conflict | Never overwrite newer state; show current state and new Move action |
| Offline | Keep readable cached state if available; disable mutations with explanation; no silent queue |
| Deleted/404 | Remove source and announce no longer available |
| Access/session loss | Preserve visible context, require unlock/sign-in, do not claim save |
| AI topic changes | Update filtered membership and count; never move workflow status |
| Notes unsaved/conflicted | Existing navigation-safety/recovery controls take precedence over Process next |

## 21. Acceptance criteria

### Core model

- AC-01: A Processing card maps one-to-one to an existing `item`; no SRS `cards` reuse.
- AC-02: Status, manual tags, AI topics, enrichment/quality, and archive are visibly distinct.
- AC-03: All four active statuses have precise meanings and allow backward/forward movement.
- AC-04: Archive is separate, Done-only, reversible, and never hard delete.

### Capture and migration

- AC-05: Every new-item path proves enrolled Inbox initialization.
- AC-06: Duplicate/repair/upgrade paths preserve lifecycle/archive/version.
- AC-07: Legacy items remain outside visible Processing until explicit recent/selected/all enrollment.
- AC-08: Baseline/enrollment does not inflate added/processed/completed/duration metrics.

### Views and filters

- AC-09: Inbox, Board, List, and Archived share one item identity and mutation contract.
- AC-10: Board/List have parity for Open, Move, archive/restore, filters, counts, and bounded batches.
- AC-11: Drag has a complete keyboard/screen-reader/touch alternative.
- AC-12: User-tag and AI-topic filters implement OR-within/AND-across and explicit unlabeled values.
- AC-13: Matching counts and total Inbox health cannot be confused.
- AC-14: Pagination/virtualization never infers totals from loaded sources.

### Detail and trust

- AC-15: Opening/returning from detail restores normalized URL state and the best valid anchor.
- AC-16: Status changes are possible from detail without coupling to note save.
- AC-17: Failure rolls back only the affected card; conflict never silently overwrites.
- AC-18: Undo is a new version-checked operation and does not erase history.
- AC-19: Multi-tab/device changes converge through versioned server state and revalidation.
- AC-20: Offline behavior is read-only and honest.

### Archive and metrics

- AC-21: Only Done may archive; Restore returns to Done; Reprocess is explicit.
- AC-22: Archived sources stay in Library/search/Ask/Related/Review/export in v1.
- AC-23: Processed and completed count first effective qualifying events once per item.
- AC-24: Today/week use owner timezone/Monday boundaries and content-free events.
- AC-25: Hard delete's effect on recomputed history is documented.

### Responsive/accessibility/prototype

- AC-26: Desktop 1440×1024 and mobile 390×844 complete the core workflow without clipped/covered primary controls.
- AC-27: Focus, live announcements, contrast, reduced motion, reflow/zoom, and 44px targets pass the review checklist.
- AC-28: Prototypes visibly state “Throwaway prototype · Explored — not implemented.”
- AC-29: Prototypes use only static fictional data and do not import production code/runtime data.
- AC-30: Loading, empty, filtered-empty, failure, conflict, offline, archive, restore, and Undo states are reviewable.

## 22. Analytics and events

Canonical domain events:

- `legacy_baselined`
- `initialized`
- `enrolled`
- `status_changed`
- `archived`
- `restored`
- explicit reversal via event origin `undo`

Optional local operational events may record attempt/result/latency/conflict/replay/rollback with opaque item ID, operation, surface, device class, timestamp, normalized result/error code, and no private content.

No external analytics service is proposed.

## 23. Risks

| Priority | Risk | Mitigation |
|---|---|---|
| P0 | Workflow implemented on SRS `cards` | Domain decision and code naming: UI card = item |
| P0 | Silent history becomes overwhelming backlog | Dormant legacy baseline + explicit enrollment |
| P0 | A capture path misses Inbox | Database default/trigger + path matrix |
| P0 | Lost multi-tab/device update | CAS, idempotency, 409 current snapshot, no last-write-wins |
| P0 | Archive unexpectedly hides knowledge | Workflow-only archive matrix + visible badge |
| P1 | Metrics reward churn or migration | First-effective definitions; origin exclusions; content-free events |
| P1 | Board fails at large scale | Dedicated queries/counts/cursors/virtualization and performance budgets |
| P1 | Drag excludes users | Move menu is primary semantic command; mobile/list equivalence |
| P1 | Processing duplicates Library/detail/notes | Explicit relationship and canonical route reuse |
| P1 | AI taxonomy wording is unstable | User tags + AI topics as separate ID facets |
| P1 | Scope becomes project management | Enforced non-goals and Inbox-first default |
| P2 | No manual rank disappoints board users | Prototype deterministic ordering; future ranking only if validated |
| P2 | Mobile entry is buried | Library Inbox summary + More; dogfood promotion rule |

## 24. Assumptions

- AI Brain remains single-owner and single-store.
- Current code remains the behavioral source of truth.
- Attached Notes may remain feature-flagged; Processing cannot require them.
- Archive means hidden from active Processing only in v1.
- Workflow mutations require connectivity.
- Owner timezone can be stored/configured before metrics ship.
- Legacy participation is explicit.
- Drag library/virtualization dependencies have not been selected.

## 25. Open questions for adversarial/prototype review

1. Does the top-level label Processing communicate the job, or should navigation say Inbox?
2. Is the optional quick-preview pane materially faster than opening the canonical detail route without creating a misleading second detail surface?
3. Is deterministic ordering sufficient, or does To Do/In Progress require manual priority in the first implementation?
4. Should archived sources remain in Needs Upgrade/quality Review with a badge? V1 recommendation is yes.
5. Should batch writes be all-or-nothing or return explicit partial success? UX must not mask either behavior.
6. Which minimal mobile placement makes Inbox discoverable without replacing a proven bottom-nav item?
7. Are primary metrics best as weekly backlog health, or is processed today needed for useful short-session feedback?

## 26. Future opportunities

- Manual priority/ranking for To Do/In Progress after evidence.
- Opt-in weekly local summary if the owner finds Processing valuable but forgets it.
- Mobile bottom-nav promotion after four-week dogfood.
- Saved views only if repeated filter combinations emerge.
- Content-free daily rollups only after event-query cost is measured.
- A read-only quick-detail drawer after canonical-route flow proves insufficient.
- API/MCP workflow reads after session/bearer policy is explicitly extended.

## 27. V1 decision posture

This PRD recommends Processing and is ready for adversarial review. It is not an approved implementation specification. PRD v2 must resolve every material review finding and remain explicitly **Explored — not implemented** until separate implementation authorization, code review, migration rehearsal, rollout, and release verification occur.
