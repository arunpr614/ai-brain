# AI Brain Held Browser Transcript Manual Enrichment PRD V2 Final

**Date:** 2026-07-22
**Status:** Final after Product Council and adversarial review
**Owner:** AI Brain
**Product surface:** AI Brain item detail following item-bound YouTube browser transcript recovery
**Upstream dependency:** YouTube browser-visible transcript capture V2, its migration rebased past committed `026_notebooklm_export.sql`, and processing-hold enforcement
**Decision:** Conditional go for prototype and isolated planning; no-go for production enablement

## 1. Summary

Add a manual **AI processing** capability after an inspected YouTube browser transcript has been attached to the exact AI Brain item that requested it. The P0 feature is deliberately named **manual enrichment for a held browser-recovery transcript**; it does not claim that paste, upload, official-caption, or legacy items already follow this consent model.

Transcript storage and AI processing remain separate permissions. Attachment creates a durable active transcript source and an active processing hold. The item then shows **Transcript added. AI processing is paused.** The user reviews the actual enrichment and embedding provider plan and explicitly authorizes one exact transcript revision. Only then may Brain release that hold and queue an interactive background job.

The action authorizes:

- an AI digest from the current enrichment input contract;
- key quotes, category, and AI topics;
- a search index from the full current transcript and generated digest (`semantic_index` internally).

It does not authorize:

- capture of another transcript;
- processing of a future transcript revision;
- title replacement;
- manual note inclusion;
- future Ask prompts;
- an undisclosed provider or model;
- production browser capture or production processing.

## 2. Problem

The item-bound Chrome recovery concept deliberately ends with the transcript stored and downstream AI processing held. This preserves the distinction between reading visible page content, storing reviewed content, and sending content to AI processors.

The current application cannot truthfully support that experience:

- `repairItemWithText()` sets enrichment and its job to `pending` immediately.
- The always-on worker claims any pending job.
- The nightly batch selector independently selects pending items.
- The current manual endpoint can reset broad state or call a provider inline.
- Enrichment and embedding results apply without source/revision/claim fences.
- Current UI calls pending **queued** and says repair already queued enrichment.

A UI-only button would therefore be misleading. The product needs a real held state and a revision-bound processing authorization.

## 3. Opportunity

The missing capability is a natural continuation of the existing recovery flow:

1. User asks Brain to recover one video's transcript.
2. User inspects the visible transcript in Chrome.
3. User attaches it to the exact item.
4. User returns to the item and separately decides whether AI Brain may create derived content.
5. Brain performs the approved work in the background and reports truthful stages.

This makes the transcript useful without collapsing browser access, storage, model transfer, and semantic indexing into one opaque action.

## 4. Users

### Primary

The AI Brain owner and authorized research operator who has attached a complete transcript and wants an AI digest and semantic retrieval while retaining explicit control over data transfer.

### Secondary

- Lab operator verifying authorized versus held jobs.
- Privacy/security reviewer proving no provider transfer occurs before authorization.
- Product owner reviewing aggregate success, failure, comprehension, and cleanup evidence.

### Not designed for P0

- Shared workspaces or multiple approvers.
- Administrator-forced processing.
- Delegated billing or provider selection.
- General workflow automation.

## 5. Jobs To Be Done

1. When my transcript is stored, let me decide separately whether AI may process this exact version.
2. Before I decide, tell me every processor, what it receives, and whether it is local or external.
3. Let me start durable work without keeping the item page or Chrome open.
4. Show whether the transcript is paused, queued, enriching, indexing, complete, or blocked.
5. If content or provider details change, stop instead of silently continuing.
6. Preserve the transcript and any successful digest when a later stage fails.
7. Never imply the whole video was summarized when the digest currently uses only a bounded prefix.

## 6. Product Principles

1. **Storage is not processing.** Attachment cannot imply provider authorization.
2. **Three choices remain three choices.** Inspect, Add, and Enrich are separate controls.
3. **Consent is exact and expiring.** It applies to one item, active source, content revision, complete ordered processor plan, purpose set, coverage, outputs, retention/delete-by terms, manifest/policy identity, environment, expiry, and copy version. One server-generated authorization-context fingerprint binds all of them.
4. **Name both processors.** Digest and embedding can use different providers.
5. **Queue truthfully.** A successful click creates durable work; it does not claim work is already running.
6. **No silent substitution.** Provider identity changes require renewed review.
7. **No stale apply.** Late output for old content is discarded.
8. **Partial success remains useful.** Indexing failure does not erase or regenerate a successful digest.
9. **Ask remains separate.** Index readiness permits future retrieval but does not itself make an Ask provider call.
10. **Production remains blocked.** The feature cannot bootstrap production browser processing.

## 7. Goals And Success Definition

