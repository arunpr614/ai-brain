# Product Manager Agent Review: Item Recovery Manual Enrichment V1

**Date:** 2026-07-22

**Role:** Product Manager, AI Brain Product Council

**Review status:** Complete

**Package decision:** **NO-GO for implementation enablement or a live lab canary**

**Permitted next step:** Revise the Product Council, PRD, implementation plan, UX specification, and prototype to V2, then repeat adversarial and Product Council review

**Production decision:** Unchanged no-go

## 1. Executive Verdict

The V1 package has the right product direction. It preserves three distinct user choices, places enrichment in the Brain item instead of Chrome, identifies both the digest and embedding stages, preserves the item title, treats indexing failure as partial success, and keeps browser-visible transcript processing out of production.

It is not implementation-ready. Seven P0 defects remain in the contract:

1. The durable authorization does not bind all material terms the user reviewed.
2. The exact model input is not bound at review and authorization time.
3. The disclosure omits data that the current pipelines actually send, approved retention wording, and required broker routing details.
4. A lost HTTP response can lead the UI to claim that nothing started even after the transaction committed and a provider request became possible.
5. Provider or policy drift after hold release has no complete reauthorization transition, and the proposed copy can falsely say nothing was sent.
6. Generation and retry semantics are internally contradictory and do not prove that index-only retry can never call the digest provider.
7. The new embedding fingerprint is not connected to semantic retrieval, so a completed index can be queried with an incompatible embedding model.

The current code remains materially unsafe for this feature, but V1 correctly acknowledges most of that baseline. In current code, transcript repair immediately sets enrichment back to pending (`src/lib/repair/item-repair.ts:117-159`), the realtime worker claims any pending job (`src/lib/queue/enrichment-worker.ts:144-168`), the batch path independently selects pending items (`src/lib/queue/enrichment-batch.ts:107-165`), the generic route can run a provider inline and return raw output (`src/app/api/items/[id]/enrich/route.ts:58-98`), and enrichment and embedding apply without revision fencing (`src/lib/enrich/pipeline.ts:153-251`, `src/lib/embed/pipeline.ts:51-150`). Migration 026 and hold-aware worker enforcement therefore remain hard prerequisites, not documentation assumptions.

## 2. Review Method And Evidence

I compared:

- the V1 Product Council synthesis;
- the V1 PRD;
- the V1 implementation plan;
- the V1 UX specification;
- the V1 HTML prototype;
- the current-state audit;
- the original Product Manager input;
- current repair, transcript-source, enrichment route, status, worker, batch, prompt, embedding, retrieval, item UI, provider, and deletion code.

I also exercised the HTML prototype in headless Chrome at desktop and narrow mobile sizes. The rendered checks covered remote review, local authorization, provider change, indexing failure, 1440 x 1000, 390 x 844, and 320 x 700. These checks found no desktop page overflow, but found no dialog semantics, no `aria-describedby` on authorization controls, and page-level horizontal overflow at both tested mobile widths.

Citation shorthand used below:

| Short name | Package file |
| --- | --- |
| `product_council_v1.md` | `2026-07-22_ai_brain_item_recovery_manual_enrichment_product_council_v1.md` |
| `prd_v1.md` | `2026-07-22_ai_brain_item_recovery_manual_enrichment_prd_v1.md` |
| `implementation_plan_v1.md` | `2026-07-22_ai_brain_item_recovery_manual_enrichment_implementation_plan_v1.md` |
| `ux_spec_v1.md` | `2026-07-22_ai_brain_item_recovery_manual_enrichment_ux_spec_v1.md` |
| `ux_prototype_v1.html` | `prototype/2026-07-22_ai_brain_item_recovery_manual_enrichment_ux_prototype_v1.html` |
| `product_manager_agent_v1_input.md` | `2026-07-22_product_manager_agent_v1_input.md` |

Severity means:

| Rank | Meaning |
| --- | --- |
| P0 | Consent, privacy, exact-item integrity, or core product truth can fail. Blocks implementation enablement and live provider work. |
| P1 | The V2 contract remains incomplete, untestable, inaccessible, or operationally unsafe. Blocks V2 approval. |
| P2 | Important inconsistency or prototype/document gap that must be resolved before final package approval. |
| P3 | Clarity or polish correction with low immediate risk. |

## 3. P0 Findings

### P0-01: The accepted authorization is not bound to the complete reviewed plan

**Evidence**

- The original PM contract requires one server-verifiable plan binding copy version, purposes, both provider identities, endpoint classes, execution policy, coverage, approved data categories, manifest hash, environment, expiry, delete-by, item, source, and revision (`2026-07-22_product_manager_agent_v1_input.md:307-324`).
- The PRD repeats that consent includes purpose, limits, retention terms, manifest authorization, and copy version, and says each material change requires renewed review (`2026-07-22_ai_brain_item_recovery_manual_enrichment_prd_v1.md:88-99`, `343-355`, `379-390`).
- The implementation fingerprint includes only purpose, provider, model, local/remote class, endpoint identity, downstream identity, fallback policy, and prompt/index contract version (`2026-07-22_ai_brain_item_recovery_manual_enrichment_implementation_plan_v1.md:294-328`). It does not bind the `receives` categories in the same interface, consent-copy version, approved retention/delete-by wording, manifest hash/expiry, provider account or credential policy profile, or dispatch policy.
- The POST carries only revision, source ID, plan version, and two provider fingerprints (`implementation_plan_v1.md:393-405`).
- The receipt schema has the same omission (`implementation_plan_v1.md:160-178`).
- The implementation purpose values are `enrichment | semantic_index`, while the PRD's authorized purposes are `youtube_transcript_digest | youtube_transcript_semantic_index` (`implementation_plan_v1.md:300-311`; `prd_v1.md:321-328`).

