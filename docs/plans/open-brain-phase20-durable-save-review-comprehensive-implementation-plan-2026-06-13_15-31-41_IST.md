# Open Brain Phase 20 Durable Save And Review Comprehensive Implementation Plan

**Created:** 2026-06-13 15:31:41 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Primary implementation repo:** `arunpr614/open-brain-web`
**Current working clone used for recent PRs:** `/tmp/open-brain-web-phase20-pickup`
**Target product loop:** `Capture -> Reflect -> Save -> Review`
**Source backlog plan:** `docs/plans/open-brain-phase20-backlog-implementation-plan-2026-06-12.md`
**Backend contract evidence PR:** `https://github.com/arunpr614/open-brain-web/pull/4`

## 1. Executive Recommendation

Build Phase 20 in this order:

1. Merge the backend save-contract verification doc.
2. Build the user-scoped backend save contract.
3. Live-verify backend save and read behavior.
4. Build Durable Save in Capture.
5. Build the Review MVP from real saved records.
6. Add browser coverage for `Capture -> Reflect -> Save -> Review`.
7. Expand Review workflow, provenance, telemetry, and legacy migration only after the core loop works.

The current backend is not ready for Durable Save/Review UI. The contract spike found three blockers:

- no browser-authenticated save route for Durable Save;
- no user-scoped memory ownership in the current canonical memory table;
- no reliable persistence for follow-up status or Review-specific metadata.

The important product choice is to avoid building a polished Save/Review surface on top of a backend that cannot yet guarantee ownership, metadata correctness, or durable retrieval. The next implementation PR should be backend-first.

## 2. Current State

### Completed Or In Flight

| Item | Status | Notes |
| --- | --- | --- |
| Capture + Reflection | Completed and merged via PR #3 | Reflection flow works against the preview after environment and proxy fixes. |
| Authenticated Capture QA | Completed | Desktop and mobile authenticated QA passed before PR #3 merge. |
| Backend save-contract spike | Draft PR open as PR #4 | Documents current backend behavior and blocks UI-first Save/Review. |
| Vercel and CI for PR #4 | Passing | PR #4 is docs-only and green. |
| Durable Save UI | Not started | Should remain blocked until backend contract lands. |
| Review MVP | Not started | Should be built from real user-scoped saved objects only. |

### Contract Finding

The browser-facing `open-brain-web` backend can list and search existing memories for an authenticated session, but it does not expose a browser-authenticated save route. The canonical memory persistence API can save limited fields, but it is protected by a server-only key and is not scoped to the signed-in web user.

### Product Principle

Open Brain should not imply that something was saved unless the backend confirms the saved record exists, belongs to the signed-in user, and can be retrieved later in Review.

## 3. Priority Definitions

| Priority | Meaning | Release posture |
| --- | --- | --- |
| P0 | Trust, persistence, ownership, and core-loop blockers | Required before Durable Save/Review can ship |
| P1 | Product workflow completion once backend is verified | Should follow immediately after P0 |
| P2 | Maturity, observability, migration, and workflow depth | Schedule after dogfooding validates the loop |

## 4. Non-Negotiable Rules

1. Do not build Durable Save or Review UI until the backend save contract is implemented and live-verified.
2. Do not auto-save every reflection.
3. Do not show fake saved states.
4. Do not clear capture text, reflection text, or save decisions before backend success.
5. Do not silently drop unsupported metadata.
6. Do not store cross-user records in a shared table without user ownership.
7. Do not expose service-role behavior directly to browser users.
8. Do not track raw capture text, raw reflection text, raw search queries, or raw memory bodies in telemetry.
9. Keep provider/model controls out of default Capture, Save, and Review paths.
10. Keep Advanced reachable during Phase 20.

## 5. Recommended PR Sequence

| PR | Branch | Priority | Goal | Merge gate |
| --- | --- | ---: | --- | --- |
| PR #4 | `codex/phase20-backend-contract-spike` | P0 | Merge the factual backend contract verification | Green checks, no secrets, doc reviewed |
| PR #5 | `codex/phase20-user-scoped-save-contract` | P0 | Add user-scoped Durable Save backend contract | Migration, RLS, routes, tests, live probes |
| PR #6 | `codex/phase20-durable-save-ui` | P1 | Add Save as Insight/Decision/Follow-up in Capture | Saves persist and survive refresh |
| PR #7 | `codex/phase20-review-mvp` | P1 | Show saved Insights, Decisions, and open Follow-ups | Review reads real saved records |
| PR #8 | `codex/phase20-browser-flow-tests` | P1 | Add focused automated browser coverage | Capture -> Save -> Review protected |
| PR #9 | `codex/phase20-review-workflow` | P2 | Add filters, status, edit/delete, due dates | Dogfood-driven workflow improvements |
| PR #10 | `codex/phase20-provenance-telemetry` | P2 | Add provenance and privacy-safe health signals | No raw private content tracked |
| PR #11 | `codex/phase20-legacy-memory-migration-plan` | P2 | Decide treatment of legacy `thoughts` records | Written migration decision and safe plan |

