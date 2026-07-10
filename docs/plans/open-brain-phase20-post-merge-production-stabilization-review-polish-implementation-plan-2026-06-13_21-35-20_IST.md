# Open Brain Phase 20 Post-Merge Production Stabilization and Review Polish Implementation Plan

Generated: 2026-06-13 21:35:20 IST

Status: Implementation plan

Context:
- PR #5 Durable Save and Review MVP has been merged.
- PR #6 Phase 20 Review workflow has been merged.
- Preview QA passed after configuring the Preview API base to use the Vercel same-origin rewrite: `/api/open-brain-web`.
- The next work should stabilize production first, then improve the Capture and Review workflow.

## Executive Recommendation

Implement this plan in strict priority order:

1. P0: Production stabilization, legacy error cleanup, repeatable smoke testing, and data safety audit.
2. P1: Review usability, Capture save UX, automated browser regression coverage, and product health signals.
3. P2: Workflow maturity, legacy memory migration, richer provenance, and reminders.

The most important immediate action is to make Production use the same API routing pattern that passed Preview QA:

```text
VITE_API_BASE_URL=/api/open-brain-web
```

This keeps browser requests same-origin through the existing Vercel rewrite and avoids CORS problems against the Supabase Edge Function.

## Current Known State

### Confirmed Working

- Authenticated Preview sign-in.
- Capture reflection through the live backend.
- Save as Insight.
- Save as Decision.
- Save as Follow-up.
- Review list showing all three save types.
- Persistence after browser refresh.
- Follow-up close.
- Pinning.
- Reviewed or needs-review toggle.
- Edit saved content.
- Search filter.
- Topic filter.
- Person filter.
- Pinned-only filter.
- Follow-up type filter.
- Mobile Review smoke at 390x844.
- Temporary QA user and QA saves cleanup.

### Known Gaps

- Production has not yet been stabilized with the same API base used by Preview.
- Legacy settings, wiki, and conversations calls produced non-blocking console errors during Preview QA.
- Live smoke QA is repeatable manually, but not yet packaged as a clean runbook or opt-in script.
- P2 Review controls exist, but Review is not yet a mature recurring workflow.

## Implementation Principles

- Do not add new product features before Production is stable.
- Keep test accounts and records disposable and automatically cleaned up.
- Do not expose service-role cleanup paths to the browser.
- Prefer same-origin Vercel rewrites for browser-to-backend calls.
- Keep the Phase 20 durable-save contract user-scoped and strict.
- Make failure states honest: no fake success UI when backend calls fail.
- Keep live Preview and Production QA opt-in, because it touches real infrastructure.

## P0 - Production Stabilization and Safety

P0 is the release-hardening layer. Complete all P0 items before starting new user-facing Review or Capture features.

## P0.1 Stabilize Main and Production Deployment

### Goal

Make the merged Phase 20 Capture -> Save -> Review workflow reliable on the main Production deployment.

### Why This Matters

Preview passed only after using the existing Vercel rewrite. If Production uses a direct Supabase Edge Function URL, browser requests can be blocked by CORS or produce inconsistent behavior. Production should use the same routing pattern that passed authenticated QA.

### Implementation Tasks

1. Inspect current Vercel Production environment variables for `open-brain-web`.
   - Confirm `VITE_API_BASE_URL`.
   - Confirm `VITE_SUPABASE_URL`.
   - Confirm `VITE_SUPABASE_ANON_KEY`.
   - Do not print secret or token values into logs or documentation.

2. Set Production API base to the same-origin rewrite:

   ```text
   VITE_API_BASE_URL=/api/open-brain-web
   ```

3. Confirm `vercel.json` still contains the rewrite:

   ```json
   {
     "source": "/api/open-brain-web/:path*",
     "destination": "https://gnhxazkigsetylyrxkkd.supabase.co/functions/v1/open-brain-web/:path*"
   }
   ```

4. Redeploy `main`.
   - Prefer a normal Vercel redeploy of the latest main deployment.
   - If a redeploy cannot be triggered directly, use a no-op deployment-safe commit only if needed.
   - Keep commit message explicit if used:

     ```text
     chore: redeploy production with Phase 20 API routing
     ```

