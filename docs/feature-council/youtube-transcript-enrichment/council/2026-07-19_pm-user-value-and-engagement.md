# Independent PM Review — User Value and Engagement

**Review date:** 2026-07-19<br>
**Role:** Independent PM, User Value and Engagement<br>
**Recommendation:** **Defer**<br>
**Scope:** Publication-safe gate decisions and supporting audit/research evidence only. This review does not rely on private benchmark material or another council/PM opinion.

## Decision

Defer any new product claim, rollout, or expansion for YouTube transcript enrichment. The evidence does not yet establish the first link in the user-value chain—reliable transcript availability for a declared supported class—and the downstream links were not tested: deterministic repeatability, grounded enrichment, timestamp usefulness, visual incremental value, latency, and cross-hardware behavior.

This is not a finding that transcript enrichment has no user value. It is a finding that the value is not demonstrated strongly enough to expose users to the current reliability, expectation, trust, and lifecycle risks. Gate 6 expressly supports neither production Go nor Limited-go. The narrow source-published-VTT strategy remains a potentially valuable revalidation hypothesis; it is not a supported product capability today.

## Evidence that constrains the decision

| Evidence | Product interpretation |
|---|---|
| Gate 1 eligible positives passed **3/5 (60%)**, below the locked **5/5** requirement. YT-02 and YT-08 are immutable first-attempt failures with no score. | A user in the exact eligible class could not be promised reliable first-attempt completion. The three successes cannot erase the two failures. |
| Gate 1 rejection controls passed **4/4**. The three strict malformed/empty-cue controls and one over-7,200-cue/unknown-completeness control were rejected truthfully. | Fail-closed rejection is a trust-preserving foundation, but it does not compensate for failure on eligible inputs. The real-world prevalence of accepted versus rejected inputs is unknown. |
| The three successful eligible cells had token preservation **1.00** and anchor match **1.00**. | Exact preservation is encouraging once processing succeeds. It is evidence of narrow isolated behavior, not end-to-end reliability or user benefit. |
| Gate 2 was not triggered: only **1/10 (10%)** met both required conditions, below both the two-row and 20% trigger. | Owned-media STT is not an evidence-backed coverage extension in this decision. No WER, audio-relative timing, diarization, or STT UX evidence exists. |
| Gates 3, 4, and 5 were not run. | There is no repeat determinism result; no enrichment quality, grounding, structured-output, citation, latency, memory, or coverage result; and no visual-value measurement. |
| Gate 6 completed 33 rows: **18 narrow passes, 8 known gaps, 7 not applicable**; the exact unavailable/retry suite passed **5/5** and isolated A1 CLI integration passed **11/11**. | Useful safety and rejection foundations exist, but the eight known gaps and additional shipping-route P0 boundaries prevent a safe value claim. |
| Incremental spend and external activity were **USD 0**, with no provider/API/model calls or media downloads. | USD 0 is a verified research-spend result, not a production cost, latency, capacity, energy, support, or maintenance estimate. |
| The eligible sample was five items and was screening-affected. | The evidence is under-powered. It cannot be generalized to arbitrary YouTube videos, market coverage, SRT, long-form content, auto-captions, languages, other hardware, or visually dependent material. The 5-of-10 screening composition is not a 50% coverage estimate. |

Sources: [Gate 1](../decisions/GATE_1.md), [Gate 2](../decisions/GATE_2.md), [Gate 3](../decisions/GATE_3.md), [Gate 4](../decisions/GATE_4.md), [Gate 5](../decisions/GATE_5.md), and [Gate 6](../decisions/GATE_6.md).

## User-value assessment

The plausible job is not merely “obtain a transcript.” It is to help a user save a video, find the relevant moment later, understand it without losing important context, and verify generated claims against timestamped evidence. The current product has useful adjacent foundations—YouTube URL recognition, manual transcript repair, generic enrichment, item-level search, Ask, Related, and a transcript preview—but the proposed value loop remains incomplete:

- generic enrichment reads only the first 12,000 characters of a composed body that may begin with metadata, description, and chapters;
- its output has no video-specific chapters, claims/evidence, timestamp citations, groundedness check, or coverage contract;
- transcript segments are not first-class search units;
- timestamp labels do not seek into the video; and
- the preview is bounded and has no transcript-local search.

