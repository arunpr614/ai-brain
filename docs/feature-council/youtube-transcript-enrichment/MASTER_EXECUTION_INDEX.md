# YouTube Transcript and Enrichment — Master Execution Index

**Status:** Pre-seal prospective controls mechanically validated (338/338); Commit-A eligibility is governed by `PRESEAL_READINESS.json`, `REFERENCE_LEDGER.json`, and the same-reviewer closure marker; Commit A/B and all primary runs remain absent<br>
**Verification date:** 2026-07-19<br>
**Research expiry:** 2026-10-14, or earlier on a material policy, API, tool, runtime, model, or corpus change<br>
**Repository base:** `ad78d77495dcaa90f62aab038fe63ae95cf36862` (`origin/main`)<br>
**Research branch:** `research/youtube-transcript-enrichment`<br>

This index is the navigation root for the gated investigation. A linked artifact can still be a draft; its own status is authoritative. No production implementation, production dependency, migration, merge, deployment, paid spend, new subscription, or access-control bypass is authorized.

## Control documents

| Artifact | Purpose | Status |
|---|---|---|
| [Tracker](TRACKER.md) | Ordered gates, limits, ownership, and evidence state | Active |
| [Decision log](DECISION_LOG.md) | Consequential decisions and gate outcomes | Active |
| [Source inventory](SOURCE_INVENTORY.md) | Source classification, versions, dates, and conflicts | Active |
| [Research note](research/Research-note.md) | Working synthesis, assumptions, and handoff notes | Active |
| [Risk register](technical/RISK_REGISTER.md) | Product, security, policy, quality, and delivery risks | Active |
| [Append-only running log](../../../RUNNING_LOG.md) | Cross-project milestones and corrections | Active; earlier entries are superseded only by later entries |

## Audit

| Artifact | Status |
|---|---|
| [Product feature catalog](audit/PRODUCT_FEATURE_CATALOG.md) | Complete at audited baseline |
| [Focused ingestion and enrichment audit v1](audit/2026-07-16_focused-audit-synthesis_v1.md) | Reviewed; preserved |
| [Focused audit adversarial review](audit/2026-07-16_focused-audit-synthesis_adversarial-review.md) | Complete; all findings accepted |
| [Focused audit v2](audit/2026-07-16_focused-audit-synthesis_v2.md) | Complete at audited baseline |
| [Current processing-flow diagram](audit/CURRENT_PROCESSING_FLOW.md) | Complete at audited baseline |
| [Relevant code map](audit/CODE_MAP.md) | Complete at audited baseline |
| [Data-model summary](audit/DATA_MODEL_SUMMARY.md) | Complete at audited baseline |
| [Provider inventory](audit/PROVIDER_INVENTORY.md) | Complete at audited baseline |
| [Wiki-versus-code discrepancy report](audit/WIKI_CODE_DISCREPANCIES.md) | Complete at audited baseline |
| [Focused QA baseline](audit/QA_BASELINE.md) | 194 passing mocked/unit tests; no live experiment |
| [Transcript data lifecycle/deletion audit](audit/TRANSCRIPT_DATA_LIFECYCLE.md) | Complete current-state graph; enforcement gaps open |

## Benchmark and spikes

