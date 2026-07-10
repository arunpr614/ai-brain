# Recall Daily Sync Spike Requirements V1

Created: 2026-06-24 09:10 IST
Author: Codex
Status: V1 spike requirements; requires adversarial review before V2
Research report V2: `docs/research/recall-sync/02_RECALL_DAILY_SYNC_RESEARCH_REPORT_V2_2026-06-24_09-07-04_IST.md`
Adversarial review input: `docs/research/recall-sync/RECALL_DAILY_SYNC_RESEARCH_REPORT_V1_ADVERSARIAL_REVIEW_2026-06-24_09-05-08_IST.md`
Standard spike report template: `docs/plans/spikes/README.md`

## Purpose

These requirements define the spike work needed before AI Brain can implement a production Recall daily import. The spikes must prove or disprove the hard gates from the V2 research report:

1. Recall REST API can enumerate new cards reliably.
2. Recall card content can be classified safely for AI Brain.
3. Private Recall data and API keys can be handled safely.
4. AI Brain can import Recall snapshots through existing capture/enrichment paths.
5. Queue pressure, retries, checkpointing, and scheduling can be bounded.
6. Fallback paths are known if REST fails.

No production implementation plan should be created until these requirements are reviewed and revised.

## Required Output Artifacts

Each executed spike must create one Markdown report in `docs/plans/spikes/` using the exact structure from `docs/plans/spikes/README.md`.

Planned report filenames:

| Spike | Planned report |
|---|---|
| SPIKE-013 | `docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_IST.md` |
| SPIKE-014 | `docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_IST.md` |
| SPIKE-015 | `docs/plans/spikes/SPIKE-015-recall-privacy-fixtures-2026-06-24_IST.md` |
| SPIKE-016 | `docs/plans/spikes/SPIKE-016-recall-import-fixture-2026-06-24_IST.md` |
| SPIKE-017 | `docs/plans/spikes/SPIKE-017-recall-weak-item-upgrade-2026-06-24_IST.md` |
| SPIKE-018 | `docs/plans/spikes/SPIKE-018-recall-scheduler-checkpoint-2026-06-24_IST.md` |
| SPIKE-019 | `docs/plans/spikes/SPIKE-019-recall-fallback-enumeration-2026-06-24_IST.md` |

Final synthesis artifact after all feasible spikes:

```text
docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_IMPLEMENTATION_OPTIONS_<timestamp>_IST.md
```

## Shared Safety Rules

These rules apply to every spike:

1. Do not commit or print `RECALL_API_KEY`.
2. Read the key only from a local environment variable or user-approved local secret path.
3. Redact secrets, bearer tokens, cookies, signed URLs, and token-like query strings.
4. Do not save full real Recall card content unless the user explicitly approves the exact sample.
5. Prefer synthetic fixtures for tests.
6. Default every live API script to dry-run.
7. Any apply/write behavior must require both an explicit flag and `RECALL_SYNC_ENABLED=true`.
8. Do not create production cron, migrations, or long-lived jobs during spikes unless the spike specifically authorizes a disposable local branch/harness.
9. If a live Recall response contradicts public docs, the live-account evidence wins.

## Decision Gates

| Gate | Required spike | Decision unlocked if pass | Decision if fail |
|---|---|---|---|
| GATE-001 REST enumeration | SPIKE-013 | REST daily sync can remain primary path. | Block REST daily sync; run SPIKE-019. |
| GATE-002 Content fidelity | SPIKE-014 | Content import can proceed with fidelity taxonomy. | Allow metadata-only or fallback reconciliation only. |
| GATE-003 Privacy-safe persistence | SPIKE-015 | Tests, logs, and run reports can use safe payload handling. | Block any real-data persistence or dry-run report sharing. |
| GATE-004 AI Brain compatibility | SPIKE-016 | Recall snapshots can use `insertCaptured()` and `capture_source='recall'`. | Block import implementation until schema/UI path is fixed. |
| GATE-005 Weak item upgrade | SPIKE-017 | Existing metadata-only items can be upgraded safely. | Keep upgrades out of V1; import Recall cards as separate snapshots or skip ambiguous matches. |
| GATE-006 Scheduler/checkpoint | SPIKE-018 | CLI/system cron implementation plan can be drafted. | Block cron enablement; keep manual dry-run/apply only. |
| GATE-007 Fallback viability | SPIKE-019 | Fallback implementation plan can be drafted if REST fails. | Recommend no production daily sync yet. |

