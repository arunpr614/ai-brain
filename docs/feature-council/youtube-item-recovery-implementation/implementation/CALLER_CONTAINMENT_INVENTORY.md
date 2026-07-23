# Caller and Containment Inventory

**Frozen source baseline:** `f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8`

**Evidence date:** 2026-07-23 (Asia/Kolkata)

**Scope:** current Phase4 item-content writers; transcript-recovery, enrichment, batch, embedding, note-index, status, deletion, and startup paths

**Implementation state:** frozen-baseline inventory plus Stage 1 branch containment; consolidated validation and the independent focused final-gate recheck passed. This is a non-enabling foundation and grants no browser-capture, held-processing, live-lab, or production-deployment authority.

## Release boundary

Production browser-visible transcript capture and production processing of a held browser transcript are **DENIED**. An environment flag, approval identifier, manifest, worker mode, request field, or extension package cannot override that denial.

An isolated live lab canary is also **BLOCKED** today. The repository does not contain the required external authorization packet, isolated lab identities and data root, private manifests, approved targets, retention owner, provider decision, or cleanup authority. Synthetic fixtures, packaged-local fixture evidence, containment work, and production-negative tests may continue.

Decision D-008's corrected three-origin, secret-grant two-channel transfer passed the focused contract recheck with no remaining P0/P1 finding. That result is still not Chrome implementation authority: body-transfer work remains blocked on migration 027, package/security evidence, and the separate lab gates.

## Evidence method and limits

The file and line ranges below were read from the frozen baseline with numbered source output and repository-wide call-site searches. Unless a paragraph explicitly says “Stage 1 branch,” current/gap language describes that baseline. Immediate runtime callers are listed. A path identified as dormant has no production caller in the baseline. Test, benchmark, seed, and spike-only writers are separately classified so they are not mistaken for deployed claimants.

The current schema ends at migration `026_notebooklm_export.sql`. It has:

- no `items.content_revision`;
- no `content_processing_holds`;
- no revision-bound or token-bound enrichment, embedding, or transcript claim;
- no partial unique constraint guaranteeing one active transcript source;
- no browser-visible transcript acquisition/source literal;
- no migration 027.

Stage 1 must therefore remain bootable on schema 026 while denying all new restricted capabilities. It must not pretend to provide revision-CAS safety before migration 027.

## Item title, body, author, and duration writers

