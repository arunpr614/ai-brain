# Recall -> AI Brain Daily Sync Research Report V2

Created: 2026-06-24 09:07 IST
Author: Codex
Status: Revised V2 research report after adversarial review
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Source inventory: `docs/research/recall-sync/00_SOURCE_INVENTORY_2026-06-24_08-58-33_IST.md`
V1 report: `docs/research/recall-sync/01_RECALL_DAILY_SYNC_RESEARCH_REPORT_V1_2026-06-24_08-58-33_IST.md`
Adversarial review: `docs/research/recall-sync/RECALL_DAILY_SYNC_RESEARCH_REPORT_V1_ADVERSARIAL_REVIEW_2026-06-24_09-05-08_IST.md`

## User Goal

When new content is added to Recall, including YouTube videos, PDFs, notes, web articles, and other supported content, AI Brain should have a daily job that imports newly added Recall data into AI Brain / AI Memory.

The requested process is:

1. Research Recall developer capabilities.
2. Ideate feature options.
3. Produce a research report.
4. Run adversarial review.
5. Produce a revised V2 report.
6. Design spikes.
7. Create spike requirements docs.
8. Run adversarial review on spike requirements.
9. Produce revised spike requirements.
10. Execute validated work end to end.

This document completes step 5 for the Recall daily-sync workstream.

## Executive Verdict

No production implementation should begin yet.

The strongest candidate remains a server-side daily pull from Recall's REST API into AI Brain, but that is only a conditional candidate until the live API proves it can reliably enumerate newly created cards. Current Recall docs document `date_from` and `date_to` filters on `GET /api/v1/cards`; however, an earlier live-account probe from 2026-04-25 found that `/api/v1/cards` returned only the first 500 cards and ignored pagination-like parameters. A daily sync that cannot enumerate new cards would silently miss content and damage trust.

V2 therefore reframes the feature as:

> A one-way Recall snapshot import into AI Brain, enabled only after spikes prove live-account enumeration, content fidelity classification, privacy-safe persistence, queue safety, and AI Brain UI compatibility.

The implementation plan should not be written until the spike requirements have tested those gates. If the gates fail, the fallback options are MCP-based pull, Markdown export reconciliation, or a semi-manual bridge, each with its own reduced product promise.

## Sources Used

Current Recall docs checked on 2026-06-24:

- `https://docs.recall.it/developer/api`
- `https://docs.recall.it/developer/mcp`
- `https://docs.recall.it/getting-started/2-add-content`
- `https://docs.recall.it/supported-content/all-supported-content`
- `https://docs.recall.it/getting-started/7-exporting-content`
- `https://feedback.recall.it/changelog`
- `https://docs.recall.it/recall-roadmap`

Local evidence:

- `/Users/arun.prakash/Documents/arunvault/Arun2026/Initiatives/Arun_AI_Projects/Lenny_Export/Recall_import/FINDINGS.md`
- Existing AI Brain capture/enrichment code under `src/app/api/capture/*`, `src/db/*`, `src/lib/capture/*`, `src/lib/queue/*`, and `src/instrumentation.ts`
- Existing spike convention at `docs/plans/spikes/README.md`

## Product Promise For V1

### What V1 Should Promise

V1 should promise:

- AI Brain can import new Recall cards as AI Brain items once per day.
- Imported items show that they came via Recall.
- Imported items preserve the original source type when known, such as article, PDF, note, or YouTube.
- Imported items are searchable and eligible for AI Brain enrichment only when content fidelity is sufficient.
- Partial or uncertain imports are labeled honestly.
- A dry-run mode explains what would import before any real write happens.

### What V1 Must Not Promise

V1 must not promise:

- A live two-way mirror of Recall.
- Automatic deletion in AI Brain when a Recall card is deleted.
- Automatic update in AI Brain when a Recall card is edited.
- Full-text fidelity for every Recall card type.
- Complete support for very long PDFs, long videos, podcasts, or paywalled/member-only content.
- Production cron reliability before live-account API enumeration is proven.

### Product Wording

Default user-facing wording should be:

```text
Imported from Recall
```

For detailed provenance:

```text
Recall snapshot imported on <date>
Original source: <source_url or unknown>
Content fidelity: <state>
```

