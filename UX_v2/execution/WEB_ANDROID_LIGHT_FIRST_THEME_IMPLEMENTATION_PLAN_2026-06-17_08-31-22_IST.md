# AI Memory Web and Android Light-First Theme Implementation Plan

Created: 2026-06-17 08:31:22 IST
Owner: Codex implementation agent
Status: New implementation plan created after adversarial-review findings and Arun's product decision
Target platforms: Web desktop/responsive app and Android Capacitor WebView APK
Primary decision: AI Memory is light-first, matching the Magic Patterns design. Dark mode remains supported only as an explicit user choice.

## Inputs

- Project root: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
- User approval in this thread: "Change to light-first as like magic pattern design. Add a the toggle for dark and light in the setting page. Apply for both Android and Web UX/UI."
- Delta report: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/WEB_UX_MAGIC_PATTERNS_DELTA_GAP_REPORT_2026-06-17_08-18-55_IST.md`
- Adversarial review: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/WEB_UX_MAGIC_PATTERNS_DELTA_GAP_REPORT_ADVERSARIAL_REVIEW_2026-06-17_08-24-39_IST.md`
- Web implementation plan being amended by this plan: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/WEB_EXPERIENCE_REVAMP_IMPLEMENTATION_PLAN_REVISED_2026-06-15_21-07-34_IST.md`
- Android implementation plan being amended by this plan: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
- Web PRD: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/WEB_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_20-27-04_IST.md`
- Android PRD: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
- Magic Patterns web design: `https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx`
- Magic Patterns Android design: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`

## Executive Decision

This plan resolves the adversarial review's product-decision blocker.

| Decision | Resolution |
|---|---|
| First-run Web theme | Light |
| First-run Android WebView theme | Light |
| Magic Patterns parity baseline | Light mode only |
| Dark mode support | Still supported, but only when the user explicitly selects Dark |
| System theme behavior | Remove from user-facing behavior for this implementation. Existing `system` cookies must resolve to Light. |
| Settings control | Replace the current System/Light/Dark picker with a two-choice Light/Dark control. |
| Release gate | No Web or Android signoff unless fresh no-cookie state opens in Light and explicit Dark/Light toggles persist correctly. |

## What This Plan Changes

This plan does not remove dark mode. It changes dark mode from "may appear automatically because the OS/browser is dark" to "appears only when the user chooses Dark."

The previous plans required dark-theme validation. That requirement remains. The difference is that dark mode is no longer the first-run default and is no longer driven by OS/system preference.

## Confirmed Evidence

| Evidence | File and line |
|---|---|
| Theme cookie is `brain-theme` | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/lib/theme.ts:9` |
| Current theme type allows `system`, `light`, `dark` | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/lib/theme.ts:7` |
| Current client bootstrap defaults invalid/no cookie to `system` | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/theme-bootstrap.tsx:6` |
| Current client bootstrap maps `system` to OS/browser `prefers-color-scheme` | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/theme-bootstrap.tsx:14` |
| Current server layout treats invalid/no cookie as `system`, then resolves server paint to Light unless cookie is Dark | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/layout.tsx:45` |
| Current layout says the client reconciles to real preference after hydration | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/layout.tsx:71` |
| Current Settings defaults missing cookie to `system` | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/settings/page.tsx:46` |
| Current Settings copy says "System follows your OS preference" | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/settings/page.tsx:92` |
| Current ThemeToggle exposes System, Light, Dark | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/theme-toggle.tsx:8` |
| Light tokens are the CSS default | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/styles/tokens.css:12` |
| Dark tokens are supported through `:root[data-theme="dark"]` | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/styles/tokens.css:130` |
| Token comments currently mention server-side system preference via `theme` cookie, which is stale | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/styles/tokens.css:8` |
| Magic Patterns web source export is light-first | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_UI_DESIGN_PACKAGE/source-exports/web/magic-patterns-exact/tailwind.config.js:5` |
| Web PRD requires supported-theme contrast validation | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/WEB_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_20-27-04_IST.md:88` |
| Web PRD requires dark-theme evidence for Library if theme support exists | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/WEB_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_20-27-04_IST.md:219` |
| Android PRD requires light and dark contrast evidence | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md:82` |
| Android WebView shell loads live web assets | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/capacitor.config.ts:6` |
| Android native shell currently uses a DayNight NoActionBar theme | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/android/app/src/main/res/values/styles.xml:12` |
| Android offline fallback currently follows `prefers-color-scheme: dark` | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/public/offline.html:25` |