### P0 goals

- Represent an attached browser-visible transcript as held and ready, not queued.
- Present a clear manual action in the AI Digest panel.
- Disclose both enrichment and embedding provider plans.
- Authorize one exact transcript revision through a durable, idempotent transaction.
- Execute in a user-priority background lane.
- Show truthful stage and recovery states on desktop and mobile.
- Fence every provider result against changed content, source, provider, generation, and claim.
- Preserve title, manual metadata, transcript, and successful partial output.
- Provide aggregate, content-free rollout evidence.

### Product success

- Zero unconsented claims or provider requests.
- Zero wrong-source, wrong-revision, or duplicate effective jobs.
- Zero silent provider/model substitutions.
- Zero false **nothing sent** claims during unknown or post-dispatch states.
- Zero stale output applies.
- Five of five representative moderated reviewers correctly explain all three permissions, both processors, first-12,000-character digest input, full-text search indexing, excluded data, what cancel does, and that Ask remains separate. More than one miss on any question blocks copy approval.
- Approved deterministic fixtures complete the full chain 100%.
- Approved lab jobs complete at least 95% excluding declared provider outage/quota windows.

## 8. Non-Goals

- Enrichment from the Chrome side panel.
- Automatic enrichment after transcript attachment.
- A generic **Enrich now** shortcut to the current endpoint.
- User selection of provider, model, queue lane, or retry policy.
- Processing metadata-only, incomplete, inactive, or unheld sources.
- Title rewrite or title suggestion.
- Full-transcript summarization under P0.
- Future Ask request authorization.
- Inclusion of manual notes.
- Elective re-enrichment of a complete current revision.
- Cancellation after remote provider acceptance.
- Changing existing paste/upload behavior in this release.
- Production enablement or Chrome Web Store distribution.

## 9. Scope

### P0

- Product name and promise are limited to **held browser transcript manual enrichment**.
- Active `browser_visible_transcript` source from fixture/local/test or manifest-authorized lab.
- Active processing hold for that source and current content revision.
- Item-level held state and action.
- Local and remote provider-plan disclosure.
- Remote review dialog/mobile sheet; local inline authorization.
- Idempotent authorization, hold release, and queue receipt.
- Immediate interactive background lane.
- Digest and search-index stages.
- Separate enrichment and embedding retries.
- Provider/content conflict states.
- Feature flags, production denial, audit receipts, aggregate metrics, cleanup.
- Separate exact-target processing manifest/policy decision; the capture manifest alone continues to deny downstream processing.
- Allowlisted `manual-transcript-lab` interactive digest/index workers only.
- Pinned embedding-space identity and exact current-semantic-source gating for Search, Ask, Related, citations, and readiness.

### P1 candidates

- Apply hold-first behavior to pasted, uploaded, official, and owned-media transcripts.
- Full or representative long-transcript summarization.
- Digest-only and digest-plus-index choices.
- Re-enrich/refresh for complete revisions.
- Embedding-only reauthorization after provider changes.
- Queued cancellation.
- Remembered global provider consent with item override.

## 10. Eligibility

Show an active enrichment command only when the server proves all conditions:

1. Valid authenticated Brain session can access the exact item.
2. Item is a supported YouTube item.
3. Exactly one active `browser_visible_transcript` source exists.
4. Source is linked to a successful approved capture receipt and policy decision.
5. Source normalized text hash and current item body agree.
6. Active processing hold matches item, source, policy, hold reason, and current `content_revision`.
7. Held job generation exists and is not claimable.
8. No exact current-revision run is queued, running, indexing, or complete.
9. Provider plan is complete, approved, and displayable for both stages.
10. Browser-transcript processing and manual-enrichment feature gates are enabled.
11. Deployment is fixture/local/test or exactly manifest-authorized lab.
12. Deployment is not production; production is denied by code regardless of flags, aliases, or manifests.
13. A separate current `manual_transcript_enrichment_manifest_v1` decision extends the exact capture decision; capture approval alone is insufficient.
14. A permitted interactive runner exists and cannot claim unrelated work.
15. The exact provider-ready input and complete disclosure context fingerprints come from one current server snapshot.

The command is always denied in production until a separately reviewed code change removes that denial.

Never infer eligibility from `items.enrichment_state`, body length alone, missing summary, URL equality, client source claims, or button visibility.

### Ineligible presentation

| Condition | UI |
| --- | --- |
| No transcript | Existing recovery actions; no enrichment command |
| Transcript attached, no release policy | **AI processing remains paused**; no dead button |
| Provider plan incomplete | **AI enrichment is not configured** with Settings navigation |
| Current job queued/running | Stage status; no second action |
| Current digest and index complete | Render result; no P0 rerun action |
| Source/revision changed | Refresh to latest held state and require new review |
| Production browser item | Keep browser capture and processing unavailable |

