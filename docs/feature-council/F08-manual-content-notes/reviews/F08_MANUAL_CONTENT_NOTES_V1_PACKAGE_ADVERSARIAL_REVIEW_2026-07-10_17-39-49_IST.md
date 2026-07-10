# F08 Manual Content Notes v1 Package - Adversarial Review

**Created:** 2026-07-10 17:39:49 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/docs/feature-council/F08-manual-content-notes` plus repository/production evidence described below
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/docs/feature-council/F08-manual-content-notes/reviews/F08_MANUAL_CONTENT_NOTES_V1_PACKAGE_ADVERSARIAL_REVIEW_2026-07-10_17-39-49_IST.md`

## Executive Verdict

**NO-GO for implementation from the current branch and NO-GO for production.** The product object is sound, but the package still contains two direct data-integrity gaps and one unresolved production-baseline gate: local crash recovery is keyed so that sibling tabs can overwrite each other's only durable drafts; the live vec0/bridge state can collide on the first new embedding; and the branch does not yet contain the source/migrations/runtime files that production is actually running. These are not documentation niceties. Any one can lose user writing or damage production.

The package is a **conditional GO for v2 revision**. Resolve every P0 in the v2 design and in executable preflight evidence before implementation/deployment. P1 findings must be made explicit in v2 acceptance criteria rather than deferred as “implementation detail.”

## Evidence Inspected

- Formal PRD v1, UX v1, Technical v1, Product/AI/PM council, UX council, architecture council, project tracker, decision log, prototype source/screenshots, and prototype design QA under the reviewed folder.
- Supplied objective and prior standalone-note PRD/reference image.
- Worktree branch/status and `origin/main` baseline.
- Read-only production evidence: 22 applied migrations through `020_recall_sync`; 122 items; 0 `chunks`; 44 `chunks_vec`; active service since 2026-06-26.
- Candidate deployed source commit `4d97c45`, including `public/sw.js`, item UI, search route, auth proxy, embedding pipeline, chunks repository, retrieval, related items, and deploy behavior.
- Current v1 claims at PRD lines 33–55, 133–144, 146–165, 167–210, and 227–241; architecture council lines 64–75, 200–239, 306–394, 398–475, and 477–548; Technical v1 lines 25–103 and 128–205.
- Prototype desktop/mobile captures and `prototype/design-qa-comparison.png` at 1440×900 and 390×844.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. One IndexedDB row per item cannot uphold the advertised two-tab no-loss guarantee

**Evidence:** PRD v1 line 141 and architecture council lines 374–390 define the draft store as keyed by `item_id`. PRD line 155 simultaneously promises safe explicit conflict handling for “two tabs/devices.” Technical v1 line 26 scopes only the network serialization to “per item/tab.” A sibling tab writing the same IndexedDB key can replace the other tab's only crash-recovery copy before either server save wins or conflicts. BroadcastChannel notification does not preserve overwritten local content.
**Why it matters:** The feature's central promise is that no manually entered content is lost. A same-browser two-tab edit is ordinary behavior, not an exotic adversary.
**Failure mode:** Tab A writes draft A; Tab B writes draft B to the same key; the browser crashes while A still has unsaved text only in memory. On restart, only B exists locally. Server CAS never sees A, so there is no 409 or revision to recover. IndexedDB transactions can also complete in a different order unless explicitly serialized.
**Recommendation:** Key durable drafts by `(item_id, editor_instance_id)` and store a monotonically increasing local sequence or append-only bounded journal. Serialize IndexedDB writes per editor instance, record the last acknowledged server hash/version separately, and retain every dirty instance until it is acknowledged, merged, copied, or explicitly discarded. Add a forced-crash two-tab test that proves both texts remain recoverable.

#### 2. The live vector state can make the first manual-note embedding collide or preserve unknown data incorrectly

**Evidence:** The live audit reports 0 `chunks` but 44 `chunks_vec`. Candidate source `src/db/chunks.ts` lines 45–56 allocates `MAX(chunks_rowid.rowid)+1`; with an empty bridge it chooses rowid 1 even if vec0 already owns that rowid. PRD lines 207–210 and architecture lines 69–75 acknowledge this, but v1 still describes implementation before an approved, reproducible repair tool/result exists.
**Why it matters:** A collision can fail indexing after notes are enabled; a naïve cleanup can delete data whose origin is not understood. The chunk-table rebuild is also load-bearing for Ask/search/Related.
**Failure mode:** First synthetic/real note inserts bridge rowid 1, then vec0 rejects/overwrites the matching vector; or migration/repair removes 44 rows without proving they are unreachable, hiding a wider broken-index condition.
**Recommendation:** Add a versioned report-only audit command before feature code claims readiness. It must enumerate every chunk, bridge, and vec rowid; classify mapped/orphan/missing/duplicate; record hashes/counts; refuse repair without a fresh backup; delete only manifest-listed proven orphans; rerun parity/integrity; and reserve rowid allocation from the maximum of bridge **and vec0**, or introduce a durable allocator. Treat original-library reindexing as a separate explicit decision.

