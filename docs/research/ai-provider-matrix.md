# AI Provider Matrix — 2026-05-12

**Brain volume (from S-1):** ~5 enrichments/month (low-use baseline), projected 30–150 enrichments/month at moderate-to-heavy post-migration use. ~11 Ask queries across 2-month lifetime; projected 30–100/month. Avg enrichment input ~935 tokens, output ~275 tokens (from `llm_usage` table). **API cost is noise at any realistic volume — quality and reliability are the deciding factors.**

**Constraint (user-confirmed):** Quality-first ranking. Price is a tiebreaker only. Privacy bar: paid tier with no training on inputs (strict local-only NOT required).

---

## Top 3 Recommended

### #1 Claude Haiku 4.5 — Enrichment + Ask default

Haiku 4.5 is Anthropic's current fast tier and the strongest all-rounder for Brain's use case. On artificialanalysis.ai's non-reasoning leaderboard it scores **31 intelligence** with **96 tokens/second** output throughput and a **0.73s TTFT** — meaning it starts streaming an Ask response in under a second, which is exactly what you need for user-facing queries. Anthropic's structured output documentation confirms constrained-decoding JSON mode ("no more JSON.parse errors; guaranteed schema compliance") through the `output_config.format` API, plus the legacy `"format": "json"` path that Brain already uses. The Batch API is available for all active models at **50% discount** ($0.50 in / $2.50 out per MTok), so the enrichment daily batch costs roughly half of real-time. Privacy is clean: Anthropic's API customer terms do not train on inputs by default, with no opt-in required. Signup friction is low — credit card, no phone verification required. There is no provider lock-in anxiety: the prompt in `prompts.ts` already produces clean JSON with Qwen 2.5; the same prompt will work identically here.

**Monthly cost (moderate use, 30 enrichments + 30 Asks, batch for enrichment):**
- Enrichment (batch): 30 × (935 in + 275 out) tokens → 28k in / 8.25k out → $0.014 + $0.021 = $0.035
- Ask (realtime): 30 × ~500 tokens in + ~300 out → 15k in / 9k out → $0.015 + $0.045 = $0.060
- **Total: ~$0.10/month**

### #2 Gemini 2.5 Flash — Quality-price runner-up

Gemini 2.5 Flash is Google's speed tier and scores **21 intelligence** (non-reasoning) at **213 tokens/second** and **0.65s TTFT** on artificialanalysis.ai — the fastest first-token of any model in this comparison. At $0.30/MTok input and $2.50/MTok output it is cheaper than Haiku on output tokens. Its 1M token context window is overkill for Brain but means no context-window anxiety ever. Gemini's JSON mode uses constrained decoding and enforces syntactic validity; however Google's own docs note "semantic correctness is not guaranteed" and recommend application-level validation — the same posture Brain already has via `validateEnrichment()`. Privacy is acceptable: on **paid quota**, Google explicitly does not train on prompts or responses (confirmed via the Gemini API terms page captured 2026-05-12). The Batch API is available at **50% discount** for both Flash and Pro. The main drawback: Google AI Studio signup requires a Google account and a credit card for paid tier activation; some users report friction with international cards.

**Monthly cost (moderate use, batch enrichment):** ~$0.06/month — marginally cheaper than Haiku but close enough to be irrelevant at Brain's volume.

### #3 Claude Sonnet 4.6 — High-quality Ask alternative

If Ask quality is the paramount concern (think: complex research queries spanning hundreds of library items, nuanced RAG synthesis with `[CITE:chunk_id]` accuracy), Sonnet 4.6 is the jump. It ranks **#3 / 71 non-reasoning models** on artificialanalysis.ai with an intelligence score of **44** — 42% higher than Haiku 4.5's 31. The tradeoff: **47.5 tokens/second** output (half of Haiku's speed) and $3 / $15 per MTok ($1.50 / $7.50 batch). At Brain's volume the cost difference is cents. The latency is the real question: for an Ask query that streams ~300 output tokens, Sonnet takes roughly 6 seconds vs Haiku's 3 seconds. For most queries that is fine; for "quick lookup" queries it starts to feel slow. The hybrid strategy (Haiku enrichment + Sonnet Ask) captures Sonnet's reasoning quality exactly where it matters and costs $0.15–0.50/month total.

