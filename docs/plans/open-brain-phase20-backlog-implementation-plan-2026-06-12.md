# Open Brain Phase 20 Backlog Implementation Plan

**Created:** 2026-06-12
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Primary product track:** Phase 20 Open Brain product reset
**Target product loop:** `Capture -> Reflect -> Save -> Review`
**Primary implementation repo for Phase 20 web work:** `arunpr614/open-brain-web`
**Current known web worktree:** `/tmp/open-brain-web-phase20-docs`
**Current known open web PR:** `https://github.com/arunpr614/open-brain-web/pull/3`

## 1. Purpose

This plan turns the remaining P0, P1, and P2 backlog into an implementation sequence. The main product risk is making Open Brain look complete before the save and review persistence contract is proven. The plan therefore keeps the order strict:

1. Finish authenticated review of Capture + Reflection.
2. Verify the backend save contract.
3. Build explicit Durable Save.
4. Build Review from real saved objects.
5. Only then expand lifecycle, search, weekly review, telemetry, and polish.

The product should not be described as complete until a user can capture a thought, reflect on it, save only what matters, and later review what was saved.

## 2. Current State

### Phase 20 Product Reset

- Product shell is already merged in `open-brain-web`.
- Capture + Reflection is implemented in PR #3 but still needs authenticated Vercel visual review before merge.
- Durable Save is not implemented.
- Review MVP is not implemented.
- Backend save contract is not verified.
- Existing Advanced tools are still available and should remain available during P0.

### Separate `ai-brain` Production Ops Track

- `ai-brain` production is at v0.8.5.
- No active P0 production blocker is known.
- YouTube transcript recovery is operationally safer, but automatic transcript extraction is still blocked by YouTube anti-bot behavior.
- Real production backfill enqueue mode must not be run without explicit approval.

## 3. Priority Definitions

| Priority | Meaning | Release posture |
|---|---|---|
| P0 | Core loop blocker or trust blocker | Required before Phase 20 can be called useful |
| P1 | Important expansion once the loop works | Should follow immediately after P0 |
| P2 | Hardening, cleanup, evidence gathering, and maturity | Schedule after dogfooding validates the loop |

## 4. Non-Negotiable Rules

1. Do not build polished Save UI before verifying `POST /memory` and `GET /memories`.
2. Do not pretend these endpoints exist until implemented or verified:
   - `/captures`
   - `/reflections`
   - `/durable-objects`
   - `/review/weekly`
   - `/events`
   - `/ready`
3. If compatibility routes are used, name them honestly:
   - `reflectionCompatClient`
   - `createChatCompatReflection`
   - `memoryCompatDurableClient`
   - `saveDurableObjectViaMemory`
4. Do not auto-save every reflection.
5. Do not clear user text, draft content, or reflection output before backend success.
6. Every persistence action must show success, failure, and a recovery path.
7. Keep provider/model controls out of the default Capture, Save, and Review paths.
8. Keep Advanced tools reachable during P0.
9. Do not mix broad lint cleanup with product-loop feature PRs.
10. Do not run real YouTube transcript backfill enqueue mode in `ai-brain` without explicit approval.

## 5. Target PR Sequence

| PR | Branch | Priority | Goal | Merge gate |
|---|---|---:|---|---|
| PR #3 | `codex/phase20-capture-reflection` | P0 | Merge Capture + Reflection after authenticated QA | Green checks plus authenticated desktop/mobile review |
| PR #4 | `codex/phase20-backend-contract-spike` | P0 | Verify and document save/review backend contract | Contract doc plus safe checks; no fake UI |
| PR #5 | `codex/phase20-durable-save` | P0 | Save as Insight, Decision, Follow-up, or Do not save | Save success/failure verified against real backend |
| PR #6 | `codex/phase20-review-mvp` | P0 | Show recent Insights, Decisions, and open Follow-ups | Saved objects return correctly after refresh |
| PR #7 | `codex/phase20-product-client-types` | P1 | Shared types and focused clients/hooks | Type coverage and unit tests |
| PR #8 | `codex/phase20-followup-search-weekly` | P1 | Follow-up lifecycle, saved-context search, weekly review | User-flow tests and manual QA |
| PR #9 | `codex/phase20-polish-telemetry-flags` | P1 | Ghost controls cleanup, telemetry, start guide, rollback | No raw content tracked; rollback verified |
| Later | TBD | P2 | Backend canonicalization, readiness, jobs, logs, cleanup | Evidence-based prioritization |

