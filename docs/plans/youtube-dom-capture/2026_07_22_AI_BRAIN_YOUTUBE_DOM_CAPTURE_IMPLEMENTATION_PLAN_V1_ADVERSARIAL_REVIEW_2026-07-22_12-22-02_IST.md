# AI Brain YouTube DOM Capture Implementation Plan V1 - Adversarial Review

**Created:** 2026-07-22 12:22:02 IST<br>
**Reviewer stance:** Brutally honest adversarial review<br>
**Reviewed target:** `2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v1.md`<br>
**Report path:** `docs/plans/youtube-dom-capture/2026_07_22_AI_BRAIN_YOUTUBE_DOM_CAPTURE_IMPLEMENTATION_PLAN_V1_ADVERSARIAL_REVIEW_2026-07-22_12-22-02_IST.md`<br>

## Executive Verdict

No-go for implementation from plan V1. The file map and staged rollout are actionable, but the plan's core extraction proof is unsound, its route reuses permissive shared security helpers, its transaction ignores an in-flight recovery writer, and its migration/rollback path can strand the previous release. These are P0 design defects. Fixture UI work is the only unblocked execution surface.

## Evidence Inspected

- Implementation plan V1, lines 10-225, 227-526, 528-828.
- Source PRD V1, lines 25-31, 168-309, 345-409.
- Current extension manifest, popup, capture helper, service worker, and package scripts.
- `src/lib/capture/policy.ts` and policy tests.
- `src/lib/auth/bearer.ts` and `src/lib/auth/api-version.ts`.
- `src/app/api/capture/url/route.ts` and `src/app/api/capture/transcript/route.ts`.
- `src/lib/queue/transcript-worker.ts` and `src/db/transcript-jobs.ts`.
- `src/db/transcripts.ts`, migrations 018/019/025, and migration runner.
- `src/db/item-notes.ts` and note AI default policy.
- `src/lib/repair/item-repair.ts` and enrichment workers.
- `scripts/activate-release.sh`, lines 270-295.
- Completed repository research reports and fixture limits.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. The extractor can silently omit valid transcript content

**Evidence:** The algorithm globally keys cues by start time plus text, counts unique keys, sorts the result, and calls stable counts at bottom success (lines 198-225). The PRD promises support for repeated timestamp/dialogue turns.<br>
**Why it matters:** Global deduplication destroys positional evidence; sorting hides traversal gaps. Neither stable scroll height nor stable key count proves a virtualized list was traversed continuously.<br>
**Failure mode:** Repeated cue text disappears, recycled DOM nodes create a false stable set, or a skipped viewport still reaches bottom and reports success.<br>
**Recommendation:** Use ordered viewport snapshots and longest suffix/prefix overlap. Move by less than one viewport; reject zero overlap, non-advancing scroll, container/renderer change, or cap. Preserve repetition and order. Do not sort. Start at logical top, require physical bottom plus three mutation-quiet identical terminal snapshots, and restore original scroll position in `finally`.

#### 2. The dedicated route is not actually bound to the intended extension

**Evidence:** Line 276 calls for common bearer/origin/API validation. Current `validateOrigin()` accepts missing origin and every extension ID; `checkClientApiVersion()` accepts a missing header. The request also sends a classification header that is explicitly not authentication.<br>
**Why it matters:** The plan's trust-boundary diagram overstates caller identity.<br>
**Failure mode:** Any bearer holder or another extension can call the route while appearing to be the companion.<br>
**Recommendation:** Add route-specific guards: bearer header required, session-cookie auth ignored/rejected, present origin equals one manifest-authorized extension ID, mandatory `x-brain-youtube-capture-contract: 1`, strict JSON, and a hard streamed 2 MiB reader even without `Content-Length`. Apply the same exact-origin policy to link-only fallback.

#### 3. The transaction cannot stop a stale recovery worker overwrite

**Evidence:** The proposed transaction order (lines 479-496) never reads or resolves `transcript_jobs`. The current worker fetches at lines 226-229 and later upgrades at lines 239-261 without compare-and-set.<br>
**Why it matters:** Atomic insert of browser rows does not protect against another writer that already passed its eligibility check.<br>
**Failure mode:** Provider recovery starts before browser confirmation, then overwrites browser content after commit.<br>
**Recommendation:** Extend migration/service/worker together. Browser capture resolves the matching job in its transaction. Worker apply performs one transactional CAS over job ID, claim/attempt identity, `state='running'`, and weak-item eligibility; zero updated rows discards the stale result. Test both race orders with deterministic barriers.

#### 4. Persistence atomicity omits the downstream processing boundary