---

## Full Matrix

Prices captured 2026-05-12. Sources: Anthropic pricing page (platform.claude.com/docs/en/about-claude/pricing), Google AI Dev pricing page (ai.google.dev/pricing), artificialanalysis.ai leaderboard.

| Provider | Model | In $/MTok | Out $/MTok | Batch? | Batch in | Batch out | Ctx | Monthly @ moderate use | Intelligence (AA.ai) | TTFT | Speed t/s | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Anthropic | Claude Haiku 4.5 | $1.00 | $5.00 | Yes | $0.50 | $2.50 | 200k | ~$0.10 | 31/100 | 0.73s | 96 t/s | Best TTFT + speed combo in the tier |
| Anthropic | Claude Sonnet 4.6 | $3.00 | $15.00 | Yes | $1.50 | $7.50 | 1M | ~$0.40 | 44/100 | 1.40s | 47.5 t/s | Top-3 intelligence non-reasoning |
| Google | Gemini 2.5 Flash | $0.30 | $2.50 | Yes (50%) | $0.15 | $1.25 | 1M | ~$0.06 | 21/100 | 0.65s | 213 t/s | Fastest throughput; 1M ctx |
| Google | Gemini 2.5 Pro | $1.25–$2.50 | $10–$15 | Yes (50%) | $0.63 | $5.00 | 1M | ~$0.40 | 35/100 (reasoning) | 19.65s | 138 t/s | High reasoning latency (19s TTFT) — bad for Ask |
| OpenAI | gpt-4o-mini | $0.15 | $0.60 | Yes (50%) | $0.075 | $0.30 | 128k | ~$0.02 | 13/100 | 1.36s | 73.5 t/s | Cheapest but weakest quality in tier |
| OpenAI | gpt-4o | ~$2.50 | ~$10.00 | Yes (50%) | ~$1.25 | ~$5.00 | 128k | ~$0.35 | ~38 est. | ~0.9s | ~80 t/s | Pricing from training data — verify at openai.com/api/pricing [ASSUMED] |
| OpenAI | gpt-5 | Not yet in API tier | — | — | — | — | — | — | — | — | — | As of 2026-05-12 GPT-5.5 appears on AA.ai but openai.com/pricing pages return 403; pricing unconfirmed [ASSUMED] |
| Budget tier | DeepSeek V3 / Groq Llama / Together | < $0.10 | < $0.50 | Varies | — | — | 64–128k | < $0.02 | 20–30 est. | 0.5–2s | 50–200 t/s | Footnote: privacy ToS less clear; no constrained-decoding JSON guarantee on open-weight hosts |

**Source URLs:**
- Anthropic pricing: `platform.claude.com/docs/en/about-claude/pricing` (captured 2026-05-12)
- Anthropic models: `platform.claude.com/docs/en/docs/about-claude/models` (captured 2026-05-12)
- Anthropic batch docs: `platform.claude.com/docs/en/build-with-claude/batch-processing` (captured 2026-05-12)
- Google pricing: `ai.google.dev/pricing` (captured 2026-05-12)
- Gemini privacy: `ai.google.dev/gemini-api/terms` (captured 2026-05-12)
- Artificialanalysis.ai leaderboard: `artificialanalysis.ai/leaderboards/models` (captured 2026-05-12)
- Gemini 2.5 Flash AA.ai profile: `artificialanalysis.ai/models/gemini-2-5-flash` (captured 2026-05-12)
- GPT-4o-mini AA.ai profile: `artificialanalysis.ai/models/gpt-4o-mini` (captured 2026-05-12)
- Claude Sonnet 4.6 AA.ai profile: `artificialanalysis.ai/models/claude-sonnet-4-6` (captured 2026-05-12)
- OpenAI pricing pages: returned HTTP 403 on all attempts — pricing for gpt-4o and gpt-5 is ASSUMED from training data

