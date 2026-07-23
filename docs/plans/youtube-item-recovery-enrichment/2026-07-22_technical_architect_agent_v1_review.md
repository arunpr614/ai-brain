# Technical Architect Review: Item Recovery Manual Enrichment V1

**Date:** 2026-07-22
**Role:** Technical Architect, Product Council
**Review scope:** Complete V1 product council, PRD, implementation plan, UX specification, HTML prototype, current-state audit, the original Technical Architect memo, the final YouTube DOM capture V2 plan, and the current repository implementation
**Decision:** **No-go for implementation enablement. Conditional go for a V2 rewrite that closes every P0 and P1 below.**

**Citation key:** `Council V1`, `PRD V1`, `Plan V1`, `UX V1`, `Prototype V1`, `Audit`, `Original memo`, and `Capture V2` refer to the uniquely named reviewed artifacts in this directory or the sibling `youtube-dom-capture` directory. Citations written with a leading `...` retain the unique filename suffix while shortening that common path.

## 1. Executive Assessment

The V1 package gets the central product boundary right: transcript attachment and downstream model processing are separate actions; the HTTP command is queue-only; hold release and job creation are atomic; digest and indexing are separate durable stages; browser-transcript processing remains production-denied; and the current `/api/items/:id/enrich` URL should be retained while its unsafe legacy contract is replaced.

The package is not yet implementation-ready. Five architecture blockers remain:

1. The only upstream manifest explicitly authorizes **no downstream processing**, while V1 assumes a processing-authorizing manifest that it never defines.
2. The final click does not bind the actual metadata sent to providers or the complete disclosure/policy terms the user reviewed. V1 first establishes the input fingerprint at worker claim, which is too late.
3. The upstream live-lab contract requires all background workers to be disabled, while V1 needs interactive enrichment and embedding workers but defines no isolated worker mode. The proposed embedding job also has no execution lane.
4. Exact-version writes do not make exact-version reads safe. Current Ask, semantic retrieval, and Related code can consume stale non-note vectors, and V1 does not include those readers in the change.
5. Migration 027 is sequenced before the code that can read its rebuilt queue tables. Because migrations auto-apply at application startup, the proposed PR order can break the currently deployed binary even with feature flags off.

Several P1 issues are also material: policy expiry at every asynchronous barrier, ambiguous network outcomes, retry-operation drift, phase-insensitive status/copy, incomplete provider disclosure, an unenforced output contract, source/segment integrity, lease semantics, origin validation, rollback behavior, legacy index treatment, and prototype claims that are contradicted by actual network requests.

The original Technical Architect memo correctly identified most queue and stale-write risks, but V1 also carries forward two assumptions that the code review disproves: persisting the canonical input fingerprint at claim is not sufficient to bind the user's click, and `isExactSameOrigin()` is not an adequate trusted-origin primitive in its current forwarded-header form. Both must be corrected in V2, not defended as prior decisions.

## 2. Severity Rubric

| Severity | Meaning for this package |
| --- | --- |
| **P0** | The design can violate the consent, containment, exact-version, or deployability boundary. V2 cannot be approved without a concrete resolution and testable no-go gate. |
| **P1** | A likely correctness, security, privacy, recovery, or material UX failure. Must be resolved before implementation enablement; may be implemented after the P0 foundation within the same gated program. |
| **P2** | Contract ambiguity, sequencing weakness, or incomplete coverage likely to cause rework or inconsistent behavior. Must be made explicit in V2. |
| **P3** | Documentation/prototype polish or lower-risk consistency issue. Fix while producing V2 and its evidence package. |

## 3. Findings

### P0-1. No artifact currently authorizes downstream processing

**Evidence**

- The final capture plan permits `browser_visible_transcript` only in lab/test/development, with `processing mode = hold` (`docs/plans/youtube-dom-capture/2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v2_final.md:590-598`).
- Its private manifest says `"downstream_processing": "none"`, `"mode": "hold"`, and `"approved_providers": []` (`...implementation_plan_v2_final.md:643-647`).
- It says V0.1 creates only held rows and exposes no release UI/API (`...implementation_plan_v2_final.md:733`, `839-847`).
- V1 nevertheless proposes a manifest-authorized lab canary (`2026-07-22_ai_brain_item_recovery_manual_enrichment_product_council_v1.md:169-180`; PRD `:548-566`) and says the authorization transaction validates manifest, expiry, retention, and purpose (`2026-07-22_ai_brain_item_recovery_manual_enrichment_implementation_plan_v1.md:439-450`). No V1 artifact defines a new processing manifest schema, loader, decision record, or relationship to the capture manifest.

**Failure mode**

An implementation could treat the capture approval as permission to process even though the authoritative capture artifact says the opposite. Alternatively, each developer could invent a different interpretation of "manifest-authorized," making the consent receipt unauditable and expiry/delete-by behavior inconsistent.

**Required V2 revision**

Define a second, private, exact-target authorization artifact named `manual_transcript_enrichment_manifest_v1`; do not reinterpret or mutate the historical capture manifest. Its validated fields must include:

- schema/run/approval identifiers and exact non-production deployment/data-root identity;
- the capture-manifest content hash and capture policy decision being extended;
- exact target identity and active transcript source/text hash;
- rights basis;
- allowed purpose IDs `youtube_transcript_digest` and `youtube_transcript_semantic_index`;
- exact digest and embedding provider-plan fingerprints;
- prompt/index contract versions and consent-copy version;
- data categories and coverage limits for each purpose;
- downstream provider and fallback policy;
- provider-retention policy version;
- issued, not-before, expires, and delete-by times;
- cleanup owner and command/verification IDs.

Add a strict private loader with ownership/mode/symlink/data-root checks equivalent to the capture manifest. Persist a server-generated `content_processing_policy_decision` linked to the capture policy decision and the processing manifest hash. The browser capture manifest's `downstream_processing=none` must remain true and must fail closed unless the separate processing decision is present and current.

**Acceptance gate**

No live provider call until a synthetic example, private schema, loader tests, exact-target decision record, expiry tests, and cleanup rehearsal exist. A capture manifest by itself must always return `processing_not_authorized`.

### P0-2. The click does not bind the exact reviewed data or disclosure terms

**Evidence**