## 11. End-To-End Experience

### 11.1 Transcript missing

The existing item recovery panel remains. Chrome recovery appears only in authorized research contexts. Paste/upload remain available according to existing policy.

AI Digest copy:

> Add a transcript before creating an AI digest for this video.

### 11.2 Inspect and attach in Chrome

The existing three-step extension flow remains Open, Inspect, Add. No provider details or enrichment state appears before attachment.

Review copy continues to state that attachment creates a research processing hold.

### 11.3 Extension attachment success

**Heading:** Transcript added
**Body:** 286 timed segments were added to the exact Brain item that started this request. AI processing has not started.
**Privacy:** No browser session data was shared. Caption type remains unknown.
**Primary:** Open item in Brain
**Secondary:** Done

Opening the item is navigation, not processing consent.

### 11.4 Held item

Item banner:

> **Transcript added from Chrome**
> The confirmed transcript is attached to this exact item. AI processing has not started.

AI Digest panel:

> **Transcript added. AI processing is paused.**
> Create an AI digest and search index for this exact transcript version.

The panel shows both processor summaries and a revisit-able **What is sent?** disclosure.

### 11.5 Local-only plan

When both stages run on the Brain server:

- Button: **Enrich on this Brain**
- Copy: **Ollama processes the digest and index on this AI Brain server. Transcript content is not sent to an external AI provider.**
- The complete inline disclosure is open and non-collapsible while the action is enabled; no second dialog is required.

Do not say **on this device** because Brain may run on Hetzner.

### 11.6 Any remote stage

Button: **Review AI processing**

Desktop opens a focused dialog; mobile opens a review sheet. It contains:

- exact item and current transcript label;
- digest provider/model and local/external boundary;
- embedding provider/model and local/external boundary;
- exact data categories per stage;
- 12,000-character digest limit;
- full-text transcript chunk coverage for embedding;
- outputs stored in Brain;
- approved retention/deletion wording;
- Brain source delete-by, provider handling-terms versions, and authorization expiry as separate facts;
- explicit exclusions;
- exact-revision and future-Ask limits;
- queue behavior.

Actions:

- **Agree and queue AI processing**
- **Keep AI processing paused**

Focus begins on the review heading. Closing or canceling changes nothing. Focus returns to the invoking button.

### 11.7 Queue acknowledgement

After the transaction commits:

> **AI processing queued**
> Brain will use the provider plan you reviewed. You can leave this page.

The UI must not say queued from an optimistic button state alone. Before receipt, it says **Authorizing AI processing** and keeps the hold authoritative. If the response is lost, it changes to **Checking whether AI processing started**, reuses the original mutation ID, and reconciles durable status before it offers any new action. A transport error never proves that nothing was sent.

### 11.8 Processing

Named stages:

1. Queued
2. Creating AI digest
3. Digest ready, building search index
4. AI digest and search index ready; future Ask prompts remain separate actions

No percentage appears. Page refresh reconstructs state from durable rows.

### 11.9 Completion

Render summary, key quotes, category, and topics. Footer states the transcript is current and names both processors. Do not show a rerun action in P0.

### 11.10 Partial success

If indexing fails after digest success:

> **AI digest ready. Search indexing needs attention.**
> The digest is safe. Retrying the index will not call the digest provider again.

Primary: **Retry search indexing with {provider}**
Secondary: **Check provider settings**

### 11.11 Changed transcript or provider

Provider change before authorization or provider dispatch:

> **AI provider details changed**
> Review the updated destinations and data scope before continuing. AI processing has not started for this transcript version.

Provider change after digest dispatch or completion but before index dispatch:

> **Digest ready. Search indexing is paused.**
> The approved digest provider already received this transcript version. Review the updated search-index provider before sending the full transcript. The digest provider will not be called again.

Provider change after index dispatch:

> **Search-index plan changed after sending**
> The approved index provider already received the current transcript. The changed plan was not used. Brain is verifying whether the result can be applied.

Transcript change in flight:

> **Transcript changed while enrichment was running**
> The older result was rejected. Review the latest transcript before starting again.

Old output must never flash as current.

### 11.12 Source and metadata replacement

Any browser recapture, paste, upload, official-caption replacement, source supersession, item body change, or change to title/channel/duration invalidates the accepted provider-input fingerprint and fences old claims. A new browser transcript revision creates a new held generation and requires a new choice. Paste/upload remain on their explicit P0 legacy scheduling policy, but cannot relabel or automatically release authority for a restricted browser source merely because text is copied through another helper. Current completed digest may remain visible only with its accepted revision/provenance; stale index data is immediately excluded from semantic reads.