Consequently, even a successfully imported transcript has not been shown to improve time-to-evidence, comprehension, recall, decision quality, or repeat engagement over the current item-level experience. Gate 4 would have tested part of that proposition, but it did not run. Gate 5 would have addressed videos whose meaning depends on slides, demonstrations, charts, or on-screen text, but it also did not run. See the [focused audit](../audit/2026-07-16_focused-audit-synthesis_v2.md) and [product feature catalog](../audit/PRODUCT_FEATURE_CATALOG.md).

## Three evidence-bound strategies

### 1. Current automatic public-video capture and recovery

**Intended value:** The lowest-friction experience and the broadest apparent adoption surface: save a URL and receive searchable, enriched content without another step.

**Evidence-bound assessment:** This cannot be treated as a supported strategy. The active InnerTube/timed-text path is unofficial and operationally variable, bypasses the newer policy/source/segment model, lacks explicit rights and retention attestation, and can extend throttled recovery attempts without a hard lifetime budget. It was not validated by the isolated sidecar Gate 1. The project posture rejects undocumented/public-web extraction as a production method.

**User/engagement risk:** A one-click affordance creates a strong expectation of complete automatic coverage. Silent or opaque degradation, repeated retries, metadata-only results, and documentation/UI inconsistencies can teach users not to trust saved video items. Expanding this surface would maximize expectation mismatch before reliability or lifecycle control is proven.

### 2. Exact source-published, rights-screened VTT supplied locally

**Intended value:** A narrow segment—creators, researchers, or rights-holders who already possess the exact qualifying VTT—could gain trustworthy timestamped text without YouTube or model-provider egress. This is the strongest current hypothesis because it can preserve source text and anchors exactly when it succeeds.

**Evidence-bound assessment:** It is still not reliable enough. Gate 1 passed only 3/5 eligible first attempts against the exact 5/5 threshold, although all four rejection controls behaved truthfully and all three successful cells preserved tokens and anchors at 1.00. The result proves neither a general user-upload contract nor automatic YouTube acquisition. SRT is not covered by the result. Current product readiness remained false on every successful cell because attestation, fail-closed parsing, lifecycle enforcement, recovery isolation, and full normalized persistence are missing.

**User/engagement risk:** The user must discover, possess, verify, and supply an exact sidecar; understand a rights/retention attestation; and accept truthful rejection when structure or completeness is unsafe. That friction may be acceptable for a high-intent minority, but no research shows that the segment is large enough, repeats the workflow, or values the eventual output enough to offset it.

### 3. Official creator/editor-authorized captions API

**Intended value:** For channel owners and editors, an official caption path could remove manual file handling while retaining explicit account authorization and track provenance.

**Evidence-bound assessment:** This path is blocked and was not run. It had zero OAuth tokens, API calls, quota use, or experimental cells. The supplied web OAuth configuration lacked a redirect URI; API enablement/quota, consent, an editable test video, token lifecycle, track selection, deletion, and derived-output compliance remain unresolved. It is creator/editor-scoped, not an arbitrary-public-video solution.

**User/engagement risk:** Broad consent, account binding, track selection, revocation, and reauthorization add material onboarding friction for a narrow segment. The product could also overstate value if users infer that connecting YouTube authorizes persistent summaries, quotes, embeddings, or other derivatives; those output permissions remain conditional or unresolved. See the [OAuth feasibility note](../research/2026-07-16_youtube-data-api-oauth-feasibility.md) and [output compliance matrix](../research/OUTPUT_COMPLIANCE_MATRIX.md).

Owned-media STT is not promoted to a fourth strategy because its locked trigger failed at 1/10 and no primary STT evidence exists. Visual enrichment is likewise not a current strategy because Gate 5 had no valid Gate 4 baseline from which to compute its trigger.

## Supported inputs and truthful user-facing scope

