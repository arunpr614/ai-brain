# Enrichment and AI Providers

Purpose: Explain generated content, provider selection, queues, retries, note consent, and known telemetry/batch risks.
Audience: AI agents changing AI, embeddings, prompts, queues, or provider configuration.
Verified against: `167a15d57b8f70574a017ea4cda507870f3600d4`.
Runtime evidence through: 2026-07-22; strict Anthropic/Gemini checks passed for the protected-main release. NotebookLM remains UI-only and is not an enrichment provider.
Last reviewed: 2026-07-22.
Owner: AI Brain maintainer.

**Status:** Implemented · **Confidence:** High · **Availability:** Provider-configured

The owner needs useful derived metadata and semantic readiness after capture; maintainers need provider failures to remain observable and recoverable without damaging source text.

**Target user:** the single owner consuming derived content; maintainers operating provider and queue policy.

The architecture/runtime flow is capture completion → enrichment job → provider API entrypoint → generated item data storage → chunk/embed job → retrieval readiness. Authentication protects provider-status/settings APIs; privacy and attached-note consent determine eligible content.

Captured items enter enrichment jobs. The pipeline generates title, digest, quotes, category, tags and topics, then creates chunk/embed work. Enrichment and embedding state are separate; a vector failure does not erase valid captured/generated content.

| Capability | Providers |
|---|---|
| Text generation | Ollama, Anthropic, OpenRouter |
| Embeddings | Ollama and Gemini at the configured 768-dimensional contract |
| Owned-media speech-to-text | Adapter code exists, but the route is inactive |

Provider status is point-in-time. Local defaults may differ from the verified hosted provider choice. Attached-note AI adds rollout flags, per-note opt-in and a provider/model/destination acknowledgement; exact note search is independent.

NotebookLM is outside this enrichment/provider-selection pipeline. It is an experimental post-save export of one frozen copied-text item through the owner's signed-in Chrome session to one fixed private consumer notebook. It neither generates AI Memory metadata nor supplies embeddings/Ask. Production is `1:0:0`, so its durable queue and provider writes are off; the extension artifact is not loaded/paired and no live target/source/canary is claimed.

## Queue behavior and failure states

Jobs record pending/running/completed/failed attempts. Provider timeout/outage can leave retryable state; stale claims require careful recovery. Current instrumentation starts both continuous enrichment and a nightly batch path against the same pending queue. Static control flow suggests continuous processing can consume work before batching, so document actual batch behavior only after measurement.

| State | Behavior |
|---|---|
| Empty/pending queue | Worker idles or claims the next eligible item |
| Loading/running | Durable claim and provider request; UI shows processing state |
| Success | Generated fields persist, then chunk/embed work becomes eligible |
| Failure | Attempt/error state remains without erasing captured content; retry policy applies |

Known debt: realtime enrichment/Ask usage records can label non-Ollama traffic as Ollama and do not provide complete model/cost fidelity; Ask retains an Ollama-specific model coupling.

Primary files for enrichment are `src/lib/enrich/`, `llm/`, `embed/`, `providers/`, queue modules, instrumentation, settings/provider routes and tests. NotebookLM instead lives under `src/lib/notebooklm/`, dedicated API/DB/UI modules, and `extension/src/notebooklm/`; do not add it to the generic LLM provider factory.

Protecting suites include enrichment pipeline/worker/batch/batch-cron tests, provider factory/adapters/status tests and embedding client/factory/Gemini/pipeline tests. Configuration selects provider, endpoint/key/model/dimensions, timeouts and batch behavior; note AI adds separate rollout/consent rules. Operational changes affect capture readiness, search/Ask, taxonomy, usage records and queues. Related: [Capture](Capture-and-Ingestion), [Search and Ask](Search-RAG-and-Ask), [Manual Notes](Manual-Content-Notes), and [Known Limitations](Known-Limitations-and-Technical-Debt). Pinned evidence: [protected-main enrichment source](https://github.com/arunpr614/ai-brain/tree/167a15d57b8f70574a017ea4cda507870f3600d4/src/lib/enrich).
