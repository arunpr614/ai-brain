# Recall -> AI Brain Daily Sync Research Report V1

Created: 2026-06-24 08:58 IST
Author: Codex
Status: V1 research report; requires adversarial review before V2
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Source inventory: `docs/research/recall-sync/00_SOURCE_INVENTORY_2026-06-24_08-58-33_IST.md`

## User Goal

Whenever new content is added to Recall, whether YouTube, PDF, notes, articles, or other supported content, AI Brain should have a daily job that imports the newly added Recall data into AI Brain / AI Memory. The requested outcome is research, ideation, adversarial review, revised research, spike design, spike requirement docs with adversarial review, and final implementation options.

## Executive Summary

The most plausible implementation path is a one-way daily pull from Recall into AI Brain using Recall's REST API, plus an AI Brain import adapter that writes directly into the existing `insertCaptured()` pipeline with Recall-specific provenance and dedupe metadata. The importer should not call AI Brain's `/api/capture/*` routes; those routes are optimized for external clients and re-extraction, while Recall can already provide extracted card content.

This is not ready for implementation without spikes. The biggest unknown is whether Recall's current `/api/v1/cards` date filters can reliably enumerate newly created cards. Current public docs say list cards supports `date_from`, `date_to`, `tags`, and `source_url_contains`, but an older empirical live-account probe from 2026-04-25 found the cards endpoint returned only the first 500 cards and ignored pagination parameters. If `date_from` works now, daily sync is straightforward. If it does not, a reliable daily sync may need a hybrid approach using search probes, Markdown export reconciliation, or Chrome automation.

The second major unknown is content completeness. Recall's documented `GET /api/v1/cards/{card_id}` returns content chunks with `max_chunks` capped at 50. That may be enough for many articles and notes, but it may not reproduce large PDFs, podcasts, and long videos with full fidelity. AI Brain should not claim "full text" unless a spike proves the retrieved chunks cover the full card.

Recommended V1 direction:

1. Prefer a REST API daily poller as the primary design.
2. Store Recall card IDs and sync checkpoints in AI Brain.
3. Import Recall cards as AI Brain items with explicit Recall provenance.
4. Treat imported content as `recall_card_snapshot` or `recall_chunks` quality until fidelity is proven.
5. Use MCP only as a comparison/access spike, not as the first cron implementation.
6. Keep Markdown export and Chrome automation as fallback/bootstrap options, not the first daily sync path.

## What Recall Provides Today

### Capture And Content Model

Recall creates a "Recall Card" whenever content is added. The docs describe three main content-add paths: browser extension, in-app add content, and mobile share. A card contains a read-only version of original content, a notebook, and AI features such as summaries, chat, graph visualization, and review scheduling.

Recall's supported content list currently includes online videos, PDFs, Google Docs/Slides, online articles/blogs/websites, podcasts, bookmark/Pocket/Markdown bulk imports, and social content such as X, Reddit, and LinkedIn. The docs also note content limitations such as private/member content, paywalls, PDF size limits, and source-specific restrictions.

### REST API

Recall documents a read-only REST API:

- Base URL: `https://backend.getrecall.ai/api/v1`
- Auth: `Authorization: Bearer sk_...`
- API key source: Recall web app -> Settings -> API & MCP
- Keys are shown only once and can have expirations.
- Write API is not currently available.

Documented endpoints:

1. `GET /api/v1/cards`
   - Lists cards matching filters.
   - Documented filters: `tags`, `date_from`, `date_to`, `source_url_contains`.
   - Response includes `results` and `total_count`.
   - Card preview includes `id`, `title`, `created_at`, optional `image`, optional `source_url`.

2. `GET /api/v1/cards/{card_id}`
   - Returns a single card and content chunks.
   - Parameters: `focus_query`, `max_chunks`.
   - `max_chunks` range is 1-50, default 20.
   - Chunks include `chunk_id`, `content`, optional `source`, optional `timestamps`.

3. `GET /api/v1/search`
   - Runs semantic search across cards.
   - Parameters include query, mode, card id, tags, date range, and source URL substring.
   - Useful for spot checks and discovery, not obviously sufficient for enumeration.