## 6. P0 Plan

### P0.1 Merge Backend Save-Contract Verification

**Goal:** Make PR #4 the document-of-record before implementation starts.

**Actions:**

1. Review PR #4: `https://github.com/arunpr614/open-brain-web/pull/4`.
2. Confirm it states the current backend limitation plainly.
3. Confirm it includes no secrets, auth tokens, passwords, or raw private memory content.
4. Confirm CI and Vercel checks are green.
5. Mark the PR ready for review if desired.
6. Merge it before the backend implementation PR.

**Acceptance criteria:**

- The contract spike is merged into `main`.
- The team has an agreed source of truth for why Durable Save/Review is backend-blocked.
- No UI work is started from assumptions that the current save route is ready.

**Validation:**

```bash
gh pr view 4 --json number,title,isDraft,state,mergeStateStatus,statusCheckRollup,url
```

### P0.2 Build The Backend Save Contract

**Goal:** Add a browser-authenticated, user-owned Durable Save contract.

**Recommendation:** Add a dedicated Phase 20 save table rather than stretching the existing `thoughts` table.

Recommended table name:

```text
phase20_durable_saves
```

Recommended browser-facing route names:

```text
POST /saves
GET /saves
PATCH /saves/:id
```

`/saves` is clearer than `/memories` because this product loop is about explicit saved objects, not all historical memory records.

#### Minimum Schema

```sql
create table phase20_durable_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  save_type text not null check (save_type in ('insight', 'decision', 'follow_up')),
  content text not null,
  source text not null default 'capture_reflection',
  topics text[] not null default '{}',
  people text[] not null default '{}',
  follow_up_status text check (follow_up_status in ('open', 'closed') or follow_up_status is null),
  capture_text text,
  reflection_text text,
  reflection_mode text,
  model text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
```

#### Required Invariants

| Field | Rule |
| --- | --- |
| `user_id` | Always derived from the authenticated Supabase user, never trusted from request body |
| `save_type` | Must be `insight`, `decision`, or `follow_up` |
| `follow_up_status` | Must be `open` for new follow-ups unless explicitly closed later |
| `follow_up_status` | Must be `null` for insights and decisions |
| `content` | Required and non-empty after trimming |
| `source` | Required, default `capture_reflection` |
| extra fields | Rejected with `400`, not silently dropped |

#### RLS Requirement

Enable row-level security and add policies so users can only select, insert, update, and delete their own saves.

Policy intent:

```sql
auth.uid() = user_id
```

The edge function may use service credentials internally if needed, but it must still derive `user_id` from the authenticated session and enforce ownership.

#### POST `/saves`

Request:

```json
{
  "save_type": "insight",
  "content": "Short saved object text",
  "source": "capture_reflection",
  "topics": ["phase20"],
  "people": [],
  "follow_up_status": null,
  "capture_text": "optional original capture",
  "reflection_text": "optional reflection output",
  "reflection_mode": "challenge"
}
```

Success response:

```json
{
  "save": {
    "id": "uuid",
    "save_type": "insight",
    "content": "Short saved object text",
    "source": "capture_reflection",
    "topics": ["phase20"],
    "people": [],
    "follow_up_status": null,
    "created_at": "2026-06-13T00:00:00.000Z",
    "updated_at": "2026-06-13T00:00:00.000Z"
  }
}
```

Failure responses:

| Case | Status | Body |
| --- | ---: | --- |
| Missing auth | `401` | `{ "error": "Missing authorization" }` |
| Invalid token | `401` | `{ "error": "Invalid authorization" }` |
| Missing content | `400` | `{ "error": "Content is required" }` |
| Unsupported field | `400` | `{ "error": "Unsupported field: field_name" }` |
| Invalid save type | `400` | `{ "error": "Invalid save_type" }` |
| Invalid follow-up status | `400` | `{ "error": "Invalid follow_up_status" }` |
| Backend failure | `500` | `{ "error": "Save failed" }` |

#### GET `/saves`

Supported filters:

- `save_type=insight|decision|follow_up`
- `follow_up_status=open|closed`
- `source=capture_reflection`
- `topic=<topic>`
- `person=<person>`
- `limit=<number>`
- `cursor=<created_at_or_id_cursor>`

