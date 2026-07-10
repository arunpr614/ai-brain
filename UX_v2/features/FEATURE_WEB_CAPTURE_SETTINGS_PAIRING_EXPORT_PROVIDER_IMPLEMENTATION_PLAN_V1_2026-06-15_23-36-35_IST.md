# Implementation Plan v1 - Web Capture, Settings, Pairing, Export, and Provider Health

**Created:** 2026-06-15 23:36:35 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Source PRD:** `UX_v2/features/FEATURE_WEB_CAPTURE_SETTINGS_PAIRING_EXPORT_PROVIDER_PRD_V2_2026-06-15_23-34-55_IST.md`
**Status:** Draft for adversarial review. Do not execute until plan v2 exists.

## 1. Execution Principles

1. Preserve existing capture, provider, export, and pairing API contracts.
2. Prefer truthful disabling/hiding over fake roadmap functionality.
3. Never render raw bearer tokens on ordinary page load.
4. Run export QA only against temporary seeded databases.
5. Use deterministic browser evidence; do not rely on public website extraction or live provider availability.
6. Keep this web slice separate from Android execution and production deployment.

## 2. Proposed Code Changes

### 2.1 Device Pairing Token Safety

Files:

- `src/app/settings/device-pairing/page.tsx`
- `src/app/settings/device-pairing/actions-client.tsx`
- `src/lib/device-pairing/token-display.ts` (new, if useful)
- `src/lib/device-pairing/token-display.test.ts` (new, if useful)

Changes:

1. Remove server-side `loadApiToken()` from the page render path.
2. Always render code-entry pairing page when authenticated; let the Android code component show `token_not_configured` if POST fails.
3. Replace the always-visible `DevicePairingActions token={token}` UI with an `AdvancedTokenSetup` component that:
   - Is collapsed by default.
   - Fetches `/api/settings/device-pairing` only after an explicit reveal/copy action.
   - Displays a masked token by default, e.g. first 6 and last 4 characters only.
   - Offers a deliberate "Reveal token" control only after the user has expanded advanced setup.
   - Records no token in default screenshots.
4. Keep rotate-token behavior, but ensure any error copy is product-safe and no raw token appears.
5. Add source/DOM QA checks that ordinary page load does not contain a 64-character token in visible text.

### 2.2 Settings Truthfulness

Files:

- `src/app/settings/page.tsx`
- `src/lib/settings/trust-copy.ts`

Changes:

1. Rename the visible "Backups" section to "Internal snapshots".
2. Recast status copy so it does not imply user-managed backup/restore.
3. Add explicit copy: restore is not managed from this screen and must be verified before relying on recovery.
4. Keep privacy/offline controls disabled/informational.
5. Ensure no forbidden copy appears in Settings: QR, synced devices, offline cache, E2EE as active, telemetry, storage chart, delete all data, automatic backup/restore readiness.

### 2.3 Capture UX and Deterministic States

Files:

- `src/app/capture/page.tsx`
- `src/app/capture/tabs.tsx`
- `src/app/capture/pdf-dropzone.tsx`
- `scripts/ux-v2-seed-capture-settings-pairing-export-provider.ts` (new)

Changes:

1. Keep URL/PDF/note tabs, but improve state clarity where needed:
   - URL duplicate state remains visible with Open existing and Save again anyway.
   - URL error copy remains visible and product-facing.
   - Note validation remains visible.
   - PDF invalid-type and upload errors remain visible.
2. Add deterministic seed script that creates synthetic items for:
   - Existing duplicate URL.
   - Full-text URL item.
   - Weak metadata-only URL item.
   - Note item.
   - PDF item.
   - Long-title item for export filename dedupe.
3. Browser QA will use seeded item-detail route states for success/weak/failure banners where real extraction is not deterministic.
4. Do not introduce demo-only result cycling.

### 2.4 Manual Export Validation

Files:

- `src/app/api/library/export.zip/route.ts`
- `src/app/api/library/export.zip/route.test.ts` (new or extended)
- `scripts/ux-v2-seed-capture-settings-pairing-export-provider.ts`

Changes:

1. Preserve export route behavior.
2. Add tests for:
   - Unauthenticated `401`.
   - Empty library zip contains `README.md`.
   - Synthetic mixed library zip contains expected Markdown files and deduped filenames.
   - Response headers include `application/zip`, dated filename, and no-store.
3. In QA reports, record only counts, synthetic filenames, and redaction scan results.

### 2.5 Provider Health Validation

Files:

- `src/lib/providers/status.ts`
- `src/lib/providers/status.test.ts`
- `src/app/api/settings/provider-status/route.test.ts` (new if missing)
- `src/app/settings/page.tsx`

Changes:

1. Preserve provider status implementation.
2. Add API route tests for unauthenticated 401 and authenticated no-store response using dependency/test seam if practical.
3. Add or extend tests for UI/status label mapping if current `ProviderStatusRow` is extractable; otherwise cover classifier and API and browser degraded state.
4. Browser QA starts the dev server with forced unreachable local provider state before first Settings load to avoid cached ok status.
5. Report provider state as local/degraded, not a live provider quality claim.