#### 3. The current worktree is not a deployable production continuation

**Evidence:** Architecture council lines 69–75 show `origin/main` stops before production migrations 018–020 and identifies `4d97c45` only as the *likely* source line. The deployment uses `rsync --delete`. UX v1 treats `4d97c45` as the visual baseline, but no artifact-to-commit attestation proves that all running files came from it.
**Why it matters:** Deploying the current branch can remove Recall scheduler/runtime files, collide on migrations, or regress production behavior unrelated to F08. A visual match is not a source provenance proof.
**Failure mode:** The feature passes tests against stale main, then deployment deletes working Recall scripts/configuration or starts against incompatible schema 018–020. Rollback to stale main repeats the damage.
**Recommendation:** Before feature implementation, identify the running artifact/source as strongly as the environment permits, inventory `/opt/brain` runtime/scheduler/migrations against candidate commits, merge the full deployed line into the feature branch, resolve history without discarding main, and run baseline tests/build/deploy-manifest checks. The only allowed rollback source is the integrated pre-feature production line. Any unexplained `rsync --delete` removal is a hard stop.

### P1 - High Risk

#### 1. The provenance promise contradicts the proposed schema and the existing embedding pipeline

**Evidence:** PRD principle line 33 and acceptance line 173 require Original, AI-generated, and My notes to remain technically distinct. The proposed chunks schema supports only `item|manual_note` (PRD line 140; architecture lines 219–233). Candidate `src/lib/embed/pipeline.ts` lines 72–77 concatenates title, AI summary, and original body into one indistinguishable source. Product council asks for Original versus AI summary versus My note.
**Why it matters:** A citation labeled Original can actually quote an AI-generated summary. That directly violates the trust premise and makes it impossible to tell facts from model output.
**Failure mode:** Ask attributes an AI hallucination embedded in `summary` to original source content, while the UI claims provenance everywhere.
**Recommendation:** V2 must choose one honest model: split semantic sources into at least `original_content`, `ai_summary`, and `manual_note` with independent chunks/provenance, or exclude AI summary from “original” retrieval and label the combined legacy source truthfully. Update migration, retrieval, citation, search, deletion, weighting, and tests together. Do not ship an `item` label that overclaims origin.

#### 2. `no-store` is scoped too narrowly for note-derived content

**Evidence:** PRD line 55 names no-store note APIs and line 194 bans note bodies from cached output. Note snippets will also appear in `/api/search`; note text/citations may appear in Ask streams, revision responses, conflict bodies, and explicit exports. Candidate `/api/search` has no explicit cache-control header. The service worker makes `/api/**` network-only, but that does not prohibit browser, proxy, framework, or intermediary response caching.
**Why it matters:** Private text can persist after deletion or appear across session changes even if the canonical note API is correct.
**Failure mode:** A note-only search response/snippet or Ask payload is cached outside the note endpoint and survives logout/delete/restore.
**Recommendation:** Define one response policy covering every note-bearing or note-derived surface: note, revisions/conflict, search details/snippets, Ask/citations, related diagnostics, export, and error payloads. Set `Cache-Control: private, no-store, max-age=0`, appropriate `Vary`, dynamic rendering, and service-worker exclusion; add browser/cache-storage tests and post-delete inspection.

#### 3. The package has not selected an editor while its UX and acceptance criteria depend on visual round-trip semantics

**Evidence:** UX v1 makes visual editing the default and promises lossless Write↔Markdown behavior. Architecture recommends Lexical at lines 293–304; Technical v1 calls it only a candidate and proposes a textarea fallback at lines 90–92; PRD line 229 leaves the choice open. Prototype QA explicitly says its converter is limited.
**Why it matters:** Contenteditable selection, IME, lists, paste, Markdown serialization, undo history, and Android WebView behavior are core design constraints. Choosing after implementation starts creates expensive rework and can invalidate the prototype.
**Failure mode:** Lexical round-trip drops unsupported Markdown or mobile IME input; the fallback becomes a raw textarea that no longer matches the approved visual interaction; both still claim the same acceptance criteria.
**Recommendation:** Make the compatibility spike an explicit pre-implementation gate with fixed fixtures, Android/IME/a11y/browser/bundle budgets and a decision record. If it fails, revise v2 UX to a deliberate Markdown editor + preview instead of calling it the same visual editor.