| Boundary                               | Current writer at `f905f6a`                                                                                                                                                                                                       | Immediate runtime callers                                                                                                                                                                                                                                       | Current gap                                                                                                                                  | Stage 1 rule                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical new-item insert              | `src/db/items.ts:37-57` (`InsertCapturedInput`); `src/db/items.ts:59-153` (`insertCaptured`); `src/db/items.ts:155-165` (`createNote`)                                                                                            | `src/app/api/capture/note/route.ts:83-92`; `src/app/api/capture/url/route.ts:338-354`; `src/app/capture-actions.ts:59-74,124-138`; `src/app/actions.ts:19-35`; `src/lib/recall/importer.ts:160-173`; `src/lib/telegram/dispatch.ts:358,488,570-584`             | A new row cannot already have a hold, but there is no revision field to initialize.                                                          | Preserve schema-026 behavior. Migration 027 must establish revision 1 and the required trigger/invariant for later content changes.                                                                                                                                                                                                                 |
| Generic existing-item replacement      | `src/db/items.ts:370-423` (`updateItemCaptureContent`), SQL at `src/db/items.ts:391-421`                                                                                                                                          | No production caller found; tests only. External/dynamic caller remains unknown.                                                                                                                                                                                | The write has no hold or expected-revision predicate.                                                                                        | Keep the API compatible, but make its transaction respect a ready-schema hold. Do not expose a public boolean bypass.                                                                                                                                                                                                                               |
| Async capture upgrade                  | `src/db/item-upgrades.ts:13-164` (`upgradeItemCaptureContent`), destructive reset at `src/db/item-upgrades.ts:41-113`, artifact save at `src/db/item-upgrades.ts:117-129`                                                         | `src/app/api/capture/url/route.ts:245-323`; `src/app/items/[id]/upgrade-actions.ts:25-108`; `src/lib/queue/transcript-worker.ts:191-310`; `src/lib/telegram/dispatch.ts:297-346`                                                                                | Network extraction may complete after the item has changed; apply uses item ID only. Artifact persistence happens after the DB transaction.  | Check hold before dispatch at async callers and again inside the apply transaction. A blocked apply must not save an artifact or mark a recovery job done. An unresolved batch reservation also fails closed before destructive reset; resolved/legacy bindings remain compatible. Expected revision and claim-token CAS arrive with migration 027. |
| Repair/replacement                     | `src/lib/repair/item-repair.ts:47-177` (`repairItemWithText`), SQL at `src/lib/repair/item-repair.ts:117-159`                                                                                                                     | `src/app/items/[id]/repair/actions.ts:27-117`; `src/lib/capture/transcripts/user-provided.ts:83-246`; `src/lib/capture/transcripts/youtube-official.ts:110-264`; `src/lib/capture/transcripts/owned-media-stt.ts:174-282`; `src/lib/recall/importer.ts:182-260` | The helper resets derived state without checking a processing hold or revision.                                                              | Default to respect-hold inside the transaction and refuse to clear an unresolved batch reservation. Resolved/legacy bindings retain the existing repair behavior. A future authorized browser attachment must use a private transaction-owned capability/service, not bypass this generic helper.                                                   |
| Scheduled/realtime AI digest and title | `src/lib/enrich/pipeline.ts:153-269` (`enrichItem`); short-body apply at `src/lib/enrich/pipeline.ts:159-181`; provider call at `src/lib/enrich/pipeline.ts:184-206`; derived/title apply at `src/lib/enrich/pipeline.ts:219-251` | `src/lib/queue/enrichment-worker.ts:170-209`; `src/app/api/items/[id]/enrich/route.ts:58-106`                                                                                                                                                                   | Short-body and normal applies are both unfenced. The provider input includes body, title, author, and duration, but apply uses item ID only. | Gate the short-body path, immediately pre-dispatch, and transactionally at apply. Hold during provider work means no title, summary, quote, category, topic/tag, usage, job-success, or embedding transition.                                                                                                                                       |
| Batch AI digest and title              | `src/lib/queue/enrichment-batch.ts:222-304`; title/derived write at `src/lib/queue/enrichment-batch.ts:262-278`; failure/requeue writes at `src/lib/queue/enrichment-batch.ts:306-343`                                            | `src/lib/queue/enrichment-batch.ts:184-215`; cron at `src/lib/queue/enrichment-batch-cron.ts:126-133`                                                                                                                                                           | A late remote batch result can apply to changed or held content. Failure handling can also mutate a held row.                                | Reserve eligible item/job state with a fresh random alias before dispatch. An ambiguous provider outcome remains quarantined, nonpollable, and nonresubmittable. Recheck every resolved result independently; held/stale rows cause no derived, success, failure, or requeue mutation. Batch is never a manual-lab claimant.                        |

### Upstream entry points for canonical insert

- Recall insert and replacement are reached through `src/lib/recall/sync-runner.ts:112-403`; the operator CLI enters at `scripts/sync-recall.ts:134-149`.
- Telegram insert and upgrade are reached through `src/lib/telegram/webhook-handler.ts:37-152`; the HTTP entry is `src/app/api/telegram/webhook/route.ts:33-39`.
- `src/lib/capture/transcripts/youtube-official.ts:110-264` is exported but has no production caller in the frozen baseline.
- Owned-media STT is reached through `src/lib/capture/transcripts/owned-media-stt-route-service.ts:163` and `src/app/api/transcripts/owned-media/route.ts`.

### Non-deployed writer classification

The following were reviewed and are not production claimants:

- synthetic fixture/smoke scripts that call `insertCaptured`;
- `scripts/bench-processing.ts:59-82`, a raw benchmark-only item insert;
- `scripts/spikes/capture-artifact-storage.mjs:59-72,143-150`, an isolated spike insert/delete;
- `scripts/seed-manual-notes-visual-qa.ts:9-45`, a synthetic visual-QA seed;
- `scripts/ux-v2-seed-android-a3-ask-item-detail.ts:211-238`, a synthetic status seed.

They may need fixture updates after migration 027, but they do not grant authority and must not be used as production evidence.

## Extension and literal link-only callers

