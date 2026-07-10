# SPIKE-016 — Can a synthetic Recall card import into AI Brain with correct provenance?

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-016 |
| **Date** | 2026-06-24 09:25 |
| **Author** | AI agent (Codex) |
| **Time box** | Estimate: 3 hours; actual: ~45 minutes |
| **Triggered by** | Recall daily sync V2 gate GATE-004: AI Brain compatibility |
| **Blocks** | Recall import implementation, schema migration plan, Library UX plan |
| **Verdict** | BLOCKER at spike time; schema/type/UI blocker remediated locally after spike |

## Question

Can a synthetic Recall card become an AI Brain item through `insertCaptured()` without duplication and with correct Recall provenance?

## Method

This spike used only synthetic data and the existing isolated test database setup. No live Recall API calls were made and no real user content was used.

Work performed:

- Inspected current `items.capture_source` schema and TypeScript row type.
- Inspected `insertCaptured()` to confirm the insertion path.
- Inspected Library and item-detail capture-source label behavior.
- Ran a disposable test database probe that:
  - applied migrations to a temp database;
  - attempted `insertCaptured({ capture_source: "recall" })`;
  - inserted a synthetic Recall-shaped fallback item using `capture_source: "system"`;
  - checked whether the fallback item entered `enrichment_jobs`.
- Inspected migration precedent for CHECK-constraint rebuilds.

## Evidence

### Current DB and type constraints do not allow `capture_source='recall'`

`ItemRow.capture_source` is currently typed as:

```text
src/db/client.ts:123-127
capture_source: "web" | "android" | "extension" | "telegram" | "system" | "unknown";
```

The current migration CHECK constraint is:

```text
src/db/migrations/012_capture_source.sql:3-5
ALTER TABLE items
  ADD COLUMN capture_source TEXT NOT NULL DEFAULT 'web'
  CHECK (capture_source IN ('web', 'android', 'extension', 'telegram', 'system', 'unknown'));
```

`insertCaptured()` writes the provided capture source directly:

```text
src/db/items.ts:52-86
input.capture_source ?? "web"
```

Disposable test DB result:

```text
capture_source TEXT NOT NULL DEFAULT 'web'
  CHECK (capture_source IN ('web', 'android', 'extension', 'telegram', 'system', 'unknown')
recall_insert=rejected
CHECK constraint failed: capture_source IN ('web', 'android', 'extension', 'telegram', 'system', 'unknown')
```

This means true Recall provenance cannot be inserted today.

### Existing internal pipeline does accept synthetic Recall-like content if capture source is not `recall`

The same disposable test inserted a synthetic Recall-shaped item with `capture_source='system'`:

```text
fallback_insert=ecc573cc6b4e37d95b63a855:system:generic_article:metadata_only:enrichment=pending
```

This proves the basic `insertCaptured()` path can create an item and enqueue enrichment. It does not satisfy the product requirement because the item would show as "via System" rather than "via Recall."

### UI label helpers would currently show Recall as unknown

Item detail has a capture-source label helper:

```text
src/app/items/[id]/page.tsx:78-90
case "android": return "Android";
case "extension": return "Extension";
case "telegram": return "Telegram";
case "system": return "System";
case "web": return "Web";
default: return "Unknown";
```

Library list has a separate helper:

```text
src/components/library-list.tsx:87-101
case "android": return "Android";
case "extension": return "Extension";
case "telegram": return "Telegram";
case "system": return "System";
case "web": return "Web";
default: return "Unknown";
```

So even after the DB allows `recall`, the UI needs explicit label support.

### No Recall mapping tables exist yet

Search found only research/planning references for:

```text
recall_sync_items
recall_sync_runs
recall_sync_state
```

No implementation exists under `src/` or `scripts/`.

### CHECK constraint changes need a forward migration

Migration `009_telegram_source_type.sql` documents the precedent:

```text
src/db/migrations/009_telegram_source_type.sql:10-13
SQLite cannot ALTER a CHECK constraint in place, so this follows the same
table-rebuild pattern used by 008_batch_id.sql.
```

The Recall migration will need the same care, but against the current post-019 `items` schema, not the older 009 schema.

## Findings

1. `insertCaptured()` is the right internal insertion point.
2. The existing pipeline can create a synthetic Recall-like item and enqueue enrichment when using an allowed capture source.
3. The current DB CHECK constraint blocks `capture_source='recall'`.
4. The TypeScript `ItemRow.capture_source` union blocks `recall` at type level.
5. Library and item-detail UI helpers would label `recall` as `Unknown` unless updated.
6. The required `recall_sync_items`, `recall_sync_runs`, and `recall_sync_state` tables do not exist.
7. Dedupe by Recall card ID cannot be proven until `recall_sync_items` exists.

## Implementation recommendation

Block Recall import implementation until GATE-004 is addressed with a real migration and tests.

Required implementation work:

1. Add a forward migration, likely `020_recall_sync.sql`, that:
   - rebuilds `items` to extend `capture_source` with `recall`;
   - preserves every current post-019 `items` column;
   - preserves FTS, enrichment, and embedding triggers;
   - creates `recall_sync_items`;
   - creates `recall_sync_runs`;
   - creates `recall_sync_state`;
   - indexes Recall card ID, item ID, run state, and checkpoint fields as needed.
2. Update `src/db/client.ts` so `ItemRow.capture_source` includes `"recall"`.
3. Update UI label helpers:
   - `src/app/items/[id]/page.tsx`
   - `src/components/library-list.tsx`
   - any other raw `via {item.capture_source}` display paths.
4. Add an isolated test that:
   - inserts a synthetic Recall card through the future mapper/import path;
   - creates one item;
   - creates one `recall_sync_items` row;
   - re-runs and creates no duplicate;
   - verifies `enrichment_jobs` has a pending job;
   - verifies UI label helper returns `Recall`.
5. Keep weak-item upgrade out of this gate. That belongs in SPIKE-017.

### Follow-up completed

The schema/type/UI portion of GATE-004 was remediated immediately after this spike:

- `src/db/migrations/020_recall_sync.sql` - adds `capture_source='recall'`, `recall_sync_items`, `recall_sync_runs`, and `recall_sync_state`.
- `src/db/migrations/020_recall_sync.test.ts` - proves a post-019 database rejects Recall before migration, accepts it after migration, preserves existing rows, triggers FTS/enrichment/embedding behavior, and validates Recall sync table constraints.
- `src/db/client.ts` - extends `ItemRow.capture_source` with `"recall"`.
- `src/lib/capture/quality.ts` - adds shared `captureSourceLabel()` with `"Recall"`.
- `src/lib/capture/quality.test.ts` - covers Recall label behavior.
- `src/components/library-list.tsx`, `src/app/items/[id]/page.tsx`, `src/app/items/[id]/repair/page.tsx`, and `src/app/needs-upgrade/page.tsx` - use the shared capture-source label for visible provenance.

Validation passed:

```text
node --import tsx --test src/db/migrations/020_recall_sync.test.ts src/lib/capture/quality.test.ts src/lib/security/redaction.test.ts

# tests 10
# pass 10
# fail 0

npm run typecheck
```

Repository-level probe also confirmed:

```text
insertCaptured({ capture_source: "recall", ... }) -> enrichment=pending
```

Remaining GATE-004 work before production import:

1. Build the actual Recall mapper/import service.
2. Add idempotency tests for card-ID re-runs through the importer, not only DB constraints.
3. Validate Library/item-detail rendering in browser once real Recall rows or full importer fixtures exist.

### Follow-up completed - mapper/importer idempotency

The remaining mapper/importer portion of GATE-004 was implemented as a synthetic, no-live-data foundation:

- `src/lib/recall/types.ts` - defines Recall card detail, chunk, and content-fidelity types.
- `src/lib/recall/mapper.ts` - maps Recall card detail payloads into `insertCaptured()` input, provenance body text, source platform/type, capture quality, extraction warning, content hash, and `recall_sync_items` metadata.
- `src/db/recall-sync.ts` - adds a typed repository for `recall_sync_items`.
- `src/lib/recall/importer.ts` - imports one Recall card through the normal AI Brain capture pipeline and records sync provenance.
- `src/lib/recall/importer.test.ts` - proves synthetic import, enrichment queue insertion, FTS visibility, card-ID idempotency, changed-remote detection, metadata-only no-URL handling, and exact-50-chunk truncation classification.

Behavior proven:

1. A synthetic Recall card creates exactly one `items` row through `insertCaptured()`.
2. The item has `capture_source='recall'`, source/platform inference, Recall provenance in the body, and `recall_api_card_chunks` extraction metadata.
3. The insert trigger creates a pending `enrichment_jobs` row.
4. The item is visible through FTS search.
5. `recall_sync_items.recall_card_id` prevents duplicate imports on re-run.
6. A same-card content hash change is marked `changed_remote` without overwriting the existing AI Brain item.
7. No-URL/empty-chunk cards import as metadata-only note captures.
8. Exact 50-chunk responses classify as `possibly_truncated`.

Validation passed:

```text
node --import tsx --test src/lib/recall/importer.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/capture/quality.test.ts src/lib/security/redaction.test.ts

# tests 15
# pass 15
# fail 0

npm run typecheck
```

GATE-004 is now complete for synthetic/local compatibility. Remaining production blockers are live Recall API enumeration, live content-fidelity proof, scheduler/checkpoint design, and deployment operability.

## Risks / gaps surfaced

- SQLite CHECK constraint rebuilds are high-risk because the current `items` schema has evolved through many migrations. The migration must be generated from the current schema, not copied from migration 009.
- Live Recall response shape still needs to be validated against the mapper before production import.
- URL-only dedupe remains intentionally secondary; the importer now keys idempotency on `recall_sync_items.recall_card_id`.
- React browser rendering is still not fully validated; this follow-up updated label paths and typechecked, but did not capture screenshots.