| Artifact | Purpose | Status |
|---|---|---|
| [Benchmark protocol](benchmark/BENCHMARK_PROTOCOL.md) | Prospective rules, metrics, thresholds, blinding, and stop conditions | Mechanically validated unsealed candidate; machine readiness and same-reviewer closure govern Commit-A eligibility; primary runs prohibited |
| [Corpus manifest](benchmark/CORPUS_MANIFEST.md) | Rights-safe fixed inputs and reference hashes | Final prospective input, unsealed: 10 real items; 5 A1 positives; 4 A1 rejection controls |
| [Corpus source evidence](benchmark/CORPUS_SOURCE_EVIDENCE.md) | Item-level source, rights, association, retention, and reference-role dossier | Pre-lock candidate; production/legal review remains required |
| [Method × item matrix](benchmark/METHOD_ITEM_MATRIX.md) | Human-readable cell states and exact denominators | Final prospective input; unsealed; machine reconciliation complete |
| [Machine method × item matrix](benchmark/METHOD_ITEM_MATRIX.json) and [schema](benchmark/METHOD_ITEM_MATRIX.schema.json) | Seal-verifiable cell and gate state | Final prospective input; reconciled to the ledger and prospective lock totals |
| [A1 attestation schema](benchmark/A1_ATTESTATION.schema.json) and [records](benchmark/attestations/README.md) | Per-input authorization, class, source, and integrity binding | Schema 1.2; nine private-input records; machine reconciliation complete; independent-review state governed by the reference ledger |
| [Reference ledger](benchmark/REFERENCE_LEDGER.json) and [schema](benchmark/REFERENCE_LEDGER.schema.json) | Content-free hashes, preparation facts, anchors, and expected classes | Pre-lock candidate; five eligible plus four rejection inputs |
| [Normalized transcript schema](benchmark/NORMALIZED_TRANSCRIPT.schema.json) | A1 source/normalized timing and provenance contract | Pre-lock candidate |
| [Exact run plan](benchmark/RUN_PLAN.md) | Operator commands, environment, public/private write-once claims, cell oracles, attempts, and retention | Pre-lock candidate; A1/Gate 3 and blinded-evaluator orchestration mechanically validated; Commit-A eligibility remains machine/reviewer governed; primary runs prohibited |
| [Benchmark tools](benchmark/tools/README.md) | Offline preparation/scoring plus fixed sealed A1, Gate 3, evaluator, aggregation, safety, and seal boundaries | 289/289 tests across 18 suites on publication-safe synthetic fixtures, including the unskipped production-shaped SEALED path; no primary results |
| [Write-once A1 operator](benchmark/tools/run-sealed-a1-cell.ts), [execution contract](benchmark/model/A1_EXECUTION_CONTRACT.json) and [schema](benchmark/model/A1_EXECUTION_CONTRACT.schema.json), [claim schema](benchmark/model/A1_ATTEMPT_CLAIM.schema.json), [terminal schema](benchmark/model/A1_ATTEMPT_TERMINAL.schema.json), [receipt schema](benchmark/model/A1_OPERATOR_RECEIPT.schema.json), [database validator](benchmark/tools/validate-a1-database.ts), [sealed-authority validator](benchmark/tools/validate-a1-sealed-authority.ts), and [focused tests](benchmark/tools/tests/run-sealed-a1-cell.test.ts) | Fixed-path Gate 1/repeat operation, content-bound public seal-scoped preclaims/terminals, captured structural exits, exclusive private receipts, and concurrency/rerun protection | Operator 1.1.0; A1 harness 20/20 and integrated benchmark coverage green; primary runs prohibited |
| [Gate 3 evidence chain](benchmark/tools/gate3-evidence.ts), [result operator](benchmark/tools/gate3-result.ts), and [schema](benchmark/model/GATE_3_RESULT.schema.json) | Derive exact 5-positive/4-rejection/5-repeat evidence and Git-bound model admission under one seal | Generator/verifier 1.1.0 and result schema 2.1; synthetic hardening validation complete within the 289/289 suite; not run on primary inputs |
| [Gate 4 evaluation claims](benchmark/tools/gate4-evaluation-claims.ts), [claim schema](benchmark/model/GATE4_EVALUATION_ATTEMPT_CLAIM.schema.json), [terminal schema](benchmark/model/GATE4_EVALUATION_TERMINAL.schema.json), [local evaluator](benchmark/tools/local-blinded-evaluator.ts), [CLI](benchmark/tools/blinded-evaluation-cli.ts), and [finalizer](benchmark/tools/gate4-finalizer.ts) | Write-once package/role claims, exact private/public evidence verification, independent A/B roles, conditional adjudication, and canonical Gate 4/Gate 5 derivation | Finalizer 1.0.0; crash-durability, mutation, and independent hardening validation complete; zero inference |
| [A1 isolated harness](spikes/a1-harness/README.md) | Recovery-disabled, worker-free, egress-denied strategy-feasibility runner | Development validation only; no primary results |
| [Lock schema](benchmark/LOCK.schema.json) | Machine-readable two-commit seal contract | Final prospective schema 1.4; no `LOCK.json` exists |
| [Pre-seal readiness authority](benchmark/PRESEAL_READINESS.json) and [schema](benchmark/PRESEAL_READINESS.schema.json) | Machine Commit-A readiness plus immutable/mutable authority boundary | Machine authority; its exact current status, validation flags, and timestamp control Commit-A readiness |
| [Formal pre-lock adversarial review](reviews/YOUTUBE_TRANSCRIPT_ENRICHMENT_PROSPECTIVE_BENCHMARK_PRE_LOCK_PACKAGE_ADVERSARIAL_REVIEW_2026-07-18_12-57-42_IST.md) | Independent challenge of the exact pre-lock package and same-reviewer closure record | Historical No-Go preserved; the report's exact same-reviewer closure marker controls closure state |
| [Safety fixtures](benchmark/SAFETY_FIXTURES.json) and [safety matrix](benchmark/SAFETY_TEST_MATRIX.md) | Publication-safe adversarial controls and truthful current-control evidence outside primary denominators | Pre-lock candidate: 33 rows; 18 narrow passes, 8 known gaps, 7 not-applicable |
| [Evaluator form](benchmark/EVALUATOR_FORM.md) | Human-readable explanation of blinded scoring and deterministic adjudication | Non-authoritative worksheet; exact model schemas and execution contract control if Gate 4 runs |
| [Local model lock package](benchmark/model/README.md) | Exact model/runtime identity, authorization boundary, prompts, schemas, rubric, and evaluation contract | One candidate prepared; locked-file chronology and evaluator orchestration mechanically validated; machine/reviewer authorization still governs; zero inference |
| [Local model harness](spikes/model-harness/README.md) | File-only, egress-denied, private-output runner and publication-safe report contract | Harness 1.2.0 re-verifies the complete Gate 3 chain; 29/29 synthetic tests passed; primary use prohibited until seal and Gates 1/3 pass |
| [Spike register](spikes/SPIKE_REGISTER.md) | Bounded run registry, retries, cost, inputs, and outputs | Active; synthetic development checks only; zero primary runs |
| [Model comparison](research/MODEL_COMPARISON.md) | Candidate screening and comparable-result requirements | One exact local candidate package and isolated harness prospectively verified; zero inference |
| [Historical Gate 4 stop record](research/2026-07-16_model-screening-stop-record.md) | Original free-provider/local-availability stop | Preserved; superseded prospectively by D-016; still 0 calls, USD 0 |
| [YouTube Data API OAuth feasibility note](research/2026-07-16_youtube-data-api-oauth-feasibility.md) | Credential-safe official-caption API prerequisites and current blocker | Desk validation complete; 0 calls, 0 tokens, 0 quota |
| [Compliance matrix](research/COMPLIANCE_MATRIX.md) | Acquisition-method policy and authorization posture | Researching |
| [Transcript-derived output compliance matrix](research/OUTPUT_COMPLIANCE_MATRIX.md) | Per-output source/retention/derivation posture | Complete research classification; unresolved outputs block production |
| [Transcript/tool recommendation v1](research/2026-07-16_transcript-tool-research-recommendation_v1.md) | Preserved first recommendation | Reviewed; superseded by v2 |
| [Transcript/tool adversarial review](research/2026-07-16_transcript-tool-research-recommendation_adversarial-review.md) | Independent challenge and correction trace | Complete — verdict Revise |
| [Transcript/tool recommendation v2](research/2026-07-16_transcript-tool-research-recommendation_v2.md) | Reconciled acquisition recommendation | Complete; Gate 1 still unlocked/not run |