- PRD ME-F07 requires the final action to bind item, source, revision, **input fingerprint**, provider plan, purposes, limits, manifest, and copy version (`...prd_v1.md:381-401`).
- The PRD request actually carries only revision, source, provider-plan version, and two provider fingerprints (`...prd_v1.md:463-476`). The implementation request has the same omission (`...implementation_plan_v1.md:393-405`).
- The implementation request fingerprint hashes only those request fields (`...implementation_plan_v1.md:433-435`).
- The receipt columns omit accepted input fingerprint, authorization/disclosure fingerprint, purposes, limits, retention/delete-by, manifest hash, and copy version (`...implementation_plan_v1.md:156-178`).
- The provider fingerprint tuple omits received-data categories, coverage, retention, manifest, and copy version (`...implementation_plan_v1.md:294-328`), even though the PRD says changes to any of those require renewed review (`...prd_v1.md:343-357`).
- The digest prompt really includes source type, item title, author/channel, duration, and body (`src/lib/enrich/pipeline.ts:43-55`, `184-198`). Embedding really sends the title prefixed to every full-body and summary chunk (`src/lib/embed/pipeline.ts:57-96`). `content_revision` covers only body changes.
- V1 first computes and persists the enrichment input fingerprint at worker claim (`...implementation_plan_v1.md:510-521`). That proves what the worker saw, not what the user reviewed. The original memo made the same late-binding mistake (`2026-07-22_technical_architect_agent_v1_input.md:805-810`).

**Failure mode**

Title, author, duration, data-scope copy, retention terms, or manifest authorization can change after status/review but before POST or claim. The server can then authorize and send a materially different payload without detecting that the user reviewed an older one. Computing a fresh fingerprint at claim silently blesses the changed data.

**Required V2 revision**

The status read model must return two opaque, server-generated values:

1. `authorizationInputFingerprint`: hash of the exact current provider-ready source/context tuple.
2. `authorizationContextFingerprint`: hash of the complete material disclosure/policy tuple.

The POST must echo both values plus `consentCopyVersion`. The authorization transaction must recompute both under the writer lock, reject a mismatch, and persist the accepted values in an immutable authorization snapshot and the job. Claims may only **compare** those accepted fingerprints; they must never establish authorization identity.

Canonical enrichment input V1 must include, with length-prefix encoding or canonical JSON and an explicit contract/version prefix:

```text
item_id
source_type
title
author (including null)
duration_seconds (including null)
body
active transcript source id
source text/integrity hash
content revision
enrichment job generation
prompt contract version
digest coverage rule
```

Canonical authorization context must include:

```text
purpose ids
provider/model for each stage
local/remote boundary
normalized endpoint identity hash
downstream provider and fallback policy
received-data categories
digest and index coverage contracts
provider retention policy/version
manifest schema/hash/expiry/delete-by
consent copy version
```

On successful digest apply, create the embedding job in the same transaction with an `expected_embedding_input_fingerprint` derived from the exact title, body, newly applied summary, chunker/index contract, content revision, enrichment generation, source identity, and accepted embedding plan. Embedding claim again compares rather than establishes that identity.

**Acceptance gate**

Deterministic tests change title, author, duration, body, source/segments, each provider field, each data category, coverage, retention, manifest, and copy version between GET-review, POST, claim, provider response, and apply. Every changed case must make zero unauthorized provider calls or discard a post-dispatch result with truthful evidence and copy.

### P0-3. The required live-lab worker cannot be started without violating upstream containment

**Evidence**

- The upstream plan requires live lab to use `BRAIN_BACKGROUND_WORKERS_MODE=disabled` and proves that enrichment, embedding, note-index, transcript-recovery, and batch workers do not start (`...youtube_dom_capture_implementation_plan_v2_final.md:602-616`, `841-845`).
- Current startup unconditionally starts backup, enrichment, transcript recovery, note indexing, and batch scheduling (`src/instrumentation.ts:63-71`). There is no dedicated embedding worker yet.
- V1 says execution will later be enabled (`...implementation_plan_v1.md:843-855`) and lists `BRAIN_BACKGROUND_WORKERS_MODE` as "disabled/lab-specific," but never defines a state machine or amends the upstream invariant (`...implementation_plan_v1.md:704-713`).
- Enrichment has explicit interactive/scheduled lanes, but the proposed `embedding_jobs` shape has no execution lane (`...implementation_plan_v1.md:230-248`). A lab embedding worker could therefore consume unrelated pending library content.

**Failure mode**

Turning workers on for one approved transcript can claim unrelated enrichment, embedding, notes, recovery, or batch backlog from the lab database. Leaving workers disabled means the user receives a durable job that can never progress. Either outcome contradicts the V1 experience and the upstream containment contract.

**Required V2 revision**

Amend the upstream plan through review and define an allowlisted mode, for example:

```text
BRAIN_BACKGROUND_WORKERS_MODE=disabled
BRAIN_BACKGROUND_WORKERS_MODE=standard
BRAIN_BACKGROUND_WORKERS_MODE=manual-transcript-lab
```

`manual-transcript-lab` may start only:

- the interactive enrichment claimant constrained to accepted manual-transcript authorizations; and
- the interactive embedding claimant constrained to jobs produced by those authorizations.

It must not start scheduled enrichment, batch submit/poll, note indexing, transcript recovery, or generic embedding. Add `execution_lane = interactive|scheduled` to `embedding_jobs` with a constraint tying interactive rows to an accepted authorization. Boot must fail closed for unknown/conflicting modes. The status action must be unavailable when no permitted runner exists, except in a dedicated receipt-only fixture test mode that is visibly identified as such.

**Acceptance gate**

A startup matrix seeds one pending job of every queue class and proves that manual-lab mode claims only the exact authorized interactive digest/index pair. Standard and disabled modes retain their reviewed behavior. Production denial wins in every combination.

### P0-4. Stale vectors remain eligible for Ask, retrieval, and Related

**Evidence**

- V1 correctly versions `original_content` chunks by content revision and `ai_summary` chunks by enrichment generation (`...implementation_plan_v1.md:252-259`) and makes exact chunk integrity part of the item status projection (`...implementation_plan_v1.md:617-644`).
- Current semantic retrieval selects all non-manual-note chunks without checking item content revision, enrichment generation, embedding job, provider fingerprint, or index contract (`src/lib/retrieve/index.ts:115-217`). Its pre-prompt eligibility recheck only handles manual-note generations (`src/lib/retrieve/index.ts:223-259`).
- Related loads every non-manual-note vector and builds centroids without current-generation checks (`src/lib/related/index.ts:64-108`).
- Ask uses the manual-note-only filter and only rechecks manual-note citations before persistence (`src/app/api/ask/route.ts:112`, `151`).
- Current item readiness treats any chunks plus a done embedding job as ready (`src/lib/items/status.ts:25-50`). V1 updates that status helper but omits the semantic readers from its implementation sections and test matrix. The original memo also omitted these readers from its affected-file map (`2026-07-22_technical_architect_agent_v1_input.md:1225-1283`).

**Failure mode**

