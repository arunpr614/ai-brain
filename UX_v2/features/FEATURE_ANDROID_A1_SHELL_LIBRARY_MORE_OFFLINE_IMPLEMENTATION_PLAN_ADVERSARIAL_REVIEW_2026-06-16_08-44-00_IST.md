# Feature Android A1 Shell Library More Offline Implementation Plan - Adversarial Review

**Created:** 2026-06-16 08:44:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_IMPLEMENTATION_PLAN_V1_2026-06-16_08-42-00_IST.md`
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_08-44-00_IST.md`

## Executive Verdict

No-go for execution as written. Plan v1 is directionally aligned with PRD v2, but it still leaves the most important validation mechanisms underspecified. Browser collision evidence, copy scans, offline fallback checks, and selected-count overflow handling need exact scripts/selectors/commands before coding starts.

## Evidence Inspected

- `UX_v2/features/FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_IMPLEMENTATION_PLAN_V1_2026-06-16_08-42-00_IST.md`
- `UX_v2/features/FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_PRD_V2_2026-06-16_08-40-24_IST.md`
- `src/components/sidebar.tsx`
- `src/components/sidebar-routing.ts`
- `src/components/sidebar-routing.test.ts`
- `src/components/library-list.tsx`
- `src/components/mobile-library-filters.tsx`
- `public/offline.html`
- `package.json`
- `scripts/ux-v2-seed-library-search-topics-collections.ts`
- `src/lib/client/register-sw.test.ts`

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Browser evidence is required but not made reproducible

**Evidence:** Plan v1 lists required browser states at lines 113-140 but the browser QA helper is optional "if useful" at line 37. It does not define selectors, interactions, bounding-box comparisons, screenshot path structure, pass/fail JSON shape, or how console errors are collected.
**Why it matters:** The plan's primary risk is fixed-layer overlap. Manual screenshots without deterministic measurements can miss the exact issue A1 is meant to prevent.
**Failure mode:** The agent captures nice screenshots, writes "no overlap observed," and misses that the selected toolbar or filter sheet covers the bottom nav or raised Capture at a second viewport.
**Recommendation:** Plan v2 must make the browser QA helper mandatory and specify its outputs: screenshot folder, JSON report, viewport list, state list, selectors, required bounding-box relationships, horizontal overflow check, console log capture, and failure conditions.

#### 2. Copy scan is named but not mechanically defined

**Evidence:** Plan v1 says "bounded copy scan" at lines 100-101 but does not list target files, forbidden patterns, allow-list strings, or how visible UI exceptions are evaluated. PRD v2 defines those details, but the implementation plan does not carry them forward.
**Why it matters:** A vague copy scan can either be skipped, run against the wrong tree, or pass despite visible offline/sync/fake-account claims.
**Failure mode:** A1 ships with `offline capture queue` or fake sync wording because a raw `rg` returned expected documentation matches and the agent treated it as non-actionable.
**Recommendation:** Plan v2 must include an exact copy-scan script or command with target files, forbidden regexes, approved allow-list strings, and fail-fast output.

### P1 - High Risk

#### 1. More/provider fallback validation is still mostly manual

**Evidence:** Phase 3 says to review More copy and keep existing provider statuses at lines 82-85, but there is no test or browser-state plan for `ok`, `quota_or_billing`, `unconfigured`, and `unreachable`.
**Why it matters:** More is a trust surface. Provider-health status must not become fake or block page rendering, and the visible copy varies by status.
**Failure mode:** The default local provider status looks fine, but quota/unconfigured/unreachable paths regress or reveal raw provider/model details in a failure state.
**Recommendation:** Plan v2 must either add focused provider-status tests using existing `src/lib/providers/status.test.ts` coverage plus copy scan, or add a fixture/mocking strategy for More page browser states. At minimum, implementation cannot change provider status logic unless focused provider tests pass.

#### 2. Selected-count overflow is allowed to be "infeasible" without a deterministic alternative

**Evidence:** Plan v1 says over-50 selected evidence is required "if feasible" and otherwise can be asserted with helper tests at lines 117-118, but no helper or seed strategy is specified. Existing seed script creates six items, not more than 50.
**Why it matters:** The over-limit state controls whether Ask selected safely enforces retrieval limits. It is easy to break when refactoring the mobile bulk bar.
**Failure mode:** The refactor visually works for 2 selected items but exposes an enabled Ask button with 51 selected, creating an invalid URL or request.
**Recommendation:** Plan v2 must add a deterministic over-limit test path: either seed 51 synthetic items for browser QA, or extract a pure selected-action state helper and unit-test `count > 50`.

#### 3. Offline fallback harness is underspecified and could be flaky

**Evidence:** Plan v1 creates a `jsdom` harness at lines 35-36 and branch checks at lines 87-90, but it does not specify how to handle the inline script's auto-probe, timers, redirects, fetch mocks, or status assertions.
**Why it matters:** Offline fallback is static HTML with timers and redirects. A naive jsdom test may pass intermittently or miss the actual link rewrite behavior.
**Failure mode:** The harness passes because it inspects static links before the script runs, while Android users still get sent to the wrong origin after retry.
**Recommendation:** Plan v2 must define the harness protocol: inject fetch mocks before scripts run, use deterministic fake timers or bounded waits, intercept `window.location.href`, assert final link hrefs after script initialization, and test retry branch text for each response case.

