# Feature Contrast Token Safety Implementation Plan - Adversarial Review

**Created:** 2026-06-15 22:16:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_CONTRAST_TOKEN_SAFETY_IMPLEMENTATION_PLAN_V1_2026-06-15_22-12-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_CONTRAST_TOKEN_SAFETY_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-15_22-16-00_IST.md`

## Executive Verdict

Conditional go after revision. The plan is narrow and safe, but its test strategy can drift if it duplicates token values manually, and it does not explicitly require migration of compound class strings where `bg`, `text`, and `hover` are split across lines or conditional expressions.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_CONTRAST_TOKEN_SAFETY_IMPLEMENTATION_PLAN_V1_2026-06-15_22-12-00_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_CONTRAST_TOKEN_SAFETY_PRD_V2_2026-06-15_22-08-00_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/BUTTON_CONTRAST_IMPLEMENTATION_PLAN_2026-06-15_16-10-33_IST.md`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Manual token duplication in the contrast test can create false confidence

**Evidence:** Phase 4 allows the test to use a "test-local token map" before mentioning parsing CSS.
**Why it matters:** If CSS token values change and the test-local map is not updated, the test can pass while the app regresses.
**Failure mode:** The old white-on-near-white failure is reintroduced in CSS but tests still use stale safe values.
**Recommendation:** Prefer parsing the real CSS token file. Allow manual token maps only with an explicit comment and a scan that checks the tested token names exist in CSS.

### P2 - Medium Risk

#### 1. Regex scans may miss conditional or multi-line class composition

**Evidence:** The plan relies on regexes for exact same-line class patterns. Existing React files may compose class strings conditionally across lines.
**Why it matters:** Missed class strings would leave broken controls.
**Failure mode:** A button with `bg-[var(--accent-9)]` and `text-[var(--on-accent)]` in separate conditional fragments remains.
**Recommendation:** After exact-pair scans, separately scan every `bg-[var(--accent-9)]`, `text-[var(--on-accent)]`, and `border-[var(--accent-9)]` occurrence and classify each.

#### 2. QA report can become hand-wavy without required before/after counts

**Evidence:** The plan says record scan counts and classification, but does not require before/after counts.
**Why it matters:** Without counts, reviewers cannot tell if the migration materially reduced risk.
**Failure mode:** A QA report says "scans reviewed" while leaving dozens of risky matches.
**Recommendation:** Require before/after counts for each scan pattern and a table of remaining matches.

### P3 - Low Risk Or Polish

#### 1. The plan does not define a timestamp for the QA file

**Evidence:** `WEB_EXPERIENCE_REVAMP_CONTRAST_QA_<timestamp>.md` is named but not tied to the active run timestamp.
**Why it matters:** Low risk, but makes artifacts harder to correlate.
**Failure mode:** Multiple QA files collide or cannot be tied to the implementation pass.
**Recommendation:** Use the implementation start timestamp and include the feature PRD/plan paths in the QA report.

## What The Original Plan Or Work Gets Wrong

The plan assumes the obvious exact-pair scan is enough. It is not. Conditional class composition and split class fragments require separate raw-token scans and classification.

## Missing Validation

- CSS-parsed token test preference.
- Before/after scan counts.
- Full remaining-match classification table.
- Explicit rule for multi-line/conditional class usage.

## Revised Recommendations

Revise the implementation plan to:

1. Parse actual CSS token values where feasible.
2. Require raw-token scans after migration, not just exact-pair scans.
3. Require before/after counts and remaining-match classification.
4. Tie QA artifact to the implementation timestamp.

## Go / No-Go Recommendation

Go after implementation plan v2 incorporates these revisions. Do not implement from v1.

## Plan Revision Inputs

### Required Deletions

- Remove manual token map as the preferred test strategy.

### Required Additions

- CSS parsing or CSS token existence assertion.
- Before/after scan counts.
- Remaining raw-token classification table.
- Multi-line/conditional class scan rule.

### Required Acceptance Criteria Changes

- Exact-pair scan alone is not sufficient.
- All remaining raw matches must be classified.

### Required Validation Changes

- QA report must include before/after scan counts and command outputs.

### Required No-Go Gates

- No implementation completion with unclassified raw token matches.
- No test that can pass independently of real CSS token values without an explicit drift guard.

## Residual Risks

Visual screenshots are still needed because contrast math does not catch layout overlap or missing affordance hierarchy.
