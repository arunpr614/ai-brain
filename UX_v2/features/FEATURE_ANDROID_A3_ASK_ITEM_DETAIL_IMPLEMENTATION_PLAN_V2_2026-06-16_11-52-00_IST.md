# Implementation Plan V2 - Android A3 Ask Composer And Item Detail

Created: 2026-06-16 11:52:00 IST
Owner: Codex
Supersedes: `FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_IMPLEMENTATION_PLAN_V1_2026-06-16_11-48-00_IST.md`
Adversarial review: `FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_11-50-00_IST.md`
Product source: `FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_PRD_V2_2026-06-16_11-46-00_IST.md`

## Execution Status

Approved for local execution after v2 revision. Completion remains local/browser-mobile only.

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
- Focused tests for Ask input/request and item-detail helper behavior where practical.

## Guardrails

- Do not add production-reachable fake Ask/error states.
- Do not change `/api/ask` behavior.
- Do not add paste-link/write-note/file attachment controls.
- Do not add high-quality-only retrieval controls.
- Do not add embedded media/player UI.
- Preserve item-detail capture result, repair queued, highlighted citation, and focus-mode behavior.
- Keep existing TagEditor and CollectionEditor semantics; move/reuse only, do not add new mutation behavior.

## Work Packages

### WP1 - Ask Composer Mobile Safety

- Update `AskInput`:
  - empty textarea send button has `disabled` and `aria-disabled`;
  - button becomes enabled when trimmed text exists;
  - submit still reads live DOM value after Android IME blur;
  - busy Stop button behavior remains unchanged.
- Add focused test coverage if component test infrastructure exists; otherwise prove in browser report with DOM metrics.

### WP2 - Provider-Error Browser Proof

- Do not add app code fake state.
- Implement provider-error evidence in `scripts/ux-v2-browser-android-a3-ask-item-detail.ts` by CDP request interception:
  - enable Fetch/Network in CDP;
  - intercept `/api/ask`;
  - fulfill with an error/stream shape that makes current `useAskStream` render `LLM_PROVIDER_OFFLINE`;
  - capture visible mobile error card.
- If CDP interception cannot fulfill streams reliably, create a narrowly scoped script-only browser DOM check against an existing rendered error helper only after extracting a pure exported copy function. Do not ship a user-facing route/query fake state.

### WP3 - Deterministic Fixture Seed

- Seed only temporary DB paths and require `BRAIN_DB_PATH`.
- Use dynamic app imports only after env validation.
- If `A3_RESET_DB=1`, allow deletion only for `/tmp/`.
- Insert:
  - full item with summary/category/quotes/source metadata;
  - related item with similar text;
  - weak item with limited quality;
  - no-related item with no chunks;
  - manual tag and collection on full item;
  - included topic on full item.
- Deterministic related rows:
  - use `insertChunkWithRowid` for full and related item chunks;
  - insert known unit-normalized `Float32Array` embeddings into `chunks_vec`;
  - verify `findRelatedItems(full.id)` returns the related item before printing the manifest.
- Manifest must include item ids, routes, related count, repair/weak route, and browser expected text.

### WP4 - Item Detail Mobile Tabs

- Keep capture-result, repair-result, and highlighted-citation banners above the tabbed content.
- Desktop/tablet keeps existing two-column layout.
- Mobile-only tab controls:
  - Original: current header/trust/warnings/repair/source body/footer actions.
  - Digest: category, summary, key quotes, placeholder when missing.
  - Ask: item-scoped Ask entry, quality warning if weak, link to `/items/[id]/ask`.
  - Related: existing related rows if present; visible empty state if none.
  - Details: capture metadata, included topics, tags, collections.
- Prefer small helper components/functions inside `src/app/items/[id]/page.tsx`; avoid unrelated refactors.

### WP5 - Related Empty State

- Update `RelatedItems` to support `emptyState` or add a local related panel helper.
- Existing desktop sidebar can remain hidden when no related items exist.
- Mobile Related tab must show visible empty copy.

### WP6 - Copy Scanner And Browser QA

- A3 copy scanner targets:
  - `src/app/ask/page.tsx`
  - `src/app/ask/ask-client.tsx`
  - `src/components/ask-input.tsx`
  - `src/app/items/[id]/ask/page.tsx`
  - `src/app/items/[id]/page.tsx`
  - `src/components/related-items.tsx`
- Forbidden patterns include paste link, write note, attach file, high-quality only, saved scope history, offline queue/read/sync, embedded player, AI Brain, Your Brain, biometric, QR, telemetry, E2EE, delete all data.

Browser states:

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

Browser setup:

```bash
PORT=3027 BRAIN_DB_PATH=/tmp/ai-memory-android-a3.sqlite DATABASE_PATH=/tmp/ai-memory-android-a3.sqlite AI_MEMORY_ADMIN_TOKEN=dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd AI_MEMORY_DISABLE_WORKERS=1 npm run dev -- --hostname 127.0.0.1 --port 3027
open -na "Google Chrome" --args --remote-debugging-port=9333 --user-data-dir=/tmp/ai-brain-a3-chrome --window-size=390,844 --new-window http://127.0.0.1:3027/ask
node --import tsx scripts/ux-v2-browser-android-a3-ask-item-detail.ts
lsof -nP -iTCP:3027 -sTCP:LISTEN
lsof -nP -iTCP:9333 -sTCP:LISTEN
```

Stop preview and ensure both ports are clear before milestone close.

## Completion Artifacts

- `UX_v2/execution/ANDROID_A3_ASK_ITEM_DETAIL_QA_<timestamp>.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>.md`
- Master tracker checkpoint row.
- Running-log draft/append request per codex running log skill.

## No-Go Conditions

- Browser report issue count > 0.
- Empty send is enabled or silently clickable.
- Related fixture does not prove at least one related row before browser QA.
- Provider-error proof requires production-reachable fake UI.
- Mobile Related tab can be blank.
- Details tab hides existing tag/collection controls.
- Any forbidden attachment/offline/media/high-quality copy appears.
- Static gates or full tests fail.
