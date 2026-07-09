# Web Experience Revamp Contrast QA

**Created:** 2026-06-15 22:20:00 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Feature:** Contrast and token safety
**Status:** Static/code QA passed. Local browser visual QA passed for representative desktop/mobile light/dark states. Android WebView pickup remains required before release/deploy.

## Source Documents

| Document | Path |
| --- | --- |
| Feature PRD v1 | `UX_v2/features/FEATURE_CONTRAST_TOKEN_SAFETY_PRD_V1_2026-06-15_22-00-00_IST.md` |
| PRD adversarial review | `UX_v2/features/FEATURE_CONTRAST_TOKEN_SAFETY_PRD_ADVERSARIAL_REVIEW_2026-06-15_22-04-00_IST.md` |
| Feature PRD v2 | `UX_v2/features/FEATURE_CONTRAST_TOKEN_SAFETY_PRD_V2_2026-06-15_22-08-00_IST.md` |
| Implementation plan v1 | `UX_v2/features/FEATURE_CONTRAST_TOKEN_SAFETY_IMPLEMENTATION_PLAN_V1_2026-06-15_22-12-00_IST.md` |
| Implementation plan adversarial review | `UX_v2/features/FEATURE_CONTRAST_TOKEN_SAFETY_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-15_22-16-00_IST.md` |
| Implementation plan v2 | `UX_v2/features/FEATURE_CONTRAST_TOKEN_SAFETY_IMPLEMENTATION_PLAN_V2_2026-06-15_22-20-00_IST.md` |

## Scope Implemented

Added semantic action and selected-control tokens, migrated high-risk primary action and selected-control class usage away from raw accent tokens, and added CSS-backed contrast tests.

## Files Touched By This Slice

| File | Change |
| --- | --- |
| `src/styles/tokens.css` | Added semantic action and selected-control tokens for light/dark themes; routed `--on-accent` through the new readable foreground token. |
| `src/app/globals.css` | Exposed new token mappings to Tailwind theme variables and moved global focus outline to the action focus token. |
| `src/styles/tokens.contrast.test.ts` | Added CSS parser and contrast-ratio assertions for primary actions, hover states, selected controls, and the old failing pair. |
| `src/components/ask-input.tsx` | Migrated primary submit action tokens. |
| `src/components/citation-chip.tsx` | Migrated selected chip tokens and focus/hover border token. |
| `src/components/collection-editor.tsx` | Migrated primary add action tokens. |
| `src/components/command-palette.tsx` | Migrated selected command row tokens. |
| `src/components/library-list.tsx` | Migrated selected rows and primary inline actions. |
| `src/components/mobile-library-filters.tsx` | Migrated selected chips, selected filter controls, and primary clear/apply actions. |
| `src/components/sidebar.tsx` | Migrated selected navigation tokens. |
| `src/components/tag-editor.tsx` | Migrated primary add action tokens. |
| `src/components/theme-toggle.tsx` | Migrated selected theme toggle token usage. |
| `src/app/ask/ask-client.tsx` | Migrated selected scope/filter controls. |
| `src/app/ask/page.tsx` | Migrated primary empty-state action. |
| `src/app/capture/page.tsx` | Migrated primary capture actions where present in the active surface. |
| `src/app/capture/pdf-dropzone.tsx` | Migrated selected dropzone state. |
| `src/app/capture/tabs.tsx` | Migrated selected tab and primary action tokens. |
| `src/app/collections/[id]/page.tsx` | Migrated primary route action. |
| `src/app/items/[id]/page.tsx` | Migrated selected/status containers and primary actions. |
| `src/app/items/[id]/repair/repair-form.tsx` | Migrated selected repair option and submit tokens. |
| `src/app/library/page.tsx` | Migrated primary actions and selected filter controls. |
| `src/app/needs-upgrade/page.tsx` | Migrated primary repair action. |
| `src/app/not-found.tsx` | Migrated primary return action. |
| `src/app/search/page.tsx` | Migrated selected search filters. |
| `src/app/settings/collections/page.tsx` | Migrated primary add action and focus token. |
| `src/app/settings/page.tsx` | Migrated primary settings action. |
| `src/app/settings/tags/page.tsx` | Migrated focus token while leaving safe accent icons as accent usage. |
| `src/app/setup/form.tsx` | Migrated primary setup action. |
| `src/app/topics/[slug]/page.tsx` | Migrated primary route action. |
| `src/app/unlock/form.tsx` | Migrated primary unlock action. |
| `src/app/page.tsx` | Removed one trailing blank line so `git diff --check` could complete cleanly. No behavior change. |

## Before And After Scans

| Scan | Before | After | Status |
| --- | ---: | ---: | --- |
| Exact primary action pair | 24 | 0 | Fixed |
| Raw `bg-[var(--accent-9)]` | 24 | 0 | Fixed |
| Raw `text-[var(--on-accent)]` | 24 | 0 | Fixed |
| Raw `border-[var(--accent-9)]` | 13 | 0 | Fixed |
| Selected-control-like `accent-3` + `accent-11` | 15 | 0 | Fixed |

After-scan command used:

```bash
rg -n "bg-\[var\(--accent-9\)\]|text-\[var\(--on-accent\)\]|border-\[var\(--accent-9\)\]|bg-\[var\(--accent-3\)\].*text-\[var\(--accent-11\)\]|text-\[var\(--accent-11\)\].*bg-\[var\(--accent-3\)\]" src || true
```