| Surface                                  | Current path                                                            | Current behavior and gap                                                                                 | Required dependency/containment                                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary toolbar popup                   | `extension/src/popup.ts:1-52`; client `extension/src/capture.ts:64-118` | Submits title, URL, and optional note to `/api/capture/url`; this is a rich capture path, not link-only. | Preserve ordinary behavior. A future intent-bound tab must never fall through to this path after recovery failure.                                 |
| Hyperlink context menu labeled Save link | `extension/src/background.ts:28-38,72-108`                              | The literal `Save link to Brain` action calls the same generic `captureUrl()` function.                  | After frozen 027 exclusions and a dedicated metadata-only API exist, route only this literal action to `captureLinkOnly()`/`browser_link_only_v1`. |
| Page/selection context menus             | `extension/src/background.ts:24-31,39-54,72-108`                        | Labels promise page or selected-text capture and call generic capture.                                   | May retain rich ordinary capture under truthful labels; they do not authorize transcript recovery.                                                 |
| Server URL capture                       | `src/app/api/capture/url/route.ts:57-84,142-163,245-392`                | Performs URL extraction/upgrade and explicitly enqueues transcript recovery at `142-163,377-379`.        | Link-only must use a distinct route/service that performs no extractor call, upgrade, job reset, or recovery enqueue.                              |
| SQL trigger/backfill                     | `src/db/migrations/021_restore_transcript_recovery_trigger.sql:8-72`    | Enqueues weak/metadata-only YouTube rows without a future link-only exclusion.                           | Frozen 027 is a hard predecessor to link-only release and must exclude the exact method in trigger plus every application/standalone backfill.     |

Required link-only evidence covers popup/context-menu dispatch, duplicate items, throwing extraction/fetch adapters, zero transcript jobs, SQL trigger, application backfill, standalone backfill, and truthful non-transcript copy. Stage 1 containment may inventory or deny this path but may not add the feature, migration literal, route, or extension behavior.

## Transcript source and recovery paths

| Phase                          | Current path                                                                                                                                                                                                              | Current behavior and gap                                                                                             | Required containment                                                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source persistence             | `src/db/transcripts.ts:172-210` insert/supersede; `src/db/transcripts.ts:230-240` active lookup; `src/db/transcripts.ts:243-291` segment insert/delete                                                                    | Multiple active source rows are currently possible.                                                                  | Migration 027 must add deterministic preflight plus the partial unique active-source constraint.                                                                                                                                                                        |
| Foreground user attachment     | `src/lib/capture/transcripts/user-provided.ts:83-156,158-246`                                                                                                                                                             | Repair, supersede, source, and segments rely on nested savepoint behavior rather than one service-owned transaction. | Preserve existing schema-026 behavior; later route browser attachment through transaction-owned primitives with exact item/revision/source/receipt/hold invariants.                                                                                                     |
| Official caption library path  | `src/lib/capture/transcripts/youtube-official.ts:110-264`                                                                                                                                                                 | Exported but not wired to a production surface. It performs provider work then repair/source writes.                 | Production policy remains method-specific and fail-closed; hold and later revision checks apply if the library path is wired.                                                                                                                                           |
| Owned-media STT                | `src/lib/capture/transcripts/owned-media-stt.ts:174-282`; route service call at `src/lib/capture/transcripts/owned-media-stt-route-service.ts:163-170`                                                                    | Provider work precedes unfenced repair/source writes.                                                                | Hold pre-dispatch and transactional apply checks; later expected revision and authorization context.                                                                                                                                                                    |
| Recovery candidate/enqueue     | `src/db/transcript-jobs.ts:75-88,97-166`; startup backfill at `src/db/transcript-jobs.ts:168-193`                                                                                                                         | Candidate logic uses weak YouTube capture state only. It does not exclude an active source or hold.                  | On ready schema, exclude active source and active hold before enqueue/reset. Old schema uses the existing predicate.                                                                                                                                                    |
| URL and Telegram enqueue       | `src/app/api/capture/url/route.ts:146,378`; `src/lib/telegram/dispatch.ts:204,396`                                                                                                                                        | Can reset or create work without a source/hold check.                                                                | Reuse the centralized eligibility decision; no route-specific exception. A response claims transcript recovery was queued only when the enqueue outcome is applied; blocked, incompatible, unchanged, or null outcomes use truthful generic/private no-effect behavior. |
| Trigger enqueue                | `src/db/migrations/021_restore_transcript_recovery_trigger.sql:8-72`; historical definition `src/db/migrations/017_transcript_recovery.sql:73-138`                                                                        | Current trigger cannot know the future source/hold schema.                                                           | Migration 027 replaces or narrows trigger eligibility; Stage 1 claim gates contain legacy rows until then.                                                                                                                                                              |
| Claim                          | `src/db/transcript-jobs.ts:270-302`; stale sweep at `src/db/transcript-jobs.ts:304-322`                                                                                                                                   | Claim has no item join, active-source exclusion, hold, revision, or claim token.                                     | Old query only when feature is absent; ready-schema query uses source/hold exclusions. Partial schema claims nothing. Later 027 captures revision and token.                                                                                                            |
| Dispatch/apply                 | `src/lib/queue/transcript-worker.ts:191-310`; provider at `src/lib/queue/transcript-worker.ts:226-237`; replacement at `src/lib/queue/transcript-worker.ts:241-245`; done at `src/lib/queue/transcript-worker.ts:247-275` | A late fetch can overwrite a newer body and mark the job done.                                                       | Recheck before provider and inside replacement apply. Blocked/stale apply records only a bounded stable outcome and never marks done. Revision/token CAS is a Stage 2 requirement.                                                                                      |
| Job/attempt state              | `src/db/transcript-jobs.ts:324-575`                                                                                                                                                                                       | State writers are keyed by numeric job/item state without a claim token.                                             | Stage 1 must prevent success after a blocked apply; Stage 2 adds exact-token terminal transitions.                                                                                                                                                                      |
| Library backfill               | `src/lib/capture/youtube-transcript/backfill.ts:49-136`; CLI `scripts/backfill-youtube-transcripts.ts:1-13`                                                                                                               | Target selection has no active-source or hold exclusion.                                                             | Share centralized eligibility and content-free counts.                                                                                                                                                                                                                  |
| Standalone production backfill | `scripts/backfill-youtube-transcripts-prod.mjs:99-185,267-296`                                                                                                                                                            | Direct SQL bypasses TypeScript startup and future claimant helpers.                                                  | Refuse disallowed deployment/mode/schema combinations and apply the same ready-schema exclusions. Do not assume instrumentation protects it.                                                                                                                            |

