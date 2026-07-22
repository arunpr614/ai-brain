# Product Manager Agent V1 Input: Manual Enrichment After YouTube Transcript Recovery

**Date:** 2026-07-22<br>
**Role:** Product Manager member, AI Brain Product Council<br>
**Status:** V1 council input, not an implementation approval<br>
**Decision scope:** The manual action that authorizes and queues enrichment after an item-bound YouTube transcript has been durably added<br>
**Upstream dependency:** Final YouTube DOM capture V2 remains production-blocked

## Executive Recommendation

Add an item-level primary action named **Enrich transcript** after a browser-visible YouTube transcript has been committed successfully.

The action must not call a model immediately. It opens a short consent review that names the configured enrichment and embedding providers, identifies whether each destination is local or external, states which data each provider receives, describes the outputs, and states the expected queue behavior. The confirm action, **Agree and queue enrichment**, atomically:

1. proves the exact Brain item, active transcript source, and `content_revision` still match the review;
2. records a versioned processing authorization for that exact revision and provider plan;
3. releases only the processing hold attached to that transcript source and revision;
4. queues one idempotent enrichment job fenced to the same revision; and
5. returns a durable queued receipt before the UI claims success.

The click is permission to perform one defined processing chain: create the AI digest and then create the semantic index for the same content revision. It is not permission to capture another transcript, replace source content, process future revisions, include a manual note, use an unlisted provider, or send content to the Ask provider.

The first release remains fixture/local and manifest-authorized lab only. Production browser capture and production processing of `browser_visible_transcript` remain a no-go. A separate production decision must approve both capabilities.

### Recommended User Copy

Held state:

> **Transcript added. AI processing is paused.**<br>
> Enrich this transcript to create a digest and make it available to semantic search and Ask.

Primary action:

> **Enrich transcript**

Consent heading:

> **Create an AI digest and search index?**

Confirmation:

> **Agree and queue enrichment**

Queued state:

> **Enrichment queued**<br>
> Brain will use the provider plan you reviewed. You can leave this page.

Do not use `Enrich now`. It incorrectly promises immediate execution and obscures the scheduled-batch path.

## Product Decision

**Conditional GO** for a synthetic/local prototype and implementation planning.<br>
**Conditional GO** for an isolated lab canary only after every no-go gate in this memo passes.<br>
**NO-GO** for production browser-transcript enrichment.

This recommendation extends the current item-initiated recovery model without weakening it:

- `Add transcript to this Brain item` remains storage consent.
- `Enrich transcript` becomes separate processing consent.
- The exact item remains visible throughout.
- The processing action occurs in Brain, not in the Chrome side panel.
- The extension never receives enrichment credentials or provider details.
- Closing YouTube after transcript commit has no effect on enrichment eligibility.
- The enrichment action works on desktop or mobile because the transcript is already in Brain; Chrome is no longer required.

## Evidence Reviewed

### Recovery Experience

1. The prototype guide ends the capture journey with a confirmed transcript on the same item and explicitly distinguishes item-bound recovery from ordinary extension save behavior (`docs/plans/youtube-dom-capture/prototype/item-initiated-recovery/README.md:13-29`).
2. The recovery council requires exact-item binding, a second commit click, explicit return to Brain, fail-closed item/video conflicts, and production manual-only behavior (`docs/plans/youtube-dom-capture/prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_product_council.md:15-41`).
3. The council binds the request to account, item, expected content revision, video, extension identity, and same-item return path (`docs/plans/youtube-dom-capture/prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_product_council.md:57-67`).
4. The prototype success state says the transcript is attached while external AI processing remains paused; it also says Search and Ask can use it only after the hold is released (`docs/plans/youtube-dom-capture/prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_ux_prototype.html:2194-2230`).
5. The extension review and success states repeat that browser capture leaves external AI processing paused (`docs/plans/youtube-dom-capture/prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_ux_prototype.html:2347-2369`).

### Final YouTube DOM Capture V2 Contract

1. The final PRD identifies the current contradiction directly: item repair resets enrichment to pending, while transcript retention and external AI processing are separate permissions (`docs/plans/youtube-dom-capture/2026-07-22_ai_brain_youtube_dom_capture_prd_v2_final.md:47-70`).
2. V2 requires the browser transaction to insert `processing_mode='hold'`, advance `content_revision`, reset derived data, and create an active processing hold atomically (`docs/plans/youtube-dom-capture/2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v2_final.md:769-798`).
3. V2 requires every enrichment and embedding claim and apply to compare `expected_content_revision`, current revision, claim identity, and processing hold (`docs/plans/youtube-dom-capture/2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v2_final.md:800-813`).
4. V2 says retained text is not processing consent, workers must exclude held items, and V0.1 exposes no release endpoint (`docs/plans/youtube-dom-capture/2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v2_final.md:837-848`).
5. The proposed hold schema already supports `held|released`, but V2 creates only `held`; this feature is the separately reviewed proposal needed to define release (`docs/plans/youtube-dom-capture/2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v2_final.md:719-733`).
6. The approved lab manifest currently requires `downstream_processing='none'`, `mode='hold'`, and no approved providers, so it cannot authorize this feature without a new manifest version and review (`docs/plans/youtube-dom-capture/2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v2_final.md:618-668`).

### Current Application Behavior