## 6. P0 Implementation Plan

### P0.1 Authenticated PR #3 Review And Merge

**Objective:** Confirm the implemented Capture + Reflection flow is product-ready before merging it.

**Inputs:**

- PR: `https://github.com/arunpr614/open-brain-web/pull/3`
- Vercel preview from the PR comment.
- Authenticated browser session.

**Implementation steps:**

1. Open the PR #3 Vercel preview while authenticated.
2. Confirm the app opens to Home.
3. Confirm sidebar navigation shows:
   - Home
   - Capture
   - Review
   - Search
   - Advanced
4. Open Capture.
5. Confirm the composer is visible and usable.
6. Confirm empty Capture cannot submit.
7. Type test context:

   ```text
   I need to decide whether to merge the product reset before the save backend is verified.
   ```

8. Select `Challenge me`.
9. Click Reflect.
10. Confirm loading state appears.
11. Confirm Cancel is visible during loading.
12. Confirm success shows reflection output.
13. Confirm no provider/model selector appears in Capture.
14. Confirm the durable-save deferred message is clear and honest.
15. Resize or open mobile and confirm the layout stacks cleanly.
16. Return to Home and Advanced.
17. Confirm Advanced tools remain reachable.

**Acceptance criteria:**

- Capture feels calm, useful, and not cramped.
- Reflection modes are understandable.
- Loading, cancel, error, retry, and success states are understandable.
- No UI implies durable Save already works.
- Desktop and mobile review pass.
- PR #3 remains green and mergeable.

**Validation:**

```bash
npm test -- --run src/__tests__/reflectionCompatClient.test.ts src/__tests__/captureWorkspace.test.tsx src/__tests__/chatLayoutProductShell.test.tsx
npm run build
npm run lint
npm audit --audit-level=moderate
git diff --check
```

**Output:**

- Merge PR #3 if authenticated review passes.
- If review finds issues, fix them inside PR #3 before merge.

### P0.2 Backend Save-Contract Spike

**Objective:** Verify whether the current backend can support Durable Save and Review without pretending reset-specific endpoints exist.

**Branch:** `codex/phase20-backend-contract-spike`

**Deliverable:**

- `docs/phase-20-product-reset/Backend_Save_Contract_Spike_2026-06-12.md`

**Questions to answer:**

1. Can `POST /memory` save object type?
2. Can `POST /memory` save source?
3. Can `POST /memory` save topics?
4. Can `POST /memory` save people?
5. Can `POST /memory` save follow-up status?
6. Can `POST /memory` persist metadata needed for Review?
7. Are writes scoped to the authenticated user?
8. What status code and body does save failure return?
9. Does the backend reject unsupported metadata or silently drop it?
10. Can `GET /memories` power Review?
11. Can saved records distinguish Insight, Decision, and Follow-up?
12. Is there a canonical backend source folder for the deployed Supabase function?

**Implementation steps:**

1. Branch from updated `origin/main` in `open-brain-web`.
2. Read current frontend clients for:
   - `POST /memory`
   - `GET /memories`
   - `POST /memories/search`
   - `PUT /memories/:id`
3. Identify request and response shapes from existing code.
4. Identify any existing tests or fixtures for memory saves.
5. Run safe contract checks where possible.
6. Document observed request shape.
7. Document observed success shape.
8. Document observed failure shape.
9. Document metadata persistence behavior.
10. Document user-scoping evidence or unknowns.
11. Recommend one path:
    - use compatibility over `/memory`;
    - add reset-specific endpoints first;
    - block Durable Save until backend work lands.

