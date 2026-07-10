# Feature PRD V2: Light-First Theme And Explicit Toggle

Created: 2026-06-17 14:26:00 IST
Owner: Codex Product Manager lane
Status: V2 approved for implementation
V1: `FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_PRD_V1_2026-06-17_14-24-00_IST.md`
Adversarial review: `FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_PRD_ADVERSARIAL_REVIEW_2026-06-17_14-25-00_IST.md`

## Summary

AI Memory must be Light-first on Web and Android. Dark mode remains supported only as an explicit user choice from Settings. Missing, invalid, and legacy System theme values resolve to Light and are migrated to `brain-theme=light` when the client can safely write the cookie.

## Review Resolution

| Review issue | V2 resolution |
| --- | --- |
| First-paint proof underspecified | Add SSR `data-theme` and post-hydration proof requirements. |
| Android force-dark underspecified | Require Android OS Dark fresh-install proof, native shell audit, and offline fallback evidence. |
| Legacy System migration ambiguous | Client migrates System/invalid cookies to Light. |
| Release/rollback too generic | Add production deploy health, production smoke, and APK rollback evidence gates. |
| Settings copy too loose | User-facing copy must describe explicit Light/Dark choice without OS/System language. |

## Product Contract

- Light is the default for fresh Web and Android sessions.
- Dark appears only after explicit user selection.
- The public/user-facing theme model has exactly two options: Light and Dark.
- `brain-theme=system` is supported only as a legacy input that resolves and migrates to Light.
- Invalid or missing cookie values resolve and migrate to Light where possible.
- Browser/OS `prefers-color-scheme` must not drive app theme.

## Functional Requirements

1. `brain-theme` remains the cookie name.
2. Theme resolver returns only `light` or `dark`.
3. Accepted explicit choices are only `light` and `dark`.
4. Missing, invalid, and legacy `system` inputs resolve to `light`.
5. Server-rendered `<html data-theme>` is `light` unless the cookie is exactly `dark`.
6. Client bootstrap applies only the resolver result and must not use `matchMedia` for theme.
7. Client bootstrap rewrites legacy/invalid cookie values to `brain-theme=light`.
8. Settings exposes only Light and Dark with Sun/Moon icons.
9. Settings copy does not mention System, OS preference, or automatic theme following.
10. Dark mode tokens and contrast remain supported.
11. Offline fallback is Light-first and does not auto-darken from OS preference.
12. Android native shell uses a Light no-action-bar theme and is audited for WebView force-dark behavior.
13. PWA/manifest shell colors must not create a dark first-run impression unless explicitly justified in QA.

## Accessibility Requirements

- Settings theme control uses radio semantics or an equivalent accessible segmented control.
- Selected state is exposed through `aria-checked` or equivalent.
- Touch targets are at least 44px on mobile/Android.
- Keyboard focus is visible.
- Light and Dark text/control contrast pass existing token tests.

## Acceptance Criteria

- Fresh Web, no cookie, browser/OS Light: first paint and hydrated UI are Light.
- Fresh Web, no cookie, browser/OS Dark: first paint and hydrated UI are Light.
- `brain-theme=system`: first paint and hydrated UI are Light; client rewrites cookie to Light.
- Invalid cookie: first paint and hydrated UI are Light; client rewrites cookie to Light.
- `brain-theme=dark`: first paint and hydrated UI are Dark.
- Settings shows only Light and Dark.
- Choosing Dark updates immediately and persists after reload/relaunch.
- Choosing Light updates immediately and persists after reload/relaunch.
- No theme code path subscribes to OS color-scheme changes.
- Offline fallback remains Light under OS Dark.
- Android fresh install/cleared data remains Light under Android OS Dark.
- Android explicit Dark persists after relaunch.
- Android explicit Light restores and persists after relaunch.
- Web production deploy health and smoke checks pass before completion.
- If a new APK is produced, version/code, checksum, install result, and rollback are documented.

## No-Go Gates

- No release if any fresh state opens Dark without explicit user choice.
- No release if Settings exposes System.
- No release if `brain-theme=system` follows OS preference.
- No release if Dark explicit mode is broken or unvalidated.
- No release if offline fallback auto-darkens from OS preference.
- No release if Android evidence is replaced by browser mobile screenshots.
- No production completion claim without deploy health evidence.

## QA And Evidence

Create `UX_v2/execution/LIGHT_FIRST_THEME_QA_REPORT_<timestamp>.md` with:

- static scan outputs;
- unit/code gate results;
- browser first-paint and hydrated state evidence;
- Settings toggle evidence;
- Android OS Dark evidence;
- offline fallback evidence;
- production deploy/health evidence if deployed;
- APK metadata if a fresh APK is built.

## Rollback

Web rollback is the previous deployed source revision. APK rollback is the previous validated private sideload artifact `data/artifacts/brain-debug-v1.0.6-code7.apk` unless a newer validated artifact supersedes it.