1. `repairItemWithText()` replaces the body, clears digest/index-derived state, sets `enrichment_state='pending'`, and re-arms or inserts a pending enrichment job in the same repair operation (`src/lib/repair/item-repair.ts:117-165`).
2. Both pasted and uploaded YouTube transcript paths call that repair helper before inserting the active transcript source (`src/lib/capture/transcripts/user-provided.ts:111-155`, `186-245`). This is valid evidence that an unmodified helper cannot be reused for a held browser capture.
3. `POST /api/items/:id/enrich` currently exposes a default queue path and a `?force=realtime` path. The queue path resets any item to pending without a hold, source, or revision check; realtime runs the provider inline (`src/app/api/items/[id]/enrich/route.ts:10-42`, `58-140`).
4. The realtime error response can include raw model output (`src/app/api/items/[id]/enrich/route.ts:85-98`). The new flow must never return raw provider output.
5. Current enrichment status exposes only `pending|running|batched|done|error`, and the UI maps pending to `queued`; it cannot represent a durable hold or consent requirement (`src/app/api/items/[id]/enrichment-status/route.ts:8-61`, `src/components/enriching-pill.tsx:24-120`).
6. The current repair success banner says AI enrichment and semantic indexing are already queued (`src/app/items/[id]/page.tsx:1366-1395`), which directly conflicts with the browser prototype's held state.
7. The item page renders an enrichment status pill but no manual enrichment control (`src/app/items/[id]/page.tsx:216-271`, `381-430`, `1812-1881`).
8. The enrichment prompt sends source type, title, and up to the first 12,000 body characters. It produces summary, quotes, category, title, and tags (`src/lib/enrich/prompts.ts:28-77`). This limit must be disclosed; P0 must not imply a full-video digest.
9. The embedding pipeline sends chunked title, full body, and generated summary to the configured embedding provider (`src/lib/embed/pipeline.ts:51-150`). A consent screen that mentions only the LLM provider would therefore be materially incomplete.
10. Hetzner-oriented defaults support external Anthropic enrichment and Gemini embedding, while local defaults use Ollama (`src/lib/llm/factory.ts:1-17`, `src/lib/embed/factory.ts:1-18`). Provider destination is runtime-dependent and must be server-disclosed, not hard-coded in UI copy.
11. The current Anthropic batch payload uses the Brain item ID verbatim as `custom_id` (`src/lib/queue/enrichment-batch.ts:88-145`). The new path must replace this with a random provider-facing job alias mapped server-side.
12. Current enrichment and embedding writers do not implement the V2 content-revision fence yet. The current branch has no `items.content_revision` or `content_processing_holds` implementation. The new feature depends on those foundations and cannot ship first.

## Problem Statement

After the user completes a careful, two-click browser capture, the resulting transcript is useful but deliberately held from model processing. The current application has no truthful state for this condition and no safe way for the user to release only that transcript revision for enrichment.

Calling the existing `/enrich` endpoint would violate the final V2 contract because it can:

- reset a held item to pending without releasing a reviewed hold;
- process an item without proving an active transcript source;
- process a later or earlier body revision;
- use whichever provider happens to be configured at execution time;
- run inline through `force=realtime`;
- expose raw provider output on failure; and
- create a UI state that says `queued` even while policy requires `held`.

The product must add an explicit processing authorization, not merely add another button that calls the current route.

## Users

### Primary User

Arun, the AI Brain owner and authorized research operator, who has just added a complete browser-visible transcript to a specific Brain item and wants a useful digest and semantic retrieval without silently broadening data use.

### Secondary Reviewers

- The lab operator who must know which jobs are authorized and which provider plan is permitted.
- The privacy/security reviewer who must be able to prove no transcript leaves Brain before item-level consent.
- The product owner who needs aggregate completion and failure evidence without content-bearing analytics.

P0 is not designed for shared workspaces, delegated approval, multiple account owners, or administrator-forced processing.

## Jobs To Be Done

1. When my transcript is safely stored, let me decide separately whether AI may process this exact version.
2. Before I agree, tell me which services receive which data and whether processing is local or external.
3. Let me start the work without keeping the page or browser extension open.
4. Show whether work is held, queued, running, batched, indexing, complete, or failed.
5. If the item changes, do not apply an old result or silently process the new revision.
6. If processing fails, preserve the transcript and let me retry safely without duplicate jobs or repeated consent when nothing material changed.
7. Never imply that the whole video was analyzed when the current enrichment prompt uses only a bounded transcript prefix.

## Product Principles

1. **Storage is not processing.** Transcript confirmation grants storage only.
2. **Consent is exact.** Authorization is bound to item, transcript source, content revision, provider plan, purpose, and consent-copy version.
3. **Queue truthfully.** A button click creates durable work; it does not promise immediate completion.
4. **No silent provider substitution.** A queued job runs only under the reviewed provider plan.
5. **No stale apply.** A provider may finish, but Brain applies nothing when content revision or claim identity changed.
6. **The transcript survives failure.** Enrichment never replaces, removes, or corrupts the active transcript source.
7. **One action, one disclosed chain.** P0 bundles digest creation and semantic indexing because both are required for the stated outcome, but discloses both destinations.
8. **Ask remains separate.** This consent does not authorize a future Ask prompt or its provider.
9. **Aggregate observability only.** Product analytics contain no content or stable capture identity.
10. **Production stays blocked.** Configuration alone cannot promote this research path.

## Scope

### P0 In Scope

- A held-state panel on the exact Brain item after a committed `browser_visible_transcript` source.
- An **Enrich transcript** action on desktop and mobile Brain UI.
- A provider/privacy consent review before queueing.
- A versioned server readiness snapshot for provider, destination, mode, purpose, and revision.
- Atomic authorization, hold release, and idempotent queue creation.
- Queue-first execution through one authoritative scheduler path.
- Digest generation for the current enrichment contract.
- Semantic indexing after successful digest generation.
- Item-level status, typed errors, automatic retries, and safe manual retry.
- Exact item/source/revision and provider-plan conflict handling.
- Content-free aggregate metrics and stop conditions.
- Fixture/local and isolated, manifest-authorized lab rollout.

### P1 Candidates

- Apply the same hold-and-consent interaction to pasted and uploaded transcripts.
- Offer separate digest and semantic-index choices.
- Add queued-job cancellation before a provider claim.
- Offer user-selected `scheduled` versus `run now` execution after cost and rate-limit policy exists.
- Support re-enrichment of a completed, unchanged revision.
- Add a transcript-aware full-video summarization pipeline.
- Add a global remembered provider consent with a clear per-item override.