Every write path has a transition test from held, queued, digesting, partial, and ready states. Source/segment content is immutable after insertion except lifecycle status/cascade; integrity mismatch returns `source_integrity_changed`, never repair-in-place under an existing authorization.

## 12. Provider And Data Contract

### Purpose set

- `youtube_transcript_digest`
- `youtube_transcript_semantic_index`

No other purpose is implied.

### Separate processing authorization

The capture manifest remains a hold-only artifact with no downstream permission. `manual_transcript_enrichment_manifest_v1` is a second private exact-target artifact containing non-production deployment/data-root identity, capture manifest hash and decision, source/text hash, rights basis, both purpose IDs, exact stage plans/contracts/categories/coverage, downstream/fallback behavior, provider handling-terms versions, consent-copy version, issued/not-before/expires/delete-by timestamps, and cleanup owner/verification. A strict private loader validates ownership, mode, symlink resolution, data-root match, schema, and exact target. It creates a content-free `content_processing_policy_decision`. Without this separate current decision, status returns `processing_not_authorized` and no action.

### Data inventory

| Data | Digest processor | Embedding processor | Stored in Brain |
| --- | --- | --- | --- |
| Source type | Yes | No direct field | Existing item |
| Title | Yes | Repeated with transcript and digest chunks | Existing item; unchanged |
| Channel/author | Yes, including null | No separate field | Existing item; unchanged |
| Duration | Yes, including null | No separate field | Existing item; unchanged |
| Transcript | First 12,000 characters under current contract | Chunked full body | Existing source/body/segments |
| Generated summary | Output | Summary chunks | Digest |
| Quotes/category/topics | Output | Not separate fields | Digest/topics |
| Manual note | No | No | Separate and unchanged |
| Browser session/cookies/history/player/signed URLs | No | No | No |
| Stable Brain item/source/video/account identifier | No provider alias | No provider alias | Internal only |

Disclosure is generated from the same typed payload descriptors used by request builders. Tests compare the actual serialized categories to the displayed fixture. The digest coverage contract defines the exact character-count rule; while current code uses the first 12,000 characters, copy says later sections are not summarized. The embedding space contract includes dimension, provider task type, normalization, chunker, title-prefix behavior, and vector metric.

### Provider-plan invalidation

Require renewed review when any changes:

- source/body/content revision;
- provider or model;
- endpoint local/external classification;
- OpenRouter downstream/fallback identity;
- purpose or received-data categories;
- prompt/index coverage limit;
- retention/delete-by terms;
- manifest authorization;
- consent copy or provider-plan version.

The server first produces `authorizationInputFingerprint` from versioned canonical JSON containing item ID, source type, exact composed provider title, item title, channel/author including null, duration including null, body hash, active source ID, source text/integrity hash, content revision, unique held job generation, prompt contract, and digest coverage rule. It proves which provider-ready input was reviewed without returning content or hashes other than the opaque fingerprint.

The server separately produces one `authorizationContextFingerprint` from a canonical object containing:

- contract, provider-plan, policy, and consent-copy versions;
- environment class, item ID, active source ID/type/text hash, content revision, and input fingerprint;
- authorization expiry, policy-manifest identity/hash/expiry, and source delete-by;
- each ordered stage's purpose, provider/model, local/external class, hashed routing identity, downstream/fallback facts, received-data categories, exact prefix/full coverage, outputs, prompt/index contract, and provider handling-terms version;
- explicit exclusion of future transcript revisions and future Ask requests.

Display-safe text and both fingerprints come from the same atomic status snapshot. Provider fingerprints remain stage execution identities but cannot substitute for this full authorization context. Every authorization snapshot, receipt, job, attempt, retry, dispatch, and apply binds both accepted fingerprints and expiry. Claims compare them; they never establish new authorization identity.

Temporary health changes do not invalidate identity but may produce retryable operational errors.

## 13. Output Contract

P0 writes:

- exactly three non-empty digest paragraphs under the current bounded input contract;
- one to five normalized source-verified excerpts, each at most 200 characters;
- one category from the allowlisted enum;
- three to eight normalized auto topics;
- current-version original-content and summary chunks/vectors;
- content-free usage and attempt records.

P0 does not write:

- a replacement item title;
- transcript/body/source/segments;
- manual tags, notes, collections, workflow fields;
- future Ask content.

The UI uses **AI digest**, not **complete video summary**.

The transcript-specific prompt, parser, validator, fixtures, persistence, and prototype implement this one contract. A quote must occur in the bounded source excerpt after versioned normalization. The prompt says **Transcript excerpt**, never **Article body**. Validation failure applies no partial digest.