Result: no matches.

## Remaining Raw Accent Classification

| Remaining usage family | Examples | Classification | Release note |
| --- | --- | --- | --- |
| Token definitions and theme aliases | `src/styles/tokens.css`, `src/app/globals.css` | Safe foundation | Required to keep accent available for non-primary uses. |
| Semantic action and selected-control classes | `--action-primary-*`, `--control-selected-*` usages across routes/components | Migrated | Expected result of this feature. |
| Native form accent color | Checkbox `accent-[var(--accent-9)]` in `src/components/library-list.tsx` | Safe-accent | Native control accent, not white text on near-white background. Revisit only if visual QA shows low visibility. |
| Icons and status decoration | Sparkles icons, loading/spinner accent text | Safe-content | Decorative/status usage, not primary button text. |
| Links, hover/focus, callout borders | Settings links, capture links, quote/focus borders | Safe-focus/safe-content | These are not the failing primary/selected-control pair. |

No remaining raw match is classified as `follow-up/blocker` for the contrast-token slice. Browser and Android visual QA can still reopen this if the rendered UI shows insufficient affordance.

## Contrast Test

| Gate | Result |
| --- | --- |
| `node --import tsx --test src/styles/tokens.contrast.test.ts` | Pass, 3 tests |

Assertions covered:

- Light primary action foreground/background contrast >= 4.5:1.
- Light primary action hover contrast >= 4.5:1.
- Dark primary action foreground/background contrast >= 4.5:1.
- Dark primary action hover contrast >= 4.5:1.
- Light selected-control contrast >= 4.5:1.
- Dark selected-control contrast >= 4.5:1.
- Old failing white-on-near-white pair stays below 4.5:1, proving the regression test catches the original failure mode.

## Static Validation

| Gate | Result | Notes |
| --- | --- | --- |
| `git diff --check` | Pass | Whitespace clean after removing inherited trailing blank line in `src/app/page.tsx`. |
| `npm run typecheck` | Pass | `tsc --noEmit` clean. |
| `npm run lint` | Pass with warning | Existing warning: unused eslint-disable in `src/lib/queue/enrichment-batch-cron.ts`. |
| `npm test` | Pass | 458 tests, 65 suites, 0 failures. |
| `npm run build` | Pass with warning | Existing `unpdf` `import.meta` warning remains; build completed. |

## Manual Visual QA

Local browser QA used a disposable database at `/tmp/ai-memory-contrast-qa.sqlite` and a temporary local-only PIN. No real library content, real PIN, token, or cookie value was recorded in screenshots or reports.

| Evidence | Theme | Viewport | Path |
| --- | --- | --- | --- |
| Setup primary action | Dark/system | Desktop | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/contrast/contrast-setup-desktop-dark-system.png` |
| Library primary actions and selected filters | Light | Desktop | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/contrast/contrast-library-desktop-light.png` |
| Library primary actions and selected filters | Dark/system | Desktop | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/contrast/contrast-library-desktop-dark.png` |
| Settings theme toggle, active nav, export action | Light | Desktop | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/contrast/contrast-settings-desktop-light.png` |
| Settings theme toggle, active nav, export action | Dark | Desktop | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/contrast/contrast-settings-desktop-dark.png` |
| Library primary actions and mobile bottom nav | Light | 390x844 | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/contrast/contrast-library-mobile-light.png` |
| Library primary actions and mobile bottom nav | Dark | 390x844 | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/contrast/contrast-library-mobile-dark.png` |
| Mobile filter sheet selected controls | Light | 390x844 | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/contrast/contrast-library-mobile-filters-light.png` |
| Mobile filter sheet selected controls | Dark | 390x844 | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/contrast/contrast-library-mobile-filters-dark.png` |

Rendered contrast spot checks:

| Surface | Theme | Observed contrast |
| --- | --- | ---: |
| Desktop Library primary `Capture` action | Light | 15.97:1 |
| Desktop Library selected nav/filter controls | Light | 14.47:1 |
| Desktop Library primary `Capture` action | Dark/system | 16.57:1 |
| Desktop Library selected nav/filter controls | Dark/system | 9.56:1 |
| Desktop Settings export action | Light | 15.97:1 |
| Desktop Settings selected nav/theme control | Light | 14.47:1 |
| Desktop Settings export action | Dark | 16.57:1 |
| Desktop Settings selected nav/theme control | Dark | 9.56:1 |
| Mobile Library primary `Capture` actions | Light | 15.97:1 |
| Mobile Library selected bottom nav/filter controls | Light | 14.47:1 to 15.56:1 |
| Mobile Library primary `Capture` actions | Dark | 16.57:1 |
| Mobile Library selected bottom nav/filter controls | Dark | 9.56:1 to 13.39:1 |

Browser console check: no warning/error entries were observed for the inspected tab after the visual pass.

Still required before release:

- Android WebView asset pickup check after deploy or against an Android test harness if Android completion is claimed.
- Full route visual/accessibility QA for future feature slices.
- Production deploy/live smoke evidence, if release is attempted.

## Release Assessment

Static/code QA and representative local browser visual QA for contrast-token safety are green. This feature can unblock the next web/mobile visual implementation slices, but it is not a production release gate by itself until Android WebView pickup and release/deploy evidence are complete.