## Adversarial Review Closure Matrix

| Review comment | Plan response | Release gate |
|---|---|---|
| Light default was recommended without product decision | Arun has now approved light-first. This plan records that decision. | No coding against theme defaults unless this dated plan is referenced in implementation notes. |
| Dark support might be weakened accidentally | Dark remains supported as an explicit user choice and must pass contrast/visual QA. | No release if dark fails supported-theme checks. |
| Line-level evidence was missing | This plan includes exact source and PRD citations. | Implementation report must cite changed files and before/after behavior. |
| Screenshot cause was inferred, not proven | Implementation must validate no-cookie, explicit Light, explicit Dark, and legacy System cookie behavior in browser and Android WebView. | No claim of resolved cause without browser/WebView evidence. |
| Stale theme comments were missed | Update stale comments in `tokens.css`, `theme.ts`, and layout/bootstrap comments. | No release with comments claiming server-side `theme` cookie or automatic system preference. |
| Visual deltas were under-tested | Require side-by-side Magic Patterns light, production light, and production dark/adaptation screenshots. | No parity signoff without screenshot matrix. |
| Product gate was not explicit | This plan is the gate: light-first approved, dark explicit only. | No reintroducing system-default behavior without a new Arun decision. |
| Share-safe concern | This internal plan uses full paths for Codex continuity. External copies must redact local roots. | Release packet must avoid private local roots if shared externally. |
| Magic Patterns staleness | Recheck Magic Patterns status before coding and before final QA. | No final parity claim if Magic Patterns active artifact changed and matrix was not refreshed. |

## Scope

### In Scope

- Web first-run theme defaults to Light for fresh browser sessions.
- Android WebView first-run theme defaults to Light for fresh APK install / cleared app data.
- User-facing theme setting becomes Light/Dark only.
- Legacy `brain-theme=system` or invalid cookie values resolve to Light.
- Dark mode remains available through Settings and persists across reload/relaunch.
- Android native shell, launch/splash, and offline fallback are audited for system-dark leakage.
- Light-mode visual parity is validated against Magic Patterns.
- Dark-mode visual adaptation is validated separately for usability and contrast.
- Tests and QA evidence prove Web and Android behavior.

### Out Of Scope

- New "follow OS/system theme" preference.
- New runtime theme sync with Android native settings.
- New telemetry, analytics, or user profile settings.
- Redesign of unrelated Library, Capture, Ask, Settings, Pairing, or Android share-result flows beyond theme-specific UI defects found during validation.
- Publishing APK to an app store.

## Theme Contract

### Required End State

| State | Expected behavior |
|---|---|
| No `brain-theme` cookie | Light |
| `brain-theme=light` | Light |
| `brain-theme=dark` | Dark |
| `brain-theme=system` legacy cookie | Light, with optional migration to `brain-theme=light` |
| Invalid `brain-theme` value | Light, with optional migration to `brain-theme=light` |
| Browser/OS dark mode but no cookie | Light |
| Android system dark mode but no app cookie | Light |
| User chooses Dark in Settings | Dark immediately, persistently |
| User chooses Light in Settings after Dark | Light immediately, persistently |

### User-Facing Settings Model

- Settings exposes exactly two choices: Light and Dark.
- Light is selected by default on fresh sessions.
- Do not show a System option in this implementation.
- Do not use copy that says "System follows your OS preference."
- The control must be accessible:
  - keyboard reachable;
  - screen-reader label present;
  - selected state exposed through `role="radio"`/`aria-checked` or an equivalent accessible segmented control;
  - touch targets at least 44px on mobile/Android.

## Implementation Phases

### Phase 0 - Baseline And Source Recheck

Goal: prevent stale-source and dirty-worktree confusion before implementation.

