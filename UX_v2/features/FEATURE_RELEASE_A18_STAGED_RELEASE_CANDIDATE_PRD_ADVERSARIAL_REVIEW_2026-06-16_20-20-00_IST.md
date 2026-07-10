# Feature Release A18 Staged Release Candidate PRD - Adversarial Review

**Created:** 2026-06-16 20:20:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_V1_2026-06-16_20-19-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_ADVERSARIAL_REVIEW_2026-06-16_20-20-00_IST.md`

## Executive Verdict

Conditional go only after revision. The PRD has the right staging intent, but V1 is too loose on governance supplement handling and does not define what happens when newly created A18 docs and the A17 PM update are not present in the A17 accepted governance list. That ambiguity can produce a staged candidate whose source is current but whose release evidence is stale.

## Evidence Inspected

- `UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_V1_2026-06-16_20-19-00_IST.md`
- `UX_v2/execution/UX_V2_A17_RELEASE_BUCKET_ACCEPTANCE_MANIFEST_2026-06-16_20-05-00_IST.md`
- Latest A17 root `RUNNING_LOG.md` entry
- Current empty index proof from `git diff --cached --name-only`
- Adversarial-review report template at `/Users/arun.prakash/.codex/skills/adversarial-review/references/report-template.md`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Governance supplement is not explicitly defined

**Evidence:** V1 says A18 should stage A17 accepted source/config and governance-doc paths, then create A18 execution report and tracker updates. It also lists risk that A18-created docs may be left for later, but it does not decide the rule.
**Why it matters:** If A18 updates trackers and creates execution evidence after staging, the staged governance set will not match the actual release state.
**Failure mode:** A commit could contain source/config and A7-A17 governance docs while leaving A18 validation proof, A18 tracker update, and the A17 PM update unstaged.
**Recommendation:** PRD v2 must define an A18 governance supplement: A17 PM update plus A18 PRD/review/plan/review/plan v2, A18 execution report, A18 PM update, and the tracker files modified by A18. Root `RUNNING_LOG.md` should remain excluded unless append-only staging is separately proven.

#### 2. The Android rebuild gate is framed as optional

**Evidence:** A18-R9 allows either APK build or documented deferral if Android/public runtime paths are staged.
**Why it matters:** A17 accepted paths include Android resources, Capacitor config, public icons, manifest, offline page, and service worker. Those are runtime and packaging surfaces.
**Failure mode:** The staged candidate could pass web tests and build while the Android package remains stale relative to the staged icon/config/public changes.
**Recommendation:** Make `npm run build:apk` required after staging unless it fails for an environmental reason. Even if it passes, publication remains blocked.

### P2 - Medium Risk

#### 1. Path existence language allows unnecessary ambiguity

**Evidence:** V1 says every path must exist, be tracked modified, or be intentional untracked add before staging.
**Why it matters:** A pathspec for staging should not include deleted or missing files unless the release explicitly intends deletion.
**Failure mode:** A missing path could be treated as acceptable without a deletion decision.
**Recommendation:** PRD v2 should require zero missing paths unless the path appears as a deletion in `git status --short` and the deletion is explicitly listed in the execution report.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

V1 assumes the A17 accepted governance-doc list is enough for A18, but the A17 manifest predates the A17 PM update and predates all A18 evidence. Staging only the A17 list would create a stale release-evidence package.

## Missing Validation

- Exact comparison between intended pathspec and staged index after staging.
- Explicit exclusion scan for heavy evidence patterns and ignored APK outputs from staged files.
- Required APK rebuild after Android/public paths are staged.
- Governance supplement presence scan.

## Revised Recommendations

1. Add an A18 governance supplement to the PRD.
2. Require APK rebuild after staging because Android/public runtime paths are included.
3. Require zero missing pathspec entries unless a deletion is explicitly intended and documented.
4. Require a staged-index exclusion scan for heavy evidence, build outputs, and root running log.

## Go / No-Go Recommendation

No-go for execution from V1. Go for implementation planning after PRD v2 incorporates the governance supplement, required APK rebuild, stricter missing-path handling, and staged-index exclusion scans.

## Plan Revision Inputs

### Required Deletions

- Remove any implied permission to leave A18 governance stale without documenting it.
- Remove optional framing for APK rebuild when Android/public runtime paths are staged.

### Required Additions

- A18 governance supplement path list.
- A17 PM update inclusion decision.
- Staged-index exclusion scan.
- Required APK rebuild after staging.

### Required Acceptance Criteria Changes

- Add acceptance that staged governance includes A18 evidence or explicitly documents a later docs-only stage.
- Add acceptance that no missing pathspec entries exist unless intentional deletions are listed.

### Required Validation Changes

- Add `npm run build:apk`.
- Add staged-file scans for heavy evidence patterns, ignored outputs, root `RUNNING_LOG.md`, and broad directories.

### Required No-Go Gates

- Block A18 closure if staged index differs from intended pathspec.
- Block A18 closure if Android/public paths are staged and APK build is skipped without a concrete blocker.

## Residual Risks

Even after revision, staged validation will not prove Play Store readiness, production deployment, TalkBack spoken order, URL-share deterministic success, or owner acceptance of heavy evidence retention.
