# Open Brain Phase 20 PR #7 Post-Merge Production Smoke and Next Implementation Plan

Created: 2026-06-13 22:07:25 IST
Status: Implementation plan
Primary repo: `open-brain-web`
Current checkpoint: PR #7 is open, mergeable, and checks are green.

## Executive Summary

This plan covers the remaining work after PR #7, with the highest priority on release readiness and production safety.

PR #7 already implements a major part of the Phase 20 stabilization and polish plan, including frontend legacy-fetch quieting, Capture save UX improvements, Review filter/sort improvements, QA documentation, and a live smoke script. However, those improvements are not part of `main` until PR #7 is merged.

The immediate implementation path is:

1. Merge PR #7.
2. Run authenticated Production smoke QA using disposable QA credentials.
3. Complete the production data safety audit for durable saves.
4. Add backend stable defaults for legacy routes.
5. Document final smoke evidence.
6. Move into P1 Review/Capture polish and regression coverage.
7. Schedule P2 workflow, provenance, migration, and reminder work after P0/P1 are stable.

## Current State

### Already Done in PR #7

- Production `VITE_API_BASE_URL` was aligned to `/api/open-brain-web`.
- Production was redeployed.
- Public Production login render passed.
- Frontend shell was quieted by lazy-loading or fallback handling for legacy settings, conversations, and wiki fetches.
- Capture Save gained:
  - editable save content,
  - editable source,
  - same-session duplicate warning,
  - View in Review action after save.
- Review gained:
  - source filter,
  - sort controls,
  - filter-aware empty states,
  - Open Follow-ups quick filter.
- QA documentation and smoke tooling were added.
- Checks on PR #7 are green.

### Still Not Done

- PR #7 is not merged into `main`.
- Authenticated Production smoke has not been run.
- Production data safety audit is still pending.
- Backend default responses for legacy routes are still pending.
- Final authenticated smoke evidence has not been documented.
- P1 polish and P2 workflow improvements remain future implementation work.

## Recommended Delivery Order

| Order | Priority | Workstream | Reason |
|---:|---|---|---|
| 1 | P0 | Merge PR #7 | Makes existing stabilization work available on `main`. |
| 2 | P0 | Production smoke QA | Confirms real user flow works after merge. |
| 3 | P0 | Data safety audit | Confirms durable saves are user-isolated before more workflow features are built. |
| 4 | P0 | Backend legacy defaults | Removes avoidable backend noise and stabilizes empty states. |
| 5 | P0 | Final QA evidence | Creates an auditable production release record. |
| 6 | P1 | Review/Capture polish | Improves daily usability after the base contract is safe. |
| 7 | P1 | Regression coverage and health signals | Protects the core loop as features expand. |
| 8 | P2 | Workflow, migration, provenance, reminders | Builds the larger product experience once P0/P1 are proven. |

---

# P0 Implementation Plan

## P0.1 Merge PR #7

### Objective

Merge the completed Phase 20 production stabilization and Review polish work into `main`.

### Scope

- Verify PR #7 is still open, mergeable, and green.
- Confirm no new review comments or requested changes exist.
- Merge PR #7 into `main`.
- Confirm `main` receives the expected commit.
- Confirm Vercel starts or completes a `main` deployment.

### Implementation Steps

1. Open PR #7 and confirm:
   - mergeable state is clean,
   - all checks are green,
   - PR is ready for review,
   - no unresolved blocking comments exist.
2. Merge using the repo's preferred merge method.
3. Confirm the merge commit or squash commit is present on `main`.
4. Confirm Vercel Production deployment is triggered from the new `main`.
5. Wait for deployment to complete.
6. Record deployment URL and timestamp.

### Acceptance Criteria

- PR #7 is closed as merged.
- `main` includes PR #7 changes.
- Vercel Production deployment from updated `main` is ready.
- No required check is failing after merge.

### Validation

- GitHub PR status shows merged.
- Production URL renders login screen.
- Browser console has no blocking startup errors on public render.

### Risks

- A new commit lands on `main` before merge and changes mergeability.
- Vercel deployment passes build but runtime envs are incorrect.

### Rollback Plan

