# Implementation Plan v2: Web Library, Search, Topics, and Collections

**Created:** 2026-06-15 22:41:00 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Status:** Approved for local execution
**Product source:** `FEATURE_WEB_LIBRARY_SEARCH_TOPICS_COLLECTIONS_PRD_V2_2026-06-15_22-36-42_IST.md`
**Supersedes:** `FEATURE_WEB_LIBRARY_SEARCH_TOPICS_COLLECTIONS_IMPLEMENTATION_PLAN_V1_2026-06-15_22-38-03_IST.md`
**Adversarial review:** `FEATURE_WEB_LIBRARY_SEARCH_TOPICS_COLLECTIONS_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-15_22-40-00_IST.md`

## 1. Objective

Implement the PRD v2 slice for Library, Search, Topic, and Collection surfaces. The work must remove active Library destructive delete, preserve validated organization actions, add scope-health context to Topic/Collection, productize Search provider-down copy, create deterministic browser QA fixtures, and produce test/browser evidence.

## 2. Files Expected To Change

| File | Planned change |
| --- | --- |
| `src/components/library-list.tsx` | Remove Library bulk delete UI/import/handler, update toolbar copy, keep Ask/Tag/Add-to-collection/Clear. |
| `src/app/actions.ts` | Harden bulk tag and bulk collection actions with unique selected IDs, item existence validation, collection existence validation, and truthful selected-item counts. Keep bulk delete server action for other surfaces only. |
| `src/app/actions.bulk.test.setup.ts` | New temporary DB setup. This must be the first import in the bulk action test. |
| `src/app/actions.bulk.test.ts` | New tests for bulk tag and collection postconditions, idempotency, duplicate IDs, blank tag rejection, missing IDs, and missing collection. |
| `scripts/ux-v2-seed-library-search-topics-collections.ts` | New deterministic QA seed script that creates synthetic Library/Search/Topic/Collection data and prints a route manifest. |
| `src/app/search/page.tsx` | Replace developer-facing provider-down copy with AI Memory product copy and Settings/AI-services recovery pointer. |
| `src/app/topics/[slug]/page.tsx` | Add scope-health summary, weak/readable counts, responsive polish, and item metadata. |
| `src/app/collections/[id]/page.tsx` | Add scope-health summary, quality/platform metadata, responsive polish, and clearer empty state. |
| `UX_v2/execution/WEB_EXPERIENCE_REVAMP_LIBRARY_SEARCH_TOPICS_COLLECTIONS_QA_<timestamp>.md` | New execution report after implementation. |
| `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>.md` | Tracker checkpoint after QA. |

## 3. Deterministic Fixture Plan

Create `scripts/ux-v2-seed-library-search-topics-collections.ts`.

Run it with:

```bash
BRAIN_DB_PATH=/tmp/ai-memory-lstc-qa.sqlite node --import tsx scripts/ux-v2-seed-library-search-topics-collections.ts
```

The script must:

- use synthetic titles/content only;
- insert at least one full-text note/article, one YouTube transcript or metadata-like item, one PDF item, one weak/needs-upgrade item, and one long-title stress item;
- create one manual tag attached to at least two items;
- create one populated manual collection with at least two items;
- create one empty manual collection;
- create one generated topic with at least two items and at least one weak-source item;
- include a search-hit keyword and a no-result keyword;
- print JSON or clear markdown with:
  - `dbPath`,
  - search hit query,
  - search miss query,
  - tag name,
  - topic slug,
  - populated collection ID,
  - empty collection ID,
  - fixture item IDs,
  - exact browser QA routes.

Browser QA must use this DB path unless a stronger documented equivalent is created.

## 4. Implementation Phases

### Phase A - Test foundation

1. Add `src/app/actions.bulk.test.setup.ts`.
2. In `src/app/actions.bulk.test.ts`, import the setup file first, before any action or DB module.
3. Seed test records through DB helpers.
4. Assert `bulkTagItemsAction`:
   - rejects empty ID list,
   - rejects blank tag,
   - deduplicates duplicate IDs and returns unique selected count,
   - attaches canonical tag to every unique selected item,
   - remains idempotent on duplicate submission,
   - returns an error when any selected ID is missing.
5. Assert `bulkAttachCollectionAction`:
   - rejects empty ID list,
   - rejects missing collection ID,
   - deduplicates duplicate IDs and returns unique selected count,
   - attaches every unique selected item to the selected collection,
   - remains idempotent on duplicate submission,
   - returns an error when any selected ID or collection ID is missing.

### Phase B - Harden bulk actions

1. Add a helper in `src/app/actions.ts` to normalize and deduplicate selected IDs.
2. Validate that every selected item exists before mutation.
3. Validate that the target collection exists before bulk attach.
4. Keep transaction boundaries around mutation loops.
5. Return counts based on unique selected existing items after validation.
6. Update Library flash copy:
   - `Applied tag to N selected item(s).`
   - `Added N selected item(s) to <collection>.`
