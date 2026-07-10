# Android Share Result Implementation Plan v1 - Adversarial Review

**Created:** 2026-06-16 00:28:15 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_SHARE_RESULT_IMPLEMENTATION_PLAN_V1_2026-06-16_00-26-05_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_SHARE_RESULT_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_00-28-15_IST.md`

## Executive Verdict

No-go for execution. The plan is directionally right, but it is not grounded tightly enough in the actual `CaptureResultPayload` contract and it leaves the browser evidence path underspecified. Implementing from it would likely create a pretty result page with incomplete state mapping.

## Evidence Inspected

- `FEATURE_ANDROID_SHARE_RESULT_IMPLEMENTATION_PLAN_V1_2026-06-16_00-26-05_IST.md`
- `FEATURE_ANDROID_SHARE_RESULT_PRD_V2_2026-06-16_00-24-10_IST.md`
- `src/lib/capture/result.ts`
- `src/components/share-handler.tsx`
- `src/app/capture/page.tsx`

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Plan does not map the real capture result states

**Evidence:** Plan v1 calls for `mapCaptureResponseToShareResult(data, sourceKind)` at lines 38-40 but does not define the mapping. The actual API contract in `src/lib/capture/result.ts` uses `created_full_text`, `created_transcript`, `created_preview_only`, `created_metadata_only`, `created_needs_upgrade`, `duplicate_existing`, `updated_existing`, `error_with_saved_item`, and `failed_without_saved_item`.
**Why it matters:** The Android PRD state vocabulary is different from the web capture result vocabulary. Without a precise bridge, saved/limited/error states will be misclassified.
**Failure mode:** `created_metadata_only` or `created_preview_only` could be treated as successful full save, causing the result screen to invite Ask when the source still needs repair.
**Recommendation:** Plan v2 must include the exact mapping from every `CaptureResultState` to every `AndroidShareResultState`, including action eligibility.

#### 2. Browser evidence method is not executable as written

**Evidence:** Plan v1 says to use local dev server with synthetic sessionStorage payloads at lines 80-97 but does not define a fixture helper, route setup method, or payload keys. The route is supposed to read an opaque key from the URL, so evidence depends on a deterministic sessionStorage writer.
**Why it matters:** QA will become ad hoc and hard to reproduce.
**Failure mode:** Screenshots can be produced manually but cannot be audited or rerun; expired/missing-payload behavior might be the only route state actually tested.
**Recommendation:** Plan v2 must require a browser QA helper or documented script that inserts safe payloads into sessionStorage and navigates to `/capture/share-result?key=...`.

### P1 - High Risk

#### 1. `rg -n "alert\\("` validation command has the wrong success semantics

**Evidence:** Plan v1 lists `rg -n "alert\\(" src/components/share-handler.tsx` as a validation command at line 105. `rg` exits 1 when there are no matches, which is the desired pass condition.
**Why it matters:** A validation script or operator could treat a correct no-match result as failure, or invert it incorrectly later.
**Failure mode:** The gate is noisy and may be skipped because it "fails" on success.
**Recommendation:** Plan v2 should state `! rg -n "alert\\(" src/components/share-handler.tsx` or "exit code 1/no matches is pass."

#### 2. The planned helper API mixes classification and auth state too early

**Evidence:** Plan v1 proposes `classifySharePayload(payload, hasToken)` at line 38. PRD v2 requires payload classification before capture API calls and gives multi-PDF precedence over token handling.
**Why it matters:** Token state should not change the intrinsic payload classification.
**Failure mode:** Multi-PDF without token could become `missing_token`, hiding the fact that multi-PDF is unsupported once paired.
**Recommendation:** Plan v2 should split `classifyNativeSharePayload(payload)` from `resultForPreflight(classification, hasToken)`.

#### 3. Logging redaction is listed but not anchored to current leak

**Evidence:** Current `share-handler.tsx` logs `read(${uri})` on PDF read failure. Plan v1 says to use sanitized messages at line 77 but does not require replacing that specific leak or testing it.
**Why it matters:** The exact existing privacy bug could survive if implementation only sanitizes new helper outputs.
**Failure mode:** Failed PDF share continues to send local URI details to `/api/errors/client`.
**Recommendation:** Plan v2 must explicitly replace URI-bearing messages and add a test proving sanitizer strips URI/file-name/token/URL-like content.

### P2 - Medium Risk

#### 1. Result route may be inaccessible from protected app routes without auth context

**Evidence:** Plan v1 creates `/capture/share-result` under the protected app route tree but does not state whether missing-token results must be public. Proxy rules currently redirect protected HTML without a session cookie.
**Why it matters:** Missing-token native share is likely to happen before web session auth.
**Failure mode:** The share handler routes to `/capture/share-result`, but the proxy redirects to `/unlock`, hiding the intended missing-token result.
**Recommendation:** Plan v2 must decide whether the route remains protected and relies on an existing session, or whether `/capture/share-result` should be public. If public, add proxy tests and strict payload privacy.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

It assumes "add route and helper" is enough. The real work is bridging two state vocabularies, proving public/protected route behavior for missing-token results, and making browser evidence deterministic.

## Missing Validation

- Exact `CaptureResultState` bridge tests.
- Synthetic sessionStorage browser harness.
- Proxy/public-route decision test if the route becomes public.
- Sanitizer tests against URI, URL, file name, token, and note-body-like strings.

## Revised Recommendations

- Add exact capture-state mapping table.
- Split payload classification from auth/token preflight.
- Make `/capture/share-result` public only if privacy-safe payload loading does not require server data, and add proxy coverage.
- Add browser QA payload seeding script/report.
- Invert/no-match alert scan explicitly.

## Go / No-Go Recommendation

No-go until plan v2 closes the exact capture-state mapping and route accessibility gaps.

## Plan Revision Inputs

### Required Deletions

- Delete `classifySharePayload(payload, hasToken)` as the core helper shape.
- Delete ambiguous `rg` scan semantics.

### Required Additions

- Capture result to Android share result mapping table.
- Public/protected route decision.
- Browser QA harness details.
- Existing log leak replacement.

### Required Acceptance Criteria Changes

- Every current `CaptureResultState` must be covered by focused tests.
- Missing-token route must render without relying on server auth if it is intended for unpaired Android users.

### Required Validation Changes

- Add proxy test if `/capture/share-result` becomes public.
- Add deterministic browser QA script/report.

### Required No-Go Gates

- Missing-token native share redirecting to unlock instead of share result blocks local completion.
- Any unmapped capture result state blocks local completion.

## Residual Risks

Native Android share result still cannot be called complete until APK/device evidence validates real intents.
