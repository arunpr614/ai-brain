# Implementation Plan v2: Web Item Detail, Ask, and Needs Upgrade

**Created:** 2026-06-15 23:14:00 IST
**Source PRD:** `FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_PRD_V2_2026-06-15_23-09-30_IST.md`
**Status:** Revised after adversarial review; approved for local execution

## Guardrails

- Do not claim live Ask answers or citations in this local provider-down slice.
- Do not create partial retrieval/vector fixtures unless they are fully valid.
- Capture Needs Upgrade populated/grouped evidence before running repair success.
- Keep at least one weak item in the queue after repair so post-repair removal can be proven without making the queue empty unless an empty-state screenshot is intentional.
- Verify destructive delete removal through source scans and browser focusable checks.

## Implementation Steps

### 1. Seed Script

Add `scripts/ux-v2-seed-item-ask-needs-upgrade.ts`.

Seed records:

- `fullItem`: full-text article, manual tag, generated topic, collection membership.
- `weakMetadataItem`: metadata-only weak item for Needs Upgrade and weak detail.
- `weakPreviewItem`: preview/limited weak item with a different reason when supported.
- `repairTargetItem`: weak item used only for repair success.
- `collection`: contains `fullItem` and `weakMetadataItem`.
- `topic`: contains `fullItem` and `weakMetadataItem`.
- `tag`: attached to `fullItem` and `weakMetadataItem`.

Manifest routes:

- `/items/<fullItem>`
- `/items/<weakMetadataItem>`
- `/items/<weakMetadataItem>?mode=focus`
- `/items/<repairTargetItem>/repair`
- `/needs-upgrade`
- `/ask`
- `/items/<fullItem>/ask`
- `/ask?scope=selected&ids=<fullItem>,<weakMetadataItem>`
- `/ask?scope=tag&tag=<tag>`
- `/ask?scope=topic&topic=<topicSlug>`
- `/ask?scope=collection&collection=<collectionId>`
- missing selected/topic/collection scope routes

No citation or retrieval claim is attached to this seed unless valid embeddings/vector rows are added later.

### 2. Item Detail Delete Removal

Edit `src/app/items/[id]/page.tsx`:

- Remove `Trash2`.
- Remove `deleteItemAction`.
- Remove the delete form/button from the footer.
- Keep safe actions: Focus mode, Ask this item, Export as `.md`.

Verification scans:

- `rg -n "Trash2|deleteItemAction|>Delete<|aria-label=\\\"Delete\\\"" 'src/app/items/[id]/page.tsx' src/app/needs-upgrade/page.tsx`
- Browser focusable action scan on full and weak item pages.

### 3. Needs Upgrade Grouping

Edit `src/app/needs-upgrade/page.tsx`:

- Build grouped sections by `needsUpgradeReason(...) ?? "Needs readable text"`.
- Render group heading and count when items exist.
- Keep Add text, Source, and detail links per row.
- Preserve empty state.
- Do not add excluded controls.

### 4. Ask Request Body Helper and Offline Copy

Edit `src/app/ask/ask-client.tsx`:

- Export `buildAskRequestBody` and use it in `submit`.
- Inputs: question, itemId, itemIds, threadId.
- Outputs:
  - `{ question, scope: "item", item_id, thread_id? }`
  - `{ question, scope: "items", item_ids, thread_id? }`
  - `{ question, thread_id? }`
- Keep item-set behavior for selected, tag, topic, and collection because `AskPage` already passes route-derived item ids.
- Convert `LLM_PROVIDER_OFFLINE` display to product-facing copy: "AI services are unavailable. Check AI services in Settings, then try again."

Tests:

- Add `src/app/ask/ask-client.scope.test.ts` for helper output.
- Browser QA verifies scope banners for selected, tag, topic, collection, and missing-scope recovery.

### 5. Repair Verification

Use existing repair backend. Add tests only if existing tests do not already prove a requirement.

Browser order:

1. Screenshot Needs Upgrade populated/grouped before repair.
2. Open repair target.
3. Submit short text and verify inline error.
4. Submit valid text.
5. Verify redirect to item detail with "Source text updated".
6. Verify repaired item no longer appears in Needs Upgrade while other weak items remain.

### 6. Static Gates

Run after implementation:

- `git diff --check`
- focused Ask helper test
- focused repair test
- any new seed smoke
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

### 7. Browser QA

Use a fresh DB:

`BRAIN_DB_PATH=/tmp/ai-memory-item-ask-needs-qa.sqlite`

Run local app with Ask provider down:

`OLLAMA_HOST=http://127.0.0.1:1`

Evidence directory:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/item-ask-needs-upgrade/`

Required screenshots:

- full item: 390, 1280, 1440 dark
- weak item: 390, 1280
- weak focus mode: 390, 1280
- Needs Upgrade populated/grouped: 390, 1280
- repair short-text error: 1280
- repair success item detail banner: 1280
- Needs Upgrade after repair removal: 1280
- Ask item provider-down: 390, 1280
- Ask selected scope banner: 1280
- Ask tag scope banner: 1280
- Ask topic scope banner: 1280
- Ask collection scope banner: 1280
- missing scope recovery: 1280

Final browser report must include:

- no visible/focusable Delete on item detail and Needs Upgrade
- provider-down Ask product copy present
- missing-scope recovery has no composer
- final route sweep has 0 fresh console warnings/errors

### 8. Reports

Create:

- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_ITEM_ASK_NEEDS_UPGRADE_QA_<timestamp>.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>.md`

Both must say local completion only and no production deployment.
