# Enrichment and AI Providers

Purpose: Explain post-capture AI processing, provider selection, retries, and failure states.
Audience: AI agents working on enrichment, embeddings, queues, or providers.
Verified against: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` and `8178117c80923e5724e355fb2684cbc836013d39`.
Runtime evidence through: 2026-06-17 for tied provider evidence; complete production tree SHA is Unknown.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

## Pipeline

Captured items enter an enrichment queue. The worker loads the current item, applies prompts and provider selection, writes summaries and taxonomy, then triggers or coordinates chunking and embeddings. Enrichment state and embedding state are separate so a vector failure does not erase successful generated content.

Pinned source: [enrichment pipeline](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/enrich/pipeline.ts), [prompts](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/enrich/prompts.ts), [worker](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/queue/enrichment-worker.ts), and [embedding factory](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/embed/factory.ts).

## Providers

| Capability | Source-wired providers | Notes |
|---|---|---|
| Text generation | Anthropic, OpenRouter, Ollama | Selection depends on configuration and factory policy |
| Embeddings | Gemini, Ollama | Stored vectors must match configured dimensions |
| Owned-media speech-to-text | Provider adapters in the worktree | Requires explicit ownership and configured provider |

Provider status is point-in-time. A green settings check does not guarantee future requests, and local provider availability may differ from hosted runtime availability.

## Queue Behavior

Jobs track queued, running, completed, and failed states with attempts and errors. Batch/cron helpers claim work, apply retry/backoff policy, and avoid leaving unreachable running jobs. Error messages must be redacted before persistence or display.

## Failure Separation

- Capture extraction can fail before an item is useful.
- Enrichment can fail while captured text remains available.
- Embedding can fail after summary/taxonomy succeeds.
- Provider status can pass while a later request times out.
- A retry can duplicate work unless job claiming and item writes are idempotent.

When debugging, inspect the exact stage and state transition. Avoid resetting both enrichment and embeddings when only one stage is damaged.

## Usage and Privacy

Provider requests may send item content outside the application host according to the configured provider. Public docs describe provider classes, not credentials or private prompts containing user content. Logs should record safe status, timing, model/provider identity, and redacted errors without raw library text.

See [Search, RAG, and Ask](Search-RAG-and-Ask), [Security, Privacy, and Redaction](Security-Privacy-and-Redaction), and [Troubleshooting](Troubleshooting).
