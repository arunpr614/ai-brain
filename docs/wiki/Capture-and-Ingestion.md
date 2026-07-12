# Capture and Ingestion

Purpose: Document capture channels, supported content, result states, processing flow, and boundaries.
Audience: AI agents and contributors changing ingestion behavior.
Verified against: `8c1341100b174fe4ca518e6a745c30b9078df21c`.
Runtime evidence through: 2026-07-10; source/channel evidence varies.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

**Overall status:** Implemented with partial/inactive sub-capabilities · **Confidence:** High for current-main code; runtime confidence is channel-specific

| Input/channel | Status | Coverage |
|---|---|---|
| Standalone note | Implemented | Web, Android text share, Telegram text |
| URL/article | Implemented | Web, Android, extension, Telegram; selected-text support |
| YouTube | Implemented | Metadata, duration, thumbnail, best-effort transcript and quality |
| PDF | Implemented | Web and Android single-PDF extraction |
| User-provided transcript | Implemented | VTT/SRT/TXT/Markdown repair for YouTube items |
| Recall | Partially implemented | Guarded scheduled one-way import |
| Official captions / owned-media STT | Inactive | Adapters exist but current product paths are not wired |

## User journey and states

The single owner needs one trustworthy path to save several content kinds without mistaking a weak extraction for a complete source. Web and authenticated client entrypoints serve the owner; integration maintainers support channel-specific behavior.

An authenticated client submits content → request and source safety validation → canonicalization/deduplication → platform extraction → item/provenance/artifact write → canonical full/limited/duplicate/updated/failure result → enrichment/transcript queues → later search/Ask readiness.

Empty/invalid input returns validation errors; processing/loading retains pending feedback; duplicate URLs reuse existing identity; weak text is saved with explicit quality and repair guidance; provider/network failures remain retryable or manual; successful save does not promise enrichment/embedding completion.

## Data and architecture

Capture writes `items`, capture source/platform/quality fields, bounded artifact metadata/files and metadata cache. Triggers/logic enqueue enrichment; weak YouTube sources can enqueue transcript work. Android, extension, Telegram and Recall use the same domain result model but retain channel-specific authentication and feedback.

## Boundaries

- Some sources remain metadata/preview only.
- PDF has no OCR, native renderer, highlight/anchor or multi-file flow.
- Multi-PDF Android share is intentionally rejected.
- Schema enums for other formats do not establish ingestion support.
- Full repair behavior is documented in [Capture Quality, Review, and Repair](Capture-Quality-Review-and-Repair).

Primary code: `src/app/api/capture/`, capture actions/pages, `src/lib/capture/`, `src/db/items.ts`, artifacts/cache repositories, channel clients and tests.

Exact protecting suites include the four capture route tests, PDF validation, capture artifact/dedup/result/quality/policy/URL-safety/platform tests, YouTube/subplatform tests and client result tests. Configuration covers request size/time limits, optional metadata providers, artifact caps, authentication and provider availability. Operational changes can affect queues, review/repair, clients, exports and retrieval. Related: [Quality and Repair](Capture-Quality-Review-and-Repair), [Enrichment](Enrichment-and-AI-Providers), [Browser Extension](Browser-Extension), [Telegram](Telegram-Capture), and [Recall](Recall-Synchronization). Pinned evidence: [current capture source](https://github.com/arunpr614/ai-brain/tree/23868faf13c8e3d0821715e6f5d0e3d2af1e1a34/src/lib/capture).
