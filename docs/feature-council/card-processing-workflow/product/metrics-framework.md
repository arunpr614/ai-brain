# Card Processing Workflow — Metrics Framework

**Council role:** Analytics Specialist
**Status:** Discovery recommendation; no production analytics, schema, or application behavior is claimed
**Date:** 2026-07-11
**Applies to:** the existing saved-source `items` aggregate; “card” is only a UI treatment

## Decision summary

The metrics must help one owner answer three questions:

1. **What needs attention?** — current Inbox count and oldest current Inbox age.
2. **Is intake keeping pace with triage?** — first exits from Inbox versus new sources added, on a weekly cadence.
3. **Do decisions lead to closure?** — first completions this week.

The recommended primary display is therefore:

| Primary display | Exact content | Decision supported |
|---|---|---|
| **Inbox health** | `Inbox now` plus `Oldest Inbox age` | Whether the undecided backlog is large or stagnating |
| **Weekly flow** | `Triaged this week` and `Added this week`, shown together; optionally show current-library net Inbox change | Whether deliberate decisions are keeping pace with intake |
| **Downstream closure** | `Completed this week` | Whether triage becomes later value rather than mere movement |

`Today` values remain available in a disclosed **Activity** view, but are not headline cards. Daily counts are volatile for a one-owner product and can reward busywork. `Archived`, total transitions, board opens, streaks, and time in app are diagnostics or lifecycle facts, never primary success measures.

This resolves the council's competing proposals as follows:

- Retain Product/Platform's precise first-event definitions for processed and completed.
- Adopt Growth's weekly health cadence, oldest-age companion, and intake comparison.
- Reject Platform's proposal to count a new “processed” event for every Inbox re-entry cycle. A repeated exit is an **Inbox exit**, not another first-time triage; otherwise backward movement inflates success.
- Keep `processed today`, `completed today`, status counts, archive counts, and average time in Inbox as accessible secondary measures because they remain useful feedback or diagnostics.

User-facing copy should prefer **Triaged**. Internal metric and event names may use `processed`, but the definition is identical.

## Measurement principles

- Measure server-confirmed domain state, not clicks, optimistic UI, loaded-card length, JSONL logs, or enrichment timestamps.
- Count distinct source identities, not mutations, except where a metric explicitly measures operation reliability.
- Keep workflow state, user tags, AI topics, and archive lifecycle orthogonal.
- Use current-state columns for stocks and the append-only workflow event history for flows and milestones.
- Store event timestamps in UTC epoch milliseconds; apply the owner's saved timezone only at query/display time.
- Default to local, content-free measurement. External product analytics remains unapproved.
- Prefer raw counts for a one-owner product. Rates require a meaningful denominator and a visible sample size.
- An immediate Undo cancels the reverted action for product metrics. A later deliberate backward move does not erase history.
- Hard deletion is privacy-destructive: the item and its workflow history disappear from recomputed metrics.

## Canonical definitions

### Calendar and owner boundary contract

- Persist one IANA timezone in owner settings, for example `Asia/Kolkata`; initialize it once from the browser/device and let the owner change it.
- Never use the application host timezone, database timezone, or a client's current offset as the reporting boundary.
- **Today** is `[owner-local 00:00, next owner-local 00:00)` converted to UTC. The interval can be 23 or 25 hours across daylight-saving transitions.
- **This week** is week-to-date from owner-local **Monday 00:00** through query time. A completed week is `[Monday 00:00, next Monday 00:00)`.
- All intervals are half-open: an event at the start is included; an event exactly at the end belongs to the next period.
- A timezone change re-buckets calendar metrics at query time. It does not rewrite event timestamps.
- UI copy must show the governing timezone in the metrics disclosure, for example `Week starts Monday · Asia/Kolkata`.

### Metric dictionary

