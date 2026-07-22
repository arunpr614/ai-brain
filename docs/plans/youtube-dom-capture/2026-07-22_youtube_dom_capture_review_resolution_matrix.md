# YouTube DOM Capture Review Resolution Matrix

**Created:** 2026-07-22<br>
**Status:** Final<br>
**Purpose:** Prove how every actionable V1 specialist and adversarial finding changed the V2 PRD or implementation plan<br>

## Reviewed Artifacts

- `2026-07-22_ai_brain_youtube_dom_capture_prd_v1.md`
- `2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v1.md`
- `2026-07-22_product_manager_agent_prd_input.md`
- `2026-07-22_technical_architect_agent_prd_v1_review.md`
- `2026-07-22_product_manager_agent_v1_review.md`
- `2026-07-22_technical_architect_agent_implementation_plan_v1_review.md`
- Both timestamped adversarial-review reports in this folder

## Disposition Vocabulary

- **Accepted:** Normative V2 requirement and implementation/test gate added.
- **Deferred with no-go:** Valid requirement belongs to a later production decision; V0.1 remains blocked from that stage.
- **Clarified:** Existing intent was retained but made measurable and internally consistent.
- **No finding:** Reviewer explicitly reported no finding at that severity.

No actionable P0 or P1 is left as an open V2 question. A requirement may still block implementation or live rollout; "resolved" here means the final plan names the required work and acceptance evidence, not that production code already exists.

## Consolidated Resolution Ledger