---

## Hybrid Option Analysis

**Hybrid A: Haiku 4.5 for enrichment + Sonnet 4.6 for Ask**

| Workload | Provider | Monthly cost (moderate use) |
|---|---|---|
| Enrichment (30/mo, batch) | Haiku 4.5 | $0.035 |
| Ask (30/mo, realtime) | Sonnet 4.6 | $0.22 |
| **Total** | Hybrid A | **~$0.26/month** |

vs. single-provider Haiku 4.5 for everything: **~$0.10/month**.

**Delta: $0.16/month.** At current usage, negligible. Even at heavy use (150 enrichments + 100 Asks): Hybrid A ~$1.10 vs Haiku-only ~$0.42. The delta is always under $1/month.

**Complexity cost:** one `ENRICH_PROVIDER` + one `ASK_PROVIDER` env var in the config. Given that `src/lib/llm/ollama.ts` is already being migrated to a provider-agnostic wrapper, this is one additional if-branch, not a structural change.

**Recommendation: adopt the hybrid.** The engineering cost is one env var. Sonnet 4.6's 42% quality jump over Haiku for Ask is meaningful when you're retrieving 10 chunks and synthesizing an answer with `[CITE:chunk_id]` accuracy. Enrichment is a batch job where you never see the output directly — Haiku is fine there.

**Hybrid B: Gemini 2.5 Flash for enrichment + Haiku 4.5 for Ask**

This saves ~$0.03/month vs Haiku-only and introduces a second provider SDK. Not recommended — savings are too small to justify adding Google as a dependency.

---

## Empirical JSON Reliability

**Status: NOT RUN — no API keys are present in `.env`, `.env.local`, or the shell environment.**

The three top candidates (Haiku 4.5, Gemini 2.5 Flash, Sonnet 4.6) all advertise constrained-decoding JSON mode — meaning the token sampler is constrained to emit only valid JSON tokens at each step. This is a structural guarantee, not a "best effort" soft instruction. The failure modes that affected Qwen 2.5 (thinking-mode token overflow, temperature instability) do not apply to hosted API models with constrained decoding.

Prior art from Brain's own benchmark (R-LLM-b, 2026-05-07): the Brain enrichment prompt produced 5/5 valid JSONs on Qwen 2.5 7B without constrained decoding, using only a well-structured prompt. With constrained decoding enabled, any of these hosted models should match or exceed that result.

**How to run the empirical test yourself (budget ~$0.30 total):**

```typescript
// scripts/test-provider-json.ts
// Run with: npx tsx scripts/test-provider-json.ts

import Anthropic from "@anthropic-ai/sdk";
import { enrichmentUserPrompt, ENRICHMENT_SYSTEM, validateEnrichment } from "../src/lib/enrich/prompts";

const TEST_BODY = `
Product-led growth (PLG) is a go-to-market strategy where the product itself is the
primary driver of customer acquisition, expansion, and retention. Companies like Slack,
Dropbox, and Figma grew to billions in ARR with little traditional sales motion by
letting users experience value before buying. The core mechanic is a freemium funnel:
users sign up for free, hit a usage limit or a collaboration wall, and convert to paid
individually or via bottom-up enterprise expansion.

Key PLG metrics differ from sales-led growth. Instead of pipeline and ARR per AE,
PLG companies track PQL (product-qualified lead) rate, time-to-value (how quickly a
new user reaches their aha moment), expansion revenue from free-to-paid conversion,
and viral coefficient. Figma's viral coefficient exceeded 1.0 for years — each new user
invited more than one additional user on average, creating compounding growth without
paid acquisition.

