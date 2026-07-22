# AI Brain YouTube DOM Capture PRD V1 - Adversarial Review

**Created:** 2026-07-22 12:22:02 IST<br>
**Reviewer stance:** Brutally honest adversarial review<br>
**Reviewed target:** `2026-07-22_ai_brain_youtube_dom_capture_prd_v1.md`<br>
**Report path:** `docs/plans/youtube-dom-capture/2026_07_22_AI_BRAIN_YOUTUBE_DOM_CAPTURE_PRD_V1_ADVERSARIAL_REVIEW_2026-07-22_12-22-02_IST.md`<br>

## Executive Verdict

No-go for implementation from this PRD V1. The two-click, visible-DOM concept is coherent, but five P0 gaps leave room for silent transcript loss, an untrusted extension caller, stale server recovery overwrites, unapproved downstream AI processing, and a link-only fallback that is not actually link-only in the current product. Synthetic UX work may continue. Fixture extractor work may begin only after the V2 contract replaces the flawed global deduplication rule.

## Evidence Inspected

- PRD V1, especially lines 25-31, 41-47, 82-89, 125-193, 210-309, 345-409.
- Implementation plan V1, especially lines 198-225, 240-266, 268-404, 431-526, 650-756.
- `extension/manifest.json` and `extension/package.json`.
- `src/lib/capture/policy.ts`, lines 51-79 and 174-189.
- `src/lib/auth/bearer.ts`, lines 234-269.
- `src/lib/auth/api-version.ts`, lines 1-54.
- `src/app/api/capture/url/route.ts`, including extraction and recovery enqueue paths.
- `src/lib/queue/transcript-worker.ts`, lines 191-275.
- `src/db/transcript-jobs.ts`, lines 379-461.
- `src/db/item-notes.ts`, lines 336-435.
- `src/lib/notes/default-ai-policy.ts`.
- `scripts/activate-release.sh`, lines 270-295.
- Research report `docs/research/youtube-transcripts/2026-07-22_11-05-48_IST_ai_brain_chrome_companion_github_landscape_v1.md`.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. The completeness contract can delete real repeated cues

**Evidence:** PRD-F08 requires global deduplication by normalized timestamp and text (line 179). The matching plan keys cues globally, later sorts them, and calls this a completeness proof (plan lines 204-210). Repeated dialogue and equal-time cues are valid transcript content.<br>
**Why it matters:** A success receipt could describe a transcript that silently omits legitimate cues. That violates the PRD's zero false-success and zero partial-upload guardrails.<br>
**Failure mode:** Two identical cues at separate positions, or recycled DOM snapshots with an equal cue, collapse into one key; sorting then conceals traversal order.<br>
**Recommendation:** Replace PRD-F06/F08 with ordered viewport snapshots merged through longest suffix/prefix overlap. Advance by less than one viewport, preserve repeated cues, reject zero-overlap/gap conditions, never sort the assembled result, and restore the panel scroll position in `finally`.

#### 2. The caller trust boundary is underspecified

**Evidence:** PRD-F12 says only "dedicated fixed-origin endpoint" (line 183). Current common validation accepts a missing origin and any `chrome-extension://` origin (`bearer.ts` lines 265-268); the common client API header is optional (`api-version.ts` lines 39-44).<br>
**Why it matters:** Possession of the shared token becomes the only meaningful distinction between the intended companion and another extension or script.<br>
**Failure mode:** An unintended client with the token submits transcript-shaped content while satisfying the vague PRD acceptance evidence.<br>
**Recommendation:** Require bearer-only authentication, a present exact configured extension origin, a mandatory route-specific contract version, strict content type, and rejection of cookie-only requests. Bind approved extension IDs and extractor versions in the private lab manifest.

#### 3. A stale recovery job can overwrite a confirmed browser capture

**Evidence:** PRD-F13 and PRD-N10 promise atomic capture but do not mention existing transcript recovery. The current worker fetches outside a transaction and later calls `upgradeItemCaptureContent()` (`transcript-worker.ts` lines 226-261). Marking a job resolved does not invalidate a result already in flight (`transcript-jobs.ts` lines 397-416).<br>
**Why it matters:** A successful browser capture can be replaced by an older provider result after the user has reviewed and confirmed it.<br>
**Failure mode:** Recovery job starts, browser capture commits, stale worker then upgrades the same item and marks itself done.<br>
**Recommendation:** Add a P0 compare-and-apply invariant. Browser persistence must resolve the recovery job in the same transaction; a worker may apply only while its exact claim is still current and the item remains an eligible weak candidate. Add a deterministic interleaving test.