## SPIKE-013 - Recall REST Enumeration

### Question

Can a server-side process use Recall REST API key auth to reliably list all newly created cards in a controlled date window?

### Trigger

The V2 report identified REST enumeration as the primary blocker. Older empirical findings showed `/api/v1/cards` returned only the first 500 cards and ignored pagination-like parameters.

### Preconditions

- User creates a Recall API key in the Recall web app.
- User provides the key through a local environment variable only:

```text
RECALL_API_KEY=<redacted>
```

- User creates or identifies controlled Recall cards in a known time window:
  - one note or simple URL card;
  - one PDF or web article if easy;
  - one item without a source URL if available.

### Method Requirements

The spike must:

1. Create a disposable local script or one-off command that calls:
   - `GET /api/v1/cards`
   - `GET /api/v1/cards?date_from=<start>&date_to=<end>`
2. Record response shape without printing full private content.
3. Compare filtered results to controlled card titles/IDs.
4. Check whether `total_count` changes as expected.
5. Check whether date filters are ignored by comparing unfiltered and filtered IDs.
6. Check whether ordering is stable enough for checkpointing.
7. Document any rate-limit, 401/403, 422, or 5xx behavior.

### Pass Criteria

- API key auth succeeds.
- Filtered window includes all controlled cards.
- `created_at` values are parseable and timezone-safe.
- Filtered response is materially different from unfiltered response when the date range is narrow.
- No first-500-only behavior is observed for the controlled date window.
- Spike report includes enough redacted evidence for another agent to understand the result.

### Fail Criteria

- Date filters are ignored.
- Controlled cards are missing.
- API returns a capped/unordered set that cannot prove completeness.
- Auth cannot be performed without unsafe token handling.

### Blocks

- REST daily sync implementation plan.
- Checkpoint strategy.
- Production cron.

## SPIKE-014 - Recall Content Fidelity

### Question

Can `GET /api/v1/cards/{card_id}?max_chunks=50` return content that AI Brain can classify safely across representative Recall content types?

### Preconditions

- SPIKE-013 has found at least a few accessible test card IDs, or user provides specific card IDs.
- Real content samples are minimized and redacted where possible.

### Required Samples

The spike should test:

1. One note.
2. One web article.
3. One YouTube or other video card.
4. One PDF.
5. One no-URL item if available.
6. One long item likely to hit the 50-chunk cap.

### Method Requirements

The spike must:

1. Fetch each sample card with `max_chunks=50`.
2. Record metadata fields and chunk counts.
3. Check whether chunks have stable order.
4. Check whether chunks include timestamps/source metadata.
5. Detect exact-50-chunk responses.
6. Classify each sample using the V2 taxonomy:
   - `complete_enough_for_daily_import`
   - `api_chunks_unverified`
   - `possibly_truncated`
   - `metadata_only`
   - `blocked_unknown`
7. Avoid storing full real chunks in the report unless user approved the sample.

### Pass Criteria

- Every representative sample can be classified.
- Exact-50-chunk responses are labeled `possibly_truncated`.
- No sample is mislabeled as full text without evidence.
- Report includes recommended mapping rules for `items.body` construction.

### Fail Criteria

- Chunks are semantic snippets rather than stable card content.
- Chunk order is unclear.
- Long content cannot be identified as partial.
- The API returns too little content for useful AI Brain import.

### Blocks

- Content import quality.
- Enrichment eligibility.
- User-facing fidelity labels.

## SPIKE-015 - Recall Privacy And Fixture Safety

