# v0.6.0 Embedding Strategy

**S-5 output — 2026-05-12**
**VM locked:** AWS Lightsail Mumbai, 2 GB RAM / 1 vCPU / 60 GB SSD (~$10/mo)
**AI provider locked:** Claude Haiku 4.5 (enrichment) + Claude Sonnet 4.6 (Ask) — Anthropic has no embeddings API.

---

## Recommendation

**Use Gemini `text-embedding-004` (hosted, free tier is fine at this volume) as the embedding provider.** The $0 operational cost, 768-dim native match to the existing `chunks_vec` schema, and zero RAM pressure on the 2 GB VM outweigh the minor privacy tradeoff of sending chunk text to Google. Ollama on the VM is operationally fragile for a 1-vCPU box already running Node/Next.js + SQLite.

---

## Options compared

| Option | Cost/mo | RAM on VM | Latency (embed 1 chunk) | Privacy | Op burden |
|---|---|---|---|---|---|
| **Ollama nomic-embed-text on VM** | $0 | ~800 MB (model 274 MB + Ollama daemon ~500 MB) | 200–600 ms on 1 vCPU [est.] | Chunks stay on VM | High — systemd unit, model pull at boot, memory pressure |
| **Gemini text-embedding-004** | $0 (free tier) / ~$0.03 if charged | 0 MB (no local process) | 100–200 ms API RTT | Chunks sent to Google | Very low — one API key env var |
| **OpenAI text-embedding-3-small** | ~$0.02–0.05 | 0 MB | 100–200 ms API RTT | Chunks sent to OpenAI | Very low — one API key env var |
| **Voyage AI voyage-3** | ~$0.06 (1 MTok = $0.06) | 0 MB | 100–200 ms API RTT | Chunks sent to Voyage | Low — another account |
| **Cohere embed-english-v3** | ~$0.10 | 0 MB | 100–200 ms API RTT | Chunks sent to Cohere | Low — another account |

---

## Fit check: nomic-embed-text on Lightsail 2 GB

**Memory math (worst-case concurrent load):**

| Process | RSS estimate |
|---|---|
| Node.js / Next.js app (static pages preloaded) | ~300 MB |
| better-sqlite3 (DB in WAL mode, small DB) | ~50 MB |
| cloudflared daemon | ~30 MB |
| OS + systemd overhead (Ubuntu 22.04) | ~200 MB |
| **Subtotal (stack without Ollama)** | **~580 MB** |
| Ollama daemon (idle) | ~150 MB |
| nomic-embed-text model loaded in VRAM/RAM | ~274 MB |
| Ollama model context during active inference | ~300 MB |
| **Subtotal (Ollama loaded, inferring)** | **~724 MB** |
| **Total with Ollama active** | **~1,304 MB** |
| Headroom on 2 GB VM | **~720 MB** |

On paper this fits. But 720 MB headroom is tight: Linux will start swapping under any memory spike (npm build, log flush, brief Ask + embed concurrency). A 1-vCPU box has no parallelism — the Ollama inference thread fully blocks the CPU while embedding, which delays any concurrent Ask SSE stream.

**Cold-start problem:** Ollama loads the model into RAM on first use after boot or after the model is evicted. On a 1-vCPU arm with EBS-backed disk, model load time is ~5–15 seconds. If the VM restarts (AWS monthly maintenance, or OOM kill), the first capture after reboot will sit with a spinner for 10+ seconds before the embedding starts.

**Concurrent Ask + embed scenario:** A user captures an article and immediately queries Ask. Node.js starts an embedding job (CPU-bound, ~300 ms on a real 1-vCPU) while the Ask handler is streaming tokens. Both share the single vCPU. In practice this serializes — Ask TTFT degrades noticeably. At Brain's current 1 user / near-zero concurrency, this is rare but real.

**Verdict on local Ollama:** Technically fits RAM, but adds ~500 MB resident memory, cold-start fragility, and a systemd unit to maintain. The savings are $0 because Gemini free tier is also $0.

---

## Hosted alternatives

**Pricing and dimensions — 2026-05-12:**

| Provider | Model | Dim | Pricing | Free tier | Training ToS |
|---|---|---|---|---|---|
| **Google Gemini** | `text-embedding-004` | **768** | $0.025/1M tokens | 1M tokens/day [ASSUMED from Gemini API pricing page] | Paid: no training. Free tier: Google may use for product improvement. At Brain's volume, free tier is fine AND the content is personal notes you already sync with Google services — pragmatic risk is low. |
| **OpenAI** | `text-embedding-3-small` | 1536 (can truncate to 768) | $0.020/1M tokens | No free tier | No training by default for API customers |
| **OpenAI** | `text-embedding-3-large` | 3072 | $0.130/1M tokens | No free tier | Same |
| **Voyage AI** | `voyage-3` | 1024 | $0.060/1M tokens | 50M tokens free on signup | No training on API inputs |
| **Cohere** | `embed-english-v3` | 1024 | $0.100/1M tokens | Trial credits | No training on API inputs |

