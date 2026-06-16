# Feature Release A27 URL Share Success Proof PRD - Adversarial Review

**Created:** 2026-06-16 23:54:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A27_URL_SHARE_SUCCESS_PROOF_PRD_V1_2026-06-16_23-53-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A27_URL_SHARE_SUCCESS_PROOF_PRD_ADVERSARIAL_REVIEW_2026-06-16_23-54-00_IST.md`

## Executive Verdict

Conditional go. The PRD is safe for a production server/API proof, but it must not close the native Android URL-share gate unless an actual Android share intent is run. The current resumed environment lacks `adb` and `emulator`, so any final claim must separate server capture capability from native share-handler behavior.

## Evidence Inspected

- A27 PRD v1.
- `src/components/share-handler.tsx`, which posts native URL shares to `/api/capture/url`.
- `src/app/api/capture/url/route.ts`, which saves URL captures and returns canonical `capture_result`.
- `src/lib/capture/capture-url.ts`, which only uses user-provided text for LinkedIn captures, not generic URL shares.
- Local extraction probe for `https://www.iana.org/help/example-domains?ai_brain_qa=a27-20260616-2355`, which returned `full_text`.
- Shell checks showing `adb`, `emulator`, Android SDK Spotlight hits, and Homebrew Android tool prefixes are unavailable in this resumed environment.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Direct API proof can create a false native-share completion claim

**Evidence:** `src/components/share-handler.tsx` has native-specific classification, token retrieval, client-side dedup, result storage, and route navigation before the API call. The PRD v1 allows a direct `/api/capture/url` proof.
**Why it matters:** A successful API request does not prove Android share intent classification, Capacitor event delivery, WebView session storage, or result screen navigation.
**Failure mode:** The tracker could mark URL-share success complete while a real Android share still fails before or after the API call.
**Recommendation:** PRD v2 must add a two-tier verdict: server/API URL success can be closed, but native Android URL-share success remains open until `adb`/device proof exists.

#### 2. Cleanup can be unsafe if SQLite foreign keys are not enabled

**Evidence:** `src/db/items.ts` deletes through `deleteItem`, which calls artifact cleanup and then deletes from `items`. CLI SQLite deletion only cascades if `PRAGMA foreign_keys=ON` is active.
**Why it matters:** A proof fixture can leave orphaned chunks, jobs, or link rows in production.
**Failure mode:** The production library appears clean, but internal tables retain orphan rows or stale FTS data.
**Recommendation:** Cleanup must run with `PRAGMA foreign_keys=ON`, target the exact fixture URL, and verify zero remaining `items` rows for that source URL. If possible, also verify no orphan chunks for captured item ids.

### P2 - Medium Risk

#### 1. External fixture stability is still an operational dependency

**Evidence:** The IANA page extracted successfully locally, but the production host can still see different DNS, TLS, fetch, or rate behavior.
**Why it matters:** A transient external fetch failure should not be confused with an app regression.
**Failure mode:** The proof fails because IANA is unreachable or content changes, and the release decision becomes noisy.
**Recommendation:** Record local extraction preflight, production failure details if any, and a fallback candidate rather than silently switching URLs.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

The PRD v1 title says "URL Share Success Proof", but the proposed executable path is a production API proof unless Android tooling is available. The name is too easy to overread as native success.

## Missing Validation

- Actual Android share intent with `android.intent.action.SEND`.
- Share-result screenshot showing `Saved to AI Memory`.
- Logcat redaction scan for the successful URL fixture.
- Verification that cleanup removed all related fixture rows, not just the item row.

## Revised Recommendations

1. Rename or frame A27 as "server/API URL capture success proof" unless native tooling becomes available.
2. Keep `native_url_share_success_not_proven` open if Android tooling remains unavailable.
3. Capture the production response in a redacted JSON artifact that excludes bearer token and private content.
4. Cleanup with `PRAGMA foreign_keys=ON` and exact fixture URL.
5. Update trackers with an honest partial close: server capture proven, native share proof pending.

## Go / No-Go Recommendation

Go for server/API proof execution. No-go for closing the native Android URL-share success gate without real device/emulator evidence.

## Plan Revision Inputs

### Required Deletions

- Remove any implication that direct API proof proves native Android share intent.

### Required Additions

- Add separate statuses for `server_url_capture_success` and `native_url_share_success`.
- Add Android tooling availability as an explicit execution precondition for native proof.

### Required Acceptance Criteria Changes

- Change acceptance criteria so server proof and native proof are separate rows.

### Required Validation Changes

- Add redacted response artifact and exact cleanup count verification.

### Required No-Go Gates

- Do not mark full URL-share success complete unless Android share-intent proof runs.
- Do not mark cleanup complete unless post-cleanup count is zero.

## Residual Risks

Even after A27, a physical Android device could behave differently from emulator proof because installed share providers and OS share-sheet payload formatting vary.