### Question

Can the Recall sync tooling be tested, logged, and reported without leaking private content or secrets?

### Method Requirements

The spike must:

1. Define redaction rules for:
   - API keys;
   - bearer tokens;
   - cookies;
   - signed URLs;
   - URL query strings;
   - full Recall chunks;
   - private titles if user marks a sample sensitive.
2. Create synthetic Recall list/detail fixtures.
3. Prove logs and dry-run output omit full chunks by default.
4. Define where real live response captures may be stored if user approves them.
5. Confirm approved real captures are gitignored or stored outside the repo.

### Pass Criteria

- Synthetic fixtures cover list, detail, partial content, no URL, exact-50 chunks, errors, and empty windows.
- Dry-run output contains counts, IDs or redacted IDs, titles only if allowed, and no full chunks.
- Secret redaction is tested or manually verified.

### Fail Criteria

- Any script prints API key or full private content by default.
- Real API payloads are written into tracked files without explicit approval.

### Blocks

- All live API spikes.
- Any PR or report that includes Recall payload evidence.

## SPIKE-016 - AI Brain Recall Import Fixture

### Question

Can a synthetic Recall card become an AI Brain item through `insertCaptured()` without duplication and with correct provenance?

### Method Requirements

The spike must:

1. Inspect and document current constraints around `items.capture_source`.
2. Prototype a migration or spike-only test setup that allows `capture_source='recall'`.
3. Create synthetic Recall preview/detail fixtures.
4. Map fixtures into `insertCaptured()` input.
5. Insert once and verify an AI Brain item is created.
6. Re-run and verify no duplicate item is created.
7. Verify the item has source type, source platform, capture source, title, body, and capture quality/fidelity consistent with the V2 report.
8. Verify Library/item-detail display does not break for Recall capture source.

### Pass Criteria

- One synthetic Recall card creates exactly one AI Brain item.
- Re-running skips or updates mapping without duplicate item.
- `capture_source='recall'` works in DB, TypeScript, and visible item display.
- Enrichment/embedding path is triggered or intentionally deferred with evidence.

### Fail Criteria

- DB CHECK constraint rejects Recall source without a clear migration path.
- UI or filters break for the new capture source.
- Dedupe can only rely on URL and fails no-URL items.

### Blocks

- Recall item import implementation.
- Schema migration plan.
- Library UX.

## SPIKE-017 - Existing Weak Item Upgrade

### Question

Can Recall content safely upgrade an existing weak AI Brain item, such as a metadata-only Android/Substack capture, without stale chunks or duplicates?

### Method Requirements

The spike must:

1. Seed or identify a weak existing item with a matching source URL.
2. Use a synthetic Recall detail fixture with richer body text.
3. Test whether `repairItemWithText()` can be used or adapted.
4. Verify old chunks/vectors/summaries are cleared or requeued correctly.
5. Verify the user-visible item improves rather than duplicating.

### Pass Criteria

- Existing item is upgraded, not duplicated.
- Stale semantic chunks are removed.
- Enrichment and embedding rerun or are queued safely.
- Capture/fidelity metadata indicates Recall upgraded the item.

### Fail Criteria

- Upgrade requires unsafe field-only overwrite.
- Existing strong items may be overwritten.
- Chunks/vectors remain stale.

### Blocks

- Automatic upgrade behavior in V1.

### Default If Inconclusive

Keep weak-item upgrades out of V1. Import Recall cards only when card ID and dedupe are unambiguous.

## SPIKE-018 - Scheduler And Checkpoint Safety

### Question

Can the Recall import run as a safe daily job without duplicate runs, checkpoint corruption, or unbounded downstream work?

### Method Requirements

The spike must:

1. Design a CLI-first flow:

```text
scripts/sync-recall.ts --dry-run
scripts/sync-recall.ts --apply
```

2. Use fake Recall clients and fake clocks.
3. Simulate:
   - empty window;
   - successful window;
   - partial fetch failure;
   - API auth failure;
   - exact cap overflow;
   - concurrent run attempt;
   - retry after failure.
