# Open Brain Phase 20 PR #7 Adversarial Findings Remediation Implementation Plan

Created: 2026-06-13 22:21:56 IST
Status: Implementation plan
Source review: `OPEN_BRAIN_PHASE20_PR7_POST_MERGE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-13_22-16-12_IST.md`
Primary web repo: `/tmp/open-brain-web-phase20-pickup`
Canonical backend repo/path: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain`
Canonical backend function: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/functions/open-brain-web/index.ts`

## Executive Summary

This plan replaces the earlier post-merge plan with a stricter remediation plan that directly addresses every adversarial review finding.

The key change: **PR #7 must not be treated as production-stabilized just because it is mergeable and green.** The release process now needs explicit authenticated evidence, fail-hard cleanup, deployment identity verification, health-event contract alignment, and stronger user-isolation probes.

Recommended execution order:

1. Patch PR #7 or create a blocking pre-merge hardening PR for the release gates.
2. Fix the live smoke script so cleanup failure fails the run.
3. Fix or remove unsupported health events before using them as evidence.
4. Add deployment identity verification to smoke evidence.
5. Run authenticated Preview smoke before merge where possible.
6. Merge PR #7 only after release gates are satisfied, or merge under a documented Production smoke and rollback gate.
7. Run Production smoke with disposable QA user cleanup verification.
8. Complete expanded data-safety audit.
9. Implement backend legacy defaults with exact route decisions.
10. Continue P1/P2 product polish only after P0 gates are closed.

## Traceability From Adversarial Review

| Review Finding | Remediation In This Plan | Priority |
|---|---|---|
| Merge gate allows Production release before authenticated behavior is verified | Add pre-merge authenticated smoke gate or explicit Production rollback gate | P0 |
| Live smoke script can report success even when cleanup fails | Make cleanup fail-hard and verify zero QA residue | P0 |
| Health-event contract mismatch | Align frontend, backend validator, and database constraint, or remove unsupported events | P0 |
| Production smoke URL can test wrong deployment | Add deployment identity verification: commit SHA, deployment id, alias target | P0 |
| Backend legacy-default work is under-specified | Name canonical backend path, route contracts, and `/wiki/pages` decision | P1 |
| Data safety audit misses counts/cursors/direct table probes | Add direct Supabase RLS probes and count/cursor/filter/search checks | P0 |
| Secret-handling instructions too thin | Add explicit service-role secret rules and redaction requirements | P0 |
| P1/P2 Review workflow overlap | Split P1 list mechanics from P2 workflow sections | P2 |
| Pagination contract not tied to frontend support | Add `cursor` to frontend filter contract before Load More UI | P1 |
| Evidence docs branch/lifecycle unclear | Define docs-only PR or release-evidence commit path | P1 |

---

# P0 - Release Blockers

## P0.1 Tighten PR #7 Merge Gate

### Objective

Prevent PR #7 from being treated as production-stabilized until authenticated behavior is verified.

### Required Decision

Choose one of these release paths before merge:

1. **Preferred path: authenticated Preview smoke before merge.**
   - Use the PR #7 Vercel Preview URL.
   - Run disposable QA smoke against Preview.
   - Merge only after Preview smoke passes and cleanup is verified.

2. **Fallback path: controlled Production smoke immediately after merge.**
   - Merge only with an explicit rollback owner and rollback window.
   - Smoke Production immediately after deployment.
   - If smoke fails, restore the prior Vercel deployment or revert the merge.

### Implementation Steps

1. Confirm PR #7 status:
   - open,
   - mergeable,
   - non-draft,
   - all checks green,
   - no unresolved blocking review comments.
2. Confirm Vercel Preview deployment URL for PR #7.
3. Confirm Preview environment variables:
   - `VITE_API_BASE_URL=/api/open-brain-web`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Run authenticated Preview smoke if disposable QA credentials and service-role cleanup are available.
5. If Preview smoke cannot be run, document why and use the controlled Production smoke path.
6. Do not mark release stable until authenticated smoke passes.

### Acceptance Criteria

- PR #7 is not described as production-stabilized until authenticated smoke passes.
- If smoke cannot run before merge, the release notes explicitly say "merge ready, smoke pending."
- A rollback path is named before merge.

### No-Go Gate

Do not merge or declare stable if there is no approved smoke path and no rollback path.

## P0.2 Make Live Smoke Cleanup Fail-Hard

### Objective

Ensure the smoke script cannot report success if QA data or the QA user remain in Production.

### Files

- `/tmp/open-brain-web-phase20-pickup/scripts/phase20-live-smoke.mjs`
- `/tmp/open-brain-web-phase20-pickup/docs/qa/phase20-live-smoke-checklist.md`

### Implementation Steps

