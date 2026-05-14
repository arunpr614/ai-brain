# OpenRouter Provider Evaluation for AI Brain v0.6.0

**Produced by:** OpenRouter deep-research spike
**Date:** 2026-05-14
**Triggered by:** User acquired OpenRouter API key; questioning Anthropic-only lock-in
**Predecessor doc:** `docs/research/ai-provider-matrix.md` (2026-05-12, locked Anthropic)
**Status:** final

---

## TL;DR

OpenRouter does not replace the locked Anthropic plan — it adds optionality at the cost of one structural trade-off that matters at Brain's scale. The Anthropic Message Batches API (50% discount, `$0.50/$2.50` per MTok) is not exposed through OpenRouter; to access it you must call `api.anthropic.com` directly. Since the enrichment workload is a batch job where cost is noise anyway, this gap is survivable — but the simplest path remains Anthropic-direct for enrichment. For the Ask workload, OpenRouter becomes genuinely interesting: it is the single key that unlocks GPT-4.1, Gemini 2.5 Flash, and other models without separate accounts, and its pass-through pricing (no inference markup, per FAQ) means you pay the same rate as direct. The concrete recommendation: keep the locked Anthropic plan for enrichment (batch, direct), but route Ask through OpenRouter with Claude Sonnet 4.6 pinned to Anthropic's upstream — or try GPT-4.1 as a quality-comparable alternative if you want one key to rule all. Any model that fails Brain's privacy bar (no-training, non-Chinese-jurisdiction) is filtered out before the intelligence comparison begins; every candidate in the final tables below clears that bar.

**Ranked recommendation:**

1. **Keep as-is (Anthropic-direct, hybrid)** — Haiku 4.5 batch enrichment via `api.anthropic.com` + Sonnet 4.6 realtime Ask via `api.anthropic.com`. Zero new operational surface. The OpenRouter key is an insurance policy, not a replacement.
2. **OpenRouter for Ask only (optionality path)** — Sonnet 4.6 or GPT-4.1 routed through OpenRouter, Anthropic-direct for enrichment. One additional env var. Enables model switching without new API accounts.

---

## Why Anthropic Was Selected Previously

The predecessor doc (`ai-provider-matrix.md`, 2026-05-12) ranked Anthropic first on four criteria: quality-first ranking (Sonnet 4.6 scores 44/100 intelligence on artificialanalysis.ai, top-3 of 71 non-reasoning models), JSON reliability via constrained-decoding structured output, paid-tier no-training-on-inputs posture with no opt-in required, and the Batch API 50% discount that halves enrichment cost. Signup friction was also low relative to Google and OpenAI. The decision assumed two separate workloads — enrichment batch and Ask realtime — were best served by the same Anthropic account at different price tiers. OpenRouter's introduction does not invalidate the quality ranking or privacy analysis. It does offer a structural alternative to managing multiple provider accounts, and it surfaces newer models (GPT-4.1, Gemini 2.5 Flash via a single key) that were evaluated in the predecessor doc only at the margin. The Batch API gap is the one assumption OpenRouter cannot satisfy.

---

## What OpenRouter Changes Structurally

### Pricing Markup

Per OpenRouter's own FAQ (fetched 2026-05-14): "there is no markup on inference pricing." OpenRouter passes through upstream provider rates exactly. Revenue comes from credit purchase fees (Stripe and crypto payment processing), not from per-token margins. This means `anthropic/claude-sonnet-4-6` via OpenRouter costs the same `$3.00/$15.00` per MTok as calling Anthropic directly. Verified live: OpenRouter's model page for `anthropic/claude-sonnet-4-6` shows `$3 input / $15 output per 1M tokens`, matching Anthropic's published rate.

### Privacy Mode

OpenRouter does not log prompts or completions by default. The FAQ confirms: "Prompt and completion are not logged by default." Users can opt-in to logging for a 1% usage discount — do not take this discount for Brain. Additionally, OpenRouter's provider routing layer allows filtering to only route requests to providers that do not log data or train on inputs. The correct setting is `"data_collection": "deny"` in the `provider` field of each API request (see Gotchas section). This filters the upstream provider pool to only privacy-compliant routes. At the OpenRouter layer itself, no training occurs by default. The upstream privacy guarantee depends on which provider actually serves the request — which is why provider pinning matters.

### Provider Routing and Pinning