**Acceptance criteria:**

- Unknowns are explicit and not hidden.
- The team knows whether Durable Save can use `/memory`.
- The team knows whether Review can use `/memories`.
- No fake Save UI is added in this PR.

**Validation:**

- Contract doc reviewed.
- Any contract checks are repeatable.
- No secrets or raw private user content appear in the doc.

### P0.3 Durable Save

**Objective:** Let the user explicitly decide what becomes durable after a reflection.

**Branch:** `codex/phase20-durable-save`

**Save choices:**

- Save as Insight
- Save as Decision
- Save as Follow-up
- Do not save

**Likely files:**

- `src/components/DurableSavePanel.tsx`
- `src/hooks/useDurableSave.ts`
- `src/lib/memoryCompatDurableClient.ts`
- `src/types/productReset.ts`
- `src/__tests__/durableSavePanel.test.tsx`
- `src/__tests__/useDurableSave.test.tsx`
- existing Capture/Reflection tests as needed

**Implementation steps:**

1. Start only after P0.2 confirms the save path.
2. Extend product reset types:
   - `DurableObjectType`
   - `FollowUpStatus`
   - durable save request/response shape
3. Build a save panel that appears after successful reflection.
4. Provide save actions for Insight, Decision, Follow-up, and Do not save.
5. For Follow-up, set initial status to `open`.
6. Preserve draft and reflection during save.
7. Disable duplicate save action while save is in progress.
8. Show visible success after backend success.
9. Show visible failure after backend failure.
10. Keep failed saves retryable without retyping or re-reflecting.
11. If using `/memory`, keep compatibility naming explicit.

**Acceptance criteria:**

- User can save an Insight, Decision, or Follow-up from reflection output.
- User can explicitly choose Do not save.
- Save success is visible.
- Save failure is visible.
- Failed save preserves draft and reflection.
- Saved object can be retrieved after refresh or navigation.
- No provider/model controls appear in the default save path.

**Tests:**

- Save Insight sends correct payload.
- Save Decision sends correct payload.
- Save Follow-up sends `open` status.
- Do not save clears or dismisses only the active save decision, according to chosen UX.
- Non-OK save shows failure and preserves text.
- Thrown network error shows failure and preserves text.
- Duplicate click does not duplicate save.

### P0.4 Review MVP

**Objective:** Prove that saved context comes back.

**Branch:** `codex/phase20-review-mvp`

**Review MVP must show:**

- Recent saved Insights.
- Recent saved Decisions.
- Open Follow-ups.
- Empty states.
- Load failure state with retry.

**Out of scope:**

- Weekly AI summary.
- Full analytics dashboard.
- Mind map.
- Wiki integration.
- Bulk editing.

**Likely files:**

- `src/components/ReviewDashboard.tsx`
- `src/components/ReviewItemList.tsx`
- `src/hooks/useReviewItems.ts`
- `src/lib/reviewCompatClient.ts`
- `src/__tests__/reviewDashboard.test.tsx`

**Implementation steps:**

1. Build a review client using the verified contract from P0.2.
2. Fetch recent saved records.
3. Normalize records into Insight, Decision, and Follow-up groups.
4. Render each group with compact, scan-friendly rows.
5. Add empty states for each group.
6. Add a full Review load failure state with Retry.
7. Ensure Review failure is not confused with an empty list.
8. Add navigation from Home/Sidebar to Review.
9. Verify saved items appear after refresh.

**Acceptance criteria:**

- Saved Insight appears in Review.
- Saved Decision appears in Review.
- Open Follow-up appears in Review.
- Review clearly separates object types.
- Empty states are accurate.
- Load failure is visible and retryable.
- Review does not imply weekly review exists yet.

**Tests:**

