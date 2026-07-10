# Feature Release A14 Dirty Worktree Attribution Implementation Plan - Adversarial Review

**Created:** 2026-06-16 19:31:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A14_DIRTY_WORKTREE_ATTRIBUTION_IMPLEMENTATION_PLAN_V1_2026-06-16_19-30-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A14_DIRTY_WORKTREE_ATTRIBUTION_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_19-31-00_IST.md`

## Executive Verdict

Conditional go after a small v2 revision. The plan is scoped and release-safe, but it should clarify how much path detail belongs in the human report and should make the validation search avoid false positives from deliberate no-go wording.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A14_DIRTY_WORKTREE_ATTRIBUTION_IMPLEMENTATION_PLAN_V1_2026-06-16_19-30-00_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A14_DIRTY_WORKTREE_ATTRIBUTION_PRD_V2_2026-06-16_19-28-00_IST.md`
- Current inventory scale from command evidence: 97 tracked modified files, 868 expanded untracked files.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

No P1 findings found.

### P2 - Medium Risk

#### 1. Human report can become unreadable if expanded untracked inventory is dumped wholesale

**Evidence:** Plan v1 says to run `git ls-files --others --exclude-standard` and create expanded untracked summaries, but it does not explicitly say whether all 868 untracked files should be copied into the final report.
**Why it matters:** A release owner needs exact tracked paths and useful summaries for untracked evidence/packages. A giant untracked appendix can bury the actual staging risks.
**Failure mode:** The A14 report becomes a wall of evidence paths and does not help the release owner decide what to review.
**Recommendation:** Plan v2 should require exact tracked path listing, but for expanded untracked files should use top-level/subdirectory summaries plus key source/test path lists and reproducible commands for full regeneration.

#### 2. "No authorized publication/staging" search may flag intended no-go text

**Evidence:** Plan v1 says to run a targeted search confirming no A14 report says publication or staging is authorized at line 75.
**Why it matters:** A good A14 report will contain phrases like "not authorized" and "do not stage." A naive search for `authorized` or `stage` will produce expected hits.
**Failure mode:** Validation looks failed because it finds the report's own safety language.
**Recommendation:** Plan v2 should scan for unsafe positive claims that assert publication approval, staging approval, APK publishing, release ownership closure, or goal completion, while allowing negative no-go text.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

The plan is safe in scope, but it needs sharper output ergonomics and validation wording.

## Missing Validation

- Explicit distinction between exact tracked path appendix and summarized expanded untracked inventory.
- Unsafe-positive publication/staging phrase scan.

## Revised Recommendations

1. Add report-size guidance: exact tracked paths, summarized expanded untracked categories, key untracked source/test paths, and reproducible commands.
2. Replace broad publication/staging authorization search with unsafe-positive phrase scan.

## Go / No-Go Recommendation

Go after implementation plan v2 incorporates the two P2 fixes.

## Plan Revision Inputs

### Required Deletions

- Remove ambiguous implication that all 868 expanded untracked files must be pasted into the report.

### Required Additions

- Add key untracked source/test path list requirement.
- Add unsafe-positive phrase scan.

### Required Acceptance Criteria Changes

- Human report must stay useful by summarizing evidence-heavy untracked directories.

### Required Validation Changes

- Search for unsafe positive claims rather than all publication/staging terms.

### Required No-Go Gates

- Do not mark final ownership closed from A14 output alone.

## Residual Risks

The report will still become stale after any further file changes. It must be rerun before actual staging.