Avoid "synced from Recall" until update/delete semantics are intentionally designed.

## Current Recall Capability Summary

### REST API

Recall currently documents a read-only REST API:

- Base URL: `https://backend.getrecall.ai/api/v1`
- API key auth via `Authorization: Bearer sk_...`
- API keys are created in the Recall web app under Settings -> API & MCP
- Write API is not currently available

Documented endpoints relevant to this feature:

1. `GET /api/v1/cards`
   - Lists cards.
   - Documented filters include `tags`, `date_from`, `date_to`, and `source_url_contains`.
   - Response includes `results` and `total_count`.

2. `GET /api/v1/cards/{card_id}`
   - Returns one card and content chunks.
   - `max_chunks` range is 1-50, default 20.
   - Chunks include `chunk_id`, `content`, optional `source`, and optional `timestamps`.

3. `GET /api/v1/search`
   - Runs semantic search.
   - Useful for validation and fallback probing.
   - Not proven suitable for complete enumeration.

### MCP

Recall documents a read-only MCP server:

```text
https://backend.getrecall.ai/mcp/
```

It exposes:

- `search`
- `filter_by_metadata`
- `get_document_content`
- `explore_kb`

The current docs describe browser-based OAuth in supported clients with `kb:read` scope. MCP is promising for assistant workflows and fallback exploration, but it is not yet proven appropriate for unattended daily cron.

### Markdown Export

Recall can export a page or entire knowledge base as Markdown from the web app. This may be useful for bootstrap import or reconciliation, but it is not documented as a headless daily export API.

## Key Evidence Conflict

The central conflict:

- Current Recall docs say `/api/v1/cards` supports date filters.
- Older empirical live-account findings say `/api/v1/cards` returned only the first 500 cards and ignored many pagination-like parameters.

This means the next work must test today's live behavior in the user's account. The docs are not enough to justify implementation.

## Hard No-Go Gates

| Gate | Must prove | Blocks if not proven |
|---|---|---|
| GATE-001 API enumeration | `GET /api/v1/cards?date_from=...&date_to=...` returns all controlled new cards in a narrow test window. | REST daily sync, production cron, and checkpoint design. |
| GATE-002 Content fidelity | Card detail chunks can be classified as complete enough, partial, metadata-only, or blocked unknown across representative content types. | First-class import and AI Brain Ask/search trust claims. |
| GATE-003 Privacy-safe persistence | Dry-run logs, run reports, fixtures, artifacts, and database fields do not leak private Recall content or secrets. | Any write of raw Recall payloads outside user-approved local DB fields. |
| GATE-004 AI Brain compatibility | `capture_source='recall'` works across migration, TypeScript types, Library display, item detail, filters, enrichment, and tests. | Production import of Recall items. |
| GATE-005 Queue and cost safety | First run and daily run have bounded card count, text volume, fetch volume, enrichment queue pressure, and retry behavior. | Cron enablement and batch import. |
| GATE-006 Deployment operability | Secrets, run command, scheduling host, rollback, logs, and manual dry-run/apply are documented. | Production scheduling. |

## Recommended Option After V2 Review

### Conditional Primary Option: REST API Daily Pull

Use Recall's REST API with an API key. A CLI job lists recent cards, fetches card details, maps the card into AI Brain's internal capture shape, and writes directly through `insertCaptured()`.

This remains the best candidate only if GATE-001 passes.

Target flow:

```text
Recall REST API
  -> Recall API client
  -> Recall card mapper
  -> AI Brain import service
  -> insertCaptured()
  -> items
  -> enrichment_jobs trigger
  -> enrichment worker / batch
  -> embedding_jobs trigger
  -> chunks / vectors / search
```

Why direct `insertCaptured()`:

- Avoids public capture-route auth/origin concerns.
- Avoids re-fetching source URLs when Recall already has extracted content.
- Keeps imported items on the same internal enrichment/indexing path as existing AI Brain content.

### Fallback Option 1: REST Daily Metadata + Manual Markdown Reconciliation

Use REST for daily discovery if it can at least identify new cards, then use periodic Markdown export to improve fidelity and detect misses.

This is a weaker operating model because export is currently manual/web-app based.

### Fallback Option 2: MCP Pull

