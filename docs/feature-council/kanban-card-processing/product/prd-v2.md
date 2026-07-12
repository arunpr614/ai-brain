# Kanban Card Processing — PRD v2

**Status:** Implementation source of truth; implementation and production verification pending
**Version:** v2
**Date:** 2026-07-12
**Repository baseline:** `origin/main` / worktree HEAD `5b92e68ec09ceb03f010db1c4fb14be5348a54bf`
**Production read-only baseline:** 2026-07-12; service active; 129 retained items; latest applied migration `024_recall_manual_sync.sql`
**Selected direction:** Direction B — **Processing**, Inbox-first

## 1. Authority gate

PRD v1 was a review draft and is superseded. The adversarial review at `../reviews/prd-v1-adversarial-review.md` prohibited implementation from v1 and required this v2 to dispose every material finding. This PRD v2 incorporates those findings, reconciles `../discovery/source-conflict-report.md`, and is the product source of truth for schema, API, UI, test, rollout, and documentation work.

Implementation may proceed from v2 only while UX/UI v2 and technical-plan v2 remain consistent with it. If a later artifact conflicts, this PRD's product behavior wins until the conflict is explicitly recorded and resolved; no team may silently implement the conflicting interpretation. “Source of truth” does not mean “implemented”: release and goal completion still require all acceptance evidence, production deployment, live verification, and current repository/GitHub Wiki documentation.

