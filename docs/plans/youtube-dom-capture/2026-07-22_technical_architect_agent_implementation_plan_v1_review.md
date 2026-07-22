# Technical Architect Review: YouTube DOM Capture V1

**Date:** 2026-07-22<br>
**Scope:** V1 PRD, V1 implementation plan, earlier technical-architect review, and current repository contracts<br>
**Method:** Read-only evidence review<br>
**Verdict:** **Not implementation-ready.** Fixture scaffolding may proceed, but extractor success semantics, persistence, and any retained live canary remain blocked until every P0 is resolved. Production remains no-go.

## Assumptions

- The lab would otherwise run the current application, database, authentication middleware, and asynchronous workers.
- Browser DOM evidence is a client assertion, not cryptographic proof of YouTube’s complete or official caption track.
- The untracked planning directory existed before this review and was not modified.

## P0 Findings

### P0-1: The extractor can certify an incomplete or altered transcript

**Evidence:** PRD-F06/F08 require stable segment sets and global timing/text deduplication (`PRD:177-180`). The plan keys cues globally, later sorts them, and declares success from stable height/last-key/count (`plan:198-225`). This directly contradicts the earlier required ordered-overlap algorithm (`technical review:54-58,112-125`). The upload contract also lacks `reached_top`, snapshot overlap evidence, container continuity, and algorithm version (`plan:292-316`).

Global `(start,text)` deduplication can remove legitimate repeated cues. Sorting can hide non-monotonic DOM order or traversal gaps. Stable bottom metrics do not prove continuous traversal through recycled nodes.

**Required V2:**

- Replace PRD-F06/F08 and the plan algorithm with ordered viewport snapshots merged by longest suffix/prefix overlap.
- Advance by less than one viewport; require overlap on every transition; preserve repeated equal cues.
- Fail on zero overlap, skipped viewport, mixed renderer, container replacement, track change, stuck scroll, navigation change, or any cap.
- Never sort extracted cues to make them valid.
- Send only `{idx,start_ms,text}` in V1. Omit or set `duration_ms/end_ms` to `null`; the visible DOM does not prove them.
- Add `algorithm_version`, `reached_top`, `reached_bottom`, `snapshot_count`, `stable_bottom_checks`, and `overlap_failures`.
- Describe provenance as `browser-visible observation`; `caption_source_class=unknown` is a server-derived success attribute.

### P0-2: There is no shared revision fence against stale asynchronous writers

**Evidence:** The proposed transaction omits recovery-job resolution and compare-and-apply (`plan:479-496`). The current transcript worker fetches asynchronously and then upgrades unconditionally (`src/lib/queue/transcript-worker.ts:226-261`). Ordinary URL capture does the same (`src/app/api/capture/url/route.ts:245-323`). Enrichment and embedding also read, await providers, and later write without proving the item body is unchanged (`src/lib/enrich/pipeline.ts:153-251`, `src/lib/embed/pipeline.ts:51-179`). PRD assumption `production provider/backfill behavior remains unchanged` conflicts with this requirement (`PRD:408`).

A stale provider, enrichment, or embedding result can overwrite browser content or repopulate stale summaries/chunks after the browser transaction commits.

**Required V2:**

- Add an `items.content_revision` invariant and claim token/expected revision to asynchronous jobs.
- Increment the revision in every body-changing transaction.
- Require compare-and-apply in `src/db/item-upgrades.ts`, the URL route, transcript worker, enrichment pipeline, and embedding pipeline.
- Browser capture must resolve the transcript job and reset derived jobs at the new revision in the same transaction.
- Treat an existing strong transcript body without source provenance as conflict, not upgradeable.
- Add deterministic barrier tests where each asynchronous writer pauses, browser capture commits, and the stale writer is then rejected.

### P0-3: Bearer-only, exact-origin, mandatory-version enforcement is not specified sufficiently

**Evidence:** The plan says adding routes to `BEARER_ROUTES` will require bearer authentication (`plan:276`). In current middleware, a valid session cookie bypasses bearer verification (`src/proxy.ts:84-97`). The common origin helper accepts missing origin and every Chrome extension (`src/lib/auth/bearer.ts:244-269`). The existing API-version helper accepts a missing header (`src/lib/auth/api-version.ts:34-44`). The plan’s private manifest does not bind a stable extension ID (`plan:406-426`).

**Required V2:**

- Add route-specific authentication that requires a valid bearer even when a valid session cookie exists; cookie-only calls must fail.
- Require `X-Brain-Client-Api: 1` on both new extension routes. Keep body `schema_version` and extractor-version allowlisting as separate checks.
- Pin one stable packaged extension ID and exact `chrome-extension://<id>` origin through server configuration/private manifest.
- State explicitly that origin is defense in depth; bearer remains authentication.
- Add tests for valid-session/no-bearer, missing/null origin, another extension ID, missing/wrong version, wrong extractor version, and the exact valid combination.
- Add `src/proxy.ts` and `src/lib/auth/api-version.ts` to the plan’s file map.

### P0-4: The code-level production block still has an environment escape hatch

**Evidence:** `currentTranscriptEnvironment()` returns `lab` before checking `NODE_ENV=production` (`src/lib/capture/policy.ts:51-55`). The plan claims unconditional blocking but leaves a compatibility exception for `lab_public_caption` (`plan:394-404`).

**Required V2:**

- Make production runtime precedence unconditional.
- Block both `browser_visible_transcript` and `lab_public_caption` whenever runtime is production, regardless of environment override or approval ID.
- Prevent the route from supplying an environment override.
- Persist `production_allowed=0` for this V0.1 method.
- Test conflicting combinations such as `NODE_ENV=production` plus `BRAIN_TRANSCRIPT_ENV=lab`.