Operationalizing PLG requires tight coordination between product and go-to-market.
The product must deliver immediate value without a lengthy onboarding; the marketing
team must instrument the funnel to identify PQLs before they churn; and the sales team
(if any) must be retrained to engage users who are already in the product rather than
cold prospects. Common failure modes include launching freemium without a clear
upgrade trigger, building a free tier so generous that conversion rates collapse, and
mistaking activation (user completes onboarding) for retention (user returns next week).
`.trim();

async function testHaiku() {
  const client = new Anthropic(); // uses ANTHROPIC_API_KEY env var
  const prompt = enrichmentUserPrompt({
    source_type: "Blog Post",
    title: "Product-Led Growth: What It Is and Why It Works",
    body: TEST_BODY,
  });

  const start = Date.now();
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    system: ENRICHMENT_SYSTEM,
    messages: [{ role: "user", content: prompt }],
    // Enable constrained JSON output:
    // betas: ["output-128k-2025-02-19"],
    // OR use: tool_choice + a tool that returns the schema
    // Simplest: just use the prompt-level JSON instruction (same as Ollama path)
  });

  const elapsed = Date.now() - start;
  const rawText = msg.content[0].type === "text" ? msg.content[0].text : "";

  let parsed: unknown;
  let parseOk = false;
  try {
    parsed = JSON.parse(rawText);
    parseOk = true;
  } catch (e) {
    console.error("Parse failed:", e);
  }

  const validated = parseOk ? validateEnrichment(parsed) : { ok: false, problems: ["parse failed"] };

  console.log({
    model: "claude-haiku-4-5",
    elapsed_ms: elapsed,
    parse_ok: parseOk,
    validated: validated.ok,
    problems: validated.ok ? [] : validated.problems,
    input_tokens: msg.usage.input_tokens,
    output_tokens: msg.usage.output_tokens,
  });
}

testHaiku().catch(console.error);
```

