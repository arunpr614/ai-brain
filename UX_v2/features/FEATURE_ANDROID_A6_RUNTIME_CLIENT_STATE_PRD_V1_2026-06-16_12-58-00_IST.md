# Feature Android A6 Runtime, Client State, And APK Evidence PRD V1

Timestamp: 2026-06-16 12:58:00 IST
Owner: Main Codex execution agent
Parent plans:
- `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
- `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
- `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md`

## Problem

Android A1 through A5 have local browser-mobile evidence, but the Android revised PRD and plan explicitly forbid claiming Android completion from browser screenshots. The project now needs a runtime evidence slice that distinguishes what can be proven locally from what requires Android SDK/device tooling, deployed assets, or a physical/emulator run.

## Source Truth

| Source | A6 interpretation |
| --- | --- |
| Android revised PRD evidence levels | Use exact labels: Browser mobile only, Android shell loaded deployed assets, Android unauthenticated route validated, Android authenticated route validated, Android native entry path validated. |
| Android revised implementation plan phases 11, 13, 14 | Validate client state, service worker/cache freshness, APK install/open/relaunch, authenticated protected routes, native share/pairing/offline paths, backup/rollback/deploy gates. |
| Current local environment | `adb` is not on `PATH`; no runtime APK route validation can be claimed until tooling/device access exists. Existing APK output is present but stale relative to current UX changes unless rebuilt. |

## Goals

1. Add a repeatable Android runtime preflight that records APK metadata, Capacitor config, manifest native entry support, service-worker/offline fallback facts, local build artifact state, Android tool availability, and device/emulator availability.
2. Make Android evidence labels machine-readable and visible in QA/tracker artifacts.
3. Prevent release summaries from accidentally upgrading browser evidence to Android runtime evidence.
4. Provide exact next commands and blockers for running device validation when `adb`/emulator access is available.

## Non-Goals

- Do not change Android package identity, native manifest, signing, or versioning in this slice.
- Do not publish a new APK.
- Do not deploy production web assets.
- Do not claim Android authenticated route validation, native share validation, pairing-token persistence, direct VIEW intent support, or stale-cache recovery unless current evidence proves it.
- Do not log Android device serials, session cookies, bearer tokens, pairing codes, or private content.

## Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| A6-R1 | Preflight must parse Android package/version metadata from `android/app/build.gradle` and package identity from Capacitor config. | P0 |
| A6-R2 | Preflight must detect the expected debug APK path, artifact path, file size, modified time, and SHA-256 if present. | P0 |
| A6-R3 | Preflight must identify whether `adb` and emulator tooling are available, and if `adb` exists, count connected devices without exposing raw serials. | P0 |
| A6-R4 | Preflight must inspect AndroidManifest support for launcher, share URL/text, share PDF, multi-PDF, and direct VIEW setup intent. | P0 |
| A6-R5 | Preflight must inspect `public/offline.html` and `public/sw.js` for server-required fallback, no offline-queue claim, service worker cache names, network-only auth/setup routes, and production origin mapping. | P0 |
| A6-R6 | QA report must assign evidence labels for A1-A5 changed screens and native paths based on current proof, not desired proof. | P0 |
| A6-R7 | If Android tooling/device proof is unavailable, QA must record the exact blocker and keep Android-complete/release claims blocked. | P0 |
| A6-R8 | Validation must include static gates already used in A5 plus the A6 preflight. | P1 |

## Acceptance Criteria

1. `node --import tsx scripts/ux-v2-android-a6-runtime-preflight.ts` writes a JSON report under the A6 evidence folder and exits 0 even when runtime validation is blocked, as long as the blocker is explicit.
2. The JSON report contains no raw device serials, session cookies, bearer tokens, pairing codes, or private content.
3. A6 QA markdown records:
   - APK metadata and artifact state.
   - Android tooling status.
   - Manifest native entry support.
   - Offline/service-worker facts.
   - Evidence labels for changed routes and native paths.
   - Release blockers.
4. Project tracker records A6 as an evidence-gate/preflight completion, not Android runtime completion if device proof is absent.
5. Static validation and build remain green.

## Risks

| Risk | Mitigation |
| --- | --- |
| Preflight becomes a paperwork substitute for real APK validation | Report must explicitly label runtime proof as blocked when `adb`/device evidence is missing. |
| Existing APK artifact is mistaken for current build | Compare artifact metadata and state that stale artifacts do not prove current UX changes. |
| Device identifiers leak in reports | Hash/fingerprint or count devices only; never write raw serials. |
| Direct VIEW intent overclaimed | Manifest inspection must distinguish absent VIEW filters from tested intent behavior. |

## Evidence Limits

This slice can close the local evidence-gate preflight. It cannot by itself close Android authenticated route validation, Android native entry path validation, deployed WebView asset pickup, production tunnel reachability, or production release.
