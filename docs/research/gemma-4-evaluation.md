# Research — Gemma 4 evaluation for AI Brain

**Date:** 2026-05-13
**Source:** `https://deepmind.google/models/gemma/gemma-4/` + `https://deepmind.google/models/gemma/`
**Trigger:** User-requested deepsearch on Gemma 4 + recommendation for the project
**Status:** Initial recommendation — pending user decision before any code work

> **TL;DR — Recommendation: stay on Qwen3-8B for general enrichment + Ask. Add **Gemma 4 E4B** (one of the edge variants) as an *experimental track* for Brain's on-device / Android-side use case (currently untouched in the architecture). Do **not** swap the desktop enrichment model right now — Qwen3-8B is working, Gemma 4 31B is heavier and the win is incremental. **The clear pivot Gemma 4 enables** is "what if Brain could run a small model directly on the phone for low-latency offline summarization?" — that's a v0.7.x or v0.8.x candidate, not v0.6.x.

---

## §1. What Gemma 4 actually is

| Aspect | Detail |
|---|---|
| **Release** | April 2026 |
| **Variants** | E2B + E4B (edge), 26B + 31B (consumer GPU) |
| **Multimodal** | Audio + vision (per DeepMind page) |
| **Languages** | 140 |
| **Function calling** | Native |
| **Distribution** | Hugging Face, Ollama, Kaggle, LM Studio, Docker |
| **Frameworks** | JAX, Keras, Google AI Edge, GKE, Unsloth |
| **Context window** | Not specified on the page |
| **License** | Not specified on the page (Gemma 1–3 used Google's "Gemma Terms of Use" — open-weights with commercial use, but not OSI-approved) |
| **Quantization formats** | Not specified on the page |

### Benchmarks (Gemma 4 31B IT Thinking variant)

| Benchmark | Gemma 4 31B IT | Gemma 3 27B (comparison) |
|---|---|---|
| MMLU Multilingual | 85.2% | — |
| MMMU Pro (multimodal) | 76.9% | — |
| AIME 2026 (math) | 89.2% | 20.8% |
| LiveCodeBench v6 | 80.0% | 29.1% |
| GPQA Diamond | 84.3% | — |
| τ2-bench retail (agentic tool use) | 86.4% | — |

**Gemma 4 31B is a major capability jump over Gemma 3 27B** — especially in math + code (4–4.5×). The "Thinking" variant uses chain-of-thought.

### Edge variants (E2B / E4B)

DeepMind positions these as: *"run completely offline with near-zero latency on edge devices like phones, Raspberry Pi, and Jetson Nano."* Audio + vision support claimed. **No published benchmarks for E2B/E4B** on the page reviewed — would need separate model-card lookup.

---

## §2. Where Gemma 4 could fit in AI Brain

Brain currently uses Ollama with two models (per `data/brain.sqlite` Ollama probe):
- `qwen3:8b` — enrichment (LLM summary, tags, category, quotes) + Ask (RAG)
- `nomic-embed-text` — 768-dim embeddings

Gemma 4 has four candidate roles:

### Role A — Replace Qwen3-8B for enrichment + Ask (desktop)

Use Gemma 4 31B IT (or 26B) as the enrichment + Ask LLM on the M1 Pro.

| Pro | Con |
|---|---|
| Significantly stronger benchmarks (AIME, LiveCodeBench, GPQA) | Qwen3-8B is enough for "summarize a Substack post"; 31B is overkill |
| Native function calling (could enable better tag extraction) | 31B = ~18 GB at Q4_0 — likely OK on 32 GB RAM but tight with the rest of the stack running |
| Multimodal (could enrich images, screenshots) | Qwen3-8B already shipped + tested; swapping introduces enrichment-quality regression risk |
| Multilingual (140 languages) | You're English-primary; not a meaningful win |
| Active 2026 model; Qwen3 release date June 2025 | Switching cost: re-run enrichment regression suite across existing 1k–5k items to verify quality didn't drop on any |

**Verdict:** **Not worth it for v0.6.x.** Qwen3-8B is good enough; the enrichment quality bar is "summarize and tag, do not hallucinate" — this is solved. Reserve a Gemma-4-31B trial for v0.8.x or later when there's a specific quality complaint to drive it.

### Role B — Add Gemma 4 E4B as on-device model for Android

Use E4B (or E2B) inside the APK to enable **on-device summarization for offline captures**.

| Pro | Con |
|---|---|
| Solves a real architectural gap: today, captures made offline (per `docs/plans/v0.6.x-offline-mode-apk.md`) sit in the outbox queue with no enrichment; the laptop has to be reachable | E4B running in a Capacitor WebView is non-trivial — would need a native plugin bridging to Google AI Edge SDK |
| User sees "Saved + tags + summary" instantly on capture, even offline; sync happens later | Phones vary wildly in NPU/CPU capability; Pixel 7 Pro is fine; older devices struggle |
| Phones unfreeze briefly even when backgrounded — a 2GB model running on the AI Engine could finish a summary in those windows | Battery cost — running an LLM on a phone is meaningful drain |
| Aligns with Brain's "local-first" identity; no LLM data leaves the device | Quality: E4B is 4B params; expect summaries noticeably worse than Qwen3-8B; degrades the data going into the embedded library |
| When laptop comes back online, server-side enrichment can re-run if E4B output was poor; both versions stored | Adds a major moving part; current architecture is "thin WebView, server does everything" — this breaks that |

**Verdict:** **Strong candidate for v0.8.x or later** — once the offline-mode foundation in v0.6.x ships and dogfooding reveals whether the "captures sit unenriched until laptop comes back" UX is actually painful. Don't pre-build for it. Just file the architectural option.

### Role C — Replace `nomic-embed-text` with EmbeddingGemma (sibling model)

DeepMind's Gemma family includes **EmbeddingGemma** as a separate on-device embedding model.

| Pro | Con |
|---|---|
| Could run on Android device → embeddings of offline-captured PDFs without server | nomic-embed-text 768-dim works; no observed quality issue |
| Same provenance as enrichment if Roles A or B taken | Vector dimension mismatch with existing `chunks_vec` (768) — would require a full re-embed migration if dim differs |
| Multilingual better than nomic | English-primary library; not a meaningful win |

**Verdict:** **Not worth it.** `nomic-embed-text` works fine; re-embedding 1k–5k items just to swap providers is risk for marginal gain. Revisit only if Gemma's embedding model becomes drastically better-benchmarked AND the dim matches.

### Role D — MedGemma / VaultGemma / FunctionGemma — speciality variants

| Variant | Relevance to Brain |
|---|---|
| MedGemma | Zero — Brain isn't medical |
| VaultGemma (differentially private) | Interesting if Brain ever ships multi-user, but single-user today — no need |
| FunctionGemma | Possibly useful if Brain ever exposes structured-tool-use to the LLM (e.g., "auto-categorize this note, then update the items table") — but that's not on any roadmap |
| T5Gemma 2 (encoder-decoder) | Encoder-decoder fits structured-extraction better than autoregressive; could be a win for the enrichment stage's structured output (tags + category JSON). Worth a 1-hour spike at most. |
| ShieldGemma 2 (safety classifier) | Zero — single-user content moderation isn't a Brain concern |

---

## §3. Trade-off matrix — at a glance

| Role | Effort | Risk | Win | Verdict |
|---|---|---|---|---|
| A: Swap Qwen3-8B → Gemma 4 31B (desktop) | Medium (regression test enrichment) | Medium (quality regression on existing items) | Marginal (Qwen3 is enough) | **Skip for v0.6.x** |
| B: Add Gemma 4 E4B on Android (offline enrichment) | High (Capacitor plugin, native bridge) | Medium (battery, phone variance) | Real (closes offline-capture UX gap) | **v0.8.x candidate, file in BACKLOG** |
| C: Swap nomic-embed → EmbeddingGemma | Medium (re-embed migration) | Low | None observed | **Skip** |
| D-1: T5Gemma 2 for structured enrichment | Low (1-hour spike) | Low | Maybe small (better JSON adherence) | **Worth a spike if enrichment hallucinates fields** |
| D-2: VaultGemma (differential privacy) | High | Low | None today | **Skip until multi-user** |

---

## §4. Recommendation

### Now (v0.6.x window)

**Do nothing.** Don't swap models. Qwen3-8B + nomic-embed-text are working. Today's session shipped two real bug fixes (`54e7a9b` embed-worker, `e7695e6` PDF read) that closed actual user-visible regressions — that's the higher-value work. Adding "evaluate Gemma 4 for enrichment" is plausible-sounding work that produces no user-visible improvement.

### File in BACKLOG.md

Two specific items to add (not promote to active phase):

1. **GEMMA-1 — On-device summarization spike (post-v0.6.x).** Once `v0.6.x-offline-mode-apk.md` ships and we have real data on how often "captures-without-enrichment-sitting-in-outbox" is annoying, evaluate:
   - Gemma 4 E4B via Google AI Edge SDK
   - MediaPipe LLM Inference (an alternative path — Google's runtime that can run small LLMs on Android phones)
   - Question: is 4B params enough to produce "useful" summaries? (Compare against Qwen3-8B output side-by-side on 20 representative captures.)
   - Battery cost: 5-minute summary on a Pixel 7 Pro = ~3% battery? Measure.

2. **GEMMA-2 — T5Gemma 2 structured-output spike (any time).** 1-hour low-risk: feed T5Gemma 2 the same enrichment prompts Brain currently feeds Qwen3-8B and compare JSON-adherence on the tag/category/quote fields. If Qwen3 ever produces a malformed JSON that breaks the pipeline, this becomes a real fix-candidate. If Qwen3 never breaks, defer indefinitely.

### Don't yet

- Don't swap Qwen3-8B → Gemma 4 31B without a *specific* enrichment-quality complaint driving it.
- Don't re-embed the library to switch from nomic to EmbeddingGemma. Vector store is the most expensive thing to migrate.
- Don't introduce a multi-model serving setup until single-model + single-quality is confirmed insufficient.

---

## §5. What needs verification before any GEMMA-1 work starts

If/when GEMMA-1 spike is triggered:

1. **License compatibility.** Gemma's terms forbid "harmful uses" and require sharing modifications under same terms. Confirm Brain's distribution model (single-user, never published) is unaffected — it should be, but check.
2. **Quantization format on Android.** Google AI Edge typically expects `.tflite` or `.litert` format, not GGUF. Verify Gemma 4 E4B is published in an Android-runnable format, not just GGUF.
3. **Memory footprint.** E4B at INT8 ≈ 4 GB. Pixel 7 Pro has 12 GB RAM but typical free-RAM available to a Capacitor app is ~2 GB. Need INT4 or smaller quant — verify availability.
4. **Latency budget.** First-token latency on Pixel 7 Pro for a 4B model is typically 200–500 ms; full summary of a 2k-token capture could take 5–15 seconds. Acceptable for "saved offline, summarizing in background" but not "saved with toast."
5. **Privacy threat model.** On-device LLM summarization is a *privacy win* (no content leaves the device). Validate against `docs/research/privacy-threat-delta.md` (if it exists) to confirm.

---

## §6. Honest limitations of this evaluation

- The DeepMind page reviewed didn't disclose: context window, exact license, RAM/VRAM requirements, quantization formats. A real GEMMA-1 spike must read the model card (typically on Hugging Face or Google AI for Developers) to confirm those.
- E2B/E4B benchmark numbers were not on the page — only 31B Thinking benchmarks. Edge model quality may be considerably weaker than the 31B numbers suggest; the 4–4.5× math-jump is for the big model.
- Qwen3-8B vs Gemma 4 31B head-to-head benchmarks weren't directly compared on the DeepMind page (which compared Gemma 4 vs Gemma 3). A real swap evaluation needs an independent benchmark like LMArena or a custom Brain-specific eval set.
- "On-device LLM on Android" is the hyped-but-unproven part of Gemma 4. Many announcements; few production-quality apps. Spike before commitment.

---

## §7. Cross-references

- Brain's current model setup: `qwen3:8b` + `nomic-embed-text` (per `data/brain.sqlite` Ollama probe today)
- Offline-mode plan that exposes the unenriched-offline-capture gap: `docs/plans/v0.6.x-offline-mode-apk.md` v2
- Cloud-migration research that may interact with model strategy: `docs/research/v0.6.0-cost-summary.md`, `docs/research/ai-provider-matrix.md`, `docs/research/embedding-strategy.md`, `docs/research/enrichment-flow.md` (all uncommitted Lane C work; verify state before relying on them)
- Lane C v0.6.0 cloud pivot — if the laptop becomes Hetzner, Gemma 4 31B on Hetzner is a plausible swap candidate instead of running locally

---

## §8. Appendix — decision authority

The user (Arun) is non-technical; this evaluation is written so that the user can answer the GEMMA-1 / GEMMA-2 BACKLOG promotion questions with a one-line direction. No code change should be made on this topic without explicit user approval; the recommendation in §4 is:

> *"Do nothing now. File two BACKLOG entries (GEMMA-1 on-device, GEMMA-2 structured-output spike). Revisit GEMMA-1 after offline-mode v0.6.x ships and we know whether unenriched-offline-captures is annoying enough to justify the work."*
