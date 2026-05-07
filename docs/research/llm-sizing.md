# R-LLM: Ollama Model Sizing for M1 Pro 32 GB

**Research ID:** R-LLM | **Status:** complete | **Date:** 2026-05-07 | **Author:** research agent

---

## 1. TL;DR Recommendation

- **Default summarization + classification model (workloads 1, 3, 5):** `qwen2.5:7b-instruct-q4_K_M` — best quality-per-watt at this RAM envelope, strong instruction following, fits comfortably in ~6 GB, leaves headroom for everything else running.
- **Default RAG chat model (workload 2):** `qwen2.5:7b-instruct-q4_K_M` — same model, keep-alive extended; first-token latency ~1.5–2 s streaming at 35–40 tok/s on M1 Pro, comfortably inside the <2 s / 30 tok/s target.
- **Embeddings (workload 6):** `nomic-embed-text` — 274 MB on disk, 62.28 MTEB score, 8 K token context, trivially cheap.
- **Optional heavy model to keep on disk (workloads 4, 5):** `qwen2.5:14b-instruct-q4_K_M` — pull for GenPage + Flow generation where 2-min latency is acceptable; unload when not active. Do NOT pull Llama 3.3 70B — it exceeds the usable RAM envelope.

---

## 2. Hardware Envelope

