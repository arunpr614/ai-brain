# Prospective Gate 4 Local Model Package

This directory freezes one zero-external-spend, text-only local candidate for Gate 4 after Gate 3. It contains no model output, transcript, media, credential, private path, or inference result.

## Candidate

- Runtime: `ggml-org/llama.cpp` release `b9637`, commit `aedb2a5e9ca3d4064148bbb919e0ddc0c1b70ab3`, official macOS arm64 archive, MIT license.
- Model: `Qwen/Qwen3-8B-GGUF`, revision `6a569868d07d3bd59e8b97fb001bf8c0b254bb20`, `Qwen3-8B-Q4_K_M.gguf`, Apache-2.0.
- Interface: local `llama-cli` only, never a server.
- Boundary: `/usr/bin/sandbox-exec` denies network and the rest of the user home outside explicitly bound inputs/run storage, plus `llama-cli --offline`; local preverified files only.
- Matrix: one model × five eligible normalized transcripts. “Up to four” is a cap, not an exact-four minimum; multimodal remains conditional.

## Files

| File | Purpose |
|---|---|
| [Runtime-ledger schema](LOCAL_MODEL_RUNTIME_LEDGER.schema.json) / [ledger](LOCAL_MODEL_RUNTIME_LEDGER.json) | Exact archive, extracted runtime, model, configuration, and verification state |
| [Authorization schema](LOCAL_DERIVATION_AUTHORIZATION.schema.json) / [ledger](LOCAL_DERIVATION_AUTHORIZATION.json) | Five-item provisional local-only and bounded-evaluator-excerpt boundary |
| [Enrichment-output schema](ENRICHMENT_OUTPUT.schema.json) | Flattened, no-`$ref` generation schema compatible with llama.cpp's JSON-schema grammar subset |
| [System prompt](SYSTEM_PROMPT.txt) | Transcript-as-untrusted-data and evidence-grounding instructions |
| [Format-repair prompt](FORMAT_REPAIR_PROMPT.txt) | Only permitted retry instruction |
| [Input contract](INPUT_CONTRACT.md) | Stable IDs, serialization, deterministic chunks, validation, and retry rules |
| [Key-point-rubric schema](KEY_POINT_RUBRIC.schema.json) / [rubric](KEY_POINT_RUBRIC.json) | Locked publication-safe text and visual key points derived from official NASA page metadata |
| [Gate 3 result schema](GATE_3_RESULT.schema.json) | Exact committed post-seal handoff that binds each admissible model input to Gate 3 evidence and the content/seal commits |
| [Public-run-report schema](PUBLIC_RUN_REPORT.schema.json) | Content-free run evidence, failure, cost, privacy, and retention contract |
| [Blinded packet schema](BLINDED_PACKET.schema.json) | Exact-five, separately shuffled evaluator packet with bounded cited excerpts and hidden candidate identity |
| [Packet-package receipt schema](BLINDED_PACKET_PACKAGE_RECEIPT.schema.json) | Private write-once receipt binding the exact packet-package bundle, public package claim, seal, and source evidence |
| [Evaluation generation schema](BLINDED_EVALUATION_GENERATION.schema.json) / [strict result schema](BLINDED_EVALUATION.schema.json) | Decisions-only local generation shape and trusted-wrapper-enriched evaluator result contract |
| [Adjudication packet schema](BLINDED_ADJUDICATION_PACKET.schema.json), [generation schema](BLINDED_ADJUDICATION_GENERATION.schema.json), and [strict result schema](BLINDED_ADJUDICATION.schema.json) | Deterministically derived A/B disputes, decisions-only local generation, and wrapper-attested adjudication result |
| [Gate 4 evaluation-attempt claim schema](GATE4_EVALUATION_ATTEMPT_CLAIM.schema.json) / [terminal schema](GATE4_EVALUATION_TERMINAL.schema.json) | Public write-once role claims and terminal evidence binding private results, reports, streams, process outcomes, and chronology |
| [Local evaluator run-report schema](LOCAL_EVALUATOR_RUN_REPORT.schema.json) | Private bounded process, stream, resource, prompt, packet, runtime, and result bindings for each evaluator role |
| [Gate 4 aggregate schema](GATE_4_AGGREGATE.schema.json) | Canonical finalizer-produced raw/canonical evidence bindings, five-report deterministic baseline, exact-five pooled/macro qualitative metrics, overall Gate 4 state, and Gate 5 trigger state |
| [Evaluator execution-contract schema](EVALUATOR_EXECUTION_CONTRACT.schema.json) / [contract](EVALUATOR_EXECUTION_CONTRACT.json) | Pinned local runtime/model, separate roles/prompts/seeds/processes, transfer boundary, attempt caps, and provisional-claim boundary |
| [Evaluator A prompt](EVALUATOR_A_SYSTEM_PROMPT.txt), [Evaluator B prompt](EVALUATOR_B_SYSTEM_PROMPT.txt), and [adjudicator prompt](ADJUDICATOR_SYSTEM_PROMPT.txt) | Distinct frozen local role instructions; same-model-family bias remains disclosed |
| [Blinded evaluation tools](../tools/README.md#exact-five-blinded-evaluation-package-mechanically-validated-prospective-controls) | Packet derivation, local role runner, strict result verification, adjudication, aggregation, and Gate 5 computation |
| [Evaluation plan](EVALUATION_PLAN.md) | Post-Gate-3 sequencing, full denominator, blinded evaluation, thresholds, and Gate 5 trigger |

The isolated executable wrapper is under `../../spikes/model-harness/`.

## Current seal state

The model/runtime identity, locked-file chronology, and write-once evaluator orchestration have passed final integrated validation. That evidence alone is not permission to freeze or invoke: exact Commit-A eligibility remains controlled by `PRESEAL_READINESS.json`, the independently reviewed reference ledger, and the same-reviewer closure marker, and invocation additionally requires a verified two-commit seal plus passing upstream gates. `LOCAL_MODEL_RUNTIME_LEDGER.json` remains the authoritative runtime/model readiness switch: any missing artifact, sentinel/mismatch, non-`verified` state, or invalid verification chronology blocks content freeze and invocation. Download completion alone is not permission to run.

Gate 4 additionally requires an exclusively generator-produced `decisions/GATE_3_RESULT.json` whose complete private evidence chain is independently reverified by model harness 1.2.0 and whose normalized-file SHA-256 is bound to the verified content/seal commits. Evaluator packets and results remain local/private, no role transfers content to an external provider, and all AI judgments remain provisional with same-model-family bias disclosed.

Rights state remains provisional and review-required. Full transcript transfer to any external model/provider is still prohibited. Only local deny-network inference and bounded blinded evaluator excerpts are within this research package; neither is legal approval, production authorization, or training permission.

## Primary sources

- [llama.cpp CLI at the pinned commit](https://github.com/ggml-org/llama.cpp/blob/aedb2a5e9ca3d4064148bbb919e0ddc0c1b70ab3/tools/cli/README.md)
- [llama.cpp grammar documentation](https://github.com/ggml-org/llama.cpp/blob/aedb2a5e9ca3d4064148bbb919e0ddc0c1b70ab3/grammars/README.md)
- [Qwen3-8B GGUF at the pinned revision](https://huggingface.co/Qwen/Qwen3-8B-GGUF/tree/6a569868d07d3bd59e8b97fb001bf8c0b254bb20)
- Official NASA SVS pages recorded per item in the rubric and authorization ledger

Sources were accessed 2026-07-18. The candidate must be re-screened on any runtime/model change or by the research expiry date.

**Verification date:** 2026-07-18<br>
**Revalidate by:** 2026-10-14, matching the earlier project-wide expiry, or sooner if the runtime, model, prompt/schema, rights boundary, hardware/runtime behavior, or benchmark input changes<br>
**Known limitations:** no real inference yet; five eligible NASA-derived A1 inputs only; one local quantized text model; AI evaluation only; no energy, production-capacity, arbitrary-video, human-quality, or multimodal result
