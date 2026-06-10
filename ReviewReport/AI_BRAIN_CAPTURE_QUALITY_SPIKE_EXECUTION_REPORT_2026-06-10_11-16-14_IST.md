# AI Brain Capture Quality Spike Execution Report

**Created:** 2026-06-10 11:16:14 IST  
**Author:** Codex  
**Scope:** Executed the capture-quality spikes defined in `ReviewReport/AI_BRAIN_CAPTURE_QUALITY_SPIKE_REQUIREMENTS_2026-06-10_10-50-50_IST.md`.  
**Production impact:** None. No production data, deploy, commit, or staging action was performed.

---

## Executive Summary

The spikes have enough evidence to guide the next implementation plan.

Recommended direction:

1. Build a platform-aware capture quality foundation first.
2. Keep the v0.7.4 YouTube oEmbed anti-bot fallback.
3. Add richer YouTube/Shorts metadata, but make official YouTube Data API optional until a key is configured.
4. For Substack, use Readability-first with metadata/RSS enrichment; do not make RSS the primary body source yet.
5. For LinkedIn, support metadata-only server capture plus explicit paste/selected-text capture. Do not build server scraping or LinkedIn-specific DOM extraction.
6. Add raw artifact storage, but cap raw HTML and keep files out of the main SQLite DB.
7. Defer third-party provider integration as a default. Jina is useful as an optional public-URL fallback later.
8. Treat Substack email ingestion as promising but not proven until real sanitized examples are provided.

---

## Reports Created

| Spike | Verdict | Report |
|---|---|---|
| SPIKE-006 | CLEAR | `docs/plans/spikes/SPIKE-006-capture-evaluation-harness-2026-06-10_11-16-14_IST.md` |
| SPIKE-007 | PROCEED-WITH-CHANGES | `docs/plans/spikes/SPIKE-007-youtube-metadata-ladder-2026-06-10_11-16-14_IST.md` |
| SPIKE-008 | PROCEED-WITH-CHANGES | `docs/plans/spikes/SPIKE-008-substack-extraction-ladder-2026-06-10_11-16-14_IST.md` |
| SPIKE-009 | PROCEED-WITH-CHANGES | `docs/plans/spikes/SPIKE-009-linkedin-safe-capture-path-2026-06-10_11-16-14_IST.md` |
| SPIKE-010 | PROCEED-WITH-CHANGES | `docs/plans/spikes/SPIKE-010-capture-artifact-storage-2026-06-10_11-16-14_IST.md` |
| SPIKE-011 | DEFER | `docs/plans/spikes/SPIKE-011-extraction-provider-benchmark-2026-06-10_11-16-14_IST.md` |
| SPIKE-012 | INCONCLUSIVE-BUT-PROMISING | `docs/plans/spikes/SPIKE-012-substack-email-ingestion-2026-06-10_11-16-14_IST.md` |

---

## Evidence Files

| Evidence | Path |
|---|---|
| Fixture manifest | `data/spikes/capture-quality/fixtures.json` |
| Shared harness helper | `scripts/spikes/capture-quality-lib.mjs` |
| Baseline harness results | `data/spikes/capture-quality/results/capture-eval-2026-06-10_11-13-53.jsonl` |
| YouTube ladder results | `data/spikes/capture-quality/results/youtube-metadata-ladder-2026-06-10_11-10-33.jsonl` |
| Substack ladder results | `data/spikes/capture-quality/results/substack-extraction-ladder-2026-06-10_11-15-34.jsonl` |
| LinkedIn results | `data/spikes/capture-quality/results/linkedin-safe-capture-2026-06-10_11-11-50.jsonl` |
| Artifact storage summary | `data/spikes/capture-artifacts/run-2026-06-10_11-11-56/artifact-storage-summary.json` |
| Provider benchmark results | `data/spikes/capture-quality/results/extraction-provider-benchmark-2026-06-10_11-13-07.jsonl` |
| Substack email results | `data/spikes/capture-quality/results/substack-email-ingestion-2026-06-10_11-13-28.jsonl` |

---

## Cross-Spike Metrics

### Current Baseline

| Platform | Fixtures | Failures | Avg Score | Avg Body Chars |
|---|---:|---:|---:|---:|
| YouTube videos | 5 | 0 | 3.60 | 14,880 |
| YouTube Shorts | 5 | 0 | 1.80 | 1,586 |
| Substack | 8 | 0 | 4.38 | 8,431 |
| LinkedIn | 5 | 0 | 3.00 | 2,202 |
| Generic articles | 3 | 0 | 4.33 | 25,950 |
| JS-heavy pages | 3 | 0 | 3.67 | 5,470 |
| Expected failures | 3 | 1 | 1.33 | 79 |

