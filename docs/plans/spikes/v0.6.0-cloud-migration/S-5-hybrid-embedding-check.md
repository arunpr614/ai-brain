# S-5: Hybrid — can embeddings stay local (cheap) while generation moves to API?

**Estimated effort:** 1 hour
**Depends on:** S-1 (chunk volume), S-4 (if S-4 evaluates hosted embedding providers too)
**Produces:** a clear answer — do we run embeddings on the cloud VM (CPU, maybe Ollama or alternative) or through a hosted embedding API?

---

## 0. Why this spike

Generation (Claude, GPT) requires GPUs or expensive API calls. Embeddings (turning a chunk into a 768-dim vector) are much cheaper — they can run on CPU or on relatively inexpensive hosted APIs (Voyage, Cohere, OpenAI text-embedding-3-small, Gemini text-embedding).

**If** we keep embeddings running locally on the cloud VM (still CPU-based via `nomic-embed-text`), we:
- Don't pay per-embedding
- Don't send chunk text to a cloud embedding provider (privacy win)
- Need a VM with enough RAM to run the embedding model (~300 MB for `nomic-embed-text`)

**If** we move embeddings to a hosted API, we:
- Get away with a cheaper VM (no LLM process at all)
- Pay per-embedding (still cheap; e.g., OpenAI text-embedding-3-small is $0.02/1M tokens)
- Send chunk content to the embedding provider

The question: **which is cheaper and simpler for Brain's stack?**

## 1. Questions to answer

### 1.1 Current embedding model on minimal VMs

- `nomic-embed-text` via Ollama: works on a 2 GB RAM Linux box? (Model is ~274 MB; Ollama overhead is ~500 MB; so yes on 2 GB but tight.)
- What's the cheapest CPU-only alternative? Candidates:
  - Run `nomic-embed-text` via Ollama (same as today)
  - Run via `llama.cpp` (lighter-weight; direct binary)
  - Run via `fastembed` (Python, no LLM framework overhead; ONNX-optimized)
  - Run via `@xenova/transformers` (browser-compatible; Node-runnable)
- Benchmark: embedding throughput on a 2 vCPU, 4 GB ARM VM (Hetzner CPX11 or similar). Target: ≥ 5 chunks/s sustained.

### 1.2 Hosted embedding provider options

