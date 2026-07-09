# Implementation Plan V1: Light-First Theme And Explicit Toggle

Created: 2026-06-17 14:27:00 IST
Status: V1, pending adversarial review
PRD target: `FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_PRD_V1_2026-06-17_14-24-00_IST.md`
Prior source plan: `../execution/WEB_ANDROID_LIGHT_FIRST_THEME_IMPLEMENTATION_PLAN_2026-06-17_08-31-22_IST.md`

## Source Evidence

- `src/lib/theme.ts` still defines `Theme = "system" | "light" | "dark"` and accepts System.
- `src/components/theme-bootstrap.tsx` still resolves System through `matchMedia("(prefers-color-scheme: dark)")`.
- `src/components/theme-toggle.tsx` still exposes System/Light/Dark and subscribes to OS changes.
- `src/app/settings/page.tsx` still defaults missing cookies to System and says "System follows your OS preference."
- `public/offline.html` still has an OS-driven dark media query.
- `android/app/src/main/res/values/styles.xml` still uses `Theme.AppCompat.DayNight.NoActionBar`.

## Allowed Files

- `src/lib/theme.ts`
- `src/components/theme-bootstrap.tsx`
- `src/components/theme-toggle.tsx`
- `src/app/layout.tsx`
- `src/app/settings/page.tsx`
- `src/styles/tokens.css`
- `src/styles/tokens.contrast.test.ts`
- `public/offline.html`
- `public/manifest.webmanifest`
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/main/AndroidManifest.xml` only if native theme metadata requires it
- `android/app/src/main/java/com/arunprakash/brain/MainActivity.java` only if WebView force-dark must be disabled
- `android/app/build.gradle` only if a fresh APK artifact is built

## Steps

1. Add a Light/Dark resolver in `src/lib/theme.ts` that maps missing, invalid, and legacy System values to Light.
2. Update server layout to use the shared resolver and keep `data-theme-pref` as a resolved Light/Dark value or remove stale preference semantics.
3. Update `ThemeBootstrap` so it reads only the cookie, applies the resolver, and never subscribes to OS color scheme.
4. Update `ThemeToggle` to show only Light and Dark using Sun and Moon icons.
5. Update Settings initial value and Appearance copy.
6. Fix stale token comments while preserving dark token definitions.
7. Extend token/theme tests for missing, invalid, legacy System, Light, and Dark resolution.
8. Make `public/offline.html` Light-first by removing the OS dark media query and setting `color-scheme: light`.
9. Change Android `AppTheme.NoActionBar` away from DayNight to a Light no-action-bar parent and set light shell colors if needed.
10. Run static scans for stale user-facing System behavior.
11. Run code gates: lint, typecheck, test, build.
12. Capture browser QA for fresh Light, explicit Dark, explicit Light, legacy System, invalid cookie, and OS Dark/no cookie.
13. Build/install Android debug APK only after browser QA passes and capture Android Light/Dark persistence evidence.
14. Create `UX_v2/execution/LIGHT_FIRST_THEME_QA_REPORT_<timestamp>.md`.

## Acceptance Gates

- No `matchMedia("(prefers-color-scheme: dark)")` remains in theme bootstrap/toggle behavior.
- No user-facing System option remains.
- Dark remains explicitly selectable and contrast-safe.
- Offline fallback is Light-first.
- Android evidence is not substituted with browser mobile screenshots.