## Gate decisions

| Gate | Required decision artifact | Status |
|---|---|---|
| 1 — compliant transcript acquisition | Sealed 5-positive/4-rejection A1 run and gate record | Eligible only after valid two-commit seal; not run |
| 2 — speech-to-text fallback | Two-part corpus trigger and conditional gate record | Not triggered / Not run: 1/10 rows, below both ≥2 and ≥20% conditions |
| 3 — transcript quality and normalization | Five deterministic A1 repeats and gate record | Conditionally eligible after Gate 1 passes; not run |
| 4 — enrichment quality and grounding | One exact local-model comparison and gate record | Conditionally eligible after Gates 1 and 3 pass; model/runtime preparation only; zero inference |
| 5 — visual value | Conditional blind comparison or not-triggered record | Not triggered before Gate 4; if the <80% trigger fires, this seal requires Triggered but blocked / Not run because no visual method/media is sealed |
| 6 — cost, reliability, security, and product fit | Threat model, safety evidence, matrices, supported-input table, and gate record | Required for every upstream outcome; pending |
| Council | Three independent PM memos and council recommendation v1/review/v2 | Required for every upstream outcome; pending |

## Conditional downstream package

PRD, UX/UI, HTML prototypes, and the technical implementation plan are intentionally absent. They may be created only after all required gates pass and the council records **Go** or **Limited-go**. A **Defer** or **No-go** decision prohibits manufacturing those artifacts.

## Delivery

| Deliverable | Status |
|---|---|
| Publication-safe Wiki source updates | Not started |
| Append-only `RUNNING_LOG.md` milestones | Final pre-seal implementation milestone and same-reviewer wording qualification appended; later milestones remain append-only |
| Documentation/link verification | Stabilized link/schema/privacy/diff and master-index reachability checks passed; a final no-drift rerun is required immediately before Commit A |
| Research commits | Not started |
| Remote research branch | Not pushed |
| Review-only pull request | Not opened |