**Evidence:** The architecture routes the commit directly to pending enrichment (line 70). Persistence resets chunks/vectors/tags/topics/jobs (lines 491-495), but the private manifest has only rights and retention fields (lines 406-429). Note AI policy is still an open question (line 823).<br>
**Why it matters:** A valid local-retention approval can cause unauthorized external model processing.<br>
**Failure mode:** Committed transcript or optional note is picked up by enrichment immediately after the transaction.<br>
**Recommendation:** Add `downstream_processing: disabled|local_only|approved_providers` and provider allowlist to the private manifest. Persist an explicit processing hold in the same transaction; release only when authorized. Force optional note `include_in_ai=0`; conflict on a differing existing note.

#### 5. Migration 026 has no usable previous-binary rollback contract

**Evidence:** The deployment section says to roll back the app while keeping the migration (lines 737-742). `activate-release.sh` rejects migrations absent from the target release, with a one-off exception only for migration 025 (lines 270-295).<br>
**Why it matters:** The documented rollback command can fail precisely during an incident.<br>
**Failure mode:** Version 026 is applied, feature fails, and activation of the previous binary is rejected as `migration_incompatible`.<br>
**Recommendation:** Prefer feature-disable on a forward-compatible release as normal rollback. Before deployment, add and test explicit 026 compatibility in release tooling or prove the prior release can boot against 026. Do not claim binary rollback until rehearsal passes.

### P1 - High Risk

#### 1. Request fields give the client authority it does not need

**Evidence:** The request accepts `caption_source_class`, normalized count, text hash, duration, end time, and timestamp mode (lines 278-324), then compares client hash to server hash.<br>
**Why it matters:** Redundant values expand mismatch cases and encourage accidental trust in client assertions. DOM schema V1 cannot prove cue durations or caption class.<br>
**Failure mode:** Minor normalization drift becomes `hash_mismatch`, or implementation starts trusting client class/duration to avoid failures.<br>
**Recommendation:** Send only ordered `{idx,start_ms,text}` cues plus visible/evidence fields. Use `duration_ms=null` in storage, server-owned `caption_source_class='unknown'`, and server-computed normalized text, text hash, request hash, and timestamp mode.

#### 2. Identity pinning is too weak for YouTube SPA behavior

**Evidence:** Popup rules check tab ID, URL, and video ID (lines 182-190); extraction only rechecks canonical video ID at the end (lines 198-210).<br>
**Why it matters:** YouTube can replace the document, panel, renderer, or selected track without changing the tab ID at the moment an old result is returned.<br>
**Failure mode:** Cues from one panel/track are associated with another review.<br>
**Recommendation:** Pin tab ID, top frame, start URL, video ID, route kind, document identity, panel node, renderer family, and selected-track evidence. Recheck on every iteration and immediately before confirm; any replacement invalidates review.

#### 3. The plan repeats unratified limits

**Evidence:** Lines 212-225 specify 12 seconds and 240 scrolls while explicitly admitting V1 must reconcile them. Research specifies 15 seconds and 150 scrolls.<br>
**Why it matters:** Implementation phases reference limits before the contract is decided.<br>
**Failure mode:** Tests and client/server code ship different caps.<br>
**Recommendation:** V2 defines one shared constants module and exact boundary tests for 15 seconds, 150 scrolls, 7,200 segments, 500,000 normalized characters, 2 MiB, 2,000 characters per cue, and three stable checks.

#### 4. The manifest cannot express the actual approved execution

**Evidence:** The manifest example omits run ID, extension IDs, extractor versions, processing scope/providers, lab data root, cleanup command, cleanup owner, diagnostic retention, and backup policy (lines 406-429).<br>
**Why it matters:** The server cannot machine-check several promised gates.<br>
**Failure mode:** A valid target entry is reused by an unreviewed extension build or processing configuration.<br>
**Recommendation:** Add every field above, validate mode `0600`, reject symlinks/ownership mismatch, cache only by validated content hash/expiry, and keep the real manifest ignored outside Git.

#### 5. The schema does not enforce one active transcript source

**Evidence:** Migration 026 adds request receipts but no active-source uniqueness (lines 431-458). Application conflict checks happen before insert.<br>
**Why it matters:** Concurrent new request IDs can race.<br>
**Failure mode:** Both transactions observe no source and insert active rows.<br>
**Recommendation:** Run a historical preflight, resolve existing duplicates explicitly, then add a partial unique index for one active source per item and test concurrent writers.

#### 6. Diagnostics still include a correlatable request identifier

**Evidence:** The allowlist permits request ID or fingerprint (lines 530-541), while other identifiers are forbidden.<br>
**Why it matters:** A durable per-capture identifier can correlate local events and retained records without being needed for aggregate health.<br>
**Failure mode:** Diagnostics become a content-access map when combined with request receipts.<br>
**Recommendation:** Remove request/item/source IDs and fingerprints from aggregate events. Keep detailed correlation only in a local, explicit operator diagnostic path with separate retention and access policy if later justified.

