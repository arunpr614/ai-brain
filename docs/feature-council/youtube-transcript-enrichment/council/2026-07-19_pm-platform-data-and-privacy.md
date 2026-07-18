# Platform, Data, and Privacy PM Decision — YouTube Transcript Enrichment

**Date:** 2026-07-19<br>
**Decision owner:** Independent PM, Platform / Data / Privacy<br>
**Recommendation:** **Defer**<br>
**Scope:** Decision record and evidence-based revalidation bar; not a production plan

## Decision

Defer any product implementation or expansion of YouTube transcript enrichment. The evidence supports retaining the isolated rejection controls and publication-safe research package, but it does not support a production claim for acquisition, enrichment, or the current shipping route.

This is not a rejection of every future authorized transcript workflow. It is a stop at the present evidence boundary: Gate 1 failed its locked reliability threshold, Gates 3–5 did not run, Gate 6 found material production gaps, and the five-item eligible sample is screening-affected and under-powered. The current route also lacks enforceable rights, lifecycle, network-safety, normalized-data, and operational controls. A fresh decision is eligible only after every applicable exit criterion below is met with prospective evidence.

## Evidence boundary

This assessment uses only the publication-safe [Gate 1](../decisions/GATE_1.md), [Gate 2](../decisions/GATE_2.md), [Gate 3](../decisions/GATE_3.md), [Gate 4](../decisions/GATE_4.md), [Gate 5](../decisions/GATE_5.md), and [Gate 6](../decisions/GATE_6.md) decisions plus the publication-safe audit, research, lifecycle, and risk records linked below. It does not rely on private benchmark material or any other council/PM memo.

## Facts that control the decision

| Decision axis | Publication-safe evidence | Platform / data / privacy implication |
|---|---|---|
| Acquisition reliability | Gate 1 failed: **3/5 eligible first attempts** passed against an exact **5/5** threshold; truthful rejection controls passed **4/4**. YT-02 and YT-08 are immutable failures under that seal. | Rejection behavior is useful, but the exact supported class is not reliable enough. Successful rows cannot erase failed denominator cells. |
| Dependent evidence | Gate 2 was not triggered at **1/10 (10%)** versus both required trigger conditions. Gates 3–5 were not run. | There is no repeat reliability, deterministic normalization, enrichment quality, grounding, citation, latency/memory, structured-output, visual-value, or cross-hardware result. |
| Cost and capacity | Recorded incremental spend is **USD 0**; Gate 6 records zero external requests, provider calls, or inference. | USD 0 is a verified research fact, not a product cost, load, capacity, or supportability estimate. |
| Current product boundary | All three eligible Gate 1 successes still report `current_product.ready=false`. The shipping route lacks attestation, fail-closed parsing, lifecycle enforcement, recovery isolation, and complete normalized-contract persistence. | No isolated result may be promoted into current-product readiness. The existing automatic route must remain outside the supported claim. |
| Security and operations | Gate 6 retains eight concrete gaps: playlist fall-through, IPv4-mapped IPv6 handling, redirect revalidation, DNS pin/revalidation, overlong ID-prefix acceptance, scheduled-premiere state, unbounded live-caption retry lifetime, and unproven output sanitization across sinks. | The route lacks a defensible hostile-network/input boundary and truthful bounded failure behavior. |
| Rights and policy | Source/rights classifications are provisional private-research judgments. Technical success grants no caption-download, API-consent, storage, derivation, provider-transfer, or training permission. | Public availability, edit permission, file possession, or local processing does not create the required rights. Each source and each derived output needs an explicit allowed purpose. |
| Lifecycle | The schema stores a retention class, but no executor proves expiry/revocation across full text, segments, FTS, vectors, summaries, chat/RAG, jobs, logs, caches, exports, providers, or backups. | A database label is not enforcement. Whole-item deletion is useful but does not prove source-only revocation, in-flight cancellation, provider recall, or backup expiry. |
| Credentials | The OAuth client secret disclosed during exploration remains outstanding for owner revocation/rotation. No OAuth token was created and no API call occurred. | Rotation is mandatory before that client can enter any future OAuth design; it does not change the isolated sidecar result. |

The focused QA baseline of **194 passing mocked/unit tests across 28 suites** is valuable regression evidence, but it used test doubles and did not contact YouTube, use credentials, invoke a model, or exercise production. It therefore does not fill the missing gate evidence.

## Evidence-bound strategy assessment

### 1. Current automatic InnerTube/timed-text capture and recovery

The route is active/default-on unless disabled, uses an undocumented mechanism, can retain full timed-text artifacts, and does not create the policy/source/segment records required by the normalized model. Its recovery loop can extend after throttling without a hard lifetime budget. Network validation is not complete across redirects, DNS, caption hosts, and encoded private-address forms.

**Assessment:** Exclude this route from expansion and from any supported-class claim under the present posture. It was not validated by the isolated Gate 1 strategy, and its policy, lifecycle, security, and operations gaps are independently release-blocking.