### P0-5: Retention approval does not authorize downstream AI disclosure

**Evidence:** The target architecture immediately sends captures toward enrichment (`plan:69-70`). New items are automatically queued (`src/db/migrations/003_enrichment_queue.sql:30-34`), repair requeues them (`src/lib/repair/item-repair.ts:117-163`), and workers start unconditionally (`src/instrumentation.ts:63-71`). Providers can be Anthropic, OpenRouter, or Gemini (`.env.example:51-80`). The manifest records retention but no processing/provider scope. Optional note AI inclusion remains open (`plan:823`), while current note creation inherits a mutable default (`src/db/item-notes.ts:383-393`).

**Required V2:**

- For V0.1, require an isolated lab database and explicit worker-disabled mode for enrichment, embedding, note indexing, transcript recovery, and batch processing.
- Set manifest `downstream_processing` to `none`; any provider-enabled experiment requires separate approval and durable per-item enforcement.
- Force companion-created notes to `include_in_ai=false`.
- Conflict on a different existing note; do not overwrite it.
- Add no-provider-call tests and boot tests proving worker-disabled lab mode.

## P1 Findings

### P1-1: Idempotency and active-source invariants are incomplete

The link route requires durable idempotency in Phase 1 (`plan:242-264,569-575`), but the only receipt table arrives in Phase 4 and supports transcript-specific outcomes (`plan:443-455,616-625`). Migration 026 also omits the earlier-required one-active-source unique index; the current schema permits multiple active rows (`src/db/migrations/018_transcript_policy_sources.sql:76-85`).

**Required V2:** Introduce one generic `extension_capture_requests` table before either route, with capture kind, request hash, HTTP status/outcome, nullable item/source IDs, and deletion semantics. Add:

```sql
CREATE UNIQUE INDEX ux_transcript_sources_one_active
ON transcript_sources(item_id)
WHERE status = 'active';
```

Preflight historical duplicates and fail migration rather than silently choosing one. Test concurrent requests through separate database connections.

### P1-2: The API contract has contradictory outcomes

`existing_transcript_conflict` is both a response action and a 409 error (`plan:339-369`). `unauthorized` in the PRD differs from `unauthenticated` in the plan. Version mismatch and `extractor_version_disabled` are absent from the error table. The response omits the authoritative server text hash.

**Required V2:** Define conflict strictly as HTTP 409 with a replayable receipt and existing item ID. Use one error vocabulary across PRD, route, popup reducer, and tests. Return the server-computed hash for committed/duplicate outcomes. Remove client-owned caption class and timestamp mode from the request.

### P1-3: SPA/document/track races remain under-specified

The plan rechecks tab ID, URL, and video ID (`plan:184-188`) but does not pin top frame/document identity, panel/container identity, or selected track. It also does not restore the user’s transcript scroll position.

**Required V2:** Capture `tabId`, top-frame `documentId`, canonical video ID, route kind, container identity, and track label at inspection. Revalidate them during traversal and immediately before confirmation. Restore the original panel scroll position in `finally`, including every error path.

### P1-4: The promised binary rollback is currently impossible

The plan says to roll back the application release and calls every PR independently rollbackable (`plan:737-742,770`). The release activator rejects a previous artifact when the database contains an unknown migration such as 026 (`scripts/activate-release.sh:270-294`).

**Required V2:** Make server disable on the forward release the primary rollback. Before migration deployment, either provide a tested rollback-bridge release containing migration 026 or explicitly encode and test 026 backward compatibility. Remove the unconditional “independently rollbackable” claim. Do not downgrade the database or restore it for ordinary feature rollback.

### P1-5: Diagnostic policy regresses from the earlier review

The earlier review excluded request/item identifiers and IPs. V1 allows request IDs and does not address IPs (`plan:530-550`). The shared error sink accepts arbitrary records, and existing capture paths demonstrate that URLs and item IDs are routinely logged.

**Required V2:** Use a dedicated typed diagnostic DTO that cannot accept request IDs, item IDs, IPs, URLs, video IDs, titles, track labels, text, or payload fragments. Do not pass this route through generic capture-decision logging. Test both successful and failing requests with seeded canary strings.

## P2 Findings

1. **Limits remain unresolved.** The plan acknowledges the 12-second/240-scroll conflict with the research values but does not decide it (`plan:212-225`). V2 must publish one versioned constant set backed by the dynamic virtualized benchmark.

2. **User-state semantics overclaim evidence.** `track_identity_unknown` should be review evidence, not an error state. DOM-only V0.1 cannot reliably distinguish `panel_not_open` from `transcript_unavailable` without an explicit stable page signal. Merge those states or specify the exact non-localized evidence.

3. **File map and tests are incomplete.** Add the URL upgrade path, all affected workers/pipelines, `src/instrumentation.ts`, item source labels, `scripts/activate-release.sh`, and an audited cleanup command. The E2E fixture must recycle DOM nodes dynamically; static HTML alone cannot test virtualization. Add zero-overlap, repeated-identical-cue, document replacement, scroll restoration, stale-writer, exact-origin, rollback-bridge, and downstream-no-call cases.

## P3 Findings

**No P3 findings.** Remaining issues are architectural, correctness, security, privacy, deployment, or testability concerns and therefore rank P0-P2.

## Required Gate

V2 is acceptable for implementation only when:

1. Every P0 correction is normative in both PRD and plan.
2. The file map includes every asynchronous writer and auth/deployment boundary.
3. Migration 026 defines uniqueness, revisions, receipts, preflight, and rollback compatibility.
4. The test matrix contains deterministic concurrency and dynamic virtualization evidence.
5. Fixture/local work remains non-retaining, approved lab uses isolated worker-disabled infrastructure, and production remains blocked in code.

No files were edited during this review.