**Why this blocks**

The user can review one retention, purpose, coverage, manifest, or consent-copy contract and have the transaction accept a materially different current contract if the two provider fingerprints remain unchanged. The immutable receipt then cannot prove what was authorized. Rechecking the current manifest inside the transaction is necessary but insufficient because it proves current permission, not identity with what the user saw.

**Required V2 revision**

1. Introduce one canonical `authorization_plan_fingerprint` or short-lived signed readiness token that binds every material term listed in the PRD.
2. Bind exact purpose enums, data categories per stage, digest limit, embedding coverage, local/external class, provider/model, downstream and fallback policy, non-secret provider-account policy identity, execution lane/policy version, consent-copy version, manifest hash/version, expiry, retention class, delete-by class, item, source, content revision, and the reviewed input fingerprint.
3. Store an immutable, content-free authorization-plan snapshot or normalized plan row and reference it from receipt, run, enrichment job, embedding job, and attempts.
4. Return display copy and the opaque token from one server service. Do not let the client reconstruct or independently combine plan fields.
5. Recompute and compare the full plan at authorization, each claim, before provider dispatch, and apply. A mismatch never substitutes a provider or silently adopts new terms.

**Required evidence**

- One-field-at-a-time drift tests for purpose, `receives`, coverage, copy version, retention, delete-by, manifest, downstream provider, fallback, endpoint class, provider account policy, model, and execution policy.
- A receipt audit test proving the accepted plan can be identified without transcript text, raw endpoint, credentials, or the private manifest document.

### P0-02: Review and authorization are not fenced to every actual model input

**Evidence**

- Council D6 says authorization verifies the input fingerprint, and D7 says identity covers title, author, duration, source type, body, source, revision, generation, provider plan, and contract version (`product_council_v1.md:116-142`).
- The POST and canonical request fingerprint do not contain an input fingerprint or opaque readiness token (`implementation_plan_v1.md:393-405`, `433-435`).
- The receipt schema does not persist an accepted input fingerprint (`implementation_plan_v1.md:160-178`).
- The plan first computes and persists the canonical input fingerprint when a worker claims the job, after the hold has been released and consent recorded (`implementation_plan_v1.md:510-521`).
- Current digest input includes a composed title that can add channel/author and duration (`src/lib/enrich/pipeline.ts:34-55`, `184-198`). Current embedding input includes the item title in every original-content and summary chunk (`src/lib/embed/pipeline.ts:81-105`). Those fields can change without a body-only content revision in the current model.

**Why this blocks**

Title, channel/author, duration, or source-type context can change after the review or click but before claim. The server would then process bytes the user did not review while still satisfying the same body revision and provider fingerprints. Computing a fingerprint only at claim silently authorizes the new metadata.

**Required V2 revision**

1. Compute a canonical digest-input fingerprint in the readiness projection before rendering consent.
2. Bind that fingerprint to the opaque readiness token, accepted plan, receipt, and run/job before releasing authority.
3. Include route item ID, exact active source ID, normalized source hash, content revision, source type, exact composed title string, title, author/channel, duration, and body hash. Define normalization and version it.
4. Recompute it in the authorization transaction and at claim/apply.
5. Create a separate index-input fingerprint after the digest is accepted. It must bind title, body, generated digest, content revision, enrichment generation, source, embedding space, and index contract.
6. Either increment a dedicated `processing_input_revision` for every model-input metadata change or make the readiness fingerprint the authoritative revision identity. Do not rely on a body-only counter.

**Required evidence**

- Change title, author, duration, source type, body, source hash, or active source at each boundary: after GET, after review opens, before POST commit, before claim, after provider response, and before apply.
- Assert zero provider call before claim when the accepted digest input changed, and zero derived apply for every in-flight mismatch.

### P0-03: The consent disclosure does not match the current provider payloads

**Evidence**

- The UX disclosure says the digest provider gets video title, source type, and up to 12,000 transcript characters; it says the embedding provider gets full transcript chunks and the digest (`ux_spec_v1.md:135-145`). The prototype renders the same list (`ux_prototype_v1.html:2827-2841`).
- Current digest composition also sends author/channel and duration inside `Original title` (`src/lib/enrich/pipeline.ts:34-55`; `src/lib/enrich/prompts.ts:49-65`).
- Current embedding sends title plus full body and title plus generated summary (`src/lib/embed/pipeline.ts:81-105`). The embedding disclosure omits title.
- The remote review is required to show approved retention/delete-by wording (`prd_v1.md:248-264`; `ux_spec_v1.md:161-182`), but the prototype review contains only provider rows, the generic data list, and queue behavior (`ux_prototype_v1.html:2909-2913`). No retention or delete-by statement is rendered.
- OpenRouter must name downstream provider and fallback behavior or remain blocked (`product_council_v1.md:68-77`; `ux_spec_v1.md:122-133`). The prototype shows only `OpenRouter`, a model string, and `External provider` (`ux_prototype_v1.html:2797-2802`, `2811-2824`).
- The local one-click path does not show retention/delete-by or queue behavior before its authorization click, despite the PRD requiring execution mode and retention for consent (`prd_v1.md:88-99`, `379-390`).