#### 4. Retention consent does not authorize downstream AI processing

**Evidence:** The PRD describes saving transcript text and later analysis, but its Stage 0 manifest fields cover retention rather than provider or processing scope (lines 253-262). The target architecture immediately feeds committed content to enrichment. Notes may also enter AI processing through a mutable default.<br>
**Why it matters:** Permission to retain an authorized transcript is not automatically permission to send it to an external model provider or include an optional note in AI context.<br>
**Failure mode:** A lab capture approved only for local retention is queued for external enrichment, or its optional note becomes AI-visible without feature-specific consent.<br>
**Recommendation:** Treat downstream processing as a separate manifest permission. Default it off. Name allowed processing mode/providers when on. Force capture notes to `include_in_ai=false`; a different existing note is a no-mutation conflict.

#### 5. `Save link only` is not defined strongly enough to correct current behavior

**Evidence:** PRD-F11 says to preserve `Save link only` (line 182), but current `/api/capture/url` calls `extractUrlCapture()` and may enqueue transcript recovery. The PRD current-state section does not explicitly call this contradiction out.<br>
**Why it matters:** The fallback can still trigger YouTube retrieval and later transcript storage, contradicting the user's choice and the consent model.<br>
**Failure mode:** User declines transcript capture, clicks link-only, and the server performs extraction or queues recovery anyway.<br>
**Recommendation:** Add a distinct P0 requirement for a metadata-only endpoint that performs zero remote fetches and enqueues no recovery work. Name the exact outcome copy and prove it with a throwing-fetch test and queue assertions.

### P1 - High Risk

#### 1. The limits contradict the completed research

**Evidence:** PRD-F09 and PRD-N04 specify 12 seconds and 240 scrolls (lines 180 and 202); the research contract specifies 15 seconds and 150 scrolls.<br>
**Why it matters:** Two documents cannot be the implementation authority, and the current values are presented as validated when they are not.<br>
**Failure mode:** Client/server mismatch creates false rejects or accepts traversal behavior not benchmarked by the research spike.<br>
**Recommendation:** Use one shared versioned constant set: 15 seconds, 150 scrolls, 7,200 segments, 500,000 characters, 2 MiB, and three stable-bottom checks. Benchmark at and beyond every boundary.

#### 2. `track_identity_unknown` is incorrectly modeled as a failure state

**Evidence:** The typed state table places `track_identity_unknown` among errors while saying text may proceed (line 220).<br>
**Why it matters:** Unknown manual-versus-ASR class is the normal honest outcome for DOM-only capture, not an exceptional state.<br>
**Failure mode:** UI or metrics count valid captures as errors, or engineers later infer caption class to avoid an awkward state.<br>
**Recommendation:** Make `caption_source_class=unknown` a review attribute on success. Reserve typed failure for an unstable selected track or changed track identity.

#### 3. The lab destination and retention lifecycle are not closed decisions

**Evidence:** The PRD permits an approved lab environment (lines 117-123) but does not require a separate disposable database. Aggregate retention is left open (line 399), and full-text processing behavior is assumed rather than decided.<br>
**Why it matters:** A lab feature flag against the production database weakens the meaning of "production no-go" and complicates cleanup.<br>
**Failure mode:** Authorized test data and derived artifacts enter the durable production estate and backups.<br>
**Recommendation:** Require a separate lab database/data root for live canaries. Set explicit per-run delete-by, diagnostics retention, backup disclosure, cleanup owner, and cleanup verification fields.

#### 4. The data model does not require one active source per item

**Evidence:** PRD-F13 says different active transcript is a conflict, but no acceptance criterion requires a database invariant.<br>
**Why it matters:** Application checks alone do not protect concurrent writes or future code paths.<br>
**Failure mode:** Two simultaneous requests both see no active source and create two active sources.<br>
**Recommendation:** Preflight historical data and add a partial unique index for one active transcript source per item. Include concurrent request tests.

#### 5. Live-canary scope includes Shorts before evidence exists

**Evidence:** Preconditions include both watch and Shorts routes (line 130), while whether Shorts belongs in the first canary is unresolved (line 397).<br>
**Why it matters:** Shorts uses a materially different page shell and raises avoidable selector and navigation risk.<br>
**Failure mode:** The first retained live run expands scope while the watch-path contract is still being validated.<br>
**Recommendation:** Keep Shorts fixture-only in V0.1. The first live canary is one approved standard watch route; Shorts requires its own evidence gate.

### P2 - Medium Risk

