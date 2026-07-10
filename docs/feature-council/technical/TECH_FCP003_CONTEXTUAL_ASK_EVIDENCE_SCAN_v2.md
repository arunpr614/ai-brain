# Technical Plan FCP-003 Contextual Ask And Evidence Scan v2

Status: v2 final planning package  
Review addressed: `reviews/FCP003_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md`

## Recommended Architecture

Extend existing retrieval with explicit source-set filters and source-quality policy. Add Evidence Scan as a separate service that reuses retrieval but performs bounded claim classification over selected local chunks/anchors.

## Likely Affected Modules

- `src/app/ask/*`
- `src/components/ask-input.tsx`
- `src/lib/client/use-ask-stream.ts`
- `src/app/api/ask/route.ts`
- `src/lib/retrieve/index.ts`
- `src/lib/search/index.ts`
- new `src/lib/evidence-scan/*`
- new `src/app/api/evidence-scan/route.ts`
- `src/db/chat.ts`
- new `src/db/evidence-scan.ts`
- FCP-001 source health helpers.
- FCP-002 anchors when available.

## Data Model

### `evidence_scan_runs`

- `id TEXT PRIMARY KEY`
- `claim_hash TEXT NOT NULL`
- `source_set_json TEXT NOT NULL`
- `retrieval_version TEXT NOT NULL`
- `provider TEXT`
- `model TEXT`
- `status TEXT`
- `error_code TEXT`
- `created_at INTEGER`
- `completed_at INTEGER`

### `evidence_scan_candidates`

- `id TEXT PRIMARY KEY`
- `run_id TEXT REFERENCES evidence_scan_runs(id) ON DELETE CASCADE`
- `item_id TEXT`
- `chunk_id TEXT`
- `anchor_id TEXT NULL`
- `verdict TEXT CHECK IN ('supports','contradicts','nuances','irrelevant','insufficient')`
- `explanation TEXT`
- `rank INTEGER`

Avoid storing raw claim text by default unless user explicitly saves the scan.

## Retrieval Changes

- Add item/source-set filters to retrieval.
- Add quality policy function from FCP-001 source health.
- Add included/excluded source counts and reasons.
- Preserve existing library/item scope compatibility.

## Security / Privacy

- Use shared verified auth guard.
- Do not log claim text, query text, retrieved excerpts, or generated explanation.
- Redact provider error payloads.
- No cloud fallback beyond configured AI Brain providers; provider data flow disclosed in FCP-005.

## Test Plan

- Source-set filtering unit tests.
- Quality policy fixtures for full, weak, repaired, stale, unindexed sources.
- Evidence classifier parser fixtures for each verdict.
- No-evidence/all-irrelevant/provider-down/index-stale route tests.
- Citation link tests.
- Privacy tests for diagnostics payloads.

## Rollout

1. Add source-set Ask filters without Evidence Scan.
2. Add high-quality-only mode and skipped-source UI.
3. Add ephemeral Evidence Scan route/result.
4. Add optional saved scan history only after privacy decision.

## Rollback

Keep existing Ask route accepting old requests. New fields should be optional. Evidence Scan can be hidden independently if classification quality fails.
