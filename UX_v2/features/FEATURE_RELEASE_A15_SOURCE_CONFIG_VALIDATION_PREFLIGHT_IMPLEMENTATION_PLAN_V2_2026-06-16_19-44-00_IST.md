# Feature Release A15 Source And Config Validation Preflight Implementation Plan V2

Created: 2026-06-16 19:44:00 IST
Owner: Codex
Status: Approved for scoped execution
PRD: `FEATURE_RELEASE_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_PRD_V2_2026-06-16_19-39-00_IST.md`
Supersedes: `FEATURE_RELEASE_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_IMPLEMENTATION_PLAN_V1_2026-06-16_19-41-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_19-42-00_IST.md`

## Execution Principles

- Run validation only; do not edit product source, tests, app assets, production data, or APK artifacts.
- Do not stage, commit, push, deploy, publish, sign, or upload.
- Capture exit codes and concise summaries, not raw secret-bearing output.
- Preserve A13/A14 no-go labels.
- If code/test validation fails, document blockers and stop short of broad remediation.

## Command Status Taxonomy

| Status | Meaning |
| --- | --- |
| `passed` | Command exited 0 and output did not contain a blocking failure. |
| `failed` | Command exited non-zero or reported blocking failures. |
| `skipped` | Command was intentionally not run because an earlier gate failed or scope excluded it. |
| `blocked_or_inconclusive` | Command timed out, was interrupted, or could not produce a reliable result. |

## Command Order

1. Inventory snapshot:
   - `git status --short | wc -l`
   - `git ls-files --others --exclude-standard | wc -l`
2. Core source/config checks:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`
3. Safe support checks, only if all core checks pass:
   - `npm run check:env`
   - `npm run check:build-artifacts`
4. APK build decision:
   - Defer `npm run build:apk` unless all core and support checks pass and packaging validation is intentionally needed. If deferred, cite A12/A13 APK evidence and keep Android publication gates open.

If any core check fails or is blocked/inconclusive, skip later optional support/APK checks and record the skip reason.

## Output Artifacts

Create:

- `UX_v2/execution/UX_V2_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_REPORT_<actual_timestamp>_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<actual_timestamp>_IST.md`

Update:

- `UX_v2/trackers/milestone_tracker.md`
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
- `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
- root `RUNNING_LOG.md`

## Report Requirements

The validation report must include:

- Command timestamp.
- Dirty inventory counts.
- Command status matrix with exit codes.
- Concise summaries of errors/warnings/failures.
- Explicit skipped-check rationale, if any.
- APK build decision.
- Residual blockers and next remediation cycle recommendations.
- A13/A14 no-go labels preserved.

## Check-Specific Handling

| Check | Handling |
| --- | --- |
| `typecheck` | Record first meaningful TypeScript error group if failed. |
| `lint` | Record error/warning count and first meaningful issue group if failed. |
| `test` | Record pass/fail counts and first failing test names if failed. |
| `build` | Record pass/fail and warning class; do not paste large logs. |
| `check:env` | Record pass/fail only and redact any key/value-like output. |
| `check:build-artifacts` | Record pass/fail and missing artifact names if safe. |
| `build:apk` | Defer unless checks pass and packaging validation is intentionally in scope; if run, classify as packaging validation only. |

## Validation After Report

- `git diff --check` on A15-touched tracked files.
- trailing-whitespace scan on A15 Markdown docs.
- secret-pattern scan on A15 Markdown docs.
- unsafe-positive claim scan for final release, staging, publication, or goal completion assertions.

## No-Go Conditions

- Any failed source/config command keeps release validation blocked.
- Any blocked/inconclusive core command keeps release validation blocked until rerun.
- A15 cannot close dirty-worktree ownership, publication authorization, TalkBack spoken-order, or URL-share no-go gates.
- No code remediation occurs in A15 without a follow-up remediation cycle.
