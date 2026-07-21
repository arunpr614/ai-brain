# Focused YouTube Ingestion and Enrichment Audit — Adversarial Review

**Reviewed artifact:** `2026-07-16_focused-audit-synthesis_v1.md`<br>
**Reviewer:** Fresh independent AI architecture/security/QA reviewer<br>
**Review date:** 2026-07-16<br>
**Method:** Read-only comparison with code, tests, Wiki, Git history, and recorded production evidence; no live transcript/model experiment

## Verdict

The v1 direction was sound, but it was not ready to become the final audit. It overstated the consistency and enforcement of the normalized path, understated retry/data-lifecycle risks, and stated one concurrency risk too categorically. All findings below are accepted into v2.

## Findings and required corrections

| ID | Severity | Finding | Required v2 correction |
|---|---|---|---|
| AR-01 | P1 | “Manual path” was overbroad. Inline YouTube URL capture with user text writes only item body/artifact; only the dedicated transcript repair API writes policy/source/segments. | Distinguish automatic legacy capture, inline user-text capture, and dedicated repair. |
| AR-02 | P1 | Current user transcript repair assigns a `user_provided_transcript` rights basis but collects no explicit rights attestation in API or UI. | Describe a caller-supplied provenance label, not verified/attested rights; require future attestation. |
| AR-03 | P1 | Retention class is stored but no runtime enforcer gates storage lifetime, deletion, export, indexing, or enrichment-provider disclosure. | Call retention declarative and require enforcement across the full data lifecycle. |
| AR-04 | P1 | A nominal five-attempt transcript job can have `max_attempts` raised to `attempts + 3` after every throttled result. | Elevate to an unbounded lifetime external-request loop; require hard lifetime and request budgets. |
| AR-05 | P1 | Generated item/tag/topic state commits before usage telemetry. A telemetry write failure can make the worker repeat an already successful generation. | Require atomic result/usage persistence or a non-generating reconciliation state. |
| AR-06 | P2 | Superseded transcript sources retain tombstone metadata but their segments are deleted and `segment_count` can become stale. | Do not call this full version history; record rollback/comparison/reprocessing limits. |
| AR-07 | P2 | Indefinite remote-call stall is confirmed, but duplicate overlap needs another process or restart race because one worker cannot sweep while awaiting its own call. | Apply timeout finding to remote providers; label duplicate concurrency as a tested-risk inference. |
| AR-08 | P1 | IPv4-mapped IPv6 handling is incomplete; current tests do not cover hexadecimal mapped private/link-local/CGNAT variants, redirects, or DNS rebinding. | Narrow the current-control claim and expand the required security matrix. |
| AR-09 | P2 | “Bounded inputs” are enforced after `req.json()` or `req.formData()` materializes the request. | Require proxy/framework caps, `Content-Length` preflight, streaming limits, and oversize tests. |
| AR-10 | P2 | Processing/parser version data exists in some provenance JSON, but is inconsistent, untyped, and absent for paste. | Describe inconsistent versioning, not universal absence. |
| AR-11 | Scope | The v1 P0 said it blocked any YouTube transcript proposal. | Scope the P0 to shipping the active automatic InnerTube path unchanged; restricted authorized strategies remain eligible for gates. |

## Evidence highlights

- Inline user text: `src/lib/capture/capture-url.ts:43-52`; `src/lib/capture/youtube-user-text.ts:15-68`; `src/app/api/capture/url/route.ts:316-354`.
- Missing attestation: `src/app/api/capture/transcript/route.ts`; `src/app/items/[id]/repair/repair-form.tsx`; automatic policy assignment at `src/lib/capture/policy.ts:119-142`.
- Declarative retention: migration `018_transcript_policy_sources.sql`; unconditional enrichment at `src/lib/enrich/pipeline.ts:153-198`.
- Retry extension: `src/lib/queue/transcript-worker.ts:322-348`; `src/db/transcript-jobs.ts:464-514`.
- Result/usage split: `src/lib/enrich/pipeline.ts:219-260`; worker failure handling at `src/lib/queue/enrichment-worker.ts:170-208,233-267`.
- Tombstone history: `src/db/transcripts.ts:202-210,288-291`; `src/lib/capture/transcripts/user-provided.test.ts:239-244`.
- Post-parse input bounds: `src/app/api/capture/transcript/route.ts:70-89,134-164`; `src/app/api/transcripts/owned-media/route.ts:20-59`.

## Resolution

All eleven findings are incorporated in `2026-07-16_focused-audit-synthesis_v2.md`. The original v1 remains preserved as the reviewed decision draft.