For each, capture:
- Pricing per 1M tokens
- Embedding dimension options
- Rate limits
- Structured output (not relevant; embeddings are structurally simple)
- Latency per request (this matters — retrieval is user-facing, so embedding the user's question must be fast)

Providers:
- OpenAI text-embedding-3-small (1536 dim; can truncate to 768)
- OpenAI text-embedding-3-large (3072 dim)
- Voyage AI voyage-3 (1024 dim)
- Cohere embed-english-v3 (1024 dim)
- Gemini text-embedding-004 (768 dim — native match!)

### 1.3 Index-migration cost

Current: `chunks_vec` is a `vec0` virtual table at 768 dim. If we switch to a different embedding model:
- Different dim → migration required
- Different semantics (new model ranks differently) → re-embed EVERY existing chunk

From S-1, the chunk count is known. Backfill time = chunks × per-embedding latency. Estimate:
- 10k chunks × 50 ms each = 500s = 8 min
- 100k chunks × 50 ms = 83 min

Doable, but a real migration cost.

### 1.4 Cost math

From S-1: N_embeddings_per_month (chunks per new item × new items per month).

- Local: $0 per-embedding; VM must be sized for it (affects S-6)
- Gemini text-embedding-004: $0.025 per 1M input tokens; <Brain's usage> per month
- OpenAI text-embedding-3-small: $0.02 per 1M; <Brain's usage>

At Brain's volume these are rounding errors ($0.05/month). The real cost is VM sizing.

### 1.5 The decision framework

| Option | VM cost implication | API cost | Migration cost | Privacy |
|---|---|---|---|---|
| **Keep Ollama nomic-embed-text on cloud VM** | Need 2 GB RAM minimum | $0 | None | Chunks never leave VM |
| **Lightweight ONNX embedder on cloud VM** | Need 1 GB RAM; maybe fits Oracle Free Tier | $0 | Possibly re-embed if different model | Chunks never leave VM |
| **Gemini text-embedding-004 (768 dim)** | Cloud VM can be tiny | ~$0.05/mo | Zero if we keep 768 dim | Chunks sent to Google |
| **OpenAI text-embedding-3-small** | Cloud VM can be tiny | ~$0.05/mo | Need to re-embed + truncate to 768 | Chunks sent to OpenAI |

### 1.6 What about Ask's embed-the-question call?

Ask's retrieval step embeds the user's question (one vector per query). This is 1 embedding per Ask (very low volume). Latency matters here — user waits for this before retrieval starts.

Compare: local embedding (~50 ms on CPU) vs hosted API (~100-200 ms round-trip). The difference is negligible for UX.

## 2. Sources to consult

- Ollama model page for `nomic-embed-text` — https://ollama.com/library/nomic-embed-text
- fastembed — https://github.com/qdrant/fastembed
- @xenova/transformers — https://huggingface.co/docs/transformers.js/index
- Gemini embeddings docs — https://ai.google.dev/gemini-api/docs/embeddings
- OpenAI embeddings — https://platform.openai.com/docs/guides/embeddings
- Voyage AI docs — https://docs.voyageai.com/
- Cohere embeddings — https://docs.cohere.com/docs/embeddings
- MTEB benchmark — https://huggingface.co/spaces/mteb/leaderboard (quality comparison of embedding models)
- Brain code: `src/lib/embed/pipeline.ts` and `src/lib/embed/client.ts` — current Ollama call shape

## 3. Output format

`docs/research/embedding-decision.md`:

```markdown
# Embedding Strategy Decision

## Current state
- Model: nomic-embed-text (768 dim)
- Chunks in index: N
- Monthly embedding volume: M tokens

## Option comparison

| Option | Setup | Monthly $ | VM RAM needed | Migration | Privacy |
|---|---|---|---|---|---|
| Keep nomic-embed-text on cloud VM (Ollama) | ... | ... | 2 GB | None | Local |
| fastembed / ONNX equivalent | ... | ... | 1 GB | Re-embed all N chunks | Local |
| Gemini text-embedding-004 | ... | ~$0.05 | Tiny | None (768 dim) | Sent to Google |
| OpenAI text-embedding-3-small | ... | ~$0.05 | Tiny | Re-embed + truncate | Sent to OpenAI |

## Benchmark results (on <host> with 2 vCPU)

- nomic-embed-text CPU throughput: X chunks/s
- fastembed equivalent: Y chunks/s
- Hosted API latency per batch of 16: Z ms

## Recommendation

<One of the options, with explicit trade-offs.>

## Ask-path embedding latency comparison

- Local embed of user question: 50 ms
- Gemini API: 150 ms
- OpenAI API: 120 ms
- User-experience impact: negligible for Ask's total 2-8 s turnaround.
```

## 4. Success criteria

- [ ] CPU-only embedding throughput measured on a realistic VM tier (not on your M1 Pro)
- [ ] VM RAM floor quantified for each option
- [ ] One recommended option with justification
- [ ] Privacy tradeoff made explicit

## 5. Open questions for the user

1. **Privacy on embedding specifically:** chunks (snippets of articles / transcripts / notes) would be sent to a cloud embedding provider. Same concern as generation? Different stance?
2. **Are you OK re-embedding the whole library to save $/mo?** (One-time cost; takes minutes.)

## 6. Execution note

This spike is mostly a benchmark + a table. Don't over-design. The likely answer is "keep nomic-embed-text on the cloud VM" because (a) embeddings are privacy-sensitive, (b) the cost savings from hosted are negligible at Brain's volume, (c) the current setup works. If S-6 picks a tiny VM that can't run nomic-embed-text, revisit.