5. Run authenticated Production smoke QA.
   - Use a disposable QA account.
   - Do not use the user's personal credentials.
   - Clean up QA records and QA account afterward.

### Production Smoke Checklist

Run this checklist against the Production URL after redeploy:

- Sign in with disposable QA account.
- Land on the Open Brain home shell.
- Open Capture.
- Enter a QA capture text.
- Run reflection.
- Confirm reflection output appears.
- Save as Insight.
- Save as Decision.
- Save as Follow-up.
- Open Review.
- Confirm Review shows 3 saved records.
- Refresh browser.
- Confirm the 3 records persist.
- Confirm counts show 1 Insight, 1 Decision, 1 Follow-up.
- Close the Follow-up.
- Pin the Follow-up.
- Mark the Follow-up reviewed.
- Edit the Follow-up content.
- Search for the edited content.
- Filter by topic.
- Filter by person.
- Filter by pinned only.
- Filter by Follow-ups.
- Confirm mobile layout at 390x844.
- Delete QA records or delete by QA user id.
- Delete disposable QA user.

### Acceptance Criteria

- Production renders without environment-variable crashes.
- Production sign-in succeeds.
- Production reflection succeeds.
- Production saves all three object types.
- Production Review persists records after refresh.
- Production Follow-up close works.
- Production edit/delete works.
- Mobile Review remains usable.
- QA account and QA records are removed.
- No CORS failures in the browser console for Phase 20 Capture/Save/Review calls.

### Test Evidence To Capture

- Production URL tested.
- Timestamp of QA.
- Disposable QA email pattern used, without password.
- Confirmation that QA user was deleted.
- Confirmation that QA save cleanup returned success.
- Console error summary.
- Any non-blocking errors, separated from blockers.

### Rollback Plan

If Production breaks after the env change:

1. Revert `VITE_API_BASE_URL` to the previous Production value.
2. Redeploy the previous known-good deployment.
3. Confirm login and home render.
4. Open a follow-up bug for the rewrite route.

## P0.2 Fix Legacy Backend Errors Seen During QA

### Goal

Remove noisy, non-blocking legacy errors from login, home, Capture, and Review surfaces.

### Observed During QA

The Phase 20 flow passed, but console logs showed errors related to:

- settings fetches
- wiki pages fetches
- conversations fetches

These did not block Capture/Save/Review, but they reduce confidence in Production and make future QA harder.

### Decision Needed

For each legacy route, choose one of three treatments:

1. Return stable empty defaults from the backend.
2. Lazy-load the route only when the user opens the relevant Advanced surface.
3. Keep the fetch but handle failure as a quiet non-blocking state.

Recommended approach:

- For P0, return stable empty/default responses where routes are expected by the shell.
- For P1, lazy-load Advanced-only data only when Advanced is opened.

### Route Inventory

Audit these likely routes and callers:

- `/settings/*`
- `/conversations`
- `/wiki/pages`
- Any Advanced-only hooks that currently run on login or home render.

### Backend Implementation Option

Add or harden backend handlers so the shell receives stable responses:

- Settings:

  ```json
  {
    "model_settings": {},
    "global_settings": {}
  }
  ```

- Conversations:

  ```json
  {
    "conversations": []
  }
  ```

- Wiki pages:

  ```json
  {
    "pages": []
  }
  ```

Use authenticated user context where required. Do not make private data public.

### Frontend Implementation Option

Update hooks so failures do not create noisy console errors on Phase 20 shell surfaces:

- Gate Advanced-only fetches until the Advanced view is opened.
- Convert expected empty states into normal UI state.
- Log only true unexpected failures.
- Do not show alarming user-facing errors for features not currently visible.

### Recommended P0 Scope

1. Reproduce the errors on Production or Preview.
2. Map each console error to route and frontend hook.
3. Fix the smallest stable contract:
   - backend default response, or
   - frontend lazy-load guard.
4. Add unit tests for fallback behavior.
5. Run authenticated smoke again.

