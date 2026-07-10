# Implementation Plan v1: Web Library, Search, Topics, and Collections

**Created:** 2026-06-15 22:38:03 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Status:** Draft for adversarial review
**Product source:** `FEATURE_WEB_LIBRARY_SEARCH_TOPICS_COLLECTIONS_PRD_V2_2026-06-15_22-36-42_IST.md`

## 1. Objective

Implement the PRD v2 slice for Library, Search, Topic, and Collection surfaces. The work must remove active Library destructive delete, preserve validated organization actions, add scope-health context to Topic/Collection, productize Search provider-down copy, and produce test/browser evidence.

## 2. Files Expected To Change

| File | Planned change |
| --- | --- |
| `src/components/library-list.tsx` | Remove Library bulk delete UI/import/handler, update toolbar copy, keep Ask/Tag/Add-to-collection/Clear. |
| `src/app/actions.ts` | Harden bulk tag and bulk collection actions so success represents selected items that actually exist and have the relationship after the action. Keep bulk delete server action if other surfaces need it, but do not import it into Library. |
| `src/app/actions.bulk.test.setup.ts` | New temporary DB setup for bulk-action tests. |
| `src/app/actions.bulk.test.ts` | New tests for bulk tag and collection postconditions, idempotency, blank tag rejection, missing/invalid IDs, and collection missing/empty handling. |
| `src/app/search/page.tsx` | Replace developer-facing provider-down copy with AI Memory product copy and optional Settings pointer. |
| `src/app/topics/[slug]/page.tsx` | Add scope-health summary, weak/readable counts, polish responsive spacing and item metadata. |
| `src/app/collections/[id]/page.tsx` | Add scope-health summary, quality/platform metadata, and polish responsive spacing and empty state. |
| `UX_v2/execution/WEB_EXPERIENCE_REVAMP_LIBRARY_SEARCH_TOPICS_COLLECTIONS_QA_<timestamp>.md` | New execution report after implementation. |
| `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>.md` | Tracker checkpoint after QA. |

## 3. Implementation Phases

### Phase A - Local data and test foundation

1. Add bulk-action tests with a temp SQLite DB.
2. Seed at least three items and one manual collection in tests.
3. Assert `bulkTagItemsAction`:
   - rejects empty ID list,
   - rejects blank tag,
   - attaches canonical tag to every selected item,
   - remains idempotent on duplicate submission,
   - returns an error when any selected ID is missing.
4. Assert `bulkAttachCollectionAction`:
   - rejects empty ID list,
   - rejects missing collection ID,
   - attaches every selected item to the selected collection,
   - remains idempotent on duplicate submission,
   - returns an error when any selected ID or collection ID is missing.

### Phase B - Harden bulk actions

1. Add a small helper in `src/app/actions.ts` to verify every selected item exists before mutating.
2. Add a helper to verify the target collection exists before bulk attach.
3. Keep transaction boundaries around mutation loops.
4. Return counts based on selected existing items after validation.
5. Keep user-facing result copy truthful: "Applied tag to N selected items" and "Added N selected items to collection".

### Phase C - Remove active Library destructive UI

1. Remove `Trash2` and `bulkDeleteItemsAction` imports from `src/components/library-list.tsx`.
2. Remove `handleBulkDelete`.
3. Remove `onDelete` prop plumbing from `BulkBar`.
4. Remove the Delete button from the toolbar.
5. Update the file comment so it no longer documents Delete as a shipped toolbar action.
6. Verify source scan:
   - no `Trash2` in `src/components/library-list.tsx`,
   - no `bulkDeleteItemsAction` import/use in `src/components/library-list.tsx`,
   - no Library toolbar text `Delete`.

### Phase D - Search copy

1. Replace `Ollama offline` with product-facing copy such as `AI search is unavailable`.
2. Replace terminal-command recovery text with a Settings/AI services pointer.
3. Preserve the current mode behavior: FTS still works; semantic/hybrid show provider-down state when embeddings are unavailable.

### Phase E - Topic and Collection scope health

1. Add local helper functions to count readable and weak items from the loaded item array.
2. Use existing `isLimitedCaptureQuality` and body presence to derive counts.
3. Render a compact scope-health row on Topic and Collection pages.
4. Add weak-source warning copy only when weak count > 0.
5. Keep Ask topic/collection visible only when items exist.
6. Keep not-found behavior unchanged.

### Phase F - Browser QA

Use the running local app with a temporary QA DB. Seed data manually or by small one-off script if needed.

Required evidence folder:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/library-search-topics-collections/`

Capture:

- Library default at 390 light/dark, 768 light, 1024 light, 1280 light, 1440 dark.
- Library filtered/tagged at 390 sheet-open and 1280.
- Library selected toolbar at 390 and 1280; prove Delete absent.
- Search empty, hit, miss, and provider-down if environment allows.
- Topic populated and not-found.
- Collection populated, empty, and not-found.
- Console/focusable reports for changed routes.

### Phase G - Static validation and reporting

Run:

1. Focused bulk-action tests.
2. `git diff --check`.
3. `npm run typecheck`.
4. `npm run lint`.
5. `npm test`.
6. `npm run build`.

Then create:

- execution QA report,
- tracker update.

## 4. Acceptance Criteria

| Requirement | Done when |
| --- | --- |
| Delete removal | Source scan and browser selected-state check prove Library Delete is absent and not focusable. |
| Bulk tag | Tests pass and browser/local interaction proves tag application persists after reload. |
| Bulk collection | Tests pass and browser/local interaction proves collection membership persists after reload. |
| Search copy | Provider-down state no longer shows terminal command copy in main UI. |
| Topic/collection scope health | Populated Topic and Collection show scope-health summary and weak-source warning when applicable. |
| Visual QA | Required screenshots and reports are stored under the evidence folder. |
| Release hygiene | QA report and project tracker update exist; production deploy remains pending. |

## 5. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Server actions are awkward to test outside Next request context | Existing `revalidateBulkPaths` already swallows static-generation-store errors; focused tests should import actions after temp DB setup. |
| Provider-down state is environment-dependent | If the local embed provider is alive, test semantic provider-down by temporarily pointing `OLLAMA_HOST` to an unreachable host in a separate run or document the limitation. |
| Fixture data may leak private local records into screenshots | Use temporary QA DB and synthetic titles/content only. |
| Removing Library Delete may leave the server action unused but still present | That is acceptable because the PRD only bans active Library UI; deeper destructive-action cleanup belongs to a separate feature. |

## 6. No-Go Gates

- Do not mark local completion if populated Topic and Collection screenshots are missing.
- Do not mark local completion if any visible/focusable Library Delete control remains.
- Do not keep bulk tag/collection active if persisted-row tests fail.
- Do not mark release/deploy complete; this feature is local until broader release packet and production gates pass.