## Non-Goals

- No enrichment action in the Chrome side panel.
- No automatic enrichment immediately after transcript commit.
- No implicit consent from legal approval, retention approval, capture confirmation, or opening the item.
- No call to the current generic `/api/items/:id/enrich` contract from the new button.
- No `force=realtime` UI or inline model call in P0.
- No provider, model, or execution-mode choice in the first consent UI.
- No processing of metadata-only items, incomplete transcripts, inactive sources, notes, or future revisions.
- No transcript/source replacement, language switching, title rewrite, or manual-tag removal.
- No full-video-summary claim while the enrichment prompt is bounded to 12,000 body characters.
- No Ask request, answer generation, or note AI-inclusion change.
- No production enablement, Chrome Web Store distribution, or general multi-user authorization.

## Eligibility

Show **Enrich transcript** only when every server-derived condition is true:

1. The authenticated Brain session owns/accesses the exact item.
2. The item has exactly one active `browser_visible_transcript` source.
3. The source is linked to a successful browser-capture receipt and allowed policy decision.
4. The item body and active-source normalized text hash still agree under server recomputation.
5. An active `content_processing_holds` row exists for that exact item, transcript source, policy decision, and current `content_revision`.
6. The hold reason is the versioned browser-transcript reason approved for this feature.
7. No enrichment authorization has completed for the current content revision.
8. No enrichment job for the current revision is already `queued`, `running`, or `batched`.
9. No stale job from an older revision is eligible to claim or apply.
10. The transcript meets the current minimum useful-text requirement and all source integrity checks.
11. The authoritative deployment is fixture, local, test, or separately approved lab, never production.
12. Both feature switches are enabled: browser-transcript processing and manual enrichment release.
13. The current private manifest permits `hold_then_user_release`, the exact target, exact LLM provider/model, exact embedding provider/model, purposes, retention, expiry, and cleanup.
14. The server can produce a complete, versioned provider-plan disclosure.

Do not infer eligibility from `item.enrichment_state`, an empty summary, an empty preview, the presence of body text, or a client-supplied source kind.

### Ineligible Presentation

- No active transcript: keep transcript-recovery actions; do not show enrichment.
- Active transcript but no approved release policy: show `AI processing remains paused` with no disabled teaser button.
- Provider unconfigured or policy expired: show a typed unavailable message to the operator; do not invite consent that cannot be honored.
- Already queued/running/batched: show status, not a second action.
- Complete for current revision: show the digest and semantic-search readiness, not a re-enrich action.
- Content revision changed: refresh eligibility and require a new review for the new revision.

## Recommended Experience

### 1. Transcript Commit Success

The Chrome side panel remains unchanged:

> Transcript added. External AI processing remains paused.

It offers **Open item in Brain**. It does not offer enrichment because provider disclosure and Brain-session authorization belong to Brain.

### 2. Held Item

On the same Brain item, directly below the transcript-added success state and above the transcript panel:

> **Transcript added. AI processing is paused.**<br>
> Enrich this transcript to create a digest and make it available to semantic search and Ask.

Actions:

- Primary: **Enrich transcript**
- Secondary: none in P0; transcript viewing and deletion retain their existing placements.

A small `AI paused` state replaces the current misleading `queued` pill.

### 3. Consent Review

Use a focused modal or sheet, not a navigation away from the item. It must show:

- exact destination: `This Brain item` plus item title;
- active source: browser-visible YouTube transcript and language when known;
- current revision freshness, rendered as `Current transcript version` rather than a raw number;
- LLM provider and model, with `Runs locally` or `External provider`;
- embedding provider and model, with the same destination label;
- execution mode: `Queued for scheduled batch` or `Queued for background processing`;
- exact data categories sent to each provider;
- outputs stored in Brain;
- current 12,000-character LLM input limit;
- the fact that semantic indexing may send chunked full transcript text plus generated summary to the embedding provider;
- approved retention/deletion statement from the manifest, never an inferred promise;
- manual notes excluded;
- future Ask requests excluded;
- cancellation leaves the processing hold in place.

Recommended body for a remote-provider plan:

> Brain will send the video title, source type, and up to the first 12,000 transcript characters to **{LLM provider and model}** to create a digest, key quotes, category, and topics. It will then send chunked transcript text and the generated digest to **{embedding provider and model}** to make this item available to semantic search and Ask. Your YouTube session, cookies, browsing history, transcript source metadata not listed here, and manual notes are not sent. This permission applies only to the current transcript version.

Actions:

- Primary: **Agree and queue enrichment**
- Secondary: **Keep AI processing paused**

### 4. Queue Acknowledgement

After the server transaction commits:

> **Enrichment queued**<br>
> Brain will use the provider plan you reviewed. You can leave this page.

Show a provider-mode-specific expectation only when returned by the server:

- `Expected to start in the background`
- `Expected in the next scheduled batch at {localized time}`

Never hard-code `01:00 IST` in the client and never say `working now` while the job is merely queued.

### 5. Processing And Completion

Status sequence:

- `Queued for enrichment`
- `Creating AI digest`
- `Queued in provider batch`
- `Digest ready, building search index`
- `Ready for search and Ask`

Completion means both digest generation and semantic indexing for the authorized revision succeeded. If digest succeeds but indexing fails, show partial success honestly:

> **AI digest ready. Search indexing needs attention.**

Do not hide the digest because indexing failed. Do not claim semantic-search readiness until current-revision chunks and vectors are committed.

## Provider And Privacy Consent Contract

### Provider Plan

The server produces a signed or server-verifiable `provider_plan_id` that binds:

- consent schema and copy version;
- purpose set: `youtube_transcript_digest` and `youtube_transcript_semantic_index`;
- LLM provider, model, endpoint class, and local/external classification;
- embedding provider, model, endpoint class, and local/external classification;
- execution mode and scheduler policy version;
- LLM input limit and embedding coverage;
- approved data categories;
- manifest ID/hash, environment, approval expiry, and delete-by;
- item ID, active transcript source ID, and expected `content_revision` server-side;
- issue and short expiry time for the review snapshot.

No transcript text is stored in the provider-plan token. The client may receive display-safe fields and an opaque readiness token.

### Consent Granularity

Consent is per exact item content revision and provider plan. It expires and must be reviewed again when any of these change:

- body/content revision;
- active transcript source;
- LLM provider or model;
- embedding provider or model;
- local versus external destination;
- purpose or data categories;
- input/coverage limits;
- retention/delete-by terms;
- consent copy version; or
- manifest authorization.

Provider health changing from healthy to temporarily unavailable does not invalidate consent. Provider identity or model changing does.

### Data Inventory

| Data | LLM enrichment | Embedding | Stored in Brain | Excluded |
|---|---|---|---|---|
| Source type | Yes | No direct field | Existing item | - |
| Video title | Yes, including current YouTube context composition | Yes, in chunks | Existing item; title remains unchanged in P0 | - |
| Channel/duration | May be included in composed enrichment title | Only if present in chunk text | Existing metadata | - |
| Transcript | Up to first 12,000 characters under current pipeline | Chunked full body under current pipeline | Existing body/source/segments | No pre-consent transfer |
| Generated summary | Provider output | Yes, as summary chunks | Digest | - |
| Quotes/category/auto topics | Provider output | Not required as separate fields | Digest/topics | - |
| Manual note | No | No | Remains separate | Always excluded by this action |
| Item/source/video identifiers | No provider-facing stable identifier | No provider-facing stable identifier | Internal database only | Must not be sent as batch `custom_id` |
| Cookies/account/history/player data/signed URLs | No | No | No | Always excluded |

### Title Decision

P0 preserves the current item title. The existing enrichment pipeline's model-generated `title` must not overwrite the title for this consent-scoped browser transcript path. A button labeled **Enrich transcript** does not reasonably communicate a title rewrite, and title mutation creates an avoidable conflict not covered by body `content_revision`.

The model may still return a title to satisfy the existing schema, but the held-browser processing mode ignores it. A future title suggestion feature can be reviewed separately.

### Long Transcript Truthfulness

The current LLM prompt clips body input at 12,000 characters, while embedding covers the full chunked body. P0 therefore calls the output an `AI digest`, not a `complete video summary`, and displays `Uses up to the first 12,000 transcript characters` in consent.

Full-transcript or representative multi-section summarization is a separate product/architecture decision. It must not be implied by this button.

## Queue Versus Immediate Semantics

### Decision

P0 is **queue-only**. The confirmation transaction creates durable authorization and a pending job, then returns. It never awaits a model provider.

Reasons:

- browser and page lifetimes should not control a 5-60 second or scheduled job;
- the current deployment may use local realtime, Anthropic realtime, or Anthropic batch;
- provider and quota failures need durable retry state;
- a queue is the clean boundary for exact revision and claim-token enforcement;
- inline `force=realtime` currently has weaker error/privacy behavior; and
- the user can leave the page after a durable receipt.

### Scheduler Rules

1. One authoritative dispatcher chooses either a consent-only background worker or scheduled batch according to the reviewed provider plan.
2. The same pending row must not be visible simultaneously to realtime and batch claimers.
3. Worker claim requires active authorization, released hold, exact provider plan, expected content revision, and fresh claim token.
4. The provider call uses the provider/model in the authorization snapshot, not whatever configuration exists later.
5. If that provider plan can no longer be honored, move to `provider_plan_unavailable`; do not silently reroute.
6. `force=realtime` is not exposed and the existing endpoint rejects held browser-source items.

## State Machine

### User-Facing States

| State | Meaning | Primary action | Durable truth |
|---|---|---|---|
| `not_eligible` | No approved held transcript revision | None | No qualifying hold/source |
| `processing_held` | Transcript stored; no model processing authorized | Enrich transcript | Active hold; no authorization |
| `consent_review` | User is reviewing exact providers and scope | Agree and queue enrichment | No state change yet |
| `queueing` | Authorization transaction is in flight | Wait | Hold still authoritative until commit |
| `queued` | Authorization and queue receipt committed | None | Released hold + pending exact-revision job |
| `running` | Background worker claimed the job | None | Claim token + exact plan/revision |
| `batched` | External provider batch accepted the job | None | Provider batch alias, no Brain item ID sent |
| `digest_ready_indexing` | Digest committed; current revision index incomplete | None | Digest receipt; embedding pending/running |
| `complete` | Digest and current-revision semantic index committed | None | Both outputs fenced to same revision |
| `retryable_error` | Temporary provider/transport failure | Retry enrichment | Consent remains valid if plan/revision match |
| `terminal_error` | Retry budget exhausted or non-retryable provider failure | Retry after review | Transcript unchanged; typed safe error |
| `revision_conflict` | Item body changed after review/claim | Review current item | Old result discarded; no stale apply |
| `source_conflict` | Active transcript source changed | Review current item | No old-source apply |
| `provider_plan_changed` | Reviewed provider plan no longer matches | Review providers again | No silent substitution |
| `policy_blocked` | Manifest/approval/retention no longer allows work | Keep paused | No provider call |
| `feature_disabled` | Kill switch or environment blocks processing | Keep paused | No provider call |

### Required Transitions

