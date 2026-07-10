# Implementation Plan V1 - Android A3 Ask Composer And Item Detail

Created: 2026-06-16 11:48:00 IST
Owner: Codex
Product source: `FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_PRD_V2_2026-06-16_11-46-00_IST.md`

## Status

Draft for adversarial review. Do not execute code changes from this plan until implementation plan v2 exists.

## Implementation Scope

Routes/components:

- `src/app/ask/page.tsx`
- `src/app/ask/ask-client.tsx`
- `src/components/ask-input.tsx`
- `src/app/items/[id]/ask/page.tsx`
- `src/app/items/[id]/page.tsx`
- `src/components/related-items.tsx`

Scripts/tests:

- `scripts/ux-v2-seed-android-a3-ask-item-detail.ts`
- `scripts/ux-v2-check-android-a3-copy.ts`
- `scripts/ux-v2-browser-android-a3-ask-item-detail.ts`
- Focused tests for Ask input/request and any extracted item-detail helpers.

## Work Packages

### WP1 - Ask Composer Mobile Safety

- Update `AskInput` so empty send is DOM-disabled, not merely faded.
- Preserve Android IME fallback behavior.
- Add accessible helper copy only if needed; prefer disabled semantics with `disabled` and `aria-disabled`.
- Ensure the send button becomes enabled when textarea has non-empty trimmed text.
- Keep Stop behavior unchanged while busy.

### WP2 - Ask Mobile Error Harness

- Add a local-only browser QA mechanism to render an Ask provider-error state.
- Do not ship fake success data.
- Browser script must verify `AI services unavailable` and the Settings retry copy.

### WP3 - Item Detail Mobile Tabs

- Add mobile-only tab controls for Original, Digest, Ask, Related, Details.
- Reuse existing item data and helper components.
- Desktop/tablet keeps the current two-column layout.
- Move existing mobile content into tab sections:
  - Original: header, trust strip, warnings, repair panel, source body, action buttons.
  - Digest: digest or placeholder.
  - Ask: item-scoped Ask entry and quality warning.
  - Related: related rows or visible empty state.
  - Details: capture metadata, topics, tags, collections.
- Existing `TagEditor` and `CollectionEditor` may render only in Details.

### WP4 - Related Empty State

- Update `RelatedItems` or add a wrapper so no-related mobile tab shows visible empty copy.
- Keep desktop behavior minimal if needed, but mobile tab cannot be blank.

### WP5 - A3 Fixture And Evidence Scripts

- Seed temporary DB with full, related, weak, and no-related fixtures.
- Add copy scanner for forbidden Ask/item-detail claims.
- Add browser QA script, likely CDP-based like A2, with mobile screenshots and JSON reports.

## Expected Browser States

- `390x844-ask-empty-disabled`
- `390x844-ask-text-enabled`
- `390x844-ask-provider-error`
- `390x844-item-ask-scoped`
- `390x844-item-original-tab`
- `390x844-item-digest-tab`
- `390x844-item-ask-tab`
- `390x844-item-related-tab`
- `390x844-item-details-tab`
- `390x844-item-weak-original-tab`
- `390x844-item-related-empty-tab`
- `390x844-item-focus-mode`

## Validation Commands

```bash
node --import tsx scripts/ux-v2-check-android-a3-copy.ts
A3_RESET_DB=1 BRAIN_DB_PATH=/tmp/ai-memory-android-a3.sqlite node --import tsx scripts/ux-v2-seed-android-a3-ask-item-detail.ts
node --import tsx --test src/app/ask/ask-request.test.ts
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
```

Browser QA uses local preview:

```bash
PORT=3027 BRAIN_DB_PATH=/tmp/ai-memory-android-a3.sqlite DATABASE_PATH=/tmp/ai-memory-android-a3.sqlite AI_MEMORY_ADMIN_TOKEN=dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd AI_MEMORY_DISABLE_WORKERS=1 npm run dev -- --hostname 127.0.0.1 --port 3027
```

Then:

```bash
node --import tsx scripts/ux-v2-browser-android-a3-ask-item-detail.ts
```

## Completion Artifacts

- `UX_v2/execution/ANDROID_A3_ASK_ITEM_DETAIL_QA_<timestamp>.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>.md`
- Master tracker checkpoint row.
- Running-log draft/append request per codex running log skill.

## No-Go Conditions

- Browser report issue count > 0.
- Empty send is still click-enabled with only opacity.
- Related tab can be blank for no-related item.
- Details tab hides existing tag/collection controls.
- Any forbidden attachment/offline/media/high-quality copy appears.
- Static gates or full tests fail.