1. Update `cleanupQaUser` so cleanup errors are returned or thrown instead of only logged.
2. After delete attempts, verify:
   - zero `phase20_durable_saves` rows remain for the QA user id,
   - the QA user no longer exists in Supabase Auth.
3. Move "Phase 20 live smoke passed" logging after cleanup verification.
4. If cleanup fails, exit non-zero and print a redacted cleanup failure summary.
5. Ensure the script never prints passwords or service-role values.
6. Update the live smoke checklist to say cleanup must be verified, not only attempted.
7. Add a local test or script-level unit check where practical.

### Acceptance Criteria

- A failed save cleanup fails the smoke run.
- A failed user cleanup fails the smoke run.
- A pass means the app flow passed and cleanup was verified.
- Evidence records "cleanup verified," not "cleanup attempted."

### No-Go Gate

No Production smoke pass is valid if cleanup only attempted but was not verified.

## P0.3 Align Health-Event Contract

### Objective

Fix the mismatch where frontend sends health events that backend/database do not currently accept.

### Files

Frontend:

- `/tmp/open-brain-web-phase20-pickup/src/types/productReset.ts`
- `/tmp/open-brain-web-phase20-pickup/src/components/ReviewPage.tsx`
- `/tmp/open-brain-web-phase20-pickup/src/lib/healthEventsClient.ts`

Backend:

- `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/functions/_shared/phase20-durable-saves.ts`
- `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/migrations/20260613153000_phase20_review_workflow_p2.sql`

### Implementation Options

Option A, preferred:

- Add `save_edited` and `save_deleted` to backend validator and database constraint.
- Keep frontend event sends.
- Add tests confirming all frontend event names are accepted.

Option B, fallback:

- Remove `save_edited` and `save_deleted` from frontend type and sends.
- Remove those events from plan claims until backend support is added later.

### Implementation Steps

1. Pick Option A unless there is a database migration blocker.
2. Update backend accepted event list.
3. Add or amend migration to accept the full event set:
   - `reflection_started`
   - `reflection_completed`
   - `reflection_failed`
   - `save_attempted`
   - `save_succeeded`
   - `save_failed`
   - `review_opened`
   - `follow_up_closed`
   - `save_edited`
   - `save_deleted`
4. Add backend validation tests for every event.
5. Add frontend or shared contract test that the frontend event union matches backend accepted events.
6. Decide whether failed event sends should remain silent or surface in dev logs only.
7. Deploy backend after tests pass.

### Acceptance Criteria

- Every frontend `HealthEventName` is accepted by backend validation.
- Database constraint accepts the same event set.
- Invalid event names still return `400`.
- No raw user content is allowed in event metadata.

### No-Go Gate

Do not claim health observability is working while any frontend event is rejected by backend or database constraints.

## P0.4 Add Deployment Identity Verification

### Objective

Ensure live smoke tests the intended deployment, not an old alias or unrelated deployment.

### Implementation Steps

1. Add a build/deployment identity source.
   - Preferred: expose Vercel commit SHA or app version in a safe diagnostics endpoint or static build metadata.
   - Alternative: capture Vercel deployment id and alias target from Vercel CLI before smoke.
2. Update smoke evidence requirements to include:
   - target URL,
   - Vercel deployment URL,
   - deployment id,
   - commit SHA,
   - alias target,
   - timestamp.
3. Before running functional smoke, verify the target URL points to the expected deployment.
4. If deployment identity cannot be verified, mark smoke evidence as incomplete.

### Acceptance Criteria

- Smoke evidence proves which deployment was tested.
- The tested deployment matches the PR #7 merged commit or intended Preview commit.
- Alias drift is detected before a pass is recorded.

### No-Go Gate

Do not record Production smoke as passed if the tested deployment identity is unknown.

## P0.5 Expand Production Data Safety Audit

### Objective

Verify durable-save isolation beyond basic cross-user CRUD.

### Files and Tables

