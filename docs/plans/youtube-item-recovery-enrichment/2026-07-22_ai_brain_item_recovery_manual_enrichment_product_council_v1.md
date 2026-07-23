# AI Brain Item Recovery Manual Enrichment: Product Council V1

**Date:** 2026-07-22
**Status:** V1 council synthesis for adversarial review
**Council:** Designer Agent, Product Manager Agent, Technical Architect Agent, Codex facilitator
**Decision scope:** Extend the item-initiated YouTube transcript recovery flow with a separate user-authorized enrichment and semantic-indexing action after transcript attachment

## Executive Decision

The Council recommends a **conditional go** for an inert prototype, detailed planning, fixture implementation, and a separately approved isolated lab canary.

The Council recommends a **no-go** for production browser-visible transcript capture or processing. This feature does not overturn the upstream production no-go. It defines the first reviewed way to release a processing hold after a transcript has already been retained in an approved environment.

The product promise is:

> **Transcript added. AI enrichment has not started.**

The user then makes a third distinct choice in the AI Brain item:

1. **Inspect visible transcript** reads the visible YouTube transcript into temporary extension memory.
2. **Add transcript to this Brain item** stores the reviewed transcript on the exact originating item and creates a processing hold.
3. **Enrich transcript** authorizes a disclosed digest and semantic-indexing plan for that exact item, transcript source, and content revision.

The third action must release the exact hold and create a durable user-priority job atomically. It must never run a provider inside the HTTP request, enter the nightly batch lane, authorize future transcript revisions, or authorize future Ask prompts.

## Evidence Considered

- `2026-07-22_current_state_audit.md`
- `2026-07-22_designer_agent_v1_input.md`
- `2026-07-22_product_manager_agent_v1_input.md`
- `2026-07-22_technical_architect_agent_v1_input.md`
- The final YouTube DOM capture PRD and implementation plan V2
- The item-initiated recovery README, council artifact, and throwaway prototype
- Current repair, transcript attachment, item UI, enrichment route, worker, batch, embedding, status, provider, and deletion code

## Council Member Positions

### Designer Agent

The Designer recommends keeping enrichment in the existing AI Digest panel, where the output appears. The extension keeps only Open, Inspect, and Add. Provider and payload disclosure should remain visible beside the action, focus must never land automatically on the action, progress must use named states rather than fabricated percentages, and mobile should use the existing Original/Digest split.

The Designer prefers one explicit provider-named click with no normal-path modal when the complete disclosure is already visible.

### Product Manager Agent

The Product Manager recommends a short processing review before the durable queue mutation. The review must name both the enrichment and embedding destinations, disclose the current 12,000-character digest limit and full-text embedding path, state retention terms, and clarify that Ask remains separate. The Product Manager also requires title preservation, random provider-facing job aliases, partial-success behavior, aggregate-only analytics, and a manifest-authorized lab rollout.

### Technical Architect Agent

The Technical Architect recommends evolving the existing `POST /api/items/:id/enrich` route into a strict, queue-only, receipt-based contract because no current UI caller depends on its legacy behavior. The architect requires exact same-origin session authorization, processing holds, content and enrichment generations, immutable mutation receipts, interactive and scheduled queue lanes, claim tokens, provider-plan fingerprints, compare-and-apply gates, a dedicated embedding stage, and forward-only rollback under kill switches.

The architect recommends a second confirmation for any remote provider plan and permits one-click local-only processing when disclosure is already visible.

## Reconciled Product Decisions

### D1. The action lives in AI Brain, not Chrome

The extension success state ends with **Open item in Brain** and says AI enrichment has not started. It does not show provider configuration, credentials, queue state, or an enrichment action.

The persistent action lives in the item's AI Digest panel:

- Desktop: 330-360 px item side rail.
- Tablet: full-width section after Transcript.
- Mobile: Digest tab, with a compact Transcript added status above it after the explicit return from Chrome.

Other surfaces may navigate to the Digest panel or mirror status, but they do not duplicate the command.

### D2. Both processing stages are disclosed

The action authorizes one defined two-stage chain:

1. **AI digest**: current title/source context and up to the first 12,000 transcript characters go to the configured enrichment provider to produce summary, key quotes, category, and AI topics.
2. **Semantic index**: chunked full transcript text and the generated digest go to the configured embedding provider.

The disclosure names provider, model, local/external boundary, purpose, and data categories for each stage. It also states that YouTube cookies, Google account details, browsing history, player state, signed caption URLs, manual notes, unrelated items, and future Ask prompts are excluded.

An incomplete provider plan is ineligible. OpenRouter must disclose the configured downstream model provider and fallback behavior or remain blocked.

### D3. Confirmation depth depends on the data boundary

