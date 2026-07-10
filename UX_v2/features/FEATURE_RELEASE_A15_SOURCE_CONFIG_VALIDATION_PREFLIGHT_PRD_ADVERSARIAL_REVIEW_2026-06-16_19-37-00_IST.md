# Feature Release A15 Source And Config Validation Preflight PRD - Adversarial Review

**Created:** 2026-06-16 19:37:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_PRD_V1_2026-06-16_19-35-36_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_PRD_ADVERSARIAL_REVIEW_2026-06-16_19-37-00_IST.md`

## Executive Verdict

Conditional go after PRD v2 tightens environment-output hygiene, APK-build scope, and failure remediation boundaries. The PRD points at the right next validation milestone, but the execution contract must avoid leaking local config and overclaiming release readiness.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_PRD_V1_2026-06-16_19-35-36_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/package.json`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/UX_V2_A14_DIRTY_WORKTREE_ATTRIBUTION_REPORT_2026-06-16_19-28-32_IST.md`

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Env-check output hygiene is not strict enough

**Evidence:** A15-R6 requires `npm run check:env` "if safe" at line 49, while A15-R9 says reports include command summaries and not raw secrets at line 52. It does not explicitly forbid saving raw stdout/stderr from env checks.
**Why it matters:** Environment checks can mention key names, missing secrets, or local paths. A release report should capture pass/fail and redacted summaries only.
**Failure mode:** A validation report accidentally stores local secret values, webhook URLs, or implementation-specific environment details.
**Recommendation:** PRD v2 must state that raw `check:env` output is not pasted into Markdown; only pass/fail, redacted key names, and non-sensitive error summaries may be recorded.

### P1 - High Risk

#### 1. APK build scope is ambiguous

**Evidence:** A15-R7 allows either running `npm run build:apk` or deferring it at line 50. A15 is described as source/config validation, but APK build can take the gate into Android publication evidence.
**Why it matters:** A stale or failed APK build matters, but A15 should not duplicate authenticated Android runtime gates or create a new publishable artifact claim.
**Failure mode:** A15 runs `build:apk`, produces a new APK artifact, and future docs mistake that artifact for publication approval.
**Recommendation:** PRD v2 should define APK build as optional packaging validation only. If run, it must not imply publication; if skipped, the report must cite A12/A13 and leave Android publication gates open.

#### 2. Failure remediation boundary is missing

**Evidence:** A15-R8 says failures become blockers with remediation recommendations at line 51, but the PRD does not say whether A15 should fix failures in the same cycle.
**Why it matters:** If checks fail, code changes may be needed. The user requires PRD/review/plan cycles per feature. A15 should not silently start broad remediation beyond its validation scope.
**Failure mode:** The validation preflight turns into unplanned code editing without a remediation PRD/plan.
**Recommendation:** PRD v2 must say A15 may fix only documentation/reporting issues in A15; code/test remediation requires a follow-up remediation cycle unless the failure is a trivial command/report typo.

### P2 - Medium Risk

#### 1. Test evidence needs summary fields

**Evidence:** A15-R4 requires `npm test` and "test count/failure summary" at line 47 but does not require elapsed time, skipped status, or command exit code.
**Why it matters:** Node test output can be long; a release owner needs compact, comparable metadata.
**Failure mode:** The report says "tests failed" without enough context to route remediation.
**Recommendation:** Require exit code, elapsed time if available, test/pass/fail counts, and first failure summary.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

It treats validation as straightforward command execution, but release validation reports can themselves leak secrets or overclaim if command boundaries are loose.

## Missing Validation

- Redacted env-output handling.
- Explicit APK build non-publication language.
- Code-remediation boundary.
- Exit-code metadata for each command.

## Revised Recommendations

1. Add redacted `check:env` handling.
2. Define APK build as packaging-only and non-publication if run.
3. Require follow-up remediation cycle for code/test failures.
4. Capture exit code and concise failure metadata for every command.

## Go / No-Go Recommendation

No-go for execution on PRD v1. Proceed after PRD v2 incorporates the output-hygiene and scope controls.

## Plan Revision Inputs

### Required Deletions

- Remove any ambiguity that APK build implies publication readiness.

### Required Additions

- Raw env output prohibition.
- Command exit-code metadata.
- Code remediation boundary.

### Required Acceptance Criteria Changes

- Validation report must include exit code/pass/fail for every command.
- Env failures must be redacted.

### Required Validation Changes

- Secret scan over A15 docs after validation report creation.

### Required No-Go Gates

- No final release readiness claim from A15 alone.
- No code remediation inside A15 unless separately planned.

## Residual Risks

A15 can prove current command status, but it cannot prove production runtime behavior, Android TalkBack order, URL-share success, or publication readiness.