Response:

```json
{
  "saves": [],
  "next_cursor": null
}
```

Rules:

- Return only the authenticated user's records.
- Sort open follow-ups before closed follow-ups in Review-specific queries, or make that sorting easy for the client.
- Never return another user's records.

#### PATCH `/saves/:id`

Minimum P0 update behavior:

- close an open follow-up;
- optionally update `content`, `topics`, or `people` if included in the same backend PR;
- reject unsupported metadata.

Recommended close request:

```json
{
  "follow_up_status": "closed"
}
```

Success response should return the updated save.

#### Backend Contract Tests

Required tests:

1. Unauthenticated save returns `401`.
2. Invalid auth returns `401`.
3. Valid Insight save returns a stable success body.
4. Valid Decision save returns a stable success body.
5. Valid Follow-up save returns `follow_up_status: "open"`.
6. Missing content returns `400`.
7. Unsupported fields return `400`.
8. Invalid `save_type` returns `400`.
9. Invalid follow-up status returns `400`.
10. Insight cannot be created with `follow_up_status: "open"`.
11. Decision cannot be created with `follow_up_status: "open"`.
12. Follow-up can be closed with `PATCH /saves/:id`.
13. User A cannot read User B's saves.
14. User A cannot update User B's saves.
15. `GET /saves` can filter by type, status, source, topic, and person.

#### Live Verification Checklist

Run safe live probes against a preview or staging deployment:

1. Sign in as test user A.
2. Create Insight.
3. Create Decision.
4. Create Follow-up.
5. Refresh token/session if needed.
6. Read back saved objects.
7. Filter by type.
8. Filter open follow-ups.
9. Close follow-up.
10. Confirm closed follow-up no longer appears in open list.
11. Sign in as test user B.
12. Confirm user B cannot see user A's saved records.
13. Send unsupported metadata and confirm `400`.
14. Confirm no secrets or raw private content are printed in logs.

**Acceptance criteria:**

- Backend save contract is implemented.
- Reads and writes are user-scoped.
- Unsupported metadata is rejected.
- Follow-up status is durable.
- Review can be built from the returned shape.
- Live probes pass before UI work starts.

### P0.3 Backend Deployment And Rollback

**Goal:** Make the backend change safe to deploy.

**Actions:**

1. Create migration for `phase20_durable_saves`.
2. Add RLS policies.
3. Add edge function routes.
4. Add local/CI contract tests.
5. Deploy to preview or staging first.
6. Run live probes.
7. Deploy to production only after probes pass.

**Rollback plan:**

- If migration is additive, rollback can disable routes without dropping data.
- If route behavior is faulty, gate `/saves` behind an environment flag.
- Do not delete saved records during rollback.
- Keep PR #4 contract doc available as fallback context.

## 7. P1 Plan

### P1.1 Build Durable Save In Capture

**Goal:** Let the user explicitly choose what becomes durable after reflection.

**Save actions:**

- Save as Insight
- Save as Decision
- Save as Follow-up
- Do not save

**Likely files:**

- `src/components/DurableSavePanel.tsx`
- `src/hooks/useDurableSave.ts`
- `src/lib/durableSaveClient.ts`
- `src/types/productReset.ts`
- `src/__tests__/durableSavePanel.test.tsx`
- `src/__tests__/useDurableSave.test.tsx`

**Implementation steps:**

1. Add shared save types that match the backend contract.
2. Add a focused `durableSaveClient`.
3. Add `useDurableSave` for loading, success, error, and retry state.
4. Show the save panel after successful reflection.
5. Provide the three save-type actions plus Do not save.
6. For Follow-up, set initial status to `open`.
7. Preserve capture and reflection text while saving.
8. Disable duplicate submit while saving.
9. Show clear success after backend confirmation.
10. Show clear failure after backend failure.
11. Keep failed saves retryable without re-reflecting.
12. Avoid provider/model controls in this path.

**Acceptance criteria:**

- User can save an Insight.
- User can save a Decision.
- User can save a Follow-up.
- User can choose Do not save.
- Failed save preserves the draft and reflection.
- Successful save can be retrieved from the backend.
- UI never implies success before backend success.

**Tests:**

- Save Insight sends correct payload.
- Save Decision sends correct payload.
- Save Follow-up sends `follow_up_status: "open"`.
- Unsupported metadata is not sent.
- Non-OK response shows failure and preserves text.
- Network error shows failure and preserves text.
- Duplicate click does not duplicate save.
- Do not save does not call the backend.

### P1.2 Build Review MVP

**Goal:** Prove that saved context comes back.