| Metric | Numerator / formula | Inclusion rules | Exclusions and notes |
|---|---|---|---|
| **Inbox now** | Count current items where `workflow_status='inbox' AND workflow_archived_at IS NULL` | New captures, legacy-backfill items, and deliberately returned items | Hard-deleted items and archived items; archive is valid only from Done |
| **Current status count** | Count current active items per Inbox, To Do, In Progress, Done | Current surviving items | All archived items; use separate archive stock |
| **Oldest Inbox age** | `query_time - MIN(current_inbox_entered_at)` over current Inbox | For a never-left post-launch item, anchor at capture initialization; for a legacy never-left item, anchor at original `captured_at`; for a deliberate return, anchor at the return event | An immediate Undo of an exit restores the prior continuous Inbox anchor; do not reset age to Undo time |
| **Added today/week** | Distinct item IDs whose `initialized` event has `origin='capture'` in the window | Every genuinely new successful local item identity; Recall counts at successful local import time | Legacy backfill, duplicate shares, content upgrades/repairs, transcript replacement, retry replay |
| **Processed / Triaged today/week** | Distinct item IDs whose **first effective owner-driven** `inbox → non-inbox` transition occurs in the window | Individual and bulk deliberate moves; a direct Inbox → Done move qualifies | Initialization, migration, failed/optimistic attempts, immediate-undone exits, repeated exits after a later return |
| **Completed today/week** | Distinct item IDs whose **first effective owner-driven** transition from any non-Done status into Done occurs in the window | Direct Inbox → Done qualifies as both processed and completed | Archive, repeated Done entries after reopen, immediate-undone completion, migration/system writes |
| **Archived in window** | Distinct item IDs with at least one effective `archived` event in the window | Individual/bulk archive of Done items; a later re-archive can qualify in a later window | Immediate-undone archive; repeated archive events for the same item count once within one window; not a success metric |
| **Archive now** | Count current items where `workflow_archived_at IS NOT NULL` | Current surviving archived items | Restored and hard-deleted items |
| **Average time in Inbox** | Arithmetic mean of `first_effective_exit_at - initialized_at` for eligible samples | Post-launch `origin='capture'` items whose first effective exit falls in the selected cohort window | Legacy-backfill items, returned cycles, deleted items, immediate-undone exits; always show `n` and median beside the mean |
| **Median time in Inbox** | Median of the same duration samples | Same as average | Preferred display statistic because long-tail waits skew the mean |
| **Net Inbox change** | `Inbox at end - Inbox at start`, reconstructed for surviving items | Captures, exits, deliberate returns, and current state | Because hard delete cascades history, this is explicitly **current-library net change** and can be recomputed downward; do not preserve anonymous rollups without a privacy decision |
| **Triage-to-add ratio** | First effective exits / new captures over rolling 28 days | Same first-exit and added definitions | Display `—` when added = 0; show numerator/denominator; diagnostic, not a target by itself |
| **Mutation reliability** | Server-confirmed successful workflow mutations / attempted workflow mutations | Status, archive, restore, and Undo; split by surface, platform, action mode, and normalized result | Optional local operational instrumentation is required for the denominator; do not infer attempts from canonical success events |

### Why “processed” is first-ever, not per Inbox cycle

A source can return to Inbox because the owner's intent changed. That return must increase the current backlog and start a new waiting-age anchor, but it must not reset the fact that the source was already triaged once. Counting every later exit as “processed” would make churn look like value.

For operational diagnosis only, expose **Inbox exits** as a distinctly named event count. It may count the first exit of each effective Inbox stay. Never label this `processed`, and never use it as a primary success measure.

### Cohort and sample rules