### P2 - Medium Risk

#### 1. V0.1 should not live-canary Shorts

**Evidence:** The plan leaves Shorts open (line 824) but the broader scope includes Shorts.<br>
**Why it matters:** Different DOM and navigation behavior increases the first live test surface.<br>
**Failure mode:** The initial canary validates neither route well.<br>
**Recommendation:** Keep Shorts fixture-only. Add a separate post-watch canary gate.

#### 2. The shared bearer needs a scoped replacement before production

**Evidence:** The existing token authorizes multiple client routes and the plan retains it.<br>
**Why it matters:** Exact origin narrows browser callers but does not scope a stolen token.<br>
**Failure mode:** Compromise of one client grants broader API access.<br>
**Recommendation:** Accept the shared bearer only for isolated lab V0.1; require a scoped, rotatable extension credential before any production decision.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

Plan V1 assumes that a set of unique cues is equivalent to a continuous ordered transcript, that common origin validation authenticates the companion, that one database transaction excludes all other writers, and that an immutable release can roll back across a new migration without release-tool support. All four assumptions are disproved by the inspected source.

## Missing Validation

- Longest-overlap traversal property tests, repeated-cue fixtures, zero-overlap and skipped-viewport failures.
- Document/panel/track replacement and scroll-restoration tests.
- Missing/foreign extension origin, cookie-only, missing/wrong contract version, and streaming over-limit tests.
- Deterministic recovery-worker race and concurrent source-insert tests.
- Processing hold and provider-scope tests.
- Existing-note conflict and forced AI-off tests.
- Historical active-source preflight and unique-index migration test.
- Migration 026 forward rollback rehearsal with the previous release.
- Separate lab data root, manifest file ownership/mode, cleanup, and backup-expiry tests.

## Revised Recommendations

Rewrite the plan around a server-owned contract and explicit concurrency states. Implement the pure extractor only after the ordered overlap protocol is fixed. Land policy/environment hardening, route-specific auth, recovery CAS, processing hold, and migration compatibility before allowing any retained live transcript. Keep the normal rollback as immediate server disable on the forward-compatible release.

## Go / No-Go Recommendation

- Static prototype and fixture construction: go.
- Pure extractor implementation: conditional go after algorithm V2.
- Endpoint/migration implementation: no-go until route auth, recovery CAS, processing hold, uniqueness, and rollback are specified.
- Retained live canary: no-go until all P0/P1 gates and separate lab isolation pass.
- Production: no-go.

## Plan Revision Inputs

### Required Deletions

- Global cue-key deduplication and post-extraction sorting.
- Client-authoritative hash/count/class/duration/end-time fields.
- Optional API-version semantics on this route.
- Request identifiers in aggregate diagnostics.
- Claim that a pre-026 binary is an available rollback without proof.

### Required Additions

- Ordered overlap traversal, mutation-quiet bottom proof, identity pinning, and scroll restoration.
- Exact extension-origin/bearer/contract guards and streamed size cap.
- Recovery-job transactional CAS and stale-result discard.
- Processing hold plus separately authorized provider scope.
- Forced note AI-off/conflict behavior.
- Active-source partial unique index with historical preflight.
- Complete private manifest and separate lab database/data root.
- Forward migration compatibility and feature-disable rollback rehearsal.

### Required Acceptance Criteria Changes

- Preserve every ordered repeated cue or fail.
- Store schema V1 cue duration as null; server computes all hashes and classifications.
- Same request/hash replays; same request/different payload conflicts; same content/new request duplicates; different source/note conflicts without mutation.
- A stale worker can never mutate an item after browser capture resolves its job.
- No external processing occurs without separate manifest permission.

### Required Validation Changes

- Add property, race, concurrency, strict-auth, migration-compatibility, privacy, and cleanup tests listed above.
- Pin test fixtures and selector families to an extractor version.
- Test exactly 7,200 and 7,201 cues, 500,000 and 500,001 characters, 2 MiB streamed boundary, 150/151 scrolls, and 15-second timeout.

### Required No-Go Gates

- Any route acceptance without exact extension origin, bearer, and contract version.
- Any traversal gap, mixed renderer, identity change, or un-restored scroll state.
- Any stale worker overwrite or multiple active sources.
- Any capture sent to unapproved downstream processing.
- Any unproven binary rollback claim after migration 026.

## Residual Risks

The DOM remains an unstable, unversioned upstream interface. Exact extension-origin checks are defense in depth, not a replacement for credential scope. SQLite transactions can enforce local consistency but cannot prove the observed DOM was authoritative. Production remains a separate legal, security, platform, and reliability decision.