### Acceptance Criteria

- Login/home does not emit repeated settings/wiki/conversation errors.
- Capture does not emit unrelated legacy errors.
- Review does not emit unrelated legacy errors.
- Advanced still works or has clear empty states.
- Phase 20 Capture/Save/Review remains unchanged.

### Suggested Tests

- `useSettings` handles empty settings response.
- `useWiki` handles empty pages response.
- `useConversations` handles empty conversations response.
- Shell does not trigger Advanced-only fetches before Advanced opens, if lazy-loading is chosen.

## P0.3 Add Post-Merge Live Smoke Checklist and Script

### Goal

Make the successful Preview QA repeatable for Production, Preview, and future PRs.

### Deliverables

1. Markdown runbook.
2. Optional live smoke script gated by explicit environment variables.
3. Cleanup routine for QA saves and QA users.

### Recommended Files

In `open-brain-web`:

```text
docs/qa/phase20-live-smoke-checklist.md
scripts/phase20-live-smoke.mjs
```

If scripts are not desired yet, create only the runbook in P0 and keep the script for P1.

### Runbook Contents

The checklist should include:

- Required environment and access.
- How to identify the target URL.
- How to create a disposable QA user.
- How to run the browser flow.
- How to clean up saves and auth user.
- What counts as pass/fail.
- What console errors are blockers.
- What console errors are known non-blockers.

### Live Smoke Script Design

The script should be opt-in only:

```text
PHASE20_LIVE_SMOKE=1
PHASE20_TARGET_URL=https://...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
VITE_SUPABASE_ANON_KEY=...
```

The script should:

1. Refuse to run unless `PHASE20_LIVE_SMOKE=1`.
2. Create a disposable confirmed QA user.
3. Use browser automation to sign in.
4. Run Capture reflection.
5. Save Insight, Decision, Follow-up.
6. Open Review.
7. Verify persistence after refresh.
8. Close, pin, review, edit, filter, and delete.
9. Run mobile viewport check.
10. Clean up QA saves.
11. Delete QA user.
12. Print a compact pass/fail report.

### Cleanup Requirements

Cleanup must run in `finally` style behavior:

- Delete rows from `phase20_durable_saves` by QA `user_id`.
- Delete QA auth user.
- Remove temp files.
- Never print passwords or service role keys.

### Acceptance Criteria

- A new agent can run the checklist without rediscovering the flow.
- Cleanup is documented and tested.
- Live script cannot accidentally run without explicit opt-in.
- The smoke path covers desktop and mobile.

## P0.4 Production Data Safety Audit

### Goal

Confirm the durable-save data model remains user-scoped, isolated, and strict after P2 Review fields.

### Scope

Audit:

- `phase20_durable_saves`
- RLS policies
- Edge Function auth middleware
- Create/list/patch/delete handlers
- Health event ingestion
- Client access patterns

### Required Checks

1. RLS enabled on `phase20_durable_saves`.
2. Select policy restricts rows to `auth.uid() = user_id`.
3. Insert policy prevents writing another user's `user_id`.
4. Update policy prevents modifying another user's row.
5. Delete policy prevents deleting another user's row.
6. Service-role cleanup paths are not available to browser clients.
7. `POST /saves` ignores or rejects client-supplied `user_id`.
8. `PATCH /saves/:id` scopes by authenticated user.
9. `DELETE /saves/:id` scopes by authenticated user.
10. List filters cannot bypass user scope.
11. P2 fields cannot be abused:
    - `pinned`
    - `reviewed_at`
    - `due_at`
    - `deleted_at`
    - `closed_at`

### Cross-User Probe

Create two disposable users:

- User A
- User B

Flow:

1. User A creates Insight, Decision, Follow-up.
2. User B lists saves.
3. Confirm User B sees zero User A records.
4. User B tries to patch User A save id.
5. Confirm 404 or equivalent safe not-found response.
6. User B tries to delete User A save id.
7. Confirm 404 or equivalent safe not-found response.
8. Cleanup both users.

### Acceptance Criteria

