# Implementation Plan v2 - Web Capture, Settings, Pairing, Export, and Provider Health

**Created:** 2026-06-15 23:39:03 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Source PRD:** `UX_v2/features/FEATURE_WEB_CAPTURE_SETTINGS_PAIRING_EXPORT_PROVIDER_PRD_V2_2026-06-15_23-34-55_IST.md`
**Status:** Revised after adversarial review; approved for local execution.

## 1. Execution Principles

1. Preserve existing capture, provider, export, and pairing API contracts.
2. Prefer truthful disabling/hiding over fake roadmap functionality.
3. Never render raw bearer tokens on ordinary page load.
4. Run export QA only against temporary seeded databases.
5. Use deterministic browser evidence; do not rely on public website extraction or live provider availability.
6. Keep this web slice separate from Android execution and production deployment.
7. Use `<redacted:token>` or `<redacted:64-hex-test-token>` in documentation. Do not write token-shaped literals into Markdown or JSON evidence.

## 2. Code Changes

### 2.1 Device Pairing Token Safety

Files:

- `src/app/settings/device-pairing/page.tsx`
- `src/app/settings/device-pairing/actions-client.tsx`
- `src/lib/device-pairing/token-display.ts`
- `src/lib/device-pairing/token-display.test.ts`

Implementation:

1. Remove server-side `loadApiToken()` from the page render path.
2. Always render the authenticated pairing page; code generation failures surface inside `AndroidPairingCodeActions`.
3. Replace `DevicePairingActions token={token}` with `AdvancedTokenSetup`.
4. `AdvancedTokenSetup` behavior:
   - Collapsed by default.
   - Fetches `/api/settings/device-pairing` only after explicit "Show advanced token setup".
   - Stores token in client state only after fetch.
   - Displays masked token by default using a helper, never raw by default.
   - Offers copy without rendering the raw token.
   - Does not take reveal screenshots in QA. If a reveal control is present, validate helper behavior with synthetic unit tests only.
   - Keeps rotate-token behavior behind advanced setup.
5. Add a token display helper with tests:
   - Valid token masks to stable prefix/suffix format.
   - Short/missing token returns a safe placeholder.
   - Helper never returns the full token for normal display.

### 2.2 Settings Truthfulness

Files:

- `src/app/settings/page.tsx`
- `src/lib/settings/trust-copy.ts`

Implementation:

1. Rename "Backups" to "Internal snapshots".
2. Reword status labels to internal server snapshot language.
3. Add explicit non-claim copy: restore is not managed from Settings and must be verified before recovery reliance.
4. Keep privacy/offline controls disabled and informational.
5. Manual classify any forbidden-copy scan hits:
   - Allowed: negative copy such as "End-to-end encryption is not active yet."
   - Blocked: affirmative claims that offline cache/sync, QR pairing, connected devices, telemetry controls, storage charts, delete all data, or user-managed backup/restore exists.

### 2.3 Capture Deterministic States

Files:

- `src/app/capture/page.tsx`
- `src/app/capture/tabs.tsx`
- `src/app/capture/pdf-dropzone.tsx`
- `scripts/ux-v2-seed-capture-settings-pairing-export-provider.ts`

Implementation:

1. Keep capture code changes narrow. Do not redesign capture unless a concrete bug is found.
2. Ensure URL duplicate/error, note validation, and PDF error states remain product-facing and visible.
3. Add deterministic seed script with synthetic items:
   - Existing duplicate URL item.
   - Full-text URL item.
   - Weak metadata-only URL item.
   - Note item.
   - PDF item.
   - Two items that slugify to the same export filename.
4. Browser QA uses seeded item-detail `capture_state` query params for capture result banners where live extraction is not deterministic.
5. API/focused tests cover capture result payload contracts and PDF invalid/upload failure.

### 2.4 Manual Export Validation

Files:

- `src/app/api/library/export.zip/route.ts`
- `src/app/api/library/export.zip/route.test.setup.ts`
- `src/app/api/library/export.zip/route.test.ts`

Implementation:

1. Preserve export route runtime behavior unless a test exposes a bug.
2. Add `route.test.setup.ts` that sets `BRAIN_DB_PATH` to a temporary DB before importing the route under test.
3. Tests:
   - Unauthenticated request returns `401`.
   - Empty library export returns zip with `README.md`.
   - Synthetic mixed library export contains expected Markdown files and deduped filenames.
   - Headers include `application/zip`, dated filename prefix, and `no-store`.
   - Synthetic export contents pass token-like redaction scan.
4. Reports record only synthetic counts, filenames, and redaction status.

### 2.5 Provider Health Validation

Files:

- `src/lib/providers/status.ts`
- `src/lib/providers/status.test.ts`
- `src/app/api/settings/provider-status/route.test.ts`
- `src/app/settings/page.tsx`

Implementation:

1. Preserve provider status runtime behavior.
2. Add provider-status route test for unauthenticated `401` and no-store headers.
3. Use helper tests with `resetProviderStatusCache()` and injected probes for ok/unconfigured/unreachable/quota/invalid/unknown where route injection is not available.
4. Browser QA starts the dev server with forced unreachable local provider config before first Settings load.
5. Report provider state as local degraded/unreachable evidence only.