7. On action error, keep selection intact and show `Error: ...`.

### Phase C - Remove active Library destructive UI

1. Remove `Trash2` and `bulkDeleteItemsAction` imports from `src/components/library-list.tsx`.
2. Remove `handleBulkDelete`.
3. Remove `onDelete` prop plumbing from `BulkBar`.
4. Remove the Delete button from the toolbar.
5. Update the file comment so it documents only Ask, Tag, and Add to collection.
6. Source scan must pass:
   - no `Trash2` in `src/components/library-list.tsx`,
   - no `bulkDeleteItemsAction` in `src/components/library-list.tsx`,
   - no `handleBulkDelete`,
   - no rendered Library toolbar `Delete` button.

### Phase D - Search provider-down copy

1. Replace `Ollama offline` with product-facing copy such as `AI search is unavailable`.
2. Replace terminal-command recovery text with Settings/AI-services copy.
3. Preserve current behavior: FTS works; semantic/hybrid show provider-down state when embeddings are unavailable.
4. Provider-down browser QA is required. Use a separate local run if needed:

```bash
BRAIN_DB_PATH=/tmp/ai-memory-lstc-qa.sqlite OLLAMA_HOST=http://127.0.0.1:1 npm run dev
```

If the existing dev server already renders provider-down for semantic/hybrid, capture that. If a restart is needed, stop/restart cleanly and record it in the QA report.

### Phase E - Topic and Collection scope health

1. Add local helper functions on each route or a small shared helper if duplication becomes meaningful.
2. Readable count rule:
   - item has non-empty `body`,
   - and `!isLimitedCaptureQuality(item.capture_quality)`.
   - null quality with a non-empty body counts as readable unless the item has warning-class limited metadata.
3. Weak count rule:
   - `isLimitedCaptureQuality(item.capture_quality)`,
   - or extraction warning indicates metadata-only/no-transcript/failed usable text.
4. Render compact scope-health row:
   - total sources/items,
   - readable count,
   - needs-upgrade/weak count when > 0.
5. Render weak-source warning copy only when weak count > 0.
6. Keep Ask topic/collection visible only when items exist.
7. Keep not-found behavior unchanged.

### Phase F - Browser QA

Seed fixtures:

```bash
rm -f /tmp/ai-memory-lstc-qa.sqlite
BRAIN_DB_PATH=/tmp/ai-memory-lstc-qa.sqlite node --import tsx scripts/ux-v2-seed-library-search-topics-collections.ts
BRAIN_DB_PATH=/tmp/ai-memory-lstc-qa.sqlite npm run dev
```

Use the route manifest printed by the seed script.

Required evidence folder:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/library-search-topics-collections/`

Capture:

- Library default at 390 light/dark, 768 light, 1024 light, 1280 light, 1440 dark.
- Library filtered/tagged at 390 sheet-open and 1280.
- Library selected toolbar at 390 and 1280; prove Delete absent.
- Search empty, hit, miss, and provider-down.
- Topic populated at 390 light, 1280 light, and one dark screenshot at 1280.
- Topic not-found shell-stable check.
- Collection populated at 390 light, 1280 light, and one dark screenshot at 1280 if Topic dark is not captured.
- Collection empty and not-found.
- Console/focusable reports for changed routes.

### Phase G - Static validation and reporting

Run:

1. Focused bulk-action tests.
2. Seed script smoke.
3. Delete source scans.
4. `git diff --check`.
5. `npm run typecheck`.
6. `npm run lint`.
7. `npm test`.
8. `npm run build`.

Then create:

- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_LIBRARY_SEARCH_TOPICS_COLLECTIONS_QA_<timestamp>.md`,
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>.md`.

## 5. Acceptance Criteria

| Requirement | Done when |
| --- | --- |
| Deterministic fixtures | Seed script creates the PRD fixture set and prints route manifest. |
| Delete removal | Source scan and browser selected-state/focusable check prove Library Delete is absent. |
| Bulk tag | Tests and browser/local interaction prove canonical tag exists on every unique selected item after reload. |
| Bulk collection | Tests and browser/local interaction prove selected collection contains every unique selected item after reload. |
| Search copy | Provider-down state is rendered and screenshot; no terminal command copy appears in main UI. |
| Topic/collection scope health | Populated Topic and Collection show scope-health summary and weak-source warning when applicable. |
| Visual QA | Required screenshots and machine-readable reports are stored under the evidence folder. |
| Release hygiene | QA report and project tracker update exist; production deploy remains pending. |

## 6. No-Go Gates

- Do not execute browser QA without the deterministic seed route manifest.
- Do not mark local completion if populated Topic and Collection screenshots are missing.
- Do not mark local completion if provider-down state is not rendered or deterministically verified.
- Do not mark local completion if any visible/focusable Library Delete control remains.
- Do not keep bulk tag/collection active if persisted-row tests fail.
- Do not mark release/deploy complete; this feature is local until broader release packet and production gates pass.