The Stage 1 branch applies the enqueue outcome contract to URL duplicates and Telegram captures. It does not emit “queued” acknowledgement copy when centralized eligibility blocks or declines the enqueue. The URL route returns the existing private typed no-effect response for an incompatible schema/hold; Telegram falls back to its ordinary saved/duplicate copy when its compatibility wrapper returns no job.

## Enrichment paths

### Scheduled worker

`src/lib/queue/enrichment-worker.ts` contains the complete scheduled path:

- startup and loop: `65-111`;
- provider liveness probe before a claim: `92-99`;
- stale-claim sweep: `128-142`;
- claim: `144-168`;
- enrichment, job completion, and inline embedding: `170-209`;
- failure/retry state writes: `233-268`.

The worker currently probes the provider even when no eligible job exists. Its claim does not join `items`, exclude a hold, or capture a revision/token. Stage 1 must select an eligible job before any content-provider dispatch, and must enforce hold again at dispatch and apply.

### Legacy `/enrich`

On the frozen baseline, `src/app/api/items/[id]/enrich/route.ts:44-140` is a direct bypass:

- `force=realtime` mutates the row to running at `58-83`;
- it calls `enrichItem` at `85`;
- its queue path resets pending state at `109-140`;
- it returns provider-derived error material at `95-98`.

No in-repository UI or script caller was found; an external or older caller is unknown. Backward compatibility therefore preserves the old schema-026 queue and realtime behavior, but only while no ready-schema hold or unresolved D-018 batch reservation exists.

Stage 1 branch behavior:

- authenticate and resolve the item;
- evaluate the hold before any bodyless/default/force branch changes state;
- active hold: private typed no-effect response, recommended HTTP 409 with `{ "ok": false, "code": "processing_hold_active", "effect": "none" }`;
- incompatible feature schema: HTTP 503 and no effect;
- unresolved pre-dispatch reservation: the existing generic private/no-store HTTP 409 conflict shape and no item/job mutation;
- marker presence remains authoritative across every item/job state and is rechecked during realtime provider execution and failure finalization;
- absent feature schema or clear item: preserve current behavior;
- provider spy remains zero for a held request;
- provider failure uses a fixed generic error code; no raw provider response or error is returned.