## 14. Functional Requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| ME-F01 | P0 | Attachment creates a held, non-claimable state and no provider call. |
| ME-F02 | P0 | Extension and item UI explicitly say AI processing has not started. |
| ME-F03 | P0 | Command appears only for a server-proven exact held browser transcript. |
| ME-F04 | P0 | Both digest and embedding provider plans are visible before authorization. |
| ME-F05 | P0 | Local-only and remote review behavior follows the data-boundary rule. |
| ME-F06 | P0 | Disclosure states bounded digest input, full-text embedding, outputs, retention, and exclusions. |
| ME-F07 | P0 | Final action binds the complete canonical authorization scope, including item/source/revision/input, ordered stages, purposes, coverage, outputs, retention/delete-by, manifest/policy/expiry, environment, and copy version. |
| ME-F08 | P0 | Authorization receipt, exact hold release, and interactive job transition commit atomically. |
| ME-F09 | P0 | Mutation replay creates at most one effective job and never changes its binding. |
| ME-F10 | P0 | POST returns after durable queue receipt and never awaits a provider. |
| ME-F11 | P0 | Legacy `/enrich` requests, including bodyless and `force=realtime`, cannot release or process an active browser-transcript hold. |
| ME-F12 | P0 | Interactive work never enters nightly batch selection. |
| ME-F13 | P0 | Workers require released hold, current source/revision, unexpired authorization scope, accepted stage plan, unique generation, and claim token before every dispatch. |
| ME-F14 | P0 | Every apply rechecks all gates and discards stale output without derived mutation. |
| ME-F15 | P0 | Manual path preserves item title, transcript, provenance, notes, workflow, collections, and manual tags. |
| ME-F16 | P0 | Provider-facing job/result aliases contain no stable Brain identifier. |
| ME-F17 | P0 | Status exposes structured authorization, per-stage dispatch, retry, drift, expiry, deletion, and allowed-action facts sufficient for truthful copy. |
| ME-F18 | P0 | Digest and indexing are separate durable stages; indexing-only retry does not rerun digest. |
| ME-F19 | P0 | HTTP responses and logs use safe typed codes and never raw provider content. |
| ME-F20 | P0 | Desktop and mobile experiences remain usable without Chrome after attachment. |
| ME-F21 | P0 | Keyboard, focus, screen-reader, 200% zoom, high-contrast, and reduced-motion journeys pass. |
| ME-F22 | P0 | Production denial wins over flags, manifest, and environment overrides. |
| ME-F23 | P0 | Item deletion cancels authority and prevents in-flight output recreation. |
| ME-F24 | P0 | Analytics and operational logs contain only allowlisted content-free fields. |
| ME-F25 | P0 | Kill switches and retention/authorization clocks apply at authorization, claim, every dispatch, and apply. |
| ME-F26 | P0 | A lost POST response reconciles the original mutation and never asserts no provider activity without durable proof. |
| ME-F27 | P0 | Receipt, jobs, and both attempt families preserve immutable authorization-context lineage. |
| ME-F28 | P0 | Job generation identity is strictly increasing and never resets after source replacement. |
| ME-F29 | P0 | Provider/content conflict copy distinguishes pre-dispatch, between-stage, and post-dispatch facts. |
| ME-F30 | P0 | One logical Digest command is mounted while real Original, Digest, Ask, Related, Details, and optional Notes navigation remains intact. |
| ME-F31 | P0 | Authorization binds the pre-review provider-ready input fingerprint as well as the complete context fingerprint; claims only compare accepted identities. |
| ME-F32 | P0 | A separate current processing manifest/decision is required; the capture manifest alone always denies downstream processing. |
| ME-F33 | P0 | Manual-transcript-lab mode starts only exact authorized interactive digest/index workers and claims no unrelated queue work. |
| ME-F34 | P0 | Embedding-space identity is stored and enforced by one current-semantic-source gate across Search, Ask, Related, citations, and readiness. |
| ME-F35 | P0 | Reauthorization, digest retry, and index retry are explicit operation- and generation-bound commands; index retry produces zero digest calls. |
| ME-F36 | P0 | Transcript replacement or metadata/input change invalidates old authorization and fences every old claim without relabelling it as a new source policy. |
| ME-F37 | P0 | The transcript output parser enforces the exact paragraph/excerpt/category/topic contract and source-verifies excerpts. |
| ME-F38 | P0 | Schema rollout is binary-compatible through expand, dual-write/backfill, cutover, and later contract phases. |

## 15. State Model