### MCP Server

Recall documents a read-only MCP server at:

```text
https://backend.getrecall.ai/mcp/
```

The MCP path uses browser-based OAuth in supported clients and requests `kb:read`. It exposes four tools:

- `search`
- `filter_by_metadata`
- `get_document_content`
- `explore_kb`

MCP is promising for interactive assistants and possibly a local spike, but it is less obviously appropriate for a server-side unattended daily cron because the documented flow is browser OAuth, not a stable API key.

### Markdown Export

Recall can export a single page or the entire knowledge base as Markdown from the web app. This is valuable for bootstrap, backup, or reconciliation, but the docs do not describe a headless export API or daily automation path.

## Existing AI Brain Integration Points

### Current Capture Pipeline

AI Brain already has mature capture destinations:

- URL capture: `src/app/api/capture/url/route.ts`
- Note capture: `src/app/api/capture/note/route.ts`
- PDF capture: `src/app/api/capture/pdf/route.ts`
- Shared insertion path: `insertCaptured()` in `src/db/items.ts`
- Item schema: `src/db/client.ts`
- Enrichment and semantic indexing workers: `src/lib/queue/*`

The key insertion contract is `insertCaptured(input)`. New items enter AI Brain with source metadata, capture quality, extraction method/version, and then move through enrichment and embedding.

The architecture subagent confirmed this should be the primary integration point:

```text
Recall API -> Recall client/mapper -> insertCaptured -> items row -> enrichment_jobs trigger -> enrichment worker/batch -> embedding_jobs trigger -> chunks/vectors/search
```

This keeps Recall-imported content on the same internal pipeline as web, Android, Telegram, PDF, and note capture while avoiding public capture-route auth/origin concerns.

### Existing Scheduler Pattern

AI Brain already uses `node-cron` in `src/lib/queue/enrichment-batch-cron.ts`, started from `src/instrumentation.ts`. A Recall sync scheduler can follow the same pattern:

- global guard for HMR/idempotence;
- cron expression against host time;
- safe logging;
- short-circuit when disabled by env;
- no crash on tick failure.

However, the architecture recommendation is to start with a CLI that can be run by system cron, then optionally wrap it with an in-process cron later. A CLI-first design is easier to dry-run, easier to run manually during spikes, and safer if the Next.js server is down at the scheduled minute.

### Dedupe And Provenance Gaps

AI Brain currently dedupes URL captures via `source_url`. That is not enough for Recall sync because:

- Recall cards may have no `source_url`.
- Recall card IDs are stable external identifiers and should be stored.
- A Recall card can represent a PDF/note/import where original URL is absent.
- Re-import needs to map a Recall card back to the AI Brain item it created.

AI Brain should add a Recall-specific external mapping table rather than relying only on `items.source_url`.

## Product And Technical Requirements Derived From The Goal

### Functional Requirements

1. Daily sync imports newly added Recall cards into AI Brain.
2. Sync supports at least notes, online articles, YouTube/video cards, PDFs, and cards without a URL.
3. Sync is one-way from Recall to AI Brain.
4. Sync avoids duplicates across repeated runs.
5. Sync records source provenance: Recall card ID, Recall created timestamp, source URL if present, content source type, and import time.
6. Sync imports enough content for AI Brain enrichment and Ask/search to work.
7. Sync surfaces weak/partial imports honestly.
8. Sync has a manual dry-run command for operator confidence.
9. Sync can be disabled without code changes.

### Non-Functional Requirements

1. No API keys committed to git.
2. Cron must not create multiple workers under HMR.
3. Daily sync must be idempotent.
4. API failures should not break existing AI Brain capture/enrichment.
5. Import should rate-limit and retry politely.
6. The implementation must preserve existing local-first AI Brain semantics.
7. Imported data should remain inspectable/exportable from AI Brain.

## Key Unknowns

