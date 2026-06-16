# Feature Release A25 - Android URL Share Result Honesty PRD Adversarial Review

Created: 2026-06-16 23:21:00 IST  
Reviewer stance: Brutally honest adversarial review  
Reviewed target: `UX_v2/features/FEATURE_RELEASE_A25_ANDROID_URL_SHARE_RESULT_HONESTY_PRD_V1_2026-06-16_23-20-00_IST.md`  
Report path: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A25_ANDROID_URL_SHARE_RESULT_HONESTY_PRD_ADVERSARIAL_REVIEW_2026-06-16_23-21-00_IST.md`

## Executive Verdict

Conditional-go. The PRD identifies a real user-facing honesty bug, but v1 is too loose on how typed non-OK API responses are parsed, how Android runtime proof avoids production-data residue, and whether it is trying to close the URL-share publication gate or only improve the failure state.

## Evidence Inspected

- `UX_v2/execution/UX_V2_A12_ANDROID_PUBLICATION_GATE_QA_2026-06-16_18-59-00_IST.md`
- `src/components/share-handler.tsx`
- `src/lib/android-share/result.ts`
- `src/app/capture/share-result/share-result-client.tsx`
- `src/app/api/capture/url/route.ts`
- `src/lib/capture/result.ts`
- `src/lib/android-share/result.test.ts`
- A12 evidence manifest and stored-token health output

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. v1 does not require parsing typed failed capture results from non-OK responses

**Evidence:** `ShareHandler.captureUrl()` calls `postJson()`, but on `!res.ok` it ignores `res.data` and immediately maps the failure to `mapCaptureFailureToShareResult("url")`. The URL API returns typed `capture_result` on 422.  
**Why it matters:** Adding a state enum and UI copy will not fix A12 unless the non-OK response path maps `capture_result.state=failed_without_saved_item`.  
**Failure mode:** Android still shows server unreachable for extractor failures because the client never reads the typed response.  
**Recommendation:** PRD v2 must require URL and note handlers to inspect typed non-OK `capture_result` payloads before falling back to network/server failure.

#### 2. v1 risks making evidence without distinguishing failure proof from success proof

**Evidence:** Open question 3 asks whether successful URL save is required, but the goals also say "produce fresh Android runtime evidence" without defining whether it proves honest failure only or closes URL-share functionality.  
**Why it matters:** A failure-state proof cannot prove URL sharing saves reachable URLs.  
**Failure mode:** Project tracker overclaims that URL-share is complete when only the error copy was corrected.  
**Recommendation:** PRD v2 must split "A25 closes honest failure bug" from "A12 URL-share success remains pending unless a deterministic successful URL-save fixture is executed and cleaned up."

#### 3. v1 production mutation cleanup is under-specified

**Evidence:** A25-V3 mentions deterministic runtime proof but does not say whether the fixture saves an item or how cleanup is verified.  
**Why it matters:** URL-share success fixtures can leave production items behind, while failure fixtures should leave none.  
**Failure mode:** Evidence changes production data without a manifest, or assumes no mutation without checking.  
**Recommendation:** PRD v2 must require a before/after fixture marker check for any successful URL save. For a failed fixture, require evidence that no item with the unique fixture marker exists.

### P2 - Medium Risk

#### 1. State naming is unresolved

**Evidence:** Open question 1 asks state naming.  
**Why it matters:** Ambiguous names create migration churn and fragile tests.  
**Failure mode:** Implementation chooses `capture_failed` and later needs source-specific copy/actions.  
**Recommendation:** Use explicit `url_capture_failed` and `note_capture_failed` states to avoid overloading PDF upload failures or network failures.

#### 2. Privacy validation should include browser/result text

**Evidence:** v1 mentions sessionStorage and logs but not rendered DOM text.  
**Why it matters:** The capture API `message` may contain extractor details. Even if not stored, a careless UI could display raw error text.  
**Failure mode:** Shared URL or raw extractor message appears on the result screen.  
**Recommendation:** PRD v2 must require that the new result copy is static and does not render raw API `message`.

### P3 - Low Risk Or Polish

#### 1. Release rollback wording should clarify APK version bump

**Evidence:** v1 says APK `1.0.4/code5` rollback, but any web-source change that affects the WebView can be deployed without an APK unless Android native assets are rebuilt for evidence.  
**Why it matters:** The project should avoid unnecessary APK version churn.  
**Failure mode:** A new APK is treated as a publication artifact even though the change is web runtime code.  
**Recommendation:** PRD v2 should require rebuild/install for evidence only if the release package is being refreshed; otherwise use deployed web runtime plus installed APK WebView.

## What The Original Plan Or Work Gets Wrong

The PRD correctly detects result dishonesty, but it almost turns an evidence bug into a broader URL-capture product rewrite. The source of truth is narrower: non-OK typed capture responses are discarded by the share handler. Fix that path, add explicit states, and avoid claiming successful URL-share completion unless a separate success fixture proves it.

## Missing Validation

- Test where `postJson()` returns `ok=false`, `status=422`, and a valid `capture_result`.
- Test that a malformed non-OK response remains `server_unreachable`.
- Fixture screenshot for the new URL failure state.
- Android runtime evidence that the new failure state appears on a real share intent.
- Production mutation before/after proof for any success fixture.

## Revised Recommendations

- Add `url_capture_failed` and `note_capture_failed`.
- Add a helper that maps typed non-OK capture responses before generic failure fallback.
- Keep raw API messages out of the stored payload and rendered UI.
- Mark A25 as closing the honest-failure bug only.
- Keep URL-share success and APK publication as open gates unless separately proven/authorized.

## Go / No-Go Recommendation

Go for PRD v2 and implementation only after v2 makes the scope and evidence boundaries explicit.

## Plan Revision Inputs

### Required Deletions

- Delete any implication that A25 alone proves successful URL-share capture.

### Required Additions

- Add non-OK typed response parsing.
- Add explicit source-specific failure states.
- Add mutation cleanup/no-mutation proof.

### Required Acceptance Criteria Changes

- Make URL-share success optional and separately tracked.
- Require static copy and no raw API error display.

### Required Validation Changes

- Add unit tests for non-OK typed response mapping and malformed fallback.
- Add runtime screenshot/XML for the new URL failure state.

### Required No-Go Gates

- Do not mark URL-share success complete without a successful save fixture and cleanup manifest.
- Do not publish APK without explicit distribution authorization.

## Residual Risks

Even with this fix, users may still hit extractor limitations on certain URLs. The app will be more honest, not more capable at extracting hard pages.

