# Feature Contrast Token Safety PRD - Adversarial Review

**Created:** 2026-06-15 22:04:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_CONTRAST_TOKEN_SAFETY_PRD_V1_2026-06-15_22-00-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_CONTRAST_TOKEN_SAFETY_PRD_ADVERSARIAL_REVIEW_2026-06-15_22-04-00_IST.md`

## Executive Verdict

Conditional go after revision. The PRD identifies the root issue and sensible acceptance criteria, but it is too easy to pass with a narrow text-only contrast test while leaving icon-only buttons, disabled states, hover/focus states, and raw accent remnants unreviewed.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_CONTRAST_TOKEN_SAFETY_PRD_V1_2026-06-15_22-00-00_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/BUTTON_CONTRAST_IMPLEMENTATION_PLAN_2026-06-15_16-10-33_IST.md`
- Baseline known issue: dark `--accent-9` near-white paired with white `--on-accent`
- Existing app source paths from repo listing under `src/app` and `src/components`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. The PRD can pass while icon-only primary controls remain low contrast

**Evidence:** CT-003 names primary filled actions, but the contrast test requirement only specifies text contrast. The affected surfaces include icon buttons and controls where the icon is the main affordance.
**Why it matters:** Users still fail to identify the action if the icon is white-on-near-white or if only labels are tested.
**Failure mode:** Capture/send/icon buttons become "fixed" in text tests but remain visually unusable in dark mode.
**Recommendation:** Add acceptance criteria for icon foreground contrast and visual inspection of icon-only/compact primary buttons.

#### 2. Hover, focus, and disabled states are under-specified

**Evidence:** CT-001 mentions hover token existence, but CT-005 only requires primary and selected-control text contrast.
**Why it matters:** Hover/focus/disabled states are frequently separate classes and can regress independently.
**Failure mode:** Default button is readable, but hover or disabled text/icon becomes invisible or focus ring disappears.
**Recommendation:** Require contrast/focus review for default, hover, focus-visible, and disabled states.

### P2 - Medium Risk

#### 1. Remaining raw accent usages need a classification rule

**Evidence:** The PRD says remaining raw matches are acceptable if documented, but does not define the documentation shape or allowed categories.
**Why it matters:** Agents can mark risky usages "safe" without proving they are not primary/selected controls.
**Failure mode:** A selected tab or primary-looking link keeps raw `accent-9` and escapes review.
**Recommendation:** Add a remaining-usage register with categories: safe accent text/focus/content, migrated action, migrated selected control, or follow-up blocker.

#### 2. Visual QA is listed but not tied to artifact paths

**Evidence:** CT-006 says screenshots or manual visual notes should cover routes, but does not require a path or naming convention.
**Why it matters:** Evidence becomes scattered and hard to audit.
**Failure mode:** Later release packet cannot prove the contrast fix was visually checked.
**Recommendation:** Point CT-006 to the existing visual evidence folder and require a short contrast QA report path.

### P3 - Low Risk Or Polish

#### 1. Android cache behavior is acknowledged only indirectly

**Evidence:** The PRD says no APK publish, but does not explicitly state Android validation must prove deployed CSS pickup or document cache behavior.
**Why it matters:** Web CSS deploys can be stale in an existing WebView.
**Failure mode:** Production web is fixed but Android user still sees old cached CSS.
**Recommendation:** Add an Android deployed-asset validation note for any production release containing the feature.

## What The Original Plan Or Work Gets Wrong

The PRD assumes semantic tokens plus text contrast are sufficient. They are necessary, not sufficient. The actual defect class includes compact buttons, icons, hover/focus states, and selected controls that may not contain conventional text.

## Missing Validation

- Icon contrast validation.
- Hover/focus/disabled state validation.
- Remaining raw-accent usage register.
- Explicit evidence output path.
- Android WebView CSS pickup check for production.

## Revised Recommendations

Revise the PRD to add:

1. Icon and compact-control contrast criteria.
2. State coverage for default/hover/focus/disabled.
3. Remaining raw-token usage register.
4. Evidence file requirements.
5. Android deployed-asset validation if deployed.

## Go / No-Go Recommendation

Go after PRD v2 incorporates the review inputs. Do not implement from v1.

## Plan Revision Inputs

### Required Deletions

- Remove any implication that text contrast alone proves the feature.

### Required Additions

- Icon-only and compact-control acceptance criteria.
- Default/hover/focus/disabled state criteria.
- Remaining raw-token register requirement.
- Contrast QA report artifact.
- Android WebView deployed-CSS pickup requirement for release.

### Required Acceptance Criteria Changes

- CT-005 must include icons and states, not only text.
- CT-006 must require artifact paths.

### Required Validation Changes

- Add scan classification output.
- Add visual evidence naming/path requirements.

### Required No-Go Gates

- No release with unclassified primary/selected raw accent matches.
- No release with unreadable icon-only primary controls.

## Residual Risks

Manual screenshots can still miss route-specific states. The implementation plan must keep the scan/classification strict and avoid broad unrelated UI churn.