#### 4. `/setup-apk` deferral is not protected by tests or scan

**Evidence:** Plan v1 says do not map `/setup-apk` at lines 17, 28, and 60, but the route test additions are optional "if needed" at line 29.
**Why it matters:** A1 explicitly decided not to touch entry/session route behavior. In a shared helper, a broad More/settings mapping could accidentally pull `/setup-apk` into More.
**Failure mode:** A route helper change includes `/setup` or `/setup-apk` under More, and no focused test catches it.
**Recommendation:** Plan v2 must require a focused route test documenting the A1 deferral for `/setup-apk`.

### P2 - Medium Risk

#### 1. Build gate is conditional despite planned app and public-file changes

**Evidence:** Plan v1 says `npm run build` only if app source or public fallback changed at line 105, but the plan explicitly changes app source and `public/offline.html` at lines 27-36.
**Why it matters:** Conditional wording invites skipping the production build even though A1 will touch Next.js components and public fallback.
**Failure mode:** Typecheck/lint pass, but Next build fails due server/client import or static asset behavior.
**Recommendation:** Plan v2 must make `npm run build` mandatory after A1 implementation.

#### 2. Rollback language risks reverting unrelated dirty work

**Evidence:** Plan v1 says "revert only A1 edits" at lines 174-177, but the worktree is heavily dirty and many files are already modified by other agents.
**Why it matters:** In a dirty worktree, broad revert commands are dangerous.
**Failure mode:** The agent uses checkout/reset to recover A1 files and discards unrelated user/agent changes.
**Recommendation:** Plan v2 must state rollback is manual patch reversal of A1 hunks only, with no `git checkout`, `git reset`, or whole-file revert unless explicitly approved.

### P3 - Low Risk Or Polish

#### 1. QA artifact names lack the exact evidence folder path

**Evidence:** Plan v1 names the QA report at line 148 but not the screenshot/report folder path.
**Why it matters:** Evidence is easier to audit when screenshots and JSON live in a deterministic folder.
**Failure mode:** Screenshots are scattered or overwritten during retries.
**Recommendation:** Plan v2 should define `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/android-a1-shell-library-more-offline/` or a new A1-specific evidence folder.

## What The Original Plan Or Work Gets Wrong

The plan says the right things but still relies on human judgment at the exact points where A1 needs deterministic evidence: layer overlap, forbidden visible copy, route deferral, and offline fallback branch behavior.

## Missing Validation

- Mandatory browser QA helper specification.
- Exact target files and regex/allow-list for copy scan.
- Deterministic over-50 selected state validation.
- Offline fallback harness protocol.
- `/setup-apk` deferral route test.
- Mandatory production build gate.
- Manual patch-only rollback rule.
- Deterministic evidence folder path.

## Revised Recommendations

- Make `scripts/ux-v2-browser-android-a1-shell-library-more-offline.ts` mandatory.
- Make `scripts/ux-v2-check-android-a1-copy.ts` mandatory or inline equivalent exact Node command.
- Add a pure helper or fixture seed for selected-count action state.
- Specify offline harness mechanics.
- Add `/setup-apk` route deferral test.
- Require build.
- Define exact evidence paths and JSON schema.
- Replace rollback wording with patch-only reversal.

## Go / No-Go Recommendation

No-go for implementation until plan v2 makes validation exact enough to catch overlap, copy, route, and offline-origin failures without relying on memory or vibes.

## Plan Revision Inputs

### Required Deletions

- Delete "if useful" from the browser QA helper.
- Delete "if app source or public fallback changed" from the build gate.
- Delete ambiguous rollback language that could imply whole-file revert.

### Required Additions

- Mandatory browser QA helper with selectors and JSON report schema.
- Mandatory copy scan helper with target files, forbidden patterns, and allow-list.
- Over-limit selected-count test strategy.
- Offline fallback harness protocol.
- `/setup-apk` no-change route test.
- Evidence folder path.
- Patch-only rollback rule.

### Required Acceptance Criteria Changes

- A1 local completion requires the browser QA JSON report to contain zero issues.
- A1 local completion requires copy-scan JSON or output to contain zero unallowed matches.
- A1 local completion requires deterministic proof that mobile selected mode has no tag/add-to-collection controls.

### Required Validation Changes

- Run the browser helper against both required viewport sizes.
- Run focused route, bulk action, provider status if touched, offline fallback, copy scan, typecheck, lint, full test, and build.

### Required No-Go Gates

- Missing browser JSON report blocks local completion.
- Missing copy scan blocks local completion.
- Missing offline fallback harness blocks local completion if `public/offline.html` changes.
- Missing `/setup-apk` deferral test blocks shell route completion.

## Residual Risks

Even with plan v2, A1 remains browser/local evidence unless APK validation is performed later. Fixed-layer behavior in the real Android WebView can still differ from browser viewport evidence, so release claims must stay downgraded until APK evidence exists.