| Input/workflow class | Evidence-bound state |
|---|---|
| Exact source-published, rights-screened VTT in the isolated A1 boundary | **Not reliable enough:** 3/5 eligible first attempts passed; successful rows preserved tokens and anchors exactly. |
| Strict malformed/empty-cue VTT | **Truthfully rejected in the isolated boundary:** 3/3 controls. |
| Above-7,200-cue/unknown-completeness VTT | **Truthfully rejected in the isolated boundary:** 1/1 control. |
| Current shipping YouTube capture/upload route | **Not ready:** attestation, parser, lifecycle, recovery-isolation, and normalized-persistence controls are missing. |
| Official YouTube captions API | **Blocked / not run:** no eligible consent, editor-video, or token lifecycle; zero API calls. |
| Owned-media STT, arbitrary public captions, SRT production class, live/scheduled/private/deleted videos | **Not evaluated / unsupported by this evidence.** |
| Local text enrichment and visual enrichment | **Blocked / not run.** |

No user-facing label should collapse these states into “YouTube transcripts supported.” The safe rejection results support explicit unsupported/manual-needed states; they do not establish broad coverage.

## Adoption and UX harm

The primary near-term harm is broken trust, not merely a failed job:

1. **Expectation mismatch:** a saved YouTube URL implies automatic coverage, while the only tested positive class requires an independently supplied exact VTT and still failed 2/5 first attempts.
2. **False completeness or false confidence:** current product parsing and enrichment do not prove fail-closed completeness, full-video coverage, grounded claims, or timestamps. A polished summary of the first part of a long video could be more harmful than an explicit unsupported state.
3. **Necessary but untested friction:** rights/retention attestation, file selection, OAuth consent, and safe rejection protect users and the product, but their effects on completion and repeat use are unknown.
4. **Weak payoff visibility:** without transcript-local search, evidence-hit timestamps, and seek navigation, users may absorb the import burden without receiving the most legible benefit.
5. **Data-control harm:** retention is currently declarative rather than enforced across body text, FTS, chunks/vectors, generated outputs, chat, logs, exports, provider copies, and backups. A user cannot yet rely on source-specific revocation or expiry.
6. **Edge-segment exclusion:** long-form, non-VTT, auto-captioned, non-English, live/scheduled, and visually dependent videos have no supporting result. Shipping around the small successful sample would hide rather than resolve those exclusions.

Truthful rejection is the strongest UX-positive result: it avoids presenting malformed or unknown-completeness inputs as successful. It should remain a preserved research asset regardless of the eventual product direction.

## Minority case and uncertainty

A reasonable minority case favors a tightly labeled, manually supplied VTT experience because the three successful eligible inputs achieved perfect token and anchor preservation and all four invalid/unsafe controls were rejected correctly. For a high-intent rights-holder with a qualifying sidecar, even a narrow workflow could eventually be valuable.

I do not adopt that case as the present decision because it depends on three unproven assumptions: that the two eligible first-attempt failures are not representative, that enough users will tolerate the file/attestation workflow, and that downstream enrichment/navigation will produce material value. None is measured. There is no user study, funnel, repeat-use cohort, task-success comparison, or willingness-to-adopt evidence in the reviewed artifacts. Conversely, the evidence also does not justify concluding that demand is absent. The correct response to this uncertainty is a bounded revalidation standard, not a broad product claim.

## Revalidation exit criteria

All of the following are necessary before this decision can be reopened; no single passing result is sufficient:

