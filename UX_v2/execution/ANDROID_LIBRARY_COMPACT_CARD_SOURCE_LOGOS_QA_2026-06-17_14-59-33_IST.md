# Android Library Compact Card + Source Logos QA

Created: 2026-06-17 14:59:33 IST
Status: Passed local web/mobile QA. Production deploy and APK runtime validation are tracked separately.

## Scope

This report validates the compact Android/mobile Library card implementation and local source-logo treatment created from:

- `UX_v2/features/FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_PRD_V2_2026-06-17_14-26-30_IST.md`
- `UX_v2/features/FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_IMPLEMENTATION_PLAN_V2_2026-06-17_14-29-30_IST.md`
- `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md`

## Evidence

Machine-readable report:

- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-library-compact-light-first-2026-06-17_14-59-33_IST/mobile-browser-qa-report.json`

Screenshots:

- `library-mobile-initial.png`
- `library-mobile-selected-two.png`
- `ask-selected-route.png`
- `item-detail-from-card.png`

## Results

| Check | Result |
| --- | --- |
| 390px mobile card branch visible | Passed: all 9 Library cards reported `mobileDisplay=block` and `desktopDisplay=none`. |
| Title clamp | Passed: long YouTube/title stress fixtures measured two-line titles (`titleHeight=41`). |
| Metadata cap | Passed after adjustment: long YouTube metadata measured 48px and no longer clips the `enrichment failed` pill. |
| Source identity | Passed: Article, YouTube, LinkedIn, Substack, Note, PDF, and fallback-style rows render local icons plus readable labels. |
| Source logo network hygiene | Passed: scan found no remote/CDN/image fetches in `source-logo` or Library list code. |
| Duplicate metadata warning suppression | Passed by visual/DOM check: YouTube metadata-only rows do not repeat a redundant metadata-only warning in the mobile row. |
| Selection | Passed: one visible selected checkbox after first click; two visible selected checkboxes after second click. |
| BulkBar | Passed: `2 selected` BulkBar is visible and Ask selected navigates to `/ask?scope=selected&ids=...`. |
| Card tap navigation | Passed: first card opens `/items/ce18127903df3751552ba933`. |
| Desktop protection | Passed: protected Library/search/filter/sidebar files have no diff. |

## Commands

| Command | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed: 571 tests, 79 suites, 571 pass, 0 fail |
| `npm run build` | Passed with existing `unpdf` import warning |
| `git diff --check` | Passed |
| `rg -n "^(<<<<<<<\|=======\|>>>>>>>)" src public android UX_v2/features UX_v2/execution/project_management UX_v2/execution/qa UX_v2/execution/architecture` | Passed |

## Notes

- The mobile and desktop branches intentionally both exist in the DOM; selection state controls both checkbox inputs for the same item. QA therefore used visible checked boxes for user-facing selection counts.
- The APK is a thin WebView that loads `https://brain.arunp.in`; Android production runtime proof requires a web deploy containing this change, then APK/WebView validation.