4. Verify checkpoint advances only after full success.
5. Verify run lock prevents overlap.
6. Verify caps stop oversized runs.
7. Verify exit codes are cron-friendly.

### Pass Criteria

- Checkpoint does not advance on partial failure.
- Run lock prevents overlap.
- Caps are enforced before writes.
- Dry-run and apply produce redacted run records.
- CLI can be scheduled later without relying on in-process Next.js cron.

### Fail Criteria

- A partial failure can lose cards.
- Overlapping runs can duplicate work.
- First-run imports can flood enrichment.

### Blocks

- Production cron.
- Deployment runbook.

## SPIKE-019 - Fallback Enumeration

### Question

If REST enumeration fails, can MCP or Markdown export support a trustworthy fallback import or reconciliation workflow?

### Trigger

Run this spike only if SPIKE-013 fails or SPIKE-014 shows REST content is too weak for the desired product promise.

### MCP Method Requirements

The spike must:

1. Confirm actual auth flow for Recall MCP in the available client/runtime.
2. Test whether `filter_by_metadata` can list cards by date or equivalent metadata.
3. Test whether `get_document_content` returns richer or more complete content than REST.
4. Document token storage and refresh implications.

### Markdown Method Requirements

The spike must:

1. Export a small Recall knowledge base or selected cards.
2. Inspect filenames, frontmatter, source URLs, card IDs, timestamps, and body completeness.
3. Check whether exported Markdown can match REST card IDs or source URLs.
4. Decide whether export is manual-only, semi-automated, or automation-ready.

### Pass Criteria

- At least one fallback can preserve identity, retrieve useful content, and operate safely.

### Fail Criteria

- MCP cannot enumerate safely.
- Markdown export lacks stable identifiers.
- Both paths require brittle browser automation with unacceptable privacy/maintenance risk.

### Blocks

- Any fallback implementation plan.

## Execution Order

Run spikes in this order:

1. SPIKE-015 Privacy And Fixture Safety.
2. SPIKE-013 REST Enumeration.
3. SPIKE-014 Content Fidelity.
4. SPIKE-016 AI Brain Import Fixture.
5. SPIKE-018 Scheduler And Checkpoint Safety.
6. SPIKE-017 Existing Weak Item Upgrade.
7. SPIKE-019 Fallback Enumeration, only if needed.

Rationale:

- Privacy/fixtures should be established before live API work.
- Enumeration decides whether REST is viable.
- Content fidelity decides the product promise.
- Import fixture validates AI Brain integration.
- Scheduler safety matters only after data path viability is known.
- Weak-item upgrade can be deferred if needed.
- Fallback work should not distract unless primary REST gates fail.

## Required Review Questions For V2

The adversarial review should challenge this spike requirements doc on:

1. Whether the spikes are too broad to execute.
2. Whether live Recall API work is safe enough.
3. Whether pass/fail criteria are objective.
4. Whether the ordering minimizes wasted work.
5. Whether any hidden implementation work slipped into spike scope.
6. Whether the outputs are enough to create a real implementation plan.
7. Whether user decisions are clearly separated from technical gates.

## User Inputs Needed Before Execution

Before running live Recall API spikes, the user must provide:

1. Confirmation that a Recall API key may be used locally for spikes.
2. The local mechanism for the key, preferably an environment variable.
3. Permission to create or identify controlled Recall cards.
4. Confirmation whether sample titles may appear in local spike reports.
5. Confirmation whether any real content snippets may be stored, or whether all reports must use redacted summaries only.

## Milestone Exit Criteria

This spike phase is complete when:

1. Every required spike has a Markdown report.
2. Each report has a clear verdict: `CLEAR`, `PROCEED-WITH-CHANGES`, `BLOCKER`, or `INCONCLUSIVE`.
3. The final implementation options artifact summarizes which product option is viable.
4. A PRD can be written without unresolved API enumeration, content fidelity, privacy, or scheduler unknowns.