- **Stocks** (`Inbox now`, status counts, archive now, oldest age) include all current surviving **enrolled** items unless explicitly filtered. A valid baseline status alone is not participation.
- **Flow milestones** (`added`, `processed`, `completed`) are assigned to the period containing their qualifying effective event, not the item's capture cohort.
- A real owner move of an explicitly enrolled legacy item can qualify as processed or completed after launch. Its migration baseline and enrollment never qualify as added.
- Average/median time in Inbox uses a trailing **28-day exit cohort** for product display. New-capture and legacy-import cohorts use the same start/exit formula but must be reported separately; never blend them into one unlabeled duration. Show no numeric duration below `n=5`; show `Not enough data (n/5)`. Mark `n=5–19` as `Early signal`; remove that qualifier at `n≥20`.
- Always display duration sample size. Show median first, then average in the disclosure; use hours below 48 hours and rounded days thereafter.
- Include bulk first exits in throughput because the backlog genuinely changed, but store `action_mode` and show the individual/bulk split in diagnostics. Do not claim bulk throughput proves careful reading.
- For the rolling triage-to-add ratio, show raw counts beside the ratio. Do not cap values above 1; a value above 1 can be legitimate legacy clearing.
- Do not create DAU, retention percentages, or population cohorts for a one-owner installation. Use distinct action days and four-week qualitative dogfood notes only as launch evidence.

## Lifecycle semantics

### Legacy baseline and enrollment

The reconciled architecture gives every historical item a valid persisted Inbox baseline but keeps `workflow_enrolled_at IS NULL` until the owner explicitly imports recent, selected, or all history. This separates schema correctness from visible participation.

- `legacy_baselined` events are storage facts. Unenrolled items do **not** appear in or count toward Inbox/status/archive stocks, oldest Inbox age, or Processing filters.
- The migration baseline occurs at migration time. Original `captured_at` remains source metadata and can drive the oldest-first sort; it is not silently converted into years of workflow waiting time.
- An `enrolled` event with `origin='legacy_import'` starts the legacy item's first measurable Inbox stay at `workflow_enrolled_at`.
- Baseline and enrollment events never count as added, processed, completed, archived, or engagement.
- After enrollment, the first real owner exit can count as processed and the first real Done entry can count as completed.
- Initial Inbox duration for explicitly enrolled history is `first_effective_exit_at - workflow_enrolled_at`. Report this as a separate **Imported history** cohort, never blended with **New captures**.
- “Recent 30 days,” selected Library sources, and all history are enrollment modes. Re-running enrollment is idempotent: an already enrolled item is not reset, versioned, or counted again.

### Re-entry

- A deliberate non-Inbox → Inbox move starts a new current Inbox stay at that event time.
- It immediately affects Inbox now, state counts, oldest age, and current-library net change.
- It does not erase the original processed milestone.
- A later exit does not increment processed again. It may increment the diagnostic `inbox_exit` count.
- Original `captured_at`, first processed time, and first completed time remain immutable derived milestones.

### Undo

Undo must be a new compare-and-swap mutation with `origin='undo'` and `undo_of_event_uuid` pointing to the latest reversible event.

- The original event and linked Undo remain in the append-only audit history.
- Product metrics treat the directly reverted event as ineffective. The Undo event itself never creates a processed/completed/archive milestone.
- Undo of an Inbox exit restores the previous continuous Inbox-age anchor.
- Undo of first completion removes that completion milestone; a later deliberate Done entry becomes the first effective completion.
- Undo of archive is a restore event linked to the archive and removes that archive from the window activity count.
- A normal later backward move or restore has no `undo_of_event_uuid`; it does not erase earlier milestones.
- Undo is valid only against the current item version. A stale Undo returns a conflict and changes no metric.

### Archive and restore

- Archive is a separate lifecycle timestamp and requires current Done status.
- Archive removes the item from all active Processing status counts but not from Library/search/Ask.
- Restore clears `workflow_archived_at` and leaves status at Done. It does not create another completion or reverse prior processed/completed milestones.
- A normal restore preserves a past archived-in-window fact. Only an immediate linked Undo cancels that archive event for metrics.
- A later re-archive is another lifecycle action; count a source at most once per reporting window.

