# Feature PRD v1: Android Light-First WebView, Native Shell, and Offline Fallback

**Created:** 2026-06-17 14:25:28 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch observed:** `codex/ai-brain-ux-v2-execution`
**Feature owner:** PM sub-agent draft for Arun/Main Codex review
**Status:** Draft for adversarial review
**Recommended launch tier:** Tier 4 equivalent - private/internal Android UX reliability improvement.
**Related plan:** `UX_v2/execution/WEB_ANDROID_LIGHT_FIRST_THEME_IMPLEMENTATION_PLAN_2026-06-17_08-31-22_IST.md`

## 1. Purpose

Ensure Android respects the Light-first theme contract end to end: WebView first run, Android system dark mode, native launch/splash/shell behavior, offline fallback, Settings toggle persistence, share entry, pairing/setup, and relaunch.

This PRD exists because the Android APK is a thin WebView shell loading live web assets, and Android can still leak dark appearance through native theme parents, WebView force-dark behavior, or the bundled `offline.html` fallback even after the web resolver is fixed.

## 2. Source Evidence

| Source | Evidence used |
| --- | --- |
| Light-first plan | Requires Android fresh install to open Light, Android OS dark not to force Dark, offline fallback Light-first, and native shell dark leakage audit. |
| Capacitor config | `capacitor.config.ts` uses live `https://brain.arunp.in`, `webDir: "public"`, and `server.errorPath: "offline.html"`. |
| Current offline fallback | `public/offline.html` uses `color-scheme: light dark` and `@media (prefers-color-scheme: dark)` to auto-darken. |
| Current native styles | `android/app/src/main/res/values/styles.xml` uses `Theme.AppCompat.DayNight.NoActionBar` for `AppTheme.NoActionBar`. |
| Current manifest | `AndroidManifest.xml` config includes `uiMode` changes and launch/share entry points. |
| Running log A34 | Android `1.0.6/code7` private sideload debug APK exists locally and predates compact-card work; public/store distribution is not authorized. |

## 3. User Outcomes

| User outcome | Required behavior |
| --- | --- |
| Fresh APK opens predictably | New install or cleared data opens Light even if Android OS is Dark. |
| Launch does not flash dark | Splash/status/navigation/native shell do not visibly surprise-flash dark during normal Light-first launch. |
| Offline fallback is consistent | Server-unreachable fallback opens Light-first rather than following Android OS dark preference. |
| Explicit Dark still works | Choosing Dark in Settings applies in Android WebView and persists across relaunch. |
| Entry paths are coherent | Share entry, pairing/setup, unpaired state, and authenticated routes follow current explicit theme, not OS default. |

## 4. Product Decisions

| Decision ID | Decision | Status |
| --- | --- | --- |
| ALF-001 | Android fresh install is Light. | Approved. |
| ALF-002 | Android OS dark mode does not drive app theme. | Approved. |
| ALF-003 | Offline fallback is Light-first. | Required. |
| ALF-004 | Native shell/splash/status/nav colors are audited for dark leakage. | Required. |
| ALF-005 | APK/WebView evidence is mandatory for Android completion. | Required. |
| ALF-006 | Public/store release remains out of scope. | Required by running-log release posture. |

## 5. Functional Requirements

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| ALF-R1 | Fresh Android WebView opens Light. | P0 | Fresh install or cleared app data opens authenticated app routes in Light when no explicit Dark preference exists. |
| ALF-R2 | Android OS dark does not override. | P0 | With Android OS set to Dark and no app cookie/preference, app remains Light before and after WebView hydration. |
| ALF-R3 | Android Settings toggles theme. | P0 | Settings Light/Dark control works in the APK and persists across app relaunch. |
| ALF-R4 | Offline fallback is Light-first. | P0 | `offline.html` no longer auto-darkens from `prefers-color-scheme: dark`; server-unreachable fallback shows Light unless an explicit app preference can safely drive otherwise. |
| ALF-R5 | Native launch/shell avoids dark leakage. | P0 | Splash, status bar, navigation bar, and native base theme do not visibly open dark in normal Light-first flow. |
| ALF-R6 | WebView force-dark is audited. | P0 | QA confirms WebView does not auto-darken CSS, or native code disables force dark with documented evidence. |
| ALF-R7 | Android entry paths follow explicit theme. | P1 | Share entry, setup/pairing, unlock, More, Library, and item detail follow Light by default and Dark only after explicit selection. |
| ALF-R8 | APK version policy is respected. | P0 if APK shared | If a fresh APK is built for Arun, version/code is bumped before sharing and artifact path/checksum/install notes are recorded. |
| ALF-R9 | Public release remains blocked. | P0 | No Play Store, public upload, release signing, AAB, GitHub Release, or external distribution occurs in this slice. |

