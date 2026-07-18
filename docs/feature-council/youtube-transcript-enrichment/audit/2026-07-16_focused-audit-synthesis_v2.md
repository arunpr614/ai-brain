# Focused YouTube Ingestion and Enrichment Audit — v2

**Decision-bearing artifact:** v2 after independent adversarial review<br>
**Status:** Current-state audit complete — not a feasibility or implementation decision<br>
**Code baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`<br>
**Recorded production baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`<br>
**Verified:** 2026-07-16

## Executive finding

AI Brain has useful transcript foundations but three different active semantics:

1. automatic InnerTube/timed-text capture and recovery stores a composed item body/artifacts/jobs without a transcript-policy/source/segment record;
2. inline pasted text during URL capture also stores an item body/artifact without that normalized record; and
3. the dedicated transcript repair API writes policy, source, and segment provenance.

Official creator captions and owned-media STT exist as tested libraries but are inactive. Generic enrichment and item-level search are implemented, yet they do not satisfy the proposed video feature’s long-context, evidence, timestamp, hostile-input, reproducibility, lifecycle, and cost controls.

The P0 applies to shipping the active automatic InnerTube path unchanged. It does not prohibit a separately gated creator-supplied or independently authorized-media strategy. No method has passed Gate 1, and no new transcript/model experiment was run during this audit.

## Capability truth

| Capability | Verified state | Boundary |
|---|---|---|
| Single-video URL recognition | Implemented on `main` | Strict supported shapes; playlists/channels fall into generic handling rather than an explicit unsupported YouTube result |
| Automatic public transcript | Active code path; historical save/recovery-control evidence; transcript success variable | Unofficial/undocumented method; no policy/source/segments |
| Inline user text at URL capture | Active | User text/artifact only; no transcript policy/source/segments |
| Dedicated paste/file repair | Active | Caller-supplied source label, source/segments, and derived-state reset; no explicit rights attestation or retention enforcer |
| Official creator captions | Inactive library | OAuth/editor-scoped; policy posture for derived enrichment unresolved |
| Owned-media STT | Inactive | Public route validates then returns `provider_disabled` |
| Transcript normalization | Partial | Strong fields for participating methods; inconsistent versioning, missing speaker/partial/error contract, no full history |
| Enrichment | Implemented generic pipeline | First 12,000 composed-body characters; five-field JSON; structural validation only |
| OpenRouter/Anthropic/Ollama | Implemented provider choice | Remote timeouts/idempotency and usage attribution are inadequate |
| Search and item detail | Item-level implemented | No segment index, transcript-local search, or timestamp seek navigation |

## Release-blocking and high-severity findings

### P0 — The active automatic acquisition path cannot ship unchanged

The automatic capture/recovery method calls a fixed undocumented InnerTube endpoint and a returned timed-text URL. It is default-on unless explicitly disabled and can store full timed-text artifacts. It never creates the rights/retention decision, normalized source, or segment rows expected by the newer model. Shipping or expanding this path would preserve an unresolved platform-policy posture and make retention, deletion, replacement, timestamp evidence, and downstream-provider authorization inconsistent.

This is a technical release blocker for that path, not a legal conclusion and not a blocker to researching a separately authorized class.

### P1 — User-supplied transcript authorization is asserted, not collected

The dedicated route assigns rights basis `user_provided_transcript` and retention `full_text_allowed` automatically. Neither the API inputs nor the current repair UI collect a rights/permission attestation. Future planning must distinguish “the caller supplied these bytes” from “the caller confirmed authority to store/process them,” record the attestation scope, and preserve a revocable audit event.

### P1 — Retention and downstream-processing controls are declarative

`retention_class` is durable metadata, but no runtime policy enforces expiry, deletion, export, FTS/vector indexing, backups, or model-provider disclosure. Every sufficiently long item can enter enrichment without consulting transcript policy. A future accepted method must enforce authorization at every storage and processing boundary; a database label alone is insufficient.

### P1 — Transcript recovery has no hard lifetime request budget

Jobs begin with five attempts, but each throttled outcome can raise `max_attempts` to at least `attempts + 3`. Repeated 429/anti-bot outcomes can extend the external request loop indefinitely. Provider cooldown reduces request frequency but does not cap lifetime. Require a hard total attempt/elapsed-time budget, a terminal/manual state, and explicit user reauthorization to resume.

### P1 — Normalization is method-dependent and historical rollback is unavailable

Automatic and inline-user-text paths bypass normalized records. Participating adapters store version strings inconsistently inside untyped provenance JSON; paste can omit them. Superseded source rows are tombstones, not full transcript versions: replacement deletes prior segments and can leave a stale historical segment count. Speaker, first-class processing version, partial/complete status, and segment-level errors are also absent. Gate 3 must establish one deterministic contract and an explicit history/deletion policy.

### P1 — Enrichment is not grounded or long-video capable

The current five-field generic output lacks chapters, claims/evidence, actions, concepts/entities, search metadata, and timestamp citations. It uses only the first 12,000 characters of a body that may start with metadata, description, and chapters. Transcript instructions are not explicitly isolated as hostile data, and validation checks shape rather than evidence. It cannot support the benchmark’s groundedness, hallucination, citation, or coverage claims without a new prospective design.

