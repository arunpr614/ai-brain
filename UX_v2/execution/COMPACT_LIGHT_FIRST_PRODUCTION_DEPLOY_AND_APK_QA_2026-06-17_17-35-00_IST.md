# Compact Card + Light-First Production Deploy And APK QA

Created: 2026-06-17 17:35 IST
Owner: Main implementation agent with PM/architecture/QA sub-agent outputs
Status: PASS for production web deployment and fresh private debug APK validation

## Scope

This report closes the requested execution of:

- Android Library compact card + source-logo treatment.
- Web/Android Light-first theme behavior with explicit Dark support.
- Production deployment to `https://brain.arunp.in`.
- Fresh private Android debug APK build and emulator WebView validation.

Public/store Android distribution remains out of scope and still requires a separate owner-approved release/signing/distribution plan.

## Governance Evidence

| Lane | PRD cycle | Implementation-plan cycle | QA |
| --- | --- | --- | --- |
| Light-first theme | `UX_v2/features/FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_PRD_V1_2026-06-17_14-24-00_IST.md` -> adversarial review -> `UX_v2/features/FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_PRD_V2_2026-06-17_14-26-00_IST.md` | `UX_v2/features/FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_IMPLEMENTATION_PLAN_V1_2026-06-17_14-27-00_IST.md` -> adversarial review -> `UX_v2/features/FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_IMPLEMENTATION_PLAN_V2_2026-06-17_14-29-00_IST.md` | `UX_v2/execution/LIGHT_FIRST_THEME_QA_REPORT_2026-06-17_14-59-33_IST.md` plus Android WebView report below |
| Android Library compact card + source logos | `UX_v2/features/FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_PRD_V1_2026-06-17_14-24-30_IST.md` -> adversarial review -> `UX_v2/features/FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_PRD_V2_2026-06-17_14-26-30_IST.md` | `UX_v2/features/FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_IMPLEMENTATION_PLAN_V1_2026-06-17_14-27-30_IST.md` -> adversarial review -> `UX_v2/features/FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_IMPLEMENTATION_PLAN_V2_2026-06-17_14-29-30_IST.md` | `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_QA_2026-06-17_14-59-33_IST.md` plus Android WebView report below |

Sub-agent outputs:

- Product Manager: `UX_v2/execution/feature_prds/`
- Technical Architect: `UX_v2/execution/architecture/ANDROID_LIBRARY_COMPACT_CARD_TECH_ARCH_ASSESSMENT_2026-06-17_14-24-58_IST.md`
- Project Manager: `UX_v2/execution/project_management/AI_MEMORY_PHASE2_UX_V2_PROJECT_TRACKER_2026-06-17_14-24-19_IST.md`
- QA: `UX_v2/execution/qa/ANDROID_LIBRARY_COMPACT_CARD_QA_STRATEGY_AND_TEST_MATRIX_2026-06-17_14-24-48_IST.md`

## Implementation Summary

Changed application files:

- `src/lib/theme.ts` and `src/lib/theme.test.ts`: Light-first resolver, legacy/invalid `system` migration, explicit Light/Dark-only theme type.
- `src/components/theme-bootstrap.tsx`, `src/components/theme-toggle.tsx`, `src/app/layout.tsx`, `src/app/settings/page.tsx`, `src/styles/tokens.css`, `public/offline.html`, `public/manifest.webmanifest`: Light-first runtime, SSR, Settings UI, offline fallback, and manifest metadata.
- `android/app/src/main/res/values/styles.xml`: native shell forced Light and force-dark disabled.
- `android/app/build.gradle`: private debug APK bumped to `versionName 1.0.7`, `versionCode 8`.
- `src/components/source-logo.tsx`: local decorative source-logo marks with no remote/CDN assets.
- `src/components/item-enrichment-watch.tsx`: compact enrichment pill pass-through.
- `src/components/library-list.tsx`: isolated mobile compact card branch, desktop branch preserved, visible mobile checkbox, source logo + readable source label, compact metadata cap, selected Ask flow preserved.

## Local Gates

Fresh gates rerun on 2026-06-17 after local fixture cleanup:

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 571 tests, 79 suites, 0 failures.
- `npm run build`: passed with the existing `unpdf` warning.
- `git diff --check`: passed.
- Strict conflict-marker scan: no matches.
- Theme static scan: no OS dark hook or old System theme copy; remaining `system` matches are data roles, tests, or non-theme references.
- Source-logo scan: no remote/CDN/logo-fetch path in `src/components/source-logo.tsx` or `src/components/library-list.tsx`.

Local browser QA:

