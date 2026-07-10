# Feature Release A16 Lint Warning Cleanup Implementation Plan V1

Created: 2026-06-16 19:51:00 IST
Owner: Codex
Status: Draft for adversarial review
PRD: `FEATURE_RELEASE_A16_LINT_WARNING_CLEANUP_PRD_V2_2026-06-16_19-50-00_IST.md`

## Execution Principles

- Touch only `src/lib/queue/enrichment-batch-cron.ts` for product source.
- Remove only the obsolete `// eslint-disable-next-line no-var` line.
- Do not stage, commit, push, deploy, publish, sign, upload, rebuild APK artifacts, or edit release ownership decisions.
- Preserve all A13/A14/A15 no-go gates unless separate evidence resolves them.
- Capture concise command summaries and avoid persisting raw secrets.

## Steps

1. Capture pre-edit inventory and source-line evidence:
   - `git status --short | wc -l`
   - `git ls-files --others --exclude-standard | wc -l`
   - `nl -ba src/lib/queue/enrichment-batch-cron.ts`
2. Remove the obsolete suppression line from `src/lib/queue/enrichment-batch-cron.ts`.
3. Validate:
   - `npm run lint`
   - `npm run typecheck`
4. Capture scoped diff evidence:
   - `git diff -- src/lib/queue/enrichment-batch-cron.ts`
   - `git diff --stat -- src/lib/queue/enrichment-batch-cron.ts`
5. Create execution report:
   - `UX_v2/execution/UX_V2_A16_LINT_WARNING_CLEANUP_QA_<actual_timestamp>_IST.md`
6. Create PM tracker update:
   - `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<actual_timestamp>_IST.md`
7. Update existing trackers:
   - `UX_v2/trackers/milestone_tracker.md`
   - `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
   - `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
8. Append root `RUNNING_LOG.md`.

## Validation After Documentation

- `git diff --check` for A16-touched tracked files.
- Trailing-whitespace scan for A16 Markdown docs.
- Unsafe-positive claim scan for staging, publication, deployment, and goal-completion over A16 docs.
- Secret-pattern scan over A16 docs, with literal review-template safety terms classified as non-secret.

## No-Go Conditions

- If the source diff touches anything beyond the obsolete suppression line, stop and revise.
- If lint exits non-zero or reports warnings, A16 is not complete.
- If typecheck exits non-zero, A16 is not complete.
- If tracker/log updates overclaim release completion, revise before closing A16.

## Expected Outcome

A16 should convert the A15 lint result from `passed_with_warning` to `passed` while leaving all final release and publication gates unchanged.