The UI can truthfully say a stale index is not current while Ask, search, or Related still retrieves and exposes it. A transcript replacement during an Ask stream can also produce or persist an answer grounded in a superseded transcript even when stale writes are correctly rejected.

**Required V2 revision**

Create one reusable `current_semantic_sources` eligibility query/view and use it in:

- `src/lib/retrieve/index.ts`;
- `src/lib/related/index.ts`;
- `src/app/api/ask/route.ts` and `src/lib/ask/generator.ts`;
- `src/lib/items/status.ts`; and
- any search endpoint or citation hydrator that reads `chunks`/`chunks_vec` directly.

Eligibility for browser transcript content must require:

- item/source still current and item not deleted;
- `original_content.source_version = items.content_revision`;
- `ai_summary.source_version = items.enrichment_generation`;
- exact done embedding job for both versions, source, provider fingerprint, and index contract;
- chunk/bridge/vector integrity; and
- retention/delete-by still permits derived-data use.

Recheck the same eligibility immediately before constructing an Ask prompt and before persisting/returning a completed answer. Either transactionally purge stale vectors on every invalidation or filter them everywhere; V2 should do both as defense in depth.

**Acceptance gate**

Seed current and stale original/summary vectors for the same and different items. Prove stale rows are absent from semantic search, scoped Ask, library Ask, citations, and Related before and after a mid-stream revision change. A current control must still retrieve.

### P0-5. Migration 027 and the PR sequence are not deployable as written

**Evidence**

- PR-1 applies migration 027 and rebuilds provider usage, receipts, enrichment jobs, attempts, and embedding jobs; the current consumers are not updated until PR-4 through PR-6 (`...implementation_plan_v1.md:827-839`).
- The migration plan renames/removes current fields such as `last_error`, adds required revision/generation fields, changes queue states, and drops the current embedding trigger (`...implementation_plan_v1.md:189-250`).
- Current route and worker SQL still read/write `last_error` and use default-only inserts (`src/app/api/items/[id]/enrich/route.ts:109-133`; `src/lib/queue/enrichment-worker.ts:128-181`). Current embedding depends on the trigger and updates the old job shape (`src/lib/embed/pipeline.ts:165-217`; `src/db/migrations/006_embedding_jobs.sql:24-39`).
- The application automatically discovers and runs every unapplied SQL migration during startup (`src/db/client.ts:101-170`). Feature flags do not prevent schema application or old SQL from executing.

**Failure mode**

Merging/deploying PR-1 can make the current route, worker, status endpoint, batch path, or embedding path fail immediately. "Flags off" does not provide binary/schema compatibility, and the proposed later PRs cannot repair a binary that already fails on the migrated database.

**Required V2 revision**

Replace the sequence with explicit expand/migrate/contract phases:

1. **Containment first:** implement migration 026 and unconditional hold/revision gates in code compatible with the old schema.
2. **027 expand:** add nullable/defaulted columns and new tables while preserving old columns, states, and trigger behavior. Deploy code that can read both shapes with all new product flags off.
3. **Dual-write/backfill:** update every route, worker, batch path, embed path, status/read path, repair/capture writer, and deletion path. Backfill exact rows under a drained-worker preflight. Prove old and new projections agree.
4. **Cut over:** enable new readers/writers only after compatibility tests and a production-shaped restore rehearsal.
5. **027 contract (later migration):** rebuild/drop old columns, states, and trigger only after all rollback binaries are blocked or patched and every consumer has moved.

If an additive shape cannot express the constraints safely, migration and **all** affected consumers must land as one non-partially-deployable change behind a startup compatibility check. Do not advertise independent mergeable PRs that are not independently bootable.

**Acceptance gate**

Publish and test a binary/schema compatibility matrix for old binary + old DB, transition binary + expanded DB, new binary + expanded DB, and new binary + contracted DB. The release tool must refuse unsupported combinations before process startup.

### P1-1. Policy expiry, delete-by, and post-authorization drift are not fenced at every barrier

V1 validates manifest/expiry during authorization, but the worker claim lists do not explicitly persist or compare the processing decision, `not_after_ms`, or `delete_by_ms`; the executive apply gate list also omits them (`...implementation_plan_v1.md:15-26`, `510-546`, `580-615`). A job can sit queued while an approval expires, then send content later. The status precedence mentions policy, but a read projection is not an execution gate.

**V2 input:** persist `processing_policy_decision_id`, manifest hash, `not_after_ms`, and `delete_by_ms` on the immutable authorization and both jobs. Check them in authorization, immediately before provider dispatch, between embedding batches, and at apply. Default policy should require the provider deadline plus safety margin to fit before `not_after_ms`; no apply occurs at/after the hard cutoff. The exact upstream cleanup command must delete the item, vectors, receipts, jobs, and attempts through the authoritative deletion service at delete-by. Test expiry before POST, after queue, after claim, between provider batches, after response, and during cleanup.

### P1-2. Transcript UI identity and provider input identity are not demonstrably the same

`transcript_sources.text_sha256` and ordered segment hashes exist (`src/db/migrations/018_transcript_policy_sources.sql:46-77`; `019_transcript_segments.sql:6-20`), but V1 does not define their immutability or the canonical comparison between the segment text shown to the user and `items.body` sent to providers. Saying "source/body hash agreement" without an algorithm is not a contract.

**V2 input:** define `transcript-integrity-v1` over normalized ordered segment tuples and the exact canonical provider body. Make source content and segments immutable after insertion except status transition/cascade, or recompute and compare the full integrity hash at GET, POST, claim, and apply. Any mismatch is `source_integrity_changed`, never a repair-in-place under an existing authorization.

### P1-3. Retry operations contradict each other and are not stage-safe

The PRD names `retry_current_enrichment` (`...prd_v1.md:478-480`); the receipt schema names `retry_current_stage` (`...implementation_plan_v1.md:162-178`); the response says `current_stage_retried` (`:412-425`); and UX promises index-only retry (`...ux_spec_v1.md:203-205`, `237-246`). A generic retry can accidentally rerun the digest or reuse authorization after an embedding-plan change.

**V2 input:** use three explicit commands:

| Operation | Eligible state | Durable effect |
| --- | --- | --- |
| `release_transcript_and_enrich` | Exact held current transcript | Release hold and queue digest generation. |
| `retry_enrichment` | Exact digest terminal/retryable error, unchanged authorization context | Increment digest job generation; digest may call provider again. |
| `retry_indexing` | Current digest applied, exact index error, unchanged embedding authorization | Increment embedding job generation only; zero digest calls. |

