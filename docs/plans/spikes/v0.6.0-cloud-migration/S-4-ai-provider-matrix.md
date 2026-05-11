# S-4: AI provider matrix (paid API)

**Estimated effort:** 2 hours (web research + pricing arithmetic + empirical test)
**Depends on:** S-1 (token volume); pair with S-5 (if embeddings stay local, we don't need providers' embedding tiers)
**Produces:** a ranked list of API providers with per-provider cost + quality + reliability scores for Brain's two workloads (enrichment + Ask).

---

## 0. Why this spike

We're moving off Ollama to an API or hybrid. There are ~8 credible paid API providers in 2026. They differ by 10× on price, 4× on latency, and meaningfully on JSON-output reliability. We need to rank them for Brain's actual prompts — not a generic benchmark.

## 1. Questions to answer

### 1.1 Provider short-list

Include:
- **Anthropic:** Claude Haiku 4.5, Sonnet 4.6 (skip Opus — too expensive for enrichment)
- **OpenAI:** gpt-4o-mini, gpt-5-mini (if released; else gpt-5), gpt-4o
- **Google:** Gemini 2.5 Flash, Gemini 2.5 Flash-Lite, Gemini 2.5 Pro
- **DeepSeek:** V3.2 (hosted by DeepSeek themselves)
- **Groq:** Llama 3.3 70B hosted (ultra-low latency for Ask UX)
- **Together.ai / Fireworks:** serverless open-weight inference (often cheapest)

### 1.2 Per-provider facts to record

- **Model name + tier + current context window**
- **Pricing** (input $/M, output $/M, batch discount ratio + actual batch endpoint availability)
- **Dated pricing snapshot** — cite URL + date captured
- **Latency** (first-token + throughput from artificialanalysis.ai or similar independent benchmark)
- **Rate limits** — free tier + paid tier (relevant for if the batch run blows past free-tier caps)
- **Structured-output support** — JSON mode? Tool-use? Schema strict-mode?
- **Privacy terms** — do they train on your data? Retention? Opt-out?
- **Signup friction** — credit card required, phone verification, etc.

### 1.3 Brain-specific quality test (empirical)

Run these tests against top 3 provider candidates (based on price):

1. **Enrichment reliability:** take 10 representative items from `data/brain.sqlite`. For each:
   - Build `enrichmentUserPrompt` with the real body
   - Call provider's JSON-mode endpoint
   - Measure: parse success rate; did it return all 5 fields (summary, quotes, category, title, tags)?
   - Track cost per call
2. **Ask citation format:** take 3 real chunks from the current library. Build the Ask prompt. Call each provider. Check: does it emit `[CITE:chunk_id]` markers for real IDs and avoid inventing them?
3. **Summary quality (subjective):** blind A/B for 3 items between qwen2.5:7b-instruct-q4_K_M (current) vs the candidate. Does the candidate match or exceed?

This empirical test is the most important part. Budget: ~$0.50 total across all 3 candidates × 10 enrichments + 3 Asks. Don't skip it.

### 1.4 Cost math at Brain's volume

Pull `N_enrich`, `N_ask`, `T_*` numbers from S-1. Build a table:

```
monthly_cost = (T_enrich_in × price_in + T_enrich_out × price_out) × N_enrich × batch_discount
             + (T_ask_in    × price_in + T_ask_out    × price_out) × N_ask    × 1.0
```

### 1.5 The hybrid question (not a separate spike; fold here)

Could we use two providers?
- Cheap provider (Gemini Flash-Lite / Together Llama / DeepSeek) for enrichment (daily batch, cost-sensitive)
- Quality provider (Haiku / Sonnet) for Ask (user-facing, latency-sensitive)

Estimate cost delta vs single-provider strategy.

### 1.6 Context-window gotcha

Brain's enrichment prompt is ~12,000 tokens in. Brain's Ask prompt is up to ~8,000 tokens in. Any provider with < 32k context can still serve us. Flag providers where the tier we're pricing has a smaller window than our usage.