1. Does Recall's current `GET /api/v1/cards?date_from=...&date_to=...` reliably filter by creation time in the user's paid account?
2. Is there any hidden pagination or cursor for `/api/v1/cards` beyond what docs show?
3. Does `GET /api/v1/cards/{id}?max_chunks=50` return complete content for normal cards, or only a selected chunk subset?
4. How does Recall represent PDFs, YouTube videos, web articles, and notes in card chunks?
5. Are `created_at` values in list responses consistently ISO 8601 in the live API, despite docs examples showing both human-readable and ISO-like values?
6. Can MCP `filter_by_metadata` enumerate cards more reliably than REST?
7. Can Recall API keys be used with MCP, or is OAuth mandatory in practice?
8. Should AI Brain re-enrich imported Recall content, or preserve Recall summaries and only use AI Brain embeddings?

## Implementation Options

### Option A - REST API Daily Poller

Use Recall's REST API with an API key. Each day, list cards in a date window, fetch each card by ID, transform chunks into an AI Brain item, and store Recall card ID in a local mapping table.

Proposed flow:

1. Read `RECALL_API_KEY` and `RECALL_SYNC_ENABLED`.
2. Load last successful sync checkpoint.
3. Query `/api/v1/cards?date_from=<cursor>&date_to=<now>`.
4. For each card preview:
   - skip if Recall card ID already imported;
   - fetch `/api/v1/cards/{id}?max_chunks=50`;
   - construct body from card metadata and chunks;
   - insert or update AI Brain item;
   - save mapping row.
5. Advance checkpoint only after successful completion.

Pros:

- Matches Recall's developer docs.
- Fits a server-side daily job.
- Uses API key rather than browser session state.
- Easy to dry-run and test with fixtures.

Cons:

- Date filter reliability is unverified against the user's account.
- List endpoint may still have enumeration limits.
- Get-card chunk cap may produce partial content.
- No webhooks; sync can lag until next cron.

Verdict: Best first implementation candidate, but blocked by API/date-filter and content-fidelity spikes.

### Option B - MCP-Based Pull

Connect AI Brain or a helper process to Recall's MCP server and use `filter_by_metadata` plus `get_document_content`.

Pros:

- MCP exposes tools that conceptually match the goal.
- `filter_by_metadata` may be designed for card listing.
- OAuth avoids storing a raw API key if client token storage is handled safely.

Cons:

- Documented auth is browser OAuth for MCP clients, not a simple server cron.
- Token storage/refresh for a Next.js production server may be more complex.
- The MCP server is read-only, same as REST.
- Need a local MCP client implementation or connector support.

Verdict: Good spike candidate, not first implementation path.

### Option C - Markdown Export Import

Periodically export Recall knowledge base as Markdown zip from the web app and import new/changed Markdown into AI Brain.

Pros:

- Highest potential content fidelity if export contains full card Markdown.
- Good bootstrap and reconciliation path.
- Avoids API chunk cap if export is complete.

Cons:

- Documented as web-app manual export, not headless API.
- Daily automation would require UI automation or user participation.
- Needs file diffing and import id mapping.

Verdict: Good fallback/reconciliation path, not ideal daily automation.

### Option D - Chrome/Playwright Automation

Use the user's logged-in Chrome or a persistent Playwright profile to inspect Recall UI, exports, or cards.

Pros:

- Prior local findings proved Playwright UI automation can operate Recall with persistent profile auth.
- Can access UI capabilities that the API may not expose.

Cons:

- Fragile selectors and UI timing.
- Requires maintaining authenticated browser profile.
- Harder to run safely on server.
- Higher privacy and operational risk.

Verdict: Last-resort spike/fallback only.

### Option E - Hybrid REST Daily Sync + Weekly Export Reconciliation

Use REST API daily for new cards. Use manual or automated Markdown export periodically to detect missed cards or improve fidelity.

Pros:

- Daily value without requiring fragile export automation.
- Reconciliation catches API/listing blind spots.
- Lets AI Brain start small while preserving trust.

Cons:

- More moving pieces.
- Reconciliation may require user action until export automation is proven.

Verdict: Likely best long-term operating model if API enumeration or chunk completeness remains imperfect.

## Recommended V1 Direction