The prior source package at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/` is abbreviated as `KD/`. Its classification remains historical evidence; the current execution goal supplies implementation/release authority.

## 2. Evidence and current production baseline

Current main has no Processing route, workflow status, Kanban/List switch, workflow archive, workflow history, or processing metrics. Saved sources are `items`; existing `cards` is unrelated SRS substrate (`../discovery/current-state-report.md` §§1–3).

Read-only production checks recorded in `../qa/baseline-verification.md` §§“Production read-only baseline” and “Interpretation” establish:

| Signal | 2026-07-12 baseline |
|---|---|
| Application service | active |
| Runtime | Node `v22.22.3` |
| Authenticated loopback health | `{ok:true}` |
| SQLite size | 7,520,256 bytes |
| Retained `items` | 129 |
| Applied migration files | 26 |
| Latest migration | `024_recall_manual_sync.sql` |
| SQLite quick check | `ok` |
| Foreign-key check | no rows |
| Data-filesystem free space | approximately 30,362,880 KB |

No production content, titles, URLs, notes, credentials, tokens, or environment values were copied into an artifact, and no production state changed. These facts inform migration planning but do not prove feature behavior, capacity, deployment readiness, or live UX. Synthetic 10k/50k fan-out tests and a safe production-size migration rehearsal remain mandatory.

## 3. PRD v1 adversarial-review disposition

| Finding | Severity | V2 disposition | Product change / evidence |
|---|---:|---|---|
| v1 overclaimed authority before v2 gate | P0 | Resolved | §1 explicitly supersedes v1 and makes v2 the implementation source only after review disposition. |
| AI-generated category taxonomy and daily metrics were silently reinterpreted | P1 | Resolved | §17 selects AI Topics and explicitly excludes auto tags/category; §18 requires visible Processed/Completed Today and This week. Source conflicts SC-12/14 are traced. |
| Archive matrix was referenced but absent | P1 | Resolved | §19 supplies a row-by-row Include/Badge/Action/query/regression matrix. |
| Private reads lacked credential/cache contract | P1 | Resolved | §23 makes every Processing read/write/outcome/enrollment endpoint session-only, dynamic, private/no-store, cookie-varying, bounded, and bearer-negative. |
| Completion metric and Done ordering projection were conflated | P1 | Resolved | §12 separates event-derived first-lifetime Completed from `workflow_current_done_entered_at` used only for current Done ordering. |
| Production evidence statement was stale | P2 | Resolved | §2 records the dated read-only production facts and limits. |
| One-level Undo was ambiguous during rapid actions | P2 | Resolved | §21 defines one server-recognized most-recent eligible reversible action per tab, supersession, rapid same/different-item, navigation, and multi-tab semantics. |
| Ten-second Undo lacked timing-accessibility disposition | P2 | Resolved | §21 supersedes exploratory 10 seconds with 30-second server eligibility and preserves always-available native reverse actions after expiry. |
| Four-state counts and virtualization ACs were generic/unconditional | P2 | Resolved | §§17/22 require exact zero-filled total/matching counts for every state; §25 and ACs define virtualized and non-virtualized evidence branches. |

No adversarial finding is deferred without a product decision and executable evidence path.

## 4. Source conflicts resolved for v2

The full register is `../discovery/source-conflict-report.md`. V2 applies it as follows:

| IDs | V2 resolution |
|---|---|
| SC-01 | Current goal supplies authority; v2 controls implementation; shipped claims wait for live verification. |
| SC-02/05 | Dedicated Inbox uses current-entry order; Board/List may use accepted capture-age organization. |
| SC-03/12 | Processed is episode-based; daily and weekly Processed/Completed are both computed and visible, with weekly primary and Today secondary. |
| SC-04/07 | No custom fixture order, manual rank, priority, or batch in v1. |
| SC-06/13 | `workflow_archived_at`, Done-only archive, Restore Done, Reprocess Inbox, full matrix. |
| SC-08 | Existing global theme owns Light/Dark state. |
| SC-09 | `/items/[id]` remains canonical; no nonexistent generic item GET is assumed. |
| SC-10/11 | Reconcile against `5b92e68`; proposed next migration is `025_item_workflow.sql`; preserve Recall/migration 024. |
| SC-14 | AI Topics is the AI-generated facet; auto tags and scalar category are explicitly excluded. |
| SC-15 | Real 129-item production baseline plus synthetic 10k/50k evidence. |

V2 additionally supersedes the exploratory 10-second Undo in the approved-requirements baseline: server eligibility is 30 seconds because a short expiry creates disproportionate keyboard, assistive-technology, motor, and cognitive risk. Always-available native reversal paths make Undo a convenience, not the sole means of correction.

## 5. Goal

Help the private AI Brain owner convert accumulating captured sources into deliberate, recoverable decisions without losing source context, notes, searchability, accessibility, privacy, or trust.

Every genuine new source must enter Inbox exactly once; the owner must be able to process it through Inbox, To Do, In Progress, Done, archive, restore, or reprocess using native controls across desktop and mobile; counts, daily/weekly metrics, ordering, history, concurrency, and recovery must remain exact at real and synthetic scale.

## 6. User problem and target users

Capture is easier than review, so Library grows without a next decision. Tags, AI topics, collections, category, quality, and enrichment describe content/system state, not what the owner plans to do. A board alone can display debt without creating a useful habit, and any silent loss, stale move, misleading metric, hidden archive, or note interaction destroys trust.

Primary user: the current private single owner processing notes, URLs/articles, PDFs, YouTube, Telegram, Recall, browser-extension, Android, and future captured sources. Power-user behavior includes large backlogs, keyboard/AT use, rapid processing, multi-tab/device activity, and deterministic return. Teams, assignees, collaborators, and multi-tenant organizations are outside v1.

## 7. Product principles

1. **Process before display.** Inbox is primary; Board/List are alternate lenses.
2. **One explicit decision.** Never auto-complete or auto-archive.
3. **Independent concepts.** Workflow, archive, User tags, AI Topics, auto tags, category, collections, quality, enrichment, Review, SRS, and notes remain separate.
4. **Canonical truth.** Existing `items`, `/items/[id]`, and My notes remain canonical.
5. **Honest recovery.** Pending, failure, conflict, unknown, superseded, and expiry are never presented as success.
6. **No surprise backlog.** Historical rows remain dormant until explicit enrollment.
7. **Daily visibility without pressure.** Today is visible but secondary; weekly flow and current health provide context; no streaks/debt/guilt.
8. **Accessibility is structural.** Native actions are permanent; drag and timed Undo are enhancements.
9. **Private by default.** Every Processing endpoint is session-only and non-cacheable; history is content-free.
10. **Stay lightweight.** No project-management expansion.

## 8. Scope

### Required in first release

- Desktop Processing peer; mobile More entry, Library summary, capture feedback.
- Inbox, Board, List, Archived.
- Four statuses and any-to-any single-item native Move.
- Shared compact Group & sort and Light/Dark parity.
- Explicit User tags and AI Topics filters with exact four-state counts.
- Canonical detail/notes continuity and deterministic return.
- New-capture initialization, dormant legacy baseline, explicit enrollment.
- CAS/idempotency/outcome lookup, rapid-action semantics, 30-second Undo.
- Done-only workflow archive, Restore, Reprocess, full downstream matrix.
- Today and week-to-date Processed/Completed plus weekly Added and current Inbox health.
- Content-free events, exact projections, session-only private APIs.
- Keyset pagination, conditional virtualization evidence, 10k/50k performance.
- Accessibility, feature flags, readiness, rollout, rollback, live verification, docs/wiki.

### Deferred

- Batch move/archive/restore.
- Manual rank/reorder/priority and saved named views.
- Offline mutation queue.
- Quick preview (editable or required).
- Global content archive or cross-surface hiding.

## 9. Non-goals

- Assignees, dates, reminders, dependencies, sprints, WIP limits, team roles, collaboration.
- Changing captured content, enrichment, embeddings, quality, note consent/indexing, or SRS semantics.
- Replacing Library, canonical detail, search, Ask, Related, Review, export, or hard delete.
- Population analytics, comparative productivity scoring, DAU/retention claims, or third-party telemetry.
- Native Android storage; hosted web behavior is sufficient unless native contracts change.

## 10. Information architecture

### Desktop

- Processing is a primary sidebar peer immediately after Library.
- Badge is unfiltered enrolled active Inbox total, visually capped at `99+` only in navigation.
- `/processing` always opens a clean, unfiltered Inbox.
- Child routes highlight Processing.

### Mobile

- Processing begins under More.
- Library shows `Inbox {N} · oldest {age}` and Open Inbox.
- Successful genuine capture says `Saved to Library and Processing Inbox`.
- Promote to primary bottom navigation if >20% of moderated users cannot find it unaided.

Use **Processing** for the section and **Inbox** for the landing state. Naming validation can change copy before broad rollout without changing the domain model.

## 11. Workflow model

| Stored status | Label | Meaning | Next action |
|---|---|---|---|
| `inbox` | Inbox | Enrolled source awaiting the current decision. | Leave or Move to To Do, In Progress, Done. |
| `todo` | To Do | Deliberately retained for later action. | Move to any other active status. |
| `in_progress` | In Progress | Owner is actively using/working through it. | Move to any other active status. |
| `done` | Done | Current processing intent is complete. | Move to any other active status or Archive. |

- Any active status may move directly to any other.
- Same-state action is a no-op: no version, event, timestamp, count-flow, or metric change.
- Return/reprocess to Inbox creates a new episode/current-entry timestamp.
- Done is reversible and never auto-archives.
- Archived is not a fifth status.

## 12. Canonical projections and completion semantics

Projection fields on `items`:

- `workflow_status`
- `workflow_version`
- `workflow_enrolled_at`
- `workflow_initialized_at`
- `workflow_inbox_entered_at`
- `workflow_status_changed_at`
- `workflow_current_done_entered_at`
- `workflow_archived_at`

`workflow_current_done_entered_at` is exclusively the latest effective entry into the **current** Done stay and drives Done ordering. It is not the first-lifetime Completed metric.

Exact transition rules:

| Transition | Current Done projection | First-lifetime Completed event meaning |
|---|---|---|
| Any non-Done → Done | set to committed transition time | Earliest effective owner-driven transition becomes Completed; later entries do not add headline Completed. |
| Done → Inbox/To Do/In Progress | clear to null | Historical first Completed remains. |
| Done → Archived | preserve current Done timestamp | Archive does not complete again. |
| Archived → Restore Done | preserve timestamp from archived Done stay | Restore does not complete again. |
| Archived → Reprocess Inbox | clear to null | Historical first Completed remains. |
| Undo a transition into Done | restore exact prior null/value | Target Done event becomes ineffective; if it was the first effective completion, a later effective Done event becomes first. |
| Undo a transition out of Done | restore prior Done timestamp | No new Completed event; restores the prior current stay. |
| Legacy baseline/enrollment | null | Never Completed. |

Done Workflow-default ordering is `workflow_current_done_entered_at DESC, id ASC`. First-lifetime Completed is derived only from effective events. This separation must be reflected in names, indexes, DTOs, metrics queries, and fixtures.

## 13. New captures and legacy enrollment

### New identity

Every genuine new `items` identity initializes/enrolls Inbox at workflow version 1 and writes one initialized event in the same SQLite transaction. This includes web note/URL/PDF, JSON URL/note/PDF, extension, Android, Telegram, Recall, and future raw inserts (`../discovery/current-state-report.md` §4).

Duplicate-window rejection, duplicate/open, URL/Recall upgrade, repair, transcript, enrichment, embedding, indexing, or notes preserve existing workflow/archive and do not count as Added.

### Legacy rows

Migration creates dormant status Inbox/version 0 with enrollment/initialization/current-entry/current-Done null. Dormant rows appear nowhere in Processing or metrics.

Explicit enrollment modes:

1. selected unenrolled Library items;
2. last 30 days, newest 25 matching maximum, with exact overflow and All option;
3. all unenrolled items through resumable observable processing.

Preview returns exact count plus frozen IDs/hash. Confirm is session-only, idempotent, rejects changed preview, and sets enrollment/current Inbox-entry to confirmation time. Enrollment is never Added/Processed/Completed.

## 14. Core journeys

### Process next

Open clean Inbox with nothing preselected; choose Process next or a row; review title/type/excerpt, User tags, AI Topics, and read-only note summary; Leave or Move; retain Pending until confirmation; advance to next matching source; expose the tab's most recent eligible Undo for 30 seconds.

### Workload review

Switch Board/List while preserving filters and best valid anchor. Open or move any visible source through the same single-item contract. Drag may change status only when enabled and grouped by Workflow status.

### Detail and notes

Open `/items/[id]` with validated internal return state. Workflow actions never save/clear/submit/remount notes. Existing Save/Discard/Keep editing protects drafts. Return restores valid view/filter/anchor/focus or nearest safe target.

### Archive/recovery

Move to Done; explicitly Archive; source leaves active Processing only; Restore to Done or Reprocess to Inbox. After the 30-second Undo expires, permanent native Move/Restore/Reprocess paths still restore desired current state, though an ordinary later reversal remains a new historical event rather than retroactively canceling the earlier metric event.

## 15. Inbox, Board, List, and persistence

### Inbox

Fixed order `workflow_inbox_entered_at ASC, id ASC`; linear Process next/Leave/Open/Move; matching and total count copy.

### Board

Stable DOM order Inbox, To Do, In Progress, Done. Desktop ≥1180px shows four columns; tablet may scroll inside Board only; mobile shows one selected status/group. Each status has an independent cursor and exact count. Drag is optional status-only enhancement and disabled for non-status grouping.

### List

Dense deterministic rows with status, source/type, labels, relevant age, Open/Move/Archive, and the same filter/count/cursor/trust/return contract.

### Group & sort

Accepted compact density: 36px desktop trigger, 322px popover, 50px desktop rows, 12–13px content type; mobile ≥44px trigger and 54px rows.

Groups: Workflow status, Primary User tag, Primary AI topic, Source type, Capture channel, Capture quality, Capture age, No grouping.

Sorts: Workflow default, Oldest captured, Newest captured, Title A–Z, Title Z–A, Workflow status, Source type, Capture channel. Default is Workflow status + Oldest captured. No custom fixture/manual rank.

Workflow default: Inbox current-entry ASC; To Do/In Progress latest status-change DESC; Done current Done-entry DESC; Archived archive time DESC; ID ASC tie-breaks.

### Persistence precedence

Valid explicit URL → Back/Forward → last explicit Board/List preferences when entering active work → product default. A fresh primary navigation always resets to clean Inbox. URL uses stable IDs for view/group/sort/status/User-tag/AI-topic/archive/anchor/cursor. Invalid state normalizes safely. Global app theme owns appearance.

## 16. AI taxonomy decision

The execution goal says “AI-generated category tags,” while current code has three distinct generated concepts (`../discovery/current-state-report.md` §6; source conflict SC-14):

| Concept | Current behavior | V2 decision |
|---|---|---|
| AI Topics (`topics`/`item_topics`) | Dedicated AI/system records, stable IDs/slugs, evidence/confidence, visible topic pages and item-detail links. | **Use as the Processing AI facet**, labeled **AI Topics**. |
| Auto tags (`tags.kind='auto'`) | Share namespace with manual tags; re-enrichment replaces joins; a tag can be promoted to manual, renamed/merged/deleted. | Exclude from the AI facet because kind/membership is mutable and overlaps User tags. Preserve existing product behavior. |
| `items.category` | One generated scalar classifier, not a tag join or multi-value taxonomy. | Exclude from the facet; may remain display metadata but never masquerades as status or AI Topics. |

V2 does not claim these concepts are equivalent. The selected facet uses stable topic IDs, and fixtures must prove auto-tag/category changes alone do not change AI Topic filter membership. If future enrichment stops producing reliable topic records, that is a release blocker or an explicit source decision—not permission to silently switch taxonomy.

## 17. Filters and exact four-state counts

- User tags are `tags.kind='manual'` stable IDs.
- AI facet is AI Topics stable IDs.
- OR within each facet; AND across facets.
- Explicit No user tags and No AI topics.
- Facet/value chips, individual remove, Clear all.
- `EXISTS`/grouped SQL prevents fan-out multiplication.
- Result pages and counts use one normalized filter.

Every active summary response contains all four keys, including zero:

```text
totalByStatus:    { inbox, todo, in_progress, done }
matchingByStatus: { inbox, todo, in_progress, done }
```

`totalByStatus` is unfiltered across enrolled, unarchived items. `matchingByStatus` applies the exact current normalized filters and is independent of page length. Archived count is a separate typed value and never included in Done. Inbox-health total remains `totalByStatus.inbox`.

UI copy:

- Inbox: `{matching inbox} sources match in Inbox · {total inbox} total sources in Inbox`.
- Board/List: show matching count on every Inbox/To Do/In Progress/Done heading; disclosure includes all four unfiltered totals.
- Archived: `{matching archived} archived sources match`; Inbox health remains separately labeled if shown.
- Filtered empty and truly empty copy differ.

Taxonomy refresh may remove a source but never changes status. Reconcile counts, move focus to next valid target, and announce change.

## 18. Daily and weekly metrics without pressure

### API contract

The session-only summary returns owner-wide, unfiltered values with UTC bounds and governing IANA timezone:

- `inboxNow`, `oldestCurrentInboxEnteredAt`/age;
- `processedToday`, `processedWeekToDate`;
- `completedToday`, `completedWeekToDate`;
- `addedToday`, `addedWeekToDate` for intake context;
- `window.todayStartUtc`, `window.weekStartUtc`, `window.asOfUtc`, `timezone`, `weekStarts='monday'`.

Definitions:

- Added: genuine captured identities initialized in the window only.
- Processed: one effective owner-driven Inbox exit per distinct entry episode in the window.
- Triaged diagnostic: first effective lifetime Inbox exit.
- Completed: first effective lifetime Done entry whose effective event falls in the window.
- Linked Undo makes target ineffective; no-op/failure/conflict/unknown/baseline/enrollment never count.
- Hard delete cascades history and may reduce prior retained-source totals.

### UI contract

Persistent calm hierarchy:

1. Inbox now + oldest current Inbox age.
2. This week: `{P} processed · {A} added · {C} completed`.
3. Secondary neutral Today line, visible without navigation: `Today: {P} processed · {C} completed`.

Today uses smaller neutral typography, no target/progress bar, comparison arrow, red/green judgment, streak, confetti, “behind,” “overdue,” or zero-Inbox celebration. It is accessible in the page summary but not a pressure tile. Optional Activity disclosure may add diagnostics, not hide the required Today values.

Calendar: one saved owner IANA timezone; UTC epoch storage; Today `[local 00:00,next 00:00)`; week-to-date local Monday 00:00 through as-of; half-open; DST-safe; timezone changes re-bucket without rewriting events. UI discloses `Week starts Monday · {timezone}` and as-of state when data is delayed/unavailable.

## 19. Authoritative archive downstream matrix

Workflow archive is `workflow_archived_at`, Done-only, explicit, and Processing-only. Restore clears archive/remains Done. Reprocess atomically clears archive/enters Inbox/new episode. Hard delete is separate.

| Surface | Included after workflow archive? | Badge/metadata | Allowed workflow action from surface | Query/change rule | Required regression evidence |
|---|---|---|---|---|---|
| Active Processing Inbox/Board/List | **No** | N/A | N/A | Add enrolled + `workflow_archived_at IS NULL`; archived item removed only after confirmation. | All active queries/counts exclude; Done count decrements; other states unchanged. |
| Processing Archived | **Yes** | Archive time, status Done, “Archived from Processing” | Restore to Done; Reprocess to Inbox; Open detail | Archive scope only; same filters/count predicate; keyset by archive time. | Filter/page/count, restore/reprocess/pending/failure/conflict/Undo. |
| Library | **Yes** | Badge on item row/card where workflow metadata is hydrated | Open detail only in v1 | Do **not** filter archived items; bounded optional metadata join must not alter total/filter semantics. | Archived source remains discoverable and Library counts unchanged. |
| Item detail / My notes | **Yes** | “Archived from Processing,” archive time | Restore; Reprocess; hard Delete remains separate | Canonical item read unchanged except workflow metadata/control; notes untouched. | Direct route, draft/save/conflict, restore/reprocess, hard-delete separation. |
| Exact/FTS search | **Yes** | Badge in item result when metadata present | Open detail | Do not add active-only predicate; hydrate bounded workflow metadata after result. | Same search membership/rank before/after archive; badge correct. |
| Semantic/hybrid search | **Yes** | Badge in result/citation metadata when surfaced | Open detail | Do not remove vectors/chunks or add active-only predicate. | Same candidate eligibility; no re-embedding; badge/detail disclosure. |
| Ask and citations | **Yes** | Citation/detail discloses archived status | Open cited detail | Do not change library/item scopes or retrieval eligibility. | Archived source can support answer/citation; no content loss. |
| Related | **Yes** | Badge where item is rendered | Open detail | No active-only predicate or relation deletion. | Membership preserved and badge correct. |
| Needs Upgrade | **Yes** | Badge | Open/repair under existing rules | Workflow archive does not change capture-quality predicate. | Eligibility/count/repair unchanged; repair preserves archive. |
| Attention Review / SRS substrate | **Yes** | Badge when item is rendered | Existing review/detail action only | No workflow-archive eligibility predicate; SRS `cards` unchanged. | Current/reachable Review behavior unchanged; dormant SRS schema unaffected. |
| Duplicate matching / capture result | **Yes** | Capture response discloses existing archived item | Open detail; explicit Reprocess only from authorized workflow UI | Match archived identity normally; never reset/unarchive/status-change. | URL/Recall/Telegram/extension/Android duplicate and upgrade fixtures preserve lifecycle. |
| Export | **Yes** | Include workflow status/archive metadata in documented metadata scope; content scope unchanged | Existing export only | Never omit source because archived; no private event history unless explicitly included. | Item/library export membership and metadata fixture. |
| Enrichment worker | **Yes/continues** | None in worker | None | No archive predicate; updates content/taxonomy only. | Retry/re-enrich archived item; lifecycle unchanged. |
| Embedding/index/note-index workers | **Yes/continues** | None in worker | None | No archive predicate; vectors/chunks/note index preserved. | Queues and retrieval remain correct; workflow unchanged. |
| Capture-quality/transcript/repair workers | **Yes/continues** | None in worker | None | No archive predicate; repair/upgrade preserves lifecycle. | Weak-source recovery and repair fixtures preserve archive/status/version. |
| Backups | **Yes** | DB contains projection/events | Restore uses existing operator process | Workflow SQLite data follows DB backup; no special exclusion. | Backup integrity and isolated restore contain exact workflow truth. |
| Hard delete | **No after delete** | N/A | Existing destructive Delete | Cascade events/joins; remove artifacts/vectors/messages per current behavior. | Item/history gone; metrics recompute; archive is never substituted for delete. |

No row may be changed to Exclude, stripped of disclosure, or given extra mutation actions without a recorded product decision and updated regression evidence.

## 20. History and mutation consistency

Append-only `item_workflow_events` records event UUID, item/version, typed from/to status/archive/Inbox-entry/current-Done facts, origin/surface/channel, unique mutation ID, optional unique Undo target, UTC time, episode ID, actor-tab ID for Undo-slot semantics, and allow-listed reason. No content, URL, summary, transcript, note, taxonomy label, provider payload, free-form error, or generic JSON.

Writes use expected version + mutation ID; projection and event commit atomically. Same mutation replay returns immutable accepted receipt plus current projection/version. Changed replay payload is rejected. 409 returns current truth. Unknown outcome uses session-only mutation lookup before retry. Same-device broadcast is invalidation only. Offline reads loaded data; writes disabled; no queue.

## 21. Undo, rapid actions, and permanent reversals

### Eligibility

- Server Undo window is exactly **30 seconds** from confirmation; response/replay supplies `undoEligibleUntil = confirmedAt + 30s`.
- Accept at/before boundary; after return `410 undo_expired` with current truth.
- One most-recent confirmed eligible reversible action per `actorTabId` is recognized by server and UI.
- A later confirmed reversible action in the same tab supersedes the earlier slot, even on a different item. Earlier target returns `409 undo_superseded` plus current truth.
- Pending, failed, conflicted, unknown, same-state, or non-reversible actions do not replace the slot until a reversible action confirms.
- Different tabs have independent slots. CAS prevents either tab from overwriting intervening item truth.
- Undo is a new versioned/idempotent event; Undo-of-Undo rejected; redo ordinary.

### Rapid-action semantics

- Same tab, action A then B: B replaces A only when B confirms; if B fails, A remains until its original expiry.
- If B confirms after A expires, B becomes the only slot.
- Same item A then B: B's commit necessarily changes version; A is superseded, not offered.
- Different items A then B in one tab: B supersedes A; current state of A remains correctable by permanent native action.
- Two tabs: each may show its own latest action; an intervening mutation causes conflict/current truth, never forced reversal.
- View/detail navigation in the same tab preserves the current slot; reload/closed tab removes client access but does not create false success.
- Exact replay never resurrects a superseded/expired UI slot; it returns original receipt plus current slot/eligibility truth.

### Timing accessibility and permanent equivalence

Thirty seconds supersedes the exploratory 10 seconds and is the minimum visible/server window. Manual keyboard, screen-reader, switch, and motor-access testing may require lengthening it before release; shortening below 30 seconds is prohibited without an explicit accessibility decision.

Undo is never the only correction:

- status Move remains always available among all four active states;
- Restore remains available for archived Done;
- Reprocess remains available for archived items needing Inbox;
- ordinary reverse actions use the same native, keyboard/AT-operable control and restore the requested **current state** after Undo expiry.

An ordinary later reversal is historically honest: it does not retroactively invalidate the earlier Processed/Completed event as Undo would. UI/help text need not expose this implementation distinction during routine use, but metric tests must. The timed control is therefore a cancellation convenience, not an essential task path.

## 22. Exact count, paging, and taxonomy behavior

Summary and page reads use one normalized filter object. Exact four-state total/matching maps are computed by SQL aggregates before pagination and include zero keys. Archived is separate. Tests cover no filter, tag-only, topic-only, combined, no-tag, no-topic, archive, multi-page, and taxonomy mutation.

AI-topic membership changes may alter matching counts/results but never status or unfiltered totals. Auto-tag or scalar-category changes alone must not affect AI Topic filtering. A filter change resets incompatible cursors; a stale/mismatched cursor returns a normalized restart response, not misleading empty data.

## 23. Session-only private endpoint contract

Every Processing route/API—including summary, filter metadata, Inbox/Board/List/Archived reads, item workflow projection, mutation lookup, enrollment preview/confirm, Move/Archive/Restore/Reprocess/Undo—is private owner data.

### Credential rules

- Require a valid session cookie in the handler for every read and write.
- Bearer-only credentials are rejected with 401 on all Processing and `/api/items/[id]/workflow...` endpoints, even though current proxy bearer prefix matching can route `/api/items/...` to the handler.
- Do not accept Telegram secret, Recall credentials, device pairing code, or other service credentials.
- Writes additionally require exact same-origin validation; GET reads reject unsafe methods and never mutate.
- Single-owner authorization is explicit; do not claim tenant/role authorization.

### Cache/privacy rules

- Dynamic execution; no static rendering or shared response cache.
- `Cache-Control: private, no-store` on success and error.
- `Vary: Cookie` where cookie-authenticated response helpers require it.
- No service-worker/API caching of Processing responses.
- Private bounded error bodies with normalized codes; never echo title, URL, taxonomy label, request content, stack, or SQL.
- Parameterized SQL; bounded filter counts/IDs/body/cursor/mutation UUID; rate/size limits appropriate to private deployment.
- Bounded response allow-list; no body, note, full summary, quotes, transcript, artifacts, tokens, provider data, or event internals in board/list DTOs.

Negative cases must cover unauthenticated request, expired/invalid session, valid bearer without session, bearer+invalid session, cross-origin write, ID enumeration, deleted/unknown item, foreign/mismatched mutation ID, oversized/repeated filters, malformed/stale cursor, unexpected fields, and cache headers on every status class.

## 24. Failure behavior

| State | User truth | Recovery |
|---|---|---|
| Load failure | Stable shell; metrics/counts unavailable, never zero/stale. | Session-safe Retry. |
| Pending | Source marked Pending; no authoritative count/metric claim. | Wait/reconcile; suppress duplicate mutation. |
| Local/server failure | Roll back affected source only; alert and Retry. | Retry same intent. |
| Conflict | Install current bounded projection; explain other session. | Explicit Try again. |
| Unknown response | Checking saved state. | Session-only outcome lookup before Retry. |
| Superseded Undo | Current state plus Undo superseded explanation. | Permanent native reverse action. |
| Expired Undo | Current state plus expiry announcement. | Permanent native reverse action. |
| Deleted/inaccessible | Remove one source; next valid focus. | No retry if gone. |
| Taxonomy change | Refresh result/count; status unchanged. | Deterministic focus/announcement. |
| Offline | Loaded read/filter/detail; workflow controls disabled. | Revalidate on connection. |

## 25. Large backlog and conditional virtualization

- Bounded DTOs, no `SELECT *`/offset reuse.
- Keyset cursor per Board status; normalized cursor for Inbox/List/Archived.
- Aggregate counts and metrics independent of page length.
- 10k/50k realistic tag/topic fan-out benchmarks: summary, four status pages, next page, filters, archive, oldest, today/week metrics.
- Proposed 50k host-class budgets: unfiltered summary/count p95 ≤100ms; filtered summary p95 ≤200ms; first page p95 ≤200ms; DB mutation p95 ≤250ms excluding network.

Evidence branches:

1. **If virtualization is used:** prove native list semantics, stable keyed focus after move/filter/page/reconciliation, keyboard/AT browse and action, reduced motion, DOM/memory bound, overscan behavior, and no missing accessible items.
2. **If virtualization is not used:** prove explicit bounded page/DOM maximum, Load more/pagination keyboard and AT behavior, focus across page boundaries, memory/latency at 50k, and that no route renders an unbounded result.

QA selects exactly the implemented branch; virtualization is not required merely to satisfy a test.

## 26. Desktop, mobile, and accessibility

| Width | Behavior |
|---|---|
| ≥1180px | Split Inbox, four-column Board, dense List. |
| 768–1179px | Linear Inbox; Board-contained horizontal columns only. |
| ≤767px | Fixed bottom nav, linear Inbox/List, one-status/group Board, stacked detail, ≥44px controls. |

Mobile completes Move forward/backward, Done, Archive, Restore, Reprocess, filter, Undo, failure recovery, and detail/note continuity without drag. Fixed nav observes safe area and focus scroll margin.

Accessibility:

- skip link/landmarks/headings/native lists;
- no ARIA grid; pressed buttons unless full tabs model;
- source-specific names and permanent native Move/Restore/Reprocess;
- deterministic focus for all mutation, failure, filter, empty, and return outcomes;
- polite status region and alert region;
- WCAG 2.2 AA text/control contrast, strong focus, reduced motion, 44px mobile targets;
- manual keyboard, NVDA, VoiceOver, TalkBack, switch, 200%/400%, text spacing, forced colors;
- timed 30-second Undo tasks plus permanent reverse tasks;
- drag disabled until cancel/Escape/AT/reduced-motion/focus gates pass;
- virtualization evidence conditional per §25.

## 27. Analytics, privacy, observability, and retention

Canonical history is local product data, content-free, backed up with the item, and cascades on hard delete. Optional operational observations may record enums, versions, timestamps, counts, normalized result/reason, latency, surface, device class, and actor-tab opaque ID; they are not required and never measure success by activity.

No third-party telemetry without owner approval. Current error JSONL can contain source URLs and is not the template for workflow events. Add content-free readiness, missing-initialization, mutation result/latency, migration progress/WAL/disk/locks, query p95, and rollout smoke signals. `/api/health` alone is insufficient because it has no DB integrity check.

## 28. Edge cases

- No User tag/AI Topic; auto-tag promotion; category/topic divergence.
- AI Topic changes under filter; deleted taxonomy ID.
- Source deleted between page/action; invalid item/mutation enumeration.
- Duplicate/Recall/repair matches archived source.
- Same-state no-op; backward Done move; current Done timestamp restoration.
- Restore versus Reprocess; archive Undo versus later Restore.
- Rapid A/B actions same/different item/tab; B pending/fails/confirms; replay after supersession.
- Undo before/at/after 30 seconds, after navigation/reload, conflict, superseded, Undo-of-Undo.
- Empty one status with others populated; filtered empty; exact zero-filled four-state maps.
- Hard delete changes prior daily/weekly retained-item metrics.
- Long title, missing excerpt, metadata-only capture, notes disabled/dirty/offline/conflicted.
- Enrollment preview drift, all-history interruption/resume.
- Raw insert, trigger ID collision/order, Recall nested transaction, old-code rollback.
- Invalid/stale cursor/filter hash/anchor; multi-page count independence.
- Local midnight, Monday boundary, DST, timezone change.
- Session absent/expired, bearer-only, bearer+bad cookie, cross-origin write, private cache headers.

## 29. Acceptance criteria

All criteria require automated or recorded manual evidence.

1. **Authority:** implementation traceability points to PRD v2, never v1; conflicting later artifacts are blocked until reconciled.
2. **Current baseline:** release record cites 2026-07-12 production facts and records a new predeploy read-only baseline without content disclosure.
3. **Domain separation:** workflow/archive/User tags/AI Topics/auto tags/category/quality/enrichment/Review/SRS/notes mutate independently.
4. **AI facet:** selected AI Topic IDs return exact items; auto-tag-only or category-only changes do not change results; UI label is AI Topics.
5. **Schema:** fresh/upgrade DB applies previous migrations plus `025_...` with clean integrity/FKs and exact manifest.
6. **Projection:** field nullability/invariants match dormant, Inbox, non-Inbox, Done, Archived, Restored, Reprocessed states.
7. **New capture:** every genuine ingestion fixture atomically returns enrolled Inbox/version 1/current-entry/event exactly once.
8. **Preservation:** duplicate/replay/upgrade/repair/transcript/enrichment/embed/index/note fixtures preserve lifecycle/archive/version.
9. **Raw guard:** direct insert initializes once; collision aborts; old-code rollback insertion still initializes.
10. **Legacy:** pre-migration rows remain dormant/absent after migration.
11. **Enrollment:** selected/recent-30d-newest-25/all preview/confirm is exact, frozen, idempotent, resumable, and uses enrollment-time age.
12. **Transitions:** each active state moves to each other through native control; same-state changes nothing.
13. **Inbox order:** current-entry ASC/ID order and focus are exact across pages; capture time cannot substitute.
14. **Current Done projection:** non-Done→Done sets current Done time; reopen clears; archive/restore preserves; reprocess clears; Undo restores exact prior value.
15. **Completed metric:** first effective lifetime Done event remains distinct from latest current Done ordering across Done→reopen→Done, archive/restore, Reprocess, and Undo fixtures.
16. **Group/sort:** approved options match Board/List; non-status group never moves status; no custom/manual rank.
17. **Filters:** User-tag OR, AI-Topic OR, cross-facet AND, no-tag/no-topic, chips, Clear all, URL, taxonomy refresh are exact.
18. **Four-state totals:** unfiltered active fixture returns exact non-omitted Inbox/To Do/In Progress/Done total keys, including zero.
19. **Four-state matching:** tag-only, topic-only, combined, no-tag, no-topic, and taxonomy-mutation fixtures return exact four matching keys.
20. **Page independence:** four-state totals/matching and archive count equal SQL truth across multi-page results and never loaded length.
21. **Inbox summary:** matching/total copy is exact; filtered-empty differs from true empty.
22. **Daily API:** known owner-local fixture returns exact Processed Today and Completed Today UTC-bounded values.
23. **Weekly API:** same fixture returns exact Processed/Added/Completed week-to-date from local Monday.
24. **Daily UI:** neutral visible Today line renders exact Processed/Completed, no target/streak/judgment, and remains accessible.
25. **Weekly UI:** weekly line renders exact Processed/Added/Completed and discloses timezone/Monday.
26. **Calendar:** midnight, Monday, DST, and timezone-change fixtures re-bucket without event rewrite.
27. **Hard delete metrics:** event cascade removes item from current and prior recomputed retained-source values with disclosure.
28. **Inbox journey:** no preselection; Process next/Leave/confirmed Move advances deterministic focus; empty state focus/announcement.
29. **Board/List parity:** Open/Move/Archive/filter/count/trust/return outcomes match desktop/mobile.
30. **Detail/notes:** validated return restores context; workflow never saves/clears/submits/remounts note; note never changes workflow version.
31. **Archive active/Archived rows:** active queries/counts exclude; Archived includes with exact Restore/Reprocess behavior.
32. **Archive Library/detail rows:** membership preserved, badge/metadata exact, notes unchanged, allowed actions exact.
33. **Archive search/Ask/Related rows:** exact/semantic membership, citations, Related eligibility and disclosures remain correct.
34. **Archive quality/Review/SRS rows:** Needs Upgrade, repair, Attention Review/SRS eligibility remain unchanged and disclosed when rendered.
35. **Archive duplicate/export rows:** duplicate preserves lifecycle/discloses archived; export includes item and documented metadata.
36. **Archive worker/backup/delete rows:** enrichment/embed/index/quality workers continue unchanged; backup/restore preserves; hard delete cascades.
37. **CAS:** two-tab race commits one winner; loser receives/installs current truth.
38. **Replay:** replay after later mutation returns original receipt plus newest projection and never stale state.
39. **Unknown outcome:** lost response uses session-only lookup before retry and causes one event/version/metric effect.
40. **Rapid same-tab different-item:** B replaces A only after B confirms; B failure leaves A until expiry; A target becomes `undo_superseded` after B confirmation.
41. **Rapid same-item:** later confirmed action is sole tab slot; older action cannot overwrite current version.
42. **Multi-tab slots:** each tab has one slot; cross-tab intervening change produces conflict/current truth.
43. **Undo timing:** before/at 30-second boundary succeeds; after returns 410/current truth; replay preserves slot state; Undo-of-Undo rejected.
44. **Permanent reversal:** after Undo expiry/supersession, native Move/Restore/Reprocess restores desired current state by keyboard, screen reader, and switch.
45. **Timing accessibility:** users complete timed Undo and permanent reversal tasks with keyboard, NVDA/VoiceOver/TalkBack, and switch; window is lengthened if 30 seconds fails.
46. **Failure/offline:** load failure never shows zero/stale truth; local failure rolls back one source; offline disables writes with no queued-success copy.
47. **Session-only reads:** no session, expired session, valid bearer-only, and bearer+invalid cookie all receive 401 for every Processing read/outcome/enrollment/workflow route.
48. **Write origin:** valid session + invalid/missing external Origin write fails; same-origin bounded request succeeds.
49. **Cache isolation:** every success/error read/write response has private/no-store and correct cookie variation; service worker/shared cache stores none.
50. **Response privacy:** allow-list inspection finds no prohibited content/event internals; private errors do not echo input or existence details.
51. **Abuse bounds:** oversized filter/body/cursor, malformed IDs/UUID, changed replay, enumeration, deleted item, foreign mutation fail with normalized private responses.
52. **Performance:** 10k/50k fan-out meets approved p95 with bounded payloads and recorded query plans/hardware.
53. **Virtualized branch if used:** focus/AT/DOM/memory/overscan/reconciliation evidence passes.
54. **Non-virtualized branch if used:** bounded page/DOM/Load-more/focus/memory/50k evidence passes without unbounded render.
55. **Mobile:** 320/390 widths find Processing and complete Move/Archive/Restore/Reprocess/Undo without obscured/sub-44px task controls.
56. **Accessibility:** keyboard/focus/live regions/contrast/reduced motion/zoom/text spacing/forced colors pass; drag remains off until its separate gates pass.
57. **Migration rehearsal:** safe copy records time/WAL/disk/locks/integrity/interruption/resume/backup/restore/old-code behavior.
58. **Rollout:** flags/readiness keep UI/writes off until zero missing initialization; owner reads then writes then navigation enable under observation.
59. **Production:** live capture→Inbox→Move→Done→Archive/Restore/Reprocess/Undo, four counts, Today/week metrics, and private headers verified.
60. **Documentation:** repository docs and GitHub Wiki describe actual schema/API/UI/flags/operations/rollback and verified shipped status.
61. **Scope:** no batch, rank, offline queue, PM fields, collaboration, quick preview, global archive, or taxonomy substitution enters v1.

## 30. Risks and mitigations

| Risk | Mitigation / release no-go |
|---|---|
| AI facet implements wrong generated concept | Explicit AI Topics decision; negative auto-tag/category fixtures; aligned UX/technical labels. |
| Daily metrics create pressure | Neutral secondary Today line, no goals/comparison/streak/judgment; dogfood wording review. |
| Completion ordering corrupts metric | Separate current Done projection and event-derived first Completed; transition/Undo property tests. |
| Private endpoint leaks metadata/cache | Handler session-only, bearer-negative, private/no-store/Vary, allow-list and error tests. |
| Archive hides knowledge or over-modifies queries | Authoritative matrix and named row regressions; no implicit active predicate outside Processing. |
| Rapid Undo targets wrong action | Server tab slot, confirmation-based supersession, actorTabId, CAS, rapid fixtures. |
| Timed Undo excludes users | 30-second minimum, lengthen on failure, permanent native reversal always available. |
| Four-state counts drift | Zero-filled typed maps, one normalized predicate, aggregate-before-page tests. |
| Virtualization becomes unnecessary risk | Conditional evidence branch; bounded pagination is valid. |
| New capture misses workflow | Atomic transaction, raw guard, readiness query, every-ingestion tests. |
| Legacy migration floods Inbox/startup | Dormant additive schema, explicit enrollment, no synchronous event backfill. |
| Small production size masks scale issue | Real baseline plus synthetic 10k/50k fan-out/performance/focus gates. |
| Scope expands into PM | Acceptance 61 and review traceability. |

## 31. Assumptions and open validations

Assumptions:

- Production remains private single-owner; endpoint handlers still require explicit session policy.
- Stable manual-tag and AI-topic IDs remain available.
- Existing detail/notes can host independent workflow controls without editor remount.
- Creation remains coverable by `insertCaptured` plus guard.
- Existing deployment can support flags/readiness/known-good rollback; technical plan must verify.

Open validations with defaults:

| Question | V2 default | Reopen trigger |
|---|---|---|
| Name | Processing | Material comprehension failure. |
| Mobile placement | More + Library summary | >20% unaided failure promotes primary nav. |
| Enrollment cap | 25 + All | Real-backlog debt/friction evidence. |
| Today wording | Neutral visible Processed/Completed | Dogfood pressure/misunderstanding changes presentation, not truth/visibility. |
| Undo window | 30-second minimum | Accessibility evidence may lengthen; never shorten silently. |
| Drag | Off | Full cancel/AT/reduced-motion/focus gates. |
| Virtualization | Not predetermined | Select only from measured need; satisfy implemented evidence branch. |

## 32. Rollout and completion

Use an additive migration proposed as `025_item_workflow.sql`, verified predeploy backup, known-good artifact, and disabled read/write/navigation flags. Apply schema/guard, run integrity/readiness and capture matrix while UI is off, enable owner reads, then writes, then navigation. Normal rollback is flags off + known-good code + forward repair; keep the guard so old code still initializes new captures. Snapshot restore is only for unrecoverable corruption and can lose post-snapshot captures/workflow mutations.

PRD v2 is ready to drive implementation once UX/UI v2 and technical-plan v2 explicitly match its taxonomy, daily metrics, archive matrix, endpoint privacy, completion projection, 30-second tab-scoped Undo, four-state counts, and conditional virtualization contracts. The persistent goal completes only after production is running successfully, the live experience is verified, and repository/GitHub Wiki documentation is current.
