# Feature Release A29 Android Capture Source Attribution PRD - Adversarial Review

Created: 2026-06-17 00:19:00 IST
Reviewer stance: Brutally honest adversarial review
Reviewed target: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_PRD_V1_2026-06-17_00-18-00_IST.md`
Report path: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_PRD_ADVERSARIAL_REVIEW_2026-06-17_00-19-00_IST.md`

## Executive Verdict

Conditional go after revision. The problem is real and narrow, but v1 risks under-testing because the share handler currently has no direct test harness. The revision must isolate header construction enough to test without brittle Capacitor/WebView mocking.

## Evidence Inspected

- A29 PRD v1.
- A28 production DB result showing native share saved item with `capture_source=unknown`.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/share-handler.tsx`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/api/capture/url/route.ts`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/api/capture/note/route.ts`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/api/capture/pdf/route.ts`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. The PRD asks for tests but does not define a testable seam

Evidence: `src/components/share-handler.tsx` owns browser-only dynamic imports, router pushes, token access, fetch calls, PDF blob reading, and result storage in one component file. There is no existing `share-handler` test.

Why it matters: Testing the whole component would be brittle and slow. Skipping tests would leave this exact attribution bug easy to regress.

Failure mode: Header is added to URL/note but missed for PDF, or a future refactor removes it without a focused test.

Recommendation: PRD v2 must require extracting a tiny pure helper for Android capture headers and testing that helper.

#### 2. Adding the header only to JSON would leave PDF attribution wrong

Evidence: PDF upload in `share-handler.tsx` uses a separate `fetch()` path rather than `postJson()`. Server PDF route already reads `x-brain-capture-source` for bearer requests.

Why it matters: Native PDF share would remain `unknown`, and the bug class would only be half fixed.

Failure mode: URL proof passes while PDF captures remain misattributed.

Recommendation: PRD v2 must explicitly include PDF upload fetch headers and focused coverage for authorization plus Android capture-source header coexistence.

### P2 - Medium Risk

#### 1. Deployment proof needs to show the new client code is live

Evidence: The APK loads `https://brain.arunp.in`; code changes in the web app do not affect native share until deployed.

Why it matters: Local tests can pass but the emulator will still use old deployed JS.

Failure mode: Native rerun still saves `unknown`, not because the fix failed, but because production was not updated or the WebView reused stale assets.

Recommendation: PRD v2 must require deploy plus production bundle/code proof or a postdeploy native rerun after force-stopping/relaunching the app.

### P3 - Low Risk Or Polish

#### 1. A29 should preserve A28 as a failed/partial proof, not hide it

Evidence: A28 found a successful user-facing save and a metadata failure.

Why it matters: Future agents need to understand why A29 exists.

Failure mode: Trackers jump from A27 to A29 without explaining the `unknown` capture source finding.

Recommendation: PRD v2 must require A28 QA to record `user_success_metadata_blocked`.

## What The Original Plan Or Work Gets Wrong

The PRD v1 is correct that this is a narrow source attribution bug, but it under-specifies how to test a client-side WebView header change and how to prove production is actually running the updated client.

## Missing Validation

- Pure helper test for Android capture headers.
- PDF header coverage.
- Production postdeploy proof before native rerun.
- Tracker wording preserving the A28 partial/fail finding.

## Revised Recommendations

1. Extract and test a pure `androidCaptureHeaders()` helper.
2. Use that helper for URL/note JSON and PDF upload.
3. Deploy before native rerun.
4. Force-stop/relaunch or cold-start share after deploy.
5. Document A28 as user-facing success but metadata-blocked.

## Go / No-Go Recommendation

Conditional go after PRD v2 adds the helper/testing/deploy requirements.

## Plan Revision Inputs

### Required Deletions

- Remove any implication that URL-only header fix is sufficient.

### Required Additions

- Testable helper.
- PDF coverage.
- Production deploy and native rerun.
- A28 partial-finding preservation.

### Required Acceptance Criteria Changes

- Native rerun must show `capture_source=android`.

### Required Validation Changes

- Focused helper tests plus full validation.

### Required No-Go Gates

- No-go if production rerun still returns `capture_source=unknown`.

## Residual Risks

This fix proves the current live WebView path and debug APK. It still does not authorize APK publication.