Tasks:

1. Record current branch, commit, and git status.
2. List unrelated modified/untracked files and do not touch them.
3. Recheck Magic Patterns web artifact status and active artifact ID.
4. Recheck Android Magic Patterns artifact status and active artifact ID if Android visual reference is needed.
5. Capture current behavior before changes:
   - Web fresh/no-cookie theme state.
   - Web explicit Light.
   - Web explicit Dark.
   - Web legacy `brain-theme=system`.
   - Android fresh install or cleared app data theme state.
   - Android explicit Light and Dark after toggle.
6. Save findings to `UX_v2/execution/LIGHT_FIRST_THEME_BASELINE_<timestamp>.md`.

Exit criteria:

- Baseline artifact exists.
- Magic Patterns status is current.
- Dirty worktree scope is documented.
- Before screenshots or notes exist for current theme behavior.

### Phase 1 - Shared Theme Model Refactor

Goal: make Light the deterministic default and remove automatic system theme resolution.

Target files:

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/lib/theme.ts`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/theme-bootstrap.tsx`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/layout.tsx`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/styles/tokens.css`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/styles/tokens.contrast.test.ts`

Tasks:

1. Change the theme type contract to Light/Dark only, or add a new public preference type that only accepts Light/Dark.
2. Keep `THEME_COOKIE = "brain-theme"` for backwards compatibility.
3. Add a resolver function such as `resolveThemePreference(raw): "light" | "dark"`:
   - `"dark"` resolves to `"dark"`;
   - `"light"` resolves to `"light"`;
   - `"system"`, missing, or invalid resolves to `"light"`.
4. Update server layout:
   - no cookie means `data-theme="light"`;
   - legacy system cookie means `data-theme="light"`;
   - dark cookie means `data-theme="dark"`;
   - update `data-theme-pref` if it remains useful, otherwise remove or rename it to the resolved value.
5. Update `ThemeBootstrap`:
   - remove `matchMedia("(prefers-color-scheme: dark)")` default behavior;
   - remove OS preference change listener;
   - apply only resolved Light/Dark from cookie;
   - optionally rewrite legacy `system`/invalid cookie to `light` after hydration.
6. Update theme comments:
   - remove stale "system preference is applied server-side via a `theme` cookie";
   - document `brain-theme` and Light-first behavior accurately.
7. Keep dark tokens intact.
8. Update contrast tests so both Light and Dark action/selected-control tokens still pass.

Exit criteria:

- Fresh SSR renders `data-theme="light"`.
- Client bootstrap does not switch to Dark because of OS/browser preference.
- Legacy `brain-theme=system` does not switch to Dark.
- Existing dark-token contrast tests still pass.

### Phase 2 - Web Settings Theme Toggle

Goal: make Settings the explicit place where the user chooses Light or Dark.

Target files:

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/theme-toggle.tsx`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/settings/page.tsx`

Tasks:

1. Replace the current System/Light/Dark control with a Light/Dark two-state segmented control.
2. Use familiar Sun and Moon icons from `lucide-react`.
3. Preserve accessible radio semantics or equivalent accessible toggle semantics.
4. Persist `brain-theme=light` or `brain-theme=dark` for one year, same path and same-site behavior.
5. Update Settings initial value:
   - missing cookie resolves to Light;
   - system/invalid cookie resolves to Light;
   - dark cookie initializes Dark.
6. Replace "System follows your OS preference" copy with concise Light/Dark copy.
7. Ensure the control works in desktop and mobile layouts.
8. Ensure no visible text overflows on mobile.

Exit criteria:

- Settings shows only Light and Dark.
- Light is active in a fresh session.
- Selecting Dark updates the UI immediately and persists after reload.
- Selecting Light restores Magic Patterns-like light surfaces and persists after reload.
- Keyboard, screen-reader, and touch behavior pass.

### Phase 3 - Web Light-Mode Magic Patterns Parity QA

Goal: validate that Light mode is the visual source of truth for Web.

Tasks:

1. Capture a new Magic Patterns status line:
   - URL;
   - active artifact ID;
   - generation status;
   - files inspected.
2. Capture Light-mode Web screenshots for at least:
   - Library default;
   - Library filtered;
   - Library selected/bulk state;
   - Settings with theme toggle;
   - More mobile route;
   - Unlock;
   - Capture;
   - Ask;
   - Item detail;
   - Pair Device.
3. Capture the same routes in Dark mode for adaptation QA.
4. Use matched viewports:
   - 390x844;
   - 768x1024;
   - 1280x800;
   - 1440x900.
5. Compare Light screenshots to Magic Patterns first.
6. Compare Dark screenshots against usability and contrast, not pixel parity with Magic Patterns.
7. Re-check known deltas from the gap report:
   - search field width;
   - primary action styling;
   - status badge duplication;
   - row density;
   - checkbox discoverability;
   - Settings theme accessibility.

Exit criteria:

- Light-mode screenshots are the primary parity evidence.
- Dark-mode screenshots are clearly labeled as adaptation evidence.
- No first-run screenshot is dark unless Dark was explicitly selected.

### Phase 4 - Android WebView Theme Behavior

Goal: apply the same Light-first behavior in the Android APK/WebView.

Target files and areas:

- Shared web files from Phases 1 and 2.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/more/page.tsx`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/public/offline.html`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/public/manifest.webmanifest`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/android/app/src/main/res/values/styles.xml`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/android/app/src/main/AndroidManifest.xml`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/android/app/src/main/java/com/arunprakash/brain/MainActivity.java`

Tasks:

1. Confirm Android uses the shared web Settings page for the actual Light/Dark choice.
2. Confirm More route gives a clear path to Appearance/Settings.
3. Validate WebView cookie persistence:
   - fresh install or cleared app data opens Light;
   - choosing Dark persists across relaunch;
   - choosing Light persists across relaunch;
   - Android system dark mode does not override fresh Light default.
4. Audit `public/offline.html`:
   - remove automatic `prefers-color-scheme: dark` behavior or make the fallback explicitly Light-first;
   - if Dark fallback is retained, it must be based on explicit app preference, not OS preference.
5. Audit native Android theme:
   - avoid DayNight forcing native launch/shell dark appearance;
   - consider changing `Theme.AppCompat.DayNight.NoActionBar` to a light parent or explicitly disabling force-dark where supported;
   - set status/navigation/splash colors so launch does not flash dark before WebView loads.
6. Check Android WebView force-dark behavior:
   - if WebView auto-darkens CSS, disable force dark in native code or confirm it is not active;
   - document evidence.
7. If Android native files change, run Capacitor sync if required by the change.
8. If APK is rebuilt, bump Android version/code per the existing private sideload policy and build a debug APK using the existing debug keystore.

Exit criteria:

- Fresh Android install is Light even when Android OS is Dark.
- Android Settings exposes Light/Dark and persists selection.
- Android offline fallback does not surprise-open in Dark from OS preference.
- No launch/splash/status-bar dark flash is visible in normal Light-first flow.

### Phase 5 - Tests And Static Checks

Goal: catch regressions before browser/device QA.

Required checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Additional scans:

```bash
rg -n "prefers-color-scheme: dark|matchMedia\\(\\\"\\(prefers-color-scheme: dark\\)\\\"|\\bsystem\\b|System follows your OS preference" src public android
rg -n "brain-theme" src public android
rg -n "data-theme=|data-theme" src public
```

Expected scan outcomes:

- `prefers-color-scheme: dark` may remain only if documented and not used for first-run app theme.
- `system` may remain only in migration tests or explicit comments explaining legacy cookie behavior.
- `System follows your OS preference` must not remain in user-facing code.
- Dark token definitions may remain.

Exit criteria:

- Static checks pass.
- Scan output is reviewed and documented.
- Tests cover missing, light, dark, legacy system, and invalid cookie values.

### Phase 6 - Browser Validation Matrix

Goal: prove Web behavior in real browser states.

Required matrix:

| Case | Setup | Expected |
|---|---|---|
| Fresh browser | no `brain-theme` cookie, browser/OS light | Light |
| Fresh browser, OS dark | no `brain-theme` cookie, browser/OS dark | Light |
| Explicit Light | `brain-theme=light` | Light |
| Explicit Dark | `brain-theme=dark` | Dark |
| Legacy System | `brain-theme=system`, browser/OS dark | Light |
| Invalid cookie | `brain-theme=banana` | Light |
| Toggle Light to Dark | choose Dark in Settings | Dark immediately and after reload |
| Toggle Dark to Light | choose Light in Settings | Light immediately and after reload |
| First paint | no cookie | no visible Light-to-Dark or Dark-to-Light flicker |

Evidence required:

- Screenshot or video for first-run Light.
- Screenshot or video for Dark after explicit toggle.
- Browser console snippet or test output showing:
  - `document.documentElement.dataset.theme`;
  - `document.cookie` redacted to cookie name/value only;
  - `matchMedia("(prefers-color-scheme: dark)").matches` only as diagnostic evidence, not as app driver.

Exit criteria:

- Every matrix row passes.
- Failures are either fixed or marked no-go.

### Phase 7 - Android Validation Matrix

Goal: prove Android WebView follows the same Light-first contract.

Required matrix:

| Case | Setup | Expected |
|---|---|---|
| Fresh install | app installed, no prior app data | Light |
| Fresh install, Android OS dark | Android OS dark, no app data | Light |
| Toggle to Dark | Settings -> Dark | Dark immediately |
| Relaunch after Dark | close/reopen APK | Dark persists |
| Toggle back to Light | Settings -> Light | Light immediately |
| Relaunch after Light | close/reopen APK | Light persists |
| Offline fallback | server unreachable or `offline.html` loaded | Light-first fallback |
| Share entry | Android share into app | result flow follows current selected theme without forced system dark |
| Pairing/setup | unpaired or setup route | Light-first unless Dark previously selected |

Evidence required:

- Device/emulator screenshots for fresh Light and explicit Dark.
- Android log or QA note proving OS dark did not force app Dark.
- Relaunch persistence evidence.
- Offline fallback evidence.
- If APK changed, APK version/code, path, checksum, install result, and rollback note.

Exit criteria:

- Android has `Android authenticated route validated` evidence for changed protected Settings/More routes when possible.
- No Android completion claim is made from browser mobile screenshots alone.

### Phase 8 - Accessibility And Contrast

Goal: keep dark support safe while making Light the default.

Checks:

- Light and Dark text contrast at least 4.5:1 for normal text.
- Control boundaries at least 3:1 where required.
- Primary actions readable in both Light and Dark.
- Selected controls readable in both Light and Dark.
- Theme toggle:
  - 44px touch target on mobile/Android;
  - visible focus;
  - correct selected state;
  - screen-reader label;
  - no hover-only interaction.
- 200% zoom check on Settings and Library.
- Reduced-motion check for any theme transition, if transitions exist.

Exit criteria:

- Contrast tests pass.
- Manual accessibility notes are recorded.
- No P0/P1 accessibility issue remains.

### Phase 9 - Documentation, Release Notes, And Tracker Updates

Goal: make future agents understand the new theme contract.

Tasks:

1. Create `UX_v2/execution/LIGHT_FIRST_THEME_QA_REPORT_<timestamp>.md`.
2. Update project tracker if currently used for UX v2 execution.
3. Update running log at milestone completion if continuing broader execution.
4. Update any stale docs that claim System theme is default.
5. Add release notes:
   - AI Memory now opens Light-first on Web and Android.
   - Dark mode is available from Settings.
   - Existing automatic system theme behavior has been replaced by explicit choice.
6. If APK is rebuilt, add a private sideload note with version, checksum, install/rollback posture.

Exit criteria:

- QA report exists.
- Theme contract is documented.
- No stale "system follows OS" documentation remains in implementation docs or user-facing copy.

## Files Expected To Change

| File | Expected change |
|---|---|
| `src/lib/theme.ts` | Light/Dark resolver, remove or isolate System from public theme type, update comments. |
| `src/components/theme-bootstrap.tsx` | Remove automatic `prefers-color-scheme` behavior, default missing/legacy values to Light. |
| `src/app/layout.tsx` | Resolve no-cookie and legacy System to Light on SSR, update comments and `data-theme-pref` handling. |
| `src/components/theme-toggle.tsx` | Replace System/Light/Dark picker with Light/Dark toggle. |
| `src/app/settings/page.tsx` | Default Settings initial value to Light, update Appearance copy. |
| `src/styles/tokens.css` | Keep Light default and Dark explicit, fix stale comments. |
| `src/styles/tokens.contrast.test.ts` | Add resolver/default cases if appropriate, preserve Light/Dark contrast checks. |
| `src/app/more/page.tsx` | Ensure Android/mobile path to Appearance remains clear and touch-safe. |
| `public/offline.html` | Remove OS-driven dark fallback or make fallback explicitly Light-first. |
| `public/manifest.webmanifest` | Confirm colors are light-first and consistent with Magic Patterns. |
| `android/app/src/main/res/values/styles.xml` | Remove DayNight leakage or explicitly force light shell behavior if needed. |
| `android/app/src/main/AndroidManifest.xml` | Only change if theme, force-dark, or launch style requires manifest support. |
| `android/app/src/main/java/com/arunprakash/brain/MainActivity.java` | Only change if WebView force-dark must be disabled natively. |

## Acceptance Criteria

### Web

- A fresh browser session with no `brain-theme` cookie opens Library in Light.
- A fresh browser session with OS/browser Dark still opens Library in Light.
- `brain-theme=system` resolves to Light.
- `brain-theme=dark` opens Dark.
- Settings shows Light and Dark only.
- The Setting toggle persists after reload.
- Light-mode Library visually aligns to Magic Patterns as the parity baseline.
- Dark-mode Library remains usable and contrast-safe as an explicit adaptation.
- No first-paint theme flash is visible.

### Android

- Fresh install or cleared data opens Light.
- Android OS Dark does not force app Dark.
- Settings exposes Light/Dark and works inside the APK.
- Toggle selection persists across APK relaunch.
- Offline fallback is Light-first.
- Splash/status/navigation bars do not surprise-flash dark in Light-first flow.
- If APK is rebuilt, version/code is bumped and private sideload notes are produced.

### Shared

- Dark mode is not removed.
- Dark mode is not automatic.
- User-facing copy no longer says System follows OS preference.
- Light/Dark contrast gates pass.
- Side-by-side visual evidence distinguishes:
  - Magic Patterns Light reference;
  - production Web Light;
  - production Web Dark adaptation;
  - Android WebView Light;
  - Android WebView Dark adaptation.

## No-Go Gates

- No release if fresh Web opens Dark without explicit user choice.
- No release if fresh Android opens Dark without explicit user choice.
- No release if `brain-theme=system` still follows OS dark preference.
- No release if Settings still exposes System as an active choice.
- No release if Dark support is broken or unvalidated.
- No release if Android offline fallback still auto-darkens from OS preference.
- No release if stale comments still claim server-side system theme handling via a `theme` cookie.
- No release if Magic Patterns parity is judged against Dark screenshots.
- No Android UX completion claim without APK/WebView evidence.

## Rollback Plan

If theme changes break Web or Android:

1. Revert changed theme files only.
2. Preserve unrelated UX v2 work.
3. Restore previous `system` behavior only as a rollback, not as the accepted product direction.
4. Document rollback reason in QA report and running log.
5. If an APK was rebuilt, retain the prior APK path/checksum and reinstall it for rollback validation.

## Implementation Order

1. Phase 0 baseline.
2. Shared resolver and bootstrap changes.
3. Settings Light/Dark toggle.
4. Offline fallback and Android native shell audit.
5. Tests and static checks.
6. Browser QA.
7. Android APK/WebView QA.
8. Documentation and release notes.
9. Optional APK rebuild/version bump only if Android native files or packaged assets change.

## Final Notes

This plan intentionally preserves the PRD's dark-theme safety requirement while making the product light-first as approved. Light mode is the design truth because Magic Patterns is light-first. Dark mode is a supported explicit preference, not a first-run or OS-driven default.
