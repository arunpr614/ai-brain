# Feature Release A20 P1 Blocker Fixes Implementation Plan - Adversarial Review

**Created:** 2026-06-16 20:56:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `UX_v2/features/FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_IMPLEMENTATION_PLAN_V1_2026-06-16_20-55-00_IST.md`
**Report path:** `UX_v2/features/FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_20-56-00_IST.md`

## Executive Verdict

Conditional go after revision. V1 is actionable, but "where tests can be adjusted safely" is vague and can become an escape hatch. It also does not explicitly require restaging A20 source changes into the candidate.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Private API hardening scope can be evaded

**Evidence:** Step 4 says update routes "where tests can be adjusted safely."
**Why it matters:** A20 could leave obvious private APIs vulnerable and still mark complete.
**Recommendation:** Plan v2 must name the first-pass route list and require an explicit remaining-risk table.

#### 2. Restaging and validation are underspecified

**Evidence:** V1 says run validation but not that changed source/test/docs must be staged and staged diff checks rerun.
**Why it matters:** The release candidate is staged; fixes must update the staged candidate.
**Recommendation:** Plan v2 must restage changed source/test/governance paths intentionally and verify final staged count/diff check.

## Revised Recommendations

1. Name first-pass route/page list.
2. Add remaining presence-only route inventory.
3. Restage A20 source/tests/docs explicitly.
4. Rerun focused and full validation.

## Go / No-Go Recommendation

Go after plan v2 incorporates the route list, remaining-risk inventory, and restaging requirements.