1. **Fresh prospective acquisition evidence:** use a new predeclared seal because YT-02 and YT-08 cannot be retried or replaced under the current seal. The declared narrow class must pass the full first-attempt denominator at **100%**—at minimum the existing-form **5/5 eligible and 4/4 truthful rejections**—with zero silent loss, zero post-result repair, and zero denominator substitution.
2. **Resolve under-power explicitly:** freeze a materially larger, rights-reviewed expansion cohort and its sampling/power rationale before execution. The cohort must cover the intended supported class's declared length, language, encoding, cue-structure, and source variants. Report confidence/uncertainty and attrition; do not infer population coverage from corpus composition.
3. **Gate 3 passes:** deterministic repeat succeeds for the complete eligible denominator with identical normalized-contract outputs, explicit completeness, safe timestamps, input/output counts, hashes, processing version, and no unreported cue loss.
4. **Gate 4 passes its locked value-quality thresholds:** structured output at least 90% on first attempt and 100% after the permitted format-only retry; material-claim support at least 95% pooled and macro per item; zero critical hallucinations; timestamp citation accuracy at least 90% pooled and macro per item; key-point coverage at least 80% pooled and macro per item; and every failure detectable and recoverable without changing the transcript. Human stakeholder review must confirm the AI-evaluated findings before a product-value claim.
5. **Gate 5 is resolved truthfully:** compute the visual-only trigger from a valid Gate 4 baseline. If triggered, pass a prospective incremental-value test; if not triggered, state explicitly that the supported experience is transcript-only and does not cover visually dependent content.
6. **Gate 6 gaps are closed with publication-safe evidence:** close all eight listed security/product gaps and the five shipping-route P0 boundaries—attestation, fail-closed parsing, enforced lifecycle, recovery isolation, and complete normalized persistence. Source revocation/deletion must be proven across all derived copies and backup expiry; the disclosed OAuth credential must be revoked/rotated by its owner.
7. **UX comprehension and task value are demonstrated in a predeclared intended-user study:** at least 80% of eligible users complete the import/attestation task without facilitator correction; at least 90% correctly distinguish supported, rejected, and unsupported states; zero participants interpret a rejected/partial result as complete; and median time to locate and verify a spoken claim improves by at least 20% versus the current item-level experience without reducing answer accuracy. The sample size and analysis must be frozen before results.
8. **Adoption friction is measured, not assumed:** a predeclared majority of eligible study users must choose to use the workflow again on a second qualifying item after experiencing the full attestation/import/rejection flow. Report failures and non-users in the denominator.
9. **Economics and responsiveness are bounded:** replace the USD 0 research-spend fact with measured wall-clock latency, peak memory, target-hardware variability, operator/support burden, and a production cost/capacity estimate against predeclared acceptable budgets. Zero external-service spend alone is insufficient.
10. **Scope remains exact:** any redecision must name only the input classes that passed. Official captions, STT, SRT, arbitrary public captions, live/scheduled/private/deleted videos, and visual enrichment remain excluded unless each obtains its own prospective evidence and policy/lifecycle clearance.

## Final recommendation

**Defer.** Preserve the narrow safe-rejection and synthetic control evidence, keep the current product boundary explicit, and require the exit evidence above before reconsidering user exposure. The present record is promising enough to justify future revalidation of the exact source-published-VTT hypothesis, but it is too unreliable, incomplete, under-powered, and UX-uncertain to support a product release decision.

## Publication-safe evidence reviewed

- [Gate 1 — Compliant transcript acquisition](../decisions/GATE_1.md)
- [Gate 2 — Speech-to-text fallback](../decisions/GATE_2.md)
- [Gate 3 — Transcript quality and deterministic normalization](../decisions/GATE_3.md)
- [Gate 4 — Enrichment quality and grounding](../decisions/GATE_4.md)
- [Gate 5 — Visual value](../decisions/GATE_5.md)
- [Gate 6 — Cost, reliability, security, policy, and product fit](../decisions/GATE_6.md)
- [Focused audit synthesis v2](../audit/2026-07-16_focused-audit-synthesis_v2.md)
- [Product feature catalog](../audit/PRODUCT_FEATURE_CATALOG.md)
- [Current processing flow](../audit/CURRENT_PROCESSING_FLOW.md)
- [Transcript data lifecycle](../audit/TRANSCRIPT_DATA_LIFECYCLE.md)
- [Transcript/tool research recommendation v2](../research/2026-07-16_transcript-tool-research-recommendation_v2.md)
- [Research note](../research/Research-note.md)
- [OAuth feasibility note](../research/2026-07-16_youtube-data-api-oauth-feasibility.md)
- [Model comparison and retained Gate 4 thresholds](../research/MODEL_COMPARISON.md)
- [Compliance matrix](../research/COMPLIANCE_MATRIX.md)
- [Transcript-derived output compliance matrix](../research/OUTPUT_COMPLIANCE_MATRIX.md)