- Renders grouped insights, decisions, and open follow-ups.
- Renders empty state.
- Renders load failure with retry.
- Retry refetches.
- Saved object created by Durable Save appears after fetch.

### P0.5 Trustworthy Failure States

**Objective:** Stop the product from implying success when work failed.

**Failure states to cover:**

- Reflection failure.
- Empty reflection response.
- Save failure.
- Partial save or metadata drop, if detectable.
- Review load failure.
- Search failure.
- Auth/session failure.

**Implementation steps:**

1. Audit existing Capture/Reflection states.
2. Add or standardize state types:
   - idle
   - loading
   - success
   - error
   - cancelled
3. Add save-state types:
   - idle
   - saving
   - saved
   - error
   - dismissed
4. Add review-state types:
   - idle
   - loading
   - loaded
   - empty
   - error
5. Make failure copy answer:
   - What failed?
   - Is the user's text still safe?
   - What can the user do next?
6. Ensure no UI clears before backend success.
7. Add tests for non-OK, thrown error, empty response, and retry.

**Acceptance criteria:**

- No blank response is marked as complete.
- No save failure looks successful.
- No review failure looks empty.
- User text remains safe after reflection/save failure.

### P0.6 Search Failure Handling

**Objective:** Keep Search honest even before saved-context search is expanded.

**Implementation steps:**

1. Audit existing Search behavior.
2. Confirm search failure path is visible.
3. Add retry if missing.
4. Make empty results visually distinct from failed search.
5. Avoid making saved-context search part of this P0 slice unless it is required by Review.

**Acceptance criteria:**

- Search failures do not look like empty success.
- User can retry a failed search.
- Empty search results communicate that no matching records were found.

### P0.7 Keep Advanced Intact

**Objective:** Preserve working legacy tools while the reset proves itself.

**Tools to keep reachable:**

- Chat
- Journal Relay
- Memories
- Wiki
- Mind Map
- Analytics
- Export
- Settings
- Model hubs
- Relay Sessions
- Recent chats

**Implementation steps:**

1. Avoid deleting Advanced tools during P0.
2. Add regression tests for Advanced navigation where practical.
3. Confirm Home, Capture, Review, Search, Advanced remain the default path.
4. Keep provider/model complexity inside Advanced, Chat, or settings surfaces.

**Acceptance criteria:**

- Advanced tools remain reachable after Capture, Save, and Review changes.
- Default path remains simple and product-shaped.

## 7. P1 Implementation Plan

### P1.1 Expand Product Reset Types

**Objective:** Make reset concepts explicit and shared.

**Likely file:**

- `src/types/productReset.ts`

**Types to define or finalize:**

```ts
export type ReflectionMode = "coach" | "challenge" | "summarize" | "plan_next_step";

export type DurableObjectType = "insight" | "decision" | "follow_up";

export type FollowUpStatus = "open" | "completed" | "dismissed";

export interface Capture {
  id: string;
  content: string;
  source: "manual" | "pasted_context" | "chat_compat";
  created_at: string;
}

export interface Reflection {
  id: string;
  capture_id: string | null;
  mode: ReflectionMode;
  content: string;
  created_at: string;
}

export interface DurableObject {
  id: string;
  type: DurableObjectType;
  title: string;
  content: string;
  source_capture_id: string | null;
  source_reflection_id: string | null;
  status?: FollowUpStatus;
  topics: string[];
  people: string[];
  created_at: string;
  updated_at: string;
}
```

**Acceptance criteria:**

- Components do not invent local string unions for reset concepts.
- Clients and hooks share the same request/response types.

### P1.2 Typed Client And Hook Layer

**Objective:** Stop scattering raw fetch calls as the product loop grows.

**Clients:**

- `reflectionCompatClient`
- `memoryCompatDurableClient`
- `reviewCompatClient`
- `savedContextSearchClient`
- later: `productTelemetryClient`

**Implementation steps:**