**Why Gemini `text-embedding-004` wins:**

1. **768 dim — exact match.** The `chunks_vec` table is already at `vec0(embedding float[768])`. No schema migration, no re-embedding of existing chunks due to dimension change.
2. **Free tier covers Brain's lifetime volume.** At 30 captures/month × ~5 chunks/item = 150 embeddings/month. Each chunk is ~600 tokens. That is 90,000 tokens/month — against a 1M/day free tier. Brain will never pay for Gemini embeddings.
3. **Same Google account likely already used** for the Gemini AI provider (even if not — Google AI Studio signup is minimal friction).
4. **MTEB quality:** `text-embedding-004` scores competitively on MTEB retrieval benchmarks (56.9 avg across MTEB tasks per Gemini docs), above `nomic-embed-text` (53.0 on MTEB). Slightly better retrieval quality is a bonus.

**Why not OpenAI `text-embedding-3-small`:** Dim is 1536 natively (768 via truncation — supported but adds a parameter). Requires a separate OpenAI account. No cost advantage over Gemini free tier. Adds a third vendor SDK.

**Why not Voyage/Cohere:** 1024 dim requires schema migration + full re-embed. Smaller community. No meaningful quality advantage at Brain's use case scale.

---

## Migration implication

**Switching from nomic-embed-text → Gemini text-embedding-004 requires re-embedding all existing chunks.**

Different models produce different vector spaces — a nomic vector and a Gemini vector of the same text are not comparable. All existing chunks must be re-embedded with the new model before similarity search returns correct results.

**Current state:** 1 chunk in `chunks_vec`. Migration cost:
- 1 chunk × ~100 ms API call = 0.1 seconds
- 1 chunk × ~600 tokens × $0.025/1M = **$0.000015**

Trivially free. The migration script is: delete all rows from `chunks_vec` and `chunks`, mark all items `embedding_state = 'pending'`, run the embedding worker.

**Dim match means zero schema change:** `chunks_vec` stays `float[768]`. No `DROP TABLE` / `CREATE TABLE` cycle. No index rebuild beyond re-inserting the vectors.

**Future-proofing:** If a future model switch involves a dim change, the migration cost at 10,000 chunks × 100 ms = 17 minutes and ~$0.25 in API calls — still negligible.

---

## Ask-path embedding latency

The Ask flow embeds the user's question before retrieval (1 vector per query):

| Path | Latency | Note |
|---|---|---|
| Local Ollama (1 vCPU) | 200–600 ms | CPU-bound; contends with Node.js |
| Gemini API (Mumbai → Google edge) | 100–200 ms | Network RTT ~40 ms Mumbai→Google; API overhead ~60-150 ms |
| OpenAI API (same network path) | 100–200 ms | Similar RTT |

Gemini API latency for a single-vector query is comparable to or faster than local Ollama on a 1-vCPU VM, and does not block the CPU for other work.

---

## Code change scope

`src/lib/embeddings/client.ts` currently calls `POST http://localhost:11434/api/embed`. Required changes:

1. Add `EMBED_PROVIDER=gemini` env var (default: `gemini`; `ollama` retained for local dev).
2. In `client.ts`: if `EMBED_PROVIDER === 'gemini'`, call `@google/generative-ai` embedding method with `model: 'text-embedding-004'`, `taskType: 'RETRIEVAL_DOCUMENT'` for indexing and `RETRIEVAL_QUERY` for Ask.
3. `EMBED_DIM` stays 768. All downstream code (`pipeline.ts`, `chunks_vec` inserts) unchanged.
4. Remove Ollama from VM provisioning runbook — no `ollama serve` systemd unit, no `ollama pull nomic-embed-text`.

The `@google/generative-ai` SDK is likely already available or trivially installed (it's used for Gemini LLM calls if that path is added for S-4's Hybrid B option). Even if added fresh: `npm install @google/generative-ai` — no native compilation, no glibc dependency.

---

## Decision

**Gemini `text-embedding-004` (hosted).** Free at Brain's volume, 768-dim native match to existing schema, zero RAM pressure on the 2 GB VM, marginally better MTEB quality than nomic-embed-text, and removes the operationally fragile Ollama daemon from the cloud VM. Re-embedding cost is 1 chunk at $0.000015. Local dev keeps Ollama via `EMBED_PROVIDER=ollama` for offline use.
