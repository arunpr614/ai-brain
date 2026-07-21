# Gate 4 External Model Screening — Corrected Stop Record

**Original screen:** 2026-07-16<br>
**Corrected:** 2026-07-18<br>
**Current state:** External-provider route stopped; one local candidate prepared prospectively; no inference<br>
**Incremental spend:** USD 0<br>
**Model calls:** 0

## Original question and valid finding

The 2026-07-16 screen asked whether the current AI Brain/OpenRouter path could run a reproducible, zero-incremental-spend enrichment benchmark while keeping private transcript data under an acceptable provider posture.

The external-path stop remains valid. The observed free endpoints did not provide a stable exact route with the required data handling, and the current product adapter could not express or report all required exact-route, ZDR/equivalent, native-schema, zero-price, modality, and provenance controls. No transcript, reference, private repository content, or credential was sent to OpenRouter or an upstream provider.

## Correction

The original record incorrectly elevated four comparison roles into an exact-four minimum and treated a multimodal endpoint as mandatory. The governing brief says **no more than four** enrichment models and includes a multimodal candidate **only if needed**. The earlier 48-request matrix and “no free four-role roster” were therefore not decisive Gate 4 blockers.

The four OpenRouter variants recorded during desk research were discovery leads rejected before candidate freeze or inference. They are outside the experimental model denominator and do not consume the four-candidate cap. Their catalog and data-policy evidence remains preserved in [MODEL_COMPARISON.md](MODEL_COMPARISON.md).

## Local alternative now prepared

One canonical local text candidate is frozen prospectively:

- `Qwen/Qwen3-8B-GGUF` revision `6a569868d07d3bd59e8b97fb001bf8c0b254bb20`, file `Qwen3-8B-Q4_K_M.gguf`, Apache-2.0;
- `ggml-org/llama.cpp` `b9637`, commit `aedb2a5e9ca3d4064148bbb919e0ddc0c1b70ab3`, official macOS arm64 `llama-cli`, MIT; and
- local file-only execution through `sandbox-exec` deny-network plus `--offline`, with no server, remote resolution, provider request, or transcript upload.

The verified model/archive and extracted runtime identities are recorded in [the runtime ledger](../benchmark/model/LOCAL_MODEL_RUNTIME_LEDGER.json). Prompts, output schema, deterministic input contract, provisional five-item local-derivation boundary, publication-safe rubric, result schema, blinded evaluator workflow, and fake-executable-only harness tests are all prospective lock inputs. Model calls remain zero.

## Sequential consequence

Gate 4 is no longer blocked merely because an external four-model/ZDR roster is unavailable. It is now **Prepared prospectively / Not run** and remains ineligible until:

1. all lock inputs pass independent pre-lock review and the two-commit seal;
2. Gate 1 passes its declared five positives and four expected safe rejections; and
3. Gate 3 passes its deterministic repeat for all five positives.

Only then may the one-candidate, five-item local matrix run. Any failure preserves the full denominator and stops dependent work. Gate 5 remains conditional on a completed transcript-only Gate 4 baseline and the locked visual-only trigger; it is not assumed eligible.

This correction is not a quality result, production recommendation, policy approval, or broad feasibility claim. Local runtime quality, grounding, citations, latency, energy use, and scalability remain unmeasured.

## Evidence retained

- [OpenRouter model catalog API](https://openrouter.ai/api/v1/models)
- [OpenRouter ZDR documentation](https://openrouter.ai/docs/guides/features/zdr) and [dynamic ZDR endpoint API](https://openrouter.ai/api/v1/endpoints/zdr)
- [OpenRouter provider-selection controls](https://openrouter.ai/docs/guides/routing/provider-selection)
- [OpenRouter provider/data-collection explanation](https://openrouter.ai/docs/guides/privacy/data-collection)
- [OpenRouter free-model limits](https://openrouter.ai/docs/api/reference/limits)
- [Pinned llama.cpp CLI documentation](https://github.com/ggml-org/llama.cpp/blob/aedb2a5e9ca3d4064148bbb919e0ddc0c1b70ab3/tools/cli/README.md)
- [Pinned Qwen3-8B GGUF revision](https://huggingface.co/Qwen/Qwen3-8B-GGUF/tree/6a569868d07d3bd59e8b97fb001bf8c0b254bb20)
- AI Brain `src/lib/llm/openrouter.ts`, `src/lib/llm/factory.ts`, and `src/lib/enrich/pipeline.ts` at repository base `ad78d77495dcaa90f62aab038fe63ae95cf36862`