Each retry includes the expected current stage generation or an opaque processing-state fingerprint. If any material plan/policy binding changed, return `provider_review_required`; because embedding-only reauthorization is deferred, V2 must state whether the reviewed fallback reruns the full chain or remains unavailable. Copy must not promise "digest will not be regenerated" after plan drift.

### P1-4. The status model conflates server truth, client overlays, result availability, and action availability

PRD ME-F17 says status exposes reviewing and queueing (`...prd_v1.md:399`), while the implementation calls `reviewing_plan` client-only and omits `queueing` from server states (`...implementation_plan_v1.md:345-364`). Its projection evaluates feature/policy blocking before exact ready output (`:621-634`), so disabling a flag or changing current provider config can make an already-created digest/index appear blocked instead of preserving its immutable provenance. It also cannot distinguish provider drift before versus after dispatch.

**V2 input:** return orthogonal fields:

```text
serverState: awaiting_permission | queued | running | partial | ready | error | blocked
stage: none | digest | semantic_index
resultState: none | digest_current | digest_and_index_current
allowedAction: authorize | retry_enrichment | retry_indexing | review_plan | null
blockedReason: allowlisted code | null
dispatchState: never_dispatched | dispatched | unknown
retryClass: automatic | explicit | terminal | null
```

`reviewing_plan`, `submitting`, and `confirmation_unknown` are client overlays only. Feature/config drift blocks future actions or unfinished stages; it does not erase a current completed result. Retention deletion is handled by cleanup, not by pretending an existing result never existed.

### P1-5. Network failure copy makes a claim the client cannot know

The UX spec says a queue request failure means "Nothing was sent" (`...ux_spec_v1.md:197-199`). A connection can fail after the transaction committed and after a worker claimed the job but before the response reached the browser. Reusing the mutation ID is correct, but the UI needs an uncertainty state; the prototype does not model one.

**V2 input:** on timeout/network loss, show **"We could not confirm whether enrichment was queued. Checking Brain..."** Retain and replay the same mutation ID, then poll the durable read model. Do not offer a fresh mutation ID or claim no provider work occurred until the server returns a definitive rejected receipt/current held state. Authenticate and validate replays before rate limiting, and exempt exact known replays from the novel-mutation budget. Add a response-lost-after-commit test where the worker starts before the client reconciles.

### P1-6. Disclosure and conflict copy do not match the actual payload or dispatch phase

The prototype says the digest receives title, source type, and 12,000 transcript characters, and embedding receives transcript plus digest (`...ux_prototype_v1.html:2827-2840`). Actual digest input also includes author/channel and duration, while every embedding chunk includes title (`src/lib/enrich/pipeline.ts:43-55`; `src/lib/embed/pipeline.ts:84-96`). The prototype's OpenRouter state does not name Anthropic as downstream or say fallback is disabled (`...ux_prototype_v1.html:2789-2808`). It omits retention/delete-by entirely. "No AI provider has received it" is historically too broad, and "Nothing was sent" is false when drift is discovered after dispatch.

**V2 input:** disclose exact fields:

- digest: source type, title, channel/author, duration, first 12,000 UTF-16/code-point rule as actually implemented, and the exact transcript excerpt;
- index: title repeated with chunked full transcript plus title repeated with generated digest;
- gateway and downstream provider, fallback policy, local/remote boundary, purposes, retention/delete-by, and provider retention behavior.

Use **"Brain has not sent this transcript version for digest or semantic indexing"** in the held state. Split conflict copy into pre-dispatch ("No content was sent under either plan") and post-dispatch ("Content was sent under the previously accepted plan; its result was discarded because the plan changed").

### P1-7. The promised digest/quote contract is not enforced and the prototype hides the mismatch

The PRD promises a three-paragraph digest, key quotes, category, and topics (`...prd_v1.md:359-368`). The current prompt asks for three paragraphs, exactly five verbatim quotes, and 3-8 tags (`src/lib/enrich/prompts.ts:59-77`), but validation accepts any summary over 50 characters, one arbitrary quote, and 1-12 arbitrary tags (`src/lib/enrich/prompts.ts:84-113`). It does not prove that a quote occurs in the supplied excerpt. The prototype renders one paragraph and topics only, omitting quotes and category (`...ux_prototype_v1.html:2861-2867`).

**V2 input:** create a transcript-specific prompt/output contract. Recommended contract: exactly three non-empty digest paragraphs; one to five verified excerpts, each at most 200 characters and present in the bounded source after versioned normalization; one category from the enum; and 3-8 normalized topics. Do not force five quotes when the source cannot support five without fabrication. Rename "Article body" to "Transcript excerpt." The parser, validator, provider fixtures, persisted fields, PRD, UX, and prototype must all use the same contract and bounded-scope wording.

### P1-8. Lease and provider execution semantics are under-specified

V1 assigns a finite lease but gives no timeout, heartbeat, abort, or reclaim relation (`...implementation_plan_v1.md:510-521`, `548-554`, `580-596`). Current Gemini embedding can take about 48 seconds for 44 inputs before HTTP latency/retries (`src/lib/embed/gemini.ts:60-76`). A short lease can be reclaimed while the original process is still sending, causing duplicate provider transfers/cost. Exactly-once provider execution is not achievable after process failure, although exactly-once apply is.

**V2 input:** define per-stage enforced provider deadlines, lease duration greater than deadline plus margin, heartbeat/lease-extension rules, abort propagation, and token rotation on reclaim. State the guarantee honestly as **at-least-once provider attempt, at-most-once current-generation apply**. Record every attempted/stale call in content-free usage. Batch must remain disabled until the accepted-submit-before-batch-ID crash has a provider-supported reconciliation/outbox design; an in-memory `batch_submit_orphaned` branch cannot recover a batch ID after process death.

### P1-9. Reusing `isExactSameOrigin()` trusts spoofable forwarding metadata

V1 says to require `isExactSameOrigin(req)` (`...implementation_plan_v1.md:676-683`), following the original memo. The current helper derives the expected host/protocol from the first `X-Forwarded-Host` and `X-Forwarded-Proto` values (`src/lib/notes/http.ts:21-35`). The repository already has a stronger processing-write precedent that compares the Origin header to configured `BRAIN_PUBLIC_ORIGIN` and fails closed when absent (`src/lib/processing/http.ts:59-75`).

**V2 input:** use one canonical configured public origin, parsed once and restricted to origin-only syntax. Do not derive authority from client-supplied Host or forwarded headers. If a trusted reverse-proxy mode is required, make the trusted proxy contract explicit and strip/replace inbound forwarding headers at that boundary. Test missing/multiple Origin, hostile Host, hostile/multiple forwarded headers, scheme/port/case normalization, loopback aliases, extension origins, and bearer-only requests.