1. Create focused clients for each product workflow.
2. Normalize success responses.
3. Normalize errors into UI-friendly errors.
4. Keep authorization handling consistent.
5. Keep compatibility naming until final endpoints exist.

**Acceptance criteria:**

- Capture, Save, Review, and Search use focused clients/hooks.
- Non-OK handling is not copy/pasted across components.
- Tests cover client success, non-OK, invalid response, and thrown error.

### P1.3 Follow-Up Lifecycle

**Objective:** Make Follow-up a living object, not a saved note.

**States:**

- open
- completed
- dismissed

**Actions:**

- Complete.
- Carry forward.
- Dismiss.

**Likely files:**

- `src/components/FollowUpActions.tsx`
- `src/hooks/useFollowUps.ts`
- `src/lib/followUpClient.ts` or a compatibility wrapper

**Implementation steps:**

1. Add Review actions for open follow-ups.
2. Confirm update route and metadata contract.
3. Implement complete action.
4. Implement dismiss action.
5. Define carry-forward behavior.
6. Preserve row state on failed updates.
7. Remove completed/dismissed follow-ups from the open section after success.

**Acceptance criteria:**

- Open follow-ups appear in Review.
- Completed and dismissed follow-ups no longer appear as open.
- Failed status updates are visible and recoverable.

### P1.4 Saved-Context Search

**Objective:** Make saved knowledge usable in future reflections.

**Filters:**

- Insights.
- Decisions.
- Follow-ups.

**Primary action:**

- Use in reflection.

**Likely files:**

- `src/components/SavedContextSearch.tsx`
- `src/hooks/useSavedContextSearch.ts`
- `src/lib/savedContextSearchClient.ts`

**Implementation steps:**

1. Add typed search client using verified route.
2. Add filters by object type.
3. Render compact result rows.
4. Add "Use in reflection" action.
5. Insert selected context into Capture or Reflection workspace in a clear way.
6. Add visible loading, empty, and failure states.

**Acceptance criteria:**

- User can search saved context by type.
- User can bring a saved item into a new reflection without manual copy/paste.
- Search failure is visible.

### P1.5 Weekly Review

**Objective:** Make the product habit-forming after saved objects exist.

**MVP weekly review includes:**

- Recent insights.
- Decisions made this week.
- Open loops.
- Stale follow-ups.
- Option to generate a weekly reflection.
- Option to save the weekly reflection after backend contract is ready.

**Implementation steps:**

1. Decide whether weekly review uses `/memories` compatibility or a new endpoint.
2. Build weekly source-data query.
3. Add grouped weekly review UI.
4. Add stale follow-up logic.
5. Add optional weekly reflection only with clear source data.
6. Do not add fake `/review/weekly` calls.

**Acceptance criteria:**

- Weekly Review is built from real saved objects or a verified endpoint.
- It does not hallucinate saved state.
- It has clear empty and failure states.

### P1.6 Ghost Settings Cleanup

**Objective:** Remove or clarify settings that imply behavior that is missing, dead, or unclear.

**Controls to audit:**

- `session_focus`
- `interaction_mode`
- `post_save_search`
- `telegram_auto_send`
- `wiki_auto_ingest`

**Implementation steps:**

1. For each setting, identify whether behavior exists.
2. Remove unused settings.
3. Move expert-only settings to Advanced.
4. Disable future settings with honest copy if they are planned but not implemented.
5. Wire settings properly only when behavior is real.

**Acceptance criteria:**

- Every visible setting changes real behavior or is clearly disabled.
- Settings do not mislead users.

### P1.7 Privacy-Safe Telemetry

**Objective:** Learn whether the product loop works without collecting private content.

**Events to track:**

- `capture_started`
- `reflection_requested`
- `reflection_completed`
- `reflection_failed`
- `durable_object_saved`
- `durable_object_save_failed`
- `review_opened`
- `search_result_opened`

**Never track:**