### 2. Isolated, rights-screened, source-published VTT sidecar

This is the only strategy with real acquisition attempts. It ran in an isolated deny-network boundary with recovery/workers/providers disabled. Three eligible successes preserved tokens and anchors exactly; four malformed/unsupported/unknown-completeness controls rejected truthfully. Two eligible oracle failures nevertheless leave the fixed result at 3/5, below the exact threshold.

**Assessment:** Preserve it only as narrow research evidence. It does not validate SRT, arbitrary uploads, auto-captions, long-form or arbitrary public videos, market coverage, a general rights contract, or the shipping route. Even a future 5/5 result on five eligible items would remain under-powered and would establish only the prospectively declared class.

### 3. Official creator/editor-authorized YouTube captions API

The official path remains blocked/not run: zero tokens, calls, quota, and caption cells. The inspected web client lacked a configured redirect, no consenting editor-owned test video was established, and the consent, token, output-retention, tenant/identity-binding, and derived-data policy posture remains unresolved. One list-plus-download attempt is documented as 250 quota units, but no project quota or API enablement was verified.

**Assessment:** It is a possible future authorized class, not present evidence. Do not reconsider it until credential rotation, exact editor authorization, least-privilege consent, token lifecycle, output-by-output policy determination, and a fresh prospective request seal exist. It is not an arbitrary-public-caption path and may not fall back to unofficial extraction.

Local STT is not a fourth current option: Gate 2 did not trigger, no authorized comparison ran, and no tool ranking or product claim exists.

## Current product and data boundary

Until revalidation closes the criteria below:

- Keep arbitrary public caption acquisition, unofficial extraction, private/deleted/live/scheduled video classes, production SRT, owned-media STT, local enrichment, and visual enrichment outside the supported evidence claim.
- Do not use cookies, private-video access, proxies, alternate identities, access-control workarounds, or an arbitrary-fetch fallback.
- Treat every transcript as untrusted data, not instructions; do not allow transcript text to select tools, reveal secrets, or authorize external transfer.
- Do not infer legal/policy approval from technical access, source publication, creator edit permission, or local execution.
- Do not send transcript-derived material to an external model without separate affirmative consent and a provider-specific retention/training/region posture.
- Preserve only publication-safe hashes, counts, states, and synthetic/rejection fixtures. Complete transcripts, normalized outputs, databases, scorer options, and raw logs remain private, must never enter Git/Wiki/PR artifacts, and must be deleted no later than **2026-10-14**.

## Revalidation exit criteria

All applicable criteria are conjunctive. Passing one category cannot compensate for a failure or a not-run result in another. These are evidence requirements for reopening the decision, not an implementation sequence.

### A. Rights, platform policy, and consent

1. Freeze a fresh, rights-reviewed method×item matrix before results. For every eligible item, record principal, authority role, source class, exact asset/hash, underlying-content and transcript rights bases, allowed storage/normalization/quotation/derivation/embedding/provider-transfer uses, attribution, expiry/deletion trigger, acceptance time, and policy version.
2. Obtain a written product/legal-policy determination for the exact acquisition method and every retained or derived output: raw file, normalized text, segments, quotes, summaries, chapters, tags/entities, embeddings, indexes, model prompts/outputs, metrics, logs, exports, and backups. Any unresolved output fails closed.
3. Prove that every accepted transcript persists an allowed decision, attestation/audit event, source, normalized segments, explicit completeness, retention state, and first-class processing version—or returns an explicit rejected/metadata-only/unsupported state.
4. Keep the current unofficial route outside the supported method. Any later official API test must use only `captions.list` plus an explicit `captions.download` track for a consenting identity permitted to edit the exact video, with no translation, scraping, or fallback.

### B. Credential and identity safety

5. Before any OAuth reconsideration, the credential owner must revoke/rotate the disclosed client secret and record non-secret evidence of completion. No replacement secret, client identifier, token, or local credential path may enter chat, Git, Wiki, logs, or result artifacts.
6. A fresh least-privilege client must have an exact redirect allowlist, API enablement/quota evidence, contextual disclosure and consent, CSRF state and PKCE where applicable, user/channel/tenant binding, encrypted token storage, expiry/refresh/revocation behavior, and a post-test token revocation check.
7. Prove negative identity boundaries: a token from another user/channel/tenant, an expired/revoked token, a mismatched redirect, or a non-editor video must be rejected without fallback or data persistence.

### C. Privacy, network, and hostile-input safety