#### 4. Remote-provider use defaults on without a first-use provider-specific trust moment

**Evidence:** Architecture line 204 defaults `include_in_ai` on. PRD line 144 admits that note text may leave the server for configured embedding/Ask providers and line 230 leaves the default open. UX places the control in an overflow rather than specifying first-use disclosure.
**Why it matters:** “Private manual note” strongly implies local/confidential handling to many users. A hidden default that sends text to a remote provider is a predictable trust failure even when technically documented elsewhere.
**Failure mode:** The user's first private note is automatically embedded remotely before they encounter the toggle/provider disclosure.
**Recommendation:** V2 must define provider-aware behavior: show the configured provider by name before the first remote transmission; make local providers on by default; for remote providers require a one-time explicit acknowledgement or default off until accepted. Persist the choice, make exact search independent, and test that no remote call happens before acknowledgement/off-state cleanup.

#### 5. The worker lifecycle and single-writer guarantees are not operationally specified

**Evidence:** Technical v1 proposes `note-index-worker.ts`, quiet-period coalescing, and a feature flag, but does not state how it starts/stops, how many processes can claim, how it is supervised during deploy, how stale claims recover, or how flags prevent one old process from continuing. The current rowid allocator itself assumes a single worker (`src/db/chunks.ts` lines 45–47).
**Why it matters:** Deploy restarts and accidental multiple application instances are exactly when derived indexes corrupt or stale jobs win.
**Failure mode:** Two workers allocate the same next rowid or an old-version process continues note indexing after the flag is disabled/rollback begins.
**Recommendation:** V2 must name the worker host/lifecycle, durable claim transaction, lease/heartbeat/stale recovery, concurrency=1 invariant, shutdown behavior, flag checks before provider call and commit, and health/backlog signals. Add a dual-worker claim test even if production intends one process.

#### 6. Related/graph success is not testable with “bounded” and an unevaluated 70/30 number

**Evidence:** PRD acceptance line 189 says bounded and tested. Architecture lines 526–534 proposes 0.7/0.3 without a relevance set. Candidate Related code averages all chunks and can smear topics (`src/lib/related/index.ts` lines 4–15, 46–63). There is no persisted graph implementation; only a future hook is proposed.
**Why it matters:** The feature can technically “use” notes while making connections worse, or claim graph integration where none exists.
**Failure mode:** A long speculative note dominates the centroid and produces unrelated connections; marketing/docs imply graph nodes/edges were built even though only Related changed.
**Recommendation:** Define v1 fulfillment honestly as note-aware Related plus a tested future graph event contract. Create a small labeled evaluation fixture with expected top-k/no-regression constraints, cap per-source contribution independent of note length/chunk count, and record before/after rankings. Do not claim a shipped graph.

#### 7. Delete/toggle operations need durable tombstones across tabs and offline replay

**Evidence:** V1 describes a short delete receipt and local tombstone in the architecture, but the formal data model and tests do not fully specify how an old dirty draft in another tab/device is prevented from recreating a deleted note or re-enabling AI inclusion.
**Why it matters:** Hard delete and privacy opt-out must survive delayed retries; otherwise private text can reappear or be retransmitted.
**Failure mode:** User deletes/opts out in tab A; offline tab B reconnects with an old save mutation against a missing/current row and recreates content or queues embeddings.
**Recommendation:** Give delete and inclusion changes monotonic server versions/tombstones tied to the parent item; reject all mutations based before the tombstone unless the user explicitly restores/recreates. Broadcast changes, preserve old dirty text only for copy, and test delayed retries after delete/opt-out.

### P2 - Medium Risk

#### 1. The 200 KB cap is arbitrary and conflicts with the existing 100 KB precedent

**Evidence:** Architecture line 278 proposes 200 KB; PRD line 231 calls the cap unresolved. No measured parser, IndexedDB, network, Android keyboard, embedding cost, or prompt evidence justifies it.
**Why it matters:** The cap affects UI latency, mobile stability, revision growth, and provider cost.
**Failure mode:** A large note technically passes validation but makes visual editing/preview/serialization unreliable.
**Recommendation:** Use 100 KiB for v1 unless the editor spike proves a higher bound across physical/mobile-like tests. Display a byte-aware warning before the hard limit and guarantee copy/export of an over-limit local draft.