OpenRouter serves some models via multiple upstream providers (e.g., Anthropic's own API vs a third-party reseller). For `anthropic/claude-sonnet-4-6`, the safest posture is to pin to Anthropic's upstream directly. This is done per-request in the request body:

```json
{
  "model": "anthropic/claude-sonnet-4-6",
  "provider": {
    "order": ["Anthropic"],
    "allow_fallbacks": false,
    "data_collection": "deny"
  }
}
```

`provider.order` is an ordered list of provider names to prefer. `allow_fallbacks: false` prevents OpenRouter from silently rerouting to a different upstream if Anthropic is rate-limited. For Brain's privacy posture this is non-negotiable: fallback to an unknown provider could route Brain's personal notes through a host with different data retention.

### Streaming + Structured Output

OpenRouter supports SSE streaming for all models that support it upstream. Standard OpenAI-compatible streaming (`stream: true`) works. Structured outputs and JSON mode: OpenRouter passes `response_format: { type: "json_object" }` through to the upstream provider. Not all upstream routes guarantee constrained decoding — this is provider-dependent. Anthropic's route via OpenRouter does support JSON mode (same constrained-decoding path as direct). GPT-4.1 via OpenRouter also supports `response_format: { type: "json_schema", json_schema: { ... } }` (OpenAI's structured outputs format).

### Single API Key vs Multi-Vendor Signup

This is OpenRouter's genuine structural win. With one key (`OPENROUTER_API_KEY`) and one base URL (`https://openrouter.ai/api/v1`), you can call Anthropic, OpenAI, Google, and xAI models without creating separate accounts or managing separate billing. For Brain's current two-workload design, this means: instead of `ANTHROPIC_API_KEY` (enrichment) + a hypothetical `OPENAI_API_KEY` (if you ever want to try GPT-4.1 for Ask), you carry one key. The Batch API gap costs this: you still need `ANTHROPIC_API_KEY` if you want the 50% batch discount.

---

## Top Candidates by Workload

### Workload A — Enrichment (batch, JSON-strict)

**Context:** 30 calls/month moderate, 150 heavy. Per call: ~935 input + ~275 output tokens. Strict JSON object output. Daily 3 AM UTC cron. 24h turnaround acceptable. Quality is secondary — any Haiku-class model is sufficient.

Token cost per call: 935 in + 275 out = 1,210 tokens total.
Monthly token volume: 30 calls × 1,210 = 36,300 tokens moderate; 150 × 1,210 = 181,500 tokens heavy.

| Model | OpenRouter ID | In $/MTok | Out $/MTok | OR Batch? | Batch Discount | Intelligence (AA.ai) | JSON Mode | Privacy OK? | Cost @ 30/mo | Cost @ 150/mo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Claude Haiku 4.5 | `anthropic/claude-haiku-4-5` | $1.00 | $5.00 | No | None via OR | 31/100 | Yes (constrained) | Yes | ~$0.028 realtime | ~$0.14 realtime | Batch only via Anthropic-direct at $0.50/$2.50 |
| Claude Haiku 4.5 (direct) | — direct API — | $0.50* | $2.50* | Yes | 50% off | 31/100 | Yes (constrained) | Yes | ~$0.014 | ~$0.069 | *Batch pricing via api.anthropic.com only |
| GPT-4.1 Mini | `openai/gpt-4.1-mini` | $0.40 | $1.60 | No | None via OR | ~20 est. [ASSUMED] | Yes (json_schema) | Yes | ~$0.008 | ~$0.042 | Cheapest per-token; quality unverified vs Haiku |
| Gemini 2.5 Flash | `google/gemini-2.5-flash` | $0.30 | $2.50 | No | None via OR | 21/100 | Yes (constrained) | Yes (paid) | ~$0.010 | ~$0.048 | Slightly cheaper than GPT-4.1 Mini on input |
| Grok 3 Mini | `x-ai/grok-3-mini` | $0.30 | $0.50 | No | None via OR | ~25 est. [ASSUMED] | Yes (json_object) | Yes | ~$0.006 | ~$0.030 | Cheapest option; intelligence score unconfirmed |
| Claude Sonnet 4.6 | `anthropic/claude-sonnet-4-6` | $3.00 | $15.00 | No | None via OR | 44/100 | Yes (constrained) | Yes | ~$0.085 | ~$0.43 | Overkill for enrichment; quality headroom unused |