8. Close all eight Gate 6 gaps with executable negative tests, including explicit playlist rejection, strict video-ID length, shared live/scheduled-premiere states, a hard live-caption retry lifetime, and end-to-end transcript sanitization at every render/export sink.
9. Prove scheme/host/port allowlists, validation of every redirect hop, DNS resolution pinning/revalidation at connect and redirect time, complete IPv4/IPv6 private/special-range handling, caption-host restrictions, and DNS-rebinding resistance. Every denied case must make zero internal/private-network requests.
10. Enforce and test pre-buffer request limits, streaming/file/cue/duration bounds, response and decompression caps, fatal UTF-8, finite safe timestamps, zero silent cue loss, and fail-closed completeness. Oversize or malformed mixed input must not leave partial normalized, indexed, or enriched state.
11. Run hostile transcript cases for instruction override, secrets/tools/exfiltration-looking text, HTML/Markdown, timestamp deception, repetition, bidi/Unicode, and extreme size. Prove inert treatment through storage, prompting, logs, UI, export, and deletion.
12. For any local-only path, produce executable deny-network evidence and zero-transfer counters. For any external provider path, first prove separate consent plus exact provider, region, retention/training/ZDR posture, request identity, routing/no-fallback, and deletion terms.

### D. Data lifecycle and deletion

13. In a disposable database, enumerate the complete source graph before import, after import, after enrichment/indexing, immediately after source-only revocation, after whole-item deletion, and at the declared backup-expiry boundary. Every expected copy must be zero or explicitly retained under an approved rule.
14. The graph must cover raw uploads/artifacts, `items.body`, policy/source/segments, FTS, chunks/vectors, summaries/quotes/tags/topics, jobs/results, chat/RAG messages and citations, caches, logs, exports, provider copies, and backups. Prove that a transcript can be revoked while its metadata-only item is retained.
15. Prove expiry-driven deletion, immediate cancellation/isolation of in-flight workers, late-result rejection, no re-creation after deletion, and separately bounded backup expiry. Provider recall/deletion evidence is mandatory if provider transfer is ever enabled.
16. By **2026-10-14**, produce a publication-safe deletion attestation for all expiring private research material. Any revalidation after that date or after a relevant YouTube/API/tool/product change requires fresh inputs and a fresh seal; expired private material may not be silently reused.

### E. Reliability, operations, and truthful accounting

17. Under a fresh prospective seal, Gate 1 must pass every declared eligible first attempt at the exact threshold (**5/5 for the current narrow design**) and preserve truthful rejections (**4/4**). No retry, replacement, denominator removal, or manual promotion may repair a failed primary cell.
18. A Gate 1 pass is necessary but insufficient. Gate 3 must then execute and pass every declared deterministic repeat. Gate 4 must actually run before any claim about quality, grounding, citations, schema reliability, latency, memory, or capacity; Gate 5 must remain not run unless its prospectively locked trigger becomes eligible.
19. Prove hard per-request and lifetime budgets, bounded retry/backoff, truthful terminal/manual states, provider deadlines, durable leases/idempotency, late-result rejection, and multi-process/restart behavior. A telemetry failure must reconcile without repeating a completed external generation.
20. Persist truthful, atomic provider/model/route/request/token/price records. Measure long-item CPU, memory, storage, latency, failure behavior, and cross-hardware variance; replace the USD 0 research fact with a bounded capacity and cost envelope before any product economics claim.
21. Before any broader supported-class claim, run a separately authorized, prospectively sized corpus with predeclared classes and denominators, a documented sample-size rationale, screening attrition disclosure, and stakeholder review. Five eligible VTTs cannot establish SRT, arbitrary-public, long-video, auto-caption, language, hardware, or market coverage.

## Reopening rule

The recommendation remains **Defer** while any applicable criterion is failed, unresolved, expired, or not run. In particular, a narrow Gate 1 pass alone does not reopen a product decision; current-product controls, lifecycle proof, dependent gate evidence, operational bounds, and a fit-for-claim corpus must also exist. Any future council should consume the complete denominator and explicit unsupported classes rather than infer missing evidence from successful rows.

## Publication-safe evidence references

- [Gate 1 — Compliant transcript acquisition](../decisions/GATE_1.md)
- [Gate 2 — Speech-to-text fallback](../decisions/GATE_2.md)
- [Gate 3 — Transcript quality and deterministic normalization](../decisions/GATE_3.md)
- [Gate 4 — Enrichment quality and grounding](../decisions/GATE_4.md)
- [Gate 5 — Visual value](../decisions/GATE_5.md)
- [Gate 6 — Cost, reliability, security, policy, and product fit](../decisions/GATE_6.md)
- [Focused audit synthesis v2](../audit/2026-07-16_focused-audit-synthesis_v2.md)
- [Current processing flow](../audit/CURRENT_PROCESSING_FLOW.md)
- [Provider inventory](../audit/PROVIDER_INVENTORY.md)
- [QA baseline](../audit/QA_BASELINE.md)
- [Transcript data lifecycle audit](../audit/TRANSCRIPT_DATA_LIFECYCLE.md)
- [Research recommendation v2](../research/2026-07-16_transcript-tool-research-recommendation_v2.md)
- [OAuth feasibility note](../research/2026-07-16_youtube-data-api-oauth-feasibility.md)
- [Compliance matrix](../research/COMPLIANCE_MATRIX.md)
- [Transcript-derived output compliance matrix](../research/OUTPUT_COMPLIANCE_MATRIX.md)
- [Risk register](../technical/RISK_REGISTER.md)
