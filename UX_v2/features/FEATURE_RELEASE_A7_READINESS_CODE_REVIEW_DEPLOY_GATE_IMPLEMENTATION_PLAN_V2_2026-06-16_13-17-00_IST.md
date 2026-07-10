# A7 Release Readiness Implementation Plan V2

Created: 2026-06-16 13:17:00 IST
Owner: Main Codex execution agent
Status: Approved for execution after adversarial review
Source PRD: `FEATURE_RELEASE_A7_READINESS_CODE_REVIEW_DEPLOY_GATE_PRD_V2_2026-06-16_13-14-00_IST.md`

## Scope

Create release-readiness and code-review artifacts. A7 is a decision gate, not a production deploy and not an APK publication. It should not intentionally change application behavior.

## Steps

1. Collect current evidence.
   - Read A1-A6 QA reports, A6 preflight JSON, web integrated QA, project tracker, milestone tracker, and current git status.
   - Record the validation gates already run after A6: preflight, whitespace, typecheck, lint, tests, and build.

2. Review release-critical surfaces.
   - Inspect changed UX v2 routes/components/client/offline/service-worker/Android contract files.
   - Lead with P0/P1 findings and release blockers.
   - Add dirty-worktree attribution: A7 authored only A7 docs/reports unless a later explicit fix is made.

3. Integrate sidecar findings.
   - Wait once with a bounded timeout for PM and release-review sidecars.
   - If a sidecar is not complete, mark it pending in the release packet rather than waiting indefinitely.

4. Run redaction scan.
   - Scan A6/A7 markdown/JSON and latest QA reports for obvious secret-bearing patterns:
     - `brain-session`
     - `Bearer `
     - `BRAIN_API_TOKEN`
     - `sessionToken`
     - `session=`
     - `cookie`
     - `pin`
     - unredacted six-digit pairing-code contexts
   - Manually inspect any matches and classify expected safe references versus leakage.

5. Create A7 outputs.
   - `UX_v2/execution/UX_V2_A7_CODE_REVIEW_2026-06-16_13-18-00_IST.md`
   - `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
   - `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_13-18-00_IST.md`
   - Update `UX_v2/project_management/UX_V2_PROJECT_TRACKER_2026-06-15_21-46-45_IST.md` with an A7 checkpoint.

6. Final doc validation.
   - Run `git diff --check`.
   - Re-run A7 redaction scan after report creation.
   - State whether any build-impacting files changed after the A6 typecheck/lint/tests/build pass.

## Report Structure

The release packet must include a gate table with these statuses:

- `passed`
- `blocked`
- `not_run`
- `not_applicable`

Gate rows:

- Static checks.
- Code review.
- Dirty-worktree attribution.
- Secret hygiene.
- Backup.
- Rollback.
- Production deploy.
- Live smoke.
- Observability.
- Android runtime.
- APK publication.
- Final release status.

## Expected Result

Expected final status is `local_candidate_only`: local static and browser evidence is strong, but production release is blocked by missing production backup/rollback/deploy/live smoke/observability and missing Android runtime proof.