## Batch paths

On the frozen baseline, `src/lib/queue/enrichment-batch.ts` selects and serializes pending items, dispatches the remote batch, and only then marks rows batched. That ordering cannot distinguish “provider rejected” from “provider accepted but the response was lost.”

The Stage 1 branch implements D-018:

- candidate selection excludes held/ineligible rows;
- one immediate transaction moves each exact item and job to `batched` and stores an unresolved local reservation containing a fresh random provider-facing alias before network contact;
- the code re-reads each exact reservation, builds its request, and rechecks mode/hold authority immediately before dispatch;
- a valid provider batch identifier is reconciled only by exact reservation compare-and-swap;
- a timeout, throw, invalid provider response, restart, or post-dispatch authority change leaves the reservation quarantined;
- unresolved reservations are not pollable or eligible for automatic resubmission, and manual `/enrich`, item upgrades, and repair cannot clear them;
- batch selection/claim and scheduled candidate/claim/dispatch/apply/retry/terminal/stale-sweep boundaries refuse any reservation-namespace member independent of drifted state;
- reconciled provider bindings and legacy batch identifiers retain their previous polling/reset compatibility.

D-019 closes the rollback boundary: capability is declared by the app, must match in source and built standalone packages, and is copied into both release manifests. Historical apps without that declaration remain unaware even when current release tools package them. The existing compatibility checker refuses an unaware target while live `items.batch_id` contains any reservation-namespace member, and it repeats before activation, after writers stop, and before automatic restoration.

The sole live scheduler is `src/lib/queue/enrichment-batch-cron.ts:74-87,109-133`. Batch submit and batch poll are separate claimants for worker-mode purposes; both are disabled in `disabled` and `manual-transcript-lab`.

Required invariants (implemented on the branch; formal Stage 1 focused recheck GO):

- exclude held rows from candidate selection on a ready schema;
- recheck immediately before submit;
- persist the unresolved alias/item/job reservation before submit and leave it quarantined when provider acceptance is ambiguous;
- recheck each row at apply, including error/requeue outcomes;
- never let a batch response release a hold or create manual-interactive output;
- emit aggregate counts and stable result codes, not batch/item identifiers.

## Embedding paths

### Runtime original-content embedding

`src/lib/embed/pipeline.ts`:

- reads title/body/summary at `51-65`;
- treats existing chunks as successful at `71-79`;
- builds provider inputs and dispatches at `84-131`;
- writes chunks/vectors at `133-150`;
- updates `embedding_jobs` in `embedItemWithRetry` at `165-218`.

The only live runtime caller is the inline path at `src/lib/queue/enrichment-worker.ts:185-201`. There is no generic embedding worker or claim loop on the frozen baseline.

Containment applies before the existing-chunk success shortcut, immediately before provider dispatch, and inside the chunk/vector/job-success transaction. An active hold cannot be translated into `embedding_jobs.state='done'`.

### Maintenance embedding

- `scripts/backfill-embeddings.mjs:50-83` probes a provider before target eligibility; target query is `85-104`; destructive reset is `106-123,169-172`; pipeline apply is `174-195`; dry-run prints item IDs and titles at `163-165`.
- `scripts/backfill-embeddings-prod.mjs:49-75,86-183` is a separate direct provider, chunk/vector, and job-state implementation.
- `src/lib/vector/repair.ts:21-136` repairs an approved content-free anomaly manifest and queues original jobs at `81-89` or manual-note jobs at `90-109`; it is a producer, not a claimant.

Both backfill scripts bypass instrumentation and need explicit deployment, mode, schema, and hold decisions. Dry-run/reporting must use counts and buckets only. The vector repair may leave held work queued-but-unclaimable; it must not be treated as processing authorization.

## Note-index paths

`src/lib/queue/note-index-worker.ts`:

- starts and loops at `56-90`;
- claims at `92-139`;
- reads item title plus note at `141-153`;
- performs purge apply at `206-247`;
- validates, dispatches, and applies indexing at `250-350`;
- exposes an operator/test one-job hook at `359-367`.

