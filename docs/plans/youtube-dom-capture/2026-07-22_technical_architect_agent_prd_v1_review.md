# Technical Architect Agent Review - YouTube DOM Capture PRD V1

**Created:** 2026-07-22 13:38 IST<br>
**Agent:** Halley, technical-architect reviewer<br>
**Scope:** Read-only repository audit and PRD V1 review<br>
**Verdict:** Conditional go for synthetic fixtures/local MV3 E2E and manifest-authorized lab canary after P0 resolution; production no-go<br>

## Evidence Inspected

- `docs/plans/youtube-dom-capture/2026-07-22_ai_brain_youtube_dom_capture_prd_v1.md`
- `docs/research/youtube-transcripts/2026-07-22_11-05-48_IST_ai_brain_chrome_companion_github_landscape_v1.md`
- `extension/manifest.json`
- `extension/src/*`
- `src/lib/capture/policy.ts`
- `src/app/api/capture/transcript/route.ts`
- `src/lib/capture/transcripts/user-provided.ts`
- `src/lib/auth/bearer.ts`
- `src/lib/auth/api-version.ts`
- `src/lib/queue/transcript-worker.ts`
- `src/db/transcript-jobs.ts`
- `src/db/transcripts.ts`
- `src/db/migrations/018_transcript_policy_sources.sql`
- `src/lib/repair/item-repair.ts`
- `src/db/item-notes.ts`
- `src/lib/errors/sink.ts`
- `scripts/activate-release.sh`

## P0 Findings

### 1. Policy Environment Can Be Misclassified

`currentTranscriptEnvironment()` accepts `BRAIN_TRANSCRIPT_ENV=lab` before checking the production runtime. A legal approval ID can also make `lab_public_caption` production-allowed.

**Required change:** Production runtime wins over all transcript environment overrides. Browser-visible and public-lab methods are unconditionally production-blocked. Lab authorization requires a server-validated private manifest.

### 2. Dedicated Bearer-Only Endpoint Is Required

The existing transcript route accepts session-cookie or bearer authentication and necessarily records user paste/upload provenance.

**Required change:** Add `POST /api/capture/youtube-browser-transcript`. Require bearer authentication and never import or call the server YouTube extractor.

### 3. Origin And Contract Version Are Too Permissive

The common origin validator accepts any `chrome-extension://` origin and missing origin; the common API-version header can be omitted.

**Required change:** For this route require a present exact configured extension origin, bearer auth, and mandatory route-contract version. Cookie-only calls fail.

### 4. Running Recovery Can Overwrite Browser Capture

The transcript worker fetches and then upgrades without atomically proving the job is still running and the item is still a recovery candidate.

**Required change:** Add transactional compare-and-apply. Browser capture resolves/cancels the applicable recovery job in the same transaction. A stale worker result must fail its compare-and-set and leave browser content intact.

### 5. V1 Cue Deduplication Can Lose Legitimate Repetition

Global keying by timestamp/text can collapse legitimate repeated equal cues. Stable scroll height also does not prove continuous virtualized traversal.

**Required change:** Merge ordered viewport snapshots through longest suffix/prefix overlap. Advance by less than one viewport, preserve repeated cues, and fail on zero overlap or traversal gaps.

### 6. Durable Atomicity Must Include Every Side Effect

Current URL deduplication is a two-second memory window and item source URL is not unique.

**Required change:** Durable receipt plus one transaction for item, note, policy, source, segments, recovery-job resolution, derived-state reset, and receipt. Add concurrency and injected-failure tests.

### 7. Downstream AI Processing Is A Separate Trust Boundary

New/updated items are queued for enrichment, which can send captured text to configured providers.

**Required change:** Private lab manifest separately authorizes full-text retention and downstream processing/provider scope. Without that authorization, block external processing or the retained live capture according to the approved policy.

### 8. Optional Note Semantics Are Unsafe By Default

The current extension note can become capture body text; item-note AI inclusion follows a mutable default.

**Required change:** Save note separately, force `include_in_ai=false` for this path, and return conflict rather than overwriting a different existing note.

## P1 Findings

1. Research limits are 15 seconds/150 scrolls, while V1 says 12/240. Use one versioned constant set ratified by long virtualized benchmarks.
2. Schema permits multiple active transcript sources. Preflight historical data, then add a partial unique index for one active source per item.
3. Existing logging accepts full identifying fields and sink has no field-level redaction. Use a dedicated allowlisted diagnostic DTO.
4. Explicitly pin top frame, tab ID, expected video ID, start URL, and document identity; track-label or container replacement invalidates preview.
5. Save and restore the user's original transcript-panel scroll position in `finally`.

## P2 Findings

