# Feature Android A6 Runtime Client State PRD - Adversarial Review

**Created:** 2026-06-16 12:59:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A6_RUNTIME_CLIENT_STATE_PRD_V1_2026-06-16_12-58-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A6_RUNTIME_CLIENT_STATE_PRD_ADVERSARIAL_REVIEW_2026-06-16_12-59-00_IST.md`

## Executive Verdict

Conditional no-go for execution until the PRD tightens stale-artifact handling and clarifies that preflight success is not runtime validation. The PRD correctly names the evidence gap, but it can still create false confidence by allowing an exit-0 report to look like a passed Android gate when `adb` is absent and the APK artifact predates current UX changes.

## Evidence Inspected

- A6 PRD v1 target file.
- `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md` phases 11, 13, and 14.
- `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md` Android evidence labels and release gates.
- `android/app/build.gradle` lines 4-11 and output naming lines 45-48.
- `android/app/src/main/AndroidManifest.xml` lines 20-62 and 81-89.
- `capacitor.config.ts` app/server configuration.
- Local command evidence: `adb` not found on PATH; existing `android/app/build/outputs/apk/debug/brain-debug-v1.0.2-code3.apk` exists with modified time from 2026-06-14.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Exit-0 blocked preflight can be misread as a passed Android gate

**Evidence:** A6-R7 requires recording blockers, while Acceptance Criteria #1 says the preflight exits 0 even when runtime validation is blocked.
**Why it matters:** CI or future agents may treat a green command as Android evidence, even though the core device proof is missing.
**Failure mode:** Release notes say "A6 preflight passed" and quietly omit that no APK was installed/opened, no session persisted, and no native share path ran.
**Recommendation:** PRD v2 must define separate statuses: `preflight_passed`, `runtime_blocked`, `runtime_passed`, and `release_blocked`. Exit 0 is allowed only for report generation, never for release readiness.

#### 2. Stale APK artifact handling is too weak

**Evidence:** The local APK output exists from 2026-06-14, while A1-A5 changes were made on 2026-06-16. PRD v1 says detect artifact state but does not require comparing artifact age/current worktree state or current build status.
**Why it matters:** An existing APK proves only that some prior artifact was built, not that current UX changes are in an installable shell.
**Failure mode:** The project records APK metadata and checksum, then later assumes A1-A5 are included in that APK.
**Recommendation:** PRD v2 must require classifying APK artifacts as `current`, `stale_or_unproven`, or `missing`, and current status must require a fresh `npm run build:apk` or a documented reason it was not run.

### P1 - High Risk

#### 1. Service worker/cache checks can be superficial

**Evidence:** The PRD asks to inspect `public/sw.js`, but not to prove cache version names, network-only auth/setup routes, local-dev bypass, and offline fallback routing are mutually consistent.
**Why it matters:** Stale WebView asset risk is one of the release blockers in the Android PRD. A text scan can miss a dangerous cache rule.
**Failure mode:** Preflight passes because strings exist, while SW still caches protected routes or setup routes incorrectly.
**Recommendation:** Add structured assertions for cache names, known cache cleanup, `/setup-apk` and `/unlock` network-only behavior, `/offline.html` precache, and no legacy user-facing offline read/sync claim.

#### 2. Direct VIEW intent must be a negative finding, not an ambiguous row

**Evidence:** Manifest inspection shows launcher and share filters, but no VIEW intent filter for `/setup-apk`. A5 explicitly left direct VIEW intent deferred.
**Why it matters:** Direct setup links are listed in prior plans; ambiguity invites overclaiming.
**Failure mode:** A future release summary says direct `/setup-apk` is covered by A6 because the manifest was inspected.
**Recommendation:** PRD v2 must require the preflight to mark direct VIEW intent `not_supported_by_manifest` unless a matching `android.intent.action.VIEW` filter is present and tested.

### P2 - Medium Risk

#### 1. Evidence label matrix is underspecified

**Evidence:** A6-R6 says assign evidence labels for A1-A5 changed screens, but does not name the routes/states that must be labeled.
**Why it matters:** Missing a route can make the matrix look complete while leaving a changed protected screen unlabeled.
**Failure mode:** `/topics/[slug]` or `/collections/[id]` remains browser-only but is omitted from the table.
**Recommendation:** PRD v2 must list all routes/native paths to label: Library, Ask, Capture, Share Result, Item Detail, Needs Upgrade, More, Topic, Collection, setup/unlock/setup-apk, offline fallback, native share, pairing token, WebView asset pickup.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

- It treats a generated preflight report as too close to a validation pass.
- It does not force a fresh/current APK build distinction.
- It leaves direct VIEW intent wording ambiguous.

## Missing Validation

- Fresh APK build attempt or explicit same-version artifact blocker.
- Device/emulator install/open/relaunch evidence.
- Native share URL/note/PDF and pairing-token persistence evidence.
- Stale-cache recovery evidence after deploy.

## Revised Recommendations

1. Add explicit A6 statuses and release-blocking meaning.
2. Classify APK artifacts by freshness/current-build proof.
3. Add structured SW/offline assertions.
4. Mark direct VIEW setup intent unsupported unless manifest and runtime proof exist.
5. Enumerate the evidence-label route/native-path matrix.

## Go / No-Go Recommendation

No-go for A6 execution until PRD v2 applies the above. Conditional go after v2 if the implementation remains an evidence preflight and does not claim Android runtime completion without `adb`/device evidence.

## Plan Revision Inputs

### Required Deletions

- Delete any wording that lets "preflight passed" imply Android runtime validation.

### Required Additions

- Add statuses: `preflight_passed`, `runtime_blocked`, `runtime_passed`, `release_blocked`.
- Add APK freshness classification.
- Add direct VIEW unsupported classification.
- Add explicit evidence-label matrix scope.

### Required Acceptance Criteria Changes

- Acceptance must require a machine-readable `releaseBlocked: true` when runtime evidence is absent.
- Acceptance must require stale APK artifacts to block current APK evidence claims.

### Required Validation Changes

- Add structured service-worker/offline assertions.
- Add Android tooling discovery and blocked-reason output.

### Required No-Go Gates

- No Android-complete claim while `runtime_blocked`.
- No APK-current claim without fresh build or same-version rebuild rationale.
- No direct VIEW claim without manifest and runtime proof.

## Residual Risks

Even with a strong preflight, Android runtime validation remains unproven until `adb`/emulator/physical-device access is available and a post-deploy WebView run is captured.