**Why this blocks**

This is not copy polish. The authorization is invalid if it omits actual transmitted data or a brokered destination. It is also not acceptable to obtain a one-click local authorization without showing all terms that the PRD says are material to consent.

**Required V2 revision**

1. Generate disclosure from the same typed payload descriptors used to build provider requests.
2. Digest copy must name title, channel/author, duration, source type, and the first 12,000 transcript characters while that remains the real contract.
3. Embedding copy must name title, chunked full transcript, and generated digest.
4. Remote plans must show direct provider or broker, downstream provider, fallback behavior, model, provider-account retention statement, and approved delete-by wording. Unknown routing blocks the action.
5. Separate provider retention from Brain storage, derived-output retention, backup limitations, and lab cleanup/delete-by.
6. The local inline path must show the complete plan, data, outputs, exclusions, retention, and background queue behavior without requiring a collapsed disclosure. Otherwise use the full review surface for local plans too.
7. Provider request tests must compare the actual serialized data categories with the disclosure fixture.

### P0-04: A transport failure can produce a false `Nothing was sent` assurance

**Evidence**

- The UX defines `Queue request failed` as `Enrichment did not start` and `Nothing was sent` (`ux_spec_v1.md:189-209`).
- The original memo likewise treats a network failure as proof that no authorization or job exists (`product_manager_agent_v1_input.md:489-494`).
- A client can lose the HTTP response after the SQLite transaction commits. At that point the hold is released, the job is pending, and a worker may dispatch before the client can distinguish that outcome.
- The implementation places the write flag and rate limit before the domain transaction and receipt replay (`implementation_plan_v1.md:378-391`). If a response is lost and the flag changes or the rate limit is reached, replay of the same mutation may return `503` or `429` instead of the original durable result.
- The prototype has only a timer-driven happy path and no unknown-outcome state (`ux_prototype_v1.html:3278-3299`).

**Why this blocks**

The UI can tell the user that nothing was sent while an authorized provider request is already possible or in progress. This violates the package's central trust promise.

**Required V2 revision**

1. Add `authorization_outcome_unknown` as a first-class client/effective state.
2. On fetch abort, timeout, connection loss, or unreadable response, do not return to held and do not say nothing was sent.
3. Reconcile using the same mutation ID through a receipt lookup/replay and current status GET. If reconciliation is unavailable, say: **Brain could not confirm whether enrichment started. Reconnect to check this item.**
4. After session and exact-origin checks plus bounded schema parsing, allow an existing receipt to replay before current write-disable and rate-limit gates. Kill switches still block new work and all claims/applies.
5. Specify how the client persists the mutation ID until a durable outcome is reconciled.

**Required evidence**

- Drop the connection immediately before commit, immediately after commit, and after worker claim.
- Repeat after write disable, execution disable, rate limiting, process restart, and page reload.
- Prove the UI never renders `Nothing was sent` without durable `dispatch_count = 0` evidence.

### P0-05: Provider/policy drift has no complete reauthorization path and unsafe copy

**Evidence**

- Initial authorization releases the exact hold and transitions the held job to pending (`implementation_plan_v1.md:437-452`).
- The state model permits `queued -> provider_review_required` and requires a new review (`prd_v1.md:409-443`).
- The only POST operations are initial release and generic current-stage retry (`prd_v1.md:463-480`; `implementation_plan_v1.md:160-178`). There is no operation for a newly reviewed plan after the hold is already released, no rule for superseding a live claim, and no rule for creating a new authorization generation without pretending to release the hold again.
- The UI and prototype use `Nothing was sent` for provider-plan change (`ux_spec_v1.md:248-253`; `ux_prototype_v1.html:2882-2884`). The implementation checks provider drift at apply too, so the same effective state can occur after a provider request was attempted.
- The status precedence puts feature/policy blocking and provider-plan mismatch ahead of execution state without considering whether dispatch already occurred (`implementation_plan_v1.md:617-634`).

**Why this blocks**

The user can reach a dead-end review action that the API cannot safely honor. If the system does honor it by mutating the existing row, it can overwrite a live generation or create a second provider request. The copy can also erase the fact that the old approved provider received or may have received the transcript.

**Required V2 revision**

1. Persist a durable provider-dispatch marker before every content-bearing request, with stage, attempt, accepted plan, and safe outcome class.
2. Split pre-dispatch and post-dispatch conflict states. Only pre-dispatch may say nothing was sent.
3. Define an explicit `reauthorize_and_queue` operation or a new immutable run resource. It records a new authorization plan, fences or waits out the old claim, supersedes the old run, and queues a new generation without reusing the old receipt.
4. Keep storage hold history separate from processing authorization state. A released storage hold cannot be treated as held merely to simplify reauthorization.
5. Define provider drift before claim, during digest, between digest and index, during index, and after ready.
6. For post-dispatch drift, use copy such as: **A request under the plan you approved was attempted. Brain did not apply the result because the plan changed. Review before another attempt.**
7. Policy expiry and kill-switch copy must use the same before/after-dispatch distinction.

### P0-06: Generation and stage retry semantics contradict each other

**Evidence**

