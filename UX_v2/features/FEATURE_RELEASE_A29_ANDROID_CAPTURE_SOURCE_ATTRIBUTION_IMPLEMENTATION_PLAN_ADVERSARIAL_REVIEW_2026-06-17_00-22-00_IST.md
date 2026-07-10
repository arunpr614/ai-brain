# Feature Release A29 Android Capture Source Attribution Implementation Plan - Adversarial Review

Created: 2026-06-17 00:22:00 IST
Reviewer stance: Brutally honest adversarial review
Reviewed target: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_IMPLEMENTATION_PLAN_V1_2026-06-17_00-21-00_IST.md`
Report path: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_00-22-00_IST.md`

## Executive Verdict

Conditional go after revision. The plan is narrow and feasible, but it underplays the risk of adding tests in a component file and does not explicitly require APK/build-source freshness after deploy.

## Evidence Inspected

- A29 PRD v2.
- A29 implementation plan v1.
- `src/components/share-handler.tsx`
- A28 native proof evidence: saved UI, production row with `capture_source=unknown`, cleanup zero counts.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Test placement can accidentally pull browser-only code into Node tests

Evidence: `share-handler.tsx` imports `next/navigation`, dynamic Capacitor modules, and browser APIs.

Why it matters: A simple helper test can become unstable if it imports the full component module in Node.

Failure mode: Tests require heavy mocking or fail due browser-only runtime, delaying a tiny fix.

Recommendation: Plan v2 should place the helper in a small non-React module such as `src/lib/android-share/request.ts` and test that module.

#### 2. Production rerun must avoid stale WebView state

Evidence: The APK loads live production JS, but WebView/service-worker caching may keep older bundles briefly.

Why it matters: A deploy can succeed but the emulator may reuse old JS and still save `unknown`.

Failure mode: A false failed proof after a correct deploy.

Recommendation: Plan v2 must force-stop the app and use a cold native share after deploy; if necessary, clear WebView cache only after recording that this is a test-environment refresh.

### P2 - Medium Risk

#### 1. Build:APK may be useful but should not imply publication

Evidence: A29 changes web JS only, but Android publication is still gated.

Why it matters: Running APK build can validate packaging, but docs must avoid implying an APK was published.

Failure mode: Tracker status overclaims Android release completion.

Recommendation: Plan v2 should make APK build optional or explicitly non-publication.

## What The Original Plan Or Work Gets Wrong

It plans to place the helper near the component without considering Node test import boundaries. A small library module is cleaner and safer.

## Missing Validation

- Fresh WebView state after deploy.
- Explicit "no publication" wording after any APK-related validation.

## Revised Recommendations

1. Add `src/lib/android-share/request.ts`.
2. Add `src/lib/android-share/request.test.ts`.
3. Use helper in URL/note JSON and PDF upload.
4. Force-stop app before postdeploy rerun.
5. Keep APK publication gate explicitly closed.

## Go / No-Go Recommendation

Go after plan v2 incorporates the library-module helper and stale-WebView mitigation.

## Plan Revision Inputs

### Required Deletions

- Remove helper-in-component requirement.

### Required Additions

- New small request helper module and test.
- Force-stop/cold-start postdeploy native share.

### Required Acceptance Criteria Changes

- Rerun must prove production `capture_source=android`.

### Required Validation Changes

- Focused test: `src/lib/android-share/request.test.ts`.

### Required No-Go Gates

- No-go if native rerun still uses stale code after a documented app force-stop.

## Residual Risks

Even after A29, APK distribution remains unauthorised and TalkBack spoken-order remains a separate gate.
