# AI Brain Item Recovery Manual Enrichment: Current-State Audit

**Date:** 2026-07-22
**Status:** Evidence baseline for Product Council and planning artifacts
**Scope:** The item-initiated YouTube transcript recovery flow and the proposed explicit manual enrichment action after transcript attachment

## Executive Finding

The existing application does not yet have a truthful manual-enrichment boundary for a recovered YouTube transcript. The shared repair service immediately resets the item and its enrichment job to `pending`; the always-on realtime worker can claim that pending job; and the batch submitter can independently select the same pending item. Adding a button to the item page without changing these state transitions would misrepresent the user experience because AI processing could begin before the click.

The previously planned browser-visible transcript commit introduces the right prerequisite: an active transcript source, a monotonic content revision, and a processing hold created in the same transaction. The new feature must explicitly authorize and release only the exact held transcript revision the user saw, then dispatch an immediate background run that remains fenced against later item changes.

## Evidence Inspected

- `docs/plans/youtube-dom-capture/prototype/item-initiated-recovery/README.md`
- `docs/plans/youtube-dom-capture/prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_product_council.md`
- `docs/plans/youtube-dom-capture/prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_ux_prototype.html`
- `docs/plans/youtube-dom-capture/2026-07-22_ai_brain_youtube_dom_capture_prd_v2_final.md`
- `docs/plans/youtube-dom-capture/2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v2_final.md`
- `src/lib/repair/item-repair.ts`
- `src/app/api/items/[id]/enrich/route.ts`
- `src/app/api/items/[id]/enrichment-status/route.ts`
- `src/lib/queue/enrichment-worker.ts`
- `src/lib/queue/enrichment-batch.ts`
- `src/lib/enrich/pipeline.ts`
- `src/lib/embed/pipeline.ts`
- `src/lib/items/status.ts`
- `src/components/enriching-pill.tsx`
- `src/components/item-enrichment-watch.tsx`
- `src/app/items/[id]/page.tsx`

## Confirmed Current Behavior

### 1. Transcript repair automatically arms enrichment

`repairItemWithText()` clears the existing AI outputs, sets `items.enrichment_state = 'pending'`, and inserts or resets `enrichment_jobs` to `pending` in the same repair transaction (`src/lib/repair/item-repair.ts:117-159`). The transcript attachment path uses this shared repair behavior.

**Consequence:** transcript attachment is already an implicit enrichment trigger. There is no durable state that means "transcript attached, AI not authorized."

### 2. The realtime worker can claim pending work without user intent

The application starts a polling enrichment worker. Its claim query selects the oldest `enrichment_jobs.state = 'pending'` row with no processing-hold, source, revision, dispatch-mode, or consent predicate (`src/lib/queue/enrichment-worker.ts:144-168`). It then enriches and embeds the item in one worker pass (`src/lib/queue/enrichment-worker.ts:170-202`).

**Consequence:** the proposed button cannot reliably precede processing unless held jobs are excluded from claim.

### 3. The batch path independently selects pending items

The daily batch selector reads any item with `enrichment_state = 'pending'` and a sufficiently long body (`src/lib/queue/enrichment-batch.ts:107-165`). The submit and result-apply paths have no processing-hold, content-revision, active-source, or authorization checks (`src/lib/queue/enrichment-batch.ts:184-303`).

**Consequence:** a held transcript needs an explicit dispatch class and exclusion from both realtime and batch claim paths. A manually authorized run must not be silently converted into a nightly batch.

### 4. The existing manual enrichment endpoint is not the required contract

`POST /api/items/:id/enrich` supports a default queue reset and `?force=realtime` inline execution (`src/app/api/items/[id]/enrich/route.ts:10-43`). The realtime path:

- runs the model inside the request, potentially for 15-60 seconds;
- accepts any non-running item state;
- does not bind to a transcript source, content revision, processing hold, provider disclosure, or user authorization;
- has no request idempotency receipt;
- returns raw model output on failure (`src/app/api/items/[id]/enrich/route.ts:85-98`);
- enriches but does not explicitly model semantic indexing as a separately recoverable stage.

The queue path merely resets the item and job to `pending` (`src/app/api/items/[id]/enrich/route.ts:109-140`), where the current realtime worker and batch selector can race.

**Consequence:** extending this endpoint would preserve ambiguous and unsafe semantics. The new flow needs an asynchronous run resource with an exact authorization contract.

### 5. Async writers can apply results to newer content

The enrichment pipeline loads the current item, sends its prompt, and later writes outputs using only `WHERE id = ?` (`src/lib/enrich/pipeline.ts:153-251`). The prompt includes the body and a composed title that can include title, author, and duration (`src/lib/enrich/pipeline.ts:34-55`, `184-198`).

The embedding pipeline similarly reads title, body, summary, and enrichment time, calls the provider, and inserts chunks without an expected revision or claim token (`src/lib/embed/pipeline.ts:51-157`).

**Consequence:** if a transcript, title, or other prompt input changes while either provider call is in flight, stale outputs can be applied to the newer item. A body-only revision is insufficient because title, author, duration, and summary also affect generated or indexed content.

### 6. Batch result application is also revision-blind

Batch requests use the item ID as `custom_id`, and successful results update the current item based on `id` plus `enrichment_state = 'batched'` (`src/lib/queue/enrichment-batch.ts:128-165`, `222-303`).

**Consequence:** an item ID is not a sufficient execution identity. A batch or manual run must carry an expected input fingerprint and content revision through claim and apply.

### 7. Current status models cannot express held or staged manual processing

