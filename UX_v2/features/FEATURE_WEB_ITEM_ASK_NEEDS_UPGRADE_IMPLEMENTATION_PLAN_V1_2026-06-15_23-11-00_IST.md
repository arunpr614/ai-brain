# Implementation Plan v1: Web Item Detail, Ask, and Needs Upgrade

**Created:** 2026-06-15 23:11:00 IST
**Source PRD:** `FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_PRD_V2_2026-06-15_23-09-30_IST.md`
**Status:** Draft for adversarial review

## Implementation Principles

- Do not introduce fake states to match prototypes.
- Remove unapproved destructive controls rather than hiding them behind visual-only styling.
- Prefer pure helper tests for request construction and backend tests for repair postconditions.
- Keep browser QA deterministic with a seeded database and provider-down Ask environment.

## Work Breakdown

### 1. Deterministic Fixture Script

Add `scripts/ux-v2-seed-item-ask-needs-upgrade.ts`.

The script will:

- Create a full-text item with enough body for item detail, focus mode, and Ask item.
- Create at least two weak items with different weak reasons where supported.
- Create a repair target weak item.
- Create a manual tag, collection, and generated topic connected to known items.
- Create chunks for full-text items where local retrieval tests need citations or source chips.
- Print a manifest with:
  - full item route
  - weak item route
  - weak focus route
  - repair route
  - Needs Upgrade route
  - Ask item route
  - Ask selected route
  - Ask tag/topic/collection routes
  - missing scope routes where relevant

### 2. Item Detail Safety and Readability

Edit `src/app/items/[id]/page.tsx`:

- Remove `Trash2` import.
- Remove `deleteItemAction` import.
- Remove footer delete form and button.
- Keep Ask, focus, export, repair, trust strip, tags, topics, collections, digest, and related items intact.
- Confirm focus mode still exposes Ask, Source, and weak repair CTA.

### 3. Needs Upgrade Queue Grouping

Edit `src/app/needs-upgrade/page.tsx`:

- Group items by `needsUpgradeReason(...) ?? "Needs readable text"`.
- Render each group with heading and count.
- Keep row metadata and Add text/Source/detail links.
- Do not add Delete, retry, merge, or mark-good-enough.
- Preserve empty state.

### 4. Ask Scope Request Construction

Edit `src/app/ask/ask-client.tsx`:

- Extract a pure exported helper such as `buildAskRequestBody`.
- The helper accepts question, itemId, selected/item-set ids, and thread id.
- It returns:
  - item scope for item id
  - items scope for selected/tag/topic/collection item id arrays
  - library scope for no item scope
- Improve provider-down UI copy for `LLM_PROVIDER_OFFLINE` if needed.

Add a focused test, likely `src/app/ask/ask-client.scope.test.ts`, for:

- item scope request body
- selected/item-set scope request body
- library fallback
- thread id pass-through

### 5. Repair Evidence

Review existing repair tests and add only missing coverage.

Required tests:

- short text rejects
- successful repair updates quality/body and clears warning
- stale chunks/vectors/auto tags/topics are cleared
- enrichment job is pending
- repaired item no longer appears in `listNeedsUpgradeItems`

If existing tests already cover these, reference them in QA and avoid duplicate tests.

### 6. Static Validation

Run:

- `git diff --check`
- focused tests for Ask scope, repair, item/needs helpers if added
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

### 7. Browser QA

Seed a fresh DB and run the local app with provider down for Ask.

Capture screenshots under:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/item-ask-needs-upgrade/`

Required screenshots:

- full item 390 and 1280
- weak item 390 and 1280
- weak focus mode 390 and 1280
- Needs Upgrade populated 390 and 1280
- repair short-text error 1280
- repair success banner 1280
- Needs Upgrade after repair/removal 1280
- Ask item provider-down 390 and 1280
- Ask selected, topic, and collection scope banners at 1280

Required browser checks:

- no visible/focusable Delete on Item Detail and Needs Upgrade
- repair success removes item from Needs Upgrade
- Ask missing-scope recovery does not show composer
- final route sweep has 0 fresh console warnings/errors

### 8. Reporting

Create:

- QA report in `UX_v2/execution/`
- tracker update in `UX_v2/project_management/`

Both must state local completion only and no production deployment.

## Rollback Notes

All changes are local source changes. Rollback is reverting this feature's source edits, seed script, and tests. Database fixture mutations are isolated by `BRAIN_DB_PATH` during QA.

## Open Questions

1. Should live answer-with-citations be done with a temporary deterministic provider stub in this slice or deferred to integrated release QA?
2. Should Needs Upgrade group headings use product copy from `needsUpgradeReason` directly, or normalized reason names?