Use Recall MCP tools if they can enumerate cards by metadata and retrieve richer content than REST.

This is not the first path because unattended OAuth/token refresh is not yet understood.

### Fallback Option 3: Browser Automation

Use Chrome/Playwright only as a last resort. Prior local work proved Recall UI automation can work with a persistent profile, but it is fragile and has higher privacy/operational risk.

## Requirements

### Functional Requirements

1. Daily job imports newly added Recall cards into AI Brain after gates pass.
2. Import supports notes, online articles, YouTube/video cards, PDFs, and cards without URLs where Recall exposes enough metadata/content.
3. Import is one-way from Recall into AI Brain.
4. Import creates no duplicates on repeated runs.
5. Import stores Recall provenance: card ID, Recall created timestamp, source URL if present, title, import timestamp, and content fidelity state.
6. Import preserves original content type when known.
7. Import labels weak or partial content honestly.
8. Import has dry-run mode before apply mode.
9. Import can be disabled without code changes.
10. Import does not advance checkpoint after partial failure.

### Non-Functional Requirements

1. Never commit `RECALL_API_KEY`.
2. Redact API keys and token-like values in logs and reports.
3. Do not print full Recall card content during dry-run by default.
4. Bound API retries and backoff.
5. Bound per-run card count and total imported characters.
6. Avoid duplicate schedulers under HMR if an in-process cron is later added.
7. Keep AI Brain usable if Recall API fails.
8. Preserve local-first AI Brain semantics.
9. Make failures observable through run records and concise logs.
10. Keep fixtures synthetic unless the user explicitly approves real Recall content for testing.

## Content Fidelity Taxonomy

Use a Recall-specific fidelity state in `recall_sync_items.content_fidelity`. Do not rely only on existing `capture_quality` until the schema impact is designed.

| State | Meaning | User-facing treatment |
|---|---|---|
| `complete_enough_for_daily_import` | Representative checks show card chunks are complete enough for the content type and item length. | Eligible for normal enrichment/search. |
| `api_chunks_unverified` | Chunks were imported but completeness was not proven. | Show as Recall snapshot with unverified content fidelity. |
| `possibly_truncated` | Card returned exactly 50 chunks, missing ordering proof, or long-content indicators suggest truncation. | Do not call full text; enrichment should treat cautiously. |
| `metadata_only` | Only title/source metadata was usable. | Import only if user accepts metadata-only snapshots. |
| `blocked_unknown` | API response is too ambiguous or unsafe to import. | Do not create an AI Brain item; record blocked run detail. |

Default rule:

- If `GET /cards/{id}` returns exactly 50 chunks, label `possibly_truncated`.
- If no chunks are returned, label `metadata_only` or `blocked_unknown`.
- If chunks exist but source type is long-form PDF/video/podcast and completeness is unproven, label `api_chunks_unverified` or `possibly_truncated`.
- Only use `complete_enough_for_daily_import` after SPIKE-002 defines and passes representative checks.

## Snapshot, Update, And Delete Policy

V1 should be a snapshot importer.

That means:

- New Recall cards create AI Brain items.
- Existing Recall card IDs are skipped unless an explicit repair/update mode is selected.
- AI Brain does not delete items when Recall cards are deleted.
- AI Brain does not automatically update imported content if a Recall card changes.
- The imported item should preserve `imported_at` and `last_seen_at`.

If a Recall card later changes and a content hash differs:

- Record `sync_status='changed_remote'`.
- Do not overwrite the AI Brain item automatically in V1.
- Produce a dry-run warning and require an explicit update policy in a later plan.

For existing weak AI Brain items with the same `source_url`:

- If Recall provides richer text and the user approves upgrades, use or adapt `repairItemWithText()` rather than field-only updates.
- The upgrade path must clear stale chunks/vectors/summaries and requeue enrichment safely.

## Proposed AI Brain Data Model

### `recall_sync_items`

Purpose: map Recall card identity to AI Brain items and preserve import state.

```sql
CREATE TABLE recall_sync_items (
  recall_card_id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
  recall_created_at TEXT,
  recall_source_url TEXT,
  recall_title TEXT,
  recall_image_url TEXT,
  content_hash TEXT,
  content_fidelity TEXT NOT NULL DEFAULT 'blocked_unknown',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  imported_at INTEGER,
  last_seen_at INTEGER NOT NULL,
  last_synced_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'seen',
  last_error TEXT,
  metadata_json TEXT
);
```