#### 2. Revision recovery is simultaneously P0-adjacent and P1 UX

**Evidence:** PRD scope requires bounded revisions and recovery but defers the “rich revision-history browser”; UX overflow exposes revision recovery; open questions leave the shipped surface undecided.
**Why it matters:** Retaining private snapshots with no reliable user recovery path creates liability without user value.
**Failure mode:** The system stores 30 days of content but a user cannot recover an accidental clear without operator/database intervention.
**Recommendation:** V2 should ship a minimal user-facing recent-recovery sheet for manual-save, pre-clear, restore, and timed checkpoints; defer only advanced diff/history browsing.

#### 3. “Exact search is immediate” lacks a concurrency definition

**Evidence:** FTS triggers make accepted server state immediate, but a dirty/offline local draft is intentionally not on the server. UI copy can imply that locally safe text is already globally searchable.
**Why it matters:** Users may navigate away expecting a phrase to be findable while it exists only in a device draft.
**Failure mode:** Search misses text while the editor says “Saved locally,” creating a trust ambiguity.
**Recommendation:** State that library search reflects the latest **server-accepted** version; local-only draft search is out of scope. Keep status copy distinct and add an offline search expectation test.

#### 4. Export/share scope must be grounded in the actual routes after production-line merge

**Evidence:** Product council identifies item Markdown and library ZIP export paths, but formal v1 uses generic export/share language and implementation paths are deferred to “integrated production source.”
**Why it matters:** One overlooked export is enough to leak private notes or create inconsistent portability.
**Failure mode:** Item export excludes notes while library export silently includes them, or vice versa.
**Recommendation:** After merge, enumerate every current export/share/backup route and put each in a policy matrix: default, explicit option, provenance format, cache header, and test.

### P3 - Low Risk Or Polish

#### 1. User-facing terminology is not fully normalized

**Evidence:** Artifacts alternate among `My notes`, `Manual notes`, `Manual note`, `Notes`, and `Private manual note`.
**Why it matters:** Search badges, tabs, citations, settings, and docs can feel like different objects.
**Failure mode:** Users wonder whether “Manual note” search hits are the same as the “Notes” tab.
**Recommendation:** Use `My notes` for the desktop section, `Notes` only where mobile space requires, `Your note` in citations, and `manual_note` only internally. Record the exact copy matrix in v2.

#### 2. The prototype's passing result can be mistaken for production readiness

**Evidence:** `prototype/design-qa.md` says passed, while also stating persistence, authentication, search, and production Markdown parsing are not implemented.
**Why it matters:** A green visual QA label can create false release confidence.
**Failure mode:** Reviewers assume save/offline/conflict behavior was end-to-end rather than simulated.
**Recommendation:** Label it “prototype visual/interaction QA: passed; production behavior: untested” in the v2 package and require separate implementation design QA.

## What The Original Plan Or Work Gets Wrong

- It treats one IndexedDB row as a “write-ahead” guarantee while also promising safe simultaneous tabs. That storage shape cannot preserve both unacknowledged drafts.
- It says provenance everywhere but proposes a schema that cannot distinguish existing original body from AI summary because the current pipeline concatenates them.
- It calls `4d97c45` the production design truth while the architecture correctly says the deployed commit remains an inference. The terminology is stronger than the evidence.
- It scopes cache protection around the note API even though search, Ask, conflict, revisions, export, and diagnostics can also carry note text.
- It leaves the editor choice open after approving UX/acceptance criteria that depend on a particular class of editor behavior.
- It treats a future graph hook as sufficient without clearly limiting the shipped claim to Related behavior.

## Missing Validation

- Crash after interleaved two-tab IndexedDB writes, proving both dirty drafts survive.
- Cross-tab delete/opt-out followed by delayed offline save/retry.
- IndexedDB write reordering, transaction abort, quota, private-browsing denial, and corrupted-record recovery.
- Every note-bearing response/cache surface inspected before and after delete/logout.
- Split-provenance fixtures proving an AI summary sentence is never labeled Original.
- Worker dual-claim, deploy shutdown, flag-off mid-provider-call, stale lease, and old-version commit tests.
- Production artifact/source inventory and rsync deletion manifest attestation.
- Vector audit/repair dry run on a fresh production snapshot copy with rowid-level manifest.
- Physical or equivalent Capacitor WebView editor spike for IME, paste, selection, keyboard, background/foreground, bundle, and memory.
- Related relevance fixture with pre/post rankings and a note-length adversary.
- Export/share route matrix after deployed-source merge.