```text
transcript_committed
  -> awaiting_permission

awaiting_permission
  -> reviewing_plan       remote review opened
  -> authorizing          local authorization or remote confirmation

reviewing_plan
  -> awaiting_permission  cancel/close/expiry
  -> authorizing          confirm

authorizing
  -> queued               atomic receipt + release + job commit
  -> awaiting_permission  pre-commit failure
  -> authorization_outcome_unknown  transport outcome is ambiguous
  -> provider_review_required_before_dispatch | content_changed | blocked

authorization_outcome_unknown
  -> queued | enriching | indexing | ready  accepted receipt reconciled
  -> awaiting_permission               authoritative no-effect result
  -> blocked                           session/policy prevents recovery

queued
  -> enriching
  -> content_changed | provider_review_required_before_dispatch | authorization_expired | blocked

enriching
  -> indexing             digest applies under all gates
  -> retryable_error | terminal_error | content_changed_in_flight
  -> provider_review_required_after_digest

indexing
  -> ready
  -> retryable_error | terminal_error | content_changed_in_flight
  -> provider_review_required_after_index_dispatch

retryable_error
  -> queued               retry_enrichment under same run/digest generation
  -> indexing             retry_indexing under same digest and new index job generation
  -> reviewing_plan       reauthorize_and_queue after material binding change and old-claim fencing
  -> authorization_expired | blocked

ready
  -> ready                    irrelevant digest-provider setting change; historical provenance remains
  -> retrieval_incompatible   embedding space no longer compatible with current query space
  -> awaiting_permission      new eligible held transcript revision

any state
  -> deleted                  authoritative deletion; no later recreation
```

The server may implement this as a smaller top-level union plus structured fields, but it must expose `serverState`, `stage`, `resultState`, `allowedAction`, `blockedReason`, `dispatchState`, `retryClass`, `retrievalCompatibility`, accepted/current input and context relations, authorization expiry, last durable transition, each stage's state/attempt/generation, deletion state, and allowed actions. `reviewing`, `authorizing`, and outcome-unknown reconciliation are client overlays. Copy never guesses from a lossy status enum.

## 16. API Product Contract

### Read/status

`GET /api/items/:id/enrichment-status`

Returns private, no-store, display-safe fields:

- contract version and effective state;
- active transcript display metadata;
- current content/enrichment version labels;
- hold and job projection;
- one atomic `authorizationContext` with exact source/revision/held-generation binding, `authorizationInputFingerprint`, complete display plan, both stage fingerprints, `authorizationContextFingerprint`, consent-copy/context versions, and expiry;
- allowed action and typed blocked reason;
- stage, attempt, stage/run generations, dispatch truth, accepted/current input/context relation, embedding-space and retrieval compatibility, retry eligibility, original mutation reconciliation, and safe error code.

It returns no transcript text, internal policy document, claim token, provider endpoint, raw error, credentials, or legal approval ID.

### Authorize and queue

`POST /api/items/:id/enrichment-runs`

Strict `manual-enrichment-v2` JSON contains:

- UUID mutation ID;
- operation;
- expected content revision;
- active transcript source ID;
- expected current stage/run generation;
- authorization-input fingerprint;
- provider-plan version;
- digest and embedding provider fingerprints;
- authorization-context fingerprint.
- consent-copy version.

The server derives all authority and configuration. Accepted effective requests return `202`; replays/no-ops return `200`; changed source/revision/provider/scope or expired authorization returns typed `409`; mutation-ID mismatch returns `422`. The response and status projection expose the mutation result without exposing claim tokens or policy internals.

The existing `POST /api/items/:id/enrich` is not this command. It remains a separately inventoried compatibility route and returns a typed no-effect response whenever an active browser-transcript processing hold is present, including for bodyless and `force=realtime` calls.

### Retry

The operation enum is `release_transcript_and_enrich | reauthorize_and_queue | retry_enrichment | retry_indexing`.

- Initial release requires the exact held generation and releases the storage hold once.
- Reauthorization creates a new immutable run generation, fences/waits out the old claim, supersedes old authority, and never pretends to release the storage hold again.
- Digest retry requires the exact digest error and generation; automatic retries add attempts under the same run/stage, while explicit retry may allocate a new digest job generation under unchanged accepted context.
- Index retry requires the exact current applied digest and index-error generation, advances only the embedding job generation, and has a zero-digest-provider-call guarantee.

Every retry reuses authorization only when both input/context fingerprints remain identical/current, the context is unexpired, retrieval/index contracts are compatible, and the source remains lawfully retained. Otherwise review reopens or the action remains blocked.

### Mutation reconciliation

The status response can resolve a client-held mutation ID, or the same byte-equivalent POST can be replayed. After session, configured-public-origin, content-type, size, and strict-schema validation, an existing exact receipt replays before write-disable and novel-mutation rate-limit gates; kill switches still block new work and every claim/dispatch/apply. While outcome is unknown, the client keeps that mutation ID across reload/offline recovery, disables new approval, and reports **Checking whether AI processing started**. Only an authoritative rejected/no-effect receipt with zero dispatch may report that no provider request was created.