- Table: `phase20_durable_saves`
- Migration: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/migrations/20260613100000_phase20_durable_saves.sql`
- Backend route: `/saves`

### Probe Matrix

| Actor | Probe | Expected Result |
|---|---|---|
| No token | GET `/saves` | `401` |
| No token | POST `/saves` | `401` |
| User A | Create Insight/Decision/Follow-up | success |
| User A | List own saves | sees only own saves |
| User B | List saves | does not see User A saves |
| User B | Search User A unique text | no result |
| User B | Filter by User A source/topic/person | no result |
| User B | Patch User A save id | `404` or safe denial |
| User B | Delete User A save id | `404` or safe denial |
| User B | Counts after User A saves | counts do not include User A rows |
| User B | Cursor pagination | cursor does not expose User A rows |
| User A token direct table query | own rows only |
| User B token direct table query | own rows only |
| Anon direct table query | denied or empty |
| Service role | cleanup only | allowed, never browser-exposed |

### Implementation Steps

1. Create a `phase20-data-safety-probe` script or documented manual probe.
2. Create disposable User A and User B.
3. User A creates unique saves with unique source/topic/person/search text.
4. User B attempts all route-level access probes.
5. User B attempts direct Supabase table probes.
6. Validate counts and cursors are scoped to User B only.
7. Cleanup both users and all QA rows.
8. Write evidence to `docs/security` or `docs/qa`.

### Acceptance Criteria

- No cross-user content leakage.
- No cross-user count leakage.
- No cross-user cursor leakage.
- No direct table leakage for anon or another authenticated user.
- Cleanup verified.

### No-Go Gate

Do not build more Review workflow features until this audit passes.

## P0.6 Secret-Handling Rules for Smoke and Deployment

### Objective

Prevent service-role credentials and other sensitive values from being pasted into chat, committed, or logged.

### Rules

- Do not paste service-role keys, personal access tokens, passwords, or private project secrets into chat.
- Use a vault, GitHub environment secrets, Vercel secrets, or an ignored local env file.
- Do not commit local env files.
- Do not print env dumps in logs.
- Smoke evidence may mention variable names but must never include values.
- If a secret is exposed, rotate it before continuing.

### Implementation Steps

1. Add a `docs/ops/phase20-secret-handling.md` note or include this section in smoke docs.
2. Update smoke checklist with explicit redaction rules.
3. Add a preflight check that prints missing variable names only, never values.
4. Confirm `.gitignore` excludes local env files used for smoke.
5. If GitHub Actions live smoke is added later, store secrets only in protected GitHub environments.

### Acceptance Criteria

- No smoke doc includes secret values.
- Smoke script only prints missing variable names.
- Evidence redacts any sensitive runtime details.

### No-Go Gate

Stop execution and rotate credentials if secrets are pasted into chat, docs, shell transcript, or logs.

---

# P1 - Production Stabilization and Contract Hardening

## P1.1 Backend Legacy Default Responses With Exact Route Decisions

### Objective

Replace vague legacy-backend cleanup with exact route contracts and implementation paths.

### Canonical Backend Path

`/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/functions/open-brain-web/index.ts`

### Route Decisions

| Route | Current Evidence | Decision Needed |
|---|---|---|
| `/settings/:model` | Present in backend | Return authenticated defaults when user has no prefs |
| `/conversations` | Present in backend | Return authenticated empty list when user has no conversations |
| `/wiki/pages` | Not found in inspected backend | Decide: restore route, intentionally disable with stable response, or remove frontend caller |

### Implementation Steps

1. Inspect frontend callers for `/settings/*`, `/conversations`, and `/wiki/pages`.
2. Confirm exact expected response shape for each caller.
3. For `/settings/:model`, ensure missing rows return defaults without backend errors.
4. For `/conversations`, ensure no rows returns `{ conversations: [] }`.
5. For `/wiki/pages`, make an explicit product decision:
   - restore as authenticated `{ pages: [] }`,
   - intentionally return a stable disabled response,
   - or remove/guard the frontend caller.
6. Add route contract tests for all active route decisions.
7. Deploy `open-brain-web` Supabase function.
8. Verify in browser console after sign-in.

### Acceptance Criteria

- No avoidable backend errors on login/home/review.
- Each route has a documented expected empty-state response.
- `/wiki/pages` is not left ambiguous.

## P1.2 Evidence Lifecycle and Branching

### Objective

Ensure final smoke evidence lands somewhere durable and reviewable.

### Decision

Use one of these evidence paths:

1. Preferred: docs-only follow-up PR after Production smoke.
2. Alternative: commit directly to `main` only if this repo process allows release evidence commits.

### Implementation Steps

1. Create evidence file under:
   - `/tmp/open-brain-web-phase20-pickup/docs/qa/phase20-production-authenticated-smoke-evidence-YYYY-MM-DD_HH-MM-SS_IST.md`
2. Include:
   - Production alias,
   - deployment id,
   - deployment URL,
   - commit SHA,
   - timestamp,
   - disposable QA email only,
   - no password,
   - no secrets,
   - pass/fail per smoke step,
   - cleanup verified,
   - console summary,
   - residual warnings.
3. Commit evidence through the selected lifecycle.

### Acceptance Criteria

- Evidence is not only local.
- Evidence is not mixed into unrelated feature work.
- Evidence contains no secrets.

## P1.3 Cursor Pagination Contract Before Load More UI

### Objective

Make pagination implementable without duplicate rows or ignored cursors.

### Files

- `/tmp/open-brain-web-phase20-pickup/src/types/productReset.ts`
- `/tmp/open-brain-web-phase20-pickup/src/lib/durableSavesClient.ts`
- Backend validator:
  - `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/functions/_shared/phase20-durable-saves.ts`

### Implementation Steps

1. Add `cursor?: string` to frontend `ListDurableSavesFilters`.
2. Add `cursor` query param in `listDurableSaves`.
3. Confirm backend cursor sort is stable.
4. If sorting changes are added, cursor must encode enough fields to avoid skipped or duplicated records.
5. Add tests for:
   - first page,
   - next page,
   - no duplicates,
   - filter changes reset cursor,
   - new saves do not corrupt pagination badly.

### Acceptance Criteria

- Load More can request the next page.
- Cursor and sort order are aligned.
- Changing filters resets pagination state.

## P1.4 Authenticated Smoke Automation Workflow

### Objective

Make live smoke repeatable without casual secret handling.

### Implementation Steps

1. Add a manual GitHub Action only if secrets can be stored in a protected environment.
2. Require explicit operator approval.
3. Require target URL input.
4. Require expected commit SHA or deployment id input.
5. Run smoke only when `PHASE20_LIVE_SMOKE=1`.
6. Upload redacted evidence artifact.
7. Do not run live smoke automatically on every PR.

### Acceptance Criteria

- Live smoke is opt-in.
- Secrets remain in GitHub protected environment.
- Evidence is redacted and downloadable.

---

# P2 - Product Workflow and Usability Follow-Through

## P2.1 Split Review Scope Cleanly

### Objective

Prevent P1 and P2 from rebuilding the same Review workflow twice.

### Revised Scope Split

P1 owns list mechanics:

- source dropdown,
- source filter,
- sort,
- pagination,
- empty states,
- URL/local filter persistence,
- browser regression coverage.

P2 owns workflow sections:

- Pinned,
- Needs Review,
- Due Soon,
- Recurring Follow-ups,
- bulk actions.

### Acceptance Criteria

- P1 does not add separate workflow sections unless explicitly promoted.
- P2 starts from P1 list/filter primitives instead of duplicating them.

## P2.2 Review Workflow Implementation

### Objective

Turn Review into a daily operating workflow after safety and smoke gates pass.

### Implementation Steps

1. Add Pinned section.
2. Add Needs Review queue.
3. Add Due Soon grouping.
4. Add recurring follow-up model.
5. Add bulk actions:
   - mark reviewed,
   - pin/unpin,
   - close follow-ups,
   - delete selected.
6. Add browser tests for mobile and desktop.

### Acceptance Criteria

- Workflow sections use the same backend list contract.
- Bulk actions are explicit and confirm destructive changes.
- Recurring follow-ups do not duplicate unpredictably.

## P2.3 Legacy Memory Migration Decision

### Objective

Prevent old memories from being mixed into Review without ownership and metadata clarity.

### Implementation Steps

1. Inventory legacy `thoughts` fields.
2. Map fields to durable saves only where safe.
3. Decide:
   - keep separate,
   - read-only compatibility view,
   - one-time import.
4. Run dry-run summary before any import.
5. Require user approval before moving data.

### Acceptance Criteria

- No legacy data is moved by default.
- Ownership and RLS are preserved.
- Read-only view cannot mutate legacy data.

---

# Updated No-Go Gates

The following conditions block release or further workflow expansion:

1. No merge-to-stable claim without authenticated smoke evidence.
2. No Production pass if cleanup fails or is only attempted.
3. No health-signal claims while frontend events are rejected by backend or database.
4. No backend legacy-default implementation until `/wiki/pages` ownership and expected behavior are decided.
5. No further Review workflow expansion until durable-save user isolation, counts, cursors, and direct table access are verified.
6. No live smoke run if service-role credentials are unavailable or would need to be pasted into chat.
7. No smoke pass if the tested deployment identity is unknown.

---

# Updated Definition of Done

This remediation plan is complete when:

- PR #7 release gate is tightened.
- Live smoke cleanup fails hard and verifies zero QA residue.
- Health events are contract-aligned across frontend, backend, and database.
- Smoke evidence includes deployment identity.
- Authenticated Preview or Production smoke passes with disposable QA cleanup verified.
- Production data safety audit passes route-level and direct table probes.
- Backend legacy route decisions are documented and implemented.
- Evidence is committed through a clear docs lifecycle.
- P1/P2 Review scope is split cleanly.

## Immediate Next Action

Patch PR #7 before merge if possible:

1. Make the smoke script cleanup fail-hard.
2. Add deployment identity requirements to smoke evidence.
3. Resolve the health-event contract mismatch.
4. Update the smoke checklist with secret-handling and cleanup-verification rules.

After that, run authenticated Preview smoke or proceed through the controlled Production smoke and rollback gate.