- If Production breaks after merge, revert the merge commit or restore the prior Production deployment in Vercel.

## P0.2 Run Authenticated Production Smoke QA

### Objective

Confirm the complete authenticated Capture to Save to Review loop works in Production after PR #7 is merged.

### Required Credentials and Environment

Use disposable QA credentials only. Do not use a personal account for release smoke testing.

Required environment variables:

- `PHASE20_LIVE_SMOKE=1`
- `PHASE20_TARGET_URL=https://open-brain-web-orpin.vercel.app`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Smoke Checklist

1. Open Production URL.
2. Sign in as disposable QA user.
3. Confirm app shell loads without noisy console errors.
4. Run Capture reflection.
5. Save reflection as Insight.
6. Save reflection as Decision.
7. Save reflection as Follow-up.
8. Refresh the browser.
9. Confirm all saved records persist.
10. Open Review.
11. Confirm saved Insight, Decision, and Follow-up appear.
12. Close the Follow-up.
13. Pin a record if pinning is available in the current Production build.
14. Mark a record reviewed if reviewed state is available in the current Production build.
15. Edit a saved record.
16. Delete a saved record.
17. Confirm mobile layout at a phone-sized viewport.
18. Confirm failed saves show a real user-facing error.
19. Cleanup disposable QA user and temporary saved records.

### Acceptance Criteria

- Disposable QA user can sign in.
- Reflection completes successfully.
- Insight, Decision, and Follow-up saves succeed.
- Saves remain after refresh.
- Review displays saved records correctly.
- Follow-up close action persists.
- Edit/delete behavior works where implemented.
- Mobile layout is usable.
- Cleanup succeeds.
- No personal user data is used.

### Validation

- Run the live smoke script added in PR #7.
- Supplement with manual browser verification for any flows not covered by the script.
- Capture timestamp, target URL, and pass/fail result.

### Risks

- Missing service-role key prevents automated disposable user cleanup.
- Production auth settings may differ from Preview settings.
- Vercel env drift may cause runtime failures despite green builds.

### Rollback Plan

- If auth or saves fail in Production, pause further feature work.
- Restore prior Production deployment if user-facing impact is high.
- Open a P0 fix PR with exact failing smoke step and evidence.

## P0.3 Production Data Safety Audit

### Objective

Verify that `phase20_durable_saves` is safe for Production use and prevents cross-user access.

### Scope

- Row-level security or equivalent isolation.
- User ownership through `user_id`.
- Authenticated-only access.
- Cross-user read, update, and delete denial.
- Service-role cleanup path is not browser-accessible.
- P2 fields do not weaken isolation.

### Implementation Steps

1. Inspect durable save schema and policies.
2. Confirm `phase20_durable_saves` has `user_id` ownership.
3. Confirm unauthenticated requests cannot list, create, update, or delete saves.
4. Create disposable user A.
5. Create disposable user B.
6. User A creates one save of each type:
   - Insight,
   - Decision,
   - Follow-up.
7. User B attempts to:
   - list user A saves,
   - fetch user A save by id if route supports it,
   - patch user A save,
   - delete user A save.
8. Confirm all cross-user attempts fail safely.
9. Confirm user A can still access and manage their own records.
10. Cleanup both disposable users and all temporary records.

### Acceptance Criteria

- Unauthenticated durable-save access fails with `401` or equivalent.
- User B cannot read user A saves.
- User B cannot patch user A saves.
- User B cannot delete user A saves.
- User A can read, patch, and delete their own saves.
- Cleanup requires service-role or trusted backend privileges.
- No service-role secret is shipped to the browser.

### Validation

- Document request summary, expected status, actual status, and result.
- Add audit evidence to `docs/qa` or `docs/security`.

### Risks

- Existing tests may cover happy path but not cross-user denial.
- Backend filters may rely on client-sent `user_id`, which would be unsafe.
- New fields such as pin/review/due date may not be covered by policies.

### Rollback Plan

- If user isolation fails, disable durable-save write routes in Production until patched.
- Open a blocking backend PR with RLS/policy fixes and cross-user tests.

## P0.4 Backend Legacy Default Responses

### Objective