- Evidence dir: `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-library-compact-light-first-2026-06-17_14-59-33_IST/`
- Report: `mobile-browser-qa-report.json`
- Result: `issueCount: 0`
- Covered Settings Light/Dark behavior, mobile Library compact card rows, visible selection, selected Ask route, and item-detail navigation.

Local cleanup:

- Removed exact local QA fixture items and fixture collection/tag/topic rows from `data/brain.sqlite`.
- Verified matching fixture item/taxonomy counts are `0`.
- Stopped the local dev server on port `3048`.

## Production Deploy

Pre-deploy backup:

- Remote file: `/opt/brain/data/backups/ux-v2-compact-light-first-predeploy-2026-06-17_14-59-33_IST.sqlite`
- SHA-256: `9c0afa8958178767e4918ac5f1628b1f5e39aae0ecdbe9295b65057295e62c78`
- Size: `4.5M`
- Verified on host `brain` at 2026-06-17 17:24 IST.

Deploy command:

- `BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh`

Deploy result:

- Release gates completed during deploy: typecheck, lint, full test suite, environment check, production build, artifact sync, native dependency repair, service restart, authenticated health check, remote AI provider check, Telegram webhook reachability.
- Local AI provider check used warn-only mode because local Ollama was unavailable.
- Telegram live smoke was skipped by deploy script because `TELEGRAM_RELEASE=1` was not set; webhook unauthenticated reachability returned the expected 401 during deploy.

Current production checks:

- `ssh brain "sudo systemctl is-active brain"`: `active`
- Authenticated production health check from host `brain`: `200`
- Public root request: `307` to `/unlock?next=%2F&reason=session-expired`, expected for unauthenticated private app access.

Production protected smoke:

- Evidence dir: `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/production-postdeploy-2026-06-17_15-25-03_IST/`
- Report: `production-mobile-smoke-report.redacted.json`
- Result: `issueCount: 0`
- Covered production Settings Light-first behavior, explicit Dark/Light toggle, mobile Library compact branch with 32 cards sampled, selection count 2, selected Ask route, and item-detail route.
- No private Library screenshots were captured in the final production pass; JSON route/item identifiers are redacted.

## Fresh Private APK

APK artifact:

- Path: `data/artifacts/brain-debug-v1.0.7-code8.apk`
- SHA-256: `d56ce784240277896f344e83cecec2e5cf921279a14c87beed66a5846b33ff46`
- Size: `7.5M`
- Package: `com.arunprakash.brain`
- Version: `1.0.7`
- Version code: `8`

Android emulator validation:

- Emulator: `Brain_API_36`
- Android version: `16`
- OS dark mode: enabled (`Night mode: yes`)
- Install command result: `adb install -r data/artifacts/brain-debug-v1.0.7-code8.apk` -> `Success`
- Installed package check: `versionName=1.0.7`, `versionCode=8`
- WebView: `Chrome/133.0.6943.137`
- Evidence dir: `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-webview-compact-light-first-2026-06-17_17-28-22_IST/`
- Report: `android-webview-runtime-report.redacted.json`
- Result: `issueCount: 0`

Android WebView checks covered:

- Settings loaded under Android OS dark with no `brain-theme` cookie and rendered Light.
- Settings exposed exactly Light/Dark controls; no System option or System copy detected.
- Explicit Dark applied and explicit Light restored.
- Production Library loaded in Android WebView at mobile width `412`.
- 34 production Library cards rendered with mobile branch visible and desktop branch hidden.
- 34 visible mobile checkboxes detected.
- Sampled mobile card titles stayed at the two-line clamp height.
- Sampled compact metadata stayed within the compact cap and included local source-logo SVGs plus readable source/status text.
- Two visible mobile checkboxes selected; selected toolbar appeared.
- Selected Ask route opened with redacted selected IDs.
- Card tap opened item-detail route with detail chrome detected.

Privacy handling:

- A temporary production QA session cookie was injected into the emulator WebView through the debug protocol.
- The token was not printed or saved.
- The emulator app data was cleared after validation with `adb shell pm clear com.arunprakash.brain`.
- The WebView debug port forward was removed and the emulator was shut down.
- No private Android Library screenshots were saved; the artifact is redacted DOM/route evidence only.

## Final Status

PASS for the requested private production web + private debug APK scope.

No open P0/P1 bugs remain for the compact-card/source-logo or Light-first theme lanes based on current local, production, and Android WebView evidence. Public/store Android distribution, release signing, and a public upload remain explicitly out of scope until Arun approves a separate PRD/review/plan cycle.