The item always shows a compact provider-plan summary before any action.

- **Both stages on the Brain server:** complete data-scope copy is visible inline; the provider-named button may be the authorization click. Label: **Enrich on this Brain**.
- **Either stage external:** the initial button opens a focused review dialog on desktop and review sheet on mobile. Label: **Review and enrich transcript**. The final consent action is **Agree and queue enrichment**.

The review is not a duplicate generic warning. It is the only place that presents the full two-provider plan, 12,000-character digest limit, full-text embedding coverage, retention wording, exact-transcript scope, and excluded data together. The persistent panel continues to show a summary after the review closes.

If the transcript, provider, model, destination class, purpose, coverage, retention, manifest, or copy version changes, the old readiness snapshot is invalid and a new user action is required.

### D4. Manual means user-priority background work

The final consent creates a durable **interactive** queue job and returns `202 Accepted`. It does not wait for a provider and it does not promise immediate completion.

Interactive jobs:

- are prioritized by the realtime background worker;
- never enter the nightly provider batch;
- carry the exact accepted provider plan;
- can survive navigation and server request completion;
- cannot be claimed while a hold is active;
- cannot be silently rerouted when configuration changes.

The UI says **Enrichment queued**, not **Enrich now** or **Working now**, until a worker claim is durable.

### D5. Evolve the existing route, remove the unsafe legacy contract

The Council accepts the architect's recommendation to evolve:

- `GET /api/items/:id/enrichment-status` into the complete server-owned read model.
- `POST /api/items/:id/enrich` into a strict `manual-enrichment-v2` authorization and queue command.

The POST is web-session-only, exact-same-origin, JSON-only, bounded to 8 KiB, strict-schema, versioned, and idempotent. It accepts the expected revision, active source ID, provider-plan fingerprints, and a UUID mutation ID. It does not accept a provider choice, queue lane, hold reason, item state, retry count, or title/body.

Bodyless legacy requests and `?force=realtime` receive an explicit contract-removed response and perform no work. No current source caller uses that route; implementation must still update documentation and tests and provide a short compatibility note.

### D6. Authorization, release, and queueing are one transaction

The accepted POST transaction must:

1. replay or reject the mutation ID deterministically;
2. verify the exact item, sole active source, content revision, input fingerprint, hold, policy, and provider plan;
3. write an immutable authorization receipt;
4. release exactly the matching hold;
5. transition exactly the matching held enrichment job generation to pending in the interactive lane;
6. commit before the UI may say queued.

Any failure rolls back the receipt, hold release, job transition, and compatibility projection together.

### D7. Revision identity covers every real model input

`items.content_revision` is necessary but not sufficient. The digest prompt uses title, author, duration, source type, and body. The semantic index uses title, body, and generated summary.

Each claim therefore persists a canonical input fingerprint covering every current prompt/index input plus:

- item ID;
- active transcript source ID and source text hash;
- content revision;
- enrichment job generation;
- provider-plan fingerprints;
- prompt/index contract version.

Successful enrichment advances `items.enrichment_generation`. Embedding binds to both content revision and enrichment generation. Apply checks recompute the current input fingerprint and compare claim token and generation in one transaction.

### D8. Manual enrichment does not rename the item

The existing enrichment response includes a model-generated title and the shared pipeline currently writes it. For this consent-scoped browser transcript path, the item title remains unchanged.

The product action promises digest and indexing, not title replacement. The manual path may validate and ignore the returned title until a separately reviewed title-suggestion feature exists.

### D9. Partial success remains useful

Digest and indexing are separate durable stages:

- Digest failure: no digest outputs apply; retry enrichment under the same exact plan/revision when still valid.
- Digest success, indexing failure: preserve and display the digest; show **AI digest ready. Search indexing needs attention.**
- Index retry: call only the embedding provider and do not regenerate the digest.
- Completion: only when current-revision digest and current-version semantic index both succeed.

### D10. Provider-facing identifiers are opaque

No external batch or provider request uses Brain item, source, video, account, or mutation IDs as a job alias. Generate a random result alias, store only its hash with the exact job generation, and map it server-side.

### D11. The first product scope is intentionally narrow

P0 eligibility is limited to an approved active `browser_visible_transcript` source carrying an active processing hold for the current revision.

P0 does not silently change paste/upload/official-caption behavior, general item re-enrichment, notes, Ask, transcript editing, or completed-item refresh. Consistency across all transcript sources is a P1 product decision after this held path is proven.

### D12. Production remains blocked

The initial release sequence is:

1. inert prototype;
2. synthetic fixture/local implementation;
3. local provider execution;
4. manifest-authorized isolated lab with exact providers/models/purposes/expiry/deletion;
5. expanded authorized lab evidence;
6. separate production decision.