- The implementation calls `items.enrichment_generation` monotonic and then says body replacement resets it to `0` (`implementation_plan_v1.md:123-138`).
- It says one current enrichment row per item and retries advance generation (`implementation_plan_v1.md:189-220`), then says manual retry advances generation (`implementation_plan_v1.md:548-554`).
- The API exposes one ambiguous `retry_current_enrichment` or `retry_current_stage` operation (`prd_v1.md:478-480`; `implementation_plan_v1.md:163-167`).
- The response table says a retry queues a new exact generation/stage (`implementation_plan_v1.md:410-425`), while index retry is required to use only a new embedding claim token and preserve digest/enrichment generation (`implementation_plan_v1.md:608-615`).

**Why this blocks**

A resettable generation can reuse an old identity. A generic retry can change stage between click and commit or accidentally create a new digest generation when the user selected `Retry semantic indexing`. The schema therefore does not yet prove the core partial-success promise.

**Required V2 revision**

1. Never reset a monotonic generation or high-water counter.
2. Separate `run_generation`, `digest_output_generation`, `embedding_index_generation`, and `attempt_number` or provide equivalently precise names.
3. Body/source replacement clears current-output pointers and advances content revision; it does not decrement or reuse generation values.
4. Automatic retry creates a new attempt and claim token under the same authorized run/stage generation.
5. Digest manual retry and semantic-index manual retry use different operations, expected stages, and expected generations.
6. Index retry keeps the accepted digest generation immutable and cannot invoke any LLM code path.
7. A materially changed input or plan creates a new reviewed run generation, not a retry.

**Required evidence**

- Property tests that generations never decrease or repeat across replacement, failure, retry, reauthorization, restart, and deletion/recreation.
- A provider spy proving every index-only retry produces zero digest-provider calls, including stale UI, double click, and concurrent-tab races.

### P0-07: Exact embedding authorization stops at write time, not retrieval time

**Evidence**

- The plan adds provider fingerprint to `embedding_jobs` and version numbers to chunks, but no embedding-space identity to chunks/vectors and no retrieval-path change (`implementation_plan_v1.md:230-259`, `574-606`).
- Current retrieval embeds a query with the currently configured provider and searches every vector row in the shared `chunks_vec` index (`src/lib/retrieve/index.ts:68-90`, `111-217`).
- A provider/model change can therefore compare a query vector from model B against stored vectors from model A, even when both have 768 dimensions.
- P0 disallows elective re-enrichment of completed revisions, while the status model treats provider drift as review-required. It does not define how a completed index becomes compatible again (`prd_v1.md:125-139`, `343-357`; `implementation_plan_v1.md:621-634`).

**Why this blocks**

The product promises `Ready for search and Ask`, but readiness is false if the query embedding and stored vectors are from different spaces. Dimension equality is not semantic compatibility. This also makes provider pinning incomplete end to end.

**Required V2 revision**

Choose and document one P0 strategy:

1. **Single pinned semantic space:** require the authorized embedding provider/model/index contract to equal the globally pinned retrieval space; block configuration changes until all affected content is reindexed under a separately approved plan.
2. **Partitioned spaces:** persist `embedding_space_fingerprint` on every chunk/vector mapping, embed a query once per permitted space, filter KNN candidates by that exact space before ranking, and merge results with a reviewed method.

V2 must also define completed-item behavior when only the digest provider changes, when the embedding provider changes, when the manifest expires, and when delete-by arrives. Historical digest validity, index compatibility, and permission to send content again are separate facts.

**Required evidence**

- Change embedding provider/model/index contract after a ready result and prove incompatible vectors are never queried or called ready.
- Cover library-wide search, item-scoped Ask, related items, manual-note chunks, legacy chunks, and mixed old/new indexes.

## 4. P1 Findings

### P1-01: The state model is not closed under its own failures and conflicts

The PRD transition graph does not define exits for `terminal_error`, `provider_review_required`, `content_changed`, `blocked`, deletion, session expiry, post-completion provider drift, or an unknown authorization outcome (`prd_v1.md:409-443`). It also represents digest and index failures with the same broad `retryable_error` state while the UI promises stage-specific recovery.

V2 must derive the UI from durable facts rather than one overloaded enum:

- authorization status and accepted plan;
- content/source/input identity;
- provider dispatch state;
- digest stage and accepted output generation;
- index stage and compatible embedding space;
- policy/feature state;
- retry eligibility and exact allowed operation.

Every effective state must have one meaning, allowed action, durable evidence, copy, and transition for refresh/restart. `reviewing_plan` and `queueing` may remain client overlays, but `authorization_outcome_unknown` requires reconciliation behavior.

### P1-02: The prototype does not validate the specified review or accessibility behavior

- The UX requires a desktop dialog and mobile sheet with focus trap, Escape close, and focus return (`ux_spec_v1.md:161-187`, `283-288`, `298-312`). V1 intentionally renders an inline panel instead (`ux_spec_v1.md:403-408`). Headless inspection found zero `dialog` or `role="dialog"` elements in desktop and mobile review states.
- The UX requires the authorization button to reference the disclosure (`ux_spec_v1.md:151-160`, `298-303`). Both local and remote authorization buttons lack `aria-describedby` (`ux_prototype_v1.html:2909-2913`).
- The prototype hard-codes the simulated mobile browser to `width: 390px` (`ux_prototype_v1.html:2306-2314`). At a 390 CSS-pixel viewport the document measured 399 pixels wide; at 320 it still measured 399 pixels wide. This fails the no-horizontal-scroll requirement (`ux_spec_v1.md:291-296`, `370-383`).

V2 must implement the actual dialog/sheet, labelled semantics, focus trap/return, Escape, inert background, disclosure association, and responsive `width: min(390px, 100%)` or equivalent. Repeat real-browser checks at 1440, 1024, 390, 320, and 200 percent zoom.

