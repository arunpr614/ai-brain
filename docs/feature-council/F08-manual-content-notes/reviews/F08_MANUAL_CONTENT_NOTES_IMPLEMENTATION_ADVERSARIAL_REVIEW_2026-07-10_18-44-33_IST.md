# F08 Manual Content Notes Implementation - Adversarial Review

**Created:** 2026-07-10 18:44:33 IST  
**Reviewer stance:** Brutally honest adversarial review  
**Reviewed target:** Current uncommitted F08 implementation on `codex/manual-content-notes`, its v2 acceptance package, interactive evidence, full local test/build output, and the content-free production database rehearsal  
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/docs/feature-council/F08-manual-content-notes/reviews/F08_MANUAL_CONTENT_NOTES_IMPLEMENTATION_ADVERSARIAL_REVIEW_2026-07-10_18-44-33_IST.md`

## Executive Verdict

**NO-GO for production enablement.** The editor and repository work create the promised capability, and 779 tests plus the production build pass, but the passing suite misses three release-blocking data-integrity/no-loss failures and several high-risk races. The production snapshot rehearsal was valuable precisely because it disproved the assumption that green fixtures were enough: it found 44 orphan vector rows and two stale queue rows, and the first repair attempt did not converge. The release can move to conditional GO only after every P0/P1 below is fixed and covered by focused regression tests, followed by a fresh full gate and snapshot rehearsal.

## Evidence Inspected

- V2 PRD, technical plan, UX package, decision log, review disposition, and their acceptance gates.
- Current tracked diff and every new F08 route, repository, worker, migration, editor, search, retrieval, Related, vector-audit, repair, and deploy artifact.
- Interactive desktop/mobile screenshots and observed conflict, autosave, exact-search, preview-safety, and 320 px overflow checks.
- Local release output: 779 tests in 92 suites, lint, typecheck, production build, dependency audit, and diff check.
- WAL-safe production snapshot rehearsal: 122 items, 0 mapped chunks, 44 orphan vectors, two stale item-queue foreign keys; no note content was inspected or recorded.
- Direct transactional migration probe showing migration 023 keeps the chunk but silently removes its bridge row when run through the real migration transaction shape.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Migration 023 silently destroys valid chunk-to-vector mappings under the real runner

**Evidence:** `src/db/client.ts` lines 100-111 runs every SQL file inside a transaction. `src/db/migrations/023_source_aware_chunks.sql` lines 7 and 78 tries to toggle `PRAGMA foreign_keys` inside that transaction, where SQLite ignores the toggle. A direct runner-shaped probe with one valid chunk/bridge/vector completed without throwing but changed bridge count from one to zero while retaining the chunk and vector. The existing migration test at `src/db/migrations/023_source_aware_chunks.test.ts` lines 40-45 executes the SQL without the runner transaction, so it tests a different behavior.  
**Why it matters:** Existing semantic mappings can be silently converted into orphan vectors during startup. This is corruption, not a cosmetic rollout issue.  
**Failure mode:** Any database with mapped chunks applies 023; dropping the old `chunks` table cascades through `chunks_rowid`; the copied chunk survives but the bridge does not.  
**Recommendation:** Make the runner honor an explicit foreign-key-off migration directive before beginning the transaction, always restore foreign keys afterward, and add a runner-shaped populated migration test that proves chunk, bridge, vector, rowid, and foreign-key integrity survive.

#### 2. Normal item deletion recreates the same orphan-vector class observed in production

**Evidence:** `src/db/items.ts` lines 278-282 deletes artifacts and then the item. Cascades remove `chunks` and `chunks_rowid`, but the vec0 virtual table is not a foreign-key child. `src/db/chunks.ts` lines 122-158 already contains the required explicit vec-first cleanup, but `deleteItem` does not call it. The production snapshot contains 44 vectors with no bridge, consistent with this failure class. The item-delete path also bypasses `deleteItemNote`, so library-thread assistant messages citing a deleted manual note are not purged.  
**Why it matters:** Every item deletion can leak an unreachable embedding row, makes the vector allocator/audit unsafe again, and can retain text derived from a private note in chat.  
**Failure mode:** Delete an indexed item; cascades erase ownership metadata while its vector remains. Delete an item with a note-derived answer in a library-scoped thread; the answer persists.  
**Recommendation:** Put vector cleanup, note-derived chat cleanup, and item deletion in the canonical item-delete transaction and add single/bulk/item-with-note regression tests.

#### 3. A delayed idempotent replay can falsely acknowledge text that is no longer saved

**Evidence:** `src/db/item-notes.ts` lines 130-151 verifies the mutation receipt but always returns the *current* snapshot. The receipt stores `accepted_generation` but replay does not compare it with current epoch/generation. The editor at `src/components/manual-note-editor.tsx` lines 410-428 treats a response for the matching mutation ID as acknowledgement and shows Saved.  
**Why it matters:** This violates the central no-silent-loss promise.  
**Failure mode:** Tab A save is accepted but its response is lost; Tab B saves a newer generation; Tab A retries the exact mutation ID; the server returns Tab B's current snapshot as a successful replay; Tab A marks its own different draft Saved.  
**Recommendation:** Replay success is valid only while the canonical epoch/generation still equals the receipt's accepted state. Otherwise return an explicit conflict with the current snapshot and retain the local draft. Add the three-step delayed-replay regression.

### P1 - High Risk

#### 1. A stale purge worker can delete a newer completed index

**Evidence:** `src/lib/queue/note-index-worker.ts` lines 216-227 deletes all manual-note chunks before proving the claimed purge row is still owned/current. Index commits have an ownership predicate at lines 273-320; purge does not.  
**Why it matters:** Multi-process or lease-reset concurrency can leave a current opted-in note with no vector and a `done` job.  
**Failure mode:** Worker A claims purge; a save replaces the queue row; Worker B indexes the new generation; Worker A resumes and deletes Worker B's chunks, while its stale completion update simply affects zero rows.  
**Recommendation:** Make purge ownership-check, deletion, and completion one transaction; stale purge must be a no-op. Add the interleaving test.

#### 2. Queued Save/Clear/Recreate intent collapses to a default autosave

**Evidence:** `src/components/manual-note-editor.tsx` lines 360-363 records only a boolean when a save is already in flight, and lines 447-450 always drains it as `saveRef.current(false)` with operation `save`.  
**Why it matters:** Manual Save can lose its revision checkpoint, and Clear can lose its required pre-clear checkpoint.  
**Failure mode:** Press Clear or manual Save while autosave is in flight; the newest text reaches the server later as an ordinary autosave.  
**Recommendation:** Queue the latest operation and preserve explicit-manual intent, then drain those exact arguments. Add deterministic in-flight manual-save and clear tests.

#### 3. Note deletion can race with an in-flight Ask completion and re-persist derived text

**Evidence:** `src/app/api/ask/route.ts` lines 122-154 captures citations and later persists the generated answer without rechecking note eligibility. `deleteItemNote` purges existing cited answers, but a stream that completes afterward can insert a new answer derived from the deleted note.  
**Why it matters:** Delete can report completion and then silently reintroduce private note-derived content.  
**Failure mode:** Start Ask using a note, delete the note before stream completion, then `onComplete` persists the answer.  
**Recommendation:** Recheck the exact cited manual-note epoch/generation immediately before persistence; if any became ineligible/deleted, do not persist the assistant answer. Add the delete-during-stream test.

#### 4. Worker rollout checks do not match the v2 three-flag safety contract

**Evidence:** The v2 plan requires UI, write, and worker flags before claim/provider/commit. `src/lib/queue/note-index-worker.ts` checks only `MANUAL_NOTES_WORKER_ENABLED` at lines 56-59, 75-79, 92-94, 210-213, 260-274.  
**Why it matters:** A one-flag configuration mistake can send queued private note text even while the product surface and writes are intentionally disabled.  
**Failure mode:** Operator enables only the worker flag; existing queued notes are claimed and transmitted.  
**Recommendation:** Centralize a semantic-processing gate requiring all three flags and test each single-flag/mixed-flag state before claim, provider call, and commit.

#### 5. Provider consent can describe a different destination/model from the one receiving note text

**Evidence:** `src/lib/notes/provider-policy.ts` lines 18-50 treats every `ollama` configuration as local and omits `OLLAMA_HOST` from the fingerprint. The actual providers send to `OLLAMA_HOST` (`src/lib/embed/ollama-provider.ts` lines 8-34 and `src/lib/llm/ollama.ts` lines 53-91). Policy defaults also omit `OLLAMA_EMBED_MODEL`, `OLLAMA_DEFAULT_MODEL`, and Anthropic's `LLM_ENRICH_MODEL` fallback, so the consent fingerprint can differ from the actual model.  
**Why it matters:** A remotely hosted Ollama endpoint can receive note text with no named acknowledgement, and model changes can reuse an inaccurate consent identity.  
**Failure mode:** Set `OLLAMA_HOST` to a non-loopback endpoint; policy labels it Local Ollama and auto-approves it.  
**Recommendation:** Classify loopback by parsed endpoint, treat every non-loopback/invalid endpoint as remote, include normalized destination and the exact effective model in the fingerprint, and add endpoint/default-model tests.

#### 6. Consent reapproval does not restore semantic indexing

**Evidence:** `src/lib/notes/provider-policy.ts` lines 114-129 queues purges on revocation, but the approval path queues no reindex after all required providers become eligible. `include_in_ai` remains true.  
**Why it matters:** The UI can say a note is included while its semantic artifacts remain absent indefinitely.  
**Failure mode:** Revoke provider permission, let purge complete, then approve again; no note job is created.  
**Recommendation:** When approval makes the complete current provider policy eligible, enqueue current opted-in notes for indexing; test partial and final approval.

### P2 - Medium Risk

#### 1. The most important client save-state races are validated interactively, not deterministically

**Evidence:** Browser evidence covers basic autosave and two-tab conflict, but there is no component/state-machine test for edit-during-flight, lost response/retry, manual-save-during-flight, clear-during-flight, reload, or late response. The queued-intent bug survived 779 passing tests.  
**Why it matters:** Timing regressions can return without a reliable release gate.  
**Recommendation:** Extract the save queue transition logic into a small testable module or add a controlled component test harness with deferred fetches and fake timers.

#### 2. Retention and revision contracts contain minor inconsistencies

**Evidence:** Migration 022 permits revision kind `conflict`, and the technical plan says a conflict-server checkpoint is exposed, but no implementation writes one. Mutation receipts are pruned only when another mutation occurs, so a deleted/dormant note can retain sub-seven-day receipts indefinitely.  
**Why it matters:** Operator/user documentation can overstate cleanup precision.  
**Recommendation:** Remove the unused conflict checkpoint claim or implement it truthfully; document event-driven receipt pruning or add maintenance pruning.

### P3 - Low Risk Or Polish

#### 1. GFM table preview replacement can produce invalid nested table markup

**Evidence:** `src/components/manual-note-editor.tsx` lines 917-926 replaces only the `table` root with a `div` while retaining table-specific descendants.  
**Why it matters:** Browser correction can make table-shaped Markdown inconsistent across engines.  
**Recommendation:** Either render safe tables normally or replace the complete table subtree with plain text through an AST transform.

## What The Original Plan Or Work Gets Wrong

The v2 package correctly names most invariants, but implementation confidence leaned too heavily on isolated fixtures and direct SQL tests. The migration test did not reproduce the actual runner transaction. The cleanup plan assumed item deletion used the new explicit vector path, but the canonical `deleteItem` path remained unchanged. The no-loss model specified exact mutation envelopes but did not define what a replay means after later generations. Finally, worker and provider-policy implementations were close to the prose contract without being equivalent to it.

## Missing Validation

- Real-runner migration 023 with a populated chunk/bridge/vector set.
- Canonical single and bulk item deletion with original/manual vectors and library-thread citations.
- Delayed replay after an intervening generation.
- Stale purge versus newer index interleaving.
- In-flight autosave followed by manual Save, Clear, and newer edits.
- Delete/opt-out during Ask generation before persistence.
- Every rollout flag combination at claim/call/commit.
- Non-loopback Ollama, invalid endpoint, and effective-model fingerprint cases.
- Consent revoke/purge/reapprove/reindex lifecycle.

## Revised Recommendations

Fix P0/P1 in small, independently tested changes. Then run the focused adversarial cases, the full 779+ suite, lint, typecheck, production build, dependency audit, and a fresh production-snapshot migration/audit/repair rehearsal. Only after the post-rehearsal audit is safe should the branch be committed/pushed and the production flags staged.

## Go / No-Go Recommendation

**NO-GO now. Conditional GO after all P0 and P1 findings are closed with executable regression evidence and the content-free production rehearsal again reaches integrity OK, zero foreign-key violations, zero vector anomalies, and a safe allocator.**

## Plan Revision Inputs

### Required Deletions

- Delete the assumption that direct execution of migration SQL proves runner safety.
- Delete the assumption that foreign-key cascades clean vec0.
- Delete the assumption that matching mutation ID alone makes any later replay safe to acknowledge.

### Required Additions

- Runner-level foreign-key migration directive and populated test.
- Canonical item-delete semantic/chat cleanup.
- Generation-aware replay semantics.
- Transactional purge ownership.
- Exact queued save intent.
- Pre-persistence Ask eligibility check.
- Three-flag semantic gate.
- Endpoint/effective-model provider fingerprint and reapproval reindex.

### Required Acceptance Criteria Changes

- A migration test must use the same transaction/pragma behavior as production startup.
- Delete acceptance must include the ordinary item-delete path, not only note Delete.
- Idempotency acceptance must cover an intervening accepted generation.
- Worker acceptance must include stale purge after a newer completed index.

### Required Validation Changes

- Add the focused tests listed under Missing Validation.
- Repeat the production-snapshot rehearsal from the untouched backup after fixes.
- Treat any unsafe vector/FK post-audit as a rollback, not a partial success.

### Required No-Go Gates

- Any valid bridge/vector loss during migration.
- Any item-delete-created vector orphan.
- Any false Saved acknowledgement after a delayed replay.
- Any provider call with only a subset of rollout gates or without exact destination consent.
- Any stale job that can delete/commit a newer generation.
- Any deleted-note-derived answer persisted after deletion.

## Residual Risks

Even after these fixes, browser journals and server SQLite remain cleartext to a compromised device/server account; backups delay physical erasure; already-started remote provider requests cannot be recalled; Related relevance quality is heuristic; and the release provides note-aware Related plus a future event contract, not a persisted graph product. These limitations must remain explicit in the release documentation.