### P1 — Usage telemetry can trigger misreporting and repeated generation

Realtime generation is recorded as Ollama/Qwen/zero cost even when Anthropic or OpenRouter handled it. Generated item/tag/topic state commits before usage telemetry; if telemetry persistence throws, the worker treats generation as failed and can repeat a completed remote call. Require truthful provider/model/route/request/token/price fields plus atomic result/usage persistence or a terminal reconciliation state that never regenerates solely to repair telemetry.

### P1 — Remote calls can stall indefinitely; duplicate overlap is a concurrency risk

The enrichment call supplies no deadline signal to remote providers. In the current single-process loop, the same worker cannot sweep while blocked, so an indefinite stall is the confirmed failure. Duplicate overlap requires another process or a restart/lease race; it remains a material inference that must be tested rather than stated as observed fact. Enforce request deadlines, durable leases/idempotency, late-result rejection, and multi-process/restart tests for every remote provider.

### P1 — Network safety needs hop-by-hop and encoding-complete validation

The generic fetch checks a hostname once, fails open on DNS lookup errors, and follows redirects without validating each destination. IPv6 mapped/private forms are only partially covered. The timed-text `baseUrl` from an upstream response lacks a strict approved-host validator. Require scheme/host/port allowlists, redirect-hop and resolved-address revalidation, DNS-rebinding defenses, complete IPv4/IPv6 private/special-range handling, response/decompression caps, and caption-host tests.

### P1 — Search and navigation are not transcript-native

Item FTS and semantic chunks make the item searchable, but `transcript_segments` are not indexed units and chunks carry no transcript source/timestamp range. The item page displays a bounded segment preview and plain timestamp labels. Search-within-transcript, evidence-hit timestamps, and player seek navigation are not implemented.

## Medium findings

- Request limits are post-parse: `req.json()` and `req.formData()` can materialize an oversized body before application validation. Add edge/proxy/framework limits, `Content-Length` preflight, streaming caps, and tests.
- Worker controls are default-on but absent from `.env.example`; startup backfill and safe disablement need explicit operator documentation.
- Current UI/Wiki language does not fully agree with automatic-worker behavior or the three storage semantics.
- Draft PR #6 is conflicting and overlaps repair, item, prompt, UI, and auth surfaces. It must be rebased or selectively transplanted, not merged wholesale.
- A 7,200-segment guard is only approximately a two-hour guard and cannot substitute for duration/resource budgets.

## Existing strengths to preserve

- Strict supported single-video URL parsing and canonicalization.
- Honest metadata-only/manual-needed result states and durable recovery attempts.
- Transactional dedicated transcript repair with source hashes and timestamped segments.
- Source supersession tombstones and separation of transcript/enrichment/embed failure states.
- Provider abstraction and OpenRouter no-fallback/data-collection-deny request invariant.
- Strong mocked/unit coverage for the code that exists.

These are foundations, not evidence that rights, retention, reliability, or model quality has passed a gate.

## Required release-gate evidence

1. A method×item rights-safe corpus matrix frozen before results, with a declared denominator for each method.
2. An invariant that every accepted transcript has an allowed decision, source, normalized segments, authorization/retention state, and processing version—or is explicitly rejected/metadata-only.
3. Hard request/lifetime budgets and truthful terminal recovery for every external acquisition/provider path.
4. Redirect/DNS/caption-host/oversize/decompression adversarial tests.
5. Hostile transcript tests covering instruction override, secrets/tools, HTML/Markdown, timestamp deception, repetition, and extreme size.
6. Long-video hierarchical enrichment with evidence/citation checks and schema reliability.
7. Truthful, atomic provider/model/request/route/token/price accounting and remote timeout/lease tests.
8. Segment-index and timestamp-navigation end-to-end proof.
9. Explicit states for every supported/deferred/unsupported video class.

## QA evidence

A focused run on 2026-07-16 passed 194 mocked/unit tests across 28 suites with zero failures. It did not contact YouTube, invoke an external model, use credentials, or exercise production. Passing current tests validates current intended contracts; it does not fill the missing release-gate tests.

## Audit conclusion

Phase 1 is complete at the audited commits. Its result is **current-state audit complete — not feasibility validated**. The next eligible action is to finalize the rights-safe method×item corpus and protocol. Gate 1 begins only after both are immutable and their lock commit/hash is recorded.

## Evidence map

- [Product feature catalog](PRODUCT_FEATURE_CATALOG.md)
- [Current processing flow](CURRENT_PROCESSING_FLOW.md)
- [Relevant code map](CODE_MAP.md)
- [Existing data model](DATA_MODEL_SUMMARY.md)
- [Current providers](PROVIDER_INVENTORY.md)
- [Wiki-versus-code discrepancies](WIKI_CODE_DISCREPANCIES.md)
- [Focused QA baseline](QA_BASELINE.md)
- [Independent adversarial review](2026-07-16_focused-audit-synthesis_adversarial-review.md)
