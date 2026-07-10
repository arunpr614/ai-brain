# Implementation Plan v1: Android A4 Topic And Collection Mobile Parity

Created: 2026-06-16 12:24:00 IST
Status: Draft for adversarial review
Product source: `UX_v2/features/FEATURE_ANDROID_A4_TOPIC_COLLECTION_PRD_V2_2026-06-16_12-22-00_IST.md`

## Planned Changes

1. Update `/topics/[slug]` with mobile-safe padding, bottom-nav clearance, compact heading, full-width mobile Ask action, health badges, empty state panel, and row wrapping.
2. Update `/collections/[id]` with the same mobile-safe treatment, description handling, full-width mobile Ask action, health badges, empty state panel, and row excerpts.
3. Add `scripts/ux-v2-seed-android-a4-topic-collection.ts`.
4. Add `scripts/ux-v2-check-android-a4-copy.ts`.
5. Add `scripts/ux-v2-browser-android-a4-topic-collection.ts`.
6. Validate with seed, copy scan, browser report, static gates, full tests, and build.

## Fixtures

- Populated topic with one full-text item and one weak item.
- Empty topic persisted in the topics table with zero item attachments.
- Populated collection with the same full-text and weak items.
- Empty collection persisted in the collections table.

## Browser States

- `390x844-topic-populated`
- `390x844-topic-empty`
- `390x844-topic-ask-scope`
- `390x844-collection-populated`
- `390x844-collection-empty`
- `390x844-collection-ask-scope`

## Risks

- Browser clipped-control checks may produce false positives for scrollable content.
- Topic and collection pages duplicate row rendering; refactoring might widen scope.
- Existing route item rows may not include excerpts consistently.
