# SPIKE-017 - Recall Weak Item Upgrade

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-017 |
| **Date** | 2026-06-24 10:07 IST |
| **Author** | AI agent (Codex) |
| **Phase** | Phase C - optional local integration |
| **Triggered by** | Recall daily sync V2 OPTIONAL-001: determine whether Recall content can safely upgrade existing weak AI Brain items |
| **Isolation** | Synthetic Recall cards, isolated test DB state, no live Recall API calls, no production mutation |
| **Verdict** | PROCEED-AS-OPTIONAL with explicit enablement; keep disabled by default until live Recall fidelity gates pass |

## Question

Can Recall content safely upgrade an existing weak AI Brain item, such as a metadata-only Android/Substack capture, without stale chunks, stale vectors, stale summaries, or duplicates?

## Summary Verdict

Yes, with a conservative policy:

- Weak-item upgrade must be opt-in, not default V1 behavior.
- Matching is allowed only by exact `source_url`.
- The existing AI Brain item must already be weak according to the existing needs-upgrade rules.
- Strong existing items must not be overwritten.
- The upgrade must reuse the existing repair pipeline so stale chunks, vectors, auto tags, topics, summaries, quotes, categories, and embedding jobs are cleared or reset.
- Recall sync bookkeeping must record whether the card imported a new item, upgraded an existing weak item, skipped an existing strong item, or was blocked.

## Implementation Added

Code changes:

- `src/lib/recall/importer.ts`
  - Added optional `upgradeWeakExistingByUrl`.
  - If enabled, exact `source_url` matches are inspected before creating a new item.
  - Weak existing items are upgraded in place through `repairItemWithText()`.
  - Strong existing items are skipped and recorded as `skipped_existing_source_url`.
  - Short or otherwise invalid weak upgrades are recorded as `blocked_weak_existing`.
  - Sync metadata records the event, previous capture source, previous quality, weak reason, and cleanup counts.
- `src/lib/recall/sync-runner.ts`
  - Added optional runner flag `upgradeWeakExistingByUrl`.
  - Added `cardsUpgraded` to the run report.
  - Counts skipped source-URL matches separately from new imports while preserving the existing checkpoint rules.
- `src/db/recall-sync.ts`
  - Relaxed sync item insertion so `item_id` and `imported_at` can be null when a Recall card is seen but not imported as a new item.
  - Added optional `last_error` recording for blocked weak upgrades.
- `src/lib/repair/item-repair.ts`
  - Extended repair input to carry explicit `captureQuality`, `extractionWarning`, `extractionMethod`, and `extractionVersion`.
  - This lets Recall upgrades preserve the Recall fidelity warning, such as `recall_api_chunks_unverified`.

Tests added or updated:

- `src/lib/recall/importer.test.ts`
- `src/lib/recall/sync-runner.test.ts`

## Policy Implemented

### New Recall Card With No Matching Source URL

Behavior remains unchanged:

- create a new AI Brain item;
- set `capture_source='recall'`;
- record `recall_sync_items.sync_status='imported'`;
- enqueue enrichment through the existing insert trigger.

### Same Recall Card ID Reappears

Behavior remains unchanged:

- exact same content hash -> `skipped_existing`;
- changed content hash -> `changed_remote`;
- existing AI Brain item is not overwritten.

### Matching Source URL With Weak Existing AI Brain Item

When `upgradeWeakExistingByUrl=true`:

- find the latest AI Brain item with the same `source_url`;
- verify it is weak using the existing `needsUpgradeReason()` policy;
- repair the existing item with the mapped Recall body;
- preserve original item identity, source URL, source platform, and capture source;
- set capture quality from Recall mapping, usually `full_text`;
- set extraction method to `recall_api_weak_item_upgrade`;
- preserve Recall fidelity as `extraction_warning`;
- clear stale chunks/vectors/summaries/quotes/category/embedding jobs;
- requeue enrichment;
- record `recall_sync_items.sync_status='imported'` with metadata event `upgraded_existing_weak`.

### Matching Source URL With Strong Existing AI Brain Item

When `upgradeWeakExistingByUrl=true`:

- do not overwrite the existing item;
- do not create a duplicate item;
- record the Recall card as `skipped_existing_source_url`;
- store sync metadata explaining that the existing AI Brain item was not marked weak.

### Weak Existing Item But Recall Body Is Not Safe To Repair

The repair pipeline can reject unsafe input, such as too-short content. In that case:

- do not create a duplicate;
- do not modify the existing item;
- record `sync_status='blocked'`;
- store `last_error` and a metadata event `blocked_weak_existing`.

## Evidence

### Importer-Level Proof

The synthetic weak-upgrade test seeds:

- a metadata-only AI Brain item with matching `source_url`;
- existing stale summary, quotes, category, and `enrichment_state='done'`;
- a stale chunk and vector row;
- a completed embedding job.

Then it imports a richer synthetic Recall card with the same source URL and `upgradeWeakExistingByUrl=true`.

Observed assertions:

- no duplicate item is created;
- existing item ID is preserved;
- original capture source remains `android`;
- extraction method becomes `recall_api_weak_item_upgrade`;
- Recall warning becomes `recall_api_chunks_unverified`;
- old summary, quotes, category, chunks, vector, and embedding job are cleared;
- enrichment is set back to `pending`;
- FTS no longer finds the old stale phrase;
- FTS finds the new Recall-only proof phrase;
- `recall_sync_items` points the Recall card at the existing item;
- repeated import of the same exact Recall card ID is idempotent.

### Strong-Item Protection Proof

The synthetic strong-item test seeds:

- an existing full-text AI Brain item with matching `source_url`;
- a synthetic Recall card with the same source URL.

Observed assertions:

- no duplicate item is created;
- existing item title/body remain unchanged;
- sync item is recorded as `skipped`;
- sync metadata contains `skipped_existing_source_url`.

### Runner-Level Proof

The daily runner test seeds:

- a weak existing AI Brain item;
- a fake Recall client returning a matching card.

With `upgradeWeakExistingByUrl=true`, the run report shows:

- `cardsImported = 0`;
- `cardsUpgraded = 1`;
- `cardsSkipped = 0`;
- `cardsBlocked = 0`;
- item count unchanged;
- checkpoint advances after successful apply;
- upgraded item keeps original capture source and gets `recall_api_weak_item_upgrade`.

## Validation

Focused validation passed:

```text
node --import tsx --test src/lib/recall/importer.test.ts

# tests 7
# pass 7
# fail 0
```

```text
node --import tsx --test src/lib/recall/sync-runner.test.ts

# tests 7
# pass 7
# fail 0
```

Broader Recall spike validation and typecheck passed:

```text
node --import tsx --test \
  src/lib/recall/importer.test.ts \
  src/lib/recall/scheduler.test.ts \
  src/lib/recall/sync-runner.test.ts \
  src/lib/repair/item-repair.test.ts \
  src/db/migrations/020_recall_sync.test.ts \
  src/lib/capture/quality.test.ts \
  src/lib/security/redaction.test.ts

# tests 32
# pass 32
# fail 0
```

```text
npm run typecheck

passed
```

## Pass Criteria Assessment

| Criterion | Result | Evidence |
|---|---|---|
| Existing weak item is upgraded, not duplicated | Passed | Importer weak-upgrade test; item count unchanged |
| Stale semantic artifacts are cleared or regenerated | Passed | Old chunk/vector/embedding job cleared; stale FTS phrase removed; enrichment requeued |
| Strong existing items are protected | Passed | Strong source-URL test records skip and leaves item unchanged |
| User-visible metadata explains Recall upgraded the item | Passed with caveat | Body includes Recall provenance; extraction method records `recall_api_weak_item_upgrade`; UI may need a later badge/label if this becomes a shipped feature |
| Matching logic avoids unrelated overwrites | Passed for exact URL policy | Only exact `source_url` matches are eligible; weak policy gate required |

## Caveats

This spike proves the local mechanics, not the product decision to enable upgrades by default.

Remaining caveats:

1. Exact URL matching may miss equivalent canonical URLs, redirects, mobile URLs, and tracking-parameter variants.
2. Exact URL matching may still be too broad for platforms where a URL can represent comments, notes, or a dynamically changing feed.
3. The feature should stay disabled until live Recall content fidelity proves that Recall bodies are complete enough for automatic repair.
4. The current UI does not show a dedicated "upgraded by Recall" badge; the provenance is present in body/method metadata.
5. A production run should expose `cardsUpgraded` and `cardsBlocked` in redacted run reports before apply mode is enabled.

## Recommendation

Keep weak-item upgrades out of the default V1 Recall daily import path.

Offer it as an optional V1.1/V2 mode after live API gates pass:

```text
RECALL_SYNC_UPGRADE_WEAK_BY_URL=true
```

Production enablement should require:

- live SPIKE-013 REST enumeration passed;
- live SPIKE-014 content fidelity passed;
- canonical URL policy reviewed;
- redacted dry-run report showing exact upgrade candidates;
- user approval for the first apply run with upgrades enabled.

## Tracker Update

Mark:

- `RDS-017` as `Done - optional policy implemented and validated`.
- `M9` as `Done for offline integration/scheduler/operability; live gates still block production scheduling`.

Keep:

- Phase B live API gates blocked until user provides API-key mechanism and controlled sample cards.
- Final implementation options pending until either live gates run or the final options document explicitly marks live gates as unresolved.
