# AI Brain → NotebookLM Synchronization — Council v1 Adversarial Review

**Review date:** 2026-07-21
**Reviewed artifact:** `council/2026-07-21_council-recommendation_v1.md`
**Method:** Evidence-first review of the integrated recommendation, all three independent PM memos, the research synthesis, Gate 0 request, capacity model, security/privacy assessment, and directly cited local spike reports. No account, credential, Google call, notebook, source, Drive file, or real AI Brain content was used.

## Verdict

**Keep the product decision at Defer.** The evidence does not support Go or product Limited-go, while documented Enterprise and narrower Drive hypotheses make No-go premature. The conditional artifact decision is also correct: a Defer result must not generate a PRD, UX package, prototype, or production technical plan.

The recommendation is directionally sound but should be revised before v2. There are **no P0 findings**, **three P1 findings**, and **three P2 findings**. The most important defects are an inaccurately integrated Drive-threshold disagreement, an underspecified transition from a one-source research spike to a product Limited-go, and missing testable controls for capture finality and Enterprise usage logging.

## Findings

### P0 — Critical

No P0 findings. Nothing in v1 authorizes production work, unofficial consumer automation, credentials, real content, or destructive provider actions.

### P1 — High

#### P1-1 — The Drive viability disagreement is described backwards

**Reference:** Council v1 `:127`; Knowledge/Workflow memo `:80-84,108`; User Value memo `:122-132`.

V1 says the integrated decision adopts a “stricter measured-burden gate rather than a universal volume cutoff.” That is not supported by the PM positions. Knowledge/Workflow sets the explicit stricter ceiling: rotation no more frequent than monthly and no mandatory daily manual action. The other position accepts whatever measured refresh/rotation/import/removal burden the user explicitly accepts; that could permit a burden above the Knowledge/Workflow ceiling.

**Required v2 correction:** Either adopt the monthly/no-daily threshold, or state that the coordinator chose user-accepted measured burden **instead of** the Knowledge/Workflow PM's stricter cutoff. Preserve the rejected cutoff as dissent; do not label the selected gate stricter.

#### P1-2 — The product re-entry gate does not test the proposed aggregate/manual/snapshot workflow

**Reference:** Council v1 `:95,134-138,151,168-175,187-189`; User Value memo `:112-145,149-152`; Knowledge/Workflow memo `:62,74,88-108`; local orchestration report `spikes/S8_ORCHESTRATION_2026-07-21.md:16-17`.

The Enterprise re-entry list tests one source and one fact. That is a valid account/API feasibility spike, but it does not validate the required size-bounded aggregate, successive scheduled publications, a mid-period manual request, duplicate-free shard composition, item-level citation behavior across all eligible fixture types, or a measured capacity/retention envelope. It also lacks a publication-readiness rule: an item whose title, extraction, transcript, or summary changes after creation can be exported while provisional and then remain stale because initial scope has no edit propagation and Enterprise has no documented source update. Knowledge/Workflow explicitly requires aggregate, longitudinal/manual, citation, and finality evidence before moving from Defer to a user-facing Limited-go; User Value uses the smaller test for a staged Limited-go but still requires accepted aggregation cadence and later product evidence. V1's generic production gate does not clearly adjudicate this disagreement or say which decision transition each test controls.

**Required v2 correction:** Define two named transitions:

1. **Research authorization:** Gate 0 plus the one-source official spike may justify further bounded research only.
2. **Product Limited-go:** require a deterministic size-bounded aggregate using all five eligible fixed fixtures; no omission/duplication/boundary error; successive publication observations including one overlapping manual request; correct distinguishing-fact retrieval/citation with negative cross-item checks; actual occupancy/volume/size/headroom/retention; accepted cadence/manual burden; and a testable readiness/finality rule that either withholds a late-changing item or exposes an explicitly accepted immutable-snapshot boundary.

State explicitly that passing the first transition cannot itself authorize a user-facing build.

#### P1-3 — Enterprise usage logging is a recommendation, not a verified gate

**Reference:** Council v1 `:118,159-175`; security/privacy assessment `research/2026-07-21_security-privacy-assessment.md:32-36,89,120-123`.

“Keep Enterprise usage logging off” is not sufficient because the assessment says project administrators control logging and that captured content has independent region, reader, sink, retention, and deletion boundaries. The common and Enterprise re-entry criteria never require the current project setting to be observed or an administrator to attest to it. This can create an unsupported privacy assumption even when source cleanup succeeds.

**Required v2 correction:** Before any non-synthetic content, require verified project-level logging state and, if enabled, region, readers, sinks, retention, and deletion limits. If the runtime owner cannot control or verify it, require explicit disclosure/consent or keep the lane blocked. Keep source deletion and log retention as separate outcomes.

### P2 — Material

#### P2-1 — Decision status mixes product classification, research permission, and local/live evidence