## Revised Recommendations

1. Make P0-1 local multi-draft durability, P0-2 vector integrity, and P0-3 production source reconciliation the first v2 gates.
2. Change semantic provenance to three honest sources or stop claiming AI summary/original separation in retrieval.
3. Apply private/no-store policy to every note-bearing response, not just note CRUD.
4. Decide the editor through a time-boxed compatibility spike before code architecture hardens.
5. Require first-use provider disclosure/acknowledgement before remote note transmission.
6. Specify the worker as a supervised, leased, concurrency-one process with pre-call/pre-commit flag/version checks.
7. Ship a minimal revision recovery surface and durable delete/opt-out tombstone behavior.
8. Define shipped “connections” as evaluated Related integration; do not claim a graph until a graph exists.
9. Set the v1 cap to 100 KiB unless measurements justify more.

## Go / No-Go Recommendation

**NO-GO** to implementing from the current stale-main-derived branch, applying migrations, enabling note indexing, or deploying.
**Conditional GO** to produce v2 and then implement only after the deployed source line is integrated and baseline checks pass.
**NO-GO** to production until every P0 is closed with evidence, every P1 has an accepted v2 disposition and test, and the synthetic create/edit/search/Ask/Related/opt-out/delete/cleanup flow passes on a production snapshot copy and then live production behind flags.

## Plan Revision Inputs

### Required Deletions

- Delete the assumption that a drafts store keyed only by item is a no-loss write-ahead design.
- Delete any claim that current `item` chunks provide Original-versus-AI-summary provenance.
- Delete wording that treats `4d97c45` as positively identified live source; call it the candidate until attested.
- Delete a generic “graph integration shipped” implication; retain only Related integration and future graph contract.
- Delete the unmeasured 200 KB commitment.

### Required Additions

- Multi-instance local draft model/journal and server tombstones for delete/privacy changes.
- Rowid audit/repair command and allocator safe against vec0 rows absent from the bridge.
- Full note-bearing response/cache matrix.
- Three-source provenance decision.
- Editor selection spike/decision record.
- Provider-specific first-use disclosure/acknowledgement.
- Worker lifecycle/lease/flag/shutdown contract.
- Route-level export/share matrix and minimal revision recovery UI.

### Required Acceptance Criteria Changes

- Both dirty texts survive a forced crash in two tabs editing the same item.
- A delayed pre-delete/pre-opt-out mutation cannot recreate/retransmit content without explicit user restoration.
- A sentence originating only in AI summary is never cited/labeled as Original.
- No note-bearing response exists in browser Cache Storage/HTTP cache after logout/delete.
- First new vector allocation succeeds only after a zero-unclassified-row audit.
- The actual production artifact inventory has no unexplained deletion/regression after deploy dry-run.
- Rich editor acceptance applies only after the selected editor passes the fixed spike matrix.
- Related ranking meets labeled fixture thresholds and is stable against note length.

### Required Validation Changes

- Add two-tab crash/journal and tombstone race suites.
- Add production-snapshot vector audit/repair and chunk-rowid parity reports.
- Add cache/storage inspection for note, revisions, search, Ask, Related diagnostics, and exports.
- Add split-source retrieval/citation fixtures.
- Add dual-worker/stale-worker/flag-off tests.
- Add provider call spies proving no transmission before permission/off-state.
- Add physical/equivalent Android editor and backgrounding checks.

### Required No-Go Gates

- Unidentified/unintegrated production source or unexplained rsync deletion.
- Any unclassified vec0 row or failed rowid/integrity parity.
- One-key local draft model or a failed two-tab crash test.
- Forged/expired session or cross-origin mutation access.
- Note body/snippet/citation found in an unauthorized cache/log/export.
- Ambiguous source citation.
- Remote provider call before disclosure/permission or after opt-out.
- Stale worker/index version replacing current note state.
- Existing mobile item capability removed or inaccessible.
- Cleanup manifest mismatch.

## Residual Risks

Even after these changes, browser-profile storage and local/server SQLite remain cleartext to a compromised device/server account; retained backups delay physical deletion; external AI providers remain processors when explicitly enabled; a single-user SQLite app still lacks true row-level multi-user isolation; and semantic Related quality will require ongoing evaluation as the library grows. These risks must be documented honestly rather than described as solved by the note feature.