Before production, replace the shared all-client bearer with a scoped per-extension credential. Same-tab panel opening, multi-language active storage, explicit replacement, and broader route support remain separate designs.

## Required Extractor Contract

```text
extractor_version
video_id
route_kind
renderer_kind
visible_track_label?
language_code?
segments: [{ idx, start_ms, text }]
completeness:
  algorithm_version
  reached_top
  reached_bottom
  snapshots
  stable_bottom_checks
  overlap_failures
captured_at
```

`caption_source_class` is server-owned and always `unknown` for schema V1.

### Algorithm

1. Save the original panel scroll position.
2. Scroll to logical top and wait for a quiet render.
3. Parse one supported renderer family from `textContent`; reject mixed renderers and malformed cues.
4. Advance by less than one viewport.
5. Merge ordered snapshots through longest suffix/prefix overlap, preserving repeated identical cues.
6. Fail `virtualization_incomplete` on any traversal gap, container replacement, stuck scroll, or cap.
7. Reach physical bottom and require final ordered snapshot, final cue, scroll metrics, and mutation-quiet state to remain unchanged for three checks.
8. Recheck video, route, document, panel, and track identity throughout and before confirmation.
9. Restore scroll position in `finally`.
10. Preserve start times, send `duration_ms=null` in schema V1, require contiguous indices and nondecreasing safe-integer starts, and never sort/truncate/skip malformed cues.

The server can validate the evidence shape but cannot independently prove what the DOM contained. Provenance must say `browser-visible observation`, not `official caption`. Unknown track class is a success attribute, not an error.

## Required API Hardening

- Strict JSON with no unknown fields.
- Hard streamed 2 MiB cap even when `Content-Length` is absent.
- Server computes normalized text, text hash, and request hash; raw client hash is not authoritative.
- Same request ID/hash replays receipt; mutation is 409.
- Same video/text with new request is duplicate.
- Typed `400/401/403/409/413/429/503` errors with `Cache-Control: no-store`.
- Response contains only contract version, action, item/source IDs, request ID, and server hash.
- Reject cookies, approval IDs, client policy/retention/caption class, HTML, player response, signed URLs, arbitrary destination, and unknown extractor versions.

## Required Transaction Order

```text
receipt lookup
canonical item lookup
conflict and compare-and-set checks
item create or weak-item upgrade
note conflict/save
policy row
source and segments
recovery job resolution
approved derived-state reset
terminal receipt
```

Same active hash is duplicate. A different active source, legacy transcript-bearing item with no source provenance, or different existing note is conflict with no mutation. V0.1 performs no replacement.

## Privacy And Kill Switches

Allowlisted diagnostics may contain outcome, extractor version, renderer family, duration/size bucket, completeness protocol, policy result, and timestamp. Exclude request/item identifiers, URLs, video IDs, titles, channels, track labels, transcript/note text, tokens, and IPs.

Use three independent gates:

1. packaged extension feature flag;
2. authenticated server capability/version-disable response;
3. code-level lab policy plus valid private manifest.

Server disable is immediate rollback. Disabling never deletes retained data; cleanup remains separate and auditable.

## Test Additions

| Layer | Required evidence |
|---|---|
| Extractor | Modern/legacy, multilingual, repeated/equal-time cues, script-like text, malformed cue, no/hidden panel, mixed renderer |
| Virtualization | Continuous overlap, recycled nodes, stuck/skipped viewport, changing height, container replacement, 7,200/7,201 boundaries |
| Navigation | URL/video/document/track changes before, during, after traversal and before confirm |
| MV3 E2E | No pre-click injection, isolated top-frame execution, exact permissions, no token bridge, no upload before confirm, popup-close discard |
| API/database | Exact auth/origin/version, stream cap without content length, identity, no fetch, idempotency, concurrency, rollback injection, deletion |
| Integration | Stale recovery worker cannot overwrite, link capture unchanged, kill-switch matrix, migration/backup/restore, approved cleanup |

## Deployment And Rollback Finding

A binary rollback to a pre-026 release can be blocked by unknown-migration checks. Before deployment, either prove/encode migration compatibility for the previous release or use feature disable on the forward-compatible release as the normal rollback. Restore the database only for migration corruption, because full restore can discard unrelated newer data.

## V2 Decisions Required

1. Approved retention and downstream processing/provider scope.
2. Exact extension ID/distribution and credential scope.
3. Forced note AI exclusion and conflict behavior.
4. Shorts fixture-only versus canary.
5. Final timeout/scroll/per-cue limits.
6. Private manifest owner/format.
7. Separate lab database versus production database with lab gate.
8. Distinct browser-visible source enum now versus lab method plus provenance channel.
