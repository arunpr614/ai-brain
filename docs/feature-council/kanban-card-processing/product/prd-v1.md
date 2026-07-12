# Kanban Card Processing — PRD v1

**Status:** Implementation authorized; not yet implemented or production-verified
**Version:** v1
**Date:** 2026-07-12
**Repository baseline:** `origin/main` / worktree HEAD `5b92e68ec09ceb03f010db1c4fb14be5348a54bf`
**Selected direction:** Direction B — **Processing**, Inbox-first
**Requirements authority:** current execution goal plus `../discovery/approved-requirements-baseline.md`

## 1. Document authority and evidence

This PRD is the implementation-authorized v1 product contract. It does not claim the feature already exists, has shipped, or works in production. Goal completion still requires deployment, live verification, and current repository/GitHub Wiki documentation.

The prior package at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/` is abbreviated below as `KD/`. Its PRD v2 was explicitly an exploration proposal (`KD/product/prd-v2.md`, header and §23). Direction B and the compact Group & sort design were stakeholder-accepted for continued exploration (`KD/prototypes/AGENTS.md`, “Durable prototype decisions”). The current execution goal provides the later implementation authority. Current code remains authoritative for present behavior.

Current-main evidence is summarized in `../discovery/current-state-report.md` and `../discovery/relevant-code-map.md`. No production database, host, user content, or live traffic was inspected; production-volume and live-runtime claims remain release gates (`../discovery/current-state-report.md`, header and §§15–16).

## 2. Source conflicts and v1 resolutions

| Conflict | V1 resolution | Evidence |
|---|---|---|
| Older metrics framework defines Processed as first-lifetime Inbox exit; later reviewed artifacts use one exit per Inbox-entry episode. | **Processed** counts once per effective Inbox-entry episode; **Triaged** is the first-lifetime diagnostic. | `../discovery/approved-requirements-baseline.md`, CR-01; `KD/reviews/traceability-matrix-v2.md`, V2-20. |
| Accepted prototype includes “Custom fixture order,” while reviewed scope removes manual rank. | Do not implement fixture/custom rank. Production uses deterministic **Workflow default** plus approved field sorts. | Baseline CR-02; `KD/ux/ux-ui-v2.md` §18; PRD source §§4/10. |
| Accepted Board/List default is Oldest captured; Inbox correctness requires oldest current Inbox entry. | Dedicated Inbox is fixed oldest-current-entry-first. Board/List default is Workflow status + Oldest captured; Workflow default exposes lifecycle-specific ordering. | Baseline CR-03; `KD/prototypes/handoff/AI_AGENT_HANDOFF.md`; technical source §4.2. |
| Older research uses `archived_at`; later reviewed model uses `workflow_archived_at`. | Storage/API uses `workflow_archived_at`; UI says “Archived from Processing.” | Baseline CR-04; `KD/reviews/v2-consistency-review.md`, remediation disposition. |
| Older power-user research proposes batch and manual ordering; reviewed PRD removes both. | Both are deferred from v1. | Baseline CR-05; `KD/decisions/decision-log.md`, CPW-008/013. |
| Prototype persists `theme` in review URLs; production already owns appearance globally. | Preserve Light/Dark parity through the existing global theme system; no Processing-specific theme preference. | Baseline CR-06; `KD/ux/ux-ui-v2.md` §18. |
| Older technical plan refers to an existing `GET /api/items/[id]`; current main has none. | Canonical read remains server-rendered `/items/[id]`; workflow may add its own bounded endpoints but must not claim a generic item API exists. | `../discovery/current-state-report.md` §8. |
| Wiki says migration 024 is a candidate; current main contains and applies it. | New workflow migration uses the next full filename, proposed `025_item_workflow.sql`; production deployment remains unverified. | `../discovery/current-state-report.md` §15; `../technical/initial-data-migration-assessment.md` §4. |

## 3. Goal

Help the single AI Brain owner convert an accumulating capture backlog into deliberate, recoverable decisions without losing source context, notes, searchability, or trust.

The release succeeds when every genuine new source enters a visible Inbox, the owner can process it across Inbox/To Do/In Progress/Done using accessible single-item controls, and the lifecycle remains accurate through filtering, detail navigation, archive, concurrency, failure, Undo, large backlogs, mobile use, and production rollout.

## 4. User problem

- Capture is faster than review, so Library accumulates sources without a next decision.
- Existing tags, AI topics, collections, quality state, and enrichment state describe content or system processing, not owner intent.
- A board alone can display debt without creating a calm triage habit.
- The current product has no workflow state, workflow archive, workflow history, or exact processing metrics (`../discovery/current-state-report.md` §§3, 7, 10).
- Users will not trust the workflow if moves, notes, archive, counts, retries, conflicts, or Undo can lie or lose state.

## 5. Target users

- Primary: the current private, single-owner AI Brain user processing articles, URLs, notes, PDFs, YouTube, Telegram, Recall, browser-extension, Android, and future captured sources.
- Secondary: the same owner operating as a power user with large backlogs, deterministic browsing, keyboard needs, and multi-tab/device use.
- Not targeted in v1: teams, assignees, managers, collaborators, or multi-tenant organizations.

## 6. Product principles

1. **Process before display.** Inbox is the landing job; Board and List are supporting lenses.
2. **One source, one explicit outcome.** Never auto-complete or auto-archive.
3. **Independent concepts.** Workflow, tags, AI topics, category, collections, quality, enrichment, Review, notes, and archive do not masquerade as each other.
4. **Canonical source truth.** Existing `items`, item detail, and My notes remain canonical.
5. **Honest recovery.** Pending, failed, conflicted, unknown, and expired states are never shown as confirmed success.
6. **No surprise backlog.** Historical items enter Processing only through explicit enrollment.
7. **Calm metrics.** Backlog health and useful throughput, not streaks, guilt, or activity volume.
8. **Accessibility is structural.** Drag is optional; native Move completes every task.
9. **Privacy-first history.** Workflow history contains bounded lifecycle facts, never captured or note content.
10. **Stay lightweight.** Do not become project-management software.

## 7. First-release scope

### In scope

- Desktop Processing navigation peer and mobile entry under More.
- Library mobile Inbox summary and explicit post-capture Inbox feedback.
- Inbox, Board, List, and Archived views.
- Inbox / To Do / In Progress / Done lifecycle attached to existing `items`.
- Native single-item Move everywhere; optional gated desktop status drag.
- Shared compact Board/List Group & sort control and Light/Dark parity.
- User-tag and AI-topic multi-select filters with exact count scopes.
- Canonical item-detail route with workflow control, safe notes, and deterministic return.
- Versioned optimistic move/archive/restore/reprocess and one-level server Undo.
- Done-only workflow archive, Restore to Done, and atomic Reprocess to Inbox.
- Explicit legacy enrollment and transactional new-capture Inbox initialization.
- Bounded keyset pagination, large-backlog performance, responsive/mobile equivalence.
- Content-free history, exact weekly metrics, owner timezone.
- Feature flags/readiness, rollout, observability, rollback, production verification, docs/wiki update.

### Deferred from v1

- Batch move/archive/restore.
- Manual rank, drag reorder, priority scores, saved named views.
- Offline mutation queue/synchronization.
- Editable or required quick preview.
- General content archive across Library/search/Ask.

## 8. Non-goals

- Assignees, due dates, reminders, dependencies, sprints, WIP limits, team roles, collaboration.
- Changes to captured source content, enrichment, embeddings, capture quality, note consent/index policy, or SRS semantics.
- Multiple notes per item or silent note rewriting.
- Replacement of Library, item detail, search, Ask, Related, Review, or hard delete.
- Population analytics, DAU/retention claims, third-party analytics, or cross-owner comparison.
- Native Android data model; current Android is a hosted WebView and should inherit the web experience unless client contracts change (`../discovery/current-state-report.md` §1).

## 9. Information architecture and navigation

### Desktop

- Add `Processing` immediately after Library as a primary sidebar peer.
- Badge is the unfiltered enrolled active Inbox total; visual navigation may cap display at `99+`, never the page value.
- Primary route `/processing` opens a clean, unfiltered Inbox.
- Processing child routes retain Processing shell highlighting.

### Mobile

- Add Processing under More without displacing Library, Capture, or Ask initially.
- Library shows `Inbox {N} · oldest {age}` with Open Inbox.
- Every successful genuinely new capture says `Saved to Library and Processing Inbox` when Processing is available.
- If more than 20% of moderated users cannot find Processing unaided, promote it to primary bottom navigation before broad rollout.

### Naming

Use **Processing** for the section and **Inbox** for its landing state. A five-second Processing/Inbox/Queue comparison may reopen the label before broad rollout, but does not block backend implementation.

## 10. Workflow model

| Stored status | Label | Meaning | Permitted next action |
|---|---|---|---|
| `inbox` | Inbox | Enrolled source awaiting its current processing decision. | Leave; Move to To Do, In Progress, or Done. |
| `todo` | To Do | Deliberately retained for later action. | Move to any other active status. |
| `in_progress` | In Progress | Owner is actively using or working through it. | Move to any other active status. |
| `done` | Done | Current processing intent is complete. | Move to any other active status or Archive. |

Rules:

- Any active status can move to any other active status.
- Same-state Move is a true no-op: no event, version, timestamp, or metric change.
- Returning/reprocessing to Inbox creates a new entry episode and current-entry timestamp.
- Done is reversible and never auto-archives.
- Workflow status is not a tag, topic, category, quality, enrichment, or SRS state.

## 11. Default Inbox and legacy migration

### Genuinely new sources

Every successful new `items` identity initializes and enrolls Inbox in the same SQLite transaction at workflow version 1, with initialization/enrollment/status-change/current-entry timestamps and one initialized event. Current paths include web note/URL/PDF, JSON URL/note/PDF, extension, Android, Telegram, Recall, and future raw insert (`../discovery/current-state-report.md` §4).

Duplicate, duplicate-window rejection, URL upgrade, Recall weak match, repair, transcript upgrade, enrichment, embedding, indexing, or note mutation must preserve the existing workflow lifecycle and must not count as Added.

### Existing sources

The additive migration gives every pre-migration row a valid dormant baseline: status Inbox, version 0, enrollment/initialization/current-entry null. Dormant rows are excluded from every Processing page, count, age, filter, and metric.

Enrollment requires an exact preview and explicit confirmation:

1. selected unenrolled Library items;
2. captured in the last 30 days, newest 25 matching items maximum, with overflow explanation and All option;
3. all unenrolled items through a resumable, observable operation.

Confirmation uses a frozen ID set/hash and idempotency. Already enrolled items are no-ops. Enrollment time becomes current Inbox-entry time; capture time remains source metadata. Enrollment emits `enrolled` and never Added/Processed/Completed.

## 12. Core journeys

### Process next

1. Open Processing Inbox; nothing is preselected.
2. Choose Process next or select a source.
3. Review title/type/excerpt, User tags, AI topics, and read-only note summary if available.
4. Leave in Inbox or Move to To Do, In Progress, or Done.
5. Keep the source visibly Pending until confirmed.
6. On confirmation, advance focus/selection to the next matching Inbox source.
7. Offer Undo through the server timestamp exactly 10 seconds after confirmation.

### Whole-workload review

1. Switch to Board or List.
2. Preserve filters, stable URL state, and best valid anchor.
3. Open or move one visible source through the same mutation contract.
4. Desktop drag may change status only if enabled and grouped by Workflow status; native Move remains primary.

### Detail and notes

1. Open canonical `/items/[id]` with validated internal Processing return context.
2. Change status without saving, clearing, submitting, or remounting My notes.
3. Existing Save / Discard / Keep editing navigation protection handles unsaved drafts.
4. Back restores valid view/filter/anchor/focus; otherwise nearest valid source or results heading.

### Completion, archive, and recovery

1. Move to Done.
2. Explicitly Archive from Processing.
3. Source leaves active Processing but remains knowledge elsewhere.
4. Restore to Done or explicitly Reprocess to Inbox.
5. Pending/failure/conflict/unknown/Undo rules remain identical.

## 13. Inbox, Kanban Board, and List

### Inbox

- Fixed default order: `workflow_inbox_entered_at ASC, id ASC`.
- Linear decision queue with Process next, Leave, Open, and native Move.
- Counts distinguish matching Inbox sources from unfiltered Inbox total.

### Board

- Stable DOM status order: Inbox, To Do, In Progress, Done.
- Desktop at ≥1180 px shows four columns; tablet may contain horizontal column scrolling inside the Board region only.
- Mobile shows one selected status/group at a time; no four-column page and no drag dependency.
- Each status has an independent keyset cursor and matching aggregate count.
- Desktop pointer drag changes status only and is disabled for non-status grouping.

### List

- Dense deterministic rows with status, source/type, labels, captured/current-entry age as applicable, and single-item actions.
- Same normalized filter, count, cursor, trust, and return contract as Board.

### Shared Group & sort

Use the accepted compact component density: 36px desktop trigger, 322px popover, 50px desktop rows, 12–13px content type, small radius; mobile keeps at least a 44px trigger and 54px rows (`KD/prototypes/handoff/AI_AGENT_HANDOFF.md`, “Approved component contract”).

Group options: Workflow status, Primary User tag, Primary AI topic, Source type, Capture channel, Capture quality, Capture age, No grouping.

Sort options: Workflow default, Oldest captured, Newest captured, Title A–Z, Title Z–A, Workflow status, Source type, Capture channel.

Board/List default: Workflow status + Oldest captured. Workflow default means Inbox current-entry ascending; To Do/In Progress latest status change descending; Done latest effective completion descending; Archived archive time descending; all use stable ID tie-breaks. No custom fixture order or manual rank.

## 14. View persistence and place

Precedence:

1. valid explicit URL state;
2. browser Back/Forward state;
3. last explicitly used Board/List organization/filter preference when entering the active-work area;
4. product default.

A fresh primary Processing navigation always opens a clean unfiltered Inbox and cannot be overridden by remembered Board/List state.

Canonical state uses stable IDs for view, group, sort, status lens, User-tag IDs, AI-topic IDs, archive scope, anchor, and cursor/scroll key. Invalid/deleted IDs, taxonomy values, filter hashes, or cursors normalize to a safe restart with explanation. Theme follows the existing global appearance preference, not Processing URL state.

## 15. Filtering and counts

- **User tags:** only `tags.kind='manual'`, stable IDs.
- **AI topics:** `topics`/`item_topics`, stable IDs.
- OR among values within one facet; AND across facets.
- Explicit `No user tags` and `No AI topics` predicates.
- Active chips identify facet/value, support individual removal, and Clear all.
- Taxonomy changes refresh transparently; if a source leaves the result, focus moves deterministically and the changed count is announced.
- SQL uses `EXISTS`/grouped predicates to avoid tag × topic count multiplication.
- Page rows and counts use one normalized predicate; counts never derive from loaded rows.

Typed copy:

- Inbox: `{matching} sources match in Inbox · {total} total sources in Inbox`.
- Board/List: `{matching} active sources match across all statuses · {total} total sources in Inbox`.
- Archived: `{matching} archived sources match · {total} total sources in Inbox` when Inbox health is present.
- Empty copy distinguishes `No sources match these filters` from a truly empty scope.

## 16. Metrics and calendar semantics

### Persistent hierarchy

1. Inbox now and oldest current Inbox-entry age.
2. Processed this week beside Added this week.
3. Completed this week.

Today belongs only in transient confirmation or secondary Activity. No streaks, overdue/debt copy, confetti, time-in-app, raw moves, archive volume, or zero-Inbox target.

### Exact definitions

| Metric | Definition |
|---|---|
| Inbox now | Retained items with enrollment non-null, status Inbox, and archive null. Owner-wide and unfiltered. |
| Oldest current Inbox age | Query time minus minimum `workflow_inbox_entered_at` among Inbox-now rows. |
| Added | Distinct genuinely new item identities successfully initialized/enrolled by capture during the window. Excludes duplicate/repair/replay, baseline/enrollment, return/reprocess, and ordinary move to Inbox. |
| Processed | One effective owner-driven exit from each distinct Inbox-entry episode during the window. Movement outside Inbox cannot inflate it; a later deliberate return creates one new eligible episode. |
| Triaged diagnostic | First effective owner-driven Inbox exit in item lifetime. |
| Completed | First effective owner-driven entry to Done in item lifetime. Recompletion is diagnostic only. |
| Archived diagnostic | Distinct retained items with an effective archive event during the window; not headline success. |

Linked Undo makes its target ineffective. Failed/pending/conflicted/rejected/unknown/no-op/baseline/enrollment actions never change product metrics. Hard delete cascades history; recomputed prior totals may decrease and help text states that metrics describe retained sources.

### Time boundaries

- Save one owner IANA timezone, initialized once from browser/device and editable.
- Persist UTC epoch milliseconds.
- Today is `[local 00:00, next local 00:00)` converted to UTC.
- Week-to-date begins local Monday 00:00; completed weeks are half-open Monday-to-Monday.
- DST produces legitimate 23/25-hour days.
- Timezone change re-buckets at query time and never rewrites events.
- Disclosure: `Week starts Monday · {IANA timezone}`.

## 17. Workflow archive

- `workflow_archived_at` is a nullable lifecycle field, not a fifth status.
- Only active Done can Archive. No automatic archive.
- Archived item remains status Done and is excluded only from active Processing.
- Restore clears archive and remains Done.
- Reprocess atomically clears archive, enters Inbox, starts a new episode/current-entry time, and records both facts.
- Move while archived is rejected; Restore/Reprocess first.
- Hard delete remains the separate destructive operation.

Archived sources remain included in Library, item detail/My notes, exact/semantic search, Ask/citations, Related, Needs Upgrade/Attention Review/SRS eligibility, duplicate matching, export, enrichment/index/quality workers, and backups. Where surfaced, show “Archived from Processing” metadata/badge. Any exception is a release no-go until explicitly decided and documented.

## 18. Detail and note requirements

- Reuse `/items/[id]`; do not introduce a parallel editable item or note store.
- Workflow status control is independent from note save/version/conflict.
- Move/archive never saves, clears, submits, or indexes note content.
- Note save/delete/restore never changes workflow version or state.
- A dirty/offline/conflicted note keeps existing journal and navigation protection before Process next or return.
- Direct/Library entry retains Back to Library; valid Processing context uses Back to Processing.
- Quick preview is omitted from v1. A later preview must be read-only and removable.

## 19. Data and API requirements

### Current projection

Add to `items`: workflow status/version/enrollment/current Inbox entry/status change/completion/archive/initialization fields with enum/nonnegative checks and repository/guard invariants. Prefer additive migration `025_item_workflow.sql`; do not rebuild `items` solely for cross-field CHECKs without rehearsal evidence (`../technical/initial-data-migration-assessment.md` §§2–4).

### Canonical history

Append-only `item_workflow_events` records opaque event UUID/item ID/version, bounded event/from/to/archive/current-entry facts, origin/surface/actor channel, unique mutation ID, optional unique Undo target, UTC time, bounded episode ID, and allow-listed reason code. No title, URL, body, summary, transcript, note, taxonomy label, provider payload, free-form error, or generic JSON metadata.

### Reads

Provide bounded Processing summary, Inbox, per-status Board, List, Archived, and filter-metadata reads. Do not return full body, note content, quotes, full summary, artifacts, transcript, or provider data. Use existing server-rendered item route for full detail.

### Writes

Single-item Move, Archive, Restore, Reprocess, and Undo accept `expectedVersion` and cryptographic `mutationId`. Handler performs explicit intended credential/session and exact-origin validation; current bearer prefix routing means it cannot assume proxy made `/api/items/...` session-only (`../discovery/current-state-report.md` §§8–9).

## 20. Concurrency, failure, and Undo

### Mutation state machine

`idle → pending → confirmed | failed | conflicted | outcome_unknown → reconciled`

- Optimistic placement remains visibly Pending until confirmation.
- Projection/version/event commit atomically under expected-version CAS.
- 409 returns bounded current projection/version and never silently reapplies intent.
- Exact replay returns immutable accepted receipt plus current canonical projection/version; changed replay payload is rejected.
- Network loss after send queries mutation outcome before retry.
- Same-device broadcast only invalidates/revalidates; it is not authority.
- Offline allows loaded read/filter/detail but disables workflow writes; no queued success.

### Undo

- One-level Undo for confirmed Move, Archive, Restore, or Reprocess.
- Response/replay returns `undoEligibleUntil = confirmedAt + 10 seconds`.
- Accept at or before the boundary; after it return `410 undo_expired` plus current truth.
- Undo is a new CAS/idempotent event targeting one reversible non-Undo event.
- Undo-of-Undo is rejected; redo is an ordinary action.
- Intervening version change conflicts and never overwrites.
- Undo restores exact prior status/archive/current-entry facts and invalidates the linked metric event.
- Keep action available across Processing views/detail in the same tab within the window; expiry announces without disruptive focus movement.

### Failure behavior

| State | User-visible behavior | Recovery |
|---|---|---|
| Initial load fails | Stable shell, unavailable metrics, clear Retry. | Retry; never show zero as truth. |
| Mutation delayed | Source stays Pending; “Still saving” after bounded delay. | Reconcile; prevent duplicate intent. |
| Local/server failure | Roll back only affected source; focus Retry. | Retry same intent or choose another. |
| Version conflict | Show current state and that another session changed it. | Install current truth; explicit Try again. |
| Unknown outcome | Show Checking saved state, not success/failure. | Mutation lookup before Retry. |
| Deleted/inaccessible | Remove affected source, explain, select next valid focus. | No Retry when access is gone. |
| AI-topic change under filter | Result may change; status never changes. | Refresh, announce count, preserve best focus. |
| Offline | Loaded read/filter/detail available; writes disabled with reason. | Refresh/re-enable after connection. |

## 21. Large backlog and performance

- Use bounded DTOs and keyset cursors; no Processing `SELECT *`/offset reuse from Library.
- Independent cursor per Board status; cursors bind sort tuple, ID, view/status, archive scope, filter hash/version.
- Aggregate counts and oldest entry are indexed and pagination-independent.
- Virtualize only after list semantics and stable focus tests pass; keyed focus targets survive reconciliation.
- Benchmark unfiltered, User-tag, AI-topic, combined, archive, count, oldest, and metrics queries at 10k/50k realistic fan-out.
- Proposed 50k budgets on recorded host class: unfiltered summary/count p95 ≤100ms; filtered summary p95 ≤200ms; first page p95 ≤200ms; mutation DB transaction p95 ≤250ms excluding network.
- Rehearse migration time, WAL/disk growth, locks, busy-timeout concurrency, interruption/resume, integrity, backup/restore, and old-code rollback on an isolated production-size copy.

## 22. Desktop and mobile behavior

| Width | Required behavior |
|---|---|
| ≥1180 px | Full split Inbox, four-column Board, dense List. |
| 768–1179 px | Linear Inbox; Board columns may scroll inside their own region only. |
| ≤767 px | Fixed bottom nav, linear Inbox/List, one-status/group Board, stacked detail, quick preview absent, ≥44px task controls. |

Mobile must complete Move forward/backward, Done, Archive, Restore, Reprocess, filter, Undo, failure recovery, and detail/note continuity without drag. Fixed navigation uses actual safe-area height, scroll padding, and focus scroll margin. Light and Dark retain equivalent content, hierarchy, state, and behavior.

## 23. Accessibility requirements

- Visible-on-focus skip link and semantic landmarks.
- Native headings/lists; Board columns are labeled sections with `ul`/`li`, not an ARIA grid.
- Use ordinary pressed view/status buttons unless a complete tabs keyboard pattern is implemented.
- Source-specific accessible action names.
- Native Move destination control is complete without drag.
- Deterministic focus after Move, Archive, Restore, Reprocess, Undo, Retry, conflict, filter removal, empty state, and detail return.
- One polite status region owns success/count/note messages; one alert region owns actionable failure/conflict.
- Text/control contrast meets WCAG 2.2 AA; strong focus; reduced motion; 44px mobile targets.
- Do not copy the current mobile Library filter dialog as a complete modal accessibility model; current discovery found no evident full trap/restore contract (`../discovery/current-state-report.md` §12).
- Release no-go: keyboard, NVDA, VoiceOver, TalkBack, switch control, 200%/400% zoom, text spacing, forced colors, reduced motion, fixed-nav, and virtualized-focus tests.
- Production drag remains disabled until pointer cancel, Escape, AT announcement, reduced motion, and virtualized focus pass.

## 24. Analytics, privacy, and observability

Canonical workflow history is local product data, not optional analytics. It is content-free, backed up with the DB, retained with the item, and deleted on hard delete.

Optional operational observations may record attempted/result operation, normalized result/reason code, surface, device class, latency, and count—never content/taxonomy labels. They must not be required for product behavior. No third-party transmission without separate owner approval.

Required observability:

- initialization integrity/readiness and dormant-new-row count;
- mutation success/failure/conflict/unknown/reconciliation counts and latency;
- migration/backfill progress, retries, WAL/disk/lock signals;
- query p95 by normalized query class;
- archive-matrix and capture smoke health during rollout;
- content-free structured errors only.

Current `/api/health` lacks a DB check and existing error logs may include source URLs; neither is sufficient as the workflow observability design (`../discovery/current-state-report.md` §10).

## 25. Edge cases

- Untagged/topicless source and promoted/renamed/deleted taxonomy value.
- AI topic changes while filtered.
- Source deleted/inaccessible between read and action.
- Duplicate capture or Recall repair matches archived source without reset.
- Same-state no-op and backward move from Done.
- Restore versus Reprocess distinction.
- Lost response, exact retry, replay after later mutation, two-tab conflict.
- Undo at boundary, after expiry, after source leaves filter, after intervening version, and Undo-of-Undo.
- Empty Inbox while other statuses exist; filtered empty while total is nonzero.
- Hard delete recomputes prior retained-source metrics.
- Long title, missing excerpt, metadata-only capture, feature-disabled notes.
- Legacy all-history enrollment interruption/resume and changed preview.
- Raw direct insert, trigger-ID collision, nested Recall transaction, old-code rollback insert.
- Invalid/stale cursor/filter hash/anchor.
- 23/25-hour day, Monday boundary, timezone change.

## 26. Acceptance criteria

All criteria require automated or recorded manual evidence; none is satisfied by this document.

1. **Domain separation:** workflow, User tags, AI topics, category, quality, enrichment, Review, notes, and archive can change independently on one item.
2. **Schema:** fresh and upgraded DBs apply prior migrations plus workflow migration with clean integrity/foreign keys and exact schema/index/trigger manifest.
3. **New capture:** every genuine creation fixture returns enrolled Inbox/version 1/current-entry/event in the same transaction.
4. **Preservation:** every duplicate/repair/replay/transcript/enrichment/index/note fixture preserves workflow and archive exactly.
5. **Raw guard:** direct insert initializes once; collision aborts; old-code rollback still initializes new rows.
6. **Legacy:** preexisting fixture stays dormant/absent from Processing and metrics after migration.
7. **Enrollment:** selected/recent-30d-newest-25/all preview is exact; confirm is frozen/idempotent/resumable and uses enrollment-time age.
8. **Transitions:** every active status moves to every other through native control; same-state changes nothing.
9. **Ordering:** Inbox/current-entry, active/change, Done/completion, Archive/archive orders and ID tie-breaks match exact fixtures across cursors.
10. **Group/sort:** accepted options work identically in Board/List; non-status grouping never changes status or enables drag; no custom fixture/manual rank exists.
11. **Filters:** `(tag A OR B) AND (topic X OR Y)`, no-tag/no-topic, chips, Clear all, URL restore, and taxonomy-change refresh return exact results.
12. **Counts:** matching and total typed values equal SQL truth regardless of loaded page length.
13. **Inbox loop:** no preselection; Process next/Leave/confirmed Move advances deterministic focus; empty state receives focus/announcement.
14. **Parity:** Inbox/Board/List/detail use the same single-item mutation/trust contract; desktop/mobile outcomes match.
15. **Detail:** Processing return restores valid view/filter/anchor/focus; invalid context cannot redirect externally.
16. **Notes:** unsaved Save/Discard/Keep editing protection works; workflow never saves/clears/submits note; note never changes workflow version.
17. **Archive:** only Done archives; full downstream matrix passes; Restore yields Done; Reprocess atomically yields active Inbox/new episode.
18. **CAS:** two-tab expected-version race commits exactly one winner; loser receives/installs current truth.
19. **Replay:** exact replay after a later mutation returns original receipt plus newest projection and never renders stale state.
20. **Unknown outcome:** lost response reconciles mutation ID before retry and produces one event/version/metric effect.
21. **Undo:** before/at 10-second boundary restores exact prior facts/focus and invalidates target metric; after returns 410/current truth; Undo-of-Undo rejected.
22. **Offline/failure:** loaded reads remain usable; writes disabled offline; local failure rolls back one source; load error never presents zero/stale metrics as truth.
23. **Metrics:** numeric truth table for capture, duplicate, enrollment, return/reprocess, episode exit, Done/reopen, archive/restore, Undo, failure, and delete matches definitions.
24. **Calendar:** owner-local midnight/Monday, DST, and timezone-change fixtures bucket UTC events exactly.
25. **Hard delete/privacy:** item/events disappear and metrics recompute; event/log inspection contains no prohibited content.
26. **Performance:** 10k/50k realistic fan-out meets approved p95 budgets with bounded payload/DOM and recorded query plans/hardware.
27. **Mobile:** at 390×844 and 320px, user finds Processing and completes Move/Archive/Restore/Reprocess/Undo without obscured or sub-44px task controls.
28. **Accessibility:** keyboard, focus trace, announcements, contrast, reduced motion, zoom/reflow, NVDA/VoiceOver/TalkBack/switch, and virtualized no-drag tasks pass.
29. **Security:** unauthorized, invalid-origin, bearer/session-boundary, malformed enum/ID/body/cursor/mutation, enumeration, and abuse tests fail safely.
30. **Migration/rollout:** production-size copy rehearsal records time/WAL/disk/locks/integrity/interruption/restore/old-code behavior; readiness is zero-defect before flag enable.
31. **Production:** flagged deployment completes through normal safeguards; live capture→Inbox→Move→Done→Archive/Restore/Undo and counts are verified.
32. **Documentation:** repository docs and GitHub Wiki describe actual shipped behavior, migrations, flags, operations, rollback, and verification.
33. **Scope:** no batch, manual rank, offline queue, PM fields, collaboration, editable preview, or global archive enters v1.

## 27. Risks and mitigations

| Risk | Mitigation / release gate |
|---|---|
| New capture misses workflow initialization | Atomic repository transaction, raw guard, readiness integrity query, exhaustive ingestion fixtures. |
| Migration floods Inbox or blocks startup | Dormant additive baseline, no synchronous event-per-item backfill, production-size WAL/disk rehearsal. |
| Duplicate/repair resets intent | Preservation matrix across every existing-identity path. |
| Stale replay/concurrency loses truth | CAS, receipt + current snapshot, mutation lookup, two-tab and replay-after-later-mutation E2E. |
| Undo disagrees with metrics/UI | Server eligibility timestamp, exact boundary, linked event truth table, expiry announcement. |
| Archive resembles deletion | Done-only, “Archived from Processing,” exact downstream matrix, hard delete separate. |
| Metrics reward churn or wrong timezone | Capture-only Added, episode Processed, first-lifetime diagnostics, IANA/Monday/DST fixtures. |
| Tag/topic joins inflate counts | Shared normalized predicate, `EXISTS`, fan-out fixtures, page-independent aggregates. |
| Large backlog loses performance/focus | Bounded keyset pages, partial indexes, conditional virtualization, 50k/focus gates. |
| Mobile entry hidden | More + Library summary + capture feedback; >20% promotion rule. |
| Backlog causes guilt/avoidance | Explicit enrollment, neutral weekly health, no streak/debt/overdue language. |
| Workflow action damages note draft | Independent endpoints/versions, mounted canonical editor, note navigation regressions. |
| Drag excludes users | Native Move primary; drag off until complete manual gates. |
| Logs leak private content | Typed event/log allow-lists; reject generic JSON/free-form text; payload inspection. |
| Rollback old code creates dormant new rows | Keep DB guard active; old-code capture smoke before rollout approval. |
| Scope becomes project management | Deferred list and acceptance criterion 33 enforced in every review. |

## 28. Assumptions

- Production remains private and single-owner with current session/bearer model; confirm before write release.
- Stable IDs remain available for manual tags and AI topics.
- Current item detail/My notes can host an independent workflow control without remounting the editor.
- Every current genuine creation path remains coverable through `insertCaptured` plus defense-in-depth raw guard.
- 50k is a conservative first-release performance fixture; actual production distribution must be measured without exposing content.
- Existing deployment supports feature flags/readiness and known-good artifact rollback; verify in the technical/release plan.
- Android needs no APK change unless capture response or native client contract changes.

## 29. Open validation questions and defaults

These do not block implementation because each has an explicit safe default:

| Question | V1 default | Reopen rule |
|---|---|---|
| Is Processing the clearest name? | Processing | Material five-second comprehension failure. |
| Is mobile More + Library summary discoverable? | Ship both paths | Promote if >20% fail unaided task. |
| Is recent enrollment cap 25 appropriate? | Keep 25 plus All | Real-backlog test shows debt shock or repeated friction. |
| Are weekly metrics calm/useful? | Keep neutral hierarchy | Dogfood shows guilt, gaming, or misunderstanding; change presentation, preserve truth. |
| Does quick preview earn complexity? | Omit | Measurable speed/confidence improvement without duplicate editing. |
| Can pointer drag ship accessibly? | Off | Enable only after all cancel/AT/reduced-motion/virtual-focus gates pass. |
| What is actual production scale and migration budget? | Use bounded 50k fixture and proposed p95 | Replace with measured host-class evidence before rollout, never with unbounded behavior. |

## 30. Release and completion

Ship behind disabled read/write/navigation controls after an additive migration and verified predeploy backup. Prove schema/integrity and new-capture initialization while UI is off; enable owner reads, then writes, then navigation under observation. Normal rollback is flags off plus known-good code and forward repair; schema restore is reserved for unrecoverable corruption and can lose post-snapshot captures/workflow mutations (`../technical/initial-data-migration-assessment.md` §12).

This PRD is complete when its requirements are traced to implementation and evidence. The execution goal is complete only after the feature is running successfully in production, the live experience is verified, and repository documentation plus GitHub Wiki are current.