#### 1. Consent and receipt copy are outcomes, not versioned requirements

**Evidence:** The happy path lists topics to disclose (lines 142-153) but does not freeze exact inspect, confirm, conflict, deletion, and backup copy.<br>
**Why it matters:** Small wording changes can collapse the distinction between local inspection and server transfer.<br>
**Failure mode:** UI says "capture" or "save" ambiguously and users cannot tell when content leaves Chrome.<br>
**Recommendation:** Include versioned exact copy in V2 and test it by copy version.

#### 2. The canary metric denominator hides local extraction failures

**Evidence:** The primary metric counts only user-confirmed server requests (lines 280-288), while pre-confirm telemetry is intentionally absent (lines 307-309).<br>
**Why it matters:** A selector can fail for most users while the confirmed-request success rate remains 100%.<br>
**Failure mode:** Only easy successful inspections reach confirmation, overstating overall reliability.<br>
**Recommendation:** Add locally recorded, content-free inspect-attempt outcomes to the canary run report, separate from server-confirm metrics.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

V1 treats stable global key counts as evidence of continuous traversal, treats a generic extension origin as sufficient caller identity, and treats atomic capture as if no recovery worker or downstream processor exists. It also calls the current fallback link-only even though current server behavior can extract and enqueue recovery. These are contract errors, not implementation details.

## Missing Validation

- Ordered overlap tests with repeated equal cues and equal timestamps at different positions.
- Recovery-worker/browser-capture interleaving test.
- Exact extension-origin, missing-origin, cookie-only, and missing-contract-version tests.
- Manifest matrix for retention-only versus downstream-processing authorization.
- Concurrent active-source uniqueness test.
- True link-only throwing-fetch and no-queue test.
- Separate-lab-data-root and cleanup/backup-expiry proof.
- Local inspect-attempt outcome accounting for live canary reliability.

## Revised Recommendations

Create PRD V2 around three explicit products states: metadata-only save, local transcript inspection, and confirmed transcript transfer. Make the safety properties database- and test-backed, not copy-backed. Separate retention permission from downstream processing, restrict live scope to one standard watch route in a separate lab data root, and leave production blocked in code.

## Go / No-Go Recommendation

- UX prototype and synthetic layout exploration: go.
- Extractor implementation: conditional go after the ordered-overlap contract replaces global deduplication.
- Local fixture E2E: conditional go after all P0 requirements are in V2.
- Retained live canary: no-go until manifest, separate lab data root, cleanup, auth boundary, and race tests pass.
- Production: no-go under this PRD.

## Plan Revision Inputs

### Required Deletions

- Delete global timestamp/text deduplication as a completeness rule.
- Delete 12-second/240-scroll values.
- Delete `track_identity_unknown` as an error state.
- Delete any implication that an approval ID or lab environment variable can enable production.
- Delete any default path from capture note to AI inclusion.

### Required Additions

- Ordered suffix/prefix overlap traversal and scroll restoration.
- Exact extension ID/origin, bearer-only route, and mandatory route-contract version.
- Recovery-job compare-and-apply plus transactional resolution.
- Separate downstream-processing permission and provider scope.
- True no-fetch/no-recovery link-only endpoint.
- Separate lab data root, full manifest schema, one-active-source invariant, and rollback compatibility gate.

### Required Acceptance Criteria Changes

- Use research-ratified limits: 15 seconds/150 scrolls/7,200 cues/500,000 characters/2 MiB/three stable checks.
- Success must preserve ordered repeated cues and prove continuous overlap.
- Note saves are AI-off and conflicts never overwrite.
- No success may be overwritten by stale recovery work.
- Shorts is fixture-only until a separate gate.

### Required Validation Changes

- Add race, concurrency, strict-origin/version, streamed-body-cap, downstream-scope, and separate-lab cleanup tests.
- Add a forward-compatible rollback rehearsal after migration 026.
- Add privacy scans that inspect logs, responses, screenshots, reports, and diagnostic exports.

### Required No-Go Gates

- Any zero-overlap traversal, stale identity, or container replacement.
- Any caller without exact extension origin and mandatory contract version.
- Any stale worker overwrite or duplicate active source.
- Any processing not authorized separately from retention.
- Any use of the production database/runtime for the live lab canary.

## Residual Risks

YouTube can change or remove its transcript DOM without notice. Visible access does not itself grant retention rights. The server cannot independently prove what the DOM contained, so provenance must remain "browser-visible observation." Even with exact extension-origin checks, the existing shared bearer remains broader than a scoped extension credential and must be replaced before any future production proposal.