## 6. Non-Goals

- No new Android-native theme settings screen.
- No OS/system-following preference.
- No static bundled full app; the APK remains a thin WebView shell.
- No offline queue, sync, capture retry queue, or offline Ask.
- No public/store distribution, release signing, or AAB generation.
- No redesign of Android screens beyond theme leakage fixes required by this PRD.
- No QR/camera pairing changes.

## 7. Dependencies

| Dependency | Why it matters |
| --- | --- |
| Web/Android light-first theme contract PRD | Shared web resolver must be correct before Android can be validated. |
| Settings Light/Dark toggle PRD | Android user needs explicit Dark/Light control. |
| `public/offline.html` | Bundled Capacitor fallback currently follows OS dark. |
| `android/app/src/main/res/values/styles.xml` | Native theme currently uses a DayNight parent for NoActionBar. |
| `android/app/src/main/AndroidManifest.xml` | Launch/share activity and theme wiring may need audit. |
| `android/app/src/main/java/com/arunprakash/brain/MainActivity.java` | May need WebView force-dark disablement if audit shows auto-darkening. |
| Emulator/device access | Required for screenshots, relaunch, OS-dark, and offline fallback validation. |
| APK build pipeline | Required only if native/offline packaged changes need a new installable artifact. |

## 8. Edge Cases

- Fresh install with Android OS dark and no prior app data.
- Cleared app data with Android OS dark.
- User toggles Dark, kills app, relaunches, then toggles Light and relaunches again.
- Server unreachable on first launch loads `offline.html`.
- Share into app while the live server is reachable and while theme is Dark.
- Share into app while server is unreachable and fallback appears.
- Unpaired/setup route before authenticated session.
- Android WebView reload after a live web deploy updates assets while existing APK remains installed.
- Android status/navigation bars should not become unreadable in Dark explicit mode.

## 9. Telemetry, Observability, and QA Expectations

No new product analytics are required. Android QA must include direct device/emulator evidence.

Required QA:

| Gate | Required evidence |
| --- | --- |
| Device/emulator matrix | Fresh install Light, fresh install with OS dark Light, toggle Dark, relaunch Dark, toggle Light, relaunch Light. |
| Offline fallback | Screenshot or video of bundled fallback showing Light-first behavior while server is unreachable or `offline.html` is loaded directly in APK context. |
| Native shell | Screenshot/video notes for launch/splash/status/navigation bars showing no unexpected dark flash in Light-first flow. |
| Force-dark audit | Log/code evidence that WebView force-dark is not active or is disabled. |
| Entry paths | Share entry, pairing/setup, More/Appearance, and Library validated where tool access allows; any unvalidated protected route is named as residual risk. |
| APK metadata | If APK is rebuilt/shared: versionName, versionCode, artifact path, SHA-256, size, install result, and rollback/fresh-install posture. |
| Logs | Android logs reviewed for fresh theme-related errors without leaking tokens/PINs/cookies. |

## 10. Rollout and Release Criteria

This feature should be sequenced after the shared web resolver and Settings toggle. Android validation cannot pass if Web first-run behavior is still OS-driven.

Local completion requires:

1. PRD review complete and P0/P1 issues resolved or accepted.
2. Shared theme contract and Settings toggle work in browser.
3. Android OS dark no longer drives fresh app theme.
4. Offline fallback is Light-first.
5. Native shell/WebView force-dark audit is complete.
6. Android device/emulator evidence exists.

Private APK sharing requires:

1. Native/offline packaged changes are built into a fresh APK.
2. Version/code is bumped from the current known `1.0.6/code7` if no other version has advanced.
3. Install notes and checksum are created.
4. Arun has requested or accepted a fresh private sideload artifact.

## 11. No-Go Conditions

- Fresh Android install opens Dark because Android OS is dark.
- Offline fallback auto-darkens from OS preference.
- Settings toggle works in browser but not Android.
- Android relaunch loses explicit Dark/Light preference.
- Native launch or status/nav bars visibly flash dark in normal Light-first flow without documented acceptance.
- Android completion is claimed from browser mobile screenshots only.
- A new APK is shared without version bump and checksum/install notes.
- Public/store distribution is attempted in this slice.

## 12. Open Questions for Review

1. Should `AppTheme.NoActionBar` move from `Theme.AppCompat.DayNight.NoActionBar` to an explicit light parent?
2. Should explicit Dark affect Android status/navigation bars, or should native chrome stay light for now?
3. What is the minimum acceptable fallback evidence if emulator/device automation cannot force server-unreachable state reliably?
4. Should the offline fallback ever honor explicit app Dark, or is Light-only fallback preferable for safety?