- Raw capture text.
- Raw reflection text.
- Raw search query.
- Personal names from content.
- Full memory body.

**Implementation steps:**

1. Create a telemetry helper with an allowlisted event schema.
2. Reject or strip raw text fields.
3. Track mode, object type, status, timing, and coarse counts only.
4. Add tests that raw content fields are not accepted.
5. Document telemetry policy.

**Acceptance criteria:**

- Telemetry is useful for product learning.
- Telemetry cannot casually receive raw private content.

### P1.8 User-Facing Start Guide

**Objective:** Help first-time users understand the loop without turning Home into a landing page.

**Guide should explain:**

- Capture a thought.
- Choose how to reflect.
- Save only what matters.
- Review what you saved.

**Implementation steps:**

1. Add a compact first-run guide on Home or Capture.
2. Make it dismissible if appropriate.
3. Use practical product copy, not marketing copy.
4. Keep the actual app experience first.

**Acceptance criteria:**

- The guide is short and practical.
- It does not hide the app behind a marketing page.

### P1.9 Feature Flag And Rollback Path

**Objective:** Make the product reset reversible during dogfooding.

**Options:**

- Environment flag for product-shell default.
- Runtime local override for internal dogfood.
- Route fallback to legacy chat-first experience.

**Implementation steps:**

1. Define the rollback mechanism.
2. Add a default route switch.
3. Keep Advanced reachable in both modes.
4. Add tests for reset default and chat-first fallback.

**Acceptance criteria:**

- The team can temporarily restore chat-first behavior without reverting multiple PRs.
- Fallback behavior is tested where practical.

### P1.10 Better Integration Coverage

**Objective:** Cover real workflows, not just route wiring.

**Core flows to test:**

- Capture -> Reflect success.
- Capture -> Reflect failure -> Retry.
- Capture -> Reflect -> Save Insight.
- Save failure preserves text.
- Save success appears in Review.
- Review load failure shows retry.
- Saved-context search -> Use in reflection.

**Implementation steps:**

1. Expand component and hook tests around real user flows.
2. Add network mocks for:
   - success
   - non-OK
   - empty response
   - thrown error
3. Keep tests focused on behavior.
4. Avoid brittle visual-only assertions.

**Acceptance criteria:**

- Main loop regressions are caught.
- Failure behavior is covered.

## 8. P2 Implementation Plan

### P2.1 Canonicalize Backend Source Of Truth

**Objective:** End ambiguity around where backend truth lives.

**Deliverables:**

- Backend source-of-truth decision.
- Versioned migrations.
- Edge function deployment notes.
- Local development instructions.

**Acceptance criteria:**

- A new agent can identify where deployed backend code comes from.
- Schema changes are reproducible.

### P2.2 Add `/ready` Backend Health Endpoint

**Objective:** Distinguish frontend bugs from backend readiness problems.

**Endpoint should verify:**

- Database connection.
- Schema version.
- Required config presence.
- Embedding/search readiness where applicable.
- Critical table access.

**Acceptance criteria:**

- `/ready` returns machine-readable status.
- `/ready` does not leak secrets.

### P2.3 Durable Backend Job And Status Model

**Objective:** Support async work honestly.

**Needed for:**

- Wiki ingestion.
- Background reflection save.
- Batch memory work.
- Long-running review generation.

**Acceptance criteria:**

- Async tasks have status, failure reason, retry policy, and user-visible result.

### P2.4 Backend Log Redaction

**Objective:** Reduce privacy risk.

**Rules:**

- Do not log raw capture text.
- Do not log raw reflection text.
- Do not log raw memory body.
- Use request IDs, event names, durations, status, and coarse metadata.

**Acceptance criteria:**

- Logs are useful for debugging without exposing private content.

### P2.5 Lint Warning Debt

**Objective:** Reduce technical noise without hiding product changes.

**Known areas:**

- Wiki.
- Mind Map.
- Existing `any` usage.
- React hook/compiler warnings.