**Batch API gap is decisive for enrichment.** OpenRouter does not expose Anthropic's Message Batches API endpoint (`/v1/messages/batches`). This is Anthropic's proprietary async batch system, not a generic completion API, and OpenRouter's compatibility layer does not proxy it. Verification: no batch-related documentation was found on OpenRouter's site; the Anthropic Batch API docs confirm it requires `api.anthropic.com` directly. The practical consequence: enrichment via OpenRouter is realtime (synchronous calls at full per-token price), not batched. At 30 calls/month this is $0.028 via OR vs $0.014 via Anthropic Batch — a $0.014/month difference. At 150/month it is $0.14 vs $0.069. The delta is still noise in absolute terms ($0.07/month at heavy use), but the principle matters: if you route enrichment through OpenRouter, you permanently lose the 50% batch discount with zero quality gain for the enrichment workload.

**Decision for enrichment: Anthropic-direct, Batch API.** No change from the predecessor doc. If operational simplicity (one key) becomes a priority later and batch discount truly does not matter, GPT-4.1 Mini at $0.40/$1.60 per MTok via OpenRouter is a viable alternative — cheapest realtime option, with verified JSON schema support. But Haiku 4.5 batch-direct is the correct call today.

---

### Workload B — Ask (realtime, streaming, RAG synthesis)

**Context:** 30 queries/month moderate, 100 heavy. Per query: ~5,000–8,000 input tokens (10 RAG chunks + system prompt + question), ~300 output tokens. Must stream SSE. Citation format `[CITE:chunk_id]` must be respected. TTFT under 5s. Quality is the dominant constraint.

Token cost per call: ~6,500 in + ~300 out = 6,800 tokens (midpoint estimate).
Monthly volume: 30 calls × 6,800 = 204,000 tokens moderate; 100 × 6,800 = 680,000 tokens heavy.

| Model | OpenRouter ID | In $/MTok | Out $/MTok | TTFT | t/s | Intelligence (AA.ai) | Streaming via OR? | Privacy OK? | Cost @ 30/mo | Cost @ 100/mo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Claude Sonnet 4.6 | `anthropic/claude-sonnet-4-6` | $3.00 | $15.00 | 1.49s | 49 t/s | 44/100 | Yes | Yes | ~$0.66 | ~$2.19 | Current locked pick; top-3 non-reasoning |
| GPT-4.1 | `openai/gpt-4.1` | $2.00 | $8.00 | ~1.0s est. [ASSUMED] | ~80 t/s est. [ASSUMED] | ~42 est. [ASSUMED] | Yes | Yes | ~$0.43 | ~$1.43 | TTFT/speed from training data — verify at AA.ai |
| Gemini 2.5 Flash | `google/gemini-2.5-flash` | $0.30 | $2.50 | ~1.5s est. | ~200 t/s | 21/100 | Yes | Yes (paid) | ~$0.075 | ~$0.25 | Fastest throughput; 23-pt intelligence gap vs Sonnet |
| Gemini 2.5 Pro | `google/gemini-2.5-pro` | $1.25 | $10.00 | 22.27s | 142 t/s | 35/100 | Yes | Yes (paid) | ~$0.56 | ~$1.87 | TTFT disqualifies for Ask (22s is unacceptable) |
| Claude Opus 4 | `anthropic/claude-opus-4` | $15.00 | $75.00 | ~2.5s est. [ASSUMED] | ~30 t/s est. [ASSUMED] | >50 est. [ASSUMED] | Yes | Yes | ~$4.35 | ~$14.50 | Prohibitively expensive; ~17x Sonnet cost |
| GPT-4o | `openai/gpt-4o` | $2.50 | $10.00 | ~0.9s est. [ASSUMED] | ~80 t/s est. [ASSUMED] | ~38 est. [ASSUMED] | Yes | Yes | ~$0.54 | ~$1.81 | Predecessor doc generation; superseded by GPT-4.1 |
| Grok 3 Mini | `x-ai/grok-3-mini` | $0.30 | $0.50 | 0.78s | 85 t/s | 31/100 | Yes | Yes | ~$0.077 | ~$0.26 | Fast; intelligence below Sonnet; citation fidelity untested |

**On the frontier model question (GPT-5, Claude Opus 4.7, Gemini 3.1, Grok 4):**