### P1-10. Kill-switch and provider-drift behavior can strand running jobs or mislabel completed output

V1 checks execution flags at apply and says disabling execution makes in-flight apply fail closed (`...implementation_plan_v1.md:843-864`), but it does not specify the token-CAS transition after rejection. A job can remain `running` until lease sweep and then retry indefinitely. Provider drift is likewise evaluated before ready in the status precedence even if both outputs already applied.

**V2 input:** define transitions at request, claim, immediately-before-dispatch, and apply. A killed in-flight claim records `execution_disabled_after_dispatch` or `...before_dispatch`, clears its own lease by token CAS, and moves to a deterministic `blocked`/`paused` state. Re-enable may requeue only if the original authorization, policy window, and retry budget remain current. Completed results retain accepted-provider provenance and remain visible. Current provider settings govern future work, not historical truth.

### P1-11. Legacy summaries/vectors cannot be declared current by the proposed mapping

Migration 023 labels all old chunks `legacy_item_context` with source version 0 (`src/db/migrations/023_source_aware_chunks.sql:1-42`). Existing new chunks use original version 0 and summary version `enriched_at` (`src/lib/embed/pipeline.ts:84-96`). V1 says old embedding jobs bind only when integrity can be proven, otherwise become blocked (`...implementation_plan_v1.md:270-278`), but it does not define what happens to legacy vectors in retrieval, readiness, or rebuild selection.

**V2 input:** quarantine `legacy_item_context` from the browser-transcript exact-index contract. Inventory counts before migration; mark it non-current for this path; purge/rebuild only under an eligible authorized or separately grandfathered scheduled policy. Do not infer accepted provider fingerprint from current configuration. Publish backfill counts by disposition (`proven_current`, `blocked_rebuild`, `purged_legacy`) and test semantic readers during the transition.

### P1-12. The prototype violates its no-network claim and does not yet validate the specified UX

The footer says no YouTube or Brain request is made (`...ux_prototype_v1.html:2543-2545`), but the file loads Lucide from unpkg and a real YouTube thumbnail from `i.ytimg.com` (`:2551-2555`, `2944`, `3152`). The forced mobile browser width is 390 px (`:2306-2314`), which overflows its padded host and cannot satisfy the 320 px requirement. The UX spec openly says the V1 remote review is inline and V2 must implement a real dialog/sheet (`...ux_spec_v1.md:403-408`). The pre-receipt `starting` state renders the "Queued" progress row (`...ux_prototype_v1.html:2898-2906`) even though V1 says queued appears only after a durable receipt.

The scenario set also omits ambiguous POST outcome, digest failure/retry/exhaustion, provider unavailable, processing-manifest expiry, policy expiry after queue, session expiry during authorization, execution disable in flight, server restart, two-tab no-op replay, and pre/post-dispatch provider drift (`...ux_prototype_v1.html:3174-3200`, `3466-3468`).

**V2 input:** bundle/localize every asset and assert zero external requests in Playwright. Use `width: min(390px, 100%)`, test actual 320/390/768/1024/1440 viewports and 200% zoom, and render the complete output density. Implement a focus-trapped desktop dialog/mobile sheet with focus return. During POST, show a neutral "Authorization request" row; insert "Queued" only after a synthetic durable receipt. Add every scenario above and capture visual/accessibility evidence.

### P2-1. Purpose, operation, and generation vocabulary is inconsistent

- PRD purpose IDs are `youtube_transcript_digest` and `youtube_transcript_semantic_index` (`...prd_v1.md:321-328`), while implementation fingerprints use `enrichment` and `semantic_index` (`...implementation_plan_v1.md:300-326`). Use canonical purpose IDs for authorization and separate stage names for internal scheduling.
- `items.enrichment_generation` is called monotonic but is reset to zero on body replacement (`...implementation_plan_v1.md:123-138`). Define job generations as strictly monotonic and never reused; define item enrichment generation as the applied generation for the current content revision, with `(content_revision, enrichment_generation)` as the identity.
- Align all retry names with P1-3 and remove `retry_current_stage`/`retry_current_enrichment` ambiguity.

### P2-2. Receipt outcome and replay behavior lacks executable pseudocode

The transaction algorithm describes rejected and accepted-effective inserts but does not explicitly insert/return accepted no-op receipts (`...implementation_plan_v1.md:437-454`). Tests say "byte-equivalent replay," while the response table changes a replay to HTTP 200 (`:410-425`, `758-765`).

**V2 input:** define one branch per result code, the exact persisted row shape, commit point, response status, and `replayed` flag. Same mutation ID plus same canonical request returns the original receipt semantics; same ID plus different canonical request returns 422 without mutation. A second mutation ID for current work writes a distinct accepted-noop receipt. Domain-rejected receipts are inserted and committed before the response. Invalid auth/schema/not-found requests receive no domain receipt.

### P2-3. Provider/index compatibility is broader than a model name

The current vector table is fixed at 768 dimensions, and Gemini explicitly requests 768 (`src/lib/embed/gemini.ts:56-89`). V1's fingerprint mentions an index contract but does not enumerate output dimension, task type, normalization, chunker, title-prefix behavior, or vector metric.

**V2 input:** include these fields in `semantic-index-contract-v1`, provider eligibility, fingerprint fixtures, and migration compatibility. Reject an incompatible model before authorization; never discover dimensional mismatch after sending the full transcript.

### P2-4. The implementation plan omits an authoritative affected-file inventory

The V1 plan names files throughout but does not provide a complete impact map. In addition to its listed route/worker/UI files, V2 must explicitly include:

- `src/instrumentation.ts` and worker-mode tests;
- `src/lib/retrieve/index.ts`, `src/lib/related/index.ts`, `src/app/api/ask/route.ts`, and `src/lib/ask/generator.ts`;
- `src/lib/processing/http.ts` or a new canonical origin helper;
- `src/lib/enrich/prompts.ts` and validator tests;
- provider factories/config/status and OpenRouter/Gemini contract tests;
- all body/title/author/duration writers and transcript segment/source repositories;
- the migration runner/release compatibility tool;
- every item/bulk deletion path and manifest cleanup command;
- `.env.example`, runbooks, and existing enrichment-flow documentation.

The current-state audit should be revised to cover these omitted readers, startup behavior, origin helper, migration runner, prompt validator, and prototype external requests.

### P2-5. Effort arithmetic is internally inconsistent

PR-1 through PR-8 total 35-53 engineering days before review latency (`...implementation_plan_v1.md:827-839`), which is 7-10.6 five-day engineer-weeks, not the stated 5-7 weeks (`:841`). This excludes upstream 026, processing-manifest governance, retrieval hardening, compatibility tooling, and the new findings above.