### P1-03: The prototype and UX test set omit required failure and recovery states

The toolbar exposes happy path, held, local, complete, provider changed, transcript changed, index failure, feature off, and production (`ux_prototype_v1.html:2484-2495`). It does not expose:

- authorization outcome unknown;
- definite pre-commit rejection;
- provider unavailable with automatic retry;
- digest validation failure;
- exhausted digest retry with manual retry;
- policy expiry before dispatch and after dispatch;
- session expiry;
- two-tab/no-op replay;
- already queued and already ready responses;
- provider change while a request is already in flight;
- incompatible completed embedding space.

The final digest prototype also renders one short paragraph and topic chips but omits category, key quotes, transcript-version label, and date required by the UX output contract (`ux_spec_v1.md:223-235`; `ux_prototype_v1.html:2861-2868`).

V2 prototype scenarios must be deterministic, individually addressable, and include every P0 state/copy branch. A timer-only happy path is not evidence for durable receipt semantics.

### P1-04: Manifest, retention, and production-denial services are asserted but not designed

The implementation says the authorization transaction validates manifest, expiry, retention, and purpose (`implementation_plan_v1.md:437-445`), but the provider-plan interface cannot carry display-safe retention copy or manifest authorization (`implementation_plan_v1.md:294-330`). The feature flags list also does not define one authoritative deployment-class resolver or the precise code-level rule that configuration cannot override production denial (`implementation_plan_v1.md:704-713`).

V2 must name the manifest schema and service, signature/hash verification, exact provider/account targets, purpose enums, retention/delete-by copy source, expiry clock rules, cleanup owner, deployment-class source, and precedence among production denial, manifest, UI/write/execution flags, and worker mode. Missing or ambiguous deployment class must fail closed. Add a complete negative matrix proving that production remains denied despite every flag and lab-manifest combination.

### P1-05: Migration mapping cannot establish truthful readiness for existing data

Migration 027 defaults `items.enrichment_generation` to `0`, maps legacy jobs to generation `1`, and only briefly says existing embedding jobs bind when integrity can be proven (`implementation_plan_v1.md:123-138`, `270-278`). Existing source-aware chunks use `0` for original source version and `enriched_at` for summary source version (`src/lib/embed/pipeline.ts:81-96`; `src/db/migrations/023_source_aware_chunks.sql:11-42`). Existing rows do not store the provider fingerprint needed to prove the new embedding contract.

V2 must provide a state-by-state migration table for pending, running, batched, done, error, existing chunks, and missing jobs. It must state which rows are provably current, which remain historical but unavailable to semantic retrieval, which are blocked for rebuild, and how already-enriched items receive a non-reused generation. No migration may infer provider identity that was never stored.

### P1-06: Replacing or repairing a held/authorized browser transcript has no product transition

V1 keeps paste/upload behavior on an explicit `legacy_scheduled` policy while browser capture uses `held_transcript` (`implementation_plan_v1.md:466-492`). It does not define what happens when an existing browser-held, queued, running, partially complete, or ready item is then edited through paste/upload, repaired again, or receives new source metadata.

V2 must define these cross-source transitions. Every replacement invalidates the old authorization and fences old claims. It must not allow a restricted browser source to become automatically processable merely because a later helper classifies the same text as a legacy paste. Add call-site tests for paste, upload, official caption, browser replacement, item title edit, deletion, and source supersession at every execution stage.

### P1-07: Lease expiry and provider timeout do not yet define duplicate-dispatch behavior

The plan introduces finite leases and stale reclaim but no required relation among provider timeout, lease duration, heartbeat, process pause, and reclaim (`implementation_plan_v1.md:510-523`, `715-733`). A lease can expire while a slow provider call is still active, allowing another worker to issue another content-bearing request. Claim tokens protect apply, not provider dispatch.

V2 must define the delivery guarantee honestly. At minimum, provider timeout must be shorter than lease plus safety margin, lease renewal must be specified for multi-batch embedding, reclaim must create a new attempt only after the old request is definitely timed out or explicitly treated as outcome-unknown, and duplicate provider attempts must be measured separately from duplicate applies. Do not promise exactly-once provider execution where the provider protocol cannot support it.

## 5. P2 Findings

### P2-01: Route reuse contradicts the audit and original PM contract without a formal resolution

The current-state audit says extending the existing route would preserve ambiguous semantics and recommends a run-oriented resource (`2026-07-22_current_state_audit.md:52-65`, `157-169`). The original PM memo says the new UI must not call the generic route (`product_manager_agent_v1_input.md:181-193`, `590-631`). Council D5 instead replaces the existing route because no current source caller uses it (`product_council_v1.md:105-115`).

The code search supports the narrow claim that no current UI invokes the POST, but operational and handover documents still describe it. V2 should prefer a dedicated `manual-enrichment-runs` resource because reauthorization and stage-specific retry are run concepts. If route reuse remains, add an explicit decision record that supersedes the audit and original non-goal, a repository-wide caller and operator-document inventory, `410` tests for every old shape/query, and a rollout compatibility note.

### P2-02: Local one-click authorization intentionally overrides the original PM requirement but lacks a resolution record

The original PM requirement opens a provider/privacy review before any release (`product_manager_agent_v1_input.md:249-275`, `530-540`). Council D3 permits one local click when complete copy is already visible (`product_council_v1.md:79-88`). This is a legitimate Council decision, not necessarily a defect, but V2 must mark the original requirement as superseded and state the evidence threshold for keeping the exception.

