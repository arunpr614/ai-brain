# Feature PRD V1: Light-First Theme And Explicit Toggle

Created: 2026-06-17 14:24:00 IST
Owner: Codex Product Manager lane
Status: V1, pending adversarial review
Feature slice: Web and Android light-first theme behavior

## Summary

AI Memory must open in Light mode by default on both Web and Android, matching the Magic Patterns light design. Dark mode remains supported, but only after the user explicitly selects it in Settings. The current implementation still exposes System, uses OS/browser dark preference in the client bootstrap, and lets Android/offline surfaces inherit dark behavior.

## Problem

The Magic Patterns reference and Arun's product decision make Light mode the source of truth. Today, fresh or legacy sessions can switch to Dark through `brain-theme=system` and `prefers-color-scheme: dark`. This creates inconsistent first-run UX, especially inside Android WebView, and makes visual parity evidence ambiguous.

## Goals

- Fresh Web sessions render Light on first paint, even when the browser/OS is Dark.
- Fresh Android installs or cleared app data render Light, even when Android OS is Dark.
- Settings exposes only Light and Dark.
- Legacy `brain-theme=system`, missing cookie, and invalid cookie values resolve to Light.
- Explicit Dark remains available, immediate, persistent, and contrast-safe.
- Offline fallback and native Android shell do not surprise-open or flash Dark from OS preference.

## Non-Goals

- Reintroducing a System or follow-OS setting.
- Pixel parity for Dark mode with Magic Patterns.
- New telemetry, user profile settings, or Android native preference storage.
- Publishing to public app stores.

## Users And Use Cases

- Arun opens AI Memory on Web or Android and expects the Magic Patterns light design by default.
- Arun explicitly chooses Dark in Settings and expects that preference to persist.
- A returning user with an old `brain-theme=system` cookie should not be surprised by OS-driven Dark.
- Android users should not see a dark launch/offline fallback unless they explicitly selected Dark inside the app.

## Requirements

### Functional

1. `brain-theme` remains the theme cookie name.
2. Accepted explicit user choices are Light and Dark only.
3. Missing, invalid, or legacy System values resolve to Light.
4. Server-rendered `<html data-theme>` resolves to Light unless the cookie is Dark.
5. Client bootstrap must not read or subscribe to `prefers-color-scheme` for app theme.
6. Settings must present a two-choice accessible Light/Dark control.
7. The selected theme must persist for one year using the existing cookie path/same-site behavior.
8. Dark token definitions and contrast behavior must remain intact.
9. `public/offline.html` must be Light-first and must not auto-darken from OS preference.
10. Android native theme/shell must avoid DayNight-driven dark leakage for launch/shell surfaces.

### Accessibility

- Settings theme control must expose selected state to assistive tech.
- Touch targets must be at least 44px on mobile/Android.
- Focus state must be visible.
- Light and Dark normal text contrast must remain at least 4.5:1 where applicable.

### Evidence

- Browser evidence must cover no cookie, explicit Light, explicit Dark, legacy System, invalid cookie, and OS Dark/no cookie.
- Android evidence must cover fresh install or cleared data, OS Dark/no app preference, explicit Dark persistence, explicit Light restoration, and offline fallback.

## Acceptance Criteria

- Fresh Web with no `brain-theme` cookie opens in Light.
- Fresh Web with browser/OS Dark and no `brain-theme` cookie opens in Light.
- `brain-theme=system` resolves to Light.
- `brain-theme=banana` resolves to Light.
- Settings shows only Light and Dark.
- Selecting Dark changes the UI immediately and persists after reload/relaunch.
- Selecting Light changes the UI immediately and persists after reload/relaunch.
- No user-facing copy says System follows OS preference.
- Offline fallback is Light-first and does not use `prefers-color-scheme: dark`.
- Android native shell no longer uses a DayNight parent that can force dark launch/shell appearance.
- Static checks, unit tests, build gates, browser QA, and Android QA are recorded.

## Risks

- Removing System may leave stale TypeScript unions or comments that imply old behavior.
- Android WebView or native shell may still force dark independently of web CSS.
- Dark support could regress while changing defaults.
- Browser-only validation could miss the original Android behavior.

## Rollout

Ship as a web production update after code gates and browser QA pass. If Android packaged or native files change, bump the debug APK version before sharing a private sideload artifact and document checksum, install result, and rollback.
