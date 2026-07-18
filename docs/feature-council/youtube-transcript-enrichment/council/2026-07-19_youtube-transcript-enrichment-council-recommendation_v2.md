# YouTube Transcript and Enrichment Council Recommendation v2

**Council date:** 2026-07-19<br>
**Final recommendation:** **Defer** any future exact-class research until separately authorized; **No-go / not approved** for the current automatic route and any present supported-product claim<br>
**Evidence-specific status:** Research complete — not implemented<br>
**Tested scope:** A1 local source-published, rights-screened VTT sidecar ingestion; five eligible positives and four rejection controls from a ten-item rights-reviewed corpus<br>
**Protocol / seal:** protocol `2.4`; lock schema `1.4`; Commit A `6b829798101a59fadd9a1d0efd65428539f400ad`; Commit B `0ed1b13729802f4ded921f1a94369ddc110dabc3`; lock SHA-256 `bef4437a05ac20418a49f3c06a99a1f74ad93c9395dcc780d1c0307aa354b8c3`<br>
**Execution runtime:** Node `22.22.3`; V8 `12.4.254.21-node.56`; macOS arm64; no enrichment model or provider was invoked<br>
**Verified:** 2026-07-19<br>
**Decision and evidence expiry:** 2026-10-14, or earlier after any material product, method, API, policy, model, source-rights, corpus, or cost change<br>
**Review chain:** [v1](2026-07-19_youtube-transcript-enrichment-council-recommendation_v1.md) → [independent adversarial review](2026-07-19_youtube-transcript-enrichment-council-recommendation_adversarial-review.md) → this reconciled v2

## Final decision

The council makes two deliberately separate decisions:

1. **Current automatic YouTube capture/recovery route: No-go / not approved.** The research does not approve that route for continued exposure, expansion, or any current claim that YouTube transcripts are supported. It uses a different, compliance-unresolved acquisition boundary and lacks the tested attestation, fail-closed parser, lifecycle, recovery-isolation, and complete normalized-persistence controls. This research council has no authority to change production behavior, so the route remains an explicit product-owner and security/legal-policy decision rather than an implied approval by inaction.
2. **Future exact-class research: Defer.** A new, separately authorized research package may reconsider a precisely declared class. The present decision and its revalidation criteria do not authorize production implementation, pre-production control work, a new experiment, or a rollout. Any such work needs its own written scope and authority before it begins.

Gate 1 failed at **3/5 eligible first attempts**, below the exact required **5/5**, while all **4/4** rejection controls behaved truthfully. Gate 2 did not trigger. Gates 3–5 did not run under the stop rules. Gate 6 completed with **18 narrow passes, 8 known gaps, and 7 not-applicable checks**, plus exact local suites at **5/5** and **11/11**. These results cannot support Go or Limited-go.

All three independent PM roles recommended Defer:

- [User Value and Engagement](2026-07-19_pm-user-value-and-engagement.md)
- [Knowledge, Learning, and Recall](2026-07-19_pm-knowledge-learning-and-recall.md)
- [Platform, Data, and Privacy](2026-07-19_pm-platform-data-and-privacy.md)

No PRD, UX/UI package, prototype, or technical implementation plan is applicable under this outcome.

## Exact evidence boundary