Make backend legacy routes return stable empty/default responses instead of avoidable errors for expected empty states.

### Routes

- `/settings/*`
- `/conversations`
- `/wiki/pages`

### Current State

PR #7 quiets the frontend by lazy-loading and fallback handling. This reduces user-facing noise, but backend routes should still behave predictably.

### Implementation Steps

1. Locate the canonical backend implementation for `open-brain-web`.
2. Review current behavior for each legacy route.
3. Decide the desired empty response contract:
   - settings route returns a valid default settings payload,
   - conversations route returns an empty list payload,
   - wiki pages route returns an empty list payload.
4. Add or update backend handlers.
5. Add contract tests for:
   - authenticated empty state,
   - unauthenticated behavior,
   - malformed requests,
   - stable response shape.
6. Deploy backend to Preview or staging equivalent.
7. Probe routes directly.
8. Deploy to Production after validation.

### Acceptance Criteria

- Expected empty states return stable successful payloads.
- Authentication behavior is explicit and tested.
- Login/home/review no longer cause noisy backend errors.
- Frontend fallbacks remain as defense in depth.

### Validation

- Automated backend route tests pass.
- Manual browser console check passes after sign-in.
- Network panel shows stable responses for expected empty-state calls.

### Risks

- Legacy routes may be intentionally disabled.
- Returning defaults without clear ownership may mask missing auth bugs.
- Backend changes may need Supabase Edge Function deployment.

### Rollback Plan

- If backend defaults create unexpected behavior, revert route changes and keep PR #7 frontend fallback behavior.

## P0.5 Document Final Authenticated Smoke Evidence

### Objective

Create a durable QA record for the post-merge Production smoke.

### Evidence File

Create a new file under `docs/qa` with a timestamped name, for example:

`phase20-production-authenticated-smoke-evidence-YYYY-MM-DD_HH-MM-SS_IST.md`

### Required Evidence

- Production URL tested.
- Deployment URL or Vercel deployment id.
- Timestamp.
- Tester or agent.
- Disposable QA user strategy.
- Smoke checklist results.
- Cleanup confirmation.
- Browser console summary.
- Known warnings or residual risks.
- Final pass/fail decision.

### Acceptance Criteria

- Evidence is committed to the repo.
- Evidence links back to PR #7 and the Production deployment.
- Any failure has a follow-up issue or PR.

---

# P1 Implementation Plan

## P1.1 Review Usability Polish

### Objective

Make Review easier to use as saved records grow beyond the first few test items.

### Remaining Scope

- Pagination or Load More.
- Backend cursor contract confirmation.
- Backend sorting support if needed.
- Source dropdown populated from actual saved sources.
- Persist filters/sort in URL or local state.
- Grouped sections for high-value daily use.

### Implementation Steps

1. Confirm current GET saves API supports:
   - limit,
   - cursor or offset,
   - type filter,
   - status filter,
   - source filter,
   - sort order.
2. If cursor support is missing, add backend cursor contract.
3. Add frontend Load More behavior.
4. Add loading and end-of-list states.
5. Build source dropdown from distinct sources in returned records or a backend source summary endpoint.
6. Persist selected filters and sort in the URL or local storage.
7. Add grouped Review sections:
   - Open Follow-ups,
   - Needs Review,
   - Pinned,
   - Recent.
8. Add one-click filter reset in empty states.
9. Add tests for filters, sorting, pagination, and empty states.

### Acceptance Criteria

- Review can load records incrementally.
- Filters and sort do not reset unexpectedly.
- Source filtering uses real saved sources.
- Empty states clearly reflect the active filter.
- No duplicate records appear while loading more.

## P1.2 Capture Save UX Improvements

### Objective

Reduce friction when saving useful reflection output from Capture.

### Remaining Scope

- Topics/people suggestions from prior saves.
- Stronger duplicate warning against existing saved records.
- Optional Save and Open Review one-step action.
- Better source/context presets.
- Content suggestions from reflection sections.

### Implementation Steps

1. Fetch recent saves or metadata summary after authenticated Capture loads.
2. Derive suggestions for:
   - topics,
   - people,
   - sources.
