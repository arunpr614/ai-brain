# Open Brain Phase 20 PR #7 Post-Merge Implementation Plan - Adversarial Review

**Created:** 2026-06-13 22:16:12 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/open-brain-phase20-pr7-post-merge-production-smoke-and-next-implementation-plan-2026-06-13_22-07-25_IST.md`
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/OPEN_BRAIN_PHASE20_PR7_POST_MERGE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-13_22-16-12_IST.md`

## Executive Verdict

**Conditional no-go for executing the plan as written.**

The plan has the right broad ordering, but its release gates are too loose for Production. It would allow PR #7 to be merged and treated as production stabilization even though authenticated smoke has not run, cleanup can falsely pass, and the health-event contract is already inconsistent between frontend and backend. The plan should be revised before execution so "green checks + public login render" cannot be mistaken for a verified authenticated release.

## Evidence Inspected

- Target plan with line numbers:
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/open-brain-phase20-pr7-post-merge-production-smoke-and-next-implementation-plan-2026-06-13_22-07-25_IST.md:1`
- Current PR state through GitHub CLI:
  - PR #7 is open, not draft, mergeable, and checks are green as of the inspected output.
- Live smoke script:
  - `/tmp/open-brain-web-phase20-pickup/scripts/phase20-live-smoke.mjs:1`
- Live smoke checklist:
  - `/tmp/open-brain-web-phase20-pickup/docs/qa/phase20-live-smoke-checklist.md:1`
- Frontend durable save and health-event types:
  - `/tmp/open-brain-web-phase20-pickup/src/types/productReset.ts:31`
  - `/tmp/open-brain-web-phase20-pickup/src/lib/durableSavesClient.ts:54`
  - `/tmp/open-brain-web-phase20-pickup/src/lib/healthEventsClient.ts:4`
  - `/tmp/open-brain-web-phase20-pickup/src/components/ReviewPage.tsx:252`
- Canonical backend function and shared durable-save validator:
  - `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/functions/open-brain-web/index.ts:69`
  - `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/functions/_shared/phase20-durable-saves.ts:1`
- Durable save and Review workflow migrations:
  - `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/migrations/20260613100000_phase20_durable_saves.sql:1`
  - `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/migrations/20260613153000_phase20_review_workflow_p2.sql:1`
- Backend route search:
  - Confirmed `open-brain-web/index.ts` contains `/conversations`, `/settings/:model`, and `/saves`.
  - `rg` found no `/wiki` route in the inspected canonical backend function.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Merge gate allows Production release before authenticated behavior is verified

**Evidence:** The target plan explicitly says authenticated Production smoke has not been run at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/open-brain-phase20-pr7-post-merge-production-smoke-and-next-implementation-plan-2026-06-13_22-07-25_IST.md:47` and `:48`. Yet P0.1 acceptance only requires PR merge, `main` inclusion, ready Vercel Production deployment, and required checks at `:98` through `:103`; validation only requires PR status, login render, and no blocking startup console errors at `:105` through `:109`. The authenticated smoke starts later at `:120`.

**Why it matters:** The plan can ship a PR that changed Capture, Save, Review, health events, and live smoke behavior without first proving that a real signed-in user can complete the product loop.

**Failure mode:** PR #7 merges cleanly, Production deploys cleanly, public login render passes, but authenticated save/review fails because of auth, Supabase, schema, environment, or runtime contract drift. The release is then described as "stabilized" even though the core user path is unverified.

**Recommendation:** Add a hard no-go gate before merge or before declaring Production stable: authenticated Preview smoke must pass, or Production smoke must be run immediately with a pre-approved rollback window and cannot be marked complete until it passes. If disposable QA credentials are not available, the plan must stop at "ready to merge" rather than "merge and stabilize Production."

#### 2. The live smoke script can report success even when cleanup fails