## 3. Test Plan

Focused tests:

```bash
node --import tsx --test \
  src/lib/device-pairing/token-display.test.ts \
  src/app/api/settings/device-pairing/route.test.ts \
  src/app/api/settings/device-pairing/exchange/route.test.ts \
  src/app/api/settings/provider-status/route.test.ts \
  src/app/api/library/export.zip/route.test.ts \
  src/lib/providers/status.test.ts \
  src/lib/capture/result.test.ts
```

Full static gates:

```bash
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
```

Known warning tolerance:

- Existing unrelated lint warning in `src/lib/queue/enrichment-batch-cron.ts`.
- Existing `unpdf` import.meta build warning.

## 4. Browser QA Plan

Temporary DB:

- `/tmp/ai-memory-capture-settings-qa.sqlite`
- Seed only synthetic data.

Dev server:

```bash
BRAIN_DB_PATH=/tmp/ai-memory-capture-settings-qa.sqlite \
BRAIN_API_TOKEN=<redacted:64-hex-test-token> \
OLLAMA_HOST=http://127.0.0.1:1 \
npm run dev
```

Evidence directory:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/capture-settings-pairing-export-provider/`

Screenshots and checks:

| Route/state | Viewports | Required checks |
| --- | --- | --- |
| `/capture` URL tab | 390, 1280 | URL tab selected, prefilled URL, no overlap |
| `/capture?tab=pdf` | 390, 1280 | PDF-only copy, keyboard/touch visible activation state, invalid-file error if feasible |
| `/capture?tab=note` | 390, 1280 | Title/body validation and layout |
| Item detail capture banners | 1280 | created full text, duplicate/updated, weak/needs-upgrade route-state evidence |
| `/settings` | 390, 1280, 1440 dark | Internal snapshots copy, provider degraded state, manual export copy, no forbidden copy |
| `/settings/device-pairing` initial | 390, 1280 | Code-entry UI, advanced token collapsed, no visible raw token |
| Pairing generated code | 1280 | Code generated, expiry visible, no QR/device-sync claim |
| Pairing expired/regenerate | 1280 | Expired state or deterministic simulated elapsed state if possible |
| Advanced token collapsed/reveal | 1280 | Default page has no raw token; if reveal is tested, screenshot must be redacted or skipped |
| Missing auth/API checks | API/static report | Export/provider/pairing 401s; no raw tokens in JSON |
| Final route sweep | 1280 | 0 fresh console warnings/errors |

Forbidden-copy scan:

```bash
rg -n "AI Brain|Offline Mode|read-only access to cached|cached items|stays on your devices|Your Android app is synced|Pixel 8 Pro|Last synced|scan QR|E2EE|end-to-end|delete all data|automatic backups|restore-ready|clear cache|offline sync|telemetry|crash reporting|connected devices|provider metrics|storage chart" src/app src/components src/lib/settings
```

Token safety scan:

```bash
rg -n "[A-Fa-f0-9]{64}|Bearer " UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/capture-settings-pairing-export-provider UX_v2/features UX_v2/project_management UX_v2/execution/*.md
```

Any real token-looking hit in reports is a no-go unless it is a deliberately redacted placeholder in code/test fixture text.

## 5. QA Report and Tracker Outputs

Create after execution:

- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_CAPTURE_SETTINGS_PAIRING_EXPORT_PROVIDER_QA_<timestamp>_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>_IST.md`
- Append-only entries in `RUNNING_LOG.md` and `UX_v2/RUNNING_LOG.md`

The QA report must include:

- PRD/plan cycle evidence.
- Code changes.
- Static validation results.
- Browser evidence paths.
- Export validation summary from synthetic DB only.
- Provider degraded-state caveat.
- Pairing token-safety proof.
- Release caveats.

## 6. No-Go Gates

Execution cannot be marked complete if:

- A raw bearer token is visible on ordinary device-pairing page load.
- Browser/JSON/Markdown QA reports contain an unredacted real token.
- Export validation touches real private data.
- Provider state evidence relies on stale cached status.
- Capture success evidence depends on public website availability.
- Settings implies QR, synced devices, offline cache/sync, active E2EE, telemetry controls, storage charts, delete-all-data, automatic backup/restore, or restore readiness.
- Static gates fail without an explicit no-go report.
- Browser console sweep has fresh warnings/errors on this slice's routes.

## 7. Rollback Plan

- Token UI changes can be reverted by restoring the previous `DevicePairingActions` flow, but release must remain blocked if raw tokens are visible.
- Settings copy changes are display-only and can be reverted independently.
- Seed scripts/tests are additive and can be removed without affecting production runtime.
- No database schema changes are planned.

## 8. Execution Order

1. Add/adjust tests and helper code for token display, export, provider status, and capture result fixtures.
2. Update device pairing UI to avoid raw-token default render.
3. Update settings snapshot/backup copy and any provider/export labels needed.
4. Add deterministic seed script.
5. Run focused tests and static gates.
6. Run browser QA and visual spot-checks.
7. Create QA/tracker/running-log outputs.