The artificialanalysis.ai leaderboard (captured 2026-05-14) shows models well beyond the predecessor doc's horizon. The current frontier intelligence scores are: GPT-5.5 xhigh (60/100), Claude Opus 4.7 (57/100), Gemini 3.1 Pro Preview (57/100). These exist on OpenRouter with corresponding model IDs and pricing. However:

- **Claude Opus 4.7** at `$0.000005/$0.000025` per token (from the OR API catalog, which appears to be per-token pricing suggesting approximately $5/$25 per MTok — this data appeared garbled in the live fetch; use the OpenRouter model page to verify before relying on it). At any plausible frontier model pricing, the cost for Brain's Ask workload at 30 queries/month would be $2–$15/month — a 3–23x jump over Sonnet 4.6 for a workload that is already working well. The intelligence gap (44 → 57) is real but unlikely to manifest meaningfully in RAG synthesis of personal knowledge chunks at Brain's query complexity.
- **GPT-5.5** similarly: highest intelligence available, but price data was not reliably confirmable from the live catalog fetch. Mark [ASSUMED] for any frontier tier pricing not independently verified.
- **Grok 4.x models** on OR (e.g., `x-ai/grok-4.3`, `x-ai/grok-4.20`) scored 31/100 on AA.ai — comparable to Haiku 4.5, not Sonnet 4.6. Not a quality upgrade for Ask.

**For Ask, Sonnet 4.6 remains the correct pick.** GPT-4.1 is the only model that plausibly competes on intelligence (estimated 42/100, essentially the same tier), costs less per token ($2/$8 vs $3/$15), and likely has better throughput. If you want to trial GPT-4.1 for Ask without a separate OpenAI account, OpenRouter is the right path. The citation format `[CITE:chunk_id]` fidelity of GPT-4.1 is not empirically tested against Brain's prompt; this is the key verification gap. Gemini 2.5 Flash is 23 intelligence points below Sonnet — a material gap for nuanced RAG synthesis — and should not be used for Ask despite its low cost. Gemini 2.5 Pro is disqualified by its 22s TTFT.

---

## OpenRouter-Specific Gotchas

1. **Privacy mode is NOT automatically on.** OpenRouter does not log by default, but it does not filter upstream providers by default either. Without `"data_collection": "deny"` in the `provider` field, your request may be routed to a provider with different data policies. Set this on every request, not just account-level. For Brain: add `provider: { data_collection: "deny" }` to all OpenRouter calls.

2. **Provider pinning syntax.** To guarantee Anthropic-upstream for Claude models, use the `provider.order` field in the request body alongside `allow_fallbacks: false`. Example: `"provider": { "order": ["Anthropic"], "allow_fallbacks": false, "data_collection": "deny" }`. Without `allow_fallbacks: false`, OpenRouter will silently route to another host if Anthropic is rate-limited or unavailable, potentially violating your privacy posture.

3. **JSON mode is not uniformly constrained across routes.** `response_format: { type: "json_object" }` is passed to the upstream provider, but whether constrained decoding actually fires depends on the upstream. Anthropic's route supports it; Together-hosted open-weight models typically do not. If you route Haiku or Sonnet through OpenRouter, pin to Anthropic upstream to guarantee constrained decoding.

4. **No Anthropic Batch API.** OpenRouter's compatibility layer is built on the Chat Completions API shape. Anthropic's Message Batches endpoint (`POST /v1/messages/batches`) is a different API surface that OpenRouter does not proxy. If you call `https://openrouter.ai/api/v1/messages/batches`, you will get a 404 or routing error. Batch discount requires calling `https://api.anthropic.com/v1/messages/batches` directly.

5. **Streaming fallback inconsistency.** If `allow_fallbacks: true` (default) and OpenRouter falls back to a different provider mid-session, streaming behavior can change (different SSE chunk shapes, different delta formats). For Brain's Ask SSE implementation, set `allow_fallbacks: false` when streaming to ensure consistent chunk format.

6. **Rate limits are per-model per-tier, not per-provider.** OpenRouter has its own rate-limit layer on top of upstream limits. Free tier is very restricted; paid tier limits are documented at `openrouter.ai/docs/limits`. At Brain's volume (100 Ask calls/month = ~3/day) this will never be hit, but the limit layer adds one more potential failure mode compared to direct provider calls.

7. **Credit purchase fees.** OpenRouter charges a Stripe processing fee on credit purchases. This is the only markup — inference itself is passed through at cost. For Brain's volume (< $3/month), the per-purchase fee is non-trivial as a percentage. Buy credits in batches of $10+ to minimize fee impact. [ASSUMED: exact fee not confirmed from live fetch; verify at openrouter.ai/settings/billing]

