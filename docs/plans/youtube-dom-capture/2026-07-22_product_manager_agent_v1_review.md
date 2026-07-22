**Product Review: YouTube DOM Capture V1**

**Verdict**

**NO-GO to finalize or implement V1 as written.** Phase 0 governance and metadata-only link work may proceed. Extractor implementation requires the P0 completeness contract first; retained live capture and production remain blocked.

Severity count: **7 P0, 8 P1, 5 P2, 2 P3. No severity section is empty.**

Evidence aliases:

- **PRD:** `docs/plans/youtube-dom-capture/2026-07-22_ai_brain_youtube_dom_capture_prd_v1.md`
- **PLAN:** `docs/plans/youtube-dom-capture/2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v1.md`
- **INPUT:** `docs/plans/youtube-dom-capture/2026-07-22_product_manager_agent_prd_input.md`
- **ARCH:** `docs/plans/youtube-dom-capture/2026-07-22_technical_architect_agent_prd_v1_review.md`

**P0 Findings**

| ID | Finding and evidence | Exact required V2 change |
|---|---|---|
| P0-1 | **Live-platform approval is deferred too late.** PRD Stage 0 permits an approved live canary, while the YouTube terms review appears only in the production gate (`PRD:251-274`; `PLAN:650-674`). Live DOM extraction is already automated access. The [YouTube Terms](https://www.youtube.com/static?template=terms) restrict automated access and independent use of content absent the applicable authorization. | Move a written platform-terms determination into the **pre-live Stage 0 gate**. The artifact must identify the exact permission/legal basis, target IDs, rights holders, allowed data and processing, expiry, cleanup owner, and deletion deadline. The requester’s approval statement may reference this artifact but cannot replace it. |
| P0-2 | **The pre-inspection UX violates its own consent boundary.** V1 promises no transcript inspection before the Inspect action, then says the popup displays “Visible transcript detected” beforehand (`PRD:82-83,136-140,173-174`). The popup cannot know this without reading the page. | Replace the state with: **“YouTube video ready. Open the transcript panel and choose a language, then inspect. Nothing has been read.”** `panel_not_open` may be established only after Inspect. Test zero script injection, DOM messages, transcript reads, or transcript telemetry before Inspect. |
| P0-3 | **The completeness algorithm can silently lose valid cues.** Global timing/text deduplication and final sorting can collapse legitimate repeated dialogue and hide traversal gaps (`PRD:177-180`; `PLAN:200-210`; `ARCH:54-58`). This contradicts the zero-false-success requirement. | Replace global dedup/sort with ordered viewport snapshots merged through longest suffix/prefix overlap. Scroll by less than one viewport; preserve repeated equal cues; fail on zero overlap, gaps, renderer/container replacement, or mutation instability. Require `reached_top`, `reached_bottom`, snapshot count, overlap failures, stable checks, and document/panel/track identity in completeness evidence. Restore the original panel scroll position in `finally`. |
| P0-4 | **Production and route gates are not mechanically sufficient.** Current environment selection accepts `BRAIN_TRANSCRIPT_ENV=lab` before checking production (`src/lib/capture/policy.ts:51-55`). Current origin validation accepts missing origins and any extension ID, and API version is optional (`src/lib/auth/bearer.ts:244-269`; `src/lib/auth/api-version.ts:34-43`). | Define an authoritative production-runtime test that overrides every lab setting. Require bearer-only auth, present exact configured extension origin, mandatory route-contract version, and reject session-only calls. Test every production/lab/env combination before body parsing or persistence. Select a separate non-production runtime/database for the canary. |
| P0-5 | **A running legacy recovery job can overwrite the browser transcript.** The worker fetches and later upgrades without proving the item is still a recovery candidate (`src/lib/queue/transcript-worker.ts:226-261`). PLAN atomicity does not include transactional recovery-job cancellation/CAS (`PLAN:475-498`). | In the browser-capture transaction, cancel/resolve the recovery job. Before applying a fetched worker result, atomically compare job state and item/source generation. A stale result must fail without mutation. Add deterministic concurrency tests for browser-win, worker-win-before-browser, stale-worker, and rollback cases. |
| P0-6 | **Consent ends at the Brain server, but processing does not.** PLAN immediately queues enrichment (`PLAN:58-80,475-500`); current code marks enrichment pending and can send item text to configured providers (`src/lib/repair/item-repair.ts:117-159`; `src/lib/queue/enrichment-batch.ts:115-143`). Note AI inclusion also follows a mutable default (`PRD:394-400`). | Add `external_processing_allowed`, named provider allowlist, processing purpose, and note policy to the approval manifest. Default both transcript enrichment and note AI inclusion to **off**. Versioned confirmation copy must name any downstream provider before Save. Add `note_conflict`; never overwrite an existing different note. Prove with a canary string that no external provider receives text when disabled. |
| P0-7 | **“Save link only” is not globally truthful.** INPUT requires popup and context-menu link actions to avoid extraction (`INPUT:114-125`). PLAN routes only the companion fallback to `/api/capture/link`, while context menus and disabled-mode generic capture retain `captureUrl()` (`PLAN:184-190,240-266,504-513`; `extension/src/background.ts:21-35,67-68`). | Every user-facing action named **Save link** must call the metadata-only route. Alternatively rename and explicitly disclose any enriching action. Add E2E assertions covering popup, page context menu, hyperlink context menu, and feature-disabled mode: zero YouTube fetch, extractor call, or recovery enqueue. |

**P1 Findings**

| ID | Finding | Exact required V2 change |
|---|---|---|
| P1-1 | State contracts disagree: `not_youtube_video`/`unsupported_tab`, `network`/`network_error`, and detailed PRD errors versus generic PLAN reducers (`PRD:210-229`; `PLAN:163-180`; `INPUT:72-96`). Happy-path, setup, and stale-review states are absent from the PRD table. | Publish one canonical discriminated union shared by PRD, reducer, API mapping, and tests. Remove `track_identity_unknown` as a state; it is a review attribute. |
| P1-2 | Exact consent copy from INPUT was not adopted, yet PLAN records `copy_version` (`INPUT:98-112`; `PRD:142-153`; `PLAN:317-320`). The request also sends duration, renderer, counters, hashes, and timestamps not covered by current confirmation wording. | Add a versioned copy table with title, body, primary/secondary actions, accessible announcement, data categories, destination, retention, and downstream processing. Server accepts only known copy versions. Replace vague “account data” with “YouTube cookies and Google account identifiers.” |
| P1-3 | Client/server provenance ownership conflicts. PLAN sends `caption_source_class`, `duration_ms`, and `end_ms`, while ARCH requires server-owned `unknown` and observed start times only (`PLAN:292-307,346-359`; `ARCH:90-125`). | Remove caption class from the request. Persist it server-side as `unknown`. Send only observed `start_ms`; derived duration/end values must be null or explicitly marked inferred. |
| P1-4 | Limits remain unresolved: INPUT specifies 15 seconds/150 scrolls; PRD and PLAN specify 12/240, and PLAN acknowledges the conflict (`INPUT:118-121`; `PRD:180,202`; `PLAN:212-225`). | Benchmark both configurations on the versioned long fixtures, record the result, and publish one shared constants table imported by extractor and server tests. No unresolved limits may remain in final V2. |
| P1-5 | Canary metrics can be inflated by retries and repeated duplicates. PRD combines created/upgraded/duplicate and permits only 20 unspecified attempts (`PRD:278-309`; `PLAN:662-674`). DOM drift and consent comprehension from INPUT disappeared. | Separate new-content commit, duplicate resolution, and idempotent replay metrics. Require at least 20 **unique capture intents across at least five approved videos**; retries do not count. Restore DOM-drift and 5/5 moderated comprehension gates. |
| P1-6 | Diagnostics boundaries conflict. PRD promises aggregate non-identifying data, PLAN allows request IDs, and the existing bearer proxy logs client IPs (`PRD:191,206,307-309`; `PLAN:528-554`; `src/proxy.ts:89-128`). | Define three schemas: identifier-free aggregate metrics; user-initiated ephemeral support bundle; security logs. Permit request ID only in the explicit support bundle. Either suppress IP for these routes or disclose purpose and fixed retention. Set retention and deletion for every schema. |
| P1-7 | Shorts scope is inconsistent. PRD treats watch and Shorts as supported preconditions, INPUT recommends deferral, while the canary uses only standard watch and PLAN leaves Shorts open (`PRD:127-132`; `INPUT:42-44`; `PLAN:662-672,820-827`). | Make V0.1 live scope `youtube.com/watch` only. Declare Shorts fixture-only or out of scope; do not leave it simultaneously supported and unresolved. |
| P1-8 | Binary rollback is not proven compatible with migration 026. PLAN proposes application rollback after the forward migration, while ARCH warns older releases may reject unknown migrations (`PLAN:726-756`; `ARCH:178-180`). | Make server feature-disable the normal rollback. Permit binary rollback only after a pre-026 release passes against a post-026 snapshot. Add this compatibility test to the deployment gate. |

**P2 Findings**

| ID | Required V2 change |
|---|---|
| P2-1 | Define `transcript_unavailable` only when an explicit page state proves unavailability; otherwise missing DOM maps to `panel_not_open` or `unsupported_dom`. |
| P2-2 | Replace “success receipt lists transcript segments” (`PRD:153`) with counts, source, bounded-completeness result, caption type unknown, retention, and Open in Brain. Do not render transcript text by default. |
| P2-3 | Define reference hardware, Chrome version, fixture segment distribution, repetitions, warm-up, and minimum run count for p95 extraction/API targets (`PRD:202-203`). |
| P2-4 | Add `update_required` for disabled extractor versions and specify user copy, packaged-update procedure, support owner, and response SLA. |
| P2-5 | Add a scoped per-extension credential as a production prerequisite; the shared bearer may remain only in the isolated single-user lab (`ARCH:86-88`). |

**P3 Findings**

| ID | Required V2 change |
|---|---|
| P3-1 | Update reviewer metadata from “review pending” and link every review plus its resolution ledger (`PRD:3-8`; `PLAN:3-8`). |
| P3-2 | Normalize `V1`, `V0.1`, “Brain,” “AI Brain,” `duplicate`, and `duplicate_same_transcript`; add a glossary and PRD-ID → plan task → test → rollout-gate crosswalk. |

**Required States And Copy**

Canonical V2 states must include:

`setup_required | unsupported_tab | ready | inspecting | panel_not_open | transcript_unavailable | unsupported_dom | virtualization_incomplete | navigation_changed | review_ready | stale_review | payload_too_large | invalid_segments | saving | created | upgraded | duplicate_same_transcript | existing_transcript_conflict | note_conflict | feature_disabled | update_required | policy_blocked | unauthorized | rate_limited | network_error | server_error`

Required copy additions:

| State | Exact V2 copy |
|---|---|
| `ready` | **YouTube video ready.** Open the transcript panel and choose a language, then inspect. Nothing has been read. |
| Inspect disclosure | Brain will read the transcript currently visible in this YouTube tab. It stays in this popup until you save it or close the popup. |
| `virtualization_incomplete` | Brain could not verify that every visible cue was captured. Nothing was sent. |
| `stale_review` | This tab changed after inspection. Nothing was sent. Inspect again. |
| `existing_transcript_conflict` | Brain already has a different transcript for this video. Nothing was changed. |
| `policy_blocked` | This video is not approved for this research capture. Nothing was saved. |
| Success | Transcript saved from the visible YouTube panel. Caption type was not verified. |

Confirmation copy must dynamically state the exact retention deadline and either **“No external AI provider will receive this capture”** or name every approved downstream provider.

**Measurable V2 Gates**

| Gate | Required acceptance |
|---|---|
| Consent | Zero injection/DOM access before Inspect; zero transcript network bytes before Save; approved copy-version snapshot passes. |
| Extraction | Every expected cue appears exactly once and in source order; repeated equal cues survive; traversal-gap fixtures fail; false-success count = 0. |
| Policy | Every production/runtime override combination rejects before parsing or persistence; wrong/expired manifest targets produce zero durable content. |
| Auth | Missing/wrong origin, session-only auth, missing/wrong contract version, and unsupported extractor version all reject. |
| Integrity | Recovery-race and injected-failure matrix leaves no overwrite, partial item, note, source, segment, receipt, or derived-state mutation. |
| Privacy | Forbidden-data findings and unauthorized downstream-provider calls = 0; deletion verifies live rows immediately and backup expiry by deadline. |
| Canary | `new_commit_rate >=95%`; duplicate-resolution and idempotent-replay rates = 100%; at least 20 unique intents across five approved videos; comprehension = 5/5. |
| Drift | Stop after three consecutive known-layout failures or `unsupported_dom / eligible_inspections >5%` once `n>=20`. |

**Contradictions**

| PRD promise | PLAN/current behavior |
|---|---|
| No read before Inspect | “Visible transcript detected” before Inspect |
| Every Save link is metadata-only | Context-menu and disabled-mode capture retain `captureUrl()` |
| Complete ordered transcript | Global dedup and sorting can discard or reorder evidence |
| Data goes to Brain server | Enrichment can send body text to configured providers |
| Production always blocked | Current environment override can classify production as lab |
| Aggregate diagnostics contain no identifiers | PLAN allows request IDs; proxy logs IP |
| Shorts are supported | Canary is watch-only and Shorts remains unresolved |
| Stage 0 manifest fields are mandatory | PLAN example omits allowed data classes, cleanup owner, and processing/provider scope |

**Rollout Decision**

- **Fixture work:** Conditional go only after P0-3 is incorporated into V2.
- **Retained live canary:** No-go until every P0 is closed and the platform, isolated-lab, manifest, downstream-processing, deletion, and operator gates pass.
- **Production:** Explicit no-go. A later decision must include platform authorization, Store/privacy posture, scoped credentials, canary evidence, and a reviewed code change removing the production block.

V2 should contain no unresolved P0 item in “Open Questions.” Every finding must be recorded as accepted, rejected with evidence, or deferred with a release gate.

No files were edited. The pre-existing `docs/plans/youtube-dom-capture/` directory remains untracked in this worktree.
