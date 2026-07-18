# Focused YouTube Ingestion and Enrichment Audit — v1

**Decision-bearing artifact:** v1, awaiting independent adversarial review<br>
**Status:** Current-state audit complete on code and Wiki — not a feasibility decision<br>
**Code baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`<br>
**Recorded production baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`<br>
**Verified:** 2026-07-16

## Executive finding

AI Brain already has substantial transcript machinery, but it is not one coherent production contract. The active automatic YouTube path uses an unofficial InnerTube/timed-text mechanism and does not pass through the newer rights, retention, provenance, and normalized-segment model. The safer manual path does. Official creator captions and owned-media STT are implemented as libraries but are not active product paths. Generic enrichment and item-level search work, yet they do not meet the proposed video feature’s evidence, long-context, timestamp, security, reproducibility, or cost-accounting requirements.

This audit therefore supports research, not rollout. Gate 1 must decide whether any narrowly declared acquisition class has a plausible policy posture and measured reliability. No new transcript/model experiment is authorized until the benchmark protocol and rights-safe corpus are frozen.

## Evidence-backed findings

### P0 — Automatic acquisition bypasses the policy/provenance contract

The capture and recovery paths call a fixed undocumented InnerTube endpoint and returned timed-text URL (`src/lib/capture/youtube.ts:37-43,143-179,223-414`; `src/lib/capture/youtube-transcript/recovery.ts`). Weak items are automatically enqueued, and the in-process worker is enabled unless explicitly set to `0` or `false` (`src/db/migrations/017_transcript_recovery.sql:73-138`; `src/lib/queue/transcript-worker.ts:48-70`; `src/instrumentation.ts:63-71`). Historical production evidence verifies metadata-only save/requeue and the recovery control-loop/cooldown, not reliable transcript success.

Those paths do not create the `capture_policy_decisions`, `transcript_sources`, or `transcript_segments` records used by manual, official, and STT library paths. Raw timed-text XML can still be stored as a capture artifact. This is a release blocker for any new YouTube transcript proposal because acquisition authority, retention, deletion, source replacement, and timestamp provenance cannot be enforced consistently. It is not, by itself, a legal conclusion.

The split is not limited to automatic extraction. Pasting text into the general URL-capture surface calls `buildYoutubeUserTextCapture` and writes an item body plus `user_provided_text` artifact (`src/lib/capture/capture-url.ts:43-52`; `src/lib/capture/youtube-user-text.ts:15-68`) without using the transcript-policy/source/segment model. The dedicated transcript repair API does use that model. A future supported direct-caption workflow must select one policy-aware path and remove this semantic ambiguity.

### P1 — Product truth is internally inconsistent

The recovery UI/documentation describes automatic public extraction as unavailable or gated, while startup code automatically retries it by default. Playlist/channel URLs also fall through to generic article capture rather than an explicit unsupported YouTube state. A restricted, unavailable, or unsupported input must receive a truthful and actionable result; today the worker, UI, and input classifier do not share one supported-input contract.

### P1 — Transcript normalization is partial and method-dependent

The normalized schema is a sound start: source kind, language, caption class, timestamp mode, retention, hashes, segment timestamps, and confidence are durable (`018_transcript_policy_sources.sql`; `019_transcript_segments.sql`). It lacks speaker, processing version, partial/complete state, and segment-level errors. More importantly, automatic transcripts never enter it. The same product concept therefore has two incompatible storage models.

### P1 — Enrichment cannot support grounded long-video claims

The current schema contains only summary, quotes, category, title, and tags. The prompt sends the first 12,000 characters and discards the rest (`src/lib/enrich/prompts.ts:28-77`). The composed YouTube body begins with metadata, description, and chapters when available (`src/lib/capture/youtube-body.ts:14-44`), so the effective transcript window can be smaller still. It does not request chapters, claims/evidence, actions, entities, search metadata, or timestamp citations. Transcript content is interpolated as data, but the system contract does not explicitly instruct the model to treat it as hostile and ignore embedded instructions. Validation checks JSON shape, not whether quotes are verbatim, material claims are supported, timestamps are valid, or key points are covered (`prompts.ts:84-130`).

### P1 — Provider, model, and cost telemetry is not trustworthy

Ollama, Anthropic, and OpenRouter are selectable, and OpenRouter pins upstream order with fallbacks disabled and data collection denied (`src/lib/llm/factory.ts`; `src/lib/llm/openrouter.ts:99-109`). The enrichment pipeline nevertheless records every realtime call as Ollama, a fixed Qwen model or `unknown`, and zero cost (`src/lib/enrich/pipeline.ts:129-151,253-260`). The current `llm_usage` constraint is also not designed for OpenRouter. This blocks cost, provider, reliability, and model-comparison claims.

### P1 — Remote generation can overlap after stale-claim recovery

OpenRouter uses only an optional caller signal; the enrichment pipeline supplies none. The worker considers a running claim stale after 90 seconds and can reclaim it. A live outbound call can therefore continue while the same job is retried, creating duplicate calls, writes, and potential cost. An enforced request deadline, idempotency key/lease model, and late-result rejection are prerequisites for a production remote-provider path.