**Evidence:** The target plan makes cleanup part of the smoke checklist and acceptance at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/open-brain-phase20-pr7-post-merge-production-smoke-and-next-implementation-plan-2026-06-13_22-07-25_IST.md:157` and `:169`. The checklist treats failed cleanup as a blocker at `/tmp/open-brain-web-phase20-pickup/docs/qa/phase20-live-smoke-checklist.md:65` through `:72`. But the script only logs cleanup warnings and does not fail the process when save or user deletion fails at `/tmp/open-brain-web-phase20-pickup/scripts/phase20-live-smoke.mjs:47` through `:61`; it prints "Phase 20 live smoke passed" before cleanup completes at `:158` through `:177`.

**Why it matters:** Production smoke can leave behind test users and test saves while still producing a successful run. That creates false release evidence and production data hygiene problems.

**Failure mode:** A service-role permission, network, table, or auth-admin failure prevents cleanup. The test exits successfully, evidence says pass, and disposable QA data remains in Production.

**Recommendation:** Change the plan's smoke gate to require fail-hard cleanup semantics. Cleanup failure should set a failing exit code and the evidence file should be marked failed until direct verification confirms the QA user and all related rows are gone.

### P1 - High Risk

#### 1. Health-event contract is already inconsistent across frontend, backend validator, and database constraint

**Evidence:** The target plan lists `save_edited` and `save_deleted` as health events at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/open-brain-phase20-pr7-post-merge-production-smoke-and-next-implementation-plan-2026-06-13_22-07-25_IST.md:471` through `:480`. The frontend type also includes those events at `/tmp/open-brain-web-phase20-pickup/src/types/productReset.ts:34` through `:44`, and Review sends them at `/tmp/open-brain-web-phase20-pickup/src/components/ReviewPage.tsx:288` through `:314`. The backend validator only allows events through `follow_up_closed` at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/functions/_shared/phase20-durable-saves.ts:4` through `:13`, and the database check constraint matches that smaller list at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/migrations/20260613153000_phase20_review_workflow_p2.sql:82` through `:92`. The client returns `false` for failed event tracking but callers ignore that result at `/tmp/open-brain-web-phase20-pickup/src/lib/healthEventsClient.ts:4` through `:25`.

**Why it matters:** The plan treats health observability as a documentation/testing follow-up, but part of the observability surface is already broken. The product will silently miss edit/delete telemetry and still look functional.

**Failure mode:** Review edit/delete actions succeed, event tracking is rejected as invalid by the backend or database, and nobody notices because the frontend intentionally ignores the failure. Later analysis concludes edit/delete are unused or healthy based on incomplete data.

**Recommendation:** Before relying on PR #7 evidence, either add `save_edited` and `save_deleted` to the backend validator and migration constraint, or remove those frontend event sends and remove them from the plan until supported. Add a contract test that all frontend `HealthEventName` values are accepted by backend validation and database constraints.

#### 2. The Production smoke target is hard-coded and can test the wrong deployment