**MVP sections:**

- Recent Insights
- Recent Decisions
- Open Follow-ups

**Likely files:**

- `src/components/ReviewDashboard.tsx`
- `src/components/ReviewSection.tsx`
- `src/components/ReviewItemRow.tsx`
- `src/hooks/useReviewSaves.ts`
- `src/lib/reviewClient.ts`
- `src/__tests__/reviewDashboard.test.tsx`

**Implementation steps:**

1. Fetch saved records from `GET /saves`.
2. Render Insights, Decisions, and open Follow-ups separately.
3. Show open Follow-ups first.
4. Add compact empty states per section.
5. Add full-page load failure with Retry.
6. Add close action for Follow-ups if `PATCH /saves/:id` is available.
7. Link saved items back to source/reflection context if stored.
8. Verify saved records still appear after refresh.

**Acceptance criteria:**

- Saved Insight appears in Review.
- Saved Decision appears in Review.
- Saved Follow-up appears in Review as open.
- Closed Follow-up no longer appears as open.
- Empty state is not confused with failure.
- Load failure is visible and retryable.
- Review does not imply weekly review exists yet.

**Tests:**

- Renders grouped saves.
- Renders empty sections.
- Renders load failure.
- Retry refetches.
- Close Follow-up calls backend and updates UI after success.
- Failed close preserves row state.

### P1.3 Authenticated Preview QA Before Merge

**Goal:** Confirm the full loop works in a real authenticated browser session.

**Checklist:**

1. Sign in.
2. Open Home.
3. Open Capture.
4. Enter test capture text.
5. Run reflection.
6. Save as Insight.
7. Save as Decision.
8. Save as Follow-up.
9. Refresh the page.
10. Open Review.
11. Confirm all three saved types appear.
12. Close the follow-up.
13. Refresh again.
14. Confirm closed follow-up is no longer open.
15. Confirm mobile layout.
16. Force or simulate save failure.
17. Confirm failed save shows a real error.
18. Confirm Advanced remains reachable.

**Acceptance criteria:**

- The user can complete `Capture -> Reflect -> Save -> Review`.
- Persistence survives refresh.
- Failure states are honest.
- Mobile is usable.
- Advanced is still available.

### P1.4 Add Automated Browser Flow Coverage

**Goal:** Protect the core loop from regressions.

**Recommended coverage:**

- Capture -> Reflect success.
- Capture -> Reflect error -> Retry.
- Capture -> Reflect -> Save Insight.
- Capture -> Reflect -> Save Decision.
- Capture -> Reflect -> Save Follow-up.
- Save failure preserves text.
- Saved object appears in Review.
- Follow-up can be closed.

**Approach:**

- Use browser tests with mocked network for deterministic UI coverage.
- Use one live authenticated smoke checklist before merge.
- Keep raw private content out of test fixtures.

**Acceptance criteria:**

- Core loop regressions are caught automatically.
- Browser tests are stable enough to run in CI or as a required local gate.

## 8. P2 Plan

### P2.1 Improve Review Into A Workflow

**Goal:** Make Review a daily working surface, not just a list.

**Features:**

- search;
- topic filter;
- person filter;
- pinned items;
- reviewed/unreviewed state;
- due dates for follow-ups;
- lightweight edit;
- lightweight delete;
- section-level counts.

**Acceptance criteria:**

- User can triage saved items.
- Open loops are visible.
- Stale follow-ups can be found.
- Edits and deletes are recoverable or clearly confirmed.

### P2.2 Add Provenance And Audit Detail

**Goal:** Preserve enough context for Review without confusing the saved object.

**Store:**

- original capture text;
- reflection text;
- selected reflection mode;
- model/provider used;
- timestamp;
- source surface;
- app version or deployment id if practical.

**Design note:**

The saved object should stay readable on its own. Provenance should support context and audit, not make Review feel like a log viewer.

### P2.3 Add Privacy-Safe Analytics And Health Signals

**Goal:** Learn whether the product loop works without collecting private content.

**Allowed events:**

- `reflection_started`
- `reflection_completed`
- `reflection_failed`
- `save_attempted`
- `save_succeeded`
- `save_failed`
- `review_opened`
- `follow_up_closed`

**Never track:**

- raw capture text;
- raw reflection text;
- raw search query;
- raw saved object content;
- names extracted from content;
- auth tokens or identifiers beyond a safe user/account id already permitted by the app's privacy model.

**Acceptance criteria:**

- Telemetry helps diagnose funnel drop-off and failure rate.
- Telemetry cannot accidentally receive private thought content.

### P2.4 Plan Legacy Memory Migration