### YouTube Ladder

| Candidate | Fixtures | Failures | Avg Score | Avg Body Chars |
|---|---:|---:|---:|---:|
| Current capture | 10 | 0 | 2.70 | 8,233 |
| Metadata header + current body | 10 | 0 | 2.70 | 8,341 |
| Metadata only | 10 | 0 | 2.00 | 106 |

`YOUTUBE_DATA_API_KEY` was not set, so the official YouTube Data API comparison did not run.

### Substack Ladder

| Candidate | Fixtures | Failures | Avg Score | Avg Body Chars |
|---|---:|---:|---:|---:|
| Readability | 8 | 0 | 4.13 | 8,431 |
| RSS entry | 8 | 7 | 0.38 | 971 |
| JSON-LD | 8 | 0 | 1.88 | 85 |
| Best of ladder | 8 | 0 | 4.13 | 8,575 |

Substack result changed the original recommendation: RSS should enrich/fallback, not lead.

### LinkedIn Safe Capture

| Candidate | Fixtures | Failures | Avg Score | Avg Body Chars |
|---|---:|---:|---:|---:|
| Server metadata | 5 | 0 | 3.00 | 1,495 |
| User paste | 3 | 0 | 4.00 | 258 |

Server metadata is acceptable for bookmark/preview. User-provided text is the safe high-quality path.

### Artifact Storage

| Metric | Value |
|---|---:|
| Items sampled | 13 |
| Total artifact bytes before cleanup | 2,224,467 |
| Average artifact bytes per item | 171,113 |
| Max artifact bytes per item | 343,337 |
| Prototype SQLite DB bytes | 16,384 |

Filesystem artifacts are feasible if capped and cleaned up.

### Provider Benchmark

| Provider | Fixtures | Failures/Skipped | Avg Score | Avg Body Chars |
|---|---:|---:|---:|---:|
| Local Readability | 11 | 0 | 4.45 | 14,038 |
| Jina Reader | 11 | 0 | 4.00 | 35,248 |
| Firecrawl | 11 | 11 skipped | 0.00 | 0 |
| Browserless | 11 | 11 skipped | 0.00 | 0 |

Local extraction beat Jina overall. Jina was useful on a few docs/JS-heavy pages, so it belongs as an optional fallback later, not a default.

### Substack Email

| Candidate | Fixtures | Failures | Avg Score | Avg Body Chars |
|---|---:|---:|---:|---:|
| Email body | 2 | 0 | 4.00 | 624 |

This used synthetic samples, so the verdict is promising but not proven.

---

## Main Product Decisions

### Proceed Now

- Capture-quality score/label foundation.
- Platform detection for YouTube, YouTube Shorts, Substack, LinkedIn, generic.
- UI capture labels: transcript, metadata only, preview, full text, email body, user-provided full text, failed.
- YouTube structured body builder.
- Substack metadata enrichment around Readability.
- LinkedIn metadata-only capture.
- Paste/selected-text capture path.
- Capped filesystem artifact storage.

### Proceed Later / Optional

- YouTube Data API after `YOUTUBE_DATA_API_KEY` is configured.
- Jina provider fallback for public URLs only.
- Firecrawl/Browserless benchmark after keys/endpoints are provided.
- Gmail/inbound email integration after manual Substack email capture proves useful.

### Do Not Build As Default

- Server-side LinkedIn full-text scraping.
- LinkedIn-specific browser DOM extraction.
- Third-party extraction provider as first capture attempt.
- Raw HTML artifact storage without caps.
- Gmail integration before validating manual email capture.

---

## Sources Used For Policy/Provider Context

- YouTube Data API videos resource: https://developers.google.com/youtube/v3/docs/videos
- YouTube Data API quota cost: https://developers.google.com/youtube/v3/determine_quota_cost
- Substack RSS feed support: https://support.substack.com/hc/en-us/articles/360038239391-Is-there-an-RSS-feed-for-my-publication
- LinkedIn prohibited software and extensions: https://www.linkedin.com/help/linkedin/answer/a1341387
- Chrome `activeTab`: https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
- Chrome content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Jina Reader: https://jina.ai/reader/
- Firecrawl scrape endpoint: https://docs.firecrawl.dev/api-reference/endpoint/scrape

---

## Recommended Next Implementation Plan

Build v0.7.5 in this order:

1. Add capture quality model and labels.
2. Add platform router.
3. Improve YouTube/Shorts body construction using available metadata.
4. Add Substack adapter using Readability-first plus metadata enrichment.
5. Add LinkedIn metadata-only adapter.
6. Add manual paste/selected-text capture path.
7. Add artifact storage with caps and cleanup.
8. Defer optional provider fallback and email/Gmail work until after the core quality foundation ships.

