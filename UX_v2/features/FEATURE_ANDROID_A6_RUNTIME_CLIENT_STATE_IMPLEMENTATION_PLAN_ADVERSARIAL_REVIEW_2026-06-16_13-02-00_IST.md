# Feature Android A6 Runtime Client State Implementation Plan - Adversarial Review

**Created:** 2026-06-16 13:02:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A6_RUNTIME_CLIENT_STATE_IMPLEMENTATION_PLAN_V1_2026-06-16_13-01-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A6_RUNTIME_CLIENT_STATE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_13-02-00_IST.md`

## Executive Verdict

Conditional no-go until the implementation plan fixes artifact naming, adds strict no-app-behavior-change verification, and defines what happens if `npm run build:apk` is attempted but blocked by same-version artifact publication. The plan is appropriately scoped as preflight-only, but needs sharper validation so it cannot mutate Android assets or confuse stale APK output with current runtime evidence.

## Evidence Inspected

- A6 implementation plan v1.
- A6 PRD v2.
- `scripts/build-apk.sh` same-version artifact publication guard.
- Current local evidence: `adb` missing on PATH, existing APK output from 2026-06-14, A1-A5 current worktree changes from 2026-06-16.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Evidence filename typo will fragment the audit trail

**Evidence:** Plan v1 names `ANDROID_A6_RUNTIME_CLIENT_STATE_PRELIGHT_2026-06-16_13-04-00_IST.json` instead of `PREFLIGHT`.
**Why it matters:** The project already depends on timestamped artifact paths. A typo creates search misses and weakens handoff reliability.
**Failure mode:** QA docs link one path, scripts write another, future agents believe evidence is missing.
**Recommendation:** Plan v2 must standardize `ANDROID_A6_RUNTIME_CLIENT_STATE_PREFLIGHT_2026-06-16_13-04-00_IST.json`.

#### 2. Plan does not prevent accidental Android asset mutation

**Evidence:** Scope says no app behavior should change, but validation does not require checking that only script/docs changed.
**Why it matters:** A preflight slice should not alter manifest, Gradle config, Capacitor config, SW, offline fallback, or APK assets.
**Failure mode:** A future "preflight" patch accidentally changes native metadata or cache rules and then only reports facts about the changed files.
**Recommendation:** Plan v2 must add a no-behavior-change diff audit covering `android/`, `capacitor.config.ts`, `public/offline.html`, `public/sw.js`, and app source files.

### P1 - High Risk

#### 1. APK build strategy is absent

**Evidence:** Plan v1 records stale artifact state but does not decide whether to run `npm run build:apk`. `scripts/build-apk.sh` can fail at artifact publication if `data/artifacts/brain-debug-v1.0.2-code3.apk` already exists unless `ALLOW_REBUILD_SAME_APK_VERSION=1` is set.
**Why it matters:** A6 cannot classify artifacts as current without a build attempt or explicit rationale.
**Failure mode:** The preflight records stale APK but skips the build, leaving no next command for closing the gap.
**Recommendation:** Plan v2 should run `npm run build:apk` only if the goal is current APK artifact validation, or explicitly defer it and record the same-version guard. If run locally, use `ALLOW_REBUILD_SAME_APK_VERSION=1` only as local validation and avoid publishing a new shared artifact.

#### 2. Tool discovery should be bounded and deterministic

**Evidence:** A broad home-directory `find` already ran too long and was interrupted.
**Why it matters:** The A6 script must be fast and repeatable.
**Failure mode:** Preflight hangs searching cloud-synced folders.
**Recommendation:** Search only PATH and known SDK paths: `$ANDROID_HOME`, `$ANDROID_SDK_ROOT`, `~/Library/Android/sdk`, `/opt/android-sdk`, and `/usr/local/share/android-sdk`.

### P2 - Medium Risk

#### 1. QA update target is incomplete

**Evidence:** Plan v1 says update `testing_qa_readiness_tracker.md` "if useful" but not the CSV sibling.
**Why it matters:** The tracker package has markdown/CSV pairs; editing only one can create parity drift.
**Failure mode:** PM tracker says A6 is updated, but CSV still says not verified with no new blocker.
**Recommendation:** Plan v2 should either update both markdown and CSV, or leave both untouched and record A6 status in the timestamped PM tracker only.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

- It has a path typo in the primary JSON artifact.
- It lacks a no-behavior-change guard for a preflight-only slice.
- It leaves APK build/currentness strategy implicit.

## Missing Validation

- Diff audit proving no runtime behavior files changed.
- Bounded Android SDK/tool discovery.
- Explicit handling of `npm run build:apk` same-version artifact guard.

## Revised Recommendations

1. Fix the preflight artifact filename.
2. Add no-behavior-change diff audit.
3. Keep tool discovery bounded.
4. Explicitly document no APK build in A6 unless separately chosen, and record the exact future command for local-only rebuild.
5. Update tracker docs consistently.

## Go / No-Go Recommendation

No-go for execution until plan v2 applies these corrections. Conditional go after v2 because the slice is documentation/script evidence and does not alter production behavior.

## Plan Revision Inputs

### Required Deletions

- Delete `PRELIGHT` typo.
- Delete "if useful" ambiguity for tracker parity.

### Required Additions

- No-behavior-change diff audit.
- Bounded SDK path search.
- APK build strategy and same-version guard note.

### Required Acceptance Criteria Changes

- Preflight JSON path must be exact and linked by QA.
- QA must state no app behavior files were intentionally changed by A6.

### Required Validation Changes

- Add `git diff -- android capacitor.config.ts public/offline.html public/sw.js src` audit or equivalent status summary.

### Required No-Go Gates

- No current APK claim without fresh build/current artifact evidence.
- No runtime claim without `adb`/device evidence.

## Residual Risks

The preflight can only prepare and block correctly; it still cannot satisfy actual Android runtime validation without installed tooling and a connected emulator/device.