The worker already has note epoch/generation and lease checks, but its only enablement gate is `src/lib/notes/flags.ts:1-28`. It has no global worker mode. Producers are in `src/db/item-notes.ts:202-226,336-563` and `src/lib/notes/provider-policy.ts:122-187`; the queue schema begins in `src/db/migrations/022_item_notes.sql:68-84`.

The worker must not start or claim in `disabled` or `manual-transcript-lab`. D-015 freezes the hold as source/body-processing scoped:

- it blocks transcript/body recovery, generic enrichment, batch, original-body embedding, and any path whose input separation is unproven;
- it does not silently invalidate a separately authorized pre-existing note whose input is provably only note text plus title under the current note epoch/generation/lease contract;
- an optional note created by browser recovery remains `include_in_ai=false` and never enters this queue;
- `manual-transcript-lab` starts no note-index worker, even for pre-existing notes.

If a future note/index implementation consumes item body, transcript, summary, or other held-derived state, it becomes blocked until a separately reviewed authorization expands D-015.

## Status and read models

| Read model             | Evidence                                                                                                                                                                                             | Current misleading state                                                                                                                              | Containment projection                                                                                                                                                                                                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enrichment polling API | `src/app/api/items/[id]/enrichment-status/route.ts:12-61`                                                                                                                                            | Returned provider batch identity and persisted error text alongside raw item/job state.                                                               | Stage 1 adds no public field or state. D-017 removes `batch_id` and `last_error`; state, attempts, timestamp, and polling behavior remain. Every 401/404/200 response is private/no-store. A later reviewed status slice may add content-free `processing_hold_active` and a stable effective state/code only when the feature schema is ready.                |
| Enrichment pill        | `src/components/enriching-pill.tsx:6-121`; watcher `src/components/item-enrichment-watch.tsx:11-28`; mounts `src/components/library-list.tsx:319-372`, `src/app/items/[id]/page.tsx:399-404,935-940` | Can show queued/running while processing is held and exposed provider-specific batch/error detail.                                                    | D-017 permits only removing provider batch/error detail while preserving existing generic state copy. No held state or new copy is added in Stage 1. Consume a later reviewed additive effective projection; never infer completion from raw state.                                                                                                            |
| Item processing status | `src/lib/items/status.ts:25-89`; item page use at `src/app/items/[id]/page.tsx:247-252,782,922,940,1823-1838`; digest placeholders at `src/app/items/[id]/page.tsx:1029,1840-1867`                   | Derives readiness from raw chunks and job state without revision/current-source checks; transcript recovery detail could render persisted raw errors. | Stage 1 may use an internal typed no-effect/hold decision solely to contain existing claimants. D-017 maps existing transcript failure state to fixed user copy and normalizes provider labels to a fixed allowlist without adding a state/action. New public status, fields, actions, and copy are otherwise deferred; revision-current readiness is Stage 2. |
| Attention/review       | `src/lib/review/attention.ts:68-183,186-240`                                                                                                                                                         | Can report recovery, missing index, or failure without hold/current-source context.                                                                   | Add hold-aware effective reason after schema 027; keep old-schema output compatible.                                                                                                                                                                                                                                                                           |
| Transcript status      | `src/db/transcript-jobs.ts:195-210,249-267,539-575`; item UI `src/app/items/[id]/page.tsx:226-259,622-665,1655-1680`; review actions `src/app/review/actions.ts:27-46`                               | Raw retry/ignore state is not source/revision aware.                                                                                                  | Do not present a held row as runnable. Stage 2 binds retries to current source/revision.                                                                                                                                                                                                                                                                       |
| Recovery option model  | `src/lib/capture/transcripts/recovery-options.ts:66-133,172-191`                                                                                                                                     | Uses the legacy environment classifier and can present a lab-public option from unsafe promotion.                                                     | Consume the authoritative deployment classifier. Production remains blocked regardless of approval text.                                                                                                                                                                                                                                                       |

No status response or diagnostic may expose transcript text, source identifiers, authorization hashes, manifest content, provider raw output, or target information.

## Deletion paths

The central deletion path is `src/db/items.ts:344-368`:

- `deleteItems` performs related cleanup in a DB transaction;
- `DELETE FROM items` is at `src/db/items.ts:360`;
- `deleteItem` delegates at `src/db/items.ts:366-368`.

Live callers are:

- `src/app/actions.ts:38-43` single delete;
- `src/app/actions.ts:174-186` bulk delete;
- `src/app/review/actions.ts:12-21` review delete.

The isolated spike delete at `scripts/spikes/capture-artifact-storage.mjs:143-150` is not runtime.

Migration 027 must make source, segment, hold, intent/receipt, and relevant job rows cascade or be transactionally terminalized. Every late worker apply must require item existence plus current hold/revision/claim predicates so deletion cannot recreate output or mark orphan work successful. Current filesystem artifact deletion is not rollbackable with SQLite; that is an existing boundary, not proof against the new race.

## Startup graph

`src/instrumentation.ts` currently:

- checks Node runtime at `14-23`;
- imports the DB, all content workers, backup, retention, enrollment, auth, and error sink at `25-40`;
- opens/migrates the DB at `42-43`;
- starts NotebookLM retention at `48`;
- resumes Processing enrollment at `53`;
- initializes API token behavior at `55-69`;
- starts backup and every content worker at `71-79`.

Stage 1 must resolve deployment class, schema capabilities, configured public origin, and background-worker mode before dynamically importing a content worker.

The content claimants governed by the mode are:

- scheduled enrichment;
- transcript recovery;
- note index;
- batch submit;
- batch poll;
- original-content embedding only through its current scheduled-enrichment caller.

NotebookLM retention, backup, API-token setup, and Processing enrollment remain outside this feature's content-worker mode.

## Background-worker mode contract

The only accepted configured values are:

| Mode                    | Claimants that may start                                                                                       | Frozen behavior                                                                                                                                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled`              | None of scheduled enrichment, original embedding, note-index, transcript recovery, batch submit, or batch poll | Safe containment and receipt-only/local fixture operation.                                                                                                                                                                                                                                   |
| `standard`              | The reviewed ordinary set                                                                                      | Every ready-schema claimant still excludes an active hold unconditionally. No browser/manual authorization is implied.                                                                                                                                                                       |
| `manual-transcript-lab` | Interactive enrichment and interactive embedding for one current accepted authorization/run                    | It never starts scheduled enrichment, generic embedding, note-index, transcript recovery, batch submit/poll, or unrelated work. The frozen baseline has no capable interactive runner or migration-027 authorization, so Stage 1 must start none and report the mode as unsupported/blocked. |

Unknown, conflicting, or malformed values start no content claimant.

### Schema-026 compatibility bridge

The final plan describes the flag default as disabled/lab-specific, while Stage 1 must keep ordinary production behavior unchanged. The narrow compatibility proposal is:

1. Missing mode on schema 026 resolves to `standard` only when every new restricted capture/manual-processing flag is false.
2. Emit one content-free `legacy_default_standard` startup diagnostic.
3. If any restricted feature is requested while the mode is missing, resolve to disabled/fail-closed.
4. Explicit `disabled`, `standard`, and `manual-transcript-lab` always follow the table above.
5. Deployment/release configuration must become explicit before migration 027 or feature enablement.

This bridge is not permission to run a restricted capability. It exists only to preserve the current production worker set while all new capabilities remain off.

## Old-schema tri-state

Stage 1 must never prepare SQL that references a new table or column before discovering that capability.

```ts
type SchemaCapabilityState =
  | { kind: "absent" }
  | { kind: "ready" }
  | { kind: "incompatible"; code: string };

type HoldGate =
  | { kind: "legacy_schema_absent"; held: false }
  | { kind: "clear"; held: false }
  | { kind: "held"; held: true; code: "processing_hold_active" }
  | {
      kind: "schema_incompatible";
      held: true;
      code: "processing_schema_incompatible";
    };