3. Add source presets:
   - capture reflection,
   - decision,
   - meeting note,
   - thought,
   - manual note.
4. Add existing-record duplicate check using normalized type, source, and content.
5. Keep warning non-blocking unless exact duplicate is confirmed.
6. Add Save and Open Review action.
7. Add content suggestion buttons if reflection sections are structured enough.
8. Add tests for suggestion rendering, duplicate warning, and Save and Open Review.

### Acceptance Criteria

- User can choose common source/context without typing.
- User sees relevant topic/person suggestions.
- Duplicate warning catches records saved in earlier sessions.
- Save and Open Review completes save first and only navigates after success.
- Failed save never displays fake success.

## P1.3 Browser Regression Coverage Expansion

### Objective

Protect the Capture to Save to Review loop with stronger browser-level regression tests.

### Remaining Scope

- Local failed-save browser path.
- Mobile Review smoke.
- Review filter combinations.
- Edit/delete browser path coverage.
- Optional live smoke workflow gated behind secrets.

### Implementation Steps

1. Add a mocked failed-save path test.
2. Add mobile viewport Review smoke test.
3. Add Review filter combination test:
   - type,
   - status,
   - source,
   - sort.
4. Add edit/delete test for Review records.
5. Add duplicate warning browser test.
6. Add a manual GitHub Action workflow for live smoke, gated behind environment approval.
7. Document how to run local mocked tests versus live Production smoke.

### Acceptance Criteria

- Browser tests pass locally.
- Failed save displays a real error.
- Mobile Review layout remains usable.
- Edit/delete behaviors are covered.
- Live smoke cannot run without explicit opt-in secrets.

## P1.4 Health Signal Observability

### Objective

Make product health inspectable without logging sensitive user content.

### Events to Track or Confirm

- `reflection_completed`
- `save_attempted`
- `save_succeeded`
- `save_failed`
- `review_opened`
- `follow_up_closed`
- `save_edited`
- `save_deleted`

### Implementation Steps

1. Inventory current event tracking implementation.
2. Confirm event payloads contain no raw capture text, reflection text, save content, names, emails, or free-form personal data.
3. Add tests for event payload redaction.
4. Create `docs/ops/phase20-health-events.md`.
5. Document:
   - event names,
   - when each event fires,
   - allowed fields,
   - disallowed fields,
   - example inspection query or workflow.
6. Add a simple event-health check workflow or query doc.

### Acceptance Criteria

- Product-safe health events are documented.
- Tests prevent sensitive content from being sent in event payloads.
- Operators can inspect whether the core loop is healthy.

---

# P2 Implementation Plan

## P2.1 Turn Review Into a Real Workflow

### Objective

Evolve Review from a saved-record list into a daily operating workflow.

### Scope

- Pinned section.
- Reviewed/unreviewed queue.
- Due-soon grouping.
- Recurring follow-ups.
- Bulk actions.

### Implementation Steps

1. Confirm current schema supports:
   - pinned state,
   - reviewed state,
   - due date,
   - recurrence metadata,
   - bulk update operations.
2. Add missing backend fields and validations.
3. Add Pinned section.
4. Add Needs Review queue.
5. Add Due Soon grouping.
6. Add recurring follow-up model:
   - recurrence rule,
   - next due date,
   - completed occurrence behavior.
7. Add bulk actions:
   - mark reviewed,
   - pin/unpin,
   - close follow-ups,
   - delete selected.
8. Add tests for all state transitions.

### Acceptance Criteria

- Review shows clear workflow sections.
- User can move items through reviewed/unreviewed states.
- Due-soon follow-ups are easy to find.
- Recurring follow-ups do not duplicate unpredictably.
- Bulk actions are confirmable and reversible where appropriate.

## P2.2 Legacy Memory Migration

### Objective

Decide how old `thoughts` or memory records should relate to the new durable-save system.

### Scope

- Inventory legacy fields.
- Decide whether old memories appear in Review.
- Create read-only compatibility view first.
- Later add one-time import if approved.

### Implementation Steps

1. Inventory legacy `thoughts` and memory tables.
2. Map legacy fields to durable save concepts:
   - content,
   - source,
   - topics,
   - people,
   - created time,
   - ownership.