### Duplicate, repair, failure, and hard delete

- A duplicate capture, Recall replay, enrichment retry, content repair, or transcript upgrade reuses the item identity and preserves workflow/archive state. It creates no added or workflow milestone.
- Optimistic UI changes never affect metrics. Only a committed current-state mutation plus canonical event does.
- A failed, rejected, conflicted, or offline-disabled mutation affects optional reliability counters only.
- Idempotent replay of the same `mutation_id` returns the canonical result but writes no second event.
- Hard delete cascades workflow history with the item. The item disappears from stocks, flow metrics, duration cohorts, and samples on recomputation. Numbers may therefore decrease after deletion; this is intentional privacy-first behavior.
- Do not retain anonymous historical totals after hard deletion unless the owner separately approves a retention policy.

## Filtered versus total counts

| Surface value | Filter behavior | Label |
|---|---|---|
| Primary Inbox now / oldest age | Never changes with search, user-tag, AI-topic, source, or quality filters | `total` or no filter-dependent styling |
| Primary weekly flow and completion | Owner-wide and unfiltered in V1 | `This week · all sources` in disclosure |
| Board/list status counts | Apply the exact same active-scope, text, manual-tag, AI-topic, source, and quality predicate as the result set, without pagination | `matching` when any filter is active |
| Empty state | Determined by filtered count, not loaded rows | `No sources match these filters` versus `No sources in Inbox` |
| Archived view count | Applies archived scope plus the same filter predicate | `matching archived` when filtered |

Additional rules:

- Multiple values within a facet use OR; facets combine with AND.
- `No user tags` and `No AI topics` are explicit predicates.
- Counts come from SQL aggregates, never the number of cards currently loaded by pagination.
- Do not make primary event metrics respond to current taxonomy filters in V1. Tags/topics can change after an event, so a filtered historical metric would otherwise have ambiguous event-time versus current-time membership.
- If filtered historical metrics are added later, use current item membership, state it explicitly, and recalculate all compared periods under the same rule.

## Content-free event taxonomy

### Canonical workflow events

These events are required for lifecycle correctness, auditability, and user-facing metrics. They belong in the local append-only `item_workflow_events` table and commit atomically with current item state.

| Event type | When written | Required event-specific properties |
|---|---|---|
| `initialized` | New item insert or legacy migration | `origin=capture|legacy_backfill`, `actor_channel`, `initialized_at`; legacy also keeps current item `captured_at` as its age anchor |
| `status_changed` | Confirmed owner status move, including backward move and Undo | `from_status`, `to_status`, `origin=user|undo`, `action_mode=individual|bulk`, `surface`, nullable `undo_of_event_uuid` |
| `archived` | Confirmed Done → archived lifecycle change | `from_workflow_archived_at=null`, `to_workflow_archived_at`, `origin=user`, `action_mode`, `surface` |
| `restored` | Confirmed archive restore or archive Undo | `from_workflow_archived_at`, `to_workflow_archived_at=null`, `origin=user|undo`, `surface`, nullable `undo_of_event_uuid` |

Required on every canonical event:

- `event_uuid`, opaque local `item_id`, `item_version`, and UTC `occurred_at`;
- unique `mutation_id` for user/API mutations; null only for database initialization/migration;
- trusted `actor_channel=web|android|system|migration|telegram|recall` as appropriate;
- optional content-free `batch_operation_id` for one bulk action;
- no title, body, note, summary, URL, query, citation, taxonomy label, or free-form error text.

Add `undo_of_event_uuid` to the platform event proposal. Without this link, metrics cannot distinguish an immediate semantic cancellation from an ordinary later backward move.

### Optional local operational instrumentation

These observations are not canonical workflow history and must not gate the feature. Add them only after the owner approves local UX/operational measurement.

