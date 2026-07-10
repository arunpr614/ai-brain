# Feature Android A6 Runtime, Client State, And APK Evidence PRD V2

Timestamp: 2026-06-16 13:00:00 IST
Owner: Main Codex execution agent
Status: Approved for implementation after adversarial review
Supersedes: `FEATURE_ANDROID_A6_RUNTIME_CLIENT_STATE_PRD_V1_2026-06-16_12-58-00_IST.md`

## Problem

Android A1 through A5 have local browser-mobile evidence, but the Android revised PRD and plan explicitly forbid claiming Android completion from browser screenshots. The project now needs a runtime evidence slice that distinguishes preflight facts from actual Android runtime proof and keeps release blocked while device/emulator evidence is absent.

## Source Truth

| Source | A6 interpretation |
| --- | --- |
| Android revised PRD evidence levels | Use exact labels: Browser mobile only, Android shell loaded deployed assets, Android unauthenticated route validated, Android authenticated route validated, Android native entry path validated. |
| Android revised implementation plan phases 11, 13, 14 | Validate client state, service worker/cache freshness, APK install/open/relaunch, authenticated protected routes, native share/pairing/offline paths, backup/rollback/deploy gates. |
| Current local environment | `adb` is not on `PATH`; no runtime APK route validation can be claimed until tooling/device access exists. Existing APK output is present but predates current UX changes unless rebuilt. |

## Goals

1. Add a repeatable Android runtime preflight that records APK metadata, Capacitor config, manifest native entry support, service-worker/offline fallback facts, local build artifact state, Android tool availability, and device/emulator availability.
2. Make Android evidence labels machine-readable and visible in QA/tracker artifacts.
3. Prevent release summaries from accidentally upgrading browser evidence to Android runtime evidence.
4. Provide exact next commands and blockers for running device validation when `adb`/emulator access is available.

## Status Model

| Status | Meaning | Release meaning |
| --- | --- | --- |
| `preflight_passed` | The local evidence report was generated and static checks completed. | Does not prove Android runtime behavior. |
| `runtime_blocked` | Device/emulator validation could not run because tooling, device, deploy, or auth evidence is missing. | Android-complete and release remain blocked. |
| `runtime_passed` | APK install/open/relaunch, protected routes, and native paths passed with redacted evidence. | Eligible for Android runtime gate if other release gates pass. |
| `release_blocked` | Any no-go release condition remains true. | No deploy/release claim. |

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
| A6-R3 | Preflight must classify APK artifacts as `current`, `stale_or_unproven`, or `missing`; `current` requires a fresh build attempt or explicit same-version rebuild rationale. | P0 |
| A6-R4 | Preflight must identify whether `adb` and emulator tooling are available, and if `adb` exists, count connected devices without exposing raw serials. | P0 |
| A6-R5 | Preflight must inspect AndroidManifest support for launcher, share URL/text, share PDF, multi-PDF, and direct VIEW setup intent. Direct VIEW must be `not_supported_by_manifest` unless a VIEW filter exists. | P0 |
| A6-R6 | Preflight must inspect `public/offline.html` and `public/sw.js` for server-required fallback, no offline-queue/read/sync claim, service worker cache names, known-cache cleanup, `/offline.html` precache, `/setup-apk` and `/unlock` network-only behavior, and production origin mapping. | P0 |
| A6-R7 | QA report must assign evidence labels for Library, Ask, Capture, Share Result, Item Detail, Needs Upgrade, More, Topic, Collection, setup/unlock/setup-apk, offline fallback, native share, pairing token, and WebView asset pickup. | P0 |
| A6-R8 | If Android tooling/device proof is unavailable, QA must record the exact blocker and set `releaseBlocked: true`. | P0 |
| A6-R9 | Validation must include static gates already used in A5 plus the A6 preflight. | P1 |

## Acceptance Criteria

1. `node --import tsx scripts/ux-v2-android-a6-runtime-preflight.ts` writes a JSON report under the A6 evidence folder and exits 0 when the report is generated, even if runtime validation is blocked.
2. The JSON report includes `statuses`, `releaseBlocked`, `runtimeBlockedReasons`, `apkFreshness`, Android tooling status, manifest support, offline/service-worker assertions, and route/native evidence labels.
3. The JSON report contains no raw device serials, session cookies, bearer tokens, pairing codes, or private content.
4. A6 QA markdown records:
   - APK metadata and artifact state.
   - Android tooling status.
   - Manifest native entry support.
   - Offline/service-worker facts.
   - Evidence labels for changed routes and native paths.
   - Release blockers.
5. Project tracker records A6 as an evidence-gate/preflight completion, not Android runtime completion if device proof is absent.
6. Static validation and build remain green.

## Risks

| Risk | Mitigation |
| --- | --- |
| Preflight becomes a paperwork substitute for real APK validation | Report must set `runtime_blocked` and `releaseBlocked: true` when `adb`/device evidence is missing. |
| Existing APK artifact is mistaken for current build | `apkFreshness` must be `stale_or_unproven` unless a fresh build is run or explicitly justified. |
| Device identifiers leak in reports | Hash/fingerprint or count devices only; never write raw serials. |
| Direct VIEW intent overclaimed | Manifest inspection must mark direct VIEW `not_supported_by_manifest` unless a matching filter exists and runtime proof is later captured. |

## Evidence Limits

This slice can close the local evidence-gate preflight. It cannot by itself close Android authenticated route validation, Android native entry path validation, deployed WebView asset pickup, production tunnel reachability, stale-cache recovery after deploy, or production release.