### P1 — URL and caption fetch boundaries need hardening

The generic URL path blocks obvious private, loopback, link-local, benchmark, carrier-grade NAT, multicast, and mapped addresses before the request. It fails open when DNS lookup fails and follows redirects without validating every hop (`src/lib/capture/url-safety.ts:13-35`; `src/lib/capture/url.ts:112-127`). The automatic caption path fetches a `baseUrl` supplied by an upstream player response without a strict caption-host allowlist. The YouTube video ID itself is strictly parsed and fixed-host player requests reduce risk, but downstream URLs remain untrusted.

### P1 — Timestamp-level search and navigation are absent

FTS indexes the item title/body and vectors index item chunks labeled original content or AI summary. `transcript_segments` are neither FTS nor vector units, and chunk rows lack transcript source/timestamp metadata. Item detail shows source provenance and a bounded segment preview with text timestamps, but no search-within-transcript or seek link exists. This is below the requested product contract even when acquisition succeeds.

### P2 — Retry controls and operator configuration are incomplete

Transcript jobs default to five attempts, and throttling logic can extend the cap. Provider cooldown is a useful safeguard, but worker-disable variables are absent from `.env.example`, startup backfill is easy to overlook, and there is no single declared global request/run budget for this external path.

### P2 — Overlapping draft PR #6 is unsafe to merge wholesale

Draft PR #6 is unmerged, conflicting/dirty, and based on an old merge base. It overlaps item detail, repair, item storage, prompts, and proxy/auth surfaces. Its older repair shape lacks current quality/version inputs and topic cleanup, so choosing that side of conflicts could regress transcript provenance and derived-state repair. Treat the PR only as UX intent; rebase or selectively transplant reviewed changes later.

## Existing strengths to reuse

- Strict recognition and canonicalization for the supported single-video URL shapes.
- Honest metadata-only and manual-needed states rather than silent success.
- Durable recovery jobs, attempts, cooldown, stale-claim recovery, and item repair.
- Policy/source/segment records with hashes, retention class, and supersession.
- Active user paste/file repair with bounded inputs and transactional derived-state reset.
- Provider abstraction and an OpenRouter no-fallback/data-collection-deny invariant.
- Independent enrichment and embedding failure states.
- Strong unit coverage across capture, recovery, parser, official/STT adapters, providers, and item search.

## Missing release-gate evidence and tests

1. Redirect-chain, DNS-failure/rebinding, caption-host allowlist, and resource-exhaustion tests.
2. An invariant test that every accepted transcript creates an allowed policy decision, source record, and normalized segments—or is explicitly metadata-only.
3. A contract test proving worker behavior, supported-input classification, UI copy, and Wiki status agree.
4. Prompt-injection, secret/tool request, malicious HTML/Markdown, misleading timestamp, repetition, and oversize adversarial transcripts.
5. Grounded claim, verbatim quote, timestamp citation, key-point coverage, schema-validity, multilingual, and long-video evaluation.
6. Truthful provider/model/request/route/token/price telemetry and a schema capable of representing it.
7. Request timeout, lease/idempotency, and late-result concurrency tests.
8. End-to-end transcript segment → search result → timestamp navigation tests.
9. Explicit playlist, stream, premiere, private/deleted/age/region-restricted, music/minimal-speech, sign-language, and unsupported-host results.

## Audit recommendation

- Do not treat the active InnerTube path as a production candidate until current policy research, rights/retention semantics, and a controlled benchmark explicitly support a narrow class. Do not add cookies, proxies, browser impersonation, or other bypass techniques.
- Keep creator-provided subtitle files, creator-authorized official captions, and user-owned authorized media as separate strategy classes. Do not collapse them into “YouTube transcripts.”
- Freeze a rights-safe corpus and prospective protocol before observing new results. The corpus must include negative and unsupported controls and at least four trusted reference transcripts.
- Gate dependent work. If no acquisition method clears Gate 1, stop STT and enrichment except for one clearly labeled synthetic demonstration if it adds decision value.

## Audit confidence and limitations

Confidence is high for code/schema/test and Wiki observations at the recorded commits. No production host, runtime flags, credentials, private content, live YouTube transcript behavior, paid provider, or model output was inspected. Platform-policy interpretation remains an inference pending the research recommendation and stakeholder/legal review. Draft PR #6 was inspected only as overlapping unmerged work.

A focused mocked/unit run on 2026-07-16 passed 194 tests across 28 suites with zero failures. See [QA baseline](QA_BASELINE.md). This validates existing intended contracts, not the missing release-gate invariants listed above.

## Linked evidence

- [Product feature catalog](PRODUCT_FEATURE_CATALOG.md)
- [Current processing flow](CURRENT_PROCESSING_FLOW.md)
- [Relevant code map](CODE_MAP.md)
- [Existing data model](DATA_MODEL_SUMMARY.md)
- [Current providers](PROVIDER_INVENTORY.md)
- [Wiki-versus-code discrepancies](WIKI_CODE_DISCREPANCIES.md)
- [Focused QA baseline](QA_BASELINE.md)