| Instrumentation event | Purpose | Allowed properties |
|---|---|---|
| `workflow_mutation_attempted` | Reliability denominator | `mutation_id`, operation, expected version, surface, actor channel, device class, action mode, item count |
| `workflow_mutation_result` | Success/failure/conflict and latency | Same join keys plus `result=confirmed|replayed|conflict|invalid|offline|network_error|server_error`, `latency_ms`, normalized error code |
| `workflow_surface_opened` | Discoverability diagnosis only | `surface=inbox|board|list|archived`, entry point, device class, active-filter count |
| `workflow_filter_changed` | Filter usability diagnosis only | Facet type, selected-value count, result-count bucket; never IDs, names, or query text |
| `workflow_metrics_disclosed` | Whether secondary Activity detail is discoverable | Surface and device class only |

Opening, filtering, or disclosing metrics is not success. These events may explain usability, never substitute for backlog health or completion.

## Privacy, retention, and ownership

- Default: no third-party analytics and no transmission of workflow history.
- Canonical workflow events are local product data, retained for the lifetime of the item, included in database backup, and deleted on hard item delete.
- Optional operational observations are local only, retained for **30 rolling days**, then purged. They must be exportable and deletable from a future privacy control.
- If any event leaves the device for an explicitly approved diagnostic export, hash/rotate item and mutation identifiers and omit stable cross-export linkage.
- Prohibited everywhere: title, source body, note, summary, quote, transcript, citation text, full URL/domain, search query, tag/topic/category/collection names, notification content, tokens, secrets, stack traces, and free-form errors.
- `surface`, status enum, action mode, device class, latency, counts, normalized error code, and UTC timestamp are content-free.
- The feature must work if optional operational instrumentation is disabled or purged.
- User-facing metrics are derived locally. No single-owner event stream should be presented as population analytics.

## SQL and event feasibility

Current code has provider-cost usage, rotating error JSONL, and operational queue signals, but no product analytics store. None can reconstruct first Inbox exit, first Done entry, Undo, restore, or owner-timezone windows. The proposed current-state fields plus `item_workflow_events` are sufficient.

### Query sources

| Metric | Authoritative source | Required index / feasibility note |
|---|---|---|
| Inbox/status/archive stock | `items.workflow_status`, `items.workflow_archived_at` | `(workflow_archived_at, workflow_status, workflow_status_changed_at, id)` |
| Matching board counts | Dedicated workflow query with identical filter joins | Index current status plus existing manual-tag/topic joins; aggregate before pagination |
| Added | `initialized` events, `origin='capture'` | `(event_type, origin, occurred_at, item_id)` |
| First processed/completed | Effective `status_changed` events grouped by item | `(item_id, event_type, occurred_at)` plus `undo_of_event_uuid` index |
| Archived activity | Effective `archived` events grouped by item/window | `(event_type, occurred_at, item_id)` |
| Oldest current Inbox age | Current Inbox items plus latest effective deliberate entry into Inbox, falling back to initialization/captured time | Materialize `current_inbox_entered_at` later only if measured query cost warrants it |
| Time in Inbox | Post-launch capture initialization joined to first effective exit | Same event indexes; 28-day exit cohort is small at expected single-owner scale |
| Reliability | Optional 30-day operational observations | Separate local table/counters; canonical success events alone lack attempt denominator |

An **effective** event is a canonical user event for which no later `origin='undo'` event references it through `undo_of_event_uuid`. Undo events themselves are not eligible milestone events. A normal later backward move has no undo link and therefore does not erase the earlier milestone.

Illustrative first-processed query shape:

```sql
WITH effective_exits AS (
  SELECT e.item_id, e.occurred_at
  FROM item_workflow_events e
  WHERE e.event_type = 'status_changed'
    AND e.origin = 'user'
    AND e.from_status = 'inbox'
    AND e.to_status <> 'inbox'
    AND NOT EXISTS (
      SELECT 1 FROM item_workflow_events u
      WHERE u.undo_of_event_uuid = e.event_uuid
        AND u.origin = 'undo'
    )
), first_processed AS (
  SELECT item_id, MIN(occurred_at) AS first_processed_at
  FROM effective_exits
  GROUP BY item_id
)
SELECT COUNT(*)
FROM first_processed
WHERE first_processed_at >= :window_start_utc
  AND first_processed_at < :window_end_utc;
```