**V2 input:** re-estimate after the revised PR sequence. A credible planning range is **9-13 focused senior-engineer weeks after verified migration 026**, plus product/design/privacy/security review and lab scheduling. Label parallelizable work separately; do not convert summed engineer-days into elapsed time without named parallel owners.

### P2-6. "Ready for search and Ask" overstates the authorization and conflicts with the current UI

PRD calls completion "Ready for search and Ask" (`...prd_v1.md:282-291`), while the council correctly says future Ask prompts are excluded. Current desktop and mobile pages expose **Ask this item** regardless of this new index state (`src/app/items/[id]/page.tsx:442-448`, `973-979`).

**V2 input:** use **"AI digest and semantic index are ready"**. State that a future Ask is a separate action that may use the current index. Do not condition navigation availability on this job unless the broader Ask product is explicitly redesigned.

### P3-1. State labels and accessibility semantics need one canonical glossary

The package alternates among "Ready to enrich," "AI paused," "awaiting permission," "starting," "queueing," "digest running," and "enriching." The prototype's mobile view buttons use `aria-selected` without a complete tab/tablist/tabpanel relationship.

**V2 input:** add one glossary mapping database state, API state, user heading, badge, and allowed action. Use complete WAI-ARIA dialog/sheet and tab semantics, and include axe plus keyboard/focus evidence rather than checklist-only claims.

## 4. Normative V2 Contracts

This section is the minimum concrete replacement for the ambiguous portions of V1.

### 4.1 Authorization snapshot tables

Keep `manual_enrichment_receipts` for idempotency, but add accepted-only immutable authorization records. A representative logical contract is:

```text
manual_enrichment_authorizations
  mutation_id PK/FK -> accepted receipt
  item_id FK cascade
  transcript_source_id FK cascade
  expected_content_revision
  expected_enrichment_job_generation
  authorization_input_fingerprint
  authorization_context_fingerprint
  processing_policy_decision_id FK
  manifest_content_sha256
  consent_copy_version
  prompt_contract_version
  index_contract_version
  authorized_at
  not_after_ms
  delete_by_ms

manual_enrichment_authorization_stages
  mutation_id FK cascade
  stage: digest | semantic_index
  purpose_id
  provider
  model
  boundary: local | remote
  downstream_provider nullable
  fallback_policy
  received_data_categories
  coverage_contract
  provider_retention_policy_version
  provider_plan_fingerprint
  PRIMARY KEY (mutation_id, stage)
```

All values are server-generated from a validated current plan. Do not store endpoints, credentials, transcript/title/body, raw policy documents, prompts, outputs, or raw errors. Add immutable-update triggers and shape checks. Receipts reference the authorization only for accepted effective/no-op outcomes that actually reuse it.

Add `execution_lane` and exact accepted fingerprints/policy decision/cutoffs to both enrichment and embedding jobs. Job generation increments on every new work incarnation and never resets. Body/source replacement increments the enrichment job generation, clears current derived output, sets `items.enrichment_generation=0`, and creates a new held job for the new content revision.

### 4.2 Status response

`GET /api/items/:id/enrichment-status` remains session-authenticated, private, and no-store. For an eligible held/current item it returns display-safe provider plans plus:

```json
{
  "contractVersion": "manual-enrichment-v2",
  "serverState": "awaiting_permission",
  "stage": "none",
  "resultState": "none",
  "allowedAction": "release_transcript_and_enrich",
  "blockedReason": null,
  "dispatchState": "never_dispatched",
  "contentRevision": 7,
  "transcriptSourceId": "server-id",
  "authorizationInputFingerprint": "<64-hex>",
  "authorizationContextFingerprint": "<64-hex>",
  "consentCopyVersion": "manual-transcript-enrichment-copy-v2",
  "providerPlanVersion": "content-processing-provider-plan-v2",
  "enrichmentProviderFingerprint": "<64-hex>",
  "embeddingProviderFingerprint": "<64-hex>",
  "enrichmentJobGeneration": 12,
  "embeddingJobGeneration": null,
  "retryClass": null
}
```

Provider display rows separately include stage, purpose, provider, model, gateway/downstream, fallback, boundary, exact data categories, coverage, and retention wording. Never return the processing manifest, endpoint identity, policy IDs, claim token, raw error, or content.

### 4.3 POST request

```json
{
  "contractVersion": "manual-enrichment-v2",
  "mutationId": "b1868e88-2550-4b1e-9de7-f7af6e04aa2d",
  "operation": "release_transcript_and_enrich",
  "expectedContentRevision": 7,
  "transcriptSourceId": "4a91...",
  "expectedStageGeneration": 12,
  "authorizationInputFingerprint": "<64-hex>",
  "authorizationContextFingerprint": "<64-hex>",
  "consentCopyVersion": "manual-transcript-enrichment-copy-v2",
  "providerPlanVersion": "content-processing-provider-plan-v2",
  "enrichmentProviderFingerprint": "<64-hex>",
  "embeddingProviderFingerprint": "<64-hex>"
}
```

For `retry_indexing`, `expectedStageGeneration` is the current embedding job generation and the request also binds the current applied enrichment generation. The client still cannot select providers, model, endpoint, execution lane, manifest, purpose, data categories, retention, retry budget, title, or body.

### 4.4 Authorization transaction

Within one immediate transaction:

1. Authenticate/validate request outside the domain transaction; parse strict bounded JSON.
2. Look up mutation ID. Exact fingerprint returns its prior receipt; mismatch returns 422.
3. Load exact item, sole active source and ordered integrity, hold, policy decisions, current jobs/generations, and current result integrity.
4. Recompute provider plan, input fingerprint, context fingerprint, processing-manifest decision, and hard cutoffs.
5. Compare every client-reviewed binding and operation-specific expected generation.
6. Resolve one explicit outcome branch and insert its immutable receipt. Accepted-effective also inserts the immutable authorization/stage snapshot.
7. For the initial operation only, guarded-release exactly one matching held row.
8. Guarded-transition exactly one matching job generation/lane; retries change only their intended stage.
9. Update compatibility projection only after authoritative rows are valid.
10. Commit, then construct the response from committed rows.

Inject failure after every write. Accepted no-op, rejected, and effective paths must each have explicit SQL/result pseudocode in the V2 implementation plan.

### 4.5 Worker gates

At claim, immediately before any provider request, between embedding request batches, and at apply, require as applicable:

- permitted deployment and worker mode;
- execution flag;
- item exists;
- exact active source and transcript integrity;
- expected content revision;
- immutable accepted authorization and stage snapshot;
- exact input/context/provider/contract fingerprints;
- unexpired processing decision and delete-by window;
- released exact hold;
- interactive lane;
- expected digest/embedding generations;
- matching state, claim token, and unexpired lease.

