# Independent PM Review — Knowledge, Learning, and Recall

**Review date:** 2026-07-19<br>
**Perspective:** Knowledge quality, learning utility, provenance, and reliable recall<br>
**Recommendation:** **Defer**<br>
**Observed incremental spend / external activity:** **USD 0**; no provider, model-inference, media-download, OAuth/API, or primary external acquisition calls<br>
**Scope boundary:** Publication-safe Gate 1–6 decisions and their supporting audit/research record only. This is a product decision, not a production plan or legal/policy approval.

## Decision

I recommend **Defer**.

There is a credible but narrow research signal: three source-published VTT cells preserved tokens and timestamp anchors exactly, and all four rejection controls failed truthfully. That signal does not establish a dependable knowledge substrate. Gate 1 failed at **3/5 eligible first attempts**, Gates 3–5 did not run, and Gate 6 records material product, security, lifecycle, and reliability gaps. The five-item eligible set is screening-affected and under-powered.

The current shipping product is outside the tested boundary and remains not ready. It does not enforce the sealed attestation contract, use the sealed fail-closed parser, enforce retention and derivation rules at runtime, isolate ordinary YouTube handling from legacy recovery, or persist the complete normalized transcript contract. Its retrieval experience is item/chunk based rather than transcript/timestamp based. Consequently, neither timestamped learning quality nor incremental recall value has been demonstrated.

Deferral is warranted rather than permanent rejection because the exact preservation successes and truthful rejection behavior justify a fresh, prospective validation of a narrowly declared source-published-sidecar class. They do not justify a release, a limited release, or expansion of automatic public-video transcript behavior.

## Evidence boundary

| Evidence | Publication-safe result | Knowledge/recall implication |
|---|---|---|
| [Gate 1](../decisions/GATE_1.md) | **Fail:** 3/5 eligible first attempts; 4/4 rejection controls | Exact preservation on three successes is useful feasibility evidence, but two scoreless oracle failures remain failures in the fixed denominator. No supported acquisition class is established. |
| [Gate 2](../decisions/GATE_2.md) | Not triggered / not run; 1/10 met both trigger booleans | No STT transcript, word-error, audio-relative timestamp, or diarization evidence exists. |
| [Gate 3](../decisions/GATE_3.md) | Ineligible / not run | There is no repeat-run determinism result and no basis to promote Gate 1 preservation into a normalized-contract claim. |
| [Gate 4](../decisions/GATE_4.md) | Blocked / not run; zero inference | There is no evidence for summaries, claims, chapters, structured output, grounding, citation accuracy, hallucination control, coverage, latency, or memory. |
| [Gate 5](../decisions/GATE_5.md) | Not triggered / not run | Visual-only knowledge loss and incremental visual value are unknown. |
| [Gate 6](../decisions/GATE_6.md) | 18 narrow passes, 8 known gaps, 7 not applicable; readiness not passed | The safety evidence supports narrow rejection behavior, not a production knowledge or recall claim. |
| Cost | USD 0 and zero external/provider activity | This proves research-spend containment only. It is not a production cost, capacity, latency, or total-cost estimate. |

## Knowledge, learning, and recall assessment

### Timestamped knowledge quality

The strongest result is exact token and anchor preservation (`1.00` / `1.00`) on each of the three successful eligible cells. That is necessary for timestamped learning but insufficient for trust. Two eligible cells produced no scorer result, Gate 3 never tested repeat determinism, and Gate 4 never tested whether generated claims point to the correct evidence. The successful rows therefore cannot be generalized to arbitrary videos, SRT, auto-captions, long-form content, other hardware, or even the full five-item eligible class.

The shipping enrichment path is weaker than the proposed experience requires: it consumes only the first 12,000 characters of a composed item body and performs structural, not evidentiary, validation. It has no timestamp-citation contract. The [focused audit](../audit/2026-07-16_focused-audit-synthesis_v2.md) accordingly establishes no long-video coverage or grounded-learning claim.

### Provenance and knowledge durability

The isolated strategy binds exact source-published bytes to a source row and tests fail-closed parsing with no egress. The shipping product has three inconsistent transcript semantics: automatic capture/recovery, inline pasted text, and dedicated repair. Only the last writes the newer policy/source/segment model, and even there the rights and retention fields are assertions rather than collected and enforced authority.

The [data-model audit](../audit/DATA_MODEL_SUMMARY.md) also shows that normalized segments lack first-class speaker, processing version, completeness/partial status, and segment-level error provenance. Supersession retains a source tombstone but deletes prior segments, so it is not full knowledge history. The [lifecycle audit](../audit/TRANSCRIPT_DATA_LIFECYCLE.md) does not prove source-specific revocation across body text, search, vectors, generated outputs, chat, logs, caches, exports, backups, or in-flight work. A recall result without this lineage would be difficult to verify, correct, or forget reliably.

### Recall value

Current FTS, embeddings, Ask, and Related can recover an item or generic chunk, but transcript segments are not indexed as first-class retrieval units. Results have no stable source/timestamp range, displayed timestamps are not seek links, and there is no search-within-transcript. This is a foundation for item recall, not evidence of timestamped video recall.

No executed experiment compares the proposed experience with the current item/chunk baseline. There is no measured answer accuracy, evidence-hit rate, time-to-source, learning retention, or user effort. Gate 4's prepared local model package is reproducibility context only; model availability is not knowledge quality or recall value.

### Failure truthfulness

