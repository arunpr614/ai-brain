# YouTube Transcript and Enrichment Council Recommendation v1

**Council date:** 2026-07-19<br>
**Recommendation:** **Defer**<br>
**Decision scope:** Current product exposure and further implementation; this is not legal/policy approval<br>
**Review state:** Provisional synthesis pending independent adversarial review

## Executive decision

Defer product implementation, rollout, and expansion of YouTube transcript enrichment. Preserve the sealed research evidence and truthful rejection controls, but keep the current automatic route, a narrow sidecar feature, official captions, STT, local enrichment, and visual enrichment outside any supported product claim.

All three independent PM roles recommend Defer:

- [User Value and Engagement](2026-07-19_pm-user-value-and-engagement.md)
- [Knowledge, Learning, and Recall](2026-07-19_pm-knowledge-learning-and-recall.md)
- [Platform, Data, and Privacy](2026-07-19_pm-platform-data-and-privacy.md)

The shared reason is conjunctive. Gate 1 failed the first prerequisite at **3/5 eligible first attempts**, despite **4/4** truthful rejection controls and exact token/anchor preservation on the three successes. Gate 2 did not trigger. Gates 3–5 did not run, leaving determinism, enrichment value/grounding, resource behavior, and visual incremental value unmeasured. Gate 6 completed with **18 narrow passes, 8 known gaps, and 7 not-applicable checks**, while the current shipping route remains outside the isolated tested boundary.

No downstream PRD, UX/prototype, or technical implementation plan is authorized because the recommendation is neither Go nor Limited-go.

## Evidence state

| Gate | Decision | Council consequence |
|---|---|---|
| [Gate 1](../decisions/GATE_1.md) | **Fail:** eligible 3/5; rejection controls 4/4 | The fixed source-published-VTT class did not meet its exact reliability threshold; YT-02 and YT-08 are immutable failures |
| [Gate 2](../decisions/GATE_2.md) | Not triggered / Not run: 1/10 and 10% | No STT/media or independent speech-accuracy evidence |
| [Gate 3](../decisions/GATE_3.md) | Ineligible / Not run | No repeat determinism or generated Gate 3 result |
| [Gate 4](../decisions/GATE_4.md) | Blocked / Not run | Zero model inference; no grounding, citation, schema-reliability, latency, or memory result |
| [Gate 5](../decisions/GATE_5.md) | Not triggered / Not run | No visual trigger or incremental-value measurement |
| [Gate 6](../decisions/GATE_6.md) | Complete with material gaps | Narrow controls are useful, but production safety/readiness did not pass |

The two-commit seal is valid, primary request/provider/model counters remain zero, and incremental spend is USD 0. Those facts prove evidence integrity and spend containment—not product reliability, capacity, policy permission, or value.

## Strategy dispositions

### 1. Current automatic public-video capture and recovery

**Disposition: No-go for the current route.** It uses a compliance-unresolved acquisition mechanism, bypasses the sealed attestation/normalized-source contract, has unbounded or incompletely bounded recovery/network behaviors, and was not validated by the isolated Gate 1 evidence. Do not expand it or present it as the tested strategy.

### 2. Rights-screened source-published VTT supplied locally

**Disposition: Defer; preserve only as a revalidation hypothesis.** This is the sole strategy with real primary acquisition evidence. The three successes show exact preservation and the four controls show truthful rejection, but two eligible first attempts failed. The five-item eligible sample is under-powered and screening-affected, and the shipping product lacks the isolated boundary's attestation, parser, lifecycle, recovery-isolation, and normalized-persistence controls. It does not support a Limited-go.

### 3. Official creator/editor-authorized captions API

**Disposition: Blocked / Defer separately.** The official path made zero calls and had no eligible consent/editor-video/token-lifecycle setup. It may be reconsidered only for an exact consenting editor-owned class after credential rotation, API/redirect/quota readiness, least-privilege consent, track selection, retention/deletion, and output-specific policy review. It is not an arbitrary-public-caption path and may not fall back to unofficial extraction.

Gate 2's untriggered STT inventory and Gate 5's absent visual method are not additional current strategies.

