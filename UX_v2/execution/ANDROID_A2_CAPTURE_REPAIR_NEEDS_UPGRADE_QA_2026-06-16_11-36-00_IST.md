# Android A2 Capture / Repair / Needs Upgrade QA

Created: 2026-06-16 11:36:00 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: Android A2 capture/repair/needs-upgrade completed locally with browser evidence; APK evidence and production release still pending.

## Feature Cycle

| Artifact | Status |
| --- | --- |
| `UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_PRD_V1_2026-06-16_11-00-00_IST.md` | Created |
| `UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_PRD_ADVERSARIAL_REVIEW_2026-06-16_11-02-00_IST.md` | No-go review completed |
| `UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_PRD_V2_2026-06-16_11-04-00_IST.md` | Revised product source |
| `UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_V1_2026-06-16_11-06-00_IST.md` | Created |
| `UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_11-08-00_IST.md` | No-go review completed |
| `UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_V2_2026-06-16_11-10-00_IST.md` | Revised execution source |

## Implementation Summary

- Updated Capture mobile layout for URL, PDF, and Note tabs with larger touch targets, safer mobile spacing, and `/library` cancel/back routing.
- Added immediate existing-URL duplicate rendering when `/capture?url=...` already matches a saved source, plus a pre-extraction duplicate guard in the URL server action.
- Kept duplicate actions scoped to `Open existing` and `Save again anyway`; no merge/keep-both controls are present.
- Added Android-tolerant PDF file validation that accepts `.pdf` files when the picker omits MIME type and rejects non-PDF selections before upload.
- Grouped Needs Upgrade rows by reason, added mobile-safe row wrapping and action layout, and validated both queue and empty states.
- Updated Repair mobile layout and validated real repair submission through the browser, including redirect and data-state proof.
- Added A2 seed, copy-scan, repair-success, and CDP browser evidence scripts.

## Browser Evidence

Evidence folder:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/android-a2-capture-repair-needs-upgrade/`

Reports:

`android-a2-capture-repair-needs-upgrade-queue-browser-report.json`
`android-a2-capture-repair-needs-upgrade-empty-browser-report.json`

Final browser report summary:

| Report | States checked | Issue count |
| --- | ---: | ---: |
| Queue fixture | 9 | 0 |
| Empty fixture | 1 | 0 |

States covered:

- `390x844-capture-url-duplicate-result`
- `390x844-capture-pdf-initial`
- `390x844-capture-pdf-invalid-file`
- `390x844-capture-note-initial`
- `390x844-capture-note-saved-item`
- `390x844-needs-upgrade-queue`
- `390x844-repair-form`
- `390x844-repair-saved-item`
- `390x844-needs-upgrade-after-repair`
- `390x844-needs-upgrade-empty`

Browser assertions:

- Existing URL duplicate state rendered with `Open existing` and `Save again anyway`.
- PDF tab rendered mobile-safe dropzone copy and rejected a non-PDF file selection.
- Note capture saved through the real form and redirected to the saved item page.
- Needs Upgrade grouped queue showed transcript, preview, and extraction-failed groups.
- Repair form submitted real repaired text and redirected to the item page.
- Needs Upgrade after repair no longer showed the repaired item.
- Empty Needs Upgrade state showed `No captures need attention.`
- No horizontal overflow or forbidden A2 copy was detected in captured states.

## Validation

| Gate | Result |
| --- | --- |
| `node --import tsx scripts/ux-v2-check-android-a2-copy.ts` | Passed: issue count 0 |
| `A2_RESET_DB=1 A2_SCENARIO=queue BRAIN_DB_PATH=/tmp/ai-memory-android-a2-queue.sqlite node --import tsx scripts/ux-v2-seed-android-a2-capture-repair-needs-upgrade.ts` | Passed; queue fixture seeded |
| `A2_RESET_DB=1 A2_SCENARIO=empty BRAIN_DB_PATH=/tmp/ai-memory-android-a2-empty.sqlite node --import tsx scripts/ux-v2-seed-android-a2-capture-repair-needs-upgrade.ts` | Passed; empty fixture seeded |
| `node --import tsx --test src/app/capture/pdf-file-validation.test.ts src/lib/repair/item-repair.test.ts` | Passed: 5 tests |
| `BRAIN_DB_PATH=/tmp/ai-memory-android-a2-queue.sqlite A2_REPAIR_ITEM_ID=0713d164f8fee5a2e2728cb3 A2_REPAIR_TEXT=... node --import tsx scripts/ux-v2-check-android-a2-repair-success.ts` | Passed: issue count 0 |
| Queue browser report | Passed: 9 states, issue count 0 |
| Empty browser report | Passed: 1 state, issue count 0 |
| `git diff --check` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with existing unrelated warning in `src/lib/queue/enrichment-batch-cron.ts` |
| `npm test` | Passed: 549 tests, 77 suites |
| `npm run build` | Passed with known `unpdf` warning |

## QA Notes

- Browser evidence used temporary SQLite databases at `/tmp/ai-memory-android-a2-queue.sqlite` and `/tmp/ai-memory-android-a2-empty.sqlite`.
- Browser capture used a separate temporary Chrome profile at `/tmp/ai-brain-a2-chrome` and Chrome DevTools Protocol because the bundled Playwright browser was not installed.
- Local Next.js preview still starts backup/enrichment schedulers even with `AI_MEMORY_DISABLE_WORKERS=1`; the preview was stopped after evidence capture.
- APK/device evidence remains pending; this A2 milestone only claims local browser-mobile completion.

## Release Status

- Android A2 capture/repair/needs-upgrade is complete locally with browser evidence.
- APK/device evidence is still pending.
- Production deployment is still pending.
- Broader Android revised-plan execution remains open for later feature slices.
