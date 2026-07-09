# Recall Daily Sync Source Inventory

Created: 2026-06-24 08:58 IST
Author: Codex
Purpose: Evidence register for the Recall -> AI Brain daily sync research goal.

## Current External Sources Checked

| ID | Source | Retrieved | Key facts used | Freshness note |
|---|---|---:|---|---|
| EXT-01 | https://docs.recall.it/developer/api | 2026-06-24 | REST API is read-only; base URL `https://backend.getrecall.ai/api/v1`; API key created in Settings -> API & MCP; key starts with `sk_`; list/get/search endpoints; date filters documented; `max_chunks` 1-50 on card retrieval. | Current docs, but must be verified against live account because old empirical test found some params ignored. |
| EXT-02 | https://docs.recall.it/developer/mcp | 2026-06-24 | MCP server URL `https://backend.getrecall.ai/mcp/`; OAuth browser auth; read-only; tools are `search`, `filter_by_metadata`, `get_document_content`, `explore_kb`; scope is `kb:read`. | Current docs; good for assistant access, less obviously suitable for unattended cron. |
| EXT-03 | https://docs.recall.it/getting-started/2-add-content | 2026-06-24 | Recall creates cards from browser extension, in-app add content, and mobile share; supports URLs, PDFs, notes, and mobile capture workflows. | Current docs; validates user scenario. |
| EXT-04 | https://docs.recall.it/supported-content/all-supported-content | 2026-06-24 | Supported content includes YouTube videos/shorts, TikTok, Vimeo, PDFs, Google Docs/Slides, websites/articles/blogs, podcasts, bookmarks, Pocket, Markdown notes, X, Reddit, LinkedIn; documents limits such as 100 MB PDFs and private/paywalled constraints. | Current docs; feature support can shift quickly. |
| EXT-05 | https://docs.recall.it/getting-started/7-exporting-content | 2026-06-24 | Recall can export a single page or entire knowledge base as Markdown zip from the web app. | Current docs; useful fallback/bootstrap path, not a daily automation path. |
| EXT-06 | https://feedback.recall.it/changelog | 2026-06-24 | Changelog mentions improved search/export, browser extension update, and future write API / scalable bulk content investment. | Public changelog was accessible in this session; still not an API contract. |
| EXT-07 | https://docs.recall.it/recall-roadmap | 2026-06-24 | Roadmap calls out Chat 2.0 filters, better article parsing, highlights, mobile sharing, more content support, tagging/connections, and performance. | Useful product direction, not implementation contract. |

## Existing Local Sources Checked

| ID | Source | Key facts used |
|---|---|---|
| LOCAL-01 | `docs/research/recall-feature-audit-v2-2026-05-12.md` | Prior Recall feature audit; confirms earlier API/MCP awareness but must not be treated as fresh. |
| LOCAL-02 | `ReviewReport/AI_BRAIN_COMPETITOR_RESEARCH_FEATURE_RECOMMENDATIONS_2026-06-10_23-46-33_IST.md` | Prior competitor synthesis; recommends API/MCP as strategic future direction. |
| LOCAL-03 | `/Users/arun.prakash/Documents/arunvault/Arun2026/Initiatives/Arun_AI_Projects/Lenny_Export/Recall_import/FINDINGS.md` | Empirical Recall import findings from 2026-04-25: `/api/v1/cards` returned first 500 cards and ignored pagination params; only `total_count` was meaningful in that probe; API key and Firebase auth are separate; UI automation required persistent browser profile. |
| LOCAL-04 | `src/app/api/capture/url/route.ts` | AI Brain URL capture endpoint and dedupe/update path. |
| LOCAL-05 | `src/app/api/capture/note/route.ts` | AI Brain note capture endpoint and insert path. |
| LOCAL-06 | `src/app/api/capture/pdf/route.ts` | AI Brain PDF upload endpoint and bearer/cookie auth. |
| LOCAL-07 | `src/db/items.ts` | `insertCaptured`, `findItemByUrl`, quality/source filters, and item list behavior. |
| LOCAL-08 | `src/db/client.ts` | Item schema fields: `source_type`, `capture_source`, `source_url`, `body`, enrichment fields, capture quality/provenance fields. |
| LOCAL-09 | `src/lib/queue/enrichment-batch-cron.ts` | Existing node-cron pattern for daily/periodic server-side work. |
| LOCAL-10 | `src/instrumentation.ts` | Existing server bootstrap path for starting workers/schedulers. |
| LOCAL-11 | `src/lib/capture/types.ts` and `src/lib/capture/platform.ts` | Existing `CapturePlatform` and `CaptureQuality` unions; no explicit `recall` platform today. |
| LOCAL-12 | `docs/plans/spikes/README.md` | Spike report naming and structure convention. |

## Evidence Conflicts To Resolve In Spikes

1. Current Recall docs document `date_from` and `date_to` filters on `/api/v1/cards`; the April empirical findings reported that many params, including pagination-like params and possible created-after attempts, were ignored.
2. Current docs show `/api/v1/cards/{card_id}` returns up to `max_chunks=50`; that may be insufficient for long PDFs, podcasts, or videos if the goal is full-fidelity AI Brain import.
3. Current MCP docs describe OAuth/browser authentication and read tools; older empirical notes said MCP auth with API key was assumed/not verified. Treat MCP automation as unproven until tested.
4. Recall Markdown export is documented but manual/web-app based. It may work for bootstrap reconciliation, but there is no documented daily export API.