## 3. Focused Test Plan

Run the focused tests that exist after implementation:

```bash
node --import tsx --test \
  src/lib/device-pairing/token-display.test.ts \
  src/app/api/settings/device-pairing/route.test.ts \
  src/app/api/settings/device-pairing/exchange/route.test.ts \
  src/app/api/settings/provider-status/route.test.ts \
  src/app/api/library/export.zip/route.test.ts \
  src/lib/providers/status.test.ts \
  src/lib/capture/result.test.ts \
  src/app/api/capture/pdf/route.test.ts \
  src/app/api/capture/note/route.test.ts \
  src/app/api/capture/url/route.test.ts
```

Full gates:

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

Use a real token value only in the shell environment for local execution. Do not write that value into Markdown, JSON reports, screenshots, or logs.

Evidence directory:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/capture-settings-pairing-export-provider/`

Screenshots and checks:

| Route/state | Viewports | Required checks |
| --- | --- | --- |
| `/capture` URL tab | 390, 1280 | URL tab selected, prefilled URL, no overlap |
| `/capture?tab=pdf` | 390, 1280 | PDF-only copy, keyboard/touch-visible activation state |
| `/capture?tab=note` | 390, 1280 | Title/body validation and layout |
| Item detail capture banners | 1280 | created full text, duplicate/updated, weak/needs-upgrade route-state evidence |
| `/settings` | 390, 1280, 1440 dark | Internal snapshots copy, provider degraded state, manual export copy, no blocked copy |
| `/settings/device-pairing` initial | 390, 1280 | Code-entry UI, advanced token collapsed, no visible raw token |
| Pairing generated code | 1280 | Code generated, expiry visible, no QR/device-sync claim; do not transcribe active code into report |
| Pairing expired/regenerate | API/unit fallback required if browser wait is impractical | Existing exchange/code tests or helper tests verify expired mapping |
| Advanced token collapsed/masked | 1280 | Default page has no raw token; expanded state shows masked token only; do not screenshot raw reveal |
| Missing auth/API checks | API/static report | Export/provider/pairing 401s; no raw tokens in JSON |
| Final route sweep | 1280 | 0 fresh console warnings/errors |

PDF invalid/upload fallback:

- Browser verifies PDF tab layout and activation affordance.
- API tests verify invalid multipart, missing field, SHA mismatch, and invalid PDF extraction failure.

## 5. Safety Scans

Forbidden-copy scan:

```bash
rg -n "AI Brain|Offline Mode|read-only access to cached|cached items|stays on your devices|Your Android app is synced|Pixel 8 Pro|Last synced|scan QR|delete all data|automatic backups|restore-ready|clear cache|offline sync|telemetry|crash reporting|connected devices|provider metrics|storage chart" src/app src/components src/lib/settings
```

Manual classification required:

- Negative/disabled copy about unavailable privacy/offline capabilities can pass.
- Affirmative claims that those capabilities exist are no-go.

Token safety scan:

```bash
rg -n "[A-Fa-f0-9]{64}|Bearer " UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/capture-settings-pairing-export-provider UX_v2/project_management UX_v2/execution/*.md
```

For `UX_v2/features`, scan only artifacts created after this plan v2 and classify any hit manually because older review artifacts may include redacted-placeholder discussion. Any unredacted token-like value in QA evidence or reports is no-go.

## 6. QA Report and Tracker Outputs

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
- PM helper checkpoint summary.
- Release caveats.

## 7. No-Go Gates

Execution cannot be marked complete if:

- A raw bearer token is visible on ordinary device-pairing page load.
- Browser/JSON/Markdown QA reports contain an unredacted real token.
- Export validation touches real private data.
- Export tests import the route before setting a temp `BRAIN_DB_PATH`.
- Provider state evidence relies on stale cached status.
- Capture success evidence depends on public website availability.
- Settings implies QR, synced devices, offline cache/sync, active E2EE, telemetry controls, storage charts, delete-all-data, automatic backup/restore, or restore readiness.
- Browser-only states are skipped without API/unit fallback evidence.
- Static gates fail without an explicit no-go report.
- Browser console sweep has fresh warnings/errors on this slice's routes.

## 8. Rollback Plan

- Token UI changes can be reverted by restoring the previous `DevicePairingActions` flow, but release remains blocked if raw tokens are visible.
- Settings copy changes are display-only and can be reverted independently.
- Seed scripts/tests are additive and can be removed without affecting production runtime.
- No database schema changes are planned.

## 9. Execution Order

1. Add token display helper and focused tests.
2. Add export route test setup/tests.
3. Add provider-status route/helper tests.
4. Update device pairing page/client for token-safe advanced setup.
5. Update settings internal snapshot copy.
6. Add deterministic seed script.
7. Run focused tests and static gates.
8. Run browser QA and visual spot-checks.
9. Create QA/tracker/running-log outputs.