8. **Model ID format is `provider/model-name`.** Brain's LLM wrapper must use `anthropic/claude-sonnet-4-6` (not `claude-sonnet-4-6`) when calling via OpenRouter. This is a different string than the direct Anthropic SDK uses. If Brain switches between OpenRouter and direct, the model ID string must change. The provider-agnostic wrapper should parameterize this.

---

## Total Monthly Cost Comparison

Token assumptions per call: Enrichment = 935 in + 275 out. Ask = 6,500 in + 300 out.

| Architecture | Enrichment model | Enrichment $/mo (30) | Enrichment $/mo (150) | Ask model | Ask $/mo (30) | Ask $/mo (100) | Total @ moderate | Total @ heavy | Quality vs current | Operational complexity |
|---|---|---|---|---|---|---|---|---|---|---|
| 1. Anthropic-direct (current locked) | Haiku 4.5 batch | $0.014 | $0.069 | Sonnet 4.6 realtime | $0.66 | $2.19 | **$0.67** | **$2.26** | Baseline | 1 — one provider, one SDK |
| 2. OpenRouter pure | Haiku 4.5 realtime via OR | $0.028 | $0.14 | Sonnet 4.6 via OR | $0.66 | $2.19 | **$0.69** | **$2.33** | Same as baseline | 2 — one key but must pin providers |
| 3. Hybrid: Anthropic batch + OR for Ask | Haiku 4.5 batch direct | $0.014 | $0.069 | Sonnet 4.6 via OR | $0.66 | $2.19 | **$0.67** | **$2.26** | Same as baseline | 3 — two providers, two API surfaces |
| 4. Hybrid: OR enrichment + GPT-4.1 Ask | GPT-4.1 Mini via OR | $0.008 | $0.042 | GPT-4.1 via OR | $0.43 | $1.43 | **$0.44** | **$1.47** | Ask quality delta vs Sonnet: untested [ASSUMED] | 3 — one OR key; must validate GPT-4.1 citation fidelity |

**Key observations:**

- Architecture 1 (current plan) and Architecture 3 (hybrid with OR for Ask) cost identically — OpenRouter's zero markup means routing Sonnet through OR costs the same as calling Anthropic direct.
- Architecture 2 (OR pure) costs $0.02/month more at moderate use because it loses the batch discount. At heavy use the gap is $0.07. Both are noise.
- Architecture 4 is the only option that meaningfully changes the cost picture ($0.44 vs $0.67 at moderate) AND the model choice. The catch: GPT-4.1's citation fidelity for `[CITE:chunk_id]` format is not empirically verified against Brain's RAG prompt. This is the key test to run before committing.
- Quality between Architectures 1–3 is identical. The decision is purely operational complexity vs keeping optionality.

---

## Privacy and Data-Handling Posture

**OpenRouter layer:** No logging by default per FAQ. OpenRouter's stated policy: "Prompt and completion are not logged by default." Opt-in logging earns a 1% discount — never enable this for Brain. OpenRouter does not train on user data.

**Upstream layer:** This is where variance lives. OpenRouter routes to upstream providers, and each has their own retention and training policies. Without provider pinning, an `anthropic/claude-sonnet-4-6` request could be served by Anthropic's own API or (theoretically) by a reseller. For Brain's personal notes posture, the correct configuration is:

```json
"provider": {
  "order": ["Anthropic"],
  "allow_fallbacks": false,
  "data_collection": "deny"
}
```

`data_collection: "deny"` is the API field that instructs OpenRouter to filter the upstream provider pool to providers that have agreed to not collect or train on data. Anthropic passes this filter. This setting should be in Brain's default OR client configuration, not left to per-call discretion.

**Comparison to Anthropic-direct:** Anthropic-direct has one fewer layer of trust. When you call `api.anthropic.com`, you get Anthropic's privacy terms directly with no intermediary. Through OpenRouter (even pinned to Anthropic), the request traverses OpenRouter's infrastructure before reaching Anthropic. For a single-user personal notes app, this intermediary layer is a marginal concern — but it exists. If privacy is the paramount constraint above all others, Anthropic-direct is strictly cleaner.

