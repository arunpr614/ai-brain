# Open Brain Phase 20 PR #7 Release Gate Application Plan

Created: 2026-06-13 22:53:59 IST

## Purpose

This plan converts the current Phase 20 release-readiness backlog into an execution-ready application plan. The immediate goal is to move PR #7 from "mergeable but blocked" to safely merged and production-verified, without weakening the backend save contract, user isolation guarantees, or live QA evidence requirements.

## Current State

- PR #7 is open and mergeable.
- GitHub CI is green.
- Vercel is still red because the check points to a Vercel team invite/access URL rather than a successful deployment result.
- The backend contract remediation is committed locally as `5839009`.
- The backend patch still needs to be deployed through Supabase and verified live.
- PR #7 must not be merged until Preview deployment, authenticated smoke, data-safety audit, and evidence capture are complete.

## Release Rule

Do not merge PR #7 while any of these remain incomplete:

- Vercel Preview is red or inaccessible.
- Backend contract patch is not deployed.
- Authenticated Preview smoke has not passed.
- Phase 20 data-safety audit has not passed.
- Release evidence has not been documented.
- Cleanup for disposable QA users and saves has not been verified.

## P0 - Release Blockers

### P0.1 Resolve the Vercel PR #7 Deployment Blocker

Objective: restore a real, accessible PR #7 Preview deployment and make the Vercel check green.

Implementation steps:

1. Confirm whether the current Vercel failure is caused by team access, an expired invite, missing GitHub/Vercel connection, or a real build failure hidden behind the invite URL.
2. Fix the Vercel team access issue from the Vercel dashboard or connected account.
3. Re-run the PR #7 Preview deployment after access is fixed.
4. Confirm the Preview URL opens without requiring a Vercel invite for normal QA access.
5. Confirm the PR #7 Vercel check turns green.
6. Record the final Preview URL and deployment identity for evidence.

Acceptance criteria:

- PR #7 has a green Vercel deployment check.
- Preview URL loads the Open Brain login screen.
- Preview deployment maps to the expected PR #7 commit.
- No merge occurs while Vercel is red.

Evidence to capture:

- PR number.
- Preview URL.
- Expected commit SHA.
- Deployment identity or Vercel deployment URL.
- Timestamp.
- Result: pass/fail.

### P0.2 Deploy the Backend Contract Patch

Objective: deploy the local backend contract fix so the live backend matches the PR #7 frontend expectations.

Implementation steps:

1. Confirm local backend commit `5839009` contains the intended backend changes.
2. Apply the backend patch through the canonical backend deployment path.
3. Run the Supabase DB migration that aligns the health-event constraint with the frontend event contract.
4. Deploy the `open-brain-web` Supabase function.
5. Verify legacy default responses are available for expected empty states.
6. Verify `/events` accepts `save_edited` and `save_deleted`.
7. Verify unsupported event names are rejected.

Acceptance criteria:

- Supabase migration is applied successfully.
- `open-brain-web` function is deployed successfully.
- `save_edited` and `save_deleted` are accepted by the live `/events` endpoint.
- Unsupported health-event names still fail safely.
- Legacy empty-state routes return stable defaults instead of noisy failures.

Evidence to capture:

- Backend commit SHA: `5839009`.
- Supabase deployment timestamp.
- Migration identifier.
- Function deployment result.
- Event probe summary.

### P0.3 Run Authenticated Preview Smoke on PR #7

Objective: prove the PR #7 Preview works for the complete authenticated Capture -> Save -> Review loop.

Implementation steps:

1. Use a disposable QA user only.
2. Sign in on the PR #7 Preview URL.
3. Confirm the smoke script verifies the expected commit SHA before testing product behavior.
4. Run Capture reflection.
5. Save one Insight.
6. Save one Decision.
7. Save one Follow-up.
8. Refresh the page and confirm all saves persist.
9. Open Review and confirm the saved records appear.
10. Close a Follow-up.
11. Pin a save.
12. Mark a save reviewed or unreviewed.
13. Edit a save.
14. Delete a save.
15. Confirm mobile layout for Capture and Review.
16. Verify cleanup deletes QA saves.
17. Verify cleanup deletes the disposable QA user.
18. Confirm cleanup is verified, not merely attempted.

Acceptance criteria:

- Sign-in succeeds.
- Capture reflection succeeds.
- All three save types persist.
- Review shows persisted saves after refresh.
- Follow-up close works.
- Pin/review/edit/delete work.
- Mobile layout is usable.
- Expected commit SHA is verified.
- Disposable QA data cleanup is verified.

Evidence to capture:

- Target Preview URL.
- Expected commit SHA.
- Deployment identity.
- QA email only.
- Timestamp.
- Feature pass/fail summary.
- Console warning/error summary.
- Cleanup verification summary.

### P0.4 Run Phase 20 Data-Safety Audit

Objective: prove user-scoped durable saves cannot leak across accounts or direct table access.

Implementation steps:

1. Create disposable User A.
2. Create disposable User B.
3. Create durable saves for User A.
4. Confirm unauthenticated `/saves` access returns `401`.
5. Confirm User B cannot list User A saves.
6. Confirm User B cannot search into User A saves.
7. Confirm User B cannot filter into User A saves.
8. Confirm User B cannot patch User A saves.
9. Confirm User B cannot delete User A saves.
10. Confirm User B cannot count User A saves.
11. Confirm User B cannot cursor into User A saves.
12. Confirm direct Supabase table access respects RLS.
13. Confirm anon direct table behavior is safe.
14. Delete disposable saves.
15. Delete disposable users.
16. Verify cleanup for both users.

Acceptance criteria:

- Unauthenticated access returns `401`.
- Cross-user list/search/filter/count/cursor access returns no leaked data.
- Cross-user patch/delete fails safely.
- Direct table probes respect RLS.
- Disposable data cleanup is verified.

Evidence to capture:

- Target URL.
- User A QA email only.
- User B QA email only.
- Timestamp.
- Route isolation result.
- Direct table RLS result.
- Cleanup result.

### P0.5 Document Release Evidence

Objective: leave a clean audit trail that proves PR #7 is safe to merge and later release to Production.

Implementation steps:

1. Create a QA evidence markdown file under `docs/qa`.
2. Include target URL, commit SHA, deployment identity, timestamp, and QA email only.
3. Include authenticated smoke results.
4. Include data-safety audit results.
5. Include console summary.
6. Include cleanup verification.
7. Explicitly state that no secrets were stored.

Acceptance criteria:

- Evidence file exists before merge.
- Evidence is specific enough for a future reviewer to understand what passed.
- Evidence includes no passwords, tokens, anon keys, service-role keys, project secrets, or personal secrets.

### P0.6 Merge PR #7 and Production-Verify

Objective: merge only after Preview is proven safe, then repeat the release checks against Production.

Implementation steps:

1. Confirm P0.1 through P0.5 are complete.
2. Merge PR #7.
3. Redeploy Production.
4. Confirm Production points to the merged commit.
5. Run authenticated Production smoke using a disposable QA user.
6. Run Phase 20 data-safety audit against Production.
7. Document Production evidence.
8. Keep rollback ready until Production smoke and data-safety audit pass.

Acceptance criteria:

- PR #7 is merged only after all Preview gates pass.
- Production is redeployed.
- Production authenticated smoke passes.
- Production data-safety audit passes.
- Production evidence is documented.
- Rollback path remains available until Production is verified.

## P1 - Automation and Product Polish

### P1.1 Automate Live Smoke Safely

Objective: make live smoke repeatable without exposing secrets or relying on local machine state.

Implementation steps:

1. Add a manual GitHub Action for live smoke.
2. Gate the action behind protected environment approval.
3. Require `target_url` input.
4. Require `expected_commit_sha` input.
5. Store Supabase secrets only in protected GitHub environment secrets.
6. Redact all sensitive values from logs.
7. Upload a redacted smoke evidence artifact.
8. Keep live smoke opt-in only.

Acceptance criteria:

- Live smoke can be triggered manually.
- It cannot run without approval.
- It requires an explicit target URL and expected commit SHA.
- No secret values appear in logs or artifacts.
- The artifact includes pass/fail summary and cleanup result.

### P1.2 Add Backend Route Contract Tests

Objective: lock backend route behavior so future frontend work does not depend on accidental empty-state behavior.

Implementation steps:

1. Test `/settings/:model` returns defaults when no preferences exist.
2. Test `/conversations` returns `{ conversations: [] }` for an empty state.
3. Test `/wiki/pages` returns a stable disabled empty state.
4. Test `/events` accepts supported event names.
5. Test `/events` rejects unsupported event names.
6. Include edit/delete event names in the supported contract.

Acceptance criteria:

- Backend tests cover all legacy empty-state defaults.
- Backend tests cover health-event allow-list behavior.
- Unsupported event names fail with a clear client-safe error.

### P1.3 Finish Review Pagination Contract

Objective: make Review durable for larger save sets without duplicate records or unstable pagination.

Implementation steps:

1. Confirm backend cursor format and ordering.
2. Ensure cursor ordering is stable across pages.
3. Add frontend "Load more" behavior.
4. Reset cursor when filters change.
5. Reset cursor when sort changes.
6. Prevent duplicate records across pages.
7. Add browser tests for first page, next page, no duplicates, and filter reset.

Acceptance criteria:

- Review can load additional results.
- Filter changes reset pagination cleanly.
- Sort changes reset pagination cleanly.
- No duplicate saves appear after loading more.
- Tests cover pagination behavior.

### P1.4 Improve Review Usability

Objective: make Review easier to scan and use every day.

Implementation steps:

1. Replace source free-text filter with a dropdown generated from actual saved sources.
2. Persist filters and sort in URL or local state.
3. Add clearer empty states for each active filter.
4. Add one-click filter reset from empty states.
5. Add mobile Review regression coverage.
6. Confirm the Review layout remains compact and scannable.

Acceptance criteria:

- Source filtering uses real saved sources.
- Filters survive refresh or navigation where appropriate.
- Empty states explain the current filter result without looking like an error.
- Mobile Review remains usable.

### P1.5 Improve Capture Save UX

Objective: reduce friction and accidental duplicate saves from Capture.

Implementation steps:

1. Add source presets.
2. Keep manual source editing available.
3. Add stronger duplicate detection against existing saved records.
4. Add topics suggestions from previous saves.
5. Add people suggestions from previous saves.
6. Add "Save and open Review."
7. Ensure failed saves never show fake success.

Acceptance criteria:

- Users can choose source presets or edit source manually.
- Duplicate warning checks prior saved records, not only same-session saves.
- Topics and people suggestions are useful but optional.
- "Save and open Review" lands on the saved item or matching Review context.
- Save failures show real errors.

### P1.6 Health-Event Observability

Objective: make product health visible without storing sensitive user content.

Implementation steps:

1. Add `docs/ops/phase20-health-events.md`.
2. Document all safe event names.
3. Document allowed metadata for each event.
4. Add query examples for event volume and failure rates.
5. Add a check that raw user content is not tracked.
6. Document how to investigate unusual save failure spikes.

Acceptance criteria:

- Health-event doc exists.
- Safe event names and metadata are clear.
- Query examples are copy-ready for operations.
- No raw capture, reflection, or save content is tracked in health events.

## P2 - Workflow Expansion

### P2.1 Turn Review Into a Real Workflow

Objective: move Review beyond a list into a useful personal operating loop.

Implementation steps:

1. Add a Pinned section.
2. Add a Needs Review queue.
3. Add Due Soon grouping.
4. Add recurring follow-ups.
5. Add careful bulk actions.
6. Add safeguards for destructive bulk actions.

Acceptance criteria:

- Review supports daily prioritization.
- Follow-ups can be grouped by urgency.
- Recurring follow-ups have clear next occurrence behavior.
- Bulk actions are reversible or confirmation-protected where needed.

### P2.2 Legacy Memory Migration

Objective: decide how old `thoughts` and memory records should relate to Phase 20 durable saves.

Implementation steps:

1. Inventory legacy `thoughts` and memory fields.
2. Identify which legacy fields map to durable-save fields.
3. Decide whether legacy memories should appear in Review.
4. Build a read-only compatibility view first if legacy memories should be visible.
5. Validate compatibility view with user-scoped access.
6. Add a one-time import path only after approval.

Acceptance criteria:

- Legacy data shape is documented.
- Migration decision is explicit.
- Read-only view is validated before any import.
- No one-time import is built without approval.

### P2.3 Richer Provenance

Objective: make each save explain where it came from without cluttering Review.

Implementation steps:

1. Store original capture text where appropriate.
2. Store reflection mode.
3. Store provider and model.
4. Store app surface.
5. Store source URL or conversation ID where relevant.
6. Add backend validation for new provenance fields.
7. Show provenance compactly in Review.

Acceptance criteria:

- Provenance fields are validated.
- Review shows provenance without overwhelming the save content.
- Sensitive values are not exposed accidentally.
- Provenance can support future filtering/search.

### P2.4 Notifications and Reminders

Objective: add reminders only after Review workflow behavior proves useful.

Implementation steps:

1. Add due-date reminders for Follow-ups.
2. Add reminder preference model.
3. Add daily or weekly Review digest.
4. Keep notifications opt-in.
5. Add email or app notifications only after digest/reminder workflow is validated.

Acceptance criteria:

- Reminder preferences are explicit.
- Reminders are opt-in.
- Digest content is useful and low-noise.
- Notification implementation does not precede workflow validation.

## Recommended Execution Sequence

1. Resolve Vercel access and turn PR #7 Preview green.
2. Deploy backend commit `5839009` and Supabase migration.
3. Run authenticated Preview smoke.
4. Run Phase 20 data-safety audit on Preview.
5. Document Preview release evidence.
6. Merge PR #7.
7. Redeploy Production.
8. Run authenticated Production smoke.
9. Run Phase 20 data-safety audit on Production.
10. Document Production evidence.
11. Start P1 automation and route contract tests.
12. Finish Review pagination and usability polish.
13. Improve Capture save UX.
14. Move into P2 workflow expansion only after release gates and P1 foundations are stable.

## Rollback and Safety Notes

- Keep PR #7 unmerged while Vercel is red.
- Keep rollback ready until Production smoke passes.
- Never store passwords, tokens, anon keys, service-role keys, or project secrets in evidence docs.
- Use disposable QA users for live tests.
- Verify cleanup instead of assuming cleanup succeeded.
- Treat cross-user data access failures as release blockers.
- Treat missing expected commit SHA verification as a release blocker.

## Completion Definition

This plan is complete when:

- PR #7 is merged only after Preview release gates pass.
- Production is redeployed from the merged PR.
- Authenticated Production smoke passes.
- Production data-safety audit passes.
- Release evidence is documented without secrets.
- P1 automation work is queued with clear acceptance criteria.