- Cross-user read is impossible.
- Cross-user patch is impossible.
- Cross-user delete is impossible.
- Unsupported metadata still returns `400`.
- Missing content still returns `400`.
- Unauthenticated requests still return `401`.

## P1 - Product UX and Regression Coverage

P1 should begin only after P0 is stable in Production.

## P1.1 Improve Review Usability

### Goal

Make Review easier to scan, filter, and operate as saved records grow.

### Features

1. Source filter.
2. Created-date sort.
3. Due-date sort.
4. Empty states per filter.
5. Open Follow-ups quick filter.
6. Pagination or cursor loading.

### Detailed Implementation

#### Source Filter

Add a filter control for `source`.

Initial source values:

- `capture_reflection`
- future values from backend response

Backend:

- Confirm `GET /saves?source=capture_reflection` already works or add support.
- Ensure source filter is user-scoped.

Frontend:

- Add source select or segmented control.
- Preserve filter state in component state.
- Include source in `listDurableSaves` filters.
- Add clear-filter behavior.

Acceptance:

- Selecting source narrows results.
- Clearing source restores results.
- Empty source result shows a useful empty state.

#### Sort Controls

Add sort options:

- Newest created first
- Oldest created first
- Due soon first
- Due latest first

Backend options:

- Add query params:

  ```text
  sort=created_at
  direction=desc
  sort=due_at
  direction=asc
  ```

Frontend options:

- If backend sorting is not ready, sort client-side for current page only.
- Prefer backend sort before pagination.

Acceptance:

- Created-date sort changes ordering.
- Due-date sort puts dated Follow-ups ahead of undated items when expected.
- Open Follow-ups still remain prominent unless user chooses another explicit sort.

#### Empty States

Add empty states for:

- No saves at all.
- No results for search.
- No results for topic/person/source.
- No pinned items.
- No open Follow-ups.
- No reviewed or unreviewed records.

Acceptance:

- Empty state tells the user what happened.
- Empty state offers a clear action: clear filters, start Capture, or change filter.

#### Open Follow-Ups Quick Filter

Add a one-click filter:

```text
Open Follow-ups
```

Behavior:

- Type = Follow-up.
- Status = open.
- Sort = due soon first.

Acceptance:

- One click shows only open Follow-ups.
- Clear filters restores all.

#### Pagination or Cursor Loading

Backend:

- Confirm `next_cursor` contract.
- Add `limit` and cursor behavior if missing.
- Keep stable sort order by `created_at` and `id`.

Frontend:

- Add "Load more" button.
- Do not infinite-scroll in P1.
- Keep count summary stable.

Acceptance:

- Initial list loads quickly.
- Load more appends records.
- Filters reset pagination.

### Tests

- Review source filter test.
- Review sort test.
- Review empty state test.
- Open Follow-ups quick filter test.
- Pagination contract test.

## P1.2 Improve Capture Save UX

### Goal

Give users more control before saving and better confidence after saving.

### Features

1. Edit save content before saving.
2. Choose or edit source/context before saving.
3. Duplicate warning.
4. Topics/people suggestions.
5. Success state with "View in Review."

### Detailed Implementation

#### Editable Save Content

Current behavior saves the reflection output directly. Add a save draft field.

Behavior:

- After reflection succeeds, initialize save draft with reflection text.
- User can edit draft before saving.
- Save buttons use edited draft, not raw reflection text.
- Preserve original reflection in provenance fields.

Acceptance:

- Editing draft changes saved content.
- Original reflection text remains stored in provenance.
- Empty edited content disables save or returns clear validation.

#### Source and Context Editing

Add a compact "Context" control:

- default source: `capture_reflection`
- include capture text
- include reflection mode
- include provider/model

P1 can keep this mostly read-only with a source selector if needed.

Acceptance:

- Saved item has clear source.
- Review shows source compactly.
- User can understand where the save came from.

#### Duplicate Warning

Detect obvious duplicate saves:

- same user
- same save type
- same normalized content
- within recent window or existing Review set

Recommended P1 approach:

- Client-side warning after saving one type:
  - "This reflection was already saved as Insight."
