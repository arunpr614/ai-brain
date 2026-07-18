# Wiki-versus-Code Discrepancy Report

**Repository baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`<br>
**Wiki baseline:** `e884daa628c28498bbbacd09c164b8cbba6030d5`<br>
**Compared:** 2026-07-16

The maintained Wiki is generally careful about feature status. The discrepancies below are either material conflicts or precision gaps that should be resolved in the publication step.

| Severity | Wiki statement or omission | Code evidence | Required correction |
|---|---|---|---|
| P0 | Recovery documentation/UI describes automatic public extraction as unavailable in production or emphasizes manual repair. | `src/instrumentation.ts:63-71` starts the transcript worker; `src/lib/queue/transcript-worker.ts:48-70` makes it default-on; recovery calls `youtube_innertube_timedtext`. | State explicitly that current code automatically retries the unofficial timed-text path unless disabled, and mark its policy posture unresolved. |
| P1 | `Capture-and-Ingestion` calls YouTube “implemented” with a best-effort transcript without identifying the acquisition mechanism. | `src/lib/capture/youtube.ts` calls fixed InnerTube player and returned timed-text URLs rather than an official supported captions API. | Preserve implemented status but disclose unofficial mechanism, operational brittleness, and the distinction from official creator-authorized captions. |
| P1 | Quality/repair pages describe policy/source/segment writes broadly enough to imply consistent transcript provenance. | Automatic capture/recovery stores body/artifact/jobs but does not create `capture_policy_decisions`, `transcript_sources`, or `transcript_segments`. | Separate the automatic legacy path from policy-aware paste/upload/official/STT library paths. |
| P1 | Enrichment pages describe provider choice but only briefly qualify usage debt. | `src/lib/enrich/pipeline.ts:129-151,253-260` hardcodes Ollama/Qwen/zero cost for every realtime provider. | Say that current provider/model/cost telemetry is unsuitable for billing, benchmarking, or user-facing cost claims. |
| P2 | Feature pages mention transcript preview but do not make the missing interaction contract explicit. | `src/app/items/[id]/page.tsx:1267-1350` renders bounded segments and timestamp labels; no seek links or transcript-local search exist. | Classify search-within-transcript and timestamp navigation as not implemented. |
| P2 | Feature catalog says user transcript repair is for YouTube items but does not clearly distinguish available methods from inactive adapters. | Paste/upload API is active; official caption code has no runtime caller; owned-media route returns `provider_disabled`. | Use separate rows/statuses for paste/upload, official OAuth captions, and owned-media STT. |
| P2 | Environment/operations pages do not surface transcript worker disable variables. | `YOUTUBE_TRANSCRIPT_RECOVERY_ENABLED` and `YOUTUBE_TRANSCRIPT_WORKER_ENABLED` control a default-on worker; neither is in `.env.example`. | Document both flags, default behavior, backfill-on-startup effect, and safe disable procedure. |
| P2 | Multiple Wiki pages pin code evidence to `23868faf…`. | Current audited `main` is `ad78d774…`; relevant behavior has newer maintained evidence. | Refresh evidence links only after the research branch’s facts are reviewed; retain verification dates and history. |
| P2 | Older root trackers and a stale source comment say the item body is a pure transcript. | `src/lib/capture/youtube-body.ts:14-44` prepends metadata, description, chapters, and transcript; current tests expect the composition. | Mark the older “pure transcript” design as superseded and document its effect on chunking and the 12,000-character enrichment window. |
| P2 | Root build/roadmap trackers still present `yt-dlp` as planned acquisition work. | Current implementation uses InnerTube; the Wiki correctly calls the initial `yt-dlp` design superseded. | Reclassify old tracker rows as historical/superseded; do not imply `yt-dlp` is an approved production next step. |
| P3 | Some documentation calls the 7,200-segment guard a two-hour cap. | `src/lib/capture/youtube.ts:45,346-366` limits segment count, not media duration. | Describe it as a 7,200-segment cap and treat “about two hours” only as an estimate. |

## Accurate Wiki statements to preserve

- User-provided transcript repair is implemented.
- Official captions and owned-media transcription are not active product paths.
- The production backfill runner is operator-only and its execution is not established by code presence.
- Usage accounting can mislabel non-Ollama generation and is incomplete for cost.
- Save, transcript, enrichment, embedding, and other processing states can fail independently.

## Publication guardrail

The Wiki update must not claim that an acquisition method is legal, policy-approved, reliable in production, or threshold-passing until the corresponding gate evidence exists. It must not publish local paths, complete transcripts, media, private URLs, credentials, or unverified runtime claims.
