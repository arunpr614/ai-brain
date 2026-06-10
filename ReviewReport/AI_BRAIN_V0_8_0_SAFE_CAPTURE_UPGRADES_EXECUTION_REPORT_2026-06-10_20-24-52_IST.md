# AI Brain v0.8.0 Safe Capture Upgrades Execution Report

**Created:** 2026-06-10 20:24:52 IST
**Branch:** `codex/v0.8.0-safe-capture-upgrades`
**Worktree:** `/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades`
**Plan executed:** `docs/plans/v0.8.0-safe-capture-upgrades-implementation-plan-2026-06-10_17-55-32_IST.md`

---

## Executive Outcome

The safe capture upgrade foundation is implemented and locally verified.

Weak YouTube, YouTube Shorts, and LinkedIn captures can now be upgraded with pasted user text without creating duplicate items. The upgrade operation resets stale enrichment/search/RAG-derived state, preserves previous weak content as an artifact, and keeps strong captures protected from accidental overwrite.

---

## Implemented

### Shared Upgrade Policy

- Added a shared upgrade decision helper:
  - `src/lib/capture/upgrade-policy.ts`
- Centralized:
  - weak capture detection
  - needs-upgrade Library classification
  - full-text classification
  - strong-capture overwrite protection
  - too-short pasted-text rejection

### User-Provided Text Handling

- Added reusable pasted-text normalization:
  - `src/lib/capture/user-provided.ts`
- Preserves:
  - paragraph breaks
  - bullets
  - timestamp lines
  - secondary URLs
- Removes only:
  - the raw source URL
  - the canonical source URL and safe variants
- Enforces:
  - 8+ meaningful words
  - 100,000 character max
- Adds provenance header:
  - `Capture quality: user_provided_full_text`
  - `Provided by: user paste`

### YouTube Pasted Text Builder

- Added:
  - `src/lib/capture/youtube-user-text.ts`
- YouTube/Shorts link plus pasted text now creates or upgrades with:
  - `capture_quality = user_provided_full_text`
  - `extraction_method = youtube_user_provided_text`
  - preserved metadata from existing weak items
  - no dependency on transcript extraction when meaningful user text exists

### Safe Upgrade Transaction

- Added:
  - `src/db/item-upgrades.ts`
- Upgrade now resets stale derived state:
  - clears `summary`
  - clears `quotes`
  - clears `category`
  - clears `enriched_at`
  - sets `enrichment_state = pending`
  - clears `batch_id`
  - resets/re-arms `enrichment_jobs`
  - removes old auto-tags
  - deletes old chunks
  - deletes old vector rows
  - deletes old embedding jobs
- Saves pre-upgrade weak content as `pre_upgrade_item_json`.

### API Integration

- Updated:
  - `src/app/api/capture/url/route.ts`
- API now:
  - bypasses short-window URL dedup when meaningful pasted text is present
  - upgrades existing weak captures instead of duplicating
  - rejects too-short upgrade text without overwriting
  - refuses to overwrite strong captures
  - returns explicit `action` values

### Telegram Integration

- Updated:
  - `src/lib/telegram/dispatch.ts`
- Telegram now:
  - uses the shared upgrade policy
  - uses the safe upgrade helper
  - supports YouTube/Shorts pasted-text upgrades
  - preserves LinkedIn pasted-text upgrade behavior
  - sends clearer metadata-only instructions
  - sends explicit successful-upgrade acknowledgement copy

### Web Item Upgrade Action

- Added:
  - `src/app/items/[id]/upgrade-actions.ts`
  - `src/app/items/[id]/upgrade-text-form.tsx`
- Updated:
  - `src/app/items/[id]/page.tsx`
- Eligible weak captures now show a real `Transcript or notes` textarea and `Add text` action.

### Library Filter

- Updated:
  - `src/components/library-list.tsx`
- Added compact filters:
  - `All`
  - `Needs upgrade`
  - `Full text`
  - `Metadata only`

### Substack Validation

- Existing Substack tests were retained and run.
- No `long_preview` quality was introduced.
- Current classifier still covers:
  - public full text
  - paid/paywalled preview

---

## Validation

### Passed

- `npm run typecheck`
- `npm test`
  - 452 tests passed
- Focused capture upgrade suite
  - 40 tests passed
- `npm run lint`
  - passed with 2 unrelated pre-existing warnings
- `npm run build`
  - passed with existing `unpdf` warning
- `npm run check:build-artifacts`
  - passed

### UI Smoke

Started local dev server with disposable sample data:

```text
http://127.0.0.1:3310
```

Verified by authenticated local HTML fetch:

- Library renders filter controls.
- `Needs upgrade` count includes weak YouTube and LinkedIn samples.
- `Full text` count includes strong YouTube sample.
- Weak YouTube item detail renders `Transcript or notes` form.
- Strong YouTube item detail does not render the upgrade form.

---

## Known Warnings

- `npm run lint` reports two pre-existing warnings:
  - `src/lib/client/register-sw.ts`
  - `src/lib/queue/enrichment-batch-cron.ts`
- `npm run build` reports an existing `unpdf` `import.meta` warning.

No new warning class was introduced by this implementation.

---

## Production Readiness Notes

Before production deploy:

1. Create a production DB backup.
2. Run a production-safe smoke using real Telegram/API credentials.
3. Confirm YouTube URL-only still saves metadata-only when transcript extraction is blocked.
4. Confirm same YouTube link plus pasted text upgrades that exact item.
5. Confirm same LinkedIn link plus pasted text still upgrades.
6. Confirm smoke cleanup removes test rows and artifacts.

---

## Residual Risk

- The web form was locally render-verified, but not browser-click verified with a real submitted server action in a browser session.
- Production smoke is still required because Telegram webhook behavior depends on deployed credentials, webhook routing, and production database state.
- YouTube metadata for brand-new pasted-text captures uses the existing Data API path when configured; without metadata, the fallback title is intentionally generic.

---

## Recommendation

This branch is ready for code review and pre-deploy production smoke planning. Do not deploy directly to production until a fresh production DB backup exists and a smoke cleanup plan is ready.
