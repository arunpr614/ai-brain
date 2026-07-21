# YouTube Transcript and Enrichment — Model Comparison

> **STATUS: ONE LOCAL CANDIDATE FROZEN PROSPECTIVELY / NOT RUN — GATE 4 AWAITS SEAL AND GATE 3**

**Screen corrected:** 2026-07-18<br>
**Experimental candidates frozen:** 1 of the maximum 4<br>
**Model calls:** 0<br>
**External model/provider inference requests:** 0<br>
**Incremental external-service spend:** USD 0<br>
**Verification date:** 2026-07-18<br>
**Revalidate by:** 2026-10-14, matching the earlier project-wide expiry, or sooner on any runtime, model, prompt/schema, rights, route-policy, cost, or benchmark-input change

Gate 4 does not require exactly four models. The governing limit is **no more than four canonical candidates**, and a multimodal candidate is included only if visual evidence is needed. The earlier screening stop incorrectly treated four external roles and a multimodal route as minimum requirements. That reasoning is superseded.

One text-only local candidate is now prospectively frozen for the five eligible A1-derived normalized transcripts:

| Role | Exact candidate | Exact runtime | Data boundary | Experimental denominator |
|---|---|---|---|---:|
| Local text enrichment feasibility | `Qwen/Qwen3-8B-GGUF` at revision `6a569868d07d3bd59e8b97fb001bf8c0b254bb20`, file `Qwen3-8B-Q4_K_M.gguf` | `ggml-org/llama.cpp` release `b9637`, commit `aedb2a5e9ca3d4064148bbb919e0ddc0c1b70ab3`, `llama-cli` | Local files; `/usr/bin/sandbox-exec` denies network; `--offline`; no server or remote resolution | 1/4 |

The model is Apache-2.0 and the runtime is MIT-licensed. The local model file was verified at 5,027,783,488 bytes and SHA-256 `d98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785`. The official macOS arm64 runtime archive was verified at 10,586,927 bytes and SHA-256 `72a93f3e68c31de3e438d462669aad1fcdb423b995e9c41033cc7d27a9a3ac69`; extracted executable, nine sibling libraries, license, version, compiler, platform, modes, and codesign metadata are recorded in the runtime ledger. Download and hash verification are not inference and make no quality claim.

The [prospective model package](../benchmark/model/README.md) freezes the runtime/model ledger, provisional five-item local-derivation authorization, system and format-repair prompts, flattened llama.cpp-compatible JSON schema, deterministic input/chunk contract, publication-safe key-point rubric, public report schema, and blinded evaluation workflow. The [isolated harness](../spikes/model-harness/README.md) verifies every caller-selectable artifact hash before launching local `llama-cli` with file arguments. Its synthetic tests use a fake executable only; they do not load the Qwen model or read a private transcript.

## Eligibility and claim boundary

This package removes the earlier external-provider/ZDR blocker for a **local research run**. It does not prove that Gate 4 passes. Primary inference remains ineligible until the two-commit benchmark seal verifies and Gate 1 and Gate 3 pass their full declared denominators. If either prerequisite fails, no local model call is made.

The provisional authorization permits full transcript processing only inside the local deny-network sandbox. It continues to prohibit complete transcript upload to OpenRouter or any other external model/provider. Only bounded, blinded evidence excerpts may be supplied to the two AI evaluators and threshold adjudicator under per-item count, word, fraction, retention, and non-reconstructability limits. This is neither legal approval nor production authorization.

The prospective matrix is one candidate × five eligible items. At most one sealed format-only retry is allowed per item, so the maximum is ten local invocations, zero provider requests, and USD 0 external-service spend. Local wall-clock latency will be measured; energy consumption and production capacity will not be measured.

Any result is directional evidence for the exact pinned model, quantization, runtime, hardware class, prompt, schema, five-item NASA-derived corpus, and verification date. It cannot support a claim about arbitrary YouTube videos, a four-model ranking, human validation, production scalability, or provider quality.

## Gate 4 thresholds retained

The candidate passes only if the full locked denominator meets all of these requirements:

- structured output valid on at least 90% of first attempts and 100% after the one permitted format-only retry;
- material claims fully supported at least 95% pooled and macro per item;
- zero critical hallucinations;
- timestamp citation accuracy at least 90% pooled and macro per item;
- text-groundable key-point coverage at least 80% pooled and macro per item;
- every failure detectable and recoverable without altering the transcript; and
- exact local latency and USD 0 external-service cost recorded.

Two independent, blinded AI evaluators score support, citation relevance, and locked public-metadata key points. A fresh QA adjudicator sees every A/B metric-decision disagreement after both evaluations are final. All qualitative results remain **AI-evaluated and provisional pending human stakeholder review**.

## External catalog leads — rejected before candidate freeze

The four OpenRouter entries below were point-in-time catalog-discovery leads. None was frozen, called, or included in the experimental model denominator. They are therefore not “four models evaluated,” and adding the local Qwen candidate does not create a five-model roster.

| Discovery role | Public free variant observed on 2026-07-16 | Why it remained outside the experiment |
|---|---|---|
| Low-cost/fast text | [`openai/gpt-oss-20b:free`](https://openrouter.ai/openai/gpt-oss-20b%3Afree/api) | Screened free endpoint did not meet the required transcript data posture; no call |
| Higher-quality text | [`nvidia/nemotron-3-super-120b-a12b:free`](https://openrouter.ai/nvidia/nemotron-3-super-120b-a12b%3Afree/api) | Free-trial provider handling was incompatible with the private transcript boundary; no call |
| Long-context text | [`nvidia/nemotron-3-ultra-550b-a55b:free`](https://openrouter.ai/nvidia/nemotron-3-ultra-550b-a55b%3Afree/api) | No stable eligible exact free route and native-parameter posture was frozen; no call |
| Multimodal discovery lead | [`google/gemma-4-26b-a4b-it:free`](https://openrouter.ai/google/gemma-4-26b-a4b-it%3Afree/api) | Multimodal is conditional, and the free endpoint did not meet the private transcript posture; no call |

The external screen remains useful production-planning evidence. OpenRouter documents provider routing, dynamic ZDR availability, and free-tier limits; these conditions can change and must be re-fetched before any future external experiment. The current AI Brain adapter still cannot enforce or truthfully record every exact-provider, ZDR, native-schema, price-ceiling, multimodal, and provenance control required for an external comparative benchmark. Those product-path limitations do not block this isolated local research harness.

See [OpenRouter data collection](https://openrouter.ai/docs/guides/privacy/data-collection), [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection), [ZDR](https://openrouter.ai/docs/guides/features/zdr), and [free limits](https://openrouter.ai/docs/api/reference/limits). The local sources are the [pinned llama.cpp CLI documentation](https://github.com/ggml-org/llama.cpp/blob/aedb2a5e9ca3d4064148bbb919e0ddc0c1b70ab3/tools/cli/README.md), [grammar documentation](https://github.com/ggml-org/llama.cpp/blob/aedb2a5e9ca3d4064148bbb919e0ddc0c1b70ab3/grammars/README.md), and [pinned Qwen repository revision](https://huggingface.co/Qwen/Qwen3-8B-GGUF/tree/6a569868d07d3bd59e8b97fb001bf8c0b254bb20).

## Current decision

Gate 4 is **Prepared prospectively / Not run**. The exact local candidate and evaluation contract are ready to enter Commit A only after independent pre-lock review and complete lock-input verification. Quality, groundedness, latency, and Gate 5 eligibility remain unknown until the sealed sequential run. No model ranking or feasibility pass is claimed.
