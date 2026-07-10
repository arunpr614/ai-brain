# Light-First Theme QA

Created: 2026-06-17 14:59:33 IST
Status: Passed local SSR, mobile browser, static scan, and build/test gates. Production deploy and APK runtime validation are tracked separately.

## Scope

This report validates the Light-first theme implementation created from:

- `UX_v2/features/FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_PRD_V2_2026-06-17_14-26-00_IST.md`
- `UX_v2/features/FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_IMPLEMENTATION_PLAN_V2_2026-06-17_14-29-00_IST.md`
- `UX_v2/execution/WEB_ANDROID_LIGHT_FIRST_THEME_IMPLEMENTATION_PLAN_2026-06-17_08-31-22_IST.md`

## Evidence

Machine-readable report:

- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-library-compact-light-first-2026-06-17_14-59-33_IST/mobile-browser-qa-report.json`

Screenshots:

- `settings-os-dark-no-theme-light.png`
- `settings-explicit-dark.png`
- `settings-light-restored.png`

## Results

| Check | Result |
| --- | --- |
| Fresh/no theme cookie SSR | Passed: `/unlock` renders `data-theme=light`, `data-theme-pref=light`. |
| Explicit dark cookie SSR | Passed: `/unlock` renders `data-theme=dark`, `data-theme-pref=dark`. |
| Legacy `brain-theme=system` SSR | Passed: resolves to Light. |
| Invalid theme cookie SSR | Passed: resolves to Light. |
| OS/browser dark with no theme cookie | Passed: mobile browser emulated dark preference, Settings rendered Light. |
| Settings choices | Passed: exactly two radios, `Light theme` and `Dark theme`; no System option/copy. |
| Explicit Dark | Passed: tapping Dark sets `data-theme=dark`; reload preserves Dark. |
| Restore Light | Passed: tapping Light restores `data-theme=light`. |
| Offline fallback | Passed static review: `public/offline.html` no longer contains OS-dark media behavior. |
| Android shell style | Passed static review: native style uses Light parent and disables force dark. |

## Commands

| Command | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed: 571 tests, 79 suites, 571 pass, 0 fail |
| `npm run build` | Passed with existing `unpdf` import warning |
| `git diff --check` | Passed |
| `rg -n "prefers-color-scheme: dark\|matchMedia\\(\|System follows your OS preference\|\\bsystem\\b" src public android --glob '!src/lib/capture/__fixtures__/**'` | Passed for theme behavior; remaining `system` hits are unrelated data roles/source labels or theme migration tests. |

## SSR Cookie Matrix

| Cookie | Theme | Theme pref |
| --- | --- | --- |
| none | light | light |
| `brain-theme=dark` | dark | dark |
| `brain-theme=system` | light | light |
| `brain-theme=banana` | light | light |

## Notes

- Dark mode remains available, but only as an explicit user preference.
- The APK is a thin WebView that loads `https://brain.arunp.in`; Android production runtime proof requires a web deploy containing this change, then APK/WebView validation.
