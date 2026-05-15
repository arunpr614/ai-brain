# LLM + Embedding Provider Wrappers

**Status:** v0.6.0 Phase B (B-1..B-13) — shipped, Ollama defaults preserved.
**Code:** `src/lib/llm/` (LLM) and `src/lib/embed/` (embeddings).
**Plan:** `docs/plans/v0.6.0-cloud-migration.md` §3.1, §3.2.

---

## What this is

AI Brain's two LLM call paths (enrichment + Ask) and one embed path each route through a provider-agnostic factory. Flipping a single env var swaps the backend with no code change. Defaults are Ollama so v0.5.6 behavior is bit-identical until a `.env.local` change is made.

```
src/lib/llm/                     src/lib/embed/
├── types.ts        (interface)  ├── types.ts            (interface)
├── errors.ts       (LLMError)   ├── client.ts           (Ollama HTTP client)
├── factory.ts      (resolve)    ├── ollama-provider.ts  (adapter)
├── ollama.ts       (OllamaProvider)  ├── gemini.ts      (GeminiEmbedProvider)
├── anthropic.ts    (AnthropicProvider)  ├── factory.ts  (resolve)
├── openrouter.ts   (OpenRouterProvider)  └── pipeline.ts (consumer)
└── *.test.ts
```

## Env contract

### LLM (enrichment + Ask)

| Var | Default | Values | Required when |
|---|---|---|---|
| `LLM_ENRICH_PROVIDER` | `ollama` | `ollama \| anthropic \| openrouter` | always optional |
| `LLM_ENRICH_MODEL` | per-provider | string | always optional |
| `LLM_ASK_PROVIDER` | `ollama` | `ollama \| anthropic \| openrouter` | always optional |
| `LLM_ASK_MODEL` | per-provider | string | always optional |
| `ANTHROPIC_API_KEY` | unset | `sk-ant-...` | either `*_PROVIDER=anthropic` |
| `OPENROUTER_API_KEY` | unset | `sk-or-...` | either `*_PROVIDER=openrouter` |
| `OLLAMA_HOST` | `http://localhost:11434` | URL | when `*_PROVIDER=ollama` |
| `OLLAMA_DEFAULT_MODEL` | `qwen2.5:7b-instruct-q4_K_M` | model name | when `*_PROVIDER=ollama` |

**Provider defaults for `*_MODEL`:**

| Provider | Default model |
|---|---|
| `ollama` | `qwen2.5:7b-instruct-q4_K_M` |
| `anthropic` | `claude-haiku-4-5-20251001` |
| `openrouter` | `anthropic/claude-sonnet-4-6` |

### Embedding

| Var | Default | Values | Required when |
|---|---|---|---|
| `EMBED_PROVIDER` | `ollama` | `ollama \| gemini` | always optional |
| `EMBED_MODEL` | per-provider | string | always optional |
| `GEMINI_API_KEY` | unset | API key | when `EMBED_PROVIDER=gemini` |

**Embedding output dim is locked at 768** (`chunks_vec float[768]`). A provider that emits a different dim is rejected at the wrapper — no silent truncation.

| Provider | Default model | Dim |
|---|---|---|
| `ollama` | `nomic-embed-text` | 768 |
| `gemini` | `text-embedding-004` | 768 (set via `outputDimensionality`) |

## Recipes

### 1. v0.5.6 baseline (current default — no env change)

```bash
# .env (or unset entirely)
# LLM_ENRICH_PROVIDER and LLM_ASK_PROVIDER unset → both default to ollama.
# EMBED_PROVIDER unset → defaults to ollama.
```

### 2. v0.6.0 production cutover (Hetzner)

```bash
# .env.local on Hetzner
LLM_ENRICH_PROVIDER=anthropic
LLM_ENRICH_MODEL=claude-haiku-4-5-20251001
LLM_ASK_PROVIDER=anthropic
LLM_ASK_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=sk-ant-...

EMBED_PROVIDER=gemini
GEMINI_API_KEY=...
```

### 3. Dev: A/B test Sonnet via OpenRouter (Phase F-1)

```bash
# .env.local on Mac for the duration of the test
LLM_ASK_PROVIDER=openrouter
LLM_ASK_MODEL=anthropic/claude-sonnet-4-6
OPENROUTER_API_KEY=sk-or-...
# Enrichment stays on Ollama / Anthropic — Ask path only.
```

### 4. Hybrid: Anthropic batch enrichment, Ollama Ask

```bash
LLM_ENRICH_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
# LLM_ASK_PROVIDER unset → ollama
# Useful for offline-first laptop dev with cloud enrichment cost savings.
```

## Privacy + safety locks

### OpenRouter request hardening

`src/lib/llm/openrouter.ts:buildBody()` is the single chokepoint that applies the privacy pin block on **every** outbound request:

```json
{
  "provider": {
    "order": ["Anthropic"],
    "allow_fallbacks": false,
    "data_collection": "deny"
  }
}
```

Without it, OpenRouter can route to upstreams that log inputs. The pin is **non-overridable** at the constructor level (no opt-out flag); a future caller wanting a different upstream changes `upstreamOrder`, but `data_collection` and `allow_fallbacks` stay locked. Pinned by `src/lib/llm/openrouter.test.ts` against a captured request body.

### Embedding dim invariant

`src/lib/embed/types.ts` exports `EMBED_OUTPUT_DIM = 768 as const`. Both providers validate response dim and throw `EmbedError("EMBED_INVALID_RESPONSE")` on mismatch (`src/lib/embed/{client,gemini}.ts`). A schema migration is required before this can change.

### Anthropic spending caps

Set hard caps at console.anthropic.com:
- Soft alert at $3/mo
- Hard cap at $5/mo (matches Plan §5.1 budget; v0.6.0 expected at ~$0.30/mo)

## Test coverage

`npm run test:coverage` runs Node's built-in `--experimental-test-coverage` over wrapper modules only:

```bash
npm run test:coverage
```

**Phase B exit gate: all NEW wrapper modules ≥80% line coverage.** Measured on commit `97c89cf` (B-9..B-11):

| Module | Line % |
|---|---|
| `src/lib/llm/factory.ts` | 100.00 |
| `src/lib/embed/factory.ts` | 100.00 |
| `src/lib/embed/types.ts` | 100.00 |
| `src/lib/llm/errors.ts` | 95.00 |
| `src/lib/embed/pipeline.ts` | 95.61 |
| `src/lib/embed/gemini.ts` | 94.08 |
| `src/lib/llm/openrouter.ts` | 92.74 |
| `src/lib/llm/anthropic.ts` | 87.76 |
| `src/lib/embed/ollama-provider.ts` | 82.69 |
| **aggregate** | **84.86** |

`src/lib/llm/ollama.ts` (58.11%) is the OllamaProvider class adapt (B-2). Pre-existing call-site tests cover its module-level functions but not its class methods directly. Tracked as a B-2 gap; not a Phase B blocker since the call sites do exercise the class via the factory at runtime.

## Spike + verification

- **S-10** (`docs/plans/spikes/v0.6.0-cloud-migration/S-10-anthropic-wire-verify.md`) — live Anthropic API verification, 5/5 PASS at $0.000861. Confirms the fetch-rewrite parsers in `src/lib/llm/anthropic.ts` against real `/v1/messages`, SSE stream, batch submit/poll, and JSONL results shapes.

## Open work

- Phase C — wire Anthropic batch into the daily enrichment cron (`src/lib/queue/enrichment-batch.ts`).
- Phase D — Hetzner deploy + cutover.
- Phase F (deferred, optional) — A/B test Sonnet via OpenRouter to validate the swap path actually works end-to-end.