Failure truthfulness is the clearest asset to preserve. Four of four malformed/unsupported controls were rejected as declared, the unavailable/retry suite passed 5/5, and the isolated integration suite passed 11/11. YT-02 and YT-08 remained immutable failures rather than being retried, replaced, or assigned inferred scores. This supports an honest `unsupported`, `incomplete`, or `manual-needed` product posture; it does not convert acquisition failure into safe success.

### Unsupported inferences to prohibit

- Do not infer support for a video class from the three successful cells or prevalence from the four rejected controls.
- Do not infer deterministic normalization from Gate 1 preservation; Gate 3 did not run.
- Do not infer grounded summaries, useful learning artifacts, citation accuracy, or low hallucination from a prepared model/runtime; Gate 4 made zero inference calls.
- Do not infer that visual knowledge is unnecessary; Gate 5 had no valid trigger measurement.
- Do not treat public availability, source publication, file possession, or editor status as permission for every stored or derived output. The [output compliance matrix](../research/OUTPUT_COMPLIANCE_MATRIX.md) keeps those outputs conditional or unresolved.
- Do not infer production economics from USD 0 research spend.
- Do not relabel the isolated sidecar strategy as automatic YouTube transcript acquisition or as readiness of the current product.

## Evidence-bound strategy assessment

### 1. Expand the current automatic YouTube capture and enrichment path

**Reject for the current decision.** It relies on a compliance-unresolved acquisition path, bypasses normalized policy/source/segment records, couples recovery to ordinary item handling, and retains the eight Gate 6 security/product gaps. It also cannot provide timestamp-native retrieval or grounded enrichment evidence. This strategy conflicts directly with the present product boundary.

### 2. Release only the narrow source-published-sidecar experience

**Reject for now.** This is narrower and more defensible than automatic public-video acquisition, but the evidence still fails its own 5/5 reliability threshold. The current product does not implement the isolated contract, and no executed gate proves repeat normalization, enrichment grounding, citation correctness, recall improvement, lifecycle enforcement, or capacity. Calling this a limited product would turn a strategy-feasibility signal into an unsupported readiness claim.

### 3. Preserve the research boundary and require fresh prospective revalidation

**Select.** Preserve the truthful rejection/synthetic-control evidence, keep automatic acquisition and untested enrichment outside the supported boundary, and revisit only after the exit criteria below are met under a new prospective seal. This retains the potential value of timestamped learning without manufacturing evidence that Gates 3–5 never produced.

## Exit criteria for revalidation

These are decision thresholds for a future review, not observed results or an implementation plan. The recommendation remains unchanged unless **all** applicable criteria pass.

1. **Adequate and prospective acquisition evidence.** Freeze the intended supported class, strata, corpus, rights basis, scorers, and sample-size/power rationale before any result. The eligible denominator must be materially larger than five and justified against the intended reliability claim. Require 100% first-attempt eligible success and 100% truthful rejection controls, with no retries, replacements, repairs, or removed cells; every failure must remain in the denominator.

2. **Deterministic, complete timestamp substrate.** Gate 3 must actually run over its full sealed denominator. Two independent normalizations of each eligible input must yield the same normalized hash, cue/segment count, ordering policy, and timestamp anchors, with zero unreported cue loss. Each accepted segment must resolve to an attested source, exact input hash, parser/processing version, completeness state, and explicit error state.

3. **Grounding and unsupported-inference control.** Gate 4 must actually run and meet its locked bars: at least 90% valid structured output on first attempts and 100% after the permitted format-only retry; at least 95% material-claim support pooled and macro per item; zero critical hallucinations; at least 90% timestamp-citation accuracy pooled and macro per item; and at least 80% text-groundable key-point coverage pooled and macro per item. Failures must be detectable without altering the transcript.

4. **Measured recall value.** On a prospectively frozen, human-labeled set containing fact lookup, concept recall, cross-segment synthesis, and unanswerable controls, require at least 90% macro top-3 timestamp-hit accuracy, at least 95% support for material answer claims, zero critical unsupported claims, and 100% correct abstention on the unanswerable controls. Against the current item/chunk baseline, require at least a 25% relative reduction in median time to reach the supporting source without lowering answer correctness.

5. **Transcript-native evidence navigation.** Demonstrate end to end that a recall hit resolves to the active transcript source and exact timestamp range, survives source/version checks, opens at the cited evidence, and becomes unavailable after source revocation. Item-only or free-floating chunk citations do not satisfy this criterion.

6. **Current-product boundary closed.** Verify in the shipping path—not only the isolated harness—explicit rights/retention attestation, fail-closed parsing, complete normalized-contract persistence, recovery isolation, and runtime enforcement over storage, enrichment, indexing, export, deletion, and provider transfer. Close all eight Gate 6 known gaps, including redirect/DNS validation, input classification/length, scheduled/live lifetime budgets, and render/export sanitization.

7. **Lifecycle and cost truthfulness.** A disposable-data test must prove source revocation and whole-item deletion across every known source and derived copy, with backup expiry tested separately. Measure exact local hardware/runtime, latency, memory, retry/failure rates, operational work, and any provider/storage cost. USD 0 may be reported only for the boundary actually measured.

8. **Freshness.** Revalidate tool, model, API, policy, source-rights, and product-baseline assumptions no later than **2026-10-14**, and earlier after any material change. Any changed input invalidates the affected prior claim rather than being patched into the old denominator.

## Final PM position

The opportunity is real: trustworthy timestamped evidence could materially improve learning and recall. The present evidence proves only a narrow preservation signal and unusually good failure honesty. It does not yet prove reliable acquisition, deterministic normalization, grounded learning artifacts, transcript-native recall, lifecycle-safe provenance, or production value. Maintain the current unsupported/not-ready boundary and return for review only with a fresh, adequately powered, end-to-end evidence package.