**Evidence:** The target plan hard-codes `PHASE20_TARGET_URL=https://open-brain-web-orpin.vercel.app` at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/open-brain-phase20-pr7-post-merge-production-smoke-and-next-implementation-plan-2026-06-13_22-07-25_IST.md:132` through `:135`. P0.1 asks to record deployment URL and timestamp at `:94` through `:96`, but the smoke step does not require proving the target URL is serving the merged PR #7 commit.

**Why it matters:** A smoke test only proves the deployment it actually hits. If the alias points to an old deployment, a protected preview, or a manually promoted deployment, the smoke result can be detached from the PR that was just merged.

**Failure mode:** The team tests a stable old Production deployment, documents a pass, and misses a regression in the new `main` deployment.

**Recommendation:** Require the smoke evidence to include commit SHA, Vercel deployment id, alias target, and app-reported build version where possible. The smoke runner should verify that the served deployment matches the expected post-merge commit before running the functional flow.

#### 3. Backend legacy-default work is under-specified and includes a route that is not present in the inspected backend

**Evidence:** The target plan names `/settings/*`, `/conversations`, and `/wiki/pages` as P0 legacy default routes at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/open-brain-phase20-pr7-post-merge-production-smoke-and-next-implementation-plan-2026-06-13_22-07-25_IST.md:257` through `:261`. It then says to "Locate the canonical backend implementation" at `:267` through `:270`, rather than naming it. The inspected backend has `/conversations` at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/functions/open-brain-web/index.ts:1069`, `/settings/:model` at `:1167`, and no `/wiki` route found by route search.

**Why it matters:** P0 work cannot depend on rediscovering the correct backend path or guessing whether `/wiki/pages` should be restored, disabled, or mapped to another function. That invites implementation in the wrong repo/path or a route shape that the frontend does not actually use.

**Failure mode:** An agent adds default behavior in the wrong place, deploys the wrong function, or creates a `/wiki/pages` contract that still does not match frontend calls. Console noise remains, or worse, an unaudited legacy path is reintroduced.

**Recommendation:** Revise P0.4 to name the canonical backend path, exact route contracts, exact deployment command, and decision for `/wiki/pages`: restore, intentionally disable with a stable response, or remove the frontend caller.

#### 4. Data safety audit does not explicitly test count leakage or direct table access

**Evidence:** The target plan's cross-user audit lists user B list/fetch/patch/delete attempts at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/open-brain-phase20-pr7-post-merge-production-smoke-and-next-implementation-plan-2026-06-13_22-07-25_IST.md:216` through `:223`. The backend list route separately queries full count rows at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/functions/open-brain-web/index.ts:1997` through `:2010` and relies on the user-scoped Supabase client plus RLS. RLS policies exist in the migration at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/migrations/20260613100000_phase20_durable_saves.sql:49` through `:66`.

**Why it matters:** A list endpoint can hide rows but leak aggregate counts. Direct table access through the Supabase data API can also behave differently from the backend route if policies or clients are misconfigured.

**Failure mode:** User B cannot see user A's row content, but Review counts include another user's saves, or direct table probes expose unexpected behavior. The plan's audit would pass while privacy is still compromised.

**Recommendation:** Add explicit checks that counts, filters, search, and `next_cursor` are user-scoped. Add direct Supabase table probes with user A token, user B token, anon/no token, and service-role cleanup, with expected outcomes documented.

#### 5. Secret-handling instructions are too thin for a workflow that requires service-role credentials

**Evidence:** The target plan requires `SUPABASE_SERVICE_ROLE_KEY` for live smoke at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/open-brain-phase20-pr7-post-merge-production-smoke-and-next-implementation-plan-2026-06-13_22-07-25_IST.md:130` through `:135`, and says not to expose service-role credentials to the browser at `:664` through `:670`. It does not say where the secret should live, who should provide it, how evidence should redact it, or that secrets must not be pasted into chat.

**Why it matters:** This project already depends on sensitive Supabase credentials for deployment and smoke testing. Ambiguous handling increases the chance of another accidental secret exposure.

**Failure mode:** A service-role key is pasted into a chat, shell history, docs evidence, or CI logs. Even if later rotated, the release process normalizes unsafe credential handling.

**Recommendation:** Add an explicit secret-handling section: use a vault or GitHub environment secrets, never paste secrets into chat or docs, use ignored local env files for one-off local runs, redact env dumps, and rotate immediately if exposure is suspected.

### P2 - Medium Risk

#### 1. P1 and P2 Review workflow scope overlaps enough to cause duplicate work

**Evidence:** P1 asks for grouped sections including Open Follow-ups, Needs Review, Pinned, and Recent at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/open-brain-phase20-pr7-post-merge-production-smoke-and-next-implementation-plan-2026-06-13_22-07-25_IST.md:372` through `:376`. P2 then asks for pinned section, reviewed/unreviewed queue, and due-soon grouping at `:512` through `:518`.

**Why it matters:** The plan splits the same Review workflow idea across priorities without defining what P1 is allowed to ship versus what P2 owns.

**Failure mode:** P1 builds a partial grouped Review, P2 rebuilds it, and the code accumulates duplicated sorting, filtering, and empty-state logic.

**Recommendation:** Define P1 as "controls and list mechanics" and P2 as "workflow sections," or explicitly state which groups belong in each priority.

#### 2. Pagination contract is not tied to frontend support

**Evidence:** The target plan says to confirm cursor support and add Load More at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/open-brain-phase20-pr7-post-merge-production-smoke-and-next-implementation-plan-2026-06-13_22-07-25_IST.md:360` through `:370`. The frontend durable-saves filter type includes `limit` but no `cursor` at `/tmp/open-brain-web-phase20-pickup/src/types/productReset.ts:85` through `:97`, while the client reads `next_cursor` at `/tmp/open-brain-web-phase20-pickup/src/lib/durableSavesClient.ts:86` through `:90`.

**Why it matters:** The backend can expose `next_cursor` and the frontend can still be unable to request the next page cleanly.

**Failure mode:** P1 adds a Load More button that reloads the first page, duplicates rows, or silently ignores `next_cursor`.

**Recommendation:** Add a contract item for `cursor` in frontend filter types and client query construction before implementing UI pagination.

### P3 - Low Risk Or Polish

#### 1. Evidence documentation says "committed to the repo" but does not define the branch or lifecycle

**Evidence:** The plan says smoke evidence must be committed to the repo at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/open-brain-phase20-pr7-post-merge-production-smoke-and-next-implementation-plan-2026-06-13_22-07-25_IST.md:333` through `:337`.

**Why it matters:** After PR #7 is merged, evidence should not be added to the already-merged branch unless the process explicitly says to create a follow-up evidence PR or commit directly to `main`.

**Failure mode:** QA evidence lives only locally, lands on a stale branch, or is mixed into unrelated feature work.

**Recommendation:** Specify whether evidence is committed directly to `main`, added through a small docs-only PR, or stored in a release log outside the repo.

## What The Original Plan Or Work Gets Wrong

- It treats PR merge and Production smoke as a safe linear sequence, but the merge gate itself does not require authenticated evidence.
- It assumes the optional smoke script's pass state maps to the manual checklist, but cleanup failure is only a warning in the script.
- It lists health events as if the contract is aligned, but frontend, backend validator, and database constraint disagree for edit/delete events.
- It names `/wiki/pages` as a P0 backend route without establishing that the canonical backend currently has that route.
- It says to preserve user isolation but does not explicitly test aggregate count leakage, cursor leakage, or direct data API access.
- It requires service-role credentials without enough process around secret storage, redaction, and rotation.

## Missing Validation

- Authenticated Preview smoke before PR #7 merge, or an explicit Production-only release gate with rollback owner.
- Script-level cleanup verification that fails the run if QA user or QA saves remain.
- Contract test that every frontend health event is accepted by backend validation and database constraints.
- Direct Supabase table probes for anon, user A, user B, and service role.
- Count-specific and cursor-specific user-isolation checks.
- Verification that the smoke target URL serves the expected post-merge commit or Vercel deployment id.
- Route-contract tests for `/wiki/pages` only after deciding whether the route should exist.
- Secret-redaction checks for smoke output and QA evidence.

## Revised Recommendations

1. Revise P0.1 so PR #7 merge is not considered a completed stabilization step until authenticated smoke is either passed on Preview or run immediately on Production with a documented rollback gate.
2. Update the smoke script or plan acceptance so cleanup failure fails the release evidence.
3. Fix the health-event contract mismatch before using health signals as evidence.
4. Replace "locate backend" with the exact canonical backend path and deployment commands.
5. Expand the data safety audit to include counts, cursors, filters, search, and direct Supabase data API probes.
6. Add a secret-handling section before asking any agent or user to run service-role smoke.
7. Split Review workflow scope cleanly between P1 and P2.

## Go / No-Go Recommendation

**No-go to execute this plan exactly as written for Production stabilization.**

**Conditional go** after these changes:

- PR #7 merge gate is tightened around authenticated smoke evidence.
- Smoke cleanup is fail-hard or manually verified before a pass is recorded.
- Health event contract mismatch is fixed or explicitly removed from the claimed scope.
- The backend P0 route work names the canonical implementation path and exact route decisions.
- Data safety audit includes count/cursor/direct-table probes.

## Plan Revision Inputs

### Required Deletions

- Delete any implication that PR #7 is production-stabilized by mergeability, green checks, and public login render alone.
- Remove `save_edited` and `save_deleted` from accepted health-event claims unless backend and database support are added.
- Remove `/wiki/pages` from P0 route work unless the plan defines whether that route should be restored or intentionally disabled.

### Required Additions

- Add a pre-merge authenticated Preview smoke gate or a strict Production smoke-and-rollback gate.
- Add exact canonical backend path:
  - `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/Arun_AI_Open_Brain/supabase/functions/open-brain-web/index.ts`
- Add exact migration paths for durable saves and health events.
- Add explicit secret-handling rules for service-role credentials.
- Add direct user-isolation probes for table access, list counts, filters, search, and cursor.
- Add smoke evidence requirement for deployment id, commit SHA, target alias, cleanup verification, and console summary.

### Required Acceptance Criteria Changes

- P0.1 acceptance must include "authenticated smoke path has passed or release is explicitly held."
- P0.2 acceptance must require cleanup verification, not only cleanup attempt.
- P0.3 acceptance must include "counts and cursors are user-scoped."
- P1.4 acceptance must include "frontend event union equals backend/database accepted event union."

### Required Validation Changes

- Add a test that fails when frontend health events are not accepted by backend validation.
- Add a smoke-run postcondition query that confirms zero QA saves remain and the QA user is deleted.
- Add a direct Supabase RLS probe script for user A/user B/anon/service-role outcomes.
- Add a deployment identity check before live smoke.

### Required No-Go Gates

- No merge-to-stable claim without authenticated smoke evidence.
- No Production pass if cleanup fails or is merely "attempted."
- No health-signal claims while event names are rejected by backend or database constraints.
- No backend legacy-default implementation until `/wiki/pages` ownership and expected behavior are decided.
- No further Review workflow expansion until durable-save user isolation, counts, and direct table access are verified.

## Residual Risks

- Even after the plan is revised, Vercel/Supabase environment drift can still break Production independently of code.
- Authenticated smoke depends on service-role access; if that access is unavailable, release verification remains blocked.
- Browser smoke can prove the core path but will not catch all data integrity issues without backend probes.
- Legacy route behavior may remain noisy if the actual frontend callers differ from the route names listed in the plan.