Privacy rule:

- `metadata_json` must be minimized.
- Do not store full chunk bodies in this table.
- Redact query strings from source URLs unless the original URL is needed for dedupe and the user accepts the privacy tradeoff.

### `recall_sync_runs`

Purpose: operational history, dry-run/apply reporting, and run locking.

```sql
CREATE TABLE recall_sync_runs (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('dry_run', 'apply')),
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  state TEXT NOT NULL CHECK (state IN ('running', 'done', 'error')),
  date_from TEXT,
  date_to TEXT,
  cards_seen INTEGER NOT NULL DEFAULT 0,
  cards_imported INTEGER NOT NULL DEFAULT 0,
  cards_skipped INTEGER NOT NULL DEFAULT 0,
  cards_blocked INTEGER NOT NULL DEFAULT 0,
  total_chars_planned INTEGER NOT NULL DEFAULT 0,
  total_chunks_fetched INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  report_json TEXT
);
```

Privacy rule:

- `report_json` stores counts, IDs, titles if needed, and redacted source URLs.
- It must not store full Recall chunks by default.

### `recall_sync_state`

Purpose: checkpoints and high-water marks.

```sql
CREATE TABLE recall_sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Candidate keys:

- `last_successful_date_to`
- `last_started_at`
- `last_completed_at`
- `last_status`
- `last_error`
- `last_total_seen`

Checkpoint rule:

- Advance `last_successful_date_to` only after the full date window completes without fatal or ambiguous errors.
- Do not advance checkpoint if any page/filter behavior is suspicious.

## AI Brain Item Mapping

| Recall concept | AI Brain target |
|---|---|
| Recall card ID | `recall_sync_items.recall_card_id` |
| Recall title | `items.title` |
| Recall source URL | `items.source_url`, if present and safe |
| Recall created timestamp | `items.published_at` when appropriate; always preserve in mapping table |
| Recall image | `items.thumbnail_url` when present |
| Recall chunks | `items.body` only when fidelity state allows import |
| Recall provider | `items.capture_source='recall'` plus mapping table |
| Original content type | Preserve/infer `items.source_type` such as `url`, `pdf`, `note`, or `youtube` |
| Original platform | Preserve/infer `source_platform` such as `youtube`, `substack`, `generic_article`, or `pdf` |

Do not add `source_type='recall'`. Recall is the ingestion provider, not the original content type.

Adding `capture_source='recall'` requires:

- Database migration extending the `items.capture_source` CHECK constraint.
- Type update in `src/db/client.ts`.
- Insert path update where needed.
- Library and item-detail label handling.
- Filter/list behavior validation.
- Tests for imported Recall rows.

## Import Body Shape

When chunks are imported, the item body should start with provenance:

```text
Imported from Recall
Recall card id: <id>
Recall created_at: <timestamp>
Source URL: <redacted-or-original-url>
Content fidelity: <state>
Snapshot imported_at: <timestamp>

---

