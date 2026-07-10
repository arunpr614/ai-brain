# Feature Android Library Compact Card Source Logos Implementation Plan - Adversarial Review

**Created:** 2026-06-17 14:28:30 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_IMPLEMENTATION_PLAN_V1_2026-06-17_14-27-30_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_14-28-30_IST.md`

## Executive Verdict

Conditional go for V2. The plan is close, but it needs an explicit fixture/evidence path, warning suppression helper, desktop parity guard, and source-logo implementation boundaries before code.

## Evidence Inspected

- Implementation plan V1.
- Compact-card PRD adversarial review.
- Current `src/components/library-list.tsx`, `src/components/item-enrichment-watch.tsx`, and `src/components/enriching-pill.tsx`.
- Prior source plan V2 from `UX_v2/execution`.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Fixture and screenshot plan is too vague for Android closure

**Evidence:** V1 says capture evidence but does not name how fixtures are obtained or where screenshots/notes will be recorded.
**Why it matters:** This issue was found in real Android content density.
**Failure mode:** Code ships with only DOM/class changes and no proof against long-title fixtures.
**Recommendation:** Add a deterministic fixture inventory section to QA and capture browser/Android evidence paths before marking done.

#### 2. Source logo implementation can sprawl inside `library-list.tsx`

**Evidence:** V1 allows local SourceLogo handling but does not choose inline vs helper.
**Why it matters:** `library-list.tsx` already carries selection and bulk action complexity.
**Failure mode:** Logo SVG/mapping logic makes the main card component harder to maintain and test.
**Recommendation:** Create `src/components/source-logo.tsx` with small local SVGs, mapping helper, and accessibility contract.

### P2 - Medium Risk

#### 1. Warning suppression is not specified at code level

**Evidence:** V1 references priority overflow but does not define a helper.
**Why it matters:** The wrong warning can be hidden.
**Failure mode:** Meaningful extraction warning disappears.
**Recommendation:** Add a named helper in `library-list.tsx` that only suppresses known duplicate metadata-only warning codes.

#### 2. Desktop branch protection depends on human memory

**Evidence:** V1 says desktop remains close but does not include a diff discipline.
**Why it matters:** Separate branches still share state/classes and can diverge.
**Failure mode:** Desktop source icon/title/enrichment placement changes unnoticed.
**Recommendation:** Copy current desktop body first, then add mobile branch; after code, inspect `git diff` specifically for desktop body changes and record in QA.

### P3 - Low Risk Or Polish

#### 1. Compact checkbox dimensions need a concrete class target

**Evidence:** V1 says compact slot around 30px to 34px.
**Why it matters:** Unstable dimensions can still squeeze title.
**Failure mode:** The title width remains too small on Android.
**Recommendation:** Use a stable `w-8 min-w-8` slot and 18px to 20px checkbox.

## Missing Validation

- Fixture inventory.
- Source-logo helper review.
- Warning helper behavior.
- Desktop git-diff/visual note.
- Android install/version evidence if APK built.

## Revised Recommendations

Create V2 that selects `src/components/source-logo.tsx`, defines warning suppression, sets checkbox classes, and requires QA evidence file paths.

## Go / No-Go Recommendation

Go to V2, then execute. Do not execute V1 unchanged.

## Plan Revision Inputs

### Required Deletions

- Remove ambiguity around inline source-logo implementation.

### Required Additions

- Add `src/components/source-logo.tsx`.
- Add `shouldShowMobileWarning`.
- Add fixture inventory and QA report path.

### Required Acceptance Criteria Changes

- Require desktop-specific git diff and screenshot notes.

### Required Validation Changes

- Require Android evidence for actual long-title fixtures.

### Required No-Go Gates

- No completion if Android evidence is missing or only browser responsive screenshots exist.

## Residual Risks

Duplicated mobile/desktop markup increases maintenance cost; acceptable only because this is a constrained blast-radius fix.