- Do not block user yet.

Future backend option:

- Add dedupe endpoint or unique normalized hash.

Acceptance:

- Repeated save attempts show warning.
- User can still intentionally save another type.

#### Topics and People Suggestions

Use recent saved topics and people:

- Pull from current Review data or a lightweight endpoint.
- Suggest chips below fields.
- Clicking a chip adds it to the comma-separated list.

Acceptance:

- Suggestions appear after reflection if prior saves exist.
- Suggestions do not overwrite manually typed values.
- Duplicate chips are not added.

#### View In Review Success State

After save success:

- Show saved type.
- Show "View in Review" action.
- Optionally pass selected save id into Review.

Acceptance:

- User can save and jump directly to Review.
- The newly saved item is visible after navigation.

### Tests

- Edited save content is sent to backend.
- Raw reflection remains in provenance.
- Duplicate warning appears.
- Topic/person suggestion adds chip.
- View in Review navigates and shows new save.
- Failed save preserves draft and shows backend error.

## P1.3 Automate Browser Regression Coverage

### Goal

Protect the Capture -> Save -> Review loop from regressions as features grow.

### Current Coverage

The app already has an automated mocked browser test for Capture -> Save -> Review and component tests for failed save messaging.

### Expand Coverage

Add or expand Playwright tests:

1. Local mocked happy path.
2. Local failed-save path.
3. Review P2 controls path.
4. Mobile Review smoke.
5. Filter combinations.
6. Edit/delete path.

### Test Design

#### Mocked Happy Path

Use route mocking for:

- `/chat`
- `/saves`
- `/events`
- any shell routes needed

Verify:

- Reflection appears.
- Save as Insight succeeds.
- Save as Decision succeeds.
- Save as Follow-up succeeds.
- Review shows all records.

#### Failed Save Path

Mock `POST /saves` returning `400`.

Verify:

- Error alert appears.
- No success message appears.
- Capture draft remains.

#### Review P2 Controls Path

Mock `GET /saves`, `PATCH /saves/:id`, and `DELETE /saves/:id`.

Verify:

- Close Follow-up.
- Pin/unpin.
- Mark reviewed/needs review.
- Due date update.
- Edit content.
- Delete confirmation.

#### Mobile Smoke

Viewport:

```text
390x844
```

Verify:

- Mobile header appears.
- Review heading visible.
- Filters reachable.
- Saved record actions reachable.

### Live QA Policy

Keep live Preview/Production QA separate from normal CI:

- Must be opt-in.
- Must use disposable users.
- Must clean up.
- Must never print passwords or service-role keys.

### Acceptance Criteria

- CI protects the local mocked flow.
- P2 Review controls are covered.
- Mobile smoke is covered.
- Live smoke has a documented manual or opt-in path.

## P1.4 Add Product Health Signals

### Goal

Track enough product-safe events to know whether the Phase 20 loop is working without collecting sensitive user content.

### Events

Track:

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

### Event Properties

Allowed:

- save type
- reflection mode
- provider/model
- result
- error code
- surface
- app version

Do not store:

- capture text
- reflection content
- user-entered save content
- passwords
- tokens
- personal contact/payment identifiers

### Implementation Tasks

1. Confirm existing health event endpoint contract.
2. Add event calls around:
   - reflection lifecycle
   - save lifecycle
   - Review open
   - Follow-up close
   - edit/delete
3. Make event failures non-blocking.
4. Add unit tests that event calls are made without content payloads.
5. Add a query doc for checking recent health events.

### Admin/Dev Query Doc

Create:

```text
docs/ops/phase20-health-events.md
```

Include:

- event definitions
- sample queries
- what healthy looks like
- what error spikes mean

### Acceptance Criteria

- Events are emitted for core actions.
- No sensitive content is sent.
- Event failures do not block user workflows.
- There is a simple way to inspect event health.

## P2 - Workflow Maturity

P2 should start after P0 is stable and P1 has improved usability and coverage.

## P2.1 Turn Review Into a Real Workflow

### Goal