3. Identify records that cannot safely map.
4. Propose one of three strategies:
   - keep legacy memories separate,
   - show read-only legacy memories in Review,
   - import legacy memories into `phase20_durable_saves`.
5. If showing in Review, create read-only compatibility view.
6. If importing, design one-time import with dry run and rollback.
7. Add migration documentation and tests.

### Acceptance Criteria

- No legacy data is moved without explicit approval.
- Ownership and RLS are preserved.
- Read-only compatibility view cannot mutate legacy data.
- Import plan includes dry run, summary, and rollback.

## P2.3 Better Provenance

### Objective

Improve trust and context for saved records by storing and displaying richer provenance.

### Scope

- Original capture.
- Reflection mode.
- Provider/model.
- App surface.
- Source URL or conversation id.
- Document ids where relevant.
- Prompt/template version.
- Strict backend validation.
- Compact Review display.

### Implementation Steps

1. Define provenance schema.
2. Decide which provenance fields are always stored, optional, or prohibited.
3. Add backend validation for provenance fields.
4. Add frontend provenance capture from Capture and Review surfaces.
5. Add compact provenance display in Review.
6. Add search/filter affordances later if useful.
7. Add tests for allowed and rejected provenance fields.

### Acceptance Criteria

- Provenance is useful without cluttering Review.
- Unsupported provenance fields are rejected or ignored according to the backend contract.
- Sensitive fields are not exposed in analytics events.
- Provenance display works on mobile.

## P2.4 Notifications and Reminders

### Objective

Add reminders only after Review workflow proves useful.

### Scope

- Due-date reminders.
- Daily or weekly Review digest.
- Reminder preference model.
- Opt-in notification design.
- Future email/app notification support.

### Implementation Steps

1. Validate that users are actually assigning due dates or follow-ups.
2. Define reminder preference model:
   - off by default,
   - digest frequency,
   - reminder time,
   - notification channel.
3. Add due-date reminder backend job or scheduled function.
4. Add daily or weekly digest generation.
5. Add opt-in UI.
6. Add unsubscribe or disable path.
7. Add tests for reminder eligibility and preference handling.

### Acceptance Criteria

- Reminders are opt-in.
- No reminders are sent for closed follow-ups.
- User can disable reminders.
- Digest does not expose sensitive content in unsafe channels.

---

# Cross-Cutting Requirements

## Security and Privacy

- Never expose service-role credentials to the browser.
- Use disposable QA users for live smoke.
- Do not use personal credentials in automated tests.
- Do not log raw user content in health events.
- Preserve user isolation in every backend route.

## Testing Expectations

P0 requires:

- PR status checks.
- Production smoke.
- Cross-user RLS audit.
- Backend route contract tests for legacy defaults.

P1 requires:

- Unit tests for new UI state.
- Browser tests for happy path, failed save, filters, edit/delete, and mobile Review.
- Event payload redaction tests.

P2 requires:

- Backend state transition tests.
- Migration dry-run tests.
- Provenance validation tests.
- Reminder preference and eligibility tests.

## Documentation Expectations

Add or update:

- `docs/qa/phase20-production-authenticated-smoke-evidence-YYYY-MM-DD_HH-MM-SS_IST.md`
- `docs/qa/phase20-live-smoke-checklist.md`
- `docs/security/phase20-durable-saves-data-safety-audit-YYYY-MM-DD_HH-MM-SS_IST.md`
- `docs/ops/phase20-health-events.md`
- migration decision doc for legacy memories
- reminder design doc before notification implementation

## Definition of Done

This plan is complete when:

- PR #7 is merged.
- Production smoke passes with disposable QA cleanup.
- Durable-save data isolation is documented and verified.
- Backend legacy routes return stable defaults or have a documented intentional-disabled behavior.
- P1 usability polish has a merged PR with browser coverage.
- Product-safe health events are documented and tested.
- P2 workflow and migration decisions are documented before implementation begins.

## Recommended Next Action

Start with P0.1:

Merge PR #7, confirm the Production deployment, then immediately run the authenticated Production smoke with disposable QA credentials.