```

Required implementation properties:

- discover tables with `sqlite_master` and columns with `PRAGMA table_info`;
- report `ready` only when the migration ledger contains the exact independently frozen 027 filename and its exact packaged SHA **and** the complete reviewed tables, columns, checks, triggers, and indexes are present;
- until the 027 filename, packaged SHA, and full schema manifest are frozen, no database can produce a production-eligible `ready` result;
- cache by DB handle and `PRAGMA schema_version`, invalidating after migration;
- never cache hold state and never skip ledger attestation on a cache refresh;
- distinguish a legitimate pre-027 absence from a partially applied or malformed feature;
- schema absent preserves existing ordinary work while restricted features stay denied independently;
- schema ready activates hold-aware claim and apply SQL;
- schema incompatible or discovery failure fails closed for affected content work;
- claim functions choose an old query only for `absent`, a `NOT EXISTS`/join predicate for `ready`, and no claim for `incompatible`;
- apply checks occur inside the same transaction as the derived/content write.

The allocated implementation is `src/db/schema-capabilities.ts` with `src/db/schema-capabilities.test.ts`. Tests must cover legitimate schema-026 `absent`; exact ledger name/hash plus exact full shape `ready`; and missing/wrong ledger name, missing/wrong hash, partial shape, wrong check/trigger/index, or discovery failure as `incompatible`. Features to attest include `items.content_revision`, `content_processing_holds`, and later job revision/claim-token columns. Absence of revision fields means Stage 1 cannot claim stale-response safety.

## Dispatch and apply invariant

Every asynchronous path follows the same containment sequence:

1. **Claim:** only an eligible item; ready-schema holds and current active-source conflicts are excluded.
2. **Pre-dispatch:** recompute deployment, mode, kill switch, hold, item existence, and any available eligibility immediately before the network call.
3. **Provider work:** no DB transaction remains open.
4. **Apply:** in one DB transaction, recompute item existence and hold; after migration 027 also compare expected revision, claim token, source, and authorization context.
5. **Terminal state:** mark success only if apply succeeds under the same fence. Blocked/stale/deleted results do not mutate derived state or enqueue the next stage.

A hold check only before dispatch does not close an attach-during-provider race. That is why production exposure remains denied until migration 027 and its deterministic barrier tests are complete.

## Completed Stage 1 slices before migration 027

1. **Runtime/config foundation:** authoritative deployment classification, parsed configured origin, restricted-capability denial, feature flags/kill switches, and typed diagnostics.
2. **Old-schema foundation:** schema capability probes and tri-state hold decision, with no migration.
3. **Startup skeleton:** exact worker-mode planner, resolved before content-worker imports.
4. **Claim/apply containment:** enrichment, batch, embedding, transcript recovery/backfill, and item upgrade/repair. Note-index receives global mode exclusion under D-015 but no blanket source-hold predicate while its input remains independently authorized note + title.
5. **HTTP containment:** the existing legacy `/enrich` route may return the exact D-014 private typed no-effect response under a ready-schema hold or incompatible feature schema; add the shared private response/origin helper and contain the recovery-option policy. Add no public status field, action, state, or copy.
6. **Standalone script containment:** both embedding backfills and both transcript backfills.
7. **Independent review:** verified old-schema parity, production denial, zero provider calls under hold, and content-free diagnostics; the formal focused final-gate recheck returned GO.
8. **Only then migration 027:** revision/source/hold/claim/receipt transactional foundation.

## Current blockers and residual unknowns

- The focused Stage 0 recheck closed all contract-level P0/P1 findings; the later formal Stage 1 focused recheck closed M5 with zero P0/P1/P3 findings.
- D-008 passed its contract recheck, but migration 027 and package/security gates still block Chrome work.
- Migration 027 is not implemented or hash-frozen.
- Stage 1 now implements authoritative deployment classification, worker-mode planning, schema tri-state, and denial-only processing-hold gates against the old schema; migration-backed revision/source/hold/receipt authority remains Stage 2 work.
- The external live-lab packet is absent.
- `updateItemCaptureContent` has no production caller; any dynamic/external caller is unknown.
- The official YouTube caption attachment service has no production caller.
- No in-repository caller of legacy `/enrich` was found; external/older callers remain possible.
- There is no generic original-content embedding worker and no interactive manual enrichment/embedding runner.
- Note hold scope is frozen by D-015 and its Stage 1 mode/exclusion evidence passed; migration-backed source/body scope remains Stage 2 work.
- Current status projections are not revision-aware.
- Audited Stage 1 diagnostics and standalone-script refusal output are content-free; future feature paths still require their own canary scan and packaged security evidence.

These unknowns do not weaken the release decision: production capture and production held-transcript enrichment remain denied, and the live lab canary remains blocked.