Make Review feel like a working queue, not just a saved-record list.

### Features

1. Pinned section.
2. Reviewed/unreviewed queue.
3. Due-soon grouping.
4. Recurring Follow-ups.
5. Lightweight bulk actions.

### Detailed Implementation

#### Pinned Section

Add a top section for pinned saves:

- Show pinned count.
- Limit to a small number initially.
- Include "View all pinned."

Acceptance:

- Pinned items are visually separated.
- Unpinning removes item from pinned section.

#### Reviewed/Unreviewed Queue

Add queue modes:

- Needs review
- Reviewed
- All

Acceptance:

- Needs review queue is one click away.
- Mark reviewed removes item from needs-review queue.

#### Due-Soon Grouping

Group Follow-ups:

- Overdue
- Due today
- Due this week
- Later
- No due date

Acceptance:

- Open Follow-ups are easier to triage.
- Closed Follow-ups do not appear in due-soon queue by default.

#### Recurring Follow-Ups

Add recurrence fields later:

- recurrence rule
- next due date
- completed occurrences

P2 should start with design and schema proposal before implementation.

Acceptance:

- Recurring behavior is documented before schema changes.
- No recurrence is added without tests.

#### Bulk Actions

Initial bulk actions:

- Mark reviewed.
- Pin/unpin.
- Close selected Follow-ups.

Acceptance:

- Bulk actions require explicit selection.
- Destructive actions require confirmation.

## P2.2 Legacy Memory Migration Plan

### Goal

Decide how old memories or thoughts relate to the new durable-save Review system.

### Decision Questions

- Should old `thoughts` appear in Review?
- Should they be imported into `phase20_durable_saves`?
- Should they remain separate but searchable?
- Should imported records preserve original timestamps and source?
- Should imported records be marked reviewed by default?

### Recommended Sequence

1. Inventory legacy tables and fields.
2. Create a read-only compatibility view.
3. Show legacy records in a separate Review tab or Advanced area.
4. Validate user value.
5. Only then add one-time import.

### Read-Only View First

Create a view that maps legacy records into a Review-like shape:

```text
id
content
source
topics
people
created_at
updated_at
legacy_source_table
```

Do not mutate legacy records in the first step.

### Import Later

If import is approved:

- Add migration script.
- Add idempotency key.
- Preserve provenance.
- Tag imported records.
- Provide rollback or delete-by-import-run id.

### Acceptance Criteria

- Decision documented.
- Legacy data is not silently mixed into new saves.
- Any migration is reversible or traceable.

## P2.3 Better Provenance

### Goal

Make every save explain where it came from without overwhelming Review.

### Fields To Store

Already relevant:

- original capture text
- reflection text
- reflection mode
- provider
- model
- timestamp
- source surface

Future fields:

- conversation id
- source URL
- source document id
- source app surface
- import run id
- prompt/template version

### UI Treatment

Review should show provenance compactly:

- Source chip.
- Capture context disclosure.
- Model/provider only inside details.
- Timestamp.

Avoid making the main card too dense.

### Backend Tasks

- Confirm field validation.
- Reject unsupported provenance metadata with `400`.
- Add optional fields only after schema and tests are clear.

### Frontend Tasks

- Show source compactly.
- Keep capture/reflection details collapsed.
- Add clear labels for mode and model.

### Acceptance Criteria

- User can understand why a save exists.
- Provenance does not crowd out content.
- Unsupported metadata is rejected, not dropped.

## P2.4 Notifications and Reminders

### Goal

Help Follow-ups come back at the right time.

### Reminder Types

1. Due-date reminders.
2. Daily Review digest.
3. Weekly Review digest.
4. Optional email or app notification later.

### Recommended Sequence

1. Start with in-app due-soon grouping.
2. Add a Review digest view.
3. Add manual reminder export.
4. Add notification delivery only after usage is proven.

### Backend Considerations

- Reminder scheduling table.
- User notification preferences.
- Delivery status.
- Retry policy.
- Opt-out.

### Frontend Considerations

- Due date picker.
- Reminder preference.
- Digest preview.
- Clear off switch.