**Reference:** Council v1 `:4-8,12,16-17,23,93,168-189,210`; research synthesis v2 `research/RESEARCH_SYNTHESIS_V2_2026-07-21.md:8-19`; PM confidence values in council v1 `:29-35`; local failure evidence in `spikes/S6_LOST_RESPONSE_RECOVERY_2026-07-21.md:4-16` and `spikes/S8_ORCHESTRATION_2026-07-21.md:4-17`.

The product classification **Defer** is supported, while the synthesis calls the bounded synthetic path **Limited-go**. V1 explains the intended research path in prose, but the header exposes only one decision, so readers can reasonably mistake a research authorization for a product classification or vice versa. “Research complete” overstates a program with Gate 0, official auth, provider semantics, retrieval, and cleanup still pending. The claim that no “provider failure was exercised” is also literally false: failures, ambiguity, timeout, delayed visibility, and restart were exercised against injected fakes; what remains untested is **live Google/provider** failure. Separately, `0.91` is not the mean of the three PM confidences (approximately `0.887`) and no weighting or calibration method is given; the precision is therefore unsupported even if qualitative “High” is reasonable.

**Required v2 correction:** Use two explicit fields: `Product decision: Defer` and `Research disposition: bounded official synthetic spike only after Gate 0`. Change the status to `public and credential-free research complete; Gate 0/live validation pending`. Say no **live** Google/provider failure was exercised while retaining the fake-provider result. Retain qualitative `High`, or document how `0.91` was calibrated.

#### P2-2 — The character-limit claim converts a fixture assumption into a universal fact

**Reference:** Council v1 `:47,56`; capacity model `CAPACITY_MODEL.md:55-64,67-96`.

The 1.02-million-character Docs limit is official, and the 46/46 result plus deterministic hash are reproducible. However, the statement that the Docs character limit is “the stricter” limit is true only for the six-characters-per-word planning fixture (with the stated 20% reserve), not for every content distribution. The model correctly takes the minimum of both independent bounds.

**Required v2 correction:** State that capacity applies both the 500,000-word and 1.02-million-character constraints, and that the character limit binds in the six-character-per-word fixture. Keep 20% reserve and six characters per word labeled as planning assumptions, not observed workload facts.

#### P2-3 — Gate 0 asks for authorization for both lane resources before selecting one lane

**Reference:** Council v1 `:12,61,104-107,159-166`; Gate 0 request `decisions/GATE_0_ELIGIBILITY_2026-07-21.md:20-28`; research synthesis v2 `research/RESEARCH_SYNTHESIS_V2_2026-07-21.md:97-107`.

V1 correctly says to select exactly one lane and use one applicable private target, but its operative Gate 0 document asks for permission for both an empty notebook **and** an app-created Doc. The Doc is unnecessary for an Enterprise raw-text spike; the Enterprise API target is unnecessary if consumer/Workspace is selected. This is not the minimum lane-selection request and can create needless friction or broader authorization than needed.

**Required v2 correction:** Make Gate 0 conditional: first identify edition/entitlement and whether the manual Drive boundary is acceptable; then request permission for exactly the selected synthetic resource—Enterprise notebook **or** consumer/Workspace notebook plus app-created Doc. Continue to request no URL, identifier, credential, or secret in conversation.

### P3 — Low

No P3 findings. The remaining defects affect decision traceability, testability, evidence classification, or privacy rather than polish.

## Checks that held

- **Recommendation class:** Defer is the correct product decision on the cited evidence; there is no basis for product Limited-go, Go, or categorical No-go.
- **Edition/API distinctions:** V1 correctly separates Gemini Notebook Enterprise from consumer, paid-consumer, and ordinary Workspace NotebookLM; treats current Enterprise source guides as Preview/Pre-GA and `v1alpha`; and does not turn failure to find a consumer API into proof that none can ever exist.
- **Drive truth language:** `Drive document updated — NotebookLM refresh unverified` is evidence-appropriate. V1 does not claim that a Drive revision proves NotebookLM freshness.
- **Local numeric evidence:** The 46/46 local result and deterministic capacity hash match the cited reports. The one-source-per-item rejection and scenario tables are consistent with the capacity model, subject to the planning-assumption wording in P2-2.
- **Security boundary:** V1 prohibits credential acquisition before lane selection, plaintext token storage, raw identifiers/content in logs, silent target fallback, and conflating disconnect with erasure. No credential, account identifier, notebook identifier, or real content appears in the reviewed recommendation.
- **Live-versus-local boundary:** Apart from P2-1, v1 consistently treats the harness as fake/local evidence and provider behavior as unobserved.
- **Conditional artifacts:** The `Defer` disposition at `:191-193` correctly suppresses PRD, UX/UI, prototype, and production technical-plan artifacts.

## Required disposition

Revise v1 into v2 without changing the product decision. Close P1-1 through P1-3 in the decision text and re-entry gates; close P2-1 through P2-3 as evidence/status corrections. Then re-run only documentation/link/secret checks. No Gate 0 answer, credential acquisition, Google call, new synthetic identity, real-content test, or downstream product artifact is required to resolve this review.