## Agreements

The council agrees that:

- successful rows cannot erase the two failed first attempts or manufacture a supported class;
- truthful malformed/unsupported rejection is the strongest reusable product-quality signal;
- current-product readiness is not implied by the isolated harness;
- no claim about deterministic normalization, enrichment, grounded recall, visual sufficiency, capacity, or product economics is available from a not-run gate;
- provisional rights judgments require product/legal-policy review for every acquisition and derived-output purpose;
- private transcripts and derivatives remain outside Git/Wiki/PR and expire no later than `2026-10-14`;
- the disclosed OAuth credential must be revoked/rotated before any future OAuth design; and
- a future decision requires a fresh prospective package rather than repair or reuse of the failed cells.

## Differences in emphasis and minority view

There is no vote split, but the roles emphasize different reasons:

- User Value and Engagement treats reliability and expectation mismatch as the immediate user-trust blocker and asks for measured import comprehension, time-to-evidence, and repeat-use behavior.
- Knowledge, Learning, and Recall gives more weight to the exact timestamp-preservation signal, but requires deterministic normalization, grounded claims/citations, transcript-native retrieval, and revocation-aware provenance before calling it a knowledge feature.
- Platform, Data, and Privacy treats rights, credential, network, lifecycle, identity, and operations controls as conjunctive blockers even if reliability later passes.

The minority case is a tightly labeled, manually supplied VTT experience for high-intent rights-holders. Its evidence is the three exact-preservation successes plus 4/4 truthful rejections. The council does not adopt a Limited-go because the same fixed class failed 2/5 eligible attempts, the intended shipping boundary does not exist, no user/adoption study exists, and every downstream value gate is absent.

## Revalidation bar

A future council may reconsider only after a fresh seal and evidence package closes all applicable categories below. These are decision gates, not an authorized implementation plan.

1. **Credential and policy reset:** revoke/rotate the disclosed OAuth credential; freeze item- and output-specific rights, consent, retention, attribution, transfer, and deletion decisions; obtain the required product/legal-policy review.
2. **Prospective acquisition reliability:** use a fresh, materially larger, rights-reviewed corpus with a predeclared sampling/power rationale and exact supported classes. Require 100% first-attempt eligible success and 100% truthful rejection controls, without repair, retry, replacement, or denominator removal.
3. **Shipping-boundary controls:** prove explicit attestation, fail-closed parsing, complete normalized persistence, recovery isolation, and runtime lifecycle enforcement in the actual product boundary rather than only an isolated harness.
4. **Security/lifecycle closure:** close all eight Gate 6 known gaps and prove hostile-input safety, redirect/DNS/address validation, hard request/retry limits, render/export sanitization, source-specific revocation, whole-item deletion, in-flight cancellation, provider recall where applicable, and bounded backup expiry.
5. **Dependent gates:** actually pass Gate 3 repeat determinism and Gate 4's sealed structured-output, claim-support, hallucination, timestamp-citation, and key-point thresholds. Resolve Gate 5 truthfully from a valid Gate 4 baseline.
6. **User and recall value:** prospectively measure task completion, state comprehension, time-to-supporting-evidence, answer support/abstention, timestamp-hit accuracy, and second-use intent against the current item/chunk baseline without reducing correctness.
7. **Operations/economics:** measure latency, peak memory, long-item behavior, target-hardware variance, failure/retry behavior, support burden, and bounded capacity/cost. USD 0 research spend is not a production estimate.
8. **Freshness and deletion:** publish non-sensitive deletion evidence by `2026-10-14` and revalidate earlier after any material product, method, API, policy, model, source-rights, or corpus change.

Any failed, unresolved, expired, or not-run applicable criterion preserves Defer. A narrow Gate 1 pass alone is necessary but insufficient.

## v1 conclusion

**Defer.** Preserve the exact seal, Gate 1 evidence, truthful rejection behavior, and Gate 6 gaps as research history. Do not ship or design downstream product artifacts from this result. Reopen only with a fresh, adequately powered, end-to-end evidence package that closes the value, reliability, safety, policy, lifecycle, and operations boundaries together.