<reconstructed Recall chunk text>
```

If chunk metadata includes timestamps or source sections, preserve them in readable headings only when they improve search/Ask behavior.

If content is `metadata_only`, do not create a fake full body. Use a short provenance body and label it clearly.

## Dedupe Strategy

Dedupe order:

1. Recall card ID in `recall_sync_items`.
2. Existing `items.source_url` match when Recall provides a source URL.
3. Content hash for no-URL notes/PDF imports.
4. Title plus Recall created timestamp as a warning-only heuristic.

Rules:

- Card ID match is authoritative for Recall-originated imports.
- URL match may upgrade an existing weak AI Brain item, but should not blindly overwrite a strong existing item.
- Content hash should be used for no-URL content but must not merge unrelated notes with similar titles.
- Any ambiguous match should be reported in dry-run and skipped in apply mode unless a later policy says otherwise.

## Scheduler And Operating Model

V2 recommends CLI-first execution:

```text
scripts/sync-recall.ts --dry-run
scripts/sync-recall.ts --apply
```

CLI-first is preferred because:

- It supports manual dry-run before writes.
- It can be run by system cron after validation.
- It avoids depending on the Next.js server being alive at the exact schedule time.
- It is easier to test with fake clients and fixtures.

Candidate future schedule:

- Run Recall import before the existing enrichment batch window.
- Keep a wide lookback window, such as 48 hours, to tolerate missed runs.
- Use a run lock so overlapping syncs cannot happen.

Do not treat any cron expression as production-ready until the deployment runbook is written.

## Safety Limits

Initial apply mode should require conservative caps:

| Limit | Suggested initial value | Reason |
|---|---:|---|
| Max cards per run | 25 during first apply, then 100 after confidence | Prevent first-run queue flood. |
| Max chunks per card | 50 | Recall API maximum. |
| Max total imported chars | 500,000 | Bound enrichment and embedding pressure. |
| Max retries per request | 3 | Avoid runaway API loops. |
| Backoff | Exponential with jitter | Be polite to Recall API. |
| Dry-run default | true | Prevent accidental writes. |
| Apply requires env and flag | `RECALL_SYNC_ENABLED=true` plus `--apply` | Two-step safety. |

If the dry-run detects more work than caps allow:

- Show counts and sample titles/IDs.
- Do not apply automatically.
- Ask the operator to increase caps intentionally.

## Module Plan Candidate

Implementation should only begin after spike gates pass, but the likely module shape is:

```text
src/lib/recall/client.ts
src/lib/recall/types.ts
src/lib/recall/mapper.ts
src/lib/recall/sync.ts
src/db/recall-sync.ts
src/db/migrations/NNN_recall_sync.sql
scripts/sync-recall.ts
```

Optional later:

```text
src/lib/recall/sync-cron.ts
```

Responsibilities:

| Module | Responsibility |
|---|---|
| `client.ts` | API key auth, list cards, get card, optional search, retries, redacted errors. |
| `types.ts` | Narrow Recall response types based on observed API payloads. |
| `mapper.ts` | Convert Recall card preview/detail into AI Brain item input and fidelity state. |
| `sync.ts` | Orchestrate date window, checkpoint, dedupe, dry-run/apply, caps, and run records. |
| `recall-sync.ts` | DB access for mappings, runs, state, and run locks. |
| `sync-recall.ts` | Operator-facing CLI. |

## Spike Plan

### SPIKE-001 - REST API Enumeration Gate

Question: Can a server-side script reliably list all newly created Recall cards in a controlled date window?

Required test:

- User creates or identifies a Recall API key outside git.
- User creates at least two controlled cards during a known time window:
  - one note or simple URL;
  - one card with no obvious source URL if feasible.
- Script calls `/api/v1/cards` with no filter and with `date_from`/`date_to`.
- Script verifies the controlled cards are present.
- Script verifies no unexpected cap or ordering issue prevents a complete window.

Pass:

- Controlled cards appear in the filtered window.
- `created_at` is parseable.
- The response is complete for the controlled narrow window.
- No suspicious "same first 500 cards" behavior appears.

Fail:

- Date filters are ignored.
- Controlled cards are missing.
- Results appear capped or unordered in a way that makes daily sync unreliable.

Outcome:

- Pass unlocks REST sync implementation planning.
- Fail blocks REST sync and triggers fallback spike priority.

### SPIKE-002 - Content Fidelity Gate

Question: Can card detail chunks be classified safely across representative Recall content?

Required sample:

- one note;
- one web article;
- one YouTube/video card;
- one PDF;
- one no-URL item if available;
- one long item likely to hit the 50-chunk cap.

Pass:

- Mapper can classify every sample into the fidelity taxonomy.
- Exact-50-chunk cards are labeled `possibly_truncated`.
- The dry-run report shows fidelity counts.
- No item is labeled full text unless the evidence supports it.

Fail:

- Chunks cannot be ordered or interpreted.
- Long content cannot be detected as partial.
- API returns only semantic snippets rather than stable card content.

### SPIKE-003 - Privacy And Fixture Gate

Question: Can dry-run, tests, and run reports avoid leaking private Recall content?

Pass:

- API key is read only from environment or ignored local secret file.
- Logs redact secrets and query strings.
- Dry-run output excludes full chunks by default.
- Unit tests use synthetic fixtures.
- Any real Recall payload captured for debugging is explicitly user-approved and gitignored.

### SPIKE-004 - AI Brain Import Fixture Gate

Question: Can a synthetic Recall card import into AI Brain idempotently through `insertCaptured()`?

Pass:

- Migration creates mapping/run/state tables.
- `capture_source='recall'` is accepted by DB and types.
- Import creates one item on first apply.
- Re-run skips the same Recall card.
- Item is visible in Library and item detail with sensible "via Recall" wording.
- Enrichment and embedding queue behavior is observable.

### SPIKE-005 - Existing Weak Item Upgrade Gate

Question: Can Recall enrich an existing weak AI Brain item without duplicate rows or stale embeddings?

Pass:

- A metadata-only item with the same source URL is upgraded, not duplicated.
- Upgrade path uses or adapts `repairItemWithText()`.
- Old chunks/vectors/summaries are cleared or requeued correctly.
- Capture quality/fidelity improves visibly.

### SPIKE-006 - Scheduler And Checkpoint Gate

Question: Can the sync run safely across success, failure, retry, and overlap cases?

Pass:

- Checkpoint advances only after full success.
- Partial failures preserve retryability.
- Run lock prevents overlap.
- Caps stop oversized runs.
- CLI exits with cron-friendly codes.
- Dry-run and apply modes produce redacted run records.

### SPIKE-007 - Fallback Enumeration Gate

Question: If REST enumeration fails, can MCP or Markdown export provide a trustworthy fallback?

Pass for MCP:

- Auth can be automated safely.
- Cards can be listed by date or metadata.
- Content can be retrieved with clearer fidelity than REST.

Pass for Markdown:

- Export includes stable identifiers or reliable matching metadata.
- Export content is more complete than REST chunks.
- Reconciliation can detect missed cards.

Fail:

- Fallback is manual-only, fragile, or cannot preserve stable identity.

## Final Options After Spikes

### Option A - REST Snapshot Import

Use if GATE-001 and GATE-002 pass.

Production promise:

- Daily Recall snapshot import.
- Honest fidelity labels.
- AI Brain enrichment for complete-enough imports.
- Dry-run/apply CLI and system cron.

### Option B - REST Metadata + Partial Content Import

Use if enumeration works but content fidelity is weak.

Production promise:

- Daily metadata import.
- Partial content only when labeled.
- Optional manual repair/reconciliation for long items.

### Option C - Markdown Reconciliation First

Use if REST enumeration or content is weak but Markdown export is complete.

Production promise:

- User-assisted or semi-automated reconciliation.
- Better fidelity, weaker automation.

### Option D - MCP Pull

Use if MCP proves safer or more complete than REST.

Production promise:

- Depends on auth automation quality.
- Requires separate implementation plan.

### Option E - No Production Daily Sync Yet

Use if enumeration cannot be proven and fallbacks are too fragile.

Production promise:

- No false automation.
- Provide manual import or export guidance instead.

## Revised Recommendation

Proceed to spike requirements, not implementation.

Priority order:

1. SPIKE-001 REST API Enumeration Gate.
2. SPIKE-002 Content Fidelity Gate.
3. SPIKE-003 Privacy And Fixture Gate.
4. SPIKE-004 AI Brain Import Fixture Gate.
5. SPIKE-006 Scheduler And Checkpoint Gate.
6. SPIKE-005 Existing Weak Item Upgrade Gate.
7. SPIKE-007 Fallback Enumeration Gate, only if REST fails or content fidelity is insufficient.

The next artifact should be a detailed spike requirements document that turns these gates into executable tasks, test data, pass/fail criteria, and artifact outputs. That spike requirements document must then go through adversarial review before any implementation plan is created.

## Open Questions For User

1. Are you comfortable creating a Recall API key and providing it only through a local environment variable for spikes?
2. Should imported Recall snapshots be treated as first-class AI Brain content once fidelity is sufficient?
3. For long PDFs/videos, is partial import acceptable if AI Brain labels it as partial?
4. Do you want deleted or edited Recall cards to affect AI Brain later, or should AI Brain preserve imported snapshots?
5. Do you want a future "Sync Recall now" button in Settings after the CLI path is proven?