PM recommendation: retain one-click local authorization only if all material scope, retention, queue, and output copy is visible without expansion; the button is provider/boundary specific and disclosure-associated; and all moderated reviewers can explain that Hetzner is the Brain server, not the current device. Otherwise use the same review step for local and external plans.

### P2-03: Analytics, private operational evidence, and logs are not cleanly separated

The PRD's `Forbidden analytics/log fields` list bans item, source, mutation, and request identifiers (`prd_v1.md:530-542`), while Council explicitly permits private cascading per-item receipt and attempt rows (`product_council_v1.md:233-239`) and the implementation keys attempts to item/source/job identities (`implementation_plan_v1.md:224-228`). These can coexist, but the terms are currently ambiguous.

V2 must define three separate data classes: exported product analytics, local private operational database evidence, and file/console/error logs. Specify allowed fields, access, retention, deletion, aggregation, and privacy tests for each. Exact token counts and per-item attempt linkage belong only in the restricted operational class if approved.

### P2-04: Completion and held copy overstate historical facts

`No AI provider has received it` is only provable for this revision before any dispatch, not for the item for all time (`ux_spec_v1.md:112-120`). Feature-disabled and provider-changed projections can also occur after a request attempt. Prefer **AI processing has not started for this transcript version** when dispatch is durably zero. After any attempt, copy must name that an approved request was attempted and that stale output was not applied.

Completion copy should also retain bounded-input provenance for long transcripts, rather than relying on the earlier consent screen to prevent a later whole-video interpretation.

## 6. P3 Findings

### P3-01: Environment and product naming should be made unambiguous

- `Production denial is false only through a separately reviewed code change` is a confusing double negative (`prd_v1.md:167-183`). Replace it with: **The command is always denied in production until a reviewed code change removes that denial.**
- The package calls the product AI Brain while the prototype repeatedly labels it AI Memory (`ux_prototype_v1.html:2631-2678`). Use the current product name consistently or document the intentional brand label.
- Replace hard-coded local copy such as `Ollama processes...` with server-provided provider labels, while preserving **On this Brain server** and never saying **on this device**.

## 7. Contradiction Register For V2

| Topic | V1 statements | V2 resolution required |
| --- | --- | --- |
| Authorization plan | PRD binds purpose, retention, manifest, copy, and coverage; implementation persists two narrower provider fingerprints | One canonical accepted plan snapshot/fingerprint across status, receipt, run, claim, dispatch, and apply |
| Exact input | Council requires input verification during authorization; implementation first computes it at worker claim | Bind readiness input before the click and persist it in authorization/run |
| Generation | `monotonic` but reset to zero | Never decrement; separate content, run, output, index, and attempt identities |
| Retry | Generic current-stage retry plus index-only guarantee | Explicit digest and index retry operations with expected stage/generation |
| Provider drift | Review again after hold release, but no reauthorization operation | New authorization/run generation with safe supersession and dispatch-aware copy |
| Provider change copy | `Nothing was sent` can be used after an apply-time mismatch | Split before-dispatch and after-dispatch states |
| Completed provider drift | P0 forbids elective rerun, but provider fingerprint drift can make index non-current | Pin retrieval space or add reviewed reindex policy; preserve historical digest separately |
| Endpoint | Audit/original PM prefer a run resource; Council reuses generic route | Dedicated resource recommended, or formal supersession and complete compatibility proof |
| Confirmation depth | Original PM requires review; Council allows complete inline local consent | Explicitly supersede and validate the local exception |
| Analytics | PRD bans IDs in logs; implementation needs private per-item evidence | Define analytics, operational DB, and logs separately |

## 8. Required V2 State Model

V2 should persist facts and derive user-facing states. A single broad `blocked` or `retryable_error` value is not enough.

### Durable facts

| Fact | Minimum values |
| --- | --- |
| Content identity | item, active source, source hash, content revision, digest-input fingerprint |
| Storage hold | held, released, superseded, with exact binding and history |
| Authorization | absent, accepted, superseded, expired, rejected; accepted plan and copy version |
| Dispatch | none, claimed, request_started, response_received, outcome_unknown |
| Digest | not_started, queued, running, retry_wait, succeeded, terminal_error, stale_discarded |
| Index | not_started, queued, running, retry_wait, succeeded, terminal_error, stale_discarded |
| Retrieval compatibility | compatible, incompatible_space, unavailable |
| Policy | allowed, feature_disabled, policy_expired, production_denied, plan_incomplete |

### Effective states and transitions