Completed uses the same shape with `to_status='done'`. Added uses `initialized/origin='capture'`. All current-state writes and canonical events must share one transaction; otherwise counts can disagree with the board.

Before implementation, benchmark current stock/count queries and first-event queries against a production-size snapshot. Add daily rollups only if measured latency requires them. Rollups must be reproducible from canonical events and must honor hard-delete privacy; performance is not permission to retain deleted history.

## Prototype display recommendation

### Desktop header

Use three calm, non-clickbait groups:

1. **Inbox** — `327 total` with `Oldest 84d` as supporting text.
2. **This week** — `8 triaged · 12 added` with a neutral `+4 intake gap` explanation only when unambiguous.
3. **Completed** — `3 this week`.

When the view is filtered, keep this header unchanged. Column/list labels switch to values such as `Inbox · 12 matching`, `To Do · 7 matching`.

### Mobile entry and header

- Library entry: `Inbox 327 · oldest 84d`; cap only the navigation badge at `99+`, not the page value.
- Inbox page: show Inbox total/oldest first, then one compact weekly line: `This week: 8 triaged · 12 added · 3 completed`.
- Put today counts, status totals, archive activity, ratio, and duration under **Activity** disclosure.

### Display safeguards

- Neutral color; no red debt badge, overdue language, streak, confetti, or “perfect Inbox.”
- Use `Triaged`, not `Processed`, in customer-facing numbers.
- Show `matching` whenever filters change counts.
- Duration display: `Median 2.4d · average 5.1d · n=14 · Early signal`.
- Oldest age is actionable context, not an overdue deadline.
- When no new captures exist, show ratio as `—`, not infinity or 100%.
- If hard deletion changes history, no alert is required, but metrics help text must say totals reflect current retained sources.

## Anti-vanity guardrails

Do not use the following as headline success or launch targets:

- total workflow transitions or per-cycle Inbox exits;
- archive action count or archive size;
- board/list opens, sessions, clicks, or time in app;
- daily-active-user or retention percentages for one owner;
- streak length, zero-Inbox days, or perfect-Inbox rate;
- notification delivery/open rate;
- number of tags, topics, notes, or filters used during triage;
- raw Done entries without first-event and Undo/reopen handling;
- backlog count alone without oldest age and intake context;
- average duration without median, sample size, and legacy exclusion;
- triage-to-add ratio without its raw numerator and denominator.

No metric target should be invented before a four-week baseline. The first launch gates are semantic correctness and trust: zero silent state divergence/lost confirmed moves in controlled scenarios, correct counts across all creation paths, and a comprehensible weekly health summary in prototype testing.

## Acceptance tests

The fixture clock and owner timezone must be explicit in every metric test.