Apply additionally verifies the provider result belongs to the immutable in-memory claim and writes output, attempts, usage, generation advancement, and next-stage job atomically. A stale result never mutates current content, vectors, success state, or another generation's retry budget.

## 5. Cross-Artifact Contradictions To Resolve In V2

| Topic | V1 contradiction | Required single answer |
| --- | --- | --- |
| Manifest | Upstream says no downstream processing; V1 says manifest-authorized processing. | Separate exact processing manifest and decision; capture manifest alone denies. |
| Input binding | Council says authorization transaction verifies input fingerprint, but request/receipt omit it and worker first creates it. | GET/POST/persist/compare opaque accepted input fingerprint. |
| Disclosure binding | PRD invalidates on purpose/data/coverage/retention/manifest/copy; provider fingerprint omits them. | Separate authorization-context fingerprint plus immutable safe snapshot. |
| Worker mode | Upstream live lab disables all workers; V1 needs two. | Reviewed `manual-transcript-lab` allowlist mode and embedding lane. |
| Retry | Three different generic names versus index-only UX. | Three explicit operations with stage-generation binding. |
| State ownership | PRD says status exposes reviewing/queueing; implementation calls review client-only. | Server state and client overlays are separate fields. |
| Provider changed | Copy always says nothing sent; worker can detect after dispatch. | Dispatch-aware codes and copy. |
| Ready | Status precedence can hide ready output after a flag/config change. | Separate current result from future action availability. |
| Output | PRD/prompt/prototype/validator describe four different shapes. | One transcript-specific schema enforced and rendered. |
| Ask | "Ready for Ask" versus Ask being a separate action and already navigable. | "Digest and semantic index ready"; Ask remains separate. |
| Generation | "Monotonic" item generation resets to zero. | Monotonic job generation; revision-scoped applied item generation. |
| Migration | Independent schema PR precedes compatible consumers. | Expand/migrate/contract compatibility sequence. |

## 6. Exact V2 Edits By Artifact

### Product Council V2

1. Add decisions for the separate processing manifest, immutable reviewed-input/context snapshot, interactive-only lab worker mode, exact semantic-read gating, and automatic delete-by cleanup.
2. Amend D7 so fingerprints are established in the authorization transaction from the GET-reviewed values; claims only compare.
3. Clarify that completed output keeps historical accepted-provider provenance when current settings change.
4. Replace absolute "nothing sent" statements with version- and dispatch-aware copy.
5. Approve the exact output schema and the explicit retry operations.
6. Keep the route decision, queue-only HTTP behavior, title preservation, separate stages, and production no-go.

### PRD V2

1. Add the processing-manifest and policy-decision requirements to scope, eligibility, data inventory, rollout, and no-go gates.
2. Replace the POST contract with Section 4.3 and add the immutable authorization snapshot.
3. Split server state, result state, action, dispatch, and client overlay as in P1-4.
4. Add `confirmation_unknown`, pre/post-dispatch drift, policy expiry at each stage, execution pause, terminal digest error, and cleanup states/copy.
5. Correct the data disclosure and "Ready" wording.
6. Make the output validator contract normative.
7. Add stale semantic-read and response-loss metrics to the zero-tolerance gates.

### Implementation Plan V2

1. Add concrete migrations/tables/constraints from Section 4.1, including an embedding execution lane and processing policy decisions.
2. Replace the PR sequence with the compatibility sequence in P0-5 and list every affected file in P2-4.
3. Define the processing-manifest loader and independent worker-mode state machine.
4. Move input/context fingerprint establishment from claim to authorization; add embedding fingerprint establishment at digest apply.
5. Add exact reader eligibility to retrieval, Ask, Related, status, and citation paths.
6. Define operation-specific transaction branches and retry generations.
7. Define lease/deadline/heartbeat/abort/reclaim behavior and disable scheduled batch until reconciliation is proven.
8. Use configured-origin validation, not forwarded request metadata.
9. Define phase-aware flag, provider drift, expiry, deletion, and completed-result behavior.
10. Add a compatibility table, backfill dispositions, migration commands, and revised effort.

### UX Specification V2

1. Add the unknown-submission reconciliation state and prohibit definitive "nothing sent" copy on transport failure.
2. Add pre-dispatch and post-dispatch variants for provider/content/policy changes.
3. Separate current result visibility from action/runner availability.
4. Render exact digest/index payload, downstream/fallback, retention/delete-by, and title-in-chunk disclosure.
5. Use explicit retry labels tied to failed stage.
6. Replace "Ready for search and Ask" and absolute historical provider claims.
7. Specify dialog/sheet focus trap, focus return, tabs, live-region deduplication, and 320 px/200% behavior as executable acceptance criteria.

### Prototype V2

1. Make the artifact offline and prove zero external requests.
2. Render a real dialog/sheet and full digest output.
3. Do not render a queued row before receipt.
4. Add all missing failure, drift, expiry, retry, reconciliation, restart, two-tab, and kill-switch scenarios.
5. Fix responsive width and collect desktop/mobile/zoom/reduced-motion/high-contrast/focus screenshots and interaction traces.

### Current-State Audit V2

Add evidence for migration auto-application, startup worker fan-out, origin validation, provider payloads, prompt validation, semantic readers, Ask persistence, Related, legacy chunks, delete-by cleanup, and prototype external traffic. Correct the route conclusion to distinguish **reusing the URL** from **preserving the legacy semantics**.

## 7. Required Test Additions

The V1 matrix remains useful but is insufficient. V2 must add at least:

### Authorization and policy

- changed title/author/duration between status and POST;
- changed every context-fingerprint field independently;
- capture manifest present but processing manifest absent/invalid/expired;
- processing manifest target/provider/purpose/data-root/hash mismatch;
- policy expiry after queue, after claim, before dispatch, during embedding, and before apply;
- ordered segment/source/body integrity mismatch;
- response lost after commit and same-ID recovery;
- known replay behavior under rate limit.

### Worker containment and execution

- all queue classes seeded under every worker mode;
- interactive embedding cannot claim scheduled backlog;
- no request starts when the remaining policy window is shorter than the provider deadline;
- lease heartbeat, timeout, abort, reclaim, old-token resume, and process crash;
- kill switch before dispatch and after dispatch with deterministic terminal state/copy;
- no batch startup in manual lab; no scheduled batch enablement without reconciliation.

### Semantic reads