```text
transcript_committed
  -> processing_held

processing_held
  -> consent_review                 user clicks Enrich transcript

consent_review
  -> processing_held                user cancels or review expires
  -> queueing                       user confirms

queueing
  -> queued                         authorization + release + queue commit atomically
  -> processing_held                transaction/network failure before commit
  -> revision_conflict              revision/source mismatch
  -> provider_plan_changed          plan/copy/manifest mismatch
  -> policy_blocked                 environment or approval no longer valid

queued
  -> running | batched              exact-revision claim
  -> revision_conflict              content changes before claim
  -> feature_disabled               kill switch before claim

running | batched
  -> digest_ready_indexing          digest applies under revision/claim fence
  -> retryable_error                transient typed failure
  -> terminal_error                 retry exhaustion/non-retryable failure
  -> revision_conflict              stale result discarded

digest_ready_indexing
  -> complete                       embedding applies under same revision fence
  -> retryable_error                embedding transient failure
  -> terminal_error                 embedding terminal failure
  -> revision_conflict              stale vectors/chunks discarded

retryable_error
  -> queued                         automatic or manual retry; same consent/plan/revision
  -> consent_review                 material plan or revision changed

any nonterminal state
  -> not_eligible                   item/source deleted
```

### Content Changes

Any body mutation increments `content_revision`, invalidates unclaimed authorization for the old revision, prevents old claims, and causes any in-flight old result to be discarded. If the new revision is another eligible held browser transcript, Brain creates or retains a new hold and returns to `processing_held`. It never carries consent forward automatically.

## Conflicts And Idempotency

### Exact Item And Exact Revision

- The item ID comes from the authenticated route and server-side readiness record, never URL deduplication.
- The active transcript source and expected revision are server-derived.
- No other item with the same YouTube URL is a fallback target.
- No result applies unless `job.item_id`, `job.expected_content_revision`, current `items.content_revision`, source ID, authorization ID, provider-plan ID, state, and claim token all match.

### Double Click And Replay

- A client-generated random `request_id` makes the confirm mutation idempotent.
- Same request and same readiness snapshot returns the original receipt.
- Same request with a different snapshot returns `request_id_mismatch` and mutates nothing.
- A second request for an already queued/current revision returns the existing state and does not create another job or authorization.

### Existing Work

- Current-revision job queued/running/batched: return `already_in_progress`.
- Current-revision digest and index complete: return `already_complete`.
- Old-revision job: mark/discard stale before new work becomes claimable.
- Different active source: `source_conflict`; do not replace it.
- Current generic enrich request against an active browser hold: `processing_held`; it cannot release or bypass the hold.

## Failure And Retry Behavior

### Before Queue Commit

Network, session, or transaction failure leaves the hold active and creates no authorization or job. The UI returns to `processing_held` with **Try again**. It must not say queued.

### After Queue Commit

- Retry transient provider, timeout, and transport failures up to three attempts, preserving current behavior only after claim/revision/plan hardening.
- Backoff is server-owned and status exposes attempt number plus a safe category.
- Validation errors, unknown provider response, policy expiry, and provider-plan mismatch do not blindly retry.
- Provider quota/billing errors are typed and operator-actionable without exposing provider payloads.
- The transcript, active source, and capture receipt remain unchanged on every enrichment or indexing failure.

### Manual Retry

Show **Retry enrichment** after terminal failure. It may reuse the prior authorization only when item revision, source, provider plan, purposes, limits, retention, and consent-copy version are unchanged. Otherwise reopen consent.

### Partial Success

If digest succeeds and indexing fails:

- keep and display the digest;
- mark semantic search as unavailable for this revision;
- retry only embedding under the original provider plan;
- do not rerun the LLM unless the digest is missing/invalid; and
- do not label the overall item `complete`.

### Error Copy

Use stable user-safe codes and copy, for example:

- `provider_unavailable`: `The enrichment provider is unavailable. Brain will retry.`
- `quota_or_billing`: `Provider quota or billing is blocking enrichment.`
- `invalid_response`: `The provider returned an unusable response. Your transcript was not changed.`
- `revision_changed`: `This transcript changed before enrichment finished. The old result was discarded.`
- `indexing_failed`: `The digest is ready, but semantic indexing failed.`
- `policy_expired`: `This research approval expired before processing started.`

Never return or render raw model output, stack traces, transcript fragments, item IDs, or provider request bodies.

## Functional Requirements

