# Recall Content Fidelity Probe Execution Report

Created: 2026-06-24 10:43 IST
Status: SPIKE-014 probe ready; live execution blocked pending API approval and controlled cards
Related plan: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V2_2026-06-24_10-21-46_IST.md`

## Scope

This pass prepared the content-fidelity probe required for SPIKE-014 and added a shared fidelity policy helper. It did not call the live Recall API, did not use credentials, did not import content, and did not deploy.

## Implemented

| Area | Files | Result |
|---|---|---|
| Fidelity policy helper | `src/lib/recall/fidelity.ts`, `src/lib/recall/fidelity.test.ts` | Added explicit import/retrieval decisions for `complete_enough_for_daily_import`, `api_chunks_unverified`, `possibly_truncated`, `metadata_only`, and `blocked_unknown`. Defaults are conservative: unverified, truncated, metadata-only, and unknown are review/approval gated. |
| SPIKE-014 probe script | `scripts/spikes/recall-content-fidelity.ts` | Added live/fixture probe that fetches card details or reads fixtures, maps Recall chunks through the existing mapper, emits redacted per-card fidelity, chunk count, max-chunk hit, source type/platform, extraction warning, and policy decision. |
| Redacted default output | `scripts/spikes/recall-content-fidelity.ts` | Titles are redacted by default; source URLs default to host only; chunks/full content are never printed. |
| Live guard | `scripts/spikes/recall-content-fidelity.ts` | Without `--fixture`, the script requires `RECALL_API_KEY`; no-key execution fails before any live request. |

## Validation

Passed:

```bash
node --import tsx --test src/lib/recall/fidelity.test.ts src/lib/recall/client.test.ts src/lib/recall/sync-runner.test.ts src/db/migrations/020_recall_sync.test.ts
node --import tsx scripts/spikes/recall-content-fidelity.ts --help
node --import tsx scripts/spikes/recall-content-fidelity.ts --fixture <synthetic-temp-fixture>
npm run typecheck
npm run lint
```

Fixture smoke verified:

- two synthetic cards were processed;
- default title redaction stayed active;
- metadata-only content classified as `metadata_only`;
- no live Recall API call was made.

## Remaining Live SPIKE-014 Work

After user approval:

1. Run against the controlled note, article, YouTube, PDF, and long/truncation candidate Recall cards.
2. Confirm every controlled card gets a fidelity state.
3. Confirm any exact 50-chunk response is classified `possibly_truncated`.
4. Produce `docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md` with redacted evidence.
5. Use the result to decide whether production import should allow `api_chunks_unverified` and whether retrieval/indexing must remain gated.

## Recommended Live Command Shape

```bash
RECALL_API_KEY=<redacted> node --import tsx scripts/spikes/recall-content-fidelity.ts \
  --card-id <controlled-note-card-id> \
  --card-id <controlled-article-card-id> \
  --card-id <controlled-youtube-card-id> \
  --card-id <controlled-pdf-card-id> \
  --card-id <controlled-long-card-id>
```

Use `--allow-titles` or `--allow-source-urls` only if Arun explicitly approves including those values in local output.