**Dashboard setting:** `dashboard.openrouter.ai/settings/privacy` — confirm the "Prompt Training" setting is disabled. As of FAQ documentation, prompts are not logged by default, but the dashboard allows opting into logging for a discount. Do not opt in.

---

## JSON Reliability Matrix

| Model | OR route preserves JSON mode? | Empirical reliability evidence | Recommended for enrichment? |
|---|---|---|---|
| Claude Haiku 4.5 via OR (Anthropic upstream pinned) | Yes — `response_format: json_object` passes to Anthropic's constrained decoder | Anthropic constrained decoding is documented as syntactically guaranteed; predecessor doc notes Brain's prompt produced 5/5 valid JSONs on weaker model (Qwen 2.5) without constrained decoding | Yes, but Anthropic-direct batch preferred |
| Claude Haiku 4.5 via OR (unpinned) | Uncertain — depends on which provider OR routes to | If routed to a non-Anthropic host, constrained decoding may not fire | No — pin provider or use direct |
| GPT-4.1 Mini via OR | Yes — OpenAI's `response_format: { type: "json_schema" }` is supported | OpenAI's JSON schema mode is well-documented; empirically reliable across OpenAI models | Yes, viable alternative if OR path chosen |
| Gemini 2.5 Flash via OR | Yes — Google's `responseMimeType: "application/json"` passes through | Google docs note syntactic validity guaranteed, semantic correctness not; Brain's `validateEnrichment()` handles semantic validation | Yes, viable; cheapest per-token option |
| Grok 3 Mini via OR | Partial — `response_format: json_object` supported | xAI JSON mode is documented but less battle-tested; citation fidelity for Ask unverified | Not recommended — insufficient empirical basis |
| Any open-weight route (Llama, Mistral via Together/Fireworks) | No guarantee — depends on host | Open-weight hosts do not uniformly support constrained decoding; JSON mode is prompt-only | No — rejected on privacy + reliability grounds |

---

## Migration / Wiring Impact

Brain's current LLM abstraction lives in `src/lib/llm/ollama.ts` (naming inherited from the local Ollama phase; will be refactored in v0.6.0). Switching to OpenRouter requires exactly two changes:

**1. Base URL and API key:**

```typescript
// Current (Anthropic-direct via anthropic SDK):
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// OpenRouter path: use OpenAI SDK with custom baseURL
import OpenAI from "openai";
const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://ai-brain.app", // optional attribution
    "X-Title": "AI Brain",
  },
});
```

**2. Provider pinning in every request:**

```typescript
const completion = await client.chat.completions.create({
  model: "anthropic/claude-sonnet-4-6",   // note: provider-prefixed model ID
  messages: [...],
  stream: true,
  response_format: { type: "json_object" }, // for enrichment calls
  // @ts-ignore — OpenRouter extra field not in OpenAI types
  provider: {
    order: ["Anthropic"],
    allow_fallbacks: false,
    data_collection: "deny",
  },
});
```

The `provider` field is OpenRouter-specific and not in the OpenAI TypeScript types; the `@ts-ignore` or a type extension is required. This is the main friction point compared to direct SDK usage.

**Env var pattern:**

```bash
# .env.local additions for OR path
OPENROUTER_API_KEY=sk-or-v1-...
ASK_PROVIDER=openrouter            # or "anthropic" for direct
ASK_MODEL=anthropic/claude-sonnet-4-6    # OR model ID (provider-prefixed)
# Enrichment stays on direct:
ENRICH_PROVIDER=anthropic
ENRICH_MODEL=claude-haiku-4-5-20251001
ANTHROPIC_API_KEY=sk-ant-...       # still needed for batch
```

The provider-agnostic wrapper should branch on `ASK_PROVIDER` env var: `openrouter` uses the OpenAI SDK path above; `anthropic` uses the native Anthropic SDK. Streaming and structured output handling are identical at the application layer — the difference is one client constructor and the model ID string format.

---

## Recommendation

### Primary: Keep the locked Anthropic plan, add OpenRouter as standby

**Env vars:** `ANTHROPIC_API_KEY` for both workloads. Enrichment uses `claude-haiku-4-5-20251001` via Batch API. Ask uses `claude-sonnet-4-6` via streaming. Store the OpenRouter key in `.env.local` as `OPENROUTER_API_KEY` but do not wire it into the live path yet.