Proceed with a spike-driven plan around Option A, with Option E as the target operating model if spikes reveal API limits.

Do not implement production cron until these facts are proven:

1. Date-filtered `/api/v1/cards` returns all new cards for a controlled date range.
2. The live API returns stable card IDs and parseable `created_at`.
3. Get-card content is sufficient for at least representative notes, articles, YouTube, and PDFs.
4. AI Brain can import a Recall card fixture idempotently.
5. A failed sync does not advance the checkpoint.

## Proposed AI Brain Data Model

### New Table: `recall_sync_items`

Purpose: map Recall cards to AI Brain items.

Proposed fields:

```sql
CREATE TABLE recall_sync_items (
  recall_card_id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  recall_created_at TEXT,
  recall_source_url TEXT,
  recall_title TEXT,
  recall_image_url TEXT,
  content_hash TEXT,
  content_fidelity TEXT NOT NULL DEFAULT 'unknown',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  imported_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  last_synced_at INTEGER NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'imported',
  last_error TEXT,
  raw_metadata_json TEXT
);
```

### New Table Or Setting: `recall_sync_state`

Purpose: store high-water marks and run state.

Proposed fields:

```sql
CREATE TABLE recall_sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Keys:

- `last_successful_date_to`
- `last_started_at`
- `last_completed_at`
- `last_status`
- `last_error`
- `last_total_seen`

### Capture Metadata Strategy

Use `items` for user-facing content and `recall_sync_items` for provider identity.

Recommended `items` mapping:

| Recall field | AI Brain field |
|---|---|
| `card_id` | `recall_sync_items.recall_card_id` |
| `title` | `items.title` |
| `source_url` | `items.source_url`, if present |
| `created_at` | `items.published_at` or `recall_sync_items.recall_created_at`; do not overwrite `captured_at` semantics without decision |
| `image` | `items.thumbnail_url` |
| chunks content | `items.body` |
| chunk source/timestamps | body section plus raw metadata artifact |
| Recall provider | new mapping table and possibly `capture_source='system'` |

Open design decision: whether to add `source_platform='recall'`, add a new `capture_provider`, or preserve original content platform as `source_platform` and record Recall only in `recall_sync_items`.

Recommendation: add `capture_source='recall'` so the Library can truthfully show "via Recall", but do not add `source_type='recall'`. Preserve the original content type (`url`, `pdf`, `note`, `youtube`, etc.) and preserve or infer the original `source_platform` when possible. Record provider identity and card ID in `recall_sync_items`.

This requires a migration that extends the `items.capture_source` CHECK constraint, following the precedent in `src/db/migrations/012_capture_source.sql`.

### New Table: `recall_sync_runs`

Purpose: preserve operational history and support run locks/checkpoint debugging.

Proposed fields:

```sql
CREATE TABLE recall_sync_runs (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  state TEXT NOT NULL CHECK (state IN ('running', 'done', 'error')),
  date_from TEXT,
  date_to TEXT,
  cards_seen INTEGER NOT NULL DEFAULT 0,
  cards_imported INTEGER NOT NULL DEFAULT 0,
  cards_skipped INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  report_json TEXT
);
```

Use this table to prevent overlapping sync runs and to explain what happened in the last daily job.

## Proposed Sync Architecture

### Modules

```text
src/lib/recall/client.ts
src/lib/recall/types.ts
src/lib/recall/mapper.ts
src/lib/recall/sync.ts
src/db/recall-sync.ts
src/db/migrations/NNN_recall_sync.sql
scripts/sync-recall.ts
```

Optional after CLI proof:

```text
src/lib/recall/sync-cron.ts
```

### Responsibilities

`client.ts`

- API key auth.
- GET `/cards`.
- GET `/cards/{id}`.
- optional GET `/search`.
- error normalization.

`mapper.ts`

- Build AI Brain title/body/provenance from Recall card.
- Compute content hash.
- Infer source type and capture quality.
- Preserve chunk metadata.

`sync.ts`

- Load checkpoint.
- Fetch date window.
- Skip already imported cards.
- Insert items and mapping rows transactionally.
- Do not advance checkpoint on partial failure.

`scripts/sync-recall.ts`

- Operator dry-run.
- Optional apply mode.
- Cron-friendly exit codes.
- Prints cards that would be imported and unknown fields.
- Enforces run lock and per-run cap.

`sync-cron.ts`, if added later:

- Register daily schedule.
- Follow existing global guard pattern.
- Env-gated.
- Logs status without crashing server.

## Sync Scheduling

Recommended cadence:

- Daily at 00:15 IST for Recall import if using in-process cron.
- System cron invoking `scripts/sync-recall.ts` is preferred for V1 production.
- Existing enrichment batch runs at 01:00 IST, so imported items are ready for enrichment soon after.
- Add manual dry-run and manual one-shot import commands before enabling cron.

Proposed env vars:

```text
RECALL_SYNC_ENABLED=false
RECALL_API_KEY=sk_...
RECALL_SYNC_CRON=45 18 * * *
RECALL_SYNC_LOOKBACK_HOURS=48
RECALL_SYNC_MAX_CARDS_PER_RUN=200
RECALL_SYNC_DRY_RUN=false
```

`45 18 * * *` is 00:15 IST on a UTC host.

For CLI/system cron:

```text
45 18 * * * cd /opt/brain && RECALL_SYNC_ENABLED=true node --import tsx scripts/sync-recall.ts --apply
```

Final production command must be validated in a runbook; this is only the target shape.

## Dedupe Strategy

Dedupe layers:

1. Recall card ID in `recall_sync_items`.
2. Existing `items.source_url` match if Recall has `source_url`.
3. Content hash for no-URL notes/PDF imports.
4. Optional title+created_at heuristic for safety reporting only.

Do not rely only on URL dedupe.

If a Recall import upgrades an existing weak AI Brain item, use or adapt `repairItemWithText()` rather than only updating item fields. That path clears stale chunks, vectors, tags/topics, summaries, and embedding jobs more safely than a field-only update.

## Content Fidelity Policy

Until spikes prove completeness:

- Do not label Recall imports as `full_text` by default.
- Use an explicit body header:

```text
Imported from Recall
Recall card id: ...
Recall created_at: ...
Source URL: ...
Content fidelity: recall_api_chunks_unverified
```

- Store raw Recall metadata as a capture artifact or JSON field.
- If card has exactly 50 chunks, flag `content_fidelity='possibly_truncated'`.
- If card has fewer chunks and a short/medium body, flag `content_fidelity='api_chunks'`.

Potential future `capture_quality` additions:

- `recall_chunks`
- `recall_partial`

For V1 spike work, avoid schema changes unless needed; use mapping table fidelity fields first.

## Security And Privacy

Requirements:

- Never commit `RECALL_API_KEY`.
- Redact keys in logs.
- Store run reports without private content unless explicitly needed.
- Treat Recall card content as private personal data.
- Default dry-run should print metadata, not full chunks.
- Full-content fixtures should be synthetic or explicitly user-approved.

## Spike Plan

### SPIKE-001 - Recall REST API Auth And Date Filter

Question: Can a server-side script list newly created Recall cards using API key auth and `date_from`/`date_to`?

Method:

- User creates/enters API key outside git.
- Script calls `/api/v1/cards` with and without date filters.
- Create or identify a known recent card in Recall.
- Compare results.

Success:

- Date filters return the expected recent card.
- Result count is complete for a narrow window.
- Response `created_at` is parseable.

Failure:

- Date filters ignored.
- Result set capped or unordered in a way that prevents reliable daily sync.

### SPIKE-002 - Recall Card Content Fidelity

Question: Does `GET /api/v1/cards/{id}?max_chunks=50` return enough content for representative Recall cards?

Test cards:

- one note;
- one web article;
- one YouTube card;
- one PDF;
- one long item likely exceeding 50 chunks.

Success:

- Body reconstruction is useful and not silently truncated for normal daily imports.
- Long-card truncation can be detected.

### SPIKE-003 - AI Brain Recall Import Fixture

Question: Can a synthetic Recall card be transformed into an AI Brain item idempotently?

Method:

- Build fixtures matching Recall list/get responses.
- Add migration and mapping repository in a branch or spike-only harness.
- Insert into `items` via `insertCaptured()`.
- Re-run import and confirm no duplicate.

Success:

- Item created once.
- Mapping row created.
- Enrichment can pick up the item.

### SPIKE-004 - Scheduler And Checkpoint Safety

Question: Can Recall sync run daily without duplicate jobs or checkpoint corruption?

Method:

- Follow `enrichment-batch-cron.ts` global guard pattern.
- Use fake client and fake clock.
- Simulate success, partial failure, retry, empty run.

Success:

- Checkpoint advances only after full success.
- HMR does not double-register cron.
- Concurrent CLI runs do not overlap.

### SPIKE-004b - Existing Weak Item Upgrade Path

Question: If Recall has richer content for an item AI Brain already captured as metadata-only, can the sync upgrade that item safely?

Method:

- Seed an AI Brain `metadata_only` item with the same source URL as a Recall fixture.
- Import richer Recall text.
- Use or adapt `repairItemWithText()`.
- Verify stale chunks/vectors/enrichment are cleared or requeued correctly.

Success:

- Existing item is upgraded, not duplicated.
- Old semantic chunks are removed.
- Enrichment/embedding reruns.
- User-visible capture quality improves.

### SPIKE-005 - MCP Enumeration Feasibility

Question: Can MCP `filter_by_metadata` and `get_document_content` enumerate new cards more reliably than REST?

Method:

- Use browser OAuth with a supported MCP client or minimal MCP client if feasible.
- Compare date filter behavior to REST.

Success:

- MCP can list cards by date and retrieve full content without chunk cap ambiguity.

### SPIKE-006 - Markdown Export Reconciliation Feasibility

Question: Can Recall Markdown export serve as a manual or automated reconciliation source?

Method:

- Export a small knowledge base or selected cards.
- Inspect markdown filenames, frontmatter, source URLs, card IDs if any, and content completeness.

Success:

- Export contains stable identifiers or enough metadata to match API cards.
- Full content is better than REST chunks for long items.

## Preliminary Final Options

### Recommended If Spikes Pass

Build REST API daily sync with Recall card mapping table, dry-run/apply CLI, system cron, and direct item import via `insertCaptured()`.

### Recommended If REST Date Filters Fail But Search Works

Build hybrid search/date probing only for known source domains or tags, plus weekly Markdown export reconciliation. This is weaker and should be labeled partial automation.

### Recommended If REST Content Is Truncated

Build REST metadata sync plus Markdown export enrichment for full content, or import chunks with `possibly_truncated` label and explicit repair path.

### Recommended If REST Enumeration Fails Entirely

Do not build a production daily sync. Use Chrome/Playwright or Markdown export as a semi-manual bridge only after user approves the fragility and privacy tradeoff.

## Proposed Artifact Workflow

1. This V1 research report.
2. Adversarial review of V1.
3. V2 research report.
4. Spike requirements V1.
5. Adversarial review of spike requirements.
6. Spike requirements V2.
7. Execute spikes.
8. Final implementation options report.
9. PRD and implementation plan for selected option.

## Open Questions For User

1. Are you comfortable creating a Recall API key and providing it through local environment only for spikes?
2. Should AI Brain import Recall content as a backup mirror, or should it be treated as first-class AI Brain content with enrichment and Ask?
3. For long PDFs/videos, is partial Recall chunk import acceptable if it is labeled honestly?
4. Should AI Brain preserve Recall's summaries if available, or always generate its own summaries?
5. Do you want daily import only, or also a manual "Sync Recall now" button in Settings?

## V1 Recommendation

Proceed to adversarial review with this working recommendation:

> Build toward a REST API daily sync, but require spikes to prove date-filter enumeration and content fidelity before implementation. Treat MCP, Markdown export, and Chrome automation as fallback/validation lanes, not the first production path.

The next artifact should be an adversarial review of this report, followed by a V2 research report that incorporates the review findings and the architecture subagent's codebase analysis.