Environment flags, legal approval text, or a manifest alone cannot enable production browser capture or production processing. Code-level production denial remains authoritative until a separately reviewed change removes it.

## Experience Contract

### After transcript attachment

Extension:

- Heading: **Transcript added**
- Body: **286 timed segments were added to the exact Brain item that started this request. AI enrichment has not started.**
- Primary: **Open item in Brain**
- Secondary: **Done**

Brain item:

- Banner: **Transcript added from Chrome**
- Body: **The confirmed transcript is attached to this exact item. AI enrichment has not started.**
- Digest heading: **Transcript added. AI processing is paused.**
- Status: **Ready to enrich** or **AI paused**, never **Queued**.

### User-visible state sequence

| State | Meaning | Primary action |
| --- | --- | --- |
| `awaiting_permission` | Transcript stored, exact hold active, no provider work claimable | Local: **Enrich on this Brain**; remote: **Review and enrich transcript** |
| `reviewing_plan` | User reviews exact current two-provider plan | **Agree and queue enrichment** |
| `queueing` | Atomic mutation is in flight; hold remains authoritative until commit | None |
| `queued` | Receipt, release, and interactive job are durable | None |
| `enriching` | Exact digest job is claimed | None |
| `indexing` | Digest applied; exact semantic index is being built | None |
| `ready` | Current digest and index are complete | None |
| `retryable_error` | Current stage failed with safe retry available | Stage-specific retry |
| `provider_review_required` | Provider plan changed | **Review updated plan** |
| `content_changed` | Source/revision/input changed; old result discarded | **Review latest transcript** |
| `blocked` | Feature, environment, manifest, retention, or provider policy blocks processing | None |

Progress uses named stages and no percentage. Polling announces only state changes and never steals focus.

## Safety And Privacy Contract

The following are release-blocking:

- zero provider content requests before the final authorization action;
- zero held jobs claimable by realtime or batch workers;
- exact source/revision/provider/claim checks at release, claim, and apply;
- no raw provider output or arbitrary provider errors in HTTP responses, logs, receipts, analytics, screenshots, or reports;
- no stable Brain identifier sent as an external provider job key;
- no stale summary, tag, topic, title, chunk, vector, usage-success, or job-success apply;
- no index retry that reruns a successful digest;
- item deletion at every async barrier prevents recreation;
- kill switches checked at write, claim, and apply;
- no rollback to a hold-blind/revision-blind binary.

## Analytics Contract

Product analytics are aggregate-only. Allowed dimensions are fixed environment class, stage/outcome code, execution class, local/external destination class, consent-copy version, coarse duration/size/retry buckets, and stale-guard boolean.

Forbidden fields include item/source/video/account/request IDs, URL, title, language, transcript, prompt, output, text hash, provider endpoint, provider raw error, IP, user agent, cookie, token, and signed resource.

Per-item operational evidence lives in cascading, content-free receipt and attempt rows visible only through authenticated status paths.

## Council Acceptance Criteria

1. Transcript attachment produces an active hold and held job, with no claimable pending work.
2. Extension, item banner, status pill, and Digest panel all say AI has not started.
3. Both LLM and embedding processors, data scopes, boundaries, and current limits are visible before authorization.
4. Local-only and remote confirmation behavior follows Decision D3.
5. POST performs no network/provider work and returns queued only after the transaction commits.
6. One mutation ID and one exact binding create at most one effective job.
7. Interactive work cannot enter the nightly batch path.
8. Provider configuration drift stops work and requires renewed review.
9. Title remains unchanged on the manual transcript path.
10. Stale results cannot apply at any enrichment, batch, or embedding barrier.
11. Digest success survives indexing failure and index retry does not rerun enrichment.
12. Desktop, tablet, mobile, keyboard, screen-reader, 200% zoom, high-contrast, and reduced-motion journeys remain complete.
13. Production browser capture and processing remain denied.

## Deferred Decisions

- Replace the first-12,000-character digest with a representative or complete transcript summarization pipeline.
- Apply hold-first consent consistently to paste/upload/official transcript sources.
- Offer digest-only versus digest-plus-indexing choices.
- Permit elective re-enrichment of an already complete current revision.
- Support queued cancellation after a remote provider accepts work.
- Preserve a current digest while authorizing only a changed embedding provider.
- Add remembered global provider consent with an item-level override.

## Council Verdict

**Conditional go** for V1 artifacts, the synthetic prototype, and adversarial review.

**No-go** for implementation enablement until migration 026, sole-active-source enforcement, processing holds, and hold/revision gates exist in code and all shared enrichment, batch, and embedding writers honor them.

**No-go** for production browser transcript processing until a separate approval packet and code change supersede the existing production decision.
