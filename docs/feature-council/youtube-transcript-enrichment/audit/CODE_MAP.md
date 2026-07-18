# Relevant Code Map

**Baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`<br>
**Audited:** 2026-07-16

## Capture and URL recognition

| Concern | Primary evidence | Notes |
|---|---|---|
| YouTube URL shapes and canonicalization | `src/lib/capture/youtube-url.ts:18-42`; `src/lib/capture/platform.ts:23-58` | Watch, short-link, Shorts, mobile, embed; strict 11-character ID |
| Capture API guards/result handling | `src/app/api/capture/url/route.ts` | Authentication, request validation, origin, dedupe/create/upgrade, enqueue |
| Capture routing | `src/lib/capture/capture-url.ts:28-75` | Selected/user text precedes automatic YouTube extraction |
| Automatic YouTube extraction | `src/lib/capture/youtube.ts:37-50,143-179,223-414` | Fixed InnerTube client, timed-text URL fetch, metadata-only fallbacks |
| Optional official metadata | `src/lib/capture/youtube-metadata.ts` | YouTube Data API key; metadata/cache only |
| Inline user-text capture | `src/lib/capture/youtube-user-text.ts:15-68` | Saves user text/artifact without automatic retrieval, but does not use the transcript policy/source/segment model |
| Generic URL safety/fetch | `src/lib/capture/url-safety.ts:13-35`; `src/lib/capture/url.ts:48-58,112-171` | Pre-fetch DNS/private-IP check; redirects followed without hop revalidation |
| Capture artifacts and quality | `src/lib/capture/artifacts.ts`; `src/lib/capture/quality.ts`; `src/lib/capture/result.ts` | Raw artifacts, quality state, canonical user-visible result |

## Transcript acquisition, normalization, and repair

| Concern | Primary evidence | Notes |
|---|---|---|
| Rights/policy decision API | `src/lib/capture/policy.ts:66-192` | User transcript, official captions, owned media, lab method |
| User transcript API | `src/app/api/capture/transcript/route.ts` | Cookie/bearer; JSON paste or multipart; bounded input |
| User transcript persistence | `src/lib/capture/transcripts/user-provided.ts` | Policy, source, segments, repair transaction |
| Subtitle/text parser | `src/lib/capture/transcripts/parse-file.ts` | VTT/SRT/TXT/Markdown normalization and timestamp modes |
| Official caption adapter | `src/lib/capture/transcripts/youtube-official.ts:110-239` | OAuth list/download, track selection, VTT parsing, provenance; no product caller |
| Owned-media validation/persistence | `src/lib/capture/transcripts/owned-media-stt.ts`; `owned-media-stt-route-service.ts` | Rights attestation, type/size/hash/duration, source/segments |
| Hosted STT adapter | `src/lib/capture/transcripts/openai-owned-media-stt.ts` | OpenAI-compatible transcription adapter; not enabled in runtime route |
| Owned-media public route | `src/app/api/transcripts/owned-media/route.ts:15-109` | Cookie auth and validation, then explicit `503 provider_disabled` |
| Repair semantics | `src/lib/repair/item-repair.ts` | Replaces source text and resets enrichment/search-derived state |
| Recovery options/UI contract | `src/lib/capture/transcripts/recovery-options.ts`; `src/app/items/[id]/repair/page.tsx` | Available/manual/gated/unavailable choices |

## Jobs, retries, and runtime

| Concern | Primary evidence | Notes |
|---|---|---|
| Transcript queue repository | `src/db/transcript-jobs.ts` | Claims, attempts, retry/manual/ignore/done, backfill |
| Automatic recovery implementation | `src/lib/capture/youtube-transcript/recovery.ts` | Reuses `youtube_innertube_timedtext` |
| Transcript worker | `src/lib/queue/transcript-worker.ts:48-89,98-189,191-340` | Default-on unless disabled; cooldown/backoff; repair |
| Provider health/cooldown | `src/lib/capture/youtube-transcript/provider-health.ts` | Throttle-aware provider-wide state |
| Production backfill utility | `scripts/backfill-youtube-transcripts-prod.mjs`; `src/lib/capture/youtube-transcript/backfill.ts` | Operator-only write path; runtime execution not established |
| Enrichment worker | `src/lib/queue/enrichment-worker.ts:31-38,65-110,128-209` | Three attempts, 90-second stale claim, then embedding |
| Startup wiring | `src/instrumentation.ts:25-71` | Migrations and in-process workers start on Node runtime boot |

## Enrichment and providers

| Concern | Primary evidence | Notes |
|---|---|---|
| Prompt and schema | `src/lib/enrich/prompts.ts:28-130` | Five-field JSON; 12,000-character head truncation; structural validation only |
| Enrichment transaction and usage | `src/lib/enrich/pipeline.ts:129-151,153-260` | Provider factory call; atomic item/tag/topic write; usage hardcoded as local Ollama |
| Provider factory | `src/lib/llm/factory.ts:47-93` | Ollama, Anthropic, OpenRouter; separate enrich/Ask configuration |
| OpenRouter | `src/lib/llm/openrouter.ts:37-109,124-180` | Canonical request body, no fallbacks, data-collection deny; no enforced timeout without caller signal |
| Anthropic | `src/lib/llm/anthropic.ts` | Messages, streaming, JSON, and optional batch |
| Ollama | `src/lib/llm/ollama.ts` | Default local provider |
| Embedding providers | `src/lib/embed/factory.ts`; `src/lib/embed/gemini.ts`; `src/lib/embed/client.ts` | Ollama or Gemini under 768-dimension contract |

## Storage, indexing, and UI

| Concern | Primary evidence | Notes |
|---|---|---|
| Item/capture columns | `src/db/migrations/001_initial_schema.sql`; `013_capture_quality.sql` | Source text and generated fields coexist on item |
| Jobs/attempts | `src/db/migrations/017_transcript_recovery.sql` | Durable transcript state machine |
| Policy/source provenance | `src/db/migrations/018_transcript_policy_sources.sql` | Rights, method, retention, source hash/status |
| Transcript segments | `src/db/migrations/019_transcript_segments.sql` | Start/end/duration/text/hash/confidence; no speaker/version/partial fields |
| FTS | `src/db/migrations/002_fts5.sql`; `src/lib/search/index.ts` | Title/body item-level FTS |
| Source-aware chunks/vectors | `src/db/migrations/023_source_aware_chunks.sql`; `src/lib/embed/pipeline.ts` | Original content and AI summary chunks, not transcript segments |
| Item detail transcript display | `src/app/items/[id]/page.tsx:1267-1350` | Source and bounded segment preview; timestamps are plain text |
| Review and repair UI | `src/app/review/`; `src/app/items/[id]/repair/` | Retry, ignore, paste/upload, gated adapters |

## Protecting tests

The strongest relevant suites are under `src/lib/capture/**/*.test.ts`, `src/app/api/capture/**/*.test.ts`, `src/db/transcript-jobs.test.ts`, `src/lib/queue/transcript-worker.test.ts`, `src/lib/enrich/pipeline.test.ts`, `src/lib/llm/*.test.ts`, `src/lib/embed/*.test.ts`, `src/lib/search/index.test.ts`, and `src/lib/retrieve/index.test.ts`. The focused audit’s missing release-gate tests are listed in the synthesis.