## 17. Error And Recovery Copy

| Code | User copy | Recovery |
| --- | --- | --- |
| `provider_unavailable` | The enrichment provider is unavailable. Brain will retry. | Automatic retry |
| `quota_or_billing` | Provider quota or billing is blocking enrichment. | Settings/operator |
| `invalid_response` | The provider returned an unusable response. Your transcript was not changed. | Safe retry |
| `content_revision_changed` | This transcript changed before enrichment finished. The old result was discarded. | Review latest |
| `authorization_outcome_unknown` | Brain did not receive a clear response. It is checking the original request. | Automatic reconcile, then Check status |
| `provider_plan_changed_before_dispatch` | AI provider details changed before processing. No provider request was started. | Review again |
| `provider_plan_changed_after_digest` | Digest ready. Search indexing is paused under the changed plan. | Review index plan |
| `provider_plan_changed_after_index_dispatch` | The approved index provider already received this version; the changed plan was not used. | Wait for safe resolution |
| `indexing_failed` | The digest is ready, but search indexing failed. | Retry index only |
| `policy_expired` | This research approval expired before processing started. | Keep paused/operator |
| `authorization_expired` | AI processing approval expired before an unstarted stage. | Review current terms when eligible |
| `processing_not_authorized` | AI processing is not approved for this transcript. The transcript remains attached. | None/operator |
| `retrieval_incompatible` | The saved search index is not compatible with the current search model. | Keep digest visible; block semantic use pending reviewed reindex |
| `session_expired` | Unlock Brain to continue. No new processing choice was inferred. | Unlock Brain |
| `manual_enrichment_disabled` | AI processing remains paused in this environment. | None |

Never render raw provider response, stack trace, prompt fragment, transcript fragment, item ID, source ID, token, or arbitrary error message.

## 18. Accessibility And Responsive Requirements

- Native buttons and dialog/sheet semantics.
- Minimum 44 px touch targets; existing compact desktop size may remain at least 32 px.
- Visible provider/privacy text linked with `aria-describedby`.
- Focus starts on review heading; cancel/close returns to invoking action.
- No automatic focus on an authorization button after Chrome return.
- Polite live announcements only on durable state changes.
- Alerts reserved for provider/content conflict and actionable failure.
- No focus theft when background work completes.
- No fabricated percentage or continuously resetting animation.
- At 320 CSS px and 200% zoom, provider/model names and actions wrap without clipping or horizontal scrolling.
- Reduced-motion path replaces pulsing/spinning motion with static status icons and text.
- High contrast and no-color modes retain explicit labels.

## 19. Metrics And Privacy

### Ship gates

| Metric | Gate |
| --- | ---: |
| Held claim before consent | 0 |
| Provider content request before consent | 0 |
| Wrong source/revision apply | 0 |
| Duplicate effective provider job after replay | 0 |
| Silent provider/model substitution | 0 |
| Stable identifier in provider alias | 0 |
| Stale output apply | 0 |
| Partial success represented incorrectly | 0 |
| Failed cleanup | 0 |
| Reviewed input/context drift accepted | 0 |
| False no-transfer copy in unknown/post-dispatch state | 0 |
| Unrelated job claimed in manual lab mode | 0 |
| Stale or incompatible semantic row retrieved | 0 |
| Index-only retry digest-provider calls | 0 |
| Fixture transaction and chain completion | 100% |
| Consent comprehension | 5/5 reviewers |

### Allowed analytics

- environment class;
- fixed source class;
- stage/outcome code;
- local/external destination class;
- consent-copy version;
- coarse duration, size, and retry buckets;
- stale guard and cleanup booleans.

### Forbidden analytics/log fields

Any item/source/video/account/request/mutation/provider-request ID, URL, title, language, transcript, prompt, output, text hash, endpoint, raw provider error, IP, user agent, cookie, token, or signed resource.

This prohibition applies to exported analytics and file/console/error logs. Private operational database evidence may retain cascading item/source/job/authorization linkage, opaque fingerprints, safe stage timestamps, attempts, token counts, and safe codes under authenticated access, item deletion, and approved backup retention. These three classes have separate schemas and privacy tests.

## 20. Rollout

### Stage 0: Final artifacts and governance

Finalize V2 PRD/plan/prototype after adversarial review. Approve the separate `manual_transcript_enrichment_manifest_v1`, exact provider/account/purpose/retention/deletion contract, and cleanup evidence. All runtime flags remain off; capture approval alone remains hold-only.

### Stage 1: Inert prototype

Moderated desktop/mobile/keyboard review using synthetic transcript and provider data.

Exit: five reviewers explain the three permissions, both processors, limits, and exact scope.

### Stage 2: Fixture/local implementation