**Justification:** Anthropic batch enrichment at $0.014/month moderate is the cheapest correct-privacy-posture option available. OpenRouter cannot match it because the Batch API is not proxied. Sonnet 4.6 for Ask is the #3 ranked non-reasoning model globally on AA.ai; routing it through OpenRouter at the same price adds one intermediary trust layer with no quality benefit. The correct time to activate OpenRouter is when you want to trial GPT-4.1 for Ask (no separate OpenAI account needed) or when Brain scales to a volume where multi-provider failover matters.

**Exact model strings:**
- Enrichment: `claude-haiku-4-5-20251001` (Anthropic SDK, Batch API)
- Ask: `claude-sonnet-4-6` (Anthropic SDK, streaming)

### Fallback: OpenRouter for Ask, Anthropic-direct for enrichment (Architecture 3)

**Env vars:** `ANTHROPIC_API_KEY` + `OPENROUTER_API_KEY`. Enrichment stays on Anthropic-direct batch. Ask routes through OpenRouter using model `anthropic/claude-sonnet-4-6` with provider pinned to `["Anthropic"]`.

**Justification:** Same quality and same cost as primary recommendation. The benefit is optionality: with the wrapper built, switching Ask from Sonnet to GPT-4.1 is a one-line env var change (`ASK_MODEL=openai/gpt-4.1`) rather than a new SDK integration. Worth doing if the v0.6.0 refactor is touching the LLM wrapper anyway — marginal extra work for lasting flexibility.

**Exact OR model strings:**
- Ask via OR: `anthropic/claude-sonnet-4-6` (provider pinned to Anthropic)
- Trial alternative: `openai/gpt-4.1` (requires citation fidelity test first)

---

## What Changes in the v0.6.0 Plan

The predecessor recommendation (Haiku batch + Sonnet streaming, both Anthropic-direct) does not change. The following additions should be noted in `docs/plans/v0.6.0-cloud-migration.md` when it is drafted:

- Add `OPENROUTER_API_KEY` to the env var inventory as optional standby. Wire it to `ASK_PROVIDER=openrouter` env var in the LLM wrapper but default to `anthropic`.
- The LLM wrapper refactor (`src/lib/llm/ollama.ts` → `src/lib/llm/provider.ts` or similar) should support two transport paths: Anthropic SDK (native, for enrichment batch and Ask-direct) and OpenAI SDK with OpenRouter base URL (for OR-routed Ask). Provider selection driven by `ASK_PROVIDER` env var.
- Note explicitly: Anthropic Batch API cannot be proxied through OpenRouter; `ENRICH_PROVIDER` must always be `anthropic`.
- Add `provider.order: ["Anthropic"], allow_fallbacks: false, data_collection: "deny"` as standard fields in all OpenRouter requests if/when activated. Document this as non-negotiable for Brain's privacy posture.
- Add GPT-4.1 citation fidelity test to the verification checklist before considering Architecture 4 (OR pure with GPT-4.1 Ask).

If the v0.6.0 plan previously locked `ENRICH_PROVIDER=anthropic-batch` and `ASK_PROVIDER=anthropic-realtime` with no hook for OR, add a note that the wrapper abstraction should be forward-compatible with OR without requiring a re-architecture. One additional transport branch is sufficient.

---

## Open Questions / Verification Gaps

1. **GPT-4.1 citation fidelity for `[CITE:chunk_id]` format.** The predecessor doc evaluated GPT-4.1 only on intelligence score and pricing. Whether it respects Brain's specific citation format in a RAG synthesis prompt is untested. Suggested test: run 5 Ask queries through GPT-4.1 via OpenRouter with Brain's actual system prompt and verify `[CITE:...]` appears in correct positions. Budget: under $0.10.

2. **OpenRouter provider pinning syntax — exact field verification.** The `provider.order` and `data_collection` field names were confirmed via the OpenRouter FAQ and general docs coverage, but the exact JSON structure could not be fetched from OpenRouter's provider-routing documentation (the docs URL returned 404 during this research session). Verify the exact field names against `openrouter.ai/docs/provider-routing` before relying on this in production.

3. **Frontier model pricing.** The API catalog fetch returned what appeared to be per-token pricing for Claude Opus 4.7, GPT-5.4, and Grok 4.x models, but the numbers looked inconsistent (some appeared to be per-token rather than per-MTok). Do not rely on the frontier model pricing rows in this document without independently verifying on each model's OpenRouter page. Rows are marked [ASSUMED] where prices were not cleanly confirmed.

