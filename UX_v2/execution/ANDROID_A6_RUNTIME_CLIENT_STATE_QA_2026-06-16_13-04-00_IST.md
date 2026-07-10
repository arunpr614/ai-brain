# Android A6 Runtime / Client State / APK Evidence QA

Created: 2026-06-16 13:04:00 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: A6 preflight completed; Android runtime and release remain blocked until device/emulator proof, fresh APK proof, live smoke, and deploy gates pass.

## Feature Cycle

| Artifact | Status |
| --- | --- |
| `UX_v2/features/FEATURE_ANDROID_A6_RUNTIME_CLIENT_STATE_PRD_V1_2026-06-16_12-58-00_IST.md` | Created |
| `UX_v2/features/FEATURE_ANDROID_A6_RUNTIME_CLIENT_STATE_PRD_ADVERSARIAL_REVIEW_2026-06-16_12-59-00_IST.md` | No-go review completed |
| `UX_v2/features/FEATURE_ANDROID_A6_RUNTIME_CLIENT_STATE_PRD_V2_2026-06-16_13-00-00_IST.md` | Revised product source |
| `UX_v2/features/FEATURE_ANDROID_A6_RUNTIME_CLIENT_STATE_IMPLEMENTATION_PLAN_V1_2026-06-16_13-01-00_IST.md` | Created |
| `UX_v2/features/FEATURE_ANDROID_A6_RUNTIME_CLIENT_STATE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_13-02-00_IST.md` | No-go review completed |
| `UX_v2/features/FEATURE_ANDROID_A6_RUNTIME_CLIENT_STATE_IMPLEMENTATION_PLAN_V2_2026-06-16_13-03-00_IST.md` | Revised execution source |

## Implementation Summary

- Added `scripts/ux-v2-android-a6-runtime-preflight.ts`, a read-only local evidence script.
- Generated `UX_v2/execution/ANDROID_A6_RUNTIME_CLIENT_STATE_PREFLIGHT_2026-06-16_13-04-00_IST.json`.
- Parsed Android Gradle metadata, Capacitor metadata, Android manifest support, offline fallback copy, service-worker cache policy, APK artifact presence, bounded Android tooling availability, and an evidence-label matrix.
- Did not intentionally change app routes, Android native configuration, `capacitor.config.ts`, `public/offline.html`, `public/sw.js`, APK files, or production deployment state.

## Preflight Result

| Field | Result |
| --- | --- |
| Statuses | `preflight_passed`, `runtime_blocked`, `release_blocked` |
| Android app ID | `com.arunprakash.brain` |
| Server URL | `https://brain.arunp.in` |
| Capacitor HTTP | Disabled |
| APK version | `brain-debug-v1.0.2-code3.apk` |
| Gradle APK output | Exists; SHA-256 `4d37853615c3b4aee26ab6827dc884a2a0eef77e2e1a30a4737c945b0b678245`; stale or unproven |
| Published APK artifact | Exists; SHA-256 `6ac0bad378c3b214c1b3d32517be685ed1e079054c41fff371fe65fbc6e1753f`; stale or unproven |
| `adb` | Not found in PATH or bounded SDK locations |
| Android SDK roots checked | `$ANDROID_HOME`, `$ANDROID_SDK_ROOT`, `~/Library/Android/sdk`, `/opt/android-sdk`, `/usr/local/share/android-sdk` |
| Java | Found on PATH as OpenJDK 17; APK build script still requires Java 21 for real APK rebuild |
| Direct VIEW `/setup-apk` | Not supported by manifest |

## Runtime Blockers

- `adb` was not found, so no device or emulator runtime was inspected.
- No fresh A6 APK build was run; existing APK artifacts predate the current UX v2 execution evidence.
- Android direct VIEW launch into `/setup-apk` is not supported by the manifest.

## Static Evidence Confirmed

| Area | Finding |
| --- | --- |
| Manifest | Launcher, text share, single-PDF share, multi-PDF share, Internet permission, and optional camera permission are present. |
| Manifest | No VIEW intent filter exists for `/setup-apk`; do not claim deep-link pairing support. |
| Offline page | Server-required fallback, no offline queue copy, retry health probe, and production-origin mapping are present. |
| Service worker | `/offline.html` is precached; `/api/`, `/unlock`, and `/setup-apk` are network-only; local-dev bypass and legacy cache cleanup are present. |
| Evidence labels | A1-A5 routes remain labelled `Browser mobile only`; native share, token persistence, WebView asset pickup, offline launch, and stale-cache recovery remain runtime blocked or preflight-only. |

## Validation

| Gate | Result |
| --- | --- |
| `node --import tsx scripts/ux-v2-android-a6-runtime-preflight.ts` | Passed; JSON report generated |
| No-behavior-change audit | Passed for A6 intent: only A6 script/docs/evidence were added; no app/native/public behavior was intentionally changed in this slice |
| `git diff --check` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with existing unrelated warning in `src/lib/queue/enrichment-batch-cron.ts` |
| `npm test` | Passed: 549 tests, 77 suites |
| `npm run build` | Passed with known `unpdf` warning |

## Release Status

- A6 is complete as a preflight evidence gate.
- Android runtime validation is not complete.
- Android APK release is not complete.
- Production deployment is not complete.
- The next release-capable Android step requires Android tooling plus a device/emulator, then a fresh local-only APK build or version-bumped APK publication, install/relaunch proof, WebView asset pickup proof, stale-cache/offline proof, native share proof, pairing token persistence proof, and live postdeploy smoke.