| ID | Priority | Requirement | Acceptance evidence |
|---|---|---|---|
| PME-F01 | P0 | Show the action only for a server-proven active held `browser_visible_transcript` on the current revision. | Eligibility matrix tests |
| PME-F02 | P0 | Render `AI processing is paused`, never `queued`, while the hold is active and no authorization exists. | Item UI state tests |
| PME-F03 | P0 | Keep transcript storage confirmation and enrichment consent as separate user actions. | Interaction E2E and moderated comprehension |
| PME-F04 | P0 | Open a provider/privacy review before any release or queue mutation. | Network/DB negative assertions |
| PME-F05 | P0 | Disclose exact LLM and embedding provider/model, local/external destination, execution mode, purposes, input coverage, retention, and excluded data. | Consent snapshot tests and copy review |
| PME-F06 | P0 | Send zero transcript, title, source metadata, or stable item identifier to any provider before confirmation. | Provider spies and privacy canaries |
| PME-F07 | P0 | Bind consent to exact item, active source, content revision, provider plan, purpose set, and copy version. | Mutation and replay matrix |
| PME-F08 | P0 | Atomically record authorization, release the matching hold, and queue one job; any failure rolls back all three. | Failure injection at every transaction step |
| PME-F09 | P0 | Never use URL deduplication or another matching item as a commit/apply fallback. | Wrong-item negative tests |
| PME-F10 | P0 | Queue work and return a durable receipt without awaiting a provider. | Slow/throwing provider route tests |
| PME-F11 | P0 | Expose no realtime override in UI; reject held browser items in the existing generic enrich route. | Route and UI tests |
| PME-F12 | P0 | Ensure realtime and batch workers cannot both claim the same consented job. | Deterministic dual-dispatch tests |
| PME-F13 | P0 | Require released hold, valid authorization, expected revision, provider plan, and claim token at claim and apply. | Deterministic barrier tests |
| PME-F14 | P0 | Discard stale LLM and embedding results with zero summary, tags, topics, chunks, vectors, job-success, or usage apply. | Paused-provider interleaving tests |
| PME-F15 | P0 | Preserve transcript body, active source, segments, provenance, and manual tags on every enrichment path. | Before/after database manifest |
| PME-F16 | P0 | Preserve the item title for this P0 path; ignore model title output. | Pipeline mode test |
| PME-F17 | P0 | Produce digest, key quotes, category, and auto topics/tags, then semantic chunks/vectors for the same revision. | Output and source-version tests |
| PME-F18 | P0 | Label digest scope truthfully and disclose the current 12,000-character LLM limit. | Copy and long-transcript tests |
| PME-F19 | P0 | Do not include manual notes or authorize future Ask calls. | Provider payload inspection |
| PME-F20 | P0 | Replace provider-facing Brain item IDs with random job aliases. | External request assertion |
| PME-F21 | P0 | Provide held, queued, running, batched, digest-ready/indexing, complete, retryable error, terminal error, and conflict states. | Reducer/state projection tests |
| PME-F22 | P0 | Distinguish digest success from semantic-index success and permit embedding-only retry. | Partial-success E2E |
| PME-F23 | P0 | Support up to three safe retries and idempotent manual retry without duplicate provider jobs or outputs. | Retry/replay tests |
| PME-F24 | P0 | Return typed safe errors only; never include raw model output or arbitrary provider messages. | Canary-string response/log scan |
| PME-F25 | P0 | Make the action and state experience usable from desktop and mobile Brain UI without requiring Chrome after capture. | Responsive E2E |
| PME-F26 | P0 | Meet keyboard, focus, screen-reader status, reduced-motion, 200% zoom, and 44 px mobile target requirements. | Accessibility E2E |
| PME-F27 | P0 | Permit only fixture/local/test or manifest-authorized lab environments; production wins over every override and rejects before provider work. | Environment negative matrix |
| PME-F28 | P0 | Require a new manifest mode with exact providers/models/purposes; V2's `hold` plus empty providers cannot release processing. | Manifest schema/negative tests |
| PME-F29 | P0 | Deletion cancels/unlinks queued work and cascades authorization, hold, job alias, digest, topics, chunks, vectors, and receipts under existing retention disclosure. | Deletion/restore integration tests |
| PME-F30 | P0 | Emit only allowlisted aggregate metrics with no content or stable capture identity. | Privacy scanner and schema test |
| PME-F31 | P0 | If provider configuration changes after consent, use the exact authorized snapshot or stop; never substitute silently. | Configuration-race tests |
| PME-F32 | P0 | The existing repair helper must support an explicit scheduling policy; browser commit uses `hold`, while legacy repair behavior is not changed accidentally. | Call-site audit and policy tests |

## P0 Acceptance Criteria

P0 is accepted only when all statements below are proven, not inferred:

1. A successful browser transcript commit shows `AI paused` and zero worker can claim it.
2. Opening or cancelling consent changes no database row and sends no content to any provider.
3. Confirmation for one exact revision creates one authorization, releases one matching hold, and queues one job atomically.
4. The UI names both enrichment and embedding destinations and accurately describes their data coverage.
5. No Brain item/source/video/account identifier is sent as an external provider job identifier.
6. Queue acknowledgement appears only after a durable receipt.
7. The user can close the page and later see the same job state.
8. Double confirmation and network retry create one provider job and one set of outputs.
9. Body change before claim blocks the provider call; body change after provider call discards the result.
10. Source change, provider-plan change, policy expiry, and kill-switch activation each fail closed.
11. Current generic and realtime enrichment paths cannot bypass an active browser processing hold.
12. Digest applies only to the authorized revision and does not rewrite the item title or transcript.
13. Semantic chunks/vectors carry the same content revision and cannot represent stale source text.
14. Digest-only success is shown separately from fully indexed completion.
15. Transcript, source, and provenance survive every provider, validation, queue, and indexing failure.
16. Production rejects release and processing even if feature flags, legacy environment variables, or a lab manifest are present.
17. Privacy scans find zero transcript/title/URL/ID/token/provider-payload canary strings in logs, analytics, responses, screenshots, and committed artifacts.
18. Five of five moderated reviewers correctly explain storage consent, processing consent, both providers, the 12,000-character digest limit, full-text embedding, and exact-revision behavior.

## API Product Contract Recommendation

The technical architect should choose final names, but the product contract needs three distinct capabilities:

### Readiness

`GET /api/items/:id/manual-enrichment/readiness`

Returns a no-store, display-safe projection:

- state and allowed actions;
- opaque readiness token;
- current transcript version label;
- LLM and embedding display plan;
- local/external classifications;
- execution mode and expected-start copy;
- data-use and retention copy version;
- typed blocked reason when unavailable.

It does not return transcript text, hashes, raw manifest data, credentials, or internal policy IDs.

### Authorize And Queue

`POST /api/items/:id/manual-enrichment`

Accepts:

- opaque readiness token;
- random idempotency/request ID;
- consent-copy version; and
- explicit confirmation boolean or action discriminator.

The server derives item, source, revision, provider plan, hold, and policy from the token/database and rechecks all of them inside the transaction.

### Status And Retry

- `GET /api/items/:id/manual-enrichment/current`
- `POST /api/items/:id/manual-enrichment/:job/retry`

Status returns safe state, stage, attempt count, expected timing class, completion timestamps, and typed error code. Retry requires the same exact authorization or a fresh readiness/consent review.

The new UI must not call the current generic enrich route. That route must independently reject active browser holds to close alternate-path bypasses.

## Analytics Without Content Leakage

### Collection Model

