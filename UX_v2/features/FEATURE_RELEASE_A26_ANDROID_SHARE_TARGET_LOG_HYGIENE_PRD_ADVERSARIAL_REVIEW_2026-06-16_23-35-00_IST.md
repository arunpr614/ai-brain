# Feature Release A26 - Android Share Target Log Hygiene PRD Adversarial Review

Created: 2026-06-16 23:35:00 IST  
Reviewer stance: Brutally honest adversarial review  
Reviewed target: `FEATURE_RELEASE_A26_ANDROID_SHARE_TARGET_LOG_HYGIENE_PRD_V1_2026-06-16_23-34-00_IST.md`  
Report path: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A26_ANDROID_SHARE_TARGET_LOG_HYGIENE_PRD_ADVERSARIAL_REVIEW_2026-06-16_23-35-00_IST.md`

## Executive Verdict

Conditional-go. The PRD targets the right privacy failure, but it must require a deterministic patch check and distinguish plugin/app logs from unrelated Android framework 64-hex stack frames.

## Evidence Inspected

- A25 screenshot: `a25-url-share-failure-result.png`
- A25 logcat: `a25-url-share-logcat.raw.txt`
- `node_modules/@capgo/capacitor-share-target/android/src/main/java/app/capgo/sharetarget/CapacitorShareTargetPlugin.java`
- `scripts/build-apk.sh`
- `android/app/build.gradle`

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. v1 does not require verifying the patched Java source before Gradle

**Evidence:** The plugin is in `node_modules`; Gradle can compile stale or unpatched source if the patch script silently fails.  
**Why it matters:** The APK could still leak raw URLs even though the repository has a patch script.  
**Failure mode:** Build passes with unpatched `Log.d(TAG, "Share received: " + shareData.toString())`.  
**Recommendation:** PRD v2 must require the patch script to fail if the unsafe log remains after patching.

### P1 - High Risk

#### 1. 64-hex scan is too broad

**Evidence:** A25 logcat had 64-hex-looking `go/retraceme` frames from Launcher/Google components.  
**Why it matters:** A broad regex gate creates false blockers and hides the real privacy question.  
**Failure mode:** A clean app build fails because unrelated system stack frames contain hashes.  
**Recommendation:** Require global scans to report broad 64-hex occurrences, but gate only app/plugin lines containing `com.arunprakash.brain`, `Capacitor`, `CapacitorShareTarget`, `chromium`, or the fixture marker.

### P2 - Medium Risk

#### 1. Patch should be idempotent

**Evidence:** v1 says patch before Gradle, but not whether reruns should work.  
**Why it matters:** `npm run build:apk` runs repeatedly during release work.  
**Failure mode:** Second build fails because the exact unsafe string was already replaced.  
**Recommendation:** Patch script should accept already-patched source if the safe log is present and unsafe log is absent.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

It treats patching `node_modules` as enough. For a release gate, the build must actively prove the patch is present every time.

## Missing Validation

- Script-level before/after assertion.
- APK install metadata for `1.0.5/code6`.
- Focused app/plugin log scan.

## Revised Recommendations

- Make the patch script idempotent and fail-closed.
- Run it from `build-apk.sh`.
- Add a focused log scanner/manifest that distinguishes global framework hashes from app/plugin leaks.

## Go / No-Go Recommendation

Go only with those changes in PRD v2 and plan v2.

## Plan Revision Inputs

### Required Deletions

- Delete any claim that broad 64-hex in framework logs alone blocks release.

### Required Additions

- Fail-closed patch verification.
- Idempotence.
- Focused app/plugin leak scan.

### Required Acceptance Criteria Changes

- A26-F7 must gate app/plugin leaks, while reporting unrelated global hashes separately.

### Required Validation Changes

- Add install metadata and APK hash evidence for `1.0.5/code6`.

### Required No-Go Gates

- Unsafe plugin log string present after patch blocks APK build.
- Raw fixture URL in app/plugin log lines blocks Android publication.

## Residual Risks

Upstream plugin updates may change source layout; fail-closed behavior should make that visible.