- stale original and summary generation excluded from scoped/global retrieval;
- stale target/candidate vectors excluded from Related;
- revision change after Ask retrieval but before prompt and before answer persistence;
- legacy context quarantine and exact current control;
- provider/index-contract mismatch excluded even when vector counts are complete.

### Migration and rollback

- every binary/schema compatibility pair claimed by the release plan;
- old SQL columns/triggers remain valid during expand and disappear only in contract;
- backfill disposition counts/hashes and restore rehearsal;
- startup refuses unsupported schema and conflicting worker modes before starting any worker;
- automatic delete-by uses `deleteItem()`-equivalent vec0 cleanup and prevents in-flight recreation.

### Output and UX

- three-paragraph/verified-excerpt/category/topic validation and malformed provider responses;
- exact disclosure snapshot rendered from the same server DTO that is fingerprinted;
- pre/post-dispatch copy tests;
- no external prototype requests;
- remote dialog/mobile sheet focus trap/return;
- 320 px, 390 px, tablet, desktop, 200% zoom, reduced motion, high contrast, and screen-reader state announcements;
- queued appears only after a durable receipt.

## 8. Revised Pull Request Sequence

Every merge must boot and pass with its supported schema; "flags off" is not a compatibility strategy.

| PR | Scope | Merge gate |
| --- | --- | --- |
| PR-0A | Implement and verify upstream migration 026, active-source uniqueness, hold/revision fences, unconditional hold checks, and disabled worker mode | All upstream no-go gates; old behavior remains bootable |
| PR-0B | Add reviewed processing-manifest schema/loader/decision records and exact cleanup contract, still no release | Capture-only manifest always denies processing; expiry/cleanup tests |
| PR-1 | Additive 027 expand schema, safe authorization tables, job lanes/nullable fences, compatibility readers | Old and transition binaries boot; no queue behavior changes |
| PR-2 | Canonical provider/disclosure/input-context service, configured-origin HTTP helper, strict status DTO | Golden fingerprints, origin matrix, no network in status |
| PR-3 | Atomic authorization/retry service and strict replacement `/enrich` route, execution off | Failure atomicity, replay, response-loss, exact-binding tests |
| PR-4 | Capture/repair dual-write, monotonic job incarnations, held-job creation, source integrity | Attachment remains held; every legacy writer audited |
| PR-5 | Interactive digest lease/compute/apply and manual-lab worker mode | No unrelated claims; stale/expiry/kill/deletion barriers |
| PR-6 | Exact embedding worker/lane and transactional index replacement | Restart, partial success, index-only retry, contract/dimension tests |
| PR-7 | Exact semantic readers and legacy quarantine/backfill | Ask/search/Related stale-read matrix |
| PR-8 | UI, real review dialog/sheet, status reconciliation, extension copy, offline prototype V2 | Product, accessibility, mobile, network-loss, visual evidence |
| PR-9 | 027 contract migration and scheduled batch hardening only after compatibility/reconciliation proof | Release matrix, batch crash recovery, old-binary block |
| PR-10 | Privacy scanner, runbooks, one-item approved lab evidence, cleanup/restore report | Every no-go gate signed with evidence |

Scheduled batch hardening may be deferred beyond the first manual lab if and only if startup makes it impossible for that scheduler/worker to run in manual-lab mode and the additive schema remains compatible. It cannot be waved through as "shared later work" while still being startable.

## 9. Endpoint Decision

**Keep the route URL and replace its contract in place.**

The current repository has no non-test source caller of `POST /api/items/:id/enrich`; the only live caller found for this area polls the status endpoint. The URL already expresses the item command, and a parallel `/enrichment-runs` route would create two apparent authorities over the same hold/job state. The correct implementation is therefore:

- retain `POST /api/items/:id/enrich`;
- require strict `manual-enrichment-v2` JSON;
- remove inline and bodyless behavior;
- make `?force=realtime` and legacy bodyless calls return `410 legacy_contract_removed` with zero mutation/provider work;
- update tests and documentation in the same deployable change; and
- model the durable run/authorization as database resources behind the command, not as a second public endpoint.

This is an evolution of the URL and a replacement of the behavior. V2 should use that exact phrasing to resolve the current audit/council wording difference (`2026-07-22_current_state_audit.md:52-65`; `...product_council_v1.md:105-115`).

## 10. V2 No-Go Gates

Do not enable manual transcript enrichment, even in live lab, unless all are true:

1. Migration 026 is implemented and verified; sole active source and holds are database-enforced.
2. A separate exact processing manifest/decision authorizes both purposes/providers; the capture manifest alone denies.
3. GET review, POST, receipt/authorization, claim, and apply bind the same exact input and authorization-context fingerprints.
4. Ordered transcript/source/body integrity is immutable or recomputed and verified.
5. Hold release, accepted authorization, and exact interactive job transition are one idempotent transaction.
6. Manual-lab startup can run only authorized interactive digest/index workers and no other content worker.
7. Processing decision expiry/delete-by is checked before dispatch and apply, with rehearsed automatic cleanup.
8. Exact current-generation filters protect Ask, search, citations, and Related as well as writes/status.
9. Migration and PR sequencing passes the published binary/schema compatibility matrix.
10. Origin authority comes from configured trusted origin, not untrusted forwarding metadata.
11. Unknown network outcomes reconcile by same mutation ID without claiming nothing was sent.
12. Retry operations are stage-specific; index-only retry makes zero digest calls.
13. Provider/data/retention copy exactly matches provider-ready payloads, gateway/downstream behavior, and dispatch phase.
14. Output validation and prototype rendering match one bounded transcript-specific contract.
15. Lease/deadline/abort/reclaim behavior is deterministic and at-least-once attempt semantics are documented.
16. Kill switches leave current results truthful and running jobs in deterministic fenced states.
17. Stale/legacy vectors cannot be selected while waiting for purge or rebuild.
18. The prototype makes zero undeclared external requests and passes the full responsive/accessibility/state matrix.
19. Item/delete-by cleanup removes vectors before cascades and in-flight workers cannot recreate data.
20. Production browser capture and processing remain denied by code regardless of flags or manifests.

## 11. Final Verdict

The V1 package is a strong architectural direction, not yet an implementable contract. Its most valuable decisions should survive: in-place replacement of `/enrich`, web-session-only authorization, queue-only HTTP, immutable receipts, atomic hold release/job creation, interactive-not-batch execution, title preservation, separate digest/index stages, compare-and-apply, deletion fences, forward rollback, and production denial.

V2 must add the missing authorization artifact, move identity binding to the user's click, isolate the only permitted workers, make semantic reads generation-safe, and produce a deployable migration sequence. Until those five P0s and the P1 findings are closed with executable contracts and tests, implementation enablement remains a no-go.