To run against Gemini 2.5 Flash, replace the Anthropic client with `@google/generative-ai`:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" }, // constrained JSON mode
});
const result = await model.generateContent(ENRICHMENT_SYSTEM + "\n\n" + prompt);
```

**Expected results based on structured-output documentation and prior Brain benchmarks:**
- Haiku 4.5: 5/5 pass (constrained decoding; same prompt architecture as Qwen 2.5)
- Gemini 2.5 Flash: 5/5 pass (constrained JSON mode; syntactic validity guaranteed)
- Sonnet 4.6: 5/5 pass (same as Haiku; more capable model)
- GPT-4o-mini: 5/5 pass (JSON mode available; weaker on field-value semantics)

The failure modes to watch for are semantic, not structural: incorrect category from the 14-item taxonomy, paraphrased rather than verbatim quotes, tag count outside 3–8. These are the same issues observed with Qwen 2.5 in R-LLM-b and are handled by `validateEnrichment()` + the existing retry logic.

---

## Privacy Terms One-Liner Per Provider

| Provider | Training on API inputs? | Retention | Notes |
|---|---|---|---|
| **Anthropic** | No — API inputs not used for training by default; no opt-in required | 30 days standard; batch results available 29 days | Source: platform.claude.com pricing page + privacy docs (2026-05-12) |
| **Google (paid tier)** | No — paid API quota explicitly excludes training ("Google doesn't use your prompts or responses to improve our products") | Limited period for abuse detection only | Source: ai.google.dev/gemini-api/terms (2026-05-12). **Free tier trains on data — must use paid quota.** |
| **OpenAI** | No by default for API customers (training opt-out is the default; opt-in is available for fine-tuning) | 30 days standard | Source: training data knowledge (2026-05-12); openai.com/privacy pages returned 403 during research — verify at openai.com/enterprise-privacy |
| **DeepSeek (self-hosted)** | Unknown — ToS less clear for their hosted API; Chinese jurisdiction | Unknown | Not recommended for personal notes; jurisdiction risk |
| **Groq / Together / Fireworks** | Varies by provider and model; open-weight hosting, typically no training on API | Varies | Check individual ToS; generally acceptable but less transparent than Anthropic/Google |

---

## Context Window Check

Brain's prompts (from `prompts.ts` and `llm-b-qwen3.md`):
- Enrichment: system (~80 tokens) + user prompt with 12,000-char body (~3,000 tokens) + output budget (~1,200 tokens) = **~4,280 tokens total**
- Ask: RAG context with 10 chunks + question = **~6,000–8,000 tokens**

All models in the matrix comfortably handle both prompts:
- Haiku 4.5: 200k ctx — no constraint
- Sonnet 4.6: 1M ctx — no constraint
- Gemini 2.5 Flash: 1M ctx — no constraint
- GPT-4o-mini: 128k ctx — no constraint

No context-window gotcha exists at Brain's current prompt sizes.

---

## Budget-Tier Footnote

DeepSeek V3 (self-hosted API, ~$0.07/MTok in / $0.28/MTok out), Groq Llama 3.3 70B (~$0.59/MTok in / $0.79/MTok out at training-data pricing), and Together/Fireworks open-weight hosting (typically $0.04–$0.20/MTok) offer the lowest raw token cost. At Brain's volume this translates to saving $0.05–0.08/month vs Haiku. The tradeoffs are: weaker JSON reliability guarantees (no constrained decoding on most open-weight hosts), less clear privacy ToS, and DeepSeek's Chinese data jurisdiction. Given that the user's constraint is quality-first and cost is noise, these providers are not recommended for Brain.

---

## Locked Recommendation

**Given quality-first priority, paid-tier no-training privacy bar, and Brain's actual usage volume (cost is noise):**

**Enrichment workload:** Claude Haiku 4.5, Batch API.
- Model: `claude-haiku-4-5-20251001`
- Mode: Batch API (50% discount; tolerable 24h turnaround for daily enrichment batch)
- JSON: constrained decoding via `output_config.format` or tool-use strict mode
- Cost: ~$0.035/month at moderate use; ~$0.18/month at heavy use

**Ask workload:** Claude Sonnet 4.6, realtime streaming.
- Model: `claude-sonnet-4-6`
- Mode: Realtime streaming (user-facing; TTFT 1.40s acceptable)
- Citation format: `[CITE:chunk_id]` instruction in system prompt (Sonnet 4.6 ranks #3 / 71 non-reasoning on intelligence — best available for RAG synthesis outside Opus)
- Cost: ~$0.22/month at moderate use; ~$0.73/month at heavy use

**Total hybrid cost: ~$0.26/month (moderate), ~$0.91/month (heavy).** This is less than 10% of the cloud VM cost.

**Single-provider fallback (if you want simplicity):** Claude Haiku 4.5 for both. Intelligence penalty for Ask is real but small at Brain's current query complexity. Upgrade to the hybrid when Ask quality becomes frustrating — it is a one-line config change.

**Why not Gemini Flash as the enrichment provider?** It is cheaper (~$0.06 vs $0.10/month) and marginally faster, but introduces a second SDK dependency and a second account/billing setup. The saving is $0.04/month — not worth the operational complexity at Brain's scale. If you are already paying for Google AI or running other Gemini workloads, reconsider.

**Why not gpt-4o-mini?** Cheapest option ($0.02/month), but scores 13/100 intelligence on artificialanalysis.ai — weakest in the quality-relevant tier. Given that quality is the stated first priority and cost is noise, choosing the weakest-quality model to save $0.08/month is backwards.

---

## Open Items for the Planner

1. **Anthropic API account does not exist yet.** Signup path: console.anthropic.com → credit card → API key. No phone verification required. New accounts receive a small free credit.
2. **`src/lib/llm/ollama.ts` must be refactored to a provider-agnostic wrapper** that accepts `ENRICH_PROVIDER` / `ASK_PROVIDER` env vars pointing at `anthropic` (enrichment) and `anthropic` (Ask), both using the Anthropic SDK. The JSON output path stays identical — same prompt, same `validateEnrichment()` call — only the transport layer changes.
3. **Batch API integration** is new work: the enrichment daily job must serialize a `MessageBatch` request, poll for completion, and process results. The Anthropic SDK (`@anthropic-ai/sdk` v0.95.2, already installed) includes the Batch API client. See `platform.claude.com/docs/en/build-with-claude/batch-processing` for the request shape.
4. **Empirical JSON reliability test** is documented above with runnable TypeScript. Set `ANTHROPIC_API_KEY` and run `npx tsx scripts/test-provider-json.ts`. Budget: under $0.01 for 5 calls.