- Do not emit per-item analytics events.
- Derive eligible/held/queued/completed counts from aggregate database queries or increment fixed daily counters transactionally.
- Record no request, item, source, video, tab, account, manifest run, or provider request ID.
- Record no URL, title, language, transcript, cue, note, text hash, prompt, response, error fragment, IP, or user agent.
- Do not correlate pre-consent UI activity with confirmed jobs.
- Keep consent-open/cancel interaction counts local to the browser session unless a separate analytics review approves anonymous counters.
- Server analytics begin at confirmed authorization and use only allowlisted enums and duration/size buckets.

### Allowed Dimensions

- environment class: `fixture|local|lab`;
- source class: fixed `browser_visible_transcript`;
- processing stage/outcome code;
- execution mode: `background|scheduled_batch`;
- provider destination class: `local|external` (provider name only in restricted operator metrics if approved);
- consent copy version;
- duration bucket;
- transcript-size bucket, never exact size;
- retry-count bucket;
- exact-revision guard result as a boolean/counter;
- deletion/cleanup verification boolean.

### Product Metrics And Targets

| Metric | Target |
|---|---:|
| Held items claimed before consent | 0 |
| Provider content requests before consent | 0 |
| Wrong item/source/revision apply | 0 |
| Silent provider/model substitution | 0 |
| Duplicate provider jobs after replay | 0 |
| Content/stable-ID leakage in analytics or provider job aliases | 0 |
| Queue transaction success on valid fixture requests | 100% |
| Digest completion on valid deterministic fixtures | 100% |
| Semantic-index completion on valid deterministic fixtures | 100% |
| Approved lab end-to-end completion | >=95% excluding declared provider outage/quota windows |
| Stale result discarded correctly | 100% |
| Partial success represented truthfully | 100% |
| Item/source preserved across failures | 100% |
| Consent comprehension | 5/5 reviewers answer all boundary questions correctly |
| Canary deletion/cleanup verification | 100% |

Funnel conversion is informative, not a ship gate in a single-user research tool. Integrity, privacy, and truthful-state metrics are gates.

## Rollout

### Stage 0: Council And Governance

- Finalize PRD/implementation plan and adversarial review.
- Extend the private manifest schema to `hold_then_user_release` with exact provider plans and purposes.
- Obtain privacy/security/provider approval for LLM input, full-text embedding, retention, and cleanup.
- Keep production and lab processing switches disabled.

Exit: every P0 requirement has a named test and every open blocking decision has an owner.

### Stage 1: Inert Prototype And Synthetic State Model

- Extend the throwaway prototype with held, consent, queue, processing, partial success, conflict, and retry states.
- Use synthetic text and fake provider names/data.
- Run desktop, mobile, keyboard, screen-reader, zoom, and long-copy QA.

Exit: five reviewers understand the two permissions and both provider destinations.

### Stage 2: Local Fixture Implementation

- Implement content revision, holds, authorization, exact provider plan, queue contract, and status projection against fake providers.
- Prove current generic endpoint and all workers cannot bypass holds.
- Prove all stale interleavings and privacy scans.

Exit: all P0 tests pass with no live provider or YouTube request.

### Stage 3: Isolated One-Item Lab Canary

- Separate lab instance, DB, data root, credentials, manifest, and approved target.
- One transcript capture, one consent, one digest, one semantic index, one conflict/retry sequence, and verified deletion.
- Inspect provider account/audit evidence without committing target or content identifiers.

Exit: zero stop conditions and cleanup verified by delete-by.

### Stage 4: Expanded Authorized Lab Canary

- At least 20 unique, explicitly authorized enrichment jobs across at least five approved standard watch videos.
- Include long, multilingual, retry, policy-expiry, revision-change, and provider-unavailable cases.
- Retries do not count as unique jobs.

Exit: all targets and guardrail metrics pass; product/privacy/security jointly issue continue, revise, or stop.

### Stage 5: Separate Production Decision

Production remains blocked. A new packet must cover browser capture approval, provider terms and retention, external data destinations, support/incident response, cost/quota, user consent policy, distribution, deletion/backups, canary evidence, and an explicit code change removing production blocks.

## Immediate No-Go Gates

Do not start a live lab canary if any condition is true:

1. `content_revision`, expected revision, claim tokens, or processing holds are absent from any enrichment/embedding claim or apply path.
2. Existing repair or `/api/items/:id/enrich` behavior can set a held browser item to claimable pending.
3. Realtime and batch workers can both see the same pending authorization.
4. A provider can receive content before the user confirms the provider plan.
5. The consent UI omits the embedding provider or the fact that it may receive chunked full transcript text.
6. The provider plan can change after consent without stop/review.
7. External batch `custom_id` contains a Brain item/source/video/account identifier.
8. Raw provider output, prompt fragments, transcript text, stable identifiers, or arbitrary errors appear in responses, logs, metrics, screenshots, or reports.
9. A stale result can write summary, title, tags, topics, chunks, vectors, usage, or success state.
10. The model-generated title overwrites the item title under this P0 action.
11. The UI says complete before semantic indexing for the current revision succeeds.
12. The UI implies whole-video summarization without a reviewed full-transcript pipeline.
13. The lab manifest still says `downstream_processing='none'`, `mode='hold'`, or has no exact approved providers.
14. Lab processing requires globally enabling all existing background workers rather than consent-only claims.
15. Provider credentials or data roots are shared with production.
16. Production can be enabled by environment configuration, legal approval ID, or manifest alone.
17. Deletion/cleanup cannot prove removal of authorization, hold, jobs, provider aliases, and derived outputs.
18. Any P0/P1 privacy, integrity, accessibility, or policy defect remains open.

Immediate stop conditions during canary are any provider/content leak, unconsented claim, wrong/stale apply, duplicate external job, undeclared provider use, failed cleanup, platform/policy complaint, or P0 defect.

## Recommended PRD Outline