| Authority or evidence | What it establishes | What it does not establish |
|---|---|---|
| Verified two-commit seal | Identity, chronology, direct A→B ancestry, and protected-tree integrity for the prospective inputs frozen at Commit A and sealed at Commit B | Integrity or correctness of later result narratives, private receipts, council documents, or other post-seal publication files |
| Gate 1 claims and terminals | The fixed nine-cell first-attempt outcome: eligible 3/5, rejection controls 4/4, no retry/replacement/removal | Automatic YouTube acquisition, caption/audio accuracy, broad VTT/SRT reliability, or current-product readiness |
| Scoped machine counters and spend ledger | Under the machine-defined Gate 1–5 primary-execution boundary and its stated exclusions: zero observed primary external/API/provider/model calls and USD 0 incremental spend | A universal network-safety claim, production economics, or per-cell safety evidence for the two opaque failures |
| YT-02 and YT-08 terminals | Both are immutable `A1_OPERATOR_ORACLE_FAILED` eligible failures with harness exit `1`, no scorer, and no retry | Root cause or a per-cell zero-network proof; their publication-safe terminals intentionally omit per-cell network counters and are not safety passes |
| Gate 6 evaluator and exact suites | 18 narrow control passes, 8 named gaps, 7 not-applicable fixture rows, and exact local suite results of 5/5 and 11/11 | Production safety/readiness, closed lifecycle enforcement, or applicability to an untested strategy |

The A1 result is **primary local sidecar ingestion and input-preservation evidence for the exact sealed class**. Its three successful cells each achieved `1.00` token preservation and `1.00` anchor match. Those scores are not WER, audio-relative timestamp accuracy, source-byte equivalence to YouTube, or automatic caption acquisition evidence.

Post-seal result and council artifacts are governed separately from the input seal. Before delivery, they must be committed in later Git history, schema- and link-checked, privacy-scanned, and verified against the unchanged seal. That later validation makes the publication package auditable; it does not retroactively place the results inside Commit B.

## Gate decisions

| Gate | Final state | Consequence |
|---|---|---|
| [Gate 1](../decisions/GATE_1.md) | **Fail:** eligible 3/5; rejection controls 4/4 | The exact local-sidecar class did not meet its prospective first-attempt reliability threshold |
| [Gate 2](../decisions/GATE_2.md) | Not triggered / Not run: 1/10 and 10% | No STT/media execution or speech-accuracy evidence |
| [Gate 3](../decisions/GATE_3.md) | Ineligible / Not run | No repeat-determinism result or generated Gate 3 output |
| [Gate 4](../decisions/GATE_4.md) | Blocked / Not run | Zero model inference; no enrichment, grounding, citation, schema-reliability, latency, memory, or capacity result |
| [Gate 5](../decisions/GATE_5.md) | Not triggered / Not run | No visual trigger or incremental-value measurement |
| [Gate 6](../decisions/GATE_6.md) | Complete with material gaps | Useful narrow controls; production safety/readiness did not pass |

## Strategy dispositions

### 1. Current automatic public-video capture and recovery

**No-go / not approved for current exposure, expansion, or a supported claim.** It was not the Gate 1 strategy. It uses an undocumented/compliance-unresolved acquisition path, can couple ordinary handling to recovery, and lacks complete URL/network, rights, lifecycle, and normalized-data controls. The product owner and security/legal-policy owners must explicitly decide how to handle the already-active route; this research result must not be treated as permission to leave it unchanged.

### 2. Rights-screened source-published VTT supplied locally

**Defer; retain only as a future research hypothesis.** This is the sole strategy with primary local-sidecar ingestion and preservation attempts. Three eligible successes and four truthful rejections are useful signals, but two of five eligible first attempts failed opaquely. The sample is screening-affected and too small for a broad claim. It does not validate SRT, arbitrary uploads, automatic YouTube access, source/audio equivalence, other length/language/encoding classes, or a shipping experience.

### 3. Official creator/editor-authorized captions API

**Blocked / Defer separately.** No token was created and no API call ran. This path would require a rotated credential, an exact consenting editor-owned class, least-privilege consent, identity/tenant binding, track selection, quota/redirect readiness, token revocation, output-by-output rights/policy review, retention/deletion enforcement, and a fresh prospective seal. It is not an arbitrary-public-caption strategy and may not fall back to unofficial extraction.

Owned-media STT and visual enrichment are not additional present strategies: Gate 2 did not trigger, and Gate 5 had no valid Gate 4 baseline.

## Council agreement and actual differences

The three PM roles unanimously reject Go and Limited-go. They agree that:

