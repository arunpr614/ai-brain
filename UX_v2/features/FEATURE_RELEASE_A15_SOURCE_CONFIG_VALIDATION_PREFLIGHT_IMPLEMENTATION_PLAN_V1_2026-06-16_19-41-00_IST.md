# Feature Release A15 Source And Config Validation Preflight Implementation Plan V1

Created: 2026-06-16 19:41:00 IST
Owner: Codex
Status: Draft for adversarial review
PRD: `FEATURE_RELEASE_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_PRD_V2_2026-06-16_19-39-00_IST.md`

## Execution Principles

- Run validation only; do not edit product source, tests, app assets, production data, or APK artifacts.
- Do not stage, commit, push, deploy, publish, sign, or upload.
- Capture exit codes and concise summaries, not raw secret-bearing output.
- Preserve A13/A14 no-go labels.
- If code/test validation fails, document blockers and stop short of broad remediation.

## Command Order

1. Inventory snapshot:
   - `git status --short | wc -l`
   - `git ls-files --others --exclude-standard | wc -l`
2. Source/config checks:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`
3. Safe support checks:
   - `npm run check:env`
   - `npm run check:build-artifacts`
4. APK build decision:
   - Defer `npm run build:apk` unless source/config checks all pass and there is enough time to run packaging validation without claiming publication.

## Output Artifacts

Create:

- `UX_v2/execution/UX_V2_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_REPORT_<actual_timestamp>_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<actual_timestamp>_IST.md`

Update if needed:

- `UX_v2/trackers/milestone_tracker.md`
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
- `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
- root `RUNNING_LOG.md`

## Report Requirements

The validation report must include:

- Command timestamp.
- Dirty inventory counts.
- Command pass/fail matrix with exit codes.
- Summaries of errors/warnings/failures.
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
| `build:apk` | Defer unless source/config checks pass; if run, classify as packaging validation only. |

## Validation After Report

- `git diff --check` on A15-touched tracked files.
- trailing-whitespace scan on A15 Markdown docs.
- secret-pattern scan on A15 Markdown docs.
- unsafe-positive claim scan for final release, staging, publication, or goal completion assertions.

## No-Go Conditions

- Any failed source/config command keeps release validation blocked.
- A15 cannot close dirty-worktree ownership, publication authorization, TalkBack spoken-order, or URL-share no-go gates.
- No code remediation occurs in A15 without a follow-up remediation cycle.