### Acceptance Criteria

- No notifications are sent without explicit user intent.
- Reminders are user-scoped.
- User can disable reminders.
- Notification content does not leak sensitive save text unless explicitly approved.

## Suggested PR Sequence

### PR A - Production Stabilization

Priority: P0

Scope:

- Production env audit.
- Production API base set to `/api/open-brain-web`.
- Production redeploy.
- Production smoke runbook.

Acceptance:

- Production smoke passes.

### PR B - Legacy Error Cleanup

Priority: P0

Scope:

- Fix settings/wiki/conversations console errors.
- Add tests for empty/default states.

Acceptance:

- Login/home/Capture/Review no longer emit unrelated legacy errors.

### PR C - Data Safety Audit and Probes

Priority: P0

Scope:

- Cross-user live probes.
- Contract tests if missing.
- Audit doc.

Acceptance:

- User A cannot read, patch, or delete User B saves.

### PR D - Review Usability

Priority: P1

Scope:

- Source filter.
- Sort controls.
- Empty states.
- Open Follow-ups quick filter.
- Cursor loading if needed.

Acceptance:

- Review remains fast and clear as saved records grow.

### PR E - Capture Save UX

Priority: P1

Scope:

- Editable save draft.
- Duplicate warning.
- Topic/person suggestions.
- View in Review success action.

Acceptance:

- User can shape the save before committing it.

### PR F - Regression Coverage and Health Signals

Priority: P1

Scope:

- Expanded Playwright tests.
- Product-safe health events.
- Health query doc.

Acceptance:

- Core loop regressions are caught before merge.

### PR G - Review Workflow Maturity

Priority: P2

Scope:

- Pinned section.
- Queue modes.
- Due-soon grouping.

Acceptance:

- Review functions as a practical working queue.

### PR H - Legacy Migration and Provenance

Priority: P2

Scope:

- Legacy memory decision doc.
- Read-only compatibility view.
- Provenance UI improvements.

Acceptance:

- Legacy data path is deliberate and traceable.

### PR I - Reminder Planning

Priority: P2

Scope:

- Reminder PRD.
- Schema proposal.
- In-app due-soon foundation.

Acceptance:

- Reminder system is designed before delivery mechanisms are built.

## Risk Register

| Risk | Priority | Mitigation |
| --- | --- | --- |
| Production uses direct Supabase URL and hits CORS | P0 | Set `VITE_API_BASE_URL=/api/open-brain-web` and smoke test |
| Legacy errors obscure real failures | P0 | Fix or lazy-load settings/wiki/conversations |
| QA creates persistent test data | P0 | Always cleanup by QA user id |
| Cross-user access regression | P0 | Add live probes and backend contract tests |
| Review becomes too dense | P1 | Add sections and empty states gradually |
| Duplicate saves clutter Review | P1 | Add warning first, backend dedupe later |
| Analytics captures sensitive content | P1 | Allowlist event properties only |
| Legacy migration corrupts user expectations | P2 | Start read-only, import later |
| Reminders become noisy | P2 | Start in-app, require explicit opt-in |

## Definition of Done

P0 is done when:

- Production uses same-origin API routing.
- Production smoke passes.
- Legacy console noise is removed or explicitly documented as non-blocking.
- Live smoke checklist exists.
- Cross-user save isolation is verified.

P1 is done when:

- Review has source filter, useful sorting, empty states, quick filters, and pagination strategy.
- Capture save UX allows pre-save editing and better success navigation.
- Automated browser coverage protects the core loop.
- Product-safe health events are emitted and inspectable.

P2 is done when:

- Review supports practical queue workflows.
- Legacy memories have a documented migration or separation strategy.
- Provenance is richer but still compact.
- Reminder design is clear and opt-in.

## Immediate Next Action

Start with PR A:

1. Set Production `VITE_API_BASE_URL` to `/api/open-brain-web`.
2. Redeploy main.
3. Run authenticated Production smoke QA with a disposable user.
4. Document the result.

Do not start P1 feature work until PR A and the P0 smoke test are complete.