- successful cells cannot erase YT-02 and YT-08 or alter the five-cell denominator;
- 4/4 truthful rejection is the strongest reusable signal but cannot compensate for eligible unreliability;
- no claim about deterministic normalization, enrichment, grounded recall, visual value, latency, memory, capacity, product economics, or adoption can be drawn from a not-run gate;
- technical access is not rights, consent, policy, or legal approval;
- current-product readiness is not implied by an isolated deny-network harness; and
- any future decision must use a fresh prospective package rather than repair, retry, replace, or pool the failed cells.

The manually supplied VTT idea is a **considered alternative not adopted by any voting role**, not a minority vote. The real differences concern what future evidence should control: User Value emphasizes import comprehension and trust; Knowledge/Recall emphasizes timestamp-grounded retrieval and abstention; Platform/Data/Privacy emphasizes rights, identity, network, lifecycle, and operational enforcement. The revalidation bar below reconciles those differences rather than implying consensus on an unrecorded release option.

## Revalidation bar

Every applicable item is conjunctive. A failure, unresolved state, expired input, missing human review, unexplained applicability waiver, or not-run result preserves Defer. These are evidence requirements for a future council, not authorization or an implementation sequence.

### 1. Separate authority and prospective freeze

- Obtain explicit, separately scoped authorization before any new experiment, pre-production control work, product-boundary change, OAuth exercise, or provider transfer. The present decision authorizes none of them.
- Before observing results, freeze the intended supported class, rights basis, corpus/strata, exact denominator, screening/attrition rules, scorers, runtime, counters, failure taxonomy, applicability matrix, human-review process, and analysis plan in a fresh two-commit seal.
- Keep YT-02 and YT-08 immutable. Do not retry them, replace them, repair them, remove them, or pool them into a new seal.

### 2. Reliability and diagnosability

- For the current narrow design with fewer than ten eligible positives, retain the frozen protocol rule of **100% first-attempt success**—the current form is 5/5—and **100% truthful rejection controls**, with no repair, retry, replacement, promotion, or denominator removal.
- For a separately authorized design with ten eligible positives, retain the frozen protocol's **at least 90% first-attempt** threshold unless the intended product SLO and a prospectively documented sample-size/confidence rationale justify a stricter bar. Never choose a threshold after observing results or silently generalize outside the declared class.
- Emit privacy-safe per-cell diagnostics under a frozen taxonomy that distinguishes input/parser, oracle, process, sandbox, timeout/signal, resource, persistence, and accounting failures without exposing transcript content. An unexplained primary failure remains a failure and cannot support a safety claim.

### 3. Rights, credentials, and lifecycle

- Obtain the required product/legal-policy determination for the exact acquisition method and every retained or derived output, including source files, normalized text/segments, quotes, summaries, chapters, tags/entities, embeddings/indexes, prompts/outputs, metrics, logs, exports, and backups. Any unresolved purpose fails closed.
- The credential owner must revoke/rotate the disclosed OAuth credential before any future OAuth design and retain only non-secret evidence of completion. Never publish an old or replacement secret, token, client identifier, or local credential path in chat, Git, Wiki, PR, logs, or evidence.
- Prove source-only revocation, whole-item deletion, in-flight cancellation, late-result rejection, provider recall where applicable, and separately bounded backup expiry across the complete lifecycle inventory.
- Produce a publication-safe deletion attestation for the private research database, normalized outputs, scorer options, receipts/evidence, raw logs, caches, transcript material, and derivatives no later than **2026-10-14**. Private material must never enter Git, Wiki, or the pull request.

### 4. Security and product-boundary applicability