**Implementation steps:**

1. Do not mix broad lint cleanup into P0 feature PRs.
2. Tackle one area per cleanup PR.
3. Prefer real risk reduction over cosmetic churn.

**Acceptance criteria:**

- Warning count trends down.
- No risky behavior changes are hidden inside lint cleanup.

### P2.6 Decide Fate Of Advanced Features

**Objective:** Stop carrying features by inertia.

**Features to evaluate:**

- Wiki.
- Mind Map.
- Analytics.
- Export.
- Model hubs.
- Relay.

**Decision options:**

- Keep in Advanced.
- Promote into the core loop.
- Hide behind a feature flag.
- Delete after migration/export.

**Evidence needed:**

- 30-day dogfood usage.
- Support burden.
- Whether the feature helps `Capture -> Reflect -> Save -> Review`.

**Acceptance criteria:**

- Each surface has a clear product role or is removed from active packaging.

### P2.7 Dogfood Reporting

**Objective:** Make product decisions from evidence.

**Metrics:**

- Core loop completions.
- Reflection requests by mode.
- Durable objects saved.
- Insights saved.
- Decisions saved.
- Follow-ups opened.
- Follow-ups completed.
- Review opens.
- Saved-context search usage.
- Save failure rate.

**Acceptance criteria:**

- A 30-day report can answer whether Open Brain is becoming a daily loop.
- Metrics contain no raw private content.

### P2.8 Mobile Visual QA Process

**Objective:** Make mobile review repeatable.

**Checklist:**

- Drawer.
- Header/title.
- Advanced cards.
- Confirmation dialog.
- Capture composer.
- Reflection panel.
- Durable save controls.
- Review dashboard.

**Acceptance criteria:**

- Mobile is manually checked before each product-shell release.
- Screenshots or notes are attached to PRs when the app is auth-gated.

### P2.9 Tighten Packaging And Narrative

**Objective:** Stop presenting Open Brain as a pile of features.

**Narrative:**

```text
Capture what is on your mind.
Reflect with the right job mode.
Save only what matters.
Review what you are carrying.
```

**Acceptance criteria:**

- Default path speaks the core loop.
- Advanced path is clearly secondary.
- Copy does not overpromise unavailable backend features.

### P2.10 Revisit Telegram And MCP Roles

**Objective:** Avoid chasing cross-surface parity prematurely.

**Decision questions:**

- Is Telegram only capture?
- Is web the reflection and review surface?
- Is MCP only automation/admin?
- Which surface owns durable save?

**Acceptance criteria:**

- Each surface has a role.
- Web loop proves itself before parity work begins.

## 9. Separate `ai-brain` Production Ops Track

The `ai-brain` production ops track has no known active P0 blocker as of this plan. Keep it separate from Phase 20 web reset work unless the user explicitly asks to combine them.

### Ops P1.1 Observe Transcript Cooldown And Retry Window

**Objective:** Confirm the worker continues to respect cooldown and does not create retry storms.

**Implementation steps:**

1. Check production transcript job states.
2. Check provider cooldown row.
3. Inspect latest transcript attempts.
4. Inspect latest `transcript.provider` events.
5. Confirm jobs remain retryable and bounded.

**Acceptance criteria:**

- Cooldown is respected.
- Jobs do not thrash.
- Failures remain attributable to YouTube anti-bot behavior.

### Ops P1.2 Consider Scheduled Daily Dry-Run

**Objective:** Add a non-mutating production visibility path.

**Allowed command shape:**

```bash
cd /opt/brain && node scripts/backfill-youtube-transcripts-prod.mjs --limit=25
```

**Rules:**

- Dry-run only.
- No `--run`.
- No `--ignore-cooldown`.
- Install only through an explicit deploy/ops step.

**Acceptance criteria:**

- Summary logs are visible.
- Rollback is simple.
- No production data is mutated.

### Ops P1.3 Review The 5 Retryable YouTube Items

