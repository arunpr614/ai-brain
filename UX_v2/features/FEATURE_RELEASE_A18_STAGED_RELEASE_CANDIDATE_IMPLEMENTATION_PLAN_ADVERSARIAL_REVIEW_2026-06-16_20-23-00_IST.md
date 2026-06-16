# Feature Release A18 Staged Release Candidate Implementation Plan - Adversarial Review

**Created:** 2026-06-16 20:23:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_V1_2026-06-16_20-22-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_20-23-00_IST.md`

## Executive Verdict

Conditional no-go until revised. V1 has the right guardrails but its sequencing is internally inconsistent: it includes future A18 QA/report files in the initial pathspec before those files exist, then asks for existence checks before staging. It also says to validate after final staging but creates validation evidence only after validation. The plan needs a two-phase pathspec and a final docs-only supplement add.

## Evidence Inspected

- `UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_V1_2026-06-16_20-22-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_V2_2026-06-16_20-21-00_IST.md`
- `UX_v2/execution/UX_V2_A17_RELEASE_BUCKET_ACCEPTANCE_MANIFEST_2026-06-16_20-05-00_IST.md`
- Current git index proof from `git diff --cached --name-only`
- Adversarial-review report template at `/Users/arun.prakash/.codex/skills/adversarial-review/references/report-template.md`

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Initial pathspec cannot pass its own existence gate

**Evidence:** V1 puts `UX_v2/execution/UX_V2_A18_STAGED_RELEASE_CANDIDATE_QA_2026-06-16_20-31-00_IST.md` and `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_20-31-00_IST.md` into the merged pathspec before step 5 requires every path to exist.
**Why it matters:** The plan will either fail before staging or tempt the executor to weaken the existence rule.
**Failure mode:** A nonexistent report path is treated as acceptable, undermining the pathspec proof.
**Recommendation:** Split into phase 1 candidate pathspec for existing A17 paths plus existing A18 PRD/plan docs, then phase 2 governance supplement after QA/report/tracker docs are created.

### P1 - High Risk

#### 1. Validation sequencing blurs source validation and final governance staging

**Evidence:** V1 runs the full validation matrix, then creates the A18 QA report and PM tracker update, then reruns final staged-index comparison.
**Why it matters:** Full validation cannot include files that do not exist yet. For docs-only additions after validation, this is acceptable only if the plan explicitly says no source/config paths changed after validation and final checks are docs hygiene/index checks.
**Failure mode:** A future agent could assume the final staged index was fully tested even if source files changed after validation.
**Recommendation:** Add a hard rule: after full validation begins, no source/config/runtime file may be modified. Phase 2 may add only governance docs and tracker docs; final checks are staged-index equality, `git diff --cached --check`, doc hygiene, secret scan, and exclusion scan.

#### 2. Sorting pathspecs can mask manifest order and duplicates

**Evidence:** V1 says to merge and sort unique paths.
**Why it matters:** Sorting is fine for comparison, but the report should preserve counts for A17 source, A17 governance, A18 supplement, duplicate removals, and final unique paths.
**Failure mode:** A missing duplicate or omitted path can be invisible.
**Recommendation:** Record source block counts, duplicate count, and final unique count in the A18 QA report.

### P2 - Medium Risk

No P2 findings found.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

V1 tries to use one final pathspec for files that are created at different times. That is cleaner on paper but wrong operationally. A18 needs a candidate pathspec for staging and validation, then a governance supplement after validation evidence exists.

## Missing Validation

- Phase-specific pathspec equality checks.
- Proof that no source/config files changed after full validation starts.
- Counts for source blocks, governance blocks, supplement blocks, duplicate removals, and final staged paths.
- Final staged-doc hygiene after adding the A18 QA report and PM tracker update.

## Revised Recommendations

1. Use `/tmp/a18-phase1-pathspec.txt` for candidate staging and validation.
2. Use `/tmp/a18-phase2-governance-supplement.txt` after A18 report/tracker files are created.
3. Use `/tmp/a18-final-pathspec.txt` for final staged-index equality.
4. Record counts and duplicate removals.
5. Prohibit source/config/runtime edits after validation begins.
6. Rerun final `git diff --cached --check`, doc hygiene, secret scan, unsafe-positive scan, and staged exclusion scan after phase 2.

## Go / No-Go Recommendation

No-go for execution from V1. Go after plan v2 adds two-phase pathspec staging, post-validation source freeze, count accounting, and final docs-only validation.

## Plan Revision Inputs

### Required Deletions

- Delete the single all-at-once pathspec model.
- Delete any implication that nonexistent future report files can pass the initial existence check.

### Required Additions

- Phase 1 candidate pathspec.
- Phase 2 governance supplement.
- Final pathspec equality.
- Source/config freeze after validation starts.
- Count accounting.

### Required Acceptance Criteria Changes

- Phase 1 index equals phase 1 pathspec before validation.
- Final index equals final pathspec after docs-only supplement.
- No source/config/runtime changes after validation starts.

### Required Validation Changes

- Run final docs/staged-index checks after phase 2.
- Record staged exclusion scan in the A18 QA report.

### Required No-Go Gates

- Stop if phase 2 introduces source/config/runtime paths not already validated.
- Stop if final staged index differs from final pathspec.

## Residual Risks

Staging and validating still do not resolve owner acceptance, commit/PR/push, production deployment, APK publication target, TalkBack spoken-order audit, URL-share success fixture, or evidence retention policy.