1. **Document Control**: owner, reviewers, status, superseded artifacts, decision state.
2. **Executive Decision**: separate storage and processing permissions; queue-only exact-revision release.
3. **Evidence And Current-State Audit**: recovery artifacts, V2 hold contract, current repair/enrichment/UI contradictions.
4. **Problem And Opportunity**: useful stored transcript with no safe processing release.
5. **Users And Jobs**: owner/research operator, lab operator, privacy reviewer.
6. **Product Principles**: exact consent, truthful queue, no stale apply, no production promotion.
7. **Goals, Scope, Non-Goals**: P0 held browser sources; P1 expansion.
8. **Eligibility Contract**: active source, hold, revision, environment, manifest, provider plan.
9. **End-To-End UX And Exact Copy**: held item, consent, queue, processing, partial success, completion, retry/conflict.
10. **Provider And Privacy Consent**: plan snapshot, local/external disclosure, data inventory, retention, excluded data.
11. **Output Contract And Limits**: digest fields, semantic index, title preservation, 12,000-character limit.
12. **Typed State Machine**: user meaning, allowed action, durable database truth.
13. **Queue And Retry Semantics**: single dispatcher, no inline processing, automatic/manual retry.
14. **Integrity And Conflict Rules**: exact item/source/revision, idempotency, provider-plan pinning, stale discard.
15. **API Product Contract**: readiness, authorize/queue, status, retry, alternate-path denial.
16. **Data Retention And Deletion**: authorization/hold/jobs/derived outputs/provider records/backups.
17. **Analytics And Privacy**: aggregate-only schema, targets, forbidden fields, stop conditions.
18. **Accessibility And Responsive Acceptance**: desktop/mobile, focus, live regions, zoom, long provider names.
19. **Rollout And No-Go Gates**: prototype, fixture/local, one-item lab, expanded lab, separate production packet.
20. **P0 Requirements And Acceptance Matrix**: requirement ID, owner, evidence, gate.
21. **Risks And Open Decisions**: product, provider, architecture, policy, operations.
22. **Definition Of Done**: reviewed V2 artifacts, prototype, tests, push/PR/report; implementation remains separately gated.

## Handoff Requirements For The Technical Architect

The implementation plan must explicitly resolve:

- how `repairItemWithText` separates content replacement/invalidation from scheduling policy;
- the migration order from V2 migration 026 to released holds and processing authorizations;
- whether hold rows need `content_revision`, authorization ID, release reason, and immutable history rather than one mutable row;
- one authoritative enrichment dispatcher and batch provider job alias mapping;
- exact provider-plan snapshot and how workers instantiate the authorized provider without configuration drift;
- revision/claim fences around LLM apply and every embedding batch/apply;
- partial success and embedding-only retry schema;
- safe status projection and typed errors;
- old generic route denial for active holds;
- production-negative environment precedence;
- content-free diagnostics and error sink isolation; and
- delete/cancel behavior for queued, running, and externally batched jobs.

## Open Decisions

These do not change the core recommendation, but the council should close them before PRD V1 is marked implementation-ready.

| Decision | PM recommendation | Blocking owner |
|---|---|---|
| Exact lab LLM provider/model | Pin the current approved provider in the private manifest; no wildcard or silent fallback | Product owner + privacy/security |
| Exact lab embedding provider/model | Pin separately and disclose full-text chunk coverage | Product owner + privacy/security |
| Provider retention language | Render only approved account-specific language carried by manifest; otherwise block live processing | Privacy/legal/provider owner |
| Queue mode | One consent-only queue; scheduler chooses reviewed background or batch mode | Architect + operator |
| Full-transcript summarization | Keep P0 bounded/current and disclose 12,000 characters; design full-transcript pipeline as P1 | Product owner + architect |
| Title cleanup | Preserve title in P0; treat model title as unused | Product Council |
| Bundle digest and embedding | Bundle in one clearly disclosed action for P0; no hidden second provider | Product Council + privacy |
| User-provided paste/upload | Do not change current production behavior in this P0; assess consistent holds as P1 | Product owner |
| Cancel queued work | Omit P0 unless provider batch cancellation can be exact and reliable | Architect |
| Authorization retention | Keep with item/source until deletion or lab cleanup; aggregate reports remain content-free | Privacy + data owner |
| Status timing promise | Server-returned timing class only; no hard-coded clock promise | Operator + architect |

## Risks

| Risk | Product treatment |
|---|---|
| User assumes capture already authorized AI | Explicit paused state and separate provider consent |
| User assumes `Enrich transcript` means immediate | Queue-specific copy; no `now` label |
| User overlooks embedding destination | Both providers shown with separate data categories |
| Long video digest is mistaken for complete | 12,000-character disclosure and `AI digest` label |
| Existing generic route bypasses hold | P0 route-denial requirement and alternate-path audit |
| Provider configuration changes after consent | Plan snapshot pinning; stop and re-review on mismatch |
| Old result overwrites new transcript | Revision and claim fence at claim and apply |
| Model rewrites item title unexpectedly | Preserve title in P0 |
| Batch request leaks item identity | Random provider alias mapped internally |
| Digest succeeds but indexing fails | Partial-success state and embedding-only retry |
| Lab enablement starts unrelated workers | Consent-only claim mode and manifest exactness |
| Production accidentally inherits lab capability | Authoritative production block and negative matrix |

## Final PM Position

The right extension is not an unguarded manual call to the existing enrich endpoint. It is a second consent boundary on the Brain item.

The transcript-capture flow has deliberately earned trust by making inspection, transfer, exact destination, and processing hold explicit. The enrichment feature should preserve that trust: show the held transcript, disclose both providers and the actual bounded/full-text data paths, authorize only the exact content revision, queue durably, and fail closed when anything changes.

With those conditions, **Enrich transcript** is a coherent next step in the same system. Without them, the button would undo the central V2 promise that transcript retention does not silently become external AI processing.