**Objective:** Decide whether any important item needs manual transcript/notes recovery.

**Implementation steps:**

1. List the 5 retryable items.
2. Identify which are important.
3. Decide whether to paste manual notes/transcript for any of them.
4. Do not delete the smoke item unless explicitly asked.

**Acceptance criteria:**

- Each retryable item has an owner decision:
  - wait;
  - manual notes;
  - ignore;
  - future fallback.

### Ops P1.4 Plan Transcript Provider Fallback

**Objective:** Improve transcript success now that operations are safe.

**Candidate fallback paths:**

1. Alternate YouTube client/provider contexts.
2. Optional operator-only `yt-dlp` fallback.
3. Browser-authorized transcript capture.
4. ASR/audio transcription fallback.

**Rules:**

- Do this as a separate research and implementation plan.
- Do not add scraping, ASR, or new heavy dependencies casually.
- Consider privacy, cost, reliability, and operational burden.

### Ops P2.1 Build Operator Transcript Page

**Objective:** Make transcript state visible without SSH.

**Potential route:**

- `/ops/transcripts`
- `/admin/transcripts`

**Show:**

- Provider cooldown.
- Job counts.
- Latest attempts.
- Recent backfill summaries.
- Links to Review focused items.

**Initial actions:**

- Dry-run preview only.
- Per-job retry/ignore only if established backend actions already exist.

### Ops P2.2 Local Cleanup

**Items:**

- Decide whether to keep or delete smoke item `5f6eb5f8239c851f47c8476c`.
- Clean old untracked review artifact only if requested.
- Consider surfacing scheduled dry-run summaries in UI.

## 10. Cross-Cutting Validation

### Required Checks Per Code PR

```bash
npm test
npm run build
npm run lint
npm audit --audit-level=moderate
git diff --check
```

Use narrower targeted tests during development, but run the full required checks before pushing or requesting review.

### Required Manual Checks For UI PRs

- Authenticated desktop walkthrough.
- Authenticated mobile walkthrough.
- Empty states.
- Loading states.
- Error states.
- Retry states.
- Refresh after save where persistence is involved.
- Advanced navigation still reachable.

### Required Backend Checks Before Save And Review

- Non-OK responses.
- Auth failure.
- Metadata persistence.
- User scoping.
- Empty result behavior.
- Unsupported field behavior.
- Retrieval after save.

## 11. Definition Of Done For Phase 20 Core Reset

Phase 20 is not done until all are true:

- User can capture text.
- User can reflect using Coach me, Challenge me, Summarize, or Plan next step.
- User can save a reflection as Insight, Decision, or Follow-up.
- User can choose Do not save.
- User can return to Review and see saved items.
- Open follow-ups are visible.
- Failure states are honest and recoverable.
- Provider/model complexity is not on the default path.
- Advanced tools are still reachable.
- Backend compatibility gaps are documented.
- Tests cover the main loop.

## 12. Open Decisions

1. Does the live `POST /memory` route preserve arbitrary metadata or only known fields?
2. Does `GET /memories` expose enough metadata to build Review accurately?
3. Is there a canonical backend repo/folder for the deployed Supabase function?
4. Should draft capture text survive browser refresh, or only network failure?
5. Should "Do not save" leave a local ephemeral trace in the session or simply clear the active reflection?
6. What is the minimum dogfood period before demoting or deleting Advanced features?
7. Should weekly review be compatibility-backed or wait for a real `/review/weekly` endpoint?
8. What is the right transcript fallback strategy for YouTube anti-bot failures?

## 13. Immediate Next Move

1. Complete authenticated PR #3 review in Vercel.
2. Merge PR #3 if Capture feels right.
3. Branch from updated `origin/main`:

   ```bash
   git fetch origin --prune
   git switch -c codex/phase20-backend-contract-spike origin/main
   ```

4. Create the backend save-contract spike doc.
5. Do not build Durable Save until the contract doc answers the P0.2 questions.
