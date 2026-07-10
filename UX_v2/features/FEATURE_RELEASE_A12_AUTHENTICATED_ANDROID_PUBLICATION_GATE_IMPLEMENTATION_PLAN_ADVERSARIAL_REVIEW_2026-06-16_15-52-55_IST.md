# Feature Release A12 Authenticated Android Publication Gate Implementation Plan - Adversarial Review

**Created:** 2026-06-16 15:52:55 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_IMPLEMENTATION_PLAN_V1_2026-06-16_15-56-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_15-52-55_IST.md`

## Executive Verdict

Conditional no-go until plan v2. The plan is directionally strong but underspecifies route target selection, secret handling in helper scripts/scans, and production mutation cleanup mechanics. Those gaps can cause either false blockers or unsafe production evidence collection.

## Evidence Inspected

- `UX_v2/features/FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_IMPLEMENTATION_PLAN_V1_2026-06-16_15-56-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_PRD_V2_2026-06-16_15-52-00_IST.md`
- `Handover_docs/AI_MEMORY_UX_V2_PRODUCTION_ANDROID_HANDOVER_2026-06-16_15-04-24_IST.md`
- `UX_v2/execution/UX_V2_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_QA_2026-06-16_14-18-00_IST.md`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Protected route target selection is not executable without leaking or guessing production IDs

**Evidence:** Phase 2 requires `/items/[id]`, `/items/[id]/repair`, `/topics/[slug]`, and `/collections/[id]` evidence at lines 83-86, and says to use seeded or existing production-safe targets at line 97. It does not define how to discover/select those targets safely from production or whether local fixture targets can satisfy APK WebView production proof.
**Why it matters:** The agent can get stuck or accidentally print raw item IDs/titles while trying to find route targets.
**Failure mode:** A12 either skips item/topic/collection routes, uses invalid IDs that only prove 404s, or writes private item metadata into QA docs.
**Recommendation:** Add a target-selection preflight: use server-side redacted query output or existing A11 live Ask hash-style proof, store only route aliases such as `item-a12-primary`, and write an in-memory/private mapping outside repo if needed. If no safe target exists, mark affected route proof blocked.

#### 2. Secret handling for helper scripts and redaction scans is too loose

**Evidence:** Phase 1 allows a helper script under `/tmp` or retained script at line 64. Phase 8 proposes a broad `rg` scan containing `PIN`, `pairing`, `cookie`, and a long-token regex at lines 196-202.
**Why it matters:** Helper scripts are a common place to accidentally persist sessions. Broad scans can also produce noisy evidence that includes matched secrets unless command output is carefully controlled.
**Failure mode:** A helper file with a raw cookie remains on disk, or a redaction scan prints the very secret it is supposed to catch into terminal/log/report output.
**Recommendation:** Plan v2 must require helpers to read secrets from environment/stdin only, never hard-code or write them, place any temporary helper in `/tmp` with cleanup, and make redaction scan output path-only/count-only where feasible. If a secret match is found, do not paste the value into markdown; record redacted finding only.

#### 3. Native share cleanup lacks an implementation-level verification method

**Evidence:** Phase 3 requires cleanup at lines 106, 110, 114, and 116-120, but does not define how cleanup will be performed or verified against the production database/API.
**Why it matters:** Cleanup can be asserted without proof, and share-created items may remain in production.
**Failure mode:** A screenshot proves `saved_full`, but no cleanup API is available or used; the final QA still marks native share passed.
**Recommendation:** Add a concrete cleanup strategy: prefer duplicate-safe temporary URL that resolves to an existing cleanup-safe item, or use a local-only tunnel if production mutation cleanup is unsafe. Require post-cleanup verification via redacted DB/API count/hash, and mark share gate blocked if cleanup cannot be verified.

### P2 - Medium Risk

#### 1. Full validation commands may be too expensive during evidence-only A12 and are not sequenced by change risk

**Evidence:** Phase 8 always runs `npm run typecheck`, `lint`, full `npm test`, and build at lines 186-194.
**Why it matters:** These are useful but can consume time and obscure Android-runtime blockers when no app code changed.
**Failure mode:** A12 spends most of its time rerunning full web gates before discovering WebView auth is blocked.
**Recommendation:** Plan v2 should run fast preflight first, then Android evidence, then full static gates if A12 changes app code/config or before publication-ready verdict. For blocked-no-code outcome, record last known A11/A9 gates plus run `git diff --check` for A12 docs.

#### 2. TalkBack manual checklist still needs an artifact shape

**Evidence:** Phase 6 lists checklist columns at lines 159-165 but does not say where the checklist lives or how it is tied to route screenshots.
**Why it matters:** Accessibility evidence can become unstructured notes.
**Failure mode:** The QA report says "manual TalkBack checked" without a row-level checklist.
**Recommendation:** Add `talkback-checklist.csv` or a markdown table path under the A12 evidence directory.

### P3 - Low Risk Or Polish

#### 1. Output timestamps are slightly inconsistent with generated filenames

**Evidence:** Plan created timestamp is 15:56, while review timestamp generated by the helper is 15:52 because local command time and hard-coded plan filenames differ.
**Why it matters:** Not functionally blocking, but future agents may sort by timestamp and get confused.
**Failure mode:** A review appears earlier than the plan it reviewed.
**Recommendation:** In plan v2, use stable artifact names with the chosen A12 execution timestamp and avoid relying on sort order alone.

## What The Original Plan Or Work Gets Wrong

The plan treats evidence capture as mostly mechanical, but A12's hard parts are safe target selection, secret handling, and cleanup verification. Without those, the Android proof can either block unnecessarily or create unsafe production side effects.

## Missing Validation

- Safe production target-selection method.
- Helper-script secret discipline and cleanup.
- Path-only/count-only redaction scan behavior.
- Concrete native-share cleanup verification.
- TalkBack checklist artifact path.
- Risk-based validation sequencing for blocked/no-code outcomes.

## Revised Recommendations

Revise the implementation plan before execution. Add a Phase 0.5 target/secret safety preflight, sharpen native-share cleanup mechanics, define TalkBack checklist artifact, and make validation sequencing depend on whether code/config changed or a publication-ready verdict is being claimed.

## Go / No-Go Recommendation

No-go for execution from plan v1. Go for execution after plan v2 closes the P1 findings.

## Plan Revision Inputs

### Required Deletions

- Remove implication that "seeded or existing production-safe route targets" can be selected ad hoc during route QA.
- Remove any helper-script approach that can persist raw cookies/sessions.

### Required Additions

- Add safe route target-selection preflight.
- Add helper secret rules: environment/stdin only, `/tmp` only unless secret-free, cleanup required.
- Add native-share cleanup verification method.
- Add TalkBack checklist artifact path.
- Add validation sequencing for no-code blocked outcomes versus publication-ready outcomes.

### Required Acceptance Criteria Changes

- Route proof cannot pass for item/topic/collection routes unless target aliases are safely selected and raw IDs/titles are excluded from evidence.
- Native share cannot pass unless cleanup verification is concrete.
- Redaction scan cannot paste raw matches into markdown.

### Required Validation Changes

- Add redacted target manifest.
- Add cleanup manifest.
- Add helper cleanup manifest if helper scripts are used.
- Add path/count redaction-scan summary.

### Required No-Go Gates

- Block route evidence if safe targets cannot be selected.
- Block native share pass if cleanup cannot be verified.
- Block evidence package if helper scripts persist secrets.

## Residual Risks

Even with plan v2, a local emulator may not perfectly represent Arun's physical Android device. The final release packet should preserve that limitation unless physical-device evidence is captured.