| # | Scenario | Expected result |
|---|---|---|
| 1 | A new web capture initializes in Inbox at 10:00 owner time | Inbox now +1; Added today/week +1; processed/completed unchanged |
| 2 | Recall creates a genuinely new local item | Added increments at local import time; Recall's remote creation time does not set the calendar bucket |
| 3 | Duplicate URL share, Recall replay, repair, or transcript upgrade reuses an item | No added event; status/archive and all milestones unchanged |
| 4 | Migration initializes 500 legacy items | Inbox now +500; oldest uses earliest original capture; added/processed/completed/duration samples all +0 |
| 5 | A legacy item is deliberately moved Inbox → To Do | Processed increments once at move time; added unchanged; item remains excluded from first-Inbox duration |
| 6 | A new item moves Inbox → To Do, later To Do → Inbox, then Inbox → In Progress | Processed increments only on the first exit; Inbox stock/age reflect the return while present; diagnostic Inbox exits can equal 2 |
| 7 | The first Inbox exit is immediately undone | The linked exit is ineffective: processed returns to 0 and original Inbox-age anchor is restored |
| 8 | After test 7, the item later exits Inbox deliberately | That later event becomes the first effective processed milestone |
| 9 | An item moves Inbox → Done | Processed +1 and completed +1 at the same timestamp |
| 10 | Done is reopened, then completed again | Completed remains 1; second Done entry is diagnostic only |
| 11 | First completion is immediately undone, then completed later | First event is excluded; later effective Done entry defines completion time |
| 12 | Done is archived, normally restored next day, then re-archived in the same week | Current archive reflects final state; archived-in-week counts the distinct item once; processed/completed unchanged |
| 13 | Archive is immediately undone | Linked archive is ineffective for archived-in-window; current status returns to active Done |
| 14 | Status mutation is optimistic then fails, conflicts, or is rejected offline | No canonical event or product metric changes; optional reliability result records normalized outcome |
| 15 | Same mutation ID is retried after a lost response | One canonical event, one metric increment; response may report `replayed` |
| 16 | Bulk move sends 20 Inbox items, 3 of which were processed previously | Processed +17; canonical event per item; all carry the same batch operation ID and `action_mode='bulk'` |
| 17 | An Inbox item is hard-deleted | It disappears from current stock and all recomputed historical metrics/samples; no anonymous retained total remains |
| 18 | Event occurs exactly at owner-local midnight | Included in the new day, excluded from the prior day |
| 19 | Event occurs at Monday 00:00 owner time | Included in the new week; event one millisecond earlier belongs to prior week |
| 20 | Owner timezone observes a daylight-saving transition | UTC bounds map to local midnights; no fixed 24-hour assumption duplicates or drops events |
| 21 | Owner changes timezone | The same UTC events re-bucket under the newly saved timezone; event rows remain unchanged |
| 22 | Active filters match 12 of 327 Inbox items | Header shows `327 total`; Inbox column/list shows `12 matching`; loaded page length cannot replace either SQL count |
| 23 | Filtered result has no rows while total Inbox is nonzero | Empty state says `No sources match these filters`, not `Inbox is empty` |
| 24 | Tag/topic membership changes after a processed event | Owner-wide historical primary metrics do not change; filtered current counts reflect current membership |
| 25 | A duration cohort has 4 eligible exits | No numeric average/median; display `Not enough data (4/5)` |
| 26 | Duration cohort has 14 eligible exits and one long outlier | Show median, average, `n=14`, and `Early signal`; legacy samples remain excluded |
| 27 | Rolling 28-day added count is zero | Ratio displays `—` with raw `0 added`; no division error or artificial 100% |
| 28 | Item is archived | It is absent from active status counts, present in archive stock, and still eligible in Library/search/Ask under the accepted archive scope |
| 29 | Two tabs mutate the same expected version | Exactly one commits; the loser gets conflict/current snapshot and no metric increment |
| 30 | Optional instrumentation is disabled or its 30-day retention purge runs | Workflow state, Undo, canonical history, and all user-facing metrics continue to work |

## Evidence and feasibility conclusion

Current code confirms that `items` is the canonical saved-source identity, every genuine creation path converges on `insertCaptured`, duplicate/upgrade paths reuse identity, Library counts are separate from loaded results, and the product has no centralized analytics layer. The living wiki likewise classifies existing logs and usage accounting as operational rather than product analytics. Prior Notes councils establish the privacy precedent: local, content-free facts; reliability before adoption targets; no false precision.

The minimum feasible measurement seam is therefore the proposed current workflow fields plus an append-only, content-free event table with explicit Undo linkage. That seam supports the required metrics without production telemetry, without storing source content, and without turning a private one-owner workflow into an activity dashboard.