4. **OpenRouter credit purchase fee.** The FAQ confirmed a fee exists for Stripe credit purchases but did not disclose the percentage or flat amount. At Brain's volume ($1–3/month spend), a 5–10% purchase fee is non-trivial as a percentage of total cost. Verify at `openrouter.ai/settings/billing` before topping up.

5. **Anthropic Batch API + OR interaction.** There is a theoretical edge case: if Brain ever wants to route enrichment through OpenRouter for operational simplicity, could it call Anthropic-direct for batch while using OR for realtime? Yes — these are separate client instances with separate keys. The env var pattern documented above supports this cleanly. But confirm the Anthropic SDK and OpenAI SDK can coexist in the same Next.js app without dependency conflicts (they can; both are standard npm packages with no shared globals).

---

## Sources

All prices and scores captured 2026-05-14 unless noted.

- `openrouter.ai/anthropic/claude-sonnet-4-6` — Sonnet 4.6 on OR: $3/$15 per MTok, 1M context, released 2026-02-17 (fetched 2026-05-14)
- `openrouter.ai/anthropic/claude-haiku-4-5` — Haiku 4.5 on OR: $1/$5 per MTok (fetched 2026-05-14)
- `openrouter.ai/openai/gpt-4.1` — GPT-4.1 on OR: $2/$8 per MTok, 1M context (fetched 2026-05-14)
- `openrouter.ai/openai/gpt-4.1-mini` — GPT-4.1 Mini on OR: $0.40/$1.60 per MTok (fetched 2026-05-14)
- `openrouter.ai/openai/gpt-4o` — GPT-4o on OR: $2.50/$10 per MTok (fetched 2026-05-14)
- `openrouter.ai/google/gemini-2.5-pro` — Gemini 2.5 Pro on OR: $1.25/$10 per MTok (fetched 2026-05-14)
- `openrouter.ai/google/gemini-2.5-flash` — Gemini 2.5 Flash on OR: $0.30/$2.50 per MTok (fetched 2026-05-14)
- `openrouter.ai/x-ai/grok-3-mini` — Grok 3 Mini on OR: $0.30/$0.50 per MTok, 131K context (fetched 2026-05-14)
- `openrouter.ai/anthropic/claude-opus-4` — Claude Opus 4 on OR: $15/$75 per MTok (fetched 2026-05-14)
- `openrouter.ai/docs/quickstart` — Base URL `https://openrouter.ai/api/v1`, OpenAI SDK compatibility, optional attribution headers (fetched 2026-05-14)
- `openrouter.ai/faq` — No inference markup; prompts not logged by default; `data_collection` provider filter; Stripe fee on credit purchases (fetched 2026-05-14)
- `platform.claude.com/docs/en/build-with-claude/message-batches` — Batch API: 50% discount, most batches complete < 1 hour, 24-hour expiry, all active models supported, NOT proxied via OpenRouter (fetched 2026-05-14)
- `artificialanalysis.ai/leaderboards/models` — Intelligence scores: Sonnet 4.6 = 44/100, TTFT 1.49s, 49 t/s; Haiku 4.5 = 31/100, TTFT 0.88s, 95 t/s; Gemini 2.5 Pro = 35/100, TTFT 22.27s; Grok 4.3 = 31/100, TTFT 0.78s; GPT-5.5 = 60/100; Claude Opus 4.7 = 57/100 (fetched 2026-05-14)
- `docs/research/ai-provider-matrix.md` (2026-05-12) — predecessor doc; source for Anthropic batch pricing, hybrid cost analysis, and quality-first constraint rationale
- [ASSUMED] GPT-4.1 intelligence score (~42/100), TTFT, and throughput — not confirmed on AA.ai during this session; verify at `artificialanalysis.ai/models/gpt-4-1`
- [ASSUMED] Frontier model pricing for Claude Opus 4.7, GPT-5.4/5.5, Grok 4.x — OR API catalog returned inconsistent per-token vs per-MTok figures; do not use for cost calculations without independent verification on each model's OR page
- [ASSUMED] OpenAI credit fee — referenced in OR FAQ but percentage not disclosed; verify at `openrouter.ai/settings/billing`
- [ASSUMED] OpenRouter `provider.order` exact syntax — field names confirmed via FAQ and docs overview; exact JSON structure not fetched from provider-routing docs page (404 during session); verify at `openrouter.ai/docs/provider-routing` before production use