```text
transcript_committed
  -> awaiting_permission

awaiting_permission
  -> reviewing_plan                         remote review or optional local review
  -> authorization_committing               explicit local authorization

reviewing_plan
  -> awaiting_permission                    cancel, close, or readiness expiry
  -> authorization_committing               explicit confirmation

authorization_committing
  -> queued                                 committed receipt + authorization + release + job
  -> awaiting_permission                    definite pre-commit rejection/failure
  -> authorization_outcome_unknown          transport outcome cannot be proven
  -> review_required_pre_dispatch           content/plan changed before commit
  -> blocked_pre_dispatch                   policy or production denial

authorization_outcome_unknown
  -> queued                                 receipt/status reconciliation proves commit
  -> awaiting_permission                    reconciliation proves no commit
  -> review_required_pre_dispatch           durable conflict receipt
  -> remains unknown                        connectivity/session prevents proof

queued
  -> digesting                              exact claim and dispatch
  -> review_required_pre_dispatch           material plan/input changed, dispatch_count = 0
  -> blocked_pre_dispatch                   policy disabled, dispatch_count = 0

digesting
  -> indexing                               digest applies and exact index job commits
  -> digest_retry_wait                      typed transient failure
  -> digest_terminal_error                  exhausted/non-retryable failure
  -> review_required_post_dispatch          plan/input changed after request start

indexing
  -> ready                                  exact compatible vectors committed
  -> index_retry_wait                       typed transient failure; digest remains visible
  -> index_terminal_error                   exhausted/non-retryable index failure
  -> review_required_post_dispatch          plan/input changed after request start

digest_retry_wait
  -> digesting                              automatic retry under same accepted run
  -> digest_terminal_error

index_retry_wait
  -> indexing                               automatic retry under same digest generation
  -> index_terminal_error

digest_terminal_error
  -> queued                                 explicit retry_digest with identical binding
  -> reviewing_plan                         changed binding requires new authorization

index_terminal_error
  -> indexing                               explicit retry_semantic_index, same digest
  -> reviewing_plan                         changed embedding plan requires new authorization

review_required_pre_dispatch | review_required_post_dispatch
  -> reviewing_plan                         only after old claim is fenced/superseded

ready
  -> ready                                  irrelevant digest-provider configuration change
  -> retrieval_incompatible                 embedding space no longer query-compatible
  -> awaiting_permission                    new eligible held transcript revision

any state
  -> deleted                                item deletion; no later recreation
```

The status response must identify whether `Nothing was sent` is safe to display. The UI must never infer that from a generic conflict code.

## 9. Exact V2 API And Data Inputs

### Readiness/status

Return:

- `contractVersion`;
- effective state and allowed operation;
- display-safe current transcript/version label;
- short-lived opaque `readinessToken`;
- canonical `authorizationPlanFingerprint`;
- consent-copy version;
- complete display plan for both stages;
- dispatch class (`none` versus attempted), never provider raw detail;
- digest and index stage, generations, retry eligibility, and safe code;
- retrieval compatibility;
- typed blocked reason and timing class.

Do not return transcript text, body/text hashes, raw endpoint, credentials, claim token, private manifest, or legal approval ID.

### Commands

Use explicit operations:

```json
{
  "contractVersion": "manual-enrichment-v2",
  "mutationId": "<uuid>",
  "operation": "authorize_and_queue | reauthorize_and_queue | retry_digest | retry_semantic_index",
  "readinessToken": "<opaque short-lived token>",
  "consentCopyVersion": "<fixed version>",
  "expectedStage": "<required for retry operations>"
}
```

The server re-derives and compares all authority. The token is a binding aid, not the authority by itself.

### Data model

V2 should prefer immutable `manual_enrichment_runs` plus attempt rows over repeatedly repurposing one mutable job row. At minimum persist:

- run ID and never-reused run generation;
- exact item/source/content/input identities;
- accepted authorization-plan ID/fingerprint and copy version;
- superseded run ID where applicable;
- separate digest and index stage state;
- separate attempt number and claim token per stage;
- provider-dispatch marker and safe outcome;
- accepted digest generation;
- embedding index generation and embedding-space fingerprint;
- safe error code and timestamps.

`items.enrichment_generation` must be monotonic if retained. Add an explicit `enriched_content_revision` or equivalent current-output binding rather than resetting the counter.

## 10. Required V2 Copy

| Situation | Required direction |
| --- | --- |
| Held, no prior dispatch for this revision | **Transcript added. AI processing is paused.** AI processing has not started for this transcript version. |
| Local authorization context | Name both local processors, every sent field, retention/storage terms, background queue, exact revision, and Ask exclusion inline. |
| Remote review | Name item/transcript, direct or brokered destinations, fallback, actual sent fields, provider and Brain retention/delete-by, outputs, queue, exclusions, and exact scope. |
| Authorization committing | **Starting enrichment...** Securing this transcript version and creating one durable job. |
| Outcome unknown | **Brain could not confirm whether enrichment started.** Reconnect to check this item. |
| Definite pre-commit failure | **Enrichment did not start.** The transcript is unchanged. |
| Plan changed before dispatch | **Provider details changed before processing started.** Nothing was sent for this attempt. |
| Plan changed after request start | **The approved provider request was attempted, but Brain did not apply the result because the plan changed.** |
| Digest terminal error | **AI enrichment did not finish.** The transcript remains attached. Retry only if the displayed plan is still current. |
| Index terminal error | **AI digest ready. Search indexing needs attention.** Retrying the index will not call the digest provider again. |
| Ready | State the digest's bounded coverage when relevant and the exact compatible semantic-index provider. Do not imply a complete-video summary. |

## 11. Required V2 Test Additions

The existing V1 matrix is broad but must add named tests for:

1. Every authorization-plan field drifting independently.
2. Title, author, duration, source type, source hash, and body changing at every boundary.
3. Response loss before and after transaction commit, followed by flag change, rate limit, restart, reload, and receipt replay.
4. Provider/manifest/copy change before claim, after dispatch marker, after response, before apply, between digest and index, and after ready.
5. Explicit reauthorization while an old claim is live, expired, or outcome-unknown.
6. Never-decreasing generations across all mutation and retry paths.
7. Wrong-stage retry, stale UI retry, two-tab retry, and index retry with a digest-provider spy.
8. Embedding provider/model/index-contract change and mixed-space retrieval across Search, Ask, and Related.
9. Local endpoint redirect and endpoint-classification tests so **On this Brain server** cannot follow a content-bearing redirect to an external host.
10. Held/queued/running/partial/ready browser items replaced through paste, upload, official caption, browser recapture, or metadata edit.
11. Pre-dispatch versus post-dispatch copy assertions for provider drift, policy expiry, kill switch, and deletion.
12. Migration fixtures for every legacy job/chunk state without inferring missing provider provenance.
13. Real dialog/sheet semantics, Escape, trap/return, `aria-describedby`, live-region deduplication, and no focus theft.
14. Real-browser geometry at 1440 x 1000, 1024 x 768, 390 x 844, 320 x 700, and 200 percent zoom, with zero page-level horizontal overflow.
15. Prototype scenarios for unknown outcome, digest failure, terminal retries, provider unavailable, session expiry, policy expiry, duplicate/no-op, and post-dispatch conflict.
16. Production-negative tests against every flag, manifest, environment alias, legacy route, and old worker mode.

## 12. Rollout And No-Go Revision

Keep the V1 rollout sequence, with these additional gates:

1. No fixture implementation approval until P0-01 through P0-07 are resolved in mutually consistent V2 artifacts.
2. No real provider execution until migration 026 exists in code and every current worker/route is proven hold-aware and revision-fenced.
3. No local one-click test until complete inline consent copy is generated by the authoritative plan service.
4. No external canary until unknown-outcome reconciliation and post-dispatch copy pass deterministic tests.
5. No `ready` state until retrieval proves embedding-space compatibility.
6. No provider configuration change in canary without the approved reauthorization/reindex strategy.
7. No live canary while any 320-pixel, keyboard, screen-reader, dialog/sheet, or 200 percent zoom P0/P1 defect remains.
8. Production remains denied by code. A manifest, flag, legal approval ID, or environment variable cannot override it.

Immediate stop conditions should add false `Nothing was sent` copy, unresolved authorization outcome, incompatible-vector retrieval, and a retry that calls the wrong provider stage.

## 13. Document-By-Document V2 Inputs

### Product Council V2

- Add decisions for complete authorization-plan identity, readiness input identity, unknown outcomes, dispatch-aware conflicts, immutable reauthorization runs, retry generations, and embedding-space compatibility.
- Record the explicit disposition of the original PM's universal-review recommendation and run-resource recommendation.
- Do not mark the package implementation-ready until every P0 has a named owner and acceptance test.

### PRD V2

- Replace the current state graph with the closed durable-facts/effective-state model above.
- Add unknown-outcome, post-dispatch conflict, completed provider drift, retrieval compatibility, source replacement, and explicit stage-retry requirements.
- Correct the data inventory to include channel/author, duration, and title in embedding chunks.
- Separate provider retention, Brain retention/backups, and lab delete-by.
- Replace absolute historical `No provider received it` claims with revision- and dispatch-qualified copy.

### Implementation Plan V2

- Add the complete authorization plan/readiness token schema and service.
- Persist accepted input and plan identity before hold release.
- Replace resettable/ambiguous generation and retry rules.
- Add immutable reauthorization/supersession semantics and dispatch markers.
- Connect embedding-space identity to retrieval, not only job apply.
- Add exact manifest/deployment resolver design, legacy migration mapping, source replacement transitions, and lease/timeout guarantees.
- Resolve route naming with a formal decision and compatibility inventory.

### UX Specification V2

- Add copy and recovery for unknown outcome and pre/post-dispatch conflicts.
- Make local consent complete without expansion or use the full review surface.
- Add terminal digest/index, session, policy, provider-unavailable, no-op, and retrieval-incompatible states.
- Define historical digest provenance separately from current index compatibility.

### Prototype V2

- Implement the actual desktop dialog and mobile sheet.
- Remove fixed-width mobile overflow.
- Associate authorization controls with the disclosure.
- Render every P0 state and the full output contract.
- Show OpenRouter downstream/fallback and approved retention/delete-by fixtures.

## 14. Open Product Decisions

These decisions must close before V2 approval:

1. Will local-only processing keep the one-click exception after complete inline disclosure testing, or will all plans use a review step?
2. Will the product use a dedicated manual-enrichment run resource, or formally replace the legacy route?
3. Is semantic retrieval a single globally pinned embedding space or a partitioned multi-space system?
4. Does provider drift after a completed digest preserve the digest as current historical output while only the index becomes incompatible?
5. Is embedding-only reauthorization after completed-provider drift promoted from P1 to P0, or are provider changes blocked while P0 indexes exist?
6. What exact provider-account retention language and Brain backup/delete-by language can be shown for local and lab plans?
7. What source-replacement policy applies when a browser-held item is later repaired by paste/upload?

## 15. Final Product Manager Position

The package should advance to V2 documentation and prototype work, but it should not advance to enabled implementation or a live provider canary.

The central V1 idea remains sound: a retained transcript is not processing consent, and one explicit item-level action can authorize a digest plus semantic index. To make that promise real, V2 must bind the exact reviewed input and complete plan before release, represent uncertain and post-dispatch outcomes truthfully, make retries and generations stage-safe, and carry embedding identity all the way through retrieval. Until those corrections are proven, the button can still authorize different bytes or terms than the user saw, report a false privacy outcome, or call an index ready when Search and Ask cannot safely use it.