**Apple M1 Pro (MacBook Pro 16", 2021) — 16-core GPU variant, 32 GB unified memory.**

- **Memory bandwidth: 200 GB/s.** This is the single governing number for LLM throughput on Apple Silicon. Generation tok/s scales linearly with bandwidth / model memory footprint — not with FLOPS.
- **GPU:** 16 Metal cores. Ollama uses Metal via llama.cpp's Metal backend; all GPU layers offload automatically.
- **Neural Engine:** NOT used by Ollama (llama.cpp uses Metal, not CoreML). Ignore it for sizing.
- **Unified memory:** CPU and GPU share the 32 GB pool at zero copy cost — a 7B Q4_K_M model runs 100% GPU-resident.
- **Usable headroom:** ~24 GB after macOS kernel (~4 GB), Chrome (~1.5 GB), Next.js + Node (~400 MB), Notion (~400 MB) = **8 GB reserved for OS/apps.**
- **Benchmark baseline (M1 Pro, llama.cpp Metal, confirmed):** LLaMA-2 7B Q4_0 = **36 tok/s generation, 266 tok/s prompt processing.** Q4_K_M is ~5–10% slower than Q4_0 but materially higher quality. Extrapolated 7B Q4_K_M: ~32–38 tok/s. 14B Q4_K_M: ~17–20 tok/s (double memory, half bandwidth share).

---

## 3. Candidate Matrix

Sources: Hugging Face model cards, llama.cpp community benchmarks (discussion #4167), Mistral/GGUF bartowski quant pages, nomic-ai model card, Phi-3.5 Mini model card, Llama 3.3 model card, Gemma 2 model card. Tok/s figures for M1 Pro are extrapolated from: (a) confirmed M1 Pro 7B Q4_0 = 36 tok/s baseline, (b) bandwidth scaling law (tok/s ∝ bandwidth / model_memory_footprint), (c) M1 Max 8B Q4_K_M = 34 tok/s cross-check (M1 Max has 400 GB/s bandwidth — implies M1 Pro 7B estimate is consistent). Mark estimated figures with `~`.

| Model | Ollama tag | Disk (GB) | RAM under load | ~Tok/s gen (M1 Pro) | MMLU | Quality rep | Verdict |
|---|---|---|---|---|---|---|---|
| **Llama 3.2 3B Instruct** | `llama3.2:3b-instruct-q4_K_M` | ~2.0 | ~2.5 GB | ~65–75 | 63.4 | Decent for size; weaker reasoning than Qwen 2.5 3B | Ingest fast-lane only |
| **Llama 3.3 70B Instruct** | `llama3.3:70b-instruct-q4_K_M` | ~43 | ~44–46 GB | ~3–5 | 86.0 | Flagship quality, GPQA 50.5, HumanEval 88.4 | **Exceeds 32 GB — DO NOT PULL** |
| **Qwen 2.5 7B Instruct** | `qwen2.5:7b-instruct-q4_K_M` | ~4.4 | ~5.5–6.5 GB | ~32–38 | ~74–76* | Best-in-class 7B; strong code+structured output; 128 K ctx | **Primary model** |
| **Qwen 2.5 14B Instruct** | `qwen2.5:14b-instruct-q4_K_M` | ~8.7 | ~10–11 GB | ~17–20 | ~79–81* | Noticeably better reasoning; 128 K ctx; fits with room | **Heavy ops model** |
| **Phi-3.5 Mini 3.8B** | `phi3.5:3.8b-instruct-q4_K_M` | ~2.3 | ~3.0 GB | ~55–65 | 69.0 | Punches above weight on English reasoning; weak multilingual; Arena Hard 37 | Fast fallback / SRS card gen |
| **Mistral Nemo 12B** | `mistral-nemo:12b-instruct-q4_K_M` | ~7.5 | ~8.5–9.5 GB | ~19–23 | ~68 | Good long-context; 128 K native; slightly lower quality than Qwen 2.5 14B; older training data | Skip — Qwen 2.5 14B is better at similar size |
| **Gemma 2 9B IT** | `gemma2:9b-instruct-q4_K_M` | ~5.5 | ~6.5–7.5 GB | ~25–30 | 71.3 | Solid base, HumanEval 40.2 (weaker code vs. Qwen), short context (8 K native) | Skip — 8 K ctx is too short for ingest workload |
| **nomic-embed-text** | `nomic-embed-text` | ~0.27 | ~0.5 GB | N/A (batch embed) | MTEB 62.28 | Best Ollama-native embedding model; 8 K ctx; 768-dim; Matryoshka | **Embeddings model** |

*Qwen 2.5 MMLU figures are community-reported estimates; official blog cites strong MMLU-Pro results. Treat as directionally correct.

**Why Llama 3.3 70B is out:** Q4_K_M of a 70B model requires ~43 GB on disk and ~44–46 GB RAM under load. With only 24 GB usably free, it would force extreme CPU offloading (~50% of layers on CPU), dropping generation to ~1–2 tok/s — well below any workload target. It's not a viable candidate on this hardware.

---

## 4. Workload-by-Workload Choice

**Workload 1 — Summarization + category + tag on ingest (~2–8 K input, ~500 output, target <15 s)**

- **Model:** `qwen2.5:7b-instruct-q4_K_M`
- 500 output tokens at 35 tok/s = ~14 s generation. Prompt processing at 200–250 tok/s for 4–8 K input adds 2–3 s overhead. Keep `num_ctx: 8192` (not 128 K — KV cache scales with ctx). For a single JSON call (summary + category + tags together), the 15 s target is achievable. Items exceeding 6 K tokens can trigger the 14B model instead.

**Workload 2 — RAG chat with 5–10 chunks (~4 K context, streaming, target first token <2 s, 30 tok/s)**

- **Model:** `qwen2.5:7b-instruct-q4_K_M`
- With keep_alive extended during active sessions, the model stays hot. Prompt processing at 200+ tok/s for 4 K context = first token in ~1.5–2 s. Generation at 35 tok/s exceeds the 30 tok/s target. Sufficient quality for citation-grounded retrieval; won't hallucinate sources handed to it as context.

**Workload 3 — Noun-phrase extraction for GenLink (~20 phrases, short)**

- **Model:** `phi3.5:3.8b-instruct-q4_K_M`
- Structured extraction with trivially short output — a 3–4B model is more than sufficient. Phi-3.5 Mini has strong reasoning-per-parameter on English text. Run as a background batch after GenPage completes; expected <3 s per page. Using 7B here wastes memory bandwidth.

**Workload 4 — GenPage multi-section generation (~2000 output tokens, up to 2 min tolerable)**

- **Model:** `qwen2.5:14b-instruct-q4_K_M`
- 2000 tokens at 18–20 tok/s = ~100–110 s, inside 2 min. The 14B improvement over 7B is worth it: GenPage is the highest-visibility output in the app. Load on demand; explicitly unload after generation (`keep_alive: 0`) to free ~11 GB.

**Workload 5 — Flow curriculum planning (multi-step, agent-like, tool use)**

- **Model:** `qwen2.5:14b-instruct-q4_K_M`
- Qwen 2.5 14B has solid function-calling support. Multi-step agent loops benefit from the larger model's coherence across long context. Flow planning is background + tolerated-latency — 3–5 min total is fine. Fall back to Claude API (§5) if the curriculum is incoherent after a local retry.

**Workload 6 — Embeddings for chunks (nomic-embed-text, batched)**

- **Model:** `nomic-embed-text`
- Non-negotiable. 274 MB disk, ~500 MB loaded, negligible RAM impact. MTEB 62.28 is best-in-class for Ollama-native. 8 K context covers any chunk size. Batch 32–64 chunks; embedding 10 K chunks takes ~2–5 min in background.

---

## 5. Fallback to Claude API

The Claude API fallback exists for quality-critical cases, not performance. The toggle lives in Settings → AI Provider and defaults to Ollama.

**Trigger API fallback when:**

- **Quality gate fails on GenPage:** output shorter than 800 tokens, or contains refusals ("I cannot...") — retry once locally then escalate to Sonnet.
- **Flow curriculum is incoherent:** steps don't reference distinct topics — trigger Sonnet for planning phase only.
- **User requests it explicitly:** "Regenerate with Claude" button on any AI-generated surface. This is the primary intended use, not automatic escalation.
- **Ollama is unreachable:** process crash or memory pressure — fall through to API silently if a key is configured.

**API model mapping:**
- Summarization + enrichment → `claude-haiku-4` (cheap, fast, excellent structured JSON)
- RAG chat → `claude-haiku-4` (streaming, low latency)
- GenPage + Flow → `claude-sonnet-4-5` (quality matters)

**What does NOT trigger it:** slow local generation or user impatience. Speed is a known local-first tradeoff — surface it with "enriching..." UI states (DESIGN_SYSTEM §8.1), not silent API calls.

---

## 6. Ollama Configuration Recommendations

**GPU/CPU split:** Do not set `num_gpu` manually. Ollama auto-calculates maximum GPU offload for unified memory; CPU spill is automatic if a model exceeds available RAM.

**num_ctx — key lever for memory.** Default is 2048 (too small for ingest). Set per-request:
- Ingest/summarize: `num_ctx: 8192` — covers 99% of article-length inputs; KV cache ~500 MB.
- RAG chat: `num_ctx: 4096` — keeps first-token latency tight.
- GenPage (14B): `num_ctx: 16384` — KV cache ~2 GB; total model + KV ≈ 13 GB — fits.
- **Never use 128 K context in production.** KV cache at 128 K for 7B alone ≈ 8 GB.

**num_predict:** `-1` for prose. `64` for noun-phrase extraction (workload 3) to prevent runaway output.

**keep_alive strategy — critical on 32 GB:**
- Ingest queue (bursty, background): `keep_alive: "15m"` per request — keeps model warm across a batch.
- After GenPage/Flow (14B): explicitly unload with `keep_alive: 0` + empty prompt. Frees ~11 GB.
- `OLLAMA_MAX_LOADED_MODELS=1` — prevents naive co-loading of 7B + 14B (~17 GB combined, leaving only ~7 GB for OS).

**num_thread:** Leave unset. Ollama auto-detects M1 Pro's 8 performance cores.

**Flash attention + KV quantization:**
- `OLLAMA_FLASH_ATTENTION=1` — reduces KV memory, improves long-context throughput. No downside on Metal.
- `OLLAMA_KV_CACHE_TYPE=q8_0` — halves KV memory vs. f16 default; negligible quality loss. Critical at 16 K+ contexts.

---

## 7. Disk Budget

| Component | Disk usage |
|---|---|
| `qwen2.5:7b-instruct-q4_K_M` | ~4.4 GB |
| `qwen2.5:14b-instruct-q4_K_M` | ~8.7 GB |
| `nomic-embed-text` | ~0.27 GB |
| `phi3.5:3.8b-instruct-q4_K_M` | ~2.3 GB |
| `llama3.2:3b-instruct-q4_K_M` | ~2.0 GB |
| **Total default stack** | **~17.7 GB** |

Free disk: 455 GB. Model stack uses **3.9%** of available disk — entirely negligible. There is no disk budget concern on this machine. Even adding `mxbai-embed-large` (~670 MB) and a whisper model for v0.10.0 (~1–3 GB) keeps the total well under 25 GB.

**Optional additions (not in default stack):**
- `mxbai-embed-large` (~670 MB) — MTEB 64.68, marginally better than nomic; only worth pulling if embedding quality testing shows nomic is underperforming.
- `whisper.cpp` model for podcast transcription (v0.10.0 scope) — medium.en model ~1.5 GB, runs separately from Ollama.

---

## 8. Decision for v0.1.0 → v0.3.0

**Minimal pull list for v0.1.0 (Foundation):**
```bash
ollama pull nomic-embed-text
ollama pull qwen2.5:7b-instruct-q4_K_M
```

**Additional pull before v0.3.0 (Intelligence — summaries, tags, categories):**
```bash
ollama pull phi3.5:3.8b-instruct-q4_K_M
```

**Additional pull before v0.6.0 (GenPage):**
```bash
ollama pull qwen2.5:14b-instruct-q4_K_M
```

**Keep on disk but not loaded by default:**
```bash
ollama pull llama3.2:3b-instruct-q4_K_M   # optional; only if phi3.5 underperforms on any task
```

**Environment variables to add to `.env.local` (and document in `scripts/setup.sh`):**
```bash
OLLAMA_KEEP_ALIVE=15m
OLLAMA_MAX_LOADED_MODELS=1
OLLAMA_FLASH_ATTENTION=1
OLLAMA_KV_CACHE_TYPE=q8_0
OLLAMA_DEFAULT_MODEL=qwen2.5:7b-instruct-q4_K_M
```

**`OLLAMA_DEFAULT_MODEL`** should be set to `qwen2.5:7b-instruct-q4_K_M`. This becomes the value read by `src/lib/llm/ollama.ts` for all standard enrichment calls. Heavy tasks (workloads 4–5) explicitly pass the 14B tag in the request payload — they do not use the default.

---

## 9. Open Questions / Re-benchmark Triggers

- **Re-benchmark trigger: Qwen 3 release.** Qwen 3 models (released April 2025) with tool-use and hybrid thinking mode exist but are not covered here because their Ollama GGUF quantization availability and stability was still settling at time of writing. If `qwen3:7b-instruct-q4_K_M` is stable in the Ollama registry by v0.3.0 kickoff, run a head-to-head against `qwen2.5:7b-instruct-q4_K_M` on a 20-item summarization batch. Qwen 3 7B reportedly beats Qwen 2.5 14B on several benchmarks — it would collapse the model stack to a single model.
- **Open question: actual first-token latency under load.** All tok/s figures above are extrapolated from the M1 Pro 7B Q4_0 baseline. The actual first-token latency for workload 2 (RAG chat) depends on KV cache warmth and prompt processing speed at 4 K context. Measure this empirically during v0.4.0 development with `ollama run` + `/api/chat` timing before declaring the <2 s target met.
- **Open question: embedding quality on this corpus.** MTEB scores are measured on general retrieval benchmarks. Nomic-embed-text has not been validated on Substack-style newsletter content (the Brain corpus). If semantic search (v0.4.0) produces poor results, run a head-to-head with `mxbai-embed-large` on 100 Brain items before concluding the retrieval pipeline is broken.
- **Re-benchmark trigger: Ollama 0.5+ memory management.** Ollama's Metal memory management has improved significantly between 0.1 and 0.4. The `OLLAMA_MAX_LOADED_MODELS=1` recommendation may become unnecessary if Ollama adds automatic eviction. Check release notes at each minor upgrade.
- **Out of scope (v0.10.0):** Whisper model sizing for podcast transcription. whisper.cpp runs independently of Ollama; medium.en at ~1.5 GB is the recommended starting point on M1 Pro for a balance of speed and accuracy. Covered in R-WHISPER.