The item status helper exposes saved, summary-ready, semantic-indexing states, and not-applicable, but no held or awaiting-consent state (`src/lib/items/status.ts:3-89`). The enrichment pill polls only pending, running, batched, done, and error. The item page tells users that enrichment and semantic indexing are queued after repair (`src/app/items/[id]/page.tsx:1366-1384`).

**Consequence:** the UI would provide a false success/progress story unless the effective processing state is expanded to represent:

- transcript attached and AI held;
- confirming authorization;
- queued for immediate processing;
- generating digest;
- building semantic index;
- complete;
- enrichment failed;
- indexing failed after digest success;
- stale transcript or changed provider requiring reconfirmation;
- feature or policy disabled.

### 8. Enrichment and indexing have distinct failure value

The realtime worker immediately calls semantic embedding after successful enrichment (`src/lib/queue/enrichment-worker.ts:185-201`). The embedding pipeline records its own terminal error state (`src/lib/embed/pipeline.ts:165-217`).

**Consequence:** a semantic-indexing failure must preserve the successful summary, quotes, category, and tags. Retrying indexing must not repeat a costly enrichment request.

## Prior Browser-Capture Contract That Must Remain Intact

The final browser-visible transcript V2 planning artifacts intentionally treat transcript commit and downstream AI processing as separate consent boundaries. They specify:

- exact-item commit after explicit inspection and confirmation;
- one active transcript source;
- `items.content_revision` and expected-revision fencing;
- a `content_processing_holds` row created atomically with browser transcript commit;
- claim and apply gates that exclude held content;
- no V0.1 release API or UI;
- production browser capture remains a no-go pending validation and approval.

The proposed manual button is therefore a follow-on capability, not a shortcut around those gates. It can define the first explicit hold-release path while keeping production browser capture disabled until its own gates pass.

## Required Product Boundary

The truthful user promise is:

> Your transcript is saved to this item. AI Brain will not send it to an AI provider or build a semantic index until you explicitly approve the displayed provider, model, data scope, and outputs for this exact transcript revision.

The minimum coherent interaction is:

1. The extension commits the inspected transcript to the exact item and creates a processing hold.
2. The item page opens in the `Ready for AI enrichment` state.
3. The page names the provider location, model, transmitted content, generated outputs, and current policy status without including transcript content in telemetry.
4. The user selects `Run AI enrichment` and confirms when external data transfer or cost warrants confirmation.
5. The server atomically verifies the active transcript source, content revision, input fingerprint, hold, provider disclosure fingerprint, idempotency key, and feature policy.
6. The server records an immutable authorization/run receipt, releases only that hold, and queues an immediate user-priority run.
7. Workers enforce the same identities at claim and apply.
8. The item page shows separate enrichment and indexing stages and offers stage-specific recovery.

## Planning Constraints

### In scope

- The post-attachment item-page state and explicit manual action.
- A content-free provider and data-scope disclosure.
- Exact-revision authorization and idempotent asynchronous run creation.
- Immediate user-priority dispatch.
- Hold-aware, revision-fenced enrichment and embedding.
- Separate failure and retry behavior for enrichment and indexing.
- Desktop and narrow-viewport prototype states.
- Lab feature flags, allowlists, audit receipts, telemetry, rollout, and rollback.

### Out of scope for the first release

- Automatic enrichment of browser-visible transcripts.
- Broad redesign of all existing capture and repair sources.
- Repeated elective re-enrichment after a completed run.
- Editing transcripts in the extension.
- Production enablement of browser-visible capture before its existing no-go gates pass.
- Multi-user approvals, billing administration, or general workflow orchestration.

## Architecture Direction For Council Review

The Council should evaluate a small run-oriented contract instead of reusing the legacy inline endpoint:

- `GET /api/items/:id/enrichment-eligibility` for an effective state and content-free disclosure, or an equivalent server-rendered projection.
- `POST /api/items/:id/enrichment-runs` with expected transcript source, content revision, input fingerprint, disclosure fingerprint, purposes, and an idempotency key.
- `GET /api/items/:id/enrichment-runs/current` for stage-specific polling.
- A durable `enrichment_runs` authorization and execution record.
- Hold and run identity on enrichment and embedding jobs.
- Compare-and-set gates before provider dispatch and before every result apply.
- A provider/configuration fingerprint that causes a safe `409 provider_changed` response rather than processing under terms the user did not see.

The exact route names and schema remain V1 design inputs, not settled implementation decisions.

## No-Go Conditions

Planning must not recommend implementation or release if any of the following remains unresolved:

- Transcript attachment can still produce a claimable pending job before explicit authorization.
- Any realtime or batch claimant can ignore an active hold.
- Any enrichment, batch, or embedding writer can apply across a changed input revision.
- The UI says AI has not started while a provider request can already be in flight.
- Provider/model/data scope can change between disclosure and run creation without reconfirmation.
- A double-click or retry can create two provider calls.
- Indexing failure forces enrichment to run again.
- The rollback path can reintroduce hold-blind old workers.
- Browser capture is presented as production-ready despite its separate no-go status.

## Open Questions For Product Council

1. Should the confirmation step be mandatory for all providers, or only for external transfer/cost while a local provider can use a single explicit click?
2. Should the V0.2 action apply only to `browser_visible_transcript` holds, or to any future held transcript source through a generic eligibility policy?
3. Which exact outputs are authorized together: digest, quotes, category, tags/topics, original-content embeddings, summary embeddings, and Ask availability?
4. Which metadata fields form the enrichment input fingerprint in addition to the transcript body and source identity?
5. How should provider availability, policy denial, stale content, enrichment failure, and indexing failure differ in user language and recovery actions?
6. Does a completed transcript revision permit an explicit re-run, or is re-run deferred while retries remain stage-specific and idempotent?
