# Implementation Plan v2: Android A4 Topic And Collection Mobile Parity

Created: 2026-06-16 12:28:00 IST
Status: Revised execution source after adversarial review
Product source: `UX_v2/features/FEATURE_ANDROID_A4_TOPIC_COLLECTION_PRD_V2_2026-06-16_12-22-00_IST.md`

## Execution Scope

Implement local browser-mobile parity for:

- `/topics/[slug]`
- `/collections/[id]`
- `/ask?scope=topic&topic=<slug>`
- `/ask?scope=collection&collection=<id>`

Do not implement Topic create-tag, Collection add-items, offline-read, offline-sync, QR pairing, biometric unlock, telemetry, E2EE, destructive data controls, embedded media players, fake device/account copy, or stale AI Brain/Your Brain copy.

## Code Changes

1. Update `src/app/topics/[slug]/page.tsx`.
   - Use mobile-first spacing: `px-5 pb-28 pt-8 md:px-8 md:py-10`.
   - Make the Ask topic action full-width on mobile and compact on desktop.
   - Render a clear derived-topic label, source count, scope health, description, and empty state.
   - Keep item rows wrapping safely with icon, title, platform, quality, relative time, and excerpt.
2. Update `src/app/collections/[id]/page.tsx`.
   - Use the same mobile-first spacing and bottom-nav clearance.
   - Make the Ask collection action full-width on mobile and compact on desktop.
   - Render collection name, description, kind badge, item count, scope health, empty state, and item rows.
   - Add row excerpts for parity with Topic rows.
3. Avoid shared cross-route abstractions unless needed; keep edits local and symmetric.

## Scripts

1. Add `scripts/ux-v2-seed-android-a4-topic-collection.ts`.
   - Guard `BRAIN_DB_PATH`.
   - Support `A4_RESET_DB=1` only for `/tmp/`.
   - Seed full-text and weak items.
   - Create populated topic, empty topic, populated collection, and empty collection.
   - Print manifest with routes and fixture ids.
2. Add `scripts/ux-v2-check-android-a4-copy.ts`.
   - Scan Topic, Collection, Ask page, and scope helper targets.
   - Fail on create tag, add items, sheet, offline-read/offline-sync, QR, biometric, telemetry, E2EE, delete-all-data, AI Brain, Your Brain, fake device/account, and embedded-player copy.
3. Add `scripts/ux-v2-browser-android-a4-topic-collection.ts`.
   - Use CDP mobile viewport `390x844`.
   - Save screenshots and JSON report under `android-a4-topic-collection`.
   - Capture six states:
     - `390x844-topic-populated`
     - `390x844-topic-empty`
     - `390x844-topic-ask-scope`
     - `390x844-collection-populated`
     - `390x844-collection-empty`
     - `390x844-collection-ask-scope`

## Browser Assertions

For every state:

- No horizontal overflow.
- No forbidden copy.
- No missing expected text.
- No clipped non-fixed controls at the bottom viewport edge.

For Topic and Collection route states:

- Visible controls must not include add/create/sheet/plus mutation controls, except approved back links, item row links, and scoped Ask links.

For scoped Ask states:

- Topic Ask asserts `TOPIC`, `the A4 Mobile QA Topic topic`, source count, and `A4 topic collection full source`.
- Collection Ask asserts `COLLECTION`, `the A4 Mobile QA Collection collection`, source count, and `A4 topic collection full source`.

## Validation

Required before local completion claim:

1. `node --import tsx scripts/ux-v2-check-android-a4-copy.ts`
2. `A4_RESET_DB=1 BRAIN_DB_PATH=/tmp/ai-memory-android-a4-topic-collection.sqlite node --import tsx scripts/ux-v2-seed-android-a4-topic-collection.ts`
3. CDP browser report: issue count 0.
4. `git diff --check`
5. `npm run typecheck`
6. `npm run lint`
7. `npm test`
8. `npm run build`

## Completion Wording

Android A4 Topic and Collection completed locally with browser evidence; APK evidence and production release still pending.
