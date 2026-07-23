# AI Brain Held Browser Transcript Manual Enrichment: Current-State Audit V2 Final

**Date:** 2026-07-22
**Status:** Final evidence baseline; supersedes the V1 audit as architecture input
**Scope:** The item-initiated YouTube transcript recovery flow and the proposed explicit manual enrichment action after transcript attachment
**Inspected implementation snapshot:** `cbaed78` on `codex/youtube-item-recovery-prototype`; source behavior must be re-audited against the implementation base SHA before PR-1

**Post-audit integration note:** baseline `c22b5aa` now contains `026_notebooklm_export.sql`. The upstream YouTube plan's proposed `026_youtube_browser_transcript.sql` therefore collides and must be rebased to the next free migration number, with its final filename/hash/schema frozen before this plan's expand migration is numbered.

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
- `src/lib/retrieve/index.ts`
- `src/lib/related/index.ts`
- `src/app/api/ask/route.ts`
- `src/lib/ask/generator.ts`
- `src/instrumentation.ts`
- `src/db/client.ts`
- `src/lib/processing/http.ts`
- `src/lib/enrich/prompts.ts`
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

### 9. The two processors receive materially different coverage

The current digest prompt clips the transcript body to the first 12,000 characters (`src/lib/enrich/prompts.ts:43-57`). The embedding pipeline chunks the full current body and includes the generated summary (`src/lib/embed/pipeline.ts:51-157`). Configured enrichment providers include Ollama, Anthropic, and OpenRouter; configured embedding providers include Ollama and Gemini.

**Consequence:** informed authorization must distinguish a prefix-limited digest from full-transcript search indexing, name both destinations, and explain that later portions of a long transcript are not represented in the P0 digest.

### 10. Exact-version writes do not make semantic reads current

Current semantic retrieval selects non-manual-note chunks without checking item content revision, digest generation, embedding provider/space, or exact job (`src/lib/retrieve/index.ts:115-259`). Related builds centroids from non-manual-note vectors without current-generation gates (`src/lib/related/index.ts:64-108`), and Ask rechecks only manual-note generations (`src/app/api/ask/route.ts:112-151`).

**Consequence:** the implementation must gate Search, Ask, Related, citations, and readiness through one exact current semantic-source query and embedding-space identity, not merely fence vector writes.

### 11. Worker startup is broader than the authorized lab flow

Application startup currently starts backup, enrichment, transcript recovery, note indexing, and batch scheduling together (`src/instrumentation.ts:63-71`). The upstream live-lab capture plan disables all background workers, while this feature needs two narrowly scoped interactive claimants.

**Consequence:** a reviewed `manual-transcript-lab` worker mode and embedding execution lane are prerequisites; broadly enabling workers could consume unrelated backlog.

### 12. Migrations auto-apply before feature flags can help

The database client discovers and applies every unapplied SQL migration at process startup (`src/db/client.ts:101-170`). Current routes/workers still depend on old queue columns, states, and the embedding trigger.

**Consequence:** a table rebuild cannot merge ahead of compatible consumers. Delivery must use expand/dual-write/cutover/later-contract phases with an enforced binary/schema matrix.

### 13. The existing same-origin helper is not the strongest precedent

The note helper derives expected origin from Host/forwarded headers, while `src/lib/processing/http.ts:59-75` compares against configured `BRAIN_PUBLIC_ORIGIN` and fails closed.

**Consequence:** manual processing writes must use the configured public origin and explicit trusted-proxy boundary, never client-supplied forwarded metadata as authority.

### 14. Current digest validation and the V1 prototype understate the contract

The prompt asks for three paragraphs, quotes, category, and topics, while the generic validator accepts much weaker shapes (`src/lib/enrich/prompts.ts:59-113`). The V1 prototype also loads a remote icon library and YouTube thumbnail despite its inert/no-request framing.

**Consequence:** V2 needs one transcript-specific output schema and deterministic local/fallback prototype assets with a zero-external-request test.

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

> Your transcript is saved to this item. AI Brain will not send it to an AI provider or build a search index until you explicitly approve the displayed provider, model, data scope, and outputs for this exact transcript revision.

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

## Final Architecture Direction

The safety requirement is a queue-only, receipt-based command, not a particular URL. V2 keeps the existing authenticated item route only after a repository, documentation, runbook, deployed-client, and access-log caller inventory:

- `GET /api/items/:id/enrichment-status` returns one atomic, display-safe authorization context and current stage facts.
- `POST /api/items/:id/enrichment-runs` is the new strict `manual-enrichment-v2` consent command.
- The legacy `POST /api/items/:id/enrich` remains a separately inventoried compatibility surface and cannot release or process an active browser-transcript hold; bodyless and `force=realtime` calls against a held source perform no work.
- The command carries a UUID mutation ID plus the server-produced, expiring authorization-context fingerprint for the exact source, content revision, processors, purposes, coverage, retention/delete-by terms, manifest, environment policy, and consent-copy version.
- Immutable receipts, enrichment jobs, embedding jobs, and all attempts preserve that complete authorization lineage.
- Compare-and-apply gates run before every provider dispatch and result apply.
- Material scope drift produces a safe typed conflict and no new provider call.

The new run resource is selected precisely because deployed-client and access-log compatibility evidence for replacing `/enrich` is absent. Any later retirement of the legacy route requires its own caller evidence and review.

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

## Product Council Resolution Index

1. **Confirmation depth:** one informed click for all-local processing with complete terms exposed; a review dialog/sheet and final consent click if either stage is remote.
2. **P0 scope:** explicitly named **held browser transcript manual enrichment**. Paste/upload/official-caption scheduling is unchanged in P0 and must not inherit the broader privacy promise. A source-agnostic hold policy is a separately reviewed follow-up.
3. **Authorized outputs:** digest, key quotes, category, AI topics, full-transcript search index, and saved-digest index. Future Ask prompts are excluded.
4. **Input identity:** source ID/type/text hash, content revision, title, author, duration, body, prompt/index contract versions, unique job generation, and complete authorization scope.
5. **Recovery states:** typed stage, dispatch, drift, policy, provider, session, retry, partial-success, deletion, and unknown-outcome facts drive truthful copy.
6. **Re-run policy:** P0 permits only stage-specific retry for the current still-valid scope; elective re-enrichment of a completed revision is deferred.

This baseline is historical evidence. The Product Council V2 Final and Implementation Plan V2 Final are authoritative for decisions.
