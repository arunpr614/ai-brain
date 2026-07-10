# Implementation Plan V2: Light-First Theme And Explicit Toggle

Created: 2026-06-17 14:29:00 IST
Status: V2 ready for execution
PRD V2: `FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_PRD_V2_2026-06-17_14-26-00_IST.md`
V1 plan: `FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_IMPLEMENTATION_PLAN_V1_2026-06-17_14-27-00_IST.md`
Adversarial review: `FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_14-28-00_IST.md`

## Review Resolution

| Review issue | V2 response |
| --- | --- |
| Resolver tests not concrete | Add `src/lib/theme.test.ts` with explicit cases. |
| Native Android force-dark may be skipped | Make Light no-action-bar parent mandatory and document MainActivity/WebView force-dark audit in QA. |
| Deployment gates vague | Add web deploy, health, production smoke, and rollback steps. |
| `data-theme-pref` stale risk | Keep DOM theme metadata resolved to Light/Dark only. |
| Manifest color undecided | Align manifest theme color with light-first shell unless QA finds a blocker. |

## Allowed Files

- `src/lib/theme.ts`
- `src/lib/theme.test.ts`
- `src/components/theme-bootstrap.tsx`
- `src/components/theme-toggle.tsx`
- `src/app/layout.tsx`
- `src/app/settings/page.tsx`
- `src/styles/tokens.css`
- `src/styles/tokens.contrast.test.ts`
- `public/offline.html`
- `public/manifest.webmanifest`
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/main/java/com/arunprakash/brain/MainActivity.java` only if force-dark disablement is required
- `android/app/build.gradle` only if a fresh APK is built
- `UX_v2/execution/LIGHT_FIRST_THEME_QA_REPORT_<timestamp>.md`

## Implementation Steps

1. Update `src/lib/theme.ts`.
   - Define `ExplicitTheme = "light" | "dark"`.
   - Keep `Theme = ExplicitTheme` for public app state.
   - Add `resolveThemePreference(raw): ExplicitTheme`.
   - Add `isExplicitTheme(v): v is ExplicitTheme`.
   - Treat `"system"`, missing, and invalid as Light.

2. Add `src/lib/theme.test.ts`.
   - Assert missing, null, undefined, invalid, and System resolve to Light.
   - Assert Light resolves to Light.
   - Assert Dark resolves to Dark.
   - Assert only Light/Dark are accepted as explicit themes.

3. Update `src/app/layout.tsx`.
   - Use `resolveThemePreference(c.get(THEME_COOKIE)?.value)`.
   - Set `<html data-theme={resolved}>`.
   - Remove stale comments about client real preference.
   - Set `data-theme-pref={resolved}` or remove it if unused. Do not emit System.

4. Update `src/components/theme-bootstrap.tsx`.
   - Read raw cookie.
   - Apply `resolveThemePreference`.
   - Set `document.documentElement.dataset.theme`.
   - If cookie is missing, System, or invalid, write `brain-theme=light`.
   - Remove all `matchMedia` and OS preference listeners.

5. Update `src/components/theme-toggle.tsx`.
   - Remove Monitor/System option.
   - Keep Sun and Moon only.
   - Persist only Light/Dark.
   - Maintain accessible radio group semantics and mobile 44px touch targets.

6. Update `src/app/settings/page.tsx`.
   - Initial theme uses resolver.
   - Copy says the app opens in Light and Dark is an explicit preference.
   - No OS/System language remains.

7. Update `src/styles/tokens.css`.
   - Replace stale theme comments.
   - Preserve light defaults and dark token block.

8. Update `public/offline.html`.
   - Set `color-scheme: light`.
   - Remove OS-driven dark media query.
   - Keep offline page self-contained.

9. Update `public/manifest.webmanifest`.
   - Align `theme_color` to the light-first shell/background unless validation shows a branding blocker.

10. Update Android native shell.
   - Change `AppTheme.NoActionBar` away from DayNight to a Light no-action-bar parent.
   - Document whether MainActivity force-dark changes are required. If WebView force-dark is not active, record evidence in QA.

11. Run static scans.
   - `rg -n "prefers-color-scheme: dark|matchMedia\\(\\\"\\(prefers-color-scheme: dark\\)\\\"|System follows your OS preference|\\bsystem\\b" src public android`
   - Review every remaining result. Data roles/capture sources may remain; theme behavior/user-facing System must not.
   - `rg -n "brain-theme|data-theme" src public android`

12. Run code gates.
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`

13. Browser QA.
   - Fresh no-cookie Light in OS Light.
   - Fresh no-cookie Light in OS Dark.
   - Explicit Dark persists after reload.
   - Explicit Light persists after reload.
   - Legacy System resolves/migrates to Light.
   - Invalid cookie resolves/migrates to Light.
   - Record first-paint and hydrated values where possible.

14. Android QA.
   - Build/install debug APK if native/packaged changes need Android proof.
   - Validate fresh install/cleared data under Android OS Dark opens Light.
   - Validate Dark/Light toggles persist across relaunch.
   - Validate offline fallback stays Light.
   - Record WebView/native force-dark observation.

15. Documentation and release.
   - Create `UX_v2/execution/LIGHT_FIRST_THEME_QA_REPORT_<timestamp>.md`.
   - Update project tracker with exact evidence paths.
   - Deploy Web production only after gates pass.
   - Run production health/smoke and document rollback.
   - If APK is shared, bump version/code, document checksum/install/rollback, and do not reuse `1.0.6/code7`.

## No-Go Gates

- Any remaining theme behavior driven by OS color scheme.
- Settings still exposes System.
- Dark explicit mode fails.
- Offline fallback auto-darkens.
- Android fresh install under OS Dark is not proven Light.
- Code gates fail for feature-owned reasons.
- Production deploy lacks health evidence.