**Goal:** Decide what to do with existing `thoughts` records after the new Durable Save contract stabilizes.

**Decision options:**

1. Keep legacy memories separate from Phase 20 Review.
2. Read legacy memories in Advanced only.
3. Import selected legacy memories into `phase20_durable_saves`.
4. Build a one-time migration assistant.
5. Add compatibility read-only display with clear labeling.

**Required decision criteria:**

- user ownership;
- metadata completeness;
- privacy risk;
- duplicate risk;
- whether the record can be safely classified as Insight, Decision, or Follow-up.

**Acceptance criteria:**

- No legacy records appear in Review without a clear ownership and classification strategy.
- Migration does not silently rewrite user memory history.

### P2.5 Tighten Packaging And Narrative

**Goal:** Keep Open Brain from feeling like a pile of tools.

Core narrative:

```text
Capture what is on your mind.
Reflect with the right job mode.
Save only what matters.
Review what you are carrying.
```

**Acceptance criteria:**

- Home points users into the core loop.
- Advanced is clearly secondary.
- Copy does not overpromise unavailable backend features.

## 9. Cross-Cutting Validation

### Required Checks For Code PRs

```bash
npm test
npm run build
npm run lint
npm audit --audit-level=moderate
git diff --check
```

### Required Manual Checks For UI PRs

- authenticated desktop walkthrough;
- authenticated mobile walkthrough;
- loading states;
- empty states;
- error states;
- retry states;
- save after reflection;
- refresh after save;
- Review readback;
- Advanced navigation.

### Required Backend Checks Before UI Work

- unauthenticated request behavior;
- invalid token behavior;
- successful save behavior;
- save failure behavior;
- unsupported metadata rejection;
- user scoping;
- cross-user isolation;
- read-after-write;
- filter behavior;
- logs contain no secrets or raw private content.

## 10. Risk Register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| UI ships before user-scoped saves | High | Keep Durable Save/Review blocked until P0 backend contract passes live probes. |
| Unsupported metadata is silently dropped | High | Reject unknown fields with `400`; add tests. |
| Cross-user data leak | High | Add `user_id`, RLS, ownership tests, and live cross-user probes. |
| Review shows stale or fake state | High | Build Review only from persisted saves; no local-only success. |
| Logs expose private thought content | High | Redact logs and test telemetry schema. |
| Existing Advanced tools regress | Medium | Add navigation smoke checks and keep Advanced isolated from core-loop changes. |
| Legacy memories confuse Review | Medium | Defer migration until explicit P2 decision. |
| Browser tests become flaky | Medium | Mock network for most UI tests; reserve live auth for manual preview QA. |

## 11. Open Decisions

1. Should the browser-facing endpoint be `/saves` or `/memories`?
2. Should `phase20_durable_saves` store full `capture_text` and `reflection_text`, or only source references and selected saved content?
3. Should Follow-up support only `open` and `closed` in P0, or include `dismissed` and `carried_forward` later?
4. Should delete/edit ship in P1 Review MVP or wait for P2 workflow maturity?
5. Should existing `thoughts` records remain Advanced-only until migration is designed?
6. What is the minimum dogfood period before promoting Review workflow improvements?

## 12. Definition Of Done

Phase 20 Durable Save/Review is done only when all of the following are true:

- user can capture text;
- user can reflect using the default Capture modes;
- user can save as Insight;
- user can save as Decision;
- user can save as Follow-up;
- user can choose Do not save;
- saved objects are owned by the signed-in user;
- saved objects survive refresh;
- Review displays saved Insights, Decisions, and open Follow-ups;
- Follow-ups can be closed;
- failure states are honest and recoverable;
- unsupported metadata is rejected;
- cross-user isolation is tested;
- provider/model complexity is not on the default path;
- Advanced tools remain reachable;
- automated tests cover the core loop;
- authenticated preview QA passes before merge.

## 13. Immediate Next Steps

1. Review and merge PR #4.
2. Create `codex/phase20-user-scoped-save-contract` from updated `main`.
3. Add the `phase20_durable_saves` migration and RLS policies.
4. Add `POST /saves`, `GET /saves`, and `PATCH /saves/:id`.
5. Add backend contract tests for auth, schema validation, follow-up status, unsupported metadata, and cross-user isolation.
6. Deploy to preview/staging and run live probes.
7. Only after live probes pass, start `codex/phase20-durable-save-ui`.
8. After Durable Save lands, build `codex/phase20-review-mvp`.
9. Add browser flow tests for `Capture -> Reflect -> Save -> Review`.
10. Defer Review workflow depth, provenance, telemetry, and legacy migration until P2.