### 1.7 Embedding provider (if S-5 says to use hosted embeddings)

If S-5 recommends cloud-hosted embeddings, add: Voyage AI, Cohere, OpenAI text-embedding-3, Gemini embeddings as options. Compare cost/1M tokens and per-query latency.

## 2. Sources to consult

- https://www.anthropic.com/pricing (cite capture date)
- https://openai.com/api/pricing
- https://ai.google.dev/pricing
- https://platform.deepseek.com/api-docs/pricing/
- https://groq.com/pricing/
- https://www.together.ai/pricing
- https://fireworks.ai/pricing
- https://artificialanalysis.ai/ — independent benchmarks
- https://docs.claude.com/en/api/claude-api-batch-processing — batch API shape
- https://platform.openai.com/docs/guides/batch
- Anthropic blog post on JSON strict-mode — https://docs.claude.com/en/docs/build-with-claude/structured-outputs
- Hacker News + Reddit r/LocalLLaMA recent (last 90 days) threads for provider reliability horror stories

## 3. Output format

`docs/research/ai-provider-matrix.md`:

```markdown
# AI Provider Matrix — <date>
**Brain volume (from S-1):** X enrichments/month, Y asks/month, avg Z input tokens, W output tokens.

## Top 3 recommended

### #1 <Provider + Model>
- Rationale: cheap + JSON-reliable + no privacy issues
- Monthly cost: $A (batch enrichment + realtime ask)
- Empirical JSON reliability: N/10
- Signup path: ...

### #2 Runner-up (cheaper)
### #3 Quality-first alternative

## Full matrix

| Provider | Model | In $/M | Out $/M | Batch? | Ctx | Monthly @ Brain volume | JSON rel | First-tok | Notes |
|---|---|---|---|---|---|---|---|---|---|

## Hybrid option analysis

Cheapest combo: enrichment on <X>, Ask on <Y>.
- Monthly: $Z
- Complexity cost: one `ENRICH_PROVIDER` + one `ASK_PROVIDER` env var
- Recommendation: <yes, adopt / no, simplicity wins>

## Empirical JSON reliability

10 real items through top 3 candidates. Results:
- <Provider A>: 10/10 passed
- <Provider B>: 8/10 (failures: bad quotes array twice)
- <Provider C>: 9/10 (failed once on category)

## Privacy terms one-liner per provider

- Anthropic: no training on API inputs; 30-day retention; opt-in longer
- OpenAI: no training on API inputs (default); 30-day retention
- Google: depends on tier — verify
- <etc.>

## Locked recommendation

Given user's constraints (cheap, privacy-respecting, reliable JSON):
- Single-provider: <Provider + Model> at $X/month
- Hybrid variant: <if worthwhile>
```

## 4. Success criteria

- [ ] Dated pricing on every row
- [ ] Empirical JSON reliability tested (not just "the docs say it supports JSON")
- [ ] At least one row uses Brain's actual body content, not synthetic test strings
- [ ] One clear recommended provider + a runner-up
- [ ] Hybrid analyzed, not hand-waved
- [ ] Privacy terms summarized per provider in one line

## 5. Open questions for the user

1. **Do you have an Anthropic / OpenAI / Gemini account + API key already?** Pre-existing reduces friction. (If you previously ran API keys elsewhere, check `.env`/credentials.)
2. **Privacy stance:** training opt-out as a hard filter, or just prefer but not require? Anthropic's default is no-training; some cheaper providers may train.
3. **Payment method:** credit card or UPI / other? Some providers don't accept non-US cards.

## 6. Execution note

The empirical test is where this spike earns its keep. Provider A being $0.10 cheaper than Provider B is irrelevant if A fails JSON 30% of the time and you have to retry with Provider B. **Make 30 API calls. It costs under $1.** Skip this and you'll find out post-migration when a day's batch silently corrupts items.