- Freeze a strategy-specific applicability matrix for every Gate 6 gap and product boundary before execution. Each control must be closed with executable evidence or proven unreachable/removed for the exact strategy. An unexplained `not applicable` preserves Defer.
- Where applicable, prove explicit attestation, fail-closed parsing, complete normalized persistence, recovery isolation, retention/derivation enforcement, strict host/video-ID parsing, redirect and DNS revalidation, complete private/special-address blocking, hard request/resource/retry lifetime budgets, and end-to-end render/export sanitization.
- Treat transcript content as inert untrusted data across storage, prompts, logs, UI, exports, and deletion. No transcript instruction may select tools, disclose secrets, or authorize transfer.
- Evidence from an actual product or pre-production boundary is eligible only when the work that created it had separate prior authorization. The criteria themselves do not authorize that work.

### 5. Dependent technical and human-reviewed quality gates

- Gate 3 must run over its complete fresh denominator and prove identical normalized hashes/counts/order/anchors across repeats, explicit completeness/provenance/version/error state, and zero unreported cue loss.
- Gate 4 must meet its frozen bars: schema validity at least 90% on first attempt and 100% after the one permitted format-only retry; material-claim support at least 95% pooled and macro per item; zero critical hallucinations; timestamp-citation accuracy at least 90% pooled and macro; and text-groundable key-point coverage at least 80% pooled and macro.
- Two blinded AI evaluations and adjudication remain provisional. A predeclared human-stakeholder review must independently confirm the qualitative findings before any product-value claim; same-model evaluator bias and all disagreements must remain visible.
- Gate 5 must be resolved only from a valid sealed Gate 4 baseline. If its locked trigger does not fire, the supported claim must remain transcript-only and exclude visually dependent meaning.

### 6. User, learning, and recall value

Use a prospectively sized intended-user study and a separately frozen human-labeled recall set. At minimum:

- at least 80% of eligible participants complete import/attestation without facilitator correction;
- at least 90% correctly distinguish supported, rejected, partial, and unsupported states;
- zero participants interpret a rejected or partial result as complete;
- median time to locate and verify a spoken claim improves by at least 20% over the current item-level experience without reducing answer accuracy;
- a predeclared majority of eligible participants choose to use the workflow on a second qualifying item, with failures/non-users retained in the denominator;
- macro top-3 timestamp-hit accuracy is at least 90%, support for material answer claims at least 95%, critical unsupported claims zero, and correct abstention on unanswerable controls 100%; and
- median time to reach the supporting source in the recall task improves by at least 25% relative to the current item/chunk baseline without reducing answer correctness.

### 7. Operations and economics

Before any run, freeze numeric pass/fail ceilings and target hardware for end-to-end latency, peak memory, storage, failure/retry rate, long-item behavior, concurrency/capacity, operator/support burden, and per-item/provider cost. Tie them to an approved product SLO and capacity model, preserve every failure in the denominator, and report hardware/runtime variance. The verified USD 0 research spend is not a production budget or estimate.

### 8. Freshness and final authority

- Revalidate no later than **2026-10-14**, and earlier after any material product, method, API, policy, model, source-rights, corpus, runtime, or cost change.
- Before publication, commit and privacy-scan the complete public result package, validate its schemas and links, verify the unchanged input seal, reconcile the mutable navigation/status authorities, and retain a review-only delivery boundary.

## Residual risks

Even after this reconciliation, YT-02 and YT-08 remain publicly unexplained; the current automatic route's production state is outside this branch's control; the local-sidecar class remains screening-affected and under-powered; Gates 3–5 provide no value or resource evidence; all rights/output-policy judgments remain provisional; lifecycle enforcement is unproven; eight Gate 6 gaps remain; and non-secret credential-rotation/private-data-deletion attestations still depend on owner action.

## Final council conclusion

**No-go / not approved for the current automatic route or any present supported-product claim. Defer any future exact-class research until separately authorized and prospectively frozen.** Preserve the prospective seal, the complete Gate 1 denominator, the truthful rejection evidence, the stop-rule record, and the Gate 6 gaps as research history. Do not create downstream product artifacts, merge, deploy, or infer approval from the existence of revalidation criteria.