Implement dependencies and flow with fake providers, then local-only provider execution. Prove all failure barriers, privacy scans, exact semantic-read filtering, worker-mode isolation, deletion, binary/schema compatibility, and rollback.

### Stage 3: One-item isolated lab canary

Separate instance, database, data root, credentials, capture decision, processing manifest/decision, and approved target. `manual-transcript-lab` starts only the two authorized interactive workers. Run one full success, conflict, retry, partial success, response-loss reconciliation, and verified deletion sequence.

### Stage 4: Expanded authorized lab

At least 20 unique approved jobs across five approved standard watch videos, including long, multilingual, provider unavailable, revision change, and policy-expiry cases.

### Stage 5: Separate production decision

Production requires a new packet covering browser capture approval, provider terms, retention/deletion/backups, cost/quota, incident response, support, distribution, canary evidence, and an explicit code change.

## 21. Immediate No-Go Gates

Do not enable live processing if any is true:

1. The upstream browser-transcript migration still collides with committed `026_notebooklm_export.sql`, or its final filename/hash/schema and hold/revision enforcement are only documented rather than implemented.
2. More than one active transcript source can exist.
3. Attachment can create claimable pending work.
4. Any realtime, batch, or embedding claimant ignores holds.
5. Any apply path lacks source/revision/provider/generation/token/input checks.
6. Generic legacy endpoint behavior can bypass a hold.
7. Interactive work can enter the nightly batch.
8. Either processor or actual data coverage is omitted from disclosure.
9. Model output can rename the item.
10. Stable IDs appear in provider aliases, logs, analytics, or errors.
11. Digest/index partial success is collapsed into false completion or total failure.
12. Deletion can be followed by in-flight recreation.
13. Feature disable is not checked at write, claim, and apply.
14. Rollback can start a hold-blind old binary.
15. Production can be enabled through configuration alone.
16. Any user-visible material term is absent from the authorization-context fingerprint.
17. A transport error can be rendered as proof that nothing was sent.
18. Provider/content drift lacks durable stage-dispatch facts.
19. Authorization or retention can expire without a dispatch/apply gate.
20. A generation sequence can reset or reuse an old identity.
21. The item mounts duplicate authorization controls or loses existing query-driven tabs.
22. The separate processing manifest/decision is absent, or capture approval alone can authorize processing.
23. Manual lab mode can start or claim any unrelated worker/job class.
24. Search, Ask, Related, citations, or readiness can consume a stale or incompatible embedding space.
25. Provider-ready input identity is first established after the click instead of accepted at authorization.
26. Schema migration can auto-apply before every deployed consumer is binary-compatible.
27. Origin authority is derived from Host or forwarded headers instead of configured public origin.
28. Provider deadline/lease/reclaim rules permit uncontrolled concurrent duplicate dispatch.
29. Prompt, parser, validator, persistence, and visible output do not share one transcript-specific schema.

## 22. Risks

| Risk | Mitigation |
| --- | --- |
| User assumes Add already authorized AI | Explicit held copy in extension, banner, pill, and Digest panel |
| User overlooks embedding destination | Two visible provider rows and full review for any remote stage |
| User assumes whole-video digest | 12,000-character disclosure and **AI digest** terminology |
| Existing endpoint bypass | New consent-bearing run resource plus an unconditional active-hold guard on the legacy route |
| Provider or disclosure changes after click | Complete scope fingerprint at status, POST, claim, dispatch, retry, and apply |
| Old result overwrites new transcript | Source/revision/input/generation/token fences |
| Item title changes unexpectedly | Manual path ignores model title output |
| Indexing failure reruns digest | Separate durable embedding job and retry |
| UI says queued before commit | Queue receipt is the only queued authority |
| Response is lost after commit | Original mutation reconciliation and truthful unknown state |
| Provider drift after one stage sends | Per-stage dispatch facts and stage-aware copy |
| Retention expires mid-run | Three clocks enforced before every dispatch/apply |
| Lab change reaches production | Code-level production denial and negative matrix |

## 23. Definition Of Done

- Product Council V2, PRD V2, implementation plan V2, UX spec V2, and final prototype resolve every recorded V1 finding.
- The rebased upstream browser-transcript migration dependency is frozen by source/filename/hash/schema and cannot be bypassed.
- Every P0 functional requirement maps to implementation work and deterministic evidence.
- Prototype demonstrates full journey, local plan, real remote dialog/sheet, no-action hold, authorizing versus queued, response-loss reconciliation, stage-aware provider change, transcript change, expiry, provider/session failure, partial indexing failure, feature off, full item navigation, mobile, and production denial.
- Adversarial reports and resolution matrix are stored beside the artifacts.
- Package validates, is committed, pushed, reviewed through PR, and reports CI status.
- Implementation enablement remains separately gated.