| Finding IDs | Theme | Disposition | V2 resolution | Final location/evidence |
|---|---|---|---|---|
| PM-P0-1 | Platform approval was deferred until production | Accepted | Written target-specific YouTube/platform terms determination now gates any live DOM inspection and is bound into the private manifest. | PRD `Final V0.1 Decisions`, `Private Lab Manifest Gate`; plan `Private Manifest`, YTC2-006 |
| PM-P0-2 | Popup claimed transcript detection before consent | Accepted | Ready state uses only tab URL/title and exact `YouTube video ready... Nothing has been read` copy. No injection, panel query, DOM message, read, or telemetry occurs before inspect. | PRD `Ready State`, PRD2-F02; plan `Popup Reducer`, popup/MV3 tests |
| PM-P0-3, TA-P0-1, ARCH0-P0-5, AR-PRD-P0-1, AR-PLAN-P0-1 | Global dedup/sort could drop repeated cues or hide traversal gaps | Accepted | Ordered viewport snapshots use longest suffix/prefix overlap, sub-viewport movement, physical bottom plus three quiet checks, exact repetition/order preservation, no sort, fail on gaps/replacement, and scroll restoration. | PRD2-F05-F10; plan `Ordered Virtualization Algorithm`, property/dynamic fixture tests |
| PM-P0-4, TA-P0-3, TA-P0-4, ARCH0-P0-1, ARCH0-P0-2, ARCH0-P0-3, AR-PRD-P0-2, AR-PLAN-P0-2 | Production override and route caller/version boundary were weak | Accepted | Authoritative production marker wins; browser and lab-public methods block in production. Both routes require bearer even with session, present exact extension origin, mandatory `X-Brain-Client-Api`, route contract, extension/extractor versions, and streamed byte cap. | PRD2-F13/F22/F23; plan `Route And Required Headers`, `Environment Precedence`, route security matrix |
| PM-P0-5, TA-P0-2, ARCH0-P0-4, AR-PRD-P0-3, AR-PLAN-P0-3 | Stale recovery or other async result could overwrite new content | Accepted and broadened | Migration adds monotonic item `content_revision`, job expected revision, and claim token. URL upgrade, recovery, enrichment, and embedding use compare-and-apply; browser transaction resolves recovery and advances revision. | PRD2-F17/F17A; plan `Shared Content-Revision Fence`, `Recovery Worker Compare-And-Apply`, deterministic barrier tests |
| PM-P0-6, TA-P0-5, ARCH0-P0-7, ARCH0-P0-8, AR-PRD-P0-4, AR-PLAN-P0-4 | Retention was confused with downstream AI/note consent | Accepted | Live V0.1 uses separate lab DB, all background processing workers disabled, active DB processing hold, `downstream_processing=none`, no provider credentials, note AI-off, and note conflict. Confirmation names hold and delete-by. | PRD `Final V0.1 Decisions`, PRD2-F19/F20/F22; plan `Downstream Processing Hold`, private manifest, YTC2-408 |
| PM-P0-7, AR-PRD-P0-5 | Actions named Save link were not truly metadata-only | Accepted | Every literal extension `Save link` action, including hyperlink context menu and disabled companion fallback, uses `/api/capture/link`. Rich page/selection actions must use distinct labels. A durable extraction marker excludes trigger and all backfills. | PRD2-F21; plan `True Link-Only Path`, YTC2-101-YTC2-105, context-menu E2E |
| PM-P1-1, PM-P2-1, AR-PRD-P1-2 | User-state vocabulary and unknown caption class conflicted | Accepted | One canonical state table includes ready/stale/update/note conflict. `caption_source_class=unknown` is a normal server-owned review attribute. `transcript_unavailable` needs an explicit packaged structural signal. | PRD `Typed Product States`; plan popup union/error mapping |
| PM-P1-2, AR-PRD-P2-1 | Consent/receipt copy was unversioned or incomplete | Accepted | Exact inspect, confirm, retention deadline, no-provider, link-only, conflict, success, and backup copy is versioned. Receipt shows bounded evidence/counts, not full transcript text. | PRD `End-To-End User Experience`; plan `Popup Reducer`, copy snapshot tests |
| PM-P1-3, AR-PLAN-P1-1 | Client owned caption class/hash/duration fields | Accepted | Request contains ordered `{idx,start_ms,text}` only for cues. Server computes text/hash/request hash/timing mode/class. Duration/end are null. | PRD `Final V0.1 Decisions`; plan `Request V1`, `Server Text Assembly` |
| PM-P1-4, ARCH0-P1-1, AR-PRD-P1-1, AR-PLAN-P1-3 | 12/240 contradicted research 15/150 limits | Accepted | One V1 constants set uses 15 seconds, 150 scrolls, 7,200 cues, 500,000 characters, 2,000/cue, 2 MiB, three stable checks. Benchmark protocol records exact browsers/hardware and 100 runs. | PRD2-F10/PRD2-N04; plan `Shared Contract Constants`, `Benchmark Protocol` |
| PM-P1-5, AR-PRD-P2-2 | Canary metric could hide local failures or inflate success with retries | Accepted | Metrics separate new commit, duplicate, and replay; require 20 unique intents across five videos; operator records content-free local inspect outcomes; retries excluded; 5/5 comprehension and drift stops restored. | PRD `Metrics And Stop Conditions`; plan Phase 0/6 and operational report |
| PM-P1-6, TA-P1-5, ARCH0-P1-3, AR-PLAN-P1-6 | Diagnostics allowed correlatable IDs/IP/content | Accepted | Dedicated aggregate DTO excludes IDs, fingerprints, URL/video/title/labels/text/hashes/IP/user-agent. Proxy-specific logging is changed for new routes. Retention is 14 server/30 local days. | PRD2-F26/PRD2-N02; plan `Diagnostics And Privacy`, seeded privacy tests |
| PM-P1-7, AR-PRD-P1-5, AR-PLAN-P2-1 | Shorts scope was unresolved | Accepted | Watch routes only for live V0.1; Shorts remains fixture-only and needs a separate canary decision. | PRD `Release Gates`, `Non-Goals`; plan URL eligibility/Phase 6 |
| PM-P1-8, TA-P1-4, AR-PLAN-P0-5 | Binary rollback claim was false after migration 026 | Accepted | Immediate rollback is server disable on the forward-compatible release. Binary rollback is unavailable until prior-release activation/boot compatibility passes and release tooling permits 026. | PRD2-N09; plan `Deployment And Rollback`, YTC2-410 |
| PM-P2-2 | Success receipt overexposed segments | Accepted | Receipt shows action, counts/evidence/source class unknown, retention/backup disclosure, and Open in Brain; no full transcript by default. | PRD `Committed Receipt`; plan response/UI tests |
| PM-P2-3 | Performance target lacked benchmark context | Accepted | Exact browser/hardware/server/fixture/warm-up/sample-count protocol added. | Plan `Benchmark Protocol` |
| PM-P2-4 | Disabled extractor lacked update-required UX/ownership | Accepted | Canonical `update_required` state, exact copy, packaged-update-only procedure, and one-working-day active-canary operator SLA added. | PRD typed states; plan popup reducer/error contract |
| PM-P2-5, ARCH0-P2-1, AR-PLAN-P2-2 | Shared bearer is too broad for production | Deferred with no-go | Exact origin plus bearer is allowed only in isolated single-user lab. Scoped rotatable extension credential is a mandatory production decision input. | PRD `Production`; plan Phase 7 and residual risks |
| PM-P3-1 | Reviewer metadata and links said pending | Accepted | V2 status is final and links all specialist/adversarial artifacts and this ledger. | V2 metadata and `Evidence And Review Basis` |
| PM-P3-2 | Naming/glossary/traceability were inconsistent | Accepted | Canonical V0.1/Brain/outcome terms, glossary, requirement-to-task group crosswalk, and this finding ledger added. | PRD `Glossary And Traceability`; this document |
| TA-P1-1, ARCH0-P0-6, ARCH0-P1-2, AR-PRD-P1-4, AR-PLAN-P1-5 | Durable idempotency and one-active-source invariant were incomplete | Accepted | Generic immutable receipts cover both routes and replay conflict 409s; historical preflight precedes a partial unique active-source index; separate-connection concurrency tests required. | Plan `Migration 026`, `Atomic Browser-Capture Service` |
| TA-P1-2 | API outcomes/error vocabulary contradicted itself | Accepted | Different content/note is HTTP 409 with replayable receipt, not success action. Server returns authoritative hash; client maps server codes to canonical states. | Plan response/error contract and transaction order |
| TA-P1-3, ARCH0-P1-4, ARCH0-P1-5, AR-PLAN-P1-2 | SPA/document/track pinning and scroll restoration were incomplete | Accepted | Pin top frame/tab/URL/video/document/panel/renderer/track; recheck each iteration and before confirm; restore scroll in `finally`. | PRD2-F08/F09; plan `Injection Identity`, algorithm, E2E |
| TA-P2-1 | Limits remained unresolved | Accepted | Same resolution as PM-P1-4; no open limit remains. | Shared constants and benchmark protocol |
| TA-P2-2 | DOM-only user-state semantics overclaimed evidence | Accepted | Unknown class is a success attribute; panel/unavailable/unsupported states have explicit post-inspect structural rules. | PRD typed states; plan popup/extractor contracts |
| TA-P2-3 | File map/tests missed async writers and dynamic virtualization | Accepted | File map includes proxy/API version, URL route, item upgrades, transcript/enrichment/embedding pipelines, instrumentation, release tool, and backfill. Dynamic recycled-node/property and barrier tests are named. | Plan `Proposed File Map`, `Test Strategy` |
| ARCH0-P0-1 through ARCH0-P0-8 | Initial architect P0 set | Accepted | Environment, dedicated route, exact caller/version, stale writer CAS, overlap traversal, atomic receipt transaction, processing boundary, and AI-off note requirements are all normative. | PRD2-F06-F23; plan architecture/auth/algorithm/transaction/revision/hold sections |
| ARCH0-P1-1 through ARCH0-P1-5 | Initial architect P1 set | Accepted | Limits, active-source index, identifier-free logs, full identity pin, and scroll restoration are final requirements. | Shared constants, migration, diagnostics, identity/algorithm sections |
| AR-PRD-P1-3, AR-PLAN-P1-4 | Lab destination/manifest lifecycle was incomplete | Accepted | Separate disposable lab DB/data root, max seven-day target retention, exact versions/extension, decision references, worker mode, cleanup, diagnostics, and backup acknowledgement added. | PRD private gate; plan private manifest/Phase 0 |
| AR-PRD-P2-1, AR-PLAN-P1-4 | Manifest/copy needed machine-checkable execution details | Accepted | Exact copy version and full manifest schema are server-validated; stale/invalid reload fail-closes. | PRD UX/private gate; plan manifest/schema tests |
| AR-PRD-P2-2 | Server-only metric denominator hid inspect failures | Accepted | Content-free local canary outcome count is a separate denominator; no remote pre-confirm telemetry. | PRD metrics; plan operational report |
| AR-PLAN-P3, AR-PRD-P3, TA-P3 | Reviewer explicitly found no low-severity issue | No finding | Recorded for completeness; no action required. | Source review sections |

## Explicit Final Decisions

1. Distinct `browser_visible_transcript` provenance is added now; reusing `lab_public_caption` would obscure source truth.
2. Link-only context-menu behavior is included because the label creates the same product promise.
3. Live V0.1 uses a separate data root/DB and disabled background workers, even though DB holds/revision checks also exist.
4. Optional notes are AI-off and no different-content overwrite exists.
5. Conflict requests get a durable replayable receipt but do not mutate item/source/note/derived content.
6. Request receipts cascade with item deletion in V0.1; retry after deletion is a fresh request context.
7. Shorts, multi-language active sources, replacement, automatic panel opening, processing-hold release, Store distribution, and production remain future decisions with explicit no-go status.

## Final Review Outcome

- V2 planning package: **go**.
- Synthetic fixtures and local E2E from V2: **go after implementation gates are built**.
- Retained live canary: **conditional go only after every Stage 0 and Phase 0-5 gate**.
- Production browser-visible transcript capture: **no-go**.
